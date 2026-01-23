/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

const Cvvs = ["cvv"];
const CcNumbers = ["ccnumber", "cardnumber", "cc-number"];

class PaymentFormDetector {
    #cvv;
    #ccnumber;

    constructor(doc) {
        const inputs  = doc.querySelectorAll("input[type=text]");
        for (const input of inputs) {
            if (input.labels.length === 0) {
                continue;
            }
            if (Cvvs.some(s => input.name.toLowerCase().includes(s) 
            || input.id.toLowerCase().includes(s))) {
                this.#cvv = input;
            }
            if (CcNumbers.some(s => input.name.toLowerCase().includes(s) 
            || input.id.toLowerCase().includes(s))) {
                this.#ccnumber = input;
            }
        }
    }

    isPaymentForm() {
        return [this.#cvv, this.#ccnumber].every(Boolean);
    }

    get ccnumberEl() {
        return this.#ccnumber;
    }

    get cvvEl() {
        return this.#cvv;
    }
}


