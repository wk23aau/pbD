var serviceworker = {
	vars: {
		sidebarLoaded: [],
		activeTabs: [],
		CSActiveTabs: []
	},
	func: {

	},
	//main serviceworker object init function
	init: function () {
		serviceworker.func.setMessageListeners();
		serviceworker.func.setTabListener();
		serviceworker.func.setKeyboardShortcut();
		serviceworker.func.setupContextMenus()
	}
};

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 25000);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

function safeConnect(tabId, name) { // Connect to content scripts in current tab
	try {
		const p = chrome.tabs.connect(tabId, { name });
		p.onDisconnect.addListener(() => {
			// accessing lastError here consumes it and prevents console warnings
			void chrome.runtime.lastError;
		});
		return p;
	} catch (e) {
		return null;
	}
}

function safePost(port, msg) {
	if (!port) {
		return;
	}
	try {
		port.postMessage(msg);
	} catch (e) {
		// port already disconnected — OK to ignore
	}
}

// Check, set, and remove active tab = tab where the WAVE icon has been activated
serviceworker.func.isTabActive = function(tabId) {
	if (serviceworker.vars.activeTabs.indexOf(tabId) !== -1) {
		return true;
	}
}

serviceworker.func.setActiveTab = function(tabId) {
	const i = serviceworker.vars.activeTabs.indexOf(tabId);
	if (i == -1) serviceworker.vars.activeTabs.push(tabId);
}

serviceworker.func.removeActiveTab = function(tabId) {
	const i = serviceworker.vars.activeTabs.indexOf(tabId);
	if (i > -1) serviceworker.vars.activeTabs.splice(i, 1);
}

// Check, set, and remove tab where the content script has previously been injected. Content script only needs to be injected once.
serviceworker.func.isCSTabActive = function(tabId) {
	if (serviceworker.vars.CSActiveTabs.indexOf(tabId) !== -1) {
		return true;
	}
}

serviceworker.func.setCSActiveTab = function(tabId) {
	const i = serviceworker.vars.CSActiveTabs.indexOf(tabId);
	if (i == -1) serviceworker.vars.CSActiveTabs.push(tabId);
}

serviceworker.func.removeCSActiveTab = function(tabId) {
	const i = serviceworker.vars.CSActiveTabs.indexOf(tabId);
	if (i > -1) serviceworker.vars.CSActiveTabs.splice(i, 1);
}

// Check if content script is present/connected. If not, inject it
async function ensureContentScript(tabId) {
	try {
		// Try to ping an existing content script
		await chrome.tabs.sendMessage(tabId, { type: "PING" });
		// If we got here, there's already a content sript in this tab—do nothing
		return;
	} catch (err) {
	// No receiver = not injected yet in this tab
	const noReceiver = err && typeof err.message === "string" && (err.message.includes("Receiving end does not exist") || err.message.includes("No tab with id"));

	if (!noReceiver) throw err;

	await chrome.scripting.executeScript({
	  target: { tabId },
	  files: ["content.js"]
	});
  }
}

serviceworker.func.runWave = async function(tabId, tabUrl) {
	if (tabUrl.startsWith("chrome")) { // Don't run in devtools or special chrome tabs
		return;	
	} 
	if (serviceworker.func.isTabActive(tabId)) { // WAVE is already active in this tab, so reset
		await serviceworker.func.sendToCs("resetWave", {}, tabId);
		await serviceworker.func.removeActiveTab(tabId);
		
		// Reset sidebarLoaded. Ensures results aren't handled until the sidebar is present and port is open.
		const i = serviceworker.vars.sidebarLoaded.indexOf(tabId); 
		if (i > -1) {
			await serviceworker.vars.sidebarLoaded.splice(i, 1);
		}

		await refreshActionForTab(tabId);
	} else {
		if (!serviceworker.func.isCSTabActive(tabId)) { // Content script has (probably) not yet been injected
			await ensureContentScript(tabId); // ... but check anyway due to bfcache
			await serviceworker.func.setCSActiveTab(tabId); // Record that content script has been injected into this tab
		}
		
		// Inject the WAVE script and styles
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['inject.js']
		});
	
		// Set tab to active
		await serviceworker.func.setActiveTab(tabId);
		await refreshActionForTab(tabId);
	}
};

serviceworker.func.resetTab = function (tabId) {
	// Set reset to content scripts to remove anything it injected and stop work
	serviceworker.func.sendToCs("resetWave", {}, tabId);
	
	// Reset sidebarLoaded. Ensures results aren't handled until the sidebar is present and port is open.
	const i = serviceworker.vars.sidebarLoaded.indexOf(tabId); 
	if (i > -1) serviceworker.vars.sidebarLoaded.splice(i, 1);
	
	serviceworker.func.removeActiveTab(tabId);
	refreshActionForTab(tabId);
}

// WAVE icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
	if (!tab?.id) return;
	if (tab?.url?.startsWith("chrome://")) return;
	
	var tabUrl = tab.url != undefined ? tab.url : "";
	await serviceworker.func.runWave(tab.id, tabUrl);
});

// Icon paths
const ICONS = {
  active: {
	16:  '/img/wave16.png',
	32:  '/img/wave32.png'
  },
  inactive: {
	16:  '/img/wave16bk.png',
	32:  '/img/wave32bk.png'
  }
};

/** Set button for a specific tab based on whether it's active. */
async function refreshActionForTab(tabId) {
	const isActive = serviceworker.func.isTabActive(tabId);
	try {
		await chrome.action.setIcon({
			tabId,
			path: isActive ? ICONS.active : ICONS.inactive
		});
	} catch (e) {
	// Ignore if tab no longer exists
	}
}

serviceworker.func.setTabListener = function () {
	// Full navigations (reloads, cross-origin, etc.)
	chrome.webNavigation.onBeforeNavigate.addListener((details) => {
		if (details.frameId !== 0) return; // top frame only
		serviceworker.func.removeCSActiveTab(details.tabId);
		serviceworker.func.resetTab(details.tabId);
	});

	// Fires on forward/back restores as well; 'forward_back' qualifier indicates BFCache navigation
	chrome.webNavigation.onCommitted.addListener((details) => {
		if (details.frameId !== 0) return;
		if (details.transitionQualifiers && details.transitionQualifiers.includes('forward_back')) {
			// Clear any stale tabs
			serviceworker.func.resetTab(details.tabId);
		}
	});
	
	// Prerender/portal swaps can replace a tab behind the scenes
	chrome.webNavigation.onTabReplaced.addListener(({ replacedTabId }) => {
		serviceworker.func.resetTab(replacedTabId);
	});

	// New URL navigated in tab
	chrome.tabs.onUpdated.addListener((tabId, info) => {
		if (info.status === 'loading') {
			serviceworker.func.resetTab(tabId);
		}
	});
	
	// Tab has been closed
	chrome.tabs.onRemoved.addListener((tabId) => {
		serviceworker.func.removeActiveTab(tabId);
		serviceworker.func.removeCSActiveTab(tabId);
	});
	
	// Active tab has changed - check/set icon state
	chrome.tabs.onActivated.addListener(({ tabId }) => {
		refreshActionForTab(tabId);
	});
	
	// Window has changed - check/set icon state
	chrome.windows.onFocusChanged.addListener(async (windowId) => {
		if (windowId === chrome.windows.WINDOW_ID_NONE) return;
		const [activeTab] = await chrome.tabs.query({ active: true, windowId }).catch(() => []);
		if (activeTab?.id) refreshActionForTab(activeTab.id);
	});
};


serviceworker.func.setupContextMenus = function () {
	chrome.contextMenus.create({
		id: "run-wave",
		title: 'WAVE this page'
	}, () => chrome.runtime.lastError);

	chrome.contextMenus.onClicked.addListener(function(info, tab) {
		if (info.menuItemId == "run-wave") {
			var tabUrl = tab.url != undefined ? tab.url : "";
			serviceworker.func.runWave(tab.id, tabUrl);
		}
	});
};

serviceworker.func.setKeyboardShortcut = function() {
	chrome.commands.onCommand.addListener(function(command,tab) {
		if(command == "toggle-extension") {
			var tabUrl = tab.url != undefined ? tab.url : "";
			serviceworker.func.runWave(tab.id, tabUrl);
		}
	});
};

serviceworker.func.setMessageListeners = function () {
	chrome.runtime.onConnect.addListener(function (port) {
		// tab can be undefined for extension pages
		const tabId = port.sender && port.sender.tab ? port.sender.tab.id : undefined;
		let isAlive = true;

		// Attach onDisconnect immediately so BFCache disconnects are handled
		const handleDisconnect = (disconnectedPort) => {
			// Consume lastError to suppress "Unchecked runtime.lastError" noise
			void chrome.runtime.lastError;
			isAlive = false;
			// Clean up listeners to avoid leaks
			try { port.onMessage.removeListener(onMessage); } catch (_) {}
		};

		const onMessage = (message, sender) => {
			if (!isAlive) {
				return; // ignore anything after disconnect
			}
			
			if (port.name === "contentToServiceWorker") { // Received message from content.js
				//console.log("contentToServiceWorker: "+message.action);
				switch (message.action) {
					case "setExtensionUrl":
					case "waveResults":
						serviceworker.func.sendResultsToSidebarWhenReady(message.action, message.data, tabId);
						break;
			
					case "handleOutlineData":
					case "handleNavData":
					case "moreInfo":
					case "setSidebarContrastDetails":
					case "showacsbalert":
						serviceworker.func.sendToSidebar(message.action, message.data, tabId);
						break;
			
					default:
						break;
				}
			}
			else if (port.name === "sidebarToServiceworker") { // Received message from sidebar
				//console.log("sidebarToServiceworker: " + message.action + " data: " + JSON.stringify(message.data));
				switch (message.action) {
					case "sidebarLoaded":
						if (typeof tabId !== "undefined") {
							serviceworker.vars.sidebarLoaded.push(tabId);
						}
						serviceworker.func.sendToCs(message.action, message.data, tabId);
						break;
			
					default:
					serviceworker.func.sendToCs(message.action, message.data, tabId);
					break;
				}
			}
		};

		port.onDisconnect.addListener(handleDisconnect);
		port.onMessage.addListener(onMessage);
	});
};

// Verify that the sidebar is loaded and ready before sending it data
serviceworker.func.sendResultsToSidebarWhenReady = function (action, data, tabId) {
	//console.log("sendResultsToSidebarWhenReady: "+action);
	if (serviceworker.vars.sidebarLoaded.indexOf(tabId) == -1) {
		//recursive settimeout to check every 100ms
		setTimeout(function () { serviceworker.func.sendResultsToSidebarWhenReady(action, data, tabId) }, 100);
	}
	else {
		//if ready, send results
		//console.log("action: " + JSON.stringify(action) + " | " + "data: " + JSON.stringify(data) + " | " + "tab: " + tabId);
		serviceworker.func.sendToSidebar(action, data, tabId);
	}
}

serviceworker.func.sendToSidebar = function (action, data, tabId) {
	const post = (id) => {
		const port = safeConnect(id, "scriptsConnection");
		safePost(port, { name: "serviceworkerToSidebar", action, data, tabId: id });
	};

	if (typeof tabId !== "undefined") {
		post(tabId);
	} else {
		chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
			void chrome.runtime.lastError; // consume any error from query
			if (tabs && tabs[0]) post(tabs[0].id);
		});
	}
};

serviceworker.func.sendToCs = function (action, data, tabId) {
	const post = (id) => {
		const port = safeConnect(id, "scriptsConnection");
		safePost(port, { name: "serviceWorkerToCs", action, data });
	};

	if (typeof tabId !== "undefined") {
		post(tabId);
	} else {
		chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
			void chrome.runtime.lastError;
			if (tabs && tabs[0]) post(tabs[0].id);
		});
	}
};

/**************************************************
*   begin execution
**************************************************/
serviceworker.init();