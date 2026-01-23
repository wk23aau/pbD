/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

class BlockPage {
    #url;
    #customization;
    #platform;
    #intervalId = 0;

    constructor(url, customization, platform) {
        this.#url = url;
        this.#customization = customization;
        this.#platform = platform;
        const schemaMonitor = new FsSchemaMonitor();
        schemaMonitor.start();
    }

    get isRunningOnMac() {
        return this.#platform.os === 'mac';
    }

    getI18nMessage(stringId, substitute = "") {
        var msg = "";
        msg = chrome.i18n.getMessage(stringId, substitute);
        return msg ? msg : (">" + stringId);
    }

    loadImages() {
        const adminShieldIcon = document.querySelector('.admin-shield-icon');
        if (this.isRunningOnMac && adminShieldIcon) {
            // hiding Windows shield icons on Mac
            adminShieldIcon.style.visibility = 'hidden';
            adminShieldIcon.style.display = 'none';
        }
    }

    loadLocalization() {
        document.querySelectorAll('[data-locale]').forEach(elem => {
            elem.innerText = this.getI18nMessage(elem.dataset.locale, this.#customization.ProductName);
        });
    }

    sendRequest(action) {
        switch (action) {
        case BlockPageAction.Allow:
            chrome.runtime.sendMessage({
                type: MessageName.AllowDomain,
                url: this.#url
            });
            break;
        case BlockPageAction.OpenExceptions:
            chrome.runtime.sendMessage({
                type: MessageName.OpenWebExceptions
            });
            break;
        case BlockPageAction.CheckWhitelist:
            chrome.runtime.sendMessage({
                type: MessageName.CheckWhitelist,
                url: this.#url
            }, (info) => {
                if (info && info.whitelisted && info.url) {
                    clearInterval(this.#intervalId);
                    window.location.href = this.#url;
                }
            });
            break;
        }
    }

    showElement(el, show) {
        if (el) {
            if (show) {
                el.style.visibility = "visible";
            }
            else {
                el.style.visibility = "hidden";
            }
        }
    }

    hasPunycode(url) {
        try {
            const hostname = new URL(url).hostname;
            return hostname.split('.').some(label => label.startsWith('xn--'));
        } catch {
            return false;
        }
    }

    setContent() {
        if (document.getElementById("url")) {
            if (this.hasPunycode(this.#url)) {
                chrome.runtime.sendMessage({ type: MessageName.DisplayUrl, url: this.#url }, (response) => {
                    if (chrome.runtime.lastError) {
                        document.getElementById("url").innerText = this.#url;
                    } else {
                        document.getElementById("url").innerText = response.url;
                    }
                });
            }
            else {
                document.getElementById("url").innerText = this.#url;
            }
        }
        
        if (document.getElementById("report-link")) {
            document.getElementById("report-link").href = `${this.#customization.SampleSubmitUrl}?a=url&suspicious_url=${this.#url}`;
        }

        if (document.getElementById("website-allow")) {
            document.getElementById("website-allow").addEventListener("click", () => this.sendRequest(BlockPageAction.Allow));
        }

        if (document.getElementById("allowed-list")) {
            document.getElementById("allowed-list").addEventListener("click", () => this.sendRequest(BlockPageAction.OpenExceptions));
        }
        
        this.showElement(document.querySelector(".fp_after_allow_website"), this.#customization.OLSSubmitEnable == "True");
        this.showElement(document.querySelector(".bg-by-fsecure"), this.#customization.UseBrandPromise == "True");

        this.#intervalId = setInterval(() =>this.sendRequest(BlockPageAction.CheckWhitelist), 2000);
    }

    setCategories(categories) {
        var container = document.getElementById('categories-container');
        const showIllustration = this.#customization.HideIllustration == "False";

        categories.forEach((category) => {
            if (showIllustration) {
                var element = document.createElement('img');
                element.className = 'category';
                element.title = this.getI18nMessage(LocalizedCategories[category]);
                element.alt = category;
                element.src = '../img/categories/' + category + '.svg';
                container.appendChild(element);
            }
            else {
                if (container.textContent.length) {
                    container.textContent += ", ";
                }
                container.textContent += this.getI18nMessage(LocalizedCategories[category]);
            }
        });
    }

    createChildUrlList(allowedUrls) {
        var container = document.getElementById("links-container");
        allowedUrls.forEach(function(url) {
            var match = url.match(/^(?:https?:\/\/)?([^/?]+)/i);
            var hostname = match ? match[1] : "";

            if ((url.substr(0, 7) !== 'http://') && (url.substr(0, 8) !== 'https://')) { // IE does not support String.startsWith
                url = 'http://' + url;
            }

            var linkImage = document.createElement('img');
            linkImage.className = 'link-image';
            linkImage.src = 'http://' + hostname + '/favicon.ico';
            linkImage.onerror = function () {
                this.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOCAxNS41QzMuOSAxNS41LjUgMTIuMS41IDhTMy45LjUgOCAuNXM3LjUgMy40IDcuNSA3LjUtMy40IDcuNS03LjUgNy41em0wLTE0QzQuNCAxLjUgMS41IDQuNCAxLjUgOHMyLjkgNi41IDYuNSA2LjUgNi41LTIuOSA2LjUtNi41UzExLjYgMS41IDggMS41eiIgZmlsbD0iIzk5OSIgLz4KICA8cGF0aCBkPSJNMTQuMSA0LjlsLTEuOS0yLjUtLjctLjEtLjEgMS4yLjcuNHYuNWwtLjQuMi0uNS4zLS41Ljl2LjdsLjUuMi44LS40LjItLjUuOC0uMyAxLjYuNi4zIDEuMy0xLjEtLjRoLS43bC0uNC0uM2gtMS4zbC0xIDEuNi4yIDEuMy42LjYgMS4zLS4xLjEgMS42LTEuMiAyLjEgMS42LTEuMSAxLjktNC0uOC0zLjh6TTQuNiAyTDIuMSA0LjhsLS40IDEuOS0uNCAyLjEgMS4xLjJMNCAxMHYxLjJsMS4yIDEuMy43IDIgLjUuMiAxLjQtMS45LjYtMS4zLTEuOC0xLjctMi4zLS41LS41LjQtMS4xLTEuNC0uNy4zVjcuNWwuNi0uMi42LjcuMy0uMi0uMS0uOCAxLjctMS40TDYuNCA1IDQuNyAzLjNsLS44IDEuNUwzIDMuNmwxLjUtMS41IDEgMS4zLjUtLjYtLjYtMS4ySDd2MS41bC42LjYuMi0uN0w5IDIuNWwuMi0xLjEtLjMtLjItNC4zLjh6bTYuMSAxdi44SDEwbC4yLjkuNS0uM3YuOGwuNy0uNi0uNS0xLjZoLS4yeiIgZmlsbD0iIzk5OSIgLz4KPC9zdmc+';
            };

            var linkAnchor = document.createElement('a');
            var linkText = document.createTextNode(url);
            linkAnchor.href = url;
            linkAnchor.title = url;
            linkAnchor.appendChild(linkText);

            var linkContainer = document.createElement('div');
            linkContainer.className = 'link-anchor-container';
            linkContainer.appendChild(linkAnchor);

            var linkItem = document.createElement('div');
            linkItem.className = 'link-item';
            linkItem.appendChild(linkImage);
            linkItem.appendChild(linkContainer);
            container.appendChild(linkItem);
        });

        if (allowedUrls.length < 3) {
            container.style.justifyContent = "center";
        }
    }

    setChildDescription(allowedUrls) {
        var element = document.getElementById('child-description');
        var description = this.getI18nMessage("blockpage_child_description");
        if (allowedUrls.length == 0) {
            description = this.getI18nMessage("blockpage_child_empty_list_description");
        }
        element.textContent = description;
    }
}

function getBlockData() {
    return new Promise(resolve => {
        // forced to use callback based invocation to support MV2 calling convention
        chrome.runtime.sendMessage({ type: MessageName.BlockData }, (block) => {
            resolve(block);
        });
    });
}

const SchemaMonitor = new FsSchemaMonitor();

async function loadBlockPage() {
    try {
        loadCommonStyles();
        const storageData = await BrowserStorage.getLocal(["customization", "platform"]);
        const block = await getBlockData();
        const page = new BlockPage(block.url, storageData.customization, storageData.platform);
        page.loadLocalization();
        page.loadImages();
        page.setContent();

        switch(block.type) {
        case "category":
            page.setCategories(block.categories);
            break;
        case "child":
            page.CreateChildUrlList(block.allowedUrls);
            page.setChildDescription(block.allowedUrls);
            break;
        }
    }
    catch (e) {
        loge(e);
    }
}

document.addEventListener("DOMContentLoaded", event => {
    loadBlockPage();
})
