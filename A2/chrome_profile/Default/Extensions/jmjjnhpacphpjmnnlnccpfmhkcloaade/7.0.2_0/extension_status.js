/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

class ExtensionStatus {

    #statusOverride = ExtensionState.Unknown;
    #tabStatuses = {};

    async clearStatusOverride() {
        if (this.#statusOverride === ExtensionState.Unknown) {
            return;
        }
        logi("Clearing extension status override");
        await this.setStatusOverride(ExtensionState.Unknown);
    }

    async setStatusOverride(status) {
        logi(`Setting extension status override to ${status}`);
        this.#statusOverride = status;
        const tabIds = Object
            .keys(this.#tabStatuses)
            .map(tabId => parseInt(tabId, 10));
        const promises = tabIds.map(tabId => this.update(tabId));
        await Promise.all(promises);
    }

    removeStatus(tabId) {
        logd(`Removing extension status for tabId ${tabId}`);
        delete this.#tabStatuses[tabId];
    }

    async setStatus(status, tabId) {
        if (!tabId) {
            return;
        }
        logi(`Setting extension status to ${status} to tabId ${tabId}`);
        this.#tabStatuses[tabId] = status;
        await this.update(tabId);
    }

    isTabKnown(tabId) {
        return tabId in this.#tabStatuses;
    }

    async onTabReplaced(addedTabId, removedTabId) {
        logi(`Tab replaced: ${removedTabId} -> ${addedTabId}`);
        const status = this.#tabStatuses[removedTabId];
        if (status) {
            this.#tabStatuses[addedTabId] = status;
            delete this.#tabStatuses[removedTabId];
            logd(`Extension status moved from ${removedTabId} to ${addedTabId}`);
            await this.update(addedTabId);
        }
    }

    #getMode() {
        return new Promise(resolve => {
            BrowserStorage.getLocal(["schema"]).then(result => {
                resolve(result.schema === Schema.Dark ? "dark" : "light");
            });
        });
    }

    async update(tabId) {
        if (!tabId) {
            return;
        }
        const status = this.#statusOverride !== ExtensionState.Unknown ? this.#statusOverride : this.#tabStatuses[tabId];
        if (!status) {
            logi(`Not proceeding with tab icon update. Extension status for tabId ${tabId} is missing`);
            return;
        }
        const mode = await this.#getMode();
        logi(`status ${status} mode ${mode} tabId ${tabId}`);
        switch(status) {
            case ExtensionState.Safe:
                await this.#setMode(tabId, ExtensionStatusIcons.Safe[mode], "search_rating_safe_p1", "menu/main.html");
                break;
            case ExtensionState.Warn:
                await this.#setMode(tabId, ExtensionStatusIcons.Warning[mode], "search_rating_suspicious_p1", "menu/main.html");
                break;
            case ExtensionState.TrustedShoppingWarning:
                await this.#setMode(tabId, ExtensionStatusIcons.Warning[mode], "search_rating_shopping_suspicious", "menu/main.html");
                break;
            case ExtensionState.Unknown:
                await this.#setMode(tabId, ExtensionStatusIcons.Unknown[mode], "search_rating_unknown", "menu/main.html");
                break;
            case ExtensionState.Info:
                await this.#setMode(tabId, ExtensionStatusIcons.Info[mode], "search_rating_allowed", "menu/main.html");
                break;
            case ExtensionState.Banking:
                await this.#setMode(tabId, ExtensionStatusIcons.Info[mode], "search_rating_banking", "menu/main.html");
                break;
            case ExtensionState.Danger:
                await this.#setMode(tabId, ExtensionStatusIcons.Danger[mode], "search_rating_harmful_p1", "menu/main.html");
                if (await Action.getPopup({tabId}) !== "menu/main.html") {
                    logw("Popup is not set to menu/main.html. Retrying to set it.");
                    await this.#setMode(tabId, ExtensionStatusIcons.Danger[mode], "search_rating_harmful_p1", "menu/main.html");
                }
                break;
            case ExtensionState.Error:
                await this.#setMode(tabId, ExtensionStatusIcons.Danger[mode], "error_ca_text_p1", "menu/error_status.html");
                break;
            case ExtensionState.ConsentRequired:
                await this.#setMode(tabId, ExtensionStatusIcons.Info[mode]);
                break;
            default:
                break;
        }
    }

    async #setMode(tabId, path, messageName, popup) {
        const title = messageName ? chrome.i18n.getMessage(messageName) : null;
        const iconMetadata = this.#sanitizeActionMetadata({ tabId, path });
        const titleMetadata = this.#sanitizeActionMetadata({ tabId, title });
        const popupMetadata = this.#sanitizeActionMetadata({ tabId, popup });
        const promises = [
            Action.setPopup(popupMetadata),
            Action.setIcon(iconMetadata),
            Action.setTitle(titleMetadata)
        ];
        await Promise.all(promises);
    }

    #sanitizeActionMetadata(metadata) {
        // browser action API does not accept undefined values
        const entries = Object.entries(metadata);
        const sanitizedEntries = entries.map(([key, value]) => [key, value === undefined ? null : value]);
        return Object.fromEntries(sanitizedEntries);
    }
}
