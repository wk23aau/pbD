var ASSET_IDS = {
	script: 'wavescript',
	style: 'wavestyle',
};

var ASSET_PATHS = {
	script: 'wave.min.js',
	css: 'styles/report-ext.css',
};

async function injectAssets() {
	// SCRIPT
	if (!document.getElementById(ASSET_IDS.script)) {
		const scriptEl = document.createElement('script');
		scriptEl.id = ASSET_IDS.script;
		scriptEl.src = chrome.runtime.getURL(ASSET_PATHS.script);
		
		// Ensure we know when it finished (or failed) loading:
		const loaded = new Promise((resolve, reject) => {
			scriptEl.addEventListener('load', resolve, { once: true });
			scriptEl.addEventListener('error', () => reject(new Error('Failed to load injected script')), { once: true });
		});

	// Inject into the page context (not the content-script isolated world)
	(document.head || document.documentElement).appendChild(scriptEl);
	await loaded;
	}
	// CSS
	if (!document.getElementById(ASSET_IDS.style)) {
		const linkEl = document.createElement('link');
		linkEl.id = ASSET_IDS.style;
		linkEl.rel = 'stylesheet';
		linkEl.href = chrome.runtime.getURL(ASSET_PATHS.css);
		(document.head || document.documentElement).appendChild(linkEl);
	}
}

injectAssets();