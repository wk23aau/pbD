const SPA_DOMAINS = {
  'youtube': {
    searchParam: 'search_query',
    contentSelectors: ['#contents', '#page-manager'],
    searchResultSelectors: [
      '#contents',
      '[data-testid="search-results"]',
      '.ytd-search',
      '#search-results',
      '.ytd-video-renderer',
      '.ytd-rich-item-renderer'
    ],
    searchFormSelectors: [
      'form[action*="search"]',
      '#search-form',
      'form[role="search"]',
      'form'
    ],
    searchInputSelectors: [
      '#search',
      'input[name="search_query"]',
      'input[placeholder*="Search"]',
      'input[type="text"]'
    ],
    searchButtonSelectors: [
      'button[aria-label*="Search"]',
      'button[type="submit"]',
      '#search-icon-legacy'
    ]
  },
  'bing': {
    searchParam: 'q',
    contentSelectors: ['#b_content', '#b_results'],
    searchResultSelectors: [
      '#b_results',
      '.b_algo',
      '#b_context',
      'main'
    ],
    searchFormSelectors: [
      'form#sb_form',
      'form[action="/search"]',
      'form'
    ],
    searchInputSelectors: [
      '#sb_form_q',
      'input[name="q"]',
      'input[type="search"]',
      'input[placeholder*="Search"]'
    ],
    searchButtonSelectors: [
      '#sb_form_go',
      'button[type="submit"]',
      'label#search_icon'
    ]
  }
};

const getSupportedDomains = () => {
  return Object.keys(SPA_DOMAINS);
};

const isDomainSupported = (domain) => {
  return getSupportedDomains().includes(domain);
};

class SPAHandler {
  constructor(domain, contentLoadedCallback) {
    this.domain = domain;
    this.domainConfig = SPA_DOMAINS[domain];
    this.contentLoadedCallback = contentLoadedCallback;
    this.currentUrl = window.location.href;
    this.lastProcessedUrl = this.currentUrl;
    this.navigationTimeout = null;
    this.observers = [];
    
    if (!this.domainConfig) {
      console.warn(`No SPA configuration found for domain: ${domain}`);
      return;
    }
    
    this.init();
  }

  init() {
    this.setupHistoryMonitoring();
    this.setupContentMonitoring();
    this.setupSearchFormMonitoring();
    this.setupSearchInputMonitoring();
    this.setupPeriodicUrlCheck();
  }

  setupHistoryMonitoring() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(this, args);
      setTimeout(() => this.handleNavigation(), 100);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(this, args);
      setTimeout(() => this.handleNavigation(), 100);
    };

    window.addEventListener('popstate', () => {
      setTimeout(() => this.handleNavigation(), 100);
    });
  }

  setupContentMonitoring() {
    const observeContentChanges = () => {
      const contentTarget = this.findElement(this.domainConfig.contentSelectors);
      if (!contentTarget) {
        setTimeout(observeContentChanges, 500);
        return;
      }
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            const hasSearchResults = Array.from(mutation.addedNodes).some(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                return node.querySelector && this.domainConfig.searchResultSelectors.some(selector => 
                  node.querySelector(selector)
                );
              }
              return false;
            });
            
            if (hasSearchResults && !window._RIPPLE_TRIGGERED && this.isSearchUrl()) {
              setTimeout(async () => {
                await this.contentLoadedCallback(true);
              }, 500);
            }
          }
        });
      });

      const config = { childList: true, subtree: true };
      observer.observe(contentTarget, config);
      this.observers.push(observer);
    };

    observeContentChanges();
  }

  setupSearchFormMonitoring() {
    const observeSearchForms = () => {
      const searchForm = this.findElement(this.domainConfig.searchFormSelectors);
      
      if (searchForm) {
        searchForm.addEventListener('submit', () => {
          setTimeout(() => this.handleNavigation(), 500);
        });
      } else {
        setTimeout(observeSearchForms, 1000);
      }
    };

    observeSearchForms();
  }

  setupSearchInputMonitoring() {
    const observeSearchInput = () => {
      const searchInput = this.findElement(this.domainConfig.searchInputSelectors);
      
      if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            if (this.isSearchUrl()) {
              this.handleNavigation();
            }
          }, 1000);
        });
        
        // Monitor search button clicks
        const searchButton = this.findElement(this.domainConfig.searchButtonSelectors);
        if (searchButton) {
          searchButton.addEventListener('click', () => {
            setTimeout(() => this.handleNavigation(), 500);
          });
        }
      } else {
        setTimeout(observeSearchInput, 1000);
      }
    };

    observeSearchInput();
  }

  setupPeriodicUrlCheck() {
    setInterval(() => {
      if (window.location.href !== this.currentUrl) {
        this.currentUrl = window.location.href;
        this.handleNavigation();
      }
    }, 2000);
  }

  handleNavigation() {
    const newUrl = window.location.href;
    
    // Clear any existing timeout
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
    }
    
    // Only process if URL has actually changed and contains search parameters
    if (newUrl !== this.lastProcessedUrl && this.isSearchUrl()) {
      this.lastProcessedUrl = newUrl;
      
      // Reset the trigger flags to allow new processing for this URL
      window._RIPPLE_TRIGGERED = false;
      window._RIPPLE_LAST_PROCESSED_URL = null;
      window._RIPPLE_CURRENT_TRIGGER = null;
      
      // Wait for search results to load
      this.waitForSearchResults();
    }
  }

  waitForSearchResults() {
    const checkForResults = () => {
      const searchResults = this.findElement(this.domainConfig.searchResultSelectors);
      
      if (searchResults && searchResults.children.length > 0) {
        // Search results are loaded, process the search
        this.navigationTimeout = setTimeout(async () => {
          if (!window._RIPPLE_TRIGGERED) {
            await this.contentLoadedCallback(true);
          }
        }, 500);
      } else {
        // Search results not loaded yet, wait a bit more
        this.navigationTimeout = setTimeout(checkForResults, 500);
      }
    };
    
    // Start waiting for search results
    this.navigationTimeout = setTimeout(checkForResults, 500);
  }

  isSearchUrl() {
    return window.location.href.includes(this.domainConfig.searchParam);
  }

  findElement(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  destroy() {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    // Clear any pending timeouts
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
    }
  }
}

export { SPAHandler, SPA_DOMAINS, getSupportedDomains, isDomainSupported }; 