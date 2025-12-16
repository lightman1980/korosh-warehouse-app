// برنامه FieldWithTooltip.tsx
import React, { useState } from 'react';
import { Info, Calculator } from 'lucide-react';

interface FieldWithTooltipProps {
  label: string;
  formula: string;
  children: React.ReactNode;
  className?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
  iconSize?: number;
  tooltipWidth?: string;
}

export const FieldWithTooltip: React.FC<FieldWithTooltipProps> = ({ 
  label, 
  formula, 
  children,
  className = "",
  tooltipPosition = "top",
  showIcon = true,
  iconSize = 14,
  tooltipWidth = "w-64"
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
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
    <div className={`relative ${className}`}>
      <div className="flex items-center mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {showIcon && (
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
      </div>
      {children}
      {showTooltip && (
        <div className={`absolute z-10 ${tooltipWidth} p-3 text-sm text-white bg-gray-800 rounded-lg shadow-lg ${getTooltipPosition()}`}>
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
  );
};