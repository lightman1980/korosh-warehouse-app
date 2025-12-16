import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  text, 
  title,
  placement = 'top' 
}) => {
  const [show, setShow] = useState(false);
  
  const getPlacementClasses = () => {
    switch (placement) {
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default: // top
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };
  
  const getArrowPlacementClasses = () => {
    switch (placement) {
      case 'bottom':
        return 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45';
      case 'left':
        return 'right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 rotate-45';
      case 'right':
        return 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 rotate-45';
      default: // top
        return 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45';
    }
  };
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-blue-500 hover:text-blue-700 focus:outline-none"
        aria-label="راهنما"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {show && (
        <div className={`absolute z-10 w-80 p-4 text-sm text-white bg-gray-800 rounded-lg shadow-lg ${getPlacementClasses()}`}>
          {title && <div className="font-bold mb-1">{title}</div>}
          <div>{text}</div>
          <div className={`absolute w-3 h-3 bg-gray-800 ${getArrowPlacementClasses()}`}></div>
        </div>
      )}
    </div>
  );
};