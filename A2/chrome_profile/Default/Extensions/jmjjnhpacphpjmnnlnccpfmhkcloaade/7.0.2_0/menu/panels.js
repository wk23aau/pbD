/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

class PanelView {

    constructor() {
        document.body.innerHTML = "";
    }

    getTypeIcon(status, shoppingSite, bankingSite, schema) {
        let statusIcon = fsGetRatingResources(status)[`icon_${schema}`];
        let typeIcon;
        let statusIconShift = "10px";
        if (shoppingSite) {
            if (status === StatusType.TrustedShoppingSuspicious 
                || status === StatusType.Suspicious
                || status === StatusType.TrustedShoppingRisky) {
                typeIcon = "status-icon-globe-warning";
            }
            else {
                typeIcon = "status-icon-globe";
            }
        } else if (bankingSite) {
            typeIcon = "status-icon-banking";
            statusIconShift = "11px";
        } else {
            if (status === StatusType.TrustedShoppingSuspicious 
                || status === StatusType.Suspicious) {
                typeIcon = "status-icon-globe-warning";
            } else {
                typeIcon = "status-icon-globe";
            }
        }

        return `<div class="icon-container">
                <div class="${typeIcon}">
                    <img class="status-icon" src="${statusIcon}" style="height: 14px; margin-left: ${statusIconShift}; margin-top: 10px;" />
                </div>
            </div>`;
    }

    appendDivider() {
        const divider = `
            <div class="divider"></div>
        `
        document.body.insertAdjacentHTML("beforeend", divider);
    }

    appendHeader() {
        const header = `
            <header class="panel header">
            <div style="width: 100%;">
                <div class="product-logo-left"></div>
            </div>
            <div>
                <button style="margin-right: 0; margin-left: 0;" class="button-no-border settings-icon" id="settings-btn" title="${getI18nMessage('open_settings')}"></button>
            </div>
            </header>
        `
        document.body.insertAdjacentHTML("beforeend", header);
        document.getElementById("settings-btn").addEventListener("click", () => {
            window.open("fsecureapp://settings/securebrowsing");
        });
    }

    appendFooter() {
        const footer = `
            <footer class="footer-panel">
                <div class="bg-by-fsecure">
                </div>
            </footer>
        `
        document.body.insertAdjacentHTML("beforeend", footer);
    }

    appendStatusInfo(status, url, type, schema) {
        let statusText;
        let html; 
        if (status === StatusType.Invalid) {
            statusText = getI18nMessage("url_not_available");
            html = `<div class="panel status-panel">${statusText}</div>`;
        }
        else {
            statusText = fsGetGeneralStatusString(status);
            html = `
            <div class="panel status-panel">
                      ${this.getTypeIcon(status, type === IconType.Shopping, type === IconType.Banking, schema)}
                <div style="margin-left: 10px;">
                    <div style="margin-right: 10px;">
                            ${statusText}
                        </div>
                    <div class="url">
                        ${url}
                    </div>
                </div>
            </div>`;
        }
        document.body.insertAdjacentHTML("beforeend", html);
    }

    appendShoppingRating(status, trustworthiness, schema) {
        let typeIcon;
        let statusIcon = fsGetRatingResources(status)[`icon_${schema}`];
        if (status  === StatusType.TrustedShoppingSuspicious 
            || status === StatusType.Suspicious 
            || status === StatusType.TrustedShoppingRisky) {
            typeIcon = "status-icon-shopping-warning";
        }
        else {
            typeIcon = "status-icon-shopping";
        }
        const iconsHtml = getTrustedShoppingTemplate(trustworthiness);
        let desc;
        switch (trustworthiness) {
			case 5:
				desc = getI18nMessage("trusted_shopping_safe_p1");
				break;
			case 4:
				desc = getI18nMessage("trusted_shopping_warning_p1");
				break;
			case 3:
				desc = getI18nMessage("trusted_shopping_suspicious_p1");
				break;
			case 2:
				desc = getI18nMessage("trusted_shopping_risky");
				break;
            case 1:
                desc = getI18nMessage("trusted_shopping_harmful");
                break;
			default:
				desc = getI18nMessage("trusted_shopping_unknown_p1");
		}

        const html = `
            <div class="panel shopping-panel">
                <div class="icon-container">
                    <div class="${typeIcon}">
                        <img class="status-icon" src="${statusIcon}" style="height: 14px; margin-left: 10px; margin-top: 9px;" />
                    </div>
                </div>
                <div style="margin-left: 10px">
                    <div>${iconsHtml}</div>
                    <div>${desc}</div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML("beforeend", html);
    }

    appendAdBlocker(url, tabId, exceptionList) {
        let adblockerExceptions;
        if (exceptionList) {
            adblockerExceptions = [...new Set(exceptionList)];
        }
        else {
            adblockerExceptions = [];
        }
        const hostname = new URL(url).hostname;
        const adBlockerDisabled = !adblockerExceptions.includes(hostname);
        const html = this.getAdblockTemplate(adBlockerDisabled, 0);
        document.body.insertAdjacentHTML("beforeend", html);
        let checkbox = document.getElementById("adblock-checkbox");
        let statusText = document.getElementById("adblock-status-text");
        let statText = document.getElementById("adblock-content-flex");
        BrowserStorage.getSession(["adBlockerCounter"]).then(result => {
            let count = 0;
            if (result && result.adBlockerCounter && result.adBlockerCounter[tabId]) {
                count = result.adBlockerCounter[tabId].count || 0;
            }
            const adblockBlockedStr = getI18nMessage("page_adblock_blocked_count", count.toString());
            document.getElementById("ad-count-on-site").innerText = adblockBlockedStr;
        });
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                const index = adblockerExceptions.indexOf(hostname);
                statusText.innerText = getI18nMessage("page_adblock_feature_on");
                adblockerExceptions.splice(index, 1);
                statText.style.display = "block";
                document.getElementById("ad-count-on-site").innerText = getI18nMessage("page_adblock_blocked_count", "0");
            } else {
                adblockerExceptions = [...new Set([...adblockerExceptions, hostname])];
                statusText.innerText = getI18nMessage("page_adblock_feature_off");
                statText.style.display = "none";
            }
            BrowserStorage.setLocal({adBlockerExceptions: adblockerExceptions});
        });
        BrowserStorage.addListenerSession((changes) => {
            const count = changes.adBlockerCounter.newValue[tabId].count || 0;
            const adblockBlockedStr = chrome.i18n.getMessage("page_adblock_blocked_count", count.toString());
            if (changes.adBlockerCounter) {
                document.getElementById("ad-count-on-site").innerText = adblockBlockedStr;
            }
        });
    }

    getAdblockTemplate(toggleEnabled, adBlockedCount) {
        let descr;
        let count = "";
        if (toggleEnabled) {
            descr = getI18nMessage("page_adblock_feature_on");
            count = getI18nMessage("page_adblock_blocked_count", adBlockedCount.toString());
        }
        else {
            descr = getI18nMessage("page_adblock_feature_off");
        }

        const html = `
            <div class="panel status-panel">
                      <div class="adblocker-icon">
                    </div>
                <div style="margin-left: 8px;">
                    <div style="width: 200px">
                        <div id="adblock-status-text">${descr}</div>
                        </div>
                    <div>
                        <div id="adblock-content-flex" style="display: ${toggleEnabled ? "block" : "none"}; width: 200px; position: relative;">
                            <div id="ad-count-on-site">${count}</div>
                        </div>
                    </div>
                </div>
                <label class="toggle-container" style="height: 20px; margin-left: 16px; ${Browser.isSafari ? "display: none;" : ""};">
                    <input id="adblock-checkbox" class="toggle-input" type="checkbox" ${toggleEnabled ? "checked" : ""}>
                    <span class="toggle"></span>
                </label>
            </div>`;

        return html;
    }

    getCategoryIcons(categories) {
        const sortedCats = getSortedCategories(false);
        let images = "";
        if (!categories.length) {
            return images;
        }
        categories.forEach( (el) => {
            sortedCats.forEach( (sorted) => {
                if (sorted.id == Object.keys(el)[0]) {
                    images += `<img src="${sorted.logo}" alt="${sorted.name}" title="${sorted.name}" style="height: 24px; margin-right: 8px; margin-top: 8px;">`;
                    return;
                }
            });
        });
        return images;
    }

    appendCategories(icons) {
        const html = `
        <div class="panel">
            <div>
            ${getI18nMessage("website_categories")}
            </div>
            <div>
                ${icons}
            </div>
        </div>`;
        document.body.insertAdjacentHTML("beforeend", html);
    }

    appendConsentStatus() {
        const html = `
            <div class="panel status-panel">
                      <div class="cookie-block-icon">
                    </div>
                <div style="margin-left: 8px; width: 250px;">
                    <div>${getI18nMessage("cookie_blocker_p1")}</div>
            </div>`;
        document.body.insertAdjacentHTML("beforeend", html);
    }
}