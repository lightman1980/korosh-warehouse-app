import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, AlertCircle, FileText, Calendar, Building, Package, Download, Filter, ChevronUp, ChevronDown, BarChart3, PieChart, TrendingUp, Droplets, Layers, Percent, Users, ChevronRight, Lock, RefreshCw } from 'lucide-react';
import { formatPersianDate, formatPersianNumber, generateTransactionNumber } from '../../utils/persian';
import { useModuleChangeLogger, logSaveAction, logDeleteAction, logCreateAction } from "../../hooks/useActivityLogger";
import moment from 'moment-jalaali';
import { PersianDatePicker } from '../Common/PersianDatePicker';
import { DataStorage } from '../../utils/dataStorage';
import { exportToExcel } from '../../utils/excelExport';

// Helper function to convert Gregorian date to Persian year and month
const getPersianYearMonth = (date: Date): { year: number, month: number } => {
  const persianDate = formatPersianDate(date);
  const parts = persianDate.split('/');
  return {
    year: parseInt(parts[0]),
    month: parseInt(parts[1])
  };
};
  
interface Contract {
  id: string;
  contractNumber: string;
  companyId: string;
  companyName: string;
  startDate: Date;
  endDate: Date;
  rentalTypeId: string;
  rentalTypeName: string;
  rentalRate: number;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  wastageRateId: string;
  wastageRateName: string;
  wastageRateValue: number; // مقدار عددی درصد افت
  dropAmount: number; // مقدار افت (وزن اولیه قرارداد * درصد افت)
  unit: string; // واحد سنجش (kg, ton, etc.)
  isActive: boolean;
  receiptBasisId: string;
  receiptBasisName: string;
  createdAt: Date;
  updatedAt: Date;
  contractWeight: number;
  remainingWeight: number;
  remainingCapacity: number;
  emptyCapacityDateBasis?: 'start' | 'end' | 'registration'; // تاریخ مبنای ظرفیت خالی
}

interface SortConfig {
  key: keyof Contract | null;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: string;
}

interface ValidationError {
  type: 'rental_conflict' | 'capacity_exceeded' | 'total_capacity_exceeded' | 'weight_exceeded' | 'date_invalid' | 'full_rental_conflict' | 'mixed_rental_conflict' | 'required';
  message: string;
}

interface BaseDataItem {
  id: string;
  name: string;
  capacity?: string;
  isActive: boolean;
}

interface ReceiptData {
  id: string;
  date: Date;
  weight: number;
  contractId: string;
  tankId: string;
}

interface TankSegment {
  id: string;
  weight: number;
  percentage: number;
  rentalType: string;
  companyName: string;
  startDate: Date;
  endDate: Date;
  color: string;
}

// کامپوننت TankVisualization با اصلاحات کامل
const TankVisualization: React.FC<{
  capacity: number;
  segments: TankSegment[];
  tankName: string;
  isDarkMode: boolean;
  onClick: () => void;
  monthlyData: { month: number; year: number; utilization: number; weight: number; consignmentInventory?: number; ownedInventory?: number }[];
  siteId?: string;
  tankId?: string;
  calculateConsignmentOwnedTanksInventory?: (siteId?: string, tankId?: string) => any;
}> = ({ capacity, segments, tankName, isDarkMode, onClick, monthlyData, siteId, tankId, calculateConsignmentOwnedTanksInventory }) => {
  // محاسبه مجموع وزن‌ها با محدودیت ظرفیت
  const totalUsed = Math.min(segments.reduce((sum, segment) => sum + segment.weight, 0), capacity);
  // اطمینان از اینکه درصد از 100% فراتر نمی‌رود
  const utilization = capacity > 0 ? Math.min(100, (totalUsed / capacity) * 100) : 0;
  
  // Get current month utilization
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentMonthData = monthlyData.find(
    data => data.month === currentMonth && data.year === currentYear
  ) || { utilization: 0, weight: 0 };
  
  return (
    <div className="flex flex-col items-center cursor-pointer transition-transform hover:scale-105" onClick={onClick}>
      <div className="relative w-64 h-96 mb-4">
        <svg width="256" height="384" viewBox="0 0 256 384" className="absolute inset-0">
          {/* Tank Body */}
          <rect x="32" y="64" width="192" height="256" rx="6" ry="6" 
            fill={isDarkMode ? '#374151' : '#e5e7eb'} />
          
          {/* Tank Cone */}
          <path d="M 32 64 L 128 16 L 224 64 Z" 
            fill={isDarkMode ? '#374151' : '#e5e7eb'} />
          
          {/* Tank Base */}
          <rect x="64" y="320" width="128" height="32" rx="3" ry="3" 
            fill={isDarkMode ? '#4b5563' : '#9ca3af'} />
          
          {/* Drain Valve */}
          <circle cx="224" cy="160" r="10" 
            fill={isDarkMode ? '#6b7280' : '#d1d5db'} />
          
          {/* Monthly Utilization Indicators - نمایش تمام 12 ماه با فونت بزرگ‌تر */}
          {monthlyData.map((data, index) => {
            const y = 80 + (index * 24);
            // اطمینان از اینکه استفاده از مخزن از 100% فراتر نمی‌رود
            const utilizationPercentage = Math.min(100, data.utilization);
            const barWidth = (utilizationPercentage / 100) * 160;
            
            // انتخاب رنگ روشن‌تر بر اساس درصد استفاده
            let barColor = '#6ee7b7'; // سبز روشن - حالت عادی
            if (utilizationPercentage >= 100) {
              barColor = '#fca5a5'; // قرمز روشن - ظرفیت تکمیل شده
            } else if (utilizationPercentage >= 80) {
              barColor = '#fcd34d'; // زرد روشن - نزدیک به ظرفیت
            }
            
            return (
              <g key={index}>
                {/* خط پس‌زمینه */}
                <rect 
                  x="40" 
                  y={y} 
                  width="160" 
                  height="14" 
                  fill={isDarkMode ? '#4b5563' : '#e5e7eb'}
                  rx="7"
                />
                {/* خط利用率 - پررنگ‌تر */}
                <rect 
                  x="40" 
                  y={y} 
                  width={barWidth} 
                  height="14" 
                  fill={barColor}
                  opacity="0.85"
                  rx="7"
                />
                {/* برچسب ماه - بزرگ‌تر */}
                <text 
                  x="40" 
                  y={y - 4} 
                  fontSize="12" 
                  fill={isDarkMode ? '#f3f4f6' : '#1f2937'}
                  textAnchor="start"
                  fontWeight="600"
                >
                  {['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][data.month - 1]}
                </text>
                {/* متن درصد利用率 - بزرگ‌تر */}
                <text 
                  x="208" 
                  y={y + 11} 
                  fontSize="12" 
                  fill={isDarkMode ? '#f3f4f6' : '#1f2937'}
                  textAnchor="end"
                  fontWeight="700"
                >
                  {utilizationPercentage.toFixed(1)}%
                </text>
              </g>
            );
          })}
          
          {/* Current Month Highlight */}
          <rect 
            x="32" 
            y="48" 
            width="192" 
            height="288" 
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray="8,8"
            opacity="0.5"
          />
          
          {/* Capacity Segments - با رنگ‌های روشن‌تر و نمایش درصد و وزن */}
          {segments.map((segment, index) => {
            const bottomOffset = segments.slice(0, index).reduce((sum, s) => sum + (s.percentage), 0);
            const segmentHeight = segment.percentage * 2.56;
            const segmentY = 320 - segmentHeight - (bottomOffset * 2.56);
            
            // تبدیل رنگ‌های پررنگ به روشن‌تر
            let lightColor = segment.color;
            if (segment.color === '#8b5cf6') lightColor = '#c4b5fd'; // بنفش روشن
            else if (segment.color === '#ef4444') lightColor = '#fca5a5'; // قرمز روشن
            else if (segment.color === '#f59e0b') lightColor = '#fcd34d'; // زرد روشن
            else if (segment.color === '#10b981') lightColor = '#6ee7b7'; // سبز روشن
            
            return (
              <g key={segment.id}>
                <rect 
                  x="32" 
                  y={segmentY} 
                  width="192" 
                  height={segmentHeight} 
                  fill={lightColor}
                  opacity="0.4"
                />
                {index === 0 && (
                  <path 
                    d={`M 32 ${segmentY} L 128 ${segmentY - 48} L 224 ${segmentY} Z`} 
                    fill={lightColor}
                    opacity="0.4"
                  />
                )}
                {/* نمایش درصد و وزن در مرکز هر بخش */}
                {segmentHeight > 20 && (
                  <text 
                    x="128" 
                    y={segmentY + segmentHeight / 2 + 5} 
                    textAnchor="middle" 
                    fontSize="11" 
                    fontWeight="700"
                    fill={isDarkMode ? '#ffffff' : '#1f2937'}
                  >
                    {segment.percentage.toFixed(1)}%
                  </text>
                )}
                {segmentHeight > 35 && (
                  <text 
                    x="128" 
                    y={segmentY + segmentHeight / 2 + 18} 
                    textAnchor="middle" 
                    fontSize="10" 
                    fontWeight="600"
                    fill={isDarkMode ? '#e5e7eb' : '#4b5563'}
                  >
                    {formatPersianNumber(segment.weight)} کیلوگرم
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Status Indicator */}
          <g transform="translate(128, -32)">
            <rect x="-40" y="-12" width="80" height="24" rx="12" 
              fill={utilization >= 90 ? '#fee2e2' : utilization >= 70 ? '#fef3c7' : '#d1fae5'} />
            <text x="0" y="6" textAnchor="middle" fontSize="14" fontWeight="bold"
              fill={utilization >= 90 ? '#dc2626' : utilization >= 70 ? '#d97706' : '#059669'}>
              {utilization >= 90 ? 'پر' : utilization >= 70 ? 'نیمه‌پر' : 'ظرفیت موجود'}
            </text>
          </g>
          
          {/* Utilization Percentage - حذف شده برای وضوح بیشتر */}
        </svg>
      </div>
      
      <div className={`text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} font-medium mb-2`}>
        {tankName}
      </div>
      
      {/* Rental Types */}
      <div className="flex flex-wrap justify-center gap-1 mb-3">
        {Array.from(new Set(segments.map(s => s.rentalType))).map(type => (
          <span key={type} className={`text-xs px-2 py-1 rounded-full ${
            type === 'اجاره کامل مخزن' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {type}
          </span>
        ))}
      </div>
      
      {/* نمایش اطلاعات تفصیلی برای هر ماه */}
      <div className={`w-full mt-4 p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`text-sm font-bold mb-3 text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          اطلاعات تفصیلی ماهانه
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {monthlyData.map((data) => {
            const monthName = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][data.month - 1];
            const contractPercentage = data.utilization;
            const contractWeight = data.weight;
            
            // استفاده از داده‌های محاسبه شده برای این ماه
            const consignmentInventory = (data as any).consignmentInventory || 0;
            const ownedInventory = (data as any).ownedInventory || 0;
            
            const consignmentPercentage = capacity > 0 ? Math.min(100, (Math.max(0, consignmentInventory) / capacity) * 100) : 0;
            const ownedPercentage = capacity > 0 ? Math.min(100, (Math.max(0, ownedInventory) / capacity) * 100) : 0;
            
            return (
              <div key={data.month} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {monthName}
                </div>
                
                {/* درصد قرارداد */}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                      درصد قرارداد (اجاره مقداری + اجاره کامل):
                    </span>
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-purple-200' : 'text-purple-800'}`}>
                      {contractPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    مقدار: {formatPersianNumber(contractWeight)} کیلوگرم
                  </div>
                </div>
                
                {/* موجودی امانی */}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      درصد موجودی امانی:
                    </span>
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                      {consignmentPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    مقدار: {formatPersianNumber(consignmentInventory)} کیلوگرم
                  </div>
                </div>
                
                {/* موجودی تملیکی */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                      درصد موجودی تملیکی:
                    </span>
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-green-200' : 'text-green-800'}`}>
                      {ownedPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    مقدار: {formatPersianNumber(ownedInventory)} کیلوگرم
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* ظرفیت خالی مخزن */}
        {siteId && tankId && calculateConsignmentOwnedTanksInventory && (() => {
          const inventory = calculateConsignmentOwnedTanksInventory(siteId, tankId);
          const totalInventory = inventory.finalInventory || 0;
          const emptyCapacity = Math.max(0, capacity - totalInventory);
          const emptyCapacityPercentage = capacity > 0 ? (emptyCapacity / capacity) * 100 : 0;
          
          return (
            <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                  ظرفیت خالی مخزن (قابل رسید):
                </span>
                <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-200' : 'text-orange-800'}`}>
                  {formatPersianNumber(emptyCapacity)} کیلوگرم ({emptyCapacityPercentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// کامپوننت TankFillingTree با اصلاحات کامل ظرفیت ماهانه
const TankFillingTree: React.FC<{
  tankName: string;
  capacity: number;
  segments: TankSegment[];
  isDarkMode: boolean;
  contracts: Contract[];
  monthlyData: { month: number; year: number; utilization: number; weight: number; consignmentInventory?: number; ownedInventory?: number }[];
  selectedPersianMonth: number | null;
  selectedPersianYear: number;
}> = ({ tankName, capacity, segments, isDarkMode, contracts, monthlyData, selectedPersianMonth, selectedPersianYear }) => {
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({});
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [showMonthlyView, setShowMonthlyView] = useState(false);
  
  const toggleSegment = (segmentId: string) => {
    setExpandedSegments(prev => ({
      ...prev,
      [segmentId]: !prev[segmentId]
    }));
  };
  
  const toggleCompany = (companyId: string) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
  };
  
  // Group segments by rental type
  const fullRentalSegments = segments.filter(s => s.rentalType === 'اجاره کامل مخزن');
  const partialRentalSegments = segments.filter(s => s.rentalType === 'اجاره مقداری مخزن');
  
  // Group contracts by company
  const contractsByCompany: Record<string, Contract[]> = {};
  contracts.forEach(contract => {
    if (!contractsByCompany[contract.companyId]) {
      contractsByCompany[contract.companyId] = [];
    }
    contractsByCompany[contract.companyId].push(contract);
  });
  
  return (
    <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{tankName}</h3>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            ظرفیت: {formatPersianNumber(capacity)} کیلوگرم
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
      
      {/* View Toggle */}
      <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setShowMonthlyView(false)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            !showMonthlyView 
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow' 
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          قراردادها
        </button>
        <button
          onClick={() => setShowMonthlyView(true)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            showMonthlyView 
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow' 
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          ظرفیت ماهانه
        </button>
      </div>
      
      {!showMonthlyView ? (
        <>
          {/* Full Rental Section */}
          {fullRentalSegments.length > 0 && (
            <div className="mb-6">
              <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="font-medium text-lg">اجاره کامل مخزن</span>
              </div>
              {fullRentalSegments.map(segment => (
                <div key={segment.id} className={`rounded-xl border mb-3 ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                  <button 
                    onClick={() => toggleSegment(segment.id)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {formatPersianDate(segment.startDate)}
                        </span>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} block`}>
                          تا {formatPersianDate(segment.endDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        100%
                      </span>
                      <ChevronDown className={`h-5 w-5 transition-transform ${expandedSegments[segment.id] ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {expandedSegments[segment.id] && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>شرکت:</span>
                          <div className={`font-medium text-lg ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {segment.companyName}
                          </div>
                        </div>
                        <div>
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>ظرفیت:</span>
                          <div className={`font-medium text-lg ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {formatPersianNumber(capacity)} کیلوگرم
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Partial Rental Section */}
          {partialRentalSegments.length > 0 && (
            <div className="mb-6">
              <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="font-medium text-lg">اجاره مقداری مخزن</span>
              </div>
              {partialRentalSegments.map(segment => (
                <div key={segment.id} className={`rounded-xl border mb-3 ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                  <button 
                    onClick={() => toggleSegment(segment.id)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {formatPersianDate(segment.startDate)}
                        </span>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} block`}>
                          تا {formatPersianDate(segment.endDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {segment.percentage.toFixed(1)}%
                      </span>
                      <ChevronDown className={`h-5 w-5 transition-transform ${expandedSegments[segment.id] ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {expandedSegments[segment.id] && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>شرکت:</span>
                          <div className={`font-medium text-lg ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {segment.companyName}
                          </div>
                        </div>
                        <div>
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>مقدار:</span>
                          <div className={`font-medium text-lg ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {formatPersianNumber(segment.weight)} کیلوگرم
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>درصد پرشدگی:</span>
                          <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                            <div 
                              className="h-3 rounded-full bg-blue-500"
                              style={{ width: `${segment.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Companies Section */}
          <div className="mt-6">
            <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
              <Users className="h-5 w-5" />
              <span className="font-medium text-lg">شرکت‌های طرف قرارداد</span>
            </div>
            {Object.entries(contractsByCompany).map(([companyId, companyContracts]) => {
              const company = companyContracts[0];
              return (
                <div key={companyId} className={`rounded-xl border mb-3 ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                  <button 
                    onClick={() => toggleCompany(companyId)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Building className="h-5 w-5 text-green-600" />
                      </div>
                      <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {company.companyName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {companyContracts.length} قرارداد
                      </span>
                      <ChevronDown className={`h-5 w-5 transition-transform ${expandedCompanies[companyId] ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {expandedCompanies[companyId] && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="space-y-3">
                        {companyContracts.map(contract => (
                          <div key={contract.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <div className="flex justify-between items-center">
                              <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {contract.contractNumber}
                              </span>
                              <span className={`text-xs px-3 py-1 rounded-full ${
                                contract.rentalTypeName === 'اجاره کامل مخزن'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {contract.rentalTypeName}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {formatPersianDate(contract.startDate)} - {formatPersianDate(contract.endDate)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatPersianNumber(contract.contractWeight)} {contract.unit}
                            </div>
                            <div className="text-sm text-gray-500">
                              درصد افت: {contract.wastageRateValue}% - مقدار افت: {formatPersianNumber(contract.dropAmount)} {contract.unit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Monthly Utilization View با اصلاحات کامل */
        <div className="space-y-6">
          {selectedPersianMonth === null ? (
            /* نمایش میانگین کل سال */
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center mb-4">
                <h4 className={`text-lg font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  میانگین استفاده سالانه {selectedPersianYear}
                </h4>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-gray-500">میانگین 12 ماه</span>
                </div>
              </div>
              
              {(() => {
                // محاسبه فقط برای ماه‌های دارای داده
                const validMonths = monthlyData.filter(m => m.utilization > 0 || m.weight > 0);
                
                // اگر هیچ داده‌ای وجود ندارد، پیام مناسبی نمایش بده
                if (validMonths.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>هیچ داده‌ای برای این مخزن در سال {selectedPersianYear} یافت نشد</p>
                    </div>
                  );
                }
                
                const avgUtilization = validMonths.reduce((sum, m) => sum + m.utilization, 0) / validMonths.length;
                const avgWeight = validMonths.reduce((sum, m) => sum + m.weight, 0) / validMonths.length;
                
                // انتخاب رنگ بر اساس درصد میانگین
                let barColor = '#10b981'; // سبز - حالت عادی
                if (avgUtilization >= 100) {
                  barColor = '#ef4444'; // قرمز - ظرفیت تکمیل شده
                } else if (avgUtilization >= 80) {
                  barColor = '#f59e0b'; // زرد - نزدیک به ظرفیت
                }
                
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>میانگین درصد استفاده</div>
                        <div className={`text-xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {avgUtilization.toFixed(1)}%
                        </div>
                      </div>
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>میانگین وزن استفاده</div>
                        <div className={`text-xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {formatPersianNumber(avgWeight)} کیلوگرم
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-6">
                      <div 
                        className="h-6 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, avgUtilization)}%`,
                          backgroundColor: barColor
                        }}
                      ></div>
                    </div>
                    
                    {avgUtilization >= 100 && (
                      <div className="text-red-600 text-sm mt-2 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>میانگین استفاده سالانه به 100% رسیده است!</span>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>تفکیک ماهانه:</h5>
                      <div className="grid grid-cols-3 gap-2">
                        {monthlyData.map((monthData) => {
                          const monthName = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][monthData.month - 1];
                          const utilizationPercentage = Math.min(100, monthData.utilization);
                          
                          // انتخاب رنگ بر اساس درصد استفاده
                          let monthBarColor = '#10b981'; // سبز - حالت عادی
                          if (utilizationPercentage >= 100) {
                            monthBarColor = '#ef4444'; // قرمز - ظرفیت تکمیل شده
                          } else if (utilizationPercentage >= 80) {
                            monthBarColor = '#f59e0b'; // زرد - نزدیک به ظرفیت
                          }
                          
                          return (
                            <div key={monthData.month} className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                              <div className="text-xs font-medium mb-1">{monthName}</div>
                              <div className="w-full bg-gray-300 dark:bg-gray-500 rounded-full h-2 mb-1">
                                <div 
                                  className="h-2 rounded-full"
                                  style={{ 
                                    width: `${utilizationPercentage}%`,
                                    backgroundColor: monthBarColor
                                  }}
                                ></div>
                              </div>
                              <div className="text-xs">{utilizationPercentage.toFixed(1)}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* نمایش ماه انتخاب شده */
            <div className="space-y-4">
              {(() => {
                const selectedMonthData = monthlyData.find(m => m.month === selectedPersianMonth);
                if (!selectedMonthData) return null;
                
                const monthName = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][selectedMonthData.month - 1];
                // اطمینان از اینکه استفاده از مخزن از 100% فراتر نمی‌رود
                const utilizationPercentage = Math.min(100, selectedMonthData.utilization);
                
                // انتخاب رنگ بر اساس درصد استفاده
                let barColor = '#10b981'; // سبز - حالت عادی
                if (utilizationPercentage >= 100) {
                  barColor = '#ef4444'; // قرمز - ظرفیت تکمیل شده
                } else if (utilizationPercentage >= 80) {
                  barColor = '#f59e0b'; // زرد - نزدیک به ظرفیت
                }
                
                return (
                  <div key={selectedMonthData.month} className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {monthName} {selectedPersianYear}
                      </span>
                      <span className={`text-sm font-medium ${utilizationPercentage >= 100 ? 'text-red-600' : 'text-gray-600'}`}>
                        {utilizationPercentage.toFixed(1)}% ({formatPersianNumber(selectedMonthData.weight)} کیلوگرم)
                      </span>
                    </div>
                    {/* نمایش به صورت خط افقی با درصد مشخص */}
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                      <div 
                        className="h-4 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${utilizationPercentage}%`,
                          backgroundColor: barColor
                        }}
                      ></div>
                    </div>
                    {utilizationPercentage >= 100 && (
                      <div className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>ظرفیت مخزن در این ماه به 100% رسیده است!</span>
                      </div>
                    )}
                    
                    {/* نمایش جزئیات قراردادهای فعال در این ماه */}
                    <div className="mt-4">
                      <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>قراردادهای فعال در این ماه:</h5>
                      <div className="space-y-2">
                        {contracts
                          .filter(contract => {
                            const startPersian = getPersianYearMonth(contract.startDate);
                            const endPersian = getPersianYearMonth(contract.endDate);
                            
                            // Check if the contract is active in the selected month
                            if (selectedPersianYear < startPersian.year || 
                                selectedPersianYear > endPersian.year) return false;
                            if (selectedPersianYear === startPersian.year && 
                                selectedPersianMonth < startPersian.month) return false;
                            if (selectedPersianYear === endPersian.year && 
                                selectedPersianMonth > endPersian.month) return false;
                            
                            return true;
                          })
                          .map(contract => (
                            <div key={contract.id} className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                              <div className="flex justify-between items-center">
                                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {contract.companyName}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  contract.rentalTypeName === 'اجاره کامل مخزن'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {contract.rentalTypeName}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatPersianNumber(contract.contractWeight)} {contract.unit}
                              </div>
                              <div className="text-xs text-gray-500">
                                درصد افت: {contract.wastageRateValue}% - مقدار افت: {formatPersianNumber(contract.dropAmount)} {contract.unit}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
      
      {segments.length === 0 && !showMonthlyView && (
        <div className="text-center py-8 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>هیچ قراردادی برای این مخزن در بازه زمانی انتخاب شده یافت نشد</p>
        </div>
      )}
    </div>
  );
};

// کامپوننت کارت آماری
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  isDarkMode: boolean;
}> = ({ title, value, icon, color, isDarkMode }) => {
  return (
    <div className={`rounded-2xl p-6 shadow-xl transition-all hover:shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center">
        <div className={`p-4 rounded-2xl ${color}`}>
          {icon}
        </div>
        <div className="mr-4">
          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
};

// کامپوننت کارت آماری برای قراردادها
const ContractTypeStatCard: React.FC<{
  title: string;
  count: number;
  companies: string[];
  icon: React.ReactNode;
  color: string;
  isDarkMode: boolean;
}> = ({ title, count, companies, icon, color, isDarkMode }) => {
  return (
    <div className={`rounded-2xl p-6 shadow-xl transition-all hover:shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-4 rounded-2xl ${color}`}>
            {icon}
          </div>
          <div className="mr-4">
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{count}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>طرف حساب‌ها</p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {companies.length > 3 ? `${companies.slice(0, 3).join(', ')} و ${companies.length - 3} دیگر` : companies.join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
};

// کامپوننت نمودار روند نرخ اجاره
const RentalRateTrendsChart: React.FC<{
  contracts: Contract[];
  isDarkMode: boolean;
  selectedYear: number;
  selectedMonth: number | null;
}> = ({ contracts, isDarkMode, selectedYear, selectedMonth }) => {
  // تبدیل تاریخ میلادی به سال و ماه شمسی
  const getPersianYearMonth = (date: Date): string => {
    const persianDate = formatPersianDate(date);
    const parts = persianDate.split('/');
    return `${parts[0]}/${parts[1]}`;
  };
  
  // آماده‌سازی داده‌ها برای نمودار
  const prepareChartData = () => {
    const dataMap: Record<string, Record<string, number>> = {};
    
    contracts.forEach(contract => {
      const yearMonth = getPersianYearMonth(contract.startDate);
      const company = contract.companyName;
      
      // فیلتر بر اساس سال و ماه انتخاب شده
      const [year, month] = yearMonth.split('/').map(Number);
      if (year !== selectedYear) return;
      
      // اگر ماه خاصی انتخاب شده باشد، فقط آن ماه را نمایش بده
      if (selectedMonth !== null && month !== selectedMonth) return;
      
      if (!dataMap[yearMonth]) {
        dataMap[yearMonth] = {};
      }
      
      dataMap[yearMonth][company] = contract.rentalRate;
    });
    
    // تبدیل به آرایه برای نمودار
    const result = Object.keys(dataMap).map(yearMonth => {
      const entry: any = { yearMonth };
      
      Object.keys(dataMap[yearMonth]).forEach(company => {
        entry[company] = dataMap[yearMonth][company];
      });
      
      return entry;
    });
    
    // مرتب‌سازی بر اساس سال و ماه
    return result.sort((a, b) => {
      const [aYear, aMonth] = a.yearMonth.split('/').map(Number);
      const [bYear, bMonth] = b.yearMonth.split('/').map(Number);
      
      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });
  };
  
  const chartData = prepareChartData();
  
  // دریافت لیست تمام شرکت‌ها برای رنگ‌بندی
  const companies = [...new Set(contracts.map(c => c.companyName))];
  
  // رنگ‌های پیش‌فرض برای شرکت‌ها
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c',
    '#d0ed57', '#ff8042', '#0088fe', '#00c49f', '#ffbb28'
  ];
  
  // محاسبه مقادیر برای رسم نمودار
  const maxRate = Math.max(...contracts.map(c => c.rentalRate));
  const minRate = Math.min(...contracts.map(c => c.rentalRate));
  const rateRange = maxRate - minRate;
  const padding = rateRange * 0.1; // 10% padding
  
  return (
    <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          روند نرخ اجاره به تفکیک طرف حساب
          {selectedMonth !== null && (
            <span className="text-sm font-normal mr-2">
              - {['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][selectedMonth - 1]} {selectedYear}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-gray-500">نرخ اجاره (ریال)</span>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          {companies.map((company, index) => (
            <div key={company} className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {company}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="relative h-96 overflow-x-auto">
        <svg width="100%" height="100%" viewBox={`0 0 ${chartData.length * 100} 350`} preserveAspectRatio="xMidYMid meet">
          {/* محور X */}
          <line 
            x1="50" 
            y1="300" 
            x2={chartData.length * 100 - 20} 
            y2="300" 
            stroke={isDarkMode ? '#4b5563' : '#e5e7eb'} 
            strokeWidth="2"
          />
          
          {/* محور Y */}
          <line 
            x1="50" 
            y1="30" 
            x2="50" 
            y2="300" 
            stroke={isDarkMode ? '#4b5563' : '#e5e7eb'} 
            strokeWidth="2"
          />
          
          {/* برچسب‌های محور X */}
          {chartData.map((data, index) => (
            <text
              key={index}
              x={50 + index * 100}
              y="320"
              textAnchor="middle"
              fill={isDarkMode ? '#9ca3af' : '#6b7280'}
              fontSize="12"
            >
              {data.yearMonth}
            </text>
          ))}
          
          {/* برچسب‌های محور Y */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const value = minRate + (maxRate - minRate) * ratio;
            const y = 300 - (270 * ratio);
            return (
              <g key={index}>
                <text
                  x="40"
                  y={y + 5}
                  textAnchor="end"
                  fill={isDarkMode ? '#9ca3af' : '#6b7280'}
                  fontSize="12"
                >
                  {formatPersianNumber(Math.round(value))}
                </text>
                <line
                  x1="45"
                  y1={y}
                  x2="50"
                  y2={y}
                  stroke={isDarkMode ? '#4b5563' : '#e5e7eb'}
                  strokeWidth="1"
                />
              </g>
            );
          })}
          
          {/* خطوط نمودار */}
          {companies.map((company, companyIndex) => {
            const points = chartData.map((data, index) => {
              const rate = data[company];
              if (rate === undefined) return null;
              
              const normalizedRate = (rate - minRate) / (maxRate - minRate);
              const x = 50 + index * 100;
              const y = 300 - (normalizedRate * 270);
              
              return { x, y, rate };
            }).filter(point => point !== null);
            
            if (points.length < 2) return null;
            
            return (
              <g key={company}>
                {/* خط */}
                <polyline
                  points={points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={colors[companyIndex % colors.length]}
                  strokeWidth="3"
                />
                
                {/* نقاط داده */}
                {points.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={colors[companyIndex % colors.length]}
                    stroke="white"
                    strokeWidth="2"
                  >
                    <title>
                      {company}: {formatPersianNumber(point.rate)} ریال
                    </title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const ContractManager: React.FC = () => {
  const storage = DataStorage.getInstance();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [baseData, setBaseData] = useState<Record<string, BaseDataItem[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [editingContract, setEditingContract] = useState<string | null>(null);
  const [newContract, setNewContract] = useState<Partial<Contract>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState<FilterConfig>({});
  const [showCharts, setShowCharts] = useState(false);
  const [selectedPersianYear, setSelectedPersianYear] = useState(1404); // تغییر به 1404
  const [selectedPersianMonth, setSelectedPersianMonth] = useState<number | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(''); // فیلتر سایت
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expandedTank, setExpandedTank] = useState<string | null>(null);
  const [isWeightLocked, setIsWeightLocked] = useState(false);
  const [unitWarning, setUnitWarning] = useState<string | null>(null);
  const [upToDate, setUpToDate] = useState<Date>(new Date());
  const [emptyCapacityDateBasis, setEmptyCapacityDateBasis] = useState<'start' | 'end' | 'registration'>('start');
  
  useEffect(() => {
    const savedContracts = storage.loadData('contracts') || [];
    const contractsArray = Array.isArray(savedContracts) ? savedContracts : [];
    const contractsWithDates = contractsArray.map((contract: any) => {
      // محاسبه مقدار افت اگر وجود نداشته باشد
      const dropAmount = contract.dropAmount !== undefined 
        ? contract.dropAmount 
        : (contract.contractWeight * contract.wastageRateValue) / 100;
      
      // محاسبه ظرفیت باقیمانده با فرمول جدید: ظرفیت مخزن - وزن قرارداد
      const tankCapacity = getTankCapacity(contract.tankId);
      const remainingCapacity = tankCapacity - contract.contractWeight;
      
      return {
        ...contract,
        startDate: new Date(contract.startDate),
        endDate: new Date(contract.endDate),
        createdAt: new Date(contract.createdAt),
        updatedAt: new Date(contract.updatedAt),
        dropAmount,
        remainingCapacity
      };
    });
    setContracts(contractsWithDates);
    
    const categories = storage.loadData('baseDataCategories') || [];
    const categoriesArray = Array.isArray(categories) ? categories : [];
    const loadedBaseData: Record<string, BaseDataItem[]> = {};
    
    categoriesArray.forEach((category: any) => {
      if (category && category.id && category.items) {
        loadedBaseData[category.id] = category.items;
      }
    });
    
    setBaseData(loadedBaseData);
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);
  
  // ذخیره قراردادها
  useEffect(() => {
    if (contracts.length > 0) {
      storage.saveData('contracts', contracts);
    }
  }, [contracts]);
  
  // Helper function for safe number conversion
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    
    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value;
    }
    
    const num = parseFloat(value.toString());
    return isNaN(num) ? defaultValue : num;
  };

  const getTankCapacity = (tankId: string): number => {
    const tanks = baseData['tanks'] || [];
    const tank = tanks.find(t => t.id === tankId);
    if (!tank || !tank.capacity) return 5000000;
    
    const capacityMatch = tank.capacity.match(/[\d,]+/);
    return capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, '')) : 5000000;
  };
  
  // بررسی همپوشانی تاریخ - حتی یک روز هم نباید همپوشانی داشته باشد
  const hasDateOverlap = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
    // تبدیل به تاریخ بدون ساعت برای مقایسه دقیق
    const s1 = new Date(start1.getFullYear(), start1.getMonth(), start1.getDate());
    const e1 = new Date(end1.getFullYear(), end1.getMonth(), end1.getDate());
    const s2 = new Date(start2.getFullYear(), start2.getMonth(), start2.getDate());
    const e2 = new Date(end2.getFullYear(), end2.getMonth(), end2.getDate());
    
    // بررسی همپوشانی: اگر شروع یکی قبل از پایان دیگری باشد و پایان یکی بعد از شروع دیگری باشد
    // حتی یک روز همپوشانی کافی است
    return s1 <= e2 && s2 <= e1;
  };
  
  // تابع جدید برای بررسی دقیق ظرفیت بر اساس بازه‌های زمانی
  const checkCapacityViolation = (contract: Partial<Contract>): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!contract.tankId || !contract.siteId || !contract.startDate || !contract.endDate || !contract.contractWeight) {
      return errors;
    }
    
    const tankCapacity = getTankCapacity(contract.tankId);
    
    // دریافت همه قراردادهای همپوشانی برای مخزن و سایت مشخص شده
    const overlappingContracts = contracts.filter(existingContract => 
      existingContract.id !== contract.id &&
      existingContract.tankId === contract.tankId &&
      existingContract.siteId === contract.siteId &&
      existingContract.isActive &&
      hasDateOverlap(
        existingContract.startDate,
        existingContract.endDate,
        contract.startDate!,
        contract.endDate!
      )
    );
    
    // ایجاد لیست رویدادها (شروع و پایان قراردادها) برای بررسی دقیق ظرفیت
    const events: Array<{ date: Date, type: 'start' | 'end', weight: number }> = [];
    
    // اضافه کردن قرارداد جدید به لیست رویدادها
    events.push({ date: contract.startDate!, type: 'start', weight: contract.contractWeight! });
    events.push({ date: contract.endDate!, type: 'end', weight: contract.contractWeight! });
    
    // اضافه کردن قراردادهای موجود به لیست رویدادها
    overlappingContracts.forEach(c => {
      events.push({ date: c.startDate, type: 'start', weight: c.contractWeight });
      events.push({ date: c.endDate, type: 'end', weight: c.contractWeight });
    });
    
    // مرتب‌سازی رویدادها بر اساس تاریخ
    events.sort((a, b) => {
      // اگر تاریخ‌ها یکسان باشند، رویدادهای پایان قبل از شروع بیایند
      if (a.date.getTime() === b.date.getTime()) {
        return a.type === 'end' ? -1 : 1;
      }
      return a.date.getTime() - b.date.getTime();
    });
    
    // شبیه‌سازی رویدادها و بررسی ظرفیت در هر لحظه
    let currentWeight = 0;
    for (const event of events) {
      if (event.type === 'start') {
        currentWeight += event.weight;
        if (currentWeight > tankCapacity) {
          errors.push({
            type: 'total_capacity_exceeded',
            message: `مجموع وزن قراردادها در بازه زمانی انتخاب شده از ظرفیت مخزن (${formatPersianNumber(tankCapacity)} کیلوگرم) فراتر رفته است.`
          });
          break;
        }
      } else {
        currentWeight -= event.weight;
      }
    }
    
    return errors;
  };
  
  // تابع تبدیل سال و ماه شمسی به تاریخ میلادی (آخر ماه)
  const persianMonthToDate = (persianYear: number, persianMonth: number): Date => {
    // تبدیل به تاریخ میلادی با استفاده از moment
    const persianDate = moment(`${persianYear}/${persianMonth}/1`, 'jYYYY/jM/jD');
    // آخرین روز ماه
    const lastDayOfMonth = persianDate.endOf('jMonth');
    return lastDayOfMonth.toDate();
  };

  // محاسبه داده‌های استفاده ماهانه برای هر مخزن - تعریف کامل بعد از calculateConsignmentOwnedTanksInventoryUpToDate
  
  // تغییر فرمول محاسبه ظرفیت باقیمانده به: ظرفیت مخزن - وزن قرارداد
  const calculateRemainingCapacity = (contract: Partial<Contract>): number => {
    if (!contract.tankId || contract.contractWeight === undefined) {
      return 0;
    }
    
    const tankCapacity = getTankCapacity(contract.tankId);
    return tankCapacity - contract.contractWeight;
  };

  // Calculate owned tanks inventory
  const calculateOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const allReceiptsData = storage.loadData('receipts');
    const allReceiptsArray = Array.isArray(allReceiptsData) ? allReceiptsData : [];
    const allReceipts = allReceiptsArray.filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= upToDate
    );
    const allAdjustmentsData = storage.loadData('inventoryAdjustments');
    const allAdjustmentsArray = Array.isArray(allAdjustmentsData) ? allAdjustmentsData : [];
    const allAdjustments = allAdjustmentsArray.filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= upToDate
    );
    const allDeliveriesData = storage.loadData('ownership-delivery-slips');
    const allDeliveriesArray = Array.isArray(allDeliveriesData) ? allDeliveriesData : [];
    const allDeliveries = allDeliveriesArray.filter((d: any) => 
      d && typeof d === 'object' && !d.isVoided && new Date(d.deliveryDate) <= upToDate
    );
    
    const siteTankReceipts = allReceipts.filter((r: any) => {
      if (siteId && r.siteId !== siteId) return false;
      if (tankId && r.tankId !== tankId) return false;
      return r.userType === 'owned' && !r.isVoided && new Date(r.receiptDate) <= upToDate;
    });
    
    const siteTankAdjustments = allAdjustments.filter((adj: any) => {
      if (siteId && adj.siteId !== siteId) return false;
      if (tankId && adj.tankId !== tankId) return false;
      return adj.productType === 'owned' && !adj.isVoided && new Date(adj.documentDate) <= upToDate;
    });
    
    const siteTankDeliveries = allDeliveries.filter((d: any) => {
      if (siteId && d.siteId !== siteId) return false;
      if (tankId && d.tankId !== tankId) return false;
      return !d.isVoided && new Date(d.deliveryDate) <= upToDate;
    });

    const ownedReceiptsAmount = siteTankReceipts.reduce((sum: number, r: any) => {
      const amount = r.amount || r.receiptBasisAmount || 0;
      return sum + safeNumber(amount, 0);
    }, 0);

    const ownedAdditionDocuments = siteTankAdjustments
      .filter((adj: any) => adj.adjustmentType === 'addition')
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    const ownedDeliveries = siteTankDeliveries
      .filter((d: any) => !d.isVoided && new Date(d.deliveryDate) <= upToDate)
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    const allWastageTransactionsData = storage.loadData('wastageTransactions');
    const allWastageTransactionsArray = Array.isArray(allWastageTransactionsData) ? allWastageTransactionsData : [];
    const allWastageTransactions = allWastageTransactionsArray.filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= upToDate
    );
    const ownedGainedAmount = allWastageTransactions.filter((t: any) => 
      t.transactionType === 'owned' && 
      !t.isVoided &&
      (siteId ? t.siteId === siteId : true) &&
      (tankId ? t.tankId === tankId : true)
    ).reduce((sum: number, t: any) => {
      const amount = safeNumber(t.amount, 0);
      return sum + Math.abs(amount);
    }, 0);

    const ownedDeductionDocuments = siteTankAdjustments
      .filter((adj: any) => adj.adjustmentType === 'deduction' && !adj.isVoided && new Date(adj.documentDate) <= upToDate)
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    const allConversionsData = storage.loadData('productConversions');
    const allConversionsArray = Array.isArray(allConversionsData) ? allConversionsData : [];
    const allConversions = allConversionsArray.filter((c: any) => 
      c && typeof c === 'object' && !c.isVoided && new Date(c.documentDate) <= upToDate
    );
    const siteTankConversions = allConversions.filter((c: any) => {
      if (siteId && c.siteId !== siteId) return false;
      if (tankId && c.tankId !== tankId) return false;
      return true;
    });
    
    const ownedConsumedProducts = siteTankConversions
      .filter((c: any) => c.consumedProductType === 'owned')
      .reduce((sum: number, c: any) => sum + safeNumber(c.consumedQuantity, 0), 0);
    
    const ownedProducedProducts = siteTankConversions
      .filter((c: any) => c.producedProductType === 'owned')
      .reduce((sum: number, c: any) => sum + safeNumber(c.producedQuantity, 0), 0);

    const totalOwnedValue = ownedReceiptsAmount + ownedAdditionDocuments + ownedGainedAmount + ownedProducedProducts - ownedDeliveries - ownedDeductionDocuments - ownedConsumedProducts;

    return {
      ownedReceiptsAmount,
      ownedAdditionDocuments,
      ownedDeliveries,
      ownedGainedAmount,
      ownedDeductionDocuments,
      ownedConsumedProducts,
      ownedProducedProducts,
      finalInventory: totalOwnedValue
    };
  }, [upToDate, storage]);

  // Calculate consignment tanks inventory
  const calculateConsignmentTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const allReceiptsData = storage.loadData('receipts');
    const allReceiptsArray = Array.isArray(allReceiptsData) ? allReceiptsData : [];
    const allReceipts = allReceiptsArray.filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= upToDate
    );
    const allAdjustmentsData = storage.loadData('inventoryAdjustments');
    const allAdjustmentsArray = Array.isArray(allAdjustmentsData) ? allAdjustmentsData : [];
    const allAdjustments = allAdjustmentsArray.filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= upToDate
    );
    
    const consignmentSlipsData = storage.loadData('consignment-delivery-slips');
    const consignmentSlipsArray = Array.isArray(consignmentSlipsData) ? consignmentSlipsData : [];
    const consignmentSlips = consignmentSlipsArray.filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      const dateValue = d.deliveryDate || d.slipDate;
      if (!dateValue || dateValue === undefined || dateValue === null) {
        return true;
      }
      const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (isNaN(deliveryDate.getTime())) {
        return true;
      }
      return deliveryDate <= upToDate;
    }) as any[];

    const generalDeliveriesData = storage.loadData('deliveries');
    const generalDeliveriesArray = Array.isArray(generalDeliveriesData) ? generalDeliveriesData : [];
    const generalDeliveries = generalDeliveriesArray.filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      const dateValue = d.deliveryDate || d.createdAt;
      if (!dateValue) return false;
      const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (isNaN(deliveryDate.getTime())) return false;
      return deliveryDate <= upToDate;
    }) as any[];
    
    const consignmentReceipts = allReceipts.filter((r: any) => 
      r && typeof r === 'object' &&
      r.userType === 'consignment' && 
      !r.isVoided &&
      (siteId ? r.siteId === siteId : true) &&
      (tankId ? r.tankId === tankId : true)
    );
    
    const consignmentAdditions = allAdjustments
      .filter((adj: any) => 
        adj.adjustmentType === 'addition' && 
        adj.productType === 'consignment' &&
        (siteId ? adj.siteId === siteId : true) &&
        (tankId ? adj.tankId === tankId : true) &&
        !adj.isVoided && new Date(adj.documentDate) <= upToDate
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);
    
    const consignmentDeliveries = [
      ...consignmentSlips,
      ...generalDeliveries.filter(d => {
        const hasConsignmentFeatures = 
          d.contractNumber || 
          d.permitId || 
          d.userType === 'consignment' ||
          d.type === 'امانی' ||
          d.nature === 'consignment';
        return hasConsignmentFeatures;
      })
    ]
    .filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      return (!siteId || d.siteId === siteId) &&
             (!tankId || d.tankId === tankId);
    })
    .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    const allWastageTransactionsData = storage.loadData('wastageTransactions');
    const allWastageTransactionsArray = Array.isArray(allWastageTransactionsData) ? allWastageTransactionsData : [];
    const allWastageTransactions = allWastageTransactionsArray.filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= upToDate
    );
    
    const consignmentDeductionAmount = allWastageTransactions
      .filter((t: any) => 
        t.transactionType === 'consignment' && 
        !t.isVoided && 
        new Date(t.transactionDate) <= upToDate &&
        (siteId ? t.siteId === siteId : true) &&
        (tankId ? t.tankId === tankId : true)
      )
      .reduce((sum: number, t: any) => sum + Math.abs(safeNumber(t.amount, 0)), 0);
    
    const consignmentDeductionDocuments = allAdjustments
      .filter((adj: any) => 
        adj && typeof adj === 'object' &&
        adj.adjustmentType === 'deduction' && 
        adj.productType === 'consignment' &&
        (siteId ? adj.siteId === siteId : true) &&
        (tankId ? adj.tankId === tankId : true) &&
        !adj.isVoided && new Date(adj.documentDate) <= upToDate
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);
    
    const consignmentReceiptsAmount = consignmentReceipts
      .filter((r: any) => !r.isVoided && new Date(r.receiptDate) <= upToDate)
      .reduce((sum: number, r: any) => {
        let baseAmount = 0;
        if (r.receiptBasisAmount && r.receiptBasisAmount > 0) {
          baseAmount = r.receiptBasisAmount;
        } else if (r.finalAmount && r.finalAmount > 0) {
          baseAmount = r.finalAmount;
        } else if (r.amount && r.amount > 0) {
          baseAmount = r.amount;
        } else {
          baseAmount = (safeNumber(r.shipUnloadingAmount, 0) + 
                       safeNumber(r.tankShoreAmount, 0) + 
                       safeNumber(r.shipBillOfLadingAmount, 0) + 
                       safeNumber(r.weightGross, 0));
        }
        return sum + baseAmount;
    }, 0);

    const allConversionsData = storage.loadData('productConversions');
    const allConversionsArray = Array.isArray(allConversionsData) ? allConversionsData : [];
    const allConversions = allConversionsArray.filter((c: any) => 
      c && typeof c === 'object' && !c.isVoided && new Date(c.documentDate) <= upToDate
    );
    const siteTankConversions = allConversions.filter((c: any) => {
      if (siteId && c.siteId !== siteId) return false;
      if (tankId && c.tankId !== tankId) return false;
      return true;
    });
    
    const consignmentConsumedProducts = siteTankConversions
      .filter((c: any) => c.consumedProductType === 'consignment')
      .reduce((sum: number, c: any) => sum + safeNumber(c.consumedQuantity, 0), 0);
    
    const consignmentProducedProducts = siteTankConversions
      .filter((c: any) => c.producedProductType === 'consignment')
      .reduce((sum: number, c: any) => sum + safeNumber(c.producedQuantity, 0), 0);

    const totalConsignmentValue = consignmentReceiptsAmount + consignmentAdditions + consignmentProducedProducts - consignmentDeliveries - consignmentDeductionAmount - consignmentDeductionDocuments - consignmentConsumedProducts;

    return {
      consignmentReceiptsAmount,
      consignmentAdditions,
      consignmentDeliveries,
      consignmentDeductionAmount,
      consignmentDeductionDocuments,
      consignmentConsumedProducts,
      consignmentProducedProducts,
      finalInventory: totalConsignmentValue
    };
  }, [upToDate, storage]);

  // Calculate consignment+owned tanks inventory
  const calculateConsignmentOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const owned = calculateOwnedTanksInventory(siteId, tankId);
    const consignment = calculateConsignmentTanksInventory(siteId, tankId);
    
    const result = {
      ownedReceiptsAmount: owned.ownedReceiptsAmount,
      ownedAdditionDocuments: owned.ownedAdditionDocuments,
      ownedDeliveries: owned.ownedDeliveries,
      ownedGainedAmount: owned.ownedGainedAmount,
      ownedDeductionDocuments: owned.ownedDeductionDocuments,
      ownedConsumedProducts: owned.ownedConsumedProducts || 0,
      ownedProducedProducts: owned.ownedProducedProducts || 0,
      consignmentReceiptsAmount: consignment.consignmentReceiptsAmount,
      consignmentAdditions: consignment.consignmentAdditions,
      consignmentDeliveries: consignment.consignmentDeliveries,
      consignmentDeductionAmount: consignment.consignmentDeductionAmount,
      consignmentDeductionDocuments: consignment.consignmentDeductionDocuments,
      consignmentConsumedProducts: consignment.consignmentConsumedProducts || 0,
      consignmentProducedProducts: consignment.consignmentProducedProducts || 0,
      finalInventory: owned.finalInventory + consignment.finalInventory
    };

    return result;
  }, [calculateOwnedTanksInventory, calculateConsignmentTanksInventory]);

  // Helper function to calculate inventory up to a specific date
  const calculateConsignmentOwnedTanksInventoryUpToDate = useCallback((siteId: string, tankId: string, date: Date) => {
    // Create temporary versions of calculate functions that use the provided date instead of upToDate
    const allReceiptsData = storage.loadData('receipts');
    const allReceiptsArray = Array.isArray(allReceiptsData) ? allReceiptsData : [];
    const allReceipts = allReceiptsArray.filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= date
    );
    const allAdjustmentsData = storage.loadData('inventoryAdjustments');
    const allAdjustmentsArray = Array.isArray(allAdjustmentsData) ? allAdjustmentsData : [];
    const allAdjustments = allAdjustmentsArray.filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= date
    );
    const allDeliveriesData = storage.loadData('ownership-delivery-slips');
    const allDeliveriesArray = Array.isArray(allDeliveriesData) ? allDeliveriesData : [];
    const allDeliveries = allDeliveriesArray.filter((d: any) => 
      d && typeof d === 'object' && !d.isVoided && new Date(d.deliveryDate) <= date
    );
    
    const consignmentSlipsData = storage.loadData('consignment-delivery-slips');
    const consignmentSlipsArray = Array.isArray(consignmentSlipsData) ? consignmentSlipsData : [];
    const consignmentSlips = consignmentSlipsArray.filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      const dateValue = d.deliveryDate || d.slipDate;
      if (!dateValue || dateValue === undefined || dateValue === null) {
        return true;
      }
      const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (isNaN(deliveryDate.getTime())) {
        return true;
      }
      return deliveryDate <= date;
    }) as any[];

    const generalDeliveriesData = storage.loadData('deliveries');
    const generalDeliveriesArray = Array.isArray(generalDeliveriesData) ? generalDeliveriesData : [];
    const generalDeliveries = generalDeliveriesArray.filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      const dateValue = d.deliveryDate || d.createdAt;
      if (!dateValue) return false;
      const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (isNaN(deliveryDate.getTime())) return false;
      return deliveryDate <= date;
    }) as any[];

    const allWastageTransactionsData = storage.loadData('wastageTransactions');
    const allWastageTransactionsArray = Array.isArray(allWastageTransactionsData) ? allWastageTransactionsData : [];
    const allWastageTransactions = allWastageTransactionsArray.filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= date
    );

    const allConversionsData = storage.loadData('productConversions');
    const allConversionsArray = Array.isArray(allConversionsData) ? allConversionsData : [];
    const allConversions = allConversionsArray.filter((c: any) => 
      c && typeof c === 'object' && !c.isVoided && new Date(c.documentDate) <= date
    );

    // Calculate owned inventory
    const siteTankReceipts = allReceipts.filter((r: any) => {
      if (r.siteId !== siteId) return false;
      if (r.tankId !== tankId) return false;
      return r.userType === 'owned' && !r.isVoided && new Date(r.receiptDate) <= date;
    });

    const siteTankAdjustments = allAdjustments.filter((adj: any) => {
      if (adj.siteId !== siteId) return false;
      if (adj.tankId !== tankId) return false;
      return adj.productType === 'owned' && !adj.isVoided && new Date(adj.documentDate) <= date;
    });

    const siteTankDeliveries = allDeliveries.filter((d: any) => {
      if (d.siteId !== siteId) return false;
      if (d.tankId !== tankId) return false;
      return !d.isVoided && new Date(d.deliveryDate) <= date;
    });

    const ownedReceiptsAmount = siteTankReceipts.reduce((sum: number, r: any) => {
      const amount = r.amount || r.receiptBasisAmount || 0;
      return sum + safeNumber(amount, 0);
    }, 0);

    const ownedAdditionDocuments = siteTankAdjustments
      .filter((adj: any) => adj.adjustmentType === 'addition')
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    const ownedDeliveries = siteTankDeliveries
      .filter((d: any) => !d.isVoided && new Date(d.deliveryDate) <= date)
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    const ownedGainedAmount = allWastageTransactions.filter((t: any) => 
      t.transactionType === 'owned' && 
      !t.isVoided &&
      t.siteId === siteId &&
      t.tankId === tankId
    ).reduce((sum: number, t: any) => {
      const amount = safeNumber(t.amount, 0);
      return sum + Math.abs(amount);
    }, 0);

    const ownedDeductionDocuments = siteTankAdjustments
      .filter((adj: any) => adj.adjustmentType === 'deduction' && !adj.isVoided && new Date(adj.documentDate) <= date)
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    const siteTankConversions = allConversions.filter((c: any) => {
      if (c.siteId !== siteId) return false;
      if (c.tankId !== tankId) return false;
      return true;
    });
    
    const ownedConsumedProducts = siteTankConversions
      .filter((c: any) => c.consumedProductType === 'owned')
      .reduce((sum: number, c: any) => sum + safeNumber(c.consumedQuantity, 0), 0);
    
    const ownedProducedProducts = siteTankConversions
      .filter((c: any) => c.producedProductType === 'owned')
      .reduce((sum: number, c: any) => sum + safeNumber(c.producedQuantity, 0), 0);

    const totalOwnedValue = ownedReceiptsAmount + ownedAdditionDocuments + ownedGainedAmount + ownedProducedProducts - ownedDeliveries - ownedDeductionDocuments - ownedConsumedProducts;

    // Calculate consignment inventory
    const consignmentReceipts = allReceipts.filter((r: any) => 
      r && typeof r === 'object' &&
      r.userType === 'consignment' && 
      !r.isVoided &&
      r.siteId === siteId &&
      r.tankId === tankId
    );
    
    const consignmentAdditions = allAdjustments
      .filter((adj: any) => 
        adj.adjustmentType === 'addition' && 
        adj.productType === 'consignment' &&
        adj.siteId === siteId &&
        adj.tankId === tankId &&
        !adj.isVoided && new Date(adj.documentDate) <= date
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);
    
    const consignmentDeliveries = [
      ...consignmentSlips,
      ...generalDeliveries.filter(d => {
        const hasConsignmentFeatures = 
          d.contractNumber || 
          d.permitId || 
          d.userType === 'consignment' ||
          d.type === 'امانی' ||
          d.nature === 'consignment';
        return hasConsignmentFeatures;
      })
    ]
    .filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      return d.siteId === siteId && d.tankId === tankId;
    })
    .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    const consignmentDeductionAmount = allWastageTransactions
      .filter((t: any) => 
        t.transactionType === 'consignment' && 
        !t.isVoided && 
        new Date(t.transactionDate) <= date &&
        t.siteId === siteId &&
        t.tankId === tankId
      )
      .reduce((sum: number, t: any) => sum + Math.abs(safeNumber(t.amount, 0)), 0);
    
    const consignmentDeductionDocuments = allAdjustments
      .filter((adj: any) => 
        adj && typeof adj === 'object' &&
        adj.adjustmentType === 'deduction' && 
        adj.productType === 'consignment' &&
        adj.siteId === siteId &&
        adj.tankId === tankId &&
        !adj.isVoided && new Date(adj.documentDate) <= date
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);
    
    const consignmentReceiptsAmount = consignmentReceipts
      .filter((r: any) => !r.isVoided && new Date(r.receiptDate) <= date)
      .reduce((sum: number, r: any) => {
        let baseAmount = 0;
        if (r.receiptBasisAmount && r.receiptBasisAmount > 0) {
          baseAmount = r.receiptBasisAmount;
        } else if (r.finalAmount && r.finalAmount > 0) {
          baseAmount = r.finalAmount;
        } else if (r.amount && r.amount > 0) {
          baseAmount = r.amount;
        } else {
          baseAmount = (safeNumber(r.shipUnloadingAmount, 0) + 
                       safeNumber(r.tankShoreAmount, 0) + 
                       safeNumber(r.shipBillOfLadingAmount, 0) + 
                       safeNumber(r.weightGross, 0));
        }
        return sum + baseAmount;
    }, 0);

    const consignmentConsumedProducts = siteTankConversions
      .filter((c: any) => c.consumedProductType === 'consignment')
      .reduce((sum: number, c: any) => sum + safeNumber(c.consumedQuantity, 0), 0);
    
    const consignmentProducedProducts = siteTankConversions
      .filter((c: any) => c.producedProductType === 'consignment')
      .reduce((sum: number, c: any) => sum + safeNumber(c.producedQuantity, 0), 0);

    const totalConsignmentValue = consignmentReceiptsAmount + consignmentAdditions + consignmentProducedProducts - consignmentDeliveries - consignmentDeductionAmount - consignmentDeductionDocuments - consignmentConsumedProducts;

    return {
      ownedInventory: totalOwnedValue,
      consignmentInventory: totalConsignmentValue,
      finalInventory: totalOwnedValue + totalConsignmentValue
    };
  }, [storage]);

  // Helper function to calculate empty capacity for a specific tank
  // محاسبه مشابه "ظرفیت خالی باقیمانده": از تمام وارده‌ها (تملیکی + امانی) تمام صادره‌ها را کسر می‌کند
  const calculateEmptyTankCapacity = useCallback((siteId: string, tankId: string, dateBasis?: 'start' | 'end' | 'registration', contract?: Partial<Contract>) => {
    const tanks = baseData['tanks'] || [];
    const tank = tanks.find((t: any) => t.id === tankId);
    if (!tank) return 0;
    
    const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
    const capacityMatch = capacityStr.match(/[\d,]+/);
    const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, '')) : 5000000;
    
    // تعیین تاریخ مبنا برای محاسبه
    let calculationDate = new Date();
    if (dateBasis) {
      if (contract) {
        // اگر قرارداد موجود است، از تاریخ‌های آن استفاده کن
        if (dateBasis === 'start' && contract.startDate) {
          calculationDate = new Date(contract.startDate);
          calculationDate.setHours(23, 59, 59, 999); // تا پایان روز
        } else if (dateBasis === 'end' && contract.endDate) {
          calculationDate = new Date(contract.endDate);
          calculationDate.setHours(23, 59, 59, 999); // تا پایان روز
        } else if (dateBasis === 'registration' && contract.createdAt) {
          calculationDate = new Date(contract.createdAt);
          calculationDate.setHours(23, 59, 59, 999); // تا پایان روز
        } else if (dateBasis === 'registration' && !contract.createdAt) {
          calculationDate = new Date(); // تاریخ ثبت = تاریخ فعلی
          calculationDate.setHours(23, 59, 59, 999);
        }
      } else {
        // اگر قرارداد جدید است، از newContract استفاده کن
        if (dateBasis === 'start' && newContract.startDate) {
          calculationDate = new Date(newContract.startDate);
          calculationDate.setHours(23, 59, 59, 999); // تا پایان روز
        } else if (dateBasis === 'end' && newContract.endDate) {
          calculationDate = new Date(newContract.endDate);
          calculationDate.setHours(23, 59, 59, 999); // تا پایان روز
        } else if (dateBasis === 'registration') {
          calculationDate = new Date(); // تاریخ ثبت = تاریخ فعلی
          calculationDate.setHours(23, 59, 59, 999);
        }
      }
    }
    
    // محاسبه موجودی فعلی تا تاریخ مبنا
    // فرمول: ظرفیت خالی = ظرفیت - (کلیه وارده‌ها تا تاریخ مبنا) + (کلیه صادره‌ها تا تاریخ مبنا)
    const inventoryData = calculateConsignmentOwnedTanksInventoryUpToDate(siteId, tankId, calculationDate);
    
    // محاسبه کلیه وارده‌ها (تملیکی + امانی)
    const totalInputs = (inventoryData.ownedInventory || 0) + (inventoryData.consignmentInventory || 0);
    // اما موجودی فعلی = وارده - صادره است که در inventoryData.finalInventory محاسبه شده
    // پس ظرفیت خالی = ظرفیت - موجودی فعلی
    const currentInventory = inventoryData.finalInventory || 0;
    
    // فرمول نهایی: ظرفیت خالی = ظرفیت - (وارده - صادره) = ظرفیت - موجودی فعلی
    return Math.max(0, capacity - currentInventory);
  }, [baseData, calculateConsignmentOwnedTanksInventoryUpToDate, newContract]);

  // محاسبه داده‌های استفاده ماهانه برای هر مخزن
  const calculateMonthlyUtilization = useCallback((tankId: string, siteId: string, persianYear: number) => {
    const tankCapacity = getTankCapacity(tankId);
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      year: persianYear,
      utilization: 0,
      weight: 0,
      consignmentInventory: 0,
      ownedInventory: 0
    }));
    
    // Get all contracts for this tank and site
    const tankContracts = contracts.filter(c => c.tankId === tankId && c.siteId === siteId && c.isActive);
    
    // Calculate utilization for each month
    monthlyData.forEach(monthData => {
      // محاسبه تاریخ آخر ماه
      const monthEndDate = persianMonthToDate(persianYear, monthData.month);
      
      // Find contracts active in this month
      const activeContracts = tankContracts.filter(contract => {
        const startPersian = getPersianYearMonth(contract.startDate);
        const endPersian = getPersianYearMonth(contract.endDate);
        
        // Check if the month falls within the contract period
        if (persianYear < startPersian.year || persianYear > endPersian.year) return false;
        if (persianYear === startPersian.year && monthData.month < startPersian.month) return false;
        if (persianYear === endPersian.year && monthData.month > endPersian.month) return false;
        
        return true;
      });
      
      // Sum the weights of active contracts
      const totalWeight = activeContracts.reduce((sum, contract) => sum + contract.contractWeight, 0);
      monthData.weight = totalWeight;
      // اطمینان از اینکه درصد از 100% فراتر نمی‌رود
      monthData.utilization = tankCapacity > 0 ? Math.min(100, (totalWeight / tankCapacity) * 100) : 0;
      
      // محاسبه موجودی امانی و تملیکی برای این ماه
      const monthInventory = calculateConsignmentOwnedTanksInventoryUpToDate(siteId, tankId, monthEndDate);
      monthData.consignmentInventory = monthInventory.consignmentInventory || 0;
      monthData.ownedInventory = monthInventory.ownedInventory || 0;
    });
    
    return monthlyData;
  }, [contracts, calculateConsignmentOwnedTanksInventoryUpToDate, getTankCapacity, persianMonthToDate, getPersianYearMonth]);

  const validateContract = (contract: Partial<Contract>): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // بررسی تمام فیلدهای اجباری
    if (!contract.contractNumber) {
      errors.push({
        type: 'required',
        message: 'شماره قرارداد الزامی است.'
      });
    }
    if (!contract.companyId) {
      errors.push({
        type: 'required',
        message: 'شرکت طرف حساب الزامی است.'
      });
    }
    if (!contract.siteId) {
      errors.push({
        type: 'required',
        message: 'سایت مخازن الزامی است.'
      });
    }
    if (!contract.tankId) {
      errors.push({
        type: 'required',
        message: 'مخزن الزامی است.'
      });
    }
    if (!contract.startDate) {
      errors.push({
        type: 'required',
        message: 'تاریخ شروع الزامی است.'
      });
    }
    if (!contract.endDate) {
      errors.push({
        type: 'required',
        message: 'تاریخ پایان الزامی است.'
      });
    }
    if (!contract.rentalTypeId) {
      errors.push({
        type: 'required',
        message: 'نوع اجاره الزامی است.'
      });
    }
    if (!contract.contractWeight || contract.contractWeight <= 0) {
      errors.push({
        type: 'required',
        message: 'وزن اولیه قرارداد الزامی است.'
      });
    }
    if (!contract.rentalRate || contract.rentalRate <= 0) {
      errors.push({
        type: 'required',
        message: 'نرخ اجاره الزامی است.'
      });
    }
    if (!contract.unit) {
      errors.push({
        type: 'required',
        message: 'واحد سنجش الزامی است.'
      });
    }
    if (!contract.wastageRateId) {
      errors.push({
        type: 'required',
        message: 'درصد افت الزامی است.'
      });
    }
    if (!contract.receiptBasisId) {
      errors.push({
        type: 'required',
        message: 'مبنای رسید الزامی است.'
      });
    }
    
    if (errors.length > 0) {
      return errors;
    }
    
    // بررسی تاریخ پایان
    if (contract.startDate && contract.endDate && contract.endDate <= contract.startDate) {
      errors.push({
        type: 'date_invalid',
        message: 'تاریخ پایان قرارداد باید بعد از تاریخ شروع باشد.'
      });
    }
    
    if (!contract.tankId) {
      return errors;
    }
    const tankCapacity = getTankCapacity(contract.tankId);
    const rentalTypes = baseData['rental-types'] || [];
    const currentRentalType = rentalTypes.find(rt => rt.id === contract.rentalTypeId);
    const isPartialRental = currentRentalType?.name === 'اجاره مقداری مخزن';
    const isFullRental = currentRentalType?.name === 'اجاره کامل مخزن';
    
    // بررسی همپوشانی تاریخ - حتی یک روز هم نباید همپوشانی داشته باشد
    // فقط قراردادهای فعال را در نظر بگیر (قراردادهای غیرفعال از محاسبات خارج می‌شوند)
    const conflictingContracts = contracts.filter(existingContract => 
      existingContract.id !== contract.id &&
      existingContract.tankId === contract.tankId &&
      existingContract.siteId === contract.siteId &&
      existingContract.isActive && // فقط قراردادهای فعال
      hasDateOverlap(
        existingContract.startDate,
        existingContract.endDate,
        contract.startDate!,
        contract.endDate!
      )
    );
    
    if (conflictingContracts.length > 0) {
      errors.push({
        type: 'date_invalid',
        message: `برای این مخزن در بازه زمانی انتخاب شده قرارداد دیگری وجود دارد. حتی یک روز همپوشانی مجاز نیست.`
      });
      return errors; // اگر همپوشانی وجود دارد، دیگر بررسی‌ها لازم نیست
    }
    
    // بررسی ظرفیت خالی مخزن برای قراردادهای اجاره مقداری
    if (isPartialRental && contract.siteId && contract.tankId) {
      // استفاده از تاریخ شروع به عنوان پیش‌فرض برای اعتبارسنجی
      const emptyCapacity = calculateEmptyTankCapacity(contract.siteId, contract.tankId, 'start', contract);
      if (contract.contractWeight && contract.contractWeight > emptyCapacity) {
        errors.push({
          type: 'weight_exceeded',
          message: `وزن قرارداد (${formatPersianNumber(contract.contractWeight)}) نمی‌تواند بیشتر از ظرفیت خالی مخزن (${formatPersianNumber(emptyCapacity)} کیلوگرم) باشد.`
        });
      }
    }
    
    // بررسی ظرفیت اسمی مخزن برای همه قراردادها
    if (contract.contractWeight && contract.contractWeight > tankCapacity) {
      errors.push({
        type: 'weight_exceeded',
        message: `وزن قرارداد (${formatPersianNumber(contract.contractWeight)}) نمی‌تواند بیشتر از ظرفیت مخزن (${formatPersianNumber(tankCapacity)}) باشد.`
      });
      return errors;
    }
    
    // بررسی وجود بیش از یک قرارداد اجاره کامل برای یک مخزن در یک سایت و بازه زمانی
    if (isFullRental) {
      const fullRentalContracts = conflictingContracts.filter(c => {
        const existingRentalType = rentalTypes.find(rt => rt.id === c.rentalTypeId);
        return existingRentalType?.name === 'اجاره کامل مخزن';
      });
      
      if (fullRentalContracts.length > 0) {
        errors.push({
          type: 'full_rental_conflict',
          message: 'نمی‌توان بیش از یک قرارداد اجاره کامل برای یک مخزن در یک سایت و بازه زمانی مشخص ثبت کرد.'
        });
      }
    }
    
    // بررسی تداخل بین اجاره کامل و اجاره مقداری
    if (isPartialRental) {
      const hasFullRental = conflictingContracts.some(c => {
        const existingRentalType = rentalTypes.find(rt => rt.id === c.rentalTypeId);
        return existingRentalType?.name === 'اجاره کامل مخزن';
      });
      
      if (hasFullRental) {
        errors.push({
          type: 'mixed_rental_conflict',
          message: 'نمی‌توان قرارداد اجاره مقداری مخزن ثبت کرد زیرا برای این مخزن، سایت و بازه زمانی قرارداد اجاره کامل وجود دارد.'
        });
      }
    }
    
    if (isFullRental) {
      const hasPartialRental = conflictingContracts.some(c => {
        const existingRentalType = rentalTypes.find(rt => rt.id === c.rentalTypeId);
        return existingRentalType?.name === 'اجاره مقداری مخزن';
      });
      
      if (hasPartialRental) {
        errors.push({
          type: 'mixed_rental_conflict',
          message: 'نمی‌توان قرارداد اجاره کامل مخزن ثبت کرد زیرا برای این مخزن، سایت و بازه زمانی قرارداد اجاره مقداری وجود دارد.'
        });
      }
    }
    
    // بررسی دقیق ظرفیت برای قراردادهای اجاره مقداری
    if (isPartialRental) {
      const capacityErrors = checkCapacityViolation(contract);
      errors.push(...capacityErrors);
    }
    
    return errors;
  };

  // بررسی و تغییر خودکار نوع اجاره از "اجاره کامل مخزن" به "اجاره مقداری مخزن"
  // اگر ظرفیت خالی مخزن کمتر از ظرفیت اولیه باشد
  useEffect(() => {
    // فقط زمانی که فرم باز است
    if (!isAddingNew && !editingContract) {
      return;
    }

    if (!newContract.rentalTypeId || !newContract.siteId || !newContract.tankId) {
      return;
    }

    const rentalTypes = baseData['rental-types'] || [];
    const currentRentalType = rentalTypes.find(rt => rt.id === newContract.rentalTypeId);
    
    // فقط اگر نوع اجاره "اجاره کامل مخزن" باشد
    if (currentRentalType?.name === 'اجاره کامل مخزن') {
      const emptyCapacity = calculateEmptyTankCapacity(newContract.siteId, newContract.tankId, emptyCapacityDateBasis);
      const tankCapacity = getTankCapacity(newContract.tankId);
      
      // اگر ظرفیت خالی کمتر از ظرفیت اولیه باشد (یعنی مقداری از مخزن استفاده شده)
      if (emptyCapacity < tankCapacity) {
        // پیدا کردن نوع اجاره "اجاره مقداری مخزن"
        const partialRentalType = rentalTypes.find(rt => rt.name === 'اجاره مقداری مخزن');
        
        if (partialRentalType && newContract.rentalTypeId !== partialRentalType.id) {
          alert(
            `نوع اجاره "اجاره کامل مخزن" نمی‌تواند انتخاب شود زیرا ظرفیت خالی مخزن (${formatPersianNumber(emptyCapacity)} کیلوگرم) کمتر از ظرفیت اولیه مخزن (${formatPersianNumber(tankCapacity)} کیلوگرم) است.\n\n` +
            `نوع اجاره به صورت خودکار به "اجاره مقداری مخزن" تغییر یافت.`
          );
          setNewContract(prev => ({ ...prev, rentalTypeId: partialRentalType.id }));
          setIsWeightLocked(false); // باز کردن قفل وزن
        }
      } else {
        // اگر ظرفیت خالی برابر با ظرفیت اولیه باشد، وزن را قفل کن
        setIsWeightLocked(true);
        // تنظیم وزن به ظرفیت کامل مخزن
        if (newContract.contractWeight !== tankCapacity) {
          setNewContract(prev => ({ ...prev, contractWeight: tankCapacity }));
        }
      }
    } else {
      // اگر نوع اجاره "اجاره مقداری مخزن" باشد، قفل وزن را باز کن
      if (isWeightLocked) {
        setIsWeightLocked(false);
      }
    }
  }, [newContract.rentalTypeId, newContract.siteId, newContract.tankId, newContract.contractWeight, baseData, calculateEmptyTankCapacity, isAddingNew, editingContract, isWeightLocked]);
  
  const handleSave = () => {
    if (!newContract.contractNumber || !newContract.companyId || !newContract.startDate || 
        !newContract.endDate || !newContract.rentalTypeId || !newContract.siteId || 
        !newContract.tankId || !newContract.contractWeight || !newContract.rentalRate || 
        !newContract.unit || !newContract.wastageRateId || !newContract.receiptBasisId) {
      alert('لطفاً تمام فیلدهای اجباری را پر کنید.');
      return;
    }
    
    // بررسی و تصحیح خودکار وزن قرارداد با ظرفیت خالی مخزن
    let correctedContract = { ...newContract };
    if (newContract.siteId && newContract.tankId) {
      const emptyCapacity = calculateEmptyTankCapacity(newContract.siteId, newContract.tankId, emptyCapacityDateBasis);
      if (newContract.contractWeight && newContract.contractWeight > emptyCapacity) {
        alert(
          `مقدار وارد شده (${formatPersianNumber(newContract.contractWeight)} کیلوگرم) بیشتر از ظرفیت خالی مخزن (${formatPersianNumber(emptyCapacity)} کیلوگرم) است.\n\n` +
          `مقدار به صورت خودکار به ${formatPersianNumber(emptyCapacity)} کیلوگرم تنظیم شد.`
        );
        correctedContract = { ...newContract, contractWeight: emptyCapacity };
        setNewContract(correctedContract);
      }
    }
    
    const errors = validateContract(correctedContract);
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      return;
    }
    
    // محاسبه ظرفیت باقیمانده با فرمول جدید
    const remainingCapacity = calculateRemainingCapacity(correctedContract);
    
    const companies = baseData['companies'] || [];
    const sites = baseData['sites'] || [];
    const tanks = baseData['tanks'] || [];
    const rentalTypes = baseData['rental-types'] || [];
    const wastageRates = baseData['wastage-rates'] || [];
    const receiptBasis = baseData['receipt-basis'] || [];
    
    const company = companies.find(c => c.id === correctedContract.companyId);
    const site = sites.find(s => s.id === correctedContract.siteId);
    const tank = tanks.find(t => t.id === correctedContract.tankId);
    const rentalType = rentalTypes.find(rt => rt.id === correctedContract.rentalTypeId);
    const wastageRate = wastageRates.find(wr => wr.id === correctedContract.wastageRateId);
    const receiptBasisItem = receiptBasis.find(rb => rb.id === correctedContract.receiptBasisId);
    
    // استخراج مقدار عددی درصد افت
    let wastageRateValue = 0.5; // مقدار پیش فرض
    if (wastageRate && wastageRate.name) {
      // استخراج عدد از رشته (مثال: "0.5%" -> 0.5)
      const match = wastageRate.name.match(/(\d+\.?\d*)%/);
      if (match) {
        wastageRateValue = parseFloat(match[1]);
      }
    }
    
    // محاسبه مقدار افت
    const dropAmount = (correctedContract.contractWeight! * wastageRateValue) / 100;
    
    // اصلاح مشکل ویرایش قرارداد - حفظ شناسه اصلی قرارداد
    const contractData: Contract = {
      ...correctedContract,
      id: editingContract || `contract_${Date.now()}`,
      contractNumber: correctedContract.contractNumber!,
      companyName: company?.name || '',
      siteName: site?.name || '',
      tankName: tank?.name || '',
      rentalTypeName: rentalType?.name || '',
      wastageRateName: wastageRate?.name || '',
      wastageRateValue,
      dropAmount,
      unit: correctedContract.unit || 'کیلوگرم',
      receiptBasisName: receiptBasisItem?.name || '',
      remainingWeight: correctedContract.contractWeight!,
      remainingCapacity: remainingCapacity,
      isActive: correctedContract.isActive ?? true,
      emptyCapacityDateBasis: emptyCapacityDateBasis, // ذخیره تاریخ مبنای ظرفیت خالی
      createdAt: editingContract ? 
        contracts.find(c => c.id === editingContract)?.createdAt || new Date() : 
        new Date(),
      updatedAt: new Date()
    } as Contract;
    
        if (editingContract) {
          setContracts(prev => prev.map(c => c.id === editingContract ? contractData : c));
          logSaveAction('قرارداد', contractData.contractNumber, { action: 'edit' });
        } else {
          setContracts(prev => [...prev, contractData]);
          logCreateAction('قرارداد', contractData.contractNumber);
        }


      // ثبت لاگ فعالیت کاربر
      if (typeof (window as any).logUserActivity === 'function') {
        const user = storage.loadData('currentUser') as any;
        (window as any).logUserActivity(
          user?.id || 'unknown',
          user?.fullName || 'کاربر سیستم',
          editingContract ? 'ویرایش قرارداد' : 'ثبت قرارداد جدید',
          'contracts',
          'success',
          'مدیریت قراردادها',
          editingContract ? 'دکمه بروزرسانی' : 'دکمه ثبت',
          { contractNumber: contractData.contractNumber }
        );
      }
      
      setEditingContract(null);
    setIsAddingNew(false);
    setNewContract({});
    setValidationErrors([]);
    setIsWeightLocked(false);
    setUnitWarning(null);
  };
  
  const handleEdit = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      setEditingContract(contractId);
      // اطمینان از کپی صحیح تمام مقادیر شامل تاریخ‌ها
      setNewContract({
        ...contract,
        startDate: new Date(contract.startDate),
        endDate: new Date(contract.endDate),
        createdAt: new Date(contract.createdAt),
        updatedAt: new Date(contract.updatedAt)
      });
      // تنظیم تاریخ مبنای ظرفیت خالی
      if (contract.emptyCapacityDateBasis) {
        setEmptyCapacityDateBasis(contract.emptyCapacityDateBasis);
      } else {
        setEmptyCapacityDateBasis('start'); // پیش‌فرض
      }
      setValidationErrors([]);
      
      // بررسی اگر نوع اجاره "اجاره کامل مخزن" باشد، فیلد وزن را قفل کن
      if (contract.rentalTypeName === 'اجاره کامل مخزن') {
        setIsWeightLocked(true);
      }
    }
  };
  
  const handleCancel = () => {
    setEditingContract(null);
    setIsAddingNew(false);
    setNewContract({});
    setValidationErrors([]);
    setIsWeightLocked(false);
    setUnitWarning(null);
  };
  
  // بررسی اینکه آیا قرارداد تراکنش دارد یا نه
  const hasContractTransactions = useCallback((contractId: string): boolean => {
    // بررسی رسیدها
    const receipts = storage.loadData('receipts') || [];
    const receiptsArray = Array.isArray(receipts) ? receipts : [];
    const hasReceipts = receiptsArray.some((r: any) => 
      r && typeof r === 'object' && r.contractId === contractId && !r.isVoided
    );
    if (hasReceipts) return true;
    
    // بررسی حواله‌ها
    const deliveries = storage.loadData('deliveries') || [];
    const deliveriesArray = Array.isArray(deliveries) ? deliveries : [];
    const hasDeliveries = deliveriesArray.some((d: any) => 
      d && typeof d === 'object' && d.contractId === contractId && !d.isVoided
    );
    if (hasDeliveries) return true;
    
    // بررسی حواله‌های امانی
    const consignmentDeliveries = storage.loadData('consignment-delivery-slips') || [];
    const consignmentDeliveriesArray = Array.isArray(consignmentDeliveries) ? consignmentDeliveries : [];
    const hasConsignmentDeliveries = consignmentDeliveriesArray.some((d: any) => 
      d && typeof d === 'object' && d.contractNumber && !d.isVoided
    );
    if (hasConsignmentDeliveries) {
      const contract = contracts.find(c => c.id === contractId);
      if (contract && consignmentDeliveriesArray.some((d: any) => d.contractNumber === contract.contractNumber)) {
        return true;
      }
    }
    
    // بررسی حواله‌های تملیکی
    const ownershipDeliveries = storage.loadData('ownership-delivery-slips') || [];
    const ownershipDeliveriesArray = Array.isArray(ownershipDeliveries) ? ownershipDeliveries : [];
    const hasOwnershipDeliveries = ownershipDeliveriesArray.some((d: any) => 
      d && typeof d === 'object' && d.contractId === contractId && !d.isVoided
    );
    if (hasOwnershipDeliveries) return true;
    
    // بررسی تنظیمات موجودی
    const adjustments = storage.loadData('inventoryAdjustments') || [];
    const adjustmentsArray = Array.isArray(adjustments) ? adjustments : [];
    const hasAdjustments = adjustmentsArray.some((a: any) => 
      a && typeof a === 'object' && a.contractId === contractId && !a.isVoided
    );
    if (hasAdjustments) return true;
    
    // بررسی تبدیلات محصول
    const conversions = storage.loadData('productConversions') || [];
    const conversionsArray = Array.isArray(conversions) ? conversions : [];
    const hasConversions = conversionsArray.some((c: any) => 
      c && typeof c === 'object' && c.contractId === contractId && !c.isVoided
    );
    if (hasConversions) return true;
    
    // بررسی فاکتورها
    const invoices = storage.loadData('invoices') || [];
    const invoicesArray = Array.isArray(invoices) ? invoices : [];
    const hasInvoices = invoicesArray.some((inv: any) => 
      inv && typeof inv === 'object' && inv.contractId === contractId
    );
    if (hasInvoices) return true;
    
    // بررسی مجوزها
    const permits = storage.loadData('deliveryPermits') || [];
    const permitsArray = Array.isArray(permits) ? permits : [];
    const hasPermits = permitsArray.some((p: any) => {
      if (!p || typeof p !== 'object') return false;
      const receipt = receiptsArray.find((r: any) => r.id === p.receiptId);
      return receipt && receipt.contractId === contractId;
    });
    if (hasPermits) return true;
    
    return false;
  }, [contracts, storage]);

    const handleDelete = (contractId: string) => {
      // بررسی اینکه آیا قرارداد تراکنش دارد یا نه
      if (hasContractTransactions(contractId)) {
        alert('این قرارداد را نمی‌توان حذف کرد زیرا در سایر بخش‌های برنامه تراکنش‌هایی برای آن ثبت شده است.');
        return;
      }
      
      if (confirm('آیا از حذف این قرارداد اطمینان دارید؟')) {
        const contractToDelete = contracts.find(c => c.id === contractId);
        setContracts(prev => prev.filter(c => c.id !== contractId));
        if (contractToDelete) {
          logDeleteAction('قرارداد', contractToDelete.contractNumber);
        }
      }
    };

  
  const handleToggleActive = (contractId: string) => {
    setContracts(prev => prev.map(c => 
      c.id === contractId 
        ? { ...c, isActive: !c.isActive, updatedAt: new Date() }
        : c
    ));
  };
  
  const handleSort = (key: keyof Contract) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const handleFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleExcelExport = () => {
    const excelData = filteredContracts.map(contract => ({
      'شماره قرارداد': contract.contractNumber,
      'شرکت طرف حساب': contract.companyName,
      'سایت': contract.siteName,
      'مخزن': contract.tankName,
      'نوع اجاره': contract.rentalTypeName,
      'وزن قرارداد': contract.contractWeight,
      'نرخ اجاره': contract.rentalRate,
      'مبلغ قرارداد': contract.contractWeight * contract.rentalRate,
      'درصد افت': contract.wastageRateName,
      'مقدار درصد افت': contract.wastageRateValue,
      'مقدار افت محاسبه شده': contract.dropAmount,
      'واحد سنجش': contract.unit,
      'مبنای رسید': contract.receiptBasisName,
      'ظرفیت باقیمانده': contract.remainingCapacity,
      'تاریخ شروع': formatPersianDate(contract.startDate),
      'تاریخ پایان': formatPersianDate(contract.endDate),
      'وضعیت': contract.isActive ? 'فعال' : 'غیرفعال',
      'تاریخ ایجاد': formatPersianDate(contract.createdAt),
      'آخرین بروزرسانی': formatPersianDate(contract.updatedAt)
    }));
    
    exportToExcel({
      filename: `قراردادها_${formatPersianDate(new Date())}`,
      sheetName: 'لیست قراردادها',
      title: 'گزارش قراردادهای اجاره مخازن',
      subtitle: `تاریخ تهیه: ${formatPersianDate(new Date())}`,
      columns: [
        { key: 'شماره قرارداد', header: 'شماره قرارداد', width: 15 },
        { key: 'شرکت طرف حساب', header: 'شرکت طرف حساب', width: 20 },
        { key: 'سایت', header: 'سایت', width: 15 },
        { key: 'مخزن', header: 'مخزن', width: 12 },
        { key: 'نوع اجاره', header: 'نوع اجاره', width: 18 },
        { key: 'وزن قرارداد', header: 'وزن قرارداد', width: 15 },
        { key: 'نرخ اجاره', header: 'نرخ اجاره', width: 15 },
        { key: 'مبلغ قرارداد', header: 'مبلغ قرارداد', width: 15 },
        { key: 'درصد افت', header: 'درصد افت', width: 12 },
        { key: 'درصد افت', header: 'درصد افت', width: 12 },
        { key: 'مقدار افت محاسبه شده', header: 'مقدار افت محاسبه شده', width: 18 },
        { key: 'واحد سنجش', header: 'واحد سنجش', width: 12 },
        { key: 'مبنای رسید', header: 'مبنای رسید', width: 20 },
        { key: 'ظرفیت باقیمانده', header: 'ظرفیت باقیمانده', width: 18 },
        { key: 'تاریخ شروع', header: 'تاریخ شروع', width: 12 },
        { key: 'تاریخ پایان', header: 'تاریخ پایان', width: 12 },
        { key: 'وضعیت', header: 'وضعیت', width: 10 },
        { key: 'تاریخ ایجاد', header: 'تاریخ ایجاد', width: 12 },
        { key: 'آخرین بروزرسانی', header: 'آخرین بروزرسانی', width: 15 }
      ],
      data: excelData
    });
  };
  
  const filteredContracts = contracts
    .filter(contract => {
      // بهبود جستجو برای بررسی تمام اطلاعات ثبت شده در لیست قراردادها
      const matchesSearch = 
        contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.tankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.rentalTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.wastageRateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.receiptBasisName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatPersianNumber(contract.contractWeight).includes(searchTerm) ||
        formatPersianNumber(contract.rentalRate).includes(searchTerm) ||
        formatPersianDate(contract.startDate).includes(searchTerm) ||
        formatPersianDate(contract.endDate).includes(searchTerm);
      
      if (!matchesSearch) return false;
      
      for (const [key, value] of Object.entries(filters)) {
        if (value) {
          if (key === 'isActive') {
            const isActiveValue = value === 'true';
            if (contract.isActive !== isActiveValue) {
              return false;
            }
          } else if (contract[key as keyof Contract] !== value) {
            return false;
          }
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === undefined || bValue === undefined) return 0;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  
  const getChartData = () => {
    const tanks = baseData['tanks'] || [];
    const sites = baseData['sites'] || [];
    
    // فیلتر کردن قراردادها بر اساس سال و ماه شمسی انتخاب شده - فقط قراردادهای فعال
    const filteredByDate = contracts.filter(contract => {
      // فقط قراردادهای فعال را در نظر بگیر
      if (!contract.isActive) return false;
      const startPersian = getPersianYearMonth(contract.startDate);
      const endPersian = getPersianYearMonth(contract.endDate);
      
      // اگر ماه خاصی انتخاب شده باشد
      if (selectedPersianMonth !== null) {
        // بررسی اینکه قرارداد در بازه زمانی انتخاب شده فعال باشد
        if (startPersian.year < selectedPersianYear || 
            (startPersian.year === selectedPersianYear && startPersian.month > selectedPersianMonth)) {
          return false;
        }
        if (endPersian.year > selectedPersianYear || 
            (endPersian.year === selectedPersianYear && endPersian.month < selectedPersianMonth)) {
          return false;
        }
      } else {
        // اگر همه ماه‌ها انتخاب شده باشند، فقط سال را بررسی کن
        if (startPersian.year > selectedPersianYear || endPersian.year < selectedPersianYear) {
          return false;
        }
      }
      
      return true;
    });
    
    // گروه‌بندی قراردادها بر اساس سایت و مخزن
    const tankSiteMap: Record<string, { siteId: string; siteName: string; tankId: string; tankName: string; contracts: Contract[] }> = {};
    
    filteredByDate.forEach(contract => {
      const key = `${contract.siteId}_${contract.tankId}`;
      if (!tankSiteMap[key]) {
        tankSiteMap[key] = {
          siteId: contract.siteId,
          siteName: contract.siteName,
          tankId: contract.tankId,
          tankName: contract.tankName,
          contracts: []
        };
      }
      tankSiteMap[key].contracts.push(contract);
    });
    
    // فیلتر بر اساس سایت انتخاب شده
    const filteredTankSites = Object.values(tankSiteMap).filter(ts => 
      !selectedSiteId || ts.siteId === selectedSiteId
    );
    
    const tankStats = filteredTankSites.map(tankSite => {
      const tankContracts = tankSite.contracts;
      const tankCapacity = getTankCapacity(tankSite.tankId);
      
      // Calculate monthly utilization for the selected year
      const monthlyUtilization = calculateMonthlyUtilization(tankSite.tankId, tankSite.siteId, selectedPersianYear);
      
      // ایجاد بخش‌های مخزن بر اساس قراردادها
      const segments: TankSegment[] = tankContracts.map(contract => {
        const percentage = (contract.contractWeight / tankCapacity) * 100;
        
        // تعیین رنگ بر اساس نوع اجاره و درصد
        let color = '#10b981'; // سبز پیش‌فرض
        if (contract.rentalTypeName === 'اجاره کامل مخزن') {
          color = '#8b5cf6'; // بنفش برای اجاره کامل
        } else {
          if (percentage >= 90) color = '#ef4444'; // قرمز
          else if (percentage >= 70) color = '#f59e0b'; // زرد
        }
        
        return {
          id: contract.id,
          weight: contract.contractWeight,
          percentage,
          rentalType: contract.rentalTypeName,
          companyName: contract.companyName,
          startDate: contract.startDate,
          endDate: contract.endDate,
          color
        };
      });
      
      // مرتب‌سازی بخش‌ها بر اساس تاریخ شروع
      segments.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      
      const totalUsed = segments.reduce((sum, segment) => sum + segment.weight, 0);
      const utilizationPercentage = tankCapacity > 0 ? Math.min(100, (totalUsed / tankCapacity) * 100) : 0;
      
      const hasFullRental = tankContracts.some(c => c.rentalTypeName === 'اجاره کامل مخزن');
      const hasPartialRental = tankContracts.some(c => c.rentalTypeName === 'اجاره مقداری مخزن');
      
      let rentalType = 'خالی';
      if (hasFullRental && hasPartialRental) rentalType = 'ترکیبی';
      else if (hasFullRental) rentalType = 'اجاره کامل';
      else if (hasPartialRental) rentalType = 'اجاره مقداری';
      
      // پیدا کردن siteId برای این مخزن
      const tankSiteId = tankContracts.length > 0 ? tankContracts[0].siteId : '';
      
      return {
        tankId: tankSite.tankId,
        tankName: tankSite.tankName,
        capacity: tankCapacity,
        totalUsed,
        utilization: utilizationPercentage,
        rentalType,
        contractsCount: tankContracts.length,
        companies: [...new Set(tankContracts.map(c => c.companyName))],
        sites: [tankSite.siteName],
        segments,
        contracts: tankContracts,
        monthlyUtilization,
        siteId: tankSite.siteId,
        siteName: tankSite.siteName
      };
    });
    
    // آمار قراردادهای اجاره کامل و مقداری
    const fullRentalContracts = filteredByDate.filter(c => c.rentalTypeName === 'اجاره کامل مخزن');
    const partialRentalContracts = filteredByDate.filter(c => c.rentalTypeName === 'اجاره مقداری مخزن');
    
    const fullRentalCompanies = [...new Set(fullRentalContracts.map(c => c.companyName))];
    const partialRentalCompanies = [...new Set(partialRentalContracts.map(c => c.companyName))];
    
    return {
      tankStats,
      filteredContracts: filteredByDate,
      totalContracts: filteredByDate.length,
      activeContracts: filteredByDate.filter(c => c.isActive).length,
      totalCapacity: tanks.reduce((sum, tank) => sum + getTankCapacity(tank.id), 0),
      usedCapacity: filteredByDate.reduce((sum, c) => sum + c.contractWeight, 0),
      fullRentalContracts: fullRentalContracts.length,
      partialRentalContracts: partialRentalContracts.length,
      fullRentalCompanies,
      partialRentalCompanies
    };
  };
  
  const chartData = getChartData();
  
  // تابع جدید برای تولید شماره قرارداد با فرمت درخواستی: C-تاریخ شمسی-000001
  const generateContractNumber = useCallback(() => {
    const now = new Date();
    const persianDate = formatPersianDate(now);
    const [year, month, day] = persianDate.split('/');
    const datePart = `${year}-${month}-${day}`;
    
    // پیدا کردن آخرین شماره قرارداد برای امروز
    const todayContracts = contracts.filter(c => {
      if (!c.contractNumber) return false;
      // بررسی فرمت: C-YYYY-MM-DD-XXXXXX
      const parts = c.contractNumber.split('-');
      if (parts.length >= 4 && parts[0] === 'C') {
        const contractDatePart = `${parts[1]}-${parts[2]}-${parts[3]}`;
        return contractDatePart === datePart;
      }
      // برای قراردادهای قدیمی که فرمت متفاوتی دارند
      const contractDate = formatPersianDate(c.createdAt);
      return contractDate === persianDate;
    });
    
    // پیدا کردن بالاترین شماره سریال برای امروز
    let maxSerial = 0;
    todayContracts.forEach(c => {
      if (!c.contractNumber) return;
      const parts = c.contractNumber.split('-');
      // فرمت جدید: C-YYYY-MM-DD-XXXXXX
      if (parts.length >= 4 && parts[0] === 'C') {
        const serialPart = parts[parts.length - 1];
        const serial = parseInt(serialPart);
        if (!isNaN(serial) && serial > maxSerial) {
          maxSerial = serial;
        }
      }
    });
    
    // شماره جدید = آخرین شماره + 1 (یا 1 اگر اولین قرارداد امروز باشد)
    const newSerial = maxSerial + 1;
    const serialString = newSerial.toString().padStart(6, '0');
    
    return `C-${datePart}-${serialString}`;
  }, [contracts]);
  
  useEffect(() => {
    if (newContract.tankId && newContract.contractWeight) {
      const remainingCapacity = calculateRemainingCapacity(newContract);
      setNewContract(prev => ({ ...prev, remainingCapacity }));
    }
  }, [newContract.tankId, newContract.contractWeight]);
  
  // اثر برای مدیریت قفل کردن وزن اولیه در صورت انتخاب "اجاره کامل مخزن"
  useEffect(() => {
    if (newContract.rentalTypeId && newContract.tankId) {
      const rentalTypes = baseData['rental-types'] || [];
      const selectedRentalType = rentalTypes.find(rt => rt.id === newContract.rentalTypeId);
      
      if (selectedRentalType?.name === 'اجاره کامل مخزن') {
        // قفل کردن فیلد وزن و پر کردن آن با ظرفیت مخزن
        setIsWeightLocked(true);
        const tankCapacity = getTankCapacity(newContract.tankId!);
        setNewContract(prev => ({ ...prev, contractWeight: tankCapacity }));
      } else {
        // باز کردن فیلد وزن در صورت انتخاب سایر گزینه‌ها
        setIsWeightLocked(false);
      }
    }
  }, [newContract.rentalTypeId, newContract.tankId, baseData]);
  
  // اثر برای بررسی یکپارچگی واحد سنجش
  useEffect(() => {
    if (newContract.unit && contracts.length > 0) {
      const firstContract = contracts[0];
      
      if (firstContract.unit !== newContract.unit) {
        setUnitWarning(
          `قرارداد با واحد سنجش "${firstContract.unit}" ثبت شده است. شما باید واحد سنجش "${firstContract.unit}" را انتخاب فرمایید.`
        );
      } else {
        setUnitWarning(null);
      }
    }
  }, [newContract.unit, contracts]);
  
  const handleTankClick = (tankId: string) => {
    if (expandedTank === tankId) {
      setExpandedTank(null);
    } else {
      setExpandedTank(tankId);
    }
  };
  
  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              مدیریت قراردادها
            </h1>
            <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              مدیریت قراردادهای اجاره مخازن
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('refreshData'));
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              title="به‌روزرسانی اطلاعات پایه"
            >
              <RefreshCw className="h-5 w-5" />
              به‌روزرسانی
            </button>
            <img 
              src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559" 
              alt="لوگو شرکت صنعت غذایی کورش" 
              className="h-16 w-auto"
            />
          </div>
        </div>
        
        <div className={`rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Header Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  لیست قراردادها
                </h2>
                <p className={`text-base mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  مجموع {contracts.length} قرارداد - {contracts.filter(c => c.isActive).length} فعال
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsAddingNew(true);
                    setNewContract({
                      contractNumber: generateContractNumber(),
                      isActive: true,
                      rentalRate: 0,
                      contractWeight: 0,
                      unit: contracts.length > 0 ? contracts[0].unit : 'کیلوگرم'
                    });
                    setValidationErrors([]);
                    setIsWeightLocked(false);
                    setUnitWarning(null);
                  }}
                  className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Plus className="h-5 w-5" />
                  قرارداد جدید
                </button>
                <button
                  onClick={handleExcelExport}
                  className="bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Download className="h-5 w-5" />
                  خروجی اکسل
                </button>
                <button
                  onClick={() => setShowCharts(!showCharts)}
                  className="bg-purple-600 text-white px-5 py-3 rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <BarChart3 className="h-5 w-5" />
                  {showCharts ? 'مخفی کردن نمودارها' : 'نمایش نمودارها'}
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="جستجو بر اساس شماره قرارداد، شرکت، سایت یا مخزن..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pr-12 pl-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>
          
          {/* Add/Edit Form */}
          {(isAddingNew || editingContract) && (
            <div className={`p-6 border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="h-6 w-6 text-blue-600" />
                <h3 className={`text-xl font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-900'}`}>
                  {isAddingNew ? 'افزودن قرارداد جدید' : 'ویرایش قرارداد'}
                </h3>
              </div>
              
              {validationErrors.length > 0 && (
                <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <h4 className="font-medium text-red-800 text-lg">خطاهای اعتبارسنجی:</h4>
                  </div>
                  <ul className="space-y-2">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-red-700 text-base">
                        • {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {unitWarning && (
                <div className="mb-6 p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800 text-lg">هشدار:</h4>
                  </div>
                  <p className="text-yellow-700 text-base">
                    {unitWarning}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    شماره قرارداد <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newContract.contractNumber || ''}
                    onChange={(e) => setNewContract({ ...newContract, contractNumber: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="شماره قرارداد"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    شرکت طرف حساب <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newContract.companyId || ''}
                    onChange={(e) => setNewContract({ ...newContract, companyId: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">انتخاب کنید</option>
                    {(baseData['companies'] || []).map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    سایت مخازن <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newContract.siteId || ''}
                    onChange={(e) => setNewContract({ ...newContract, siteId: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">انتخاب کنید</option>
                    {(baseData['sites'] || []).map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    مخزن <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newContract.tankId || ''}
                    onChange={(e) => setNewContract({ ...newContract, tankId: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">انتخاب کنید</option>
                    {(baseData['tanks'] || []).map(tank => (
                      <option key={tank.id} value={tank.id}>
                        {tank.name} - ظرفیت: {tank.capacity || '5,000,000 کیلوگرم'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    نوع اجاره <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newContract.rentalTypeId || ''}
                    onChange={(e) => setNewContract({ ...newContract, rentalTypeId: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">انتخاب کنید</option>
                    {(baseData['rental-types'] || []).map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    واحد سنجش <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newContract.unit || ''}
                    onChange={(e) => setNewContract({ ...newContract, unit: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="کیلوگرم">کیلوگرم</option>
                    <option value="تن">تن</option>
                  </select>
                </div>
                
                {/* تاریخ مبنای ظرفیت خالی */}
                {newContract.siteId && newContract.tankId && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                      تاریخ مبنای ظرفیت خالی <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={emptyCapacityDateBasis}
                      onChange={(e) => setEmptyCapacityDateBasis(e.target.value as 'start' | 'end' | 'registration')}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-600 border-gray-500 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="start">بر مبنای تاریخ شروع قرارداد</option>
                      <option value="end">بر مبنای تاریخ پایان قرارداد</option>
                      <option value="registration">بر مبنای تاریخ ثبت قرارداد</option>
                    </select>
                  </div>
                )}
                
                {/* ظرفیت خالی مخزن - نمایش ثابت */}
                {newContract.siteId && newContract.tankId && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                      ظرفیت خالی مخزن (کیلوگرم)
                      <span className="text-xs block mt-1 text-purple-400">
                        {emptyCapacityDateBasis === 'start' && 'محاسبه بر اساس تاریخ شروع قرارداد'}
                        {emptyCapacityDateBasis === 'end' && 'محاسبه بر اساس تاریخ پایان قرارداد'}
                        {emptyCapacityDateBasis === 'registration' && 'محاسبه بر اساس تاریخ ثبت قرارداد'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formatPersianNumber(calculateEmptyTankCapacity(newContract.siteId, newContract.tankId, emptyCapacityDateBasis))}
                      className={`w-full px-4 py-3 border-2 border-purple-300 rounded-xl bg-purple-50 cursor-not-allowed ${
                        isDarkMode 
                          ? 'bg-purple-900 border-purple-500 text-purple-100' 
                          : 'bg-purple-50 border-purple-300 text-purple-900'
                      }`}
                      readOnly
                      disabled
                    />
                  </div>
                )}
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    وزن اولیه قرارداد ({newContract.unit || 'کیلوگرم'}) <span className="text-red-500">*</span>
                    {isWeightLocked && (
                      <span className="inline-flex items-center gap-1 ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        <Lock className="h-3 w-3" />
                        قفل شده
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={newContract.contractWeight || ''}
                    onChange={(e) => {
                      if (isWeightLocked) return;
                      const newWeight = parseFloat(e.target.value) || 0;
                      const emptyCapacity = newContract.siteId && newContract.tankId 
                        ? calculateEmptyTankCapacity(newContract.siteId, newContract.tankId, emptyCapacityDateBasis) 
                        : Infinity;
                      
                      // بررسی و تصحیح خودکار اگر وزن بیشتر از ظرفیت خالی باشد
                      if (newWeight > emptyCapacity) {
                        alert(
                          `مقدار وارد شده (${formatPersianNumber(newWeight)} کیلوگرم) بیشتر از ظرفیت خالی مخزن (${formatPersianNumber(emptyCapacity)} کیلوگرم) است.\n\n` +
                          `مقدار به صورت خودکار به ${formatPersianNumber(emptyCapacity)} کیلوگرم تنظیم شد.`
                        );
                        setNewContract({ ...newContract, contractWeight: emptyCapacity });
                      } else {
                        setNewContract({ ...newContract, contractWeight: newWeight });
                      }
                    }}
                    disabled={isWeightLocked}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isWeightLocked 
                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' 
                        : isDarkMode 
                          ? 'bg-gray-600 border-gray-500 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="وزن به کیلوگرم"
                    min="0"
                    max={newContract.siteId && newContract.tankId ? calculateEmptyTankCapacity(newContract.siteId, newContract.tankId, emptyCapacityDateBasis) : undefined}
                  />
                  {isWeightLocked && (
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      در حالت اجاره کامل مخزن، وزن به صورت خودکار با ظرفیت مخزن پر می‌شود.
                    </p>
                  )}
                  {newContract.siteId && newContract.tankId && newContract.contractWeight && !isWeightLocked && (
                    (() => {
                      const emptyCapacity = calculateEmptyTankCapacity(newContract.siteId, newContract.tankId, emptyCapacityDateBasis);
                      const exceedsCapacity = newContract.contractWeight > emptyCapacity;
                      return exceedsCapacity ? (
                        <p className="text-xs mt-1 text-red-600 font-medium">
                          ⚠️ وزن قرارداد بیشتر از ظرفیت خالی مخزن است. مقدار به صورت خودکار تصحیح خواهد شد.
                        </p>
                      ) : null;
                    })()
                  )}
                </div>
                
                {/* ظرفیت باقیمانده - نمایش ثابت */}
                {newContract.tankId && newContract.contractWeight !== undefined && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                      ظرفیت باقیمانده ({newContract.unit || 'کیلوگرم'})
                      <span className="text-xs block mt-1 text-green-400">فرمول: ظرفیت مخزن - وزن قرارداد</span>
                    </label>
                    <input
                      type="text"
                      value={formatPersianNumber(calculateRemainingCapacity(newContract))}
                      className={`w-full px-4 py-3 border-2 border-green-300 rounded-xl bg-green-50 cursor-not-allowed ${
                        isDarkMode 
                          ? 'bg-green-900 border-green-500 text-green-100' 
                          : 'bg-green-50 border-green-300 text-green-900'
                      }`}
                      readOnly
                      disabled
                    />
                  </div>
                )}
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    نرخ اجاره (ریال) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newContract.rentalRate || ''}
                    onChange={(e) => setNewContract({ ...newContract, rentalRate: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="نرخ اجاره"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    درصد افت <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newContract.wastageRateId || ''}
                    onChange={(e) => setNewContract({ ...newContract, wastageRateId: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">انتخاب کنید</option>
                    {(baseData['wastage-rates'] || []).map(rate => (
                      <option key={rate.id} value={rate.id}>{rate.name}</option>
                    ))}
                  </select>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    مقدار عددی درصد افت به صورت خودکار از نام انتخابی استخراج می‌شود
                  </p>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    مبنای رسید <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newContract.receiptBasisId || ''}
                    onChange={(e) => setNewContract({ ...newContract, receiptBasisId: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">انتخاب کنید</option>
                    {(baseData['receipt-basis'] || []).map(basis => (
                      <option key={basis.id} value={basis.id}>{basis.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        تاریخ شروع <span className="text-red-500">*</span>
                      </label>
                      <PersianDatePicker
                        value={newContract.startDate ?? undefined}
                        onChange={(date) => setNewContract({ ...newContract, startDate: date ?? undefined })}
                        placeholder="انتخاب تاریخ شروع"
                        className={`w-full ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-gray-100' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        تاریخ پایان <span className="text-red-500">*</span>
                      </label>
                      <PersianDatePicker
                        value={newContract.endDate ?? undefined}
                        onChange={(date) => setNewContract({ ...newContract, endDate: date ?? undefined })}
                        placeholder="انتخاب تاریخ پایان"
                        className={`w-full ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-gray-100' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {newContract.tankId && newContract.contractWeight && (
                <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="h-6 w-6 text-green-600" />
                    <h4 className="font-medium text-green-800 text-lg">اطلاعات ظرفیت مخزن</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-base">
                    <div>
                      <span className="text-green-700">ظرفیت کل مخزن:</span>
                      <div className="font-bold text-green-900 text-lg">
                        {formatPersianNumber(getTankCapacity(newContract.tankId))} {newContract.unit || 'کیلوگرم'}
                      </div>
                    </div>
                    <div>
                      <span className="text-green-700">وزن قرارداد:</span>
                      <div className="font-bold text-green-900 text-lg">
                        {formatPersianNumber(newContract.contractWeight || 0)} {newContract.unit || 'کیلوگرم'}
                      </div>
                    </div>
                    <div>
                      <span className="text-green-700">ظرفیت باقیمانده:</span>
                      <div className={`font-bold text-lg ${
                        (newContract.remainingCapacity || 0) >= 0 
                          ? 'text-green-900' 
                          : 'text-red-900'
                      }`}>
                        {formatPersianNumber(newContract.remainingCapacity || 0)} {newContract.unit || 'کیلوگرم'}
                      </div>
                    </div>
                    <div>
                      <span className="text-orange-700">ظرفیت خالی مخزن:</span>
                      <div className="font-bold text-orange-900 text-lg">
                        {newContract.siteId && newContract.tankId 
                          ? formatPersianNumber(calculateEmptyTankCapacity(newContract.siteId, newContract.tankId, emptyCapacityDateBasis)) + ' ' + (newContract.unit || 'کیلوگرم')
                          : '-'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-green-700">
                    فرمول محاسبه: ظرفیت مخزن - وزن قرارداد
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Save className="h-5 w-5" />
                  ذخیره قرارداد
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <X className="h-5 w-5" />
                  انصراف
                </button>
              </div>
            </div>
          )}
          
            {/* Contracts Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] border border-gray-200 rounded-lg shadow-sm">
              <table className="w-full border-collapse">
                <thead className={`sticky top-0 z-10 shadow-sm ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>

                <tr>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>شماره قرارداد</span>
                      <button onClick={() => handleSort('contractNumber')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'contractNumber' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                    <select
                      value={filters.contractNumber || ''}
                      onChange={(e) => handleFilter('contractNumber', e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border rounded"
                    >
                      <option value="">همه</option>
                      {[...new Set(contracts.map(c => c.contractNumber))].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>شرکت</span>
                      <button onClick={() => handleSort('companyName')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'companyName' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                    <select
                      value={filters.companyName || ''}
                      onChange={(e) => handleFilter('companyName', e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border rounded"
                    >
                      <option value="">همه</option>
                      {[...new Set(contracts.map(c => c.companyName))].map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>سایت</span>
                      <button onClick={() => handleSort('siteName')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'siteName' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                    <select
                      value={filters.siteName || ''}
                      onChange={(e) => handleFilter('siteName', e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border rounded"
                    >
                      <option value="">همه</option>
                      {[...new Set(contracts.map(c => c.siteName))].map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>مخزن</span>
                      <button onClick={() => handleSort('tankName')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'tankName' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                    <select
                      value={filters.tankName || ''}
                      onChange={(e) => handleFilter('tankName', e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border rounded"
                    >
                      <option value="">همه</option>
                      {[...new Set(contracts.map(c => c.tankName))].map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>نوع اجاره</span>
                      <button onClick={() => handleSort('rentalTypeName')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'rentalTypeName' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                    <select
                      value={filters.rentalTypeName || ''}
                      onChange={(e) => handleFilter('rentalTypeName', e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border rounded"
                    >
                      <option value="">همه</option>
                      {[...new Set(contracts.map(c => c.rentalTypeName))].map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>واحد سنجش</span>
                      <button onClick={() => handleSort('unit')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'unit' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                    <select
                      value={filters.unit || ''}
                      onChange={(e) => handleFilter('unit', e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border rounded"
                    >
                      <option value="">همه</option>
                      <option value="کیلوگرم">کیلوگرم</option>
                      <option value="تن">تن</option>
                    </select>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>وزن قرارداد</span>
                      <button onClick={() => handleSort('contractWeight')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'contractWeight' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>مقدار افت</span>
                      <button onClick={() => handleSort('dropAmount')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'dropAmount' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>ظرفیت باقیمانده</span>
                      <button onClick={() => handleSort('remainingCapacity')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'remainingCapacity' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>ظرفیت خالی مخزن</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>نرخ اجاره</span>
                      <button onClick={() => handleSort('rentalRate')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'rentalRate' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>درصد افت</span>
                      <button onClick={() => handleSort('wastageRateValue')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'wastageRateValue' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>مبلغ قرارداد</span>
                      <button onClick={() => handleSort('rentalRate')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'rentalRate' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>تاریخ مبنای ظرفیت خالی</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>تاریخ شروع</span>
                      <button onClick={() => handleSort('startDate')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'startDate' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>تاریخ پایان</span>
                      <button onClick={() => handleSort('endDate')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'endDate' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>مبنای رسید</span>
                      <button onClick={() => handleSort('receiptBasisName')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'receiptBasisName' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                    <select
                      value={filters.receiptBasisName || ''}
                      onChange={(e) => handleFilter('receiptBasisName', e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border rounded"
                    >
                      <option value="">همه</option>
                      {[...new Set(contracts.map(c => c.receiptBasisName))].map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>وضعیت</span>
                      <button onClick={() => handleSort('isActive')} className="hover:bg-gray-200 p-1 rounded">
                        {sortConfig.key === 'isActive' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : <ChevronUp className="h-3 w-3 opacity-50" />}
                      </button>
                    </div>
                    <select
                      value={filters.isActive || ''}
                      onChange={(e) => handleFilter('isActive', e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border rounded"
                    >
                      <option value="">همه</option>
                      <option value="true">فعال</option>
                      <option value="false">غیرفعال</option>
                    </select>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                {filteredContracts.map((contract, index) => (
                  <tr key={contract.id} className={`hover:bg-gray-50 ${
                    index % 2 === 0 
                      ? isDarkMode ? 'bg-gray-800' : 'bg-white'
                      : isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
                  }`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        {contract.contractNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {contract.companyName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {contract.siteName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {contract.tankName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        contract.rentalTypeName === 'اجاره کامل مخزن'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {contract.rentalTypeName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {contract.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {formatPersianNumber(contract.contractWeight)} {contract.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {formatPersianNumber(contract.dropAmount)} {contract.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        contract.remainingCapacity > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPersianNumber(contract.remainingCapacity)} {contract.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        isDarkMode ? 'text-purple-300' : 'text-purple-600'
                      }`}>
                        {contract.siteId && contract.tankId 
                          ? formatPersianNumber(calculateEmptyTankCapacity(contract.siteId, contract.tankId, 'start', contract)) + ' ' + contract.unit
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {formatPersianNumber(contract.rentalRate)} ریال
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {contract.wastageRateValue}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {formatPersianNumber(contract.contractWeight * contract.rentalRate)} ریال
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {contract.emptyCapacityDateBasis === 'start' && 'بر مبنای تاریخ شروع قرارداد'}
                        {contract.emptyCapacityDateBasis === 'end' && 'بر مبنای تاریخ پایان قرارداد'}
                        {contract.emptyCapacityDateBasis === 'registration' && 'بر مبنای تاریخ ثبت قرارداد'}
                        {!contract.emptyCapacityDateBasis && 'بر مبنای تاریخ شروع قرارداد'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {contract.emptyCapacityDateBasis === 'start' && 'بر مبنای تاریخ شروع قرارداد'}
                        {contract.emptyCapacityDateBasis === 'end' && 'بر مبنای تاریخ پایان قرارداد'}
                        {contract.emptyCapacityDateBasis === 'registration' && 'بر مبنای تاریخ ثبت قرارداد'}
                        {!contract.emptyCapacityDateBasis && 'بر مبنای تاریخ شروع قرارداد'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {formatPersianDate(contract.startDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {formatPersianDate(contract.endDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {contract.receiptBasisName || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(contract.id)}
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          contract.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {contract.isActive ? 'فعال' : 'غیرفعال'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(contract.id)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredContracts.length === 0 && (
            <div className="p-12 text-center">
              <div className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                <FileText className="h-16 w-16 mx-auto" />
              </div>
              <h3 className={`text-xl font-medium mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                قراردادی یافت نشد
              </h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {searchTerm ? 'نتیجه‌ای برای جستجوی شما یافت نشد.' : 'هنوز قراردادی تعریف نشده است.'}
              </p>
            </div>
          )}
          
          {/* Charts Section */}
          {showCharts && (
            <div className={`p-8 border-t ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              {/* Date Filter for Charts */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  <span className={`font-medium text-lg ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    فیلتر زمانی نمودارها: {selectedPersianYear} {selectedPersianMonth !== null ? `- ${['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][selectedPersianMonth - 1]}` : '- همه ماه‌ها'}
                  </span>
                </div>
                <select
                  value={selectedPersianYear}
                  onChange={(e) => setSelectedPersianYear(parseInt(e.target.value))}
                  className={`px-4 py-3 border rounded-xl ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = 1400 + i;
                    return (
                      <option key={year} value={year}>{year}</option>
                    );
                  })}
                </select>
                <select
                  value={selectedPersianMonth === null ? 'all' : selectedPersianMonth}
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setSelectedPersianMonth(null);
                    } else {
                      setSelectedPersianMonth(parseInt(e.target.value));
                    }
                  }}
                  className={`px-4 py-3 border rounded-xl ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">همه ماه‌ها</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][month - 1]}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                  title="قرارداد فعال"
                  value={formatPersianNumber(chartData.activeContracts)}
                  icon={<FileText className="h-7 w-7" />}
                  color="bg-blue-100 text-blue-600"
                  isDarkMode={isDarkMode}
                />
                <StatCard
                  title="کل قراردادها"
                  value={formatPersianNumber(chartData.totalContracts)}
                  icon={<BarChart3 className="h-7 w-7" />}
                  color="bg-green-100 text-green-600"
                  isDarkMode={isDarkMode}
                />
                <StatCard
                  title="استفاده از ظرفیت"
                  value={`${Math.round((chartData.usedCapacity / chartData.totalCapacity) * 100)}%`}
                  icon={<Percent className="h-7 w-7" />}
                  color="bg-purple-100 text-purple-600"
                  isDarkMode={isDarkMode}
                />
                <StatCard
                  title="ظرفیت آزاد"
                  value={formatPersianNumber(chartData.totalCapacity - chartData.usedCapacity)}
                  icon={<Package className="h-7 w-7" />}
                  color="bg-orange-100 text-orange-600"
                  isDarkMode={isDarkMode}
                />
              </div>
              
              {/* Contract Type Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <ContractTypeStatCard
                  title="قراردادهای اجاره کامل"
                  count={chartData.fullRentalContracts}
                  companies={chartData.fullRentalCompanies}
                  icon={<Layers className="h-7 w-7" />}
                  color="bg-purple-100 text-purple-600"
                  isDarkMode={isDarkMode}
                />
                <ContractTypeStatCard
                  title="قراردادهای اجاره مقداری"
                  count={chartData.partialRentalContracts}
                  companies={chartData.partialRentalCompanies}
                  icon={<Droplets className="h-7 w-7" />}
                  color="bg-blue-100 text-blue-600"
                  isDarkMode={isDarkMode}
                />
              </div>
              
              {/* Tank Utilization Chart */}
              <div className="mb-10">
                <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  وضعیت پر شدن مخازن
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {chartData.tankStats.map((tank, index) => (
                    <TankVisualization
                      key={index}
                      capacity={tank.capacity}
                      segments={tank.segments}
                      tankName={tank.tankName}
                      isDarkMode={isDarkMode}
                      onClick={() => handleTankClick(tank.tankId)}
                      monthlyData={tank.monthlyUtilization}
                      siteId={tank.siteId}
                      tankId={tank.tankId}
                      calculateConsignmentOwnedTanksInventory={calculateConsignmentOwnedTanksInventory}
                    />
                  ))}
                </div>
              </div>
              
              {/* Tank Filling Tree */}
              {expandedTank && (
                <div className="mb-10">
                  <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    گزارش درختی وضعیت پر شدن مخازن
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {chartData.tankStats
                      .filter(tank => tank.tankId === expandedTank)
                      .map((tank, index) => (
                        <TankFillingTree
                          key={index}
                          tankName={tank.tankName}
                          capacity={tank.capacity}
                          segments={tank.segments}
                          isDarkMode={isDarkMode}
                          contracts={tank.contracts}
                          monthlyData={tank.monthlyUtilization}
                          selectedPersianMonth={selectedPersianMonth}
                          selectedPersianYear={selectedPersianYear}
                        />
                      ))}
                  </div>
                </div>
              )}
              
              {/* Rental Type Distribution */}
              <div className={`rounded-2xl border p-8 mb-10 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  توزیع نوع اجاره
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['اجاره کامل', 'اجاره مقداری', 'ترکیبی', 'خالی'].map((type, index) => {
                    const count = chartData.tankStats.filter(t => t.rentalType === type).length;
                    const percentage = chartData.tankStats.length > 0 ? (count / chartData.tankStats.length) * 100 : 0;
                    const colors = ['bg-purple-500', 'bg-blue-500', 'bg-indigo-500', 'bg-gray-400'];
                    
                    return (
                      <div key={type} className={`p-6 rounded-2xl border ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: colors[index] }}></div>
                            <span className={`font-medium text-lg ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{type}</span>
                          </div>
                          <span className={`text-lg font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {formatPersianNumber(count)} ({formatPersianNumber(percentage)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full"
                            style={{ width: `${percentage}%`, backgroundColor: colors[index] }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Rental Rate Trends Chart */}
              <RentalRateTrendsChart 
                contracts={chartData.filteredContracts} 
                isDarkMode={isDarkMode}
                selectedYear={selectedPersianYear}
                selectedMonth={selectedPersianMonth}
              />
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes wave {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-wave {
          animation: wave 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ContractManager;