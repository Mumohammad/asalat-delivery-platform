/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

import '@testing-library/jest-dom';

// Mock Supabase client for testing
const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    refreshSession: jest.fn(),
    verifyOtp: jest.fn(),
    resend: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    and: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    then: jest.fn()
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      list: jest.fn(),
      move: jest.fn(),
      copy: jest.fn(),
      createSignedUrl: jest.fn(),
      getPublicUrl: jest.fn()
    }))
  },
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn()
  }))
};

// Mock environment configuration
global.mockEnvironmentConfig = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-anon-key',
  appName: 'Test App',
  appVersion: '1.0.0',
  environment: 'test',
  defaultLanguage: 'en',
  features: {
    emailNotifications: true,
    smsNotifications: false,
    realTimeUpdates: true,
    fileUploads: true,
    multiLanguage: true,
    darkMode: false
  }
};

// Mock Supabase module
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Mock environment config
jest.mock('../js/config/environment.js', () => ({
  getEnvironmentConfig: () => global.mockEnvironmentConfig,
  isDevelopment: () => false,
  isProduction: () => false,
  isTest: () => true,
  isFeatureEnabled: (feature) => global.mockEnvironmentConfig.features[feature] || false,
  getApiBaseUrl: () => global.mockEnvironmentConfig.supabaseUrl,
  getStorageUrl: () => `${global.mockEnvironmentConfig.supabaseUrl}/storage/v1/object/public`,
  getClientConfig: () => ({
    appName: global.mockEnvironmentConfig.appName,
    appVersion: global.mockEnvironmentConfig.appVersion,
    environment: global.mockEnvironmentConfig.environment,
    defaultLanguage: global.mockEnvironmentConfig.defaultLanguage,
    features: global.mockEnvironmentConfig.features,
    supabaseUrl: global.mockEnvironmentConfig.supabaseUrl,
    supabaseAnonKey: global.mockEnvironmentConfig.supabaseAnonKey
  })
}));

// Mock DOM methods that might not be available in test environment
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.testUtils = {
  /**
   * Create mock user object
   */
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User',
      phone: '+966501234567'
    },
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create mock session object
   */
  createMockSession: (user = null) => ({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: user || global.testUtils.createMockUser()
  }),

  /**
   * Create mock application object
   */
  createMockApplication: (overrides = {}) => ({
    id: 'test-application-id',
    user_id: 'test-user-id',
    full_name: 'Test Driver',
    national_id: '1234567890',
    mobile_number: '+966501234567',
    city_of_operation: 'Riyadh',
    vehicle_make: 'Toyota',
    vehicle_model: 'Camry',
    year_of_manufacture: 2020,
    vehicle_color: 'White',
    preferred_platform: 'both',
    work_type: 'freelance',
    status: 'pending',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create mock document object
   */
  createMockDocument: (overrides = {}) => ({
    id: 'test-document-id',
    application_id: 'test-application-id',
    document_type: 'national_id',
    file_name: 'national_id.pdf',
    file_path: 'test-user-id/test-application-id/national_id.pdf',
    file_size: 1024000,
    mime_type: 'application/pdf',
    is_verified: false,
    uploaded_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create mock contact message object
   */
  createMockContactMessage: (overrides = {}) => ({
    id: 'test-message-id',
    name: 'Test Contact',
    email: 'contact@example.com',
    phone: '+966501234567',
    subject: 'Test Subject',
    message: 'Test message content',
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Reset all mocks
   */
  resetMocks: () => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  },

  /**
   * Mock successful Supabase response
   */
  mockSupabaseSuccess: (data = null) => ({
    data,
    error: null
  }),

  /**
   * Mock Supabase error response
   */
  mockSupabaseError: (message = 'Test error', code = 'TEST_ERROR') => ({
    data: null,
    error: {
      message,
      code,
      details: null,
      hint: null
    }
  }),

  /**
   * Mock file object for testing uploads
   */
  createMockFile: (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
    const file = new File(['test content'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  },

  /**
   * Wait for async operations to complete
   */
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Mock DOM element
   */
  createMockElement: (tagName = 'div', attributes = {}) => {
    const element = document.createElement(tagName);
    Object.keys(attributes).forEach(key => {
      element.setAttribute(key, attributes[key]);
    });
    return element;
  }
};

// Setup DOM environment
document.body.innerHTML = `
  <div id="app">
    <form id="registration-form"></form>
    <form id="admin-login"></form>
    <form id="driver-login"></form>
    <form id="contact-form"></form>
    <div id="admin-dashboard"></div>
    <div id="driver-dashboard"></div>
  </div>
`;

// Global setup
beforeEach(() => {
  global.testUtils.resetMocks();
});

afterEach(() => {
  jest.clearAllTimers();
});

// Export mock client for use in tests
export { mockSupabaseClient };

