/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

document.addEventListener("readystatechange", () => {
    if (document.readyState === "complete") {
        let reportButton = document.getElementById("btn-report");
        if (reportButton) {
            reportButton.addEventListener("click", () => {
                window.location.href = "new_rating.html";
            });
        }
        // Send "popup" message to serviceworker when content of iframe is loaded to update the menu with rating info
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
            chrome.runtime.sendMessage( {type: MessageName.Popup, tab: tabs[0]});
        });
    }
})
