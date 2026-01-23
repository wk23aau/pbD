/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

const GoogleAdRemover = {
	remove: function() {
		document.getElementById("tvcap").style.display = "none";
	}
}

class AdRemover {
	static remove() {
		try {
			var hostName = window.location.hostname;
			if (GoogleDomains.includes(hostName)) {
				GoogleAdRemover.remove();
			}
		}
		catch (e) {
			logi("No advertisement to remove", e.message);
		}
	}
}


