/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

const PopupLocalizedCategories = {
    adult: "category_adult",
    alcohol_and_tobacco: "category_alcohol_and_tobacco",
    anonymizers: "category_anonymizers",
    dating: "category_dating",
    disturbing: "category_disturbing",
    drugs: "category_drugs",
    gambling: "category_gambling",
    hate: "category_hate",
    illegal: "category_illegal",
    shopping_and_auctions: "category_shopping_and_auctions",
    social_networking: "category_social_networks",
    streaming_media: "category_streaming_media",
    warez: "category_illegal_downloads",
    violence: "category_violence",
    weapons: "category_weapons",
    unknown: "category_unknown"
};

const StatusHarmful = "../img/fs_status_denied.svg";
const StatusSafe = "../img/fs_status_ok.svg";
const StatusUnknown = "../img/fs_status_unknown.svg";
const StatusSuspicious = "../img/fs_status_warning.svg";
const StatusBank = "../img/ic_place_bank_ok.svg";
const StatusInfo = "../img/ic_status_info_filled.svg";
const ProductLogo = "images/logo.png";
const schemaMonitor = new FsSchemaMonitor();

function getSortedCategories(skipUnknown = true) {
    let catList = [];
    Object.keys(PopupLocalizedCategories).forEach( (category) => {
        if (category == "unknown" && skipUnknown) {
            return;
        }
        let catObj = {};
        catObj.id = category;
        let loc = chrome.i18n.getMessage(`search_rating_${PopupLocalizedCategories[category]}`);
        catObj.name = loc || PopupLocalizedCategories[category];
        catObj.logo = `../img/categories/${category}.svg`;
        if (loc) {
            catList.push(catObj);
        }
    });
    return catList.sort((a, b) => a.name.localeCompare(b.name));
}

function loadLocalization() {
    BrowserStorage.getLocal(["customization"]).then(result => {
        let isWithSecure = false;
        let productName;
        if (result.customization && result.customization.ProductName) {
            productName = result.customization.ProductName;
            isWithSecure = productName.startsWith('WithSecure');
        }
        document.querySelectorAll('[data-locale]').forEach(elem => {
            if (isWithSecure) {
                elem.innerText = (elem.id == "extension-name") ? productName : chrome.i18n.getMessage(elem.dataset.locale + "_ws", productName);
            }
            if (Browser.isSafari && elem.id === "extension-name") {
                elem.innerText = chrome.i18n.getMessage("ext_name_safari_full");
            }
            if (!elem.innerText) {
                elem.innerText = chrome.i18n.getMessage(elem.dataset.locale, productName);
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadCommonStyles();
    loadLocalization();
    let contentFrame = document.getElementById("content-iframe");
    if (contentFrame) {
        contentFrame.addEventListener("load", () => {
            let contentPanel = document.getElementById("content-panel");
            setTimeout(() => {
                contentPanel.style.height = contentFrame.contentWindow.document.body.scrollHeight + 20 + "px";
                const htmlContent = contentFrame.contentDocument.querySelector('html');
                const computedHeight = window.getComputedStyle(htmlContent).getPropertyValue('height');
                contentFrame.style.height = parseInt(computedHeight) + 10 + "px";
            }, 200);
        })
    }
    schemaMonitor.setSchemaChangedCallback(isDarkMode => {
        if (isDarkMode) {
            document.documentElement.style.setProperty("color-scheme", "dark");
            document.documentElement.style.color = "white";
        } else {
            document.documentElement.style.setProperty("color-scheme", "light");
            document.documentElement.style.color = "black";
        }
    });
    schemaMonitor.start();
})

function htmlToElem(html) {
	let temp = document.createElement('template');
	html = html.trim();
	temp.innerHTML = html;
	return temp.content.firstChild;
}
