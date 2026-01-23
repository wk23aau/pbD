/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

function fsGetValueDefault(value, defaultString) {
    if (typeof value === "undefined" || value === null) {
        return defaultString;
    }

    if (value.length === 0) {
        return defaultString;
    }

    return value;
}

function fsMatchParentNode(node, className, exactMatch, depth) {
    for (var i = 0; i <= depth; i++) {
        if (!node) {
            break;
        }

        if (fsMatchClass(node, className, exactMatch)) {
            return true;
        }

        node = node.parentNode;
    }

    return false;
}

function fsMatchClass(node, expectedValue, exactMatch) {
    if (!node || !expectedValue || !node.getAttributeNode) {
        return false;
    }

    var attribute = node.getAttributeNode('class') || node.getAttributeNode('className');
    if (!attribute) {
        return false;
    }

    var actualValueLow = attribute.nodeValue.toLowerCase();
    var expectedValueLow = expectedValue.toLowerCase();

    return exactMatch ? actualValueLow === expectedValueLow : actualValueLow.indexOf(expectedValueLow) >= 0;
}

function fsSetStyle(node, styleText) {
    if (node.style.setAttribute) {
        node.style.setAttribute("cssText", styleText);
    } else {
        node.setAttribute("style", styleText);
    }
}

function fsSetStyleToParentNodes(initialNode, styleText, nodeDepth) {
    var node = initialNode.parentNode;

    for (var x = 0; x < nodeDepth; x++) {
        if (!node) {
            break;
        }

        fsSetStyle(node, styleText);
        node = node.parentNode;
    }
}

function fsSome(elements) {
    if (typeof elements !== "object" || typeof elements.length === "undefined") {
        return false;
    }

    for (var i = 0; i < elements.length; i++) {
        if (elements[i]) {
            return true;
        }
    }

    return false;
}

function htmlToElem(html) {
	let temp = document.createElement('template');
	html = html.trim();
	temp.innerHTML = html;
	return temp.content.firstChild;
}

function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY
    };
}

function isValidHost(urlString) {
    try {
        const parsedUrl = new URL(urlString);
        return Boolean(parsedUrl.hostname && ["http:", "https:"].includes(parsedUrl.protocol));
    }
    catch(_) {
        return false;
    }
}

function getTrustedShoppingTemplate(rating) {
    const [iconEmoji1, iconEmoji2, iconEmoji3, iconEmoji4, iconEmoji5] = [
        ...Emojis
    ];

    let [opacityIconEmoji1, opacityIconEmoji2, opacityIconEmoji3, opacityIconEmoji4, opacityIconEmoji5] = [
        "0.3",
        "0.3",
        "0.3",
        "0.3",
        "0.3"
    ];

    switch (rating) {
        case 5:
            opacityIconEmoji5 = "1";
            break;
        case 4:
            opacityIconEmoji4 = "1";
            break;
        case 3:
            opacityIconEmoji3 = "1";
            break;
        case 2:
            opacityIconEmoji2 = "1";
            break;
        case 1:
            opacityIconEmoji1 = "1";
            break;
        default:
            loge("Invalid value", rating);
    }

    return `
        <img style="height: 24px; opacity: ${opacityIconEmoji1};" src="${iconEmoji1}"/>
        <img style="height: 24px; opacity: ${opacityIconEmoji2};" src="${iconEmoji2}"/>
        <img style="height: 24px; opacity: ${opacityIconEmoji3};" src="${iconEmoji3}"/>
        <img style="height: 24px; opacity: ${opacityIconEmoji4};" src="${iconEmoji4}"/>
        <img style="height: 24px; opacity: ${opacityIconEmoji5};" src="${iconEmoji5}"/>
    `;
}

function getTypeIcon(status, shoppingSite, bankingSite, schema) {
    let statusIcon = fsGetRatingResources(status)[`icon_${schema}`];
    let typeIcon;
    let statusIconShift = "10px";
    if (shoppingSite) {
        if (status === StatusType.Suspicious || status === StatusType.TrustedShoppingSuspicious) {
            typeIcon = WebsiteTypeIcons.shoppingWarning[schema];
        }
        else {
            typeIcon = WebsiteTypeIcons.shopping[schema];
            statusIconShift = "11px";
        }

    } else if (bankingSite) {
        typeIcon = WebsiteTypeIcons.banking[schema];
        statusIconShift = "11px";
    } else {
        if (status === StatusType.Suspicious || status === StatusType.TrustedShoppingSuspicious) {
            typeIcon = WebsiteTypeIcons.websiteWarning[schema];
        } else {
            typeIcon = WebsiteTypeIcons.website[schema];
        }
    }
    return `<div class="icon-container">
            <img style="height: 20px;" src="${typeIcon}" />
            <img class="status-icon" src="${statusIcon}" style="height: 14px; left: ${statusIconShift};" />
        </div>`;
}