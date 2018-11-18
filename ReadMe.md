# KGet Integration

KGet Integration captures the downloads to download them in KGet. This application is designed for **Linux**.

This work was heavily based on the uGet Integrator. The only changes are a change of name, variables and icons. Plus the kget-integrator is smaller as KGet supports less features.

For Chrome extension, the PEM is put inside to set a fixed extension ID when loaded, useful for the Native messaging configuration file. I refused to pay to upload the Chrome/Chromium addon on the Chrome extensions market.


## Installation

Install KGet Integrator: `cp kget-integrator /usr/bin/kget-integrator && chmod +x /usr/bin/kget-integrator`


### Chrome installation

Install the Native messaging hosts: `cp Conf/com.kgetdm.chrome.json /etc/chromium/native-messaging-hosts/com.kgetdm.chrome.json`

Open the extension page: `chrome://extensions/`

Put the Chrome folder where you want, it should not move after this step.

Click on the button "Load an unpacked extension" and select the "Chrome" folder.


### Firefox installation

Install the Native messaging hosts: `cp Conf/com.kgetdm.firefox.json /usr/lib/mozilla/native-messaging-hosts/com.kgetdm.firefox.json`

Install the extension: https://addons.mozilla.org/fr/firefox/addon/kget-integration/


## Sources

Based on the [uGet Integrator](https://github.com/ugetdm/uget-integrator)

Icon from the [Papirus Icon Theme](https://github.com/PapirusDevelopmentTeam/papirus-icon-theme)
