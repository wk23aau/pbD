/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

(async () => {
    const response = await chrome.runtime.sendMessage( {type: MessageName.ShoppingWebsite, url: window.location.href, referrer: document.referrer} );
    if (response) {
        const rating = response.rating;
        BrowserStorage.getLocal(["customization", "settings", "schema"]).then(storageResult => {
            const popup = new TrustedShoppingPopup(rating, storageResult.customization, storageResult.schema);
            const showSafeSitesNotification = storageResult.settings.trusted_shopping_popup_safe ?? true;
            const showSuspiciousSitesNotification = storageResult.settings.trusted_shopping_popup_suspicious ?? true;
            popup.show(showSafeSitesNotification, showSuspiciousSitesNotification);
		});
    }
  })();