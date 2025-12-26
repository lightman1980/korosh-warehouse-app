import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Search, Filter, Download, Package, FileText, Calculator, X, Calendar, AlertCircle, Save, Edit2, Trash2, Eye, CheckCircle, Clock, DollarSign, TrendingUp, BarChart3, RefreshCw, ChevronDown, ChevronUp, Activity, Printer, ArrowLeft, Building as BuildingIcon, Info, Database, Droplets, Scale, Warehouse, AlertTriangle, AlertOctagon, Truck, FlaskConical } from 'lucide-react';
import { formatPersianDate, formatPersianNumber, formatCurrency, generateTransactionNumber, safeParseDate } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../../components/Common/PersianDatePicker.tsx';

/////////////////////////////////////////////////////////////
// کامپوننت جدید FieldWithTooltip برای نمایش راهنمای فیلدها
//////////////////////////////////////////////////////////////
const FieldWithTooltip: React.FC<{
  label: string;
  formula: string;
  children: React.ReactNode;
}> = ({ label, formula, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative">
      <div className="flex items-center mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <button
          type="button"
          className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Info size={14} />
        </button>
      </div>
      {children}
      {showTooltip && (
        <div className="absolute z-10 w-64 p-2 mt-1 text-xs text-white bg-gray-800 rounded-lg shadow-lg">
          <div className="font-medium mb-1">فرمول محاسبه:</div>
          <div>{formula}</div>
        </div>
      )}
    </div>
  );
};

/////////////////////////////////////////////////////////////
// کامپوننت جدید SimplePersianDateField با اندازه بزرگتر
/////////////////////////////////////////////////////////////
const SimplePersianDateField: React.FC<{
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}> = ({
  value,
  onChange,
  placeholder = "تاریخ را وارد کنید",
  id,
  className = "",
  label,
  required = false,
  disabled = false
}) => {
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');

  useEffect(() => {
    if (value) {
      const persianDate = formatPersianDate(value).split('/');
      if (persianDate.length === 3) {
        setDay(persianDate[2]);
        setMonth(persianDate[1]);
        setYear(persianDate[0]);
      }
    }
  }, [value]);

  const handleDateChange = () => {
    if (day && month && year) {
      // تبدیل تاریخ شمسی به میلادی
      const gDate = toGregorian(parseInt(year), parseInt(month), parseInt(day));
      const date = new Date(gDate.gy, gDate.gm - 1, gDate.gd);
      onChange?.(date);
    } else {
      onChange?.(undefined);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="سال"
          maxLength={4}
          disabled={disabled}
          className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-center"
          onBlur={handleDateChange}
        />
        <span className="text-gray-500">/</span>
        <input
          type="text"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          placeholder="ماه"
          maxLength={2}
          disabled={disabled}
          className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg text-center"
          onBlur={handleDateChange}
        />
        <span className="text-gray-500">/</span>
        <input
          type="text"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          placeholder="روز"
          maxLength={2}
          disabled={disabled}
          className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg text-center"
          onBlur={handleDateChange}
        />
      </div>
    </div>
  );
};

/////////////////////////////////////////////////////////////
// کامپوننت PersianDateField با راهنمای فرمول
/////////////////////////////////////////////////////////////
const PersianDateField: React.FC<{
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  formula?: string;
}> = ({
  value,
  onChange,
  placeholder = "تاریخ را انتخاب کنید",
  id,
  className = "",
  label,
  required = false,
  disabled = false,
  formula
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDateChange = (date: Date | undefined) => {
    onChange?.(date);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <div className="flex items-center mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
        {formula && (
          <button
            type="button"
            className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Info size={14} />
          </button>
        )}
        {showTooltip && formula && (
          <div className="absolute z-10 w-64 p-2 mt-1 text-xs text-white bg-gray-800 rounded-lg shadow-lg">
            <div className="font-medium mb-1">فرمول محاسبه:</div>
            <div>{formula}</div>
          </div>
        )}
      </div>
      <div
        className={`w-full px-4 py-4 border-2 border-gray-300 rounded-lg text-right cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all flex items-center justify-between h-16 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-blue-50'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`text-lg ${value ? 'text-gray-900' : 'text-gray-500'}`}>
          {value ? formatPersianDate(value) : placeholder}
        </span>
        <Calendar className="h-6 w-6 text-gray-400" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 bottom-full mb-2 bg-white shadow-xl rounded-xl border-2 border-gray-200 p-6 w-full max-w-md">
          <PersianDatePicker
            value={value}
            onChange={handleDateChange}
          />
        </div>
      )}
    </div>
  );
};

/////////////////////////////////////////////////////////////
// تابع تولید شماره سیستمی منحصر به فرد برای مجوز
/////////////////////////////////////////////////////////////
const generateSystemPermitNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `MP-${timestamp.slice(-6)}-${random}`;
};

// تابع بررسی تکراری نبودن شماره سیستمی
const isSystemPermitNumberUnique = (permitNumber: string, deliveryPermits: DeliveryPermit[], excludePermitId?: string) => {
  return !deliveryPermits.some(permit => 
    permit.systemPermitNumber === permitNumber && 
    permit.id !== excludePermitId
  );
};

// تابع بررسی تکراری نبودن شماره نامه مدیریت
const isManagementLetterNumberUnique = (letterNumber: string, deliveryPermits: DeliveryPermit[], excludePermitId?: string) => {
  return !deliveryPermits.some(permit => 
    permit.managementLetterNumber === letterNumber && 
    permit.id !== excludePermitId
  );
};

// Function to convert Gregorian to Jalali
const toGregorian = (jy: number, jm: number, jd: number) => {
  const PERSIAN_EPOCH = 1948321; // Julian day of 1/1/1 Persian calendar
  
  let epyear = jy - 979;
  let epbase = 0;
  
  if (jy >= 0) {
    epyear = jy - 979;
    epbase = 0;
  } else {
    epyear = jy - 979;
    epbase = 0;
  }
  
  const epochday = PERSIAN_EPOCH + 
    365 * epyear +
    Math.floor(epyear / 33) * 8 +
    Math.floor(((epyear % 33) + 3) / 4) +
    (jm <= 6 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) +
    jd - 1;
  
  // Convert Julian day to Gregorian
  const a = epochday + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  
  const gd = e - Math.floor((153 * m + 2) / 5) + 1;
  const gm = m + 3 - 12 * Math.floor(m / 10);
  const gy = 100 * b + d - 4800 + Math.floor(m / 10);
  
  return { gy, gm, gd };
};

/////////////////////////////////////////////////////////////
// Define the interface for chart data
/////////////////////////////////////////////////////////////
interface ChartData {
  name: string;
  value: number;
}

// Define the color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Function to convert Gregorian to Jalali - نسخه اصلاح شده
const toJalaali = (gy: number, gm: number, gd: number) => {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy, jm, jd, gy2, days;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  if (gm > 2) {
    gy2 = gy + 1;
  } else {
    gy2 = gy;
  }
  days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  // اصلاح محاسبه سال شمسی
  if (gy > 1600) {
    jy += 424; // این مقدار برای اصلاح سال شمسی اضافه شده است
  }
  return { jy, jm, jd };
};

// تابع کمکی برای تبدیل تاریخ میلادی به ماه و سال شمسی
const getGregorianToPersianYearMonth = (date: Date): { year: number; month: number } => {
  try {
    const safeDate = safeParseDate(date);
    if (!safeDate) {
      return { year: 1403, month: 1 };
    }
    
    const j = toJalaali(safeDate.getFullYear(), safeDate.getMonth() + 1, safeDate.getDate());
    
    // اصلاح محاسبه سال شمسی برای نمایش صحیح
    let persianYear = j.jy;
    let persianMonth = j.jm;
    
    // اگر ماه شمسی کمتر از 7 است، ممکن است سال شمسی نیاز به اصلاح داشته باشد
    if (persianMonth < 7) {
      // بررسی اینکه آیا تاریخ میلادی در سال جدید شمسی قرار دارد
      const march21 = new Date(safeDate.getFullYear(), 2, 21); // 21 مارس
      if (safeDate < march21) {
        persianYear = j.jy - 1;
      }
    }
    
    return { year: persianYear, month: persianMonth };
  } catch (error) {
    console.error('Error converting to Persian date:', error);
    return { year: 1403, month: 1 };
  }
};

// Component for rendering charts without recharts
const ChartsSection: React.FC<{ 
  activeTab: 'uninvoiced' | 'invoiced' | 'permits';
  uninvoicedReceipts: any[];
  invoicedReceipts: any[];
  deliveryPermitsData: any[];
}> = ({ activeTab, uninvoicedReceipts, invoicedReceipts, deliveryPermitsData }) => {
  // Prepare data for charts based on active tab
  const getChartData = () => {
    if (activeTab === 'uninvoiced') {
      // Data for uninvoiced receipts
      const data: ChartData[] = [
        { name: 'رسیدهای فاکتور نشده', value: uninvoicedReceipts.length }
      ];
      
      // Add data by product type if available
      const productCounts: Record<string, number> = {};
      uninvoicedReceipts.forEach(receipt => {
        const productName = receipt.productName || 'نامشخص';
        productCounts[productName] = (productCounts[productName] || 0) + 1;
      });
      
      Object.entries(productCounts).forEach(([name, value]) => {
        data.push({ name, value });
      });
      
      return data;
    } else if (activeTab === 'invoiced') {
      // Data for invoiced receipts
      const totalInvoiced = invoicedReceipts.reduce((sum, item) => sum + item.invoiceAmount, 0);
      const totalPaid = invoicedReceipts.reduce((sum, item) => sum + item.paidAmount, 0);
      const totalDebt = invoicedReceipts.reduce((sum, item) => sum + item.remainingDebt, 0);
      const settledCount = invoicedReceipts.filter(item => item.remainingDebt === 0).length;
      const unsettledCount = invoicedReceipts.filter(item => item.remainingDebt > 0).length;
      
      // Add invoice type data
      const automaticCount = invoicedReceipts.filter(item => item.invoiceType === 'automatic').length;
      const manualCount = invoicedReceipts.filter(item => item.invoiceType === 'manual').length;
      
      return [
        { name: 'مبلغ کل فاکتورها', value: totalInvoiced },
        { name: 'مبلغ کل پرداخت شده', value: totalPaid },
        { name: 'مبلغ کل بدهی', value: totalDebt },
        { name: 'فاکتورهای تسویه شده', value: settledCount },
        { name: 'فاکتورهای تسویه نشده', value: unsettledCount },
        { name: 'فاکتورهای اتوماتیک', value: automaticCount },
        { name: 'فاکتورهای دستی', value: manualCount }
      ];
    } else {
      // Data for delivery permits
      const totalPermitted = deliveryPermitsData.reduce((sum, item) => sum + item.permitAmount, 0);
      const totalWastage = deliveryPermitsData.reduce((sum, item) => sum + item.wastageAmount, 0);
      const totalFinalPermitted = deliveryPermitsData.reduce((sum, item) => sum + item.finalPermitAmount, 0);
      const draftCount = deliveryPermitsData.filter(item => item.status === 'draft').length;
      const issuedCount = deliveryPermitsData.filter(item => item.status === 'issued').length;
      const usedCount = deliveryPermitsData.filter(item => item.status === 'used').length;
      
      return [
        { name: 'مجموع مجوزهای صادر شده', value: totalPermitted },
        { name: 'مجموع افت مجوزها', value: totalWastage },
        { name: 'مجموع مجوزهای قابل استفاده', value: totalFinalPermitted },
        { name: 'مجوزهای پیش‌نویس', value: draftCount },
        { name: 'مجوزهای صادر شده', value: issuedCount },
        { name: 'مجوزهای استفاده شده', value: usedCount }
      ];
    }
  };
  
  const chartData = getChartData();
  
  // Prepare data for bar chart
  const getBarChartData = () => {
    if (activeTab === 'uninvoiced') {
      // For uninvoiced receipts, show count by month
      const monthCounts: Record<string, number> = {};
      
      uninvoicedReceipts.forEach(receipt => {
        const date = new Date(receipt.receiptDate);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      });
      
      return Object.entries(monthCounts).map(([key, value]) => {
        const [year, month] = key.split('-').map(Number);
        const persianDate = getGregorianToPersianYearMonth(new Date(year, month - 1));
        return {
          name: `${persianDate.year} ${persianDate.month}`,
          value
        };
      });
    } else if (activeTab === 'invoiced') {
      // For invoiced receipts, show amount by month
      const monthAmounts: Record<string, number> = {};
      
      invoicedReceipts.forEach(item => {
        const monthKey = `${item.year}-${item.month}`;
        monthAmounts[monthKey] = (monthAmounts[monthKey] || 0) + item.invoiceAmount;
      });
      
      return Object.entries(monthAmounts).map(([key, value]) => {
        const [year, month] = key.split('-').map(Number);
        const persianDate = getGregorianToPersianYearMonth(new Date(year, month - 1));
        return {
          name: `${persianDate.year} ${persianDate.month}`,
          value
        };
      });
    } else {
      // For delivery permits, show amount by status
      const statusAmounts: Record<string, number> = {};
      
      deliveryPermitsData.forEach(item => {
        const status = item.status === 'draft' ? 'پیش‌نویس' : 
                      item.status === 'issued' ? 'صادر شده' : 'استفاده شده';
        statusAmounts[status] = (statusAmounts[status] || 0) + item.permitAmount;
      });
      
      return Object.entries(statusAmounts).map(([name, value]) => ({
        name,
        value
      }));
    }
  };
  
  const barChartData = getBarChartData();
  
  // Calculate max value for bar chart scaling
  const maxValue = Math.max(...barChartData.map(item => item.value), 1);
  
  return (
    <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">گزارشات و نمودارها</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart Representation */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-700 mb-3 text-center">توزیع {activeTab === 'uninvoiced' ? 'رسیدهای فاکتور نشده' : activeTab === 'invoiced' ? 'فاکتورها' : 'مجوزهای حواله'}</h4>
          <div className="space-y-3">
            {chartData.map((item, index) => {
              const total = chartData.reduce((sum, d) => sum + d.value, 0);
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.name}</span>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${percentage}%`, 
                          backgroundColor: COLORS[index % COLORS.length] 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Bar Chart Representation */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-700 mb-3 text-center">
            {activeTab === 'uninvoiced' ? 'تعداد رسیدها بر اساس ماه' : 
             activeTab === 'invoiced' ? 'مبلغ فاکتورها بر اساس ماه' : 
             'میزان مجوزها بر اساس وضعیت'}
          </h4>
          <div className="space-y-4">
            {barChartData.map((item, index) => {
              const percentage = (item.value / maxValue) * 100;
              
              return (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.name}</span>
                    <span>{formatPersianNumber(item.value)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="h-4 rounded-full bg-blue-500" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {chartData.slice(0, 3).map((item, index) => (
          <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="text-blue-800 font-medium">{item.name}</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {formatPersianNumber(item.value)}
              {activeTab === 'invoiced' && index < 3 ? ' ریال' : ''}
              {activeTab === 'permits' && index < 3 ? ' کیلوگرم' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface InvoiceData {
  id: string;
  receiptId: string;
  transactionNumber: string;
  year: number;
  month: number;
  invoiceAmount: number;
  paidAmount: number;
  remainingDebt: number;
  status: 'draft' | 'issued' | 'paid' | 'settled';
  createdAt: Date;
  updatedAt: Date;
  invoiceType: 'automatic' | 'manual'; // نوع فاکتور: اتوماتیک یا دستی
  contractId?: string; // اضافه شده برای ارتباط با قرارداد
  paymentDate?: Date; // تاریخ واریز
}

interface DeliveryPermit {
  id: string;
  receiptId: string;
  systemPermitNumber: string; // شماره سیستمی مجوز
  managementLetterNumber: string; // شماره نامه مدیریت
  permitAmount: number;
  wastageAmount: number;
  finalPermitAmount: number;
  remainingPermit: number;
  status: 'draft' | 'issued' | 'used' | 'cancelled'; // اضافه کردن وضعیت 'cancelled'
  createdAt: Date;
  updatedAt: Date;
  contractId?: string; // اضافه شده برای ارتباط با قرارداد
  event?: string; // برای نمایش رخدادها مانند درخواست اصلاحیه
}

  // Multi-select dropdown component برای فیلترهای موجودی
  const MultiSelectDropdown = ({ options, selectedValues, onChange, label, placeholder }: { 
    options: [string, string][], 
    selectedValues: string | string[], 
    onChange: (values: string | string[]) => void,
    label: string,
    placeholder: string
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value: string, event?: React.MouseEvent) => {
      const currentValues = Array.isArray(selectedValues) ? selectedValues : (selectedValues ? [selectedValues] : []);
      let newValues;
      if (event?.ctrlKey) {
        newValues = currentValues.includes(value)
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value];
      } else {
        if (currentValues.length === 1 && currentValues[0] === value) {
          newValues = [];
        } else {
          newValues = [value];
        }
      }
      onChange(newValues.length === 1 ? newValues[0] : (newValues.length === 0 ? '' : newValues));
    };

    const currentValues = Array.isArray(selectedValues) ? selectedValues : (selectedValues ? [selectedValues] : []);
    const isAllSelected = options.length > 0 && currentValues.length === options.length;

    const toggleAll = () => {
      if (isAllSelected) {
        onChange('');
      } else {
        onChange(options.map(o => o[0]));
      }
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="truncate">
            {currentValues.length === 0 
              ? placeholder 
              : currentValues.length === options.length 
                ? 'همه انتخاب شده‌اند' 
                : `${currentValues.length} مورد انتخاب شده`}
          </span>
          <Filter className="w-4 h-4 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
              <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2"
                />
                <span className="text-sm font-medium text-gray-700">انتخاب همه</span>
              </label>
            </div>
              <div className="p-1">
                {options.map(([id, name]) => (
                  <label key={id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={(e) => {
                    e.preventDefault();
                    toggleOption(id, e);
                  }}>
                    <input
                      type="checkbox"
                      checked={currentValues.includes(id)}
                      readOnly
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2"
                    />
                    <span className="text-sm text-gray-700">{name}</span>
                  </label>
                ))}
              </div>
          </div>
        )}
      </div>
    );
  };

  const AccountingManager: React.FC = () => {
  const storage = DataStorage.getInstance();
  
  const [receipts, setReceipts] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [deliveryPermits, setDeliveryPermits] = useState<DeliveryPermit[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'uninvoiced' | 'invoiced' | 'permits'>('uninvoiced');
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [editingPermit, setEditingPermit] = useState<string | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState<string | null>(null);
  const [showPermitForm, setShowPermitForm] = useState<string | null>(null);
  const [newInvoice, setNewInvoice] = useState<Partial<InvoiceData>>({});
  const [newPermit, setNewPermit] = useState<Partial<DeliveryPermit>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showColumnFilter, setShowColumnFilter] = useState<string | null>(null);
  const [invoiceBasis, setInvoiceBasis] = useState<Record<string, 'receiptBasis' | 'remainingContractWeight'>>({});
  
  // تعریف متغیر wastageTransactions در سطح کامپوننت
  const [wastageTransactions, setWastageTransactions] = useState<any[]>([]);

  const [baseData, setBaseData] = useState<Record<string, any[]>>({});
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [selectedTankForFilter, setSelectedTankForFilter] = useState<string>('');
  const [selectedSiteForFilter, setSelectedSiteForFilter] = useState<string>('');
  const [upToDate, setUpToDate] = useState<Date>(new Date());
  const [showInventoryPackage, setShowInventoryPackage] = useState<boolean>(true);

  // Helper function for safe number conversion
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
    const num = parseFloat(value.toString());
    return isNaN(num) ? defaultValue : num;
  };

  const loadBaseData = useCallback(() => {
    try {
      const allCategories = storage.getAllData() || {};
      const loadedBaseData: Record<string, any[]> = {};
      const baseDataCategories = storage.loadData<any[]>('baseDataCategories') || [];
      if (Array.isArray(baseDataCategories)) {
        baseDataCategories.forEach((category: any) => {
          if (category && category.id && category.items) {
            loadedBaseData[category.id] = category.items;
          }
        });
      }
      Object.keys(allCategories).forEach(key => {
        if (key.startsWith('category_')) {
          const categoryKey = key.replace('category_', '');
          if (allCategories[key]?.items) {
            loadedBaseData[categoryKey] = allCategories[key].items;
          }
        }
      });
      setBaseData(loadedBaseData);
    } catch (error) {
      console.error('Error loading base data:', error);
    }
  }, [storage]);

  useEffect(() => {
    loadBaseData();
    const handleBaseDataUpdate = () => loadBaseData();
    window.addEventListener('baseDataUpdated', handleBaseDataUpdate);
    return () => window.removeEventListener('baseDataUpdated', handleBaseDataUpdate);
  }, [loadBaseData]);

  const memoizedInventoryData = useMemo(() => {
    const activeTanks = (baseData.tanks || []).filter((t: any) => t.isActive !== false);
    const activeTankIds = new Set(activeTanks.map((t: any) => t.id));

    const allReceipts = (storage.loadData<any[]>('receipts') || []).filter((r: any) => 
      r && !r.isVoided && new Date(r.receiptDate) <= upToDate && activeTankIds.has(r.tankId)
    );
    const allAdjustments = (storage.loadData<any[]>('inventoryAdjustments') || []).filter((adj: any) => 
      adj && !adj.isVoided && new Date(adj.documentDate) <= upToDate && activeTankIds.has(adj.tankId)
    );
    const allDeliveries = (storage.loadData<any[]>('ownership-delivery-slips') || []).filter((d: any) => 
      d && !d.isVoided && new Date(d.deliveryDate) <= upToDate && activeTankIds.has(d.tankId)
    );
    const allConsignmentSlips = (storage.loadData<any[]>('consignment-delivery-slips') || []).filter((d: any) => {
      if (!d || d.isVoided || !activeTankIds.has(d.tankId)) return false;
      const dateValue = d.deliveryDate || d.slipDate;
      if (!dateValue) return true;
      const deliveryDate = new Date(dateValue);
      return isNaN(deliveryDate.getTime()) || deliveryDate <= upToDate;
    });
    const allGeneralDeliveries = (storage.loadData<any[]>('deliveries') || []).filter((d: any) => {
      if (!d || d.isVoided || !activeTankIds.has(d.tankId)) return false;
      const dateValue = d.deliveryDate || d.createdAt;
      if (!dateValue) return false;
      const deliveryDate = new Date(dateValue);
      return !isNaN(deliveryDate.getTime()) && deliveryDate <= upToDate;
    });
    const allWastage = (storage.loadData<any[]>('wastageTransactions') || []).filter((t: any) => 
      t && !t.isVoided && new Date(t.transactionDate) <= upToDate && activeTankIds.has(t.tankId)
    );
    const allConversions = (storage.loadData<any[]>('productConversions') || []).filter((c: any) => 
      c && !c.isVoided && new Date(c.documentDate) <= upToDate && activeTankIds.has(c.tankId)
    );

    const tankData: Record<string, any> = {};
    activeTankIds.forEach(id => {
      tankData[id] = {
        receipts: [], adjustments: [], deliveries: [], consignmentSlips: [], 
        generalDeliveries: [], wastage: [], conversions: []
      };
    });

    allReceipts.forEach(r => { if(tankData[r.tankId]) tankData[r.tankId].receipts.push(r); });
    allAdjustments.forEach(a => { if(tankData[a.tankId]) tankData[a.tankId].adjustments.push(a); });
    allDeliveries.forEach(d => { if(tankData[d.tankId]) tankData[d.tankId].deliveries.push(d); });
    allConsignmentSlips.forEach(s => { if(tankData[s.tankId]) tankData[s.tankId].consignmentSlips.push(s); });
    allGeneralDeliveries.forEach(d => { if(tankData[d.tankId]) tankData[d.tankId].generalDeliveries.push(d); });
    allWastage.forEach(w => { if(tankData[w.tankId]) tankData[w.tankId].wastage.push(w); });
    allConversions.forEach(c => { if(tankData[c.tankId]) tankData[c.tankId].conversions.push(c); });

    return { tankData, activeTanks };
  }, [storage, upToDate, baseData.tanks, inventoryRefreshKey]);

  const uniqueTanks = useMemo(() => {
    const tankMap = new Map<string, string>();
    const allReceipts = storage.loadData<any[]>('receipts') || [];
    allReceipts.forEach((receipt: any) => {
      if (receipt && receipt.tankId && receipt.tankName && !receipt.isVoided) {
        tankMap.set(receipt.tankId, receipt.tankName);
      }
    });
    return Array.from(tankMap.entries());
  }, [storage]);

  const uniqueSites = useMemo(() => {
    const siteMap = new Map<string, string>();
    const allReceipts = storage.loadData<any[]>('receipts') || [];
    allReceipts.forEach((receipt: any) => {
      if (receipt && receipt.siteId && receipt.siteName && !receipt.isVoided) {
        siteMap.set(receipt.siteId, receipt.siteName);
      }
    });
    return Array.from(siteMap.entries());
  }, [storage]);

  const calculateOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    let ownedReceiptsAmount = 0;
    let ownedAdditionDocuments = 0;
    let ownedDeliveries = 0;
    let ownedGainedAmount = 0;
    let ownedDeductionDocuments = 0;
    let ownedConsumedProducts = 0;
    let ownedProducedProducts = 0;

    const tanksToProcess = memoizedInventoryData.activeTanks.map(t => t.id);

    tanksToProcess.forEach(tankId => {
      const data = memoizedInventoryData.tankData[tankId];
      if (!data) return;

      data.receipts.forEach((r: any) => {
        if (currentSiteId && r.siteId !== currentSiteId) return;
        if (currentTankId && r.tankId !== currentTankId) return;
        if (r.userType === 'owned') {
          ownedReceiptsAmount += safeNumber(r.amount || r.receiptBasisAmount, 0);
        }
      });

      data.adjustments.forEach((adj: any) => {
        if (currentSiteId && adj.siteId !== currentSiteId) return;
        if (currentTankId && adj.tankId !== currentTankId) return;
        if (adj.productType === 'owned') {
          if (adj.adjustmentType === 'addition') ownedAdditionDocuments += safeNumber(adj.quantity, 0);
          else if (adj.adjustmentType === 'deduction') ownedDeductionDocuments += safeNumber(adj.quantity, 0);
        }
      });

      data.deliveries.forEach((d: any) => {
        if (currentSiteId && d.siteId !== currentSiteId) return;
        if (currentTankId && d.tankId !== currentTankId) return;
        ownedDeliveries += safeNumber(d.amount, 0);
      });

      data.wastage.forEach((t: any) => {
        if (currentSiteId && t.siteId !== currentSiteId) return;
        if (currentTankId && t.tankId !== currentTankId) return;
        if (t.transactionType === 'owned') {
          ownedGainedAmount += Math.abs(safeNumber(t.amount, 0));
        }
      });

      data.conversions.forEach((c: any) => {
        if (currentSiteId && c.siteId !== currentSiteId) return;
        if (currentTankId && c.tankId !== currentTankId) return;
        if (c.consumedProductType === 'owned') ownedConsumedProducts += safeNumber(c.consumedQuantity, 0);
        if (c.producedProductType === 'owned') ownedProducedProducts += safeNumber(c.producedQuantity, 0);
      });
    });

    const totalOwnedValue = ownedReceiptsAmount + ownedAdditionDocuments + ownedGainedAmount + ownedProducedProducts - ownedDeliveries - ownedDeductionDocuments - ownedConsumedProducts;

    return {
      ownedReceiptsAmount, ownedAdditionDocuments, ownedDeliveries, ownedGainedAmount,
      ownedDeductionDocuments, ownedConsumedProducts, ownedProducedProducts, finalInventory: totalOwnedValue
    };
  }, [memoizedInventoryData, selectedSiteForFilter, selectedTankForFilter]);

  const calculateConsignmentTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    let consignmentReceiptsAmount = 0;
    let consignmentAdditions = 0;
    let consignmentDeliveries = 0;
    let consignmentDeductionAmount = 0;
    let consignmentDeductionDocuments = 0;
    let consignmentConsumedProducts = 0;
    let consignmentProducedProducts = 0;

    const tanksToProcess = memoizedInventoryData.activeTanks.map(t => t.id);

    tanksToProcess.forEach(tankId => {
      const data = memoizedInventoryData.tankData[tankId];
      if (!data) return;

      data.receipts.forEach((r: any) => {
        if (currentSiteId && r.siteId !== currentSiteId) return;
        if (currentTankId && r.tankId !== currentTankId) return;
        if (r.userType === 'consignment') {
          const baseAmount = r.receiptBasisAmount || r.finalAmount || r.amount || 
                           (safeNumber(r.shipUnloadingAmount, 0) + safeNumber(r.tankShoreAmount, 0) + 
                            safeNumber(r.shipBillOfLadingAmount, 0) + safeNumber(r.weightGross, 0));
          consignmentReceiptsAmount += baseAmount;
        }
      });

      data.adjustments.forEach((adj: any) => {
        if (currentSiteId && adj.siteId !== currentSiteId) return;
        if (currentTankId && adj.tankId !== currentTankId) return;
        if (adj.productType === 'consignment') {
          if (adj.adjustmentType === 'addition') consignmentAdditions += safeNumber(adj.quantity, 0);
          else if (adj.adjustmentType === 'deduction') consignmentDeductionDocuments += safeNumber(adj.quantity, 0);
        }
      });

      const processDelivery = (d: any, isConsignmentCheck: boolean) => {
        if (currentSiteId && d.siteId !== currentSiteId) return;
        if (currentTankId && d.tankId !== currentTankId) return;
        if (!isConsignmentCheck || (d.contractNumber || d.permitId || d.userType === 'consignment' || d.type === 'امانی' || d.nature === 'consignment')) {
          consignmentDeliveries += safeNumber(d.amount, 0);
        }
      };
      data.consignmentSlips.forEach((s: any) => processDelivery(s, false));
      data.generalDeliveries.forEach((d: any) => processDelivery(d, true));

      data.wastage.forEach((t: any) => {
        if (currentSiteId && t.siteId !== currentSiteId) return;
        if (currentTankId && t.tankId !== currentTankId) return;
        if (t.transactionType === 'consignment') {
          consignmentDeductionAmount += Math.abs(safeNumber(t.amount, 0));
        }
      });

      data.conversions.forEach((c: any) => {
        if (currentSiteId && c.siteId !== currentSiteId) return;
        if (currentTankId && c.tankId !== currentTankId) return;
        if (c.consumedProductType === 'consignment') consignmentConsumedProducts += safeNumber(c.consumedQuantity, 0);
        if (c.producedProductType === 'consignment') consignmentProducedProducts += safeNumber(c.producedQuantity, 0);
      });
    });

    const totalConsignmentValue = consignmentReceiptsAmount + consignmentAdditions + consignmentProducedProducts - consignmentDeliveries - consignmentDeductionAmount - consignmentDeductionDocuments - consignmentConsumedProducts;

    return {
      consignmentReceiptsAmount, consignmentAdditions, consignmentDeliveries,
      consignmentDeductionAmount, consignmentDeductionDocuments, consignmentConsumedProducts,
      consignmentProducedProducts, finalInventory: totalConsignmentValue
    };
  }, [memoizedInventoryData, selectedSiteForFilter, selectedTankForFilter]);

  const calculateConsignmentOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const owned = calculateOwnedTanksInventory(siteId, tankId);
    const consignment = calculateConsignmentTanksInventory(siteId, tankId);
    return {
      ...owned,
      ...consignment,
      finalInventory: owned.finalInventory + consignment.finalInventory
    };
  }, [calculateOwnedTanksInventory, calculateConsignmentTanksInventory]);

  const calculateTotalTankCapacity = useCallback((siteId?: string, tankId?: string) => {
    const tanks = (baseData.tanks || []).filter((t: any) => t.isActive !== false);
    let totalCapacity = 0;
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    tanks.forEach((tank: any) => {
      if (currentTankId && String(tank.id) !== currentTankId) return;
      const tankSiteId = String(tank.siteId || tank.locationId || '');
      if (currentSiteId && tankSiteId && tankSiteId !== currentSiteId) return;
      const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
      const capacityMatch = typeof capacityStr === 'string' ? capacityStr.match(/[\d,]+/) : null;
      const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, ''), 10) : (typeof capacityStr === 'number' ? capacityStr : 5000000);
      totalCapacity += capacity;
    });
    return totalCapacity;
  }, [baseData.tanks, selectedSiteForFilter, selectedTankForFilter]);

  const calculateEmptyTankCapacity = useCallback(() => {
    const totalCapacity = calculateTotalTankCapacity(selectedSiteForFilter || undefined, selectedTankForFilter || undefined);
    const finalInventory = calculateConsignmentOwnedTanksInventory(selectedSiteForFilter || undefined, selectedTankForFilter || undefined).finalInventory || 0;
    return Math.max(0, totalCapacity - finalInventory);
  }, [calculateTotalTankCapacity, calculateConsignmentOwnedTanksInventory, selectedSiteForFilter, selectedTankForFilter]);

  const calculateTankStatusCounts = useCallback(() => {
    const tanks = (baseData.tanks || []).filter((t: any) => t.isActive !== false);
    const currentSiteId = selectedSiteForFilter;
    const currentTankId = selectedTankForFilter;
    let totalTanks = 0;
    let withInventoryCount = 0;
    let withoutInventoryCount = 0;
    let lowInventoryAlert = false;
    let lowInventoryTanks: any[] = [];
    let totalShortageSum = 0;
    const siteIdToNameMap = new Map<string, string>(uniqueSites);
    tanks.forEach((tank: any) => {
      if (currentTankId && String(tank.id) !== currentTankId) return;
      const tankSiteId = String(tank.siteId || tank.locationId || '');
      if (currentSiteId) {
        const filterSiteIds = Array.isArray(currentSiteId) ? currentSiteId : [currentSiteId];
        if (filterSiteIds.length > 0 && tankSiteId && !filterSiteIds.includes(tankSiteId)) return;
      }
      totalTanks++;
      const inventoryData = calculateConsignmentOwnedTanksInventory(currentSiteId as string, tank.id);
      const inventory = inventoryData.finalInventory || 0;
      if (inventory > 0) withInventoryCount++;
      else withoutInventoryCount++;
      const minInventoryStr = tank.minimumStock || tank.minInventory || tank.minimumInventory || "0";
      const minInventoryMatch = typeof minInventoryStr === 'string' ? minInventoryStr.match(/[\d,]+/) : null;
      const minInventory = minInventoryMatch ? parseInt(minInventoryMatch[0].replace(/,/g, '')) : (typeof minInventoryStr === 'number' ? minInventoryStr : 0);
      if (minInventory > 0 && inventory <= minInventory) {
        lowInventoryAlert = true;
        const deficit = minInventory - inventory;
        totalShortageSum += deficit;
        const siteFromBase = baseData.sites?.find((s: any) => s.id === tank.siteId || s.id === tank.locationId);
        const siteFromUnique = siteIdToNameMap.get(tankSiteId);
        let siteName = siteFromBase?.name || siteFromUnique || tank.siteName || tank.locationName || tank.siteLocationName || '';
        if (!siteName && currentSiteId) {
          const activeId = Array.isArray(currentSiteId) ? currentSiteId[0] : currentSiteId;
          if (activeId) siteName = siteIdToNameMap.get(activeId) || '';
        }
        lowInventoryTanks.push({
          name: tank.name || tank.id,
          inventory: inventory,
          minInventory: minInventory,
          deficit: deficit,
          siteId: tankSiteId,
          siteName: siteName || (currentSiteId ? 'نامشخص' : 'تمام سایت ها')
        });
      }
    });
    let commonSiteName = '';
    if (lowInventoryTanks.length > 0) {
      const firstSiteId = lowInventoryTanks[0].siteId;
      const allSameSite = lowInventoryTanks.every(t => t.siteId === firstSiteId);
      if (allSameSite) commonSiteName = lowInventoryTanks[0].siteName !== 'نامشخص' ? lowInventoryTanks[0].siteName : '';
    }
    return { totalTanks, withInventoryCount, withoutInventoryCount, lowInventoryAlert, lowInventoryTanks, totalShortageSum, commonSiteName };
  }, [baseData.tanks, baseData.sites, uniqueSites, selectedSiteForFilter, selectedTankForFilter, calculateConsignmentOwnedTanksInventory]);

  // تعریف متغیر wastageTransactions در سطح کامپوننت
  const [wastageTransactions, setWastageTransactions] = useState<any[]>([]);
  
  // تابع جدید برای بررسی و صدور فاکتور اتوماتیک
  const checkAndGenerateAutomaticInvoices = useCallback(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Get consignment receipts that need invoicing
    const consignmentReceipts = receipts.filter(r => 
      r.userType === 'consignment' && 
      (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
    );
    
    consignmentReceipts.forEach(receipt => {
      const receiptDate = new Date(receipt.receiptDate);
      const receiptYear = receiptDate.getFullYear();
      const receiptMonth = receiptDate.getMonth() + 1;
      
      // Check if month or year has changed
      const monthYearChanged = currentYear !== receiptYear || currentMonth !== receiptMonth;
      
      // Check if invoice exists for this receipt in current month
      const existingInvoice = invoices.find(inv => 
        inv.receiptId === receipt.id && 
        inv.year === currentYear && 
        inv.month === currentMonth
      );
      
      // اگر ماه یا سال تغییر کرده باشد، حتما فاکتور جدید ایجاد کن
      if (monthYearChanged || !existingInvoice) {
        // Create automatic invoice
        const contract = contracts.find(c => c.id === receipt.contractId);
        const basis = invoiceBasis[receipt.id] || 'receiptBasis';
        const amount = basis === 'receiptBasis' 
          ? receipt.receiptBasisAmount 
          : calculateRemainingContractWeight(receipt);
        
        const invoiceAmount = amount * (contract?.rentalRate || 0);
        
        const newInvoice: InvoiceData = {
          id: `invoice_${Date.now()}_${receipt.id}`,
          receiptId: receipt.id,
          transactionNumber: generateTransactionNumber('invoice'),
          year: currentYear,
          month: currentMonth,
          invoiceAmount,
          paidAmount: 0,
          remainingDebt: invoiceAmount,
          status: 'issued',
          createdAt: new Date(),
          updatedAt: new Date(),
          invoiceType: 'automatic', // فاکتور اتوماتیک
          contractId: receipt.contractId // اضافه کردن شناسه قرارداد
        };
        
        setInvoices(prev => [...prev, newInvoice]);
        storage.saveData('invoices', [...invoices, newInvoice]);
      }
    });
  }, [receipts, invoices, contracts, invoiceBasis]);
  
  useEffect(() => {
    loadData();
    
    // Auto-generate monthly invoices
    generateMonthlyInvoices();
    
    // Set up interval for monthly invoice generation
    const interval = setInterval(() => {
      generateMonthlyInvoices();
      checkAndGenerateAutomaticInvoices();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [checkAndGenerateAutomaticInvoices]);
  
  const loadData = () => {
    try {
      const savedReceipts = storage.loadData('receipts') || [];
      const savedContracts = storage.loadData('contracts') || [];
      const savedInvoices = storage.loadData('invoices') || [];
      const savedPermits = storage.loadData('delivery-permits') || [];
      const savedDeliveries = storage.loadData('deliveries') || [];
      const savedAdjustments = storage.loadData('adjustments') || [];
      const savedWastageTransactions = storage.loadData('wastageTransactions') || [];
      
      setReceipts(savedReceipts);
      setContracts(savedContracts);
      setInvoices(savedInvoices);
      setDeliveryPermits(savedPermits);
      setDeliveries(savedDeliveries);
      setAdjustments(savedAdjustments);
      setWastageTransactions(savedWastageTransactions);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };
  
  const generateMonthlyInvoices = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Get consignment receipts that need invoicing
    const consignmentReceipts = receipts.filter(r => 
      r.userType === 'consignment' && 
      (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
    );
    
    consignmentReceipts.forEach(receipt => {
      const receiptDate = new Date(receipt.receiptDate);
      const receiptYear = receiptDate.getFullYear();
      const receiptMonth = receiptDate.getMonth() + 1;
      
      // Check if month or year has changed
      const monthYearChanged = currentYear !== receiptYear || currentMonth !== receiptMonth;
      
      // Check if invoice exists for this receipt in current month
      const existingInvoice = invoices.find(inv => 
        inv.receiptId === receipt.id && 
        inv.year === currentYear && 
        inv.month === currentMonth
      );
      
      // اگر ماه یا سال تغییر کرده باشد، حتما فاکتور جدید ایجاد کن
      if (monthYearChanged || !existingInvoice) {
        // Create automatic invoice
        const contract = contracts.find(c => c.id === receipt.contractId);
        const basis = invoiceBasis[receipt.id] || 'receiptBasis';
        const amount = basis === 'receiptBasis' 
          ? receipt.receiptBasisAmount 
          : calculateRemainingContractWeight(receipt);
        
        const invoiceAmount = amount * (contract?.rentalRate || 0);
        
        const newInvoice: InvoiceData = {
          id: `invoice_${Date.now()}_${receipt.id}`,
          receiptId: receipt.id,
          transactionNumber: generateTransactionNumber('invoice'),
          year: currentYear,
          month: currentMonth,
          invoiceAmount,
          paidAmount: 0,
          remainingDebt: invoiceAmount,
          status: 'issued',
          createdAt: new Date(),
          updatedAt: new Date(),
          invoiceType: 'automatic', // فاکتور اتوماتیک
          contractId: receipt.contractId // اضافه کردن شناسه قرارداد
        };
        
        setInvoices(prev => [...prev, newInvoice]);
        storage.saveData('invoices', [...invoices, newInvoice]);
      }
    });
  };
  
  // تابع محاسبه وزن مانده قرارداد
  const calculateRemainingContractWeight = (receipt: any) => {
    // محاسبه وزن مانده قرارداد بر اساس فرمول جدید
    // وزن مانده قرارداد = (وزن قرارداد) - (مقدار مبنای رسید) آن شماره قرارداد
    
    // Get the contract
    const contract = contracts.find(c => c.id === receipt.contractId);
    if (!contract) return 0;
    
    // Get all receipts for the same contract (excluding cancelled ones)
    const contractReceipts = receipts.filter(r => 
      r.contractId === receipt.contractId && 
      r.status !== 'cancelled' && 
      r.status !== 'deleted'
    );
    
    // Get all deliveries for the same contract (excluding cancelled ones)
    const contractDeliveries = deliveries.filter(d => 
      d.contractId === receipt.contractId && 
      d.status !== 'cancelled' && 
      d.status !== 'deleted'
    );
    
    // Get all adjustments for the same contract (excluding cancelled ones)
    const contractAdjustments = adjustments.filter(a => 
      a.contractId === receipt.contractId && 
      a.status !== 'cancelled' && 
      a.status !== 'deleted'
    );
    
    // Get all permits for the same contract (excluding cancelled ones)
    const contractPermits = deliveryPermits.filter(p => {
      const permitReceipt = receipts.find(r => r.id === p.receiptId);
      return permitReceipt && 
             permitReceipt.contractId === receipt.contractId && 
             p.status !== 'cancelled' && 
             p.status !== 'deleted';
    });
    
    // Calculate total contract weight
    const totalContractWeight = contract.contractWeight || 0;
    
    // Calculate total receipt basis amounts
    const totalReceiptBasis = contractReceipts.reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
    
    // Calculate total delivery amounts
    const totalDeliveries = contractDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // Calculate total adjustments
    const totalAdditions = contractAdjustments
      .filter(a => a.type === 'addition')
      .reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalSubtractions = contractAdjustments
      .filter(a => a.type === 'subtraction')
      .reduce((sum, a) => sum + (a.amount || 0), 0);
    
    // Calculate total permitted amounts
    const totalPermittedAmounts = contractPermits.reduce((sum, p) => sum + (p.permitAmount || 0), 0);
    
    // Apply the new formula: (وزن قرارداد) - (مقدار مبنای رسید) آن شماره قرارداد
    const remainingWeight = totalContractWeight - totalReceiptBasis + totalAdditions - totalSubtractions - totalDeliveries - totalPermittedAmounts;
    
    return Math.max(0, remainingWeight); // Ensure it's not negative
  };
  
  // تابع محاسبه مانده مجوز حواله
  const calculateRemainingPermit = (permit: DeliveryPermit, receipt: any) => {
    // محاسبه وزن مانده مجوز حواله بر اساس فرمول جدید
    // وزن مانده مجوز حواله = جمع (مانده قرارداد)ها - جمع (مقدار حواله)های صادر شده در {صفحه حواله امانی}
    
    const remainingContractWeight = calculateRemainingContractWeight(receipt);
    
    // Get all permits for the same contract (excluding current permit if editing and cancelled ones)
    const contractPermits = deliveryPermits.filter(p => 
      p.receiptId && 
      receipts.find(r => r.id === p.receiptId && r.contractId === receipt.contractId) &&
      p.id !== permit.id &&
      p.status !== 'cancelled' && 
      p.status !== 'deleted'
    );
    
    // Calculate total permitted amounts from previous permits
    const totalPreviousPermitAmounts = contractPermits.reduce((sum, p) => sum + (p.permitAmount || 0), 0);
    
    // Get all deliveries for the same contract from warehouse delivery page (excluding cancelled ones)
    const contractDeliveries = deliveries.filter(d => 
      d.contractId === receipt.contractId && 
      d.status !== 'cancelled' && 
      d.status !== 'deleted'
    );
    
    // Calculate total delivery amounts from warehouse
    const totalDeliveryAmounts = contractDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // Apply the new formula: 
    // جمع (مانده قرارداد)ها - جمع (مقدار حواله)های صادر شده در {صفحه حواله امانی}
    const remainingPermit = remainingContractWeight - totalPreviousPermitAmounts - totalDeliveryAmounts;
    
    return Math.max(0, remainingPermit); // Ensure it's not negative
  };
  
  // تابع محاسبه موجودی مخزن
  const getTankInventory = (tankId: string) => {
    // Get all receipts for the tank
    const tankReceipts = receipts.filter(r => r.tankId === tankId);
    // Get all deliveries for the tank
    const tankDeliveries = deliveries.filter(d => d.tankId === tankId);
    
    // Calculate current inventory
    const totalReceipts = tankReceipts.reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
    const totalDeliveries = tankDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
    
    return totalReceipts - totalDeliveries;
  };
  
  // تابع اعتبارسنجی تاریخ تراکنش
  const validateTransactionDate = (contractId: string, transactionDate: Date) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return false;
    
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);
    
    return transactionDate >= startDate && transactionDate <= endDate;
  };
  
  // تابع اعتبارسنجی موجودی انبار
  const validateWarehouseInventory = (productId: string, amount: number) => {
    // Get current inventory for the product
    const currentInventory = getCurrentInventory(productId);
    
    // Check if there's enough inventory
    return currentInventory >= amount;
  };
  
  // تابع کمکی برای دریافت موجودی فعلی محصول
  const getCurrentInventory = (productId: string) => {
    // Get all receipts for the product
    const productReceipts = receipts.filter(r => r.productId === productId);
    // Get all deliveries for the product
    const productDeliveries = deliveries.filter(d => d.productId === productId);
    
    // Calculate current inventory
    const totalReceipts = productReceipts.reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
    const totalDeliveries = productDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
    
    return totalReceipts - totalDeliveries;
  };
  
  // تابع دریافت واحد سنجش از قرارداد
  const getContractUnit = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract?.unit || 'kg'; // مقدار پیش‌فرض کیلوگرم
  };
  
  const handleIssueInvoice = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return;
    
    const contract = contracts.find(c => c.id === receipt.contractId);
    const basis = invoiceBasis[receiptId] || 'receiptBasis';
    const amount = basis === 'receiptBasis' 
      ? receipt.receiptBasisAmount 
      : calculateRemainingContractWeight(receipt);
    
    const invoiceAmount = amount * (contract?.rentalRate || 0);
    
    setNewInvoice({
      receiptId,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      invoiceAmount,
      paidAmount: 0,
      remainingDebt: invoiceAmount,
      status: 'draft',
      contractId: receipt.contractId // اضافه کردن شناسه قرارداد
    });
    
    setShowInvoiceForm(receiptId);
  };
  
  const handleSaveInvoice = () => {
    if (!newInvoice.receiptId) return;
    
    const invoiceData: InvoiceData = {
      ...newInvoice,
      id: editingInvoice || `invoice_${Date.now()}`,
      transactionNumber: generateTransactionNumber('invoice'),
      remainingDebt: (newInvoice.invoiceAmount || 0) - (newInvoice.paidAmount || 0),
      createdAt: editingInvoice ? invoices.find(i => i.id === editingInvoice)?.createdAt || new Date() : new Date(),
      updatedAt: new Date(),
      invoiceType: editingInvoice ? 
        (invoices.find(i => i.id === editingInvoice)?.invoiceType || 'manual') : 
        'manual', // فاکتور دستی
      contractId: newInvoice.contractId, // اضافه کردن شناسه قرارداد
      paymentDate: newInvoice.paymentDate // اضافه کردن تاریخ واریز
    } as InvoiceData;
    
    if (editingInvoice) {
      setInvoices(prev => prev.map(inv => inv.id === editingInvoice ? invoiceData : inv));
    } else {
      setInvoices(prev => [...prev, invoiceData]);
    }
    
    storage.saveData('invoices', editingInvoice 
      ? invoices.map(inv => inv.id === editingInvoice ? invoiceData : inv)
      : [...invoices, invoiceData]
    );
    
    setShowInvoiceForm(null);
    setEditingInvoice(null);
    setNewInvoice({});
  };
  
  // تابع جدید برای حذف فاکتور
  const handleDeleteInvoice = (invoiceId: string) => {
    if (window.confirm('آیا از حذف این فاکتور اطمینان دارید؟')) {
      const updatedInvoices = invoices.filter(inv => inv.id !== invoiceId);
      setInvoices(updatedInvoices);
      storage.saveData('invoices', updatedInvoices);
    }
  };
  
  const handleIssueDeliveryPermit = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return;
    
    // Check if receipt is settled
    const receiptInvoices = invoices.filter(inv => inv.receiptId === receiptId);
    const totalPaid = receiptInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalInvoiced = receiptInvoices.reduce((sum, inv) => sum + inv.invoiceAmount, 0);
    
    if (totalPaid < totalInvoiced) {
      alert('برای صدور مجوز حواله، ابتدا باید تسویه ریالی انجام شود.');
      return;
    }
    
    // Calculate available amount for permit
    const existingPermits = deliveryPermits.filter(p => p.receiptId === receiptId);
    const totalPermitted = existingPermits.reduce((sum, p) => sum + p.permitAmount, 0);
    const contract = contracts.find(c => c.id === receipt.contractId);
    const wastagePercentage = contract?.wastageRateValue || 0.5; // استفاده از wastageRateValue
    const wastageAmount = (receipt.receiptBasisAmount || 0) * (wastagePercentage / 100);
    const availableAmount = (receipt.consignmentRemainder || 0) - totalPermitted - wastageAmount;
    
    setNewPermit({
      receiptId,
      systemPermitNumber: generateSystemPermitNumber(),
      managementLetterNumber: '',
      permitAmount: 0,
      wastageAmount: 0,
      finalPermitAmount: 0,
      remainingPermit: availableAmount,
      status: 'draft',
      contractId: receipt.contractId // اضافه کردن شناسه قرارداد
    });
    
    setShowPermitForm(receiptId);
  };
  
  const handleSavePermit = () => {
    if (!newPermit.receiptId) return;
    
    const receipt = receipts.find(r => r.id === newPermit.receiptId);
    if (!receipt) return;
    
    // Check if management letter number is unique
    if (!isManagementLetterNumberUnique(newPermit.managementLetterNumber || '', deliveryPermits, editingPermit)) {
      alert('شماره نامه مدیریت تکراری است. لطفاً شماره دیگری وارد کنید.');
      return;
    }
    
    // اگر در حال ویرایش هستیم، بررسی وضعیت مجوز
    if (editingPermit) {
      const currentPermit = deliveryPermits.find(p => p.id === editingPermit);
      if (currentPermit && currentPermit.status !== 'draft' && currentPermit.status !== 'issued') {
        alert('ویرایش مجوز فقط در وضعیت "پیش نویس" یا "صادر شده" امکان‌پذیر است.');
        return;
      }
    }
    
    const contract = contracts.find(c => c.id === receipt.contractId);
    const wastagePercentage = contract?.wastageRateValue || 0.5;
    
    const wastageAmount = (newPermit.permitAmount || 0) * (wastagePercentage / 100);
    const finalPermitAmount = (newPermit.permitAmount || 0) - wastageAmount;
    
    const permitData: DeliveryPermit = {
      ...newPermit,
      wastageAmount,
      finalPermitAmount,
      remainingPermit: calculateRemainingPermit(newPermit as DeliveryPermit, receipt),
      createdAt: editingPermit ? deliveryPermits.find(p => p.id === editingPermit)?.createdAt || new Date() : new Date(),
      updatedAt: new Date(),
      contractId: receipt.contractId
    } as DeliveryPermit;
    
    if (editingPermit) {
      // به‌روزرسانی تراکنش موجود بدون ایجاد تراکنش جدید
      const updatedPermits = deliveryPermits.map(permit => 
        permit.id === editingPermit ? permitData : permit
      );
      setDeliveryPermits(updatedPermits);
      storage.saveData('delivery-permits', updatedPermits);
    } else {
      // ایجاد تراکنش جدید فقط در حالت افزودن
      setDeliveryPermits(prev => [...prev, permitData]);
      storage.saveData('delivery-permits', [...deliveryPermits, permitData]);
    }
    
    setShowPermitForm(null);
    setEditingPermit(null);
    setNewPermit({});
  };
  
  // تابع جدید برای انتقال اطلاعات به صفحه حواله انبار
  const handleTransferToWarehouse = (permitId: string) => {
    const permit = deliveryPermits.find(p => p.id === permitId);
    if (!permit) return;
    
    const receipt = receipts.find(r => r.id === permit.receiptId);
    if (!receipt) return;
    
    // ایجاد حواله امانی جدید با وضعیت پیش‌نویس
    const newDelivery = {
      id: `delivery_${Date.now()}`,
      transactionNumber: generateTransactionNumber('delivery', new Date()),
      userType: 'consignment',
      companyId: receipt.companyId,
      companyName: receipt.counterpartyName,
      productId: receipt.productId,
      productName: receipt.productName,
      siteId: receipt.siteId,
      siteName: receipt.siteName,
      tankId: receipt.tankId,
      tankName: receipt.tankName,
      amount: permit.finalPermitAmount,
      unit: receipt.unit,
      deliveryDate: new Date(),
      recipientType: 'first_party',
      notes: `حواله امانی ایجاد شده از مجوز شماره ${permit.managementLetterNumber}`,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      contractId: receipt.contractId // اضافه کردن شناسه قرارداد
    };
    
    // ذخیره حواله جدید
    const deliveries = storage.loadData('deliveries') || [];
    deliveries.push(newDelivery);
    storage.saveData('deliveries', deliveries);
    
    // به‌روزرسانی وضعیت مجوز
    const updatedPermits = deliveryPermits.map(p => 
      p.id === permitId ? { ...p, status: 'transferred', updatedAt: new Date() } : p
    );
    setDeliveryPermits(updatedPermits);
    storage.saveData('delivery-permits', updatedPermits);
    
    alert('حواله امانی با موفقیت به صفحه حواله انبار منتقل شد.');
  };
  
  // تابع جدید برای تایید مجوز
  const handleApprovePermit = (permitId: string) => {
    const permit = deliveryPermits.find(p => p.id === permitId);
    if (!permit) return;
    
    const receipt = receipts.find(r => r.id === permit.receiptId);
    if (!receipt) return;
    
    // Update permit status to 'issued'
    const updatedPermit = {
      ...permit,
      status: 'issued' as const,
      updatedAt: new Date()
    };
    
    const updatedPermits = deliveryPermits.map(p => 
      p.id === permitId ? updatedPermit : p
    );
    
    setDeliveryPermits(updatedPermits);
    storage.saveData('delivery-permits', updatedPermits);
    
    // ایجاد حواله امانی جدید با وضعیت پیش‌نویس
    // انتقال مقدار کامل "مقدار مجوز حواله" بدون هیچ کسری
    const newDelivery = {
      id: `delivery_${Date.now()}`,
      transactionNumber: generateTransactionNumber('delivery', new Date()),
      userType: 'consignment',
      companyId: receipt.companyId,
      companyName: receipt.counterpartyName,
      productId: receipt.productId,
      productName: receipt.productName,
      siteId: receipt.siteId,
      siteName: receipt.siteName,
      tankId: receipt.tankId,
      tankName: receipt.tankName,
      amount: permit.permitAmount, // انتقال مقدار کامل مجوز حواله بدون کسر افت
      unit: receipt.unit,
      deliveryDate: new Date(),
      recipientType: 'first_party',
      notes: `حواله امانی ایجاد شده از مجوز شماره ${permit.managementLetterNumber}`,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      contractId: receipt.contractId,
      contractNumber: receipt.contractNumber,
      permitId: permit.id,
      managementLetterNumber: permit.managementLetterNumber,
      fromPermit: true,
      // اضافه کردن فیلدهای جدید برای نمایش مقادیر مجوز
      permitAmount: permit.permitAmount,
      wastageAmount: permit.wastageAmount,
      finalPermitAmount: permit.finalPermitAmount,
      // فیلد جدید برای نشان دادن اینکه مقدار کامل منتقل شده است
      fullAmountTransferred: true
    };
    
    // ذخیره حواله جدید
    const deliveries = storage.loadData('deliveries') || [];
    deliveries.push(newDelivery);
    storage.saveData('deliveries', deliveries);
    
    alert('مجوز با موفقیت تایید شد و مقدار کامل مجوز حواله به صفحه حواله انبار منتقل گردید.');
  };
  
  // تابع جدید برای حذف مجوز
  const handleDeletePermit = (permitId: string) => {
    const permit = deliveryPermits.find(p => p.id === permitId);
    if (!permit) return;
    
    // دریافت تمام حواله‌های انبار
    const allDeliveries = storage.loadData('deliveries') || [];
    
    // بررسی حالت اول: حواله انبار باز یا ذخیره شده یا پیش نویس یا نهایی نداشته باشد و وضعیت آن "درخواست اصلاحیه" باشد
    const hasNoValidDelivery = !allDeliveries.some(d => 
      d.permitId === permitId && 
      (d.status === 'open' || d.status === 'saved' || d.status === 'draft' || d.status === 'finalized')
    );
    
    const deliveryInCorrectionStatus = allDeliveries.some(d => 
      d.permitId === permitId && 
      d.status === 'درخواست اصلاحیه'
    );
    
    // بررسی حالت دوم: هنوز سند "صدور مجوز حواله" برای آن تراکنش صادر نشده باشد
    const hasNoPermitDocument = !allDeliveries.some(d => 
      d.permitId === permitId && 
      d.documentType === 'صدور مجوز حواله'
    );
    
    // بررسی حالت سوم: در ستون "رخداد" تراکنش "درخواست اصلاحیه کاربر انبار" ثبت شده باشد
    const hasCorrectionEvent = permit.event === 'درخواست اصلاحیه کاربر انبار';
    
    // بررسی وضعیت "ابطال شده"
    const isCancelled = permit.status === 'ابطال شده';
    
    // اگر رکورد ابطال شده باشد، نباید در دیتابیس اثری داشته باشد
    if (isCancelled) {
      alert('این تراکنش قبلاً ابطال شده و در محاسبات تأثیری ندارد.');
      return;
    }
    
    // بررسی شرایط حذف
    if ((hasNoValidDelivery && deliveryInCorrectionStatus) || hasNoPermitDocument || hasCorrectionEvent) {
      if (window.confirm('آیا از حذف این مجوز اطمینان دارید؟')) {
        // حذف کامل مجوز از آرایه و دیتابیس
        const updatedPermits = deliveryPermits.filter(p => p.id !== permitId);
        setDeliveryPermits(updatedPermits);
        storage.saveData('delivery-permits', updatedPermits);
        
        // اگر رخداد "درخواست اصلاحیه کاربر انبار" بود، حواله امانی مرتبط را نیز حذف کن
        if (hasCorrectionEvent) {
          const updatedDeliveries = allDeliveries.filter(d => d.permitId !== permitId);
          storage.saveData('deliveries', updatedDeliveries);
          setDeliveries(updatedDeliveries);
        }
        
        alert('مجوز با موفقیت حذف شد.');
      }
    } else {
      alert('این مجوز قابل حذف نیست. فقط مجوزهای با شرایط زیر قابل حذف هستند:\n' +
            '1. حواله انبار باز یا ذخیره شده یا پیش نویس یا نهایی نداشته باشد و وضعیت آن "درخواست اصلاحیه" باشد\n' +
            '2. هنوز سند "صدور مجوز حواله" برای آن صادر نشده باشد\n' +
            '3. در ستون "رخداد" تراکنش "درخواست اصلاحیه کاربر انبار" ثبت شده باشد');
    }
  };
  
  // تابع جدید برای درخواست اصلاحیه
  const handleRequestCorrection = (permitId: string) => {
    const permit = deliveryPermits.find(p => p.id === permitId);
    if (!permit) return;
    
    const receipt = receipts.find(r => r.id === permit.receiptId);
    if (!receipt) return;
    
    // ایجاد درخواست اصلاحیه جدید
    const correctionRequest = {
      id: `correction_${Date.now()}`,
      permitId: permit.id,
      receiptId: receipt.id,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // ذخیره درخواست اصلاحیه
    const correctionRequests = storage.loadData('correction-requests') || [];
    correctionRequests.push(correctionRequest);
    storage.saveData('correction-requests', correctionRequests);
    
    alert('درخواست اصلاحیه با موفقیت ثبت شد.');
  };
  
  // تابع جدید برای درخواست ابطال مجوز
  const handleCancelPermit = (permitId: string) => {
    if (window.confirm('آیا از درخواست ابطال این مجوز اطمینان دارید؟')) {
      const updatedPermits = deliveryPermits.map(permit => {
        if (permit.id === permitId) {
          return {
            ...permit,
            status: 'cancelled',
            updatedAt: new Date()
          };
        }
        return permit;
      });
      
      setDeliveryPermits(updatedPermits);
      storage.saveData('delivery-permits', updatedPermits);
      
      // اضافه کردن به جدول "مجوزهای حواله صادر شده" با وضعیت ابطال شده
      const cancelledPermit = deliveryPermits.find(p => p.id === permitId);
      if (cancelledPermit) {
        const cancelledPermits = storage.loadData('cancelled-permits') || [];
        cancelledPermits.push({
          ...cancelledPermit,
          cancelledAt: new Date(),
          status: 'cancelled'
        });
        storage.saveData('cancelled-permits', cancelledPermits);
      }
      
      alert('درخواست ابطال مجوز با موفقیت ثبت شد. این تراکنش فقط جنبه نمایشی دارد.');
    }
  };
  
  // تابع جدید برای مدیریت درخواست اصلاحیه از صفحه حواله انبار
  const handleWarehouseCorrectionRequest = (deliveryId: string) => {
    // پیدا کردن حواله مورد نظر
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    
    // پیدا کردن مجوز مرتبط با این حواله
    const permit = deliveryPermits.find(p => 
      p.receiptId === delivery.receiptId && 
      p.finalPermitAmount === delivery.amount
    );
    
    if (!permit) {
      alert('مجوز مرتبط با این حواله یافت نشد.');
      return;
    }
    
    // به‌روزرسانی وضعیت مجوز به "پیش‌نویس"
    const updatedPermit = {
      ...permit,
      status: 'draft' as const,
      updatedAt: new Date(),
      event: 'درخواست اصلاحیه کاربر انبار'
    };
    
    const updatedPermits = deliveryPermits.map(p => 
      p.id === permit.id ? updatedPermit : p
    );
    
    setDeliveryPermits(updatedPermits);
    storage.saveData('delivery-permits', updatedPermits);
    
    alert('درخواست اصلاحیه با موفقیت ثبت شد و وضعیت مجوز به پیش‌نویس تغییر یافت.');
  };
  
  // تابع جدید برای چاپ مجوز
  const printPermit = (permit: DeliveryPermit) => {
    const receipt = receipts.find(r => r.id === permit.receiptId);
    if (!receipt) return;
    
    const contract = contracts.find(c => c.id === receipt.contractId);
    if (!contract) return;
    
    // دریافت تمام مجوزهای مربوط به این قرارداد
    const contractPermits = deliveryPermits.filter(p => 
      p.receiptId && receipts.find(r => r.id === p.receiptId && r.contractId === contract.id)
    );
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>مجوز حواله - ${permit.managementLetterNumber}</title>
        <style>
          @page { margin: 0.5cm; size: A4; }
          body { 
            font-family: 'Tahoma', 'B Nazanin', sans-serif; 
            direction: rtl; 
            text-align: right; 
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: white;
            font-size: 12px;
            color: #333;
          }
          .permit-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            border: 2px solid #059669;
            border-radius: 8px;
            padding: 15px;
            box-sizing: border-box;
          }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 15px;
            border-bottom: 2px solid #059669;
            margin-bottom: 15px;
          }
          .logo {
            max-height: 80px;
            max-width: 150px;
          }
          .company-info {
            text-align: center;
            flex-grow: 1;
          }
          .permit-title {
            font-size: 24px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 10px;
          }
          .details-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            border: 1px solid #ddd;
          }
          .details-table th { 
            background: #059669; 
            color: white; 
            padding: 10px; 
            font-weight: bold;
            text-align: center;
            border: 1px solid #ddd;
          }
          .details-table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: center;
          }
          .amount-row {
            background: #f0fdf4;
            font-weight: bold;
          }
          .total-section {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px dashed #ccc;
          }
          .signature-box {
            width: 18%;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #333;
            height: 1px;
            width: 80%;
            margin: 10px auto;
          }
          .permit-status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .status-draft {
            background-color: #f3f4f6;
            color: #4b5563;
          }
          .status-issued {
            background-color: #dbeafe;
            color: #1d4ed8;
          }
          .status-used {
            background-color: #d1fae5;
            color: #065f46;
          }
          .status-cancelled {
            background-color: #fee2e2;
            color: #b91c1c;
          }
        </style>
      </head>
      <body>
        <div class="permit-container">
          <div class="header">
            <img src="/لوگو صنعت غذایی کورش.jpg" alt="لوگو شرکت" class="logo" />
            <div class="company-info">
              <div class="permit-title">مجوز حواله انبار</div>
              <div>شرکت صنعت غذایی کورش</div>
            </div>
            <div class="permit-info">
              <div><strong>شماره سیستمی:</strong> ${permit.systemPermitNumber}</div>
              <div><strong>شماره مجوز:</strong> ${permit.managementLetterNumber}</div>
              <div><strong>تاریخ صدور:</strong> ${formatPersianDate(new Date())}</div>
              <div><strong>وضعیت:</strong> 
                <span class="permit-status ${
                  permit.status === 'draft' ? 'status-draft' : 
                  permit.status === 'issued' ? 'status-issued' : 
                  permit.status === 'used' ? 'status-used' : 'status-cancelled'
                }">
                  ${permit.status === 'draft' ? 'پیش‌نویس' : 
                    permit.status === 'issued' ? 'صادر شده' : 
                    permit.status === 'used' ? 'استفاده شده' : 'ابطال شده'}
                </span>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <strong>به:</strong> ${receipt.counterpartyName}<br>
            <strong>بابت:</strong> حواله کالای ${receipt.productName}<br>
            <strong>قرارداد:</strong> ${contract.contractNumber}<br>
            <strong>رسید انبار:</strong> ${receipt.transactionNumber}
          </div>
          
          <table class="details-table">
            <thead>
              <tr>
                <th>شرح</th>
                <th>مقدار</th>
                <th>واحد</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>مقدار مجوز حواله</td>
                <td>${formatPersianNumber(permit.permitAmount || 0)}</td>
                <td>${getContractUnit(receipt.contractId)}</td>
                <td>-</td>
              </tr>
              <tr>
                <td>مقدار افت مجوز</td>
                <td>${formatPersianNumber(permit.wastageAmount || 0)}</td>
                <td>${getContractUnit(receipt.contractId)}</td>
                <td>${contract?.wastageRateValue || 0.5}%</td>
              </tr>
              <tr>
                <td>مقدار مجوز بعد از کسر افت</td>
                <td class="amount-row">${formatPersianNumber(permit.finalPermitAmount || 0)}</td>
                <td>${getContractUnit(receipt.contractId)}</td>
                <td>-</td>
              </tr>
              <tr>
                <td>مانده مجوز حواله</td>
                <td>${formatPersianNumber(permit.remainingPermit || 0)}</td>
                <td>${getContractUnit(receipt.contractId)}</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 30px;">
            <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #059669;">سایر مجوزهای صادر شده برای این قرارداد:</h4>
            <table class="details-table">
              <thead>
                <tr>
                  <th>شماره مجوز</th>
                  <th>مقدار مجوز</th>
                  <th>مقدار افت</th>
                  <th>مقدار نهایی</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                ${contractPermits.map(p => `
                  <tr>
                    <td>${p.managementLetterNumber}</td>
                    <td>${formatPersianNumber(p.permitAmount || 0)}</td>
                    <td>${formatPersianNumber(p.wastageAmount || 0)}</td>
                    <td>${formatPersianNumber(p.finalPermitAmount || 0)}</td>
                    <td>
                      <span class="permit-status ${
                        p.status === 'draft' ? 'status-draft' : 
                        p.status === 'issued' ? 'status-issued' : 
                        p.status === 'used' ? 'status-used' : 'status-cancelled'
                      }">
                        ${p.status === 'draft' ? 'پیش‌نویس' : 
                          p.status === 'issued' ? 'صادر شده' : 
                          p.status === 'used' ? 'استفاده شده' : 'ابطال شده'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div>انبار دار</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>رئیس انبار</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>نماینده بازرگانی</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>نماینده مستاجر</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>نمایده گمرک</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Using a timeout to ensure content is loaded before printing
        setTimeout(() => {
          printWindow.print();
          // Close the window after printing
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
      }
    } catch (error) {
      console.error('Error printing permit:', error);
      alert('خطا در چاپ مجوز. لطفاً مجدداً تلاش کنید.');
    }
  };
  
  const printInvoice = (invoice: InvoiceData) => {
    const receipt = receipts.find(r => r.id === invoice.receiptId);
    if (!receipt) return;
    
    const contract = contracts.find(c => c.id === receipt.contractId);
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>فاکتور - ${invoice.transactionNumber}</title>
        <style>
          @page { margin: 0.5cm; size: A4; }
          body { 
            font-family: 'Tahoma', 'B Nazanin', sans-serif; 
            direction: rtl; 
            text-align: right; 
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: white;
            font-size: 12px;
            color: #333;
          }
          .invoice-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            border: 2px solid #059669;
            border-radius: 8px;
            padding: 15px;
            box-sizing: border-box;
          }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 15px;
            border-bottom: 2px solid #059669;
            margin-bottom: 15px;
          }
          .logo {
            max-height: 80px;
            max-width: 150px;
          }
          .company-info {
            text-align: center;
            flex-grow: 1;
          }
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 10px;
          }
          .details-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            border: 1px solid #ddd;
          }
          .details-table th { 
            background: #059669; 
            color: white; 
            padding: 10px; 
            font-weight: bold;
            text-align: center;
            border: 1px solid #ddd;
          }
          .details-table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: center;
          }
          .amount-row {
            background: #f0fdf4;
            font-weight: bold;
          }
          .total-section {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px dashed #ccc;
          }
          .signature-box {
            width: 30%;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #333;
            height: 1px;
            width: 80%;
            margin: 10px auto;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <img src="/لوگو صنعت غذایی کورش.jpg" alt="لوگو شرکت" class="logo" />
            <div class="company-info">
              <div class="invoice-title">فاکتور خدمات انبارداری</div>
              <div>شرکت صنعت غذایی کورش</div>
            </div>
            <div class="invoice-info">
              <div><strong>شماره فاکتور:</strong> ${invoice.transactionNumber}</div>
              <div><strong>تاریخ صدور:</strong> ${formatPersianDate(new Date())}</div>
              <div><strong>سال:</strong> ${getGregorianToPersianYearMonth(new Date(invoice.year, invoice.month - 1)).year}</div>
              <div><strong>ماه:</strong> ${getGregorianToPersianYearMonth(new Date(invoice.year, invoice.month - 1)).month}</div>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <strong>به:</strong> ${receipt.counterpartyName}<br>
            <strong>بابت:</strong> خدمات انبارداری کالای ${receipt.productName}<br>
            <strong>قرارداد:</strong> ${receipt.contractNumber}<br>
            <strong>رسید انبار:</strong> ${receipt.transactionNumber}
          </div>
          
          <table class="details-table">
            <thead>
              <tr>
                <th>شرح خدمات</th>
                <th>مقدار</th>
                <th>واحد</th>
                <th>نرخ واحد</th>
                <th>مبلغ (ریال)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>خدمات انبارداری ${receipt.productName}</td>
                <td>${formatPersianNumber(receipt.receiptBasisAmount || 0)}</td>
                <td>${receipt.unit === 'kg' ? 'کیلوگرم' : 'تن'}</td>
                <td>${formatPersianNumber(contract?.rentalRate || 0)}</td>
                <td class="amount-row">${formatPersianNumber(invoice.invoiceAmount)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="total-section">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>جمع کل:</strong></span>
              <span><strong>${formatPersianNumber(invoice.invoiceAmount)} ریال</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>مبلغ واریزی:</span>
              <span>${formatPersianNumber(invoice.paidAmount)} ریال</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: ${invoice.remainingDebt > 0 ? '#dc2626' : '#059669'};">
              <span><strong>مانده بدهی:</strong></span>
              <span><strong>${formatPersianNumber(invoice.remainingDebt)} ریال</strong></span>
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div>مدیر مالی</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>مدیر انبار</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
            <div class="signature-box">
              <div>مدیر عامل</div>
              <div class="signature-line"></div>
              <div>نام و امضا</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Using a timeout to ensure content is loaded before printing
        setTimeout(() => {
          printWindow.print();
          // Close the window after printing
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      alert('خطا در چاپ فاکتور. لطفاً مجدداً تلاش کنید.');
    }
  };
  
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const toggleColumnFilter = (columnKey: string) => {
    if (showColumnFilter === columnKey) {
      setShowColumnFilter(null);
    } else {
      setShowColumnFilter(columnKey);
    }
  };
  
  const handleColumnFilterChange = (columnKey: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
  };
  
  const clearColumnFilter = (columnKey: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[columnKey];
      return newFilters;
    });
  };
  
  const getSortedAndFilteredData = (data: any[], activeTab: 'uninvoiced' | 'invoiced' | 'permits') => {
    // Apply column filters
    let filteredData = data.filter(item => {
      return Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        
        // Get the actual value from the item based on the key
        let itemValue;
        if (activeTab === 'invoiced') {
          if (key === 'transactionNumber') itemValue = item.transactionNumber;
          else if (key === 'receiptNumber') itemValue = item.receipt?.transactionNumber;
          else if (key === 'counterpartyName') itemValue = item.receipt?.counterpartyName;
          else if (key === 'year') itemValue = item.year;
          else if (key === 'month') itemValue = item.month;
          else if (key === 'invoiceAmount') itemValue = item.invoiceAmount;
          else if (key === 'paidAmount') itemValue = item.paidAmount;
          else if (key === 'remainingDebt') itemValue = item.remainingDebt;
          else if (key === 'status') itemValue = item.isSettled ? 'تسویه ریالی' : 'بدهکار';
          else if (key === 'remainingContractWeight') itemValue = calculateRemainingContractWeight(item.receipt);
        } else if (activeTab === 'uninvoiced') {
          if (key === 'transactionNumber') itemValue = item.transactionNumber;
          else if (key === 'counterpartyName') itemValue = item.counterpartyName;
          else if (key === 'contractNumber') itemValue = item.contractNumber;
          else if (key === 'receiptBasisAmount') itemValue = item.receiptBasisAmount;
          else if (key === 'remainingContractWeight') itemValue = calculateRemainingContractWeight(item);
          else if (key === 'rentalRate') {
            const contract = contracts.find(c => c.id === item.contractId);
            itemValue = contract?.rentalRate || 0;
          } else if (key === 'contractAmount') {
            const contract = contracts.find(c => c.id === item.contractId);
            itemValue = (contract?.contractWeight || 0) * (contract?.rentalRate || 0);
          } else if (key === 'invoiceAmount') {
            const contract = contracts.find(c => c.id === item.contractId);
            const basis = invoiceBasis[item.id] || 'receiptBasis';
            const amount = basis === 'receiptBasis' 
              ? item.receiptBasisAmount 
              : calculateRemainingContractWeight(item);
            
            itemValue = amount * (contract?.rentalRate || 0);
          } else if (key === 'receiptDate') itemValue = formatPersianDate(item.receiptDate);
        } else if (activeTab === 'permits') {
          if (key === 'systemPermitNumber') itemValue = item.systemPermitNumber;
          else if (key === 'managementLetterNumber') itemValue = item.managementLetterNumber;
          else if (key === 'receiptNumber') itemValue = item.receipt?.transactionNumber;
          else if (key === 'counterpartyName') itemValue = item.receipt?.counterpartyName;
          else if (key === 'contractNumber') itemValue = item.receipt?.contractNumber;
          else if (key === 'permitAmount') itemValue = item.permitAmount;
          else if (key === 'wastageAmount') itemValue = item.wastageAmount;
          else if (key === 'finalPermitAmount') itemValue = item.finalPermitAmount;
          else if (key === 'remainingPermit') itemValue = item.remainingPermit;
          else if (key === 'remainingContractWeight') itemValue = calculateRemainingContractWeight(item.receipt);
          else if (key === 'status') {
            itemValue = item.status === 'used' ? 'استفاده شده' : 
                       item.status === 'issued' ? 'صادر شده' : 
                       item.status === 'cancelled' ? 'ابطال شده' : 'پیش‌نویس';
          }
        }
        
        // Convert to string for comparison
        const itemValueStr = String(itemValue || '').toLowerCase();
        const filterValue = value.toLowerCase();
        
        return itemValueStr.includes(filterValue);
      });
    });
    
    // Apply sorting
    if (sortConfig !== null) {
      filteredData = [...filteredData].sort((a, b) => {
        let aValue, bValue;
        
        if (activeTab === 'invoiced') {
          if (sortConfig.key === 'transactionNumber') {
            aValue = a.transactionNumber;
            bValue = b.transactionNumber;
          } else if (sortConfig.key === 'receiptNumber') {
            aValue = a.receipt?.transactionNumber;
            bValue = b.receipt?.transactionNumber;
          } else if (sortConfig.key === 'counterpartyName') {
            aValue = a.receipt?.counterpartyName;
            bValue = b.receipt?.counterpartyName;
          } else if (sortConfig.key === 'year') {
            aValue = a.year;
            bValue = b.year;
          } else if (sortConfig.key === 'month') {
            aValue = a.month;
            bValue = b.month;
          } else if (sortConfig.key === 'invoiceAmount') {
            aValue = a.invoiceAmount;
            bValue = b.invoiceAmount;
          } else if (sortConfig.key === 'paidAmount') {
            aValue = a.paidAmount;
            bValue = b.paidAmount;
          } else if (sortConfig.key === 'remainingDebt') {
            aValue = a.remainingDebt;
            bValue = b.remainingDebt;
          } else if (sortConfig.key === 'remainingContractWeight') {
            aValue = calculateRemainingContractWeight(a.receipt);
            bValue = calculateRemainingContractWeight(b.receipt);
          }
        } else if (activeTab === 'uninvoiced') {
          if (sortConfig.key === 'transactionNumber') {
            aValue = a.transactionNumber;
            bValue = b.transactionNumber;
          } else if (sortConfig.key === 'counterpartyName') {
            aValue = a.counterpartyName;
            bValue = b.counterpartyName;
          } else if (sortConfig.key === 'contractNumber') {
            aValue = a.contractNumber;
            bValue = b.contractNumber;
          } else if (sortConfig.key === 'receiptBasisAmount') {
            aValue = a.receiptBasisAmount;
            bValue = b.receiptBasisAmount;
          } else if (sortConfig.key === 'remainingContractWeight') {
            aValue = calculateRemainingContractWeight(a);
            bValue = calculateRemainingContractWeight(b);
          } else if (sortConfig.key === 'rentalRate') {
            const contractA = contracts.find(c => c.id === a.contractId);
            const contractB = contracts.find(c => c.id === b.contractId);
            aValue = contractA?.rentalRate || 0;
            bValue = contractB?.rentalRate || 0;
          } else if (sortConfig.key === 'contractAmount') {
            const contractA = contracts.find(c => c.id === a.contractId);
            const contractB = contracts.find(c => c.id === b.contractId);
            aValue = (contractA?.contractWeight || 0) * (contractA?.rentalRate || 0);
            bValue = (contractB?.contractWeight || 0) * (contractB?.rentalRate || 0);
          } else if (sortConfig.key === 'invoiceAmount') {
            const contractA = contracts.find(c => c.id === a.contractId);
            const contractB = contracts.find(c => c.id === b.contractId);
            const basisA = invoiceBasis[a.id] || 'receiptBasis';
            const basisB = invoiceBasis[b.id] || 'receiptBasis';
            const amountA = basisA === 'receiptBasis' 
              ? a.receiptBasisAmount 
              : calculateRemainingContractWeight(a);
            const amountB = basisB === 'receiptBasis' 
              ? b.receiptBasisAmount 
              : calculateRemainingContractWeight(b);
            
            aValue = amountA * (contractA?.rentalRate || 0);
            bValue = amountB * (contractB?.rentalRate || 0);
          }
        } else if (activeTab === 'permits') {
          if (sortConfig.key === 'systemPermitNumber') {
            aValue = a.systemPermitNumber;
            bValue = b.systemPermitNumber;
          } else if (sortConfig.key === 'managementLetterNumber') {
            aValue = a.managementLetterNumber;
            bValue = b.managementLetterNumber;
          } else if (sortConfig.key === 'receiptNumber') {
            aValue = a.receipt?.transactionNumber;
            bValue = b.receipt?.transactionNumber;
          } else if (sortConfig.key === 'counterpartyName') {
            aValue = a.receipt?.counterpartyName;
            bValue = b.receipt?.counterpartyName;
          } else if (sortConfig.key === 'contractNumber') {
            aValue = a.receipt?.contractNumber;
            bValue = b.receipt?.contractNumber;
          } else if (sortConfig.key === 'permitAmount') {
            aValue = a.permitAmount;
            bValue = b.permitAmount;
          } else if (sortConfig.key === 'wastageAmount') {
            aValue = a.wastageAmount;
            bValue = b.wastageAmount;
          } else if (sortConfig.key === 'finalPermitAmount') {
            aValue = a.finalPermitAmount;
            bValue = b.finalPermitAmount;
          } else if (sortConfig.key === 'remainingPermit') {
            aValue = a.remainingPermit;
            bValue = b.remainingPermit;
          } else if (sortConfig.key === 'remainingContractWeight') {
            aValue = calculateRemainingContractWeight(a.receipt);
            bValue = calculateRemainingContractWeight(b.receipt);
          }
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filteredData;
  };
  
  const calculateColumnSum = (data: any[], columnKey: string, activeTab: 'uninvoiced' | 'invoiced' | 'permits') => {
    return data.reduce((sum, item) => {
      let value = 0;
      
      if (activeTab === 'invoiced') {
        if (columnKey === 'invoiceAmount') value = item.invoiceAmount;
        else if (columnKey === 'paidAmount') value = item.paidAmount;
        else if (columnKey === 'remainingDebt') value = item.remainingDebt;
        else if (columnKey === 'remainingContractWeight') value = calculateRemainingContractWeight(item.receipt);
      } else if (activeTab === 'uninvoiced') {
        if (columnKey === 'receiptBasisAmount') value = item.receiptBasisAmount;
        else if (columnKey === 'remainingContractWeight') value = calculateRemainingContractWeight(item);
        else if (columnKey === 'rentalRate') {
          const contract = contracts.find(c => c.id === item.contractId);
          value = contract?.rentalRate || 0;
        } else if (columnKey === 'contractAmount') {
          const contract = contracts.find(c => c.id === item.contractId);
          value = (contract?.contractWeight || 0) * (contract?.rentalRate || 0);
        } else if (columnKey === 'invoiceAmount') {
          const contract = contracts.find(c => c.id === item.contractId);
          const basis = invoiceBasis[item.id] || 'receiptBasis';
          const amount = basis === 'receiptBasis' 
            ? item.receiptBasisAmount 
            : calculateRemainingContractWeight(item);
          
          value = amount * (contract?.rentalRate || 0);
        }
      } else if (activeTab === 'permits') {
        if (columnKey === 'permitAmount') value = item.permitAmount;
        else if (columnKey === 'wastageAmount') value = item.wastageAmount;
        else if (columnKey === 'finalPermitAmount') value = item.finalPermitAmount;
        else if (columnKey === 'remainingPermit') value = item.remainingPermit;
        else if (columnKey === 'remainingContractWeight') value = calculateRemainingContractWeight(item.receipt);
      }
      
      return sum + (value || 0);
    }, 0);
  };
  
  const getUninvoicedReceipts = () => {
    let filteredReceipts = receipts.filter(receipt => {
      if (receipt.userType !== 'consignment') return false;
      if (receipt.status === 'draft') return false;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        receipt.transactionNumber.toLowerCase().includes(searchLower) ||
        receipt.counterpartyName?.toLowerCase().includes(searchLower) ||
        receipt.contractNumber?.toLowerCase().includes(searchLower) ||
        receipt.productName.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
    
    // Apply sorting and column filtering
    return getSortedAndFilteredData(filteredReceipts, 'uninvoiced');
  };
  
  const getInvoicedReceipts = () => {
    let invoicedReceipts = invoices.map(invoice => {
      const receipt = receipts.find(r => r.id === invoice.receiptId);
      const contract = contracts.find(c => c.id === receipt?.contractId);
      
      return {
        ...invoice,
        receipt,
        contract,
        isSettled: invoice.remainingDebt === 0
      };
    }).filter(item => {
      if (!item.receipt) return false;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        item.receipt.transactionNumber.toLowerCase().includes(searchLower) ||
        item.receipt.counterpartyName?.toLowerCase().includes(searchLower) ||
        item.receipt.contractNumber?.toLowerCase().includes(searchLower) ||
        item.transactionNumber.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
    
    // Apply sorting and column filtering
    return getSortedAndFilteredData(invoicedReceipts, 'invoiced');
  };
  
  const getDeliveryPermitsData = () => {
    let permitsData = deliveryPermits.map(permit => {
      const receipt = receipts.find(r => r.id === permit.receiptId);
      const contract = contracts.find(c => c.id === receipt?.contractId);
      
      return {
        ...permit,
        receipt,
        contract
      };
    }).filter(item => {
      if (!item.receipt) return false;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        item.receipt.transactionNumber.toLowerCase().includes(searchLower) ||
        item.receipt.counterpartyName?.toLowerCase().includes(searchLower) ||
        permit.managementLetterNumber.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
    
    // Apply sorting and column filtering
    return getSortedAndFilteredData(permitsData, 'permits');
  };
  
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">حسابداری و صدور فاکتور</h1>
            <p className="text-gray-600">مدیریت فاکتورها، تسویه حساب و مجوزهای حواله</p>
          </div>
          <div className="flex items-center">
            <img 
              src="/لوگو صنعت غذایی کورش.jpg" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('uninvoiced')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'uninvoiced'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                رسید انبارهای فاکتور نشده
                <span className="mr-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {getUninvoicedReceipts().length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('invoiced')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invoiced'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                رسید انبارهای فاکتور شده
                <span className="mr-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {getInvoicedReceipts().length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('permits')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'permits'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                مجوزهای حواله صادر شده
                <span className="mr-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {getDeliveryPermitsData().length}
                </span>
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="جستجو در اطلاعات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Tab Content */}
            {activeTab === 'uninvoiced' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">رسید انبارهای فاکتور نشده</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">عملیات</th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('transactionNumber')}
                        >
                          <div className="flex items-center justify-between">
                            <span>شماره رسید</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'transactionNumber' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'transactionNumber' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('transactionNumber');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'transactionNumber' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر شماره رسید..."
                                value={columnFilters['transactionNumber'] || ''}
                                onChange={(e) => handleColumnFilterChange('transactionNumber', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('transactionNumber')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('counterpartyName')}
                        >
                          <div className="flex items-center justify-between">
                            <span>طرف حساب</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'counterpartyName' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'counterpartyName' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('counterpartyName');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'counterpartyName' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر طرف حساب..."
                                value={columnFilters['counterpartyName'] || ''}
                                onChange={(e) => handleColumnFilterChange('counterpartyName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('counterpartyName')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('contractNumber')}
                        >
                          <div className="flex items-center justify-between">
                            <span>شماره قرارداد</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'contractNumber' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'contractNumber' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('contractNumber');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'contractNumber' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر شماره قرارداد..."
                                value={columnFilters['contractNumber'] || ''}
                                onChange={(e) => handleColumnFilterChange('contractNumber', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('contractNumber')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('receiptBasisAmount')}
                        >
                          <div className="flex items-center justify-between">
                            <span>مقدار مبنای رسید</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'receiptBasisAmount' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'receiptBasisAmount' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('receiptBasisAmount');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'receiptBasisAmount' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر مقدار مبنای رسید..."
                                value={columnFilters['receiptBasisAmount'] || ''}
                                onChange={(e) => handleColumnFilterChange('receiptBasisAmount', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('receiptBasisAmount')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('remainingContractWeight')}
                        >
                          <div className="flex items-center justify-between">
                            <span>وزن مانده قرارداد</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'remainingContractWeight' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'remainingContractWeight' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('remainingContractWeight');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'remainingContractWeight' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر وزن مانده قرارداد..."
                                value={columnFilters['remainingContractWeight'] || ''}
                                onChange={(e) => handleColumnFilterChange('remainingContractWeight', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('remainingContractWeight')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('rentalRate')}
                        >
                          <div className="flex items-center justify-between">
                            <span>نرخ قرارداد</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'rentalRate' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'rentalRate' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('rentalRate');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'rentalRate' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر نرخ قرارداد..."
                                value={columnFilters['rentalRate'] || ''}
                                onChange={(e) => handleColumnFilterChange('rentalRate', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('rentalRate')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('contractAmount')}
                        >
                          <div className="flex items-center justify-between">
                            <span>مبلغ قرارداد</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'contractAmount' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'contractAmount' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('contractAmount');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'contractAmount' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر مبلغ قرارداد..."
                                value={columnFilters['contractAmount'] || ''}
                                onChange={(e) => handleColumnFilterChange('contractAmount', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('contractAmount')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('invoiceAmount')}
                        >
                          <div className="flex items-center justify-between">
                            <span>مبلغ فاکتور</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'invoiceAmount' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'invoiceAmount' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('invoiceAmount');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'invoiceAmount' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر مبلغ فاکتور..."
                                value={columnFilters['invoiceAmount'] || ''}
                                onChange={(e) => handleColumnFilterChange('invoiceAmount', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('invoiceAmount')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('receiptDate')}
                        >
                          <div className="flex items-center justify-between">
                            <span>تاریخ رسید</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'receiptDate' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'receiptDate' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('receiptDate');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'receiptDate' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر تاریخ رسید..."
                                value={columnFilters['receiptDate'] || ''}
                                onChange={(e) => handleColumnFilterChange('receiptDate', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('receiptDate')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">مبنای محاسبه فاکتور</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">موجودی مخزن</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">وزن قرارداد</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">مانده قرارداد</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getUninvoicedReceipts().map((receipt, index) => {
                        const contract = contracts.find(c => c.id === receipt.contractId);
                        const contractAmount = (contract?.contractWeight || 0) * (contract?.rentalRate || 0);
                        const remainingContractWeight = calculateRemainingContractWeight(receipt);
                        const basis = invoiceBasis[receipt.id] || 'receiptBasis';
                        const amount = basis === 'receiptBasis' 
                          ? receipt.receiptBasisAmount 
                          : remainingContractWeight;
                        
                        const invoiceAmount = amount * (contract?.rentalRate || 0);
                        
                        return (
                          <tr key={receipt.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleIssueInvoice(receipt.id)}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                صدور فاکتور
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{receipt.transactionNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{receipt.counterpartyName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{receipt.contractNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(receipt.receiptBasisAmount || 0)} {getContractUnit(receipt.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(remainingContractWeight)} {getContractUnit(receipt.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatPersianNumber(contract?.rentalRate || 0)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatPersianNumber(contractAmount)}</td>
                            <td className="px-4 py-3 text-sm font-bold text-green-600">{formatPersianNumber(invoiceAmount)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatPersianDate(receipt.receiptDate)}</td>
                            <td className="px-4 py-3">
                              <select
                                value={basis}
                                onChange={(e) => setInvoiceBasis(prev => ({ ...prev, [receipt.id]: e.target.value as 'receiptBasis' | 'remainingContractWeight' }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="receiptBasis">مقدار مبناي رسيد</option>
                                <option value="remainingContractWeight">وزن مانده قرارداد</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(getTankInventory(receipt.tankId || ''))} {getContractUnit(receipt.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(contract?.contractWeight || 0)} {getContractUnit(receipt.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(remainingContractWeight)} {getContractUnit(receipt.contractId)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-900">جمع کل:</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getUninvoicedReceipts(), 'receiptBasisAmount', 'uninvoiced'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getUninvoicedReceipts(), 'remainingContractWeight', 'uninvoiced'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getUninvoicedReceipts(), 'rentalRate', 'uninvoiced'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getUninvoicedReceipts(), 'contractAmount', 'uninvoiced'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getUninvoicedReceipts(), 'invoiceAmount', 'uninvoiced'))}
                        </td>
                        <td colSpan={5}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                {/* Charts section for uninvoiced receipts */}
                <ChartsSection 
                  activeTab={activeTab}
                  uninvoicedReceipts={getUninvoicedReceipts()}
                  invoicedReceipts={getInvoicedReceipts()}
                  deliveryPermitsData={getDeliveryPermitsData()}
                />
              </div>
            )}
            
            {activeTab === 'invoiced' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">رسید انبارهای فاکتور شده</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">عملیات</th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('transactionNumber')}
                        >
                          <div className="flex items-center justify-between">
                            <span>شماره فاکتور</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'transactionNumber' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'transactionNumber' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('transactionNumber');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'transactionNumber' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر شماره فاکتور..."
                                value={columnFilters['transactionNumber'] || ''}
                                onChange={(e) => handleColumnFilterChange('transactionNumber', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('transactionNumber')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('receiptNumber')}
                        >
                          <div className="flex items-center justify-between">
                            <span>شماره رسید</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'receiptNumber' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'receiptNumber' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('receiptNumber');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'receiptNumber' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر شماره رسید..."
                                value={columnFilters['receiptNumber'] || ''}
                                onChange={(e) => handleColumnFilterChange('receiptNumber', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('receiptNumber')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('contractNumber')}
                        >
                          <div className="flex items-center justify-between">
                            <span>شماره قرارداد</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'contractNumber' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'contractNumber' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('contractNumber');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'contractNumber' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر شماره قرارداد..."
                                value={columnFilters['contractNumber'] || ''}
                                onChange={(e) => handleColumnFilterChange('contractNumber', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('contractNumber')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('counterpartyName')}
                        >
                          <div className="flex items-center justify-between">
                            <span>طرف حساب</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'counterpartyName' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'counterpartyName' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('counterpartyName');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'counterpartyName' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر طرف حساب..."
                                value={columnFilters['counterpartyName'] || ''}
                                onChange={(e) => handleColumnFilterChange('counterpartyName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('counterpartyName')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('year')}
                        >
                          <div className="flex items-center justify-between">
                            <span>سال</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'year' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'year' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('year');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'year' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر سال..."
                                value={columnFilters['year'] || ''}
                                onChange={(e) => handleColumnFilterChange('year', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('year')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('month')}
                        >
                          <div className="flex items-center justify-between">
                            <span>ماه</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'month' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'month' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('month');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'month' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر ماه..."
                                value={columnFilters['month'] || ''}
                                onChange={(e) => handleColumnFilterChange('month', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('month')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('invoiceAmount')}
                        >
                          <div className="flex items-center justify-between">
                            <span>مبلغ فاکتور</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'invoiceAmount' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'invoiceAmount' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('invoiceAmount');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'invoiceAmount' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر مبلغ فاکتور..."
                                value={columnFilters['invoiceAmount'] || ''}
                                onChange={(e) => handleColumnFilterChange('invoiceAmount', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('invoiceAmount')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('paidAmount')}
                        >
                          <div className="flex items-center justify-between">
                            <span>مبلغ واریز</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'paidAmount' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'paidAmount' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('paidAmount');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'paidAmount' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر مبلغ واریز..."
                                value={columnFilters['paidAmount'] || ''}
                                onChange={(e) => handleColumnFilterChange('paidAmount', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('paidAmount')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('remainingDebt')}
                        >
                          <div className="flex items-center justify-between">
                            <span>مانده بدهی</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'remainingDebt' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'remainingDebt' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('remainingDebt');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'remainingDebt' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر مانده بدهی..."
                                value={columnFilters['remainingDebt'] || ''}
                                onChange={(e) => handleColumnFilterChange('remainingDebt', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('remainingDebt')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center justify-between">
                            <span>وضعیت</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'status' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'status' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('status');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'status' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر وضعیت..."
                                value={columnFilters['status'] || ''}
                                onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('status')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">تاریخ واریز</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">نوع فاکتور</th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('remainingContractWeight')}
                        >
                          <div className="flex items-center justify-between">
                            <span>وزن مانده قرارداد</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'remainingContractWeight' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'remainingContractWeight' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('remainingContractWeight');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'remainingContractWeight' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر وزن مانده قرارداد..."
                                value={columnFilters['remainingContractWeight'] || ''}
                                onChange={(e) => handleColumnFilterChange('remainingContractWeight', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('remainingContractWeight')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">موجودی مخزن</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">وزن قرارداد</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">مانده قرارداد</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getInvoicedReceipts().map((item, index) => {
                        const persianYearMonth = getGregorianToPersianYearMonth(new Date(item.year, item.month - 1));
                        const remainingContractWeight = calculateRemainingContractWeight(item.receipt);
                        
                        return (
                          <tr key={item.id} className={`hover:bg-gray-50 ${
                            item.isSettled ? 'bg-green-50' : item.remainingDebt > 0 ? 'bg-yellow-50' : 'bg-white'
                          }`} style={{ height: '80px' }}>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => printInvoice(item)}
                                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                                >
                                  پرینت فاکتور
                                </button>
                                {item.isSettled && (
                                  <button
                                    onClick={() => handleIssueDeliveryPermit(item.receiptId)}
                                    className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                                  >
                                    صدور مجوز حواله
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteInvoice(item.id)}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                                >
                                  حذف فاکتور
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.transactionNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.receipt?.transactionNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.receipt?.contractNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.receipt?.counterpartyName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{persianYearMonth.year}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{persianYearMonth.month}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatPersianNumber(item.invoiceAmount)}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.paidAmount}
                                onChange={(e) => {
                                  const paidAmount = parseFloat(e.target.value) || 0;
                                  
                                  // Check if paid amount exceeds invoice amount
                                  if (paidAmount > item.invoiceAmount) {
                                    alert('مبلغ واریز نمی‌تواند بیشتر از مبلغ فاکتور باشد.');
                                    return;
                                  }
                                  
                                  const remainingDebt = item.invoiceAmount - paidAmount;
                                  
                                  const updatedInvoices = invoices.map(inv => 
                                    inv.id === item.id 
                                      ? { ...inv, paidAmount, remainingDebt, updatedAt: new Date() }
                                      : inv
                                  );
                                  
                                  setInvoices(updatedInvoices);
                                  storage.saveData('invoices', updatedInvoices);
                                }}
                                className="px-3 py-2 border-2 border-blue-300 rounded text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                style={{ 
                                  width: '100%', 
                                  minWidth: '120px',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  resize: 'horizontal'
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-bold">
                              <span className={item.remainingDebt > 0 ? 'text-red-600' : 'text-green-600'}>
                                {formatPersianNumber(item.remainingDebt)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                item.isSettled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.isSettled ? 'تسویه ریالی' : 'بدهکار'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <FieldWithTooltip
                                label="تاریخ واریز"
                                formula="تاریخ واریز وجه توسط طرف حساب"
                              >
                                <PersianDateField
                                  value={item.paymentDate}
                                  onChange={(date) => {
                                    const updatedInvoices = invoices.map(inv => 
                                      inv.id === item.id 
                                        ? { ...inv, paymentDate: date, updatedAt: new Date() }
                                        : inv
                                    );
                                    
                                    setInvoices(updatedInvoices);
                                    storage.saveData('invoices', updatedInvoices);
                                  }}
                                  placeholder="تاریخ واریز را انتخاب کنید"
                                  className="w-full"
                                />
                              </FieldWithTooltip>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                item.invoiceType === 'automatic' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {item.invoiceType === 'automatic' ? 'فاکتور اتومات' : 'فاکتور دستی'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(remainingContractWeight)} {getContractUnit(item.receipt?.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(getTankInventory(item.receipt?.tankId || ''))} {getContractUnit(item.receipt?.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(item.receipt?.contractWeight || 0)} {getContractUnit(item.receipt?.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(remainingContractWeight)} {getContractUnit(item.receipt?.contractId)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={7} className="px-4 py-3 text-sm font-medium text-gray-900">جمع کل:</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getInvoicedReceipts(), 'invoiceAmount', 'invoiced'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getInvoicedReceipts(), 'paidAmount', 'invoiced'))}
                        </td>
                        <td></td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getInvoicedReceipts(), 'remainingDebt', 'invoiced'))}
                        </td>
                        <td colSpan={5}></td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getInvoicedReceipts(), 'remainingContractWeight', 'invoiced'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getInvoicedReceipts(), 'contractWeight', 'invoiced'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getInvoicedReceipts(), 'remainingContractWeight', 'invoiced'))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                {/* Charts section for invoiced receipts */}
                <ChartsSection 
                  activeTab={activeTab}
                  uninvoicedReceipts={getUninvoicedReceipts()}
                  invoicedReceipts={getInvoicedReceipts()}
                  deliveryPermitsData={getDeliveryPermitsData()}
                />
              </div>
            )}
            
            {activeTab === 'permits' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">مجوزهای حواله صادر شده</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">عملیات</th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('systemPermitNumber')}
                        >
                          <div className="flex items-center justify-between">
                            <span>شماره مجوز</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'systemPermitNumber' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'systemPermitNumber' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('systemPermitNumber');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'systemPermitNumber' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر شماره مجوز..."
                                value={columnFilters['systemPermitNumber'] || ''}
                                onChange={(e) => handleColumnFilterChange('systemPermitNumber', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('systemPermitNumber')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('managementLetterNumber')}
                        >
                          <div className="flex items-center justify-between">
                            <span>شماره نامه مدیریت</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'managementLetterNumber' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'managementLetterNumber' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('managementLetterNumber');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'managementLetterNumber' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر شماره نامه مدیریت..."
                                value={columnFilters['managementLetterNumber'] || ''}
                                onChange={(e) => handleColumnFilterChange('managementLetterNumber', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('managementLetterNumber')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('receiptNumber')}
                        >
                          <div className="flex items-center justify-between">
                            <span>شماره رسید</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'receiptNumber' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'receiptNumber' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('receiptNumber');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'receiptNumber' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر شماره رسید..."
                                value={columnFilters['receiptNumber'] || ''}
                                onChange={(e) => handleColumnFilterChange('receiptNumber', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('receiptNumber')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('contractNumber')}
                        >
                          <div className="flex items-center justify-between">
                            <span>شماره قرارداد</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'contractNumber' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'contractNumber' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('contractNumber');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'contractNumber' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر شماره قرارداد..."
                                value={columnFilters['contractNumber'] || ''}
                                onChange={(e) => handleColumnFilterChange('contractNumber', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('contractNumber')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('counterpartyName')}
                        >
                          <div className="flex items-center justify-between">
                            <span>طرف حساب</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'counterpartyName' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'counterpartyName' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('counterpartyName');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'counterpartyName' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر طرف حساب..."
                                value={columnFilters['counterpartyName'] || ''}
                                onChange={(e) => handleColumnFilterChange('counterpartyName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('counterpartyName')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('permitAmount')}
                        >
                          <div className="flex items-center justify-between">
                            <span>مقدار مجوز حواله</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'permitAmount' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'permitAmount' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('permitAmount');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'permitAmount' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر مقدار مجوز حواله..."
                                value={columnFilters['permitAmount'] || ''}
                                onChange={(e) => handleColumnFilterChange('permitAmount', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('permitAmount')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('wastageAmount')}
                        >
                          <div className="flex items-center justify-between">
                            <span>مقدار افت مجوز</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'wastageAmount' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'wastageAmount' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('wastageAmount');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'wastageAmount' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر مقدار افت مجوز..."
                                value={columnFilters['wastageAmount'] || ''}
                                onChange={(e) => handleColumnFilterChange('wastageAmount', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('wastageAmount')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('finalPermitAmount')}
                        >
                          <div className="flex items-center justify-between">
                            <span>مقدار مجوز بعد از کسر افت</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'finalPermitAmount' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'finalPermitAmount' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('finalPermitAmount');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'finalPermitAmount' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر مقدار مجوز بعد از کسر افت..."
                                value={columnFilters['finalPermitAmount'] || ''}
                                onChange={(e) => handleColumnFilterChange('finalPermitAmount', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('finalPermitAmount')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('remainingPermit')}
                        >
                          <div className="flex items-center justify-between">
                            <span>مانده مجوز حواله</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'remainingPermit' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'remainingPermit' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('remainingPermit');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'remainingPermit' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر مانده مجوز حواله..."
                                value={columnFilters['remainingPermit'] || ''}
                                onChange={(e) => handleColumnFilterChange('remainingPermit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('remainingPermit')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('remainingContractWeight')}
                        >
                          <div className="flex items-center justify-between">
                            <span>وزن مانده قرارداد</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'remainingContractWeight' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'remainingContractWeight' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('remainingContractWeight');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'remainingContractWeight' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر وزن مانده قرارداد..."
                                value={columnFilters['remainingContractWeight'] || ''}
                                onChange={(e) => handleColumnFilterChange('remainingContractWeight', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('remainingContractWeight')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th 
                          className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32 cursor-pointer hover:bg-gray-100 relative"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center justify-between">
                            <span>وضعیت</span>
                            <div className="flex flex-col">
                              {sortConfig?.key === 'status' && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                              {sortConfig?.key === 'status' && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                            </div>
                          </div>
                          <button 
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnFilter('status');
                            }}
                          >
                            <Filter size={14} />
                          </button>
                          {showColumnFilter === 'status' && (
                            <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                              <input
                                type="text"
                                placeholder="فیلتر وضعیت..."
                                value={columnFilters['status'] || ''}
                                onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => clearColumnFilter('status')}
                              >
                                پاک کردن فیلتر
                              </button>
                            </div>
                          )}
                        </th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">رخداد</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">موجودی مخزن</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">وزن قرارداد</th>
                        <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">مانده قرارداد</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getDeliveryPermitsData().map((item, index) => {
                        // بررسی وجود درخواست اصلاحیه
                        const storage = DataStorage.getInstance();
                        const correctionRequests = storage.loadData('correction-requests') || [];
                        const hasCorrectionRequest = correctionRequests.some(req => 
                          req.permitId === item.id && req.status === 'pending'
                        );
                        
                        return (
                          <tr key={item.id} className={`hover:bg-gray-50 ${
                            item.status === 'used' ? 'bg-green-100' : 
                            item.status === 'issued' ? 'bg-green-500' : // تغییر رنگ به سبز تیره‌تر برای تأکید
                            item.status === 'cancelled' ? 'bg-red-100' : 'bg-yellow-100'
                          }`}>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {(item.status === 'draft' || item.status === 'issued') && (
                                  <button
                                    onClick={() => {
                                      setEditingPermit(item.id);
                                      setNewPermit({...item, status: 'draft'});
                                      setShowPermitForm(item.receiptId);
                                    }}
                                    className={`px-2 py-1 rounded text-xs transition-colors ${
                                      item.status === 'draft' || item.status === 'issued'
                                        ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                    disabled={item.status !== 'draft' && item.status !== 'issued'}
                                  >
                                    ویرایش مجوز
                                  </button>
                                )}
                                {/* دکمه تایید مجوز و انتقال به حواله انبار */}
                                {item.status !== 'used' && item.status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleApprovePermit(item.id)}
                                    className={`px-2 py-1 rounded text-xs transition-colors ${
                                      item.status === 'draft' 
                                        ? 'bg-green-600 text-white hover:bg-green-700' 
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                    disabled={item.status !== 'draft'}
                                  >
                                    تایید مجوز و انتقال به حواله انبار
                                  </button>
                                )}
                                {/* دکمه پرینت مجوز */}
                                {item.status !== 'draft' && (
                                  <button
                                    onClick={() => printPermit(item)}
                                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                                  >
                                    پرینت مجوز
                                  </button>
                                )}
                                {/* دکمه درخواست ابطال مجوز */}
                                {item.status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleCancelPermit(item.id)}
                                    className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                                  >
                                    درخواست ابطال مجوز
                                  </button>
                                )}
                                {/* دکمه حذف مجوز به رنگ قرمز */}
                                <button
                                  onClick={() => handleDeletePermit(item.id)}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                                >
                                  حذف مجوز
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-sm text-gray-900 truncate" title={item.systemPermitNumber}>{item.systemPermitNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.managementLetterNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.receipt?.transactionNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.receipt?.contractNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.receipt?.counterpartyName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(item.permitAmount)} {getContractUnit(item.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-red-600">
                              {formatPersianNumber(item.wastageAmount)} {getContractUnit(item.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-green-600">
                              {formatPersianNumber(item.finalPermitAmount)} {getContractUnit(item.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(item.remainingPermit)} {getContractUnit(item.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(calculateRemainingContractWeight(item.receipt))} {getContractUnit(item.contractId)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                item.status === 'used' ? 'bg-green-100 text-green-800' : 
                                item.status === 'issued' ? 'bg-blue-100 text-blue-800' : 
                                item.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.status === 'used' ? 'استفاده شده' : 
                                 item.status === 'issued' ? 'صادر شده' : 
                                 item.status === 'cancelled' ? 'ابطال شده' : 'پیش‌نویس'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {hasCorrectionRequest && (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                  درخواست اصلاحیه کاربر انبار
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(getTankInventory(item.receipt?.tankId || ''))} {getContractUnit(item.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(item.contract?.contractWeight || 0)} {getContractUnit(item.contractId)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatPersianNumber(calculateRemainingContractWeight(item.receipt))} {getContractUnit(item.contractId)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-sm font-medium text-gray-900">جمع کل:</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getDeliveryPermitsData(), 'permitAmount', 'permits'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getDeliveryPermitsData(), 'wastageAmount', 'permits'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getDeliveryPermitsData(), 'finalPermitAmount', 'permits'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getDeliveryPermitsData(), 'remainingPermit', 'permits'))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatPersianNumber(calculateColumnSum(getDeliveryPermitsData(), 'remainingContractWeight', 'permits'))}
                        </td>
                        <td colSpan={6}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                    {/* Charts section for delivery permits */}
                    <ChartsSection 
                      activeTab={activeTab}
                      uninvoicedReceipts={getUninvoicedReceipts()}
                      invoicedReceipts={getInvoicedReceipts()}
                      deliveryPermitsData={getDeliveryPermitsData()}
                    />
                  </div>
                )}
            </div>
          </div>
        
        {/* Invoice Form Modal */}
        {showInvoiceForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">صدور فاکتور</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <FieldWithTooltip
                    label="سال شمسی"
                    formula="سال شمسی برای صدور فاکتور"
                  >
                    <select
                      value={getGregorianToPersianYearMonth(new Date(newInvoice.year || new Date().getFullYear(), 0)).year}
                      onChange={(e) => {
                        const persianYear = parseInt(e.target.value);
                        // Convert Persian year to Gregorian for storage
                        const gregorianYear = persianYear - 621; // Simple conversion, may need adjustment
                        setNewInvoice({ ...newInvoice, year: gregorianYear });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {Array.from({ length: 30 }, (_, i) => {
                        const currentYear = new Date().getFullYear();
                        const persianYear = getGregorianToPersianYearMonth(new Date(currentYear + i, 0)).year;
                        return (
                          <option key={persianYear} value={persianYear}>{persianYear}</option>
                        );
                      })}
                    </select>
                  </FieldWithTooltip>
                </div>
                <div>
                  <FieldWithTooltip
                    label="ماه شمسی"
                    formula="ماه شمسی برای صدور فاکتور"
                  >
                    <select
                      value={newInvoice.month || new Date().getMonth() + 1}
                      onChange={(e) => setNewInvoice({ ...newInvoice, month: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 
                            'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][i]}
                        </option>
                      ))}
                    </select>
                  </FieldWithTooltip>
                </div>
                
                <div>
                  <FieldWithTooltip
                    label="مبلغ فاکتور"
                    formula="مبلغ فاکتور = مقدار مبنای محاسبه × نرخ قرارداد"
                  >
                    <input
                      type="number"
                      value={newInvoice.invoiceAmount || 0}
                      onChange={(e) => setNewInvoice({ ...newInvoice, invoiceAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </FieldWithTooltip>
                </div>
                
                <div>
                  <FieldWithTooltip
                    label="مبلغ واریز طرف حساب"
                    formula="مبلغ واریزی توسط طرف حساب"
                  >
                    <input
                      type="number"
                      value={newInvoice.paidAmount || 0}
                      onChange={(e) => {
                        const paidAmount = parseFloat(e.target.value) || 0;
                        const remainingDebt = (newInvoice.invoiceAmount || 0) - paidAmount;
                        setNewInvoice({ ...newInvoice, paidAmount, remainingDebt });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </FieldWithTooltip>
                </div>
                
                <div>
                  <FieldWithTooltip
                    label="مبلغ بدهی باقیمانده"
                    formula="مانده بدهی = مبلغ فاکتور - مبلغ واریزی"
                  >
                    <input
                      type="number"
                      value={newInvoice.remainingDebt || 0}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </FieldWithTooltip>
                </div>
                
                <div>
                  <FieldWithTooltip
                    label="تاریخ واریز"
                    formula="تاریخ واریز وجه توسط طرف حساب"
                  >
                    <SimplePersianDateField
                      value={newInvoice.paymentDate}
                      onChange={(date) => setNewInvoice({ ...newInvoice, paymentDate: date })}
                      placeholder="تاریخ واریز را انتخاب کنید"
                      className="w-full"
                    />
                  </FieldWithTooltip>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowInvoiceForm(null);
                    setEditingInvoice(null);
                    setNewInvoice({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  انصراف
                </button>
                <button
                  onClick={handleSaveInvoice}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  ذخیره فاکتور
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Delivery Permit Form Modal */}
        {showPermitForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">صدور مجوز حواله</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="md:col-span-2">
                  <FieldWithTooltip
                    label="شماره سیستمی"
                    formula="شماره منحصر به فرد سیستم برای مجوز"
                  >
                    <input
                      type="text"
                      value={newPermit.systemPermitNumber || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </FieldWithTooltip>
                </div>
                
                <div className="md:col-span-2">
                  <FieldWithTooltip
                    label="شماره نامه مدیریت"
                    formula="شماره نامه مدیریت برای مجوز"
                  >
                    <input
                      type="text"
                      value={newPermit.managementLetterNumber || ''}
                      onChange={(e) => setNewPermit({ ...newPermit, managementLetterNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="شماره نامه مدیریت"
                    />
                    {!isManagementLetterNumberUnique(newPermit.managementLetterNumber || '', deliveryPermits, editingPermit) && (
                      <div className="mt-1 text-xs text-red-600">این شماره نامه مدیریت قبلاً استفاده شده است.</div>
                    )}
                  </FieldWithTooltip>
                </div>
                
                <div>
                  <FieldWithTooltip
                    label="مقدار مجوز حواله"
                    formula="مقدار مجوز حواله = مقدار قابل مجوز بر اساس مانده قرارداد"
                  >
                    <input
                      type="number"
                      value={newPermit.permitAmount || 0}
                      onChange={(e) => {
                        const permitAmount = parseFloat(e.target.value) || 0;
                        const receipt = receipts.find(r => r.id === newPermit.receiptId);
                        const contract = contracts.find(c => c.id === receipt?.contractId);
                        // استفاده از درصد افت ثبت شده در قرارداد به جای مقدار پیش فرض 0.5
                        const wastagePercentage = contract?.wastageRateValue || 0.5;
                        
                        const wastageAmount = permitAmount * (wastagePercentage / 100);
                        const finalPermitAmount = permitAmount - wastageAmount;
                        
                        // Check limit
                        const existingPermits = deliveryPermits.filter(p => p.receiptId === newPermit.receiptId && p.id !== editingPermit);
                        const totalPermitted = existingPermits.reduce((sum, p) => sum + p.permitAmount, 0);
                        const availableAmount = (receipt?.consignmentRemainder || 0) - totalPermitted;
                        
                        if (permitAmount > availableAmount) {
                          alert(`مقدار مجوز نمی‌تواند بیشتر از ${formatPersianNumber(availableAmount)} باشد.`);
                          return;
                        }
                        
                        // استفاده از فرمول جدید برای محاسبه مانده مجوز حواله
                        // دریافت تمام مجوزهای صادر شده برای این قرارداد و رسید
                        const contractPermits = deliveryPermits.filter(p => 
                          p.receiptId && 
                          receipts.find(r => r.id === p.receiptId && r.contractId === receipt.contractId) &&
                          p.id !== editingPermit
                        );

                        // محاسبه مجموع مجوزهای صادر شده قبلی
                        const totalPreviousPermitAmounts = contractPermits.reduce((sum, p) => sum + (p.permitAmount || 0), 0);

                        // محاسبه مانده مجوز با کسر مجوزهای صادر شده قبلی
                        const remainingPermit = availableAmount - totalPreviousPermitAmounts - permitAmount;
                        
                        setNewPermit({ 
                          ...newPermit, 
                          permitAmount, 
                          wastageAmount, 
                          finalPermitAmount,
                          remainingPermit
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      حداکثر مقدار قابل مجوز: {formatPersianNumber(newPermit.remainingPermit || 0)}
                    </div>
                  </FieldWithTooltip>
                </div>
                
                <div>
                  <FieldWithTooltip
                    label="مقدار افت مجوز حواله"
                    formula="مقدار افت = مقدار مجوز حواله × درصد افت قرارداد"
                  >
                    <input
                      type="number"
                      value={newPermit.wastageAmount || 0}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </FieldWithTooltip>
                </div>
                
                <div>
                  <FieldWithTooltip
                    label="مقدار مجوز بعد از کسر افت"
                    formula="مقدار نهایی = مقدار مجوز حواله - مقدار افت"
                  >
                    <input
                      type="number"
                      value={newPermit.finalPermitAmount || 0}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </FieldWithTooltip>
                </div>
                
                <div>
                  <FieldWithTooltip
                    label="مانده مجوز حواله"
                    formula="مانده مجوز = وزن مانده قرارداد - مجموع مجوزهای صادر شده"
                  >
                    <input
                      type="number"
                      value={newPermit.remainingPermit || 0}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </FieldWithTooltip>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowPermitForm(null);
                    setEditingPermit(null);
                    setNewPermit({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  انصراف
                </button>
                <button
                  onClick={handleSavePermit}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  ذخیره مجوز
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountingManager;