class FsSchemaMonitor {

    #mediaKeyDark = '(prefers-color-scheme: dark)';
    #schemaChangedCallback;

    start() {
        // get initial state
        this.#updateState();

        // start monitoring for changes
        window.matchMedia(this.#mediaKeyDark).addEventListener('change', () => {
            this.#updateState();
        });
    }

    setSchemaChangedCallback(callback) {
        this.#schemaChangedCallback = callback;
    }

    // private update function
    #updateState() {
        const isDarkMode = window.matchMedia(this.#mediaKeyDark).matches;
        chrome.runtime.sendMessage({
            type: MessageName.SchemaChanged,
            schema: isDarkMode ? Schema.Dark : Schema.Light
        });
        if (this.#schemaChangedCallback) {
            this.#schemaChangedCallback(isDarkMode);
        }
    }

    detectCustomSchema() {
        const body = document.body;
        const backgroundColor = window.getComputedStyle(body).backgroundColor;
    
        // Define thresholds or specific colors for light and dark themes
        const darkThemeColors = ['rgb(0, 0, 0)', 'rgb(27, 26, 25)', 'rgb(31, 31, 31)', 'rgb(28, 28, 28)'];
        const lightThemeColors = ['rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)'];
    
        if (darkThemeColors.includes(backgroundColor)) {
            return Schema.Dark;
        } else if (lightThemeColors.includes(backgroundColor)) {
            return Schema.Light;
        } else {
            // Fallback or custom logic if the color is not in predefined lists
            const rgb = backgroundColor.match(/\d+/g);
            // The numbers 299, 587, and 114 are the standard coefficients for converting RGB to grayscale
            const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
            return brightness < 128 ? Schema.Dark : Schema.Light;
        }
    }
}