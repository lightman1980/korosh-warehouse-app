import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Shield, Lock, Key, Globe, Check, AlertCircle, Plus, Trash2, Copy, Save,
  RotateCcw, Clock, Eye, EyeOff, Activity, Fingerprint, Ban, Terminal,
  Zap, Wifi, Database, FileText, RefreshCw, Smartphone, Monitor,
  ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { useSettings } from '../Contracts/SettingsContext';

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

const generateSecureToken = (length: number = 32): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (byte) => charset[byte % charset.length]).join('');
};

const validateIP = (ip: string): { valid: boolean; sanitized: string } => {
  const sanitized = ip.trim().replace(/[<>\"\'\\]/g, '');
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return { valid: ipv4Regex.test(sanitized), sanitized };
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

const ModernCard: React.FC<{ 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  className?: string;
  badge?: { text: string; type: 'success' | 'warning' | 'danger' | 'info' };
}> = ({ title, description, icon, children, className = '', badge }) => {
  const badgeColors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
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

export const SecuritySettings: React.FC = () => {
  const { settings, updateSettings, saveSettings, isLoading, error } = useSettings();
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [newBlockedIP, setNewBlockedIP] = useState('');
  const [activeTab, setActiveTab] = useState<'auth' | 'server' | 'policy'>('auth');

  if (!settings) return null;

  const handleSave = async () => {
    const success = await saveSettings();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const addBlockedIP = () => {
    const { valid, sanitized } = validateIP(newBlockedIP);
    if (valid) {
      const currentBlocked = settings.server.blockedIPs || [];
      if (!currentBlocked.includes(sanitized)) {
        updateSettings({
          server: { ...settings.server, blockedIPs: [...currentBlocked, sanitized] }
        });
        setNewBlockedIP('');
      }
    } else {
      alert('آدرس IP وارد شده معتبر نیست');
    }
  };

  const removeBlockedIP = (ip: string) => {
    updateSettings({
      server: { 
        ...settings.server, 
        blockedIPs: (settings.server.blockedIPs || []).filter(i => i !== ip) 
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 rtl">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-lg">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">امنیت سیستم</h1>
            <p className="text-gray-600">مدیریت لایه‌های حفاظتی و دسترسی به سرور</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'در حال ذخیره...' : 'ذخیره تنظیمات امنیتی'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('auth')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'auth' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
        >
          احراز هویت و دسترسی
        </button>
        <button
          onClick={() => setActiveTab('server')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'server' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
        >
          امنیت سرور و شبکه
        </button>
        <button
          onClick={() => setActiveTab('policy')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'policy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
        >
          سیاست‌های رمز عبور
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'auth' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModernCard
              title="روش‌های احراز هویت"
              description="تعیین نحوه ورود کاربران و سیستم‌های جانبی"
              icon={<Lock className="h-6 w-6" />}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">روش اصلی احراز هویت</label>
                  <select
                    value={settings.server.authMethod || 'jwt'}
                    onChange={(e) => updateSettings({ server: { ...settings.server, authMethod: e.target.value as any } })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="jwt">JWT Token (امنیت بالا)</option>
                    <option value="api_key">API Key (مناسب برای سرویس‌ها)</option>
                    <option value="basic">Basic Auth (ساده)</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <span className="block font-bold text-gray-800 text-sm">احراز هویت دو مرحله‌ای</span>
                    <p className="text-xs text-gray-500">الزام به استفاده از OTP</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.server.twoFactorAuth || false}
                    onChange={(e) => updateSettings({ server: { ...settings.server, twoFactorAuth: e.target.checked } })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>
              </div>
            </ModernCard>

            <ModernCard
              title="محدودیت‌های دسترسی"
              description="کنترل دفعات تلاش برای ورود و زمان نشست‌ها"
              icon={<Clock className="h-6 w-6" />}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">حداکثر تلاش ناموفق</label>
                    <input
                      type="number"
                      value={settings.server.maxFailedAttempts || 5}
                      onChange={(e) => updateSettings({ server: { ...settings.server, maxFailedAttempts: parseInt(e.target.value) } })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">زمان انقضای نشست (دقیقه)</label>
                    <input
                      type="number"
                      value={settings.server.sessionTimeoutMinutes || 30}
                      onChange={(e) => updateSettings({ server: { ...settings.server, sessionTimeoutMinutes: parseInt(e.target.value) } })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </ModernCard>
          </div>
        )}

        {activeTab === 'server' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModernCard
              title="لیست سیاه IP"
              description="مسدود کردن دسترسی از آدرس‌های IP مشکوک"
              icon={<Ban className="h-6 w-6" />}
            >
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBlockedIP}
                    onChange={(e) => setNewBlockedIP(e.target.value)}
                    placeholder="مثال: 192.168.1.50"
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono"
                  />
                  <button
                    onClick={addBlockedIP}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {(settings.server.blockedIPs || []).map(ip => (
                    <div key={ip} className="flex items-center justify-between p-2 bg-red-50 text-red-700 rounded-lg text-sm font-mono">
                      <span>{ip}</span>
                      <button onClick={() => removeBlockedIP(ip)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {(!settings.server.blockedIPs || settings.server.blockedIPs.length === 0) && (
                    <p className="text-center text-gray-400 text-xs py-4">لیست سیاه خالی است</p>
                  )}
                </div>
              </div>
            </ModernCard>

            <ModernCard
              title="امنیت شبکه و SSL"
              description="پیکربندی گواهی‌های امنیتی و محدودیت نرخ"
              icon={<Wifi className="h-6 w-6" />}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-bold text-gray-700">اجبار به استفاده از HTTPS</span>
                  <input
                    type="checkbox"
                    checked={settings.server.forceHttps || false}
                    onChange={(e) => updateSettings({ server: { ...settings.server, forceHttps: e.target.checked } })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">محدودیت نرخ (درخواست/دقیقه)</label>
                  <input
                    type="number"
                    value={settings.server.rateLimitPublic || 100}
                    onChange={(e) => updateSettings({ server: { ...settings.server, rateLimitPublic: parseInt(e.target.value) } })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>
            </ModernCard>
          </div>
        )}

        {activeTab === 'policy' && (
          <ModernCard
            title="سیاست‌های پیچیدگی رمز عبور"
            description="الزامات امنیتی برای انتخاب رمز عبور توسط کاربران"
            icon={<Key className="h-6 w-6" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">حداقل طول رمز</label>
                <input
                  type="number"
                  value={settings.security.passwordPolicy.minLength || 8}
                  onChange={(e) => updateSettings({ 
                    security: { 
                      ...settings.security, 
                      passwordPolicy: { ...settings.security.passwordPolicy, minLength: parseInt(e.target.value) } 
                    } 
                  })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-bold text-gray-700">الزام حروف بزرگ</span>
                <input
                  type="checkbox"
                  checked={settings.security.passwordPolicy.requireUppercase || false}
                  onChange={(e) => updateSettings({ 
                    security: { 
                      ...settings.security, 
                      passwordPolicy: { ...settings.security.passwordPolicy, requireUppercase: e.target.checked } 
                    } 
                  })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-bold text-gray-700">الزام کاراکتر خاص</span>
                <input
                  type="checkbox"
                  checked={settings.security.passwordPolicy.requireSymbols || false}
                  onChange={(e) => updateSettings({ 
                    security: { 
                      ...settings.security, 
                      passwordPolicy: { ...settings.security.passwordPolicy, requireSymbols: e.target.checked } 
                    } 
                  })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>
            </div>
          </ModernCard>
        )}
      </div>

      {showSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="h-5 w-5" />
          تنظیمات امنیتی با موفقیت ذخیره شد
        </div>
      )}
    </div>
  );
};
