/**
 * Validation Utilities
 * Common validation functions for forms and data
 */

/**
 * Validation rules and patterns
 */
export const ValidationRules = {
  // Email validation
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: {
      en: 'Please enter a valid email address',
      ar: 'يرجى إدخال عنوان بريد إلكتروني صحيح'
    }
  },

  // Saudi phone number validation
  saudiPhone: {
    pattern: /^(\+966|966|0)?[5][0-9]{8}$/,
    message: {
      en: 'Please enter a valid Saudi phone number',
      ar: 'يرجى إدخال رقم هاتف سعودي صحيح'
    }
  },

  // National ID / Iqama validation
  nationalId: {
    pattern: /^[12][0-9]{9}$/,
    message: {
      en: 'National ID must be 10 digits starting with 1 or 2',
      ar: 'رقم الهوية يجب أن يكون 10 أرقام يبدأ بـ 1 أو 2'
    }
  },

  // Password validation
  password: {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    message: {
      en: 'Password must be at least 8 characters with uppercase, lowercase, and number',
      ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل مع حرف كبير وصغير ورقم'
    }
  },

  // Required field validation
  required: {
    message: {
      en: 'This field is required',
      ar: 'هذا الحقل مطلوب'
    }
  },

  // Year validation (for vehicle year)
  year: {
    min: 2000,
    max: new Date().getFullYear() + 1,
    message: {
      en: 'Please enter a valid year between 2000 and current year',
      ar: 'يرجى إدخال سنة صحيحة بين 2000 والسنة الحالية'
    }
  }
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @param {string} language - Language for error message
 * @returns {Object} Validation result
 */
export function validateEmail(email, language = 'en') {
  if (!email || !email.trim()) {
    return {
      valid: false,
      message: ValidationRules.required.message[language]
    };
  }

  if (!ValidationRules.email.pattern.test(email.trim())) {
    return {
      valid: false,
      message: ValidationRules.email.message[language]
    };
  }

  return { valid: true };
}

/**
 * Validate Saudi phone number
 * @param {string} phone - Phone number to validate
 * @param {string} language - Language for error message
 * @returns {Object} Validation result
 */
export function validateSaudiPhone(phone, language = 'en') {
  if (!phone || !phone.trim()) {
    return {
      valid: false,
      message: ValidationRules.required.message[language]
    };
  }

  // Clean phone number (remove spaces and dashes)
  const cleanPhone = phone.replace(/[\s-]/g, '');

  if (!ValidationRules.saudiPhone.pattern.test(cleanPhone)) {
    return {
      valid: false,
      message: ValidationRules.saudiPhone.message[language]
    };
  }

  return { valid: true };
}

/**
 * Validate National ID or Iqama number
 * @param {string} nationalId - National ID to validate
 * @param {string} language - Language for error message
 * @returns {Object} Validation result
 */
export function validateNationalId(nationalId, language = 'en') {
  if (!nationalId || !nationalId.trim()) {
    return {
      valid: false,
      message: ValidationRules.required.message[language]
    };
  }

  if (!ValidationRules.nationalId.pattern.test(nationalId.trim())) {
    return {
      valid: false,
      message: ValidationRules.nationalId.message[language]
    };
  }

  return { valid: true };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {string} language - Language for error message
 * @returns {Object} Validation result
 */
export function validatePassword(password, language = 'en') {
  if (!password || !password.trim()) {
    return {
      valid: false,
      message: ValidationRules.required.message[language]
    };
  }

  if (!ValidationRules.password.pattern.test(password)) {
    return {
      valid: false,
      message: ValidationRules.password.message[language]
    };
  }

  return { valid: true };
}

/**
 * Validate year (for vehicle year)
 * @param {string|number} year - Year to validate
 * @param {string} language - Language for error message
 * @returns {Object} Validation result
 */
export function validateYear(year, language = 'en') {
  if (!year) {
    return {
      valid: false,
      message: ValidationRules.required.message[language]
    };
  }

  const yearNum = parseInt(year);
  if (isNaN(yearNum) || yearNum < ValidationRules.year.min || yearNum > ValidationRules.year.max) {
    return {
      valid: false,
      message: ValidationRules.year.message[language]
    };
  }

  return { valid: true };
}

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} language - Language for error message
 * @returns {Object} Validation result
 */
export function validateRequired(value, language = 'en') {
  if (value === null || value === undefined || value === '' || 
      (typeof value === 'string' && !value.trim())) {
    return {
      valid: false,
      message: ValidationRules.required.message[language]
    };
  }

  return { valid: true };
}

/**
 * Validate form data against schema
 * @param {Object} data - Form data to validate
 * @param {Object} schema - Validation schema
 * @param {string} language - Language for error messages
 * @returns {Object} Validation result
 */
export function validateForm(data, schema, language = 'en') {
  const errors = {};
  let isValid = true;

  Object.keys(schema).forEach(field => {
    const rules = schema[field];
    const value = data[field];

    // Check required
    if (rules.required) {
      const requiredResult = validateRequired(value, language);
      if (!requiredResult.valid) {
        errors[field] = requiredResult.message;
        isValid = false;
        return;
      }
    }

    // Skip other validations if field is empty and not required
    if (!value && !rules.required) {
      return;
    }

    // Check specific validation rules
    if (rules.type) {
      let validationResult;

      switch (rules.type) {
        case 'email':
          validationResult = validateEmail(value, language);
          break;
        case 'phone':
          validationResult = validateSaudiPhone(value, language);
          break;
        case 'nationalId':
          validationResult = validateNationalId(value, language);
          break;
        case 'password':
          validationResult = validatePassword(value, language);
          break;
        case 'year':
          validationResult = validateYear(value, language);
          break;
        default:
          validationResult = { valid: true };
      }

      if (!validationResult.valid) {
        errors[field] = validationResult.message;
        isValid = false;
      }
    }

    // Check custom validation function
    if (rules.validator && typeof rules.validator === 'function') {
      const customResult = rules.validator(value, data, language);
      if (!customResult.valid) {
        errors[field] = customResult.message;
        isValid = false;
      }
    }

    // Check min/max length
    if (rules.minLength && value && value.length < rules.minLength) {
      errors[field] = language === 'ar' 
        ? `يجب أن يكون الحد الأدنى ${rules.minLength} أحرف`
        : `Minimum ${rules.minLength} characters required`;
      isValid = false;
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors[field] = language === 'ar'
        ? `يجب أن يكون الحد الأقصى ${rules.maxLength} أحرف`
        : `Maximum ${rules.maxLength} characters allowed`;
      isValid = false;
    }
  });

  return {
    valid: isValid,
    errors: errors
  };
}

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  // Driver registration schema
  driverRegistration: {
    fullName: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    nationalId: {
      required: true,
      type: 'nationalId'
    },
    mobileNumber: {
      required: true,
      type: 'phone'
    },
    cityOfOperation: {
      required: true
    },
    vehicleMake: {
      required: true,
      minLength: 2,
      maxLength: 50
    },
    yearOfManufacture: {
      required: true,
      type: 'year'
    },
    preferredPlatform: {
      required: true,
      validator: (value) => {
        const validPlatforms = ['hungerstation', 'jahez', 'both'];
        if (!validPlatforms.includes(value)) {
          return {
            valid: false,
            message: 'Please select a valid platform'
          };
        }
        return { valid: true };
      }
    },
    workType: {
      required: true,
      validator: (value) => {
        const validTypes = ['freelance', 'sponsorship'];
        if (!validTypes.includes(value)) {
          return {
            valid: false,
            message: 'Please select a valid work type'
          };
        }
        return { valid: true };
      }
    }
  },

  // User registration schema
  userRegistration: {
    email: {
      required: true,
      type: 'email'
    },
    password: {
      required: true,
      type: 'password'
    },
    fullName: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    phone: {
      required: false,
      type: 'phone'
    }
  },

  // Login schema
  login: {
    email: {
      required: true,
      type: 'email'
    },
    password: {
      required: true
    }
  },

  // Contact form schema
  contact: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    email: {
      required: true,
      type: 'email'
    },
    phone: {
      required: false,
      type: 'phone'
    },
    subject: {
      required: false,
      maxLength: 200
    },
    message: {
      required: true,
      minLength: 10,
      maxLength: 1000
    }
  }
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle Saudi numbers
  if (digits.startsWith('966')) {
    return `+966 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  } else if (digits.startsWith('05')) {
    return `+966 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  
  return phone;
}

/**
 * Normalize phone number for storage
 * @param {string} phone - Phone number to normalize
 * @returns {string} Normalized phone number
 */
export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Convert to international format
  if (digits.startsWith('05')) {
    return `+966${digits.slice(1)}`;
  } else if (digits.startsWith('5') && digits.length === 9) {
    return `+966${digits}`;
  } else if (digits.startsWith('966')) {
    return `+${digits}`;
  }
  
  return phone;
}

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateFileUpload(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    language = 'en'
  } = options;

  if (!file) {
    return {
      valid: false,
      message: language === 'ar' ? 'لم يتم اختيار ملف' : 'No file selected'
    };
  }

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      message: language === 'ar' 
        ? `حجم الملف يجب أن يكون أقل من ${maxSizeMB} ميجابايت`
        : `File size must be less than ${maxSizeMB}MB`
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      message: language === 'ar'
        ? 'نوع الملف غير مدعوم. يُسمح فقط بملفات JPEG و PNG و PDF'
        : 'File type not supported. Only JPEG, PNG, and PDF files are allowed'
    };
  }

  return { valid: true };
}

