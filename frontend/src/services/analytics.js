// frontend/src/services/analytics.js
// Google Analytics 4 (GA4) helper for Single Page Apps (SPA)

const GA_MEASUREMENT_ID = "G-PKH1Z7F27E";

/**
 * Tracks a page view in Google Analytics 4
 * @param {string} path - URL path (e.g. /home, /banking)
 * @param {string} title - Document title
 */
export const trackGAPageView = (path, title = document.title) => {
  if (typeof window.gtag === "function") {
    const fullUrl = window.location.origin + path;
    
    // 1. Update the page context for the measurement ID
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: title,
      page_location: fullUrl,
    });

    // 2. Explicitly dispatch the page_view event for the timeline stream
    window.gtag("event", "page_view", {
      page_path: path,
      page_title: title,
      page_location: fullUrl,
    });
  }
};

/**
 * Sets user identity and properties in Google Analytics 4
 * @param {object} user - User object from backend authentication
 */
export const setGAUser = (user) => {
  if (typeof window.gtag === "function" && user) {
    const userId = user._id || user.id || user.email;
    window.gtag("config", GA_MEASUREMENT_ID, {
      user_id: userId,
    });
    window.gtag("set", "user_properties", {
      user_plan: user.plan || "free",
      user_role: user.role || "user",
    });
  }
};

/**
 * Clears user identity from Google Analytics on logout
 */
export const clearGAUser = () => {
  if (typeof window.gtag === "function") {
    window.gtag("config", GA_MEASUREMENT_ID, {
      user_id: null,
    });
  }
};

/**
 * Tracks a custom user interaction event in GA4
 * @param {string} eventName - Custom event name (e.g., 'document_upload', 'generate_summary')
 * @param {object} params - Additional event parameters
 */
export const trackGAEvent = (eventName, params = {}) => {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
};
