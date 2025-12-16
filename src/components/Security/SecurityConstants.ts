// Security Settings Constants
// تمام ثابت‌ها و تنظیمات پیش‌فرض برای سیستم امنیت

import { SecuritySettingsData, ComplianceConfig, SecurityConfig } from './SecurityTypes';

// ========================
// DEFAULT VALUES
// ========================

export const DEFAULT_PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  expireDays: 90,
  preventReuse: 5
} as const;

export const DEFAULT_SECURITY_SETTINGS: SecuritySettingsData = {
  maxFailedAttempts: 3,
  loginBlockDuration: 10, // seconds
  sessionTimeoutMinutes: 60,
  passwordPolicy: DEFAULT_PASSWORD_POLICY,
  twoFactorAuth: false,
  ipWhitelist: [],
  sessionHistory: true,
  encryptionEnabled: true,
  auditLogEnabled: true
} as const;

export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  gdprEnabled: true,
  dataRetentionDays: 2555, // 7 years
  auditLogRetentionDays: 2555, // 7 years
  requireConsent: true,
  anonymizeData: false,
  dataExportEnabled: true,
  rightToBeForgotten: true
} as const;

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  version: '2.0.0',
  environment: 'development',
  features: {
    twoFactorAuth: true,
    ipWhitelisting: true,
    auditLogging: true,
    encryption: true,
    sessionManagement: true
  },
  limits: {
    maxLoginAttempts: 10,
    sessionTimeoutHours: 8,
    passwordHistoryCount: 12,
    ipWhitelistSize: 100
  },
  compliance: DEFAULT_COMPLIANCE_CONFIG
} as const;

// ========================
// VALIDATION RULES
// ========================

export const VALIDATION_RULES = {
  maxFailedAttempts: {
    min: 1,
    max: 10,
    default: 3
  },
  loginBlockDuration: {
    min: 5, // seconds
    max: 3600, // 1 hour
    default: 10
  },
  sessionTimeoutMinutes: {
    min: 5,
    max: 480, // 8 hours
    default: 60
  },
  passwordPolicy: {
    minLength: {
      min: 4,
      max: 32,
      default: 8,
      recommended: 12
    },
    expireDays: {
      min: 0, // 0 = no expiration
      max: 365,
      default: 90,
      recommended: 30
    },
    preventReuse: {
      min: 0,
      max: 20,
      default: 5,
      recommended: 12
    }
  }
} as const;

// ========================
// SECURITY CONSTANTS
// ========================

export const SECURITY_CONSTANTS = {
  // Session management
  SESSION_COOKIE_NAME: 'session_token',
  SESSION_COOKIE_SECURE: true,
  SESSION_COOKIE_HTTP_ONLY: true,
  SESSION_COOKIE_SAME_SITE: 'strict' as const,
  
  // Password policies
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_HISTORY_COUNT: 5,
  
  // Two-factor authentication
  TOTP_ISSUER: 'YourApp',
  TOTP_DIGITS: 6,
  TOTP_PERIOD: 30,
  BACKUP_CODES_COUNT: 10,
  BACKUP_CODES_LENGTH: 8,
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  LOGIN_RATE_LIMIT_ATTEMPTS: 5,
  LOGIN_RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  
  // Encryption
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  KEY_DERIVATION_ITERATIONS: 100000,
  SALT_LENGTH: 32,
  IV_LENGTH: 16,
  
  // Audit logging
  AUDIT_LOG_RETENTION_DAYS: 2555, // 7 years
  SECURITY_EVENT_RETENTION_DAYS: 365,
  
  // IP Whitelisting
  IP_WHITELIST_MAX_SIZE: 100,
  IPV4_REGEX: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6_REGEX: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  
  // Security headers
  CSP_POLICY: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none';",
  X_FRAME_OPTIONS: 'DENY' as const,
  X_CONTENT_TYPE_OPTIONS: 'nosniff' as const,
  X_XSS_PROTECTION: '1; mode=block' as const,
  STRICT_TRANSPORT_SECURITY: 'max-age=31536000; includeSubDomains; preload' as const
} as const;

// ========================
// UI CONSTANTS
// ========================

export const UI_CONSTANTS = {
  // Colors
  COLORS: {
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#6366F1',
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827'
    }
  },
  
  // Spacing
  SPACING: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  
  // Border radius
  BORDER_RADIUS: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  },
  
  // Typography
  TYPOGRAPHY: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace']
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  
  // Animations
  ANIMATIONS: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms'
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out'
    }
  }
} as const;

// ========================
// ERROR MESSAGES
// ========================

export const ERROR_MESSAGES = {
  validation: {
    required: 'این فیلد الزامی است',
    invalidEmail: 'فرمت ایمیل نامعتبر است',
    invalidIP: 'فرمت آدرس IP نامعتبر است',
    invalidPort: 'شماره پورت نامعتبر است',
    minLength: 'حداقل طول {{min}} کاراکتر است',
    maxLength: 'حداکثر طول {{max}} کاراکتر است',
    minValue: 'حداقل مقدار {{min}} است',
    maxValue: 'حداکثر مقدار {{max}} است',
    invalidFormat: 'فرمت ورودی نامعتبر است',
    duplicateValue: 'این مقدار قبلاً استفاده شده است'
  },
  
  security: {
    weakPassword: 'رمز عبور ضعیف است',
    passwordExpired: 'رمز عبور منقضی شده است',
    accountLocked: 'حساب کاربری قفل شده است',
    invalidCredentials: 'نام کاربری یا رمز عبور نامعتبر است',
    sessionExpired: 'نشست شما منقضی شده است',
    unauthorized: 'شما مجاز به انجام این عمل نیستید',
    rateLimited: 'تعداد درخواست‌های شما بیش از حد مجاز است'
  },
  
  system: {
    internalError: 'خطای داخلی سیستم',
    networkError: 'خطای شبکه رخ داده است',
    timeoutError: 'زمان انتظار به پایان رسید',
    maintenanceMode: 'سیستم در حالت تعمیرات است',
    serviceUnavailable: 'سرویس در دسترس نیست'
  }
} as const;

// ========================
// SUCCESS MESSAGES
// ========================

export const SUCCESS_MESSAGES = {
  settings: {
    saved: 'تنظیمات با موفقیت ذخیره شد',
    reset: 'تنظیمات به حالت پیش‌فرض بازگردانده شد',
    validated: 'تنظیمات معتبر هستند'
  },
  
  security: {
    passwordChanged: 'رمز عبور با موفقیت تغییر کرد',
    twoFactorEnabled: 'احراز هویت دو مرحله‌ای فعال شد',
    twoFactorDisabled: 'احراز هویت دو مرحله‌ای غیرفعال شد',
    accountUnlocked: 'حساب کاربری آزاد شد',
    sessionTerminated: 'نشست خاتمه داده شد'
  },
  
  user: {
    created: 'کاربر جدید ایجاد شد',
    updated: 'اطلاعات کاربر به‌روزرسانی شد',
    deleted: 'کاربر حذف شد',
    activated: 'حساب کاربری فعال شد',
    deactivated: 'حساب کاربری غیرفعال شد'
  }
} as const;

// ========================
// FIELD LABELS
// ========================

export const FIELD_LABELS = {
  basic: {
    maxFailedAttempts: 'حداکثر تلاش‌های ناموفق',
    loginBlockDuration: 'مدت زمان مسدودی (ثانیه)',
    sessionTimeoutMinutes: 'مدت زمان نشست (دقیقه)'
  },
  
  password: {
    minLength: 'حداقل طول رمز عبور',
    requireUppercase: 'نیاز به حروف بزرگ',
    requireLowercase: 'نیاز به حروف کوچک',
    requireNumbers: 'نیاز به اعداد',
    requireSpecialChars: 'نیاز به کاراکترهای خاص',
    expireDays: 'تاریخ انقضا (روز)',
    preventReuse: 'پیشگیری از استفاده مجدد'
  },
  
  features: {
    twoFactorAuth: 'احراز هویت دو مرحله‌ای',
    encryptionEnabled: 'رمزنگاری داده‌ها',
    auditLogEnabled: 'ثبت وقایع امنیتی',
    sessionHistory: 'تاریخچه نشست‌ها'
  },
  
  ip: {
    ipWhitelist: 'لیست IP مجاز',
    addIP: 'افزودن IP',
    removeIP: 'حذف IP'
  }
} as const;

// ========================
// DESCRIPTIONS
// ========================

export const FIELD_DESCRIPTIONS = {
  maxFailedAttempts: 'تعداد دفعات مجاز برای ورود ناموفق قبل از قفل شدن حساب',
  loginBlockDuration: 'مدت زمان مسدودی حساب پس از تلاش‌های ناموفق',
  sessionTimeoutMinutes: 'مدت زمان اعتبار نشست کاربر بدون فعالیت',
  
  minLength: 'حداقل تعداد کاراکترهای مورد نیاز برای رمز عبور',
  requireUppercase: 'رمز عبور باید حداقل شامل یک حرف بزرگ باشد',
  requireLowercase: 'رمز عبور باید حداقل شامل یک حرف کوچک باشد',
  requireNumbers: 'رمز عبور باید حداقل شامل یک عدد باشد',
  requireSpecialChars: 'رمز عبور باید حداقل شامل یک کاراکتر خاص باشد',
  expireDays: 'تعداد روزهای اعتبار رمز عبور (0 = بدون انقضا)',
  preventReuse: 'تعداد رمزهای عبور قبلی که نمی‌توان استفاده کرد',
  
  twoFactorAuth: 'افزودن یک لایه امنیتی اضافی برای ورود',
  encryptionEnabled: 'رمزنگاری داده‌های حساس در پایگاه داده',
  auditLogEnabled: 'ثبت کامل تمام فعالیت‌های امنیتی سیستم',
  sessionHistory: 'نگهداری تاریخچه نشست‌های کاربران'
} as const;

// ========================
// REGEX PATTERNS
// ========================

export const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  ipv6: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  phoneNumber: /^\+?[1-9]\d{1,14}$/,
  creditCard: /^[0-9]{13,19}$/,
  postalCode: /^[0-9]{5,10}$/
} as const;

// ========================
// API ENDPOINTS
// ========================

export const API_ENDPOINTS = {
  security: {
    settings: '/api/security/settings',
    validate: '/api/security/validate',
    audit: '/api/security/audit',
    events: '/api/security/events',
    sessions: '/api/security/sessions'
  },
  
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    resetPassword: '/api/auth/reset-password',
    changePassword: '/api/auth/change-password'
  },
  
  users: {
    list: '/api/users',
    create: '/api/users',
    update: '/api/users/{id}',
    delete: '/api/users/{id}',
    profile: '/api/users/profile'
  }
} as const;

// ========================
// STORAGE KEYS
// ========================

export const STORAGE_KEYS = {
  settings: 'app:security:settings',
  session: 'app:security:session',
  audit: 'app:security:audit',
  preferences: 'app:security:preferences',
  theme: 'app:ui:theme',
  language: 'app:ui:language'
} as const;

// ========================
// EVENT TYPES
// ========================

export const EVENT_TYPES = {
  security: {
    LOGIN_ATTEMPT: 'login_attempt',
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    LOGOUT: 'logout',
    PASSWORD_CHANGE: 'password_change',
    ACCOUNT_LOCKED: 'account_locked',
    ACCOUNT_UNLOCKED: 'account_unlocked',
    SESSION_EXPIRED: 'session_expired',
    TWO_FACTOR_ENABLED: 'two_factor_enabled',
    TWO_FACTOR_DISABLED: 'two_factor_disabled'
  },
  
  audit: {
    DATA_ACCESS: 'data_access',
    DATA_MODIFICATION: 'data_modification',
    DATA_DELETION: 'data_deletion',
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DELETED: 'user_deleted',
    PERMISSION_CHANGED: 'permission_changed'
  }
} as const;

// ========================
// COMPLIANCE STANDARDS
// ========================

export const COMPLIANCE_STANDARDS = {
  GDPR: {
    name: 'General Data Protection Regulation',
    requiresConsent: true,
    rightToErasure: true,
    dataPortability: true,
    breachNotification: true,
    retentionLimits: true
  },
  
  SOC2: {
    name: 'Service Organization Control 2',
    securityControls: true,
    availabilityControls: true,
    processingIntegrityControls: true,
    confidentialityControls: true,
    privacyControls: true
  },
  
  ISO27001: {
    name: 'Information Security Management',
    riskAssessment: true,
    securityControls: true,
    incidentManagement: true,
    businessContinuity: true,
    complianceMonitoring: true
  }
} as const;

export default {
  DEFAULT_PASSWORD_POLICY,
  DEFAULT_SECURITY_SETTINGS,
  DEFAULT_COMPLIANCE_CONFIG,
  DEFAULT_SECURITY_CONFIG,
  VALIDATION_RULES,
  SECURITY_CONSTANTS,
  UI_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FIELD_LABELS,
  FIELD_DESCRIPTIONS,
  REGEX_PATTERNS,
  API_ENDPOINTS,
  STORAGE_KEYS,
  EVENT_TYPES,
  COMPLIANCE_STANDARDS
};