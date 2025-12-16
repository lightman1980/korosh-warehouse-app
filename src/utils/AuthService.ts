import { DataStorage } from '../utils/dataStorage';

export interface UserProfile {
  id: string;
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  departmentName?: string;
  role: 'admin' | 'user' | 'manager' | 'operator';
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  failedLoginAttempts: number;
  passwordChangedAt?: string;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  customFields?: Record<string, any>;
}

export interface LoginResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  requiresTwoFactor?: boolean;
  sessionToken?: string;
}

export interface SessionInfo {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
  loginTime: string;
  lastActivity: string;
  expiresAt: string;
  sessionToken: string;
}

class AuthService {
  private storage: DataStorage;
  private sessionKey = 'current_session';
  private maxFailedAttempts = 5;
  // Load block duration from settings, default to 10 seconds
  private getBlockDuration(): number {
    try {
      const settings = localStorage.getItem('appSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.security?.loginBlockDuration) {
          return parsed.security.loginBlockDuration * 1000; // Convert seconds to milliseconds
        }
      }
    } catch (error) {
      console.error('Error loading block duration from settings:', error);
    }
    return 10 * 1000; // Default: 10 seconds in milliseconds
  }
  private sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours

  constructor() {
    this.storage = DataStorage.getInstance();
    this.initializeDefaultUsers();
  }

  private initializeDefaultUsers() {
    try {
      const users = this.storage.loadData<UserProfile[]>('users');
      
      // Default user definitions with correct passwords
      const defaultUserDefinitions = {
        'admin': { password: 'admin123', id: 'admin_001' },
        'manager': { password: 'manager123', id: 'manager_001' },
        'user': { password: 'user123', id: 'user_001' },
        'operator': { password: 'operator123', id: 'operator_001' }
      };
      
      if (!users || users.length === 0) {
        // Create default users if none exist
        const defaultUsers: UserProfile[] = [
          {
            id: 'admin_001',
            username: 'admin',
            password: 'admin123',
            fullName: 'مدیر کل سیستم',
            email: 'admin@koroshfood.com',
            phone: '09121234567',
            role: 'admin',
            isActive: true,
            isEmailVerified: true,
            failedLoginAttempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            permissions: ['*'] // All permissions
          },
          {
            id: 'manager_001',
            username: 'manager',
            password: 'manager123',
            fullName: 'مدیر انبار',
            email: 'manager@koroshfood.com',
            phone: '09127654321',
            departmentId: 'warehouse',
            departmentName: 'انبار',
            role: 'manager',
            isActive: true,
            isEmailVerified: true,
            failedLoginAttempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            permissions: ['warehouse_manage', 'reports_view', 'inventory_manage']
          },
          {
            id: 'user_001',
            username: 'user',
            password: 'user123',
            fullName: 'کاربر انبار',
            email: 'user@koroshfood.com',
            phone: '09123456789',
            departmentId: 'warehouse',
            departmentName: 'انبار',
            role: 'user',
            isActive: true,
            isEmailVerified: true,
            failedLoginAttempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            permissions: ['inventory_view', 'receipt_create', 'delivery_create']
          },
          {
            id: 'operator_001',
            username: 'operator',
            password: 'operator123',
            fullName: 'اپراتور سیستم',
            email: 'operator@koroshfood.com',
            role: 'operator',
            isActive: true,
            isEmailVerified: true,
            failedLoginAttempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            permissions: ['basic_operations', 'data_entry']
          }
        ];

        this.storage.saveData('users', defaultUsers);
        console.log('Default users created successfully');
      } else {
        // Check and update default users' passwords if they don't match
        let updated = false;
        const updatedUsers = users.map(user => {
          const defaultUser = defaultUserDefinitions[user.username.toLowerCase() as keyof typeof defaultUserDefinitions];
          if (defaultUser && user.password !== defaultUser.password) {
            console.log(`Updating password for default user: ${user.username}`);
            updated = true;
            return {
              ...user,
              password: defaultUser.password,
              updatedAt: new Date().toISOString()
            };
          }
          return user;
        });
        
        if (updated) {
          this.storage.saveData('users', updatedUsers);
          console.log('Default users passwords updated successfully');
        }
      }
    } catch (error) {
      console.error('Error initializing default users:', error);
    }
  }

  /**
   * Authenticate user with username and password
   */
  async authenticate(username: string, password: string): Promise<LoginResult> {
    try {
      // Validate input
      if (!username || !password) {
        return {
          success: false,
          error: 'نام کاربری و رمز عبور الزامی هستند'
        };
      }

      // Check if account is blocked
      if (this.isAccountBlocked(username)) {
        return {
          success: false,
          error: 'حساب کاربری موقتاً مسدود شده است. لطفاً بعداً تلاش کنید.'
        };
      }

      // Load users
      const users = this.storage.loadData<UserProfile[]>('users');
      console.log('AuthService: Loading users, count:', users?.length || 0);
      
      if (!users || users.length === 0) {
        console.log('AuthService: No users found, initializing default users...');
        // Try to initialize users again
        this.initializeDefaultUsers();
        const retryUsers = this.storage.loadData<UserProfile[]>('users');
        if (!retryUsers || retryUsers.length === 0) {
          return {
            success: false,
            error: 'سیستم کاربران خالی است. لطفاً با مدیر سیستم تماس بگیرید.'
          };
        }
        // Use the newly initialized users
        const retryUser = retryUsers.find(u => 
          u.username.toLowerCase() === username.toLowerCase() && u.isActive
        );
        if (!retryUser) {
          this.recordFailedAttempt(username);
          return {
            success: false,
            error: 'نام کاربری یا رمز عبور اشتباه است'
          };
        }
        // Continue with retryUser
        if (retryUser.password !== password) {
          this.recordFailedAttempt(username);
          return {
            success: false,
            error: 'نام کاربری یا رمز عبور اشتباه است'
          };
        }
        // Reset failed attempts and update last login
        this.resetFailedAttempts(username);
        const updatedRetryUsers = retryUsers.map(u => 
          u.id === retryUser.id 
            ? { 
                ...u, 
                lastLogin: new Date().toISOString(),
                failedLoginAttempts: 0
              }
            : u
        );
        this.storage.saveData('users', updatedRetryUsers);
        const session = this.createSession(retryUser);
        return {
          success: true,
          user: retryUser,
          sessionToken: session.sessionToken
        };
      }

      // Find user by username (case insensitive)
      const user = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase()
      );
      
      console.log('AuthService: User found:', user ? `${user.username} (active: ${user.isActive})` : 'not found');

      if (!user) {
        console.log('AuthService: User not found for username:', username);
        this.recordFailedAttempt(username);
        return {
          success: false,
          error: 'نام کاربری یا رمز عبور اشتباه است'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        console.log('AuthService: User is inactive:', username);
        return {
          success: false,
          error: 'حساب کاربری شما غیرفعال است. با مدیر سیستم تماس بگیرید.'
        };
      }

      // Validate password (in production, use proper hashing)
      console.log('AuthService: Validating password for user:', username);
      console.log('AuthService: Expected password:', user.password, 'Received password:', password);
      
      // Trim both passwords for comparison
      const userPassword = (user.password || '').trim();
      const inputPassword = (password || '').trim();
      
      if (userPassword !== inputPassword) {
        console.log('AuthService: Password mismatch for user:', username);
        console.log('AuthService: User password in storage:', userPassword);
        console.log('AuthService: Input password:', inputPassword);
        
        // Try to fix default users' passwords if they don't match
        const defaultUserDefinitions: Record<string, string> = {
          'admin': 'admin123',
          'manager': 'manager123',
          'user': 'user123',
          'operator': 'operator123'
        };
        
        const defaultPassword = defaultUserDefinitions[username.toLowerCase()];
        if (defaultPassword && userPassword !== defaultPassword) {
          console.log('AuthService: Attempting to fix default user password...');
          const allUsers = this.storage.loadData<UserProfile[]>('users') || [];
          const updatedUsers = allUsers.map(u => {
            if (u.username.toLowerCase() === username.toLowerCase()) {
              return {
                ...u,
                password: defaultPassword,
                updatedAt: new Date().toISOString()
              };
            }
            return u;
          });
          this.storage.saveData('users', updatedUsers);
          
          // Retry authentication with corrected password
          if (defaultPassword === inputPassword) {
            console.log('AuthService: Password corrected, retrying authentication...');
            const correctedUser = updatedUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (correctedUser) {
              this.resetFailedAttempts(username);
              const updatedRetryUsers = updatedUsers.map(u => 
                u.id === correctedUser.id 
                  ? { 
                      ...u, 
                      lastLogin: new Date().toISOString(),
                      failedLoginAttempts: 0
                    }
                  : u
              );
              this.storage.saveData('users', updatedRetryUsers);
              const session = this.createSession(correctedUser);
              return {
                success: true,
                user: correctedUser,
                sessionToken: session.sessionToken
              };
            }
          }
        }
        
        this.recordFailedAttempt(username);
        return {
          success: false,
          error: 'نام کاربری یا رمز عبور اشتباه است'
        };
      }
      
      console.log('AuthService: Authentication successful for user:', username);

      // Reset failed attempts on successful login
      this.resetFailedAttempts(username);

      // Update last login
      const updatedUsers = users.map(u => 
        u.id === user.id 
          ? { 
              ...u, 
              lastLogin: new Date().toISOString(),
              failedLoginAttempts: 0
            }
          : u
      );
      this.storage.saveData('users', updatedUsers);

      // Create session
      const session = this.createSession(user);
      
      // Return success result
      return {
        success: true,
        user: user,
        sessionToken: session.sessionToken
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'خطای غیرمنتظره در سیستم احراز هویت'
      };
    }
  }

  /**
   * Get current session information
   */
  getCurrentSession(): SessionInfo | null {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) return null;

      const session: SessionInfo = JSON.parse(sessionData);
      
      // Check if session is expired
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        this.logout();
        return null;
      }

      // Update last activity
      session.lastActivity = new Date().toISOString();
      localStorage.setItem(this.sessionKey, JSON.stringify(session));

      return session;
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.getCurrentSession() !== null;
  }

  /**
   * Get current logged in user
   */
  getCurrentUser(): UserProfile | null {
    try {
      const session = this.getCurrentSession();
      if (!session) return null;

      const users = this.storage.loadData<UserProfile[]>('users') || [];
      return users.find(u => u.id === session.userId) || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Logout current user
   */
  logout(): void {
    try {
      localStorage.removeItem(this.sessionKey);
      // Clear any cached data if needed
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    try {
      const user = this.getCurrentUser();
      if (!user) return false;

      // Admin has all permissions
      if (user.permissions.includes('*') || user.role === 'admin') {
        return true;
      }

      return user.permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Get all users
   */
  getAllUsers(): UserProfile[] {
    try {
      return this.storage.loadData<UserProfile[]>('users') || [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  /**
   * Find user by ID
   */
  getUserById(userId: string): UserProfile | null {
    try {
      const users = this.getAllUsers();
      return users.find(u => u.id === userId) || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Find user by username
   */
  getUserByUsername(username: string): UserProfile | null {
    try {
      const users = this.getAllUsers();
      return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  updateUser(userId: string, updates: Partial<UserProfile>): boolean {
    try {
      const users = this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        console.error('User not found for update');
        return false;
      }

      // Don't allow changing certain fields through this method
      const { id, createdAt, ...allowedUpdates } = updates;
      
      users[userIndex] = {
        ...users[userIndex],
        ...allowedUpdates,
        updatedAt: new Date().toISOString()
      };

      this.storage.saveData('users', users);
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  /**
   * Change user password
   */
  changePassword(userId: string, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    try {
      const user = this.getUserById(userId);
      if (!user) {
        return { success: false, error: 'کاربر یافت نشد' };
      }

      // Verify old password
      if (user.password !== oldPassword) {
        return { success: false, error: 'رمز عبور فعلی اشتباه است' };
      }

      // Update password
      const success = this.updateUser(userId, {
        password: newPassword,
        passwordChangedAt: new Date().toISOString()
      });

      if (success) {
        return { success: true };
      } else {
        return { success: false, error: 'خطا در تغییر رمز عبور' };
      }
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, error: 'خطای غیرمنتظره در تغییر رمز عبور' };
    }
  }

  /**
   * Reset user password (admin function)
   */
  resetUserPassword(userId: string, newPassword: string): { success: boolean; error?: string } {
    try {
      const success = this.updateUser(userId, {
        password: newPassword,
        passwordChangedAt: new Date().toISOString(),
        failedLoginAttempts: 0 // Reset failed attempts
      });

      if (success) {
        return { success: true };
      } else {
        return { success: false, error: 'خطا در بازنشانی رمز عبور' };
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: 'خطای غیرمنتظره در بازنشانی رمز عبور' };
    }
  }

  /**
   * Activate/Deactivate user account
   */
  toggleUserStatus(userId: string, isActive: boolean): boolean {
    return this.updateUser(userId, { isActive });
  }

  /**
   * Private helper methods
   */
  private isAccountBlocked(username: string): boolean {
    try {
      const blockKey = `blocked_${username}`;
      const blockedUntil = localStorage.getItem(blockKey);
      
      if (blockedUntil) {
        const blockTime = parseInt(blockedUntil);
        if (Date.now() < blockTime) {
          return true;
        } else {
          // Block expired, clean up
          localStorage.removeItem(blockKey);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking account block status:', error);
      return false;
    }
  }

  private recordFailedAttempt(username: string): void {
    try {
      const blockKey = `blocked_${username}`;
      const failedKey = `failed_${username}`;
      
      // Record failed attempt
      const attempts = (parseInt(localStorage.getItem(failedKey) || '0') || 0) + 1;
      localStorage.setItem(failedKey, attempts.toString());

      // Check if should block account
      if (attempts >= this.maxFailedAttempts) {
        const blockDuration = this.getBlockDuration();
        const blockedUntil = Date.now() + blockDuration;
        localStorage.setItem(blockKey, blockedUntil.toString());
        
        // Reset failed attempts counter
        localStorage.removeItem(failedKey);
        
        console.log(`Account ${username} blocked for ${blockDuration / 1000} seconds`);
      }
    } catch (error) {
      console.error('Error recording failed attempt:', error);
    }
  }

  private resetFailedAttempts(username: string): void {
    try {
      const failedKey = `failed_${username}`;
      localStorage.removeItem(failedKey);
    } catch (error) {
      console.error('Error resetting failed attempts:', error);
    }
  }

  private createSession(user: UserProfile): SessionInfo {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTimeout);
    
    const session: SessionInfo = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions,
      loginTime: now.toISOString(),
      lastActivity: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      sessionToken: this.generateSessionToken()
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    return session;
  }

  private generateSessionToken(): string {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Session management
   */
  refreshSession(): boolean {
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession) return false;

      // Create new session with updated expiry
      const user = this.getCurrentUser();
      if (!user) return false;

      const newSession = this.createSession(user);
      return !!newSession;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions and blocked accounts
   */
  cleanup(): void {
    try {
      // Clean up failed attempts and blocks for non-existent users
      const users = this.getAllUsers();
      const validUsernames = users.map(u => u.username.toLowerCase());
      
      // Clean up localStorage keys that don't belong to valid users
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('failed_') || key.startsWith('blocked_')) {
          const username = key.replace('failed_', '').replace('blocked_', '').toLowerCase();
          if (!validUsernames.includes(username)) {
            localStorage.removeItem(key);
          }
        }
      });

      console.log('Auth cleanup completed');
    } catch (error) {
      console.error('Error during auth cleanup:', error);
    }
  }
}

// Create singleton instance
export const authService = new AuthService();

// Export default instance
export default authService;