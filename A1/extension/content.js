/**
 * JARVIS Content Script
 * Runs in every page, provides DOM access and streaming
 */

// Connection to background script
let port = null;

// DOM mutation observer
let observer = null;

// Connect to background script
function connect() {
    port = chrome.runtime.connect({ name: "jarvis-content" });

    port.onMessage.addListener((msg) => {
        handleCommand(msg);
    });

    port.onDisconnect.addListener(() => {
        setTimeout(connect, 1000);
    });
}

// Handle commands from AI
async function handleCommand(msg) {
    const { id, action, params } = msg;
    let result;

    try {
        switch (action) {
            case "getDOM":
                result = document.documentElement.outerHTML;
                break;

            case "querySelector":
                const el = document.querySelector(params.selector);
                result = el ? {
                    tag: el.tagName,
                    text: el.textContent?.slice(0, 500),
                    html: el.outerHTML?.slice(0, 1000)
                } : null;
                break;

            case "querySelectorAll":
                result = Array.from(document.querySelectorAll(params.selector))
                    .slice(0, params.limit || 100)
                    .map(el => ({
                        tag: el.tagName,
                        text: el.textContent?.slice(0, 200),
                        href: el.href || null
                    }));
                break;

            case "click":
                document.querySelector(params.selector)?.click();
                result = "clicked";
                break;

            case "type":
                const input = document.querySelector(params.selector);
                if (input) {
                    input.value = params.text;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                result = "typed";
                break;

            case "scroll":
                window.scrollBy(0, params.amount || 500);
                result = "scrolled";
                break;

            case "eval":
                result = eval(params.code);
                break;

            case "highlight":
                const target = document.querySelector(params.selector);
                if (target) {
                    target.style.outline = "3px solid #4ecdc4";
                    target.style.boxShadow = "0 0 10px #4ecdc4";
                }
                result = "highlighted";
                break;

            case "startStreaming":
                startDOMStreaming();
                result = "streaming started";
                break;

            case "stopStreaming":
                stopDOMStreaming();
                result = "streaming stopped";
                break;

            case "screenshot":
                result = await captureScreenshot();
                break;

            case "startScreenshots":
                startScreenshotStream(params.interval || 3000, params.quality || 0.2);
                result = "screenshot streaming started";
                break;

            case "stopScreenshots":
                stopScreenshotStream();
                result = "screenshot streaming stopped";
                break;

            default:
                result = { error: "unknown action" };
        }
    } catch (e) {
        result = { error: e.message };
    }

    port.postMessage({ id, result });
}

// Screenshot streaming
let screenshotInterval = null;

async function captureScreenshot() {
    // Use html2canvas-like approach with canvas
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Simple screenshot using DOM serialization
    return {
        url: window.location.href,
        title: document.title,
        scroll: { x: window.scrollX, y: window.scrollY },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        timestamp: Date.now()
    };
}

function startScreenshotStream(interval = 3000, quality = 0.2) {
    if (screenshotInterval) return;

    screenshotInterval = setInterval(async () => {
        const screenshot = await captureScreenshot();
        port.postMessage({
            type: "screenshot_stream",
            data: screenshot,
            timestamp: Date.now()
        });
    }, interval);

    console.log(`📸 Screenshot streaming every ${interval}ms`);
}

function stopScreenshotStream() {
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
    }
}

// Real-time DOM streaming
function startDOMStreaming() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
        const changes = mutations.map(m => ({
            type: m.type,
            target: m.target.tagName,
            added: m.addedNodes.length,
            removed: m.removedNodes.length
        }));

        port.postMessage({
            type: "dom_stream",
            changes: changes,
            timestamp: Date.now()
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    });
}

function stopDOMStreaming() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

// Add visual cursor
function injectCursor() {
    if (document.getElementById('_jarvis_cursor')) return;

    const style = document.createElement('style');
    style.textContent = `
        #_jarvis_cursor {
            position: fixed;
            width: 20px; height: 20px;
            background: radial-gradient(circle, #ff6b6b 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 999999;
            transform: translate(-50%, -50%);
            transition: all 0.1s ease-out;
            box-shadow: 0 0 15px #ff6b6b;
        }
    `;
    document.head.appendChild(style);

    const cursor = document.createElement('div');
    cursor.id = '_jarvis_cursor';
    document.body.appendChild(cursor);

    window._moveCursor = (x, y) => {
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
    };
}

// Initialize
connect();
injectCursor();

console.log("🤖 JARVIS Bridge active");
