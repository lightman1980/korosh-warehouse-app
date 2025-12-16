// Main export file for Security Settings Components
// فایل اصلی export برای کامپوننت‌های تنظیمات امنیت

// Note: SecuritySettings component is located in ../Settings/SecuritySettings.tsx
// This file exports types, validation functions, and constants only

// Import types for utility functions
import type { SecuritySettingsData, PasswordPolicy } from './SecurityTypes';
import { DEFAULT_SECURITY_SETTINGS } from './SecurityConstants';
import { validateSecuritySettings } from './SecurityValidation';

// Types and Interfaces
export type {
  PasswordPolicy,
  SecuritySettingsData,
  SecuritySettingsProps,
  ToggleSwitchProps,
  InputFieldProps,
  SecurityCardProps,
  ValidationResult,
  PasswordStrength,
  SecurityEvent,
  AuditLogEntry,
  SessionInfo,
  IPWhitelistEntry,
  TwoFactorConfig,
  TrustedDevice,
  LoginAttempt,
  EncryptionConfig,
  EncryptionKey,
  UserSecurityProfile,
  SecurityQuestion,
  ComplianceConfig,
  ComplianceReport,
  SecurityAlert,
  AlertAction,
  SecurityDashboardData,
  ComplianceStatus,
  ComplianceCheck,
  ApiResponse,
  PaginatedResponse,
  SecuritySettingsForm,
  FormErrors,
  SecuritySettingsState,
  SecuritySettingsActions,
  SecurityConfig,
  SecurityEventHandler,
  AlertHandler,
  ValidationHandler,
  DeepPartial,
  Optional,
  Required
} from './SecurityTypes';

// Validation Functions
export {
  validateIP,
  validatePort,
  validateEmail,
  calculatePasswordStrength,
  validateSecuritySettings,
  validateField,
  validateJsonSchema,
  validateStrongPassword,
  validateRateLimit,
  validateDecryption,
  validateSessionToken,
  VALIDATION_RULES
} from './SecurityValidation';

// Constants and Defaults
export {
  DEFAULT_PASSWORD_POLICY,
  DEFAULT_SECURITY_SETTINGS,
  DEFAULT_COMPLIANCE_CONFIG,
  DEFAULT_SECURITY_CONFIG,
  VALIDATION_RULES as SECURITY_VALIDATION_RULES,
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
} from './SecurityConstants';

// ========================
// Re-exports for convenience (aliased to avoid conflicts)
// ========================

// Type alias for convenience
export type { SecuritySettingsData as SecuritySettingsType } from './SecurityTypes';

// ========================
// Utility Functions
// ========================

/**
 * Creates a complete security settings object with defaults
 */
export const createSecuritySettings = (
  overrides: Partial<SecuritySettingsData> = {}
): SecuritySettingsData => ({
  ...DEFAULT_SECURITY_SETTINGS,
  ...overrides,
  passwordPolicy: {
    ...DEFAULT_SECURITY_SETTINGS.passwordPolicy,
    ...overrides.passwordPolicy
  }
});

/**
 * Validates security settings and returns detailed result
 */
export const validateSecurityConfig = (settings: SecuritySettingsData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} => {
  const validation = validateSecuritySettings({ security: settings });
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Add warnings for security best practices
  if (settings.passwordPolicy.minLength < 12) {
    warnings.push('طول رمز عبور کمتر از 12 کاراکتر است');
    suggestions.push('افزایش طول رمز عبور به حداقل 12 کاراکتر توصیه می‌شود');
  }

  if (settings.passwordPolicy.expireDays === 0) {
    warnings.push('رمز عبور منقضی نمی‌شود');
    suggestions.push('تنظیم تاریخ انقضا برای رمز عبور امنیت را افزایش می‌دهد');
  }

  if (!settings.twoFactorAuth) {
    warnings.push('احراز هویت دو مرحله‌ای غیرفعال است');
    suggestions.push('فعال‌سازی احراز هویت دو مرحله‌ای امنیت را به شدت افزایش می‌دهد');
  }

  if (!settings.encryptionEnabled) {
    warnings.push('رمزنگاری داده‌ها غیرفعال است');
    suggestions.push('فعال‌سازی رمزنگاری برای حفاظت از داده‌های حساس ضروری است');
  }

  if (settings.ipWhitelist.length === 0) {
    warnings.push('لیست IP مجاز خالی است');
    suggestions.push('تعریف IP های مجاز می‌تواند دسترسی را محدود کند');
  }

  return {
    isValid: validation.isValid,
    errors: validation.errors,
    warnings,
    suggestions
  };
};

/**
 * Generates a security score based on settings
 */
export const calculateSecurityScore = (settings: SecuritySettingsData): {
  score: number;
  level: 'ضعیف' | 'متوسط' | 'خوب' | 'قوی' | 'بسیار قوی';
  color: string;
  breakdown: Record<string, number>;
} => {
  let score = 0;
  const breakdown: Record<string, number> = {};

  // Password policy (30 points)
  let passwordScore = 0;
  if (settings.passwordPolicy.minLength >= 12) passwordScore += 10;
  else if (settings.passwordPolicy.minLength >= 8) passwordScore += 5;
  
  const policyRequirements = [
    settings.passwordPolicy.requireUppercase,
    settings.passwordPolicy.requireLowercase,
    settings.passwordPolicy.requireNumbers,
    settings.passwordPolicy.requireSpecialChars
  ].filter(Boolean).length;
  
  passwordScore += policyRequirements * 3;
  
  if (settings.passwordPolicy.expireDays > 0 && settings.passwordPolicy.expireDays <= 90) passwordScore += 5;
  if (settings.passwordPolicy.preventReuse >= 3) passwordScore += 5;
  
  breakdown.passwordPolicy = Math.min(passwordScore, 30);
  score += breakdown.passwordPolicy;

  // Authentication features (25 points)
  let authScore = 0;
  if (settings.twoFactorAuth) authScore += 10;
  if (settings.maxFailedAttempts <= 3) authScore += 5;
  if (settings.loginBlockDuration >= 60) authScore += 5;
  if (settings.sessionTimeoutMinutes <= 60) authScore += 5;
  
  breakdown.authentication = authScore;
  score += authScore;

  // Security features (25 points)
  let securityScore = 0;
  if (settings.encryptionEnabled) securityScore += 10;
  if (settings.auditLogEnabled) securityScore += 8;
  if (settings.sessionHistory) securityScore += 7;
  
  breakdown.securityFeatures = securityScore;
  score += securityScore;

  // IP restrictions (20 points)
  let ipScore = 0;
  if (settings.ipWhitelist.length > 0) {
    ipScore = Math.min(settings.ipWhitelist.length * 2, 20);
  }
  
  breakdown.ipRestrictions = ipScore;
  score += ipScore;

  // Determine level and color
  let level: 'ضعیف' | 'متوسط' | 'خوب' | 'قوی' | 'بسیار قوی' = 'ضعیف';
  let color = 'bg-red-500';

  if (score >= 80) {
    level = 'بسیار قوی';
    color = 'bg-green-600';
  } else if (score >= 65) {
    level = 'قوی';
    color = 'bg-green-500';
  } else if (score >= 50) {
    level = 'خوب';
    color = 'bg-blue-500';
  } else if (score >= 30) {
    level = 'متوسط';
    color = 'bg-yellow-500';
  }

  return { score, level, color, breakdown };
};

/**
 * Sanitizes security settings for safe storage/transmission
 */
export const sanitizeSecuritySettings = (settings: SecuritySettingsData): SecuritySettingsData => {
  return {
    ...settings,
    ipWhitelist: settings.ipWhitelist
      .filter(ip => typeof ip === 'string' && ip.trim().length > 0)
      .map(ip => ip.trim()),
    passwordPolicy: {
      ...settings.passwordPolicy,
      minLength: Math.max(4, Math.min(32, settings.passwordPolicy.minLength)),
      expireDays: Math.max(0, Math.min(365, settings.passwordPolicy.expireDays)),
      preventReuse: Math.max(0, Math.min(20, settings.passwordPolicy.preventReuse))
    },
    maxFailedAttempts: Math.max(1, Math.min(10, settings.maxFailedAttempts)),
    loginBlockDuration: Math.max(5, Math.min(3600, settings.loginBlockDuration)),
    sessionTimeoutMinutes: Math.max(5, Math.min(480, settings.sessionTimeoutMinutes))
  };
};

/**
 * Compares two security settings and returns differences
 */
export const compareSecuritySettings = (
  oldSettings: SecuritySettingsData,
  newSettings: SecuritySettingsData
): {
  changed: boolean;
  differences: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'removed' | 'changed';
  }>;
} => {
  const differences: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'removed' | 'changed';
  }> = [];

  // Compare top-level properties
  const topLevelKeys = Object.keys(DEFAULT_SECURITY_SETTINGS) as (keyof SecuritySettingsData)[];
  
  topLevelKeys.forEach(key => {
    if (key === 'passwordPolicy') return; // Handle separately
    
    const oldValue = oldSettings[key];
    const newValue = newSettings[key];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      differences.push({
        field: key,
        oldValue,
        newValue,
        type: 'changed'
      });
    }
  });

  // Compare password policy
  const oldPolicy = oldSettings.passwordPolicy;
  const newPolicy = newSettings.passwordPolicy;
  
  Object.keys(DEFAULT_SECURITY_SETTINGS.passwordPolicy).forEach(key => {
    const oldVal = oldPolicy[key as keyof PasswordPolicy];
    const newVal = newPolicy[key as keyof PasswordPolicy];
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      differences.push({
        field: `passwordPolicy.${key}`,
        oldValue: oldVal,
        newValue: newVal,
        type: 'changed'
      });
    }
  });

  return {
    changed: differences.length > 0,
    differences
  };
};

// ========================
// Version Info
// ========================

export const VERSION = '2.0.0';
export const VERSION_INFO = {
  version: VERSION,
  codename: 'Modern Professional Edition',
  releaseDate: '2025-12-14',
  features: [
    'TypeScript Support',
    'Real-time Validation',
    'Auto-save Functionality',
    'Modern UI Components',
    'Password Strength Indicator',
    'IP Management',
    'Accessibility Support',
    'Responsive Design',
    'Error Handling',
    'Performance Optimization'
  ]
};

// ========================
// Default Export
// ========================

// Default export with utility functions
const SecuritySettingsModule = {
  // Utility Functions
  createSecuritySettings,
  validateSecurityConfig,
  calculateSecurityScore,
  sanitizeSecuritySettings,
  compareSecuritySettings,
  
  // Version
  VERSION,
  VERSION_INFO
};

export default SecuritySettingsModule;