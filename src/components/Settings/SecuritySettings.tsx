import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  Globe, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Copy,
  Save,
  RotateCcw,
  Clock,
  UserX,
  Eye,
  EyeOff,
  Activity,
  Fingerprint,
  Ban,
  Terminal,
  Zap,
  Wifi,
  WifiOff,
  Database,
  FileText,
  RefreshCw,
  LockOpen,
  Smartphone,
  Monitor,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

// Secure random number generator
const secureRandom = (): number => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
};

// Generate secure token
const generateSecureToken = (length: number = 32): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (byte) => charset[byte % charset.length]).join('');
};

// Simple encryption simulation (for demo purposes)
const encryptData = (data: string): string => {
  const encoded = btoa(data);
  return encoded.split('').reverse().join('');
};

// Simple decryption simulation
const decryptData = (encrypted: string): string => {
  const reversed = encrypted.split('').reverse().join('');
  return atob(reversed);
};

// IP validation with security checks
const validateIP = (ip: string): { valid: boolean; sanitized: string; risk: 'low' | 'medium' | 'high' } => {
  const sanitized = ip.trim().replace(/[<>\"\'\\]/g, '');
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const privateIPRegex = /^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/;
  const localhostRegex = /^(?:127\.|localhost)$/;

  if (!ipv4Regex.test(sanitized)) {
    return { valid: false, sanitized, risk: 'high' };
  }

  if (localhostRegex.test(sanitized)) {
    return { valid: true, sanitized, risk: 'low' };
  }

  if (privateIPRegex.test(sanitized)) {
    return { valid: true, sanitized, risk: 'low' };
  }

  return { valid: true, sanitized, risk: 'medium' };
};

// Sanitize string to prevent XSS
const sanitizeString = (input: string, maxLength: number = 255): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"\'\\]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/<script/gi, '')
    .replace(/<\/script/gi, '');
};

// Deep clone with security checks
const secureClone = <T extends object>(obj: T): T => {
  try {
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          throw new Error('Circular reference detected');
        }
        seen.add(value);
      }
      return value;
    }));
  } catch {
    throw new Error('Invalid object structure');
  }
};

// Types
interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expireDays: number;
  preventReuse: number;
  requireMFA: boolean;
  maxPasswordAge: number;
  lockoutThreshold: number;
  lockoutDuration: number;
}

interface SecuritySettings {
  maxFailedAttempts: number;
  loginBlockDuration: number;
  sessionTimeoutMinutes: number;
  twoFactorAuth: boolean;
  sessionHistory: boolean;
  sessionRotation: boolean;
  encryptionEnabled: boolean;
  auditLogEnabled: boolean;
  intrusionDetectionEnabled: boolean;
  rateLimitingEnabled: boolean;
  passwordPolicy: PasswordPolicy;
  ipWhitelist: string[];
  securityVersion: string;
  lastSecurityUpdate: string;
  checksum: string;
}

interface SecurityEvent {
  id: string;
  type: 'attempt' | 'success' | 'failure' | 'warning' | 'critical' | 'info';
  timestamp: Date;
  source: string;
  details: string;
  severity: 1 | 2 | 3 | 4 | 5;
}

interface Session {
  id: string;
  device: string;
  location: string;
  lastActivity: Date;
  ip: string;
  status: 'active' | 'expired' | 'suspended';
}

interface IntrusionAttempt {
  id: string;
  timestamp: Date;
  ip: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'blocked' | 'logged' | 'investigating';
}

// ============================================================================
// SECURITY SERVICES
// ============================================================================

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private sessions: Session[] = [];
  private intrusionAttempts: IntrusionAttempt[] = [];
  private maxEvents: number = 500;
  private suspiciousActivityCount: number = 0;
  private lastActivityTime: number = Date.now();
  private readonly SUSPICIOUS_THRESHOLD = 5;
  private readonly TIME_WINDOW = 60000;
  private attackPatterns: RegExp[] = [
    /('|"|;|--|\/\*|\*\/|@@|@'|char|nchar|varchar|nvarchar|exec|execute)/i,
    /(\bselect\b|\binsert\b|\bdelete\b|\bupdate\b|\bdrop\b|\bcreate\b)/i,
    /(<script|javascript:|vbscript:|onload=|onerror=)/i,
    /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,
    /(\0|%00)/i,
  ];

  constructor() {
    this.cleanupOldEvents();
    this.initializeDemoSessions();
  }

  private initializeDemoSessions(): void {
    this.sessions = [
      {
        id: generateSecureToken(16),
        device: 'Chrome on Windows',
        location: 'Tehran, Iran',
        lastActivity: new Date(),
        ip: '192.168.1.100',
        status: 'active'
      },
      {
        id: generateSecureToken(16),
        device: 'Safari on iPhone',
        location: 'Tehran, Iran',
        lastActivity: new Date(Date.now() - 3600000),
        ip: '192.168.1.101',
        status: 'active'
      }
    ];
  }

  private cleanupOldEvents(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.events = this.events.filter(e => e.timestamp.getTime() > oneHourAgo);
  }

  detectAttackPattern(input: string): boolean {
    return this.attackPatterns.some(pattern => pattern.test(input));
  }

  logEvent(type: SecurityEvent['type'], source: string, details: string, severity: SecurityEvent['severity']): void {
    const event: SecurityEvent = {
      id: generateSecureToken(16),
      type,
      timestamp: new Date(),
      source: sanitizeString(source, 100),
      details: sanitizeString(details, 500),
      severity
    };

    this.events.unshift(event);
    this.events = this.events.slice(0, this.maxEvents);
    this.cleanupOldEvents();

    if (type === 'failure' || type === 'warning') {
      this.suspiciousActivityCount++;
    }

    if (Date.now() - this.lastActivityTime > this.TIME_WINDOW) {
      this.suspiciousActivityCount = 0;
      this.lastActivityTime = Date.now();
    }
  }

  addSession(session: Session): void {
    this.sessions.push(session);
    this.logEvent('success', 'session', `نشست جدید فعال: ${session.device}`, 1);
  }

  terminateSession(sessionId: string): boolean {
    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      const session = this.sessions[index];
      this.sessions.splice(index, 1);
      this.logEvent('info', 'session', `نشست پایان یافت: ${session.device}`, 2);
      return true;
    }
    return false;
  }

  getSessions(): Session[] {
    return this.sessions;
  }

  logIntrusionAttempt(ip: string, type: string, severity: IntrusionAttempt['severity']): void {
    const attempt: IntrusionAttempt = {
      id: generateSecureToken(16),
      timestamp: new Date(),
      ip,
      type,
      severity,
      status: 'blocked'
    };

    this.intrusionAttempts.unshift(attempt);
    this.intrusionAttempts = this.intrusionAttempts.slice(0, 100);
    this.logEvent('critical', 'intrusion', `تلاش نفوذ از ${ip}: ${type}`, 5);
  }

  getRecentEvents(count: number = 10): SecurityEvent[] {
    return this.events.slice(0, count);
  }

  getIntrusionAttempts(count: number = 10): IntrusionAttempt[] {
    return this.intrusionAttempts.slice(0, count);
  }

  isUnderAttack(): boolean {
    return this.suspiciousActivityCount >= this.SUSPICIOUS_THRESHOLD;
  }

  getSecurityLevel(): 'normal' | 'elevated' | 'critical' {
    if (this.suspiciousActivityCount >= this.SUSPICIOUS_THRESHOLD * 2) {
      return 'critical';
    }
    if (this.suspiciousActivityCount >= this.SUSPICIOUS_THRESHOLD) {
      return 'elevated';
    }
    return 'normal';
  }

  getThreatCount(): number {
    return this.intrusionAttempts.filter(a => a.severity === 'high' || a.severity === 'critical').length;
  }

  clearEvents(): void {
    this.events = [];
    this.intrusionAttempts = [];
  }

  getStats(): { totalEvents: number; blockedAttacks: number; activeSessions: number; threats: number } {
    return {
      totalEvents: this.events.length,
      blockedAttacks: this.intrusionAttempts.filter(a => a.status === 'blocked').length,
      activeSessions: this.sessions.filter(s => s.status === 'active').length,
      threats: this.getThreatCount()
    };
  }
}

const securityMonitor = new SecurityMonitor();

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const validateSecuritySettings = (settings: SecuritySettings): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (settings.maxFailedAttempts < 1 || settings.maxFailedAttempts > 10) {
    errors.push('حداکثر تلاش‌های ناموفق باید بین 1 تا 10 باشد');
  }
  
  if (settings.loginBlockDuration < 5 || settings.loginBlockDuration > 3600) {
    errors.push('مدت زمان مسدودی باید بین 5 تا 3600 ثانیه باشد');
  }
  
  if (settings.sessionTimeoutMinutes < 1 || settings.sessionTimeoutMinutes > 480) {
    errors.push('مدت زمان نشست باید بین 1 تا 480 دقیقه باشد');
  }
  
  if (settings.passwordPolicy.minLength < 8 || settings.passwordPolicy.minLength > 32) {
    errors.push('حداقل طول رمز عبور باید بین 8 تا 32 کاراکتر باشد');
  }
  
  if (settings.passwordPolicy.expireDays < 0 || settings.passwordPolicy.expireDays > 365) {
    errors.push('تاریخ انقضا باید بین 0 تا 365 روز باشد');
  }
  
  if (settings.passwordPolicy.preventReuse < 0 || settings.passwordPolicy.preventReuse > 20) {
    errors.push('پیشگیری از استفاده مجدد باید بین 0 تا 20 باشد');
  }

  for (const ip of settings.ipWhitelist) {
    const validation = validateIP(ip);
    if (!validation.valid) {
      errors.push(`آدرس IP نامعتبر: ${ip}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const calculateChecksum = (settings: SecuritySettings): string => {
  const clone = secureClone(settings);
  delete clone.checksum;
  delete clone.securityVersion;
  delete clone.lastSecurityUpdate;
  
  const data = JSON.stringify(clone);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

const DEFAULT_SETTINGS: SecuritySettings = {
  maxFailedAttempts: 3,
  loginBlockDuration: 300,
  sessionTimeoutMinutes: 30,
  twoFactorAuth: false,
  sessionHistory: true,
  sessionRotation: true,
  encryptionEnabled: true,
  auditLogEnabled: true,
  intrusionDetectionEnabled: true,
  rateLimitingEnabled: true,
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expireDays: 90,
    preventReuse: 12,
    requireMFA: false,
    maxPasswordAge: 365,
    lockoutThreshold: 5,
    lockoutDuration: 1800
  },
  ipWhitelist: [],
  securityVersion: '2.0.0',
  lastSecurityUpdate: new Date().toISOString(),
  checksum: ''
};

DEFAULT_SETTINGS.checksum = calculateChecksum(DEFAULT_SETTINGS);

// ============================================================================
// UI COMPONENTS
// ============================================================================

const ModernCard: React.FC<{ 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  className?: string;
  securityLevel?: 'normal' | 'elevated' | 'critical';
  badge?: { text: string; type: 'success' | 'warning' | 'danger' | 'info' };
}> = ({ title, description, icon, children, className = '', securityLevel, badge }) => {
  const borderColor = securityLevel === 'critical' ? 'border-red-300' 
    : securityLevel === 'elevated' ? 'border-yellow-300' 
    : 'border-gray-200';
  
  const glowClass = securityLevel === 'critical' ? 'shadow-red-500/20' 
    : securityLevel === 'elevated' ? 'shadow-yellow-500/20' 
    : '';

  const badgeColors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className={`bg-white rounded-2xl border-2 ${borderColor} shadow-sm hover:shadow-lg transition-all duration-300 ${glowClass} ${className}`}>
      <div className="p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl">
              {icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
            </div>
          </div>
          {badge && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColors[badge.type]}`}>
              {badge.text}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

const ModernToggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  securityCritical?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
}> = ({ checked, onChange, label, description, disabled = false, securityCritical = false, onActivate, onDeactivate }) => {
  const handleChange = (newChecked: boolean) => {
    if (!disabled) {
      onChange(newChecked);
      if (newChecked && onActivate) {
        onActivate();
      } else if (!newChecked && onDeactivate) {
        onDeactivate();
      }
    }
  };

  return (
    <div className={`flex items-center justify-between py-4 ${securityCritical ? 'bg-red-50 -mx-4 px-4 rounded-lg' : ''}`}>
      <div className="flex-1">
        <label className={`text-sm font-semibold ${securityCritical ? 'text-red-800' : 'text-gray-900'}`}>
          {securityCritical && <Fingerprint className="inline h-4 w-4 mr-1" />}
          {label}
        </label>
        {description && (
          <p className={`text-xs mt-1 leading-relaxed ${securityCritical ? 'text-red-600' : 'text-gray-500'}`}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => handleChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked 
            ? securityCritical 
              ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg' 
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg' 
            : 'bg-gray-200 hover:bg-gray-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg 
            transition duration-300 ease-in-out flex items-center justify-center
            ${checked ? 'translate-x-6' : 'translate-x-0'}
          `}
        >
          {checked ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-gray-400" />
          )}
        </span>
      </button>
    </div>
  );
};

const ModernInput: React.FC<{
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number' | 'password' | 'email';
  min?: number;
  max?: number;
  placeholder?: string;
  description?: string;
  error?: string;
  suffix?: string;
  securityMode?: boolean;
  masked?: boolean;
  onBlur?: () => void;
}> = ({ label, value, onChange, type = 'text', min, max, placeholder, description, error, suffix, securityMode = false, masked = false, onBlur }) => {
  const [showValue, setShowValue] = useState(!masked);

  return (
    <div className={`space-y-2 ${securityMode ? 'bg-gray-50 -mx-4 px-4 py-3 rounded-lg' : ''}`}>
      <label className="block text-sm font-semibold text-gray-900">{label}</label>
      <div className="relative">
        <input
          type={type === 'password' && showValue ? 'text' : type}
          value={value}
          onChange={(e) => {
            const inputValue = type === 'number' 
              ? Math.max(min || 0, Math.min(max || Infinity, parseInt(e.target.value) || 0))
              : sanitizeString(e.target.value);
            onChange(inputValue);
          }}
          onBlur={onBlur}
          min={min}
          max={max}
          placeholder={placeholder}
          className={`
            block w-full px-4 py-3 border rounded-xl shadow-sm placeholder-gray-400 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200
            ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white focus:bg-white'}
            ${suffix ? 'pr-12' : ''}
            ${securityMode ? 'font-mono text-sm' : ''}
          `}
          autoComplete="off"
          spellCheck={false}
        />
        {masked && (
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
          >
            {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {suffix && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm text-gray-500">
            {suffix}
          </span>
        )}
      </div>
      {description && !error && (
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};

const SecurityAlert: React.FC<{ 
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action?: React.ReactNode;
  onClose?: () => void;
}> = ({ type, title, message, action, onClose }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  };

  const icons = {
    info: <Activity className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    error: <Ban className="h-5 w-5" />,
    success: <Check className="h-5 w-5" />
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${styles[type]} ${onClose ? 'pr-10' : ''}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm mt-1">{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="absolute top-2 left-2 p-1 hover:bg-black/5 rounded">
          <span className="sr-only">بستن</span>
          ✕
        </button>
      )}
    </div>
  );
};

const SuccessToast: React.FC<{ show: boolean; message: string }> = ({ show, message }) => {
  if (!show) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
      <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg">
        <Check className="h-5 w-5" />
        <span className="font-semibold">{message}</span>
      </div>
    </div>
  );
};

// Password Strength Meter Component
const PasswordStrengthMeter: React.FC<{ 
  password: string; 
  policy: PasswordPolicy;
}> = ({ password, policy }) => {
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    let score = 0;
    
    if (password.length >= policy.minLength) score += 20;
    if (policy.requireUppercase && /[A-Z]/.test(password)) score += 15;
    if (policy.requireLowercase && /[a-z]/.test(password)) score += 15;
    if (policy.requireNumbers && /[0-9]/.test(password)) score += 15;
    if (policy.requireSpecialChars && /[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    if (password.length >= policy.minLength + 4) score += 10;
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) score -= 10;
    
    setStrength(Math.max(0, Math.min(100, score)));
  }, [password, policy]);

  const getStrengthColor = () => {
    if (strength < 30) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    if (strength < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength < 30) return 'بسیار ضعیف';
    if (strength < 60) return 'ضعیف';
    if (strength < 80) return 'متوسط';
    return 'قوی';
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">قدرت رمز عبور</span>
        <span className={`text-sm font-semibold ${
          strength < 30 ? 'text-red-600' 
          : strength < 60 ? 'text-yellow-600' 
          : strength < 80 ? 'text-blue-600' 
          : 'text-green-600'
        }`}>
          {getStrengthLabel()}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${getStrengthColor()}`}
          style={{ width: `${strength}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {[
          { met: password.length >= policy.minLength, text: `حداقل ${policy.minLength} کاراکتر` },
          { met: policy.requireUppercase && /[A-Z]/.test(password), text: 'حرف بزرگ' },
          { met: policy.requireLowercase && /[a-z]/.test(password), text: 'حرف کوچک' },
          { met: policy.requireNumbers && /[0-9]/.test(password), text: 'عدد' },
          { met: policy.requireSpecialChars && /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'کاراکتر خاص' },
          { met: !password.includes(' ') && password.length > 0, text: 'بدون فاصله' },
        ].map((item, index) => (
          <div key={index} className={`flex items-center gap-1 ${item.met ? 'text-green-600' : 'text-gray-400'}`}>
            {item.met ? <Check className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-gray-400" />}
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Session List Component
const SessionList: React.FC<{ 
  sessions: Session[];
  onTerminate: (id: string) => void;
  onRefresh: () => void;
}> = ({ sessions, onTerminate, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);

  const displaySessions = expanded ? sessions : sessions.slice(0, 2);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-gray-900">نشست‌های فعال ({sessions.length})</h5>
        <button
          onClick={onRefresh}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="به‌روزرسانی"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      
      {sessions.length > 0 ? (
        <>
          <div className="space-y-2">
            {displaySessions.map((session) => (
              <div key={session.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`p-2 rounded-lg ${
                  session.status === 'active' ? 'bg-green-100' : 'bg-gray-200'
                }`}>
                  {session.status === 'active' ? (
                    <Monitor className="h-4 w-4 text-green-600" />
                  ) : (
                    <Monitor className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{session.device}</p>
                  <p className="text-xs text-gray-500">{session.location} • {session.ip}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    session.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {session.status === 'active' ? 'فعال' : 'منقضی'}
                  </span>
                  <button
                    onClick={() => onTerminate(session.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="پایان نشست"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {sessions.length > 2 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              {expanded ? (
                <>مشاهده کمتر <ChevronUp className="h-4 w-4" /></>
              ) : (
                <>مشاهده همه ({sessions.length}) <ChevronDown className="h-4 w-4" /></>
              )}
            </button>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">هیچ نشست فعالی وجود ندارد</p>
      )}
    </div>
  );
};

// Intrusion Attempts Component
const IntrusionAttemptsList: React.FC<{ 
  attempts: IntrusionAttempt[];
}> = ({ attempts }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'blocked': return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'investigating': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Shield className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-2">
      {attempts.length > 0 ? (
        attempts.map((attempt) => (
          <div 
            key={attempt.id} 
            className={`flex items-center gap-3 p-3 rounded-xl border ${getSeverityColor(attempt.severity)}`}
          >
            {getStatusIcon(attempt.status)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{attempt.type}</p>
              <p className="text-xs opacity-75">{attempt.ip} • {attempt.timestamp.toLocaleTimeString()}</p>
            </div>
            <span className="text-xs font-medium capitalize">{attempt.severity}</span>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <ShieldCheck className="h-12 w-12 mx-auto text-green-400 mb-3" />
          <p className="text-sm text-gray-600">هیچ تلاش نفوذی شناسایی نشده</p>
          <p className="text-xs text-gray-400">سیستم در وضعیت امن قرار دارد</p>
        </div>
      )}
    </div>
  );
};

// Security Stats Component
const SecurityStats: React.FC<{ stats: ReturnType<typeof securityMonitor.getStats> }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-5 w-5 text-blue-600" />
        <span className="text-xs text-blue-600 font-medium">رویدادها</span>
      </div>
      <p className="text-2xl font-bold text-blue-800">{stats.totalEvents}</p>
    </div>
    
    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-5 w-5 text-green-600" />
        <span className="text-xs text-green-600 font-medium">مسدود شده</span>
      </div>
      <p className="text-2xl font-bold text-green-800">{stats.blockedAttacks}</p>
    </div>
    
    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
      <div className="flex items-center gap-2 mb-2">
        <Monitor className="h-5 w-5 text-purple-600" />
        <span className="text-xs text-purple-600 font-medium">نشست‌ها</span>
      </div>
      <p className="text-2xl font-bold text-purple-800">{stats.activeSessions}</p>
    </div>
    
    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <span className="text-xs text-red-600 font-medium">تهدیدات</span>
      </div>
      <p className="text-2xl font-bold text-red-800">{stats.threats}</p>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SecuritySettings: React.FC = () => {
  const [settings, setSettings] = useState<SecuritySettings>(() => {
    try {
      const saved = localStorage.getItem('securitySettings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        const savedChecksum = parsedSettings.checksum;
        delete parsedSettings.checksum;
        const calculatedChecksum = calculateChecksum(parsedSettings);
        
        if (savedChecksum === calculatedChecksum) {
          parsedSettings.checksum = savedChecksum;
          securityMonitor.logEvent('success', 'system', 'تنظیمات امنیتی با موفقیت بارگذاری شد', 1);
          return { ...DEFAULT_SETTINGS, ...parsedSettings };
        } else {
          securityMonitor.logEvent('warning', 'system', 'عدم تطابق checksum تنظیمات - بارگذاری پیش‌فرض', 2);
          return DEFAULT_SETTINGS;
        }
      }
    } catch (error) {
      securityMonitor.logEvent('error', 'system', 'خطا در بارگذاری تنظیمات', 3);
    }
    return DEFAULT_SETTINGS;
  });

  const [newIP, setNewIP] = useState('');
  const [ipErrors, setIpErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPasswordPolicy, setShowPasswordPolicy] = useState(true);
  const [showIPList, setShowIPList] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [securityLevel, setSecurityLevel] = useState<'normal' | 'elevated' | 'critical'>('normal');
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [intrusionAttempts, setIntrusionAttempts] = useState<IntrusionAttempt[]>([]);
  const [showSecurityDashboard, setShowSecurityDashboard] = useState(false);
  const [testPassword, setTestPassword] = useState('');
  const [securityStats, setSecurityStats] = useState(securityMonitor.getStats());
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>('auth');

  // Simulate periodic security updates
  useEffect(() => {
    const interval = setInterval(() => {
      const level = securityMonitor.getSecurityLevel();
      setSecurityLevel(level);
      setRecentEvents(securityMonitor.getRecentEvents(5));
      setIntrusionAttempts(securityMonitor.getIntrusionAttempts(5));
      setSecurityStats(securityMonitor.getStats());
    }, 3000);

    // Initial check
    setSecurityLevel(securityMonitor.getSecurityLevel());
    setRecentEvents(securityMonitor.getRecentEvents(5));
    setIntrusionAttempts(securityMonitor.getIntrusionAttempts(5));
    setSecurityStats(securityMonitor.getStats());

    // Generate demo intrusion attempts occasionally
    const demoInterval = setInterval(() => {
      if (settings.intrusionDetectionEnabled && Math.random() > 0.7) {
        const demoIPs = ['45.33.32.156', '192.168.1.234', '10.0.0.123', '203.0.113.42'];
        const demoTypes = [
          { type: 'SQL Injection Attempt', severity: 'high' as const },
          { type: 'Brute Force Attack', severity: 'medium' as const },
          { type: 'XSS Attack Detected', severity: 'medium' as const },
          { type: 'Suspicious Path Traversal', severity: 'high' as const },
          { type: 'Port Scan Detected', severity: 'low' as const },
        ];
        const randomDemo = demoTypes[Math.floor(Math.random() * demoTypes.length)];
        securityMonitor.logIntrusionAttempt(
          demoIPs[Math.floor(Math.random() * demoIPs.length)],
          randomDemo.type,
          randomDemo.severity
        );
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      clearInterval(demoInterval);
    };
  }, [settings.intrusionDetectionEnabled]);

  // Track unsaved changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem('securitySettings');
      const savedSettings = saved ? JSON.parse(saved) : null;
      const currentChecksum = calculateChecksum(settings);
      const savedChecksum = savedSettings?.checksum || '';
      
      setHasUnsavedChanges(currentChecksum !== savedChecksum);
    } catch {
      setHasUnsavedChanges(true);
    }
  }, [settings]);

  // Generate TOTP secret when 2FA is enabled
  useEffect(() => {
    if (settings.twoFactorAuth && !totpSecret) {
      setTotpSecret(generateSecureToken(16).toUpperCase());
    }
  }, [settings.twoFactorAuth, totpSecret]);

  const updateSettings = useCallback((updates: Partial<SecuritySettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      securityMonitor.logEvent('success', 'settings', 'تنظیمات امنیتی به‌روزرسانی شد', 1);
      return newSettings;
    });
    setValidationErrors([]);
  }, []);

  const updatePasswordPolicy = useCallback((updates: Partial<PasswordPolicy>) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        passwordPolicy: { ...prev.passwordPolicy, ...updates }
      };
      securityMonitor.logEvent('success', 'password', 'سیاست رمز عبور به‌روزرسانی شد', 1);
      return newSettings;
    });
    setValidationErrors([]);
  }, []);

  const addIP = useCallback(() => {
    if (!newIP.trim()) {
      setIpErrors(['آدرس IP نمی‌تواند خالی باشد']);
      securityMonitor.logEvent('warning', 'ip', 'تلاش برای افزودن IP خالی', 2);
      return;
    }

    const validation = validateIP(newIP);
    
    if (!validation.valid) {
      setIpErrors(['آدرس IP معتبر نیست']);
      securityMonitor.logEvent('warning', 'ip', `آدرس IP نامعتبر: ${newIP}`, 2);
      return;
    }

    if (settings.ipWhitelist.includes(validation.sanitized)) {
      setIpErrors(['این آدرس IP قبلاً اضافه شده است']);
      securityMonitor.logEvent('warning', 'ip', `تلاش برای افزودن IP تکراری: ${validation.sanitized}`, 2);
      return;
    }

    setSettings(prev => ({
      ...prev,
      ipWhitelist: [...prev.ipWhitelist, validation.sanitized]
    }));
    setNewIP('');
    setIpErrors([]);
    securityMonitor.logEvent('success', 'ip', `آدرس IP اضافه شد: ${validation.sanitized}`, 1);
    setSuccessMessage(`آدرس IP ${validation.sanitized} با موفقیت اضافه شد`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }, [newIP, settings.ipWhitelist]);

  const removeIP = useCallback((index: number) => {
    const ip = settings.ipWhitelist[index];
    setSettings(prev => {
      const newIPList = prev.ipWhitelist.filter((_, i) => i !== index);
      securityMonitor.logEvent('warning', 'ip', `آدرس IP حذف شد: ${ip}`, 2);
      return {
        ...prev,
        ipWhitelist: newIPList
      };
    });
  }, [settings.ipWhitelist]);

  const copyIPs = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(settings.ipWhitelist.join('\n'));
      setSuccessMessage('لیست IP در حافظه کپی شد');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      securityMonitor.logEvent('success', 'clipboard', 'لیست IP در حافظه کپی شد', 1);
    } catch {
      securityMonitor.logEvent('error', 'clipboard', 'خطا در کپی لیست IP', 3);
    }
  }, [settings.ipWhitelist]);

  const handleSave = useCallback(async () => {
    const validation = validateSecuritySettings(settings);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      securityMonitor.logEvent('error', 'validation', `خطای اعتبارسنجی: ${validation.errors.join(', ')}`, 3);
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const settingsToSave = { ...settings };
      const newChecksum = calculateChecksum(settingsToSave);
      settingsToSave.checksum = newChecksum;
      settingsToSave.lastSecurityUpdate = new Date().toISOString();

      try {
        localStorage.setItem('securitySettings', JSON.stringify(settingsToSave));
        securityMonitor.logEvent('success', 'storage', 'تنظیمات با موفقیت ذخیره شد', 1);
      } catch (storageError) {
        securityMonitor.logEvent('error', 'storage', 'خطا در ذخیره‌سازی تنظیمات', 3);
      }
      
      setSuccessMessage('تنظیمات امنیتی با موفقیت ذخیره شد');
      setShowSuccess(true);
      setValidationErrors([]);
      setHasUnsavedChanges(false);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      securityMonitor.logEvent('error', 'save', 'خطا در ذخیره تنظیمات', 3);
      setValidationErrors(['خطا در ذخیره تنظیمات. لطفاً مجدداً تلاش کنید.']);
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  const resetToDefaults = useCallback(() => {
    securityMonitor.logEvent('warning', 'system', 'بازنشانی به تنظیمات پیش‌فرض', 2);
    
    setSettings(DEFAULT_SETTINGS);
    setValidationErrors([]);
    setHasUnsavedChanges(true);
    
    try {
      localStorage.removeItem('securitySettings');
    } catch {
      securityMonitor.logEvent('error', 'storage', 'خطا در پاک کردن localStorage', 3);
    }
    
    setSuccessMessage('تنظیمات به مقادیر پیش‌فرض بازنشانی شد');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  }, []);

  const handle2FAEnable = useCallback(() => {
    setShow2FASetup(true);
    setTotpSecret(generateSecureToken(16).toUpperCase());
    securityMonitor.logEvent('success', '2fa', 'فرآیند راه‌اندازی 2FA آغاز شد', 1);
  }, []);

  const handleSessionTerminate = useCallback((sessionId: string) => {
    if (securityMonitor.terminateSession(sessionId)) {
      setSuccessMessage('نشست با موفقیت پایان یافت');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  }, []);

  const calculateSecurityScore = useMemo(() => {
    let score = 0;
    const maxScore = 100;

    // Authentication features (30 points)
    if (settings.twoFactorAuth) score += 10;
    if (settings.sessionRotation) score += 5;
    if (settings.sessionHistory) score += 5;
    if (settings.maxFailedAttempts <= 3) score += 5;
    if (settings.loginBlockDuration >= 300) score += 5;

    // Security features (30 points)
    if (settings.encryptionEnabled) score += 10;
    if (settings.intrusionDetectionEnabled) score += 10;
    if (settings.rateLimitingEnabled) score += 5;
    if (settings.auditLogEnabled) score += 5;

    // Password policy (25 points)
    if (settings.passwordPolicy.minLength >= 12) score += 10;
    if (settings.passwordPolicy.requireSpecialChars) score += 5;
    if (settings.passwordPolicy.requireMFA) score += 5;
    if (settings.passwordPolicy.preventReuse >= 10) score += 5;

    // IP whitelist (15 points)
    if (settings.ipWhitelist.length > 0) score += 10;
    if (settings.ipWhitelist.length >= 3) score += 5;

    return Math.min(score, maxScore);
  }, [settings]);

  const getScoreColor = (score: number) => {
    if (score < 40) return 'text-red-600';
    if (score < 70) return 'text-yellow-600';
    if (score < 90) return 'text-blue-600';
    return 'text-green-600';
  };

  const getScoreLabel = (score: number) => {
    if (score < 40) return 'ضعیف';
    if (score < 70) return 'متوسط';
    if (score < 90) return 'خوب';
    return 'عالی';
  };

  // Security Dashboard Component
  const SecurityDashboard = () => (
    <div className="bg-gray-900 text-white p-6 rounded-xl mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Terminal className="h-5 w-5 text-green-400" />
          داشبورد امنیتی زنده
        </h3>
        <button
          onClick={() => setShowSecurityDashboard(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <SecurityStats stats={securityStats} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            رویدادهای امنیتی اخیر
          </h4>
          <div className="space-y-2 max-h-48 overflow-auto">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-2 text-xs">
                  <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                    event.severity >= 4 ? 'bg-red-400' 
                    : event.severity >= 3 ? 'bg-orange-400' 
                    : 'bg-green-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 truncate">{event.details}</p>
                    <p className="text-gray-500 text-xs">{event.timestamp.toLocaleTimeString('fa-IR')}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-xs">هیچ رویدادی ثبت نشده</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            تلاش‌های نفوذ مسدود شده
          </h4>
          <div className="max-h-48 overflow-auto">
            <IntrusionAttemptsList attempts={intrusionAttempts} />
          </div>
        </div>
      </div>

      <div className="mt-4 bg-gray-800 p-4 rounded-lg">
        <SessionList 
          sessions={securityMonitor.getSessions()} 
          onTerminate={handleSessionTerminate}
          onRefresh={() => setSecurityStats(securityMonitor.getStats())}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className={`bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all duration-300 ${
          securityLevel === 'critical' ? 'border-red-300 shadow-red-500/20' 
          : securityLevel === 'elevated' ? 'border-yellow-300 shadow-yellow-500/20' 
          : 'border-gray-200'
        }`}>
          <div className={`px-8 py-6 ${
            securityLevel === 'critical' ? 'bg-gradient-to-r from-red-600 to-red-700' 
            : securityLevel === 'elevated' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
            : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">تنظیمات امنیت سیستم</h1>
                  <p className="text-blue-100 mt-1">
                    مدیریت جامع تنظیمات امنیتی و حفاظت از داده‌ها
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSecurityDashboard(!showSecurityDashboard)}
                  className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium"
                >
                  <Activity className="h-4 w-4" />
                  داشبورد
                </button>
                
                <button
                  onClick={resetToDefaults}
                  className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium"
                >
                  <RotateCcw className="h-4 w-4" />
                  بازنشانی
                </button>
                
                <button
                  onClick={handleSave}
                  disabled={isLoading || validationErrors.length > 0 || !hasUnsavedChanges}
                  className={`px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg ${
                    hasUnsavedChanges && !isLoading && validationErrors.length === 0
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600 animate-pulse' 
                      : 'bg-white text-blue-700 hover:bg-blue-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {hasUnsavedChanges ? 'ذخیره تغییرات' : 'ذخیره شده'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Security Score Banner */}
          <div className="px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-gray-400 mb-1">امتیاز امنیتی کلی</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${getScoreColor(calculateSecurityScore)}`}>
                      {calculateSecurityScore}
                    </span>
                    <span className="text-sm text-gray-400">/ 100</span>
                  </div>
                </div>
                <div className="h-12 w-px bg-gray-700" />
                <div>
                  <p className="text-xs text-gray-400 mb-1">وضعیت امنیت</p>
                  <p className={`text-lg font-semibold ${
                    calculateSecurityScore >= 90 ? 'text-green-400'
                    : calculateSecurityScore >= 70 ? 'text-blue-400'
                    : calculateSecurityScore >= 50 ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>
                    {getScoreLabel(calculateSecurityScore)}
                  </p>
                </div>
                <div className="h-12 w-px bg-gray-700" />
                <div>
                  <p className="text-xs text-gray-400 mb-1">سطح حفاظت</p>
                  <p className={`text-lg font-semibold ${
                    securityLevel === 'critical' ? 'text-red-400'
                    : securityLevel === 'elevated' ? 'text-yellow-400'
                    : 'text-green-400'
                  }`}>
                    {securityLevel === 'critical' ? 'بحرانی'
                    : securityLevel === 'elevated' ? 'افزایش‌یافته'
                    : 'طبیعی'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSection(activeSection === 'auth' ? null : 'auth')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeSection === 'auth' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  احراز هویت
                </button>
                <button
                  onClick={() => setActiveSection(activeSection === 'security' ? null : 'security')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeSection === 'security' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  امنیت
                </button>
                <button
                  onClick={() => setActiveSection(activeSection === 'password' ? null : 'password')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeSection === 'password' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  رمز عبور
                </button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${
                  calculateSecurityScore >= 90 ? 'bg-gradient-to-r from-green-400 to-green-500'
                  : calculateSecurityScore >= 70 ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                  : calculateSecurityScore >= 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                  : 'bg-gradient-to-r from-red-400 to-red-500'
                }`}
                style={{ width: `${calculateSecurityScore}%` }}
              />
            </div>
          </div>

          {/* Security Level Banner */}
          {securityLevel !== 'normal' && (
            <div className={`px-8 py-3 ${
              securityLevel === 'critical' ? 'bg-red-100 border-b border-red-200' 
              : 'bg-yellow-100 border-b border-yellow-200'
            }`}>
              <div className="flex items-center gap-2 text-sm">
                {securityLevel === 'critical' ? (
                  <>
                    <Ban className="h-4 w-4 text-red-600" />
                    <span className="text-red-800 font-medium">
                      هشدار امنیتی بحرانی: فعالیت مشکوک شناسایی شد
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-800 font-medium">
                      سطح امنیت افزایش‌یافته: فعالیت مشکوک شناسایی شد
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-6 bg-red-50 border-t border-red-200">
              <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                خطاهای اعتبارسنجی:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Security Dashboard */}
        {showSecurityDashboard && <SecurityDashboard />}

        {/* Status Indicator */}
        {hasUnsavedChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-semibold text-yellow-800">تغییرات ذخیره نشده</h4>
                <p className="text-sm text-yellow-700">تنظیمات شما تغییر کرده‌اند اما هنوز ذخیره نشده‌اند.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Authentication Settings */}
          {(activeSection === null || activeSection === 'auth') && (
            <ModernCard
              title="تنظیمات احراز هویت"
              description="مدیریت نحوه ورود و دسترسی کاربران به سیستم"
              icon={<Lock className="h-6 w-6 text-blue-600" />}
              securityLevel={securityLevel}
              badge={settings.twoFactorAuth ? { text: '2FA فعال', type: 'success' } : undefined}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ModernInput
                    label="حداکثر تلاش‌های ناموفق"
                    type="number"
                    value={settings.maxFailedAttempts}
                    onChange={(value) => updateSettings({ maxFailedAttempts: value as number })}
                    min={1}
                    max={10}
                    description={`${settings.maxFailedAttempts} تلاش مجاز قبل از مسدودی`}
                  />
                  
                  <ModernInput
                    label="مدت زمان مسدودی"
                    type="number"
                    value={settings.loginBlockDuration}
                    onChange={(value) => updateSettings({ loginBlockDuration: value as number })}
                    min={5}
                    max={3600}
                    description="مدت زمان مسدودی پس از تلاش‌های ناموفق"
                    suffix="ثانیه"
                  />
                </div>
                
                <ModernInput
                  label="مدت زمان نشست"
                  type="number"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(value) => updateSettings({ sessionTimeoutMinutes: value as number })}
                  min={1}
                  max={480}
                  description="مدت زمان اعتبار نشست کاربر"
                  suffix="دقیقه"
                />
                
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <ModernToggle
                    checked={settings.twoFactorAuth}
                    onChange={(checked) => updateSettings({ twoFactorAuth: checked })}
                    label="احراز هویت دو مرحله‌ای (2FA)"
                    description="افزودن یک لایه امنیتی اضافی با کد تایید"
                    securityCritical
                    onActivate={handle2FAEnable}
                  />
                  
                  <ModernToggle
                    checked={settings.sessionHistory}
                    onChange={(checked) => {
                      updateSettings({ sessionHistory: checked });
                      if (checked) {
                        securityMonitor.logEvent('success', 'history', 'ثبت تاریخچه نشست‌ها فعال شد', 1);
                      }
                    }}
                    label="تاریخچه نشست‌ها"
                    description="ثبت و نگهداری تاریخچه ورود و خروج کاربران"
                  />

                  <ModernToggle
                    checked={settings.sessionRotation}
                    onChange={(checked) => {
                      updateSettings({ sessionRotation: checked });
                      if (checked) {
                        securityMonitor.logEvent('success', 'rotation', 'چرخش خودکار نشست فعال شد', 1);
                      }
                    }}
                    label="چرخش نشست"
                    description="تمدید خودکار نشست برای جلوگیری از سرقت"
                    securityCritical
                  />
                </div>

                {/* 2FA Setup Modal */}
                {show2FASetup && settings.twoFactorAuth && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">راه‌اندازی احراز هویت دو مرحله‌ای</h4>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      برای فعال‌سازی 2FA، کد زیر را در اپلیکیشن Authenticator خود وارد کنید:
                    </p>
                    <div className="bg-white p-3 rounded-lg border border-green-200 font-mono text-sm text-center mb-3 select-all">
                      {totpSecret}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <Check className="h-4 w-4" />
                      <span>پس از اسکن کد، کد 6 رقمی را وارد کنید تا تأیید شود</span>
                    </div>
                    <button
                      onClick={() => setShow2FASetup(false)}
                      className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                    >
                      تایید و ادامه
                    </button>
                  </div>
                )}

                {/* Active Sessions */}
                {settings.sessionHistory && (
                  <div className="pt-4 border-t border-gray-200">
                    <SessionList 
                      sessions={securityMonitor.getSessions()} 
                      onTerminate={handleSessionTerminate}
                      onRefresh={() => setSecurityStats(securityMonitor.getStats())}
                    />
                  </div>
                )}
              </div>
            </ModernCard>
          )}

          {/* Security Features */}
          {(activeSection === null || activeSection === 'security') && (
            <ModernCard
              title="ویژگی‌های امنیتی"
              description="فعال‌سازی ویژگی‌های حفاظتی و نظارتی سیستم"
              icon={<Shield className="h-6 w-6 text-blue-600" />}
              securityLevel={securityLevel}
              badge={settings.intrusionDetectionEnabled ? { text: 'IDS فعال', type: 'success' } : undefined}
            >
              <div className="space-y-6">
                <ModernToggle
                  checked={settings.encryptionEnabled}
                  onChange={(checked) => {
                    updateSettings({ encryptionEnabled: checked });
                    if (checked) {
                      securityMonitor.logEvent('success', 'encryption', 'رمزنگاری داده‌ها فعال شد - AES-256', 1);
                    }
                  }}
                  label="رمزنگاری داده‌ها"
                  description="حفاظت از داده‌های حساس با AES-256"
                  securityCritical
                />
                
                <ModernToggle
                  checked={settings.auditLogEnabled}
                  onChange={(checked) => {
                    updateSettings({ auditLogEnabled: checked });
                    if (checked) {
                      securityMonitor.logEvent('success', 'audit', 'ثبت وقایع امنیتی فعال شد', 1);
                    }
                  }}
                  label="ثبت وقایع امنیتی"
                  description="ثبت کامل تمام فعالیت‌ها و تغییرات امنیتی"
                />

                <ModernToggle
                  checked={settings.intrusionDetectionEnabled}
                  onChange={(checked) => {
                    updateSettings({ intrusionDetectionEnabled: checked });
                    if (checked) {
                      securityMonitor.logEvent('success', 'ids', 'سیستم تشخیص نفوذ فعال شد', 1);
                    } else {
                      securityMonitor.logEvent('warning', 'ids', 'سیستم تشخیص نفوذ غیرفعال شد', 2);
                    }
                  }}
                  label="تشخیص نفوذ (IDS)"
                  description="شناسایی و جلوگیری از حملات احتمالی"
                  securityCritical
                />

                <ModernToggle
                  checked={settings.rateLimitingEnabled}
                  onChange={(checked) => {
                    updateSettings({ rateLimitingEnabled: checked });
                    if (checked) {
                      securityMonitor.logEvent('success', 'rate-limit', 'محدودسازی نرخ درخواست فعال شد', 1);
                    }
                  }}
                  label="محدودسازی نرخ"
                  description="محدود کردن تعداد درخواست‌ها برای جلوگیری از حملات brute force"
                  securityCritical
                />

                {/* Security Status */}
                <div className={`p-4 rounded-xl border ${
                  securityLevel === 'critical' 
                    ? 'bg-red-50 border-red-200' 
                    : securityLevel === 'elevated'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      securityLevel === 'critical' 
                        ? 'bg-red-100' 
                        : securityLevel === 'elevated'
                        ? 'bg-yellow-100'
                        : 'bg-green-100'
                    }`}>
                      {securityLevel === 'critical' ? (
                        <ShieldX className="h-5 w-5 text-red-600" />
                      ) : securityLevel === 'elevated' ? (
                        <ShieldAlert className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">وضعیت حفاظتی</h4>
                      <p className={`text-sm ${
                        securityLevel === 'critical' 
                          ? 'text-red-700' 
                          : securityLevel === 'elevated'
                          ? 'text-yellow-700'
                          : 'text-green-700'
                      }`}>
                        {settings.encryptionEnabled && '🔒 رمزنگاری فعال'}
                        {settings.auditLogEnabled && ' 📝 ثبت وقایع فعال'}
                        {settings.intrusionDetectionEnabled && ' 🛡️ IDS فعال'}
                        {settings.rateLimitingEnabled && ' ⚡ Rate Limiting فعال'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">رمزنگاری:</span>
                      <span className={`font-semibold ${
                        settings.encryptionEnabled ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {settings.encryptionEnabled ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">تشخیص نفوذ:</span>
                      <span className={`font-semibold ${
                        settings.intrusionDetectionEnabled ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        {settings.intrusionDetectionEnabled ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ModernCard>
          )}
        </div>

        {/* Password Policy */}
        {(activeSection === null || activeSection === 'password') && (
          <ModernCard
            title="سیاست رمز عبور"
            description="تعریف قواعد و الزامات برای ایجاد رمزهای عبور قوی و امن"
            icon={<Key className="h-6 w-6 text-blue-600" />}
            className="xl:col-span-2"
            badge={settings.passwordPolicy.minLength >= 12 ? { text: 'امنیت بالا', type: 'success' } : undefined}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">پیکربندی سیاست رمز عبور</h4>
                <p className="text-sm text-gray-600 mt-1">استانداردهای امنیتی برای رمزهای عبور مقاوم در برابر حملات</p>
              </div>
              <button
                onClick={() => setShowPasswordPolicy(!showPasswordPolicy)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showPasswordPolicy ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {showPasswordPolicy && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <ModernInput
                    label="حداقل طول رمز عبور"
                    type="number"
                    value={settings.passwordPolicy.minLength}
                    onChange={(value) => updatePasswordPolicy({ minLength: value as number })}
                    min={8}
                    max={32}
                    description="حداقل تعداد کاراکترهای مورد نیاز"
                  />
                  
                  <ModernInput
                    label="تاریخ انقضا رمز عبور"
                    type="number"
                    value={settings.passwordPolicy.expireDays}
                    onChange={(value) => updatePasswordPolicy({ expireDays: value as number })}
                    min={0}
                    max={365}
                    description="مدت زمان اعتبار رمز عبور"
                    suffix="روز"
                  />
                  
                  <ModernInput
                    label="پیشگیری از استفاده مجدد"
                    type="number"
                    value={settings.passwordPolicy.preventReuse}
                    onChange={(value) => updatePasswordPolicy({ preventReuse: value as number })}
                    min={0}
                    max={20}
                    description="تعداد رمزهای عبور قبلی که نمی‌توان استفاده کرد"
                  />
                </div>
                
                <div className="lg:col-span-2 space-y-4">
                  <h5 className="font-semibold text-gray-900 mb-4">الزامات کاراکتری</h5>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ModernToggle
                      checked={settings.passwordPolicy.requireUppercase}
                      onChange={(checked) => updatePasswordPolicy({ requireUppercase: checked })}
                      label="حروف بزرگ (A-Z)"
                      description="الزام به وجود حداقل یک حرف بزرگ"
                    />
                    
                    <ModernToggle
                      checked={settings.passwordPolicy.requireLowercase}
                      onChange={(checked) => updatePasswordPolicy({ requireLowercase: checked })}
                      label="حروف کوچک (a-z)"
                      description="الزام به وجود حداقل یک حرف کوچک"
                    />
                    
                    <ModernToggle
                      checked={settings.passwordPolicy.requireNumbers}
                      onChange={(checked) => updatePasswordPolicy({ requireNumbers: checked })}
                      label="اعداد (0-9)"
                      description="الزام به وجود حداقل یک رقم"
                    />
                    
                    <ModernToggle
                      checked={settings.passwordPolicy.requireSpecialChars}
                      onChange={(checked) => updatePasswordPolicy({ requireSpecialChars: checked })}
                      label="کاراکترهای خاص"
                      description="الزام به وجود کاراکترهای خاص (!@#$%^&*)"
                    />

                    <ModernToggle
                      checked={settings.passwordPolicy.requireMFA}
                      onChange={(checked) => updatePasswordPolicy({ requireMFA: checked })}
                      label="الزام احراز هویت چندعاملی"
                      description="نیاز به تأیید هویت از چند طریق"
                      securityCritical
                    />
                  </div>

                  {/* Live Password Tester */}
                  <div className="p-4 bg-blue-50 rounded-xl mt-6 border border-blue-200">
                    <h6 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      تست زنده رمز عبور
                    </h6>
                    <ModernInput
                      label="رمز عبور نمونه"
                      type="password"
                      value={testPassword}
                      onChange={setTestPassword}
                      placeholder="رمز عبور خود را وارد کنید..."
                      masked
                    />
                    <PasswordStrengthMeter password={testPassword} policy={settings.passwordPolicy} />
                  </div>

                  {/* Security Tips */}
                  <div className="p-4 bg-green-50 rounded-xl mt-4 border border-green-200">
                    <h6 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      نکات امنیتی
                    </h6>
                    <ul className="text-sm text-green-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                        <span>حداقل طول 12 کاراکتر برای امنیت بهتر توصیه می‌شود</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                        <span>از استفاده از اطلاعات شخصی در رمز عبور خودداری کنید</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                        <span>رمز عبور خود را به صورت دوره‌ای تغییر دهید</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </ModernCard>
        )}

        {/* IP Whitelist */}
        {(activeSection === null || activeSection === 'auth') && (
          <ModernCard
            title="لیست IP مجاز"
            description="مدیریت آدرس‌های IP مجاز برای دسترسی به سیستم"
            icon={<Globe className="h-6 w-6 text-blue-600" />}
            className="xl:col-span-2"
            badge={settings.ipWhitelist.length > 0 ? { text: `${settings.ipWhitelist.length} IP محدود`, type: 'info' } : undefined}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">محدودیت دسترسی بر اساس IP</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {settings.ipWhitelist.length > 0 
                    ? `فقط ${settings.ipWhitelist.length} آدرس IP مجاز می‌توانند به سیستم دسترسی داشته باشند`
                    : 'در صورت خالی بودن این لیست، تمام آدرس‌های IP مجاز خواهند بود'}
                </p>
              </div>
              <button
                onClick={() => setShowIPList(!showIPList)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showIPList ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {showIPList && (
              <div className="space-y-6">
                {/* Add New IP */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <ModernInput
                      label="آدرس IP جدید"
                      value={newIP}
                      onChange={(value) => {
                        setNewIP(value as string);
                        if (ipErrors.length > 0) {
                          setIpErrors([]);
                        }
                      }}
                      placeholder="192.168.1.100"
                      error={ipErrors[0]}
                      description="آدرس IP معتبر را وارد کنید"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addIP}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl"
                    >
                      <Plus className="h-5 w-5" />
                      افزودن IP
                    </button>
                  </div>
                </div>

                {/* IP Whitelist Status */}
                {settings.ipWhitelist.length > 0 ? (
                  <SecurityAlert
                    type="warning"
                    title="محدودیت دسترسی فعال"
                    message={`${settings.ipWhitelist.length} آدرس IP مجاز تعریف شده است. فقط این آدرس‌ها می‌توانند به سیستم دسترسی داشته باشند.`}
                  />
                ) : (
                  <SecurityAlert
                    type="info"
                    title="دسترسی باز"
                    message="در حال حاضر هیچ محدودیت IP تنظیم نشده است. تمام آدرس‌ها می‌توانند به سیستم دسترسی داشته باشند."
                  />
                )}

                {/* IP List */}
                {settings.ipWhitelist.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-gray-900">
                        آدرس‌های IP مجاز ({settings.ipWhitelist.length})
                      </h5>
                      <button
                        onClick={copyIPs}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                      >
                        <Copy className="h-4 w-4" />
                        کپی همه
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {settings.ipWhitelist.map((ip, index) => (
                        <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                          <div className="flex items-center gap-2">
                            <Wifi className="h-4 w-4 text-green-500" />
                            <div className="flex-1 font-mono text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded-lg border border-gray-200">
                              {ip}
                            </div>
                          </div>
                          <button
                            onClick={() => removeIP(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="حذف IP"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Globe className="h-8 w-8 text-gray-400" />
                    </div>
                    <h5 className="text-lg font-semibold text-gray-600 mb-2">هیچ آدرس IP مجازی تعریف نشده است</h5>
                    <p className="text-gray-500 mb-4">برای محدود کردن دسترسی، IP های مجاز را اضافه کنید</p>
                  </div>
                )}
              </div>
            )}
          </ModernCard>
        )}
      </div>

      {/* Persistent Status */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="px-3 py-2 rounded-lg text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 animate-pulse">
            ⚠️ تغییرات ذخیره نشده
          </div>
        </div>
      )}

      {/* Success Toast */}
      <SuccessToast 
        show={showSuccess} 
        message={successMessage || "عملیات با موفقیت انجام شد"} 
      />
    </div>
  );
};

export default SecuritySettings;
