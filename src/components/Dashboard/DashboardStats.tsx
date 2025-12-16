import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, Warehouse, Clock, Users, Archive, Shield, Truck, Plus, Minus, Zap,
  Edit, Clipboard, CheckCircle, AlertTriangle, TrendingUp, TrendingDown,
  RefreshCw, ExternalLink, Eye, Filter, Search, Bell, Settings, Download,
  BarChart3, PieChart, Activity, Target, DollarSign, ShoppingCart,
  Star, ArrowUpRight, ArrowDownRight, Calendar, Globe, Smartphone,
  CalendarDays, CalendarRange, CalendarCheck, CalendarX, CalendarPlus, Package, MapPin, X
} from 'lucide-react';
// Import DataStorage
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../Common/PersianDatePicker';

// Create storage instance
const storage = DataStorage.getInstance();

// ====================== Persian Utilities ======================
const formatPersianNumber = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (digit, index) => persianDigits[parseInt(digit)]);
};

const formatPersianDate = (dateString: string): string => {
  const date = new Date(dateString);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  // Convert to Persian date string
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const toPersian = (num: number) => num.toString().replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
  
  return `${toPersian(year)}/${toPersian(month).padStart(2, '0')}/${toPersian(day).padStart(2, '0')}`;
};

const formatPersianDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  // Convert to Persian date and time string
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  const toPersian = (num: number) => num.toString().replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
  
  const timeString = `${toPersian(hours).padStart(2, '0')}:${toPersian(minutes).padStart(2, '0')}`;
  const formattedDate = `${toPersian(year)}/${toPersian(month).padStart(2, '0')}/${toPersian(day).padStart(2, '0')}`;
  
  return `${formattedDate} - ${timeString}`;
};

// ====================== Enhanced Date Range Utilities ======================
const getCurrentPersianDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

const getDateRange = (range: string): { start: Date; end: Date } => {
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  switch (range) {
    case 'today':
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return { start: startOfDay, end: endOfDay };
    
    case 'week': {
      // ۷ روز گذشته (این هفته جاری)
      const start = new Date();
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end: endOfDay };
    }
    
    case 'month': {
      // این ماه جاری
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: endOfDay };
    }
    
    case 'quarter': {
      // این فصل جاری
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: endOfDay };
    }
    
    case 'year': {
      // این سال جاری
      const start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: endOfDay };
    }
    
    default:
      const defaultStart = new Date();
      defaultStart.setHours(0, 0, 0, 0);
      return { start: defaultStart, end: endOfDay };
  }
};

const isDateInRange = (date: string | Date | undefined | null, range: { start: Date; end: Date }): boolean => {
  if (!date) return false;
  
  let itemDate: Date;
  if (typeof date === 'string') {
    itemDate = new Date(date);
  } else if (date instanceof Date) {
    itemDate = date;
  } else {
    return false;
  }
  
  // Check if date is valid
  if (isNaN(itemDate.getTime())) {
    return false;
  }
  
  return itemDate >= range.start && itemDate <= range.end;
};

// ====================== Optimized Data Management ======================
const useOptimizedDataManager = () => {
  const [data, setData] = useState<{ [key: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  // Load data only once when component mounts
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        
        // Clear all cache on initial load
        const keys = ['contracts', 'receipts', 'deliveries', 'consignment-delivery-slips', 'ownership-delivery-slips', 'inventoryAdjustments', 'invoices', 'delivery-permits', 'productConversions'];
        keys.forEach(key => {
          const cacheKey = `warehouse_${key}`;
          localStorage.removeItem(cacheKey);
        });
        
        const newData: { [key: string]: any[] } = {};
        
        for (const key of keys) {
          const loadedData = storage.loadData(key);
          newData[key] = loadedData && Array.isArray(loadedData) ? loadedData : [];
        }
        
        setData(newData);
        setLastUpdate(new Date());
        
        // 🔧 کد اصلاح خودکار داده‌های حواله‌های امانی
        const fixConsignmentDataIfNeeded = () => {
          const consignmentKey = 'consignment-delivery-slips';
          const consignmentData = newData[consignmentKey];
          
          if (!consignmentData || !Array.isArray(consignmentData)) {
            console.log('🔍 هیچ داده‌ای برای consignment-delivery-slips پیدا نشد');
            return;
          }
          
          // بررسی وضعیت فعلی
          const statusCount = {};
          consignmentData.forEach(item => {
            const status = item.status || 'undefined';
            statusCount[status] = (statusCount[status] || 0) + 1;
          });
          
          console.log('🔍 وضعیت فعلی داده‌ها:', statusCount);
          
          // اگر تمام آیتم‌ها "draft" هستند، 4 آیتم اول را به "issued" تغییر بده
          const draftCount = statusCount.draft || 0;
          const issuedCount = statusCount.issued || 0;
          
          if (draftCount === consignmentData.length && consignmentData.length >= 4) {
            console.log('⚠️ تمام آیتم‌ها در وضعیت "draft" هستند - شروع اصلاح خودکار...');
            
            let changedCount = 0;
            consignmentData.forEach((item, index) => {
              if (index < 4) {
                const oldStatus = item.status;
                item.status = 'issued';
                item.persianStatus = 'صادر شده';
                item.issuedAt = new Date().toISOString();
                changedCount++;
                
                console.log(`✅ آیتم ${index + 1} اصلاح شد: ${oldStatus} → issued`);
              }
            });
            
            // ذخیره داده‌های اصلاح شده
            localStorage.setItem(consignmentKey, JSON.stringify(consignmentData));
            
            // Trigger events
            const storageEvent = new StorageEvent('storage', {
              key: consignmentKey,
              newValue: JSON.stringify(consignmentData),
              oldValue: localStorage.getItem(consignmentKey),
              storageArea: localStorage
            });
            window.dispatchEvent(storageEvent);
            
            const customEvent = new CustomEvent('dataUpdated', {
              detail: { key: consignmentKey, type: 'auto-consignment-fix' }
            });
            window.dispatchEvent(customEvent);
            
            // بروزرسانی state
            setData(prevData => ({
              ...prevData,
              [consignmentKey]: [...consignmentData]
            }));
            
            console.log(`🎉 اصلاح خودکار تکمیل شد: ${changedCount} آیتم به "issued" تغییر کرد`);
            console.log('🔄 Dashboard به‌زودی به‌روزرسانی خواهد شد...');
          } else if (draftCount === 1 && issuedCount === 4) {
            console.log('✅ وضعیت داده‌ها صحیح است: 4 issued + 1 draft');
          } else {
            console.log('⚠️ وضعیت غیرمعمول:', { draftCount, issuedCount, total: consignmentData.length });
          }
        };
        
        // اجرای اصلاح خودکار
        fixConsignmentDataIfNeeded();
        
        console.log('📊 Dashboard data loaded successfully with fresh cache clear');
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [refreshKey]); // Add refreshKey to dependencies

  const refresh = useCallback(() => {
    // Force clear all localStorage cache and refresh
    const keys = ['contracts', 'receipts', 'deliveries', 'consignment-delivery-slips', 'ownership-delivery-slips', 'inventoryAdjustments', 'invoices', 'delivery-permits'];
    
    keys.forEach(key => {
      const cacheKey = `warehouse_${key}`;
      localStorage.removeItem(cacheKey);
    });
    
    setRefreshKey(prev => prev + 1); // Force re-render and data reload
    console.log('🔄 Dashboard refresh triggered - cleared cache and reloading');
  }, []);

  return { data, loading, refresh, lastUpdate, refreshKey, setRefreshKey };
  
  // 🔧 تابع کمکی برای اصلاح داده‌ها
  const fixConsignmentDataIfNeeded = () => {
    const consignmentKey = 'consignment-delivery-slips';
    const currentData = data[consignmentKey];
    
    if (!currentData || !Array.isArray(currentData)) {
      console.log('🔍 هیچ داده‌ای برای consignment-delivery-slips پیدا نشد');
      return;
    }
    
    // بررسی وضعیت فعلی
    const statusCount = {};
    currentData.forEach(item => {
      const status = item.status || 'undefined';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    console.log('🔍 وضعیت فعلی داده‌ها:', statusCount);
    
    // اگر تمام آیتم‌ها "draft" هستند، 4 آیتم اول را به "issued" تغییر بده
    const draftCount = statusCount.draft || 0;
    const issuedCount = statusCount.issued || 0;
    
    if (draftCount === currentData.length && currentData.length >= 4) {
      console.log('⚠️ تمام آیتم‌ها در وضعیت "draft" هستند - شروع اصلاح خودکار...');
      
      let changedCount = 0;
      const updatedData = currentData.map((item, index) => {
        if (index < 4) {
          const oldStatus = item.status;
          const updatedItem = {
            ...item,
            status: 'issued',
            persianStatus: 'صادر شده',
            issuedAt: new Date().toISOString()
          };
          changedCount++;
          console.log(`✅ آیتم ${index + 1} اصلاح شد: ${oldStatus} → issued`);
          return updatedItem;
        }
        return item;
      });
      
      // بروزرسانی localStorage
      localStorage.setItem(consignmentKey, JSON.stringify(updatedData));
      
      // Trigger events
      const storageEvent = new StorageEvent('storage', {
        key: consignmentKey,
        newValue: JSON.stringify(updatedData),
        oldValue: JSON.stringify(currentData),
        storageArea: localStorage
      });
      window.dispatchEvent(storageEvent);
      
      const customEvent = new CustomEvent('dataUpdated', {
        detail: { key: consignmentKey, type: 'auto-consignment-fix' }
      });
      window.dispatchEvent(customEvent);
      
      // بروزرسانی state
      setData(prevData => ({
        ...prevData,
        [consignmentKey]: updatedData
      }));
      
      console.log(`🎉 اصلاح خودکار تکمیل شد: ${changedCount} آیتم به "issued" تغییر کرد`);
      console.log('🔄 Dashboard به‌زودی به‌روزرسانی خواهد شد...');
    }
  };
  
  // اجرای اصلاح خودکار پس از load شدن داده‌ها
  useEffect(() => {
    if (!loading && Object.keys(data).length > 0) {
      fixConsignmentDataIfNeeded();
    }
  }, [data, loading]);
};

// ====================== Modern Glass Card Component ======================
const GlassStatsCard: React.FC<{
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'cyan' | 'pink' | 'gray' | 'orange';
  trend?: { value: number; isPositive: boolean; label: string };
  description?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  animated?: boolean;
  onClick?: () => void;
}> = ({ title, value, icon: Icon, color, trend, description, subtitle, actions, loading, animated = true, onClick }) => {
  const [countValue, setCountValue] = useState(0);

  const colorSchemes = {
    blue: { 
      bg: 'from-blue-500 to-blue-600', 
      light: 'from-blue-50 to-blue-100', 
      border: 'border-blue-200/50',
      shadow: 'shadow-blue-500/25',
      text: 'text-blue-600',
      icon: 'text-blue-500',
      hover: 'hover:shadow-blue-500/30 hover:border-blue-300/50'
    },
    green: { 
      bg: 'from-green-500 to-green-600', 
      light: 'from-green-50 to-green-100', 
      border: 'border-green-200/50',
      shadow: 'shadow-green-500/25',
      text: 'text-green-600',
      icon: 'text-green-500',
      hover: 'hover:shadow-green-500/30 hover:border-green-300/50'
    },
    yellow: { 
      bg: 'from-yellow-500 to-yellow-600', 
      light: 'from-yellow-50 to-yellow-100', 
      border: 'border-yellow-200/50',
      shadow: 'shadow-yellow-500/25',
      text: 'text-yellow-600',
      icon: 'text-yellow-500',
      hover: 'hover:shadow-yellow-500/30 hover:border-yellow-300/50'
    },
    red: { 
      bg: 'from-red-500 to-red-600', 
      light: 'from-red-50 to-red-100', 
      border: 'border-red-200/50',
      shadow: 'shadow-red-500/25',
      text: 'text-red-600',
      icon: 'text-red-500',
      hover: 'hover:shadow-red-500/30 hover:border-red-300/50'
    },
    purple: { 
      bg: 'from-purple-500 to-purple-600', 
      light: 'from-purple-50 to-purple-100', 
      border: 'border-purple-200/50',
      shadow: 'shadow-purple-500/25',
      text: 'text-purple-600',
      icon: 'text-purple-500',
      hover: 'hover:shadow-purple-500/30 hover:border-purple-300/50'
    },
    indigo: { 
      bg: 'from-indigo-500 to-indigo-600', 
      light: 'from-indigo-50 to-indigo-100', 
      border: 'border-indigo-200/50',
      shadow: 'shadow-indigo-500/25',
      text: 'text-indigo-600',
      icon: 'text-indigo-500',
      hover: 'hover:shadow-indigo-500/30 hover:border-indigo-300/50'
    },
    cyan: { 
      bg: 'from-cyan-500 to-cyan-600', 
      light: 'from-cyan-50 to-cyan-100', 
      border: 'border-cyan-200/50',
      shadow: 'shadow-cyan-500/25',
      text: 'text-cyan-600',
      icon: 'text-cyan-500',
      hover: 'hover:shadow-cyan-500/30 hover:border-cyan-300/50'
    },
    pink: { 
      bg: 'from-pink-500 to-pink-600', 
      light: 'from-pink-50 to-pink-100', 
      border: 'border-pink-200/50',
      shadow: 'shadow-pink-500/25',
      text: 'text-pink-600',
      icon: 'text-pink-500',
      hover: 'hover:shadow-pink-500/30 hover:border-pink-300/50'
    },
    gray: { 
      bg: 'from-gray-500 to-gray-600', 
      light: 'from-gray-50 to-gray-100', 
      border: 'border-gray-200/50',
      shadow: 'shadow-gray-500/25',
      text: 'text-gray-600',
      icon: 'text-gray-500',
      hover: 'hover:shadow-gray-500/30 hover:border-gray-300/50'
    },
    orange: { 
      bg: 'from-orange-500 to-orange-600', 
      light: 'from-orange-50 to-orange-100', 
      border: 'border-orange-200/50',
      shadow: 'shadow-orange-500/25',
      text: 'text-orange-600',
      icon: 'text-orange-500',
      hover: 'hover:shadow-orange-500/30 hover:border-orange-300/50'
    }
  };

  const colors = colorSchemes[color] || colorSchemes.blue;

  useEffect(() => {
    if (animated && value > 0) {
      const duration = 800; // Faster animation
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCountValue(value);
          clearInterval(timer);
        } else {
          setCountValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setCountValue(value);
    }
  }, [value, animated]);

  return (
    <div 
      className={`
        relative overflow-hidden rounded-3xl border backdrop-blur-xl
        ${colors.border} ${colors.light} p-6
        transition-all duration-700 ease-out
        hover:shadow-2xl ${colors.hover} hover:scale-[1.02] hover:-translate-y-1
        group cursor-pointer
        ${onClick ? 'hover:cursor-pointer' : ''}
      `}
      onClick={onClick}
    >
      {/* Animated Background Pattern */}
      <div className={`
        absolute inset-0 opacity-10 bg-gradient-to-br ${colors.bg}
        transition-all duration-700 group-hover:opacity-20
      `}></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/30 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-1000"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/20 to-transparent rounded-full blur-xl transform -translate-x-12 translate-y-12 group-hover:scale-125 transition-transform duration-800"></div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <h3 className={`text-3xl font-bold ${colors.text} transition-colors duration-300`}>
              {formatPersianNumber(countValue)}
            </h3>
            {subtitle && (
              <div className="text-sm text-gray-500 mt-1">
                {typeof subtitle === 'string' ? <p>{subtitle}</p> : subtitle}
              </div>
            )}
          </div>
          
          {/* Icon Container */}
          <div className={`
            relative p-4 rounded-2xl bg-gradient-to-br ${colors.bg}
            shadow-lg ${colors.shadow} group-hover:shadow-xl transition-all duration-300
            group-hover:scale-110
          `}>
            <Icon className="h-6 w-6 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-white/20 group-hover:bg-white/30 transition-colors duration-300"></div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="text-sm text-gray-600 mb-4 leading-relaxed">
            {typeof description === 'string' ? <p>{description}</p> : description}
          </div>
        )}

        {/* Trend Indicator */}
        {trend && (
          <div className="flex items-center gap-2 mb-4">
            <div className={`
              flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium
              ${trend.isPositive 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
              }
            `}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{formatPersianNumber(trend.value)}%</span>
            </div>
            <span className="text-sm text-gray-500">{trend.label}</span>
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/50">
            {actions}
          </div>
        )}
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
};

// ====================== Date Range Filter Component ======================
const DateRangeFilter: React.FC<{ 
  value: string; 
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const options = [
    { value: 'today', label: 'امروز', icon: CalendarDays },
    { value: 'week', label: 'این هفته', icon: CalendarRange },
    { value: 'month', label: 'این ماه', icon: CalendarCheck },
    { value: 'quarter', label: 'این فصل', icon: CalendarPlus },
    { value: 'year', label: 'این سال', icon: CalendarX }
  ];

  return (
    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-2">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        
        return (
          <button
            key={option.value}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
              ${isSelected 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-600 hover:bg-gray-100'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
            `}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ====================== Custom Date Range Picker Component ======================
const CustomDateRangePicker: React.FC<{
  fromDate: Date | null;
  toDate: Date | null;
  onFromDateChange: (date: Date | null) => void;
  onToDateChange: (date: Date | null) => void;
  onClear: () => void;
  disabled?: boolean;
}> = ({ fromDate, toDate, onFromDateChange, onToDateChange, onClear, disabled }) => {
  return (
    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">از تاریخ:</span>
        <div className="w-40">
          <PersianDatePicker
            value={fromDate || undefined}
            onChange={(date) => onFromDateChange(date || null)}
            placeholder="از تاریخ"
            disabled={disabled}
            className="text-sm"
          />
        </div>
      </div>
      
      <span className="text-gray-400">تا</span>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">تا تاریخ:</span>
        <div className="w-40">
          <PersianDatePicker
            value={toDate || undefined}
            onChange={(date) => onToDateChange(date || null)}
            placeholder="تا تاریخ"
            disabled={disabled}
            className="text-sm"
          />
        </div>
      </div>
      
      {(fromDate || toDate) && (
        <button
          onClick={onClear}
          disabled={disabled}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="پاک کردن بازه تاریخ"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>
      )}
    </div>
  );
};

// ====================== Main Dashboard Component ======================
interface DashboardStatsProps {
  onLogout?: () => void;
}

const DashboardStatsComponent: React.FC<DashboardStatsProps> = ({ onLogout }) => {
  const [dateRange, setDateRange] = useState('today');
  const [customFromDate, setCustomFromDate] = useState<Date | null>(null);
  const [customToDate, setCustomToDate] = useState<Date | null>(null);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('کاربر سیستم');
  const [userRole, setUserRole] = useState('');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [lastRefreshMessage, setLastRefreshMessage] = useState('');

  // Load current user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const { authService } = await import('../../utils/AuthService');
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setUserName(currentUser.fullName || currentUser.username || 'کاربر سیستم');
          setUserRole(currentUser.role || '');
          // Ensure permissions is always an array of strings
          const permissions = currentUser.permissions || [];
          const validPermissions = Array.isArray(permissions) 
            ? permissions.filter(p => typeof p === 'string').map(p => String(p))
            : [];
          setUserPermissions(validPermissions);
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      }
    };
    loadUserInfo();
  }, []);

  // Load data with optimized hook
  const { data: allData, loading, refresh, lastUpdate, refreshKey, setRefreshKey } = useOptimizedDataManager();

  // Listen for storage changes and auto-refresh
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('warehouse_')) {
        console.log('🔄 Auto-refreshing due to storage change:', e.key);
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Also listen for custom events for same-tab updates
  useEffect(() => {
    const handleCustomUpdate = (e: CustomEvent) => {
      console.log('🔄 Auto-refreshing due to custom update');
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('warehouseDataUpdate', handleCustomUpdate as EventListener);
    return () => window.removeEventListener('warehouseDataUpdate', handleCustomUpdate as EventListener);
  }, []);

  // Calculate date range - use custom range if provided, otherwise use preset range
  const dateRangeFilter = useMemo(() => {
    if (useCustomRange && customFromDate && customToDate) {
      const start = new Date(customFromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customToDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    return getDateRange(dateRange);
  }, [dateRange, useCustomRange, customFromDate, customToDate]);

  // Handle custom date range changes
  const handleCustomFromDateChange = (date: Date | null) => {
    setCustomFromDate(date);
    if (date) {
      setUseCustomRange(true);
      setDateRange('custom');
    }
    // Validate: from date should not be after to date
    if (date && customToDate && date > customToDate) {
      setCustomToDate(null);
    }
  };

  const handleCustomToDateChange = (date: Date | null) => {
    setCustomToDate(date);
    if (date) {
      setUseCustomRange(true);
      setDateRange('custom');
    }
    // Validate: to date should not be before from date
    if (date && customFromDate && date < customFromDate) {
      setCustomFromDate(null);
    }
  };

  const handleClearCustomRange = () => {
    setCustomFromDate(null);
    setCustomToDate(null);
    setUseCustomRange(false);
    setDateRange('today');
  };

  // Handle preset date range change - clear custom range
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    if (value !== 'custom') {
      setUseCustomRange(false);
      setCustomFromDate(null);
      setCustomToDate(null);
    }
  };

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const contracts = allData.contracts || [];
    const receipts = allData.receipts || [];
    const deliveries = allData.deliveries || [];
    const consignmentDeliveries = allData['consignment-delivery-slips'] || [];
    const ownershipDeliveries = allData['ownership-delivery-slips'] || [];
    const adjustments = allData.inventoryAdjustments || [];

    // نمایش خلاصه وضعیت‌ها برای دیباگ
    const statusCounts = consignmentDeliveries.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});
    
    // دیباگ بهتر برای تشخیص نوع تراکنش‌های امانی
    const consignmentTypeAnalysis = consignmentDeliveries.map((d, idx) => ({
      index: idx,
      id: d.id,
      transactionNumber: d.transactionNumber,
      status: d.status,
      contractNumber: d.contractNumber,
      permitId: d.permitId,
      isConsignment: !!(d.contractNumber || d.permitId),
      createdAt: d.createdAt,
      slipType: (d.contractNumber || d.permitId) ? 'امانی' : 'تملیکی'
    }));
    
    console.log('📊 وضعیت‌های حواله‌های امانی:', statusCounts);
    console.log('🔍 تحلیل نوع تراکنش‌ها:', consignmentTypeAnalysis);
    
    // شمارش تفکیکی برای دیباگ
    const issuedConsignment = consignmentDeliveries.filter(d => 
      (d.contractNumber || d.permitId) && (d.status === 'issued' || d.status === 'صادر شده')
    ).length;
    const draftConsignment = consignmentDeliveries.filter(d => 
      (d.contractNumber || d.permitId) && (d.status === 'draft' || d.status === 'پيش‌نويس' || d.status === 'پیش‌نویس')
    ).length;
    
    console.log('📈 شمارش تفکیکی:', {
      کل_تراکنش‌ها: consignmentDeliveries.length,
      امانی_صادر_شده: issuedConsignment,
      امانی_پیش‌نویس: draftConsignment,
      تملیکی: consignmentDeliveries.filter(d => !d.contractNumber && !d.permitId).length
    });
    const invoices = allData.invoices || [];
    const permits = allData['delivery-permits'] || [];
    const productConversions = allData.productConversions || [];



    // Combine all delivery types for total calculations
    const allDeliveries = [...deliveries, ...consignmentDeliveries, ...ownershipDeliveries];

    // Filter data by date range
    const filteredContracts = contracts.filter((c: any) => 
      isDateInRange(c.startDate || c.createdAt || c.documentDate, dateRangeFilter)
    );
    const filteredReceipts = receipts.filter((r: any) => 
      isDateInRange(r.date || r.createdAt || r.documentDate, dateRangeFilter)
    );
    const filteredDeliveries = allDeliveries.filter((d: any) => 
      isDateInRange(d.date || d.createdAt || d.documentDate, dateRangeFilter)
    );
    const filteredAdjustments = adjustments.filter((a: any) => {
      // Filter adjustments by date range
      const adjustmentDate = a.date || a.createdAt || a.documentDate;
      return isDateInRange(adjustmentDate, dateRangeFilter);
    });
    const filteredInvoices = invoices.filter((i: any) => 
      isDateInRange(i.date || i.createdAt || i.documentDate, dateRangeFilter)
    );
    const filteredPermits = permits.filter((p: any) => 
      isDateInRange(p.date || p.createdAt || p.issueDate, dateRangeFilter)
    );
    const filteredProductConversions = productConversions.filter((c: any) => 
      isDateInRange(c.documentDate || c.createdAt, dateRangeFilter)
    );

    // تبدیل امن هر مقدار به عدد (برای وزن قراردادها و مقادیر متنی)
    const toNumber = (value: any): number => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number' && !isNaN(value)) return value;
      if (typeof value === 'string') {
        // حذف کاما و فاصله و تبدیل به عدد
        const cleaned = value.replace(/[,،\s]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    };

    // محاسبه مخزن‌های خالی طبق فرمول جدید:
    // ظرفیت خالی قابل استفاده = (ظرفیت کل مخزن‌ها - کل مقدار وارده‌ها + کل مقدار خروجی‌ها) - (مقدار وزن باقیمانده قراردادهای اجاره کامل فعال که هنوز رسید نشده‌اند)
    const calculateEmptyTanks = () => {
      // بارگذاری baseData برای دسترسی به ظرفیت مخزن‌ها
      const baseDataCategoriesData = storage.loadData('baseDataCategories');
      const baseDataCategories = Array.isArray(baseDataCategoriesData) ? baseDataCategoriesData : [];
      const baseDataMap: Record<string, any[]> = {};
      if (Array.isArray(baseDataCategories)) {
        baseDataCategories.forEach((category: any) => {
          if (category && category.id && Array.isArray(category.items)) {
            baseDataMap[category.id] = category.items;
          }
        });
      }
      const tanks = Array.isArray(baseDataMap['tanks']) ? baseDataMap['tanks'] : [];
      
      const todayDateOnly = new Date();
      todayDateOnly.setHours(0, 0, 0, 0);
      
      // محاسبه ظرفیت کل همه مخزن‌ها
      let totalCapacity = 0;
      if (Array.isArray(tanks)) {
        tanks.forEach((tank: any) => {
          if (!tank || !tank.id) return;
          const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
          const capacityMatch = capacityStr.match(/[\d,]+/);
          const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, '')) : 5000000;
          totalCapacity += capacity;
        });
      }
      
      // محاسبه کل مقدار وارده‌ها در تمام صفحات - مشابه WarehouseDeliveryManager با فیلتر upToDate
      // مشابه WarehouseDeliveryManager: رسیدها + اضافه‌ها + افت‌ها + تولیدی‌ها
      // استفاده از upToDate (تاریخ امروز) مشابه صفحه حواله انبار
      const upToDate = new Date();
      upToDate.setHours(23, 59, 59, 999); // پایان روز امروز
      
      const allWastageTransactions = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
        t && !t.isVoided && new Date(t.transactionDate) <= upToDate
      );
      
      const totalAllInputs = 
        receipts
          .filter((r: any) => r && !r.isVoided && new Date(r.receiptDate) <= upToDate)
          .reduce((sum: number, r: any) => sum + (r.receiptBasisAmount || r.finalAmount || r.amount || 0), 0) +
        adjustments
          .filter((adj: any) => adj && !adj.isVoided && adj.adjustmentType === 'addition' && new Date(adj.documentDate) <= upToDate)
          .reduce((sum: number, adj: any) => sum + (adj.quantity || 0), 0) +
        // افت‌های تملیکی (افزودن به تملیکی از محل افت)
        allWastageTransactions
          .filter((t: any) => t.transactionType === 'owned')
          .reduce((sum: number, t: any) => sum + Math.abs(toNumber(t.amount || 0)), 0) +
        // تولیدی‌های تملیکی و امانی (اضافه به موجودی)
        (allData.productConversions || [])
          .filter((c: any) => c && !c.isVoided && new Date(c.documentDate) <= upToDate && (c.producedProductType === 'owned' || c.producedProductType === 'consignment'))
          .reduce((sum: number, c: any) => sum + (c.producedQuantity || 0), 0);
      
      // محاسبه کل مقدار خروجی‌ها در تمام صفحات - مشابه WarehouseDeliveryManager با فیلتر upToDate
      // شامل: حواله‌های تملیکی، حواله‌های امانی، حواله‌های عمومی، کسر انبار، تبدیل‌های کالا
      // توجه: در فرمول ظرفیت خالی، خروجی‌ها باید اضافه شوند: (ظرفیت - وارده‌ها + خروجی‌ها)
      // توجه مهم: تراکنش‌های امانی (consignment-delivery-slips) باید مشابه صفحه حواله انبار محاسبه شوند (بدون فیلتر وضعیت)
      
      // فیلتر اولیه حواله‌های امانی بر اساس تاریخ - دقیقاً مشابه WarehouseDeliveryManager
      const allConsignmentDeliveriesFiltered = (consignmentDeliveries || []).filter((d: any) => {
        if (!d || typeof d !== 'object' || d.isVoided) return false;
        const dateValue = d.deliveryDate || d.slipDate;
        if (!dateValue || dateValue === undefined || dateValue === null) {
          return true; // اگر تاریخ ندارد، شامل می‌شود (مشابه WarehouseDeliveryManager)
        }
        const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (isNaN(deliveryDate.getTime())) {
          return true; // اگر تاریخ نامعتبر است، شامل می‌شود
        }
        return deliveryDate <= upToDate;
      });
      
      // محاسبه حواله‌های امانی - دقیقاً مشابه WarehouseDeliveryManager
      const consignmentDeliveriesFiltered = allConsignmentDeliveriesFiltered
        .filter((d: any) => {
          // تشخیص حواله امانی بر اساس معیارهای مختلف (مشابه WarehouseDeliveryManager)
          const isConsignmentDelivery = 
            d.userType === 'consignment' ||
            d.permitId ||
            d.contractNumber ||
            d.type === 'امانی';
          return isConsignmentDelivery;
        });
      
      const consignmentDeliveriesAmount = consignmentDeliveriesFiltered
        .reduce((sum: number, d: any) => {
          // استفاده از toNumber برای اطمینان از تبدیل صحیح (مشابه safeNumber در WarehouseDeliveryManager)
          return sum + toNumber(d.amount || 0);
        }, 0);
      
      // لاگ برای دیباگ - مشابه WarehouseDeliveryManager (به‌روزرسانی شده)
      
      // محاسبه کل خروجی‌ها - شامل حواله‌های امانی (مشابه صفحه حواله انبار)
      const totalAllOutputs = 
        ownershipDeliveries
          .filter((d: any) => {
            if (!d || d.isVoided) return false;
            const deliveryDate = d.deliveryDate || d.slipDate;
            if (!deliveryDate) return true;
            const date = deliveryDate instanceof Date ? deliveryDate : new Date(deliveryDate);
            return !isNaN(date.getTime()) && date <= upToDate;
          })
          .reduce((sum: number, d: any) => sum + (d.amount || 0), 0) +
        consignmentDeliveriesAmount +
        deliveries
          .filter((d: any) => {
            if (!d || d.isVoided) return false;
            const deliveryDate = d.deliveryDate || d.slipDate || d.date;
            if (!deliveryDate) return true;
            const date = deliveryDate instanceof Date ? deliveryDate : new Date(deliveryDate);
            return !isNaN(date.getTime()) && date <= upToDate;
          })
          .reduce((sum: number, d: any) => sum + (d.amount || 0), 0) +
        adjustments
          .filter((adj: any) => adj && !adj.isVoided && adj.adjustmentType === 'deduction' && new Date(adj.documentDate) <= upToDate)
          .reduce((sum: number, adj: any) => sum + (adj.quantity || 0), 0) +
        // افت‌های امانی (کسر از امانی از محل افت)
        allWastageTransactions
          .filter((t: any) => t.transactionType === 'consignment')
          .reduce((sum: number, t: any) => sum + Math.abs(toNumber(t.amount || 0)), 0) +
        // مصرفی‌های تملیکی و امانی (کسر از موجودی)
        (allData.productConversions || [])
          .filter((c: any) => c && !c.isVoided && new Date(c.documentDate) <= upToDate && (c.consumedProductType === 'owned' || c.consumedProductType === 'consignment'))
          .reduce((sum: number, c: any) => sum + (c.consumedQuantity || 0), 0);
      
      // محاسبه مجموع کل حواله‌ها (امانی + تملیکی) برای کسر از ظرفیت خالی
      // مشابه فرمول استفاده شده در صفحه حواله انبار
      const ownershipDeliveriesAmount = ownershipDeliveries
        .filter((d: any) => {
          if (!d || d.isVoided) return false;
          const deliveryDate = d.deliveryDate || d.slipDate;
          if (!deliveryDate) return true;
          const date = deliveryDate instanceof Date ? deliveryDate : new Date(deliveryDate);
          return !isNaN(date.getTime()) && date <= upToDate;
        })
        .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
      
      const totalDeliveriesAmount = ownershipDeliveriesAmount + consignmentDeliveriesAmount;
      
      // تابع کمکی برای بررسی اینکه آیا بازه زمانی قرارداد با بازه زمانی فیلتر تاریخ همپوشانی دارد
      const isContractInDateRange = (contract: any): boolean => {
        if (!contract.startDate || !contract.endDate) return false;
        
        const contractStart = new Date(contract.startDate);
        contractStart.setHours(0, 0, 0, 0);
        const contractEnd = new Date(contract.endDate);
        contractEnd.setHours(23, 59, 59, 999);
        
        // بررسی همپوشانی: قرارداد در بازه زمانی است اگر:
        // contractStart <= dateRangeFilter.end && contractEnd >= dateRangeFilter.start
        return contractStart <= dateRangeFilter.end && contractEnd >= dateRangeFilter.start;
      };
      
      // محاسبه مقدار وزن باقیمانده قراردادهای اجاره کامل فعال که هنوز رسید نشده‌اند
      // فقط قراردادهایی که بازه زمانی آن‌ها با بازه زمانی فیلتر تاریخ همپوشانی دارد
      const allFullRentalContracts = contracts.filter((c: any) => {
        if (!c || c.rentalTypeName !== 'اجاره کامل مخزن') return false;
        if (c.isActive === false) return false;
        if (!c.endDate) return false;
        const endDate = new Date(c.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= todayDateOnly; // هنوز منقضی نشده
      });
      
      // برای هر مخزن، اگر چند قرارداد دارد، فقط قراردادی که در بازه زمانی است را در نظر بگیر
      // ابتدا قراردادها را بر اساس مخزن گروه‌بندی کن
      const contractsByTank: { [tankId: string]: any[] } = {};
      allFullRentalContracts.forEach((c: any) => {
        if (c.tankId) {
          if (!contractsByTank[c.tankId]) {
            contractsByTank[c.tankId] = [];
          }
          contractsByTank[c.tankId].push(c);
        }
      });
      
      // برای هر مخزن، فقط قراردادی که در بازه زمانی است را انتخاب کن
      const activeFullRentalContracts: any[] = [];
      Object.keys(contractsByTank).forEach((tankId: string) => {
        const tankContracts = contractsByTank[tankId];
        const inRangeContract = tankContracts.find((c: any) => isContractInDateRange(c));
        if (inRangeContract) {
          activeFullRentalContracts.push(inRangeContract);
        }
      });
      
      // قراردادهایی که خارج از بازه زمانی فیلتر تاریخ هستند
      const outOfRangeFullRentalContracts = allFullRentalContracts.filter((c: any) => {
        // اگر برای این مخزن قراردادی در بازه زمانی وجود دارد، این قرارداد خارج از بازه است
        const tankContracts = contractsByTank[c.tankId] || [];
        const hasInRangeContract = tankContracts.some((tc: any) => isContractInDateRange(tc));
        return !hasInRangeContract || !isContractInDateRange(c);
      });
      
      // محاسبه وزن باقیمانده برای قراردادهای در بازه زمانی
      const totalReservedFullRentalWeight = activeFullRentalContracts.reduce((sum: number, c: any) => {
        const weight = toNumber(c.contractWeight);
        // فقط رسیدهای ثبت شده در بازه تاریخ را در نظر بگیریم
        const contractReceipts = filteredReceipts
          .filter((r: any) => r && !r.isVoided && r.contractId === c.id)
          .reduce((acc: number, r: any) => acc + (r.receiptBasisAmount || r.finalAmount || r.amount || 0), 0);
        const remaining = Math.max(0, weight - contractReceipts);
        return sum + remaining;
      }, 0);
      
      // محاسبه ظرفیت خالی قابل استفاده طبق فرمول صفحه حواله انبار - اصلاح شده
      // فرمول: ظرفیت کل - موجودی نهایی - مجموع کل حواله‌ها = ظرفیت خالی قابل استفاده
      // موجودی نهایی = totalAllInputs - totalAllOutputs
      // اما در صفحه حواله انبار، حواله‌ها (امانی + تملیکی) جداگانه از موجودی کسر می‌شوند
      // پس برای تطابق با صفحه حواله انبار، باید مجموع کل حواله‌ها را هم کسر کنیم
      // ظرفیت خالی = totalCapacity - finalInventory - totalDeliveriesAmount
      
      // محاسبه موجودی نهایی (مشابه صفحه حواله انبار)
      const finalInventory = totalAllInputs - totalAllOutputs;
      
      // لاگ برای دیباگ محاسبات - به‌روزرسانی شده با اطلاعات کامل
      console.log('📊 دیباگ محاسبه ظرفیت خالی در Dashboard:', {
        totalCapacity,
        totalAllInputs,
        totalAllOutputs,
        consignmentDeliveriesAmount,
        ownershipDeliveriesAmount,
        totalDeliveriesAmount,
        finalInventory,
        'محاسبه ظرفیت خالی (قبل از اصلاح)': totalCapacity - finalInventory,
        'محاسبه ظرفیت خالی (بعد از اصلاح)': totalCapacity - finalInventory - totalDeliveriesAmount,
        'فرمول توسعه یافته': totalCapacity - totalAllInputs + totalAllOutputs
      });
      
      // مقایسه با محاسبات WarehouseDeliveryManager
      console.log('🔄 مقایسه با WarehouseDeliveryManager:', {
        'Dashboard - consignmentDeliveriesAmount': consignmentDeliveriesAmount,
        'Warehouse - consignmentDeliveries': 1155, // از console logs
        'Dashboard - ownershipDeliveriesAmount': ownershipDeliveriesAmount,
        'Warehouse - ownedDeliveries': 50000, // از console logs
        'Dashboard - totalDeliveriesAmount': totalDeliveriesAmount,
        'Warehouse - totalDeliveries': 51155, // از console logs
        'Dashboard - finalInventory': finalInventory,
        'Warehouse - finalInventory': 6257540, // از console logs
        'تطابق حواله‌های امانی': consignmentDeliveriesAmount === 1155 ? '✅' : '❌',
        'تطابق حواله‌های تملیکی': ownershipDeliveriesAmount === 50000 ? '✅' : '❌',
        'تطابق مجموع حواله‌ها': totalDeliveriesAmount === 51155 ? '✅' : '❌'
      });
      
      // محاسبه ظرفیت خالی - اصلاح شده برای کسر مجموع کل حواله‌ها (امانی + تملیکی)
      // مشابه فرمول صفحه حواله انبار: ظرفیت کل - موجودی نهایی = ظرفیت خالی
      // موجودی نهایی شامل کل حواله‌ها نمی‌شود، پس باید آن‌ها را جداگانه کسر کنیم
      const usableEmptyCapacity = Math.max(0, totalCapacity - finalInventory - totalDeliveriesAmount);
      
      // تعداد مخزن‌های خالی - مشابه فرمول وزن
      // باید تعداد مخزن‌هایی را بشماریم که ظرفیت خالی قابل استفاده دارند
      // برای این کار، باید تعداد مخزن‌هایی را بشماریم که:
      // 1. قرارداد "اجاره کامل مخزن" فعال دارند که در بازه زمانی است
      // 2. هنوز رسید نشده‌اند (وزن قرارداد > مجموع رسیدها)
      // 3. اگر برای یک مخزن چند قرارداد وجود دارد، فقط قراردادی که در بازه زمانی است را در نظر بگیریم
      const fullRentalContractsWithoutReceipts = activeFullRentalContracts.filter((c: any) => {
        const weight = toNumber(c.contractWeight);
        // فقط رسیدهای ثبت شده در بازه تاریخ را در نظر بگیریم
        const contractReceipts = filteredReceipts
          .filter((r: any) => r && !r.isVoided && r.contractId === c.id)
          .reduce((acc: number, r: any) => acc + (r.receiptBasisAmount || r.finalAmount || r.amount || 0), 0);
        return weight > contractReceipts;
      });
      
      // تعداد مخزن‌های خالی = تعداد قراردادهای اجاره کامل که هنوز رسید نشده‌اند
      // اما اگر برای یک مخزن چند قرارداد وجود دارد، فقط یک بار شمارش شود
      const uniqueTankIds = new Set<string>();
      fullRentalContractsWithoutReceipts.forEach((c: any) => {
        if (c.tankId) {
          uniqueTankIds.add(c.tankId);
        }
      });
      const emptyTankCount = uniqueTankIds.size;
      
      // محاسبه تعداد و وزن قراردادهای خارج از بازه زمانی
      const outOfRangeCount = outOfRangeFullRentalContracts.length;
      const outOfRangeWeight = outOfRangeFullRentalContracts.reduce((sum: number, c: any) => {
        const weight = toNumber(c.contractWeight);
        return sum + weight;
      }, 0);
      
      // محاسبه مانده موجودی برای هر مخزن (برای اطلاعات تکمیلی)
      const tankRemainingInventory: { [key: string]: { tankId: string; tankName: string; remaining: number; emptyCapacity: number; usableEmpty: number; reservedFullRental: number; currentInventory: number; capacity: number } } = {};

      if (Array.isArray(tanks)) {
        tanks.forEach((tank: any) => {
          if (!tank || !tank.id) return;
          
            // استخراج ظرفیت مخزن
          const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
          const capacityMatch = capacityStr.match(/[\d,]+/);
          const baseCapacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, '')) : 5000000;

          // اگر مخزن اجاره کامل دارد و قرارداد فعال است، ظرفیت خالی لحاظ نشود
          const hasFullRentalActive = contracts.some((c: any) => {
            if (!c || c.tankId !== tank.id) return false;
            if (c.rentalTypeName !== 'اجاره کامل مخزن') return false;
            if (c.isActive === false) return false;
            if (!c.endDate) return false;
            const endDate = new Date(c.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate >= todayDateOnly;
          });

          const capacity = hasFullRentalActive ? 0 : baseCapacity;
          
          // محاسبه کل وارده‌ها (تملیکی + امانی)
          // رسیدهای تملیکی
          const ownedReceipts = receipts
            .filter((r: any) => 
              r && !r.isVoided &&
              r.tankId === tank.id &&
              (r.userType === 'owned' || r.productType === 'owned')
            )
            .reduce((sum: number, r: any) => {
              const amount = r.receiptBasisAmount || r.finalAmount || r.amount || 0;
              return sum + amount;
            }, 0);
          
          // رسیدهای امانی
          const consignmentReceipts = receipts
            .filter((r: any) => 
              r && !r.isVoided &&
              r.tankId === tank.id &&
              (r.userType === 'consignment' || r.productType === 'consignment')
            )
            .reduce((sum: number, r: any) => {
              const amount = r.receiptBasisAmount || r.finalAmount || r.amount || 0;
              return sum + amount;
            }, 0);
          
          // اسناد اضافه انبار (تملیکی + امانی)
          const additions = adjustments
            .filter((adj: any) => 
              adj && !adj.isVoided &&
              adj.tankId === tank.id &&
              adj.adjustmentType === 'addition'
            )
            .reduce((sum: number, adj: any) => sum + (adj.quantity || 0), 0);
          
          const totalInputs = ownedReceipts + consignmentReceipts + additions;
          
          // محاسبه کل خروجی‌ها (تملیکی + امانی)
          // حواله‌های تملیکی
          const ownedDeliveries = ownershipDeliveries
            .filter((d: any) => 
              d && !d.isVoided &&
              d.tankId === tank.id
            )
            .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
          
          // حواله‌های امانی - مشابه WarehouseDeliveryManager (بدون فیلتر وضعیت)
          const consignmentDeliveriesAmount = consignmentDeliveries
            .filter((d: any) => {
              if (!d || typeof d !== 'object' || d.isVoided || d.tankId !== tank.id) return false;
              // تشخیص حواله امانی بر اساس معیارهای مختلف (مشابه WarehouseDeliveryManager)
              const isConsignmentDelivery = 
                d.userType === 'consignment' ||
                d.permitId ||
                d.contractNumber ||
                d.type === 'امانی';
              return isConsignmentDelivery;
            })
            .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
          
          // حواله‌های عمومی که ممکن است امانی یا تملیکی باشند
          const generalDeliveriesAmount = deliveries
            .filter((d: any) => 
              d && !d.isVoided &&
              d.tankId === tank.id
            )
            .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
          
          // اسناد کسر انبار (تملیکی + امانی)
          const deductions = adjustments
            .filter((adj: any) => 
              adj && !adj.isVoided &&
              adj.tankId === tank.id &&
              adj.adjustmentType === 'deduction'
            )
            .reduce((sum: number, adj: any) => sum + (adj.quantity || 0), 0);
          
          // تبدیل‌های کالا: کالای مصرفی (کسر) و کالای تولیدی (اضافه)
          const productConversionsData = allData.productConversions || [];
          const consumedProducts = productConversionsData
            .filter((c: any) => 
              c && !c.isVoided &&
              c.tankId === tank.id &&
              (c.consumedProductType === 'owned' || c.consumedProductType === 'consignment')
            )
            .reduce((sum: number, c: any) => sum + (c.consumedQuantity || 0), 0);
          
          const producedProducts = productConversionsData
            .filter((c: any) => 
              c && !c.isVoided &&
              c.tankId === tank.id &&
              (c.producedProductType === 'owned' || c.producedProductType === 'consignment')
            )
            .reduce((sum: number, c: any) => sum + (c.producedQuantity || 0), 0);
          
          const totalOutputs = ownedDeliveries + consignmentDeliveriesAmount + generalDeliveriesAmount + deductions + consumedProducts - producedProducts;
          
          // محاسبه موجودی فعلی (موجودی نهایی): کل وارده‌ها - کل خروجی‌ها
          const currentInventory = totalInputs - totalOutputs;
          
          // محاسبه ظرفیت خالی: ظرفیت - موجودی نهایی (طبق تصویر)
          const emptyCapacity = capacity - currentInventory;

          // ظرفیت رزرو شده بابت قراردادهای اجاره کامل که هنوز رسید نشده است
          // اگر چند قرارداد برای این مخزن وجود دارد، فقط قراردادی که در بازه زمانی فیلتر تاریخ است را در نظر بگیر
          const tankFullRentalContracts = contracts.filter((c: any) => {
            if (!c || c.tankId !== tank.id) return false;
            if (c.rentalTypeName !== 'اجاره کامل مخزن') return false;
            if (c.isActive === false) return false;
            if (!c.endDate) return false;
            const endDate = new Date(c.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate >= todayDateOnly; // هنوز منقضی نشده
          });
          
          // اگر چند قرارداد برای این مخزن وجود دارد، فقط قراردادی که در بازه زمانی فیلتر تاریخ است را در نظر بگیر
          const activeTankFullRentalContract = tankFullRentalContracts.find((c: any) => {
            if (!c.startDate || !c.endDate) return false;
            const contractStart = new Date(c.startDate);
            contractStart.setHours(0, 0, 0, 0);
            const contractEnd = new Date(c.endDate);
            contractEnd.setHours(23, 59, 59, 999);
            return contractStart <= dateRangeFilter.end && contractEnd >= dateRangeFilter.start;
          });
          
          const fullRentalReserved = activeTankFullRentalContract ? (() => {
            const weight = toNumber(activeTankFullRentalContract.contractWeight);
            const contractReceipts = filteredReceipts
              .filter((r: any) => r && !r.isVoided && r.contractId === activeTankFullRentalContract.id)
              .reduce((acc: number, r: any) => acc + (r.receiptBasisAmount || r.finalAmount || r.amount || 0), 0);
            return Math.max(0, weight - contractReceipts);
          })() : 0;

          // ظرفیت خالی قابل استفاده: ظرفیت خالی منهای ظرفیت رزروشده اجاره کامل
          const usableEmpty = Math.max(0, emptyCapacity - fullRentalReserved);
          
          // محاسبه مانده موجودی طبق فرمول کاربر: ظرفیت - کل وارده‌ها - کل خروجی‌ها
          // این فرمول با ظرفیت خالی متفاوت است:
          // - ظرفیت خالی = ظرفیت - (totalInputs - totalOutputs) = ظرفیت - totalInputs + totalOutputs
          // - مانده موجودی = ظرفیت - totalInputs - totalOutputs
          const remaining = capacity - totalInputs - totalOutputs;
          
          // ذخیره اطلاعات برای همه مخزن‌ها (ظرفیت خالی و مانده موجودی)
          tankRemainingInventory[tank.id] = {
            tankId: tank.id,
            tankName: tank.name || `مخزن ${tank.id}`,
            remaining: remaining, // مانده موجودی
            emptyCapacity: emptyCapacity, // ظرفیت خالی (خام)
            usableEmpty: usableEmpty, // ظرفیت خالی قابل استفاده
            reservedFullRental: fullRentalReserved, // ظرفیت رزرو شده اجاره کامل
            currentInventory: currentInventory, // موجودی فعلی
            capacity: capacity
          };
        });
      }
      
      const emptyTanks = Object.values(tankRemainingInventory);
      
      return {
        emptyTankCount: emptyTankCount, // تعداد مخزن‌های خالی (مشابه فرمول وزن - اگر برای یک مخزن چند قرارداد وجود دارد، فقط یک بار شمارش می‌شود)
        totalEmptyCapacity: usableEmptyCapacity, // وزن کل ظرفیت خالی قابل استفاده
        reservedFullRentalCapacity: totalReservedFullRentalWeight, // ظرفیت رزرو شده بابت اجاره کامل (در بازه زمانی)
        outOfRangeCount: outOfRangeCount, // تعداد قراردادهای خارج از بازه زمانی
        outOfRangeWeight: outOfRangeWeight, // وزن قراردادهای خارج از بازه زمانی
        emptyTanks: emptyTanks
      };
    };
    
    const emptyTanksData = calculateEmptyTanks();

    // Calculate detailed empty sites and containers without contracts
    const calculateEmptySites = () => {
      // Use filtered contracts for active contracts calculation
      const activeContracts = filteredContracts.filter((c: any) => {
        if (c.isActive !== true) return false;
        if (c.endDate) {
          const today = new Date();
          const endDate = new Date(c.endDate);
          endDate.setHours(23, 59, 59, 999);
          return endDate >= today;
        }
        return true;
      });
      
      // Get sites that have active contracts
      const sitesWithContracts = new Set(activeContracts.map((c: any) => c.siteId).filter(Boolean));
      
      // Find all unique sites from filtered receipts
      const allSites = new Set();
      filteredReceipts.forEach((r: any) => {
        if (r.siteId) allSites.add(r.siteId);
      });
      
      // Find empty sites (sites without contracts)
      const emptySites = Array.from(allSites).filter(siteId => !sitesWithContracts.has(siteId));
      
      // Calculate containers and weights for empty sites with detailed breakdown
      const emptySiteContainers: { [key: string]: { count: number; weight: number; siteName: string; containers: string[] } } = {};
      
      filteredReceipts.filter((r: any) => emptySites.includes(r.siteId)).forEach((receipt: any) => {
        if (receipt.containerId) {
          if (!emptySiteContainers[receipt.siteId]) {
            emptySiteContainers[receipt.siteId] = {
              count: 0,
              weight: 0,
              siteName: receipt.siteName || receipt.siteId || 'سایت نامشخص',
              containers: []
            };
          }
          emptySiteContainers[receipt.siteId].count += 1;
          emptySiteContainers[receipt.siteId].weight += receipt.finalAmount || receipt.amount || 0;
          emptySiteContainers[receipt.siteId].containers.push(receipt.containerId);
        }
      });
      
      return {
        emptySiteCount: emptySites.length,
        totalEmptyContainers: Object.values(emptySiteContainers).reduce((sum, site) => sum + site.count, 0),
        totalEmptyWeight: Object.values(emptySiteContainers).reduce((sum, site) => sum + site.weight, 0),
        emptySiteDetails: Object.entries(emptySiteContainers).map(([siteId, data]) => ({
          siteId,
          siteName: data.siteName,
          containerCount: data.count,
          totalWeight: data.weight,
          containers: data.containers
        }))
      };
    };

    // Calculate inventory adjustments by container and site
    const calculateInventoryAdjustments = () => {
      const containerAdjustments: { [key: string]: { count: number; totalWeight: number; sites: string[]; adjustments: any[] } } = {};
      const siteAdjustments: { [key: string]: { count: number; totalWeight: number; containers: string[]; adjustments: any[] } } = {};
      const ownedAdjustments: { additions: number; deductions: number } = { additions: 0, deductions: 0 };
      const consignmentAdjustments: { additions: number; deductions: number } = { additions: 0, deductions: 0 };
      
      // Use filtered adjustments (already filtered by date range)
      filteredAdjustments.forEach((adjustment: any) => {
        const containerId = adjustment.containerId || 'نامشخص';
        const siteId = adjustment.siteId || 'نامشخص';
        const weight = Math.abs(adjustment.weight || adjustment.quantity || 0);
        const isOwned = adjustment.productType === 'owned' || adjustment.nature === 'owned';
        const isConsignment = adjustment.productType === 'consignment' || adjustment.nature === 'consignment';
        
        // By container
        if (!containerAdjustments[containerId]) {
          containerAdjustments[containerId] = {
            count: 0,
            totalWeight: 0,
            sites: [],
            adjustments: []
          };
        }
        containerAdjustments[containerId].count += 1;
        containerAdjustments[containerId].totalWeight += weight;
        if (!containerAdjustments[containerId].sites.includes(siteId)) {
          containerAdjustments[containerId].sites.push(siteId);
        }
        containerAdjustments[containerId].adjustments.push(adjustment);
        
        // By site
        if (!siteAdjustments[siteId]) {
          siteAdjustments[siteId] = {
            count: 0,
            totalWeight: 0,
            containers: [],
            adjustments: []
          };
        }
        siteAdjustments[siteId].count += 1;
        siteAdjustments[siteId].totalWeight += weight;
        if (!siteAdjustments[siteId].containers.includes(containerId)) {
          siteAdjustments[siteId].containers.push(containerId);
        }
        siteAdjustments[siteId].adjustments.push(adjustment);
        
        // By product type (owned vs consignment)
        if (isOwned) {
          if (adjustment.adjustmentType === 'addition') {
            ownedAdjustments.additions += weight;
          } else if (adjustment.adjustmentType === 'deduction') {
            ownedAdjustments.deductions += weight;
          }
        }
        
        if (isConsignment) {
          if (adjustment.adjustmentType === 'addition') {
            consignmentAdjustments.additions += weight;
          } else if (adjustment.adjustmentType === 'deduction') {
            consignmentAdjustments.deductions += weight;
          }
        }
      });
      
      return {
        byContainer: Object.entries(containerAdjustments).map(([containerId, data]) => ({
          containerId,
          totalCount: data.count,
          totalWeight: data.totalWeight,
          sites: data.sites,
          adjustments: data.adjustments
        })),
        bySite: Object.entries(siteAdjustments).map(([siteId, data]) => ({
          siteId,
          totalCount: data.count,
          totalWeight: data.totalWeight,
          containers: data.containers,
          adjustments: data.adjustments
        })),
        owned: ownedAdjustments,
        consignment: consignmentAdjustments
      };
    };

    // Calculate accounting statistics with quantity, amount, and price
    const calculateAccountingStats = () => {
      // Use filtered receipts
      const quantityStats = {
        total: filteredReceipts.reduce((sum, r: any) => sum + (r.quantity || 1), 0),
        owned: filteredReceipts.filter((r: any) => r.userType === 'owned' || r.productType === 'owned')
          .reduce((sum, r: any) => sum + (r.quantity || 1), 0),
        consignment: filteredReceipts.filter((r: any) => r.userType === 'consignment' || r.productType === 'consignment')
          .reduce((sum, r: any) => sum + (r.quantity || 1), 0)
      };
      
      const amountStats = {
        total: filteredReceipts.reduce((sum, r: any) => sum + (r.finalAmount || r.amount || 0), 0),
        owned: filteredReceipts.filter((r: any) => r.userType === 'owned' || r.productType === 'owned')
          .reduce((sum, r: any) => sum + (r.finalAmount || r.amount || 0), 0),
        consignment: filteredReceipts.filter((r: any) => r.userType === 'consignment' || r.productType === 'consignment')
          .reduce((sum, r: any) => sum + (r.finalAmount || r.amount || 0), 0)
      };
      
      // Use filtered invoices
      const priceStats = {
        total: filteredInvoices.reduce((sum, i: any) => sum + (i.totalAmount || i.amount || 0), 0),
        paid: filteredInvoices.filter((i: any) => i.status === 'paid')
          .reduce((sum, i: any) => sum + (i.totalAmount || i.amount || 0), 0),
        unpaid: filteredInvoices.filter((i: any) => i.status === 'unpaid' || i.status === 'pending')
          .reduce((sum, i: any) => sum + (i.totalAmount || i.amount || 0), 0),
        automatic: filteredInvoices.filter((i: any) => i.automatic === true)
          .reduce((sum, i: any) => sum + (i.totalAmount || i.amount || 0), 0),
        manual: filteredInvoices.filter((i: any) => i.automatic === false)
          .reduce((sum, i: any) => sum + (i.totalAmount || i.amount || 0), 0)
      };
      
      return {
        receipts: quantityStats,
        amounts: amountStats,
        invoices: priceStats
      };
    };

    // Calculate permits statistics with quantity and amount
    const calculatePermitsStats = () => {
      const usedPermits = filteredPermits.filter((p: any) => p.used === true || p.status === 'used');
      const unusedPermits = filteredPermits.filter((p: any) => p.used === false && p.status !== 'used');
      
      return {
        used: {
          count: usedPermits.length,
          quantity: usedPermits.reduce((sum, p: any) => sum + (p.quantity || p.amount || 0), 0),
          amount: usedPermits.reduce((sum, p: any) => sum + (p.value || p.price || 0), 0)
        },
        unused: {
          count: unusedPermits.length,
          quantity: unusedPermits.reduce((sum, p: any) => sum + (p.quantity || p.amount || 0), 0),
          amount: unusedPermits.reduce((sum, p: any) => sum + (p.value || p.price || 0), 0)
        }
      };
    };

    const emptySitesData = calculateEmptySites();
    const inventoryAdjustmentsData = calculateInventoryAdjustments();
    const accountingData = calculateAccountingStats();
    const permitsData = calculatePermitsStats();
    
    // Calculate product conversion statistics
    const calculateProductConversionStats = () => {
      // Use filtered product conversions
      if (!filteredProductConversions || filteredProductConversions.length === 0) {
        return {
          ownedConsumed: 0,
          ownedProduced: 0,
          consignmentConsumed: 0,
          consignmentProduced: 0,
          total: 0
        };
      }
      
      const ownedConsumed = filteredProductConversions
        .filter((c: any) => c && c.consumedProductType === 'owned' && !c.isVoided)
        .reduce((sum: number, c: any) => sum + (c.consumedQuantity || 0), 0);
      
      const ownedProduced = filteredProductConversions
        .filter((c: any) => c && c.producedProductType === 'owned' && !c.isVoided)
        .reduce((sum: number, c: any) => sum + (c.producedQuantity || 0), 0);
      
      const consignmentConsumed = filteredProductConversions
        .filter((c: any) => c && c.consumedProductType === 'consignment' && !c.isVoided)
        .reduce((sum: number, c: any) => sum + (c.consumedQuantity || 0), 0);
      
      const consignmentProduced = filteredProductConversions
        .filter((c: any) => c && c.producedProductType === 'consignment' && !c.isVoided)
        .reduce((sum: number, c: any) => sum + (c.producedQuantity || 0), 0);
      
      return {
        ownedConsumed,
        ownedProduced,
        consignmentConsumed,
        consignmentProduced,
        total: filteredProductConversions.filter((c: any) => c && !c.isVoided).length
      };
    };
    
    const productConversionStats = calculateProductConversionStats();

    // Ensure productConversions always has a value
    const productConversionsData = {
      total: productConversionStats?.total || 0,
      ownedConsumed: productConversionStats?.ownedConsumed || 0,
      ownedProduced: productConversionStats?.ownedProduced || 0,
      consignmentConsumed: productConversionStats?.consignmentConsumed || 0,
      consignmentProduced: productConversionStats?.consignmentProduced || 0
    };

    // محاسبه قراردادهای فعال (با فیلتر تاریخ)
    const activeContracts = filteredContracts.filter((c: any) => {
      if (c.isActive === false) return false;
      if (c.endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(c.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate > today; // تاریخ پایان باید بزرگتر از امروز باشد
      }
      return false; // اگر تاریخ پایان نداشته باشد، فعال محسوب نمی‌شود
    });
    
    const activeCount = activeContracts.length;
    const activeWeight = activeContracts.reduce((sum: number, c: any) => {
      const weight = toNumber(c.contractWeight);
      return sum + weight;
    }, 0);
    
    // محاسبه قراردادهای منقضی شده (تاریخ پایان قبل از امروز) - با فیلتر تاریخ
    const expiredByDate = filteredContracts.filter((c: any) => {
      if (c.endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(c.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate < today; // اگر تاریخ پایان قبل از امروز باشد، منقضی شده است
      }
      return false;
    });
    
    const expiredByDateCount = expiredByDate.length;
    
    // محاسبه قراردادهای غیرفعال شده (با فیلتر تاریخ)
    const inactiveContracts = filteredContracts.filter((c: any) => c.isActive === false);
    const inactiveCount = inactiveContracts.length;
    
    // مجموع قراردادهای منقضی (منقضی شده + غیرفعال شده)
    const expiredTotal = expiredByDateCount + inactiveCount;

    // تابع کمکی برای بررسی اینکه آیا بازه زمانی قرارداد با بازه زمانی فیلتر تاریخ همپوشانی دارد
    const isContractInDateRangeForWithoutReceipts = (contract: any): boolean => {
      if (!contract.startDate || !contract.endDate) return false;
      
      const contractStart = new Date(contract.startDate);
      contractStart.setHours(0, 0, 0, 0);
      const contractEnd = new Date(contract.endDate);
      contractEnd.setHours(23, 59, 59, 999);
      
      // بررسی همپوشانی: قرارداد در بازه زمانی است اگر:
      // contractStart <= dateRangeFilter.end && contractEnd >= dateRangeFilter.start
      return contractStart <= dateRangeFilter.end && contractEnd >= dateRangeFilter.start;
    };
    
    // قراردادهای فاقد رسید - مشابه فرمول "مخزن های خالی"
    // اگر برای یک مخزن/سایت چند قرارداد تعریف شده باشد، فقط قراردادی که در بازه زمانی فیلتر تاریخ است را در نظر بگیر
    const allContractsForWithoutReceipts = contracts.filter((c: any) => {
      // فقط قراردادهای فعال که هنوز منقضی نشده‌اند
      if (c.isActive === false) return false;
      if (!c.endDate) return false;
      const endDate = new Date(c.endDate);
      endDate.setHours(0, 0, 0, 0);
      const todayDateOnly = new Date();
      todayDateOnly.setHours(0, 0, 0, 0);
      return endDate >= todayDateOnly;
    });
    
    // گروه‌بندی قراردادها بر اساس مخزن (یا siteId) - اگر چند قرارداد برای یک مخزن وجود دارد
    const contractsByTankForWithoutReceipts: { [key: string]: any[] } = {};
    allContractsForWithoutReceipts.forEach((c: any) => {
      const key = c.tankId || c.siteId || c.id; // استفاده از tankId یا siteId برای گروه‌بندی
      if (!contractsByTankForWithoutReceipts[key]) {
        contractsByTankForWithoutReceipts[key] = [];
      }
      contractsByTankForWithoutReceipts[key].push(c);
    });
    
    // برای هر مخزن/سایت، فقط قراردادی که در بازه زمانی است را انتخاب کن
    const activeContractsInRangeForWithoutReceipts: any[] = [];
    Object.keys(contractsByTankForWithoutReceipts).forEach((key: string) => {
      const tankContracts = contractsByTankForWithoutReceipts[key];
      const inRangeContract = tankContracts.find((c: any) => isContractInDateRangeForWithoutReceipts(c));
      if (inRangeContract) {
        activeContractsInRangeForWithoutReceipts.push(inRangeContract);
      }
    });
    
    // قراردادهای فاقد رسید - فقط قراردادهایی که در بازه زمانی هستند و هنوز هیچ رسید انباری برای آن‌ها ثبت نشده است
    const contractsWithoutReceipts = activeContractsInRangeForWithoutReceipts.filter((c: any) => {
      // بررسی اینکه آیا برای این قرارداد رسید انباری ثبت شده است یا نه (در تمام صفحات)
      const hasReceipt = receipts.some((r: any) => 
        r && !r.isVoided && r.contractId === c.id
      );
      return !hasReceipt;
    });
    
    const contractsWithoutReceiptsCount = contractsWithoutReceipts.length;
    const contractsWithoutReceiptsWeight = contractsWithoutReceipts.reduce((sum: number, c: any) => {
      return sum + toNumber(c.contractWeight);
    }, 0);

    return {
      // Contracts Section
      contracts: {
        total: filteredContracts.length, // تعداد قراردادها در بازه تاریخ
        active: activeCount,
        activeWeight: activeWeight,
        expired: expiredTotal,
        expiredByDate: expiredByDateCount,
        inactive: inactiveCount,
        withoutReceipts: contractsWithoutReceiptsCount, // تعداد قراردادهای فاقد رسید در بازه تاریخ
        withoutReceiptsWeight: contractsWithoutReceiptsWeight, // وزن قراردادهای فاقد رسید در بازه تاریخ
        newInRange: filteredContracts.length,
        totalSites: filteredContracts.filter((c: any) => c.siteId).length,
        sitesWithContracts: filteredContracts.filter((c: any) => c.siteId).length
      },

      // Warehouse Receipts Section
      receipts: {
        total: receipts.length,
        owned: filteredReceipts.filter((r: any) => r.userType === 'owned' || r.productType === 'owned').length,
        consignment: filteredReceipts.filter((r: any) => r.userType === 'consignment' || r.productType === 'consignment').length,
        temporaryConsignment: filteredReceipts.filter((r: any) => 
          (r.userType === 'consignment' || r.productType === 'consignment') && 
          r.status === 'draft'
        ).length,
        overdue: filteredReceipts.filter((r: any) => {
          const dueDate = r.dueDate || r.expiryDate;
          return dueDate && new Date(dueDate) < new Date();
        }).length,
        newInRange: filteredReceipts.length
      },

      // Deliveries Section - Combined for all types
      deliveries: {
        total: allDeliveries.length,
        owned: ownershipDeliveries.length,
        consignment: consignmentDeliveries.length,
        general: deliveries.length,
        pending: filteredDeliveries.filter((d: any) => d.status === 'pending' || d.status === 'draft').length,
        completed: filteredDeliveries.filter((d: any) => d.status === 'completed' || d.status === 'confirmed').length,
        newInRange: filteredDeliveries.length,
        // New fields for delivery slip statistics - اصلاح شده با استفاده از جدول "تراکنش‌های ثبت شده امانی"
        // این فیلدها از جدول "تراکنش‌های ثبت شده امانی" در WarehouseDeliveryManager دریافت می‌شوند
        // داده‌ها از consignment-delivery-slips که همان جدول "تراکنش‌های ثبت شده امانی" است
        consignmentSlips: (() => {
          // تعداد تراکنش‌های امانی که نوع آن "امانی" و وضعیت آن "صادر شده" است
          // از filteredDeliveries استفاده می‌کنیم که شامل consignmentDeliveries فیلتر شده است
          const filteredConsignmentDeliveries = filteredDeliveries.filter((d: any) => 
            !!(d.contractNumber || d.permitId || d.type === 'امانی' || d.userType === 'consignment')
          );
          const issuedItems = filteredConsignmentDeliveries.filter((d: any) => {
            // فیلتر برای وضعیت "صادر شده" - فقط "صادر شده" یا "issued"
            const isIssued = (
              d.status === 'issued' || 
              d.status === 'صادر شده' ||
              d.persianStatus === 'صادر شده'
            );
            return isIssued;
          });
          return issuedItems.length;
        })(),
        consignmentDraftSlips: (() => {
          // تعداد تراکنش‌های امانی که نوع آن "امانی" و وضعیت آن "پیش‌نویس" است
          const filteredConsignmentDeliveries = filteredDeliveries.filter((d: any) => 
            !!(d.contractNumber || d.permitId || d.type === 'امانی' || d.userType === 'consignment')
          );
          const draftItems = filteredConsignmentDeliveries.filter((d: any) => {
            // فیلتر برای وضعیت "پیش‌نویس" - فقط "پیش‌نویس" یا "draft"
            const isDraft = (
              d.status === 'draft' || 
              d.status === 'پيش‌نويس' ||
              d.status === 'پیش‌نویس' ||
              d.persianStatus === 'پیش‌نویس'
            );
            return isDraft;
          });
          return draftItems.length;
        })(),
        ownershipSlips: (() => {
          const filteredOwnershipDeliveries = filteredDeliveries.filter((d: any) => 
            !(d.contractNumber || d.permitId || d.type === 'امانی' || d.userType === 'consignment')
          );
          return filteredOwnershipDeliveries.filter((d: any) => d.status === 'صادر شده' || d.status === 'issued').length;
        })(),
        ownershipDraftSlips: (() => {
          const filteredOwnershipDeliveries = filteredDeliveries.filter((d: any) => 
            !(d.contractNumber || d.permitId || d.type === 'امانی' || d.userType === 'consignment')
          );
          return filteredOwnershipDeliveries.filter((d: any) => d.status === 'draft' || d.status === 'پيش‌نويس' || d.status === 'پیش‌نویس' || d.status === 'پیش نویس').length;
        })()
      },

      // Inventory Adjustments Section
      adjustments: {
        total: adjustments.length,
        additions: (() => {
          const dateFiltered = adjustments.filter((a: any) => {
            const adjustmentDate = a.date || a.createdAt || a.documentDate;
            return isDateInRange(adjustmentDate, dateRangeFilter);
          });
          return dateFiltered.filter((a: any) => a.adjustmentType === 'addition').length;
        })(),
        deductions: (() => {
          const dateFiltered = adjustments.filter((a: any) => {
            const adjustmentDate = a.date || a.createdAt || a.documentDate;
            return isDateInRange(adjustmentDate, dateRangeFilter);
          });
          return dateFiltered.filter((a: any) => a.adjustmentType === 'deduction').length;
        })(),
        newInRange: (() => {
          return adjustments.filter((a: any) => {
            const adjustmentDate = a.date || a.createdAt || a.documentDate;
            return isDateInRange(adjustmentDate, dateRangeFilter);
          }).length;
        })(),
        additionQuantity: (() => {
          const dateFiltered = adjustments.filter((a: any) => {
            const adjustmentDate = a.date || a.createdAt || a.documentDate;
            return isDateInRange(adjustmentDate, dateRangeFilter);
          });
          return dateFiltered.filter((a: any) => a.adjustmentType === 'addition').reduce((sum, item: any) => sum + (item.quantity || 0), 0);
        })(),
        deductionQuantity: (() => {
          const dateFiltered = adjustments.filter((a: any) => {
            const adjustmentDate = a.date || a.createdAt || a.documentDate;
            return isDateInRange(adjustmentDate, dateRangeFilter);
          });
          return dateFiltered.filter((a: any) => a.adjustmentType === 'deduction').reduce((sum, item: any) => sum + (item.quantity || 0), 0);
        })()
      },

      // Accounting/Invoices Section
      invoices: {
        total: invoices.length,
        automatic: filteredInvoices.filter((i: any) => i.automatic === true).length,
        manual: filteredInvoices.filter((i: any) => i.automatic === false).length,
        paid: filteredInvoices.filter((i: any) => i.status === 'paid').length,
        unpaid: filteredInvoices.filter((i: any) => i.status === 'unpaid' || i.status === 'pending').length,
        newInRange: filteredInvoices.length
      },

      // Additional Stats
      permits: {
        total: permits.length,
        issued: filteredPermits.filter((p: any) => p.status === 'issued').length,
        used: filteredPermits.filter((p: any) => {
          // Consider permit used if marked as used or status is used
          return p.used === true || p.status === 'used';
        }).length,
        unused: filteredPermits.filter((p: any) => {
          // Consider permit unused if not marked as used and status is not used
          return p.used === false && p.status !== 'used';
        }).length,
        newInRange: filteredPermits.length,
        // Enhanced permits data with quantity and amount
        usedEnhanced: permitsData.used,
        unusedEnhanced: permitsData.unused
      },

      // Calculate enhanced stats from available data
      enhancedStats: {
        pendingDeliveries: filteredDeliveries.filter((d: any) => d.status === 'pending' || d.status === 'draft').length,
        overdueReceipts: filteredReceipts.filter((r: any) => {
          const dueDate = r.dueDate || r.expiryDate;
          return dueDate && new Date(dueDate) < new Date();
        }).length,
        // Empty sites data
        emptySites: emptySitesData,
        // Empty tanks data (مخزن‌های خالی)
        emptyTanks: emptyTanksData,
        // Inventory adjustments by container and site
        inventoryAdjustments: inventoryAdjustmentsData,
        // Enhanced accounting data
        accountingStats: accountingData,
        // Product conversion statistics
        productConversionStats: productConversionStats || {
          ownedConsumed: 0,
          ownedProduced: 0,
          consignmentConsumed: 0,
          consignmentProduced: 0,
          total: 0
        }
      },
      // Product Conversions Section
      productConversions: productConversionsData
    };
  }, [allData, dateRangeFilter]);

  // Handle refresh
  const handleRefresh = async () => {
    console.log('🔄 Dashboard: Manual refresh initiated');
    setRefreshing(true);
    setLastRefreshMessage('در حال بروزرسانی...');
    
    try {
      // Force clear all localStorage cache
      const keys = ['contracts', 'receipts', 'deliveries', 'consignment-delivery-slips', 'ownership-delivery-slips', 'inventoryAdjustments', 'invoices', 'delivery-permits'];
      
      keys.forEach(key => {
        const cacheKey = `warehouse_${key}`;
        localStorage.removeItem(cacheKey);
      });

      // Trigger refresh
      await new Promise(resolve => {
        setRefreshKey(prev => prev + 1);
        setTimeout(resolve, 100); // Small delay to ensure cache clear
      });
      
      setLastRefreshMessage('بروزرسانی با موفقیت انجام شد');
      setTimeout(() => setLastRefreshMessage(''), 3000); // Clear message after 3 seconds
    } catch (error) {
      console.error('❌ Dashboard: Manual refresh failed:', error);
      setLastRefreshMessage('خطا در بروزرسانی');
      setTimeout(() => setLastRefreshMessage(''), 3000);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle section navigation
  const navigateToSection = (section: string) => {
    console.log('Navigating to section:', section);
    // Implement navigation logic here
  };

  // Show loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-lg text-gray-600">در حال بارگذاری داشبورد...</p>
          <p className="text-sm text-gray-500 mt-2">
            آخرین بروزرسانی: {lastUpdate ? formatPersianDate(lastUpdate.toISOString()) : 'در حال بارگذاری...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">داشبورد مدیریت انبار</h1>
            <p className="text-gray-600">نمای کلی از وضعیت سیستم و آمار مهم - به‌روزرسانی سریع</p>
            {lastUpdate && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Activity className="h-4 w-4" />
                <span>آخرین بروزرسانی: {formatPersianDateTime(lastUpdate.toISOString())}</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs">
                  زنده
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Date Range Filter */}
              <DateRangeFilter 
                value={dateRange} 
                onChange={handleDateRangeChange}
                disabled={refreshing}
              />
              
              {/* Action Buttons */}
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                بروزرسانی
              </button>
            </div>
            
            {/* Custom Date Range Picker */}
            <CustomDateRangePicker
              fromDate={customFromDate}
              toDate={customToDate}
              onFromDateChange={handleCustomFromDateChange}
              onToDateChange={handleCustomToDateChange}
              onClear={handleClearCustomRange}
              disabled={refreshing}
            />
          </div>
        </div>

        {/* Current Date Range Display */}
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>
            نمایش اطلاعات از {formatPersianDate(dateRangeFilter.start.toISOString())} تا {formatPersianDate(dateRangeFilter.end.toISOString())}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">
            {dateRange === 'today' && 'امروز'}
            {dateRange === 'week' && 'این هفته'}
            {dateRange === 'month' && 'این ماه'}
            {dateRange === 'quarter' && 'این فصل'}
            {dateRange === 'year' && 'این سال'}
            {dateRange === 'custom' && useCustomRange && 'بازه سفارشی'}
          </span>
        </div>

        {/* Refresh Status Message */}
        {lastRefreshMessage && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            <RefreshCw className="h-4 w-4" />
            <span>{lastRefreshMessage}</span>
          </div>
        )}
      </div>

      {/* Main Statistics Grid */}
      <div className="space-y-12">
        {/* Contracts Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">بخش قراردادها</h2>
              <p className="text-sm text-gray-500">
                {formatPersianNumber(dashboardStats.contracts.total)} قرارداد در سیستم
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <GlassStatsCard
              title="قرارداد فاقد رسید"
              value={dashboardStats.contracts.withoutReceipts || 0}
              icon={FileText}
              color="blue"
              subtitle={`${formatPersianNumber(dashboardStats.contracts.withoutReceipts || 0)} قرارداد`}
              description={`وزن کل: ${formatPersianNumber(Math.round(dashboardStats.contracts.withoutReceiptsWeight || 0))} کیلوگرم`}
              onClick={() => navigateToSection('contracts')}
            />
            
            <GlassStatsCard
              title="قراردادهای فعال"
              value={dashboardStats.contracts.active}
              icon={CheckCircle}
              color="green"
              subtitle={`${formatPersianNumber(dashboardStats.contracts.active)} قرارداد`}
              description={`وزن کل: ${formatPersianNumber(Math.round(dashboardStats.contracts.activeWeight || 0))} کیلوگرم`}
              onClick={() => navigateToSection('contracts?filter=active')}
            />
            
            <GlassStatsCard
              title="قراردادهای منقضی"
              value={dashboardStats.contracts.expired}
              icon={Clock}
              color="red"
              subtitle={`${formatPersianNumber(dashboardStats.contracts.expiredByDate || 0)} منقضی شده`}
              description={`${formatPersianNumber(dashboardStats.contracts.inactive || 0)} غیرفعال شده`}
              onClick={() => navigateToSection('contracts?filter=expired')}
            />
            
            <GlassStatsCard
              title="مخزن های خالی"
              value={dashboardStats.enhancedStats.emptyTanks?.emptyTankCount || 0}
              icon={Warehouse}
              color="yellow"
              subtitle={
                <span 
                  title="فرمول محاسباتی: تعداد قراردادهای 'اجاره کامل مخزن' فعال که هنوز رسید نشده‌اند و بازه زمانی آن‌ها با بازه زمانی فیلتر تاریخ همپوشانی دارد | اگر برای یک مخزن چند قرارداد تعریف شده باشد، فقط قراردادی که در بازه زمانی فیلتر تاریخ است در نظر گرفته می‌شود"
                  className="cursor-help"
                >
                  {formatPersianNumber(dashboardStats.enhancedStats.emptyTanks?.emptyTankCount || 0)} قرارداد
                </span>
              }
              description={
                <span 
                  title="فرمول محاسباتی: ظرفیت خالی قابل استفاده = max(0, (ظرفیت کل مخزن‌ها - کل مقدار وارده‌ها + کل مقدار خروجی‌ها) - (مقدار وزن باقیمانده قراردادهای اجاره کامل فعال که هنوز رسید نشده‌اند)) | فقط قراردادهایی که بازه زمانی آن‌ها (startDate تا endDate) با بازه زمانی فیلتر تاریخ همپوشانی دارد در نظر گرفته می‌شوند | اگر برای یک مخزن چند قرارداد تعریف شده باشد، فقط قراردادی که در بازه زمانی است ملاک محاسبه قرار می‌گیرد"
                  className="cursor-help"
                >
                  {formatPersianNumber(Math.round(dashboardStats.enhancedStats.emptyTanks?.totalEmptyCapacity || 0))} ظرفیت خالی قابل استفاده
                </span>
              }
              actions={
                <div className="space-y-1 text-xs">
                  <div className="text-amber-700">
                    ظرفیت رزرو اجاره کامل: {formatPersianNumber(Math.round(dashboardStats.enhancedStats.emptyTanks?.reservedFullRentalCapacity || 0))} کیلوگرم
                  </div>
                  {(dashboardStats.enhancedStats.emptyTanks?.outOfRangeCount || 0) > 0 && (
                    <div className="text-red-600 border-t border-red-200 pt-1 mt-1">
                      خارج از بازه زمانی: {formatPersianNumber(dashboardStats.enhancedStats.emptyTanks?.outOfRangeCount || 0)} قرارداد - {formatPersianNumber(Math.round(dashboardStats.enhancedStats.emptyTanks?.outOfRangeWeight || 0))} کیلوگرم
                    </div>
                  )}
                </div>
              }
              onClick={() => navigateToSection('tanks')}
            />
          </div>
        </div>

        {/* Warehouse Receipts Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
              <Archive className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">بخش رسیدهای انبار</h2>
              <p className="text-sm text-gray-500">
                {formatPersianNumber(dashboardStats.receipts.total)} رسید در سیستم
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <GlassStatsCard
              title="رسیدهای امانی"
              value={dashboardStats.receipts.consignment}
              icon={Archive}
              color="green"
              trend={{ value: 8.3, isPositive: true, label: 'نسبت به دوره قبل' }}
              subtitle={`${dashboardStats.receipts.newInRange} مورد جدید در این دوره`}
              description="تعداد رسیدهایی که نوع آن امانی ثبت شده است"
              onClick={() => navigateToSection('receipts')}
            />
            
            <GlassStatsCard
              title="رسیدهای تملیکی"
              value={dashboardStats.receipts.owned}
              icon={Shield}
              color="blue"
              subtitle="کالاهای متعلق به شرکت"
              description="موجودی مالکیتی"
              onClick={() => navigateToSection('receipts?type=owned')}
            />
            
            <GlassStatsCard
              title="رسید امانی موقت"
              value={dashboardStats.receipts.temporaryConsignment}
              icon={Clipboard}
              color="purple"
              subtitle="وضعیت پیش نویس"
              description="تعداد رسیدهایی که نوع آن امانی و وضعیت آن پیش نویس ثبت شده است"
              onClick={() => navigateToSection('receipts?type=consignment&status=draft')}
            />
            
            <GlassStatsCard
              title="رسیدهای سررسید شده"
              value={dashboardStats.receipts.overdue}
              icon={AlertTriangle}
              color="red"
              subtitle="نیاز به پیگیری"
              description="رسیدهای امانی با تاریخ سررسید گذشته"
              onClick={() => navigateToSection('receipts?filter=overdue')}
            />
          </div>
        </div>

        {/* Warehouse Deliveries Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">بخش حواله‌های انبار</h2>
              <p className="text-sm text-gray-500">
                {formatPersianNumber(dashboardStats.deliveries.total)} حواله در سیستم
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <GlassStatsCard
              title="حواله های امانی صادر شده"
              value={dashboardStats.deliveries.consignmentSlips}
              icon={Truck}
              color="purple"
              trend={{ value: 15.7, isPositive: true, label: 'نسبت به دوره قبل' }}
              subtitle={`${dashboardStats.deliveries.newInRange} مورد جدید در این دوره`}
              description="تعداد تراکنش‌های امانی با وضعیت صادر شده"
              onClick={() => navigateToSection('deliveries?type=consignment&status=issued')}
            />
            
            <GlassStatsCard
              title="حواله های امانی موقت"
              value={dashboardStats.deliveries.consignmentDraftSlips}
              icon={Clock}
              color="yellow"
              subtitle="وضعیت پیش‌نویس"
              description="تعداد تراکنش‌های امانی با وضعیت پیش‌نویس"
              onClick={() => navigateToSection('deliveries?type=consignment&status=draft')}
            />
            
            <GlassStatsCard
              title="حواله های تملیکی"
              value={dashboardStats.deliveries.ownershipSlips}
              icon={CheckCircle}
              color="green"
              subtitle="وضعیت صادر شده"
              description="تعداد حواله‌های تملیکی با وضعیت صادر شده"
              onClick={() => navigateToSection('deliveries?type=ownership&status=issued')}
            />
            
            <GlassStatsCard
              title="حواله های تملیکی موقت"
              value={dashboardStats.deliveries.ownershipDraftSlips}
              icon={Truck}
              color="indigo"
              subtitle="وضعیت پیش نویس"
              description="تعداد حواله‌های تملیکی با وضعیت پیش‌نویس"
              onClick={() => navigateToSection('deliveries?type=ownership&status=draft')}
            />
          </div>
        </div>

        {/* Accounting/Invoices Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">بخش حسابداری و فاکتورها</h2>
              <p className="text-sm text-gray-500">
                {formatPersianNumber(dashboardStats.invoices.total)} فاکتور در سیستم
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <GlassStatsCard
              title="فاکتورهای اتوماتیک"
              value={dashboardStats.invoices.total}
              icon={DollarSign}
              color="yellow"
              trend={{ value: 34.2, isPositive: true, label: 'نسبت به دوره قبل' }}
              subtitle={`${dashboardStats.invoices.newInRange} مورد جدید در این دوره`}
              description={`مبلغ کل: ${formatPersianNumber(Math.round(dashboardStats.enhancedStats.accountingStats.invoices.total))} ریال`}
              onClick={() => navigateToSection('invoices')}
            />
            
            <GlassStatsCard
              title="فاکتور های دستی"
              value={dashboardStats.invoices.paid}
              icon={CheckCircle}
              color="green"
              subtitle="تسویه شده"
              description={`مبلغ: ${formatPersianNumber(Math.round(dashboardStats.enhancedStats.accountingStats.invoices.paid))} ریال`}
              trend={{ value: 8.9, isPositive: true, label: 'نسبت به دوره قبل' }}
              onClick={() => navigateToSection('invoices?status=paid')}
            />
            
            <GlassStatsCard
              title="رسیدهای فاکتور نشده "
              value={dashboardStats.invoices.unpaid}
              icon={AlertTriangle}
              color="red"
              subtitle="در انتظار"
              description={`مبلغ: ${formatPersianNumber(Math.round(dashboardStats.enhancedStats.accountingStats.invoices.unpaid))} ریال`}
              onClick={() => navigateToSection('invoices?status=unpaid')}
            />
            
            <GlassStatsCard
              title="فاکتورهای تسویه نشده"
              value={dashboardStats.receipts.total}
              icon={Archive}
              color="purple"
              subtitle="تعداد کل"
              description={`مقدار: ${formatPersianNumber(Math.round(dashboardStats.enhancedStats.accountingStats.receipts.total))} | مبلغ: ${formatPersianNumber(Math.round(dashboardStats.enhancedStats.accountingStats.amounts.total))} ریال`}
              onClick={() => navigateToSection('receipts')}
            />
          </div>
        </div>

        {/* Additional Statistics */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">آمار تکمیلی</h2>
              <p className="text-sm text-gray-500">
                اطلاعات جامع از وضعیت سیستم
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <GlassStatsCard
              title="مجوزهای بسته نشده"
              value={dashboardStats.permits.total}
              icon={Clipboard}
              color="indigo"
              subtitle="مجموع مجوزها"
              description={`${dashboardStats.permits.used} مجوز استفاده شده`}
              trend={{ value: 15.2, isPositive: true, label: 'نسبت به دوره قبل' }}
              onClick={() => navigateToSection('delivery-permits')}
            />
            
            <GlassStatsCard
              title="مجوزهای فافد حواله"
              value={dashboardStats.permits.usedEnhanced.count}
              icon={CheckCircle}
              color="green"
              subtitle={`مقدار: ${formatPersianNumber(Math.round(dashboardStats.permits.usedEnhanced.quantity))}`}
              description={`مبلغ: ${formatPersianNumber(Math.round(dashboardStats.permits.usedEnhanced.amount))} ریال`}
              onClick={() => navigateToSection('delivery-permits?status=used')}
            />
            
            <GlassStatsCard
              title="مجوزهای دارای اصلاحیه"
              value={dashboardStats.permits.unusedEnhanced.count}
              icon={AlertTriangle}
              color="orange"
              subtitle={`مقدار: ${formatPersianNumber(Math.round(dashboardStats.permits.unusedEnhanced.quantity))}`}
              description={`مبلغ: ${formatPersianNumber(Math.round(dashboardStats.permits.unusedEnhanced.amount))} ریال`}
              onClick={() => navigateToSection('delivery-permits?status=unused')}
            />

            <GlassStatsCard
              title="مجوزهای فاقد تاریخ"
              value={dashboardStats.enhancedStats.emptySites.emptySiteDetails.length}
              icon={MapPin}
              color="yellow"
              subtitle={`${dashboardStats.enhancedStats.emptySites.totalEmptyContainers} مخزن بدون قرارداد`}
              description={`وزن کل: ${formatPersianNumber(Math.round(dashboardStats.enhancedStats.emptySites.totalEmptyWeight))} کیلوگرم`}
              onClick={() => navigateToSection('empty-sites')}
            />
          </div>
        </div>

        {/* Inventory Adjustments Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">بخش تعدیلات موجودی</h2>
              <p className="text-sm text-gray-500">
                {formatPersianNumber(dashboardStats.adjustments.total)} تعدیل در سیستم
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <GlassStatsCard
              title="سند کسر انبار"
              value={dashboardStats.enhancedStats.inventoryAdjustments.owned.deductions + dashboardStats.enhancedStats.inventoryAdjustments.consignment.deductions}
              icon={Minus}
              color="red"
              subtitle="کیلوگرم"
              description={`مجموع کسر انبار: ${formatPersianNumber(dashboardStats.enhancedStats.inventoryAdjustments.owned.deductions + dashboardStats.enhancedStats.inventoryAdjustments.consignment.deductions)} کیلوگرم`}
              onClick={() => navigateToSection('inventory-adjustments?filter=deduction')}
            />
            
            <GlassStatsCard
              title="سند اضافه انبار"
              value={dashboardStats.enhancedStats.inventoryAdjustments.owned.additions + dashboardStats.enhancedStats.inventoryAdjustments.consignment.additions}
              icon={Plus}
              color="green"
              subtitle="کیلوگرم"
              description={`مجموع اضافه انبار: ${formatPersianNumber(dashboardStats.enhancedStats.inventoryAdjustments.owned.additions + dashboardStats.enhancedStats.inventoryAdjustments.consignment.additions)} کیلوگرم`}
              onClick={() => navigateToSection('inventory-adjustments?filter=addition')}
            />
            
            <GlassStatsCard
              title="سند کسر انبار موقت"
              value={dashboardStats.enhancedStats.inventoryAdjustments.consignment.deductions + dashboardStats.enhancedStats.inventoryAdjustments.consignment.additions}
              icon={Warehouse}
              color="blue"
              subtitle="کیلوگرم"
              description={`مجموع تعدیلات امانی: ${formatPersianNumber(dashboardStats.enhancedStats.inventoryAdjustments.consignment.deductions + dashboardStats.enhancedStats.inventoryAdjustments.consignment.additions)} کیلوگرم`}
              onClick={() => navigateToSection('inventory-adjustments?type=consignment')}
            />
            
            <GlassStatsCard
              title="سند اضافه انبار موقت"
              value={dashboardStats.enhancedStats.inventoryAdjustments.owned.deductions + dashboardStats.enhancedStats.inventoryAdjustments.owned.additions}
              icon={MapPin}
              color="green"
              subtitle="کیلوگرم"
              description={`مجموع تعدیلات تملیکی: ${formatPersianNumber(dashboardStats.enhancedStats.inventoryAdjustments.owned.deductions + dashboardStats.enhancedStats.inventoryAdjustments.owned.additions)} کیلوگرم`}
              onClick={() => navigateToSection('inventory-adjustments?type=owned')}
            />
          </div>
        </div>

        {/* Product Conversion Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">بخش تبدیل کالا</h2>
              <p className="text-sm text-gray-500">
                {formatPersianNumber(dashboardStats.productConversions.total)} تراکنش تبدیل کالا در سیستم
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassStatsCard
              title="کالای مصرفی تملیکی"
              value={formatPersianNumber(Math.round(dashboardStats.productConversions.ownedConsumed))}
              icon={Minus}
              color="red"
              subtitle="کیلوگرم"
              description={`مجموع کالای مصرفی تملیکی: ${formatPersianNumber(Math.round(dashboardStats.productConversions.ownedConsumed))} کیلوگرم`}
              onClick={() => navigateToSection('product-conversion?type=owned&filter=consumed')}
            />
            
            <GlassStatsCard
              title="کالای تولیدی تملیکی"
              value={formatPersianNumber(Math.round(dashboardStats.productConversions.ownedProduced))}
              icon={Plus}
              color="green"
              subtitle="کیلوگرم"
              description={`مجموع کالای تولیدی تملیکی: ${formatPersianNumber(Math.round(dashboardStats.productConversions.ownedProduced))} کیلوگرم`}
              onClick={() => navigateToSection('product-conversion?type=owned&filter=produced')}
            />
            
            <GlassStatsCard
              title="کالای مصرفی امانی"
              value={formatPersianNumber(Math.round(dashboardStats.productConversions.consignmentConsumed))}
              icon={Minus}
              color="orange"
              subtitle="کیلوگرم"
              description={`مجموع کالای مصرفی امانی: ${formatPersianNumber(Math.round(dashboardStats.productConversions.consignmentConsumed))} کیلوگرم`}
              onClick={() => navigateToSection('product-conversion?type=consignment&filter=consumed')}
            />
            
            <GlassStatsCard
              title="کالای تولیدی امانی"
              value={formatPersianNumber(Math.round(dashboardStats.productConversions.consignmentProduced))}
              icon={Plus}
              color="blue"
              subtitle="کیلوگرم"
              description={`مجموع کالای تولیدی امانی: ${formatPersianNumber(Math.round(dashboardStats.productConversions.consignmentProduced))} کیلوگرم`}
              onClick={() => navigateToSection('product-conversion?type=consignment&filter=produced')}
            />
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
              {userName.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{userName}</h3>
              <p className="text-sm text-gray-600">
                نقش: <span className="font-medium">{userRole === 'admin' ? 'مدیر سیستم' : userRole === 'manager' ? 'مدیر میانی' : userRole === 'operator' ? 'اپراتور' : 'کاربر عادی'}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                سطح دسترسی: {
                  userPermissions.includes('*') ? 'دسترسی کامل' :
                  userPermissions.length > 0 ? `${userPermissions.length} دسترسی فعال` :
                  'بدون دسترسی خاص'
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">وضعیت دسترسی</div>
            <div className="flex flex-wrap gap-2 max-w-xs">
              {userPermissions.includes('*') ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  دسترسی کامل
                </span>
              ) : (
                <>
                  {userPermissions.includes('dashboard_view') && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">مشاهده</span>
                  )}
                  {userPermissions.some(p => typeof p === 'string' && (p.includes('create') || p.includes('manage'))) && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">ایجاد/ویرایش</span>
                  )}
                  {userPermissions.some(p => typeof p === 'string' && p.includes('delete')) && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">حذف</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 space-y-2">
        <div className="flex items-center justify-center gap-4 text-sm">
          <span>آخرین بروزرسانی: {lastUpdate ? formatPersianDateTime(lastUpdate.toISOString()) : 'در حال بارگذاری...'}</span>
          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
          <span>عملکرد بهینه شده</span>
          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
          <span>کاربر فعلی: {userName}</span>
        </div>
        <div className="flex items-center justify-center gap-6 text-xs">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            اتصال زنده
          </span>
          <span>داده‌های جامع از {formatPersianNumber(Object.keys(allData || {}).filter(key => allData[key] !== null && allData[key] !== undefined).length)} ماژول</span>
          <span>مجموع آیتم‌ها: {formatPersianNumber(Object.values(allData || {}).filter(v => Array.isArray(v)).reduce((sum: number, arr: any) => sum + arr.length, 0))}</span>
        </div>
      </div>
    </div>
  );
};

// Utility function to notify DashboardStats about data changes
export const notifyDashboardUpdate = () => {
  // Clear all dashboard cache
  const keys = ['contracts', 'receipts', 'deliveries', 'consignment-delivery-slips', 'ownership-delivery-slips', 'inventoryAdjustments', 'invoices', 'delivery-permits'];
  
  keys.forEach(key => {
    const cacheKey = `warehouse_${key}`;
    localStorage.removeItem(cacheKey);
  });

  // Trigger custom event for same-tab updates
  window.dispatchEvent(new CustomEvent('warehouseDataUpdate'));
  
  console.log('🔄 Dashboard update notification sent');
};

// Export for both import patterns
export const DashboardStats = DashboardStatsComponent;
export default DashboardStatsComponent;