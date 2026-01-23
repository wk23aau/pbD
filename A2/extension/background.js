/**
 * JARVIS Background Service Worker
 * Bridges content scripts with external WebSocket server
 */

// WebSocket connection to Python controller
let ws = null;
let wsReconnectTimer = null;

// Connected content scripts
const contentPorts = new Map();

// Pending requests
const pendingRequests = new Map();
let requestId = 0;

// Connect to Python WebSocket server
function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    try {
        ws = new WebSocket("ws://localhost:9333");

        ws.onopen = () => {
            console.log("🤖 Connected to JARVIS server");
            clearTimeout(wsReconnectTimer);
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            handleServerMessage(msg);
        };

        ws.onclose = () => {
            console.log("🔌 Disconnected from JARVIS server");
            wsReconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (e) => {
            console.error("WebSocket error:", e);
        };
    } catch (e) {
        console.error("Failed to connect:", e);
        wsReconnectTimer = setTimeout(connectWebSocket, 3000);
    }
}

// Handle messages from Python server
function handleServerMessage(msg) {
    const { id, action, params, tabId } = msg;

    // Find target content script
    const port = contentPorts.get(tabId) || Array.from(contentPorts.values())[0];

    if (!port) {
        sendToServer({ id, error: "No active tab" });
        return;
    }

    // Forward to content script
    const rid = ++requestId;
    pendingRequests.set(rid, { id, ws });

    port.postMessage({ id: rid, action, params });
}

// Send response back to Python server
function sendToServer(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

// Handle content script connections
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "jarvis-content") return;

    // Get tab ID
    const tabId = port.sender?.tab?.id || "unknown";
    contentPorts.set(tabId, port);

    console.log(`📄 Content script connected: tab ${tabId}`);

    port.onMessage.addListener((msg) => {
        if (msg.type === "dom_stream") {
            // Forward DOM stream to server
            sendToServer({
                type: "dom_stream",
                tabId,
                ...msg
            });
        } else if (msg.id && pendingRequests.has(msg.id)) {
            // Response to a request
            const { id } = pendingRequests.get(msg.id);
            pendingRequests.delete(msg.id);
            sendToServer({ id, result: msg.result });
        }
    });

    port.onDisconnect.addListener(() => {
        contentPorts.delete(tabId);
        console.log(`📄 Content script disconnected: tab ${tabId}`);
    });
});

// Get active tabs info
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "getTabs") {
        chrome.tabs.query({}, (tabs) => {
            sendResponse(tabs.map(t => ({ id: t.id, url: t.url, title: t.title })));
        });
        return true;
    }
});

// Screenshot streaming
let screenshotInterval = null;

function captureScreenshot() {
    chrome.tabs.captureVisibleTab(null, {
        format: 'jpeg',
        quality: 20  // Low quality for speed
    }, (dataUrl) => {
        if (chrome.runtime.lastError) {
            console.error("Screenshot error:", chrome.runtime.lastError);
            return;
        }
        sendToServer({
            type: 'screenshot',
            data: dataUrl,
            timestamp: Date.now()
        });
    });
}

function startScreenshotStream(interval = 3000) {
    if (screenshotInterval) return;

    console.log(`📸 Starting screenshot stream every ${interval}ms`);
    screenshotInterval = setInterval(captureScreenshot, interval);

    // Capture immediately
    captureScreenshot();
}

function stopScreenshotStream() {
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
        console.log("📸 Screenshot stream stopped");
    }
}

// Handle screenshot commands from server
const originalHandler = handleServerMessage;
handleServerMessage = function (msg) {
    const { id, action, params } = msg;

    if (action === "startScreenshots") {
        startScreenshotStream(params?.interval || 3000);
        sendToServer({ id, result: "screenshot streaming started" });
        return;
    }

    if (action === "stopScreenshots") {
        stopScreenshotStream();
        sendToServer({ id, result: "screenshot streaming stopped" });
        return;
    }

    if (action === "screenshot") {
        captureScreenshot();
        sendToServer({ id, result: "screenshot captured" });
        return;
    }

    // Forward other commands to content script
    originalHandler(msg);
};

// Initialize
connectWebSocket();

console.log("🤖 JARVIS Background Service started");
