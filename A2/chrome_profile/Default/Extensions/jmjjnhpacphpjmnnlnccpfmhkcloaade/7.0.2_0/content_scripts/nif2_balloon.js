/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */


const BalloonFrame = '<div class="fs-ols-balloon" id="fs-ols-balloon"><iframe class="fs-ols-frame" id="fs-ols-frame"></iframe></div>';

class FsOlsBalloon {

	#balloon;
	#customization;
	#schema;
	#isShowing = false;

	constructor() {
		this.#balloon = htmlToElem(BalloonFrame);
		this.#schema = schemaMonitor.detectCustomSchema();
		BrowserStorage.getLocal(["customization"]).then(storageResult => {
			this.#customization = {
				MainColor: "#0028A0",
				SecondaryColor: "#006CD9",
				...storageResult.customization
			};
		});
	}

	inject() {
		document.body.appendChild(this.#balloon);
		const icons = document.getElementsByClassName("fs-bubble-info");
		Array.from(icons).forEach( (icon) => {
			icon.addEventListener('mouseover', (e) => {
				if (!this.#isShowing) {
					this.show(e.target);
					this.#isShowing = true;
				}
			});
			icon.addEventListener('mouseout', (e) => {
				if (this.#isShowing) {
					this.hide();
					this.#isShowing = false;
				}
			});
		});
	}

	getTemplate(extName, status, url, categories, shoppingSite, bankingSite, trustworthiness, borderColor) {
		let iconsHtml = "";
		const schema = this.#schema === Schema.Dark ? "dark" : "light";
		if (status != "denied")
		{
			if (categories) {
				let cats = fsGetCategoryResources(categories.split(","));
				for (let i = 0; i < cats.length; i++) {
					iconsHtml += `<img style="height: 20px;" src="${cats[i].icon}" title="${cats[i].title}"></img>`;
				}
			}
			else if (shoppingSite) {
				if (trustworthiness > 0) {
					iconsHtml = getTrustedShoppingTemplate(trustworthiness);
				}
			}
		}


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
					top: 10px;
					height: 14px;
				}

				.icon-container > img {
					display: inline-block;
					vertical-align: middle;
				}

				.url {
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					letter-spacing: -0.4px;
					line-height: 16px;
					font-weight: 400;
					margin-top: 4px;
					margin-bottom: 4px;
				}
			</style>
			</head>
			<body>
				<div>
					<div>
						${getTypeIcon(status, shoppingSite, bankingSite, schema)}
						<div style="margin-top: -4px; margin-left: 30px; margin-bottom: 12px;">
							<div style="display: ${iconsHtml ? "block" : "none"}">
								${iconsHtml}
							</div>
							<div>
								<div>
									${fsGetRatingResources(status).title}
								</div>
								<div class="url">
									${url}
								</div>
							</div>
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

	hide() {
        this.#balloon.style.display = 'none';
	}

	#createFrame() {
		let frame = document.getElementById("fs-ols-frame");
		// Remove any existing event listeners
		// Note: This creates a new clone to ensure all event listeners are removed
		// Using removeEventListener would require storing function references
		const newFrame = frame.cloneNode(false);
		frame.parentNode.replaceChild(newFrame, frame);
		frame = newFrame;

		// Reset balloon to initial state to prevent cumulative height increases
		this.#balloon.style.height = '';
		frame.style.height = '';
		// Force reset CSS custom property by setting to empty string first
		document.documentElement.style.setProperty('--fs-balloon-height', '');
		document.documentElement.style.removeProperty('--fs-balloon-height');

		return frame;
	}

	async show(icon) {
		if (icon.dataset.url == undefined) {
			return;
		}
		let frame = this.#createFrame();

		const schema = this.#schema === Schema.Dark ? "dark" : "light";
		const borderColor = Colors.borderColor[schema];

		const html = this.getTemplate(icon.dataset.ext_name,
			icon.dataset.rating,
			icon.dataset.url,
			icon.dataset.categories,
			icon.dataset.shoppingSite === "true",
			icon.dataset.bankingSite === "true",
			parseInt(icon.dataset.trustworthiness),
			borderColor
		);

		frame.srcdoc = html;

		this.#balloon.style.left = getOffset(icon).left - 11 + "px";


		const setBaloon = (height) => {
			const balloonHeight = height + 10 + 'px';
			// Set CSS custom property

			document.documentElement.style.setProperty('--fs-balloon-height', balloonHeight);
			document.documentElement.style.setProperty('--fs-border-color', borderColor);
			// Also set inline styles as fallback
			frame.style.height = balloonHeight;
			this.#balloon.style.height = balloonHeight;
			this.#balloon.style.top = getOffset(icon).top - height - 32 + "px";

		};

		frame.addEventListener('load', () => {
			if (this.#isShowing) {
				const body = frame.contentWindow.document.body;
				this.#balloon.style.display = 'block';
				const initialHeight = body.scrollHeight;
				setBaloon(initialHeight);

				// Safari-specific: Check for clipping after rendering
				if (Browser.isSafari) {
					const balloonScrollHeight = this.#balloon.scrollHeight;
					const balloonClientHeight = this.#balloon.clientHeight;

					if (balloonScrollHeight > balloonClientHeight) {
						// Content is clipped, adjust to the full scroll height
						const adjustedHeight = balloonScrollHeight - 10; // Remove the padding we add in setBaloon
						setBaloon(adjustedHeight);
					}
				}
			}
		});
	}
}
