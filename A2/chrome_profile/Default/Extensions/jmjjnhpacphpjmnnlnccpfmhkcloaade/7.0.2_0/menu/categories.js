/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

function getCheckboxEl(category, isChecked) {
    let span = document.createElement("span");
    span.setAttribute("class", "hds-checkbox-item");
    span.style.display = "flex";
    span.style.alignItems = "center";
    span.style.marginBottom = "1px";

    let input = document.createElement("input");

    input.setAttribute("id", category.id);
    input.setAttribute("class", "hds-checkbox");
    input.setAttribute("type", "checkbox");
    input.style.margin = "4px 3px 2px 4px";
    input.checked = isChecked;
    span.appendChild(input);

    let img = document.createElement("img");
    img.setAttribute("src", category.logo);
    img.style.height = "17px";
    img.style.margin = "1px 4px 0px 4px";
    span.appendChild(img);

    let label = document.createElement("label");
    label.setAttribute("for", category.id);
    let labelText = document.createTextNode(category.name);
    label.appendChild(labelText);
    span.appendChild(label);

    return span;
}

function getSelectedCategories() {
    let selectedCategories = [];
    const vals = [...document.querySelectorAll('input[type="checkbox"]:checked')];
    vals.forEach( (cat) => {
        selectedCategories.push(cat.id);
    });
    return selectedCategories;
}

function configurePage(footerPanel, footerDisplay) {
    let catContaner = document.getElementById("category-checkbox-container");
    if (catContaner) {
        const categories = getSortedCategories();
        categories.forEach( (cat) => {
            catContaner.appendChild(getCheckboxEl(cat, categories.includes(cat.id)));
        });
    }

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const url = urlParams.get("url");

    let reportButton = document.getElementById("btn-report");
    reportButton.addEventListener("click", () => {
        footerPanel.style.display = footerDisplay;
        let selectedCategories = getSelectedCategories();
        let info = {
            url: url,
            verdict: "",
            categories: selectedCategories,
            notes: ""
        }
        chrome.runtime.sendMessage( {type: MessageName.UserRating, info: info});
        window.location.href = "success.html";
    });

    let backButton = document.getElementById("btn-back");
    backButton.addEventListener("click", () => {
        footerPanel.style.display = footerDisplay;
        window.location.href = "new_rating.html";
    });
}

document.addEventListener("DOMContentLoaded", () => {
    let footerPanel = parent.document.getElementById("footer-panel");
    const footerDisplay = footerPanel.style.display;
    footerPanel.style.display = "none";
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.runtime.sendMessage( {type: MessageName.GetPageInfo, tabID: tabs[0].id}, (pageInfo) => {
            if (!pageInfo) {
                loge("Failed to get page info");
                return;
            }
            configurePage(footerPanel, footerDisplay);
        });
    });
})

