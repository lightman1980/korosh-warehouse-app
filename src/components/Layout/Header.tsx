// src/components/Layout/Header.tsx
import React from 'react';
import { Bell, Sun, Moon, LogOut, Calendar } from 'lucide-react';
import PersianDatePicker from '../Common/PersianDatePicker';

interface HeaderProps {
  currentUser: any;
  onLogout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  onCalendarClick: () => void;
  onRefresh?: () => void;
  lastAutoInvoiceCheck?: Date | null;
  activeModule?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  onLogout, 
  isDarkMode, 
  setIsDarkMode,
  onCalendarClick,
  onRefresh,
  lastAutoInvoiceCheck,
  activeModule
}) => {
  const [showFloatingCalendar, setShowFloatingCalendar] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date());

  // Function برای دریافت عنوان صفحه
  const getModuleTitle = (module?: string): string => {
    const titles: Record<string, string> = {
      'dashboard': 'داشبورد',
      'base-data': 'اطلاعات پایه',
      'contracts': 'قراردادها',
      'warehouse-receipt': 'رسید انبار',
      'warehouse-delivery': 'حواله انبار',
      'Deduction-Addition': 'کسر/اضافه انبار',
      'product-conversion': 'تبدیل کالا',
      'invoice-generation': 'صدور فاکتور',
      'reports': 'گزارشات',
      'inventory-ledger': 'کاردکس موجودی',
      'analytics': 'تحلیل و بررسی',
      //'complete-system': 'سیستم پیشرفته یکپارچه',
      'oil-product-creator': 'تحلیل محصول نهایی',
      'messaging': 'مکاتبات',
      'users': 'مدیریت کاربران',
      'settings': 'تنظیمات'
    };
    return titles[module || ''] || 'سیستم مدیریت انبار';
  };

  const handleCalendarDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      // تغییر تقویم سیستم به تاریخ انتخاب شده
      // این تاریخ در کل برنامه اعمال خواهد شد
      localStorage.setItem('systemDate', date.toISOString());
      window.dispatchEvent(new CustomEvent('systemDateChanged', { detail: { date } }));
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md z-10 relative">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-reverse space-x-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{getModuleTitle(activeModule)}</h1>
        </div>
        
        <div className="flex items-center space-x-reverse space-x-4">
          {/* دکمه تقویم شناور */}
          <button 
            onClick={() => setShowFloatingCalendar(!showFloatingCalendar)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 relative"
          >
            <Calendar className="h-5 w-5" />
          </button>
          
          {/* دکمه اعلان‌ها */}
          <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          {/* دکمه تغییر تم */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          {/* اطلاعات کاربر */}
          <div className="flex items-center space-x-reverse space-x-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800 dark:text-white">{currentUser?.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.department}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {currentUser?.fullName?.charAt(0)}
            </div>
            
            {/* دکمه خروج */}
            <button 
              onClick={onLogout}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* تقویم شناور */}
      {showFloatingCalendar && (
        <div className="absolute top-16 left-4 z-50">
          <PersianDatePicker
            value={selectedDate}
            onChange={handleCalendarDateChange}
            isFloating={true}
            onClose={() => setShowFloatingCalendar(false)}
          />
        </div>
      )}
    </header>
  );
};

// تغییر export به صورت named export
export { Header };