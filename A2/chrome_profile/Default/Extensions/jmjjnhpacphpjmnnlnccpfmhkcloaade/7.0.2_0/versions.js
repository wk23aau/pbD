/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

function compareVersions(version1, version2) {

    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
        const num1 = i < v1.length ? v1[i] : 0;
        const num2 = i < v2.length ? v2[i] : 0;

        if (num1 > num2) {
            return 1;
        } else if (num1 < num2) {
            return -1;
        }
    }

    return 0;
}

class ProductVersion {
    constructor(currentVersion) {
        this.currentVersion = currentVersion;
    }

    isGreaterThan(version) {
        return compareVersions(this.currentVersion, version) > 0;
    }

    isLessThan(version) {
        return compareVersions(this.currentVersion, version) < 0;
    }

    isEqualTo(version) {
        return compareVersions(this.currentVersion, version) === 0;
    }
}