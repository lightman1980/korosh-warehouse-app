// src/components/DateSelectionWrapper.tsx
import React, { useState } from 'react';
import jalaali from 'jalaali-js';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateSelectionWrapperProps {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
}

const DateSelectionWrapper: React.FC<DateSelectionWrapperProps> = ({
  value,
  onChange,
  placeholder = 'تاریخ را انتخاب کنید',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // تابع برای فرمت کردن تاریخ با اعتبارسنجی
  const formatDisplayDate = (date: Date | null | undefined): string => {
    if (!date) return '';
    
    try {
      if (isNaN(date.getTime())) {
        console.error('Invalid date object:', date);
        return '';
      }
      
      const year = date.getFullYear();
      if (year < 100 || year > 9900) {
        console.error('Date year out of valid range:', year);
        return '';
      }
      
      const persianDate = jalaali.toJalaali(date);
      return `${persianDate.jy}/${persianDate.jm.toString().padStart(2, '0')}/${persianDate.jd.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    onChange(date);
    setIsOpen(false);
  };

  // تغییر ماه
  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  // تولید روزهای ماه
  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // روزهای خالی ابتدای ماه
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // روزهای ماه
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // بررسی آیا تاریخ امروز است
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // بررسی آیا تاریخ انتخاب شده است
  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  // نام ماه‌های شمسی
  const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  return (
    <div className={`relative ${className}`}>
      <div
        className="flex items-center px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="w-4 h-4 ml-2 text-gray-500" />
        <span className={selectedDate ? 'text-gray-900' : 'text-gray-500'}>
          {formatDisplayDate(selectedDate) || placeholder}
        </span>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-72 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* هدر تقویم */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <div className="text-lg font-medium">
              {persianMonths[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            
            <button 
              onClick={() => changeMonth(1)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          
          {/* روزهای هفته */}
          <div className="grid grid-cols-7 gap-1 px-2 py-1 text-center text-xs text-gray-500">
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((day, index) => (
              <div key={index} className="py-1">{day}</div>
            ))}
          </div>
          
          {/* روزهای ماه */}
          <div className="grid grid-cols-7 gap-1 px-2 pb-2">
            {getMonthDays().map((date, index) => {
              if (!date) {
                return <div key={index} className="h-8"></div>;
              }
              
              const persianDate = jalaali.toJalaali(date);
              const dayNumber = persianDate.jd;
              
              return (
                <button
                  key={index}
                  onClick={() => handleDateChange(date)}
                  className={`
                    h-8 rounded-full flex items-center justify-center text-sm
                    ${isToday(date) ? 'border border-blue-500' : ''}
                    ${isSelected(date) ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
                  `}
                >
                  {dayNumber}
                </button>
              );
            })}
          </div>
          
          {/* دکمه‌های پایین */}
          <div className="flex justify-between px-4 py-2 border-t">
            <button
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              onClick={() => handleDateChange(null)}
            >
              پاک کردن
            </button>
            <button
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => setIsOpen(false)}
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { DateSelectionWrapper }