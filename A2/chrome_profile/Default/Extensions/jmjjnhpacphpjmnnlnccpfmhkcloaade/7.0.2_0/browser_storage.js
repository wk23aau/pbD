/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

const StorageType = Object.freeze({
    Local:   "local",
    Session: "session"
});

class BrowserStorage {

    static getLocal(keys) {
        return this.#get(keys, StorageType.Local);
    }

    static setLocal(keys) {
        return this.#set(keys, StorageType.Local);
    }

    static getSession(keys) {
        return this.#get(keys, StorageType.Session);
    }

    static setSession(keys) {
        return this.#set(keys, StorageType.Session);
    }

    static #get(keys, type) {
        return new Promise((resolve) => {
            let storage = chrome.storage[type];
            storage.get(keys, (result) => {
                resolve(result);
            });
        });
    }

    static #logDroppedKeys(original, parsedJson) {
        const keys1 = Object.keys(original);
        const keys2 = Object.keys(parsedJson);
        const missingKeys = keys1.filter(key => !keys2.includes(key));
        if (missingKeys.length > 0) {
            console.warn(`Not saving keys ${missingKeys} to storage due to JSON serialization issues.`);
        }
    }

    static #set(data, type) {
        return new Promise((resolve) => {
            // make sure that the data passed to storage API is JSON serializable
            // otherwise, an exception might be thrown (for example, if the data contains a null/undefined value)
            const jsonString = JSON.stringify(data);
            const jsonObject = JSON.parse(jsonString);
            this.#logDroppedKeys(data, jsonObject);
            let storage = chrome.storage[type];
            storage.set(jsonObject, () => {
                resolve();
            });
        });
    }

    static addListenerLocal(callback) {
        this.#addListener(callback, StorageType.Local);
    }

    static addListenerSession(callback) {
        this.#addListener(callback, StorageType.Session);
    }

    static #addListener(callback, type) {
        let storage = chrome.storage[type];
        storage.onChanged.addListener(callback);
    }

}
