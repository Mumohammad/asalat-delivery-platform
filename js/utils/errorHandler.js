/**
 * Error Handler Utilities
 * Centralized error handling and user-friendly error messages
 */

/**
 * Error types and their user-friendly messages
 */
const ErrorMessages = {
  // Network errors
  NETWORK_ERROR: {
    en: 'Network connection error. Please check your internet connection and try again.',
    ar: 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
  },
  
  // Authentication errors
  AUTH_ERROR: {
    en: 'Authentication error. Please log in again.',
    ar: 'خطأ في المصادقة. يرجى تسجيل الدخول مرة أخرى.'
  },
  
  INVALID_CREDENTIALS: {
    en: 'Invalid email or password. Please check your credentials and try again.',
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق من بياناتك والمحاولة مرة أخرى.'
  },
  
  EMAIL_NOT_CONFIRMED: {
    en: 'Please check your email and click the confirmation link before signing in.',
    ar: 'يرجى التحقق من بريدك الإلكتروني والنقر على رابط التأكيد قبل تسجيل الدخول.'
  },
  
  // Permission errors
  PERMISSION_DENIED: {
    en: 'You do not have permission to perform this action.',
    ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'
  },
  
  // Validation errors
  VALIDATION_ERROR: {
    en: 'Please check your input and correct any errors.',
    ar: 'يرجى التحقق من المدخلات وتصحيح أي أخطاء.'
  },
  
  REQUIRED_FIELD: {
    en: 'This field is required.',
    ar: 'هذا الحقل مطلوب.'
  },
  
  // Application errors
  APPLICATION_EXISTS: {
    en: 'You already have a pending or approved application. Only one application per user is allowed.',
    ar: 'لديك بالفعل طلب معلق أو مُوافق عليه. يُسمح بطلب واحد فقط لكل مستخدم.'
  },
  
  APPLICATION_NOT_FOUND: {
    en: 'Application not found or you do not have access to it.',
    ar: 'الطلب غير موجود أو ليس لديك صلاحية للوصول إليه.'
  },
  
  // File upload errors
  FILE_TOO_LARGE: {
    en: 'File size is too large. Maximum allowed size is 5MB.',
    ar: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.'
  },
  
  INVALID_FILE_TYPE: {
    en: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.',
    ar: 'نوع الملف غير صالح. يُسمح فقط بملفات JPEG و PNG و PDF.'
  },
  
  UPLOAD_FAILED: {
    en: 'File upload failed. Please try again.',
    ar: 'فشل في رفع الملف. يرجى المحاولة مرة أخرى.'
  },
  
  // Database errors
  DATABASE_ERROR: {
    en: 'A database error occurred. Please try again later.',
    ar: 'حدث خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.'
  },
  
  DUPLICATE_ENTRY: {
    en: 'This information already exists in our system.',
    ar: 'هذه المعلومات موجودة بالفعل في نظامنا.'
  },
  
  // Generic errors
  UNKNOWN_ERROR: {
    en: 'An unexpected error occurred. Please try again later.',
    ar: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً.'
  },
  
  SERVER_ERROR: {
    en: 'Server error. Please try again later.',
    ar: 'خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.'
  }
};

/**
 * Error Handler Class
 */
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  /**
   * Handle and format error for user display
   * @param {Error|Object} error - Error object
   * @param {string} language - Language code (en/ar)
   * @param {string} context - Error context for logging
   * @returns {string} User-friendly error message
   */
  handleError(error, language = 'en', context = '') {
    // Log error for debugging
    this.logError(error, context);

    // Get user-friendly message
    const message = this.getUserFriendlyMessage(error, language);
    
    // Show error to user
    this.displayError(message, language);
    
    return message;
  }

  /**
   * Get user-friendly error message
   * @param {Error|Object} error - Error object
   * @param {string} language - Language code
   * @returns {string} User-friendly message
   */
  getUserFriendlyMessage(error, language = 'en') {
    if (!error) {
      return ErrorMessages.UNKNOWN_ERROR[language];
    }

    // Handle string errors
    if (typeof error === 'string') {
      return this.getMessageByKey(error, language) || error;
    }

    // Handle Supabase errors
    if (error.message) {
      const message = error.message.toLowerCase();
      
      // Network errors
      if (message.includes('fetch') || message.includes('network') || 
          message.includes('connection') || error.code === 'NETWORK_ERROR') {
        return ErrorMessages.NETWORK_ERROR[language];
      }
      
      // Authentication errors
      if (message.includes('jwt') || message.includes('auth') || 
          message.includes('unauthorized') || error.status === 401) {
        return ErrorMessages.AUTH_ERROR[language];
      }
      
      if (message.includes('invalid login credentials') || 
          message.includes('invalid email or password')) {
        return ErrorMessages.INVALID_CREDENTIALS[language];
      }
      
      if (message.includes('email not confirmed')) {
        return ErrorMessages.EMAIL_NOT_CONFIRMED[language];
      }
      
      // Permission errors
      if (message.includes('permission') || message.includes('forbidden') || 
          error.status === 403) {
        return ErrorMessages.PERMISSION_DENIED[language];
      }
      
      // Validation errors
      if (message.includes('validation') || message.includes('invalid') ||
          error.status === 400) {
        return ErrorMessages.VALIDATION_ERROR[language];
      }
      
      // Database errors
      if (message.includes('duplicate') || message.includes('unique constraint')) {
        return ErrorMessages.DUPLICATE_ENTRY[language];
      }
      
      if (message.includes('database') || message.includes('sql') ||
          error.status === 500) {
        return ErrorMessages.DATABASE_ERROR[language];
      }
      
      // File upload errors
      if (message.includes('file size') || message.includes('too large')) {
        return ErrorMessages.FILE_TOO_LARGE[language];
      }
      
      if (message.includes('file type') || message.includes('invalid file')) {
        return ErrorMessages.INVALID_FILE_TYPE[language];
      }
      
      // Application-specific errors
      if (message.includes('application exists') || error.code === 'APPLICATION_EXISTS') {
        return ErrorMessages.APPLICATION_EXISTS[language];
      }
      
      if (message.includes('application not found') || error.code === 'APPLICATION_NOT_FOUND') {
        return ErrorMessages.APPLICATION_NOT_FOUND[language];
      }
    }

    // Check if error has a specific error code
    if (error.code && ErrorMessages[error.code]) {
      return ErrorMessages[error.code][language];
    }

    // Default to unknown error
    return ErrorMessages.UNKNOWN_ERROR[language];
  }

  /**
   * Get error message by key
   * @param {string} key - Error key
   * @param {string} language - Language code
   * @returns {string|null} Error message
   */
  getMessageByKey(key, language = 'en') {
    const upperKey = key.toUpperCase();
    return ErrorMessages[upperKey] ? ErrorMessages[upperKey][language] : null;
  }

  /**
   * Display error to user
   * @param {string} message - Error message
   * @param {string} language - Language code
   */
  displayError(message, language = 'en') {
    // Try to show in existing error containers
    const errorContainers = [
      document.getElementById('error-message'),
      document.getElementById('form-error'),
      document.querySelector('.error-display')
    ];

    const container = errorContainers.find(el => el);
    if (container) {
      container.textContent = message;
      container.style.display = 'block';
      container.classList.add('show');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        container.style.display = 'none';
        container.classList.remove('show');
      }, 5000);
      
      return;
    }

    // Fallback to alert if no container found
    alert(message);
  }

  /**
   * Display success message
   * @param {string} message - Success message
   * @param {string} language - Language code
   */
  displaySuccess(message, language = 'en') {
    const successContainers = [
      document.getElementById('success-message'),
      document.getElementById('form-success'),
      document.querySelector('.success-display')
    ];

    const container = successContainers.find(el => el);
    if (container) {
      container.textContent = message;
      container.style.display = 'block';
      container.classList.add('show');
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        container.style.display = 'none';
        container.classList.remove('show');
      }, 3000);
      
      return;
    }

    // Create temporary success notification
    this.showNotification(message, 'success');
  }

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (error, success, warning, info)
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${this.getNotificationColor(type)};
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      max-width: 400px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    // Add to document
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);

    // Add click to dismiss
    notification.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }

  /**
   * Get notification color by type
   * @param {string} type - Notification type
   * @returns {string} Color value
   */
  getNotificationColor(type) {
    const colors = {
      error: '#dc3545',
      success: '#28a745',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    return colors[type] || colors.info;
  }

  /**
   * Log error for debugging
   * @param {Error|Object} error - Error object
   * @param {string} context - Error context
   */
  logError(error, context = '') {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      context: context,
      error: {
        message: error?.message || error,
        stack: error?.stack,
        code: error?.code,
        status: error?.status
      },
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Add to error log
    this.errorLog.unshift(errorEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Log to console in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.error('Error logged:', errorEntry);
    }
  }

  /**
   * Get error log
   * @returns {Array} Error log entries
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Handle form validation errors
   * @param {Object} errors - Validation errors object
   * @param {string} language - Language code
   */
  handleValidationErrors(errors, language = 'en') {
    Object.keys(errors).forEach(field => {
      const input = document.getElementById(field) || document.querySelector(`[name="${field}"]`);
      if (input) {
        // Add error class
        input.classList.add('error', 'is-invalid');
        
        // Find or create error message element
        let errorElement = input.parentNode.querySelector('.error-message');
        if (!errorElement) {
          errorElement = document.createElement('div');
          errorElement.className = 'error-message';
          errorElement.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin-top: 0.25rem;';
          input.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = errors[field];
        errorElement.style.display = 'block';
      }
    });
  }

  /**
   * Clear form validation errors
   * @param {HTMLFormElement} form - Form element
   */
  clearValidationErrors(form) {
    if (!form) return;

    // Remove error classes from inputs
    const inputs = form.querySelectorAll('.error, .is-invalid');
    inputs.forEach(input => {
      input.classList.remove('error', 'is-invalid');
    });

    // Hide error messages
    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach(msg => {
      msg.style.display = 'none';
    });
  }

  /**
   * Handle async operation with error handling
   * @param {Function} operation - Async operation
   * @param {string} language - Language code
   * @param {string} context - Operation context
   * @returns {Promise} Operation result
   */
  async handleAsync(operation, language = 'en', context = '') {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, language, context);
      throw error;
    }
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Add CSS for notifications if not exists
if (!document.getElementById('error-handler-styles')) {
  const style = document.createElement('style');
  style.id = 'error-handler-styles';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification {
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .notification:hover {
      transform: translateX(-5px);
    }
    
    .error-message {
      animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .error, .is-invalid {
      border-color: #dc3545 !important;
      box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
    }
  `;
  document.head.appendChild(style);
}

export default errorHandler;

