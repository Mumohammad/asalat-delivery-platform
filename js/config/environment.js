/**
 * Environment Configuration Management
 * Handles environment variables and configuration settings
 */

/**
 * Get environment configuration
 * @returns {Object} Configuration object
 */
export function getEnvironmentConfig() {
  // In a browser environment, we'll use a global config object
  // In production, these should be set during build time
  const config = {
    // Supabase Configuration
    supabaseUrl: window.SUPABASE_URL || process.env.SUPABASE_URL || '',
    supabaseAnonKey: window.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    supabaseServiceRoleKey: window.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    
    // Application Configuration
    appName: window.APP_NAME || process.env.APP_NAME || 'Asalat Altafasil',
    appVersion: window.APP_VERSION || process.env.APP_VERSION || '1.0.0',
    environment: window.NODE_ENV || process.env.NODE_ENV || 'development',
    defaultLanguage: window.DEFAULT_LANGUAGE || process.env.DEFAULT_LANGUAGE || 'en',
    
    // Email Configuration
    emailServiceId: window.EMAIL_SERVICE_ID || process.env.EMAIL_SERVICE_ID || '',
    emailTemplateId: window.EMAIL_TEMPLATE_ID || process.env.EMAIL_TEMPLATE_ID || '',
    emailPublicKey: window.EMAIL_PUBLIC_KEY || process.env.EMAIL_PUBLIC_KEY || '',
    
    // SMS Configuration (Twilio)
    twilioAccountSid: window.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: window.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhoneNumber: window.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER || '',
    
    // Feature Flags
    features: {
      emailNotifications: true,
      smsNotifications: false,
      realTimeUpdates: true,
      fileUploads: true,
      multiLanguage: true,
      darkMode: false
    }
  };

  // Validate required configuration
  validateConfig(config);
  
  return config;
}

/**
 * Validate configuration
 * @param {Object} config - Configuration object
 */
function validateConfig(config) {
  const required = ['supabaseUrl', 'supabaseAnonKey'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.warn('Missing required configuration:', missing);
    
    if (config.environment === 'production') {
      throw new Error(`Missing required configuration in production: ${missing.join(', ')}`);
    }
  }
}

/**
 * Check if running in development mode
 * @returns {boolean} Is development
 */
export function isDevelopment() {
  const config = getEnvironmentConfig();
  return config.environment === 'development';
}

/**
 * Check if running in production mode
 * @returns {boolean} Is production
 */
export function isProduction() {
  const config = getEnvironmentConfig();
  return config.environment === 'production';
}

/**
 * Check if running in test mode
 * @returns {boolean} Is test
 */
export function isTest() {
  const config = getEnvironmentConfig();
  return config.environment === 'test';
}

/**
 * Get feature flag value
 * @param {string} feature - Feature name
 * @returns {boolean} Feature enabled status
 */
export function isFeatureEnabled(feature) {
  const config = getEnvironmentConfig();
  return config.features[feature] || false;
}

/**
 * Get API base URL based on environment
 * @returns {string} API base URL
 */
export function getApiBaseUrl() {
  const config = getEnvironmentConfig();
  return config.supabaseUrl;
}

/**
 * Get storage URL for file uploads
 * @returns {string} Storage URL
 */
export function getStorageUrl() {
  const config = getEnvironmentConfig();
  return `${config.supabaseUrl}/storage/v1/object/public`;
}

/**
 * Configuration for different environments
 */
export const environmentConfigs = {
  development: {
    debug: true,
    logLevel: 'debug',
    apiTimeout: 10000,
    retryAttempts: 3
  },
  
  production: {
    debug: false,
    logLevel: 'error',
    apiTimeout: 5000,
    retryAttempts: 2
  },
  
  test: {
    debug: true,
    logLevel: 'warn',
    apiTimeout: 5000,
    retryAttempts: 1
  }
};

/**
 * Get environment-specific configuration
 * @returns {Object} Environment config
 */
export function getEnvironmentSpecificConfig() {
  const config = getEnvironmentConfig();
  return environmentConfigs[config.environment] || environmentConfigs.development;
}

/**
 * Set configuration at runtime (for testing or dynamic config)
 * @param {Object} newConfig - New configuration values
 */
export function setRuntimeConfig(newConfig) {
  Object.keys(newConfig).forEach(key => {
    window[key.toUpperCase()] = newConfig[key];
  });
}

/**
 * Get configuration for client-side usage
 * This excludes sensitive server-side only values
 * @returns {Object} Client-safe configuration
 */
export function getClientConfig() {
  const config = getEnvironmentConfig();
  
  return {
    appName: config.appName,
    appVersion: config.appVersion,
    environment: config.environment,
    defaultLanguage: config.defaultLanguage,
    features: config.features,
    supabaseUrl: config.supabaseUrl,
    // Note: Only include anon key, never service role key on client
    supabaseAnonKey: config.supabaseAnonKey
  };
}

/**
 * Initialize configuration from script tag or external source
 * This allows configuration to be injected at build time
 */
export function initializeConfigFromScript() {
  const configScript = document.getElementById('app-config');
  if (configScript) {
    try {
      const config = JSON.parse(configScript.textContent);
      setRuntimeConfig(config);
      console.log('Configuration loaded from script tag');
    } catch (error) {
      console.error('Failed to parse configuration from script tag:', error);
    }
  }
}

// Auto-initialize configuration when module loads
if (typeof window !== 'undefined') {
  initializeConfigFromScript();
}

