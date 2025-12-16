// برنامه PersianDateField.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Calculator } from 'lucide-react';
import PersianDatePicker from '../../components/Common/PersianDatePicker';

interface PersianDateFieldProps {
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
}

export const PersianDateField: React.FC<PersianDateFieldProps> = ({
  value,
  onChange,
  placeholder = "تاريخ را انتخاب کنيد",
  id,
  className = "",
  label,
  required = false,
  disabled = false,
  formula,
  tooltipPosition = "top",
  showFormulaIcon = true,
  iconSize = 14
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const persianDate = value.toLocaleDateString('fa-IR').split('/');
      if (persianDate.length === 3) {
        setDay(persianDate[2]);
        setMonth(persianDate[1]);
        setYear(persianDate[0]);
      }
    }
  }, [value]);

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
    
    if (date) {
      const persianDate = date.toLocaleDateString('fa-IR').split('/');
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
  };

  const handleManualDateChange = () => {
    if (day && month && year) {
      // Convert Persian date to Gregorian
      // This is a simplified conversion - in a real app, you'd use a proper library
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      onChange?.(date);
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
    <div className={`relative ${className}`} ref={pickerRef}>
      <div className="flex items-center mb-1">
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
      
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="سال"
          maxLength={4}
          disabled={disabled}
          className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onBlur={handleManualDateChange}
        />
        <span className="text-gray-500">/</span>
        <input
          type="text"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          placeholder="ماه"
          maxLength={2}
          disabled={disabled}
          className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onBlur={handleManualDateChange}
        />
        <span className="text-gray-500">/</span>
        <input
          type="text"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          placeholder="روز"
          maxLength={2}
          disabled={disabled}
          className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onBlur={handleManualDateChange}
        />
      </div>
      
      <div
        id={id}
        className={`w-full px-4 py-4 border-2 border-gray-300 rounded-lg text-right cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all flex items-center justify-between h-16 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-blue-50'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`text-lg ${value ? 'text-gray-900' : 'text-gray-500'}`}>
          {value ? value.toLocaleDateString('fa-IR') : placeholder}
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