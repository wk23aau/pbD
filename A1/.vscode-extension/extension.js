/**
 * JARVIS VS Code Extension
 * Bridges Gemini AI with Chrome browser via WebSocket
 */

const vscode = require('vscode');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');

let serverProcess = null;
let chromeProcess = null;
let wsServer = null;
let extensionClient = null;

// Output channel for logs
let outputChannel;

function activate(context) {
    outputChannel = vscode.window.createOutputChannel('JARVIS Browser');
    outputChannel.appendLine('🤖 JARVIS Browser Bridge activated');

    // Command: Start Browser
    context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.startBrowser', async () => {
            await startBrowserWithExtension();
        })
    );

    // Command: Stop Browser
    context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.stopBrowser', () => {
            stopBrowser();
        })
    );

    // Command: Get DOM
    context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.getDOM', async () => {
            const dom = await sendToExtension('getDOM');
            if (dom) {
                const doc = await vscode.workspace.openTextDocument({
                    content: typeof dom === 'string' ? dom : JSON.stringify(dom, null, 2),
                    language: 'html'
                });
                vscode.window.showTextDocument(doc);
            }
        })
    );

    // Start WebSocket server for Chrome extension
    startWebSocketServer();

    outputChannel.appendLine('✅ Extension ready. Use command palette: JARVIS: Start Browser');
}

function startWebSocketServer() {
    wsServer = new WebSocket.Server({ port: 9222 });

    wsServer.on('connection', (ws) => {
        outputChannel.appendLine('🔌 Chrome extension connected');
        extensionClient = ws;

        ws.on('message', (data) => {
            const msg = JSON.parse(data);
            handleExtensionMessage(msg);
        });

        ws.on('close', () => {
            outputChannel.appendLine('🔌 Chrome extension disconnected');
            extensionClient = null;
        });
    });

    outputChannel.appendLine('🌐 WebSocket server on ws://localhost:9222');
}

async function startBrowserWithExtension() {
    const extensionPath = path.join(__dirname, '..', 'extension');

    // Find Chrome
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];

    let chromePath = null;
    for (const p of chromePaths) {
        try {
            require('fs').accessSync(p);
            chromePath = p;
            break;
        } catch { }
    }

    if (!chromePath) {
        vscode.window.showErrorMessage('Chrome not found');
        return;
    }

    // Launch Chrome with extension
    chromeProcess = spawn(chromePath, [
        `--load-extension=${extensionPath}`,
        '--no-first-run',
        '--no-default-browser-check',
        'https://google.com'
    ]);

    outputChannel.appendLine('🚀 Chrome launched with JARVIS extension');
    vscode.window.showInformationMessage('JARVIS Browser started');
}

function stopBrowser() {
    if (chromeProcess) {
        chromeProcess.kill();
        chromeProcess = null;
    }
    vscode.window.showInformationMessage('JARVIS Browser stopped');
}

let pendingRequests = new Map();
let requestId = 0;

function sendToExtension(action, params = {}) {
    return new Promise((resolve, reject) => {
        if (!extensionClient) {
            vscode.window.showWarningMessage('No browser connected. Start browser first.');
            resolve(null);
            return;
        }

        const id = ++requestId;
        pendingRequests.set(id, { resolve, reject });

        extensionClient.send(JSON.stringify({ id, action, params }));

        // Timeout
        setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                resolve({ error: 'timeout' });
            }
        }, 30000);
    });
}

function handleExtensionMessage(msg) {
    if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        resolve(msg.result);
    } else if (msg.type === 'dom_stream') {
        outputChannel.appendLine(`📡 DOM update: ${msg.changes?.length || 0} changes`);
    }
}

function deactivate() {
    if (wsServer) wsServer.close();
    if (chromeProcess) chromeProcess.kill();
}

module.exports = { activate, deactivate };
