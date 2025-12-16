import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Workflow, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Settings,
  Clock,
  DollarSign,
  Shield,
  Users,
  FileText,
  Package,
  ArrowRight,
  Info,
  Download,
  Upload,
  Eye,
  EyeOff,
  X,
  Filter,
  Search,
  ChevronDown,
  Plus,
  Minus,
  MoreHorizontal,
  User,
  Database,
  Lock,
  Globe,
  Smartphone,
  Mail,
  Bell,
  Activity
} from 'lucide-react';

// Enhanced Types
interface WorkflowSettings {
  // Basic Settings
  workflowEnabled: boolean;
  autoApproveSmallOrders: boolean;
  maxOrderAmount: number;
  orderApprovalLevels: number;
  finalApproverDepartment: string;
  maxApprovalTime: number;
  
  // Advanced Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  requireDigitalSignature: boolean;
  allowParallelApprovals: boolean;
  autoEscalationEnabled: boolean;
  escalationAfterHours: number;
  
  // Security Settings
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireTwoFactor: boolean;
  ipWhitelist: string[];
  
  // Integration Settings
  apiEnabled: boolean;
  webhookUrl: string;
  syncInterval: number;
  
  // UI Preferences
  theme: 'light' | 'dark' | 'auto';
  language: 'fa' | 'en';
  dateFormat: string;
  numberFormat: 'fa' | 'en';
}

interface ValidationErrors {
  [key: string]: string | undefined;
}

interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info' | null;
  message: string;
  duration?: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  category: 'receipt' | 'transfer' | 'approval' | 'notification';
}

interface WorkflowStep {
  id: string;
  order: number;
  title: string;
  department: string;
  requiredRole: string;
  estimatedTime: number;
  isOptional: boolean;
}

// Constants
const DEPARTMENTS = [
  { value: 'financial', label: 'دپارتمان مالی', icon: DollarSign, color: 'text-green-500' },
  { value: 'system', label: 'مدیر سیستم', icon: Settings, color: 'text-blue-500' },
  { value: 'warehouse', label: 'دپارتمان انبار', icon: Package, color: 'text-orange-500' },
  { value: 'hr', label: 'منابع انسانی', icon: Users, color: 'text-purple-500' },
  { value: 'legal', label: 'امور حقوقی', icon: Shield, color: 'text-red-500' },
];

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'warehouse_receipt',
    name: 'رسید انبار',
    description: 'فرآیند دریافت و ثبت کالاهای ورودی',
    category: 'receipt',
    steps: [
      { id: '1', order: 1, title: 'ثبت اولیه', department: 'planning', requiredRole: 'planner', estimatedTime: 30, isOptional: false },
      { id: '2', order: 2, title: 'بررسی کیفی', department: 'quality', requiredRole: 'quality_checker', estimatedTime: 60, isOptional: false },
      { id: '3', order: 3, title: 'تایید مالی', department: 'financial', requiredRole: 'accountant', estimatedTime: 45, isOptional: false },
      { id: '4', order: 4, title: 'نهایی‌سازی', department: 'warehouse', requiredRole: 'warehouse_manager', estimatedTime: 15, isOptional: false }
    ]
  },
  {
    id: 'warehouse_transfer',
    name: 'حواله انبار',
    description: 'فرآیند انتقال کالا بین انبارها',
    category: 'transfer',
    steps: [
      { id: '1', order: 1, title: 'درخواست انتقال', department: 'requesting', requiredRole: 'requester', estimatedTime: 20, isOptional: false },
      { id: '2', order: 2, title: 'بررسی موجودی', department: 'warehouse', requiredRole: 'warehouse_staff', estimatedTime: 40, isOptional: false },
      { id: '3', order: 3, title: 'تایید مدیریت', department: 'management', requiredRole: 'manager', estimatedTime: 30, isOptional: false },
      { id: '4', order: 4, title: 'صدور حواله', department: 'warehouse', requiredRole: 'warehouse_manager', estimatedTime: 25, isOptional: false }
    ]
  }
];

// Utility Functions
const formatCurrency = (amount: number, locale: 'fa' | 'en' = 'fa'): string => {
  if (locale === 'fa') {
    return new Intl.NumberFormat('fa-IR').format(amount);
  }
  return new Intl.NumberFormat('en-US').format(amount);
};

const validateField = (name: string, value: any, settings: WorkflowSettings): string | undefined => {
  switch (name) {
    case 'maxOrderAmount':
      if (typeof value !== 'number' || value < 0) return 'مبلغ باید عددی مثبت باشد';
      if (value > 999999999999) return 'مبلغ وارد شده بیش از حد مجاز است';
      break;
    case 'orderApprovalLevels':
      if (typeof value !== 'number' || value < 1 || value > 10) return 'سطح تایید باید بین ۱ تا ۱۰ باشد';
      break;
    case 'maxApprovalTime':
      if (typeof value !== 'number' || value < 1 || value > 720) return 'زمان تایید باید بین ۱ تا ۷۲۰ ساعت باشد';
      break;
    case 'escalationAfterHours':
      if (typeof value !== 'number' || value < 1 || value > 168) return 'زمان escalation باید بین ۱ تا ۱۶۸ ساعت باشد';
      if (settings.maxApprovalTime && value >= settings.maxApprovalTime) {
        return 'زمان escalation باید کمتر از زمان تایید باشد';
      }
      break;
    case 'sessionTimeout':
      if (typeof value !== 'number' || value < 5 || value > 1440) return 'Timeout نشست باید بین ۵ تا ۱۴۴۰ دقیقه باشد';
      break;
    case 'maxLoginAttempts':
      if (typeof value !== 'number' || value < 1 || value > 10) return 'تعداد تلاش‌های ورود باید بین ۱ تا ۱۰ باشد';
      break;
    case 'webhookUrl':
      if (value && !/^https?:\/\/.+/.test(value)) return 'آدرس webhook نامعتبر است';
      break;
    case 'syncInterval':
      if (typeof value !== 'number' || value < 1 || value > 1440) return 'فاصله همگام‌سازی باید بین ۱ تا ۱۴۴۰ دقیقه باشد';
      break;
  }
  return undefined;
};

// API Service Class
class WorkflowSettingsService {
  private baseUrl = '/api/workflow/settings';

  async loadSettings(): Promise<WorkflowSettings> {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) throw new Error('Failed to load settings');
      const data = await response.json();
      return { ...this.getDefaultSettings(), ...data };
    } catch (error) {
      console.error('Error loading settings:', error);
      throw error;
    }
  }

  async saveSettings(settings: WorkflowSettings): Promise<void> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to save settings');
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  async exportSettings(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export`);
    if (!response.ok) throw new Error('Failed to export settings');
    return response.blob();
  }

  async importSettings(file: File): Promise<WorkflowSettings> {
    const formData = new FormData();
    formData.append('settings', file);
    
    const response = await fetch(`${this.baseUrl}/import`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Failed to import settings');
    return response.json();
  }

  private getDefaultSettings(): WorkflowSettings {
    return {
      workflowEnabled: false,
      autoApproveSmallOrders: false,
      maxOrderAmount: 0,
      orderApprovalLevels: 1,
      finalApproverDepartment: 'financial',
      maxApprovalTime: 24,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      requireDigitalSignature: false,
      allowParallelApprovals: false,
      autoEscalationEnabled: false,
      escalationAfterHours: 8,
      sessionTimeout: 30,
      maxLoginAttempts: 3,
      requireTwoFactor: false,
      ipWhitelist: [],
      apiEnabled: false,
      webhookUrl: '',
      syncInterval: 60,
      theme: 'light',
      language: 'fa',
      dateFormat: 'YYYY/MM/DD',
      numberFormat: 'fa'
    };
  }
}

// Custom Hooks
const useWorkflowSettings = () => {
  const service = useMemo(() => new WorkflowSettingsService(), []);
  
  const loadSettings = useCallback(async () => {
    try {
      return await service.loadSettings();
    } catch (error) {
      throw error;
    }
  }, [service]);

  const saveSettings = useCallback(async (settings: WorkflowSettings) => {
    try {
      await service.saveSettings(settings);
    } catch (error) {
      throw error;
    }
  }, [service]);

  const exportSettings = useCallback(async () => {
    try {
      return await service.exportSettings();
    } catch (error) {
      throw error;
    }
  }, [service]);

  const importSettings = useCallback(async (file: File) => {
    try {
      return await service.importSettings(file);
    } catch (error) {
      throw error;
    }
  }, [service]);

  return { loadSettings, saveSettings, exportSettings, importSettings };
};

// UI Components
interface InputFieldProps {
  label: string;
  value: number | string;
  onChange: (value: any) => void;
  type?: 'number' | 'text' | 'email' | 'url';
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  tooltip?: { title: string; text: string };
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  type = 'number',
  min,
  max,
  step,
  error,
  tooltip,
  disabled = false,
  placeholder,
  required = false
}) => {
  const [showValue, setShowValue] = useState(true);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
        {tooltip && (
          <div className="group relative">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              <div className="font-medium">{tooltip.title}</div>
              <div className="text-gray-300">{tooltip.text}</div>
            </div>
          </div>
        )}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="text-gray-400 hover:text-gray-600"
          >
            {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </label>
      <input
        type={type === 'password' && showValue ? 'password' : type}
        value={value}
        onChange={(e) => {
          const inputValue = type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
          onChange(inputValue);
        }}
        className={`
          w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error 
            ? 'border-red-300 bg-red-50' 
            : 'border-gray-300 hover:border-gray-400 focus:bg-white'
          }
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
        `}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-error` : undefined}
        required={required}
      />
      {error && (
        <p id={`${label}-error`} className="text-red-600 text-sm flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  tooltip?: { title: string; text: string };
  required?: boolean;
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  tooltip,
  required = false
}) => {
  return (
    <div className="flex items-start space-x-3 space-x-reverse">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className={`
          mt-1 h-5 w-5 border-gray-300 rounded focus:ring-blue-500 focus:ring-2
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
        `}
        aria-describedby={tooltip ? `${label}-tooltip` : undefined}
        required={required}
      />
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 cursor-pointer">
          {label}
          {required && <span className="text-red-500">*</span>}
          {tooltip && (
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div id={`${label}-tooltip`} className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                <div className="font-medium">{tooltip.title}</div>
                <div className="text-gray-300">{tooltip.text}</div>
              </div>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: React.ComponentType<any>; color?: string }>;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  error,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer
            ${error 
              ? 'border-red-300 bg-red-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
          `}
          required={required}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(option => {
            const IconComponent = option.icon;
            return (
              <option key={option.value} value={option.value} className="flex items-center gap-2">
                {IconComponent && <IconComponent className={`h-4 w-4 ${option.color || 'text-gray-500'}`} />}
                {option.label}
              </option>
            );
          })}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      {error && (
        <p className="text-red-600 text-sm flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

// Workflow Visualization Component
const WorkflowVisualization: React.FC<{ template: WorkflowTemplate; isActive: boolean }> = ({ template, isActive }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'receipt': return Package;
      case 'transfer': return ArrowRight;
      case 'approval': return CheckCircle;
      case 'notification': return Bell;
      default: return FileText;
    }
  };

  const CategoryIcon = getCategoryIcon(template.category);
  const categoryColors = {
    receipt: 'border-blue-200 bg-blue-50',
    transfer: 'border-green-200 bg-green-50',
    approval: 'border-purple-200 bg-purple-50',
    notification: 'border-orange-200 bg-orange-50'
  };

  return (
    <div className={`border rounded-xl p-6 ${categoryColors[template.category as keyof typeof categoryColors]} ${isActive ? 'ring-2 ring-blue-300' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-medium text-gray-900 flex items-center gap-2">
          <CategoryIcon className="h-5 w-5" />
          {template.name}
        </h5>
        {isActive && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            <Activity className="h-3 w-3" />
            فعال
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-4">{template.description}</p>
      <div className="space-y-3">
        {template.steps.map((step, index) => {
          const department = DEPARTMENTS.find(d => d.value === step.department);
          const DepartmentIcon = department?.icon || Users;
          
          return (
            <div key={step.id} className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-white border-2 border-current text-current rounded-full text-sm font-semibold">
                {step.order}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{step.title}</span>
                  {step.isOptional && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">اختیاری</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <DepartmentIcon className={`h-3 w-3 ${department?.color || 'text-gray-500'}`} />
                  <span>{department?.label || step.department}</span>
                  <span>•</span>
                  <Clock className="h-3 w-3" />
                  <span>{step.estimatedTime} دقیقه</span>
                </div>
              </div>
              {index < template.steps.length - 1 && <ArrowRight className="h-4 w-4 text-gray-400" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main Component
export const WorkflowSettings: React.FC = () => {
  const { loadSettings, saveSettings, exportSettings, importSettings } = useWorkflowSettings();
  
  // State Management
  const [settings, setSettings] = useState<WorkflowSettings>({} as WorkflowSettings);
  const [originalSettings, setOriginalSettings] = useState<WorkflowSettings>({} as WorkflowSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [notification, setNotification] = useState<NotificationState>({ type: null, message: '' });
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'security' | 'integrations' | 'ui'>('basic');
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        setIsLoading(true);
        const loadedSettings = await loadSettings();
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      } catch (error) {
        setNotification({ 
          type: 'error', 
          message: 'خطا در بارگذاری تنظیمات. از تنظیمات پیش‌فرض استفاده می‌شود.',
          duration: 8000
        });
        // Use default settings if loading fails
        const service = new WorkflowSettingsService();
        const defaultSettings = (service as any).getDefaultSettings();
        setSettings(defaultSettings);
        setOriginalSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();
  }, [loadSettings]);

  // Validation and change detection
  const updateSettings = useCallback((field: keyof WorkflowSettings, value: any) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    
    // Check for changes
    const hasChanges = JSON.stringify(newSettings) !== JSON.stringify(originalSettings);
    setHasUnsavedChanges(hasChanges);
    
    // Validate field
    const error = validateField(field, value, newSettings);
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
    
    // Clear notification
    if (notification.type) {
      setNotification({ type: null, message: '' });
    }
  }, [settings, originalSettings, notification.type]);

  // Save settings
  const handleSave = async () => {
    // Validate all fields
    const errors: ValidationErrors = {};
    Object.keys(settings).forEach(key => {
      const error = validateField(key, (settings as any)[key], settings);
      if (error) errors[key] = error;
    });
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setNotification({ type: 'error', message: 'لطفاً خطاهای موجود را برطرف کنید' });
      return;
    }
    
    setIsSaving(true);
    try {
      await saveSettings(settings);
      setOriginalSettings(settings);
      setHasUnsavedChanges(false);
      setNotification({ type: 'success', message: 'تنظیمات با موفقیت ذخیره شد' });
    } catch (error) {
      setNotification({ type: 'error', message: 'خطا در ذخیره تنظیمات. لطفاً مجدداً تلاش کنید.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset settings
  const handleReset = () => {
    setSettings(originalSettings);
    setHasUnsavedChanges(false);
    setValidationErrors({});
    setNotification({ type: 'success', message: 'تنظیمات به حالت اولیه بازگردانده شد' });
  };

  // Export settings
  const handleExport = async () => {
    try {
      const blob = await exportSettings();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setNotification({ type: 'success', message: 'تنظیمات با موفقیت خروجی گرفت' });
    } catch (error) {
      setNotification({ type: 'error', message: 'خطا در خروجی گرفتن تنظیمات' });
    }
  };

  // Import settings
  const handleImport = async (file: File) => {
    try {
      const importedSettings = await importSettings(file);
      setSettings(importedSettings);
      setHasUnsavedChanges(true);
      setNotification({ type: 'success', message: 'تنظیمات با موفقیت وارد شد' });
      setShowImportDialog(false);
    } catch (error) {
      setNotification({ type: 'error', message: 'خطا در وارد کردن تنظیمات. فایل معتبر نیست.' });
    }
  };

  // Auto-hide notifications
  useEffect(() => {
    if (notification.type && notification.duration) {
      const timer = setTimeout(() => {
        setNotification({ type: null, message: '' });
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && !isSaving) {
          handleSave();
        }
      }
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleReset();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [hasUnsavedChanges, isSaving]);

  // Filtered workflow templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return WORKFLOW_TEMPLATES;
    return WORKFLOW_TEMPLATES.filter(template => 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-screen">
        <div className="flex items-center space-x-4 space-x-reverse">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900">در حال بارگذاری تنظیمات</div>
            <div className="text-sm text-gray-600 mt-1">لطفاً کمی صبر کنید...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Workflow className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">تنظیمات پیشرفته گردش کار</h1>
              <p className="text-gray-600 mt-1">مدیریت جامع گردش کارها، امنیت و یکپارچگی سیستم</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3 space-x-reverse">
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              <Download className="h-4 w-4" />
              <span>خروجی</span>
            </button>
            
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              <Upload className="h-4 w-4" />
              <span>ورودی</span>
            </button>

            {hasUnsavedChanges && (
              <button
                onClick={handleReset}
                disabled={isSaving}
                className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                <span>بازنشانی</span>
              </button>
            )}
            
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="flex items-center space-x-2 space-x-reverse px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</span>
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification.type && (
          <div className={`
            flex items-center justify-between space-x-3 space-x-reverse p-4 rounded-lg mb-6
            ${notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : notification.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : notification.type === 'warning'
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
            }
          `}>
            <div className="flex items-center space-x-2 space-x-reverse">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification({ type: null, message: '' })}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 space-x-reverse bg-gray-100 rounded-lg p-1">
          {[
            { id: 'basic', label: 'تنظیمات پایه', icon: Settings },
            { id: 'advanced', label: 'پیشرفته', icon: Shield },
            { id: 'security', label: 'امنیت', icon: Lock },
            { id: 'integrations', label: 'یکپارچگی', icon: Globe },
            { id: 'ui', label: 'رابط کاربری', icon: Smartphone }
          ].map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg transition-colors duration-200
                  ${activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <IconComponent className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* Basic Settings Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">تنظیمات پایه گردش کار</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* General Settings */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-500" />
                    تنظیمات عمومی
                  </h3>
                  <div className="space-y-6">
                    <CheckboxField
                      label="فعال‌سازی گردش کار"
                      checked={settings.workflowEnabled || false}
                      onChange={(checked) => updateSettings('workflowEnabled', checked)}
                      tooltip={{
                        title: 'فعال‌سازی گردش کار',
                        text: 'با فعال کردن این گزینه، گردش کارهای سیستم فعال می‌شوند.'
                      }}
                    />
                    
                    <CheckboxField
                      label="تایید خودکار سفارش‌های کوچک"
                      checked={settings.autoApproveSmallOrders || false}
                      onChange={(checked) => updateSettings('autoApproveSmallOrders', checked)}
                      tooltip={{
                        title: 'تایید خودکار سفارش‌های کوچک',
                        text: 'با فعال کردن این گزینه، سفارش‌های با مبلغ کمتر از حد مشخص شده به طور خودکار تایید می‌شوند.'
                      }}
                    />

                    <CheckboxField
                      label="اعلان‌های ایمیل"
                      checked={settings.emailNotifications || false}
                      onChange={(checked) => updateSettings('emailNotifications', checked)}
                      tooltip={{
                        title: 'اعلان‌های ایمیل',
                        text: 'ارسال اعلان‌های تغییرات گردش کار از طریق ایمیل.'
                      }}
                    />

                    <CheckboxField
                      label="اعلان‌های پوش (Push Notifications)"
                      checked={settings.pushNotifications || false}
                      onChange={(checked) => updateSettings('pushNotifications', checked)}
                      tooltip={{
                        title: 'اعلان‌های پوش',
                        text: 'ارسال اعلان‌های فوری در مرورگر و اپلیکیشن موبایل.'
                      }}
                    />
                  </div>
                </div>

                {/* Financial Settings */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    مقادیر مالی و زمانی
                  </h3>
                  <div className="space-y-6">
                    <InputField
                      label="حداکثر مبلغ سفارش (ریال)"
                      value={formatCurrency(settings.maxOrderAmount || 0, settings.language)}
                      onChange={(value) => updateSettings('maxOrderAmount', value)}
                      error={validationErrors.maxOrderAmount}
                      tooltip={{
                        title: 'حداکثر مبلغ سفارش',
                        text: 'حداکثر مبلغی که سفارش‌های با مبلغ کمتر از آن به طور خودکار تایید می‌شوند.'
                      }}
                    />
                    
                    <InputField
                      label="سطوح تایید سفارش"
                      value={settings.orderApprovalLevels || 1}
                      onChange={(value) => updateSettings('orderApprovalLevels', value)}
                      error={validationErrors.orderApprovalLevels}
                      tooltip={{
                        title: 'سطوح تایید سفارش',
                        text: 'تعداد سطوح تایید لازم برای سفارش‌ها را مشخص کنید (حداکثر ۱۰ سطح).'
                      }}
                    />
                    
                    <InputField
                      label="حداکثر زمان تایید (ساعت)"
                      value={settings.maxApprovalTime || 24}
                      onChange={(value) => updateSettings('maxApprovalTime', value)}
                      error={validationErrors.maxApprovalTime}
                      tooltip={{
                        title: 'حداکثر زمان تایید',
                        text: 'حداکثر زمانی که برای تایید فرآیندها در نظر گرفته می‌شود.'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Department Selection */}
              <div className="mt-8">
                <SelectField
                  label="مسئول تایید نهایی"
                  value={settings.finalApproverDepartment || 'financial'}
                  onChange={(value) => updateSettings('finalApproverDepartment', value)}
                  options={DEPARTMENTS}
                  tooltip={{
                    title: 'مسئول تایید نهایی',
                    text: 'دپارتمان یا نقشی که مسئولیت تایید نهایی گردش کارها را بر عهده دارد.'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">تنظیمات پیشرفته</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Workflow Configuration */}
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-6 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    پیکربندی گردش کار
                  </h3>
                  <div className="space-y-6">
                    <CheckboxField
                      label="تایید موازی (Parallel Approvals)"
                      checked={settings.allowParallelApprovals || false}
                      onChange={(checked) => updateSettings('allowParallelApprovals', checked)}
                      tooltip={{
                        title: 'تایید موازی',
                        text: 'اجازه تایید همزمان توسط چندین کاربر در یک سطح.'
                      }}
                    />

                    <CheckboxField
                      label="امضای دیجیتال الزامی"
                      checked={settings.requireDigitalSignature || false}
                      onChange={(checked) => updateSettings('requireDigitalSignature', checked)}
                      tooltip={{
                        title: 'امضای دیجیتال',
                        text: 'الزام به امضای دیجیتال برای تایید مراحل حساس.'
                      }}
                    />

                    <CheckboxField
                      label="Escalation خودکار"
                      checked={settings.autoEscalationEnabled || false}
                      onChange={(checked) => updateSettings('autoEscalationEnabled', checked)}
                      tooltip={{
                        title: 'Escalation خودکار',
                        text: 'ارتقای خودکار فرآیندهای در انتظار پس از گذشت زمان مشخص.'
                      }}
                    />

                    {settings.autoEscalationEnabled && (
                      <InputField
                        label="Escalation پس از (ساعت)"
                        value={settings.escalationAfterHours || 8}
                        onChange={(value) => updateSettings('escalationAfterHours', value)}
                        error={validationErrors.escalationAfterHours}
                        tooltip={{
                          title: 'زمان Escalation',
                          text: 'زمانی که پس از آن فرآیند به سطح بالاتر ارتقا می‌یابد.'
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-green-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-6 flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    تنظیمات اعلان
                  </h3>
                  <div className="space-y-6">
                    <CheckboxField
                      label="اعلان‌های SMS"
                      checked={settings.smsNotifications || false}
                      onChange={(checked) => updateSettings('smsNotifications', checked)}
                      tooltip={{
                        title: 'اعلان‌های SMS',
                        text: 'ارسال اعلان‌های فوری از طریق پیامک.'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Workflow Templates */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-500" />
                    قالب‌های گردش کار
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="جستجو در قالب‌ها..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredTemplates.map(template => (
                    <WorkflowVisualization
                      key={template.id}
                      template={template}
                      isActive={settings.workflowEnabled || false}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings Tab */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">تنظیمات امنیت</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Session Management */}
                <div className="bg-red-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-6 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    مدیریت نشست
                  </h3>
                  <div className="space-y-6">
                    <InputField
                      label="Timeout نشست (دقیقه)"
                      value={settings.sessionTimeout || 30}
                      onChange={(value) => updateSettings('sessionTimeout', value)}
                      error={validationErrors.sessionTimeout}
                      tooltip={{
                        title: 'Timeout نشست',
                        text: 'زمان اعتبار نشست کاربر در صورت عدم فعالیت.'
                      }}
                    />

                    <InputField
                      label="حداکثر تلاش‌های ورود"
                      value={settings.maxLoginAttempts || 3}
                      onChange={(value) => updateSettings('maxLoginAttempts', value)}
                      error={validationErrors.maxLoginAttempts}
                      tooltip={{
                        title: 'حداکثر تلاش‌های ورود',
                        text: 'تعداد مجاز تلاش‌های ناموفق ورود قبل از مسدودسازی موقت.'
                      }}
                    />

                    <CheckboxField
                      label="تایید دوعاملی (2FA)"
                      checked={settings.requireTwoFactor || false}
                      onChange={(checked) => updateSettings('requireTwoFactor', checked)}
                      tooltip={{
                        title: 'تایید دوعاملی',
                        text: 'الزام به استفاده از تایید هویت دوعاملی برای ورود به سیستم.'
                      }}
                    />
                  </div>
                </div>

                {/* IP Management */}
                <div className="bg-orange-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-6 flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    مدیریت IP
                  </h3>
                  <div className="space-y-4">
                    <InputField
                      label="IP‌های مجاز (هر خط یک IP)"
                      value={(settings.ipWhitelist || []).join('\n')}
                      onChange={(value) => updateSettings('ipWhitelist', value.split('\n').filter(ip => ip.trim()))}
                      type="text"
                      placeholder="192.168.1.1&#10;10.0.0.1"
                      tooltip={{
                        title: 'IP‌های مجاز',
                        text: 'لیست IP‌های مجاز برای دسترسی به سیستم (هر IP در خط جداگانه).'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">یکپارچگی و API</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* API Settings */}
                <div className="bg-purple-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-6 flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    تنظیمات API
                  </h3>
                  <div className="space-y-6">
                    <CheckboxField
                      label="فعال‌سازی API"
                      checked={settings.apiEnabled || false}
                      onChange={(checked) => updateSettings('apiEnabled', checked)}
                      tooltip={{
                        title: 'فعال‌سازی API',
                        text: 'فعال‌سازی API برای ارتباط با سیستم‌های خارجی.'
                      }}
                    />

                    {settings.apiEnabled && (
                      <>
                        <InputField
                          label="آدرس Webhook"
                          value={settings.webhookUrl || ''}
                          onChange={(value) => updateSettings('webhookUrl', value)}
                          type="url"
                          placeholder="https://example.com/webhook"
                          error={validationErrors.webhookUrl}
                          tooltip={{
                            title: 'آدرس Webhook',
                            text: 'آدرس URL برای دریافت اطلاعات تغییرات به صورت webhook.'
                          }}
                        />

                        <InputField
                          label="فاصله همگام‌سازی (دقیقه)"
                          value={settings.syncInterval || 60}
                          onChange={(value) => updateSettings('syncInterval', value)}
                          error={validationErrors.syncInterval}
                          tooltip={{
                            title: 'فاصله همگام‌سازی',
                            text: 'فاصله زمانی بین همگام‌سازی خودکار داده‌ها.'
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* UI Settings Tab */}
        {activeTab === 'ui' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">تنظیمات رابط کاربری</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Theme and Language */}
                <div className="bg-indigo-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-6 flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    ظاهر و زبان
                  </h3>
                  <div className="space-y-6">
                    <SelectField
                      label="تم (Theme)"
                      value={settings.theme || 'light'}
                      onChange={(value) => updateSettings('theme', value)}
                      options={[
                        { value: 'light', label: 'روشن' },
                        { value: 'dark', label: 'تیره' },
                        { value: 'auto', label: 'خودکار (بر اساس سیستم)' }
                      ]}
                      tooltip={{
                        title: 'تم رابط کاربری',
                        text: 'انتخاب تم رنگی برای رابط کاربری.'
                      }}
                    />

                    <SelectField
                      label="زبان"
                      value={settings.language || 'fa'}
                      onChange={(value) => updateSettings('language', value)}
                      options={[
                        { value: 'fa', label: 'فارسی' },
                        { value: 'en', label: 'English' }
                      ]}
                      tooltip={{
                        title: 'زبان رابط کاربری',
                        text: 'انتخاب زبان پیش‌فرض رابط کاربری.'
                      }}
                    />

                    <SelectField
                      label="قالب تاریخ"
                      value={settings.dateFormat || 'YYYY/MM/DD'}
                      onChange={(value) => updateSettings('dateFormat', value)}
                      options={[
                        { value: 'YYYY/MM/DD', label: '۱۴۰۳/۰۹/۲۵' },
                        { value: 'DD/MM/YYYY', label: '۲۵/۰۹/۱۴۰۳' },
                        { value: 'MM/DD/YYYY', label: '۰۹/۲۵/۱۴۰۳' }
                      ]}
                      tooltip={{
                        title: 'قالب نمایش تاریخ',
                        text: 'فرمت نمایش تاریخ در رابط کاربری.'
                      }}
                    />

                    <SelectField
                      label="قالب اعداد"
                      value={settings.numberFormat || 'fa'}
                      onChange={(value) => updateSettings('numberFormat', value)}
                      options={[
                        { value: 'fa', label: 'فارسی (۱۲۳۴)' },
                        { value: 'en', label: 'انگلیسی (1234)' }
                      ]}
                      tooltip={{
                        title: 'قالب نمایش اعداد',
                        text: 'فرمت نمایش اعداد در رابط کاربری.'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm text-gray-600">
              <span>آخرین ذخیره‌سازی: </span>
              <span className="font-medium">
                {new Date().toLocaleString('fa-IR')}
              </span>
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">تغییرات ذخیره نشده</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>کلیدهای میانبر:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl + S</kbd>
                <span>ذخیره</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl + R</kbd>
                <span>بازنشانی</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">وارد کردن تنظیمات</h3>
            <p className="text-gray-600 mb-4">
              فایل تنظیمات JSON خود را انتخاب کنید. این عملیات تنظیمات فعلی را جایگزین خواهد کرد.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
              className="w-full mb-4 p-3 border border-gray-300 rounded-lg"
            />
            <div className="flex gap-3 space-x-reverse">
              <button
                onClick={() => setShowImportDialog(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};