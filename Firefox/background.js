/*
 * KGet Integration                 (https://github.com/NicolasGuilloux/KGet-Integrator)
 *
 * Based on the uGet Integrator     (https://github.com/ugetdm/uget-integrator)
 * Icon from the Papirus Icon Theme (https://github.com/PapirusDevelopmentTeam/papirus-icon-theme)
 *
 * Author:  Nicolas Guilloux
 * Email:   novares.x@gmail.com
 * Website: https://nicolasguilloux.eu
 *
 * This addon is the exact copy of the uGet Integration addon with the KGet names and points to the kget-integrator.
 */

var EXTENSION_VERSION = "1.1.0";
var REQUIRED_INTEGRATOR_VERSION = "1.1.0";
var interruptDownloads = true;
var autoDownloads = false;
var kgetIntegratorNotFound = true;
var disposition = '';
var hostName;
var kgetIntegratorVersion;
var kgetVersion = '';
var chromeVersion;
var firefoxVersion;
var minFileSizeToInterrupt = 300 * 1024; // 300 kb
var current_browser;
var filter = [];
var urlsToSkip = [];
var urlsToInterrupt = [];
var mimeToSkip = [];
var mimeToInterrupt = [];
mediasInTab = {};
var cookies = '';
var message = {
    URL: '',
    Cookies: '',
    UserAgent: '',
    FileName: '',
    FileSize: '',
    Referer: '',
    PostData: '',
    Batch: false,
    Version: EXTENSION_VERSION
};
var requestList = [{
    cookies: '',
    postData: '',
    id: ''
}, {
    cookies: '',
    postData: '',
    id: ''
}, {
    cookies: '',
    postData: '',
    id: ''
}];
var currRequest = 0;

function start() {
    initialize();
    readStorage();
    setDownloadHooks();
    // enableVideoGrabber();
}

/**
 * Initialize the variables.
 */
function initialize() {
    // Get the running browser
    try {
        chromeVersion = /Chrome\/([0-9]+)/.exec(navigator.userAgent)[1];
    } catch (ex) {
        chromeVersion = 33;
    }
    try {
        current_browser = browser;
        hostName = 'com.kgetdm.firefox';
        current_browser.runtime.getBrowserInfo().then(
            function(info) {
                if (info.name === 'Firefox') {
                    // Convert version string to int
                    firefoxVersion = parseInt(info.version.replace(/[ab]\d+/, '').split('.')[0]);
                }
            }
        );
    } catch (ex) {
        firefoxVersion = 0;
        current_browser = chrome;
        hostName = 'com.kgetdm.chrome';
    }
    // Set keyboard shortcut listener
    current_browser.commands.onCommand.addListener(function(command) {
        if ("toggle-interruption" === command) {
            // Toggle
            setInterruptDownload(!interruptDownloads, true);
        }
    });
    chromeVersion = parseInt(chromeVersion);
    sendMessageToHost(message);
    createContextMenus();
}

/**
 * Read storage for extension specific preferences.
 * If no preferences found, initialize with default values.
 */
function readStorage() {
    current_browser.storage.sync.get(function(items) {
        // Read the storage for excluded keywords
        if (items["kget-urls-exclude"]) {
            urlsToSkip = items["kget-urls-exclude"].split(/[\s,]+/);
        } else {
            current_browser.storage.sync.set({ "kget-urls-exclude": '' });
        }

        // Read the storage for included keywords
        if (items["kget-urls-include"]) {
            urlsToInterrupt = items["kget-urls-include"].split(/[\s,]+/);
        } else {
            current_browser.storage.sync.set({ "kget-urls-include": '' });
        }

        if (items["kget-mime-exclude"]) {
            mimeToSkip = items["kget-mime-exclude"].split(/[\s,]+/);
        } else {
            current_browser.storage.sync.set({ "kget-mime-exclude": '' });
        }

        // Read the storage for included keywords
        if (items["kget-mime-include"]) {
            mimeToInterrupt = items["kget-mime-include"].split(/[\s,]+/);
        } else {
            current_browser.storage.sync.set({ "kget-mime-include": '' });
        }

        // Read the storage for the minimum file-size to interrupt
        if (items["kget-min-file-size"]) {
            minFileSizeToInterrupt = parseInt(items["kget-min-file-size"]);
        } else {
            current_browser.storage.sync.set({ "kget-min-file-size": minFileSizeToInterrupt });
        }

        // Read the storage for enabled flag
        if (!items["kget-interrupt"]) {
            // Keep the value string
            current_browser.storage.sync.set({ "kget-interrupt": 'true' });
        } else {
            var interrupt = (items["kget-interrupt"] == "true");
            setInterruptDownload(interrupt);
        }

        // Read the storage for enabled flag
        if (!items["kget-auto-download"]) {
            // Keep the value string
            current_browser.storage.sync.set({ "kget-auto-download": 'false' });
        } else {
            var autoDownload = (items["kget-auto-downlaod"] == "true");
            setAutoDownload(autoDownload);
        }
    });
}

/**
 * Create required context menus and set listeners.
 */
function createContextMenus() {
    current_browser.contextMenus.create({
        title: 'Download with KGet',
        id: "download_with_kget",
        contexts: ['link']
    });

    current_browser.contextMenus.create({
        title: 'Download all links with KGet',
        id: "download_all_links_with_kget",
        contexts: ['page']
    });

    current_browser.contextMenus.create({
        title: 'Download media with KGet',
        id: "download_media_with_kget",
        enabled: false,
        contexts: ['page']
    });

    current_browser.contextMenus.onClicked.addListener(function(info, tab) {
        "use strict";
        var page_url = info.pageUrl;
        if (info.menuItemId === "download_with_kget") {
            message.URL = info['linkUrl'];
            message.Referer = page_url;
            current_browser.cookies.getAll({ 'url': extractRootURL(page_url) }, parseCookies);
        } else if (info.menuItemId === "download_all_links_with_kget") {
            current_browser.tabs.executeScript(null, { file: 'extract.js' }, function(results) {
                // Do nothing
                if (results[0].success) {
                    message.URL = results[0].urls;
                    message.Referer = page_url;
                    message.Batch = true;
                    current_browser.cookies.getAll({ 'url': extractRootURL(page_url) }, parseCookies);
                }
            });
        } else if (info.menuItemId === "download_media_with_kget") {
            if (page_url.includes('/www.youtube.com/watch?v=')) {
                // Youtube
                message.URL = page_url;
                message.Referer = page_url;
                current_browser.cookies.getAll({ 'url': extractRootURL(page_url) }, parseCookies);
            } else {
                // Other videos
                var media_set = mediasInTab[tab['id']];
                if (media_set) {
                    var urls = Array.from(media_set);
                    var no_or_urls = urls.length;
                    if (no_or_urls == 1) {
                        message.URL = urls[0];
                        message.Referer = page_url;
                        current_browser.cookies.getAll({ 'url': extractRootURL(page_url) }, parseCookies);
                    } else if (no_or_urls > 1) {
                        message.URL = urls.join('\n');
                        message.Referer = page_url;
                        message.Batch = true;
                        current_browser.cookies.getAll({ 'url': extractRootURL(page_url) }, parseCookies);
                    }
                }
            }

        }
    });
}

/**
 * Set hooks to interrupt downloads.
 */
function setDownloadHooks() {
    // Interrupt downloads on creation
    current_browser.downloads.onCreated.addListener(function(downloadItem) {

        if (kgetIntegratorNotFound || !interruptDownloads) { // kget-integrator not installed
            return;
        }

        if ("in_progress" !== downloadItem['state'].toString().toLowerCase()) {
            return;
        }

        var fileSize = downloadItem['fileSize'];
        var mime = downloadItem['mime'];

        var url = '';
        if (chromeVersion >= 54) {
            url = downloadItem['finalUrl'];
        } else {
            url = downloadItem['url'];
        }

        if (fileSize < minFileSizeToInterrupt && !(isWhiteListedURL(url) || isWhiteListedContent(mime))) {
            return;
        }
        if (isBlackListedURL(url) || isBlackListedContent(mime)) {
            return;
        }
        // Cancel the download
        current_browser.downloads.cancel(downloadItem.id);
        // Erase the download from list
        current_browser.downloads.erase({
            id: downloadItem.id
        });

        message.URL = url;
        message.FileName = unescape(downloadItem['filename']).replace(/\"/g, "");
        message.fileSize = fileSize;
        message.Referer = downloadItem['referrer'];
        current_browser.cookies.getAll({ 'url': extractRootURL(url) }, parseCookies);
    });

    current_browser.webRequest.onBeforeRequest.addListener(function(details) {
        console.log(details)
        if (details.method === 'POST') {
            try {
                message.PostData = postParams(details.requestBody.formData);
            } catch(err) {
                console.log(err)
            }
        }
        return {
            requestHeaders: details.requestHeaders
        };
    }, {
        urls: [
            '<all_urls>'
        ],
        types: [
            'main_frame',
            'sub_frame'
        ]
    }, [
        'blocking',
        'requestBody'
    ]);
    current_browser.webRequest.onBeforeSendHeaders.addListener(function(details) {
        currRequest++;
        if (currRequest > 2)
            currRequest = 2;
        requestList[currRequest].id = details.requestId;
        for (var i = 0; i < details.requestHeaders.length; ++i) {
            if (details.requestHeaders[i].name.toLowerCase() === 'user-agent') {
                message.UserAgent = details.requestHeaders[i].value;
            } else if (details.requestHeaders[i].name.toLowerCase() === 'referer') {
                requestList[currRequest].referrer = details.requestHeaders[i].value;
            } else if (details.requestHeaders[i].name.toLowerCase() === 'cookie') {
                requestList[currRequest].cookies = details.requestHeaders[i].value;
            }
        }
        return {
            requestHeaders: details.requestHeaders
        };
    }, {
        urls: [
            '<all_urls>'
        ],
        types: [
            'main_frame',
            'sub_frame',
            'xmlhttprequest'
        ]
    }, [
        'blocking',
        'requestHeaders'
    ]);
    current_browser.webRequest.onHeadersReceived.addListener(function(details) {

        if (kgetIntegratorNotFound) { // kget-integrator not installed
            return {
                responseHeaders: details.responseHeaders
            };
        }

        if (!details.statusLine.includes("200")) { // HTTP response is not OK
            return {
                responseHeaders: details.responseHeaders
            };
        }

        if (isBlackListedURL(details.url)) {
            return {
                responseHeaders: details.responseHeaders
            };
        }

        var interruptDownload = false;
        message.URL = details.url;
        var contentType = "";

        for (var i = 0; i < details.responseHeaders.length; ++i) {

            if (details.responseHeaders[i].name.toLowerCase() == 'content-length') {
                message.fileSize = details.responseHeaders[i].value;
                var fileSize = parseInt(message.fileSize);
                console.log('fileSize', fileSize);

                if (fileSize < minFileSizeToInterrupt && !isWhiteListedURL(message.URL)) {
                    return {
                        responseHeaders: details.responseHeaders
                    };
                }

            } else if (details.responseHeaders[i].name.toLowerCase() == 'content-disposition') {
                disposition = details.responseHeaders[i].value;
                if (disposition.lastIndexOf('filename') != -1) {
                    var found = disposition.match(/filename[^;=\n]*\*=UTF-8''((['"]).*?\2|[^;\n]*)/);
                    if (found) {
                        message.FileName = decodeURI(found[1]);
                    } else {
                        message.FileName = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)[1];
                        message.FileName = unescape(message.FileName).replace(/\"/g, "");
                    }
                    interruptDownload = true;
                }

            } else if (details.responseHeaders[i].name.toLowerCase() == 'content-type') {
                contentType = details.responseHeaders[i].value;
                interruptDownload = true;

                if (isBlackListedContent(contentType)) {
                    interruptDownload = false;
                    return {
                        responseHeaders: details.responseHeaders
                    };
                } else if (isWhiteListedContent(contentType)) {
                    interruptDownload = true;
                }
            }
        }

        if (interruptDownload && interruptDownloads) {
            for (var i = 0; i < filter.length; i++) {
                if (filter[i] != "" && contentType.lastIndexOf(filter[i]) != -1) {
                    return {
                        responseHeaders: details.responseHeaders
                    };
                }
            }
            for (var j = 0; j < 3; j++) {
                if (details.requestId == requestList[j].id && requestList[j].id != "") {
                    message.Referer = requestList[j].referrer;
                    message.Cookies = requestList[j].cookies;
                    break;
                }
            }
            if (details.method != "POST") {
                message.PostData = '';
            }
            current_browser.cookies.getAll({ 'url': extractRootURL(message.URL) }, parseCookies);
            var scheme = /^https/.test(details.url) ? 'https' : 'http';
            if (chromeVersion >= 35 || firefoxVersion >= 51) {
                return {
                    redirectUrl: "javascript:"
                };
            } else if (details.frameId === 0) {
                current_browser.tabs.update(details.tabId, {
                    url: "javascript:"
                });
                var responseHeaders = details.responseHeaders.filter(function(header) {
                    var name = header.name.toLowerCase();
                    return name !== 'content-type' &&
                        name !== 'x-content-type-options' &&
                        name !== 'content-disposition';
                }).concat([{
                    name: 'Content-Type',
                    value: 'text/plain'
                }, {
                    name: 'X-Content-Type-Options',
                    value: 'nosniff'
                }]);
                return {
                    responseHeaders: responseHeaders
                };
            }
            return {
                cancel: true
            };
        } else {
            clearMessage();
        }
        return {
            responseHeaders: details.responseHeaders
        };
    }, {
        urls: [
            '<all_urls>'
        ],
        types: [
            'main_frame',
            'sub_frame'
        ]
    }, [
        'responseHeaders',
        'blocking'
    ]);
}

/**
 * Check the TAB URL and enable download_media_with_kget if the page is Youtube
 * @param {*int} tabId
 */
function checkForYoutube(tabId, disableIfNot) {
    current_browser.tabs.get(tabId, function(tab) {
        isYoutube = tab['url'] && tab['url'].includes('/www.youtube.com/watch?v=')
        if (isYoutube) {
            current_browser.contextMenus.update("download_media_with_kget", { enabled: true });
        } else if (disableIfNot) {
            current_browser.contextMenus.update("download_media_with_kget", { enabled: false });
        }
    });
}

/**
 * Grab videos and add them to mediasInTab.
 */
function enableVideoGrabber() {
    current_browser.tabs.onActivated.addListener(function(activeInfo) {
        if (mediasInTab[activeInfo['tabId']] != undefined) {
            // Media already detected
            current_browser.contextMenus.update("download_media_with_kget", { enabled: true });
        } else {
            // Check for Youtube
            checkForYoutube(activeInfo['tabId'], true);
        }
    });

    current_browser.tabs.onRemoved.addListener(function(tabId, removeInfo) {
        if (mediasInTab[tabId]) {
            delete mediasInTab[tabId];
        }
    });

    current_browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo['status'] === 'loading') {
            // Loading a new page
            delete mediasInTab[tabId];
        }
        // Check for Youtube
        checkForYoutube(tabId, false);
    });

    current_browser.webRequest.onResponseStarted.addListener(function(details) {
        content_url = details['url'];
        type = details['type'];
        if (type === 'media' || content_url.includes('mp4')) {
            tabId = details['tabId'];
            mediaSet = mediasInTab[tabId];
            if (mediaSet == undefined) {
                mediaSet = new Set();
                mediasInTab[tabId] = mediaSet;
            }
            mediaSet.add(content_url);
            current_browser.contextMenus.update("download_media_with_kget", { enabled: true });
        }
    }, {
        urls: [
            '<all_urls>'
        ],
        types: [
            'media',
            'object'
        ]
    });
}

////////////////// Utility Functions //////////////////
/**
 * Send message to kget-integrator
 */
function sendMessageToHost(message) {
    message.direct = autoDownloads;
    console.log(message)
    current_browser.runtime.sendNativeMessage(hostName, message, function(response) {
        clearMessage();
        kgetIntegratorNotFound = (response == null);
        if (!kgetIntegratorNotFound && !kgetIntegratorVersion) {
            kgetIntegratorVersion = response.Version;
            kgetVersion = response.kget;
        }
        changeIcon();
    });
}

/**
 * Return the internal state.
 */
function getState() {
    if (kgetIntegratorNotFound || !kgetIntegratorVersion) {
        return 2;
    } else if (!kgetIntegratorVersion.startsWith(REQUIRED_INTEGRATOR_VERSION)) {
        return 1;
    } else {
        return 0;
    }
}

/**
 * Clear the message.
 */
function clearMessage() {
    message.URL = '';
    message.Cookies = '';
    message.FileName = '';
    message.fileSize = '';
    message.Referer = '';
    message.UserAgent = '';
    message.Batch = false;
    message.direct = false;
}

/**
 * Extract the POST parameters from a form data.
 */
function postParams(source) {
    var array = [];
    for (var key in source) {
        array.push(encodeURIComponent(key) + '=' + encodeURIComponent(source[key]));
    }
    return array.join('&');
}

/**
 * Extract the root of a URL.
 */
function extractRootURL(url) {
    var domain;
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[0] + '/' + url.split('/')[1] + '/' + url.split('/')[2];
    } else {
        domain = url.split('/')[0];
    }
    return domain;
}

/**
 * Parse the cookies and send the message to the native host.
 */
function parseCookies(cookies_arr) {
    cookies = '';
    for (var i in cookies_arr) {
        cookies += cookies_arr[i].domain + '\t';
        cookies += (cookies_arr[i].httpOnly ? "FALSE" : "TRUE") + '\t';
        cookies += cookies_arr[i].path + '\t';
        cookies += (cookies_arr[i].secure ? "TRUE" : "FALSE") + '\t';
        cookies += Math.round(cookies_arr[i].expirationDate) + '\t';
        cookies += cookies_arr[i].name + '\t';
        cookies += cookies_arr[i].value;
        cookies += '\n';
    }
    message.Cookies = cookies;
    sendMessageToHost(message);
}

/**
 * Update the exclude keywords.
 * Is called from the popup.js.
 */
function updateExcludeKeywords(exclude) {
    if (exclude === "") {
        urlsToSkip = [];
    } else {
        urlsToSkip = exclude.split(/[\s,]+/);
    }
    current_browser.storage.sync.set({ "kget-urls-exclude": exclude });
}

/**
 * Update the include keywords.
 * Is called from the popup.js.
 */
function updateIncludeKeywords(include) {
    if (include === "") {
        urlsToInterrupt = [];
    } else {
        urlsToInterrupt = include.split(/[\s,]+/);
    }
    current_browser.storage.sync.set({ "kget-urls-include": include });
}

/**
 * Update the exclude MIMEs.
 * Is called from the popup.js.
 */
function updateExcludeMIMEs(exclude) {
    if (exclude === "") {
        mimeToSkip = [];
    } else {
        mimeToSkip = exclude.split(/[\s,]+/);
    }
    current_browser.storage.sync.set({ "kget-mime-exclude": exclude });
}

/**
 * Update the include MIMEs.
 * Is called from the popup.js.
 */
function updateIncludeMIMEs(include) {
    if (include === "") {
        mimeToInterrupt = [];
    } else {
        mimeToInterrupt = include.split(/[\s,]+/);
    }
    current_browser.storage.sync.set({ "kget-mime-include": include });
}

/**
 * Update the minimum file size to interrupt.
 * Is called from the popup.js.
 */
function updateMinFileSize(size) {
    minFileSizeToInterrupt = size;
    current_browser.storage.sync.set({ "kget-min-file-size": size });
}

/**
 * Check whether not to interrupt the given url.
 */
function isBlackListedURL(url) {
    if (!url) {
        return true;
    }
    blackListed = false;
    // Test the URL
    if (url.includes("//docs.google.com/") || url.includes("googleusercontent.com/docs")) { // Cannot download from Google Docs
        blackListed = true;
    }
    for (var keyword of urlsToSkip) {
        if (url.includes(keyword)) {
            blackListed = true;
            break;
        }
    }
    return blackListed;
}

/**
 * Check whether not to interrupt the given url.
 */
function isBlackListedContent(contentType) {
    blackListed = false;
    // Test the content type
    if (contentType) {
        if (/\b(?:xml|rss|javascript|json|html|text)\b/.test(contentType)) {
            blackListed = true;
        } else {
            for (var keyword of mimeToSkip) {
                if (contentType.includes(keyword)) {
                    blackListed = true;
                    break;
                }
            }
        }
    }
    return blackListed;
}

/**
 * Check whether to interrupt the given url or not.
 */
function isWhiteListedURL(url) {
    if (!url) {
        return false;
    }
    whiteListed = false;
    // Test the URL
    if (url.includes("video")) {
        whiteListed = true;
    }
    for (var keyword of urlsToInterrupt) {
        if (url.includes(keyword)) {
            whiteListed = true;
            break;
        }
    }
    return whiteListed;
}

/**
 * Check whether to interrupt the given content or not.
 */
function isWhiteListedContent(contentType) {
    whiteListed = false;
    // Test the content type
    if (contentType) {
        // if (/\b(?:application\/|video\/|audio\/)\b/.test(contentType)) {
        //     whiteListed = true;
        // } else {
        for (var keyword of mimeToInterrupt) {
            if (contentType.includes(keyword)) {
                whiteListed = true;
                break;
            }
        }
        // }
    }
    return whiteListed;
}

/**
 * Enable/Disable the plugin and update the plugin icon based on the state.
 */
function setInterruptDownload(interrupt, writeToStorage) {
    interruptDownloads = interrupt;
    if (writeToStorage) {
        current_browser.storage.sync.set({ "kget-interrupt": interrupt.toString() });
    }
    changeIcon();
}

/**
 * Enable/Disable the plugin and update the plugin icon based on the state.
 */
function setAutoDownload(autoDownload, writeToStorage) {
    autoDownloads = autoDownload;
    if (writeToStorage) {
        current_browser.storage.sync.set({ "kget-auto-download": autoDownload.toString() });
    }
    changeIcon();
}

/**
 * Change extension icon based on current state.
 */
function changeIcon() {
    state = getState();
    iconPath = "./icon_32.png";
    if (state == 0 && !interruptDownloads) {
        iconPath = "./icon_disabled_32.png";
    } else if (state == 1) {
        // Warning
        iconPath = "./icon_warning_32.png";
    } else if (state == 2) {
        // Error
        iconPath = "./icon_error_32.png";
    }
    current_browser.browserAction.setIcon({
        path: iconPath
    });
}

start();
