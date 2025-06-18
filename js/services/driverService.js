/**
 * Driver Service
 * Handles driver registration, applications, and related operations
 */

const { getSupabaseClient, supabaseUtils } = require('../config/supabase.js');
const authService = require('./auth.js');

class DriverService {
  constructor() {
    this.client = null;
  }

  /**
   * Initialize driver service
   */
  async initialize() {
    try {
      this.client = getSupabaseClient();
      console.log('Driver service initialized');
    } catch (error) {
      console.error('Failed to initialize driver service:', error);
      throw error;
    }
  }

  /**
   * Submit driver application
   * @param {Object} applicationData - Application form data
   * @returns {Promise<Object>} Submission result
   */
  async submitApplication(applicationData) {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated to submit application');
      }

      // Check if user already has an application
      const existingApplication = await this.getUserApplication(user.id);
      if (existingApplication && existingApplication.status !== 'rejected') {
        return {
          success: false,
          error: 'APPLICATION_EXISTS',
          message: 'You already have a pending or approved application'
        };
      }

      // Prepare application data
      const applicationRecord = {
        user_id: user.id,
        full_name: applicationData.fullName,
        national_id: applicationData.nationalId,
        mobile_number: applicationData.mobileNumber,
        city_of_operation: applicationData.cityOfOperation,
        vehicle_make: applicationData.vehicleMake,
        vehicle_model: applicationData.vehicleModel || null,
        year_of_manufacture: parseInt(applicationData.yearOfManufacture),
        vehicle_color: applicationData.vehicleColor || null,
        license_plate: applicationData.licensePlate || null,
        preferred_platform: applicationData.preferredPlatform,
        work_type: applicationData.workType,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };

      // Insert application
      const { data, error } = await this.client
        .from('driver_applications')
        .insert(applicationRecord)
        .select()
        .single();

      if (error) throw error;

      // Create status history entry
      await this.createStatusHistory(data.id, null, 'pending', user.id, 'Application submitted');

      return {
        success: true,
        application: data,
        message: 'Application submitted successfully'
      };
    } catch (error) {
      console.error('Error submitting application:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Get user's application
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User application
   */
  async getUserApplication(userId) {
    try {
      const { data, error } = await this.client
        .from('driver_applications')
        .select(`
          *,
          driver_documents (
            id,
            document_type,
            file_name,
            is_verified,
            uploaded_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user application:', error);
      return null;
    }
  }

  /**
   * Update application
   * @param {string} applicationId - Application ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Update result
   */
  async updateApplication(applicationId, updates) {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Check if user owns this application
      const application = await this.getApplicationById(applicationId);
      if (!application || application.user_id !== user.id) {
        throw new Error('Application not found or access denied');
      }

      // Only allow updates to pending applications
      if (application.status !== 'pending') {
        throw new Error('Cannot update application that is not pending');
      }

      const { data, error } = await this.client
        .from('driver_applications')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        application: data,
        message: 'Application updated successfully'
      };
    } catch (error) {
      console.error('Error updating application:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Get application by ID
   * @param {string} applicationId - Application ID
   * @returns {Promise<Object|null>} Application data
   */
  async getApplicationById(applicationId) {
    try {
      const { data, error } = await this.client
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
            file_name,
            file_path,
            is_verified,
            uploaded_at,
            verified_at
          )
        `)
        .eq('id', applicationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting application by ID:', error);
      return null;
    }
  }

  /**
   * Get application status history
   * @param {string} applicationId - Application ID
   * @returns {Promise<Array>} Status history
   */
  async getApplicationStatusHistory(applicationId) {
    try {
      const { data, error } = await this.client
        .from('application_status_history')
        .select(`
          *,
          users!application_status_history_changed_by_fkey (
            full_name,
            email
          )
        `)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting status history:', error);
      return [];
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
   * Upload document for application
   * @param {string} applicationId - Application ID
   * @param {string} documentType - Document type
   * @param {File} file - File to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadDocument(applicationId, documentType, file) {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Validate file
      const validationResult = this.validateFile(file);
      if (!validationResult.valid) {
        return {
          success: false,
          error: 'INVALID_FILE',
          message: validationResult.message
        };
      }

      // Generate unique file path
      const fileExtension = file.name.split('.').pop();
      const fileName = `${user.id}/${applicationId}/${documentType}_${Date.now()}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.client.storage
        .from('driver-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save document record to database
      const { data: documentData, error: dbError } = await this.client
        .from('driver_documents')
        .insert({
          application_id: applicationId,
          document_type: documentType,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        success: true,
        document: documentData,
        message: 'Document uploaded successfully'
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Get document download URL
   * @param {string} filePath - File path in storage
   * @returns {Promise<string>} Download URL
   */
  async getDocumentUrl(filePath) {
    try {
      const { data, error } = await this.client.storage
        .from('driver-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      return null;
    }
  }

  /**
   * Delete document
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteDocument(documentId) {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Get document details
      const { data: document, error: fetchError } = await this.client
        .from('driver_documents')
        .select('*, driver_applications!inner(user_id)')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Check if user owns this document
      if (document.driver_applications.user_id !== user.id) {
        throw new Error('Access denied');
      }

      // Delete from storage
      const { error: storageError } = await this.client.storage
        .from('driver-documents')
        .remove([document.file_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await this.client
        .from('driver_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      return {
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting document:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Validate uploaded file
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (!file) {
      return { valid: false, message: 'No file selected' };
    }

    if (file.size > maxSize) {
      return { valid: false, message: 'File size must be less than 5MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, message: 'Only JPEG, PNG, and PDF files are allowed' };
    }

    return { valid: true };
  }

  /**
   * Get application statistics for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Application statistics
   */
  async getUserApplicationStats(userId) {
    try {
      const application = await this.getUserApplication(userId);
      if (!application) {
        return {
          hasApplication: false,
          status: null,
          documentsUploaded: 0,
          documentsVerified: 0
        };
      }

      const documents = application.driver_documents || [];
      const documentsVerified = documents.filter(doc => doc.is_verified).length;

      return {
        hasApplication: true,
        status: application.status,
        submittedAt: application.submitted_at,
        reviewedAt: application.reviewed_at,
        approvedAt: application.approved_at,
        documentsUploaded: documents.length,
        documentsVerified: documentsVerified,
        documentsRequired: this.getRequiredDocuments(application.preferred_platform),
        completionPercentage: this.calculateCompletionPercentage(application)
      };
    } catch (error) {
      console.error('Error getting user application stats:', error);
      return {
        hasApplication: false,
        status: null,
        documentsUploaded: 0,
        documentsVerified: 0
      };
    }
  }

  /**
   * Get required documents for platform
   * @param {string} platform - Platform type
   * @returns {Array} Required document types
   */
  getRequiredDocuments(platform) {
    const baseDocuments = ['national_id', 'driving_license', 'vehicle_registration', 'insurance'];
    
    if (platform === 'jahez' || platform === 'both') {
      return [...baseDocuments, 'iban_certificate'];
    }
    
    return baseDocuments;
  }

  /**
   * Calculate application completion percentage
   * @param {Object} application - Application data
   * @returns {number} Completion percentage
   */
  calculateCompletionPercentage(application) {
    const requiredDocuments = this.getRequiredDocuments(application.preferred_platform);
    const uploadedDocuments = application.driver_documents || [];
    const uploadedTypes = uploadedDocuments.map(doc => doc.document_type);
    
    const documentsComplete = requiredDocuments.filter(type => 
      uploadedTypes.includes(type)
    ).length;
    
    const applicationFieldsComplete = [
      application.full_name,
      application.national_id,
      application.mobile_number,
      application.city_of_operation,
      application.vehicle_make,
      application.year_of_manufacture,
      application.preferred_platform,
      application.work_type
    ].filter(field => field && field.toString().trim()).length;
    
    const totalApplicationFields = 8;
    const applicationScore = (applicationFieldsComplete / totalApplicationFields) * 50;
    const documentsScore = (documentsComplete / requiredDocuments.length) * 50;
    
    return Math.round(applicationScore + documentsScore);
  }

  /**
   * Subscribe to application status changes
   * @param {string} applicationId - Application ID
   * @param {Function} callback - Callback function
   * @returns {Object} Subscription object
   */
  subscribeToApplicationChanges(applicationId, callback) {
    return this.client
      .channel(`application-${applicationId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'driver_applications',
        filter: `id=eq.${applicationId}`
      }, callback)
      .subscribe();
  }
}

// Create singleton instance
const driverService = new DriverService();

module.exports = driverService;
