/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

var fs_last_search_links_number = 0;

const schemaMonitor = new FsSchemaMonitor();
schemaMonitor.start();
FsLog.isBackgroundScript = false;

function fsOrspQueryCallback(id, rating) {
    let element = document.getElementById(id);
    if (element) {
        if (!rating.showRatingIcon) {
            if (element.parentElement.classList.contains("fs-google")) {
                // remove applied google style to remove reserved space for the icon
                let el = element.parentElement.parentElement.getElementsByClassName("fsrating_marked");
                if (el && el[0]) {
                    let arrow = el[0].parentNode.tagName == "DIV" ? el[0].parentNode.lastElementChild : el[0].parentNode.parentNode.lastElementChild;
                    if (arrow) {
                        arrow.style.paddingLeft = 0;
                    }
                    let text = el[0].querySelector(".HGLrXd");
                    if (text) {
                        text.style.left = 0;
                    }
                }
            }
            element.parentElement.remove();
        }
        else {
            const schema = schemaMonitor.detectCustomSchema() === Schema.Dark ? "dark" : "light";
            const icon = fsGetRatingResources(rating.rating_status)[`icon_${schema}`];
            element.src = icon;
            element.dataset.rating = rating.rating_status;
            element.dataset.ext_name = rating.ext_name;
            element.dataset.categories = rating.categories;
            element.dataset.url = rating.url;
            element.dataset.shoppingSite = rating.shoppingSite;
            element.dataset.trustworthiness = rating.trustworthiness;
            element.dataset.typeIcon = rating.typeIcon;
            element.dataset.bankingSite = rating.bankingSite;
            element.classList.remove('fs-spin');
            element.setAttribute('aria-label', rating.rating_status + "-rated-link");
        }
    }
}

var fsProcessLinkElement = function (element, url, engineClass) {
    const id = fsRatingIcon(element, url, engineClass);
    if (id.length === 0) {
        return;
    }

    if (window.location.protocol.indexOf('https:') === 0) {
        chrome.runtime.sendMessage({
            type: MessageName.RequestURLReputation,
            url: url
        }, (response) => {
            fsOrspQueryCallback(id, response);
        });
    }
};

function observeGoogleSearchResults(node, callback) {
    if (node === null || node === undefined) {
        return;
    }
    function handleMutations(mutations) {
        for (const mutation of mutations) {
            for (const el of mutation.addedNodes) {
                // to avoid mutation loops, skip self added element
                if (el.id === "fs-ols-balloon") {
                    return;
                }
            }
        }
        callback();
        logd("Page changed. Checking for new links...");
    }

    var observer = new MutationObserver(handleMutations);
    var config = { childList: true, subtree: true };
    observer.observe(node, config);
    logi("Observer attached!");
}

function observeDuckDuckGoResults(node, callback) {

    function handleMutations(mutations) {
        // check unprocessed results only
        if (document.getElementsByClassName("fs-bubble-info").length == 0) {
            fs_last_search_links_number = 0;
        }
        callback();
    }

    var observer = new MutationObserver(handleMutations);
    var config = { attributes: true, childList: true, subtree: true };
    observer.observe(node, config);
    logi("Observer attached!");
}

// The search results appear always under 'g' div or 'r' h3
function fsGoogleSearchListener() {
    function callback() {
        try {
            var links = document.querySelectorAll('div[class="g"], div[class="d4rhi"], div[class="yuRUbf"], div[class^="g "]:not(.g-blk), table div h3');
            fsGoogleSearchMarking(links, function (element, url, engineClass) {
                fsExtraStyleGoogleSearch(element);
                fsProcessLinkElement(element, url, engineClass);
            });

        } catch (e) {
            logi(e.message);
        }
    }

    callback();

    if ('MutationObserver' in window) {
        observeGoogleSearchResults(document.getElementsByTagName("body")[0], callback);
    }
}

function fsExtraStyleGoogleSearch(element) {
    if (element.classList.contains('fsrating_marked') && !element.classList.contains('l')) {
        const h3Element = element.querySelector("h3");
        if (h3Element) {
            h3Element.style.marginLeft = '-24px';
        }

        const btn = element.parentElement.parentElement.querySelector('[role="button"]');
        if (btn) {
            btn.style.top = '-20px';
        }
    }
}

function fsExtraStyleYahooJapanSearch() {
    // This is needed due to an absolute positioned url text in Yahoo Japan search results
    // Not having this style in each element with class 'sw-Card__titleCiteWrapper' causes
    // an overlap between rating icon and url text
    var elements = document.getElementsByClassName('sw-Card__titleCiteWrapper');
    for (var i = 0; i < elements.length; i++) {
        elements[i].style.left = '24px';
    }
}

function fsExtraStyleYahooSearch(element) {
    element.style.removeProperty("display");
    var currentWidth = parseFloat(window.getComputedStyle(element).width);
    if (!currentWidth) {
        currentWidth = getCollapsedElementWidth(element);
    }
    const newWidth = currentWidth - 24;
    element.style.width = `${newWidth}px`;
}

function getCollapsedElementWidth(element) {
    const clone = element.cloneNode(true);
  
    // Position off-screen
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.visibility = 'hidden';
    clone.style.display = 'block';
  
    // Add to DOM, measure, and remove
    document.body.appendChild(clone);
    const width = parseFloat(window.getComputedStyle(clone).width);
    document.body.removeChild(clone);
  
    return width;
}

// The search results appear always under 'doc/bd/results/cols/left/main'
function fsYahooSearchListener() {
    try {
        // Normal links should be found with 'div.algo', "People also ask" links with 'div.itm'
        let links = document.querySelectorAll("div.algo, div.itm");
        fsYahooSearchMarking(links, fsProcessLinkElement);
    } catch (e) {
        loge(e.message);
    }

}

// The search results appear always under 'html/body/contents'
function fsYahooJapanSearchListener() {
    try {
        var searchResults = document.getElementById('contents');
        var links = getLinks(searchResults);
        fsYahooJapanSearchMarking(links, fsProcessLinkElement);
        fsExtraStyleYahooJapanSearch();
    } catch (e) {
        loge(e.message);
    }
}

function fsBingSearchListener() {
    function callback() {
        try {
            const elements = document.getElementById('b_results').getElementsByTagName('h2');
            fsBingSearchMarking(elements, fsProcessLinkElement);
        } catch (e) {
            loge(e.message);
        }
    }

    function filterMutations(mutations) {
        for (const element of mutations) {
            if (element.id === "fs-ols-balloon") {
                return false; // to avoid mutation loops, skip self added element
            }
            if (element.tagName === "SCRIPT") {
                return false; // skip irrelevant elements
            }
        }
        return true;
    }

    function handleMutations(mutations) {
        for (const mutation of mutations) {
            if (!filterMutations(mutation.addedNodes) || !filterMutations(mutation.removedNodes)) {
                return;
            }
        }
        callback();
        logd("Page changed. Checking for new links...");
    }

    function observerForElement(element) {
        const observer = new MutationObserver(handleMutations);
        const config = { childList: true, subtree: false };
        observer.observe(element, config);
        logi("Observer attached!");
    }

    callback();
    observerForElement(document.getElementsByTagName("body")[0]);
}

function fsExtraStyleDuckDuckGoSearch() {
    let elements = document.getElementsByClassName('LQNqh2U1kzYxREs65IJu');
    for (let element of elements) {
        element.style.display = "inline";
    }
}

// The search results appear always under 'links_wrapper' div
function fsDuckDuckGoSearchListener() {
    function callback() {
        try {
            const elements = document.getElementsByClassName('wLL07_0Xnd1QZpzpfR4W');
            if (elements.length != fs_last_search_links_number) {
                fs_last_search_links_number = elements.length;
                for (let element of elements) {
                    let links = element.querySelectorAll('[data-testid="result-extras-url-link"], [class="f3uDrYrWF3Exrfp1m3Og"]');
                    fsDuckDuckGoSearchMarking(links, fsProcessLinkElement);
                }
                logi("Updating results...");
            }
        } catch (e) {
            loge(e.message);
        }
    }

    callback();
    // DuckDuckGo "More results" button does not trigger any kind of load event, we have to monitor the page contents
    if ('MutationObserver' in window) {
        observeDuckDuckGoResults(document.getElementById('react-layout'), callback);
    }
}

function fsGetSearchListener() {
    logi("Injecting search listener");

    var hostName = window.location.hostname;
    if (GoogleDomains.includes(hostName)) {
        logi("Google detected");
        return fsGoogleSearchListener;
    }

    if (BingDomains.includes(hostName)) {
        logi("Bing detected");
        return fsBingSearchListener;
    }

    if (YahooDomainsJapan.includes(hostName)) {
        logi("Yahoo Japan detected");
        return fsYahooJapanSearchListener;
    }

    if (YahooDomains.includes(hostName)) {
        logi("Yahoo detected");
        return fsYahooSearchListener;
    }

    if (DuckDuckGoDomains.includes(hostName)) {
        logi("DuckDuckGo detected");
        return fsDuckDuckGoSearchListener;
    }

    return null;
}

function isSearchPage() {
    let hostName = window.location.hostname;
    if (GoogleDomains.includes(hostName) ||
        BingDomains.includes(hostName) ||
        YahooDomains.includes(hostName) ||
        YahooDomainsJapan.includes(hostName) ||
        DuckDuckGoDomains.includes(hostName)) {
        return true;
    }
    return false;
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.type == MessageName.BankingSessionActive) {
            if (request.bankingActive) {
                startBPLoop();
            }
            else {
                endBPLoops();
            }
            sendResponse();
        }
        return true;
    }
);

BrowserStorage.setLocal({ browserInfo: navigator.userAgent });

function modificationHook() {
    chrome.runtime.sendMessage(
        { type: MessageName.GetBankingMode },
        function (response) {
            if (response) {
                startBPLoop();
            }
        }
    );
}

// attach content script only when native messaging host connection is activated
chrome.runtime.sendMessage({ type: MessageName.Init }, response => {
    if (response.status !== InitResult.Success) {
        loge("Initialization failed!");
        return;
    }

    modificationHook();

    if (isSearchPage() && (response.settings.search_results || response.settings.trusted_shopping)) {
        logi("Rating script attached!");
        if (document.readyState === "complete" || document.readyState === "interactive") {
            fsGetSearchListener()();
        } else {
            document.onreadystatechange = function () {
                if (document.readyState === "complete" || document.readyState === "interactive") {
                    document.onreadystatechange = null;
                    fsGetSearchListener()();
                }
            };
        }
    }
    if (response.settings.consent_manager) {
        const manager = new ConsentManager();
        manager.processDoc();
    }
    if (response.settings.browsing_protection) {
        const paymentDetector = new PaymentFormDetector(document);
        if (paymentDetector.isPaymentForm()) {
            chrome.runtime.sendMessage({ type: MessageName.PaymentFormFound, url: window.location.href });
        }

        const iframeDetector = new IFrameSourceDetector(document);
        iframeDetector.start();
    }
});

