// src/components/Common/PersianDatePicker.tsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import jalaali from 'jalaali-js';

// این اینترفیس را برای تعریف متدهایی که از طریق ref در دسترس خواهند بود، اضافه می‌کنیم
export interface PersianDatePickerRef {
  open: () => void;
}

interface PersianDatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  isFloating?: boolean;
  onClose?: () => void;
}

// تابع کمکی برای دریافت نام ماه شمسی
const getPersianMonthName = (month: number) => {
  const months = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  return months[month - 1] || '';
};

// تابع کمکی برای دریافت روزهای ماه شمسی
const getDaysInPersianMonth = (year: number, month: number) => {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  
  // اسفند ماه در سال کبیسه 30 روز است
  return jalaali.isLeapJalaaliYear(year) ? 30 : 29;
};

// تابع کمکی برای دریافت اندیس روز هفته در تقویم شمسی
const getPersianWeekDayIndex = (dayIndex: number) => {
  // در تقویم شمسی، هفته از شنبه شروع می‌شود
  // dayIndex: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return dayIndex === 6 ? 0 : dayIndex + 1;
};

// تابع کمکی برای فرمت‌دهی تاریخ شمسی
const formatPersianDate = (date: Date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  const j = jalaali.toJalaali(date);
  return `${j.jy}/${j.jm.toString().padStart(2, '0')}/${j.jd.toString().padStart(2, '0')}`;
};

// تابع کمکی برای تجزیه تاریخ شمسی
const parsePersianDate = (dateString: string) => {
  const parts = dateString.split('/');
  if (parts.length !== 3) {
    throw new Error('Invalid date format');
  }
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Invalid date values');
  }
  
  const g = jalaali.toGregorian(year, month, day);
  return new Date(g.gy, g.gm - 1, g.gd);
};

// تابع کمکی برای تجزیه امن تاریخ
const safeParseDate = (date?: Date | null) => {
  if (!date) return null;
  if (!(date instanceof Date)) return null;
  if (isNaN(date.getTime())) return null;
  return date;
};

// تابع برای بررسی تعطیلات رسمی ایران
const isHoliday = (year: number, month: number, day: number) => {
  // جمعه همیشه تعطیل هست
  const gDate = jalaali.toGregorian(year, month, day);
  const date = new Date(gDate.gy, gDate.gm - 1, gDate.gd);
  if (date.getDay() === 5) return true;
  
  // تعطیلات رسمی ایران (نمونه)
  const holidays = [
    // نوروز
    { month: 1, day: 1 }, { month: 1, day: 2 }, { month: 1, day: 3 }, { month: 1, day: 4 },
    { month: 1, day: 5 }, { month: 1, day: 6 }, { month: 1, day: 12 },
    // روز جمهوری اسلامی
    { month: 1, day: 12 },
    // روز ملی شدن صنعت نفت
    { month: 2, day: 29 },
    // ولادت امام علی (ع)
    { month: 3, day: 15 },
    // رحلت امام خمینی
    { month: 4, day: 14 },
    // ۱۵ خرداد
    { month: 5, day: 15 },
    // عید فطر
    { month: 6, day: 1 }, { month: 6, day: 2 },
    // عید قربان
    { month: 7, day: 10 },
    // عید غدیر
    { month: 8, day: 18 },
    // تاسوعا و عاشورا
    { month: 9, day: 9 }, { month: 9, day: 10 },
    // ارتحال امام صادق (ع)
    { month: 10, day: 25 },
    // میلاد پیامبر و امام جعفر صادق (ع)
    { month: 11, day: 17 },
    // شهادت حضرت فاطمه (س)
    { month: 12, day: 3 },
    // سالگرد پیروزی انقلاب اسلامی
    { month: 12, day: 22 },
    // روز ملی شدن صنعت نفت
    { month: 12, day: 29 }
  ];
  
  return holidays.some(holiday => holiday.month === month && holiday.day === day);
};

// *** تغییر اصلی: کامپوننت را با forwardRef می‌بریم تا بتوانیم ref را دریافت کنیم ***
const PersianDatePicker: React.FC<PersianDatePickerProps> = forwardRef<PersianDatePickerRef, PersianDatePickerProps>(({
  value,
  onChange,
  className = '',
  placeholder = 'انتخاب تاریخ',
  disabled = false,
  isFloating = false,
  onClose
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const safeValue = safeParseDate(value);
    return safeValue || new Date();
  });
  const [inputValue, setInputValue] = useState(() => {
    const safeValue = safeParseDate(value);
    return safeValue ? formatPersianDate(safeValue) : '';
  });
  
  const [popupPosition, setPopupPosition] = useState({ 
    top: 0, 
    left: 0, 
    width: isFloating ? 320 : 0
  });
  
  // State برای پنل‌های انتخابگر
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [yearPickerPage, setYearPickerPage] = useState(0);
  const [monthPickerYear, setMonthPickerYear] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  
  const safeViewDate = safeParseDate(viewDate) || new Date();
  const j = jalaali.toJalaali(safeViewDate);
  const safeSelectedValue = safeParseDate(value);
  const selectedJ = safeSelectedValue ? jalaali.toJalaali(safeSelectedValue) : null;
  const todayJ = jalaali.toJalaali(new Date());
  
  // *** تغییر اصلی: از useImperativeHandle برای expose کردن تابع open استفاده می‌کنیم ***
  useImperativeHandle(ref, () => ({
    open: () => {
      if (!disabled) {
        setIsOpen(true);
      }
    }
  }), [disabled]);

  useEffect(() => {
    const safeValue = safeParseDate(value);
    if (safeValue) {
      setInputValue(formatPersianDate(safeValue));
      setViewDate(safeValue);
    } else {
      setInputValue('');
    }
  }, [value]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowYearPicker(false);
        setShowMonthPicker(false);
        onClose?.();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  useEffect(() => {
    const updatePopupPosition = () => {
      if (isFloating) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        setPopupPosition({
          top: scrollTop + (window.innerHeight - 400) / 2,
          left: scrollLeft + (window.innerWidth - 320) / 2,
          width: 320
        });
      } else if (containerRef.current && isOpen) {
        const rect = containerRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        let top = rect.top + scrollTop - 305;
        const left = rect.left + scrollLeft;
        const width = rect.width;
        
        if (top < scrollTop) {
          top = rect.bottom + scrollTop + 5;
        }
        
        setPopupPosition({ top, left, width });
      }
    };
    
    if (isOpen || isFloating) {
      updatePopupPosition();
      window.addEventListener('scroll', updatePopupPosition);
      window.addEventListener('resize', updatePopupPosition);
    }
    
    return () => {
      window.removeEventListener('scroll', updatePopupPosition);
      window.removeEventListener('resize', updatePopupPosition);
    };
  }, [isOpen, isFloating]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
      try {
        const date = parsePersianDate(value);
        onChange?.(date);
        setViewDate(date);
      } catch (error) {
        // Invalid date format
      }
    }
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsOpen(!isOpen);
    }
  };
  
  const handleDateClick = (day: number) => {
    const selectedGregorian = jalaali.toGregorian(j.jy, j.jm, day);
    const newDate = new Date(selectedGregorian.gy, selectedGregorian.gm - 1, selectedGregorian.gd);
    onChange?.(newDate);
    setInputValue(formatPersianDate(newDate));
    
    if (!isFloating) {
      setIsOpen(false);
    }
    
    onClose?.();
  };
  
  const handlePrevMonth = () => {
    const newMonth = j.jm === 1 ? 12 : j.jm - 1;
    const newYear = j.jm === 1 ? j.jy - 1 : j.jy;
    const newDate = jalaali.toGregorian(newYear, newMonth, 1);
    setViewDate(new Date(newDate.gy, newDate.gm - 1, newDate.gd));
  };
  
  const handleNextMonth = () => {
    const newMonth = j.jm === 12 ? 1 : j.jm + 1;
    const newYear = j.jm === 12 ? j.jy + 1 : j.jy;
    const newDate = jalaali.toGregorian(newYear, newMonth, 1);
    setViewDate(new Date(newDate.gy, newDate.gm - 1, newDate.gd));
  };
  
  // رندر کردن انتخابگر سال به صورت اسلایدی
  const renderYearPicker = () => {
    const yearsPerPage = 12;
    const startYear = 1395;
    const endYear = 1430;
    const totalYears = endYear - startYear + 1;
    const totalPages = Math.ceil(totalYears / yearsPerPage);
    
    const currentPage = Math.min(Math.max(yearPickerPage, 0), totalPages - 1);
    const startIndex = startYear + currentPage * yearsPerPage;
    const endIndex = Math.min(startIndex + yearsPerPage - 1, endYear);
    
    const years = [];
    for (let year = startIndex; year <= endIndex; year++) {
      const isSelected = j.jy === year;
      years.push(
        <button
          key={year}
          onClick={() => {
            const newDate = jalaali.toGregorian(year, j.jm, Math.min(j.jd, getDaysInPersianMonth(year, j.jm)));
            setViewDate(new Date(newDate.gy, newDate.gm - 1, newDate.gd));
            setShowYearPicker(false);
          }}
          className={`
            h-12 w-12 rounded-lg transition-all duration-200 font-medium
            ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-100 text-gray-700'}
          `}
        >
          {year}
        </button>
      );
    }
    
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setYearPickerPage(prev => Math.max(prev - 1, 0))}
            disabled={currentPage === 0}
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          
          <div className="text-lg font-bold text-gray-800">
            {startIndex} - {endIndex}
          </div>
          
          <button
            onClick={() => setYearPickerPage(prev => Math.min(prev + 1, totalPages - 1))}
            disabled={currentPage === totalPages - 1}
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {years}
        </div>
      </div>
    );
  };
  
  // رندر کردن انتخابگر ماه به صورت اسلایدی
  const renderMonthPicker = () => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const isSelected = j.jm === month && j.jy === monthPickerYear;
      months.push(
        <button
          key={month}
          onClick={() => {
            const newDate = jalaali.toGregorian(monthPickerYear, month, Math.min(j.jd, getDaysInPersianMonth(monthPickerYear, month)));
            setViewDate(new Date(newDate.gy, newDate.gm - 1, newDate.gd));
            setShowMonthPicker(false);
          }}
          className={`
            h-12 w-12 rounded-lg transition-all duration-200 font-medium
            ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-100 text-gray-700'}
          `}
        >
          {getPersianMonthName(month).substring(0, 3)}
        </button>
      );
    }
    
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setMonthPickerYear(prev => prev - 1)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          
          <div className="text-lg font-bold text-gray-800">
            {monthPickerYear}
          </div>
          
          <button
            onClick={() => setMonthPickerYear(prev => prev + 1)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {months}
        </div>
      </div>
    );
  };
  
  // رندر کردن روزهای ماه
  const renderCalendarDays = () => {
    const daysInMonth = getDaysInPersianMonth(j.jy, j.jm);
    const firstDayOfMonth = jalaali.toGregorian(j.jy, j.jm, 1);
    const firstDayWeekDay = getPersianWeekDayIndex(new Date(firstDayOfMonth.gy, firstDayOfMonth.gm - 1, firstDayOfMonth.gd).getDay());
    
    const days = [];
    const totalCells = Math.ceil((daysInMonth + firstDayWeekDay) / 7) * 7;
    
    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDayWeekDay + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
      const isToday = isValidDay && j.jy === todayJ.jy && j.jm === todayJ.jm && dayNumber === todayJ.jd;
      const isSelected = isValidDay && selectedJ && j.jy === selectedJ.jy && j.jm === selectedJ.jm && dayNumber === selectedJ.jd;
      
      const isHolidayDay = isValidDay && isHoliday(j.jy, j.jm, dayNumber);
      
      days.push(
        <button
          key={i}
          onClick={() => isValidDay && handleDateClick(dayNumber)}
          disabled={!isValidDay}
          className={`
            h-8 w-8 text-sm rounded-lg transition-all duration-200 font-medium
            ${!isValidDay ? 'invisible' : ''}
            ${isSelected ? 'bg-yellow-200 text-gray-800 shadow-lg' : ''}
            ${isToday && !isSelected ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300' : ''}
            ${isHolidayDay && !isSelected && !isToday ? 'text-red-600 bg-red-50 font-bold' : ''}
            ${!isSelected && !isToday && !isHolidayDay && isValidDay ? 'hover:bg-gray-100 text-gray-700' : ''}
            ${!isValidDay || isSelected || isToday ? '' : 'hover:scale-105'}
          `}
        >
          {isValidDay ? dayNumber : ''}
        </button>
      );
    }
    
    return days;
  };
  
  // رندر کردن پنجره پاپ‌آپ تقویم
  const renderPopup = () => {
    if (!isOpen) return null;
    
    return createPortal(
      <div
        ref={popupRef}
        className={`fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden ${
          isFloating ? 'min-w-[320px] max-w-[320px]' : 'min-w-[300px] max-w-[340px]'
        }`}
        style={{
          top: `${popupPosition.top}px`,
          left: `${popupPosition.left}px`,
          width: `${popupPosition.width}px`
        }}
      >
        {isFloating && (
          <div className="absolute top-2 left-2 z-10">
            <button
              onClick={() => {
                setIsOpen(false);
                onClose?.();
              }}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        <div className="p-3 bg-gray-50 border-b border-gray-100 text-sm">
          <div className="flex justify-between mb-1">
            <span className="font-medium text-gray-700">تاریخ امروز:</span>
            <span className="font-semibold text-blue-600">
              {formatPersianDate(new Date())}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">تاریخ انتخاب شده:</span>
            <span className="font-semibold text-yellow-600">
              {safeSelectedValue ? formatPersianDate(safeSelectedValue) : '---'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ChevronDown className="h-5 w-5 rotate-90 text-blue-600" />
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowYearPicker(true);
                setShowMonthPicker(false);
                setYearPickerPage(Math.floor((j.jy - 1395) / 12));
              }}
              className="font-bold text-gray-800 text-lg hover:text-blue-600 transition-colors"
            >
              {j.jy}
            </button>
            <span className="text-gray-400">/</span>
            <button
              onClick={() => {
                setShowMonthPicker(true);
                setShowYearPicker(false);
                setMonthPickerYear(j.jy);
              }}
              className="font-bold text-gray-800 text-lg hover:text-blue-600 transition-colors"
            >
              {getPersianMonthName(j.jm)}
            </button>
          </div>
          
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ChevronDown className="h-5 w-5 -rotate-90 text-blue-600" />
          </button>
        </div>
        
        {showYearPicker && renderYearPicker()}
        {showMonthPicker && renderMonthPicker()}
        
        {!showYearPicker && !showMonthPicker && (
          <>
            <div className="grid grid-cols-7 gap-1 p-3 bg-gray-50 border-b border-gray-100">
              {['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'].map((day, index) => (
                <div key={index} className={`h-8 flex items-center justify-center text-sm font-semibold ${
                  index === 6 ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 p-3 bg-white">
              {renderCalendarDays()}
            </div>
            
            <div className="p-3 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => {
                  const today = new Date();
                  setViewDate(today);
                  onChange?.(today);
                  setInputValue(formatPersianDate(today));
                }}
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                امروز
              </button>
            </div>
          </>
        )}
      </div>,
      document.body
    );
  };
  
  // تابع برای باز کردن تقویم
  const openCalendar = () => {
    if (!disabled) {
      setIsOpen(true);
      
      // اطمینان از اینکه موقعیت تقویم به درستی محاسبه می‌شود
      setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
          
          let top = rect.top + scrollTop - 305;
          const left = rect.left + scrollLeft;
          const width = rect.width;
          
          if (top < scrollTop) {
            top = rect.bottom + scrollTop + 5;
          }
          
          setPopupPosition({ top, left, width });
        }
      }, 0);
    }
  };
  
  if (isFloating) {
    return renderPopup();
  }
  
    return (
      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onClick={openCalendar}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${className}`}
          />
          <button
            ref={calendarButtonRef}
            type="button"
            onClick={openCalendar}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none"
            disabled={disabled}
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
        
        {renderPopup()}
      </div>
    );
});

// *** تغییر اصلی: برای دیباگینگ بهتر، یک displayName تنظیم می‌کنیم ***
PersianDatePicker.displayName = 'PersianDatePicker';

export default PersianDatePicker;
export { PersianDatePicker };