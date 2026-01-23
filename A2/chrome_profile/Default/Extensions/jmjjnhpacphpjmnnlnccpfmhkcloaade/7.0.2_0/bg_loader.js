/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

try {
    importScripts(
        '/browser_storage.js',
        '/browser_resolver.js',
        '/constants.js',
        '/common.js',
        '/versions.js',
        '/log.js',
        '/rule_id.js',
        '/ad_serving_domains.js',
        '/ad_blocker.js',
        '/native_messaging_app.js',
        '/native_messaging.js',
        '/data_pipeline_events.js',
        '/referrer_cache.js',
        '/safe_search_option.js',
        '/permissions_monitor.js',
        '/extension_status.js',
        '/content_check.js',
        '/ols_worker.js',
        '/ols_main.js'
        );
} catch (e) {
    console.error(e);
}
