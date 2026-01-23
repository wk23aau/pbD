/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

const FsLog = {

    isNativeMessagingConfigured: false,
    isBackgroundScript: true,

    objectToString(val) {
        if (val instanceof Object) {
            return JSON.stringify(val);
        }
        return val;
    },

    send(line, type, args) {
        if (Browser.isSafari) {
            return;
        }
        if (line.includes("native_messaging")) {
            return;
        }
        const entry = this.toEntry(line, args);
        const message = {
            type: "log",
            loglevel: type,
            entry: entry
        };

        if (this.isBackgroundScript) {
            this.sendFromBackgroundScript(message);
        } else {
            this.sendFromContentScript(message);
        }
    },

    sendFromBackgroundScript(message) {
        if (!this.isNativeMessagingConfigured) {
            return;
        }
        if (typeof Settings == "undefined") {
            return;
        }
        if (typeof NativeHost == "undefined") {
            return;
        }
        NativeHost.postMessage(message);
    },

    sendFromContentScript(message) {
        chrome.runtime.sendMessage({type: MessageName.SaveToLog, message});
    },

    toEntry(line, args) {
        let entry = "";
        for (const arg of args) {
            entry += " " + this.objectToString(arg);
        }
        return "[" + line + "]:" + entry;
    },

    getLine() {
        const err = new Error();
        const lines = err.stack.split('\n');
        for (const line of lines) {
            if (line.includes("log.js")) {
                continue; // skipping lines generated for log.js file itself
            }
            if (!line.includes(chrome.runtime.getURL(''))) {
                continue; // skipping service lines unrelated to extension logging (ex.: log message type)
            }

            let trimmedLine = line;
            if (Browser.isSafari || Browser.isFirefox) {
                // Safari and Firefox use the following format
                // "init@safari-web-extension://F14793BB-E5BC-4B43-BBF1-7D4F2C92BE4E/src/ols_worker.js:115:13"
                // [postMessage/<@moz-extension://d4d1877e-bc1d-4253-a590-c122bd3d7b3b/native_messaging.js:123:25]
                trimmedLine = this.trim(trimmedLine, "@");
            } else {
                // Chrome and Edge browsers use the following format
                // "    at OlsWorker.init (chrome-extension://bgcnjjheejipjnfkahngpfhgcpmeolhk/ols_worker.js:115:9)"
                trimmedLine = this.trim(line, "at ");
            }

            return trimmedLine;
        }
        return "<unknown>";
    },

    trim(line, separator) {
        if (line.includes(separator)) {
            const split = line.split(separator);
            if (split.length > 1) {
                return split[1];
            }
        }
        return line;
    },

    info(...args) {
        const line = this.getLine();
        console.log.apply(console, ["[" + line + "]:", ...args]);
        this.send(line, "info", args);
    },

    debug(...args) {
        const line = this.getLine();
        console.log.apply(console, ["[" + line + "]:", ...args]);
        this.send(line, "debug", args);
    },

    warn(...args) {
        const line = this.getLine();
        console.warn.apply(console, ["[" + line + "]:", ...args]);
        this.send(line, "warn", args);
    },

    error(...args) {
        const line = this.getLine();
        console.error.apply(console, ["[" + line + "]:", ...args]);
        this.send(line, "error", args);
    }

}

const logi = FsLog.info.bind(FsLog);
const logd = FsLog.debug.bind(FsLog);
const logw = FsLog.warn.bind(FsLog);
const loge = FsLog.error.bind(FsLog);
