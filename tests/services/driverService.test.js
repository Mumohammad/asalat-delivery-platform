/**
 * Driver Service Tests
 */

import driverService from '../../js/services/driverService.js';
import authService from '../../js/services/auth.js';
import { mockSupabaseClient } from '../setup.js';

// Mock authService
jest.mock('../../js/services/auth.js');

describe('DriverService', () => {
  beforeEach(() => {
    global.testUtils.resetMocks();
    authService.getCurrentUser.mockReturnValue(global.testUtils.createMockUser());
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(driverService.initialize()).resolves.not.toThrow();
    });
  });

  describe('submitApplication', () => {
    it('should submit application successfully', async () => {
      const applicationData = {
        fullName: 'Test Driver',
        nationalId: '1234567890',
        mobileNumber: '+966501234567',
        cityOfOperation: 'Riyadh',
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        yearOfManufacture: '2020',
        vehicleColor: 'White',
        licensePlate: 'ABC123',
        preferredPlatform: 'both',
        workType: 'freelance'
      };

      const mockApplication = global.testUtils.createMockApplication(applicationData);

      // Mock getUserApplication to return null (no existing application)
      jest.spyOn(driverService, 'getUserApplication').mockResolvedValue(null);

      // Mock createStatusHistory
      jest.spyOn(driverService, 'createStatusHistory').mockResolvedValue({});

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockApplication, error: null })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await driverService.submitApplication(applicationData);

      expect(result.success).toBe(true);
      expect(result.application).toEqual(mockApplication);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('driver_applications');
    });

    it('should reject submission if user already has application', async () => {
      const applicationData = {
        fullName: 'Test Driver',
        nationalId: '1234567890'
      };

      const existingApplication = global.testUtils.createMockApplication({
        status: 'pending'
      });

      jest.spyOn(driverService, 'getUserApplication').mockResolvedValue(existingApplication);

      const result = await driverService.submitApplication(applicationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('APPLICATION_EXISTS');
    });

    it('should require authenticated user', async () => {
      authService.getCurrentUser.mockReturnValue(null);

      const result = await driverService.submitApplication({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('User must be authenticated to submit application');
    });
  });

  describe('getUserApplication', () => {
    it('should get user application successfully', async () => {
      const userId = 'test-user-id';
      const mockApplication = global.testUtils.createMockApplication({
        user_id: userId,
        driver_documents: [global.testUtils.createMockDocument()]
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockApplication, error: null })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await driverService.getUserApplication(userId);

      expect(result).toEqual(mockApplication);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('driver_applications');
    });

    it('should return null on error', async () => {
      const userId = 'test-user-id';

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await driverService.getUserApplication(userId);

      expect(result).toBeNull();
    });
  });

  describe('updateApplication', () => {
    it('should update application successfully', async () => {
      const applicationId = 'test-application-id';
      const updates = { vehicle_color: 'Blue' };
      const mockUser = global.testUtils.createMockUser();
      const mockApplication = global.testUtils.createMockApplication({
        id: applicationId,
        user_id: mockUser.id,
        status: 'pending'
      });

      authService.getCurrentUser.mockReturnValue(mockUser);
      jest.spyOn(driverService, 'getApplicationById').mockResolvedValue(mockApplication);

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { ...mockApplication, ...updates }, 
          error: null 
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await driverService.updateApplication(applicationId, updates);

      expect(result.success).toBe(true);
      expect(result.application.vehicle_color).toBe('Blue');
    });

    it('should reject update for non-pending application', async () => {
      const applicationId = 'test-application-id';
      const mockUser = global.testUtils.createMockUser();
      const mockApplication = global.testUtils.createMockApplication({
        id: applicationId,
        user_id: mockUser.id,
        status: 'approved'
      });

      authService.getCurrentUser.mockReturnValue(mockUser);
      jest.spyOn(driverService, 'getApplicationById').mockResolvedValue(mockApplication);

      const result = await driverService.updateApplication(applicationId, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot update application that is not pending');
    });

    it('should reject update for non-owned application', async () => {
      const applicationId = 'test-application-id';
      const mockUser = global.testUtils.createMockUser();
      const mockApplication = global.testUtils.createMockApplication({
        id: applicationId,
        user_id: 'different-user-id',
        status: 'pending'
      });

      authService.getCurrentUser.mockReturnValue(mockUser);
      jest.spyOn(driverService, 'getApplicationById').mockResolvedValue(mockApplication);

      const result = await driverService.updateApplication(applicationId, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Application not found or access denied');
    });
  });

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const applicationId = 'test-application-id';
      const documentType = 'national_id';
      const mockFile = global.testUtils.createMockFile('national_id.pdf');
      const mockUser = global.testUtils.createMockUser();

      authService.getCurrentUser.mockReturnValue(mockUser);

      // Mock storage upload
      const mockStorageQuery = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path/national_id.pdf' },
          error: null
        })
      };

      mockSupabaseClient.storage.from.mockReturnValue(mockStorageQuery);

      // Mock database insert
      const mockDocument = global.testUtils.createMockDocument({
        application_id: applicationId,
        document_type: documentType
      });

      const mockDbQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockDocument, error: null })
      };

      mockSupabaseClient.from.mockReturnValue(mockDbQuery);

      const result = await driverService.uploadDocument(applicationId, documentType, mockFile);

      expect(result.success).toBe(true);
      expect(result.document).toEqual(mockDocument);
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('driver-documents');
    });

    it('should reject invalid file', async () => {
      const applicationId = 'test-application-id';
      const documentType = 'national_id';
      const mockFile = global.testUtils.createMockFile('test.txt', 'text/plain');

      const result = await driverService.uploadDocument(applicationId, documentType, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_FILE');
    });

    it('should require authenticated user', async () => {
      authService.getCurrentUser.mockReturnValue(null);

      const result = await driverService.uploadDocument('app-id', 'national_id', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('User must be authenticated');
    });
  });

  describe('validateFile', () => {
    it('should validate valid file', () => {
      const mockFile = global.testUtils.createMockFile('test.pdf', 'application/pdf', 1024);

      const result = driverService.validateFile(mockFile);

      expect(result.valid).toBe(true);
    });

    it('should reject file that is too large', () => {
      const mockFile = global.testUtils.createMockFile('test.pdf', 'application/pdf', 10 * 1024 * 1024);

      const result = driverService.validateFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('5MB');
    });

    it('should reject invalid file type', () => {
      const mockFile = global.testUtils.createMockFile('test.txt', 'text/plain', 1024);

      const result = driverService.validateFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('JPEG, PNG, and PDF');
    });

    it('should reject null file', () => {
      const result = driverService.validateFile(null);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('No file selected');
    });
  });

  describe('getUserApplicationStats', () => {
    it('should return stats for user with application', async () => {
      const userId = 'test-user-id';
      const mockApplication = global.testUtils.createMockApplication({
        user_id: userId,
        preferred_platform: 'both',
        driver_documents: [
          global.testUtils.createMockDocument({ is_verified: true }),
          global.testUtils.createMockDocument({ is_verified: false })
        ]
      });

      jest.spyOn(driverService, 'getUserApplication').mockResolvedValue(mockApplication);

      const result = await driverService.getUserApplicationStats(userId);

      expect(result.hasApplication).toBe(true);
      expect(result.status).toBe('pending');
      expect(result.documentsUploaded).toBe(2);
      expect(result.documentsVerified).toBe(1);
      expect(result.documentsRequired).toEqual(['national_id', 'driving_license', 'vehicle_registration', 'insurance', 'iban_certificate']);
    });

    it('should return stats for user without application', async () => {
      const userId = 'test-user-id';

      jest.spyOn(driverService, 'getUserApplication').mockResolvedValue(null);

      const result = await driverService.getUserApplicationStats(userId);

      expect(result.hasApplication).toBe(false);
      expect(result.status).toBeNull();
      expect(result.documentsUploaded).toBe(0);
      expect(result.documentsVerified).toBe(0);
    });
  });

  describe('getRequiredDocuments', () => {
    it('should return base documents for hungerstation', () => {
      const result = driverService.getRequiredDocuments('hungerstation');

      expect(result).toEqual(['national_id', 'driving_license', 'vehicle_registration', 'insurance']);
    });

    it('should return extended documents for jahez', () => {
      const result = driverService.getRequiredDocuments('jahez');

      expect(result).toEqual(['national_id', 'driving_license', 'vehicle_registration', 'insurance', 'iban_certificate']);
    });

    it('should return extended documents for both platforms', () => {
      const result = driverService.getRequiredDocuments('both');

      expect(result).toEqual(['national_id', 'driving_license', 'vehicle_registration', 'insurance', 'iban_certificate']);
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('should calculate completion percentage correctly', () => {
      const mockApplication = global.testUtils.createMockApplication({
        preferred_platform: 'hungerstation',
        driver_documents: [
          global.testUtils.createMockDocument({ document_type: 'national_id' }),
          global.testUtils.createMockDocument({ document_type: 'driving_license' })
        ]
      });

      const result = driverService.calculateCompletionPercentage(mockApplication);

      // 8/8 application fields (50%) + 2/4 documents (25%) = 75%
      expect(result).toBe(75);
    });

    it('should handle incomplete application', () => {
      const mockApplication = global.testUtils.createMockApplication({
        preferred_platform: 'hungerstation',
        vehicle_model: null, // Missing field
        driver_documents: []
      });

      const result = driverService.calculateCompletionPercentage(mockApplication);

      // 7/8 application fields (43.75%) + 0/4 documents (0%) = 44%
      expect(result).toBe(44);
    });
  });

  describe('subscribeToApplicationChanges', () => {
    it('should create subscription for application changes', () => {
      const applicationId = 'test-application-id';
      const callback = jest.fn();

      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn()
      };

      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const result = driverService.subscribeToApplicationChanges(applicationId, callback);

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(`application-${applicationId}`);
      expect(mockChannel.on).toHaveBeenCalledWith('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'driver_applications',
        filter: `id=eq.${applicationId}`
      }, callback);
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });
});

