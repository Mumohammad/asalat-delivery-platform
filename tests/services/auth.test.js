/**USfk08mkD6kVtF3O
 * Authentication Service Tests
 */

import authService from '../../js/services/auth.js';
import { mockSupabaseClient } from '../setup.js';

describe('AuthService', () => {
  beforeEach(() => {
    global.testUtils.resetMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(authService.initialize()).resolves.not.toThrow();
    });

    it('should set current session and user from existing session', async () => {
      const mockSession = global.testUtils.createMockSession();
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      await authService.initialize();

      expect(authService.getCurrentSession()).toEqual(mockSession);
      expect(authService.getCurrentUser()).toEqual(mockSession.user);
    });
  });

  describe('signUp', () => {
    it('should sign up user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        phone: '+966501234567',
        role: 'driver'
      };

      const mockUser = global.testUtils.createMockUser({ email: userData.email });
      const mockSession = global.testUtils.createMockSession(mockUser);

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock the createUserProfile method
      jest.spyOn(authService, 'createUserProfile').mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        full_name: userData.fullName
      });

      const result = await authService.signUp(userData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            phone: userData.phone,
            role: userData.role
          }
        }
      });
    });

    it('should handle sign up error', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' }
      });

      const result = await authService.signUp(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already registered');
    });
  });

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = global.testUtils.createMockUser({ email: credentials.email });
      const mockSession = global.testUtils.createMockSession(mockUser);
      const mockProfile = { id: mockUser.id, role: 'driver' };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      jest.spyOn(authService, 'getUserProfile').mockResolvedValue(mockProfile);

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.profile).toEqual(mockProfile);
      expect(authService.getCurrentUser()).toEqual(mockUser);
      expect(authService.getCurrentSession()).toEqual(mockSession);
    });

    it('should handle sign in error', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid login credentials');
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null
      });

      const result = await authService.signOut();

      expect(result.success).toBe(true);
      expect(authService.getCurrentUser()).toBeNull();
      expect(authService.getCurrentSession()).toBeNull();
    });

    it('should handle sign out error', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' }
      });

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign out failed');
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com';

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: null
      });

      const result = await authService.resetPassword(email);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        email,
        { redirectTo: `${window.location.origin}/reset-password` }
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const newPassword = 'newpassword123';

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: global.testUtils.createMockUser() },
        error: null
      });

      const result = await authService.updatePassword(newPassword);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: newPassword
      });
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      const userId = 'test-user-id';
      const mockProfile = {
        id: userId,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'driver'
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await authService.getUserProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', userId);
    });

    it('should return null on error', async () => {
      const userId = 'test-user-id';

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'User not found' } })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await authService.getUserProfile(userId);

      expect(result).toBeNull();
    });
  });

  describe('createUserProfile', () => {
    it('should create user profile successfully', async () => {
      const mockUser = global.testUtils.createMockUser();
      const additionalData = {
        fullName: 'Test User',
        phone: '+966501234567',
        role: 'driver'
      };

      const expectedProfile = {
        id: mockUser.id,
        email: mockUser.email,
        full_name: additionalData.fullName,
        phone: additionalData.phone,
        role: additionalData.role,
        preferred_language: 'en'
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: expectedProfile, error: null })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await authService.createUserProfile(mockUser, additionalData);

      expect(result).toEqual(expectedProfile);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });
  });

  describe('getUserRole', () => {
    it('should get user role successfully', async () => {
      const userId = 'test-user-id';
      authService.currentUser = { id: userId };

      jest.spyOn(authService, 'getUserProfile').mockResolvedValue({
        id: userId,
        role: 'admin'
      });

      const result = await authService.getUserRole();

      expect(result).toBe('admin');
    });

    it('should return default role when no profile found', async () => {
      const userId = 'test-user-id';
      authService.currentUser = { id: userId };

      jest.spyOn(authService, 'getUserProfile').mockResolvedValue(null);

      const result = await authService.getUserRole();

      expect(result).toBe('driver');
    });

    it('should return guest when no user', async () => {
      authService.currentUser = null;

      const result = await authService.getUserRole();

      expect(result).toBe('guest');
    });
  });

  describe('hasRole', () => {
    it('should return true when user has role', async () => {
      jest.spyOn(authService, 'getUserRole').mockResolvedValue('admin');

      const result = await authService.hasRole('admin');

      expect(result).toBe(true);
    });

    it('should return false when user does not have role', async () => {
      jest.spyOn(authService, 'getUserRole').mockResolvedValue('driver');

      const result = await authService.hasRole('admin');

      expect(result).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin role', async () => {
      jest.spyOn(authService, 'getUserRole').mockResolvedValue('admin');

      const result = await authService.isAdmin();

      expect(result).toBe(true);
    });

    it('should return true for super_admin role', async () => {
      jest.spyOn(authService, 'getUserRole').mockResolvedValue('super_admin');

      const result = await authService.isAdmin();

      expect(result).toBe(true);
    });

    it('should return false for driver role', async () => {
      jest.spyOn(authService, 'getUserRole').mockResolvedValue('driver');

      const result = await authService.isAdmin();

      expect(result).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', () => {
      authService.currentSession = global.testUtils.createMockSession();
      authService.currentUser = global.testUtils.createMockUser();

      const result = authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when user is not authenticated', () => {
      authService.currentSession = null;
      authService.currentUser = null;

      const result = authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockSession = global.testUtils.createMockSession();
      const mockUser = mockSession.user;

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      });

      const result = await authService.refreshSession();

      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
      expect(result.user).toEqual(mockUser);
      expect(authService.getCurrentSession()).toEqual(mockSession);
      expect(authService.getCurrentUser()).toEqual(mockUser);
    });
  });

  describe('onAuthStateChange', () => {
    it('should set up auth state change listener', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue(unsubscribe);

      const result = authService.onAuthStateChange(callback);

      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toBe(unsubscribe);
    });
  });
});

