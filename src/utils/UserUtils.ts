import { UserProfile } from './AuthService';

/**
 * User Management Utilities
 */
export class UserUtils {
  /**
   * Generate a unique user ID
   */
  static generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate username format
   */
  static validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username || username.trim().length === 0) {
      return { valid: false, error: 'نام کاربری الزامی است' };
    }

    if (username.length < 3) {
      return { valid: false, error: 'نام کاربری باید حداقل 3 کاراکتر باشد' };
    }

    if (username.length > 50) {
      return { valid: false, error: 'نام کاربری نمی‌تواند بیش از 50 کاراکتر باشد' };
    }

    // Check for valid characters (letters, numbers, underscore, dash)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return { 
        valid: false, 
        error: 'نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد، underscore و dash باشد' 
      };
    }

    // Check if starts with letter or number
    if (!/^[a-zA-Z0-9]/.test(username)) {
      return { valid: false, error: 'نام کاربری باید با حرف یا عدد شروع شود' };
    }

    return { valid: true };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email || email.trim().length === 0) {
      return { valid: false, error: 'ایمیل الزامی است' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'فرمت ایمیل نامعتبر است' };
    }

    if (email.length > 100) {
      return { valid: false, error: 'ایمیل نمی‌تواند بیش از 100 کاراکتر باشد' };
    }

    return { valid: true };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string, username?: string, fullName?: string): { 
    valid: boolean; 
    error?: string;
    strength?: 'weak' | 'medium' | 'strong';
  } {
    if (!password || password.length === 0) {
      return { valid: false, error: 'رمز عبور الزامی است', strength: 'weak' };
    }

    if (password.length < 6) {
      return { valid: false, error: 'رمز عبور باید حداقل 6 کاراکتر باشد', strength: 'weak' };
    }

    if (password.length < 8) {
      return { valid: true, strength: 'medium' };
    }

    // Check for common patterns
    const commonPatterns = [
      password.toLowerCase(),
      username?.toLowerCase() || '',
      fullName?.toLowerCase() || '',
      'password', '123456', 'admin', 'user'
    ];

    const containsCommon = commonPatterns.some(pattern => 
      pattern && password.toLowerCase().includes(pattern)
    );

    if (containsCommon) {
      return { valid: true, strength: 'weak', error: 'رمز عبور شما قابل پیش‌بینی است' };
    }

    // Check character variety
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const varietyCount = [hasLower, hasUpper, hasNumbers, hasSpecial].filter(Boolean).length;

    if (varietyCount >= 3 && password.length >= 10) {
      return { valid: true, strength: 'strong' };
    }

    return { valid: true, strength: 'medium' };
  }

  /**
   * Validate phone number format (Iranian)
   */
  static validatePhone(phone: string): { valid: boolean; error?: string } {
    if (!phone || phone.trim().length === 0) {
      return { valid: true }; // Phone is optional
    }

    // Iranian mobile number pattern
    const phoneRegex = /^(\+98|0)?9\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      return { valid: false, error: 'شماره موبایل نامعتبر است' };
    }

    return { valid: true };
  }

  /**
   * Format phone number for display
   */
  static formatPhone(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as 0912-345-6789
    if (digits.length === 11 && digits.startsWith('0')) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    if (digits.length === 10 && digits.startsWith('9')) {
      return `0${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    return phone; // Return original if format not recognized
  }

  /**
   * Format user name for display
   */
  static formatFullName(firstName: string, lastName: string): string {
    const first = firstName?.trim() || '';
    const last = lastName?.trim() || '';
    
    if (first && last) {
      return `${first} ${last}`;
    }
    
    return first || last || '';
  }

  /**
   * Generate display name from full name
   */
  static generateDisplayName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    
    // Return first and last names
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }

  /**
   * Check if username is unique
   */
  static isUsernameUnique(username: string, users: UserProfile[], excludeUserId?: string): boolean {
    return !users.some(user => 
      user.username.toLowerCase() === username.toLowerCase() && 
      user.id !== excludeUserId
    );
  }

  /**
   * Check if email is unique
   */
  static isEmailUnique(email: string, users: UserProfile[], excludeUserId?: string): boolean {
    return !users.some(user => 
      user.email.toLowerCase() === email.toLowerCase() && 
      user.id !== excludeUserId
    );
  }

  /**
   * Get role display name in Persian
   */
  static getRoleDisplayName(role: string): string {
    const roleNames = {
      'admin': 'مدیر سیستم',
      'manager': 'مدیر میانی',
      'user': 'کاربر عادی',
      'operator': 'اپراتور'
    };
    
    return roleNames[role as keyof typeof roleNames] || role;
  }

  /**
   * Get role color class
   */
  static getRoleColorClass(role: string): string {
    const colors = {
      'admin': 'bg-purple-100 text-purple-800 border-purple-200',
      'manager': 'bg-blue-100 text-blue-800 border-blue-200',
      'user': 'bg-green-100 text-green-800 border-green-200',
      'operator': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  /**
   * Get status display name in Persian
   */
  static getStatusDisplayName(isActive: boolean): string {
    return isActive ? 'فعال' : 'غیرفعال';
  }

  /**
   * Get status color class
   */
  static getStatusColorClass(isActive: boolean): string {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  }

  /**
   * Format last login date
   */
  static formatLastLogin(lastLogin?: string): string {
    if (!lastLogin) return 'هرگز';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} روز پیش`;
    } else if (diffHours > 0) {
      return `${diffHours} ساعت پیش`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} دقیقه پیش`;
    } else {
      return 'چند لحظه پیش';
    }
  }

  /**
   * Calculate account age
   */
  static getAccountAge(createdAt: string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) {
      return `${diffYears} سال`;
    } else if (diffMonths > 0) {
      return `${diffMonths} ماه`;
    } else {
      return `${diffDays} روز`;
    }
  }

  /**
   * Search users by various criteria
   */
  static searchUsers(users: UserProfile[], query: string): UserProfile[] {
    if (!query || query.trim().length === 0) {
      return users;
    }

    const searchTerm = query.toLowerCase().trim();
    
    return users.filter(user => 
      user.fullName.toLowerCase().includes(searchTerm) ||
      user.username.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      (user.phone && user.phone.includes(searchTerm)) ||
      (user.departmentName && user.departmentName.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Filter users by role
   */
  static filterByRole(users: UserProfile[], role: string): UserProfile[] {
    if (role === 'all') return users;
    return users.filter(user => user.role === role);
  }

  /**
   * Filter users by status
   */
  static filterByStatus(users: UserProfile[], status: string): UserProfile[] {
    if (status === 'all') return users;
    
    if (status === 'active') {
      return users.filter(user => user.isActive);
    } else if (status === 'inactive') {
      return users.filter(user => !user.isActive);
    }
    
    return users;
  }

  /**
   * Sort users by different criteria
   */
  static sortUsers(users: UserProfile[], sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): UserProfile[] {
    const sorted = [...users].sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case 'fullName':
          valueA = a.fullName;
          valueB = b.fullName;
          break;
        case 'username':
          valueA = a.username;
          valueB = b.username;
          break;
        case 'email':
          valueA = a.email;
          valueB = b.email;
          break;
        case 'role':
          valueA = a.role;
          valueB = b.role;
          break;
        case 'createdAt':
          valueA = new Date(a.createdAt);
          valueB = new Date(b.createdAt);
          break;
        case 'lastLogin':
          valueA = a.lastLogin ? new Date(a.lastLogin) : new Date(0);
          valueB = b.lastLogin ? new Date(b.lastLogin) : new Date(0);
          break;
        default:
          valueA = a.fullName;
          valueB = b.fullName;
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortOrder === 'asc' 
          ? valueA.localeCompare(valueB, 'fa')
          : valueB.localeCompare(valueA, 'fa');
      }

      if (valueA instanceof Date && valueB instanceof Date) {
        return sortOrder === 'asc' 
          ? valueA.getTime() - valueB.getTime()
          : valueB.getTime() - valueA.getTime();
      }

      return 0;
    });

    return sorted;
  }

  /**
   * Get user statistics
   */
  static getUserStats(users: UserProfile[]) {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const inactive = total - active;
    const admins = users.filter(u => u.role === 'admin').length;
    const managers = users.filter(u => u.role === 'manager').length;
    const operators = users.filter(u => u.role === 'operator').length;
    const regularUsers = users.filter(u => u.role === 'user').length;
    
    const withRecentLogin = users.filter(u => {
      if (!u.lastLogin) return false;
      const lastLogin = new Date(u.lastLogin);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return lastLogin > thirtyDaysAgo;
    }).length;

    return {
      total,
      active,
      inactive,
      admins,
      managers,
      operators,
      regularUsers,
      withRecentLogin,
      activationRate: total > 0 ? Math.round((active / total) * 100) : 0,
      recentActivityRate: total > 0 ? Math.round((withRecentLogin / total) * 100) : 0
    };
  }

  /**
   * Export users to CSV format
   */
  static exportToCSV(users: UserProfile[]): string {
    const headers = [
      'نام کاربری',
      'نام کامل',
      'ایمیل',
      'شماره تماس',
      'دپارتمان',
      'نقش',
      'وضعیت',
      'تاریخ ایجاد',
      'آخرین ورود',
      'تأیید ایمیل'
    ];

    const csvData = users.map(user => [
      user.username,
      user.fullName,
      user.email,
      user.phone || '',
      user.departmentName || '',
      this.getRoleDisplayName(user.role),
      this.getStatusDisplayName(user.isActive),
      new Date(user.createdAt).toLocaleDateString('fa-IR'),
      user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('fa-IR') : 'هرگز',
      user.isEmailVerified ? 'تأیید شده' : 'تأیید نشده'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Create user avatar initials
   */
  static getUserInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Generate random color for user avatar
   */
  static getRandomAvatarColor(): string {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

/**
 * Permission utilities
 */
export class PermissionUtils {
  /**
   * Check if user has permission
   */
  static hasPermission(user: UserProfile, permission: string): boolean {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.permissions.includes('*') || user.role === 'admin') {
      return true;
    }
    
    return user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(user: UserProfile, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  static hasAllPermissions(user: UserProfile, permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * Get role-based default permissions
   */
  static getDefaultPermissions(role: string): string[] {
    const rolePermissions = {
      admin: ['*'],
      manager: [
        'warehouse_manage',
        'reports_view',
        'inventory_manage',
        'user_view',
        'basic_operations'
      ],
      user: [
        'inventory_view',
        'receipt_create',
        'delivery_create',
        'basic_operations'
      ],
      operator: [
        'basic_operations',
        'data_entry',
        'inventory_view'
      ]
    };
    
    return rolePermissions[role as keyof typeof rolePermissions] || [];
  }

  /**
   * Check if permission name is valid
   */
  static isValidPermission(permission: string): boolean {
    const validPermissions = [
      '*',
      'dashboard_view',
      'base_data_manage',
      'warehouse_manage',
      'inventory_view',
      'inventory_manage',
      'receipt_create',
      'delivery_create',
      'reports_view',
      'reports_manage',
      'user_manage',
      'user_view',
      'settings_manage',
      'backup_manage',
      'basic_operations',
      'data_entry'
    ];
    
    return validPermissions.includes(permission);
  }
}

/**
 * Security utilities
 */
export class SecurityUtils {
  /**
   * Generate secure random password
   */
  static generateSecurePassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Hash password (simple implementation - use proper hashing in production)
   */
  static hashPassword(password: string, salt?: string): string {
    // This is a simple hash - in production, use bcrypt, scrypt, or Argon2
    const saltToUse = salt || Math.random().toString(36).substring(2, 15);
    const hashed = btoa(password + saltToUse);
    return `${saltToUse}:${hashed}`;
  }

  /**
   * Verify password against hash
   */
  static verifyPassword(password: string, hash: string): boolean {
    try {
      const [salt, originalHash] = hash.split(':');
      const newHash = btoa(password + salt);
      return newHash === originalHash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate session token
   */
  static generateSessionToken(): string {
    return 'token_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
  }

  /**
   * Check if password meets security requirements
   */
  static checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    suggestions: string[];
  } {
    const feedback: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) {
      score += 20;
    } else {
      suggestions.push('رمز عبور را حداقل 8 کاراکتر انتخاب کنید');
    }

    // Character variety checks
    if (/[a-z]/.test(password)) score += 15;
    else suggestions.push('از حروف کوچک استفاده کنید');

    if (/[A-Z]/.test(password)) score += 15;
    else suggestions.push('از حروف بزرگ استفاده کنید');

    if (/\d/.test(password)) score += 15;
    else suggestions.push('از اعداد استفاده کنید');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
    else suggestions.push('از کاراکترهای خاص استفاده کنید');

    // Length bonus
    if (password.length >= 12) score += 20;
    else if (password.length >= 16) score += 10;

    // Common patterns penalty
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('از کاراکترهای تکراری استفاده نکنید');
    }

    if (/123|abc|password|qwerty/i.test(password)) {
      score -= 20;
      feedback.push('از کلمات رایج استفاده نکنید');
    }

    // Final score adjustment
    score = Math.max(0, Math.min(100, score));

    if (score < 30) {
      feedback.push('رمز عبور بسیار ضعیف است');
    } else if (score < 60) {
      feedback.push('رمز عبور متوسط است');
    } else if (score < 80) {
      feedback.push('رمز عبور خوب است');
    } else {
      feedback.push('رمز عبور بسیار قوی است');
    }

    return { score, feedback, suggestions };
  }
}