// Security validation utilities
// این فایل شامل تمام توابع اعتبارسنجی مربوط به تنظیمات امنیت است

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SecurityValidationRules {
  maxFailedAttempts: { min: number; max: number };
  loginBlockDuration: { min: number; max: number };
  sessionTimeoutMinutes: { min: number; max: number };
  passwordPolicy: {
    minLength: { min: number; max: number };
    expireDays: { min: number; max: number };
    preventReuse: { min: number; max: number };
  };
}

// قواعد اعتبارسنجی
export const VALIDATION_RULES: SecurityValidationRules = {
  maxFailedAttempts: { min: 1, max: 10 },
  loginBlockDuration: { min: 5, max: 3600 },
  sessionTimeoutMinutes: { min: 5, max: 480 },
  passwordPolicy: {
    minLength: { min: 4, max: 32 },
    expireDays: { min: 0, max: 365 },
    preventReuse: { min: 0, max: 20 }
  }
};

// اعتبارسنجی آدرس IP
export const validateIP = (ip: string): boolean => {
  if (!ip || typeof ip !== 'string') return false;
  
  // الگوی regex برای IPv4
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // الگوی regex برای IPv6 (ساده شده)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// اعتبارسنجی شماره پورت
export const validatePort = (port: number): boolean => {
  return port >= 1 && port <= 65535 && Number.isInteger(port);
};

// اعتبارسنجی ایمیل (برای future use)
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// اعتبارسنجی شدت رمز عبور
export interface PasswordStrength {
  score: number;
  level: string;
  color: string;
  feedback: string[];
}

export const calculatePasswordStrength = (policy: {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expireDays: number;
  preventReuse: number;
}): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];
  
  // امتیاز بر اساس طول رمز
  if (policy.minLength >= 8) score += 1;
  if (policy.minLength >= 12) score += 1;
  if (policy.minLength >= 16) score += 1;
  
  // امتیاز بر اساس تنوع کاراکترها
  const diversityCount = [
    policy.requireUppercase,
    policy.requireLowercase,
    policy.requireNumbers,
    policy.requireSpecialChars
  ].filter(Boolean).length;
  
  score += Math.floor(diversityCount / 2);
  
  // امتیاز بر اساس انقضا
  if (policy.expireDays > 0 && policy.expireDays <= 90) score += 1;
  if (policy.expireDays > 0 && policy.expireDays <= 30) score += 1;
  
  // امتیاز بر اساس پیشگیری از استفاده مجدد
  if (policy.preventReuse >= 3) score += 1;
  if (policy.preventReuse >= 5) score += 1;
  
  // تعیین سطح و رنگ
  let level = 'ضعیف';
  let color = 'bg-red-500';
  
  if (score >= 6) {
    level = 'بسیار قوی';
    color = 'bg-green-600';
  } else if (score >= 4) {
    level = 'قوی';
    color = 'bg-green-500';
  } else if (score >= 3) {
    level = 'متوسط';
    color = 'bg-blue-500';
  } else if (score >= 2) {
    level = 'متوسط';
    color = 'bg-yellow-500';
  }
  
  // تولید بازخورد
  if (policy.minLength < 8) feedback.push('طول رمز عبور کوتاه است');
  if (!policy.requireUppercase) feedback.push('نیاز به حروف بزرگ');
  if (!policy.requireLowercase) feedback.push('نیاز به حروف کوچک');
  if (!policy.requireNumbers) feedback.push('نیاز به اعداد');
  if (!policy.requireSpecialChars) feedback.push('نیاز به کاراکترهای خاص');
  if (policy.expireDays === 0) feedback.push('رمز عبور منقضی نمی‌شود');
  if (policy.preventReuse === 0) feedback.push('محدودیت استفاده مجوز وجود ندارد');
  
  return { score, level, color, feedback };
};

// اعتبارسنجی تنظیمات امنیت کلی
export const validateSecuritySettings = (settings: any): ValidationResult => {
  const errors: string[] = [];
  
  // بررسی وجود settings
  if (!settings) {
    errors.push('تنظیمات امنیت یافت نشد');
    return { isValid: false, errors };
  }
  
  const security = settings.security || {};
  
  // اعتبارسنجی maxFailedAttempts
  if (security.maxFailedAttempts !== undefined) {
    const { min, max } = VALIDATION_RULES.maxFailedAttempts;
    if (security.maxFailedAttempts < min || security.maxFailedAttempts > max) {
      errors.push(`حداکثر تلاش‌های ناموفق باید بین ${min} تا ${max} باشد`);
    }
  }
  
  // اعتبارسنجی loginBlockDuration
  if (security.loginBlockDuration !== undefined) {
    const { min, max } = VALIDATION_RULES.loginBlockDuration;
    if (security.loginBlockDuration < min || security.loginBlockDuration > max) {
      errors.push(`مدت زمان مسدودی باید بین ${min} تا ${max} ثانیه باشد`);
    }
  }
  
  // اعتبارسنجی sessionTimeoutMinutes
  if (security.sessionTimeoutMinutes !== undefined) {
    const { min, max } = VALIDATION_RULES.sessionTimeoutMinutes;
    if (security.sessionTimeoutMinutes < min || security.sessionTimeoutMinutes > max) {
      errors.push(`مدت زمان نشست باید بین ${min} تا ${max} دقیقه باشد`);
    }
  }
  
  // اعتبارسنجی passwordPolicy
  if (security.passwordPolicy) {
    const policy = security.passwordPolicy;
    
    // minLength
    if (policy.minLength !== undefined) {
      const { min, max } = VALIDATION_RULES.passwordPolicy.minLength;
      if (policy.minLength < min || policy.minLength > max) {
        errors.push(`حداقل طول رمز عبور باید بین ${min} تا ${max} کاراکتر باشد`);
      }
    }
    
    // expireDays
    if (policy.expireDays !== undefined) {
      const { min, max } = VALIDATION_RULES.passwordPolicy.expireDays;
      if (policy.expireDays < min || policy.expireDays > max) {
        errors.push(`تاریخ انقضا باید بین ${min} تا ${max} روز باشد`);
      }
    }
    
    // preventReuse
    if (policy.preventReuse !== undefined) {
      const { min, max } = VALIDATION_RULES.passwordPolicy.preventReuse;
      if (policy.preventReuse < min || policy.preventReuse > max) {
        errors.push(`پیشگیری از استفاده مجدد باید بین ${min} تا ${max} باشد`);
      }
    }
  }
  
  // اعتبارسنجی ipWhitelist
  if (security.ipWhitelist && Array.isArray(security.ipWhitelist)) {
    security.ipWhitelist.forEach((ip: string, index: number) => {
      if (ip && !validateIP(ip)) {
        errors.push(`آدرس IP ${index + 1} معتبر نیست`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// اعتبارسنجی تک فیلد
export const validateField = (
  fieldName: string, 
  value: any, 
  rules: { min?: number; max?: number; required?: boolean }
): ValidationResult => {
  const errors: string[] = [];
  
  // بررسی required
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} الزامی است`);
    return { isValid: false, errors };
  }
  
  // بررسی min/max برای اعداد
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${fieldName} باید حداقل ${rules.min} باشد`);
    }
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${fieldName} باید حداکثر ${rules.max} باشد`);
    }
  }
  
  // بررسی min/max برای رشته‌ها
  if (typeof value === 'string') {
    if (rules.min !== undefined && value.length < rules.min) {
      errors.push(`${fieldName} باید حداقل ${rules.min} کاراکتر باشد`);
    }
    if (rules.max !== undefined && value.length > rules.max) {
      errors.push(`${fieldName} باید حداکثر ${rules.max} کاراکتر باشد`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// اعتبارسنجی JSON schema (برای future use)
export const validateJsonSchema = (data: any, schema: any): ValidationResult => {
  const errors: string[] = [];
  
  try {
    // این یک مثال ساده است، در production از کتابخانه‌هایی مثل ajv استفاده کنید
    if (schema.type === 'object' && typeof data !== 'object') {
      errors.push('داده باید یک شیء باشد');
    }
    
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach((field: string) => {
        if (!(field in data)) {
          errors.push(`فیلد ${field} الزامی است`);
        }
      });
    }
    
  } catch (error) {
    errors.push('خطا در اعتبارسنجی schema');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// اعتبارسنجی قوی رمز عبور (برای future use)
export const validateStrongPassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('رمز عبور باید حداقل 8 کاراکتر باشد');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('رمز عبور باید حداقل یک حرف بزرگ داشته باشد');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('رمز عبور باید حداقل یک حرف کوچک داشته باشد');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('رمز عبور باید حداقل یک عدد داشته باشد');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('رمز عبور باید حداقل یک کاراکتر خاص داشته باشد');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// اعتبارسنجی نرخ محدودیت (rate limiting)
export const validateRateLimit = (attempts: number, timeWindow: number): boolean => {
  // منطق ساده rate limiting - در production پیچیده‌تر باشد
  const maxAttemptsPerMinute = 10;
  const attemptsPerMinute = attempts / (timeWindow / 60);
  
  return attemptsPerMinute <= maxAttemptsPerMinute;
};

// اعتبارسنجی رمزگشایی (decryption)
export const validateDecryption = (encryptedData: string, key: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!encryptedData || encryptedData.length === 0) {
    errors.push('داده رمزنگاری شده خالی است');
  }
  
  if (!key || key.length < 8) {
    errors.push('کلید رمزگشایی نامعتبر است');
  }
  
  // بررسی فرمت base64 (برای encryptedData)
  try {
    atob(encryptedData);
  } catch {
    errors.push('فرمت داده رمزنگاری شده نامعتبر است');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// اعتبارسنجی session token
export const validateSessionToken = (token: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!token || token.length < 10) {
    errors.push('توکن نشست نامعتبر است');
  }
  
  // بررسی فرمت JWT ساده (header.payload.signature)
  const parts = token.split('.');
  if (parts.length !== 3) {
    errors.push('فرمت توکن JWT نامعتبر است');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
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
};