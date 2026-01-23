/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

class TrustedShoppingPopup {

	#popup;
	#rating;
	#customization;
	#schema;

	constructor(rating, customization, schema) {
		this.#rating = rating;
		this.#customization = customization;
		this.#schema = schema;
	}

	show(showSafeSiteNotification=true, showSuspiciousSiteNotification=true, timeout=3000) {
        
		if (document.getElementById(PopupId) != null) {
            return;
        }

		if (this.#rating === 1) {
			return;
		}

		if (!showSafeSiteNotification && this.#rating >= 4) {
			return;
		}

		const isSuspicious = this.#rating >= 2 && this.#rating <= 3;
		if (!showSuspiciousSiteNotification && isSuspicious) {
			return;
		}

		const url = window.location.href;
		let root = htmlToElem(`<iframe id="${PopupId}" class="${PopupId}" frameBorder="0" scrolling="no"></iframe>`);
		root.srcdoc = this.getTemplate(url, this.#rating);
		document.body.appendChild(root);
		this.#popup = document.getElementById(PopupId);
		this.#popup.style.width = "364px";
		
		this.#popup.addEventListener("load", () => {
			root.style.right = "15px";
			let hide = () => {
				root.style.bottom = -this.#popup.contentWindow.document.body.scrollHeight - 10 + "px";
				setTimeout(()=>{
					root.style.display = "none"; 
				}, 500);
			};
			this.#popup.contentWindow.document.getElementById("fs-close-btn").addEventListener("click", () => {
				hide();
			});

			this.#popup.contentWindow.document.getElementById("fs-button-settings").addEventListener("click", () => {
				window.open("fsecureapp://settings/securebrowsing");
			});

			let popupTimer;
			if (!isSuspicious) {
				this.#popup.addEventListener("mouseleave", () => {
						popupTimer = setTimeout(() => {
							hide();
						}, 1000);
					}, false,
				);
			}

			this.#popup.addEventListener("mouseenter", () => {
					clearTimeout(popupTimer);
				}, false,
			);

			if (this.#rating >= 4) {
				popupTimer = setTimeout(() => {
					hide();
				}, timeout);
			}

			this.#popup.height = this.#popup.contentWindow.document.body.scrollHeight + 8;
		});
	}

	getTemplate(url, rating) {
		const extName = extensionName();
		const schema = this.#schema === Schema.Dark ? "dark" : "light";
		const borderColor = Colors.borderColor[schema];
		const closeIcon = chrome.runtime.getURL(`img/close_btn_${schema}.svg`);
		const settingsLoc = chrome.i18n.getMessage("manage_protection");

		let p1;
		let status = StatusType.Safe;

		switch (rating) {
			case 5:
				p1 = chrome.i18n.getMessage("trusted_shopping_safe_p1");
				break;
			case 4:
				p1 = chrome.i18n.getMessage("trusted_shopping_warning_p1");
				break;
			case 3:
				p1 = chrome.i18n.getMessage("trusted_shopping_suspicious_p1");
				status = StatusType.Suspicious;
				break;
			case 2:
				p1 = chrome.i18n.getMessage("trusted_shopping_risky");
				status = StatusType.Suspicious;
				break;
			default:
				p1 = chrome.i18n.getMessage("trusted_shopping_unknown_p1");
				status = StatusType.Unknown;
		}

		const iconsHtml = getTrustedShoppingTemplate(rating);

		const productLogo = this.#schema === Schema.Dark ? this.#customization.ProductLogo : this.#customization.ProductLogoDark;
		const productName = productLogo ? `<img style="height: 24px;" src="${productLogo}"/>` : this.#customization.ProductName;
		return `
		<html>
		<head>
		<style>
				body {
					margin: 0;
					font-family: 'Segoe UI', system-ui;
					font-style: normal;
					font-weight: 600;
					line-height: 18px;
					font-size: 14px;
					background-color: ${Colors.bgColor[schema]};
					color: ${Colors.fontColor[schema]};
					padding-left: 12px;
					padding-right: 12px;
					padding-bottom: 12px
				}
				.icon-container {
					position: relative;
					display: inline-block;
				}

				.icon-container img {
					position: absolute;
					top: 20;
					left: 20;
				}

				.icon-container img.status-icon {
					z-index: 999999;
					top: 9px;
					height: 10px;
				}

				.icon-container > img {
					display: inline-block;
					vertical-align: middle;
				}

				button {
					border: none;
					background: none;
					cursor: pointer;
					font-size: 14px;
					font-weight: 400;
					line-height: 16px;
					letter-spacing: 0;
					font-family: 'Segoe UI', system-ui;
					font-style: normal;
					color: ${this.#customization.SecondaryColor};
					padding: 0;
				}
				#fs-close-btn {
					position: absolute;
					right: 12px;
					top: 12px;
					cursor: pointer;
					height: 24px; 
					width: 24px; 
				}
				.url {
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					letter-spacing: -0.4px;
					line-height: 16px;
					font-weight: 400;
					margin-top: 4px;
					margin-bottom: 8px;
				}

				@media(prefers-color-scheme: dark) {
					a, a:link, a:visited {
						filter: brightness(1.25);
					}

					a:hover, a:active {
						filter: brightness(1.44);
					}
				}
		</style>
	</head>
			<body>
				<div>
					<div>
						${getTypeIcon(status, true, false, schema)}
						<div style="margin-top: -4px; margin-left: 30px; margin-bottom: 12px;">
							<div style="display: ${iconsHtml ? "block" : "none"}">
								${iconsHtml}
							</div>
								<button id="fs-close-btn">
									<img src="${closeIcon}" style="height: 24px; width: 24px;"/>
								</button>
						</div>
						<div>
							<div>${p1}</div>
							<div class="url">${url}</div>
							<button id="fs-button-settings" style="margin-bottom: 12px">
							${settingsLoc}
							</button>
						</div>
						<div>
							<div style="border-top: 1px solid ${borderColor}; width: 100%;">
								<div style="margin-top: 8px; display: flex; justify-content: flex-end;">
									${productName}
								</div>
								<div style="font-size: 10px; float: right; margin-bottom:8px;">
									${extName}
								</div>
							</div>	
						</div>
					</div>
				</div>
			</body>
		</html>
		`;
	}
}
