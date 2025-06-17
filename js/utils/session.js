/**
 * Session Management Utilities
 * Handles session storage, user preferences, and authentication state
 */

import authService from '../services/auth.js';

class SessionManager {
  constructor() {
    this.storageKey = 'asalat-session';
    this.preferencesKey = 'asalat-preferences';
    this.listeners = new Set();
  }

  /**
   * Initialize session manager
   */
  async initialize() {
    try {
      // Set up auth state change listener
      authService.onAuthStateChange((event, session) => {
        this.handleAuthStateChange(event, session);
      });

      // Load saved preferences
      this.loadUserPreferences();

      console.log('Session manager initialized');
    } catch (error) {
      console.error('Failed to initialize session manager:', error);
    }
  }

  /**
   * Handle authentication state changes
   * @param {string} event - Auth event type
   * @param {Object} session - User session
   */
  handleAuthStateChange(event, session) {
    switch (event) {
      case 'SIGNED_IN':
        this.handleSignIn(session);
        break;
      case 'SIGNED_OUT':
        this.handleSignOut();
        break;
      case 'TOKEN_REFRESHED':
        this.handleTokenRefresh(session);
        break;
    }

    // Notify listeners
    this.notifyListeners(event, session);
  }

  /**
   * Handle user sign in
   * @param {Object} session - User session
   */
  async handleSignIn(session) {
    try {
      // Store session info
      this.setSessionData({
        userId: session.user.id,
        email: session.user.email,
        signedInAt: new Date().toISOString(),
        expiresAt: session.expires_at
      });

      // Load user preferences
      await this.loadUserPreferencesFromDB(session.user.id);

      console.log('User signed in:', session.user.email);
    } catch (error) {
      console.error('Error handling sign in:', error);
    }
  }

  /**
   * Handle user sign out
   */
  handleSignOut() {
    // Clear session data
    this.clearSessionData();
    this.clearUserPreferences();
    
    console.log('User signed out');
  }

  /**
   * Handle token refresh
   * @param {Object} session - Refreshed session
   */
  handleTokenRefresh(session) {
    // Update session expiry
    this.updateSessionData({
      expiresAt: session.expires_at,
      refreshedAt: new Date().toISOString()
    });
  }

  /**
   * Store session data in localStorage
   * @param {Object} sessionData - Session data to store
   */
  setSessionData(sessionData) {
    try {
      const existingData = this.getSessionData() || {};
      const updatedData = { ...existingData, ...sessionData };
      localStorage.setItem(this.storageKey, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Error storing session data:', error);
    }
  }

  /**
   * Get session data from localStorage
   * @returns {Object|null} Session data
   */
  getSessionData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving session data:', error);
      return null;
    }
  }

  /**
   * Update session data
   * @param {Object} updates - Data to update
   */
  updateSessionData(updates) {
    const currentData = this.getSessionData() || {};
    this.setSessionData({ ...currentData, ...updates });
  }

  /**
   * Clear session data
   */
  clearSessionData() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Error clearing session data:', error);
    }
  }

  /**
   * Store user preferences
   * @param {Object} preferences - User preferences
   */
  setUserPreferences(preferences) {
    try {
      const existingPrefs = this.getUserPreferences() || {};
      const updatedPrefs = { ...existingPrefs, ...preferences };
      localStorage.setItem(this.preferencesKey, JSON.stringify(updatedPrefs));
    } catch (error) {
      console.error('Error storing user preferences:', error);
    }
  }

  /**
   * Get user preferences
   * @returns {Object} User preferences
   */
  getUserPreferences() {
    try {
      const data = localStorage.getItem(this.preferencesKey);
      return data ? JSON.parse(data) : {
        language: 'en',
        theme: 'light',
        notifications: true,
        autoSave: true
      };
    } catch (error) {
      console.error('Error retrieving user preferences:', error);
      return {
        language: 'en',
        theme: 'light',
        notifications: true,
        autoSave: true
      };
    }
  }

  /**
   * Update user preferences
   * @param {Object} updates - Preference updates
   */
  updateUserPreferences(updates) {
    const currentPrefs = this.getUserPreferences();
    this.setUserPreferences({ ...currentPrefs, ...updates });
  }

  /**
   * Clear user preferences
   */
  clearUserPreferences() {
    try {
      localStorage.removeItem(this.preferencesKey);
    } catch (error) {
      console.error('Error clearing user preferences:', error);
    }
  }

  /**
   * Load user preferences from localStorage
   */
  loadUserPreferences() {
    const preferences = this.getUserPreferences();
    
    // Apply language preference
    if (preferences.language) {
      document.documentElement.lang = preferences.language;
      document.documentElement.dir = preferences.language === 'ar' ? 'rtl' : 'ltr';
    }

    // Apply theme preference
    if (preferences.theme) {
      document.documentElement.setAttribute('data-theme', preferences.theme);
    }
  }

  /**
   * Load user preferences from database
   * @param {string} userId - User ID
   */
  async loadUserPreferencesFromDB(userId) {
    try {
      const profile = await authService.getUserProfile(userId);
      if (profile) {
        const dbPreferences = {
          language: profile.preferred_language || 'en'
        };
        
        // Merge with local preferences
        const localPrefs = this.getUserPreferences();
        this.setUserPreferences({ ...localPrefs, ...dbPreferences });
        this.loadUserPreferences();
      }
    } catch (error) {
      console.error('Error loading preferences from database:', error);
    }
  }

  /**
   * Save user preferences to database
   * @param {Object} preferences - Preferences to save
   */
  async saveUserPreferencesToDB(preferences) {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      await authService.updateUserProfile(user.id, {
        preferred_language: preferences.language
      });
    } catch (error) {
      console.error('Error saving preferences to database:', error);
    }
  }

  /**
   * Check if session is valid
   * @returns {boolean} Session validity
   */
  isSessionValid() {
    const sessionData = this.getSessionData();
    if (!sessionData || !sessionData.expiresAt) return false;

    const expiryTime = new Date(sessionData.expiresAt).getTime();
    const currentTime = new Date().getTime();
    
    return currentTime < expiryTime;
  }

  /**
   * Get time until session expires
   * @returns {number} Minutes until expiry
   */
  getTimeUntilExpiry() {
    const sessionData = this.getSessionData();
    if (!sessionData || !sessionData.expiresAt) return 0;

    const expiryTime = new Date(sessionData.expiresAt).getTime();
    const currentTime = new Date().getTime();
    const diffMs = expiryTime - currentTime;
    
    return Math.max(0, Math.floor(diffMs / (1000 * 60))); // Convert to minutes
  }

  /**
   * Add session state change listener
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of session changes
   * @param {string} event - Event type
   * @param {Object} session - Session data
   */
  notifyListeners(event, session) {
    this.listeners.forEach(callback => {
      try {
        callback(event, session);
      } catch (error) {
        console.error('Error in session listener:', error);
      }
    });
  }

  /**
   * Get user display name
   * @returns {string} Display name
   */
  getUserDisplayName() {
    const sessionData = this.getSessionData();
    const user = authService.getCurrentUser();
    
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    
    if (sessionData?.email) {
      return sessionData.email.split('@')[0];
    }
    
    return 'User';
  }

  /**
   * Get user avatar URL or initials
   * @returns {string} Avatar URL or initials
   */
  getUserAvatar() {
    const user = authService.getCurrentUser();
    const displayName = this.getUserDisplayName();
    
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    
    // Return initials as fallback
    return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  /**
   * Set up session expiry warning
   * @param {number} warningMinutes - Minutes before expiry to warn
   * @param {Function} callback - Warning callback
   */
  setupExpiryWarning(warningMinutes = 5, callback) {
    const checkExpiry = () => {
      const timeUntilExpiry = this.getTimeUntilExpiry();
      
      if (timeUntilExpiry > 0 && timeUntilExpiry <= warningMinutes) {
        callback(timeUntilExpiry);
      }
    };

    // Check every minute
    const intervalId = setInterval(checkExpiry, 60000);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Auto-refresh session before expiry
   * @param {number} refreshMinutes - Minutes before expiry to refresh
   */
  setupAutoRefresh(refreshMinutes = 10) {
    const checkAndRefresh = async () => {
      const timeUntilExpiry = this.getTimeUntilExpiry();
      
      if (timeUntilExpiry > 0 && timeUntilExpiry <= refreshMinutes) {
        try {
          await authService.refreshSession();
          console.log('Session refreshed automatically');
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        }
      }
    };

    // Check every 5 minutes
    const intervalId = setInterval(checkAndRefresh, 5 * 60 * 1000);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;

// Utility functions
export const sessionUtils = {
  /**
   * Format session duration
   * @param {number} minutes - Duration in minutes
   * @returns {string} Formatted duration
   */
  formatDuration: (minutes) => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  },

  /**
   * Check if user has been idle
   * @param {number} idleMinutes - Idle threshold in minutes
   * @returns {boolean} Is idle
   */
  isUserIdle: (idleMinutes = 30) => {
    const lastActivity = localStorage.getItem('last-activity');
    if (!lastActivity) return false;
    
    const lastActivityTime = new Date(lastActivity).getTime();
    const currentTime = new Date().getTime();
    const idleTime = (currentTime - lastActivityTime) / (1000 * 60);
    
    return idleTime > idleMinutes;
  },

  /**
   * Update last activity timestamp
   */
  updateActivity: () => {
    localStorage.setItem('last-activity', new Date().toISOString());
  }
};

