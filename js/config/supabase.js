/**
 * Supabase Configuration and Client Setup
 * Handles Supabase client initialization and configuration management
 */

import { createClient } from '@supabase/supabase-js';
import { getEnvironmentConfig } from './environment.js';

class SupabaseConfig {
  constructor() {
    this.client = null;
    this.config = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Supabase client
   * @param {Object} options - Configuration options
   * @returns {Object} Supabase client instance
   */
  async initialize(options = {}) {
    try {
      this.config = getEnvironmentConfig();
      
      if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
        throw new Error('Supabase URL and Anon Key are required');
      }

      const supabaseOptions = {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          ...options.auth
        },
        global: {
          headers: {
            'X-Client-Info': `asalat-delivery-platform@${this.config.appVersion}`,
            ...options.headers
          }
        },
        ...options
      };

      this.client = createClient(
        this.config.supabaseUrl,
        this.config.supabaseAnonKey,
        supabaseOptions
      );

      this.isInitialized = true;
      
      // Set up auth state change listener
      this.setupAuthListener();
      
      console.log('Supabase client initialized successfully');
      return this.client;
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  /**
   * Get Supabase client instance
   * @returns {Object} Supabase client
   */
  getClient() {
    if (!this.isInitialized || !this.client) {
      throw new Error('Supabase client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Set up authentication state change listener
   */
  setupAuthListener() {
    if (!this.client) return;

    this.client.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      // Dispatch custom event for auth state changes
      window.dispatchEvent(new CustomEvent('supabase-auth-change', {
        detail: { event, session }
      }));

      // Handle specific auth events
      switch (event) {
        case 'SIGNED_IN':
          this.handleSignIn(session);
          break;
        case 'SIGNED_OUT':
          this.handleSignOut();
          break;
        case 'TOKEN_REFRESHED':
          console.log('Token refreshed successfully');
          break;
        case 'USER_UPDATED':
          console.log('User updated');
          break;
      }
    });
  }

  /**
   * Handle user sign in
   * @param {Object} session - User session
   */
  async handleSignIn(session) {
    try {
      // Update user profile if needed
      await this.syncUserProfile(session.user);
    } catch (error) {
      console.error('Error handling sign in:', error);
    }
  }

  /**
   * Handle user sign out
   */
  handleSignOut() {
    // Clear any cached data
    localStorage.removeItem('user-preferences');
    console.log('User signed out, cleared local data');
  }

  /**
   * Sync user profile with database
   * @param {Object} user - Auth user object
   */
  async syncUserProfile(user) {
    try {
      const { data, error } = await this.client
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      console.log('User profile synced successfully');
    } catch (error) {
      console.error('Error syncing user profile:', error);
    }
  }

  /**
   * Get current user session
   * @returns {Object|null} Current session
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }

  /**
   * Get current user
   * @returns {Object|null} Current user
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  async isAuthenticated() {
    const session = await this.getCurrentSession();
    return !!session;
  }

  /**
   * Get user role from database
   * @returns {string|null} User role
   */
  async getUserRole() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      const { data, error } = await this.client
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data?.role || 'driver';
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Create a real-time subscription
   * @param {string} table - Table name
   * @param {Object} options - Subscription options
   * @returns {Object} Subscription object
   */
  createSubscription(table, options = {}) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const subscription = this.client
      .channel(`${table}-changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
        ...options.filter
      }, options.callback || ((payload) => {
        console.log('Real-time update:', payload);
      }))
      .subscribe();

    return subscription;
  }

  /**
   * Handle connection errors and retry logic
   * @param {Function} operation - Operation to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise} Operation result
   */
  async withRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}

// Create singleton instance
const supabaseConfig = new SupabaseConfig();

// Export singleton instance and client getter
export default supabaseConfig;

/**
 * Get initialized Supabase client
 * @returns {Object} Supabase client
 */
export const getSupabaseClient = () => {
  return supabaseConfig.getClient();
};

/**
 * Initialize Supabase (call this once in your app)
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Supabase client
 */
export const initializeSupabase = async (options = {}) => {
  return await supabaseConfig.initialize(options);
};

/**
 * Utility functions for common operations
 */
export const supabaseUtils = {
  /**
   * Check if error is authentication related
   * @param {Error} error - Error object
   * @returns {boolean} Is auth error
   */
  isAuthError: (error) => {
    return error?.message?.includes('JWT') || 
           error?.message?.includes('auth') ||
           error?.status === 401;
  },

  /**
   * Check if error is network related
   * @param {Error} error - Error object
   * @returns {boolean} Is network error
   */
  isNetworkError: (error) => {
    return error?.message?.includes('fetch') ||
           error?.message?.includes('network') ||
           error?.code === 'NETWORK_ERROR';
  },

  /**
   * Format Supabase error for user display
   * @param {Error} error - Error object
   * @param {string} language - Language code
   * @returns {string} Formatted error message
   */
  formatError: (error, language = 'en') => {
    const messages = {
      en: {
        network: 'Network connection error. Please check your internet connection.',
        auth: 'Authentication error. Please log in again.',
        permission: 'You do not have permission to perform this action.',
        validation: 'Please check your input and try again.',
        generic: 'An error occurred. Please try again later.'
      },
      ar: {
        network: 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.',
        auth: 'خطأ في المصادقة. يرجى تسجيل الدخول مرة أخرى.',
        permission: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
        validation: 'يرجى التحقق من المدخلات والمحاولة مرة أخرى.',
        generic: 'حدث خطأ. يرجى المحاولة مرة أخرى لاحقاً.'
      }
    };

    const msgs = messages[language] || messages.en;

    if (supabaseUtils.isNetworkError(error)) return msgs.network;
    if (supabaseUtils.isAuthError(error)) return msgs.auth;
    if (error?.message?.includes('permission')) return msgs.permission;
    if (error?.message?.includes('validation')) return msgs.validation;
    
    return msgs.generic;
  }
};

