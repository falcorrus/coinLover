/**
 * CoinLover Application Settings and Constants
 */

export const APP_SETTINGS = {
  // Timing & Delays (ms)
  SPLASH_SCREEN_DURATION: 600,
  CONFLICT_CHECK_DELAY: 1500,
  DEMO_MODE_RESET_TIMER: 2000,
  ACCOUNT_MODAL_AUTO_OPEN_DELAY: 1000,
  
  // Drag & Drop
  DND_ACTIVATION_DISTANCE: 10,
  DND_SORTING_MODE_DELAY: 600,
  DND_DRAG_MOVE_THRESHOLD: 30, // threshold for delta before clearing sorting timer
  
  // UI & Feedback
  HAPTIC_FEEDBACK_DURATION_SHORT: 20,
  HAPTIC_FEEDBACK_DURATION_MEDIUM: 50,
  
  // Storage Keys
  STORAGE_KEYS: {
    THEME: "coinlover_theme",
    PILL_MODE: "cl_pill_mode",
    DEMO_MODE: "coinlover_demo",
    ACCOUNTS: "cl_accounts",
    CATEGORIES: "cl_categories",
    INCOMES: "cl_incomes",
    TRANSACTIONS: "cl_transactions",
    LAST_SYNC: "cl_last_sync",
    LAST_CURRENCY: "cl_last_currency",
    ANALYTICS_SELECTIONS: "cl_analytics_selections",
    EXCHANGE_RATES: "cl_exchange_rates",
    RATES_LAST_SYNC: "cl_rates_last_sync",
  },

  // Rates Service
  RATES: {
    SYNC_INTERVAL_HOURS: 6,
  },

  // UI Constants
  UI: {
    ICON_SIZE_OVERLAY: 28,
    ICON_SIZE_SMALL: 14,
    ICON_SIZE_MEDIUM: 16,
    ICON_SIZE_LARGE: 20,
    ICON_SIZE_SPLASH: 64,
  }
};
