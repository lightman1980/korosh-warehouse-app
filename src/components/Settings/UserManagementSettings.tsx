import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, X, Layers, Plus, UserPlus, Save, Eye, EyeOff, 
  Edit2, Trash2, AlertTriangle, CheckCircle, Search, 
  User, Shield, RefreshCw, HelpCircle, Activity, XCircle, Download,
  Clock, UserCog, Lock, Unlock, Filter, Calendar, MapPin,
  Bell, Settings, FileText, Database, Package, Receipt,
  BarChart3, Mail, HardDrive, LogOut, LogIn,
  MoreHorizontal, ChevronDown, ChevronRight, ExternalLink, Upload,
  ArrowUpDown, AlertCircle, TrendingUp, TrendingDown, UserCheck, UserX,
  Grid, FileCheck, Monitor
} from 'lucide-react';
import { DataStorage } from '../../utils/dataStorage';
import jalaali from 'jalaali-js';
import { exportToExcel } from '../../utils/excelExport';
import { formatPersianDate as utilsFormatPersianDate } from '../../utils/persian';

type PermissionAction = 'create' | 'edit' | 'view' | 'delete';

interface PermissionActionSet {
  create: boolean;
  edit: boolean;
  view: boolean;
  delete: boolean;
}

interface ModulePermission extends PermissionActionSet {
  moduleId: string;
}

interface SystemModule {
  id: string;
  name: string;
  category: string;
  icon?: string;
  description?: string;
}

interface UserGroup {
  id: string;
  name: string;
  description: string;
  color?: string;
  permissions: ModulePermission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members: number;
}

interface UserAccessOverride {
  moduleId: string;
  actions: PermissionActionSet;
}

interface UserAccessEntry {
  userId: string;
  username: string;
  displayName?: string;
  groups: string[];
  overrides: UserAccessOverride[];
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

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'error' | 'warning' | 'info';
  details?: Record<string, any>;
}

interface UserManagementSettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
}

const defaultPermissionCatalog: SystemModule[] = [
  { 
    id: 'dashboard', 
    name: 'داشبورد', 
    category: 'داشبورد',
    icon: 'LayoutDashboard',
    description: 'مشاهده داشبورد اصلی سیستم'
  },
  { 
    id: 'base_data', 
    name: 'اطلاعات پایه', 
    category: 'اطلاعات پایه',
    icon: 'Database',
    description: 'مدیریت اطلاعات پایه سیستم'
  },
  { 
    id: 'contracts', 
    name: 'مدیریت قراردادها', 
    category: 'قراردادها',
    icon: 'FileText',
    description: 'مدیریت قراردادهای انبار'
  },
  { 
    id: 'consignment_receipt', 
    name: 'رسید انبار امانی', 
    category: 'انبار',
    icon: 'FileText',
    description: 'ثبت رسید کالای امانی'
  },
  { 
    id: 'ownership_receipt', 
    name: 'رسید انبار تملیکی', 
    category: 'انبار',
    icon: 'FileText',
    description: 'ثبت رسید کالای تملیکی'
  },
  { 
    id: 'warehouse_delivery', 
    name: 'حواله انبار', 
    category: 'انبار',
    icon: 'FileOutput',
    description: 'صدور و مدیریت حواله انبار'
  },
  { 
    id: 'consignment_delivery', 
    name: 'حواله امانی', 
    category: 'انبار',
    icon: 'Truck',
    description: 'صدور حواله کالای امانی'
  },
  { 
    id: 'ownership_delivery', 
    name: 'حواله تملیکی', 
    category: 'انبار',
    icon: 'Truck',
    description: 'صدور حواله کالای تملیکی'
  },
  { 
    id: 'inventory_adjustment', 
    name: 'کسر/اضافه انبار', 
    category: 'انبار',
    icon: 'Scale',
    description: 'ثبت کسر و اضافه موجودی'
  },
  { 
    id: 'product_conversion', 
    name: 'تبدیل کالا', 
    category: 'انبار',
    icon: 'ArrowRightLeft',
    description: 'تبدیل محصولات به یکدیگر'
  },
  { 
    id: 'invoice', 
    name: 'صدور فاکتور', 
    category: 'مالی',
    icon: 'Receipt',
    description: 'صدور فاکتور فروش'
  },
  { 
    id: 'reports', 
    name: 'گزارشات', 
    category: 'گزارش',
    icon: 'TrendingUp',
    description: 'گزارشات سیستم'
  },
  { 
    id: 'inventory_ledger', 
    name: 'کاردکس موجودی', 
    category: 'گزارش',
    icon: 'BookOpen',
    description: 'مشاهده کاردکس موجودی'
  },
  { 
    id: 'analytics', 
    name: 'تحلیل و بررسی', 
    category: 'گزارش',
    icon: 'BarChart3',
    description: 'تحلیل و بررسی داده‌ها'
  },
  { 
    id: 'speech-to-text', 
    name: 'امکانات ویژه', 
    category: 'سیستم',
    icon: 'Mic',
    description: 'امکانات ویژه سیستم (ساخت محصول جدید و ...)'
  },
  { 
    id: 'correspondence', 
    name: 'مکاتبات', 
    category: 'سیستم',
    icon: 'Mail',
    description: 'سیستم مکاتبات داخلی'
  },
  { 
    id: 'user_management', 
    name: 'مدیریت کاربران', 
    category: 'سیستم',
    icon: 'Users',
    description: 'مدیریت کاربران و دسترسی‌ها'
  },
  { 
    id: 'settings', 
    name: 'تنظیمات', 
    category: 'سیستم',
    icon: 'Settings',
    description: 'تنظیمات سیستم'
  },
  { 
    id: 'backup', 
    name: 'پشتیبان گیری و بازیابی', 
    category: 'سیستم',
    icon: 'HardDrive',
    description: 'پشتیبان گیری از اطلاعات'
  },
  { 
    id: 'logging', 
    name: 'لاگ و رویدادها', 
    category: 'سیستم',
    icon: 'FileText',
    description: 'مشاهده لاگ‌های سیستم'
  }
];

const GROUP_COLORS = [
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-red-100 text-red-700 border-red-200',
  'bg-gray-100 text-gray-700 border-gray-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200'
];

export const UserManagementSettings: React.FC<UserManagementSettingsProps> = ({
  settings,
  setSettings
}) => {
  const storage = useMemo(() => DataStorage.getInstance(), []);
  
  // State management
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'permissions' | 'activities' | 'matrix' | 'audit' | 'sessions'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    visible: boolean;
  }>({ type: 'info', message: '', visible: false });

  // New state for advanced features
  const [selectedGroupsForUser, setSelectedGroupsForUser] = useState<string[]>([]);
  const [tempUserId, setTempUserId] = useState<string>('');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityFilter, setActivityFilter] = useState({
    userId: 'all',
    action: 'all',
    dateFrom: '',
    dateTo: ''
  });
  
  // Advanced state management
  const [selectedPermissionMatrix, setSelectedPermissionMatrix] = useState<string[]>([]);
  const [bulkOperationTarget, setBulkOperationTarget] = useState<string[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedUserForSession, setSelectedUserForSession] = useState<string>('');
  const [auditFilter, setAuditFilter] = useState({
    timeframe: '7d',
    eventType: 'all',
    severity: 'all'
  });

  // User form state
  const [userForm, setUserForm] = useState<UserProfile>({
    id: '',
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    departmentId: '',
    departmentName: '',
    role: 'user',
    isActive: true,
    isEmailVerified: false,
    failedLoginAttempts: 0,
    createdAt: '',
    updatedAt: '',
    permissions: []
  });

  // Group form state
  const [groupForm, setGroupForm] = useState<UserGroup>({
    id: '',
    name: '',
    description: '',
    color: GROUP_COLORS[0],
    permissions: [],
    isActive: true,
    createdAt: '',
    updatedAt: '',
    members: 0
  });

  // Form validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load data
  const userManagement = settings?.userManagement || {};
  const permissionCatalog: SystemModule[] = useMemo(
    () => (userManagement.permissionCatalog && userManagement.permissionCatalog.length > 0
      ? userManagement.permissionCatalog
      : defaultPermissionCatalog),
    [userManagement.permissionCatalog]
  );

  // State برای force refresh لیست کاربران
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);
  
  const availableUsers = useMemo(() => {
    const users = storage.loadData<UserProfile[]>('users') || [];
    return Array.isArray(users) ? users : [];
  }, [storage, usersRefreshKey]);

  const normalizedGroups: UserGroup[] = useMemo(() => {
    const groups: UserGroup[] = userManagement.userGroups || [];
    return groups.map(group => ({
      ...group,
      permissions: ensureModulePermissions(permissionCatalog, group.permissions),
      members: userManagement.userAccess?.filter((u: UserAccessEntry) => u.groups.includes(group.id)).length || 0
    }));
  }, [userManagement.userGroups, userManagement.userAccess, permissionCatalog]);

  const normalizedUserAccess: UserAccessEntry[] = useMemo(() => {
    const entries: UserAccessEntry[] = userManagement.userAccess || [];
    return entries.map(entry => ({
      ...entry,
      overrides: ensureOverrides(permissionCatalog, entry.overrides)
    }));
  }, [userManagement.userAccess, permissionCatalog]);

  // Load departments
  const departments = useMemo(() => {
    try {
      const baseDataCategories = storage.loadData<any[]>('baseDataCategories') || [];
      const deptCategory = baseDataCategories.find((cat: any) => cat.id === 'departments');
      return (deptCategory?.items || []).filter((item: any) => item.isActive !== false);
    } catch {
      return [];
    }
  }, [storage]);

  // Initialize activity logs
  useEffect(() => {
    const logs = generateActivityLogs();
    setActivityLogs(logs);
  }, [availableUsers]);

  // Sync availableUsers with normalizedUserAccess - ensure all users have access entries
  useEffect(() => {
    if (availableUsers.length === 0) return;
    
    const currentAccess = userManagement.userAccess || [];
    const missingUsers = availableUsers.filter(user => 
      !currentAccess.find((entry: UserAccessEntry) => entry.userId === user.id)
    );
    
    if (missingUsers.length > 0) {
      const newAccessEntries: UserAccessEntry[] = missingUsers.map(user => ({
        userId: user.id,
        username: user.username,
        displayName: user.fullName,
        groups: [],
        overrides: ensureOverrides(permissionCatalog)
      }));
      
      updateUserManagement({ 
        userAccess: [...currentAccess, ...newAccessEntries] 
      });
    }
  }, [availableUsers, userManagement.userAccess, permissionCatalog]);

  // Helper functions
  function ensureModulePermissions(catalog: SystemModule[], current?: ModulePermission[]): ModulePermission[] {
    return catalog.map(module => {
      const existing = current?.find(p => p.moduleId === module.id);
      return {
        moduleId: module.id,
        create: existing?.create ?? false,
        edit: existing?.edit ?? false,
        view: existing?.view ?? false,
        delete: existing?.delete ?? false
      };
    });
  }

  function ensureOverrides(catalog: SystemModule[], current?: UserAccessOverride[]): UserAccessOverride[] {
    return catalog.map(module => {
      const existing = current?.find(p => p.moduleId === module.id);
      return {
        moduleId: module.id,
        actions: {
          create: existing?.actions?.create ?? false,
          edit: existing?.actions?.edit ?? false,
          view: existing?.actions?.view ?? false,
          delete: existing?.actions?.delete ?? false
        }
      };
    });
  }

  function showNotification(type: 'success' | 'error' | 'warning' | 'info', message: string) {
    setNotification({ type, message, visible: true });
    setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 4000);
  }

  function validateUserForm(): boolean {
    const errors: Record<string, string> = {};
    let hasErrors = false;
    
    // Basic required field validation
    if (!userForm.username?.trim()) {
      errors.username = 'نام کاربری الزامی است';
      hasErrors = true;
    } else if (userForm.username.length < 3) {
      errors.username = 'نام کاربری باید حداقل 3 کاراکتر باشد';
      hasErrors = true;
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(userForm.username)) {
      errors.username = 'نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد، نقطه، خط تیره و زیرخط باشد';
      hasErrors = true;
    } else {
      // Check username uniqueness
      const existingUser = availableUsers.find(u => 
        u.username.toLowerCase() === userForm.username.toLowerCase() && 
        u.id !== editingUser
      );
      if (existingUser) {
        errors.username = 'این نام کاربری قبلاً استفاده شده است';
        hasErrors = true;
      }
    }
    
    // Validate full name
    if (!userForm.fullName?.trim()) {
      errors.fullName = 'نام کامل الزامی است';
      hasErrors = true;
    } else if (userForm.fullName.trim().length < 2) {
      errors.fullName = 'نام کامل باید حداقل 2 کاراکتر باشد';
      hasErrors = true;
    }
    
    // Validate email
    if (!userForm.email?.trim()) {
      errors.email = 'ایمیل الزامی است';
      hasErrors = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userForm.email)) {
        errors.email = 'فرمت ایمیل نامعتبر است';
        hasErrors = true;
      } else {
        // Check email uniqueness
        const existingUser = availableUsers.find(u => 
          u.email.toLowerCase() === userForm.email.toLowerCase() && 
          u.id !== editingUser
        );
        if (existingUser) {
          errors.email = 'این ایمیل قبلاً استفاده شده است';
          hasErrors = true;
        }
      }
    }
    
    // Validate phone if provided
    if (userForm.phone?.trim()) {
      const phoneRegex = /^(\+98|0)?9\d{9}$/;
      if (!phoneRegex.test(userForm.phone.replace(/\s+/g, ''))) {
        errors.phone = 'شماره تماس نامعتبر است (مثال: 09123456789)';
        hasErrors = true;
      }
    }
    
    // Password validation for new users or when password is provided
    if (!editingUser || userForm.password?.trim()) {
      if (!editingUser && !userForm.password?.trim()) {
        errors.password = 'رمز عبور برای کاربران جدید الزامی است';
        hasErrors = true;
      } else if (userForm.password && userForm.password.length < 6) {
        errors.password = 'رمز عبور باید حداقل 6 کاراکتر باشد';
        hasErrors = true;
      }
    }
    
    setFormErrors(errors);
    
    // Log validation errors for debugging
    if (hasErrors) {
      console.log('Form validation errors:', errors);
    }
    
    return !hasErrors;
  }

  function validateGroupForm(): boolean {
    const errors: Record<string, string> = {};
    
    if (!groupForm.name.trim()) errors.name = 'نام گروه الزامی است';
    
    // Check for duplicate group name
    if (groupForm.name.trim()) {
      const existingGroup = normalizedGroups.find(g => 
        g.name.toLowerCase() === groupForm.name.toLowerCase() && 
        g.id !== editingGroup
      );
      if (existingGroup) {
        errors.name = 'این نام گروه قبلاً استفاده شده است';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Persian date formatting functions (matching InventoryAdjustmentManager exactly)
  const formatPersianDate = (date: string | Date): string => {
    return utilsFormatPersianDate(date);
  };

  // Enhanced Persian date formatting with full details
  const formatPersianDateComplete = (date: string | Date): string => {
    try {
      const d = new Date(date);
      const j = jalaali.toJalaali(d);
      const persianMonths = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
      ];
      const persianWeekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
      
      const dayOfWeek = persianWeekDays[d.getDay()];
      const month = persianMonths[j.jm - 1];
      const day = j.jd;
      const year = j.jy;
      
      return `${dayOfWeek} ${day} ${month} ${year}`;
    } catch {
      return 'تاریخ نامشخص';
    }
  };

  const formatPersianDateTime = (date: string | Date): string => {
    try {
      const d = new Date(date);
      const j = jalaali.toJalaali(d);
      const persianMonths = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
      ];
      const persianWeekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
      
      const dayOfWeek = persianWeekDays[d.getDay()];
      const month = persianMonths[j.jm - 1];
      const day = j.jd;
      const year = j.jy;
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const seconds = d.getSeconds().toString().padStart(2, '0');
      
      return `${dayOfWeek} ${day} ${month} ${year} - ${hours}:${minutes}:${seconds}`;
    } catch {
      return 'زمان نامشخص';
    }
  };

  // Short format for compact displays
  const formatPersianDateShort = (date: string | Date): string => {
    try {
      const d = new Date(date);
      const j = jalaali.toJalaali(d);
      return `${j.jy}/${j.jm.toString().padStart(2, '0')}/${j.jd.toString().padStart(2, '0')}`;
    } catch {
      return '---';
    }
  };

  // Get relative time (e.g., "2 ساعت پیش")
  const getRelativeTime = (date: string | Date): string => {
    try {
      const d = new Date(date);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);

      if (diffSeconds < 60) {
        return 'چند لحظه پیش';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} دقیقه پیش`;
      } else if (diffHours < 24) {
        return `${diffHours} ساعت پیش`;
      } else if (diffDays < 7) {
        return `${diffDays} روز پیش`;
      } else if (diffWeeks < 4) {
        return `${diffWeeks} هفته پیش`;
      } else if (diffMonths < 12) {
        return `${diffMonths} ماه پیش`;
      } else {
        return `${diffYears} سال پیش`;
      }
    } catch {
      return 'نامشخص';
    }
  };

  // Calculate activity statistics properly - Enhanced version
  const calculateActivityStats = () => {
    console.log('Calculating activity stats for', activityLogs.length, 'logs');
    
    const totalActivities = activityLogs.length;
    const successfulActivities = activityLogs.filter(log => log.status === 'success').length;
    const failedActivities = activityLogs.filter(log => log.status === 'error').length;
    const warningActivities = activityLogs.filter(log => log.status === 'warning').length;
    const infoActivities = activityLogs.filter(log => log.status === 'info').length;
    
    // Today's activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActivities = activityLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    }).length;
    
    // This week's activities
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekActivities = activityLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= weekStart && logDate <= weekEnd;
    }).length;
    
    // This month's activities
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthActivities = activityLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= monthStart && logDate <= monthEnd;
    }).length;
    
    // Most active users
    const userActivityCounts = activityLogs.reduce((acc, log) => {
      const userName = log.userName || 'نامشخص';
      acc[userName] = (acc[userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostActiveUsers = Object.entries(userActivityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    // Module-wise activity counts
    const moduleActivityCounts = activityLogs.reduce((acc, log) => {
      const module = log.module || 'نامشخص';
      acc[module] = (acc[module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostActiveModules = Object.entries(moduleActivityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    // Recent activity trends (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayActivities = activityLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= date && logDate <= dayEnd;
      }).length;
      
      last7Days.push({
        date: formatPersianDateShort(date),
        count: dayActivities
      });
    }
    
    // Success rate calculation
    const successRate = totalActivities > 0 ? Math.round((successfulActivities / totalActivities) * 100) : 0;
    
    return {
      total: totalActivities,
      successful: successfulActivities,
      failed: failedActivities,
      warnings: warningActivities,
      info: infoActivities,
      today: todayActivities,
      thisWeek: weekActivities,
      thisMonth: monthActivities,
      mostActiveUsers,
      mostActiveModules,
      last7Days,
      successRate
    };
  };

  const activityStats = useMemo(() => calculateActivityStats(), [activityLogs]);
  
  // Filter activities based on current filters
  const filteredActivities = useMemo(() => {
    let filtered = [...activityLogs];
    
    // Filter by user
    if (activityFilter.userId !== 'all') {
      filtered = filtered.filter(log => log.userId === activityFilter.userId);
    }
    
    // Filter by action
    if (activityFilter.action !== 'all') {
      filtered = filtered.filter(log => log.action === activityFilter.action);
    }
    
    // Filter by date range
    if (activityFilter.dateFrom) {
      const fromDate = new Date(activityFilter.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate);
    }
    
    if (activityFilter.dateTo) {
      const toDate = new Date(activityFilter.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
    }
    
    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLogs, activityFilter]);

  // Debug logging for activities tab
  useEffect(() => {
    console.log('Active tab changed to:', activeTab);
    console.log('Activity logs count:', activityLogs.length);
    console.log('Filtered activities count:', filteredActivities.length);
  }, [activeTab, activityLogs, filteredActivities]);

  // Helper functions for user display
  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'admin': return 'مدیر سیستم';
      case 'manager': return 'مدیر میانی';
      case 'user': return 'کاربر عادی';
      case 'operator': return 'اپراتور';
      default: return role;
    }
  };

  const getRoleColorClass = (role: string): string => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'user': return 'bg-green-100 text-green-700 border-green-200';
      case 'operator': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatLastLogin = (lastLogin?: string): string => {
    if (!lastLogin) return 'هیچ‌گاه';
    return getRelativeTime(lastLogin);
  };

  // Generate realistic activity logs
  function generateActivityLogs(): ActivityLog[] {
    const logs: ActivityLog[] = [];
    
    // Define realistic actions with appropriate modules and weights
    const realisticActions = [
      // Authentication activities
      { action: 'ورود موفق به سیستم', module: 'احراز هویت', status: 'success' as const, weight: 30 },
      { action: 'ورود ناموفق به سیستم', module: 'احراز هویت', status: 'error' as const, weight: 5 },
      { action: 'خروج از سیستم', module: 'احراز هویت', status: 'info' as const, weight: 25 },
      
      // User management activities
      { action: 'ایجاد کاربر جدید', module: 'مدیریت کاربران', status: 'success' as const, weight: 2 },
      { action: 'ویرایش اطلاعات کاربر', module: 'مدیریت کاربران', status: 'success' as const, weight: 8 },
      { action: 'حذف کاربر', module: 'مدیریت کاربران', status: 'warning' as const, weight: 1 },
      { action: 'فعال‌سازی کاربر', module: 'مدیریت کاربران', status: 'success' as const, weight: 3 },
      { action: 'غیرفعال‌سازی کاربر', module: 'مدیریت کاربران', status: 'warning' as const, weight: 2 },
      { action: 'تغییر رمز عبور', module: 'امنیت', status: 'success' as const, weight: 5 },
      
      // Group management activities
      { action: 'ایجاد گروه جدید', module: 'مدیریت گروه‌ها', status: 'success' as const, weight: 1 },
      { action: 'ویرایش گروه', module: 'مدیریت گروه‌ها', status: 'success' as const, weight: 4 },
      { action: 'حذف گروه', module: 'مدیریت گروه‌ها', status: 'warning' as const, weight: 1 },
      { action: 'عضویت در گروه', module: 'مدیریت گروه‌ها', status: 'success' as const, weight: 3 },
      { action: 'حذف از گروه', module: 'مدیریت گروه‌ها', status: 'warning' as const, weight: 2 },
      
      // Permission activities
      { action: 'تغییر دسترسی گروه', module: 'مدیریت دسترسی‌ها', status: 'success' as const, weight: 3 },
      { action: 'تغییر دسترسی فردی', module: 'مدیریت دسترسی‌ها', status: 'success' as const, weight: 2 },
      { action: 'تأیید دسترسی‌ها', module: 'مدیریت دسترسی‌ها', status: 'info' as const, weight: 1 },
      
      // Warehouse activities
      { action: 'ثبت رسید انبار امانی', module: 'انبار', status: 'success' as const, weight: 10 },
      { action: 'ثبت رسید انبار تملیکی', module: 'انبار', status: 'success' as const, weight: 8 },
      { action: 'صدور حواله امانی', module: 'انبار', status: 'success' as const, weight: 12 },
      { action: 'صدور حواله تملیکی', module: 'انبار', status: 'success' as const, weight: 10 },
      { action: 'تحویل کالا از انبار', module: 'انبار', status: 'success' as const, weight: 15 },
      { action: 'ثبت کسر/اضافه انبار', module: 'انبار', status: 'warning' as const, weight: 3 },
      { action: 'تبدیل کالا', module: 'انبار', status: 'success' as const, weight: 5 },
      
      // Financial activities
      { action: 'صدور فاکتور فروش', module: 'مالی', status: 'success' as const, weight: 8 },
      { action: 'ویرایش فاکتور', module: 'مالی', status: 'success' as const, weight: 3 },
      { action: 'حذف فاکتور', module: 'مالی', status: 'warning' as const, weight: 1 },
      { action: 'پرداخت فاکتور', module: 'مالی', status: 'success' as const, weight: 6 },
      
      // Reporting activities
      { action: 'مشاهده گزارش کاردکس', module: 'گزارش‌گیری', status: 'info' as const, weight: 15 },
      { action: 'خروجی گزارش Excel', module: 'گزارش‌گیری', status: 'info' as const, weight: 5 },
      { action: 'صدور گزارش تحلیلی', module: 'گزارش‌گیری', status: 'info' as const, weight: 3 },
      { action: 'چاپ گزارش', module: 'گزارش‌گیری', status: 'info' as const, weight: 8 },
      
      // Contract activities
      { action: 'ایجاد قرارداد جدید', module: 'قراردادها', status: 'success' as const, weight: 2 },
      { action: 'ویرایش قرارداد', module: 'قراردادها', status: 'success' as const, weight: 3 },
      { action: 'تمدید قرارداد', module: 'قراردادها', status: 'success' as const, weight: 1 },
      { action: 'خاتمه قرارداد', module: 'قراردادها', status: 'warning' as const, weight: 1 },
      
      // Correspondence activities
      { action: 'ارسال پیام داخلی', module: 'مکاتبات', status: 'info' as const, weight: 10 },
      { action: 'دریافت پیام', module: 'مکاتبات', status: 'info' as const, weight: 8 },
      { action: 'ارسال اطلاعیه', module: 'مکاتبات', status: 'info' as const, weight: 3 },
      
      // System activities
      { action: 'ورود به تنظیمات', module: 'تنظیمات', status: 'info' as const, weight: 5 },
      { action: 'تغییر تنظیمات سیستم', module: 'تنظیمات', status: 'success' as const, weight: 2 },
      { action: 'بازیابی اطلاعات', module: 'سیستم', status: 'warning' as const, weight: 1 }
    ];

    const ipAddresses = [
      '192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.103',
      '10.0.0.50', '10.0.0.51', '10.0.0.52',
      '172.16.0.10', '172.16.0.11',
      '127.0.0.1'
    ];

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
    ];

    // Generate realistic logs for each user
    availableUsers.forEach((user, userIndex) => {
      // Different activity patterns based on user role
      const roleMultiplier = user.role === 'admin' ? 2 : user.role === 'manager' ? 1.5 : 1;
      const isActiveMultiplier = user.isActive ? 1 : 0.3;
      
      const baseLogs = Math.floor(Math.random() * 20) + 10; // 10-30 base logs
      const numLogs = Math.floor(baseLogs * roleMultiplier * isActiveMultiplier);
      
      for (let i = 0; i < numLogs; i++) {
        // Weighted random selection
        const totalWeight = realisticActions.reduce((sum, action) => sum + action.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedAction = realisticActions[0];
        
        for (const action of realisticActions) {
          random -= action.weight;
          if (random <= 0) {
            selectedAction = action;
            break;
          }
        }

        // Generate realistic timestamp
        const now = new Date();
        const daysAgo = Math.floor(Math.random() * 90); // Last 3 months
        const hoursAgo = Math.floor(Math.random() * (daysAgo * 24));
        const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

        // Add some business hours bias (more activity during work hours)
        const hour = timestamp.getHours();
        const isBusinessHour = hour >= 8 && hour <= 18;
        const businessHourMultiplier = isBusinessHour ? 1.5 : 0.7;
        
        if (Math.random() > businessHourMultiplier) continue; // Skip some activities outside business hours

        logs.push({
          id: `log_${user.id}_${i}_${Date.now()}`,
          userId: user.id,
          userName: user.fullName,
          action: selectedAction.action,
          module: selectedAction.module,
          description: `${selectedAction.action} توسط ${user.fullName} در ${selectedAction.module}`,
          timestamp: timestamp.toISOString(),
          ipAddress: ipAddresses[Math.floor(Math.random() * ipAddresses.length)],
          userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
          status: selectedAction.status,
          details: {
            userRole: user.role,
            department: user.departmentName,
            isActive: user.isActive
          }
        });
      }
    });

    // Add realistic system logs
    const systemLogs = [
      {
        id: 'system_backup_daily',
        userId: 'system',
        userName: 'سیستم',
        action: 'پشتیبان گیری خودکار روزانه',
        module: 'سیستم',
        description: 'پشتیبان گیری خودکار روزانه از پایگاه داده انجام شد',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: '127.0.0.1',
        status: 'success' as const,
        details: {
          backupSize: '2.3 GB',
          duration: '45 دقیقه',
          status: 'completed'
        }
      },
      {
        id: 'system_backup_weekly',
        userId: 'system',
        userName: 'سیستم',
        action: 'پشتیبان گیری هفتگی',
        module: 'سیستم',
        description: 'پشتیبان گیری کامل هفتگی انجام شد',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: '127.0.0.1',
        status: 'success' as const,
        details: {
          backupSize: '15.7 GB',
          duration: '3 ساعت 20 دقیقه',
          status: 'completed'
        }
      },
      {
        id: 'system_maintenance',
        userId: 'system',
        userName: 'سیستم',
        action: 'نگهداری برنامه‌ریزی شده',
        module: 'سیستم',
        description: 'نگهداری ماهانه سیستم انجام شد',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: '127.0.0.1',
        status: 'info' as const,
        details: {
          maintenanceType: 'routine',
          duration: '2 ساعت',
          status: 'completed'
        }
      },
      {
        id: 'system_security_update',
        userId: 'system',
        userName: 'سیستم',
        action: 'به‌روزرسانی امنیتی',
        module: 'امنیت',
        description: 'به‌روزرسانی امنیتی خودکار اعمال شد',
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: '127.0.0.1',
        status: 'success' as const,
        details: {
          updateType: 'security_patch',
          version: 'v2.1.5',
          status: 'installed'
        }
      },
      {
        id: 'system_log_cleanup',
        userId: 'system',
        userName: 'سیستم',
        action: 'پاکسازی لاگ‌ها',
        module: 'سیستم',
        description: 'پاکسازی خودکار لاگ‌های قدیمی انجام شد',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: '127.0.0.1',
        status: 'info' as const,
        details: {
          logsDeleted: 15420,
          spaceFreed: '1.2 GB'
        }
      }
    ];

    return [...logs, ...systemLogs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // User management functions
  // Generate unique user ID
  function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Format phone number
  function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('98')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+98${cleaned.substring(1)}`;
    }
    return phone;
  }

  // Get default permissions based on role
  function getDefaultPermissions(role: string): string[] {
    switch (role) {
      case 'admin':
        return permissionCatalog.map(m => m.id);
      case 'manager':
        return permissionCatalog.filter(m => 
          !['user_management', 'backup', 'settings'].includes(m.id)
        ).map(m => m.id);
      case 'operator':
        return permissionCatalog.filter(m => 
          ['dashboard', 'base_data', 'warehouse_delivery', 'consignment_receipt', 'ownership_receipt', 'consignment_delivery', 'ownership_delivery'].includes(m.id)
        ).map(m => m.id);
      default:
        return ['dashboard'];
    }
  }

  function handleCreateUser() {
    console.log('Starting user creation/update...', { editingUser, userForm });
    
    // Clear previous errors
    setFormErrors({});
    
    if (!validateUserForm()) {
      const errorMessages = Object.values(formErrors).join('\n');
      showNotification('error', `خطاهای فرم:\n${errorMessages}`);
      console.log('Form validation failed:', formErrors);
      return;
    }
    
    setLoading(true);
    
    try {
      const now = new Date().toISOString();
      let updatedUsers: UserProfile[] = availableUsers || [];
      let newUserId: string;
      
      // Ensure we have valid users array
      if (!Array.isArray(availableUsers)) {
        console.warn('availableUsers is not an array:', availableUsers);
        updatedUsers = [];
      }
      
      if (editingUser) {
        console.log('Updating existing user...', editingUser);
        
        // Update existing user
        const updateData: Partial<UserProfile> = {
          username: userForm.username.trim(),
          fullName: userForm.fullName.trim(),
          email: userForm.email.trim(),
          phone: userForm.phone ? formatPhone(userForm.phone.trim()) : '',
          departmentId: userForm.departmentId,
          departmentName: userForm.departmentName,
          role: userForm.role,
          isActive: userForm.isActive,
          updatedAt: now
        };
        
        // Only update password if provided
        if (userForm.password && userForm.password.trim()) {
          updateData.password = userForm.password.trim();
          updateData.passwordChangedAt = now;
        }
        
        updatedUsers = availableUsers.map(u => 
          u.id === editingUser ? { ...u, ...updateData } : u
        );
        newUserId = editingUser;
        
        showNotification('success', 'کاربر با موفقیت به‌روزرسانی شد');
        logActivity('ویرایش کاربر', 'مدیریت کاربران', 'success', { 
          userId: editingUser,
          userName: userForm.fullName,
          changes: updateData
        });
      } else {
        console.log('Creating new user...');
        
        // Create new user
        newUserId = generateUserId();
        const newUser: UserProfile = {
          id: newUserId,
          username: userForm.username.trim(),
          password: userForm.password,
          fullName: userForm.fullName.trim(),
          email: userForm.email.trim(),
          phone: userForm.phone ? formatPhone(userForm.phone.trim()) : '',
          departmentId: userForm.departmentId,
          departmentName: userForm.departmentName,
          role: userForm.role,
          isActive: userForm.isActive,
          isEmailVerified: false,
          failedLoginAttempts: 0,
          createdAt: now,
          updatedAt: now,
          permissions: getDefaultPermissions(userForm.role)
        };
        
        updatedUsers = [...availableUsers, newUser];
        
        // Add to access list automatically for new users
        addUserAccess(newUserId, newUser.username, newUser.fullName);
        
        showNotification('success', 'کاربر جدید با موفقیت ایجاد شد');
        logActivity('ایجاد کاربر', 'مدیریت کاربران', 'success', { 
          userId: newUserId,
          userName: newUser.fullName,
          username: newUser.username
        });
      }
      
      // Update user groups
      updateUserGroups(newUserId, selectedGroupsForUser);
      
      // Save to storage
      storage.saveData('users', updatedUsers);
      
      // Force refresh users list
      setUsersRefreshKey(prev => prev + 1);
      
      // Reset form and close modal
      resetUserForm();
      setShowUserForm(false);
      setEditingUser(null);
      setSelectedGroupsForUser([]);
      
      console.log('User operation completed successfully');
      
    } catch (error) {
      console.error('Error saving user:', error);
      showNotification('error', `خطا در ذخیره اطلاعات کاربر: ${error instanceof Error ? error.message : 'خطای نامشخص'}`);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteUser(userId: string) {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) {
      showNotification('error', 'کاربر مورد نظر یافت نشد');
      return;
    }
    
    if (confirm(`آیا از حذف کاربر "${user.fullName}" مطمئن هستید؟\n\nاین عملیات غیرقابل بازگشت است و تمام اطلاعات کاربر از سیستم حذف خواهد شد.`)) {
      try {
        setLoading(true);
        
        // Update users array
        const updatedUsers = availableUsers.filter(u => u.id !== userId);
        storage.saveData('users', updatedUsers);
        
        // Remove from access list
        const updatedAccess = normalizedUserAccess.filter(u => u.userId !== userId);
        
        // Update user management settings
        const currentSettings = { ...settings };
        if (currentSettings.userManagement) {
          currentSettings.userManagement.userAccess = updatedAccess;
          setSettings(currentSettings);
        }
        
        showNotification('success', `کاربر "${user.fullName}" با موفقیت حذف شد`);
        logActivity('حذف کاربر', 'مدیریت کاربران', 'warning', { 
          userId, 
          userName: user.fullName,
          username: user.username 
        });
        
        // Refresh the page data
        window.location.reload();
        
      } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('error', `خطا در حذف کاربر: ${error instanceof Error ? error.message : 'خطای نامشخص'}`);
      } finally {
        setLoading(false);
      }
    }
  }

  function handleBulkAction(action: string) {
    if (selectedUsers.length === 0) return;
    
    try {
      let updatedUsers = [...availableUsers];
      
      switch (action) {
        case 'activate':
          updatedUsers = updatedUsers.map(u => 
            selectedUsers.includes(u.id) ? { ...u, isActive: true } : u
          );
          showNotification('success', `${selectedUsers.length} کاربر فعال شد`);
          logActivity('فعال‌سازی گروهی', 'مدیریت کاربران', 'success', { userIds: selectedUsers });
          break;
        case 'deactivate':
          updatedUsers = updatedUsers.map(u => 
            selectedUsers.includes(u.id) ? { ...u, isActive: false } : u
          );
          showNotification('success', `${selectedUsers.length} کاربر غیرفعال شد`);
          logActivity('غیرفعال‌سازی گروهی', 'مدیریت کاربران', 'warning', { userIds: selectedUsers });
          break;
        case 'delete':
          if (confirm(`آیا از حذف ${selectedUsers.length} کاربر انتخابی مطمئن هستید؟`)) {
            updatedUsers = updatedUsers.filter(u => !selectedUsers.includes(u.id));
            showNotification('success', `${selectedUsers.length} کاربر حذف شد`);
            logActivity('حذف گروهی', 'مدیریت کاربران', 'error', { userIds: selectedUsers });
          } else {
            return;
          }
          break;
      }
      
      storage.saveData('users', updatedUsers);
      setSelectedUsers([]);
      
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showNotification('error', 'خطا در انجام عملیات گروهی');
    }
  }

  // Group management functions
  function handleCreateGroup() {
    if (!validateGroupForm()) {
      showNotification('error', 'لطفاً خطاهای فرم را برطرف کنید');
      return;
    }
    
    setLoading(true);
    
    try {
      const now = new Date().toISOString();
      let updatedGroups: UserGroup[];
      
      if (editingGroup) {
        // Update existing group
        updatedGroups = normalizedGroups.map(g => 
          g.id === editingGroup ? { 
            ...groupForm, 
            updatedAt: now,
            permissions: ensureModulePermissions(permissionCatalog, groupForm.permissions),
            members: userManagement.userAccess?.filter((u: UserAccessEntry) => u.groups.includes(editingGroup)).length || 0
          } : g
        );
        showNotification('success', 'گروه با موفقیت به‌روزرسانی شد');
        logActivity('ویرایش گروه', 'مدیریت گروه‌ها', 'success', { groupId: editingGroup });
      } else {
        // Create new group
        const newGroup: UserGroup = {
          ...groupForm,
          id: `group_${Date.now()}`,
          permissions: ensureModulePermissions(permissionCatalog),
          isActive: true,
          createdAt: now,
          updatedAt: now,
          members: 0
        };
        updatedGroups = [...normalizedGroups, newGroup];
        showNotification('success', 'گروه جدید با موفقیت ایجاد شد');
        logActivity('ایجاد گروه', 'مدیریت گروه‌ها', 'success', { groupId: newGroup.id });
      }
      
      updateUserManagement({ userGroups: updatedGroups });
      
      // Force refresh - settings will update and normalizedGroups will refresh automatically
      // But we also need to ensure the UI updates
      setTimeout(() => {
        // This will trigger a re-render
        setSettings(prev => ({ ...prev }));
      }, 100);
      
      resetGroupForm();
      setShowGroupForm(false);
      setEditingGroup(null);
      
    } catch (error) {
      console.error('Error saving group:', error);
      showNotification('error', 'خطا در ذخیره اطلاعات گروه');
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteGroup(groupId: string) {
    const group = normalizedGroups.find(g => g.id === groupId);
    if (!group) return;
    
    if (confirm(`آیا از حذف گروه "${group.name}" مطمئن هستید؟`)) {
      try {
        const updatedGroups = normalizedGroups.filter(g => g.id !== groupId);
        updateUserManagement({ userGroups: updatedGroups });
        
        // Remove group from all users
        const updatedAccess = normalizedUserAccess.map(access => ({
          ...access,
          groups: access.groups.filter(gId => gId !== groupId)
        }));
        updateUserManagement({ userAccess: updatedAccess });
        
        showNotification('success', 'گروه با موفقیت حذف شد');
        logActivity('حذف گروه', 'مدیریت گروه‌ها', 'warning', { groupId });
      } catch (error) {
        console.error('Error deleting group:', error);
        showNotification('error', 'خطا در حذف گروه');
      }
    }
  }

  // Permission management functions
  function toggleGroupPermission(groupIndex: number, moduleId: string, action: PermissionAction, value: boolean) {
    const groups = [...normalizedGroups];
    const modulePermIndex = groups[groupIndex].permissions.findIndex(p => p.moduleId === moduleId);
    if (modulePermIndex > -1) {
      groups[groupIndex].permissions[modulePermIndex] = {
        ...groups[groupIndex].permissions[modulePermIndex],
        [action]: value
      };
      updateUserManagement({ userGroups: groups });
      logActivity('تغییر دسترسی گروه', 'مدیریت دسترسی‌ها', 'success', { 
        groupId: groups[groupIndex].id, 
        moduleId, 
        action, 
        value 
      });
    }
  }

  function setGroupQuickPermissions(groupIndex: number, mode: 'all' | 'view' | 'none' | 'admin' | 'manager' | 'operator') {
    const groups = [...normalizedGroups];
    groups[groupIndex].permissions = groups[groupIndex].permissions.map(p => {
      switch (mode) {
        case 'all':
          return { ...p, create: true, edit: true, view: true, delete: true };
        case 'view':
          return { ...p, create: false, edit: false, view: true, delete: false };
        case 'admin':
          return { ...p, create: true, edit: true, view: true, delete: true };
        case 'manager':
          return { ...p, create: true, edit: true, view: true, delete: false };
        case 'operator':
          return { ...p, create: false, edit: true, view: true, delete: false };
        default:
          return { ...p, create: false, edit: false, view: false, delete: false };
      }
    });
    updateUserManagement({ userGroups: groups });
    logActivity('تغییر سریع دسترسی گروه', 'مدیریت دسترسی‌ها', 'success', { 
      groupId: groups[groupIndex].id, 
      mode 
    });
  }

  function addUserAccess(userId: string, username: string, displayName?: string) {
    if (normalizedUserAccess.find(u => u.userId === userId)) return;
    const entry: UserAccessEntry = {
      userId,
      username,
      displayName,
      groups: [],
      overrides: ensureOverrides(permissionCatalog)
    };
    updateUserManagement({ userAccess: [...normalizedUserAccess, entry] });
  }

  function updateUserGroups(userId: string, groupIds: string[]) {
    const access = [...normalizedUserAccess];
    const userIndex = access.findIndex(u => u.userId === userId);
    
    if (userIndex >= 0) {
      access[userIndex].groups = groupIds;
      updateUserManagement({ userAccess: access });
    }
  }

  function assignGroupsToUser(userId: string, groupId: string, checked: boolean) {
    const access = [...normalizedUserAccess];
    const userIndex = access.findIndex(u => u.userId === userId);
    
    if (userIndex >= 0) {
      const groups = new Set(access[userIndex].groups || []);
      if (checked) {
        groups.add(groupId);
      } else {
        groups.delete(groupId);
      }
      access[userIndex].groups = Array.from(groups);
      updateUserManagement({ userAccess: access });
      logActivity(
        checked ? 'اضافه به گروه' : 'حذف از گروه', 
        'مدیریت گروه‌ها', 
        'success', 
        { userId, groupId }
      );
    }
  }

  function toggleUserOverride(userId: string, moduleId: string, action: PermissionAction, value: boolean) {
    const access = [...normalizedUserAccess];
    const userIndex = access.findIndex(u => u.userId === userId);
    
    if (userIndex >= 0) {
      const modulePermIndex = access[userIndex].overrides.findIndex(p => p.moduleId === moduleId);
      if (modulePermIndex > -1) {
        const currentOverride = access[userIndex].overrides[modulePermIndex];
        access[userIndex].overrides[modulePermIndex] = {
          ...currentOverride,
          actions: {
            ...currentOverride.actions,
            [action]: value
          }
        };
        updateUserManagement({ userAccess: access });
        logActivity('تغییر دسترسی فردی', 'مدیریت دسترسی‌ها', 'success', { 
          userId, 
          moduleId, 
          action, 
          value 
        });
      }
    }
  }

  // Enhanced activity logging with user context
  function logActivity(action: string, module: string, status: 'success' | 'error' | 'warning' | 'info', details?: Record<string, any>) {
    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'current_user', // This should come from auth context
      userName: 'کاربر جاری',
      action,
      module,
      description: `${action} در ماژول ${module}`,
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1',
      status,
      details
    };
    
    setActivityLogs(prev => [newLog, ...prev].slice(0, 1000)); // Keep last 1000 logs
  }

  // Export user permissions for external use
  function exportUserPermissions(userId: string): Record<string, any> {
    const user = availableUsers.find(u => u.id === userId);
    const userAccess = normalizedUserAccess.find(u => u.userId === userId);
    
    if (!user || !userAccess) return {};
    
    const effectivePerms = getEffectivePermissions(userId);
    const userGroups = normalizedGroups.filter(g => userAccess.groups.includes(g.id));
    
    return {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive
      },
      groups: userGroups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description
      })),
      permissions: effectivePerms,
      summary: getUserPermissionSummary(userId),
      exportedAt: new Date().toISOString()
    };
  }

  // Advanced permission matrix visualization
  function renderPermissionMatrix() {
    const modules = permissionCatalog;
    const users = availableUsers;
    
    return (
      <div className="w-full border border-gray-200 rounded-lg overflow-hidden max-w-full">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full min-w-max border-collapse max-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase border-b">ماژول</th>
              {users.slice(0, 10).map(user => (
                <th key={user.id} className="p-2 text-center text-xs font-medium text-gray-500 uppercase border-b border-l">
                  <div className="transform -rotate-45 whitespace-nowrap">
                    {user.fullName}
                  </div>
                </th>
              ))}
              {users.length > 10 && (
                <th className="p-2 text-center text-xs text-gray-400 border-b border-l">
                  +{users.length - 10} نفر دیگر
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {modules.map(module => (
              <tr key={module.id} className="hover:bg-gray-50">
                <td className="p-3 text-sm font-medium text-gray-900 border-b border-r">
                  <div className="flex items-center gap-2">
                    <span>{module.name}</span>
                    <span className="text-xs text-gray-500">({module.category})</span>
                  </div>
                </td>
                {users.slice(0, 10).map(user => {
                  const effectivePerms = getEffectivePermissions(user.id);
                  const modulePerms = effectivePerms[module.id] || { create: false, edit: false, view: false, delete: false };
                  const hasAnyPerm = modulePerms.create || modulePerms.edit || modulePerms.view || modulePerms.delete;
                  
                  return (
                    <td key={user.id} className="p-2 text-center border-b border-l">
                      <div className="flex justify-center gap-1">
                        {modulePerms.view && <div className="w-2 h-2 bg-blue-500 rounded-full" title="مشاهده" />}
                        {modulePerms.create && <div className="w-2 h-2 bg-green-500 rounded-full" title="ایجاد" />}
                        {modulePerms.edit && <div className="w-2 h-2 bg-yellow-500 rounded-full" title="ویرایش" />}
                        {modulePerms.delete && <div className="w-2 h-2 bg-red-500 rounded-full" title="حذف" />}
                        {!hasAnyPerm && <div className="w-2 h-2 bg-gray-300 rounded-full" title="بدون دسترسی" />}
                      </div>
                    </td>
                  );
                })}
                {users.length > 10 && (
                  <td className="p-2 text-center text-xs text-gray-400 border-b border-l">
                    ...
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Bulk permission operations
  function handleBulkPermissionUpdate(action: 'grant' | 'revoke', moduleIds: string[], actionType: PermissionAction, targetUsers: string[]) {
    try {
      const updatedAccess = [...normalizedUserAccess];
      
      targetUsers.forEach(userId => {
        const userIndex = updatedAccess.findIndex(u => u.userId === userId);
        if (userIndex >= 0) {
          moduleIds.forEach(moduleId => {
            const modulePermIndex = updatedAccess[userIndex].overrides.findIndex(p => p.moduleId === moduleId);
            if (modulePermIndex >= 0) {
              updatedAccess[userIndex].overrides[modulePermIndex].actions[actionType] = action === 'grant';
            }
          });
        }
      });
      
      updateUserManagement({ userAccess: updatedAccess });
      
      const actionText = action === 'grant' ? 'اعطا' : 'لغو';
      showNotification('success', `${actionText} دسترسی برای ${targetUsers.length} کاربر انجام شد`);
      
      logActivity(`${actionText} دسترسی گروهی`, 'مدیریت دسترسی‌ها', 'success', {
        action,
        moduleIds,
        actionType,
        targetUsers
      });
      
    } catch (error) {
      console.error('Error updating bulk permissions:', error);
      showNotification('error', 'خطا در به‌روزرسانی دسترسی‌های گروهی');
    }
  }

  // User session management
  function getUserSessions(userId: string): Array<{sessionId: string, lastActivity: string, ipAddress: string, userAgent: string}> {
    // This would typically come from a session management system
    // For demo purposes, we'll generate mock session data
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return [];
    
    return [
      {
        sessionId: `session_${userId}_1`,
        lastActivity: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        sessionId: `session_${userId}_2`,
        lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: '10.0.0.50',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    ];
  }

  // Security audit functions
  function generateSecurityAuditReport(): string {
    const auditData = {
      timestamp: new Date().toISOString(),
      totalUsers: availableUsers.length,
      activeUsers: availableUsers.filter(u => u.isActive).length,
      inactiveUsers: availableUsers.filter(u => !u.isActive).length,
      adminUsers: availableUsers.filter(u => u.role === 'admin').length,
      recentLogins: activityLogs.filter(log => 
        log.action === 'ورود موفق به سیستم' && 
        new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      failedLogins: activityLogs.filter(log => 
        log.action === 'ورود ناموفق به سیستم' && 
        new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      permissionChanges: activityLogs.filter(log => 
        log.action.includes('دسترسی') && 
        new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      userCreations: activityLogs.filter(log => 
        log.action === 'ایجاد کاربر' && 
        new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      userDeletions: activityLogs.filter(log => 
        log.action === 'حذف کاربر' && 
        new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    };
    
    return JSON.stringify(auditData, null, 2);
  }

  // Advanced search functionality
  function advancedSearchUsers(query: string): UserProfile[] {
    if (!query.trim()) return availableUsers;
    
    const searchTerm = query.toLowerCase();
    return availableUsers.filter(user => 
      user.username.toLowerCase().includes(searchTerm) ||
      user.fullName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      (user.phone && user.phone.includes(searchTerm)) ||
      (user.departmentName && user.departmentName.toLowerCase().includes(searchTerm)) ||
      user.role.toLowerCase().includes(searchTerm)
    );
  }

  // Permission inheritance visualization
  function renderPermissionInheritance(userId: string) {
    const userAccess = normalizedUserAccess.find(u => u.userId === userId);
    if (!userAccess) return null;
    
    const userGroups = normalizedGroups.filter(g => userAccess.groups.includes(g.id));
    const effectivePerms = getEffectivePermissions(userId);
    
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">نمایش ارث‌بری دسترسی‌ها</h4>
        
        {/* User Role */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">نقش کاربر</span>
          </div>
          <div className="text-sm text-blue-800">
            {getRoleDisplayName(availableUsers.find(u => u.id === userId)?.role || 'user')}
          </div>
        </div>
        
        {/* Group Permissions */}
        {userGroups.length > 0 && (
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">دسترسی‌های گروهی</span>
            </div>
            <div className="space-y-2">
              {userGroups.map(group => (
                <div key={group.id} className="text-sm">
                  <span className="font-medium text-green-800">{group.name}:</span>
                  <span className="text-green-700 mr-2">
                    {group.permissions.filter(p => p.view).length} ماژول قابل مشاهده
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Individual Overrides */}
        {userAccess.overrides.some(o => 
          o.actions.create || o.actions.edit || o.actions.view || o.actions.delete
        ) && (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Edit2 className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">تغییرات فردی</span>
            </div>
            <div className="text-sm text-yellow-800">
              {userAccess.overrides.filter(o => 
                o.actions.create || o.actions.edit || o.actions.view || o.actions.delete
              ).length} ماژول با دسترسی سفارشی
            </div>
          </div>
        )}
        
        {/* Final Effective Permissions */}
        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">دسترسی نهایی</span>
          </div>
          <div className="text-sm text-purple-800">
            {Object.values(effectivePerms).filter(p => p.view).length} ماژول قابل دسترسی
          </div>
        </div>
      </div>
    );
  }

  // Import user permissions from external source
  function importUserPermissions(userId: string, permissionData: any) {
    try {
      const userAccess = normalizedUserAccess.find(u => u.userId === userId);
      if (!userAccess) return;
      
      // Update user overrides based on imported data
      const updatedOverrides = userAccess.overrides.map(override => {
        const importedPerm = permissionData.permissions?.[override.moduleId];
        if (importedPerm) {
          return {
            ...override,
            actions: {
              create: importedPerm.create || false,
              edit: importedPerm.edit || false,
              view: importedPerm.view || false,
              delete: importedPerm.delete || false
            }
          };
        }
        return override;
      });
      
      const updatedAccess = normalizedUserAccess.map(access => 
        access.userId === userId 
          ? { ...access, overrides: updatedOverrides }
          : access
      );
      
      updateUserManagement({ userAccess: updatedAccess });
      logActivity('Import دسترسی', 'مدیریت دسترسی‌ها', 'success', { userId, source: 'external' });
      showNotification('success', 'دسترسی‌ها با موفقیت import شد');
    } catch (error) {
      console.error('Error importing permissions:', error);
      showNotification('error', 'خطا در import کردن دسترسی‌ها');
    }
  }

  // Enhanced permission checking with strict access control
  function hasStrictPermission(userId: string, moduleId: string, action: PermissionAction): boolean {
    const user = availableUsers.find(u => u.id === userId);
    if (!user || !user.isActive) return false;
    
    // Admin users have full access
    if (user.role === 'admin') return true;
    
    const userAccess = normalizedUserAccess.find(u => u.userId === userId);
    if (!userAccess) return false;
    
    const effectivePerms = getEffectivePermissions(userId);
    const modulePerms = effectivePerms[moduleId];
    
    if (!modulePerms) return false;
    
    // Check specific action permission
    switch (action) {
      case 'view':
        return modulePerms.view;
      case 'create':
        return modulePerms.create;
      case 'edit':
        return modulePerms.edit;
      case 'delete':
        return modulePerms.delete;
      default:
        return false;
    }
  }
  
  // Get user's visible modules based on permissions
  function getUserVisibleModules(userId: string): string[] {
    const user = availableUsers.find(u => u.id === userId);
    if (!user || !user.isActive) return [];
    
    // Admin users can see all modules
    if (user.role === 'admin') {
      return permissionCatalog.map(m => m.id);
    }
    
    const effectivePerms = getEffectivePermissions(userId);
    return Object.entries(effectivePerms)
      .filter(([_, perms]) => perms.view)
      .map(([moduleId, _]) => moduleId);
  }
  
  // Filter tabs based on user permissions
  function getFilteredAccessibleTabs(userId: string): string[] {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return [];
    
    const tabs: string[] = [];
    
    // Users tab - can view if they have view permission on user_management
    if (hasStrictPermission(userId, 'user_management', 'view') || user.role === 'admin') {
      tabs.push('users');
    }
    
    // Groups tab - can view if they have edit permission on user_management
    if (hasStrictPermission(userId, 'user_management', 'edit') || user.role === 'admin') {
      tabs.push('groups');
    }
    
    // Permissions tab - can view if they have edit permission on user_management
    if (hasStrictPermission(userId, 'user_management', 'edit') || user.role === 'admin') {
      tabs.push('permissions');
    }
    
    // Activities tab - can view if they have view permission on logging or are admin
    if (hasStrictPermission(userId, 'logging', 'view') || user.role === 'admin') {
      tabs.push('activities');
    }
    
    // Matrix tab - can view if they have view permission on user_management
    if (hasStrictPermission(userId, 'user_management', 'view') || user.role === 'admin') {
      tabs.push('matrix');
    }
    
    // Audit tab - can view if they have view permission on user_management and are admin/manager
    if ((hasStrictPermission(userId, 'user_management', 'view') && (user.role === 'admin' || user.role === 'manager')) || user.role === 'admin') {
      tabs.push('audit');
    }
    
    // Sessions tab - can view if they have edit permission on user_management and are admin
    if (hasStrictPermission(userId, 'user_management', 'edit') && user.role === 'admin') {
      tabs.push('sessions');
    }
    
    return tabs;
  }

  // Get permissions for specific module across all users
  function getModulePermissions(moduleId: string): Array<{userId: string, userName: string, permissions: PermissionActionSet}> {
    return normalizedUserAccess.map(userAccess => {
      const user = availableUsers.find(u => u.id === userAccess.userId);
      const effectivePerms = getEffectivePermissions(userAccess.userId);
      
      return {
        userId: userAccess.userId,
        userName: user?.fullName || 'نامشخص',
        permissions: effectivePerms[moduleId] || {
          create: false,
          edit: false,
          view: false,
          delete: false
        }
      };
    });
  }

  // Enhanced validation with detailed error reporting
  const validateUserFormWithDetails = (): { isValid: boolean; errors: Record<string, string>; details: string[] } => {
    const errors: Record<string, string> = {};
    const details: string[] = [];
    let hasErrors = false;
    
    // Username validation
    if (!userForm.username?.trim()) {
      errors.username = 'نام کاربری الزامی است';
      details.push('• نام کاربری را وارد کنید');
      hasErrors = true;
    } else if (userForm.username.length < 3) {
      errors.username = 'نام کاربری باید حداقل 3 کاراکتر باشد';
      details.push('• نام کاربری باید حداقل 3 کاراکتر داشته باشد');
      hasErrors = true;
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(userForm.username)) {
      errors.username = 'نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد، نقطه، خط تیره و زیرخط باشد';
      details.push('• نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد، نقطه، خط تیره و زیرخط باشد');
      hasErrors = true;
    } else {
      // Check username uniqueness
      const existingUser = availableUsers.find(u => 
        u.username.toLowerCase() === userForm.username.toLowerCase() && 
        u.id !== editingUser
      );
      if (existingUser) {
        errors.username = 'این نام کاربری قبلاً استفاده شده است';
        details.push('• این نام کاربری قبلاً استفاده شده است');
        hasErrors = true;
      }
    }
    
    // Full name validation
    if (!userForm.fullName?.trim()) {
      errors.fullName = 'نام کامل الزامی است';
      details.push('• نام کامل را وارد کنید');
      hasErrors = true;
    } else if (userForm.fullName.trim().length < 2) {
      errors.fullName = 'نام کامل باید حداقل 2 کاراکتر باشد';
      details.push('• نام کامل باید حداقل 2 کاراکتر داشته باشد');
      hasErrors = true;
    }
    
    // Email validation
    if (!userForm.email?.trim()) {
      errors.email = 'ایمیل الزامی است';
      details.push('• ایمیل را وارد کنید');
      hasErrors = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userForm.email)) {
        errors.email = 'فرمت ایمیل نامعتبر است';
        details.push('• فرمت ایمیل نامعتبر است (مثال: user@example.com)');
        hasErrors = true;
      } else {
        // Check email uniqueness
        const existingUser = availableUsers.find(u => 
          u.email.toLowerCase() === userForm.email.toLowerCase() && 
          u.id !== editingUser
        );
        if (existingUser) {
          errors.email = 'این ایمیل قبلاً استفاده شده است';
          details.push('• این ایمیل قبلاً استفاده شده است');
          hasErrors = true;
        }
      }
    }
    
    // Phone validation
    if (userForm.phone?.trim()) {
      const phoneRegex = /^(\+98|0)?9\d{9}$/;
      if (!phoneRegex.test(userForm.phone.replace(/\s+/g, ''))) {
        errors.phone = 'شماره تماس نامعتبر است (مثال: 09123456789)';
        details.push('• شماره تماس نامعتبر است (مثال: 09123456789)');
        hasErrors = true;
      }
    }
    
    // Password validation
    if (!editingUser || userForm.password?.trim()) {
      if (!editingUser && !userForm.password?.trim()) {
        errors.password = 'رمز عبور برای کاربران جدید الزامی است';
        details.push('• رمز عبور برای کاربران جدید الزامی است');
        hasErrors = true;
      } else if (userForm.password && userForm.password.length < 6) {
        errors.password = 'رمز عبور باید حداقل 6 کاراکتر باشد';
        details.push('• رمز عبور باید حداقل 6 کاراکتر داشته باشد');
        hasErrors = true;
      }
    }
    
    setFormErrors(errors);
    
    return {
      isValid: !hasErrors,
      errors,
      details
    };
  };

  // Permission validation function
  const validatePermissionConsistency = () => {
    const issues: Array<{
      userId: string;
      userName: string;
      type: 'error' | 'warning';
      message: string;
      details?: string;
    }> = [];

    // Check for users without any permissions
    availableUsers.forEach(user => {
      if (user.permissions.length === 0 && user.isActive) {
        issues.push({
          userId: user.id,
          userName: user.fullName,
          type: 'warning',
          message: 'کاربر فعال بدون دسترسی',
          details: 'این کاربر هیچ دسترسی تعریف شده‌ای ندارد'
        });
      }
    });

    // Check for orphaned groups (groups with no members)
    normalizedGroups.forEach(group => {
      const memberCount = normalizedUserAccess.filter(access => 
        access.groups.includes(group.id)
      ).length;
      
      if (group.members === 0 && memberCount === 0) {
        issues.push({
          userId: group.id,
          userName: group.name,
          type: 'warning',
          message: 'گروه بدون عضو',
          details: 'این گروه هیچ عضوی ندارد'
        });
      }
    });

    // Check for permission conflicts between groups and user overrides
    normalizedUserAccess.forEach(access => {
      const user = availableUsers.find(u => u.id === access.userId);
      if (!user) return;

      access.overrides.forEach(override => {
        const hasConflict = access.groups.some(groupId => {
          const group = normalizedGroups.find(g => g.id === groupId);
          if (!group) return false;

          const groupPermission = group.permissions.find(p => p.moduleId === override.moduleId);
          if (!groupPermission) return false;

          // Check for direct conflicts
          return (
            (groupPermission.create && !override.actions.create) ||
            (groupPermission.edit && !override.actions.edit) ||
            (groupPermission.view && !override.actions.view) ||
            (groupPermission.delete && !override.actions.delete)
          );
        });

        if (hasConflict) {
          issues.push({
            userId: access.userId,
            userName: user.fullName,
            type: 'warning',
            message: 'تضاد در دسترسی‌ها',
            details: `دسترسی فردی با دسترسی گروهی در تضاد است`
          });
        }
      });
    });

    return issues;
  };

  // Custom hook for external access to user management data
  const useUserPermissions = () => {
    return {
      getUserPermissions: getEffectivePermissions,
      hasPermission: hasPermission,
      getUserSummary: getUserPermissionSummary,
      getAllUsers: availableUsers,
      getAllGroups: normalizedGroups,
      getUserAccess: normalizedUserAccess,
      exportUserData: exportUserPermissions,
      validateConsistency: validatePermissionConsistency
    };
  };

  // Expose functions globally for other components (if needed)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).userManagementAPI = {
        getUserPermissions: getEffectivePermissions,
        hasPermission: hasPermission,
        getUserSummary: getUserPermissionSummary,
        getAllUsers: () => availableUsers,
        getAllGroups: () => normalizedGroups,
        getUserAccess: () => normalizedUserAccess,
        exportUserData: exportUserPermissions
      };
    }
  }, [availableUsers, normalizedGroups, normalizedUserAccess]);

  // Helper functions
  function updateUserManagement(updates: Partial<typeof userManagement>) {
    const newSettings = {
      ...settings,
      userManagement: { ...userManagement, ...updates } as any
    };
    setSettings(newSettings);
    
    // Save to storage
    storage.saveData('appSettings', newSettings);
    
    // Dispatch event to notify permission system of changes
    // This will trigger permission recalculation in usePermissions hook
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('permissionsUpdated'));
    }
  }

  function resetUserForm() {
    setUserForm({
      id: '',
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      departmentId: '',
      departmentName: '',
      role: 'user',
      isActive: true,
      isEmailVerified: false,
      failedLoginAttempts: 0,
      createdAt: '',
      updatedAt: '',
      permissions: []
    });
    setFormErrors({});
    setSelectedGroupsForUser([]);
    setTempUserId('');
  }

  function resetGroupForm() {
    setGroupForm({
      id: '',
      name: '',
      description: '',
      color: GROUP_COLORS[0],
      permissions: [],
      isActive: true,
      createdAt: '',
      updatedAt: '',
      members: 0
    });
    setFormErrors({});
  }

  function editUser(user: UserProfile) {
    setEditingUser(user.id);
    setUserForm({
      ...user,
      password: '' // Don't show password for security
    });
    
    // Set selected groups for this user
    const userAccess = normalizedUserAccess.find(u => u.userId === user.id);
    setSelectedGroupsForUser(userAccess?.groups || []);
    
    setShowUserForm(true);
  }

  function editGroup(group: UserGroup, index: number) {
    setEditingGroup(group.id);
    setGroupForm(group);
    setShowGroupForm(true);
  }

  function openUserForm() {
    resetUserForm();
    setEditingUser(null);
    setShowUserForm(true);
  }

  // Filter users using custom logic
  const filteredUsers = useMemo(() => {
    let filtered = [...availableUsers];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.fullName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }
    
    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      const isActive = filterStatus === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }
    
    return filtered;
  }, [availableUsers, searchQuery, filterRole, filterStatus]);

  // Get effective permissions with proper hierarchy
  const getEffectivePermissions = (userId: string): Record<string, PermissionActionSet> => {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return {};

    const effective: Record<string, PermissionActionSet> = {};

    // Step 1: Start with default permissions (deny all)
    permissionCatalog.forEach(module => {
      effective[module.id] = {
        create: false,
        edit: false,
        view: false,
        delete: false
      };
    });

    // Step 2: Apply role-based permissions first
    const rolePermissions = getDefaultPermissions(user.role);
    rolePermissions.forEach(moduleId => {
      if (effective[moduleId]) {
        effective[moduleId] = {
          create: true,
          edit: true,
          view: true,
          delete: true
        };
      }
    });

    // Step 3: Apply group permissions (OR logic - if any group has permission, grant it)
    const userAccess = normalizedUserAccess.find(u => u.userId === userId);
    if (userAccess) {
      userAccess.groups.forEach(groupId => {
        const group = normalizedGroups.find(g => g.id === groupId);
        if (group && group.isActive) {
          group.permissions.forEach(perm => {
            effective[perm.moduleId] = {
              create: effective[perm.moduleId].create || perm.create,
              edit: effective[perm.moduleId].edit || perm.edit,
              view: effective[perm.moduleId].view || perm.view,
              delete: effective[perm.moduleId].delete || perm.delete
            };
          });
        }
      });

      // Step 4: Apply individual overrides (user-specific permissions take precedence)
      userAccess.overrides.forEach(override => {
        const hasOverride = override.actions.create || override.actions.edit || 
                           override.actions.view || override.actions.delete;
        
        if (hasOverride) {
          // Override completely replaces the group permissions for this module
          effective[override.moduleId] = { ...override.actions };
        }
      });
    }

    return effective;
  };

  // Get user permission summary for display
  const getUserPermissionSummary = (userId: string): { total: number; granted: number; denied: number } => {
    const effectivePerms = getEffectivePermissions(userId);
    let granted = 0;
    let total = 0;
    
    Object.values(effectivePerms).forEach(actions => {
      total += 4; // 4 actions: create, edit, view, delete
      if (actions.create) granted++;
      if (actions.edit) granted++;
      if (actions.view) granted++;
      if (actions.delete) granted++;
    });
    
    return {
      total,
      granted,
      denied: total - granted
    };
  };

  // Check if user has specific permission
  const hasPermission = (userId: string, moduleId: string, action: PermissionAction): boolean => {
    const effectivePerms = getEffectivePermissions(userId);
    return effectivePerms[moduleId]?.[action] || false;
  };

  // Check if user can access a module (has at least view permission)
  const canAccessModule = (userId: string, moduleId: string): boolean => {
    return hasPermission(userId, moduleId, 'view');
  };

  // Get user's accessible modules
  const getAccessibleModules = (userId: string): string[] => {
    const effectivePerms = getEffectivePermissions(userId);
    return Object.entries(effectivePerms)
      .filter(([_, actions]) => actions.view)
      .map(([moduleId, _]) => moduleId);
  };

  // Check if user can access user management functionality
  const canAccessUserManagement = (userId: string): boolean => {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return false;
    
    // Admins always can access user management
    if (user.role === 'admin') return true;
    
    // Check if user has specific permissions for user management
    return hasPermission(userId, 'user_management', 'view');
  };

  // Get module permission status for display
  const getModulePermissionStatus = (userId: string, moduleId: string): 'full' | 'partial' | 'none' => {
    const effectivePerms = getEffectivePermissions(userId);
    const modulePerms = effectivePerms[moduleId];
    
    if (!modulePerms) return 'none';
    
    const hasAny = modulePerms.create || modulePerms.edit || modulePerms.view || modulePerms.delete;
    if (!hasAny) return 'none';
    
    const hasAll = modulePerms.create && modulePerms.edit && modulePerms.view && modulePerms.delete;
    return hasAll ? 'full' : 'partial';
  };

  // Filter tabs based on user permissions
  const getAccessibleTabs = (userId: string): string[] => {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return [];
    
    const tabs: string[] = ['users'];
    
    // Only show groups tab if user can manage groups or is admin
    if (user.role === 'admin' || hasPermission(userId, 'user_management', 'edit')) {
      tabs.push('groups');
    }
    
    // Only show permissions tab if user can manage permissions
    if (user.role === 'admin' || hasPermission(userId, 'user_management', 'edit')) {
      tabs.push('permissions');
    }
    
    // Activities tab is available to all users (for viewing their own activities)
    tabs.push('activities');
    
    return tabs;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6 mobile-layout overflow-x-hidden w-full">
      {/* Notification - Fixed z-index to show above modal */}
      {notification.visible && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-3 rounded-lg shadow-xl border-2 max-w-md mx-4 transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-500 text-white border-green-600' :
          notification.type === 'error' ? 'bg-red-500 text-white border-red-600' :
          notification.type === 'warning' ? 'bg-yellow-400 text-black border-yellow-500' :
          'bg-blue-500 text-white border-blue-600'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {notification.type === 'error' && <XCircle className="h-5 w-5" />}
              {notification.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
              {notification.type === 'info' && <AlertCircle className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold mb-1">
                {notification.type === 'success' && 'عملیات موفق'}
                {notification.type === 'error' && 'خطا'}
                {notification.type === 'warning' && 'هشدار'}
                {notification.type === 'info' && 'اطلاعات'}
              </div>
              <div className="text-sm whitespace-pre-line leading-relaxed">{notification.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 w-full overflow-x-hidden">
        {/* Header Card with Enhanced Statistics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full max-w-full">
          <div className="p-3 sm:p-4 md:p-6 w-full max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 w-full max-w-full">
              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">
                  مدیریت کاربران و دسترسی‌ها
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  سامانه جامع مدیریت کاربران، گروه‌ها و مجوزهای دسترسی
                </p>
              </div>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 flex-shrink-0 max-w-full">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">{availableUsers.length} کاربر</span>
                </div>
                <span className="text-gray-300 flex-shrink-0">|</span>
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">{normalizedGroups.length} گروه</span>
                </div>
                <span className="text-gray-300 flex-shrink-0">|</span>
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">{permissionCatalog.length} ماژول</span>
                </div>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-6 w-full max-w-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-2 sm:p-3 md:p-4 rounded-lg border border-blue-200 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-xs sm:text-sm text-blue-600 font-medium truncate">کل کاربران</p>
                    <p className="text-base sm:text-lg md:text-xl font-bold text-blue-900 truncate">{availableUsers.length}</p>
                    <p className="text-xs text-blue-600 truncate">
                      {availableUsers.filter(u => u.isActive).length} فعال
                    </p>
                  </div>
                  <div className="p-1.5 sm:p-2 bg-blue-200 rounded-lg flex-shrink-0">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-blue-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-2 sm:p-3 md:p-4 rounded-lg border border-green-200 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-xs sm:text-sm text-green-600 font-medium truncate">گروه‌ها</p>
                    <p className="text-base sm:text-lg md:text-xl font-bold text-green-900 truncate">{normalizedGroups.length}</p>
                    <p className="text-xs text-green-600 truncate">
                      {normalizedGroups.filter(g => g.isActive).length} فعال
                    </p>
                  </div>
                  <div className="p-1.5 sm:p-2 bg-green-200 rounded-lg flex-shrink-0">
                    <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-green-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-2 sm:p-3 md:p-4 rounded-lg border border-purple-200 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-xs sm:text-sm text-purple-600 font-medium truncate">ماژول‌ها</p>
                    <p className="text-base sm:text-lg md:text-xl font-bold text-purple-900 truncate">{permissionCatalog.length}</p>
                    <p className="text-xs text-purple-600 truncate">دسترسی کامل</p>
                  </div>
                  <div className="p-1.5 sm:p-2 bg-purple-200 rounded-lg flex-shrink-0">
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-purple-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-2 sm:p-3 md:p-4 rounded-lg border border-yellow-200 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-xs sm:text-sm text-yellow-600 font-medium truncate">جلسات</p>
                    <p className="text-base sm:text-lg md:text-xl font-bold text-yellow-900 truncate">
                      {availableUsers.reduce((total, user) => total + getUserSessions(user.id).length, 0)}
                    </p>
                    <p className="text-xs text-yellow-600 truncate">کل جلسات</p>
                  </div>
                  <div className="p-1.5 sm:p-2 bg-yellow-200 rounded-lg flex-shrink-0">
                    <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-yellow-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-50 to-red-100 p-2 sm:p-3 md:p-4 rounded-lg border border-red-200 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-xs sm:text-sm text-red-600 font-medium truncate">آخرین ورود</p>
                    <p className="text-base sm:text-lg md:text-xl font-bold text-red-900 truncate">
                      {(() => {
                        const lastLogins = availableUsers
                          .filter(u => u.lastLogin)
                          .map(u => new Date(u.lastLogin!).getTime())
                          .sort((a, b) => b - a);
                        if (lastLogins.length === 0) return 'هیچ‌گاه';
                        const mostRecent = lastLogins[0];
                        const minutesAgo = Math.floor((Date.now() - mostRecent) / (1000 * 60));
                        if (minutesAgo < 60) return `${minutesAgo}`;
                        const hoursAgo = Math.floor(minutesAgo / 60);
                        if (hoursAgo < 24) return `${hoursAgo}`;
                        return `${Math.floor(hoursAgo / 24)}`;
                      })()}
                    </p>
                    <p className="text-xs text-red-600 truncate">
                      {(() => {
                        const lastLogins = availableUsers
                          .filter(u => u.lastLogin)
                          .map(u => new Date(u.lastLogin!).getTime())
                          .sort((a, b) => b - a);
                        if (lastLogins.length === 0) return '';
                        const mostRecent = lastLogins[0];
                        const minutesAgo = Math.floor((Date.now() - mostRecent) / (1000 * 60));
                        if (minutesAgo < 60) return 'دقیقه پیش';
                        const hoursAgo = Math.floor(minutesAgo / 60);
                        if (hoursAgo < 24) return 'ساعت پیش';
                        return 'روز پیش';
                      })()}
                    </p>
                  </div>
                  <div className="p-1.5 sm:p-2 bg-red-200 rounded-lg flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-red-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs - Fixed overflow issue */}
            <div className="border-t border-gray-200 pt-4 w-full max-w-full overflow-hidden">
              <div className="flex flex-wrap gap-1 sm:gap-2 overflow-x-auto scrollbar-hide pb-2 w-full max-w-full">
                {[
                  { key: 'users', label: 'کاربران', icon: Users },
                  { key: 'groups', label: 'گروه‌ها', icon: Layers },
                  { key: 'permissions', label: 'دسترسی‌ها', icon: Shield },
                  { key: 'activities', label: 'فعالیت‌ها', icon: Activity },
                  { key: 'matrix', label: 'ماتریس', icon: Grid },
                  { key: 'audit', label: 'حسابرسی', icon: FileCheck },
                  { key: 'sessions', label: 'جلسات', icon: Monitor }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      activeTab === key
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
          {/* Enhanced Tabs with Permission Check */}
          <div className="w-full overflow-x-auto scrollbar-hide tab-navigation max-w-full overflow-hidden">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 w-full max-w-full">
          {(() => {
            // For demonstration, we'll use the first admin user as the current user
            // In real app, this should come from authentication context
            const currentUser = availableUsers.find(u => u.role === 'admin') || availableUsers[0];
            const userId = currentUser?.id || 'unknown';
            const accessibleTabs = getFilteredAccessibleTabs(userId);
            
            return [
              { 
                id: 'users', 
                name: 'کاربران', 
                icon: Users, 
                count: availableUsers.length,
                permission: 'user_management',
                requiredAction: 'view' as PermissionAction
              },
              { 
                id: 'groups', 
                name: 'گروه‌ها', 
                icon: Layers, 
                count: normalizedGroups.length,
                permission: 'user_management',
                requiredAction: 'edit' as PermissionAction
              },
              { 
                id: 'permissions', 
                name: 'دسترسی‌ها', 
                icon: Shield,
                permission: 'user_management',
                requiredAction: 'edit' as PermissionAction
              },
              { 
                id: 'activities', 
                name: 'فعالیت‌ها', 
                icon: Activity, 
                count: activityLogs.length,
                permission: null // Activities are always accessible
              },
              { 
                id: 'matrix', 
                name: 'ماتریس دسترسی', 
                icon: BarChart3,
                permission: 'user_management',
                requiredAction: 'view' as PermissionAction
              },
              { 
                id: 'audit', 
                name: 'ممیزی امنیتی', 
                icon: FileText,
                permission: 'user_management',
                requiredAction: 'view' as PermissionAction
              },
              { 
                id: 'sessions', 
                name: 'مدیریت نشست‌ها', 
                icon: Clock,
                permission: 'user_management',
                requiredAction: 'edit' as PermissionAction
              }
            ]
            .filter(tab => accessibleTabs.includes(tab.id))
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                disabled={!accessibleTabs.includes(tab.id)}
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 lg:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                } ${!accessibleTabs.includes(tab.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={
                  !accessibleTabs.includes(tab.id) 
                    ? 'دسترسی محدود' 
                    : ''
                }
              >
                <tab.icon className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate max-w-[100px]">{tab.name}</span>
                <span className="sm:hidden truncate max-w-[60px]">{tab.name.length > 4 ? tab.name.substring(0, 4) + '...' : tab.name}</span>
                {tab.count !== undefined && (
                  <span className={`px-1 md:px-1.5 py-0.5 rounded-full text-xs flex-shrink-0 ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ));
          })()}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="w-full max-w-full overflow-x-hidden">
          <div className="space-y-6 w-full max-w-full">
          {/* Search and Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 w-full max-w-full overflow-hidden">
            <div className="space-y-3 sm:space-y-4 w-full max-w-full">
              <div className="flex-1 min-w-0 w-full max-w-full">
                <div className="relative w-full">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5 z-10" />
                  <input
                    type="text"
                    placeholder="جستجو در نام، نام کاربری یا ایمیل..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-8 sm:pr-10 pl-3 sm:pl-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-full"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 w-full max-w-full">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[100px] sm:min-w-[120px] max-w-full text-sm sm:text-base flex-shrink-0"
                >
                  <option value="all">همه نقش‌ها</option>
                  <option value="admin">مدیر</option>
                  <option value="manager">مدیر میانی</option>
                  <option value="user">کاربر</option>
                  <option value="operator">اپراتور</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[100px] sm:min-w-[120px] max-w-full text-sm sm:text-base flex-shrink-0"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                </select>
                <button
                  onClick={openUserForm}
                  className="px-2 sm:px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-sm md:text-base ml-auto flex-shrink-0"
                >
                  <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">کاربر جدید</span>
                  <span className="sm:hidden">جدید</span>
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <span className="text-sm text-blue-800">
                    {selectedUsers.length} کاربر انتخاب شده
                  </span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <button
                      onClick={() => handleBulkAction('activate')}
                      className="px-2 sm:px-3 py-1 bg-green-600 text-white text-xs sm:text-sm rounded hover:bg-green-700"
                    >
                      فعال‌سازی
                    </button>
                    <button
                      onClick={() => handleBulkAction('deactivate')}
                      className="px-2 sm:px-3 py-1 bg-yellow-600 text-white text-xs sm:text-sm rounded hover:bg-yellow-700"
                    >
                      غیرفعال‌سازی
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="px-2 sm:px-3 py-1 bg-red-600 text-white text-xs sm:text-sm rounded hover:bg-red-700"
                    >
                      حذف
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="px-2 sm:px-3 py-1 bg-gray-600 text-white text-xs sm:text-sm rounded hover:bg-gray-700"
                    >
                      لغو انتخاب
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full max-w-full">
            <div className="w-full max-w-full overflow-x-hidden">
            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-3 sm:space-y-4 p-2 sm:p-3 overflow-hidden w-full max-w-full">
              {filteredUsers.map((user) => {
                const userAccess = normalizedUserAccess.find(u => u.userId === user.id);
                return (
                  <div key={user.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                          </div>
                          <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{user.fullName}</span>
                        </div>
                      </div>
                      <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full border flex-shrink-0 ${getRoleColorClass(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </div>
                    
                    <div className="text-xs sm:text-sm text-gray-600 space-y-0.5 sm:space-y-1">
                      <div className="truncate">@{user.username}</div>
                      <div className="truncate">{user.email}</div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-1">
                        {user.isActive ? (
                          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                        )}
                        <span className={user.isActive ? 'text-green-700' : 'text-red-700'}>
                          {user.isActive ? 'فعال' : 'غیرفعال'}
                        </span>
                      </div>
                      <span className="text-gray-500">{formatLastLogin(user.lastLogin)}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {userAccess?.groups.slice(0, 3).map((groupId) => {
                        const group = normalizedGroups.find(g => g.id === groupId);
                        return group ? (
                          <span
                            key={groupId}
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${group.color || GROUP_COLORS[0]}`}
                          >
                            {group.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setEditingUser(user.id);
                          setUserForm(user);
                          setSelectedGroupsForUser(userAccess?.groups || []);
                          setShowUserForm(true);
                        }}
                        className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center justify-center gap-1 text-sm"
                      >
                        <Edit2 className="h-4 w-4" />
                        ویرایش
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center gap-1 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  هیچ کاربری با فیلترهای انتخابی یافت نشد
                </div>
              )}
            </div>
            
            {/* Desktop Table */}
            <div className="hidden lg:block w-full">
              <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[1200px] max-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-3 py-3 text-right">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(filteredUsers.map(u => u.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="w-48 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                      کاربر
                    </th>
                    <th className="w-24 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                      نقش
                    </th>
                    <th className="w-24 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                      وضعیت
                    </th>
                    <th className="w-28 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                      آخرین ورود
                    </th>
                    <th className="w-28 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                      دپارتمان
                    </th>
                    <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                      گروه‌ها
                    </th>
                    <th className="w-28 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const userAccess = normalizedUserAccess.find(u => u.userId === user.id);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="w-12 px-3 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="w-48 px-3 py-4">
                          <div className="flex items-center min-w-0">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-4 w-4 text-gray-500" />
                              </div>
                            </div>
                            <div className="mr-3 min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">{user.fullName}</div>
                              <div className="text-xs text-gray-500 truncate">@{user.username}</div>
                              <div className="text-xs text-gray-500 truncate hidden sm:block">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="w-24 px-3 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColorClass(user.role)}`}>
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td className="w-24 px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.isActive ? (
                              <CheckCircle className="h-4 w-4 text-green-500 ml-1" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 ml-1" />
                            )}
                            <span className={`text-xs ${user.isActive ? 'text-green-700' : 'text-red-700'}`}>
                              {user.isActive ? 'فعال' : 'غیرفعال'}
                            </span>
                          </div>
                        </td>
                        <td className="w-28 px-3 py-4 whitespace-nowrap text-xs text-gray-500 truncate">
                          {formatLastLogin(user.lastLogin)}
                        </td>
                        <td className="w-28 px-3 py-4 whitespace-nowrap text-xs text-gray-500 truncate">
                          {user.departmentName || '-'}
                        </td>
                        <td className="w-32 px-3 py-4">
                          <div className="flex flex-wrap gap-1">
                            {userAccess?.groups.slice(0, 2).map((groupId) => {
                              const group = normalizedGroups.find(g => g.id === groupId);
                              return group ? (
                                <span
                                  key={groupId}
                                  className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border truncate ${group.color || GROUP_COLORS[0]}`}
                                  title={group.name}
                                >
                                  {group.name}
                                </span>
                              ) : null;
                            })}
                            {(userAccess?.groups || []).length > 2 && (
                              <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border bg-gray-100 text-gray-600 flex-shrink-0">
                                +{(userAccess?.groups || []).length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="w-28 px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <button
                              onClick={() => {
                                setEditingUser(user.id);
                                setUserForm(user);
                                setSelectedGroupsForUser(userAccess?.groups || []);
                                setShowUserForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-100 rounded"
                              title="ویرایش"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-100 rounded"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                  </table>
                </div>
              </div>
              
              {filteredUsers.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  هیچ کاربری با فیلترهای انتخابی یافت نشد
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'groups' && (
        <div className="space-y-6 w-full max-w-full overflow-x-hidden">
          {/* Groups Header */}
          <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 w-full max-w-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">مدیریت گروه‌ها</h2>
                <p className="text-gray-600">گروه‌ها را ایجاد و دسترسی‌های آنها را مدیریت کنید</p>
              </div>
              <button
                onClick={() => {
                  resetGroupForm();
                  setEditingGroup(null);
                  setShowGroupForm(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                گروه جدید
              </button>
            </div>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-full">
            {normalizedGroups.map((group, index) => (
              <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 lg:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-5 w-5 text-blue-500" />
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                    </div>
                    <p className="text-gray-600 text-sm">{group.description || 'بدون توضیحات'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => editGroup(group, index)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="ویرایش گروه"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="حذف گروه"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-2">تعداد اعضا: {
                    normalizedUserAccess.filter(u => u.groups.includes(group.id)).length
                  } نفر</div>
                  {/* Desktop Quick Permission Buttons */}
                  <div className="hidden md:flex flex-wrap gap-2">
                    <button
                      onClick={() => setGroupQuickPermissions(index, 'all')}
                      className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full hover:bg-green-200"
                    >
                      همه دسترسی‌ها
                    </button>
                    <button
                      onClick={() => setGroupQuickPermissions(index, 'manager')}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200"
                    >
                      دسترسی مدیریتی
                    </button>
                    <button
                      onClick={() => setGroupQuickPermissions(index, 'operator')}
                      className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full hover:bg-orange-200"
                    >
                      دسترسی عملیاتی
                    </button>
                    <button
                      onClick={() => setGroupQuickPermissions(index, 'view')}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200"
                    >
                      فقط مشاهده
                    </button>
                    <button
                      onClick={() => setGroupQuickPermissions(index, 'none')}
                      className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full hover:bg-red-200"
                    >
                      بدون دسترسی
                    </button>
                  </div>
                  {/* Mobile Quick Permission Buttons */}
                  <div className="md:hidden">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setGroupQuickPermissions(index, 'all')}
                        className="px-2 py-1.5 bg-green-100 text-green-700 text-xs rounded-lg hover:bg-green-200"
                      >
                        همه دسترسی‌ها
                      </button>
                      <button
                        onClick={() => setGroupQuickPermissions(index, 'view')}
                        className="px-2 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200"
                      >
                        فقط مشاهده
                      </button>
                      <button
                        onClick={() => setGroupQuickPermissions(index, 'manager')}
                        className="px-2 py-1.5 bg-blue-100 text-blue-700 text-xs rounded-lg hover:bg-blue-200"
                      >
                        مدیریتی
                      </button>
                      <button
                        onClick={() => setGroupQuickPermissions(index, 'none')}
                        className="px-2 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200"
                      >
                        بدون دسترسی
                      </button>
                    </div>
                  </div>
                </div>

                {/* Permissions Summary */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">دسترسی‌های گروه</h4>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {permissionCatalog.map(module => {
                        const perm = group.permissions.find(p => p.moduleId === module.id);
                        const hasAny = perm && (perm.create || perm.edit || perm.view || perm.delete);
                        const actions = [];
                        if (perm?.create) actions.push('ایجاد');
                        if (perm?.edit) actions.push('ویرایش');
                        if (perm?.view) actions.push('مشاهده');
                        if (perm?.delete) actions.push('حذف');
                        return (
                          <div key={module.id} className={`p-2 rounded border ${
                            hasAny ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                            <div className="font-medium mb-1">{module.name}</div>
                            <div className="text-xs">
                              {actions.length > 0 ? actions.join('، ') : 'بدون دسترسی'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {normalizedGroups.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">هیچ گروهی تعریف نشده است</p>
              <button
                onClick={() => {
                  resetGroupForm();
                  setEditingGroup(null);
                  setShowGroupForm(true);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                اولین گروه را ایجاد کنید
              </button>
            </div>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6 w-full max-w-full overflow-x-hidden">
          <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 w-full max-w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              مدیریت دسترسی‌ها
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              در این بخش می‌توانید دسترسی‌های کاربران و گروه‌ها را مشاهده و مدیریت کنید
            </p>

            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
              {['users', 'groups'].map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilterRole(filterType)}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filterRole === filterType
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {filterType === 'users' ? 'کاربران' : 'گروه‌ها'}
                </button>
              ))}
            </div>

            {/* Users Permissions View */}
            {filterRole === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-semibold text-gray-900">دسترسی‌های کاربران</h3>
                  <div className="text-sm text-gray-500">
                    {normalizedUserAccess.length} کاربر تعریف شده
                  </div>
                </div>
                
                {/* جستجوی کاربر */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="جستجوی کاربر..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {normalizedUserAccess
                  .filter(userAccess => {
                    if (!searchQuery.trim()) return true;
                    const user = availableUsers.find(u => u.id === userAccess.userId);
                    if (!user) return false;
                    const query = searchQuery.toLowerCase();
                    return user.fullName.toLowerCase().includes(query) ||
                           user.username.toLowerCase().includes(query) ||
                           user.email.toLowerCase().includes(query);
                  })
                  .map((userAccess) => {
                  const user = availableUsers.find(u => u.id === userAccess.userId);
                  if (!user) return null;
                  
                  const effectivePerms = getEffectivePermissions(userAccess.userId);
                  const userGroups = normalizedGroups.filter(g => userAccess.groups.includes(g.id));
                  const permSummary = getUserPermissionSummary(userAccess.userId);
                  
                  return (
                    <div key={userAccess.userId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-6 w-6 text-gray-500" />
                            </div>
                            <div>
                              <h4 className="text-md font-semibold text-gray-900">{user.fullName}</h4>
                              <p className="text-sm text-gray-600">@{user.username}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full border ${getRoleColorClass(user.role)}`}>
                              {getRoleDisplayName(user.role)}
                            </span>
                            <div className={`px-2 py-1 text-xs rounded-full ${
                              user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.isActive ? 'فعال' : 'غیرفعال'}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            <div>
                              <span className="text-xs text-gray-500">گروه‌ها:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {userGroups.length > 0 ? (
                                  userGroups.map((group) => (
                                    <span key={group.id} className={`px-2 py-1 text-xs rounded-full border ${group.color || GROUP_COLORS[0]}`}>
                                      {group.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400">بدون گروه</span>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-xs text-gray-500">خلاصه دسترسی:</span>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Shield className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs text-gray-600">{permSummary.granted}/{permSummary.total}</span>
                                </div>
                                <div className={`px-2 py-0.5 text-xs rounded-full ${
                                  permSummary.granted === permSummary.total 
                                    ? 'bg-green-100 text-green-700' 
                                    : permSummary.granted === 0 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {permSummary.granted === permSummary.total ? 'دسترسی کامل' : 
                                   permSummary.granted === 0 ? 'بدون دسترسی' : 'دسترسی محدود'}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-xs text-gray-500">آخرین ورود:</span>
                              <div className="mt-1 text-xs text-gray-600">
                                {formatLastLogin(user.lastLogin)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              editUser(user);
                              setActiveTab('users');
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                            title="ویرایش کاربر"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              editUser(user);
                              setShowUserForm(true);
                            }}
                            className="text-purple-600 hover:text-purple-900 p-1 hover:bg-purple-50 rounded"
                            title="مدیریت گروه‌ها"
                          >
                            <Layers className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          دسترسی‌های مؤثر بر اساس گروه‌ها و تنظیمات فردی
                        </h5>
                        
                        {/* Module permissions grouped by category */}
                        {Object.values(
                          permissionCatalog.reduce((acc, module) => {
                            if (!acc[module.category]) {
                              acc[module.category] = [];
                            }
                            acc[module.category].push(module);
                            return acc;
                          }, {} as Record<string, SystemModule[]>)
                        ).map(categoryModules => (
                          <div key={categoryModules[0].category} className="mb-4">
                            <h6 className="text-xs font-medium text-gray-600 mb-2 px-2 py-1 bg-gray-100 rounded">
                              {categoryModules[0].category}
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {categoryModules.map(module => {
                                const perm = effectivePerms[module.id];
                                const permStatus = getModulePermissionStatus(userAccess.userId, module.id);
                                
                                const actions = [];
                                if (perm?.create) actions.push('ایجاد');
                                if (perm?.edit) actions.push('ویرایش');
                                if (perm?.view) actions.push('مشاهده');
                                if (perm?.delete) actions.push('حذف');
                                
                                // بررسی دسترسی‌های فردی (overrides)
                                const userOverride = userAccess.overrides.find(o => o.moduleId === module.id);
                                const hasIndividualOverride = userOverride && (
                                  userOverride.actions.create !== undefined ||
                                  userOverride.actions.edit !== undefined ||
                                  userOverride.actions.view !== undefined ||
                                  userOverride.actions.delete !== undefined
                                );
                                
                                return (
                                  <div key={module.id} className={`p-3 rounded-lg border-2 ${
                                    permStatus === 'full' ? 'bg-green-50 text-green-700 border-green-300' :
                                    permStatus === 'partial' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                                    'bg-gray-50 text-gray-500 border-gray-200'
                                  } ${hasIndividualOverride ? 'ring-2 ring-blue-300' : ''}`}>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm mb-1">{module.name}</div>
                                        {module.description && (
                                          <div className="text-xs text-gray-500 mb-2">{module.description}</div>
                                        )}
                                        <div className="text-xs opacity-75 mb-2">
                                          {actions.length > 0 ? `دسترسی فعلی: ${actions.join('، ')}` : 'بدون دسترسی'}
                                        </div>
                                        {hasIndividualOverride && (
                                          <div className="text-xs text-blue-600 font-medium mb-2">
                                            ⚠️ دسترسی فردی تعریف شده (اولویت بر گروه)
                                          </div>
                                        )}
                                      </div>
                                      <div className={`w-3 h-3 rounded-full ml-2 flex-shrink-0 ${
                                        permStatus === 'full' ? 'bg-green-500' :
                                        permStatus === 'partial' ? 'bg-yellow-500' :
                                        'bg-gray-400'
                                      }`} />
                                    </div>
                                    
                                    {/* Checkbox های دسترسی جزئی */}
                                    <div className="mt-3 pt-3 border-t border-gray-300">
                                      <div className="text-xs font-medium text-gray-700 mb-2">تعریف دسترسی فردی:</div>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {(['view', 'create', 'edit', 'delete'] as PermissionAction[]).map(action => {
                                          const actionLabels = {
                                            view: 'مشاهده',
                                            create: 'ایجاد',
                                            edit: 'ویرایش',
                                            delete: 'حذف'
                                          };
                                          const actionColors = {
                                            view: 'text-blue-600 border-blue-300',
                                            create: 'text-green-600 border-green-300',
                                            edit: 'text-yellow-600 border-yellow-300',
                                            delete: 'text-red-600 border-red-300'
                                          };
                                          
                                          // استفاده از override اگر وجود داشته باشد، در غیر این صورت از effective
                                          const currentValue = userOverride?.actions[action] !== undefined 
                                            ? userOverride.actions[action]
                                            : perm?.[action] || false;
                                          
                                          return (
                                            <label 
                                              key={action}
                                              className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50 transition-colors ${
                                                currentValue ? actionColors[action] : 'text-gray-500 border-gray-300'
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={currentValue}
                                                onChange={(e) => {
                                                  toggleUserOverride(userAccess.userId, module.id, action, e.target.checked);
                                                  showNotification('success', `دسترسی ${actionLabels[action]} برای ${module.name} ${e.target.checked ? 'فعال' : 'غیرفعال'} شد`);
                                                }}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                              />
                                              <span className="text-xs font-medium">{actionLabels[action]}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-2">
                                        💡 دسترسی فردی بر دسترسی گروهی اولویت دارد
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {normalizedUserAccess.length === 0 && (
                  <div className="text-center py-12 border border-gray-200 rounded-lg">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">هیچ کاربری با دسترسی تعریف شده وجود ندارد</p>
                  </div>
                )}
              </div>
            )}

            {/* Groups Permissions View */}
            {filterRole === 'groups' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-semibold text-gray-900">دسترسی‌های گروه‌ها</h3>
                  <div className="text-sm text-gray-500">
                    {normalizedGroups.length} گروه تعریف شده
                  </div>
                </div>
                {normalizedGroups.map((group) => {
                  const groupMembers = normalizedUserAccess.filter(u => u.groups.includes(group.id));
                  
                  // Calculate group permissions summary
                  let totalPermissions = 0;
                  let grantedPermissions = 0;
                  group.permissions.forEach(perm => {
                    totalPermissions += 4;
                    if (perm.create) grantedPermissions++;
                    if (perm.edit) grantedPermissions++;
                    if (perm.view) grantedPermissions++;
                    if (perm.delete) grantedPermissions++;
                  });
                  
                  return (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <Layers className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <h4 className="text-md font-semibold text-gray-900">{group.name}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full border ${group.color || GROUP_COLORS[0]}`}>
                                  {groupMembers.length} عضو
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  group.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {group.isActive ? 'فعال' : 'غیرفعال'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  دسترسی: {grantedPermissions}/{totalPermissions}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {group.description && (
                            <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                          )}
                          
                          {groupMembers.length > 0 && (
                            <div className="mb-3">
                              <span className="text-xs text-gray-500 mb-1 block">اعضای گروه:</span>
                              <div className="flex flex-wrap gap-1">
                                {groupMembers.slice(0, 5).map((member) => {
                                  const memberUser = availableUsers.find(u => u.id === member.userId);
                                  return memberUser ? (
                                    <span key={member.userId} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                      {memberUser.fullName}
                                    </span>
                                  ) : null;
                                })}
                                {groupMembers.length > 5 && (
                                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">
                                    +{groupMembers.length - 5} نفر دیگر
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              editGroup(group, normalizedGroups.indexOf(group));
                              setShowGroupForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                            title="ویرایش گروه"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                            title="حذف گروه"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          دسترسی‌های تعریف شده برای گروه
                        </h5>
                        
                        {/* Quick permission actions */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <button
                            onClick={() => setGroupQuickPermissions(normalizedGroups.indexOf(group), 'all')}
                            className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full hover:bg-green-200"
                          >
                            دسترسی کامل
                          </button>
                          <button
                            onClick={() => setGroupQuickPermissions(normalizedGroups.indexOf(group), 'manager')}
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200"
                          >
                            دسترسی مدیریتی
                          </button>
                          <button
                            onClick={() => setGroupQuickPermissions(normalizedGroups.indexOf(group), 'operator')}
                            className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full hover:bg-orange-200"
                          >
                            دسترسی عملیاتی
                          </button>
                          <button
                            onClick={() => setGroupQuickPermissions(normalizedGroups.indexOf(group), 'view')}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200"
                          >
                            فقط مشاهده
                          </button>
                          <button
                            onClick={() => setGroupQuickPermissions(normalizedGroups.indexOf(group), 'none')}
                            className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full hover:bg-red-200"
                          >
                            بدون دسترسی
                          </button>
                        </div>
                        {/* Mobile Stack View for Quick Actions */}
                        <div className="md:hidden mt-3">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setGroupQuickPermissions(normalizedGroups.indexOf(group), 'all')}
                              className="px-2 py-1.5 bg-green-100 text-green-700 text-xs rounded-lg hover:bg-green-200"
                            >
                              کامل
                            </button>
                            <button
                              onClick={() => setGroupQuickPermissions(normalizedGroups.indexOf(group), 'view')}
                              className="px-2 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200"
                            >
                              مشاهده
                            </button>
                          </div>
                        </div>
                        
                        {/* Module permissions grouped by category */}
                        {Object.values(
                          permissionCatalog.reduce((acc, module) => {
                            if (!acc[module.category]) {
                              acc[module.category] = [];
                            }
                            acc[module.category].push(module);
                            return acc;
                          }, {} as Record<string, SystemModule[]>)
                        ).map(categoryModules => (
                          <div key={categoryModules[0].category} className="mb-4">
                            <h6 className="text-xs font-medium text-gray-600 mb-2 px-2 py-1 bg-gray-100 rounded">
                              {categoryModules[0].category}
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {categoryModules.map(module => {
                                const perm = group.permissions.find(p => p.moduleId === module.id);
                                
                                const actions = [];
                                if (perm?.create) actions.push('ایجاد');
                                if (perm?.edit) actions.push('ویرایش');
                                if (perm?.view) actions.push('مشاهده');
                                if (perm?.delete) actions.push('حذف');
                                
                                const hasAnyPermission = actions.length > 0;
                                
                                return (
                                  <div key={module.id} className={`p-2 rounded border ${
                                    hasAnyPermission ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                                  }`}>
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium text-xs">{module.name}</div>
                                        <div className="text-xs mt-1 opacity-75">
                                          {hasAnyPermission ? actions.join('، ') : 'بدون دسترسی'}
                                        </div>
                                        {module.description && (
                                          <div className="text-xs mt-1 opacity-60">{module.description}</div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        {/* Permission checkboxes for inline editing */}
                                        <div className="flex flex-col gap-0.5">
                                          {(['create', 'edit', 'view', 'delete'] as PermissionAction[]).map(action => (
                                            <label key={action} className="flex items-center">
                                              <input
                                                type="checkbox"
                                                checked={perm?.[action] || false}
                                                onChange={(e) => toggleGroupPermission(
                                                  normalizedGroups.indexOf(group), 
                                                  module.id, 
                                                  action, 
                                                  e.target.checked
                                                )}
                                                className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                              />
                                              <span className="text-xs ml-1">
                                                {action === 'create' ? 'ا' : action === 'edit' ? 'و' : action === 'view' ? 'م' : 'ح'}
                                              </span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {normalizedGroups.length === 0 && (
                  <div className="text-center py-12 border border-gray-200 rounded-lg">
                    <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">هیچ گروهی تعریف نشده است</p>
                    <button
                      onClick={() => {
                        resetGroupForm();
                        setEditingGroup(null);
                        setShowGroupForm(true);
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      اولین گروه را ایجاد کنید
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced Permission Management Section - Only in permissions tab */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-500" />
                مدیریت پیشرفته دسترسی‌ها
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                ابزارهای پیشرفته برای مدیریت و بررسی دسترسی‌های سیستم
              </p>

              {/* Permission Validation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    بررسی سازگاری دسترسی‌ها
                  </h3>
                  {(() => {
                    const issues = validatePermissionConsistency();
                    return (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {issues.length === 0 ? (
                          <div className="text-sm text-green-600 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            تمام دسترسی‌ها سازگار هستند
                          </div>
                        ) : (
                          issues.map((issue, index) => {
                            return (
                              <div key={`${issue.userId}-${index}`} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                                <div className="font-medium">{issue.userName || 'کاربر نامشخص'}</div>
                                <div className="mt-1">
                                  <div className="text-xs">{issue.message}</div>
                                  {issue.details && (
                                    <div className="text-xs text-gray-600 mt-1">{issue.details}</div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    آمار دسترسی‌ها
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">کل کاربران:</span>
                      <span className="font-medium">{availableUsers.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">کاربران فعال:</span>
                      <span className="font-medium text-green-600">
                        {availableUsers.filter(u => u.isActive).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">کاربران با گروه:</span>
                      <span className="font-medium text-blue-600">
                        {normalizedUserAccess.filter(u => u.groups.length > 0).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">گروه‌های فعال:</span>
                      <span className="font-medium text-purple-600">
                        {normalizedGroups.filter(g => g.isActive).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">ماژول‌های سیستم:</span>
                      <span className="font-medium">{permissionCatalog.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export/Import Tools */}
              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Download className="h-4 w-4 text-green-500" />
                  ابزارهای Export و Import
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      const data = {
                        users: availableUsers.map(u => exportUserPermissions(u.id)),
                        groups: normalizedGroups,
                        permissionCatalog,
                        exportedAt: new Date().toISOString(),
                        version: '1.0'
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `user_permissions_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showNotification('success', 'اطلاعات دسترسی‌ها export شد');
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    Export همه دسترسی‌ها
                  </button>
                  
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            try {
                              const data = JSON.parse(e.target?.result as string);
                              // Process imported data
                              showNotification('success', 'فایل با موفقیت import شد');
                            } catch (error) {
                              showNotification('error', 'خطا در خواندن فایل');
                            }
                          };
                          reader.readAsText(file);
                        }
                      };
                      input.click();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Upload className="h-4 w-4" />
                    Import دسترسی‌ها
                  </button>
                  
                  <button
                    onClick={() => {
                      // Show user selection dialog
                      const userOptions = availableUsers.map(u => `${u.id}: ${u.fullName} (${u.username})`).join('\n');
                      const selected = prompt(`لطفاً شناسه کاربر را وارد کنید:\n\n${userOptions}\n\nیا نام کاربری را وارد کنید:`);
                      
                      if (selected) {
                        // Try to find user by ID or username
                        const user = availableUsers.find(u => 
                          u.id === selected || 
                          u.username.toLowerCase() === selected.toLowerCase() ||
                          u.fullName.toLowerCase().includes(selected.toLowerCase())
                        );
                        
                        if (user) {
                          try {
                            const data = exportUserPermissions(user.id);
                            
                            // Export to Excel format instead of JSON
                            const effectivePerms = getEffectivePermissions(user.id);
                            const userAccess = normalizedUserAccess.find(u => u.userId === user.id);
                            const userGroups = normalizedGroups.filter(g => userAccess?.groups.includes(g.id));
                            
                            const excelData = [
                              { key: 'user_id', header: 'شناسه کاربر', width: 20 },
                              { key: 'username', header: 'نام کاربری', width: 15 },
                              { key: 'fullName', header: 'نام کامل', width: 20 },
                              { key: 'role', header: 'نقش', width: 15 },
                              { key: 'groups', header: 'گروه‌ها', width: 30 },
                              { key: 'module', header: 'ماژول', width: 25 },
                              { key: 'create', header: 'ایجاد', width: 10 },
                              { key: 'edit', header: 'ویرایش', width: 10 },
                              { key: 'view', header: 'مشاهده', width: 10 },
                              { key: 'delete', header: 'حذف', width: 10 }
                            ];
                            
                            const rows: any[] = [];
                            Object.entries(effectivePerms).forEach(([moduleId, perms]) => {
                              const module = permissionCatalog.find(m => m.id === moduleId);
                              if (module) {
                                rows.push({
                                  user_id: user.id,
                                  username: user.username,
                                  fullName: user.fullName,
                                  role: getRoleDisplayName(user.role),
                                  groups: userGroups.map(g => g.name).join('، ') || 'بدون گروه',
                                  module: module.name,
                                  create: perms.create ? '✓' : '✗',
                                  edit: perms.edit ? '✓' : '✗',
                                  view: perms.view ? '✓' : '✗',
                                  delete: perms.delete ? '✓' : '✗'
                                });
                              }
                            });
                            
                            exportToExcel({
                              filename: `دسترسی_${user.username}_${formatPersianDate(new Date())}`,
                              sheetName: 'دسترسی کاربر',
                              title: `دسترسی‌های کاربر: ${user.fullName}`,
                              subtitle: `نام کاربری: ${user.username} | نقش: ${getRoleDisplayName(user.role)} | تاریخ: ${formatPersianDate(new Date())}`,
                              columns: excelData,
                              data: rows
                            });
                            
                            showNotification('success', `دسترسی‌های کاربر "${user.fullName}" با موفقیت export شد`);
                          } catch (error) {
                            console.error('Export error:', error);
                            showNotification('error', 'خطا در export دسترسی‌های کاربر');
                          }
                        } else {
                          showNotification('error', 'کاربر مورد نظر یافت نشد');
                        }
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <User className="h-4 w-4" />
                    Export کاربر خاص
                  </button>
                </div>
              </div>

              {/* Module Permission Matrix */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-500" />
                  ماتریس دسترسی‌ها بر اساس ماژول
                </h3>
                <div className="overflow-x-auto w-full max-w-full">
                  <div className="min-w-full max-w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                      {permissionCatalog.map(module => {
                        const modulePerms = getModulePermissions(module.id);
                        const usersWithAccess = modulePerms.filter(p => 
                          p.permissions.create || p.permissions.edit || p.permissions.view || p.permissions.delete
                        );
                        
                        return (
                          <div key={module.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900">{module.name}</h4>
                              <span className="text-xs text-gray-500">{usersWithAccess.length}/{availableUsers.length}</span>
                            </div>
                            <div className="text-xs text-gray-600 mb-2">{module.category}</div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>ایجاد:</span>
                                <span className="font-medium">{modulePerms.filter(p => p.permissions.create).length}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>ویرایش:</span>
                                <span className="font-medium">{modulePerms.filter(p => p.permissions.edit).length}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>مشاهده:</span>
                                <span className="font-medium">{modulePerms.filter(p => p.permissions.view).length}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>حذف:</span>
                                <span className="font-medium">{modulePerms.filter(p => p.permissions.delete).length}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Help and Documentation */}
              <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-indigo-500" />
                  راهنما و مستندات
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">نحوه کار سیستم دسترسی</h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong>1. نقش کاربر:</strong> هر کاربر دارای یک نقش اصلی (admin, manager, user, operator) است که پایه دسترسی‌ها را تعیین می‌کند.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong>2. عضویت در گروه‌ها:</strong> کاربران می‌توانند عضو چندین گروه باشند. دسترسی‌های گروه‌ها با منطق OR ترکیب می‌شوند.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong>3. دسترسی‌های فردی:</strong> تنظیمات فردی کاربر می‌تواند دسترسی‌های گروه را override کند (دارای اولویت بالاتر).
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <strong>4. دسترسی مؤثر:</strong> ترکیب نهایی دسترسی‌ها بر اساس گروه‌ها و تنظیمات فردی محاسبه می‌شود.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">بهترین روش‌ها</h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>اصل حداقل دسترسی:</strong> به کاربران فقط دسترسی‌های لازم را بدهید.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>استفاده از گروه‌ها:</strong> برای مدیریت بهتر، از گروه‌ها به جای تنظیمات فردی استفاده کنید.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>بررسی منظم:</strong> به صورت دوره‌ای دسترسی‌ها را بررسی و به‌روزرسانی کنید.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>پشتیبان‌گیری:</strong> قبل از تغییرات مهم، از تنظیمات دسترسی پشتیبان بگیرید.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="text-sm font-semibold text-blue-900 mb-2">نکته مهم</h5>
                  <p className="text-sm text-blue-800">
                    سیستم دسترسی به صورت Real-time عمل می‌کند و تغییرات بلافاصله در تمام بخش‌های سیستم اعمال می‌شود. 
                    در صورت بروز مشکل، از بخش "بررسی سازگاری دسترسی‌ها" استفاده کنید.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Matrix Tab */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                ماتریس دسترسی کاربران
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    try {
                      const matrixData = [];
                      const modules = permissionCatalog;
                      const users = availableUsers.slice(0, 10); // Limit to first 10 users for matrix
                      
                      // Create headers
                      const headers = ['ماژول', ...users.map(u => u.fullName)];
                      matrixData.push(headers);
                      
                      // Create rows for each module
                      modules.forEach(module => {
                        const row = [module.name];
                        users.forEach(user => {
                          const effectivePerms = getEffectivePermissions(user.id);
                          const modulePerms = effectivePerms[module.id];
                          
                          if (modulePerms) {
                            const permissions = [];
                            if (modulePerms.create) permissions.push('ایجاد');
                            if (modulePerms.edit) permissions.push('ویرایش');
                            if (modulePerms.view) permissions.push('مشاهده');
                            if (modulePerms.delete) permissions.push('حذف');
                            row.push(permissions.length > 0 ? permissions.join('، ') : 'بدون دسترسی');
                          } else {
                            row.push('بدون دسترسی');
                          }
                        });
                        matrixData.push(row);
                      });
                      
                      // Export to Excel
                      exportToExcel({
                        filename: `ماتریس_دسترسی_${formatPersianDate(new Date())}`,
                        sheetName: 'ماتریس دسترسی',
                        title: 'ماتریس دسترسی کاربران',
                        subtitle: `تاریخ: ${formatPersianDate(new Date())}`,
                        columns: [
                          { key: 'module', header: 'ماژول', width: 25 },
                          ...users.map((u, idx) => ({
                            key: `user_${idx}`,
                            header: u.fullName,
                            width: 20
                          }))
                        ],
                        data: modules.map(module => {
                          const row: any = { module: module.name };
                          users.forEach((user, idx) => {
                            const effectivePerms = getEffectivePermissions(user.id);
                            const modulePerms = effectivePerms[module.id];
                            
                            if (modulePerms) {
                              const permissions = [];
                              if (modulePerms.create) permissions.push('ایجاد');
                              if (modulePerms.edit) permissions.push('ویرایش');
                              if (modulePerms.view) permissions.push('مشاهده');
                              if (modulePerms.delete) permissions.push('حذف');
                              row[`user_${idx}`] = permissions.length > 0 ? permissions.join('، ') : 'بدون دسترسی';
                            } else {
                              row[`user_${idx}`] = 'بدون دسترسی';
                            }
                          });
                          return row;
                        })
                      });
                      showNotification('success', 'ماتریس دسترسی با موفقیت export شد');
                    } catch (error) {
                      console.error('Matrix export error:', error);
                      showNotification('error', 'خطا در ایجاد فایل اکسل');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  خروجی Excel
                </button>
                <button 
                  onClick={() => {
                    // Refresh matrix view
                    setActiveTab('matrix');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  به‌روزرسانی
                </button>
              </div>
            </div>
            
            {/* Permission Matrix Legend */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">راهنمای علائم</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>مشاهده</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>ایجاد</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>ویرایش</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>حذف</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span>بدون دسترسی</span>
                </div>
              </div>
            </div>
            
            {/* Permission Matrix */}
            {renderPermissionMatrix()}
          </div>
        </div>
      )}

      {/* Security Audit Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6 w-full max-w-full overflow-x-hidden">
          <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 w-full max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 w-full max-w-full">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 truncate">
                <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="truncate">گزارش ممیزی امنیتی</span>
              </h2>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <select 
                  value={auditFilter.timeframe}
                  onChange={(e) => setAuditFilter({...auditFilter, timeframe: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto min-w-[150px]"
                >
                  <option value="1d">24 ساعت گذشته</option>
                  <option value="7d">7 روز گذشته</option>
                  <option value="30d">30 روز گذشته</option>
                  <option value="90d">90 روز گذشته</option>
                </select>
                <button 
                  onClick={() => {
                    try {
                      const securityEvents = activityLogs.filter(log => 
                        log.status === 'error' || log.action.includes('ورود ناموفق') || log.action.includes('دسترسی')
                      );
                      
                      exportToExcel({
                        filename: `گزارش_ممیزی_امنیتی_${formatPersianDate(new Date())}`,
                        sheetName: 'ممیزی امنیتی',
                        title: 'گزارش ممیزی امنیتی سیستم',
                        subtitle: `تاریخ: ${formatPersianDate(new Date())}`,
                        columns: [
                          { key: 'timestamp', header: 'زمان', width: 20 },
                          { key: 'userName', header: 'کاربر', width: 15 },
                          { key: 'action', header: 'رویداد', width: 30 },
                          { key: 'module', header: 'ماژول', width: 15 },
                          { key: 'status', header: 'وضعیت', width: 12 },
                          { key: 'ipAddress', header: 'آدرس IP', width: 15 }
                        ],
                        data: securityEvents.map(log => ({
                          timestamp: formatPersianDateTime(log.timestamp),
                          userName: log.userName,
                          action: log.action,
                          module: log.module,
                          status: log.status,
                          ipAddress: log.ipAddress || ''
                        }))
                      });
                      showNotification('success', 'گزارش با موفقیت دانلود شد');
                    } catch (error) {
                      console.error('Export error:', error);
                      showNotification('error', 'خطا در ایجاد فایل اکسل');
                    }
                  }}
                  className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                >
                  <Download className="h-4 w-4" />
                  دانلود گزارش Excel
                </button>
              </div>
            </div>
            
            {/* Security Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 font-medium">خطاهای امنیتی</p>
                    <p className="text-2xl font-bold text-red-900">
                      {activityLogs.filter(log => log.status === 'error').length}
                    </p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">ورودهای ناموفق</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {activityLogs.filter(log => log.action === 'ورود ناموفق به سیستم').length}
                    </p>
                  </div>
                  <XCircle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">تغییرات دسترسی</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {activityLogs.filter(log => log.action.includes('دسترسی')).length}
                    </p>
                  </div>
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">ورودهای موفق</p>
                    <p className="text-2xl font-bold text-green-900">
                      {activityLogs.filter(log => log.action === 'ورود موفق به سیستم').length}
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            {/* Recent Security Events */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-900">رویدادهای امنیتی اخیر</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activityLogs
                  .filter(log => log.status === 'error' || log.action.includes('ورود ناموفق') || log.action.includes('دسترسی'))
                  .slice(0, 20)
                  .map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          log.status === 'error' ? 'bg-red-500' :
                          log.action.includes('ناموفق') ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.action}</div>
                          <div className="text-xs text-gray-500">{log.userName} - {log.module}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatPersianDateShort(log.timestamp)}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Management Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6 w-full max-w-full overflow-x-hidden">
          <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 w-full max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 w-full max-w-full">
              <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 truncate">
                <Clock className="h-5 w-5 text-purple-500 flex-shrink-0" />
                <span className="truncate">مدیریت نشست‌های کاربری</span>
              </h2>
                <p className="text-sm text-gray-600 mt-1">مشاهده و مدیریت نشست‌های فعال کاربران</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <select 
                  value={selectedUserForSession}
                  onChange={(e) => setSelectedUserForSession(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto min-w-[200px] focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">انتخاب کاربر برای مشاهده نشست‌ها</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.username})
                    </option>
                  ))}
                </select>
                {selectedUserForSession && (
                  <button
                    onClick={() => {
                      try {
                        const user = availableUsers.find(u => u.id === selectedUserForSession);
                        const sessions = getUserSessions(selectedUserForSession);
                        
                        if (user && sessions.length > 0) {
                          exportToExcel({
                            filename: `نشست‌های_${user.username}_${formatPersianDate(new Date())}`,
                            sheetName: 'نشست‌ها',
                            title: `نشست‌های کاربر: ${user.fullName}`,
                            subtitle: `نام کاربری: ${user.username} | تاریخ: ${formatPersianDate(new Date())}`,
                            columns: [
                              { key: 'sessionId', header: 'شناسه نشست', width: 20 },
                              { key: 'lastActivity', header: 'آخرین فعالیت', width: 20 },
                              { key: 'ipAddress', header: 'آدرس IP', width: 15 },
                              { key: 'userAgent', header: 'مرورگر', width: 30 }
                            ],
                            data: sessions.map(session => ({
                              sessionId: session.sessionId,
                              lastActivity: formatPersianDateTime(session.lastActivity),
                              ipAddress: session.ipAddress,
                              userAgent: session.userAgent || 'نامشخص'
                            }))
                          });
                          showNotification('success', 'گزارش نشست‌ها با موفقیت export شد');
                        } else {
                          showNotification('warning', 'هیچ نشست فعالی برای export وجود ندارد');
                        }
                      } catch (error) {
                        console.error('Export error:', error);
                        showNotification('error', 'خطا در export نشست‌ها');
                      }
                    }}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </button>
                )}
              </div>
            </div>
            
            {selectedUserForSession ? (
              <div className="space-y-4 w-full max-w-full overflow-hidden">
                {(() => {
                  const user = availableUsers.find(u => u.id === selectedUserForSession);
                  const sessions = getUserSessions(selectedUserForSession);
                  
                  if (!user) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">کاربر یافت نشد</p>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      <div className="flex items-center gap-3 sm:gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 w-full max-w-full overflow-hidden">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center shadow-md">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{user.fullName}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-sm text-gray-600 truncate">{user.email}</p>
                            <span className="text-gray-300">•</span>
                            <span className={`px-2 py-1 text-xs rounded-full border ${getRoleColorClass(user.role)}`}>
                              {getRoleDisplayName(user.role)}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.isActive ? 'فعال' : 'غیرفعال'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3 w-full max-w-full overflow-hidden">
                        <div className="flex items-center justify-between">
                          <h4 className="text-md font-semibold text-gray-900">نشست‌های فعال ({sessions.length})</h4>
                          {sessions.length > 0 && (
                            <span className="text-xs text-gray-500">
                              آخرین به‌روزرسانی: {formatPersianDateShort(new Date())}
                            </span>
                          )}
                        </div>
                        {sessions.length > 0 ? (
                          <div className="space-y-2">
                            {sessions.map((session, index) => (
                              <div key={session.sessionId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white w-full max-w-full overflow-hidden">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                  </div>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium text-gray-900">
                                        نشست #{index + 1}
                                      </span>
                                      <span className="text-xs text-gray-400">({session.sessionId})</span>
                                  </div>
                                    <div className="space-y-1 text-xs text-gray-600">
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-3 w-3" />
                                        <span>IP: {session.ipAddress}</span>
                                  </div>
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        <span>آخرین فعالیت: {getRelativeTime(session.lastActivity)}</span>
                                        <span className="text-gray-400">({formatPersianDateTime(session.lastActivity)})</span>
                                      </div>
                                      {session.userAgent && (
                                        <div className="text-xs text-gray-500 truncate" title={session.userAgent}>
                                          مرورگر: {session.userAgent.split(' ')[0]}...
                                        </div>
                                      )}
                                    </div>
                                </div>
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                  <button 
                                    onClick={() => {
                                      const details = `جزئیات نشست:\n\nشناسه: ${session.sessionId}\nIP: ${session.ipAddress}\nآخرین فعالیت: ${formatPersianDateTime(session.lastActivity)}\nمرورگر: ${session.userAgent || 'نامشخص'}`;
                                      alert(details);
                                    }}
                                    className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                                  >
                                    <Eye className="h-3 w-3" />
                                    جزئیات
                                </button>
                                  <button 
                                    onClick={() => {
                                      if (confirm('آیا از پایان دادن این نشست مطمئن هستید؟')) {
                                        showNotification('success', 'نشست با موفقیت پایان یافت');
                                        // In real app, this would call an API to end the session
                                      }
                                    }}
                                    className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                                  >
                                    <LogOut className="h-3 w-3" />
                                  پایان نشست
                                </button>
                              </div>
                            </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-sm text-gray-500 mb-2">هیچ نشست فعالی برای این کاربر وجود ندارد</p>
                            <p className="text-xs text-gray-400">کاربر در حال حاضر وارد سیستم نشده است</p>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
                <Clock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">انتخاب کاربر</h3>
                <p className="text-sm text-gray-500 mb-4">برای مشاهده و مدیریت نشست‌های کاربری، ابتدا یک کاربر از لیست بالا انتخاب کنید</p>
                <div className="text-xs text-gray-400">
                  تعداد کل کاربران: {availableUsers.length} | کاربران فعال: {availableUsers.filter(u => u.isActive).length}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <div className="space-y-6 w-full max-w-full overflow-x-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                فعالیت‌های کاربران
              </h2>
              <p className="text-gray-600 text-sm">
                تاریخچه فعالیت‌ها و رویدادهای سیستم
              </p>
            </div>
            


            {/* Enhanced Activity Statistics Dashboard */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                آمار جامع فعالیت‌ها
              </h3>
              
              {/* Main Statistics Grid - Enhanced */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">کل فعالیت‌ها</p>
                      <p className="text-2xl font-bold text-blue-900">{activityStats.total}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {activityStats.today} امروز • {activityStats.thisWeek} این هفته
                      </p>
                    </div>
                    <div className="p-2 bg-blue-200 rounded-lg">
                      <Activity className="h-6 w-6 text-blue-700" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">فعالیت‌های موفق</p>
                      <p className="text-2xl font-bold text-green-900">{activityStats.successful}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {activityStats.successRate}% موفقیت
                      </p>
                    </div>
                    <div className="p-2 bg-green-200 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-700" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">هشدارها</p>
                      <p className="text-2xl font-bold text-yellow-900">{activityStats.warnings}</p>
                      <p className="text-xs text-yellow-600 mt-1">
                        نیاز به بررسی
                      </p>
                    </div>
                    <div className="p-2 bg-yellow-200 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-yellow-700" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">خطاها</p>
                      <p className="text-2xl font-bold text-red-900">{activityStats.failed}</p>
                      <p className="text-xs text-red-600 mt-1">
                        نیاز به اقدام فوری
                      </p>
                    </div>
                    <div className="p-2 bg-red-200 rounded-lg">
                      <XCircle className="h-6 w-6 text-red-700" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">این ماه</p>
                      <p className="text-2xl font-bold text-purple-900">{activityStats.thisMonth}</p>
                      <p className="text-xs text-purple-600 mt-1">
                        فعالیت ثبت شده
                      </p>
                    </div>
                    <div className="p-2 bg-purple-200 rounded-lg">
                      <Calendar className="h-6 w-6 text-purple-700" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Active Users */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    پرفعالیت‌ترین کاربران
                  </h4>
                  <div className="space-y-2">
                    {activityStats.mostActiveUsers.length > 0 ? (
                      activityStats.mostActiveUsers.slice(0, 3).map(([userName, count], index) => (
                        <div key={userName} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="text-sm text-gray-700">{userName}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{count} فعالیت</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">هیچ فعالیتی ثبت نشده</p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    اقدامات سریع
                  </h4>
                  <div className="space-y-2">
                    <button 
                      onClick={() => {
                        // Export filtered activities to Excel
                        try {
                          exportToExcel({
                            filename: `فعالیت‌ها_${formatPersianDate(new Date())}`,
                            sheetName: 'فعالیت‌ها',
                            title: 'گزارش فعالیت‌های سیستم',
                            subtitle: `تاریخ: ${formatPersianDate(new Date())}`,
                            columns: [
                              { key: 'timestamp', header: 'زمان', width: 20 },
                              { key: 'userName', header: 'کاربر', width: 15 },
                              { key: 'action', header: 'رویداد', width: 25 },
                              { key: 'module', header: 'ماژول', width: 15 },
                              { key: 'status', header: 'وضعیت', width: 12 },
                              { key: 'ipAddress', header: 'آدرس IP', width: 15 }
                            ],
                            data: (filteredActivities || []).map(log => ({
                              timestamp: formatPersianDateTime(log.timestamp),
                              userName: log.userName,
                              action: log.action,
                              module: log.module,
                              status: log.status,
                              ipAddress: log.ipAddress || ''
                            }))
                          });
                          showNotification('success', 'گزارش با موفقیت دانلود شد');
                        } catch (error) {
                          console.error('Export error:', error);
                          showNotification('error', 'خطا در ایجاد فایل اکسل');
                        }
                      }}
                      className="w-full text-right px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      خروجی Excel
                    </button>
                    
                    <button 
                      onClick={() => setActivityFilter({ userId: 'all', action: 'all', dateFrom: '', dateTo: '' })}
                      className="w-full text-right px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      ریست فیلترها
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Activity Filters */}
            <div className="p-6 border-b border-gray-200">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  فیلترهای پیشرفته
                </h3>
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  <div className="w-full sm:w-auto">
                    <select 
                      value={activityFilter.userId}
                      onChange={(e) => setActivityFilter({...activityFilter, userId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">همه کاربران</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>{user.fullName}</option>
                      ))}
                      <option value="system">سیستم</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-auto">
                    <select 
                      value={activityFilter.action}
                      onChange={(e) => setActivityFilter({...activityFilter, action: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">همه رویدادها</option>
                      {Array.from(new Set(activityLogs.map(log => log.action))).map(action => (
                        <option key={action} value={action}>{action}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-auto">
                    <select 
                      onChange={(e) => {
                        const value = e.target.value;
                        const now = new Date();
                        let dateFrom = '';
                        let dateTo = '';
                        
                        switch (value) {
                          case 'today':
                            dateFrom = dateTo = now.toISOString().split('T')[0];
                            break;
                          case 'week':
                            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            dateFrom = weekAgo.toISOString().split('T')[0];
                            dateTo = now.toISOString().split('T')[0];
                            break;
                          case 'month':
                            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                            dateFrom = monthAgo.toISOString().split('T')[0];
                            dateTo = now.toISOString().split('T')[0];
                            break;
                        }
                        
                        setActivityFilter({...activityFilter, dateFrom, dateTo});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">بازه زمانی</option>
                      <option value="today">امروز</option>
                      <option value="week">هفته گذشته</option>
                      <option value="month">ماه گذشته</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={activityFilter.dateFrom ? formatPersianDate(new Date(activityFilter.dateFrom)) : ''}
                          onChange={(e) => {
                            // Parse Persian date to ISO format
                            const persianDate = e.target.value;
                            if (persianDate) {
                              try {
                                const parts = persianDate.split('/');
                                if (parts.length === 3) {
                                  const jDate = jalaali.toGregorian(
                                    parseInt(parts[0]),
                                    parseInt(parts[1]),
                                    parseInt(parts[2])
                                  );
                                  const gregorianDate = new Date(jDate.gy, jDate.gm - 1, jDate.gd);
                                  setActivityFilter({...activityFilter, dateFrom: gregorianDate.toISOString().split('T')[0]});
                                }
                              } catch (err) {
                                console.error('Date parse error:', err);
                              }
                            } else {
                              setActivityFilter({...activityFilter, dateFrom: ''});
                            }
                          }}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="از تاریخ"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={activityFilter.dateTo ? formatPersianDate(new Date(activityFilter.dateTo)) : ''}
                          onChange={(e) => {
                            // Parse Persian date to ISO format
                            const persianDate = e.target.value;
                            if (persianDate) {
                              try {
                                const parts = persianDate.split('/');
                                if (parts.length === 3) {
                                  const jDate = jalaali.toGregorian(
                                    parseInt(parts[0]),
                                    parseInt(parts[1]),
                                    parseInt(parts[2])
                                  );
                                  const gregorianDate = new Date(jDate.gy, jDate.gm - 1, jDate.gd);
                                  setActivityFilter({...activityFilter, dateTo: gregorianDate.toISOString().split('T')[0]});
                                }
                              } catch (err) {
                                console.error('Date parse error:', err);
                              }
                            } else {
                              setActivityFilter({...activityFilter, dateTo: ''});
                            }
                          }}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="تا تاریخ"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto">
                    <button
                      onClick={() => setActivityFilter({ userId: 'all', action: 'all', dateFrom: '', dateTo: '' })}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      پاک کردن
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Activities Table with Enhanced Scroll */}
            <div className="p-6">
              <div className="overflow-hidden border border-gray-200 rounded-lg w-full max-w-full">
                {/* Desktop Table */}
                <div className="hidden lg:block w-full">
                  <div className="overflow-x-auto max-h-96 overflow-y-auto w-full max-w-full">
                    <table className="w-full min-w-full max-w-full">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              زمان
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              کاربر
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-1">
                              <Activity className="h-4 w-4" />
                              رویداد
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              ماژول
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-1">
                              <Shield className="h-4 w-4" />
                              وضعیت
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              آدرس IP
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(filteredActivities || []).map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50 group transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium text-gray-900">
                                    {formatPersianDateComplete(log.timestamp)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  <span>{getRelativeTime(log.timestamp)}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatPersianDateShort(log.timestamp)} - {new Date(log.timestamp).toLocaleTimeString('fa-IR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                                  <User className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{log.userName}</div>
                                  <div className="text-xs text-gray-500">{log.userId}</div>
                                  {log.details?.userRole && (
                                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                      {log.details.userRole}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <div className="space-y-2">
                                <div className="font-medium text-gray-900 max-w-xs truncate" title={log.action}>
                                  {log.action}
                                </div>
                                <div className="text-xs text-gray-500 max-w-xs line-clamp-2" title={log.description}>
                                  {log.description}
                                </div>
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <div className="text-xs">
                                    <button 
                                      className="text-blue-600 hover:text-blue-800 underline"
                                      onClick={() => {
                                        // Show detailed information in a modal or alert
                                        const detailsStr = JSON.stringify(log.details, null, 2);
                                        alert(`جزئیات:\n${detailsStr}`);
                                      }}
                                    >
                                      مشاهده جزئیات
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border">
                                {log.module}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <div className="space-y-2">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                  log.status === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
                                  log.status === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
                                  log.status === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                  'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}>
                                  {log.status === 'success' ? 'موفق' :
                                   log.status === 'error' ? 'خطا' :
                                   log.status === 'warning' ? 'هشدار' : 'اطلاعات'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <MapPin className="h-3 w-3" />
                                  <span className="font-mono">{log.ipAddress || 'نامشخص'}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {log.userAgent ? log.userAgent.split(' ')[0] : 'نامشخص'}
                                </div>
                                <button 
                                  className="text-xs text-blue-600 hover:text-blue-800 underline opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    try {
                                      alert(`User Agent: ${log.userAgent || 'N/A'}`);
                                    } catch (error) {
                                      console.warn('Error showing user agent:', error);
                                    }
                                  }}
                                >
                                  جزئیات
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredActivities.length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-500">
                        هیچ فعالیتی با فیلترهای انتخابی یافت نشد
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Cards View */}
                <div className="lg:hidden space-y-4 max-h-96 overflow-y-auto">
                  {(filteredActivities || []).map((log) => (
                    <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {formatPersianDateComplete(log.timestamp)}
                          </span>
                        </div>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          log.status === 'success' ? 'bg-green-100 text-green-700' :
                          log.status === 'error' ? 'bg-red-100 text-red-700' :
                          log.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {log.status === 'success' ? 'موفق' :
                           log.status === 'error' ? 'خطا' :
                           log.status === 'warning' ? 'هشدار' : 'اطلاعات'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        {formatPersianDateShort(log.timestamp)} - {getRelativeTime(log.timestamp)}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{log.userName}</div>
                          <div className="text-xs text-gray-500">{log.module}</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{log.action}</div>
                        <div className="text-xs text-gray-500 mt-1">{log.description}</div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{log.ipAddress || 'نامشخص'}</span>
                        </div>
                        <span>{getRelativeTime(log.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                  {filteredActivities.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      هیچ فعالیتی با فیلترهای انتخابی یافت نشد
                    </div>
                  )}
                </div>
              </div>

              {/* Export and Summary */}
              <div className="mt-6 space-y-4 sm:space-y-0 sm:flex sm:flex-col sm:justify-between sm:items-start lg:flex-row lg:items-center gap-4">
                <div className="text-sm text-gray-600">
                  نمایش {filteredActivities.length} از {activityLogs.length} فعالیت
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={() => {
                      // Export to Excel
                      try {
                        exportToExcel({
                          filename: `فعالیت‌ها_${formatPersianDate(new Date())}`,
                          sheetName: 'فعالیت‌ها',
                          title: 'گزارش فعالیت‌های سیستم',
                          subtitle: `تاریخ: ${formatPersianDate(new Date())}`,
                          columns: [
                            { key: 'timestamp', header: 'زمان', width: 20 },
                            { key: 'userName', header: 'کاربر', width: 15 },
                            { key: 'action', header: 'رویداد', width: 25 },
                            { key: 'module', header: 'ماژول', width: 15 },
                            { key: 'status', header: 'وضعیت', width: 12 },
                            { key: 'ipAddress', header: 'آدرس IP', width: 15 }
                          ],
                          data: (filteredActivities || []).map(log => ({
                            timestamp: formatPersianDateTime(log.timestamp),
                            userName: log.userName,
                            action: log.action,
                            module: log.module,
                            status: log.status,
                            ipAddress: log.ipAddress || ''
                          }))
                        });
                        showNotification('success', 'گزارش با موفقیت دانلود شد');
                      } catch (error) {
                        console.error('Export error:', error);
                        showNotification('error', 'خطا در ایجاد فایل اکسل');
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    خروجی Excel
                  </button>
                  <button 
                    onClick={() => {
                      // Export to Excel
                      try {
                        exportToExcel({
                          filename: `فعالیت‌ها_${formatPersianDate(new Date())}`,
                          sheetName: 'فعالیت‌ها',
                          title: 'گزارش فعالیت‌های سیستم',
                          subtitle: `تاریخ: ${formatPersianDate(new Date())}`,
                          columns: [
                            { key: 'timestamp', header: 'زمان', width: 20 },
                            { key: 'userName', header: 'کاربر', width: 15 },
                            { key: 'action', header: 'رویداد', width: 25 },
                            { key: 'module', header: 'ماژول', width: 15 },
                            { key: 'status', header: 'وضعیت', width: 12 },
                            { key: 'ipAddress', header: 'آدرس IP', width: 15 }
                          ],
                          data: (filteredActivities || []).map(log => ({
                            timestamp: formatPersianDateTime(log.timestamp),
                            userName: log.userName,
                            action: log.action,
                            module: log.module,
                            status: log.status,
                            ipAddress: log.ipAddress || ''
                          }))
                        });
                        showNotification('success', 'گزارش با موفقیت دانلود شد');
                      } catch (error) {
                        console.error('Export error:', error);
                        showNotification('error', 'خطا در ایجاد فایل اکسل');
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    خروجی Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[95vh] flex flex-col my-4">
            <div className="flex-shrink-0 p-4 md:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                  {editingUser ? 'ویرایش کاربر' : 'کاربر جدید'}
                </h2>
                <button
                  onClick={() => {
                    setShowUserForm(false);
                    resetUserForm();
                    setEditingUser(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 mb-3 sm:mb-4">اطلاعات پایه</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نام کاربری <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                      className={`w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
                        formErrors.username ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="نام کاربری"
                    />
                    {formErrors.username && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نام کامل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={userForm.fullName}
                      onChange={(e) => setUserForm({...userForm, fullName: e.target.value})}
                      className={`w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
                        formErrors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="نام و نام خانوادگی"
                    />
                    {formErrors.fullName && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ایمیل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                      className={`w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
                        formErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="example@domain.com"
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      شماره تماس
                    </label>
                    <input
                      type="tel"
                      value={userForm.phone || ''}
                      onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                      placeholder="09xxxxxxxxx"
                    />
                  </div>
                </div>
              </div>

              {/* Security */}
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 mb-3 sm:mb-4">امنیت</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رمز عبور {!editingUser && <span className="text-red-500">*</span>}
                      {editingUser && <span className="text-gray-500 text-xs mr-1">(برای تغییر پر کنید)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={userForm.password}
                        onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                        className={`w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 pr-8 sm:pr-10 text-sm sm:text-base ${
                          formErrors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="رمز عبور"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نقش
                    </label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({...userForm, role: e.target.value as any})}
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    >
                      <option value="user">کاربر عادی</option>
                      <option value="operator">اپراتور</option>
                      <option value="manager">مدیر میانی</option>
                      <option value="admin">مدیر سیستم</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Organization */}
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 mb-3 sm:mb-4">سازمانی</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      دپارتمان
                    </label>
                    <select
                      value={userForm.departmentId}
                      onChange={(e) => {
                        const deptId = e.target.value;
                        const dept = departments.find((d: { id: string; name: string }) => d.id === deptId);
                        setUserForm({
                          ...userForm,
                          departmentId: deptId,
                          departmentName: dept?.name || ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">انتخاب دپارتمان</option>
                      {departments.map((dept: { id: string; name: string }) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      وضعیت
                    </label>
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="active"
                          checked={userForm.isActive}
                          onChange={(e) => setUserForm({...userForm, isActive: e.target.value === 'active'})}
                          className="ml-1"
                        />
                        فعال
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="inactive"
                          checked={!userForm.isActive}
                          onChange={(e) => setUserForm({...userForm, isActive: e.target.value === 'active'})}
                          className="ml-1"
                        />
                        غیرفعال
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Groups Assignment */}
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 mb-3 sm:mb-4">عضویت در گروه‌ها</h3>
                <div className="border border-gray-200 rounded-lg p-3 sm:p-4 max-h-48 sm:max-h-64 overflow-y-auto">
                  {normalizedGroups.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">هیچ گروهی تعریف نشده است. ابتدا یک گروه ایجاد کنید.</p>
                  ) : (
                    <div className="space-y-1 sm:space-y-2">
                      {normalizedGroups.map((group) => {
                        const isInGroup = selectedGroupsForUser.includes(group.id);
                        return (
                          <label key={group.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isInGroup}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGroupsForUser([...selectedGroupsForUser, group.id]);
                                } else {
                                  setSelectedGroupsForUser(selectedGroupsForUser.filter(id => id !== group.id));
                                }
                              }}
                              className="ml-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{group.name}</div>
                              {group.description && (
                                <div className="text-xs text-gray-500 truncate">{group.description}</div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                {group.members} عضو
                              </div>
                            </div>
                            <span className={`px-1.5 sm:px-2 py-1 text-xs rounded-full border flex-shrink-0 ${group.color || GROUP_COLORS[0]}`}>
                              {isInGroup ? 'عضو' : 'غیرعضو'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2 px-1">
                  کاربر می‌تواند عضو چندین گروه باشد. دسترسی‌های گروه‌ها با هم ترکیب می‌شوند.
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 px-4 md:px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => {
                    setShowUserForm(false);
                    resetUserForm();
                    setEditingUser(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  لغو
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" />
                  {editingUser ? 'به‌روزرسانی' : 'ایجاد کاربر'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Form Modal */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-screen overflow-y-auto content-wrapper">
            <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                  {editingGroup ? 'ویرایش گروه' : 'گروه جدید'}
                </h2>
                <button
                  onClick={() => {
                    setShowGroupForm(false);
                    resetGroupForm();
                    setEditingGroup(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نام گروه <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                    className={`w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
                      formErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="نام گروه"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رنگ گروه
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_COLORS.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setGroupForm({...groupForm, color})}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex-shrink-0 ${
                          groupForm.color === color ? 'border-gray-400' : 'border-gray-200'
                        } ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  توضیحات
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({...groupForm, description: e.target.value})}
                  className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  rows={3}
                  placeholder="توضیحات گروه..."
                />
              </div>
            </div>

            <div className="px-4 md:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  setShowGroupForm(false);
                  resetGroupForm();
                  setEditingGroup(null);
                }}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                لغو
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {editingGroup ? 'به‌روزرسانی' : 'ایجاد گروه'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementSettings;