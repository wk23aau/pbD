/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

function apply_styles(styles, element) {
    for (const [attribute, value] of Object.entries(styles)) {
        element.style[attribute] = value;
    }
}

function fsGeneratePlaceHolderId(url) {
    url = url.replace(/^http:\/\/www|[^\w\s]/gi, '');
    return url + '_' + Math.floor(Math.random() * 1001) + '_' + Math.floor(Math.random() * 101);
}

function fsRatingIcon(element, url, engineClass) {
    var FSMARKED_CLASS = 'fsrating_marked';
    if (element.classList.contains(FSMARKED_CLASS)) {
        return '';
    }

    var id = fsGeneratePlaceHolderId(url);
    var img = document.createElement('img');
    img.setAttribute('id', id);
    img.setAttribute('src', fs_loading_svg);
    img.setAttribute('class', 'fs-rating-summary-rating-icon fs-spin');
    img.setAttribute('data-rating', 'loading');

    var rs_shell = fsRatingSummaryShell(id, img, engineClass);

    element.classList.add(FSMARKED_CLASS);

    if (engineClass === "fs-ddg") {
        let imgElement = element.parentNode.parentNode.querySelector("img:not(.fs-rating-summary-rating-icon");
        if (imgElement) {
            element.parentNode.parentNode.insertBefore(rs_shell, element.parentNode.parentNode.firstChild);
            rs_shell.style.top = "3px";
        }
        else {
            element.parentNode.insertBefore(rs_shell, element);
        }
        return id;
    }

    if (engineClass === "fs-yahoo") {
        const astyle = element.querySelector("a");
        if (astyle) {
            if (astyle.classList.length === 0) {
                // "People also ask" section in search results for all browsers
                rs_shell.style.top = "-23px";
            } else {
                // Firefox normal search results
                rs_shell.style.top = "4px";
            }
        } else {
            // Chrome/Edge normal search results
            rs_shell.style.top = "-2px";
        }
    }

    if (engineClass === "fs-yahoo-jp") {
        rs_shell.style.top = "7px";
    }

    element.parentNode.insertBefore(rs_shell, element);

    if (engineClass === "fs-google") {
        rs_shell.parentElement.style.display = "flex";
        if (isParentFlippedVertically(rs_shell)) {
            rs_shell.style.transform = 'scaleY(-1)';
            rs_shell.style.top = "-9px";
        } else {
            rs_shell.style.top = "1px";
        }
    }

    return id;
}

function fsRatingSummaryShell(id, child1, engineClass) {
    var element = document.createElement('div');
    element.setAttribute('id', 'rs_' + id);
    element.setAttribute('class', 'fs-bubble-info ' + engineClass);
    element.appendChild(child1);

    // used by default when CSS styles get unloaded by the browser
    // this can happen when the extension is disabled or when access to the web page is revoked by the user in Safari
    const invisibleStyles = {
        visibility: 'hidden',
        display: 'none',
        opacity: 0
    };
    apply_styles(invisibleStyles, element);

    return element;
}


function hasParentClass(child, classname) {
    if (child.className.split(' ').indexOf(classname) >= 0) {
        return true;
    }
    try {
        return child.parentNode && hasParentClass(child.parentNode, classname);
    }
    catch (TypeError) {
        return false;
    }
}

function getParentTransform(element) {
    const parent = element.parentElement;
    if (!parent) return null;

    // Get computed style of the parent
    const computedStyle = window.getComputedStyle(parent);

    // Get the transform value
    const transform = computedStyle.getPropertyValue('transform');

    return transform;
}

function isParentFlippedVertically(element) {
    const transform = getParentTransform(element);

    if (transform === 'none') {
        // In Google search results there's "People also ask" section which has
        // elements flipped vertically, but for which getting parent transform does not work.
        // So need to just detect those elements by their class name.
        if (element.parentElement.classList.contains('V9tjod')) {
            return true;
        } else {
            return false;
        }
    }

    // Create a DOMMatrix from the transform value
    const matrix = new DOMMatrix(transform);

    // Check if the Y scale is negative
    // For 2D transforms, this is the 'd' value (matrix.d)
    // For 3D transforms, we check matrix.m22
    return matrix.d < 0 || matrix.m22 < 0;
}
