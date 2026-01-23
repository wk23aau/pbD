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

            // Wait for element to appear
            case "waitForElement":
                result = await waitForElement(params.selector, params.timeout || 10000);
                break;

            // Cookie management
            case "getCookies":
                result = document.cookie;
                break;

            case "setCookie":
                document.cookie = `${params.name}=${params.value}; path=${params.path || '/'}`;
                result = "cookie set";
                break;

            case "getStorage":
                result = {
                    local: { ...localStorage },
                    session: { ...sessionStorage }
                };
                break;

            case "setStorage":
                if (params.type === 'session') {
                    sessionStorage.setItem(params.key, params.value);
                } else {
                    localStorage.setItem(params.key, params.value);
                }
                result = "storage set";
                break;

            // Iframe access
            case "getIframes":
                result = Array.from(document.querySelectorAll('iframe')).map((f, i) => ({
                    index: i,
                    src: f.src,
                    name: f.name,
                    id: f.id
                }));
                break;

            case "iframeEval":
                const iframe = document.querySelectorAll('iframe')[params.index];
                if (iframe?.contentWindow) {
                    result = iframe.contentWindow.eval(params.code);
                } else {
                    result = { error: "iframe not accessible" };
                }
                break;

            // Stealth detection
            case "checkStealth":
                result = detectBotSignals();
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

// Wait for element with timeout
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (el) {
            resolve({ found: true, html: el.outerHTML.slice(0, 500) });
            return;
        }

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve({ found: true, html: el.outerHTML.slice(0, 500) });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            resolve({ found: false, timeout: true });
        }, timeout);
    });
}

// Detect bot signals (anti-bot detection check)
function detectBotSignals() {
    return {
        webdriver: navigator.webdriver,
        languages: navigator.languages?.length || 0,
        plugins: navigator.plugins?.length || 0,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        hasChrome: !!window.chrome,
        hasNotification: !!window.Notification,
        hasPermissions: !!navigator.permissions,
        // Common bot indicators
        suspicious: {
            noWebGL: !document.createElement('canvas').getContext('webgl'),
            noPlugins: navigator.plugins?.length === 0,
            isWebdriver: navigator.webdriver === true,
            noLanguages: navigator.languages?.length === 0
        }
    };
}

// Stealth mode injection
function injectStealth() {
    // Override webdriver detection
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });

    // Fake plugins
    Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
    });

    // Fake languages
    Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
    });

    console.log('🥷 Stealth mode active');
}

// Initialize
injectStealth();  // Enable stealth by default
connect();
injectCursor();

console.log("🤖 JARVIS Bridge active");
