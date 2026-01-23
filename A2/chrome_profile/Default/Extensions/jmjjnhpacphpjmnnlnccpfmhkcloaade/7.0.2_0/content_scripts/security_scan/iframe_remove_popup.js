/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

class IframeRemovalPopup {

	#popup;
	#customization;
	#schema;

	constructor(customization, schema) {
		this.#customization = customization;
		this.#schema = schema;
	}

	show(timeout=3000) {
        
		if (document.getElementById(PopupId) != null) {
            return;
        }

		const url = window.location.href;
		let root = htmlToElem(`<iframe id="${PopupId}" class="${PopupId}" frameBorder="0" scrolling="no"></iframe>`);
		root.srcdoc = this.getTemplate();
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

            this.#popup.contentWindow.document.getElementById("fs-learn-more-btn").addEventListener("click", () => {
                const langs = Object.keys(LanguageMap);
                let learnMoreUrl = "https://help.f-secure.com/product.html#home/total-windows/latest/en/concept_6ED1A816262247C180C43E3E13143DDA-latest-en";
                const uiLang = chrome.i18n.getUILanguage();
                if (langs.includes(uiLang)) {
                    learnMoreUrl = `https://help.f-secure.com/product.html#home/total-windows/latest/${uiLang}/concept_6ED1A816262247C180C43E3E13143DDA-latest-${uiLang}`;
                }
				window.open(learnMoreUrl, "_blank");
			});

			let popupTimer;
			this.#popup.addEventListener("mouseleave", () => {
					popupTimer = setTimeout(() => {
						hide();
					}, 1000);
				}, false,
			);

			this.#popup.addEventListener("mouseenter", () => {
					clearTimeout(popupTimer);
				}, false,
			);

			popupTimer = setTimeout(() => {
				hide();
			}, timeout);

			this.#popup.height = this.#popup.contentWindow.document.body.scrollHeight + 24;
		});
	}

	getTemplate() {
		const extName = extensionName();
		const schema = this.#schema === Schema.Dark ? "dark" : "light";
		const borderColor = Colors.borderColor[schema];
		const closeIcon = chrome.runtime.getURL(`img/close_btn_${schema}.svg`);
        const msgContent = getI18nMessage("block_malicious_content", this.#customization.ProductName);
        const msgLearnMore = chrome.i18n.getMessage("learn_more");

		const productLogo = this.#schema === Schema.Dark ? this.#customization.ProductLogo : this.#customization.ProductLogoDark;
		const productName = productLogo ? `<img style="height: 24px;" src="${productLogo}"/>` : this.#customization.ProductName;
		const infoIcon = chrome.runtime.getURL(`img/fs_info_${schema}.svg`);
		return `
		<html>
		<head>
		<style>
				body {
					margin: 12px;
					font-family: 'Segoe UI', system-ui;
					font-style: normal;
					line-height: 18px;
					font-size: 14px;
					background-color: ${Colors.bgColor[schema]};
					color: ${Colors.fontColor[schema]};
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
					padding: 0;
					color: ${this.#customization.SecondaryColor};
				}
				#fs-close-btn {
					position: absolute;
					right: 12px;
					top: 12px;
					cursor: pointer;
					height: 24px; 
					width: 24px; 
				}
				.info-icon {
					background: url("${infoIcon}") center top no-repeat;
					background-size: contain;
					height: 24px;
					width: 24px;
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
					<div style="display: flex; align-items: center;">
						<div class="info-icon"></div>
						<div style="width: 280px; margin-left: 8px;">${msgContent}</div>
						<div style="margin-left: 30px;">
								<button id="fs-close-btn">
									<img src="${closeIcon}" style="height: 24px; width: 24px;"/>
								</button>
						</div>
					</div>
					<div style="margin-top: 8px; margin-bottom: 8px;">
						<button id="fs-learn-more-btn">${msgLearnMore}</button>
					</div>
						<div>
							<div style="border-top: 1px solid ${borderColor}; width: 100%;"></div>
								<div style="margin-top: 8px; display: flex; justify-content: flex-end;">
									${productName}
								</div>
								<div style="font-size: 10px; float: right;">
									${extName}
								</div>
						</div>						
				</div>
			</body>
		</html>
		`;
	}
}
