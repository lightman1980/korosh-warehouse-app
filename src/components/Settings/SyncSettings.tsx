import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  TestTube,
  FolderOpen,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Filter,
  DatabaseZap,
  CloudDownload,
  FileQuestion,
  Plug,
  Settings2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Network,
  BarChart,
  Key,
  Trash2,
  Eye,
  FileSpreadsheet,
  Clock,
  GitBranch,
  Zap,
  Shield,
  Server,
  Globe,
  Activity,
  Save,
  Download,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock4,
  Link2,
  Unlock,
  Lock,
  EyeOff,
  Copy,
  RotateCcw,
  Calendar,
  Timer,
  Layers,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Terminal,
  FileText,
  PieChart,
  TrendingUp,
  Users,
  Briefcase,
  Building2,
  Box,
  Cloud,
  Code2,
  Search,
  Bell,
  Menu,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Maximize2,
Minimize2,
XCircle,
AlertTriangle,
Database,
Table,
KeyRound,
  Share2,
  BookOpen,
  Clipboard,
  CheckCheck,
  RefreshCcw,
  Send,
  EyeSlash,
  Settings,
  LayoutDashboard,
  FileOutput,
  Table2,
  Grid,
  List,
  FileType,
  Columns
} from 'lucide-react';

// ==================== انواع داده‌ها ====================

// نوع همگام‌سازی
type SyncMode = 'manual' | 'automatic' | 'conditional';

// عملگرهای شرطی
type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'greater_than' 
  | 'less_than' 
  | 'contains' 
  | 'between' 
  | 'is_empty' 
  | 'is_not_empty';

// عملگر منطقی
type LogicalOperator = 'AND' | 'OR';

// نوع احراز هویت
type AuthType = 'none' | 'bearer' | 'basic' | 'api_key';

// نوع اتصال برنامه
type AppType = 'finops' | 'powerbi' | 'excel' | 'custom';

// وضعیت اتصال
type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending' | 'syncing';

// نوع دسترسی خارجی
type AccessType = 'database' | 'api' | 'view' | 'stored_procedure';

// سطح دسترسی
type PermissionLevel = 'read' | 'write' | 'admin';

// حالت نمایش داده
type ViewMode = 'database' | 'pages';

// صفحه برنامه
interface AppPage {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  fields: string[];
  lastAccess?: string;
  recordCount?: number;
}

// شرط همگام‌سازی
interface SyncCondition {
  id: string;
  name: string;
  field: string;
  operator: ConditionOperator;
  value: string;
  value2?: string;
  active: boolean;
  logicalOperator?: LogicalOperator;
}

// API خارجی
interface ExternalApi {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  enabled: boolean;
  lastSync: string | null;
  authType: AuthType;
  timeout: number;
  retryAttempts: number;
  headers?: Record<string, string>;
}

// برنامه متصل
interface AppConnection {
  id: string;
  name: string;
  type: AppType;
  enabled: boolean;
  status: ConnectionStatus;
  lastSync: string | null;
  lastSyncDuration?: number;
  recordCount?: number;
  config: Record<string, any>;
  icon: React.ReactNode;
  color: string;
  description: string;
  pages?: AppPage[];
}

// تنظیمات همگام‌سازی
interface SyncSettings {
  mode: SyncMode;
  schedule?: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    timezone: string;
  };
  conditions: SyncCondition[];
  conditionsLogic: LogicalOperator;
  retryOnFailure: boolean;
  retryAttempts: number;
  retryDelay: number;
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    onWarning: boolean;
    email: string;
    webhook?: string;
  };
  dataTransformation: {
    enabled: boolean;
    rules: Array<{
      id: string;
      sourceField: string;
      targetField: string;
      transformation: 'none' | 'uppercase' | 'lowercase' | 'trim' | 'date_format' | 'number_format';
      format?: string;
    }>;
  };
}

// اعتبارنامه اتصال
interface AccessCredential {
  id: string;
  name: string;
  type: AccessType;
  application: AppType;
  connectionString?: string;
  apiKey?: string;
  token?: string;
  expiresAt?: string;
  permissions: PermissionLevel;
  tables?: string[];
  fields?: string[];
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
}

// لاگ همگام‌سازی
interface SyncLog {
  id: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
  source: string;
  target: string;
  message: string;
  details?: string;
  recordsProcessed?: number;
  duration?: number;
}

// داده نمونه برای نمایش در حالت دیتابیس
interface DatabaseRow {
  id: number;
  [key: string]: any;
}

// پراپرتی‌های کامپوننت
interface IntegrationHubProps {
  settings: any;
  setSettings: (settings: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  formatPersianDate: (date: Date) => string;
}

// ==================== کامپوننت‌های کمکی ====================

// کامپوننت تولید کننده آیکون برنامه
const AppIcon: React.FC<{ type: string; className?: string; size?: number }> = ({ type, className = "", size = 24 }) => {
  const iconProps = { className, size };
  
  switch (type) {
    case 'finops':
      return <DatabaseZap {...iconProps} />;
    case 'powerbi':
      return <BarChart {...iconProps} />;
    case 'excel':
      return <FileSpreadsheet {...iconProps} />;
    case 'custom':
      return <Code2 {...iconProps} />;
    default:
      return <Globe {...iconProps} />;
  }
};

// کامپوننت نشانگر وضعیت با طراحی حرفه‌ای
const StatusBadge: React.FC<{
  status: ConnectionStatus;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}> = ({ status, size = 'md', animate = false }) => {
  const config: Record<ConnectionStatus, { 
    color: string; 
    icon: React.ElementType; 
    label: string;
    bgColor: string;
    borderColor: string;
  }> = {
    connected: { 
      color: 'text-emerald-700', 
      bgColor: 'bg-emerald-50', 
      borderColor: 'border-emerald-200',
      icon: CheckCircle, 
      label: 'متصل' 
    },
    disconnected: { 
      color: 'text-gray-600', 
      bgColor: 'bg-gray-50', 
      borderColor: 'border-gray-200',
      icon: WifiOff, 
      label: 'قطع شده' 
    },
    error: { 
      color: 'text-red-700', 
      bgColor: 'bg-red-50', 
      borderColor: 'border-red-200',
      icon: AlertCircle, 
      label: 'خطا' 
    },
    pending: { 
      color: 'text-amber-700', 
      bgColor: 'bg-amber-50', 
      borderColor: 'border-amber-200',
      icon: Clock4, 
      label: 'در انتظار' 
    },
    syncing: { 
      color: 'text-blue-700', 
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-200',
      icon: RefreshCw, 
      label: 'در حال همگام‌سازی' 
    }
  };

  const { color, icon: Icon, label, bgColor, borderColor } = config[status];
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const spinClass = animate && status === 'syncing' ? 'animate-spin' : '';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${color} ${bgColor} ${borderColor} ${sizeClasses[size]}`}>
      <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} className={spinClass} />
      {label}
    </span>
  );
};

// کامپوننت راهنمای ابزار پیشرفته
const AdvancedTooltip: React.FC<{
  title: string;
  text: string;
  children: React.ReactNode;
}> = ({ title, text, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="relative inline-block" 
      onMouseEnter={() => setIsOpen(true)} 
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}
      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 p-4 bg-slate-900 text-white text-sm rounded-xl shadow-2xl animate-fadeIn">
          <div className="font-semibold mb-2 text-slate-100 flex items-center gap-2">
            <HelpCircle size={14} />
            {title}
          </div>
          <div className="text-slate-300 leading-relaxed">{text}</div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
        </div>
      )}
    </div>
  );
};

// کامپوننت کارت تنظیمات پیشرفته
const SettingsCard: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  onToggle?: (enabled: boolean) => void;
  enabled?: boolean;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  headerActions?: React.ReactNode;
  variant?: 'default' | 'warning' | 'success' | 'danger';
  tooltip?: { title: string; text: string };
}> = ({
  title,
  subtitle,
  icon,
  badge,
  onToggle,
  enabled = true,
  children,
  className = "",
  collapsible = false,
  defaultOpen = true,
  headerActions,
  variant = 'default',
  tooltip
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantStyles = {
    default: 'bg-white border-slate-200',
    warning: 'bg-amber-50 border-amber-200',
    success: 'bg-emerald-50 border-emerald-200',
    danger: 'bg-red-50 border-red-200'
  };

  const iconVariantStyles = {
    default: 'bg-blue-50 text-blue-600',
    warning: 'bg-amber-100 text-amber-600',
    success: 'bg-emerald-100 text-emerald-600',
    danger: 'bg-red-100 text-red-600'
  };

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg ${variantStyles[variant]} ${className}`}>
      <div className={`px-6 py-4 border-b border-slate-100/50 ${
        variant === 'default' ? 'bg-gradient-to-r from-slate-50 to-white' : ''
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${iconVariantStyles[variant]}`}>
              {icon}
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">{title}</h3>
              {tooltip && (
                <AdvancedTooltip title={tooltip.title} text={tooltip.text}>
                  <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
                </AdvancedTooltip>
              )}
            </div>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {headerActions}
            {badge}
            {onToggle && (
              <button
                onClick={() => onToggle(!enabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${
                  enabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                title={enabled ? 'غیرفعال کردن' : 'فعال کردن'}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            )}
            {collapsible && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-slate-100/80 transition-colors"
              >
                {isOpen ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
              </button>
            )}
          </div>
        </div>
      </div>
      {(enabled || !collapsible) && (
        <div className={`transition-all duration-500 ease-in-out ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className="p-6 space-y-6">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// کامپوننت انتخابگر حالت همگام‌سازی
const SyncModeSelector: React.FC<{
  mode: SyncMode;
  onChange: (mode: SyncMode) => void;
}> = ({ mode, onChange }) => {
  const modes = [
    {
      id: 'manual' as const,
      icon: RefreshCw,
      title: 'دستی',
      description: 'همگام‌سازی با کلیک روی دکمه انجام می‌شود',
      color: 'blue',
      features: ['کنترل کامل', 'بدون محدودیت زمانی', 'بررسی قبل از ارسال'],
      tooltip: {
        title: 'همگام‌سازی دستی',
        text: 'در این حالت، شما کنترل کامل بر فرآیند همگام‌سازی دارید. هر زمان که بخواهید می‌توانید عملیات را آغاز کنید و قبل از ارسال داده‌ها، آن‌ها را بررسی نمایید.'
      }
    },
    {
      id: 'automatic' as const,
      icon: Clock,
      title: 'خودکار',
      description: 'همگام‌سازی در زمان‌های مشخص انجام می‌شود',
      color: 'emerald',
      features: ['اجرای خودکار', 'صرفه‌جویی در زمان', 'برنامه‌ریزی انعطاف‌پذیر'],
      tooltip: {
        title: 'همگام‌سازی خودکار',
        text: 'سیستم به صورت خودکار و بر اساس زمان‌بندی تعیین شده، اقدام به همگام‌سازی داده‌ها می‌کند. این روش برای صرفه‌جویی در زمان و اطمینان از به‌روز بودن مداوم داده‌ها مناسب است.'
      }
    },
    {
      id: 'conditional' as const,
      icon: GitBranch,
      title: 'شرطی',
      description: 'همگام‌سازی بر اساس شرایط خاص انجام می‌شود',
      color: 'violet',
      features: ['فیلتر هوشمند', 'بهینه‌سازی ترافیک', 'شرایط سفارشی'],
      tooltip: {
        title: 'همگام‌سازی شرطی',
        text: 'همگام‌سازی فقط زمانی انجام می‌شود که شرایط مشخص شده برقرار باشند. این روش برای کاهش حجم داده‌های منتقل شده و افزایش کارایی سیستم بسیار مفید است.'
      }
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {modes.map((m) => {
        const Icon = m.icon;
        const isSelected = mode === m.id;
        
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-right group hover:scale-[1.02] ${
              isSelected
                ? `border-${m.color}-500 bg-${m.color}-50/50 shadow-lg`
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className={`absolute top-4 left-4 p-3 rounded-xl transition-all duration-300 ${
              isSelected 
                ? `bg-${m.color}-100 text-${m.color}-600` 
                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
            }`}>
              <Icon size={24} />
            </div>
            {isSelected && (
              <div className="absolute top-3 left-3 p-1 bg-white rounded-full shadow-md -mt-1 -ml-1">
                <Check size={16} className={`text-${m.color}-600`} />
              </div>
            )}
            <div className="mt-12">
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-lg transition-colors ${
                  isSelected ? `text-${m.color}-900` : 'text-slate-900'
                }`}>
                  {m.title}
                </h3>
                <AdvancedTooltip title={m.tooltip.title} text={m.tooltip.text}>
                  <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
                </AdvancedTooltip>
              </div>
              <p className={`text-sm mt-2 transition-colors ${
                isSelected ? `text-${m.color}-600` : 'text-slate-500'
              }`}>
                {m.description}
              </p>
              <div className={`mt-4 flex flex-wrap gap-2 ${
                isSelected ? 'opacity-100' : 'opacity-0'
              } transition-opacity duration-300`}>
                {m.features.map((feature, idx) => (
                  <span key={idx} className={`text-xs px-2.5 py-1 rounded-full bg-${m.color}-100 text-${m.color}-700`}>
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// کامپوننت فیلد ورودی پیشرفته با راهنمای زیر فیلد
const AdvancedInput: React.FC<{
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'number' | 'time' | 'email' | 'url';
  description?: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  tooltip?: { title: string; text: string };
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
}> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  description,
  required,
  error,
  icon,
  tooltip,
  className = "",
  disabled = false,
  readOnly = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500">*</span>}
        {tooltip && (
          <AdvancedTooltip title={tooltip.title} text={tooltip.text}>
            <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
          </AdvancedTooltip>
        )}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-all duration-200 ${
            icon ? 'pr-11' : ''
          } ${
            error
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
              : disabled
                ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-slate-400'
          } focus:outline-none focus:ring-2`}
        />
        {type === 'password' && value && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {/* توضیحات زیر فیلد به صورت کامنت */}
      {description && !error && (
        <p className="text-xs text-slate-500 leading-relaxed">
          {/* {description} */}
        </p>
      )}
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
    </div>
  );
};

// کامپوننت روشن/خاموش با راهنما
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  tooltip?: { title: string; text: string };
  disabled?: boolean;
}> = ({ checked, onChange, label, description, tooltip, disabled = false }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${checked ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
          {checked ? <CheckCircle size={18} /> : <XCircle size={18} />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">{label}</span>
            {tooltip && (
              <AdvancedTooltip title={tooltip.title} text={tooltip.text}>
                <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
              </AdvancedTooltip>
            )}
          </div>
          {/* توضیحات زیر فیلد به صورت کامنت */}
          {/* {description && <div className="text-sm text-slate-500 mt-0.5">{description}</div>} */}
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${
          checked ? 'bg-emerald-500' : 'bg-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
};

// کامپوننت انتخابگر صفحه با چک‌باکس
const PageSelector: React.FC<{
  page: AppPage;
  appType: string;
  onToggle: (appType: string, pageId: string, enabled: boolean) => void;
}> = ({ page, appType, onToggle }) => {
  return (
    <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
      page.enabled 
        ? 'border-blue-500 bg-blue-50/50' 
        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
    }`}>
      <input 
        type="checkbox" 
        checked={page.enabled}
        onChange={(e) => onToggle(appType, page.id, e.target.checked)}
        className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
      />
      <div className={`p-2.5 rounded-lg ${page.enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
        <LayoutDashboard size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{page.name}</span>
          <AdvancedTooltip title={page.name} text={page.description}>
            <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
          </AdvancedTooltip>
        </div>
        {/* توضیحات زیر فیلد به صورت کامنت */}
        {/* <p className="text-xs text-slate-500 mt-1">{page.description}</p> */}
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs text-slate-500">
            {/* {page.fields.length} فیلد */}
          </span>
          {page.recordCount !== undefined && (
            <span className="text-xs text-slate-500">
              {/* {page.recordCount.toLocaleString()} رکورد */}
            </span>
          )}
        </div>
      </div>
      <div className={`w-3 h-3 rounded-full ${page.enabled ? 'bg-blue-500' : 'bg-slate-300'}`} />
    </label>
  );
};

// کامپوننت جدول دیتابیس (حالت نمایش اکسل)
const DatabaseTable: React.FC<{
  columns: string[];
  data: DatabaseRow[];
  appType: string;
}> = ({ columns, data, appType }) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleRow = (id: number) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleAllRows = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map(row => row.id));
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-right">
                <input 
                  type="checkbox"
                  checked={selectedRows.length === data.length && data.length > 0}
                  onChange={toggleAllRows}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">ردیف</th>
              {columns.map((col, idx) => (
                <th 
                  key={idx}
                  className="px-4 py-3 text-right font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-2">
                    {/* {col} */}
                    {sortColumn === col && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((row) => (
              <tr 
                key={row.id} 
                className={`hover:bg-slate-50 transition-colors ${
                  selectedRows.includes(row.id) ? 'bg-blue-50/50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <input 
                    type="checkbox"
                    checked={selectedRows.includes(row.id)}
                    onChange={() => toggleRow(row.id)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-slate-600">{row.id}</td>
                {columns.map((col, idx) => (
                  <td key={idx} className="px-4 py-3 text-slate-700">
                    {/* {row[col] || '-'} */}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <span className="text-sm text-slate-600">
          {/* نمایش {data.length} ردیف از {data.length} رکورد */}
        </span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            قبلی
          </button>
          <span className="px-3 py-1.5 text-sm text-slate-900 font-medium">
            {/* صفحه 1 از 1 */}
          </span>
          <button className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            بعدی
          </button>
        </div>
      </div>
    </div>
  );
};

// کامپوننت انتخابگر حالت نمایش
const ViewModeSelector: React.FC<{
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}> = ({ mode, onChange }) => {
  return (
    <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
      <button
        onClick={() => onChange('database')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === 'database' 
            ? 'bg-white text-blue-700 shadow-sm' 
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Database size={18} />
        {/* حالت دیتابیس */}
      </button>
      <button
        onClick={() => onChange('pages')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === 'pages' 
            ? 'bg-white text-blue-700 shadow-sm' 
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <LayoutDashboard size={18} />
        {/* حالت صفحات */}
      </button>
    </div>
  );
};

// کامپوننت کارت برنامه خارجی
const ExternalAppCard: React.FC<{
  app: AppConnection;
  onConfigure: () => void;
  onTest: () => void;
  onDisconnect: () => void;
}> = ({ app, onConfigure, onTest, onDisconnect }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md"
            style={{ backgroundColor: `${app.color}15`, color: app.color }}
          >
            {app.icon}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{app.name}</h3>
            <p className="text-sm text-slate-500 mt-1">{app.description}</p>
          </div>
        </div>
        <StatusBadge status={app.status} size="sm" />
      </div>
      
      {app.status === 'connected' && (
        <div className="grid grid-cols-3 gap-4 mb-5 p-4 bg-slate-50 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">آخرین همگام‌سازی</div>
            <div className="text-sm font-semibold text-slate-700">
              {/* {app.lastSync ? '۲ ساعت پیش' : '---'} */}
            </div>
          </div>
          <div className="text-center border-l border-slate-200">
            <div className="text-xs text-slate-500 mb-1">رکوردها</div>
            <div className="text-sm font-semibold text-slate-700">{app.recordCount || 0}</div>
          </div>
          <div className="text-center border-l border-slate-200">
            <div className="text-xs text-slate-500 mb-1">مدت زمان</div>
            <div className="text-sm font-semibold text-slate-700">{app.lastSyncDuration || 0}ث</div>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <button
          onClick={onConfigure}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Settings size={16} />
          پیکربندی
        </button>
        {app.status === 'connected' ? (
          <button
            onClick={onTest}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <TestTube size={16} />
            تست
          </button>
        ) : (
          <button
            onClick={onDisconnect}
            className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            <Link2 size={16} />
            اتصال
          </button>
        )}
      </div>
    </div>
  );
};

// کامپوننت انتخاب آیتم با راهنما
const SelectableItem: React.FC<{
  icon: React.ElementType;
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  color: string;
  tooltip?: { title: string; text: string };
}> = ({ icon: Icon, label, description, selected, onClick, color, tooltip }) => {
  return (
    <label 
      onClick={onClick}
      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
        selected 
          ? `border-${color}-500 bg-${color}-50` 
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <input 
        type="radio" 
        name="permission" 
        checked={selected} 
        onChange={onClick}
        className="hidden" 
      />
      <div className={`p-2.5 rounded-lg ${selected ? `bg-${color}-100 text-${color}-600` : 'bg-slate-100 text-slate-500'}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">{label}</span>
          {tooltip && (
            <AdvancedTooltip title={tooltip.title} text={tooltip.text}>
              <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
            </AdvancedTooltip>
          )}
        </div>
        {/* توضیحات زیر فیلد به صورت کامنت */}
        {/* {description && <div className="text-xs text-slate-500 mt-1">{description}</div>} */}
      </div>
      {selected && <CheckCircle size={20} className={`text-${color}-600`} />}
    </label>
  );
};

// کامپوننت کپی در کلیپ‌بورد
const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label = 'کپی' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        copied 
          ? 'bg-emerald-100 text-emerald-700' 
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
      title={label}
    >
      {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
      {copied ? 'کپی شد' : label}
    </button>
  );
};

// کامپوننت فرم شرط
const ConditionForm: React.FC<{
  condition: SyncCondition;
  index: number;
  onChange: (condition: SyncCondition) => void;
  onRemove: () => void;
  isFirst: boolean;
  total: number;
}> = ({ condition, index, onChange, onRemove, isFirst, total }) => {
  const operators = [
    { value: 'equals', label: 'مساوی' },
    { value: 'not_equals', label: 'مساوی نیست' },
    { value: 'greater_than', label: 'بزرگتر از' },
    { value: 'less_than', label: 'کوچکتر از' },
    { value: 'contains', label: 'شامل' },
    { value: 'between', label: 'بین' },
    { value: 'is_empty', label: 'خالی است' },
    { value: 'is_not_empty', label: 'خالی نیست' }
  ];

  const fields = [
    { value: 'amount', label: 'مبلغ' },
    { value: 'quantity', label: 'تعداد' },
    { value: 'status', label: 'وضعیت' },
    { value: 'date', label: 'تاریخ' },
    { value: 'customer', label: 'مشتری' },
    { value: 'product', label: 'محصول' },
    { value: 'region', label: 'منطقه' },
    { value: 'category', label: 'دسته‌بندی' }
  ];

  return (
    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 hover:border-blue-200 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold flex items-center justify-center shadow-md">
            {index + 1}
          </span>
          <input
            type="text"
            value={condition.name}
            onChange={(e) => onChange({ ...condition, name: e.target.value })}
            placeholder="نام شرط"
            className="text-sm font-semibold text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-2 py-1 min-w-[150px]"
          />
        </div>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <select
              value={condition.logicalOperator || 'AND'}
              onChange={(e) => onChange({ ...condition, logicalOperator: e.target.value as LogicalOperator })}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          )}
          <button
            onClick={onRemove}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="حذف شرط"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
            فیلد
            <AdvancedTooltip title="فیلد داده" text="فیلدی از داده‌ها را که می‌خواهید بر اساس آن شرط تعیین کنید، انتخاب نمایید.">
              <HelpCircle size={12} className="text-slate-400 hover:text-slate-600 cursor-help" />
            </AdvancedTooltip>
          </label>
          {/* توضیحات زیر فیلد به صورت کامنت */}
          {/* <p className="text-xs text-slate-400 mb-2">فیلد مورد نظر را برای اعمال شرط انتخاب کنید</p> */}
          <select
            value={condition.field}
            onChange={(e) => onChange({ ...condition, field: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {fields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
            عملگر
            <AdvancedTooltip title="عملگر مقایسه" text="عملگری را که برای مقایسه مقدار با فیلد انتخاب شده استفاده می‌شود، تعیین کنید.">
              <HelpCircle size={12} className="text-slate-400 hover:text-slate-600 cursor-help" />
            </AdvancedTooltip>
          </label>
          {/* توضیحات زیر فیلد به صورت کامنت */}
          {/* <p className="text-xs text-slate-400 mb-2">نحوه مقایسه را انتخاب کنید</p> */}
          <select
            value={condition.operator}
            onChange={(e) => onChange({ ...condition, operator: e.target.value as ConditionOperator })}
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
          </select>
        </div>
        
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
            مقدار
            <AdvancedTooltip title="مقدار شرط" text="مقداری را که می‌خواهید فیلد انتخاب شده با آن مقایسه شود، وارد نمایید.">
              <HelpCircle size={12} className="text-slate-400 hover:text-slate-600 cursor-help" />
            </AdvancedTooltip>
          </label>
          {/* توضیحات زیر فیلد به صورت کامنت */}
          {/* <p className="text-xs text-slate-400 mb-2">مقدار مورد نظر برای مقایسه را وارد کنید</p> */}
          {['is_empty', 'is_not_empty'].includes(condition.operator) ? (
            <input
              type="text"
              value="(بدون مقدار)"
              disabled
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
            />
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={condition.value}
                onChange={(e) => onChange({ ...condition, value: e.target.value })}
                placeholder="مقدار"
                className="flex-1 px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {condition.operator === 'between' && (
                <input
                  type="text"
                  value={condition.value2 || ''}
                  onChange={(e) => onChange({ ...condition, value2: e.target.value })}
                  placeholder="تا"
                  className="w-28 px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// کامپوننت نمایش رشته اتصال
const ConnectionStringDisplay: React.FC<{
  label: string;
  value: string;
  masked?: boolean;
  onReveal?: () => void;
  showReveal?: boolean;
  tooltip?: { title: string; text: string };
}> = ({ label, value, masked = true, onReveal, showReveal = true, tooltip }) => {
  const [isMasked, setIsMasked] = useState(masked);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {label}
        {tooltip && (
          <AdvancedTooltip title={tooltip.title} text={tooltip.text}>
            <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
          </AdvancedTooltip>
        )}
        {showReveal && onReveal && (
          <button
            onClick={() => {
              setIsMasked(!isMasked);
              onReveal();
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isMasked ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
      </label>
      <div className="relative">
        <input
          type={isMasked ? 'password' : 'text'}
          value={isMasked ? '••••••••••••••••••••••••••••••' : value}
          readOnly
          className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-slate-50 font-mono text-slate-700"
        />
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
          <CopyButton text={value} />
        </div>
      </div>
    </div>
  );
};

// ==================== کامپوننت اصلی ====================

export const SyncSettings: React.FC<IntegrationHubProps> = ({
  settings,
  setSettings,
  isLoading,
  setIsLoading,
  formatPersianDate
}) => {
  // وضعیت‌های محلی
  const [activeTab, setActiveTab] = useState<'general' | 'connections' | 'access' | 'logs'>('general');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotification, setShowNotification] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedAccessType, setSelectedAccessType] = useState<AccessType | null>(null);
  const [generatingCredentials, setGeneratingCredentials] = useState(false);
  // حالت نمایش: دیتابیس یا صفحات
  const [viewMode, setViewMode] = useState<ViewMode>('database');
  // صفحات انتخاب شده برای هر برنامه
  const [selectedPages, setSelectedPages] = useState<Record<string, string[]>>({
    finops: [],
    powerbi: [],
    excel: []
  });
  
  // وضعیت تست اتصال
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // وضعیت فیلدهای اتصال
  const [connectionSettings, setConnectionSettings] = useState({
    // Finance and Operations
    finopsServer: '',
    finopsPort: '443',
    finopsUsername: '',
    finopsPassword: '',
    finopsClientId: '',
    finopsClientSecret: '',
    finopsTenantId: '',
    // Power BI
    powerbiServer: '',
    powerbiPort: '443',
    powerbiUsername: '',
    powerbiPassword: '',
    powerbiClientId: '',
    powerbiClientSecret: '',
    powerbiTenantId: '',
    // Excel
    excelServer: '',
    excelPort: '443',
    excelUsername: '',
    excelPassword: '',
    excelClientId: '',
    excelClientSecret: '',
    excelTenantId: '',
    // تنظیمات API
    apiEndpoint: '',
    apiKey: '',
    apiTimeout: '30',
    apiRetryAttempts: '3',
  });
  
  // وضعیت فیلدهای دسترسی خارجی
  const [accessSettings, setAccessSettings] = useState({
    accessServer: '',
    accessPort: '443',
    accessUsername: '',
    accessPassword: '',
    accessClientId: '',
    accessClientSecret: '',
    accessTenantId: '',
    accessPages: [] as string[],
    accessExpiry: '30',
    selectedApp: 'finops',
  });

  // refs for auto-hide notifications
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // تابع نمایش اعلان با مدیریت تایمر
  const showToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setShowNotification({ type, message });
    notificationTimerRef.current = setTimeout(() => setShowNotification(null), 4000);
  }, []);

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  // تابع تست اتصال
  const testConnection = useCallback(async (service: string) => {
    setTestingConnection(true);
    setTestResult(null);
    setIsLoading(true);
    try {
      // شبیه‌سازی تست اتصال
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // بررسی اینکه فیلدهای ضروری پر شده باشند
      const hasRequiredFields = connectionSettings.finopsServer.trim() !== '' || 
                                connectionSettings.finopsClientId.trim() !== '' ||
                                connectionSettings.finopsTenantId.trim() !== '';
      
      if (hasRequiredFields) {
        setTestResult({
          success: true,
          message: `اتصال به ${service} با موفقیت برقرار شد. تمام تنظیمات معتبر هستند.`
        });
        showToast('success', `اتصال به ${service} با موفقیت برقرار شد`);
      } else {
        setTestResult({
          success: false,
          message: `لطفاً اطلاعات اتصال را کامل وارد نمایید.`
        });
        showToast('warning', `لطفاً اطلاعات اتصال را کامل نمایید`);
      }
    } catch {
      setTestResult({
        success: false,
        message: `خطا در اتصال به ${service}. لطفاً تنظیمات را بررسی کنید.`
      });
      showToast('error', `خطا در اتصال به ${service}`);
    } finally {
      setTestingConnection(false);
      setIsLoading(false);
    }
  }, [setIsLoading, showToast, connectionSettings]);

  // تابع ذخیره اتصال
  const saveConnection = useCallback(() => {
    setIsLoading(true);
    try {
      // بررسی اینکه فیلدهای ضروری پر شده باشند
      const hasRequiredFields = connectionSettings.finopsServer.trim() !== '' && 
                                connectionSettings.finopsClientId.trim() !== '' &&
                                connectionSettings.finopsTenantId.trim() !== '';
      
      if (hasRequiredFields) {
        // ذخیره تنظیمات در localStorage یا ارسال به سرور
        localStorage.setItem('connectionSettings', JSON.stringify(connectionSettings));
        showToast('success', 'تنظیمات اتصال با موفقیت ذخیره شد');
      } else {
        showToast('warning', 'لطفاً تمام فیلدهای ضروری را پر نمایید');
      }
    } catch {
      showToast('error', 'خطا در ذخیره تنظیمات');
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, showToast, connectionSettings]);

  // تابع اجرای همگام‌سازی
  const performSync = useCallback(async () => {
    setIsLoading(true);
    setSettings(prev => ({
      ...prev,
      sync: {
        ...prev.sync,
        syncStatus: 'syncing',
        lastSyncTime: null
      }
    }));

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      setSettings(prev => ({
        ...prev,
        sync: {
          ...prev.sync,
          syncStatus: 'success',
          lastSyncTime: new Date().toISOString()
        }
      }));
      showToast('success', 'همگام‌سازی با موفقیت انجام شد');
    } catch (error) {
      setSettings(prev => ({
        ...prev,
        sync: {
          ...prev.sync,
          syncStatus: 'error'
        }
      }));
      showToast('error', 'خطا در انجام همگام‌سازی');
    } finally {
      setIsLoading(false);
    }
  }, [setSettings, setIsLoading, showToast]);

  // تابع افزودن شرط جدید
  const addCondition = useCallback(() => {
    const newCondition: SyncCondition = {
      id: `cond_${Date.now()}`,
      name: `شرط جدید ${(settings.sync?.conditions?.length || 0) + 1}`,
      field: 'amount',
      operator: 'greater_than',
      value: '',
      active: true
    };

    setSettings(prev => ({
      ...prev,
      sync: {
        ...prev.sync,
        conditions: [...(prev.sync?.conditions || []), newCondition]
      }
    }));
  }, [settings.sync?.conditions, setSettings]);

  // تابع به‌روزرسانی شرط
  const updateCondition = useCallback((index: number, condition: SyncCondition) => {
    setSettings(prev => ({
      ...prev,
      sync: {
        ...prev.sync,
        conditions: (prev.sync?.conditions || []).map((c: SyncCondition, i: number) => 
          i === index ? condition : c
        )
      }
    }));
  }, [setSettings]);

  // تابع حذف شرط
  const removeCondition = useCallback((index: number) => {
    setSettings(prev => ({
      ...prev,
      sync: {
        ...prev.sync,
        conditions: (prev.sync?.conditions || []).filter((_: SyncCondition, i: number) => i !== index)
      }
    }));
  }, [setSettings]);

  // تابع تولید اعتبارنامه دسترسی
  const generateCredentials = useCallback(async (type: AccessType) => {
    setGeneratingCredentials(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newCredential: AccessCredential = {
        id: `cred_${Date.now()}`,
        name: `${type.toUpperCase()} Access`,
        type,
        application: 'finops',
        connectionString: type === 'database' 
          ? `Server=tcp:syncalize.database.windows.net,1433;Database=SyncSettings_DB;User ID=sa_syncalize;Password=GeneratedP@ss123;Encrypt=true;Connection Timeout=30;`
          : undefined,
        apiKey: type === 'api'
          ? `sk-${Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('')}`
          : undefined,
        token: type === 'view'
          ? `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ type, exp: Date.now() + 86400000 }))}`
          : undefined,
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
        permissions: 'read',
        tables: ['Products', 'Customers', 'Transactions', 'Inventory'],
        createdAt: new Date().toISOString(),
        isActive: true
      };

      setSettings(prev => ({
        ...prev,
        sync: {
          ...prev.sync,
          accessCredentials: [...(prev.sync?.accessCredentials || []), newCredential]
        }
      }));

      showToast('success', `اعتبارنامه ${type} با موفقیت تولید شد`);
      setShowAccessModal(false);
    } catch {
      showToast('error', 'خطا در تولید اعتبارنامه');
    } finally {
      setGeneratingCredentials(false);
    }
  }, [setSettings, showToast]);

  // تابع کپی در کلیپ‌بورد
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', 'در کلیپ‌بورد کپی شد');
  }, [showToast]);

  // تابع تغییر وضعیت صفحه
  const togglePage = useCallback((appType: string, pageId: string, enabled: boolean) => {
    setSelectedPages(prev => {
      const appPages = prev[appType] || [];
      if (enabled) {
        return {
          ...prev,
          [appType]: [...appPages, pageId]
        };
      } else {
        return {
          ...prev,
          [appType]: appPages.filter(id => id !== pageId)
        };
      }
    });
  }, []);

  // صفحات پیش‌فرض برای هر برنامه
  const defaultPages: Record<string, AppPage[]> = {
    finops: [
      { id: 'customers', name: 'مشتریان', description: 'لیست مشتریان و اطلاعات تماس', enabled: true, fields: ['نام', 'ایمیل', 'تلفن', 'آدرس'], recordCount: 1250 },
      { id: 'products', name: 'محصولات', description: 'لیست محصولات و قیمت‌ها', enabled: true, fields: ['نام', 'قیمت', 'موجودی', 'دسته‌بندی'], recordCount: 450 },
      { id: 'orders', name: 'سفارشات', description: 'سفارشات مشتریان', enabled: false, fields: ['شماره', 'تاریخ', 'مبلغ', 'وضعیت'], recordCount: 3200 },
      { id: 'invoices', name: 'فاکتورها', description: 'فاکتورهای صادر شده', enabled: false, fields: ['شماره', 'تاریخ', 'مبلغ', 'مشتری'], recordCount: 890 },
      { id: 'inventory', name: 'انبار', description: 'موجودی انبار', enabled: false, fields: ['محصول', 'تعداد', 'محل', 'وضعیت'], recordCount: 780 }
    ],
    powerbi: [
      { id: 'dashboards', name: 'داشبوردها', description: 'داشبوردهای گزارش‌گیری', enabled: true, fields: ['نام', 'نوع', 'تاریخ', 'وضعیت'], recordCount: 25 },
      { id: 'reports', name: 'گزارش‌ها', description: 'گزارش‌های تحلیلی', enabled: true, fields: ['نام', 'دسته‌بندی', 'فرمت', 'اندازه'], recordCount: 156 },
      { id: 'datasets', name: 'مجموعه داده', description: 'مجموعه داده‌های Power BI', enabled: false, fields: ['نام', 'منبع', 'اندازه', 'تازگی'], recordCount: 45 },
      { id: 'workspaces', name: 'فضاهای کاری', description: 'فضاهای کاری Power BI', enabled: false, fields: ['نام', 'تعداد اعضا', 'سطح دسترسی'], recordCount: 12 }
    ],
    excel: [
      { id: 'sheets', name: 'صفحه‌ها', description: 'صفحه‌های اکسل', enabled: true, fields: ['نام', 'تعداد سطر', 'تعداد ستون', 'فرمت'], recordCount: 89 },
      { id: 'pivot', name: 'جداول محوری', description: 'جداول محوری اکسل', enabled: false, fields: ['نام', 'منبع', 'اندازه', 'فیلترها'], recordCount: 34 },
      { id: 'charts', name: 'نمودارها', description: 'نمودارهای اکسل', enabled: false, fields: ['نام', 'نوع', 'منبع داده'], recordCount: 67 }
    ]
  };

  // داده‌های نمونه برای جدول دیتابیس
  const sampleDatabaseData: DatabaseRow[] = [
    { id: 1, customer: 'شرکت آلفا', product: 'محصول A', amount: 1500000, status: 'تکمیل شده', date: '1404/09/01' },
    { id: 2, customer: 'شرکت بتا', product: 'محصول B', amount: 2300000, status: 'در حال بررسی', date: '1404/09/02' },
    { id: 3, customer: 'شرکت گاما', product: 'محصول A', amount: 850000, status: 'تکمیل شده', date: '1404/09/03' },
    { id: 4, customer: 'شرکت دلتا', product: 'محصول C', amount: 3200000, status: 'لغو شده', date: '1404/09/04' },
    { id: 5, customer: 'شرکت اتا', product: 'محصول B', amount: 1750000, status: 'تکمیل شده', date: '1404/09/05' }
  ];

  const databaseColumns = ['customer', 'product', 'amount', 'status', 'date'];

  // آیتم‌های نوار کناری
  const sidebarItems = [
    { id: 'general', icon: Settings2, label: 'تنظیمات عمومی', badge: null },
    { id: 'connections', icon: Network, label: 'اتصال به مایکروسافت', badge: null },
    { id: 'access', icon: KeyRound, label: 'دسترسی‌های خارجی', badge: null },
    { id: 'logs', icon: FileText, label: 'تاریخچه و لاگ‌ها', badge: null }
  ];

  // برنامه‌های متصل
  const connectedApps: AppConnection[] = [
    {
      id: 'finops',
      name: 'Microsoft Finance and Operations',
      type: 'finops',
      enabled: settings.sync?.microsoftFinanceOps?.enabled || false,
      status: settings.sync?.microsoftFinanceOps?.enabled ? 'connected' : 'disconnected',
      lastSync: settings.sync?.microsoftFinanceOps?.lastSync,
      recordCount: 15234,
      lastSyncDuration: 45,
      config: settings.sync?.microsoftFinanceOps || {},
      icon: <DatabaseZap size={24} />,
      color: '#0078D4',
      description: 'یکپارچه‌سازی با Dynamics 365 F&O',
      pages: defaultPages.finops
    },
    {
      id: 'powerbi',
      name: 'Microsoft Power BI',
      type: 'powerbi',
      enabled: settings.sync?.powerBI?.enabled || false,
      status: settings.sync?.powerBI?.enabled ? 'connected' : 'disconnected',
      lastSync: settings.sync?.powerBI?.lastSync,
      recordCount: 8934,
      lastSyncDuration: 23,
      config: settings.sync?.powerBI || {},
      icon: <BarChart size={24} />,
      color: '#F2C811',
      description: 'تحلیل داده‌ها با Power BI',
      pages: defaultPages.powerbi
    },
    {
      id: 'excel',
      name: 'Microsoft Excel',
      type: 'excel',
      enabled: true,
      status: 'connected',
      lastSync: settings.sync?.lastSyncTime,
      recordCount: 2567,
      lastSyncDuration: 12,
      config: { exportPath: settings.sync?.excelExportPath },
      icon: <FileSpreadsheet size={24} />,
      color: '#217346',
      description: 'گزارش‌گیری و اکسل',
      pages: defaultPages.excel
    }
  ];

  // رندر کردن تب فعال
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'connections':
        return renderConnectionsTab();
      case 'access':
        return renderAccessTab();
      case 'logs':
        return renderLogsTab();
      default:
        return null;
    }
  };

  // تب تنظیمات عمومی
  const renderGeneralTab = () => (
    <div className="space-y-8">
      {/* تنظیمات حالت همگام‌سازی */}
      <SettingsCard
        title="حالت همگام‌سازی"
        subtitle="انتخاب روش همگام‌سازی داده‌ها"
        icon={<RefreshCw size={20} />}
        collapsible
        defaultOpen
        tooltip={{
          title: 'انتخاب حالت همگام‌سازی',
          text: 'سه حالت مختلف برای همگام‌سازی داده‌ها وجود دارد: دستی، خودکار و شرطی. هر کدام مزایای خاص خود را دارند و بسته به نیاز خود می‌توانید یکی را انتخاب کنید.'
        }}
      >
        <SyncModeSelector
          mode={settings.sync?.mode || 'manual'}
          onChange={(mode) => setSettings(prev => ({
            ...prev,
            sync: { ...prev.sync, mode }
          }))}
        />

        {/* تنظیمات حالت خودکار */}
        {settings.sync?.mode === 'automatic' && (
          <div className="mt-8 p-6 bg-emerald-50 rounded-xl border border-emerald-200 animate-fadeIn">
            <h4 className="font-semibold text-emerald-900 mb-5 flex items-center gap-2">
              <Clock size={20} />
              زمان‌بندی همگام‌سازی خودکار
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AdvancedInput
                label="تناوب اجرا"
                value={settings.sync?.schedule?.frequency || 'daily'}
                onChange={(v) => setSettings(prev => ({
                  ...prev,
                  sync: { ...prev.sync, schedule: { ...prev.sync?.schedule, frequency: v as any } }
                }))}
                type="text"
                placeholder="hourly, daily, weekly, monthly"
                description="تناوب زمانی برای اجرای خودکار همگام‌سازی را مشخص کنید. می‌توانید hourly، daily، weekly یا monthly را انتخاب نمایید."
              />
              <AdvancedInput
                label="زمان اجرا"
                value={settings.sync?.schedule?.time || '00:00'}
                onChange={(v) => setSettings(prev => ({
                  ...prev,
                  sync: { ...prev.sync, schedule: { ...prev.sync?.schedule, time: v } }
                }))}
                type="time"
                description="زمان دقیق اجرای همگام‌سازی خودکار را بر حسب ساعت و دقیقه وارد نمایید."
              />
              <AdvancedInput
                label="منطقه زمانی"
                value={settings.sync?.schedule?.timezone || 'Asia/Tehran'}
                onChange={(v) => setSettings(prev => ({
                  ...prev,
                  sync: { ...prev.sync, schedule: { ...prev.sync?.schedule, timezone: v } }
                }))}
                type="text"
                placeholder="Asia/Tehran"
                description="منطقه زمانی مورد نظر برای زمان‌بندی همگام‌سازی را انتخاب کنید. این تنظیم برای اجرای صحیح در زمان مشخص شده ضروری است."
              />
            </div>
          </div>
        )}

        {/* تنظیمات حالت شرطی */}
        {settings.sync?.mode === 'conditional' && (
          <div className="mt-8 space-y-6 animate-fadeIn">
            <div className="p-6 bg-violet-50 rounded-xl border border-violet-200">
              <div className="flex items-center justify-between mb-5">
                <h4 className="font-semibold text-violet-900 flex items-center gap-2">
                  <GitBranch size={20} />
                  شرایط همگام‌سازی
                </h4>
                <button
                  onClick={addCondition}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  افزودن شرط
                </button>
              </div>

              <div className="space-y-4">
                {settings.sync?.conditions?.length > 0 ? (
                  settings.sync?.conditions.map((condition: SyncCondition, index: number) => (
                    <ConditionForm
                      key={condition.id}
                      condition={condition}
                      index={index}
                      onChange={(c) => updateCondition(index, c)}
                      onRemove={() => removeCondition(index)}
                      isFirst={index === 0}
                      total={settings.sync?.conditions?.length || 0}
                    />
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-500">
                    <GitBranch size={48} className="mx-auto mb-4 text-slate-300" />
                    <p>هیچ شرطی تعریف نشده است</p>
                    <p className="text-sm mt-2">برای افزودن شرط جدید روی دکمه بالا کلیک کنید</p>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-5 border-t border-violet-200">
                <label className="flex items-center gap-2 text-sm font-medium text-violet-700">
                  عملگر منطقی بین شرط‌ها
                  <AdvancedTooltip title="عملگر منطقی" text="عملگر منطقی که برای ترکیب شرط‌ها استفاده می‌شود را مشخص کنید. AND به معنای برقرار بودن همه شرط‌ها و OR به معنای برقرار بودن حداقل یک شرط است.">
                    <HelpCircle size={14} className="text-violet-500 hover:text-violet-700 cursor-help" />
                  </AdvancedTooltip>
                </label>
                {/* توضیحات زیر فیلد به صورت کامنت */}
                {/* <p className="text-xs text-violet-600 mt-1">AND به معنای برقرار بودن همه شرط‌ها و OR به معنای برقرار بودن حداقل یک شرط است.</p> */}
                <div className="flex gap-4 mt-3">
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      sync: { ...prev.sync, conditionsLogic: 'AND' }
                    }))}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                      settings.sync?.conditionsLogic === 'AND'
                        ? 'bg-violet-600 text-white'
                        : 'bg-white text-violet-600 border border-violet-300 hover:bg-violet-50'
                    }`}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      sync: { ...prev.sync, conditionsLogic: 'OR' }
                    }))}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                      settings.sync?.conditionsLogic === 'OR'
                        ? 'bg-violet-600 text-white'
                        : 'bg-white text-violet-600 border border-violet-300 hover:bg-violet-50'
                    }`}
                  >
                    OR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SettingsCard>

      {/* تنظیمات پیشرفته */}
      <SettingsCard
        title="تنظیمات پیشرفته"
        subtitle="گزینه‌های پیشرفته همگام‌سازی"
        icon={<Zap size={20} />}
        collapsible
        defaultOpen={false}
        tooltip={{
          title: 'تنظیمات پیشرفته',
          text: 'تنظیمات پیشرفته شامل گزینه‌هایی برای مدیریت خطا، اعلان‌ها و تبدیل داده‌ها می‌باشد. این تنظیمات برای کاربران پیشرفته توصیه می‌شود.'
        }}
      >
        <div className="space-y-8">
          {/* مدیریت خطا */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <AlertTriangle size={18} />
              مدیریت خطا
            </h4>
            
            <ToggleSwitch
              checked={settings.sync?.retryOnFailure || false}
              onChange={(v) => setSettings(prev => ({
                ...prev,
                sync: { ...prev.sync, retryOnFailure: v }
              }))}
              label="تلاش مجدد در صورت خطا"
              description="در صورت بروز خطا، سیستم به صورت خودکار تلاش مجدد می‌کند"
              tooltip={{
                title: 'تلاش مجدد خودکار',
                text: 'با فعال کردن این گزینه، در صورت بروز خطا در حین همگام‌سازی، سیستم به صورت خودکار تعداد مشخصی تلاش مجدد انجام می‌دهد.'
              }}
            />
            
            {settings.sync?.retryOnFailure && (
              <div className="grid grid-cols-2 gap-6 mt-6 p-5 bg-slate-50 rounded-xl">
                <AdvancedInput
                  label="تعداد تلاش مجدد"
                  value={settings.sync?.retryAttempts || 3}
                  onChange={(v) => setSettings(prev => ({
                    ...prev,
                    sync: { ...prev.sync, retryAttempts: parseInt(v as string) || 3 }
                  }))}
                  type="number"
                  min={1}
                  max={10}
                  description="تعداد دفعاتی که سیستم در صورت بروز خطا، عملیات همگام‌سازی را مجدداً تکرار می‌کند را مشخص کنید. مقدار پیشنهادی بین ۳ تا ۵ بار است."
                />
                <AdvancedInput
                  label="فاصله بین تلاش‌ها (ثانیه)"
                  value={settings.sync?.retryDelay || 5}
                  onChange={(v) => setSettings(prev => ({
                    ...prev,
                    sync: { ...prev.sync, retryDelay: parseInt(v as string) || 5 }
                  }))}
                  type="number"
                  min={1}
                  max={300}
                  description="فاصله زمانی بین هر تلاش مجدد برای همگام‌سازی را بر حسب ثانیه مشخص کنید. مقادیر کمتر برای سیستم‌هایی با اتصال پایدار و مقادیر بیشتر برای سیستم‌های با اتصال ناپایدار مناسب است."
                />
              </div>
            )}
          </div>
          
          {/* اعلان‌ها */}
          <div className="space-y-5">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Bell size={18} />
              اعلان‌ها
            </h4>
            
            <div className="space-y-3">
              {[
                { key: 'onSuccess', label: 'همگام‌سازی موفق', icon: CheckCircle, color: 'emerald', text: 'در صورت موفقیت‌آمیز بودن همگام‌سازی، اعلان دریافت کنید.' },
                { key: 'onFailure', label: 'همگام‌سازی ناموفق', icon: XCircle, color: 'red', text: 'در صورت بروز خطا در همگام‌سازی، اعلان دریافت کنید.' },
                { key: 'onWarning', label: 'هشدار', icon: AlertTriangle, color: 'amber', text: 'در صورت وجود هشدار در حین همگام‌سازی، اعلان دریافت کنید.' }
              ].map(({ key, label, icon: Icon, color, text }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg bg-${color}-100 text-${color}-600`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <span className="text-sm text-slate-700 font-medium">{label}</span>
                      <AdvancedTooltip title={label} text={text}>
                        <HelpCircle size={12} className="inline mr-1 text-slate-400 hover:text-slate-600 cursor-help" />
                      </AdvancedTooltip>
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      sync: {
                        ...prev.sync,
                        notifications: { ...prev.sync?.notifications, [key]: !prev.sync?.notifications?.[key] }
                      }
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.sync?.notifications?.[key] ? `bg-${color}-500` : 'bg-slate-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.sync?.notifications?.[key] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
            
            <AdvancedInput
              label="ایمیل برای اعلان‌ها"
              value={settings.sync?.notifications?.email || ''}
              onChange={(v) => setSettings(prev => ({
                ...prev,
                sync: { ...prev.sync, notifications: { ...prev.sync?.notifications, email: v } }
              }))}
              type="email"
              placeholder="example@company.com"
              description="آدرس ایمیلی که می‌خواهید اعلان‌های همگام‌سازی به آن ارسال شود را وارد کنید. این ایمیل برای ارسال گزارش‌های همگام‌سازی استفاده خواهد شد."
              tooltip={{
                title: 'ایمیل اعلان‌ها',
                text: 'آدرس ایمیلی که می‌خواهید اعلان‌های همگام‌سازی به آن ارسال شود را وارد کنید.'
              }}
            />
          </div>
        </div>
      </SettingsCard>

      {/* دکمه‌های عملیاتی */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex items-center gap-8">
          <div>
            <div className="text-sm text-slate-600 mb-1">آخرین همگام‌سازی</div>
            <div className="font-semibold text-slate-900">
              {settings.sync?.lastSyncTime 
                ? formatPersianDate(new Date(settings.sync.lastSyncTime))
                : 'هنوز انجام نشده'}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${
              settings.sync?.syncStatus === 'success' ? 'bg-emerald-500' :
              settings.sync?.syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
              settings.sync?.syncStatus === 'error' ? 'bg-red-500' :
              'bg-slate-400'
            }`} />
            <span className="text-sm text-slate-600">
              {settings.sync?.syncStatus === 'success' ? 'موفق' :
               settings.sync?.syncStatus === 'syncing' ? 'در حال همگام‌سازی...' :
               settings.sync?.syncStatus === 'error' ? 'خطا' :
               'آماده'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={performSync}
            disabled={isLoading || settings.sync?.syncStatus === 'syncing'}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
          >
            {settings.sync?.syncStatus === 'syncing' ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <Play size={20} />
            )}
            {settings.sync?.syncStatus === 'syncing' ? 'در حال همگام‌سازی...' : 'شروع همگام‌سازی'}
          </button>
        </div>
      </div>
    </div>
  );

  // تب اتصالات مایکروسافت
  const renderConnectionsTab = () => (
    <div className="space-y-8">
      {/* انتخابگر حالت نمایش */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">اتصالات مایکروسافت</h2>
          <p className="text-slate-500 mt-2">اتصال به سرویس‌های مایکروسافت برای همگام‌سازی داده‌ها</p>
        </div>
        <ViewModeSelector mode={viewMode} onChange={setViewMode} />
      </div>

      {/* نتیجه تست اتصال */}
      {testResult && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          testResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
        }`}>
          {testResult.success ? (
            <CheckCircle size={20} className="text-emerald-600" />
          ) : (
            <XCircle size={20} className="text-red-600" />
          )}
          <span className={testResult.success ? 'text-emerald-700' : 'text-red-700'}>
            {testResult.message}
          </span>
        </div>
      )}

      {/* فرم تنظیمات اتصال */}
      <SettingsCard
        title="تنظیمات اتصال"
        subtitle="پیکربندی اتصالات مایکروسافت"
        icon={<Network size={20} />}
        headerActions={
          <button
            onClick={() => testConnection('Microsoft Services')}
            disabled={testingConnection}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {testingConnection ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                در حال تست...
              </>
            ) : (
              <>
                <TestTube size={16} />
                تست اتصال
              </>
            )}
          </button>
        }
        tooltip={{
          title: 'تنظیمات اتصال',
          text: 'در این بخش می‌توانید اطلاعات اتصال به برنامه‌های مایکروسافت را وارد نمایید.'
        }}
      >
        <div className="space-y-6">
          {/* انتخاب برنامه */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              برنامه مقصد
              <AdvancedTooltip title="برنامه مقصد" text="برنامه مایکروسافتی که می‌خواهید به آن متصل شوید را انتخاب نمایید.">
                <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
              </AdvancedTooltip>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 border-2 border-blue-500 bg-blue-50 rounded-xl text-right">
                <div className="flex items-center gap-3 mb-2">
                  <DatabaseZap size={20} className="text-blue-600" />
                  <span className="font-medium text-slate-900">Finance and Operations</span>
                </div>
                <p className="text-xs text-slate-500">Dynamics 365 F&O</p>
              </button>
              <button className="p-4 border-2 border-amber-400 rounded-xl text-right hover:border-amber-500 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart size={20} className="text-amber-500" />
                  <span className="font-medium text-slate-700">Power BI</span>
                </div>
                <p className="text-xs text-slate-500">گزارش‌گیری و تحلیل</p>
              </button>
              <button className="p-4 border-2 border-green-600 rounded-xl text-right hover:border-green-700 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <FileSpreadsheet size={20} className="text-green-600" />
                  <span className="font-medium text-slate-700">Excel</span>
                </div>
                <p className="text-xs text-slate-500">صفحه‌گسترده</p>
              </button>
            </div>
          </div>

          {/* اطلاعات سرور */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AdvancedInput
              label="آدرس سرور"
              value={connectionSettings.finopsServer}
              onChange={(val) => setConnectionSettings({...connectionSettings, finopsServer: val})}
              placeholder="مثال: your-tenant.crm.dynamics.com"
              type="text"
              tooltip={{
                title: 'آدرس سرور',
                text: 'آدرس کامل سرور برنامه مقصد را وارد کنید. برای مثال: https://yourcompany.operations.dynamics.com'
              }}
            />
            <AdvancedInput
              label="شماره پورت"
              value={connectionSettings.finopsPort}
              onChange={(val) => setConnectionSettings({...connectionSettings, finopsPort: val})}
              placeholder="مثال: 443"
              type="number"
              tooltip={{
                title: 'شماره پورت',
                text: 'پورت مورد استفاده برای اتصال به سرور را مشخص کنید. معمولاً 443 برای HTTPS استفاده می‌شود.'
              }}
            />
          </div>

          {/* نوع احراز هویت */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              نوع احراز هویت
              <AdvancedTooltip title="نوع احراز هویت" text="روش احراز هویت برای اتصال را انتخاب نمایید.">
                <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
              </AdvancedTooltip>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 border-2 border-blue-500 bg-blue-50 rounded-xl text-right">
                <div className="flex items-center gap-3 mb-2">
                  <Key size={20} className="text-blue-600" />
                  <span className="font-medium text-slate-900">نام کاربری و رمز</span>
                </div>
                <p className="text-xs text-slate-500">احراز هویت سنتی</p>
              </button>
              <button className="p-4 border-2 border-slate-200 rounded-xl text-right hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <Shield size={20} className="text-slate-500" />
                  <span className="font-medium text-slate-700">OAuth 2.0</span>
                </div>
                <p className="text-xs text-slate-500">احراز هویت امن</p>
              </button>
              <button className="p-4 border-2 border-slate-200 rounded-xl text-right hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <Lock size={20} className="text-slate-500" />
                  <span className="font-medium text-slate-700">API Key</span>
                </div>
                <p className="text-xs text-slate-500">کلید API</p>
              </button>
            </div>
          </div>

          {/* اعتبارنامه‌ها */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AdvancedInput
              label="نام کاربری"
              value={connectionSettings.finopsUsername}
              onChange={(val) => setConnectionSettings({...connectionSettings, finopsUsername: val})}
              placeholder="مثال: admin@company.com"
              type="text"
              tooltip={{
                title: 'نام کاربری',
                text: 'نام کاربری یا ایمیل برای ورود به سیستم را وارد نمایید.'
              }}
            />
            <AdvancedInput
              label="رمز عبور"
              value={connectionSettings.finopsPassword}
              onChange={(val) => setConnectionSettings({...connectionSettings, finopsPassword: val})}
              placeholder="مثال: ************"
              type="password"
              tooltip={{
                title: 'رمز عبور',
                text: 'رمز عبور مرتبط با نام کاربری را وارد کنید.'
              }}
            />
          </div>

          {/* اطلاعات Azure AD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <AdvancedInput
              label="Tenant ID"
              value={connectionSettings.finopsTenantId}
              onChange={(val) => setConnectionSettings({...connectionSettings, finopsTenantId: val})}
              placeholder="مثال: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              type="text"
              tooltip={{
                title: 'Tenant ID',
                text: 'شناسه Tenant سازمان در Azure Active Directory.'
              }}
            />
            <AdvancedInput
              label="Client ID"
              value={connectionSettings.finopsClientId}
              onChange={(val) => setConnectionSettings({...connectionSettings, finopsClientId: val})}
              placeholder="مثال: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              type="text"
              tooltip={{
                title: 'Client ID',
                text: 'شناسه کلاینت (Application ID) از Azure AD.'
              }}
            />
            <AdvancedInput
              label="Client Secret"
              value={connectionSettings.finopsClientSecret}
              onChange={(val) => setConnectionSettings({...connectionSettings, finopsClientSecret: val})}
              placeholder="مثال: ************"
              type="password"
              tooltip={{
                title: 'Client Secret',
                text: 'رمز کلاینت از Azure AD.'
              }}
            />
          </div>

          {/* دکمه‌های عملیاتی */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors flex items-center gap-2">
              <X size={18} />
              انصراف
            </button>
            <button
              onClick={() => testConnection('Microsoft Services')}
              disabled={testingConnection}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {testingConnection ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  در حال تست...
                </>
              ) : (
                <>
                  <TestTube size={18} />
                  تست اتصال
                </>
              )}
            </button>
            <button
              onClick={() => saveConnection()}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              ذخیره اتصال
            </button>
          </div>
        </div>
      </SettingsCard>

      {/* حالت صفحات: انتخاب صفحات برای دسترسی */}
      {viewMode === 'pages' && (
        <div className="space-y-8">
          {/* Finance and Operations */}
          <SettingsCard
            title="Microsoft Finance and Operations"
            subtitle="انتخاب صفحات برای دسترسی"
            icon={<DatabaseZap size={20} />}
            color="#0078D4"
            tooltip={{
              title: 'صفحات Finance and Operations',
              text: 'از این بخش می‌توانید صفحات مورد نظر خود را از برنامه Microsoft Finance and Operations برای همگام‌سازی انتخاب نمایید. هر صفحه شامل فیلدها و داده‌های مربوطه می‌باشد.'
            }}
          >
            <div className="space-y-3">
              {defaultPages.finops.map((page) => (
                <PageSelector
                  key={page.id}
                  page={page}
                  appType="finops"
                  onToggle={togglePage}
                />
              ))}
            </div>
          </SettingsCard>

          {/* Power BI */}
          <SettingsCard
            title="Microsoft Power BI"
            subtitle="انتخاب صفحات برای دسترسی"
            icon={<BarChart size={20} />}
            color="#F2C811"
            tooltip={{
              title: 'صفحات Power BI',
              text: 'از این بخش می‌توانید صفحات مورد نظر خود را از برنامه Microsoft Power BI برای همگام‌سازی انتخاب نمایید. شامل داشبوردها، گزارش‌ها و مجموعه داده‌ها می‌باشد.'
            }}
          >
            <div className="space-y-3">
              {defaultPages.powerbi.map((page) => (
                <PageSelector
                  key={page.id}
                  page={page}
                  appType="powerbi"
                  onToggle={togglePage}
                />
              ))}
            </div>
          </SettingsCard>

          {/* Excel */}
          <SettingsCard
            title="Microsoft Excel"
            subtitle="انتخاب صفحات برای دسترسی"
            icon={<FileSpreadsheet size={20} />}
            color="#217346"
            tooltip={{
              title: 'صفحات Excel',
              text: 'از این بخش می‌توانید صفحات مورد نظر خود را از برنامه Microsoft Excel برای همگام‌سازی انتخاب نمایید. شامل صفحه‌ها، جداول محوری و نمودارها می‌باشد.'
            }}
          >
            <div className="space-y-3">
              {defaultPages.excel.map((page) => (
                <PageSelector
                  key={page.id}
                  page={page}
                  appType="excel"
                  onToggle={togglePage}
                />
              ))}
            </div>
          </SettingsCard>

          {/* خلاصه انتخاب‌ها */}
          <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <CheckCircle size={20} />
              خلاصه صفحات انتخاب شده
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <DatabaseZap size={18} className="text-blue-600" />
                  <span className="font-medium text-slate-900">Finance and Operations</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {selectedPages.finops.length}
                </div>
                <div className="text-sm text-slate-500">صفحه انتخاب شده</div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart size={18} className="text-amber-500" />
                  <span className="font-medium text-slate-900">Power BI</span>
                </div>
                <div className="text-2xl font-bold text-amber-500">
                  {selectedPages.powerbi.length}
                </div>
                <div className="text-sm text-slate-500">صفحه انتخاب شده</div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet size={18} className="text-green-600" />
                  <span className="font-medium text-slate-900">Excel</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {selectedPages.excel.length}
                </div>
                <div className="text-sm text-slate-500">صفحه انتخاب شده</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* شبکه برنامه‌های متصل */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">اتصالات فعال</h2>
            <p className="text-slate-500 mt-2">اتصال به سرویس‌های مایکروسافت برای همگام‌سازی داده‌ها</p>
          </div>
          <button className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2.5 shadow-md">
            <Plus size={18} />
            افزودن اتصال جدید
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connectedApps.map(app => (
            <ExternalAppCard
              key={app.id}
              app={app}
              onConfigure={() => setActiveTab(app.id === 'powerbi' ? 'powerbi' : app.id === 'finops' ? 'connections' : 'general')}
              onTest={() => testConnection(app.name)}
              onDisconnect={() => {}}
            />
          ))}
        </div>
      </div>

      {/* راهنمای اتصال */}
      <SettingsCard
        title="راهنمای اتصال"
        subtitle="نحوه اتصال به سرویس‌های مایکروسافت"
        icon={<BookOpen size={20} />}
        variant="info"
        tooltip={{
          title: 'راهنمای اتصال',
          text: 'برای اتصال به سرویس‌های مایکروسافت، مراحل زیر را دنبال کنید. هر سرویس دارای مستندات جداگانه‌ای است.'
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Finance and Operations */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-600 text-white rounded-lg">
                <DatabaseZap size={22} />
              </div>
              <div>
                <h4 className="font-bold text-blue-900">Finance & Operations</h4>
                <p className="text-xs text-blue-600">Dynamics 365</p>
              </div>
            </div>
            <ol className="text-sm text-blue-800 space-y-2.5 list-decimal list-inside">
              <li>ورود به پورتال Azure</li>
              <li>ایجاد Azure AD App</li>
              <li>تنظیم مجوزهای API</li>
              <li>کپی Client ID و Secret</li>
              <li>تست اتصال</li>
            </ol>
            <button className="w-full mt-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              مشاهده مستندات
            </button>
          </div>

          {/* Power BI */}
          <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500 text-white rounded-lg">
                <BarChart size={22} />
              </div>
              <div>
                <h4 className="font-bold text-amber-900">Power BI</h4>
                <p className="text-xs text-amber-600">گزارش‌گیری</p>
              </div>
            </div>
            <ol className="text-sm text-amber-800 space-y-2.5 list-decimal list-inside">
              <li>ورود به Power BI Service</li>
              <li>ایجاد Workspace</li>
              <li>تنظیم Dataset Permissions</li>
              <li>دریافت Embed Token</li>
              <li>اتصال به API</li>
            </ol>
            <button className="w-full mt-5 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors">
              مشاهده مستندات
            </button>
          </div>

          {/* Excel */}
          <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-green-600 text-white rounded-lg">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h4 className="font-bold text-green-900">Excel</h4>
                <p className="text-xs text-green-600">اکسل آنلاین</p>
              </div>
            </div>
            <ol className="text-sm text-green-800 space-y-2.5 list-decimal list-inside">
              <li>ورود به Office 365</li>
              <li>اشتراک‌گذاری فایل</li>
              <li>تنظیم مجوزهای دسترسی</li>
              <li>دریافت لینک اشتراک</li>
              <li>اتصال از طریق API</li>
            </ol>
            <button className="w-full mt-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
              مشاهده مستندات
            </button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );

  // تب دسترسی‌های خارجی
  const renderAccessTab = () => (
    <div className="space-y-8">
      {/* کارت‌های نوع دسترسی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { 
            type: 'database', 
            icon: Database, 
            title: 'دسترسی دیتابیس', 
            description: 'اتصال مستقیم به پایگاه داده',
            color: 'blue',
            features: ['ODBC/JDBC', 'Direct Query', 'SQL Server'],
            tooltip: {
              title: 'دسترسی دیتابیس',
              text: 'این نوع دسترسی امکان اتصال مستقیم به پایگاه داده را فراهم می‌کند. برای برنامه‌هایی که نیاز به دسترسی مستقیم به داده‌ها دارند مناسب است.'
            }
          },
          { 
            type: 'api', 
            icon: Code2, 
            title: 'دسترسی API', 
            description: 'وب‌سرویس‌های RESTful',
            color: 'violet',
            features: ['REST API', 'GraphQL', 'Webhooks'],
            tooltip: {
              title: 'دسترسی API',
              text: 'دسترسی از طریق API به شما امکان می‌دهد داده‌ها را از طریق وب‌سرویس‌های RESTful در اختیار برنامه‌های خارجی قرار دهید.'
            }
          },
          { 
            type: 'view', 
            icon: Table2, 
            title: 'نمایش داده‌ها', 
            description: 'جداول مجازی و ویو‌ها',
            color: 'emerald',
            features: ['Data Views', 'Export', 'Scheduling'],
            tooltip: {
              title: 'نمایش داده‌ها',
              text: 'با این نوع دسترسی می‌توانید داده‌ها را به صورت جداول مجازی و ویوهای سفارشی در اختیار برنامه‌های خارجی قرار دهید.'
            }
          },
          { 
            type: 'stored_procedure', 
            icon: Terminal, 
            title: 'Stored Procedure', 
            description: 'رویه‌های ذخیره شده',
            color: 'amber',
            features: ['Custom Logic', 'Batch Jobs', 'Reports'],
            tooltip: {
              title: 'Stored Procedure',
              text: 'دسترسی به رویه‌های ذخیره شده در پایگاه داده برای اجرای عملیات پیچیده و گزارش‌گیری.'
            }
          }
        ].map((accessType) => {
          const Icon = accessType.icon;
          return (
            <button
              key={accessType.type}
              onClick={() => {
                setSelectedAccessType(accessType.type as AccessType);
                setShowAccessModal(true);
              }}
              className="p-6 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 text-right group"
            >
              <div className={`w-14 h-14 rounded-xl bg-${accessType.color}-100 text-${accessType.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={26} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-slate-900">{accessType.title}</h3>
                <AdvancedTooltip title={accessType.tooltip.title} text={accessType.tooltip.text}>
                  <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
                </AdvancedTooltip>
              </div>
              {/* توضیحات زیر فیلد به صورت کامنت */}
              {/* <p className="text-sm text-slate-500 mt-1">{accessType.description}</p> */}
              <div className="flex flex-wrap gap-2 mt-4">
                {accessType.features.map((feature, idx) => (
                  <span key={idx} className={`text-xs px-2.5 py-1 rounded-full bg-${accessType.color}-50 text-${accessType.color}-700`}>
                    {feature}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* لیست اعتبارنامه‌های فعال */}
      <SettingsCard
        title="اعتبارنامه‌های دسترسی"
        subtitle="مدیریت کلیدها و توکن‌های دسترسی"
        icon={<KeyRound size={20} />}
        tooltip={{
          title: 'اعتبارنامه‌های دسترسی',
          text: 'در این بخش می‌توانید اعتبارنامه‌های صادر شده برای دسترسی به داده‌ها را مشاهده و مدیریت کنید.'
        }}
      >
        <div className="space-y-5">
          {/* نمونه اعتبارنامه */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <Database size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Database Access Token</h4>
                  <p className="text-xs text-slate-500">ایجاد شده در: ۲۵ آذر ۱۴۰۴</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status="connected" size="sm" />
                <button className="p-2.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                  <Settings size={16} />
                </button>
                <button className="p-2.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5 text-sm">
              <div>
                <span className="text-slate-500">انقضا:</span>
                <span className="font-medium text-slate-700 mr-2">۲۵ دی ۱۴۰۴</span>
              </div>
              <div>
                <span className="text-slate-500">سطح دسترسی:</span>
                <span className="font-medium text-slate-700 mr-2">خواندن/نوشتن</span>
              </div>
            </div>
          </div>

          {/* اعتبارنامه API */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-100 text-violet-600 rounded-lg">
                  <Code2 size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">API Key - Power BI</h4>
                  <p className="text-xs text-slate-500">ایجاد شده در: ۲۰ آذر ۱۴۰۴</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status="connected" size="sm" />
                <button className="p-2.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                  <Settings size={16} />
                </button>
                <button className="p-2.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5 text-sm">
              <div>
                <span className="text-slate-500">انقضا:</span>
                <span className="font-medium text-slate-700 mr-2">۲۰ دی ۱۴۰۴</span>
              </div>
              <div>
                <span className="text-slate-500">سطح دسترسی:</span>
                <span className="font-medium text-slate-700 mr-2">فقط خواندن</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAccessModal(true)}
          className="w-full mt-5 py-3.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center justify-center gap-2 font-semibold"
        >
          <Plus size={20} />
          افزودن اعتبارنامه جدید
        </button>
      </SettingsCard>

      {/* تنظیمات امنیتی */}
      <SettingsCard
        title="امنیت دسترسی"
        subtitle="تنظیمات امنیتی برای دسترسی‌های خارجی"
        icon={<Shield size={20} />}
        variant="warning"
        tooltip={{
          title: 'امنیت دسترسی',
          text: 'این بخش شامل تنظیمات امنیتی برای کنترل و محدود کردن دسترسی‌های خارجی به سیستم می‌باشد.'
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* محدودیت‌های دسترسی */}
          <div className="space-y-5">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Lock size={18} />
              محدودیت‌های دسترسی
            </h4>
            
            <div className="space-y-3">
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                label="محدودیت IP"
                description="فقط IP‌های مجاز بتوانند متصل شوند"
                tooltip={{
                  title: 'محدودیت IP',
                  text: 'با فعال کردن این گزینه، می‌توانید لیستی از آدرس‌های IP مجاز را تعریف کنید که فقط از آن طریق بتوان به داده‌ها دسترسی داشت.'
                }}
              />
              
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                label="انقضای خودکار"
                description="اعتبارنامه‌ها پس از مدت معین منقضی شوند"
                tooltip={{
                  title: 'انقضای خودکار',
                  text: 'با فعال کردن این گزینه، اعتبارنامه‌های صادر شده پس از مدت مشخصی به صورت خودکار منقضی می‌شوند و نیاز به مدیریت دستی ندارند.'
                }}
              />
              
              <ToggleSwitch
                checked={false}
                onChange={() => {}}
                label="احراز هویت دو عاملی"
                description="نیاز به تایید دو مرحله‌ای"
                tooltip={{
                  title: 'احراز هویت دو عاملی (2FA)',
                  text: 'با فعال کردن این گزینه، علاوه بر رمز عبور، یک کد تایید دوم نیز برای دسترسی به داده‌ها الزامی خواهد بود.'
                }}
              />
            </div>
          </div>
          
          {/* لاگ و نظارت */}
          <div className="space-y-5">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity size={18} />
              لاگ و نظارت
            </h4>
            
            <div className="p-5 bg-white rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-slate-900">۱۲۴</div>
                  <div className="text-xs text-slate-500 mt-1">درخواست امروز</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-600">۹۸.۵%</div>
                  <div className="text-xs text-slate-500 mt-1">موفقیت</div>
                </div>
              </div>
            </div>
            
            <button className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2.5">
              <FileText size={18} />
              مشاهده گزارش امنیتی
            </button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );

  // تب لاگ‌ها
  const renderLogsTab = () => (
    <div className="space-y-8">
      <SettingsCard
        title="تاریخچه همگام‌سازی"
        subtitle="مشاهده لاگ‌ها و تاریخچه عملیات"
        icon={<FileText size={20} />}
        tooltip={{
          title: 'تاریخچه همگام‌سازی',
          text: 'در این بخش می‌توانید تاریخچه کامل عملیات همگام‌سازی را مشاهده کنید. شامل زمان، وضعیت، منبع و پیام هر عملیات می‌باشد.'
        }}
      >
        {/* فیلترها */}
        <div className="flex items-center gap-4 mb-6 p-5 bg-slate-50 rounded-xl">
          <div className="flex-1">
            <div className="relative">
              <select className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white appearance-none cursor-pointer">
                <option>همه منابع</option>
                <option>Finance and Operations</option>
                <option>Power BI</option>
                <option>Excel</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <select className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white appearance-none cursor-pointer">
                <option>همه وضعیت‌ها</option>
                <option>موفق</option>
                <option>هشدار</option>
                <option>خطا</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white pr-10"
              />
              <Search size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <button className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2.5">
            <Filter size={18} />
            فیلتر
          </button>
        </div>

        {/* لیست لاگ‌ها */}
        <div className="space-y-4">
          {[
            { time: new Date(Date.now() - 3600000), status: 'success', source: 'Finance and Operations', message: 'همگام‌سازی با موفقیت انجام شد', records: 152 },
            { time: new Date(Date.now() - 7200000), status: 'success', source: 'Power BI', message: 'به‌روزرسانی Dataset انجام شد', records: 89 },
            { time: new Date(Date.now() - 10800000), status: 'warning', source: 'Excel Export', message: 'هشدار در خروجی اکسل', records: 12 },
            { time: new Date(Date.now() - 86400000), status: 'error', source: 'Finance and Operations', message: 'خطا در اتصال به API', records: 0 },
            { time: new Date(Date.now() - 172800000), status: 'success', source: 'All Systems', message: 'همگام‌سازی کامل انجام شد', records: 523 }
          ].map((log, index) => (
            <div key={index} className="flex items-start gap-4 p-5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div className={`p-3 rounded-xl ${
                log.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                log.status === 'warning' ? 'bg-amber-100 text-amber-600' :
                'bg-red-100 text-red-600'
              }`}>
                {log.status === 'success' ? <CheckCircle size={22} /> :
                 log.status === 'warning' ? <AlertTriangle size={22} /> :
                 <XCircle size={22} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-slate-900">{log.source}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    log.status === 'success' ? 'bg-emerald-500' :
                    log.status === 'warning' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`} />
                </div>
                <div className="text-sm text-slate-700">{log.message}</div>
                <div className="text-xs text-slate-500 mt-1.5">
                  {log.records > 0 ? `${log.records} رکورد پردازش شد` : 'بدون رکورد'}
                </div>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-slate-600">{formatPersianDate(log.time)}</div>
                <div className="text-xs text-slate-400 mt-0.5">{log.time.toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* دکمه‌های عملیاتی */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2.5 font-medium">
            <Download size={18} />
            دانلود لاگ‌ها (CSV)
          </button>
          <button className="px-5 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2.5 font-medium">
            <Trash2 size={18} />
            پاک کردن تاریخچه
          </button>
        </div>
      </SettingsCard>
    </div>
  );

  // مودال تولید اعتبارنامه
  const renderAccessModal = () => {
    if (!showAccessModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* هدر مودال */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">اتصال به برنامه</h2>
              <p className="text-sm text-slate-500 mt-1">تنظیمات اتصال و اعتبارنامه</p>
            </div>
            <button
              onClick={() => setShowAccessModal(false)}
              className="p-2.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* محتوای مودال */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
            {/* انتخاب برنامه */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                برنامه مقصد
                <AdvancedTooltip title="برنامه مقصد" text="برنامه مایکروسافتی که می‌خواهید به آن متصل شوید را انتخاب کنید.">
                  <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
                </AdvancedTooltip>
              </label>
              <div className="relative">
                <select
                  value={accessSettings.selectedApp}
                  onChange={(e) => setAccessSettings({...accessSettings, selectedApp: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white appearance-none cursor-pointer text-sm"
                >
                  <option value="finops">Microsoft Finance and Operations</option>
                  <option value="powerbi">Microsoft Power BI</option>
                  <option value="excel">Microsoft Excel</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* اطلاعات اتصال */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Network size={18} />
                اطلاعات اتصال
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AdvancedInput
                  label="آدرس سرور"
                  value={accessSettings.accessServer}
                  onChange={(val) => setAccessSettings({...accessSettings, accessServer: val})}
                  placeholder="مثال: your-tenant.crm.dynamics.com"
                  type="text"
                  tooltip={{
                    title: 'آدرس سرور',
                    text: 'آدرس کامل سرور یا پورتال برنامه مقصد را وارد کنید. برای مثال: https://yourcompany.operations.dynamics.com'
                  }}
                />
                <AdvancedInput
                  label="شماره پورت"
                  value={accessSettings.accessPort}
                  onChange={(val) => setAccessSettings({...accessSettings, accessPort: val})}
                  placeholder="مثال: 443"
                  type="number"
                  tooltip={{
                    title: 'شماره پورت',
                    text: 'پورت مورد استفاده برای اتصال به سرور را مشخص کنید. معمولاً 443 برای HTTPS استفاده می‌شود.'
                  }}
                />
              </div>

              {/* نوع احراز هویت */}
              <div className="mt-5">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  نوع احراز هویت
                  <AdvancedTooltip title="نوع احراز هویت" text="روش احراز هویت برای اتصال به برنامه مقصد را انتخاب نمایید.">
                    <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
                  </AdvancedTooltip>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 border-2 border-blue-500 bg-blue-50 rounded-xl text-right">
                    <div className="flex items-center gap-3 mb-2">
                      <Key size={20} className="text-blue-600" />
                      <span className="font-medium text-slate-900">نام کاربری و رمز</span>
                    </div>
                    <p className="text-xs text-slate-500">احراز هویت با نام کاربری و رمز عبور</p>
                  </button>
                  <button className="p-4 border-2 border-slate-200 rounded-xl text-right hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield size={20} className="text-slate-500" />
                      <span className="font-medium text-slate-700">OAuth 2.0</span>
                    </div>
                    <p className="text-xs text-slate-500">احراز هویت امن با OAuth</p>
                  </button>
                  <button className="p-4 border-2 border-slate-200 rounded-xl text-right hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <Lock size={20} className="text-slate-500" />
                      <span className="font-medium text-slate-700">API Key</span>
                    </div>
                    <p className="text-xs text-slate-500">استفاده از کلید API</p>
                  </button>
                </div>
              </div>

              {/* فیلدهای نام کاربری و رمز عبور */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <AdvancedInput
                  label="نام کاربری"
                  value={accessSettings.accessUsername}
                  onChange={(val) => setAccessSettings({...accessSettings, accessUsername: val})}
                  placeholder="مثال: admin@company.com"
                  type="text"
                  tooltip={{
                    title: 'نام کاربری',
                    text: 'نام کاربری یا آدرس ایمیل مرتبط با حساب کاربری خود در برنامه مقصد را وارد کنید.'
                  }}
                />
                <AdvancedInput
                  label="رمز عبور"
                  value={accessSettings.accessPassword}
                  onChange={(val) => setAccessSettings({...accessSettings, accessPassword: val})}
                  placeholder="مثال: ************"
                  type="password"
                  tooltip={{
                    title: 'رمز عبور',
                    text: 'رمز عبور مرتبط با نام کاربری وارد شده را وارد کنید. این اطلاعات به صورت امن ذخیره می‌شود.'
                  }}
                />
              </div>

              {/* فیلدهای API */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <AdvancedInput
                  label="Client ID"
                  value={accessSettings.accessClientId}
                  onChange={(val) => setAccessSettings({...accessSettings, accessClientId: val})}
                  placeholder="مثال: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  type="text"
                  tooltip={{
                    title: 'Client ID',
                    text: 'شناسه کلاینت (Application ID) که از پورتال Azure Active Directory دریافت کرده‌اید را وارد کنید.'
                  }}
                />
                <AdvancedInput
                  label="Client Secret"
                  value={accessSettings.accessClientSecret}
                  onChange={(val) => setAccessSettings({...accessSettings, accessClientSecret: val})}
                  placeholder="مثال: ************"
                  type="password"
                  tooltip={{
                    title: 'Client Secret',
                    text: 'رمز کلاینت (Client Secret) که از پورتال Azure AD دریافت کرده‌اید را وارد کنید.'
                  }}
                />
              </div>

              {/* Tenant ID */}
              <div className="mt-5">
                <AdvancedInput
                  label="Tenant ID"
                  value={accessSettings.accessTenantId}
                  onChange={(val) => setAccessSettings({...accessSettings, accessTenantId: val})}
                  placeholder="مثال: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  type="text"
                  tooltip={{
                    title: 'Tenant ID',
                    text: 'شناسه Tenant یا دایرکتوری Azure Active Directory سازمان خود را وارد کنید.'
                  }}
                />
              </div>
            </div>

            {/* انتخاب صفحات */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                صفحات قابل دسترسی
                <AdvancedTooltip title="صفحات قابل دسترسی" text="صفحاتی از برنامه که می‌خواهید به آن‌ها دسترسی داشته باشید را انتخاب نمایید.">
                  <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
                </AdvancedTooltip>
              </label>
              <div className="space-y-2 p-4 bg-slate-50 rounded-xl">
                {['Customers', 'Products', 'Orders', 'Invoices', 'Inventory'].map((page) => (
                  <label key={page} className="flex items-center gap-3 p-2.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={accessSettings.accessPages.includes(page)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAccessSettings({
                            ...accessSettings,
                            accessPages: [...accessSettings.accessPages, page]
                          });
                        } else {
                          setAccessSettings({
                            ...accessSettings,
                            accessPages: accessSettings.accessPages.filter(p => p !== page)
                          });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                    />
                    <LayoutDashboard size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-700">{page}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* مدت انقضا */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                مدت انقضا
                <AdvancedTooltip title="مدت انقضا" text="مدت زمان اعتبار اعتبارنامه را مشخص کنید. پس از این مدت، اعتبارنامه منقضی می‌شود.">
                  <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
                </AdvancedTooltip>
              </label>
              <div className="relative">
                <select
                  value={accessSettings.accessExpiry}
                  onChange={(e) => setAccessSettings({...accessSettings, accessExpiry: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white appearance-none cursor-pointer text-sm"
                >
                  <option value="7">7 روز</option>
                  <option value="30">30 روز</option>
                  <option value="90">90 روز</option>
                  <option value="365">1 سال</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* فوتر مودال */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => setShowAccessModal(false)}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={() => generateCredentials(selectedAccessType || 'database')}
              disabled={generatingCredentials}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2.5 disabled:opacity-50"
            >
              {generatingCredentials ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  در حال اتصال...
                </>
              ) : (
                <>
                  <TestTube size={18} />
                  تست و ذخیره
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* اعلان Toast */}
      {showNotification && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3.5 rounded-xl shadow-lg animate-slideDown z-50 flex items-center gap-3 ${
          showNotification.type === 'success' ? 'bg-emerald-600 text-white' :
          showNotification.type === 'error' ? 'bg-red-600 text-white' :
          showNotification.type === 'warning' ? 'bg-amber-500 text-white' :
          'bg-blue-600 text-white'
        }`}>
          {showNotification.type === 'success' ? <CheckCircle size={20} /> :
           showNotification.type === 'error' ? <XCircle size={20} /> :
           showNotification.type === 'warning' ? <AlertTriangle size={20} /> :
           <Info size={20} />}
          {showNotification.message}
        </div>
      )}

      {/* مودال دسترسی */}
      {renderAccessModal()}

      <div className="flex">
        {/* نوار کناری */}
        <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-20 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}>
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-200">
                  <Network size={22} className="text-white" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">هاب یکپارچه‌سازی</span>
                  <span className="text-xs text-slate-500">نسخه ۲.۱</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {sidebarCollapsed ? 
                <ChevronRight size={20} className="text-slate-500" /> : 
                <ChevronLeft size={20} className="text-slate-500" />
              }
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={20} />
                {!sidebarCollapsed && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="mr-auto px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>

          {/* برنامه‌های متصل */}
          {!sidebarCollapsed && (
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
              <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">اتصالات فعال</div>
              <div className="space-y-2">
                {connectedApps.map(app => (
                  <div key={app.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${app.color}15`, color: app.color }}
                    >
                      {app.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{app.name.split(' ')[0]}</div>
                      <div className="text-xs text-slate-500">{app.status === 'connected' ? 'متصل' : 'قطع'}</div>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${app.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* محتوای اصلی */}
        <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'mr-20' : 'mr-72'}`}>
          <div className="p-8">
            {/* هدر */}
            <header className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">تنظیمات یکپارچه‌سازی</h1>
                  <p className="text-slate-500 mt-1.5">مدیریت اتصالات، دسترسی‌ها و همگام‌سازی داده‌ها</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-xl border border-slate-200">
                    <div className={`w-2.5 h-2.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-sm text-slate-600">
                      {isLoading ? 'در حال پردازش...' : 'آماده'}
                    </span>
                  </div>
                  <button className="p-2.5 text-slate-500 hover:bg-white hover:shadow-md rounded-xl transition-all relative">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  </button>
                  <button className="p-2.5 text-slate-500 hover:bg-white hover:shadow-md rounded-xl transition-all">
                    <Settings2 size={20} />
                  </button>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <div className="text-sm font-semibold text-slate-900">مدیر سیستم</div>
                      <div className="text-xs text-slate-500">admin@company.com</div>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                      <span className="text-white font-bold">م</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* تب‌های محتوا */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* تب‌نویسی */}
              <div className="border-b border-slate-200 bg-slate-50/50">
                <nav className="flex gap-1 p-2">
                  {sidebarItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        activeTab === item.id
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* محتوای تب */}
              <div className="p-8">
                {renderActiveTab()}
              </div>
            </div>

            {/* فوتر */}
            <footer className="mt-8 text-center">
              <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
                <span>نسخه ۲.۱.۰</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span>آخرین بروزرسانی: آذر ۱۴۰۴</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <a href="#" className="hover:text-slate-700 transition-colors">مستندات</a>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <a href="#" className="hover:text-slate-700 transition-colors">پشتیبانی</a>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* استایل‌های انیمیشن */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SyncSettings;



SyncSettings
