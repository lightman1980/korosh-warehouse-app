// برنامه SimplePersianDateField.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Calculator } from 'lucide-react';
import { FieldWithTooltip } from './FieldWithTooltip';

interface SimplePersianDateFieldProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  formula?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  showFormulaIcon?: boolean;
  iconSize?: number;
  showCalendarButton?: boolean;
  onCalendarClick?: () => void;
}

export const SimplePersianDateField: React.FC<SimplePersianDateFieldProps> = ({
  value,
  onChange,
  placeholder = "تاريخ را وارد کنيد",
  id,
  className = "",
  label,
  required = false,
  disabled = false,
  formula,
  tooltipPosition = "top",
  showFormulaIcon = true,
  iconSize = 14,
  showCalendarButton = true,
  onCalendarClick
}) => {
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const persianDate = value.toLocaleDateString('fa-IR').split('/');
      if (persianDate.length === 3) {
        setDay(persianDate[2]);
        setMonth(persianDate[1]);
        setYear(persianDate[0]);
      }
    } else {
      setDay('');
      setMonth('');
      setYear('');
    }
  }, [value]);

  const handleDateChange = () => {
    if (day && month && year) {
      // اعتبارسنجی مقادیر ورودی
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      // بررسی معتبر بودن تاریخ
      if (
        isNaN(dayNum) || 
        isNaN(monthNum) || 
        isNaN(yearNum) ||
        dayNum < 1 || 
        dayNum > 31 || 
        monthNum < 1 || 
        monthNum > 12 ||
        yearNum < 1300 ||
        yearNum > 1500
      ) {
        onChange?.(undefined);
        return;
      }
      
      // Convert Persian date to Gregorian
      // This is a simplified conversion - in a real app, you'd use a proper library
      try {
        const date = new Date(yearNum, monthNum - 1, dayNum);
        onChange?.(date);
      } catch (error) {
        console.error('Error converting date:', error);
        onChange?.(undefined);
      }
    } else {
      onChange?.(undefined);
    }
  };

  // تعیین موقعیت tooltip بر اساس پارامتر ورودی
  const getTooltipPosition = () => {
    switch (tooltipPosition) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-1';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-1';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-1';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-1';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-1';
    }
  };
  
  // تعیین جهت فلش tooltip
  const getArrowPosition = () => {
    switch (tooltipPosition) {
      case 'top':
        return 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-full border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800';
      case 'bottom':
        return 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800';
      case 'left':
        return 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-full border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-800';
      case 'right':
        return 'right-0 top-1/2 transform -translate-y-1/2 translate-x-full border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-gray-800';
      default:
        return 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-full border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800';
    }
  };

  return (
    <div className={`relative ${className}`} ref={fieldRef}>
      {label && (
        <div className="flex items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 mr-1">*</span>}
          </label>
          {formula && showFormulaIcon && (
            <button
              type="button"
              className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none transition-colors"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              aria-label={`نمایش فرمول ${label}`}
            >
              <Calculator size={iconSize} />
            </button>
          )}
          {showTooltip && formula && (
            <div className={`absolute z-10 w-64 p-3 text-sm text-white bg-gray-800 rounded-lg shadow-lg ${getTooltipPosition()}`}>
              <div className="font-medium mb-1 flex items-center">
                <Calculator size={12} className="ml-1" />
                فرمول محاسبه:
              </div>
              <div className="font-mono bg-gray-900 p-2 rounded text-xs">
                {formula}
              </div>
              {/* فلش راهنما */}
              <div className={`absolute w-0 h-0 border-4 border-transparent ${getArrowPosition()}`}></div>
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <input
          type="text"
          id={id}
          value={year}
          onChange={(e) => {
            // فقط اعداد مجاز هستند
            const value = e.target.value.replace(/[^0-9]/g, '');
            setYear(value);
          }}
          placeholder="سال"
          maxLength={4}
          disabled={disabled}
          className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          onBlur={handleDateChange}
        />
        <span className="text-gray-500">/</span>
        <input
          type="text"
          value={month}
          onChange={(e) => {
            // فقط اعداد مجاز هستند
            const value = e.target.value.replace(/[^0-9]/g, '');
            setMonth(value);
          }}
          placeholder="ماه"
          maxLength={2}
          disabled={disabled}
          className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          onBlur={handleDateChange}
        />
        <span className="text-gray-500">/</span>
        <input
          type="text"
          value={day}
          onChange={(e) => {
            // فقط اعداد مجاز هستند
            const value = e.target.value.replace(/[^0-9]/g, '');
            setDay(value);
          }}
          placeholder="روز"
          maxLength={2}
          disabled={disabled}
          className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          onBlur={handleDateChange}
        />
        
        {showCalendarButton && (
          <button
            type="button"
            onClick={onCalendarClick}
            disabled={disabled}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            aria-label="انتخاب تاریخ از تقویم"
          >
            <Calendar className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>
      
      {formula && !showFormulaIcon && (
        <div className="mt-1 text-xs text-gray-500 flex items-center">
          <Calculator size={12} className="ml-1" />
          فرمول: {formula}
        </div>
      )}
    </div>
  );
};