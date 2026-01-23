var waveconfig = {
    debug: false,
    extensionUrl: "",
    platform: "extension",
    browser: "chrome"
};
if (window.__WAVE_CS_SCIPT_PRESENT__) { // Check if this script has already set window variable. If not, proceed
	//console.log("Content script already present.");
} else {
	window.__WAVE_CS_SCIPT_PRESENT__ = true;
	
	var cs = {
		serviceworkerPort: null,
		vars: {},
		func: {},
		msg: {
			toServiceworker: null
		},
		init: function () {
			cs.func.connectToServiceworker();
			cs.func.setEventListeners();
			cs.func.setMessageListeners();
		}
	}
	
	cs.func.wakeServiceWorker = async function () {
		return new Promise((resolve) => {
			try {
				chrome.runtime.sendMessage({ type: "WAKE" }, () => {
					// Intentionally ignore lastError; we only care that the call attempted
					void chrome.runtime.lastError;
					resolve();
				});
			} catch (e) {
				resolve();
			}
		});
	}
	
	cs.func.connectToServiceworker = function () {
		try {
			if (cs.serviceworkerPort) {
				try { cs.serviceworkerPort.disconnect(); } catch (e) {}
				cs.serviceworkerPort = null;
			}
		
			// Wake the SW before connecting
			chrome.runtime.sendMessage({ type: "WAKE" }, () => void chrome.runtime.lastError);
		
			cs.serviceworkerPort = chrome.runtime.connect({ name: "contentToServiceWorker" });
		
			cs.serviceworkerPort.onMessage.addListener((message) => {
				if (message?.name === "serviceWorkerToCs") {
					cs.func.setupAndDispatchEvent(message.action, message.data);
				}
			});
		
			cs.serviceworkerPort.onDisconnect.addListener(() => {
				cs.serviceworkerPort = null;
			});
		}
		catch (e) {
			cs.serviceworkerPort = null;
		}
	}
	
	cs.func.sendToServiceworker = async function (action, data) {
		const tryPost = () => {
			if (!cs.serviceworkerPort) cs.func.connectToServiceworker();
			if (!cs.serviceworkerPort) {
				return false;
			}
			try {
				//console.log("cs.serviceworkerPort.postMessage in content.js:", action);
				cs.serviceworkerPort.postMessage({ action, data });
				return true;
			}
			catch (e) {
				//console.log("Port postMessage threw; will reconnect:", e);
				return false;
			}
		};

		// 1) Fast path
		if (tryPost()) return;
		
		// 2) Wake + reconnect + retry once
		await cs.func.wakeServiceWorker();
		cs.func.connectToServiceworker();
		if (tryPost()) return;
	
		// 3) Final fallback: one-off message (always wakes SW)
		try {
			await new Promise((resolve) => {
				chrome.runtime.sendMessage(
				{ name: "contentToServiceWorker", action, data },
				() => {
					void chrome.runtime.lastError; // ignore; we’re fire-and-forget
					resolve();
				}
				);
			});
		}
		catch (e) {
			//console.log("sendMessage fallback failed:", e);
		}
	};
	
	cs.func.setMessageListeners = function () {
		chrome.runtime.onConnect.addListener(function (port) {
			port.onMessage.addListener(function (message, sender) {
				if (message.name == "serviceWorkerToCs") {
					cs.func.setupAndDispatchEvent(message.action, message.data);
				}
			});
			
			port.onDisconnect.addListener(() => {
				void chrome.runtime.lastError;
				// nothing to do; serviceworker will reconnect when it wakes
			});
		});
	};

	cs.func.setupAndDispatchEvent = function (eventName, eventDataObject) {
		var eventData =  {
			"detail": (eventDataObject !== null && typeof eventDataObject === 'object') ? JSON.stringify(eventDataObject) : eventDataObject
		};
		//console.log("setupAndDispatchEvent eventName: "+eventName);
		//console.log("eventData:");
		//console.log(eventData);
		var event = new CustomEvent(eventName, eventData);
		document.dispatchEvent(event);
	};
	
	
	cs.func.setEventListeners = function () {
		//Document Event Listeners
		const handlewaveResults = function dowaveResults(message) {
			cs.func.sendToServiceworker("waveResults", message.detail.data);
		}
		document.addEventListener("waveResults", handlewaveResults);
	
		const handlegetExtensionUrl = function dogetExtensionUrl(message) {
			var extensionUrl = chrome.runtime.getURL("");
			cs.func.setupAndDispatchEvent("setExtensionUrl", extensionUrl);
			cs.func.sendToServiceworker("setExtensionUrl", extensionUrl);
		}
		document.addEventListener("getExtensionUrl", handlegetExtensionUrl);
	
		const handlehandleOutlineData = function dohandleOutlineData(message) {
			cs.func.sendToServiceworker("handleOutlineData", message.detail.data);
		}
		document.addEventListener("handleOutlineData", handlehandleOutlineData);
		
		const handlehandleNavData = function dohandleNavData(message) {
			cs.func.sendToServiceworker("handleNavData", message.detail.data);
		}
		document.addEventListener("handleNavData", handlehandleNavData);
		
		const handlemoreInfo = function domoreInfo(message) {
			cs.func.sendToServiceworker("moreInfo", message.detail.data);
		}
		document.addEventListener("moreInfo", handlemoreInfo);
		/*
		const handleiconList = function doiconList(message) {
			console.log("HANDLEICONLIST");
			cs.func.sendToServiceworker("iconList", message.detail.data);
		}
		document.addEventListener("iconList", handleiconList);
		*/
		const handlesetSidebarContrastDetails = function dosetSidebarContrastDetails(message) {
			cs.func.sendToServiceworker("setSidebarContrastDetails", message.detail.data);
		}
		document.addEventListener("setSidebarContrastDetails", handlesetSidebarContrastDetails);
		
		const handleshowacsbalert = function doshowacsbalert(message) {
			cs.func.sendToServiceworker("showacsbalert", message.detail.data);
		}
		document.addEventListener("showacsbalert", handleshowacsbalert);
	
		// Establish port to service worker
		cs.func.connectToServiceworker();
		
		// Cleanly release the port on navigation to avoid zombie references
		window.addEventListener("pagehide", () => {
			try { cs?.serviceworkerPort?.disconnect(); } catch (e) {}
			cs.serviceworkerPort = null;
		});
	}
	
	cs.init();
}
	
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => { // Handle the ping from Service Worker to check if this content script is active
	if (msg?.type === "PING") {
		sendResponse({ ok: true });
	}
});
