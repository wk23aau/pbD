/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

function debugInfo() {
    chrome.runtime.sendMessage(
        { type: MessageName.DebugInfo, url: window.location.href },
        function (response) {
            if (!response) {
                return;
            }

            const y = 10;
            const x = 10;

            const settingsSection = Object.keys(response.settings).map(settingName => {
                return `<tr><td>${settingName}</td><td>${response.settings[settingName]}</td></tr>`;
            }).join("");

            const customizationSection = Object.keys(response.customization).map(name => {
                let value = response.customization[name];
                if (name === "ProductLogo") {
                    value = `<img style="width: 80px" src="${value}"/>`;
                }
                return `<tr><td>${name}</td><td>${value}</td></tr>`;
            }).join("");

            const el = `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px;">\
                    <table>
                    <tr>
                    <td>Name</td><td>${response.extName}</td>
                    </tr>
                    <tr>
                    <td>ID</td><td>${response.extId}</td>
                    </tr>
                    <tr>
                    <td>Version</td><td>${response.extVer}</td>
                    </tr>
                    <tr>
                    <td>Browser</td><td>${response.browserName}</td>
                    </tr>
                    <tr>
                    <td>User ad serving domain count</td><td>${response.userAdServingDomainsLength}</td>
                    </tr>
                    <tr>
                    <td>URL</td><td>${window.location.href}</td>
                    </tr>
                    <tr>
                    <td>Reputation</td><td>${JSON.stringify(response.orspData)}</td>
                    </tr>
                    ${customizationSection}
                    ${settingsSection}
                    </table>
                    </div>`;
            let panel = htmlToElem(`<div id="fs-debug-panel" style="all: initial; font-family: Arial, Helvetica, sans-serif; min-width: 60px; min-height: 24px;\
            z-index: 1000000; background: #70FC5A; position: fixed; border: 1px gray solid; bottom: ${x}px; \
            right: ${y}px; opacity: 0.9; padding: 0px;"/><button id="fs-debug-button" style="all: initial; margin: 3px; cursor: pointer;">Debug info</button>
                <iframe id="fs-debug-iframe" style="display:none; border: 0; width: 400px; height: 380px;">
            </div>`);
            document.body.appendChild(panel);
            document.getElementById("fs-debug-iframe").srcdoc = el;
            document.getElementById("fs-debug-button").addEventListener("click", () => {
                const btn = document.getElementById("fs-debug-iframe");
                if (btn.style.display === "none") {
                    btn.style.display = "block";
                }
                else {
                    btn.style.display = "none";
                }
            });
        }
    );
}

isAlpha().then(result => {
    if (result) {
        isDebugMode().then(result => {
            if (result) {
                debugInfo();
            }
        })
    }
});