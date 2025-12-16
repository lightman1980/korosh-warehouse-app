// Type definitions for Security Settings Component
// تمام تعاریف نوع داده برای کامپوننت تنظیمات امنیت

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expireDays: number;
  preventReuse: number;
}

export interface SecuritySettingsData {
  maxFailedAttempts: number;
  loginBlockDuration: number;
  sessionTimeoutMinutes: number;
  passwordPolicy: PasswordPolicy;
  twoFactorAuth: boolean;
  ipWhitelist: string[];
  sessionHistory: boolean;
  encryptionEnabled: boolean;
  auditLogEnabled: boolean;
}

export interface SecuritySettingsProps {
  settings: { security?: SecuritySettingsData };
  setSettings: (settings: { security?: SecuritySettingsData }) => void;
}

// UI Component Types
export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'password';
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export interface SecurityCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface ValidationSchema {
  [field: string]: ValidationRule[];
}

// Password Strength Types
export interface PasswordStrength {
  score: number;
  level: 'ضعیف' | 'متوسط' | 'خوب' | 'قوی' | 'بسیار قوی';
  color: string;
  feedback: string[];
  suggestions: string[];
}

// Security Event Types
export interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'failed_login' | 'password_change' | 'account_locked' | 'session_expired';
  timestamp: Date;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  ipAddress: string;
  details?: Record<string, any>;
}

// Session Management Types
export interface SessionInfo {
  id: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
}

export interface SessionConfig {
  timeoutMinutes: number;
  maxConcurrentSessions: number;
  requireFreshLogin: boolean;
  trackActivity: boolean;
}

// IP Management Types
export interface IPWhitelistEntry {
  id: string;
  ip: string;
  description?: string;
  createdAt: Date;
  isActive: boolean;
  lastUsed?: Date;
}

export interface IPWhitelistConfig {
  enabled: boolean;
  entries: IPWhitelistEntry[];
  defaultAction: 'allow' | 'deny';
  allowEmptyList: boolean;
}

// Authentication Types
export interface TwoFactorConfig {
  enabled: boolean;
  method: 'sms' | 'email' | 'app' | 'hardware';
  backupCodes: string[];
  trustedDevices: TrustedDevice[];
}

export interface TrustedDevice {
  id: string;
  deviceName: string;
  deviceFingerprint: string;
  lastUsed: Date;
  isActive: boolean;
}

export interface LoginAttempt {
  id: string;
  userId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}

// Encryption Types
export interface EncryptionConfig {
  algorithm: 'AES-256' | 'AES-128' | 'RSA-2048';
  keyRotationDays: number;
  encryptSensitiveData: boolean;
  encryptAtRest: boolean;
  encryptInTransit: boolean;
}

export interface EncryptionKey {
  id: string;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  fingerprint: string;
}

// User Management Types
export interface UserSecurityProfile {
  userId: string;
  lastPasswordChange: Date;
  passwordExpiresAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  twoFactorEnabled: boolean;
  trustedDevices: TrustedDevice[];
  securityQuestions: SecurityQuestion[];
  loginHistory: LoginAttempt[];
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answer: string; // این باید encrypted باشد
  isActive: boolean;
}

// Compliance Types
export interface ComplianceConfig {
  gdprEnabled: boolean;
  dataRetentionDays: number;
  auditLogRetentionDays: number;
  requireConsent: boolean;
  anonymizeData: boolean;
  dataExportEnabled: boolean;
  rightToBeForgotten: boolean;
}

export interface ComplianceReport {
  id: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  userCount: number;
  dataProcessed: number;
  consentRate: number;
  deletionRequests: number;
}

// Alert Types
export interface SecurityAlert {
  id: string;
  type: 'failed_login' | 'unusual_activity' | 'password_expired' | 'account_locked';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  isRead: boolean;
  isResolved: boolean;
  actions: AlertAction[];
}

export interface AlertAction {
  id: string;
  type: 'notify_user' | 'lock_account' | 'reset_password' | 'review_activity';
  performedAt?: Date;
  performedBy?: string;
  result?: string;
}

// Dashboard Types
export interface SecurityDashboardData {
  activeSessions: number;
  failedLoginsToday: number;
  lockedAccounts: number;
  securityAlerts: SecurityAlert[];
  recentEvents: SecurityEvent[];
  complianceStatus: ComplianceStatus;
  riskScore: number;
}

export interface ComplianceStatus {
  overall: 'compliant' | 'non-compliant' | 'warning';
  checks: ComplianceCheck[];
}

export interface ComplianceCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  lastChecked: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: Date;
  requestId: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form Types
export interface SecuritySettingsForm {
  basic: {
    maxFailedAttempts: number;
    loginBlockDuration: number;
    sessionTimeoutMinutes: number;
  };
  password: PasswordPolicy;
  features: {
    twoFactorAuth: boolean;
    sessionHistory: boolean;
    encryptionEnabled: boolean;
    auditLogEnabled: boolean;
  };
  ipWhitelist: string[];
}

export interface FormErrors {
  [field: string]: string[];
}

// State Management Types
export interface SecuritySettingsState {
  settings: SecuritySettingsData;
  loading: boolean;
  saving: boolean;
  errors: FormErrors;
  lastSaved?: Date;
  validationErrors: ValidationResult[];
}

export interface SecuritySettingsActions {
  updateSettings: (updates: Partial<SecuritySettingsData>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  validateSettings: () => ValidationResult;
  addIP: (ip: string) => void;
  removeIP: (index: number) => void;
  updatePasswordPolicy: (policy: Partial<PasswordPolicy>) => void;
}

// Configuration Types
export interface SecurityConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    twoFactorAuth: boolean;
    ipWhitelisting: boolean;
    auditLogging: boolean;
    encryption: boolean;
    sessionManagement: boolean;
  };
  limits: {
    maxLoginAttempts: number;
    sessionTimeoutHours: number;
    passwordHistoryCount: number;
    ipWhitelistSize: number;
  };
  compliance: ComplianceConfig;
}

// Event Handler Types
export type SecurityEventHandler = (event: SecurityEvent) => void;
export type AlertHandler = (alert: SecurityAlert) => void;
export type ValidationHandler = (field: string, value: any) => ValidationResult;

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Constants
export const SECURITY_FIELD_NAMES = {
  maxFailedAttempts: 'حداکثر تلاش‌های ناموفق',
  loginBlockDuration: 'مدت زمان مسدودی',
  sessionTimeoutMinutes: 'مدت زمان نشست',
  minLength: 'حداقل طول رمز عبور',
  expireDays: 'تاریخ انقضا',
  preventReuse: 'پیشگیری از استفاده مجدد',
  twoFactorAuth: 'احراز هویت دو مرحله‌ای',
  encryptionEnabled: 'رمزنگاری داده‌ها',
  auditLogEnabled: 'ثبت وقایع امنیتی',
  sessionHistory: 'تاریخچه نشست‌ها',
  requireUppercase: 'نیاز به حروف بزرگ',
  requireLowercase: 'نیاز به حروف کوچک',
  requireNumbers: 'نیاز به اعداد',
  requireSpecialChars: 'نیاز به کاراکترهای خاص'
} as const;

export const DEFAULT_SECURITY_SETTINGS: SecuritySettingsData = {
  maxFailedAttempts: 3,
  loginBlockDuration: 10,
  sessionTimeoutMinutes: 60,
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expireDays: 90,
    preventReuse: 5
  },
  twoFactorAuth: false,
  ipWhitelist: [],
  sessionHistory: true,
  encryptionEnabled: true,
  auditLogEnabled: true
};

export default {
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
  UserSecurityProfile,
  SecurityAlert,
  SecurityDashboardData,
  ApiResponse,
  PaginatedResponse,
  SecuritySettingsForm,
  FormErrors,
  SecuritySettingsState,
  SecuritySettingsActions,
  SecurityConfig,
  SECURITY_FIELD_NAMES,
  DEFAULT_SECURITY_SETTINGS
};