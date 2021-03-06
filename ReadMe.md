# KGet Integration

[![Pipeline](https://travis-ci.org/NicolasGuilloux/KGet-Integrator.svg?branch=master)](https://travis-ci.org/NicolasGuilloux/KGet-Integrator)

KGet Integration captures the downloads to download them in KGet. This application is designed for **Linux**.

This work was heavily based on the uGet Integrator. Most changes are the name, variables and icons. Plus the kget-integrator is smaller as KGet supports less features.

For Chrome extension, the PEM is put inside to set a fixed extension ID when loaded, useful for the Native messaging configuration file. I refused to pay to upload the Chrome/Chromium addon on the Chrome extensions market.

# Maintenance

I developped it on my free time and actually quite quickly. This extension has not guarantee to work properly and I will not maintain it as fast as possible but only when I get the time to look at it.

For this reasons, don't mind if I take some time to answer to the issues. I am sorry for that. Moreover, feel free to fork and improve it.


## Installation

The following lines considers that you opened a terminal and went into the cloned repository.

Install KGet Integrator: `cp kget-integrator /usr/bin/kget-integrator && chmod +x /usr/bin/kget-integrator`


### Chrome/Chromium/Brave installation

Install the Native messaging hosts: `cp Conf/com.kgetdm.chrome.json /etc/chromium/native-messaging-hosts/com.kgetdm.chrome.json`. You may have to create this folder.

#### From the packed extension

You can find the latest extension packed from the [releases](https://github.com/NicolasGuilloux/KGet-Integrator/releases).

#### Load from sources

Open the extension page: `chrome://extensions/`

Put the Chrome folder where you want, it should not move after this step.

Click on the button "Load an unpacked extension" and select the "Chrome" folder.

Copy the extension ID (something like `chrome-extension://ID_HASH`).

Edit the `/etc/chromium/native-messaging-hosts/com.kgetdm.chrome.json` and add your ID to the `allowed_origins` key.


### Firefox installation

Install the Native messaging hosts for firefox with the following lines.

```
mkdir -p /usr/lib/mozilla/native-messaging-hosts
cp Conf/com.kgetdm.firefox.json /usr/lib/mozilla/native-messaging-hosts/com.kgetdm.firefox.json
```

Some distributions may require to put this native message host into the lib64. I would rather recommand you to symlink it.

```
mkdir -p /usr/lib64/mozilla/native-messaging-hosts
ln -s /usr/lib/mozilla/native-messaging-hosts/com.kgetdm.firefox.json /usr/lib64/mozilla/native-messaging-hosts
```

Install the extension: https://addons.mozilla.org/fr/firefox/addon/kget-integration/


## Sources

Based on the [uGet Integrator](https://github.com/ugetdm/uget-integrator)

Icon from the [Papirus Icon Theme](https://github.com/PapirusDevelopmentTeam/papirus-icon-theme)
