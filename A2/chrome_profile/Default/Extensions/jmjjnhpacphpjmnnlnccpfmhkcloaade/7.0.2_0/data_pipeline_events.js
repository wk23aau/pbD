/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */


const DataPipeline = {

    trustedShoppingPopupShown: (url, trustworthiness) => {
        const message = {
            type: "dataPipelineEvent",
            dataPipelineEvent: {
                context: {
                    url: sanitizeUrlForPrivacy(url),
                    trustworthiness
                },
                reason: "trusted_shopping_popup_event",
                ignoreConsent: false
            }
        };
        DataPipeline.send(message);
    },

    unsafeIframesRemoved: (url, unsafeIframes) => {
        const message = {
            type: "dataPipelineEvent",
            dataPipelineEvent: {
                context: {
                    url: sanitizeUrlForPrivacy(url),
                    unsafeIframes
                },
                reason: "unsafe_iframe_event",
                ignoreConsent: true
            }
        };
        DataPipeline.send(message);
    },

    unsafeResourcesLoaded: (url, unsafeRequests) => {
        const message = {
            type: "dataPipelineEvent",
            dataPipelineEvent: {
                context: {
                    url: sanitizeUrlForPrivacy(url),
                    unsafeRequests
                },
                reason: "unsafe_resources_loaded_event",
                ignoreConsent: false
            }
        };
        DataPipeline.send(message);
    },

    adBlocked: () => {
        const message = {
            type: MessageName.AdBlock,
        };
        DataPipeline.send(message);
    },

    consentRejected: (url, provider, result) => {
        const message = {
            type: "dataPipelineEvent",
            dataPipelineEvent: {
                context: {
                    url: sanitizeUrlForPrivacy(url),
                    provider,
                    result
                },
                reason: "website_consent_reject_event",
                ignoreConsent: false
            }
        };
        DataPipeline.send(message);
    },

    devToolsOpened(url) {
        const message = {
            type: "devToolsOpened",
            devToolsOpened: {
                url: sanitizeUrlForPrivacy(url)
            }
        };
        DataPipeline.send(message);
    },

    send: (message) => {
        logd("Sending data pipeline message:", message);
        NativeHost.postMessage(message);
    }
}