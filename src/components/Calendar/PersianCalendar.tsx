import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Minimize2, Maximize2, Lock } from 'lucide-react';
import { formatPersianDate, getPersianMonthName, getDaysInPersianMonth, getPersianWeekDayIndex } from '../../utils/persian';
import jalaali from 'jalaali-js';

interface PersianCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  className?: string;
  showTimeSelector?: boolean;
}

export const PersianCalendar: React.FC<PersianCalendarProps> = ({
  selectedDate = new Date(),
  onDateSelect,
  className = '',
  showTimeSelector = false
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [viewDate, setViewDate] = useState(selectedDate);
  const [isMinimized, setIsMinimized] = useState(true);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const j = jalaali.toJalaali(viewDate);
  const currentJ = jalaali.toJalaali(currentDate);
  const todayJ = jalaali.toJalaali(new Date());

  const daysInMonth = getDaysInPersianMonth(j.jy, j.jm);
  const firstDayOfMonth = jalaali.toGregorian(j.jy, j.jm, 1);
  const firstDayWeekDay = getPersianWeekDayIndex(new Date(firstDayOfMonth.gy, firstDayOfMonth.gm - 1, firstDayOfMonth.gd).getDay());

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

  const handleDateClick = (day: number) => {
    const selectedGregorian = jalaali.toGregorian(j.jy, j.jm, day);
    const newDate = new Date(selectedGregorian.gy, selectedGregorian.gm - 1, selectedGregorian.gd);
    setCurrentDate(newDate);
    onDateSelect?.(newDate);
  };

  const handleTodayClick = () => {
    const today = new Date();
    setCurrentDate(today);
    setViewDate(today);
    onDateSelect?.(today);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFixed) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && !isFixed) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent, type: 'year' | 'month' | 'day') => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    
    if (type === 'year') {
      const newYear = j.jy + delta;
      const newDate = jalaali.toGregorian(newYear, j.jm, Math.min(j.jd, getDaysInPersianMonth(newYear, j.jm)));
      setViewDate(new Date(newDate.gy, newDate.gm - 1, newDate.gd));
    } else if (type === 'month') {
      let newMonth = j.jm + delta;
      let newYear = j.jy;
      
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
      
      const newDate = jalaali.toGregorian(newYear, newMonth, Math.min(j.jd, getDaysInPersianMonth(newYear, newMonth)));
      setViewDate(new Date(newDate.gy, newDate.gm - 1, newDate.gd));
    } else if (type === 'day') {
      const currentGregorian = jalaali.toGregorian(j.jy, j.jm, j.jd);
      const currentDate = new Date(currentGregorian.gy, currentGregorian.gm - 1, currentGregorian.gd);
      currentDate.setDate(currentDate.getDate() + delta);
      setViewDate(currentDate);
      setCurrentDate(currentDate);
      onDateSelect?.(currentDate);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const renderCalendarDays = () => {
    const days = [];
    const totalCells = Math.ceil((daysInMonth + firstDayWeekDay) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDayWeekDay + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
      const isToday = isValidDay && j.jy === todayJ.jy && j.jm === todayJ.jm && dayNumber === todayJ.jd;
      const isSelected = isValidDay && j.jy === currentJ.jy && j.jm === currentJ.jm && dayNumber === currentJ.jd;
      
      // Check if it's Friday (holiday in Iran)
      let isHoliday = false;
      if (isValidDay) {
        const dayDate = jalaali.toGregorian(j.jy, j.jm, dayNumber);
        const checkDate = new Date(dayDate.gy, dayDate.gm - 1, dayDate.gd);
        isHoliday = checkDate.getDay() === 5; // Friday
      }

      days.push(
        <button
          key={i}
          onClick={() => isValidDay && handleDateClick(dayNumber)}
          disabled={!isValidDay}
          className={`
            h-8 w-8 text-sm rounded-lg transition-all duration-200 font-medium
            ${!isValidDay ? 'invisible' : ''}
            ${isSelected ? 'bg-blue-600 text-white shadow-lg' : ''}
            ${isToday && !isSelected ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300' : ''}
            ${isHoliday && !isSelected && !isToday ? 'text-red-600 bg-red-50 font-bold' : ''}
            ${!isSelected && !isToday && !isHoliday && isValidDay ? 'hover:bg-gray-100 text-gray-700' : ''}
            ${!isValidDay || isSelected || isToday ? '' : 'hover:scale-105'}
          `}
        >
          {isValidDay ? dayNumber : ''}
        </button>
      );
    }

    return days;
  };

  if (isMinimized) {
    return (
      <div
        className={`fixed bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 ${isFixed ? '' : 'cursor-move'} ${className}`}
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">{formatPersianDate(currentDate)}</span>
          <button
            onClick={() => setIsFixed(!isFixed)}
            className={`p-1 rounded transition-colors ${isFixed ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            title={isFixed ? 'آزاد کردن' : 'ثابت کردن'}
          >
            <Lock className="h-3 w-3" />
          </button>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bg-white border border-gray-300 rounded-lg shadow-xl z-50 ${isFixed ? '' : 'cursor-move'} ${className}`}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-800">تقویم شمسی</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsFixed(!isFixed)}
            className={`p-1 rounded transition-colors ${isFixed ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            title={isFixed ? 'آزاد کردن' : 'ثابت کردن'}
          >
            <Lock className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <div className="text-center">
          <div className="flex items-center gap-2">
            <div 
              className="font-bold text-lg text-gray-800 px-2 py-1 rounded flex items-center gap-1"
            >
              <div className="flex flex-col">
                <button
                  onClick={() => {
                    const newYear = j.jy + 1;
                    const newDate = jalaali.toGregorian(newYear, j.jm, Math.min(j.jd, getDaysInPersianMonth(newYear, j.jm)));
                    setViewDate(new Date(newDate.gy, newDate.gm - 1, newDate.gd));
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ▲
                </button>
                <button
                  onClick={() => {
                    const newYear = j.jy - 1;
                    const newDate = jalaali.toGregorian(newYear, j.jm, Math.min(j.jd, getDaysInPersianMonth(newYear, j.jm)));
                    setViewDate(new Date(newDate.gy, newDate.gm - 1, newDate.gd));
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ▼
                </button>
              </div>
              <span>{j.jy}</span>
            </div>
            <div 
              className="font-bold text-lg text-gray-800 px-2 py-1 rounded flex items-center gap-1"
            >
              <div className="flex flex-col">
                <button
                  onClick={handleNextMonth}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ▲
                </button>
                <button
                  onClick={handlePrevMonth}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ▼
                </button>
              </div>
              <span>{getPersianMonthName(j.jm)}</span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {formatPersianDate(new Date())} - امروز
          </div>
        </div>
        
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 p-3 border-b border-gray-100">
        {['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'].map((day, index) => (
          <div key={index} className={`h-8 flex items-center justify-center text-sm font-medium ${
            index === 6 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {day.slice(0, 2)}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1 p-3">
        {renderCalendarDays()}
      </div>

      {/* Today Button */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleTodayClick}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          تاریخ امروز
        </button>
      </div>

      {/* Current Selection Display */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <div className="text-center">
          <div className="text-sm text-gray-600">تاریخ انتخاب شده</div>
          <div 
            className="font-bold text-blue-600 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
            onWheel={(e) => handleWheel(e, 'day')}
            title="برای تغییر روز، ماوس را اسکرول کنید"
          >
            {formatPersianDate(currentDate)}
          </div>
        </div>
      </div>
    </div>
  );
};//