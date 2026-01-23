/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

function configurePage(status, isBank, url) {
    const element = document.getElementById(isBank ? "banking" : status);
    if (element) {
        element.parentElement.style.display = "none";
    }

    if (status == "category") {
        document.getElementById("category-selector-label").innerText = chrome.i18n.getMessage(isWithSecure ? "page_wrong_category_ws" : "page_wrong_cat_2");
    } 
    else {
        document.getElementById("category-selector-label").innerText = chrome.i18n.getMessage("page_wrong_cat_1");
    }

    let ratingNextButton = document.getElementById("btn-new-rating-next");
    if (ratingNextButton) {
        ratingNextButton.addEventListener("click", () => {
            switch(document.querySelector('input[name="safe-status"]:checked').value) {
                case "banking":
                case "harmful":
                case "suspicious":
                case "safe":
                    window.location.href = "confirmation.html?status=" + document.querySelector('input[name="safe-status"]:checked').value + "&url=" + url;
                    break;
                case "category":
                    window.location.href = "categories.html?status=" + document.querySelector('input[name="safe-status"]:checked').value + "&url=" + url;
                    break;
                default:
                    window.location.href = "success.html"; 
            }
        });
    }
    parent.document.getElementById("trusted-shopping-rating").style.display = "none";
    parent.document.body.style.paddingRight = 0;
}

document.addEventListener("DOMContentLoaded", () => {
    BrowserStorage.getLocal(["customization"]).then(result => {
        document.querySelectorAll("input[name='safe-status']").forEach((input) => {
            input.addEventListener('change', (event) => {
                if (document.querySelector('input[name="safe-status"]:checked').value) {
                    document.getElementById("btn-new-rating-next").disabled = false;
                }
            });
        });
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.runtime.sendMessage( {type: MessageName.GetPageInfo, tabID: tabs[0].id}, (pageInfo) => {
                if (!pageInfo) {
                    loge("Failed to get page info");
                    return;
                }
                configurePage(pageInfo.status, pageInfo.isBank, pageInfo.url);
            });
        });
    })

    let cancelButton = document.getElementById("btn-cancel-new-rating");
    if (cancelButton) {
        cancelButton.addEventListener("click", () => {
            window.location.href = "wrong_rating.html";
        });
    }    
})
