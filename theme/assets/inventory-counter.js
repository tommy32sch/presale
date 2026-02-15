/**
 * Live Inventory Counter
 *
 * Polls Shopify Storefront API for real-time inventory updates.
 * Updates the DOM when inventory changes.
 * Handles variant selection changes.
 *
 * @version 1.0.0
 */

(function () {
  'use strict';

  /**
   * Default configuration
   */
  const DEFAULT_CONFIG = {
    intervalMs: 5000,
    maxRetries: 3,
    retryDelayMs: 1000,
    pauseWhenHidden: true,
  };

  /**
   * GraphQL query for fetching product inventory
   */
  const INVENTORY_QUERY = `
    query getProductInventory($handle: String!) {
      product(handle: $handle) {
        id
        title
        totalInventory
        variants(first: 100) {
          edges {
            node {
              id
              title
              quantityAvailable
              availableForSale
            }
          }
        }
      }
    }
  `;

  /**
   * InventoryCounter class
   * Manages real-time inventory display for a single product
   */
  class InventoryCounter {
    /**
     * @param {HTMLElement} container - The inventory counter container element
     */
    constructor(container) {
      this.container = container;
      this.productHandle = container.dataset.productHandle;
      this.productId = container.dataset.productId;
      this.currentVariantId = container.dataset.currentVariantId;
      this.storefrontToken = container.dataset.storefrontToken;
      this.shopDomain = container.dataset.shopDomain;
      this.pollInterval = parseInt(container.dataset.pollInterval, 10) * 1000 || DEFAULT_CONFIG.intervalMs;

      // DOM references
      this.statusEl = container.querySelector('[data-inventory-status]');
      this.numberEl = container.querySelector('[data-inventory-number]');
      this.loadingEl = container.querySelector('[data-inventory-loading]');
      this.soldOutBadge = container.querySelector('[data-sold-out-badge]');

      // State
      this.inventoryCache = null;
      this.pollingTimer = null;
      this.retryCount = 0;
      this.lastKnownQuantity = this.numberEl ? parseInt(this.numberEl.textContent, 10) : 0;
      this.isSoldOut = container.classList.contains('inventory-counter--sold-out');
      this.isPolling = false;

      // Validate required data
      if (!this.storefrontToken) {
        console.warn('[InventoryCounter] No Storefront API token provided. Real-time updates disabled.');
        return;
      }

      if (!this.productHandle) {
        console.warn('[InventoryCounter] No product handle provided.');
        return;
      }

      // Initialize
      this.init();
    }

    /**
     * Initialize the counter
     */
    init() {
      // Bind methods
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      this.handleVariantChange = this.handleVariantChange.bind(this);

      // Set up visibility listener
      if (DEFAULT_CONFIG.pauseWhenHidden) {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
      }

      // Set up variant change listeners
      this.setupVariantListeners();

      // Start polling (unless already sold out with no chance of restock tracking)
      this.startPolling();

      // Initial fetch to populate cache
      this.fetchInventory();
    }

    /**
     * Set up listeners for variant selection changes
     * Shopify themes handle this differently, so we try multiple approaches
     */
    setupVariantListeners() {
      // Method 1: Listen to native select changes
      const variantSelects = document.querySelectorAll(
        'select[name="id"], [data-variant-select], .product-form__input select'
      );
      variantSelects.forEach((select) => {
        select.addEventListener('change', (e) => {
          this.handleVariantChange(e.target.value);
        });
      });

      // Method 2: Listen to radio/swatch clicks
      const variantRadios = document.querySelectorAll(
        'input[name="id"], [data-variant-input]'
      );
      variantRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            this.handleVariantChange(e.target.value);
          }
        });
      });

      // Method 3: Listen for custom theme events (common patterns)
      document.addEventListener('variant:changed', (e) => {
        if (e.detail && e.detail.variant) {
          this.handleVariantChange(e.detail.variant.id);
        }
      });

      // Method 4: Listen for URL changes (some themes update URL on variant change)
      this.setupURLObserver();

      // Method 5: Observe data attribute changes on the container
      this.setupContainerObserver();
    }

    /**
     * Watch for URL parameter changes (variant=xxx)
     */
    setupURLObserver() {
      // Check URL on popstate
      window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const variantId = urlParams.get('variant');
        if (variantId && variantId !== this.currentVariantId) {
          this.handleVariantChange(variantId);
        }
      });

      // Initial URL check
      const urlParams = new URLSearchParams(window.location.search);
      const variantId = urlParams.get('variant');
      if (variantId) {
        this.currentVariantId = variantId;
      }
    }

    /**
     * Watch for changes to the container's data-current-variant-id attribute
     */
    setupContainerObserver() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-current-variant-id') {
            const newVariantId = this.container.dataset.currentVariantId;
            if (newVariantId !== this.currentVariantId) {
              this.handleVariantChange(newVariantId);
            }
          }
        });
      });

      observer.observe(this.container, {
        attributes: true,
        attributeFilter: ['data-current-variant-id'],
      });
    }

    /**
     * Handle variant selection change
     * @param {string} variantId - The new variant ID
     */
    handleVariantChange(variantId) {
      if (!variantId || variantId === this.currentVariantId) return;

      this.currentVariantId = variantId;

      // If we have cached data, update immediately
      if (this.inventoryCache && this.inventoryCache.variants[variantId]) {
        const variant = this.inventoryCache.variants[variantId];
        this.updateDisplay(variant.quantity, variant.available);
      } else {
        // No cache, fetch fresh data
        this.fetchInventory();
      }
    }

    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        // Tab became visible - fetch immediately then resume polling
        this.fetchInventory();
        this.startPolling();
      } else {
        // Tab hidden - pause polling
        this.stopPolling();
      }
    }

    /**
     * Start the polling interval
     */
    startPolling() {
      if (this.isPolling) return;

      this.isPolling = true;
      this.pollingTimer = setInterval(() => {
        this.fetchInventory();
      }, this.pollInterval);
    }

    /**
     * Stop the polling interval
     */
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }
      this.isPolling = false;
    }

    /**
     * Fetch inventory from Storefront API
     */
    async fetchInventory() {
      const endpoint = `https://${this.shopDomain}/api/2024-01/graphql.json`;

      try {
        this.showLoading(true);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': this.storefrontToken,
          },
          body: JSON.stringify({
            query: INVENTORY_QUERY,
            variables: { handle: this.productHandle },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.errors) {
          throw new Error(data.errors[0].message);
        }

        if (!data.data || !data.data.product) {
          throw new Error('Product not found');
        }

        // Reset retry count on success
        this.retryCount = 0;

        // Process and cache the data
        this.processInventoryData(data.data.product);
      } catch (error) {
        console.error('[InventoryCounter] Fetch error:', error.message);
        this.handleFetchError();
      } finally {
        this.showLoading(false);
      }
    }

    /**
     * Process inventory data from API response
     * @param {Object} product - The product data from GraphQL
     */
    processInventoryData(product) {
      // Build cache
      const variants = {};

      product.variants.edges.forEach(({ node }) => {
        // Convert GraphQL ID to numeric ID for comparison
        // GraphQL ID format: "gid://shopify/ProductVariant/123456"
        const numericId = node.id.split('/').pop();

        variants[numericId] = {
          quantity: node.quantityAvailable,
          available: node.availableForSale,
          title: node.title,
        };

        // Also store with full GraphQL ID
        variants[node.id] = variants[numericId];
      });

      this.inventoryCache = {
        productId: product.id,
        lastUpdated: Date.now(),
        totalInventory: product.totalInventory,
        variants: variants,
      };

      // Update display for current variant
      const currentVariant = variants[this.currentVariantId];
      if (currentVariant) {
        this.updateDisplay(currentVariant.quantity, currentVariant.available);
      }
    }

    /**
     * Handle fetch errors with retry logic
     */
    handleFetchError() {
      this.retryCount++;

      if (this.retryCount <= DEFAULT_CONFIG.maxRetries) {
        // Retry after delay
        setTimeout(() => {
          this.fetchInventory();
        }, DEFAULT_CONFIG.retryDelayMs * this.retryCount);
      } else {
        // Max retries reached - show last known value (already displayed)
        // Reset retry count for next polling cycle
        this.retryCount = 0;
      }
    }

    /**
     * Update the display with new inventory data
     * @param {number} quantity - The inventory quantity
     * @param {boolean} available - Whether the variant is available for sale
     */
    updateDisplay(quantity, available) {
      const previousQuantity = this.lastKnownQuantity;
      const wasSoldOut = this.isSoldOut;
      const isNowSoldOut = quantity <= 0 || !available;

      // Update state
      this.lastKnownQuantity = quantity;
      this.isSoldOut = isNowSoldOut;

      // Handle sold out transition
      if (isNowSoldOut && !wasSoldOut) {
        this.handleSoldOut();
        return;
      }

      // Handle back in stock transition
      if (!isNowSoldOut && wasSoldOut) {
        this.handleBackInStock(quantity);
        return;
      }

      // Regular inventory update
      if (this.numberEl && quantity !== previousQuantity) {
        this.animateNumberChange(quantity);
      }
    }

    /**
     * Animate the number change
     * @param {number} newQuantity - The new quantity to display
     */
    animateNumberChange(newQuantity) {
      if (!this.numberEl) return;

      // Add animation class
      this.numberEl.classList.add('changed');

      // Update the number
      this.numberEl.textContent = newQuantity;

      // Remove animation class after animation completes
      setTimeout(() => {
        this.numberEl.classList.remove('changed');
      }, 300);
    }

    /**
     * Handle transition to sold out state
     */
    handleSoldOut() {
      // Update container class
      this.container.classList.add('inventory-counter--sold-out');

      // Hide inventory status, show sold out badge
      if (this.statusEl) {
        this.statusEl.style.display = 'none';
      }

      if (this.soldOutBadge) {
        this.soldOutBadge.style.display = '';
      } else {
        // Create sold out badge if it doesn't exist
        const badge = document.createElement('span');
        badge.className = 'sold-out-badge';
        badge.dataset.soldOutBadge = '';
        badge.textContent = 'Sold Out';
        this.container.insertBefore(badge, this.container.firstChild);
        this.soldOutBadge = badge;
      }

      // Disable Add to Cart button
      this.updateAddToCartButton(false);

      // Stop polling - inventory is at zero
      this.stopPolling();
    }

    /**
     * Handle transition back to in stock
     * @param {number} quantity - The new quantity
     */
    handleBackInStock(quantity) {
      // Update container class
      this.container.classList.remove('inventory-counter--sold-out');

      // Show inventory status, hide sold out badge
      if (this.statusEl) {
        this.statusEl.style.display = '';
      }

      if (this.soldOutBadge) {
        this.soldOutBadge.style.display = 'none';
      }

      // Update the number
      if (this.numberEl) {
        this.numberEl.textContent = quantity;
      }

      // Re-enable Add to Cart button
      this.updateAddToCartButton(true);

      // Resume polling
      this.startPolling();
    }

    /**
     * Update the Add to Cart button state
     * @param {boolean} enabled - Whether the button should be enabled
     */
    updateAddToCartButton(enabled) {
      // Try multiple common selectors for Add to Cart buttons
      const selectors = [
        '[data-add-to-cart]',
        '.add-to-cart',
        '.product-form__submit',
        'button[name="add"]',
        '#AddToCart',
        '.btn-add-to-cart',
        '[type="submit"][name="add"]',
      ];

      const button = document.querySelector(selectors.join(', '));

      if (button) {
        button.disabled = !enabled;

        if (!enabled) {
          // Store original text for restoration
          if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
          }
          button.textContent = 'Sold Out';
        } else {
          // Restore original text
          if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
          }
        }
      }
    }

    /**
     * Show/hide loading indicator
     * @param {boolean} show - Whether to show the loading indicator
     */
    showLoading(show) {
      if (this.loadingEl) {
        this.loadingEl.style.display = show ? '' : 'none';
      }

      if (this.numberEl) {
        this.numberEl.classList.toggle('updating', show);
      }
    }

    /**
     * Cleanup - remove listeners and stop polling
     */
    destroy() {
      this.stopPolling();
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Initialize all inventory counters on the page
   */
  function initInventoryCounters() {
    const counters = document.querySelectorAll('[data-inventory-counter]');

    counters.forEach((container) => {
      // Skip if already initialized
      if (container.dataset.initialized) return;

      container.dataset.initialized = 'true';
      new InventoryCounter(container);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInventoryCounters);
  } else {
    initInventoryCounters();
  }

  // Re-initialize when new content is added (for AJAX-loaded content)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          initInventoryCounters();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Expose class for external use if needed
  window.InventoryCounter = InventoryCounter;
})();
