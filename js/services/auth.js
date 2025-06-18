/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */

const { getSupabaseClient, supabaseUtils } = require('../config/supabase.js');

class AuthService {
  constructor() {
    this.client = null;
    this.currentUser = null;
    this.currentSession = null;
  }

  /**
   * Initialize auth service
   */
  async initialize() {
    try {
      this.client = getSupabaseClient();
      
      // Get current session
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error) throw error;
      
      this.currentSession = session;
      this.currentUser = session?.user || null;
      
      console.log('Auth service initialized');
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      throw error;
    }
  }

  /**
   * Sign up new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  async signUp(userData) {
    try {
      const { email, password, fullName, phone, role = 'driver' } = userData;

      // Sign up with Supabase Auth
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: role
          }
        }
      });

      if (error) throw error;

      // If user is created, update the users table
      if (data.user) {
        await this.createUserProfile(data.user, { fullName, phone, role });
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
        message: 'Registration successful. Please check your email for verification.'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Sign in user
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} Login result
   */
  async signIn(credentials) {
    try {
      const { email, password } = credentials;

      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.currentSession = data.session;
      this.currentUser = data.user;

      // Get user profile with role
      const userProfile = await this.getUserProfile(data.user.id);

      return {
        success: true,
        user: data.user,
        session: data.session,
        profile: userProfile,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Sign out user
   * @returns {Promise<Object>} Logout result
   */
  async signOut() {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;

      this.currentSession = null;
      this.currentUser = null;

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Reset password
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset result
   */
  async resetPassword(email) {
    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Password reset email sent. Please check your inbox.'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Update password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Update result
   */
  async updatePassword(newPassword) {
    try {
      const { error } = await this.client.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Get current user
   * @returns {Object|null} Current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current session
   * @returns {Object|null} Current session
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!this.currentSession && !!this.currentUser;
  }

  /**
   * Get user profile from database
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User profile
   */
  async getUserProfile(userId) {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Create user profile in database
   * @param {Object} user - Auth user object
   * @param {Object} additionalData - Additional profile data
   * @returns {Promise<Object>} Created profile
   */
  async createUserProfile(user, additionalData = {}) {
    try {
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: additionalData.fullName || user.user_metadata?.full_name || user.email.split('@')[0],
        phone: additionalData.phone || user.user_metadata?.phone || null,
        role: additionalData.role || 'driver',
        preferred_language: additionalData.preferredLanguage || 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('users')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated profile
   */
  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await this.client
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Get user role
   * @param {string} userId - User ID (optional, uses current user if not provided)
   * @returns {Promise<string>} User role
   */
  async getUserRole(userId = null) {
    try {
      const targetUserId = userId || this.currentUser?.id;
      if (!targetUserId) return 'guest';

      const profile = await this.getUserProfile(targetUserId);
      return profile?.role || 'driver';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'guest';
    }
  }

  /**
   * Check if user has specific role
   * @param {string} role - Role to check
   * @param {string} userId - User ID (optional)
   * @returns {Promise<boolean>} Has role
   */
  async hasRole(role, userId = null) {
    try {
      const userRole = await this.getUserRole(userId);
      return userRole === role;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  /**
   * Check if user is admin
   * @param {string} userId - User ID (optional)
   * @returns {Promise<boolean>} Is admin
   */
  async isAdmin(userId = null) {
    try {
      const userRole = await this.getUserRole(userId);
      return ['admin', 'super_admin'].includes(userRole);
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Refresh current session
   * @returns {Promise<Object>} Refresh result
   */
  async refreshSession() {
    try {
      const { data, error } = await this.client.auth.refreshSession();
      if (error) throw error;

      this.currentSession = data.session;
      this.currentUser = data.user;

      return {
        success: true,
        session: data.session,
        user: data.user
      };
    } catch (error) {
      console.error('Session refresh error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set up auth state change listener
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChange(callback) {
    return this.client.auth.onAuthStateChange((event, session) => {
      this.currentSession = session;
      this.currentUser = session?.user || null;
      
      callback(event, session);
    });
  }

  /**
   * Verify email
   * @param {string} token - Verification token
   * @param {string} type - Token type
   * @returns {Promise<Object>} Verification result
   */
  async verifyEmail(token, type = 'signup') {
    try {
      const { data, error } = await this.client.auth.verifyOtp({
        token_hash: token,
        type: type
      });

      if (error) throw error;

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Resend verification email
   * @param {string} email - User email
   * @returns {Promise<Object>} Resend result
   */
  async resendVerification(email) {
    try {
      const { error } = await this.client.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      console.error('Resend verification error:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }
}

// Create singleton instance
const authService = new AuthService();

module.exports = authService;
