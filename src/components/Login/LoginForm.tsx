import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw, Shield, Smartphone, Monitor } from 'lucide-react';
import { authService } from '../../utils/AuthService';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<boolean> | boolean;
  onLoginSuccess?: (user: any) => void;
}

interface UserProfile {
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

export const EnhancedLoginForm: React.FC<LoginFormProps> = ({ onLogin, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimer, setBlockTimer] = useState(0);
  const [showDemoUsers, setShowDemoUsers] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const MAX_ATTEMPTS = 3;
  // Load block duration from settings, default to 10 seconds
  const [blockDuration, setBlockDuration] = useState(10);
  
  useEffect(() => {
    const loadBlockDuration = () => {
      try {
        const settings = localStorage.getItem('appSettings');
        if (settings) {
          const parsed = JSON.parse(settings);
          if (parsed.security?.loginBlockDuration) {
            setBlockDuration(parsed.security.loginBlockDuration);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading block duration from settings:', error);
      }
      setBlockDuration(10); // Default: 10 seconds
    };
    loadBlockDuration();
    
    // Listen for settings changes
    const handleStorageChange = () => loadBlockDuration();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load saved credentials on component mount
  useEffect(() => {
    loadSavedCredentials();
    checkConnection();
    
    // Check if user is currently blocked
    const blockedUntil = localStorage.getItem('loginBlockedUntil');
    if (blockedUntil) {
      const blockedTime = parseInt(blockedUntil);
      if (Date.now() < blockedTime) {
        setIsBlocked(true);
        setBlockTimer(Math.ceil((blockedTime - Date.now()) / 1000));
      } else {
        localStorage.removeItem('loginBlockedUntil');
      }
    }
  }, []);

  // Block timer countdown
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isBlocked && blockTimer > 0) {
      timer = setInterval(() => {
        setBlockTimer(prev => {
          if (prev <= 1) {
            setIsBlocked(false);
            localStorage.removeItem('loginBlockedUntil');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isBlocked, blockTimer]);

  const loadSavedCredentials = () => {
    try {
      const savedCredentials = localStorage.getItem('rememberedCredentials');
      if (savedCredentials) {
        const { username: savedUsername, password: savedPassword } = JSON.parse(savedCredentials);
        setUsername(savedUsername);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      // Test localStorage availability
      const testKey = 'connection_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      setConnectionStatus('online');
    } catch (error) {
      setConnectionStatus('offline');
    }
  };

  const validateCredentials = async (username: string, password: string): Promise<UserProfile | null> => {
    try {
      // Use AuthService for authentication
      const result = await authService.authenticate(username, password);
      
      if (result.success && result.user) {
        return result.user;
      }
      
      return null;
    } catch (error) {
      console.error('Error validating credentials:', error);
      return null;
    }
  };

  const updateFailedAttempts = () => {
    const attempts = loginAttempts + 1;
    setLoginAttempts(attempts);
    
    if (attempts >= MAX_ATTEMPTS) {
      // Block user
      const blockedUntil = Date.now() + (blockDuration * 1000);
      localStorage.setItem('loginBlockedUntil', blockedUntil.toString());
      setIsBlocked(true);
      setBlockTimer(blockDuration);
      setError(`تعداد تلاش‌های ناموفق زیاد بود. لطفاً ${blockDuration} ثانیه بعد تلاش کنید.`);
    } else {
      setError(`نام کاربری یا رمز عبور اشتباه است. تلاش ${attempts} از ${MAX_ATTEMPTS}`);
    }
  };

  const resetFailedAttempts = () => {
    setLoginAttempts(0);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      setError(`ورود موقتاً مسدود شده است. ${Math.ceil(blockTimer / 60)} دقیقه و ${blockTimer % 60} ثانیه باقی مانده.`);
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError('نام کاربری و رمز عبور الزامی هستند');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Validate credentials using AuthService
      const user = await validateCredentials(username.trim(), password);
      
      if (!user) {
        updateFailedAttempts();
        setIsLoading(false);
        return;
      }

      // Reset failed attempts on successful validation
      resetFailedAttempts();

      // AuthService already handles last login update

      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedCredentials', JSON.stringify({ 
          username: username.trim(), 
          password: password 
        }));
      } else {
        localStorage.removeItem('rememberedCredentials');
      }

      // Call the onLogin callback (should be async now)
      // Note: user is already validated, so we can proceed
      const result = await onLogin(username.trim(), password);
      const loginSuccess = result;
      
      if (loginSuccess) {
        setSuccess('ورود موفقیت‌آمیز بود. در حال انتقال...');
        
        // Call success callback with user data
        if (onLoginSuccess) {
          onLoginSuccess(user);
        }

        // Clear form after successful login
        setTimeout(() => {
          setUsername('');
          setPassword('');
          setSuccess('');
        }, 1000);
      } else {
        // If AuthService validated but onLogin failed, show error
        setError('خطا در فرآیند ورود. لطفاً دوباره تلاش کنید.');
        console.error('Login validation succeeded but onLogin callback returned false');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('خطای غیرمنتظره در ورود به سیستم');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoUsername: string, demoPassword: string) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const demoUsers = [
    { username: 'admin', password: 'admin123', role: 'مدیر سیستم', name: 'مدیر کل' },
    { username: 'manager', password: 'manager123', role: 'مدیر میانی', name: 'مدیر انبار' },
    { username: 'user', password: 'user123', role: 'کاربر عادی', name: 'کاربر انبار' },
    { username: 'operator', password: 'operator123', role: 'اپراتور', name: 'اپراتور سیستم' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <img 
              src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559" 
              alt="لوگو شرکت" 
              className="h-20 w-auto mx-auto mb-4 rounded-lg shadow-md"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/لوگو صنعت غذایی کورش copy.jpg';
                target.onerror = () => {
                  target.style.display = 'none';
                };
              }}
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              سیستم مدیریت انبار مخازن
            </h1>
            <p className="text-gray-600">شرکت صنعت غذایی کورش</p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className={`flex items-center gap-1 ${
              connectionStatus === 'online' ? 'text-green-600' :
              connectionStatus === 'offline' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {connectionStatus === 'checking' && <RefreshCw className="h-4 w-4 animate-spin" />}
              {connectionStatus === 'online' && <CheckCircle className="h-4 w-4" />}
              {connectionStatus === 'offline' && <AlertCircle className="h-4 w-4" />}
              <span>
                {connectionStatus === 'online' && 'متصل'}
                {connectionStatus === 'offline' && 'آفلاین'}
                {connectionStatus === 'checking' && 'در حال بررسی...'}
              </span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">ورود به سیستم</h2>
            <p className="text-gray-600 text-sm">لطفاً اطلاعات ورود خود را وارد کنید</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نام کاربری
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(''); // Clear error when user starts typing
                  }}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                  placeholder="نام کاربری خود را وارد کنید"
                  disabled={isLoading || isBlocked}
                  required
                />
                <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(''); // Clear error when user starts typing
                  }}
                  className="w-full px-4 py-3 pr-12 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                  placeholder="رمز عبور خود را وارد کنید"
                  disabled={isLoading || isBlocked}
                  required
                />
                <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading || isBlocked}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
                {loginAttempts > 0 && loginAttempts < MAX_ATTEMPTS && (
                  <p className="text-red-600 text-xs mt-1">
                    تلاش‌های باقی‌مانده: {MAX_ATTEMPTS - loginAttempts}
                  </p>
                )}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              </div>
            )}

            {isBlocked && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-yellow-700 text-sm font-medium">ورود موقتاً مسدود شده است</p>
                    <p className="text-yellow-600 text-xs mt-1">
                      زمان باقی‌مانده: {formatTime(blockTimer)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Remember Me & Demo Toggle */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading || isBlocked}
                />
                <label htmlFor="rememberMe" className="mr-2 block text-sm text-gray-700">
                  مرا به خاطر بسپار
                </label>
              </label>
              
              <button
                type="button"
                onClick={() => setShowDemoUsers(!showDemoUsers)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                disabled={isLoading || isBlocked}
              >
                <Smartphone className="h-4 w-4" />
                کاربران آزمایشی
              </button>
            </div>

            {/* Demo Users */}
            {showDemoUsers && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  حساب‌های آزمایشی
                </h3>
                <div className="space-y-2">
                  {demoUsers.map((user, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDemoLogin(user.username, user.password)}
                      className="w-full text-right p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200"
                      disabled={isLoading || isBlocked}
                    >
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.role} • {user.username}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || isBlocked || !username.trim() || !password.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  در حال ورود...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  ورود به سیستم
                </>
              )}
            </button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-xs text-gray-500 space-y-1">
              <p>© 1404 شرکت صنعت غذایی کورش</p>
              <p>تمامی حقوق محفوظ است</p>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  نسخه 2.1.0
                </span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span>ساخته شده با ❤️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>در صورت فراموشی رمز عبور با مدیر سیستم تماس بگیرید</p>
        </div>
      </div>
    </div>
  );
};