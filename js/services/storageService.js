/**
 * Storage Service
 * Handles file uploads, downloads, and storage management using Supabase Storage
 */

import { getSupabaseClient, supabaseUtils } from '../config/supabase.js';
import authService from './auth.js';

class StorageService {
  constructor() {
    this.client = null;
    this.bucketName = 'driver-documents';
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  }

  /**
   * Initialize storage service
   */
  async initialize() {
    try {
      this.client = getSupabaseClient();
      console.log('Storage service initialized');
    } catch (error) {
      console.error('Failed to initialize storage service:', error);
      throw error;
    }
  }

  /**
   * Upload file to storage
   * @param {File} file - File to upload
   * @param {string} path - Storage path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, path, options = {}) {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated to upload files');
      }

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: 'INVALID_FILE',
          message: validation.message
        };
      }

      // Generate unique path if not provided
      if (!path) {
        const fileExtension = this.getFileExtension(file.name);
        path = `${user.id}/${Date.now()}_${this.sanitizeFileName(file.name)}`;
      }

      // Upload options
      const uploadOptions = {
        cacheControl: '3600',
        upsert: options.upsert || false,
        ...options
      };

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .upload(path, file, uploadOptions);

      if (error) throw error;

      return {
        success: true,
        data: {
          path: data.path,
          fullPath: data.fullPath,
          id: data.id
        },
        message: 'File uploaded successfully'
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Download file from storage
   * @param {string} path - File path
   * @returns {Promise<Object>} Download result
   */
  async downloadFile(path) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .download(path);

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'File downloaded successfully'
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Get signed URL for file access
   * @param {string} path - File path
   * @param {number} expiresIn - Expiry time in seconds (default: 1 hour)
   * @returns {Promise<Object>} Signed URL result
   */
  async getSignedUrl(path, expiresIn = 3600) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;

      return {
        success: true,
        signedUrl: data.signedUrl,
        message: 'Signed URL generated successfully'
      };
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Get public URL for file
   * @param {string} path - File path
   * @returns {Object} Public URL result
   */
  getPublicUrl(path) {
    try {
      const { data } = this.client.storage
        .from(this.bucketName)
        .getPublicUrl(path);

      return {
        success: true,
        publicUrl: data.publicUrl,
        message: 'Public URL generated successfully'
      };
    } catch (error) {
      console.error('Error getting public URL:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Delete file from storage
   * @param {string} path - File path
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(path) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .remove([path]);

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Delete multiple files from storage
   * @param {Array} paths - Array of file paths
   * @returns {Promise<Object>} Delete result
   */
  async deleteFiles(paths) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .remove(paths);

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: `${paths.length} files deleted successfully`
      };
    } catch (error) {
      console.error('Error deleting files:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * List files in a directory
   * @param {string} path - Directory path
   * @param {Object} options - List options
   * @returns {Promise<Object>} List result
   */
  async listFiles(path = '', options = {}) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .list(path, {
          limit: options.limit || 100,
          offset: options.offset || 0,
          sortBy: options.sortBy || { column: 'name', order: 'asc' }
        });

      if (error) throw error;

      return {
        success: true,
        files: data || [],
        message: 'Files listed successfully'
      };
    } catch (error) {
      console.error('Error listing files:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Move file to new location
   * @param {string} fromPath - Source path
   * @param {string} toPath - Destination path
   * @returns {Promise<Object>} Move result
   */
  async moveFile(fromPath, toPath) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .move(fromPath, toPath);

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'File moved successfully'
      };
    } catch (error) {
      console.error('Error moving file:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Copy file to new location
   * @param {string} fromPath - Source path
   * @param {string} toPath - Destination path
   * @returns {Promise<Object>} Copy result
   */
  async copyFile(fromPath, toPath) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .copy(fromPath, toPath);

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'File copied successfully'
      };
    } catch (error) {
      console.error('Error copying file:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    if (!file) {
      return { valid: false, message: 'No file selected' };
    }

    if (file.size > this.maxFileSize) {
      const maxSizeMB = this.maxFileSize / (1024 * 1024);
      return { 
        valid: false, 
        message: `File size must be less than ${maxSizeMB}MB` 
      };
    }

    if (!this.allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        message: 'Only JPEG, PNG, and PDF files are allowed' 
      };
    }

    return { valid: true };
  }

  /**
   * Get file extension from filename
   * @param {string} filename - File name
   * @returns {string} File extension
   */
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  /**
   * Sanitize filename for storage
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFileName(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Generate unique filename
   * @param {string} originalName - Original filename
   * @param {string} prefix - Optional prefix
   * @returns {string} Unique filename
   */
  generateUniqueFileName(originalName, prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = this.getFileExtension(originalName);
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    
    return `${prefix}${this.sanitizeFileName(baseName)}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Get file info
   * @param {string} path - File path
   * @returns {Promise<Object>} File info result
   */
  async getFileInfo(path) {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .list('', {
          search: path
        });

      if (error) throw error;

      const fileInfo = data?.find(file => file.name === path.split('/').pop());
      
      if (!fileInfo) {
        throw new Error('File not found');
      }

      return {
        success: true,
        fileInfo: {
          name: fileInfo.name,
          size: fileInfo.metadata?.size,
          lastModified: fileInfo.updated_at,
          contentType: fileInfo.metadata?.mimetype
        },
        message: 'File info retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }

  /**
   * Upload multiple files
   * @param {FileList|Array} files - Files to upload
   * @param {string} basePath - Base path for uploads
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise<Object>} Upload results
   */
  async uploadMultipleFiles(files, basePath = '', progressCallback = null) {
    const results = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const fileName = this.generateUniqueFileName(file.name);
      const filePath = basePath ? `${basePath}/${fileName}` : fileName;

      try {
        const result = await this.uploadFile(file, filePath);
        results.push({
          file: file.name,
          ...result
        });

        if (progressCallback) {
          progressCallback({
            completed: i + 1,
            total: totalFiles,
            percentage: Math.round(((i + 1) / totalFiles) * 100),
            currentFile: file.name
          });
        }
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      success: failureCount === 0,
      results: results,
      summary: {
        total: totalFiles,
        successful: successCount,
        failed: failureCount
      },
      message: `${successCount} of ${totalFiles} files uploaded successfully`
    };
  }

  /**
   * Create presigned upload URL
   * @param {string} path - File path
   * @param {number} expiresIn - Expiry time in seconds
   * @returns {Promise<Object>} Presigned URL result
   */
  async createPresignedUploadUrl(path, expiresIn = 3600) {
    try {
      // Note: This is a placeholder for presigned upload URLs
      // Supabase doesn't currently support presigned upload URLs
      // This would need to be implemented using a custom edge function
      
      return {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Presigned upload URLs not yet implemented'
      };
    } catch (error) {
      console.error('Error creating presigned upload URL:', error);
      return {
        success: false,
        error: error.message,
        message: supabaseUtils.formatError(error)
      };
    }
  }
}

// Create singleton instance
const storageService = new StorageService();

export default storageService;

