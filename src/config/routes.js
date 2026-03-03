// Valid internal routes for header links
export const VALID_INTERNAL_ROUTES = [
  '/',
  '/products',
  '/product', // Dynamic route - will validate pattern separately
  '/cart',
  '/checkout',
  '/login',
  '/wishlist',
  '/account',
  '/orders',
  '/forgot-password',
];

// Route patterns for dynamic routes
export const ROUTE_PATTERNS = {
  product: /^\/product\/[^/]+$/, // /product/[id]
  order: /^\/orders\/[^/]+$/,     // /orders/[id]
};

/**
 * Validate if a URL is a valid internal route
 */
export const isValidInternalRoute = (url) => {
  // Check exact matches
  if (VALID_INTERNAL_ROUTES.includes(url)) {
    return true;
  }

  // Check dynamic route patterns
  for (const pattern of Object.values(ROUTE_PATTERNS)) {
    if (pattern.test(url)) {
      return true;
    }
  }

  return false;
};

/**
 * Validate if a URL is a valid external URL
 */
export const isValidExternalUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validate header link URL
 * @param {string} url - The URL to validate
 * @param {boolean} openInNewTab - Whether the link opens in new tab
 * @returns {object} { valid: boolean, error: string }
 */
export const validateHeaderLinkUrl = (url, openInNewTab = false) => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  // If it's an external URL (starts with http:// or https://)
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    if (!isValidExternalUrl(trimmedUrl)) {
      return { valid: false, error: 'Invalid external URL format' };
    }
    // External URLs should open in new tab for security
    if (!openInNewTab) {
      return { 
        valid: false, 
        error: 'External URLs must open in a new tab for security reasons' 
      };
    }
    return { valid: true };
  }

  // Internal routes must start with /
  if (!trimmedUrl.startsWith('/')) {
    return { valid: false, error: 'Internal routes must start with /' };
  }

  // Validate internal route
  if (!isValidInternalRoute(trimmedUrl)) {
    return { 
      valid: false, 
      error: `Invalid route. Valid routes: ${VALID_INTERNAL_ROUTES.join(', ')}, /product/[id], /orders/[id]` 
    };
  }

  return { valid: true };
};
