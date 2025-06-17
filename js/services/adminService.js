/**
 * Admin Service
 * Handles admin operations, application management, and system administration
 */

import { getSupabaseClient, supabaseUtils } from '../config/supabase.js';
import authService from './auth.js';

class AdminService {
  constructor() {
    this.client = null;
  }

  /**
   * Initialize admin service
   */
  async initialize() {
    try {
      this.client = getSupabaseClient();
      console.log('Admin service initialized');
    } catch (error) {
      console.error('Failed to initialize admin service:', error);
      throw error;
    }
  }

  /**
   * Check if current user is admin
   * @returns {Promise<boolean>} Is admin
   */
  async isCurrentUserAdmin() {
    try {
      return await authService.isAdmin();
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get all driver applications with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Applications data
   */
  async getDriverApplications(options = {}) {
    try {
      if (!(await this.isCurrentUserAdmin())) {
        throw new Error('Access denied: Admin privileges required');
      }

      const {
        page = 1,
        limit = 20,
        status = null,
        search = null,
        sortBy = 'submitted_at',
        sortOrder = 'desc'
      } = options;

      let query = this.client
        .from('driver_applications')
        .select(`
          *,
          users!driver_applications_user_id_fkey (
            full_name,
            email,
            phone
          ),
          driver_documents (
            id,
            document_type,
            is_verified,
            uploaded_at
          )
        `, { count: 'exact' });

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,national_id.ilike.%${search}%,mobile_number.ilike.%${search}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        success: true,
        applications: data || [],
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error getting driver applications:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Update application status
   * @param {string} applicationId - Application ID
   * @param {string} newStatus - New status
   * @param {string} notes - Admin notes
   * @param {string} rejectionReason - Rejection reason (if applicable)
   * @returns {Promise<Object>} Update result
   */
  async updateApplicationStatus(applicationId, newStatus, notes = null, rejectionReason = null) {
    try {
      if (!(await this.isCurrentUserAdmin())) {
        throw new Error('Access denied: Admin privileges required');
      }

      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Get current application
      const { data: currentApp, error: fetchError } = await this.client
        .from('driver_applications')
        .select('status')
        .eq('id', applicationId)
        .single();

      if (fetchError) throw fetchError;

      const previousStatus = currentApp.status;

      // Prepare update data
      const updateData = {
        status: newStatus,
        admin_notes: notes,
        updated_at: new Date().toISOString()
      };

      // Add status-specific fields
      if (newStatus === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      if (newStatus === 'under_review') {
        updateData.reviewed_at = new Date().toISOString();
      }

      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }

      // Update application
      const { data, error } = await this.client
        .from('driver_applications')
        .update(updateData)
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;

      // Create status history entry
      await this.createStatusHistory(applicationId, previousStatus, newStatus, user.id, notes);

      return {
        success: true,
        application: data,
        message: `Application status updated to ${newStatus}`
      };
    } catch (error) {
      console.error('Error updating application status:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Verify document
   * @param {string} documentId - Document ID
   * @param {boolean} isVerified - Verification status
   * @returns {Promise<Object>} Verification result
   */
  async verifyDocument(documentId, isVerified) {
    try {
      if (!(await this.isCurrentUserAdmin())) {
        throw new Error('Access denied: Admin privileges required');
      }

      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const updateData = {
        is_verified: isVerified,
        verified_at: isVerified ? new Date().toISOString() : null,
        verified_by: isVerified ? user.id : null
      };

      const { data, error } = await this.client
        .from('driver_documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        document: data,
        message: `Document ${isVerified ? 'verified' : 'unverified'} successfully`
      };
    } catch (error) {
      console.error('Error verifying document:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Dashboard stats
   */
  async getDashboardStats() {
    try {
      if (!(await this.isCurrentUserAdmin())) {
        throw new Error('Access denied: Admin privileges required');
      }

      // Get application counts by status
      const { data: statusCounts, error: statusError } = await this.client
        .from('driver_applications')
        .select('status')
        .then(({ data, error }) => {
          if (error) throw error;
          
          const counts = {
            pending: 0,
            under_review: 0,
            approved: 0,
            rejected: 0,
            requires_documents: 0,
            total: data?.length || 0
          };

          data?.forEach(app => {
            if (counts.hasOwnProperty(app.status)) {
              counts[app.status]++;
            }
          });

          return { data: counts, error: null };
        });

      if (statusError) throw statusError;

      // Get recent applications (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentApps, error: recentError } = await this.client
        .from('driver_applications')
        .select('id')
        .gte('submitted_at', sevenDaysAgo.toISOString());

      if (recentError) throw recentError;

      // Get unread contact messages
      const { data: unreadMessages, error: messagesError } = await this.client
        .from('contact_messages')
        .select('id')
        .eq('is_read', false);

      if (messagesError) throw messagesError;

      // Get platform distribution
      const { data: platformData, error: platformError } = await this.client
        .from('driver_applications')
        .select('preferred_platform')
        .then(({ data, error }) => {
          if (error) throw error;
          
          const distribution = {
            hungerstation: 0,
            jahez: 0,
            both: 0
          };

          data?.forEach(app => {
            if (distribution.hasOwnProperty(app.preferred_platform)) {
              distribution[app.preferred_platform]++;
            }
          });

          return { data: distribution, error: null };
        });

      if (platformError) throw platformError;

      return {
        success: true,
        stats: {
          applications: statusCounts,
          recentApplications: recentApps?.length || 0,
          unreadMessages: unreadMessages?.length || 0,
          platformDistribution: platformData
        }
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Get contact messages
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Contact messages
   */
  async getContactMessages(options = {}) {
    try {
      if (!(await this.isCurrentUserAdmin())) {
        throw new Error('Access denied: Admin privileges required');
      }

      const {
        page = 1,
        limit = 20,
        isRead = null,
        search = null
      } = options;

      let query = this.client
        .from('contact_messages')
        .select('*', { count: 'exact' });

      // Apply filters
      if (isRead !== null) {
        query = query.eq('is_read', isRead);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%`);
      }

      // Apply sorting and pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        success: true,
        messages: data || [],
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error getting contact messages:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Mark contact message as read
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Update result
   */
  async markMessageAsRead(messageId) {
    try {
      if (!(await this.isCurrentUserAdmin())) {
        throw new Error('Access denied: Admin privileges required');
      }

      const { data, error } = await this.client
        .from('contact_messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: data
      };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Create status history entry
   * @param {string} applicationId - Application ID
   * @param {string} previousStatus - Previous status
   * @param {string} newStatus - New status
   * @param {string} changedBy - User who made the change
   * @param {string} notes - Change notes
   * @returns {Promise<Object>} Created history entry
   */
  async createStatusHistory(applicationId, previousStatus, newStatus, changedBy, notes = null) {
    try {
      const { data, error } = await this.client
        .from('application_status_history')
        .insert({
          application_id: applicationId,
          previous_status: previousStatus,
          new_status: newStatus,
          changed_by: changedBy,
          notes: notes,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating status history:', error);
      throw error;
    }
  }

  /**
   * Get system settings
   * @returns {Promise<Object>} System settings
   */
  async getSystemSettings() {
    try {
      if (!(await this.isCurrentUserAdmin())) {
        throw new Error('Access denied: Admin privileges required');
      }

      const { data, error } = await this.client
        .from('system_settings')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Convert to key-value object
      const settings = {};
      data?.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value;
      });

      return {
        success: true,
        settings
      };
    } catch (error) {
      console.error('Error getting system settings:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Update system setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<Object>} Update result
   */
  async updateSystemSetting(key, value) {
    try {
      if (!(await this.isCurrentUserAdmin())) {
        throw new Error('Access denied: Admin privileges required');
      }

      const { data, error } = await this.client
        .from('system_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        setting: data,
        message: 'Setting updated successfully'
      };
    } catch (error) {
      console.error('Error updating system setting:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Export applications data
   * @param {Object} filters - Export filters
   * @returns {Promise<Object>} Export result
   */
  async exportApplications(filters = {}) {
    try {
      if (!(await this.isCurrentUserAdmin())) {
        throw new Error('Access denied: Admin privileges required');
      }

      let query = this.client
        .from('driver_applications')
        .select(`
          *,
          users!driver_applications_user_id_fkey (
            full_name,
            email,
            phone
          )
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('submitted_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('submitted_at', filters.dateTo);
      }

      const { data, error } = await query.order('submitted_at', { ascending: false });
      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Data exported successfully'
      };
    } catch (error) {
      console.error('Error exporting applications:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Subscribe to real-time updates
   * @param {Function} callback - Callback function
   * @returns {Object} Subscription object
   */
  subscribeToUpdates(callback) {
    return this.client
      .channel('admin-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'driver_applications'
      }, (payload) => {
        callback('application_update', payload);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'contact_messages'
      }, (payload) => {
        callback('new_message', payload);
      })
      .subscribe();
  }
}

// Create singleton instance
const adminService = new AdminService();

export default adminService;

