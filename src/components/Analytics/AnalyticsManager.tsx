import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart3, TrendingUp, PieChart, Activity, Calendar, Filter, Download, RefreshCw, Warehouse, Package, Clock, AlertCircle } from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import { PersianDatePicker } from '../Common/PersianDatePicker';

// کامپوننت نمودار میله‌ای سفارشی
const CustomBarChart = ({ data, width = 600, height = 300, title }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  // محاسبه مقادیر مورد نیاز برای نمودار
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // پیدا کردن حداکثر مقدار برای تنظیم مقیاس
    const maxValue = Math.max(...data.map(item => Math.max(item.receipts || 0, item.deliveries || 0)));
    const barWidth = width / data.length * 0.4; // 40% فضای هر بخش برای میله‌ها
    const spacing = width / data.length * 0.2; // 20% فضای هر بخش برای فاصله
    
    return data.map((item, index) => ({
      ...item,
      receiptX: index * (barWidth * 2 + spacing * 3) + spacing,
      deliveryX: index * (barWidth * 2 + spacing * 3) + barWidth + spacing * 2,
      y: height - 50,
      width: barWidth,
      receiptHeight: maxValue > 0 ? (item.receipts / maxValue) * (height - 70) : 0,
      deliveryHeight: maxValue > 0 ? (item.deliveries / maxValue) * (height - 70) : 0,
      formattedReceipts: formatPersianNumber(item.receipts),
      formattedDeliveries: formatPersianNumber(item.deliveries)
    }));
  }, [data, width, height]);
  
  // محاسبه مقادیر برای محور Y
  const yTicks = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const maxValue = Math.max(...data.map(item => Math.max(item.receipts || 0, item.deliveries || 0)));
    const step = maxValue / 5;
    return Array.from({ length: 6 }, (_, i) => ({
      value: i * step,
      y: height - 50 - (i * step / maxValue) * (height - 70),
      formatted: formatPersianNumber(Math.round(i * step))
    }));
  }, [data, height]);
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">داده‌ای برای نمایش وجود ندارد</p>
      </div>
    );
  }
  
  return (
    <div className="custom-chart-container" style={{ direction: 'ltr' }}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">{title}</h3>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* خطوط شبکه افقی */}
        {yTicks.map((tick, index) => (
          <line
            key={index}
            x1="0"
            y1={tick.y}
            x2={width}
            y2={tick.y}
            stroke="#e0e0e0"
            strokeWidth="1"
          />
        ))}
        
        {/* محور Y */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2={height - 50}
          stroke="#333"
          strokeWidth="2"
        />
        
        {/* مقادیر محور Y */}
        {yTicks.map((tick, index) => (
          <text
            key={index}
            x="-10"
            y={tick.y + 5}
            textAnchor="end"
            fill="#666"
            fontSize="12"
          >
            {tick.formatted}
          </text>
        ))}
        
        {/* محور X */}
        <line
          x1="0"
          y1={height - 50}
          x2={width}
          y2={height - 50}
          stroke="#333"
          strokeWidth="2"
        />
        
        {/* میله‌ها و برچسب‌ها */}
        {chartData.map((item, index) => (
          <g key={index}>
            {/* میله رسیدها */}
            <rect
              x={item.receiptX}
              y={item.y - item.receiptHeight}
              width={item.width}
              height={item.receiptHeight}
              fill={activeIndex === index ? "#059669" : "#10b981"}
              rx="4"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ cursor: 'pointer' }}
            />
            
            {/* میله حواله‌ها */}
            <rect
              x={item.deliveryX}
              y={item.y - item.deliveryHeight}
              width={item.width}
              height={item.deliveryHeight}
              fill={activeIndex === index ? "#d97706" : "#f59e0b"}
              rx="4"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ cursor: 'pointer' }}
            />
            
            {/* برچسب محور X */}
            <text
              x={item.receiptX + item.width}
              y={height - 30}
              textAnchor="middle"
              fill="#666"
              fontSize="12"
            >
              {item.period}
            </text>
            
            {/* Tooltip برای رسیدها */}
            {activeIndex === index && (
              <g>
                <rect
                  x={item.receiptX + item.width / 2 - 40}
                  y={item.y - item.receiptHeight - 30}
                  width="80"
                  height="25"
                  fill="white"
                  stroke="#ccc"
                  rx="4"
                />
                <text
                  x={item.receiptX + item.width / 2}
                  y={item.y - item.receiptHeight - 12}
                  textAnchor="middle"
                  fill="#333"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {item.formattedReceipts}
                </text>
              </g>
            )}
            
            {/* Tooltip برای حواله‌ها */}
            {activeIndex === index && (
              <g>
                <rect
                  x={item.deliveryX + item.width / 2 - 40}
                  y={item.y - item.deliveryHeight - 30}
                  width="80"
                  height="25"
                  fill="white"
                  stroke="#ccc"
                  rx="4"
                />
                <text
                  x={item.deliveryX + item.width / 2}
                  y={item.y - item.deliveryHeight - 12}
                  textAnchor="middle"
                  fill="#333"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {item.formattedDeliveries}
                </text>
              </g>
            )}
          </g>
        ))}
        
        {/* عنوان محور Y */}
        <text
          x={-height / 2}
          y="-30"
          textAnchor="middle"
          fill="#666"
          fontSize="14"
          transform="rotate(-90)"
        >
          مقدار (کیلوگرم)
        </text>
        
        {/* عنوان محور X */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fill="#666"
          fontSize="14"
        >
          دوره
        </text>
        
        {/* راهنما */}
        <g transform={`translate(${width - 150}, 20)`}>
          <rect width="140" height="60" fill="white" stroke="#e0e0e0" rx="4" />
          <rect x="10" y="10" width="20" height="10" fill="#10b981" rx="2" />
          <text x="35" y="19" fill="#333" fontSize="12">رسید</text>
          <rect x="10" y="35" width="20" height="10" fill="#f59e0b" rx="2" />
          <text x="35" y="44" fill="#333" fontSize="12">حواله</text>
        </g>
      </svg>
    </div>
  );
};

// کامپوننت نمودار دایره‌ای سفارشی
const CustomPieChart = ({ data, width = 300, height = 300, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">داده‌ای برای نمایش وجود ندارد</p>
      </div>
    );
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  // محاسبه زوایا برای هر بخش
  const chartData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.amount, 0);
    let startAngle = 0;
    
    return data.map((item, index) => {
      const percentage = total > 0 ? (item.amount / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const endAngle = startAngle + angle;
      
      // تبدیل زاویه به رادیان
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;
      
      // محاسبه نقاط روی دایره
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      // محاسبه مسیر برای بخش دایره
      const largeArcFlag = angle > 180 ? 1 : 0;
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      // محاسبه موقعیت برچسب
      const labelAngle = (startAngle + endAngle) / 2;
      const labelRad = (labelAngle - 90) * Math.PI / 180;
      const labelRadius = radius * 0.7;
      const labelX = centerX + labelRadius * Math.cos(labelRad);
      const labelY = centerY + labelRadius * Math.sin(labelRad);
      
      const result = {
        ...item,
        pathData,
        labelX,
        labelY,
        percentage,
        formattedAmount: formatPersianNumber(item.amount),
        formattedPercentage: formatPersianNumber(percentage)
      };
      
      startAngle = endAngle;
      return result;
    });
  }, [data, width, height, centerX, centerY, radius]);
  
  // رنگ‌های پیش‌فرض
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  
  return (
    <div className="custom-pie-chart-container">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">{title}</h3>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {chartData.map((item, index) => (
          <g key={index}>
            {/* بخش دایره */}
            <path
              d={item.pathData}
              fill={COLORS[index % COLORS.length]}
              stroke="white"
              strokeWidth={2}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ cursor: 'pointer', opacity: activeIndex === null || activeIndex === index ? 1 : 0.7 }}
            />
            
            {/* برچسب درصد */}
            <text
              x={item.labelX}
              y={item.labelY}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="bold"
              pointerEvents="none"
            >
              {item.formattedPercentage}%
            </text>
            
            {/* Tooltip */}
            {activeIndex === index && (
              <g>
                <rect
                  x={item.labelX - 40}
                  y={item.labelY - 30}
                  width="80"
                  height="40"
                  fill="white"
                  stroke="#ccc"
                  rx="4"
                />
                <text
                  x={item.labelX}
                  y={item.labelY - 15}
                  textAnchor="middle"
                  fill="#333"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {item.type}
                </text>
                <text
                  x={item.labelX}
                  y={item.labelY}
                  textAnchor="middle"
                  fill="#333"
                  fontSize="12"
                >
                  {item.formattedAmount} کیلوگرم
                </text>
              </g>
            )}
          </g>
        ))}
        
        {/* دایره مرکزی برای ایجاد نمودار دونات */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.4}
          fill="white"
        />
      </svg>
      
      {/* راهنما */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-sm" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            ></div>
            <span className="text-sm text-gray-700 truncate">{item.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface TankInventoryBreakdown {
  ownedReceiptsAmount: number;
  ownedAdditionDocuments: number;
  ownedDeliveries: number;
  ownedGainedAmount: number;
  ownedDeductionDocuments: number;
  ownedConsumedProducts?: number;
  ownedProducedProducts?: number;
  consignmentReceiptsAmount: number;
  consignmentAdditions: number;
  consignmentDeliveries: number;
  consignmentDeductionAmount: number;
  consignmentDeductionDocuments: number;
  consignmentConsumedProducts?: number;
  consignmentProducedProducts?: number;
  ownedFinal: number;
  consignmentFinal: number;
  combinedFinal: number;
  totalTankCapacity?: number;
  emptyCapacity?: number;
}

interface AnalyticsData {
  totalInventory: number;
  monthlyReceipts: number;
  monthlyDeliveries: number;
  overdueContracts: number;
  activeContracts: number;
  inventoryByType: { type: string; amount: number; percentage: number }[];
  monthlyTrends: { period: string; receipts: number; deliveries: number }[];
  topCompanies: { name: string; amount: number; transactions: number }[];
  tankUtilization: { tank: string; capacity: number; current: number; utilization: number }[];
  tankInventoryBreakdown: TankInventoryBreakdown;
}

interface BaseDataCategory {
  id: string;
  name: string;
  items: any[];
  hasCode: boolean;
  description: string;
}

interface BaseDataItem {
  id: string;
  code?: string;
  name: string;
  type?: string;
  isActive: boolean;
  canDelete: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  address?: string;
  phone?: string;
  postalCode?: string;
  additionalInfo?: string;
  nationalId?: string;
  plateNumber?: string;
  homeAddress?: string;
  capacity?: string;
}

export const AnalyticsManager: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedProductType, setSelectedProductType] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedTank, setSelectedTank] = useState<string>('all');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [baseDataCategories, setBaseDataCategories] = useState<BaseDataCategory[]>([]);
  const [showTankInventoryTables, setShowTankInventoryTables] = useState<boolean>(false);
  const [showInventoryPackage, setShowInventoryPackage] = useState<boolean>(true);
  const [selectedTankForFilter, setSelectedTankForFilter] = useState<string>('');
  const [selectedSiteForFilter, setSelectedSiteForFilter] = useState<string>('');
  const [upToDate, setUpToDate] = useState<Date>(new Date());
  
  const storage = DataStorage.getInstance();
  
  // لیست سایت‌ها و مخازن منحصر به فرد
  const uniqueSites = useMemo(() => {
    const sites = new Map<string, string>();
    const receipts = ((storage.loadData('receipts') || []) as any[]);
    receipts.forEach((receipt: any) => {
      if (receipt && receipt.siteId && receipt.siteName && !sites.has(receipt.siteId)) {
        sites.set(receipt.siteId, receipt.siteName);
      }
    });
    // همچنین از baseDataCategories استفاده کن
    const categories = ((storage.loadData('baseDataCategories') || []) as any[]);
    const sitesCategory = categories.find((c: any) => c.id === 'sites')?.items || [];
    sitesCategory.forEach((site: any) => {
      if (site && site.id && site.name && !sites.has(site.id)) {
        sites.set(site.id, site.name);
      }
    });
    return Array.from(sites.entries());
  }, [baseDataCategories]);

  const uniqueTanks = useMemo(() => {
    const tanks = new Map<string, string>();
    const receipts = ((storage.loadData('receipts') || []) as any[]);
    receipts.forEach((receipt: any) => {
      if (receipt && receipt.tankId && receipt.tankName && !tanks.has(receipt.tankId)) {
        tanks.set(receipt.tankId, receipt.tankName);
      }
    });
    // همچنین از baseDataCategories استفاده کن
    const categories = ((storage.loadData('baseDataCategories') || []) as any[]);
    const tanksCategory = categories.find((c: any) => c.id === 'tanks')?.items || [];
    tanksCategory.forEach((tank: any) => {
      if (tank && tank.id && tank.name && !tanks.has(tank.id)) {
        tanks.set(tank.id, tank.name);
      }
    });
    return Array.from(tanks.entries());
  }, [baseDataCategories]);
  
  // Helper function for safe number conversion
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value;
    }
    const num = parseFloat(value.toString());
    return isNaN(num) ? defaultValue : num;
  };

  // Helper function to calculate total tank capacity based on filters
  const calculateTotalTankCapacity = useCallback((siteId?: string, tankId?: string) => {
    const categories = ((storage.loadData('baseDataCategories') || []) as any[]);
    const tanksCategory = categories.find((c: any) => c.id === 'tanks')?.items || [];
    let totalCapacity = 0;
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    tanksCategory.forEach((tank: any) => {
      if (currentTankId && tank.id !== currentTankId) return;
      if (currentSiteId && tank.siteId && tank.siteId !== currentSiteId) return;
      const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
      const capacityMatch = capacityStr.match(/[\d,]+/);
      const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, ''), 10) : 5000000;
      totalCapacity += capacity;
    });
    return totalCapacity;
  }, [selectedSiteForFilter, selectedTankForFilter, storage]);

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
    
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    const siteTankReceipts = allReceipts.filter((r: any) => {
      if (currentSiteId && r.siteId !== currentSiteId) return false;
      if (currentTankId && r.tankId !== currentTankId) return false;
      return r.userType === 'owned' && !r.isVoided && new Date(r.receiptDate) <= upToDate;
    });
    
    const siteTankAdjustments = allAdjustments.filter((adj: any) => {
      if (currentSiteId && adj.siteId !== currentSiteId) return false;
      if (currentTankId && adj.tankId !== currentTankId) return false;
      return adj.productType === 'owned' && !adj.isVoided && new Date(adj.documentDate) <= upToDate;
    });
    
    const siteTankDeliveries = allDeliveries.filter((d: any) => {
      if (currentSiteId && d.siteId !== currentSiteId) return false;
      if (currentTankId && d.tankId !== currentTankId) return false;
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
      (currentSiteId ? t.siteId === currentSiteId : true) &&
      (currentTankId ? t.tankId === currentTankId : true)
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
      if (currentSiteId && c.siteId !== currentSiteId) return false;
      if (currentTankId && c.tankId !== currentTankId) return false;
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
  }, [upToDate, selectedSiteForFilter, selectedTankForFilter, storage]);

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

    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    const consignmentReceipts = allReceipts.filter((r: any) => 
      r && typeof r === 'object' &&
      r.userType === 'consignment' && 
      !r.isVoided &&
      (currentSiteId ? r.siteId === currentSiteId : true) &&
      (currentTankId ? r.tankId === currentTankId : true)
    );
    
    const consignmentAdditions = allAdjustments
      .filter((adj: any) => 
        adj.adjustmentType === 'addition' && 
        adj.productType === 'consignment' &&
        (currentSiteId ? adj.siteId === currentSiteId : true) &&
        (currentTankId ? adj.tankId === currentTankId : true) &&
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
      return (!currentSiteId || d.siteId === currentSiteId) &&
             (!currentTankId || d.tankId === currentTankId);
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
        (currentSiteId ? t.siteId === currentSiteId : true) &&
        (currentTankId ? t.tankId === currentTankId : true)
      )
      .reduce((sum: number, t: any) => sum + Math.abs(safeNumber(t.amount, 0)), 0);
    
    const consignmentDeductionDocuments = allAdjustments
      .filter((adj: any) => 
        adj && typeof adj === 'object' &&
        adj.adjustmentType === 'deduction' && 
        adj.productType === 'consignment' &&
        (currentSiteId ? adj.siteId === currentSiteId : true) &&
        (currentTankId ? adj.tankId === currentTankId : true) &&
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
      if (currentSiteId && c.siteId !== currentSiteId) return false;
      if (currentTankId && c.tankId !== currentTankId) return false;
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
  }, [upToDate, selectedSiteForFilter, selectedTankForFilter, storage]);

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
  
  // Function to calculate analytics data from all sources
  const calculateAnalyticsData = () => {
    setLoading(true);
    
    // Get data from all sources
    const receipts = storage.loadData('receipts') || [];
    const deliveries = storage.loadData('deliveries') || [];
    const wastageTransactions = storage.loadData('wastageTransactions') || [];
    const inventoryAdjustments = storage.loadData('inventoryAdjustments') || [];
    const consignmentDeliverySlips = storage.loadData('consignment-delivery-slips') || [];
    const ownershipDeliverySlips = storage.loadData('ownership-delivery-slips') || [];
    const contracts = storage.loadData('contracts') || [];
    const invoices = storage.loadData('invoices') || [];
    
    // Get base data categories from storage
    const categories = storage.loadData('baseDataCategories') || [];
    setBaseDataCategories(categories);
    
    // Extract specific data from categories
    const tanksCategory = categories.find((c: BaseDataCategory) => c.id === 'tanks')?.items || [];
    const companiesCategory = categories.find((c: BaseDataCategory) => c.id === 'companies')?.items || [];
    const ownedProductsCategory = categories.find((c: BaseDataCategory) => c.id === 'owned-products')?.items || [];
    const consignmentProductsCategory = categories.find((c: BaseDataCategory) => c.id === 'consignment-products')?.items || [];
    const sitesCategory = categories.find((c: BaseDataCategory) => c.id === 'sites')?.items || [];
    
    // Combine product categories
    const allProducts = [...ownedProductsCategory, ...consignmentProductsCategory];
    
    // Calculate current date and period
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter data based on selected site
    const filteredReceipts = selectedSite === 'all' 
      ? receipts 
      : receipts.filter(r => r.siteId === selectedSite);
    
    const filteredDeliveries = selectedSite === 'all' 
      ? deliveries 
      : deliveries.filter(d => d.siteId === selectedSite);

    const filteredWastage = selectedSite === 'all'
      ? wastageTransactions
      : wastageTransactions.filter((t: any) => t.siteId === selectedSite);
    
    // Filter data based on selected product type
    const productTypeFilteredReceipts = selectedProductType === 'all'
      ? filteredReceipts
      : filteredReceipts.filter(r => r.productId === selectedProductType);
    
    const productTypeFilteredDeliveries = selectedProductType === 'all'
      ? filteredDeliveries
      : filteredDeliveries.filter(d => d.productId === selectedProductType);

    const productTypeFilteredWastage = selectedProductType === 'all'
      ? filteredWastage
      : filteredWastage.filter((t: any) => (t.productId === selectedProductType || t.gainedProductCode === selectedProductType));
    
    // Filter data based on selected company
    const companyFilteredReceipts = selectedCompany === 'all'
      ? productTypeFilteredReceipts
      : productTypeFilteredReceipts.filter(r => r.companyId === selectedCompany);
    
    const companyFilteredDeliveries = selectedCompany === 'all'
      ? productTypeFilteredDeliveries
      : productTypeFilteredDeliveries.filter(d => d.companyId === selectedCompany);

    const companyFilteredWastage = productTypeFilteredWastage; // تراکنش‌های افت معمولاً شرکت ندارند
    
    // Filter data based on selected tank
    const tankFilteredReceipts = selectedTank === 'all'
      ? companyFilteredReceipts
      : companyFilteredReceipts.filter(r => r.tankId === selectedTank);
    
    const tankFilteredDeliveries = selectedTank === 'all'
      ? companyFilteredDeliveries
      : companyFilteredDeliveries.filter(d => d.tankId === selectedTank);

    const tankFilteredWastage = selectedTank === 'all'
      ? companyFilteredWastage
      : companyFilteredWastage.filter((t: any) => t.tankId === selectedTank);

    const tankFilteredAdjustments = selectedTank === 'all'
      ? inventoryAdjustments.filter((adj: any) =>
          (selectedSite === 'all' || adj.siteId === selectedSite))
      : inventoryAdjustments.filter((adj: any) =>
          (selectedSite === 'all' || adj.siteId === selectedSite) &&
          adj.tankId === selectedTank);
    
    // Calculate date range based on selected period + فیلترهای از تاریخ / تا تاریخ
    let startDate = new Date();
    if (selectedPeriod === 'month') {
      startDate.setMonth(currentMonth - 5);
    } else if (selectedPeriod === 'quarter') {
      startDate.setMonth(currentMonth - 11); // آخرین ۴ فصل
    } else { // year
      startDate.setFullYear(currentYear - 4); // آخرین ۵ سال
    }
    // اگر کاربر «از تاریخ» را تعیین کرده، جایگزین شود
    if (fromDate) {
      startDate = fromDate;
    }
    // پایان بازه (تا تاریخ)؛ پیش‌فرض امروز
    let endDate = now;
    if (toDate) {
      endDate = toDate;
    }
    
    // Filter data based on selected period
    const periodFilteredReceipts = tankFilteredReceipts.filter(r => {
      const receiptDate = new Date(r.receiptDate || r.createdAt);
      return receiptDate >= startDate && receiptDate <= endDate;
    });
    
    const periodFilteredDeliveries = tankFilteredDeliveries.filter(d => {
      const deliveryDate = new Date(d.deliveryDate || d.createdAt);
      return deliveryDate >= startDate && deliveryDate <= endDate;
    });

    const periodFilteredWastage = tankFilteredWastage.filter((t: any) => {
      const txnDate = new Date(t.transactionDate || t.createdAt);
      return txnDate >= startDate && txnDate <= endDate;
    });

    const periodFilteredAdjustments = tankFilteredAdjustments.filter((adj: any) => {
      const docDate = new Date(adj.documentDate || adj.createdAt);
      return docDate >= startDate && docDate <= endDate;
    });

    // خلاصه موجودی امانی/تملیکی با منطق نزدیک به صفحه کسر/اضافه انبار
    // 1) رسیدهای تملیکی
    const ownedReceiptsAmount = periodFilteredReceipts
      .filter((r: any) => r && r.userType === 'owned' && !r.isVoided)
      .reduce((sum, r) => {
        const base =
          (r.receiptBasisAmount && r.receiptBasisAmount > 0 && r.receiptBasisAmount) ||
          (r.finalAmount && r.finalAmount > 0 && r.finalAmount) ||
          (r.amount && r.amount > 0 && r.amount) ||
          0;
        return sum + base;
      }, 0);

    // 2) رسیدهای امانی
    const consignmentReceiptsAmount = periodFilteredReceipts
      .filter((r: any) => r && r.userType === 'consignment' && !r.isVoided)
      .reduce((sum, r) => {
        let baseAmount = 0;
        if (r.receiptBasisAmount && r.receiptBasisAmount > 0) {
          baseAmount = r.receiptBasisAmount;
        } else if (r.finalAmount && r.finalAmount > 0) {
          baseAmount = r.finalAmount;
        } else if (r.amount && r.amount > 0) {
          baseAmount = r.amount;
        } else {
          baseAmount =
            (r.shipUnloadingAmount || 0) +
            (r.tankShoreAmount || 0) +
            (r.shipBillOfLadingAmount || 0) +
            (r.weightGross || 0);
        }
        return sum + baseAmount;
      }, 0);

    // 3) اسناد اضافه انبار
    const consignmentAdditions = tankFilteredAdjustments
      .filter((adj: any) =>
        adj &&
        adj.adjustmentType === 'addition' &&
        adj.productType === 'consignment'
      )
      .reduce((sum, adj) => sum + (adj.quantity || 0), 0);

    const ownedAdditionDocuments = tankFilteredAdjustments
      .filter((adj: any) =>
        adj &&
        adj.adjustmentType === 'addition' &&
        adj.productType === 'owned'
      )
      .reduce((sum, adj) => sum + (adj.quantity || 0), 0);

    // 4) حواله‌های تملیکی (از ownership-delivery-slips)
    const periodFilteredOwnershipSlips = (ownershipDeliverySlips as any[])
      .filter((d: any) => {
        if (!d || typeof d !== 'object' || d.isVoided) return false;
        const dateValue = d.deliveryDate || d.createdAt;
        if (!dateValue) return false;
        const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
        return deliveryDate >= startDate &&
          (selectedSite === 'all' || d.siteId === selectedSite) &&
          (selectedTank === 'all' || d.tankId === selectedTank);
      });

    const ownedDeliveries = periodFilteredOwnershipSlips
      .reduce((sum, d) => sum + (d.amount || d.finalAmount || 0), 0);

    // 5) حواله‌های امانی (ترکیب consignment-delivery-slips و deliveries)
    const baseConsignmentSlips = (consignmentDeliverySlips as any[])
      .filter((d: any) => {
        if (!d || typeof d !== 'object' || d.isVoided) return false;
        const dateValue = d.deliveryDate || d.slipDate;
        if (!dateValue) return true;
        const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
        return !isNaN(deliveryDate.getTime()) &&
          deliveryDate >= startDate &&
          (selectedSite === 'all' || d.siteId === selectedSite) &&
          (selectedTank === 'all' || d.tankId === selectedTank);
      });

    const generalConsignmentDeliveries = (deliveries as any[])
      .filter((d: any) => {
        if (!d || typeof d !== 'object' || d.isVoided) return false;
        const dateValue = d.deliveryDate || d.createdAt;
        if (!dateValue) return false;
        const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (deliveryDate < startDate) return false;
        const hasConsignmentFeatures =
          d.contractNumber ||
          d.permitId ||
          d.userType === 'consignment' ||
          d.type === 'امانی' ||
          d.nature === 'consignment';
        if (!hasConsignmentFeatures) return false;
        return (selectedSite === 'all' || d.siteId === selectedSite) &&
               (selectedTank === 'all' || d.tankId === selectedTank);
      });

    const consignmentDeliveries = [...baseConsignmentSlips, ...generalConsignmentDeliveries]
      .reduce((sum, d) => sum + (d.amount || d.finalAmount || 0), 0);

    // 6) افت‌ها
    const consignmentDeductionAmount = periodFilteredWastage
      .filter((t: any) =>
        t.transactionType === 'consignment' &&
        !t.isVoided
      )
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

    const ownedGainedAmount = periodFilteredWastage
      .filter((t: any) =>
        t.transactionType === 'owned' &&
        !t.isVoided
      )
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

    // 7) اسناد کسر انبار
    const consignmentDeductionDocuments = tankFilteredAdjustments
      .filter((adj: any) =>
        adj &&
        adj.adjustmentType === 'deduction' &&
        adj.productType === 'consignment'
      )
      .reduce((sum, adj) => sum + (adj.quantity || 0), 0);

    const ownedDeductionDocuments = tankFilteredAdjustments
      .filter((adj: any) =>
        adj &&
        adj.adjustmentType === 'deduction' &&
        adj.productType === 'owned'
      )
      .reduce((sum, adj) => sum + (adj.quantity || 0), 0);

    // 8) تبدیل‌های کالا: کالای مصرفی (کسر) و کالای تولیدی (اضافه)
    const allConversions = (storage.loadData('productConversions') || []).filter((c: any) => 
      c && typeof c === 'object' && !c.isVoided
    );
    const periodFilteredConversions = allConversions.filter((c: any) => {
      const conversionDate = c.documentDate ? new Date(c.documentDate) : new Date(c.createdAt);
      if (conversionDate < startDate) return false;
      if (selectedSite !== 'all' && c.siteId !== selectedSite) return false;
      if (selectedTank !== 'all' && c.tankId !== selectedTank) return false;
      return true;
    });
    
    // کالای مصرفی تملیکی (کسر از موجودی)
    const ownedConsumedProducts = periodFilteredConversions
      .filter(c => c.consumedProductType === 'owned')
      .reduce((sum, c) => sum + (c.consumedQuantity || 0), 0);
    
    // کالای تولیدی تملیکی (اضافه به موجودی)
    const ownedProducedProducts = periodFilteredConversions
      .filter(c => c.producedProductType === 'owned')
      .reduce((sum, c) => sum + (c.producedQuantity || 0), 0);
    
    // کالای مصرفی امانی (کسر از موجودی)
    const consignmentConsumedProducts = periodFilteredConversions
      .filter(c => c.consumedProductType === 'consignment')
      .reduce((sum, c) => sum + (c.consumedQuantity || 0), 0);
    
    // کالای تولیدی امانی (اضافه به موجودی)
    const consignmentProducedProducts = periodFilteredConversions
      .filter(c => c.producedProductType === 'consignment')
      .reduce((sum, c) => sum + (c.producedQuantity || 0), 0);

    // 9) مانده‌ها مطابق فرمول صفحه کسر/اضافه انبار
    const ownedFinal = ownedReceiptsAmount + ownedAdditionDocuments + ownedGainedAmount + ownedProducedProducts - ownedDeliveries - ownedDeductionDocuments - ownedConsumedProducts;
    const consignmentFinal = consignmentReceiptsAmount + consignmentAdditions + consignmentProducedProducts - consignmentDeliveries - consignmentDeductionAmount - consignmentDeductionDocuments - consignmentConsumedProducts;
    const combinedFinal = ownedFinal + consignmentFinal;

    const totalInventory = combinedFinal;
    
    // Calculate monthly receipts and deliveries
    const monthlyReceipts = (
      periodFilteredReceipts.filter(r => {
      const receiptDate = new Date(r.receiptDate || r.createdAt);
      return receiptDate.getMonth() === currentMonth && receiptDate.getFullYear() === currentYear;
    }).reduce((sum, r) => sum + (r.finalAmount || 0), 0)
    + periodFilteredWastage
        .filter((t: any) => t.transactionType === 'owned')
        .filter((t: any) => {
          const d = new Date(t.transactionDate || t.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0)
    );
    
    const monthlyDeliveries = (
      periodFilteredDeliveries.filter(d => {
      const deliveryDate = new Date(d.deliveryDate || d.createdAt);
      return deliveryDate.getMonth() === currentMonth && deliveryDate.getFullYear() === currentYear;
    }).reduce((sum, d) => sum + (d.amount || 0), 0)
    + periodFilteredWastage
        .filter((t: any) => t.transactionType === 'consignment')
        .filter((t: any) => {
          const d = new Date(t.transactionDate || t.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0)
    );
    
    // Calculate contract status
    const overdueContracts = contracts.filter(c => new Date(c.endDate) < now).length;
    const activeContracts = contracts.filter(c => c.isActive && new Date(c.endDate) >= now).length;
    
    // Calculate inventory by type
    const inventoryByTypeMap: Record<string, number> = {};
    
    periodFilteredReceipts.forEach(r => {
      const product = allProducts.find((p: BaseDataItem) => p.id === r.productId);
      const productType = product ? product.name : 'نامشخص';
      inventoryByTypeMap[productType] = (inventoryByTypeMap[productType] || 0) + (r.finalAmount || 0);
    });
    
    periodFilteredDeliveries.forEach(d => {
      const product = allProducts.find((p: BaseDataItem) => p.id === d.productId);
      const productType = product ? product.name : 'نامشخص';
      inventoryByTypeMap[productType] = (inventoryByTypeMap[productType] || 0) - (d.amount || 0);
    });

    // افزودن تراکنش‌های افت به توزیع موجودی
    periodFilteredWastage.forEach((t: any) => {
      const isOwned = t.transactionType === 'owned';
      // برای owned از gainedProductCode/Name استفاده شده؛ در گزارش از productName استفاده می‌کنیم
      const productName = t.productName || 'نامشخص';
      inventoryByTypeMap[productName] = (inventoryByTypeMap[productName] || 0) + (isOwned ? Math.abs(t.amount || 0) : -(Math.abs(t.amount || 0)));
    });
    
    const inventoryByType = Object.entries(inventoryByTypeMap)
      .map(([type, amount]) => ({
        type,
        amount,
        percentage: totalInventory > 0 ? (amount / totalInventory) * 100 : 0
      }))
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    
    // Calculate trends based on selected period and date range
    const trends = [];
    const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    const quarterNames = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
    
    if (selectedPeriod === 'month') {
      // Calculate months between startDate and endDate
      const months = [];
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      while (current <= end) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
        // Limit to prevent infinite loop or too many bars
        if (months.length > 24) break;
      }
      
      months.forEach(targetDate => {
        const monthName = monthNames[targetDate.getMonth()];
        const year = targetDate.getFullYear();
        
        const monthReceipts = periodFilteredReceipts.filter(r => {
          const receiptDate = new Date(r.receiptDate || r.createdAt);
          return receiptDate.getMonth() === targetDate.getMonth() && receiptDate.getFullYear() === targetDate.getFullYear();
        }).reduce((sum, r) => sum + (r.finalAmount || 0), 0)
        + periodFilteredWastage
            .filter((t: any) => t.transactionType === 'owned')
            .filter((t: any) => {
              const d = new Date(t.transactionDate || t.createdAt);
              return d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear();
            })
            .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
        
        const monthDeliveries = periodFilteredDeliveries.filter(d => {
          const deliveryDate = new Date(d.deliveryDate || d.createdAt);
          return deliveryDate.getMonth() === targetDate.getMonth() && deliveryDate.getFullYear() === targetDate.getFullYear();
        }).reduce((sum, d) => sum + (d.amount || 0), 0)
        + periodFilteredWastage
            .filter((t: any) => t.transactionType === 'consignment')
            .filter((t: any) => {
              const d = new Date(t.transactionDate || t.createdAt);
              return d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear();
            })
            .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
        
        trends.push({
          period: `${monthName} ${year}`,
          receipts: monthReceipts,
          deliveries: monthDeliveries
        });
      });
    } else if (selectedPeriod === 'quarter') {
      // Calculate quarters between startDate and endDate
      const quarters = [];
      let current = new Date(startDate.getFullYear(), Math.floor(startDate.getMonth() / 3) * 3, 1);
      const end = new Date(endDate.getFullYear(), Math.floor(endDate.getMonth() / 3) * 3, 1);
      
      while (current <= end) {
        quarters.push(new Date(current));
        current.setMonth(current.getMonth() + 3);
        if (quarters.length > 12) break;
      }
      
      quarters.forEach(targetDate => {
        const quarter = Math.floor(targetDate.getMonth() / 3);
        const year = targetDate.getFullYear();
        const quarterName = quarterNames[quarter % 4];
        
        const quarterReceipts = periodFilteredReceipts.filter(r => {
          const receiptDate = new Date(r.receiptDate || r.createdAt);
          const receiptQuarter = Math.floor(receiptDate.getMonth() / 3);
          return receiptQuarter === quarter && receiptDate.getFullYear() === year;
        }).reduce((sum, r) => sum + (r.finalAmount || 0), 0)
        + periodFilteredWastage
            .filter((t: any) => t.transactionType === 'owned')
            .filter((t: any) => {
              const d = new Date(t.transactionDate || t.createdAt);
              const q = Math.floor(d.getMonth() / 3);
              return q === quarter && d.getFullYear() === year;
            })
            .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
        
        const quarterDeliveries = periodFilteredDeliveries.filter(d => {
          const deliveryDate = new Date(d.deliveryDate || d.createdAt);
          const deliveryQuarter = Math.floor(deliveryDate.getMonth() / 3);
          return deliveryQuarter === quarter && deliveryDate.getFullYear() === year;
        }).reduce((sum, d) => sum + (d.amount || 0), 0)
        + periodFilteredWastage
            .filter((t: any) => t.transactionType === 'consignment')
            .filter((t: any) => {
              const d = new Date(t.transactionDate || t.createdAt);
              const q = Math.floor(d.getMonth() / 3);
              return q === quarter && d.getFullYear() === year;
            })
            .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
        
        trends.push({
          period: `${quarterName} ${year}`,
          receipts: quarterReceipts,
          deliveries: quarterDeliveries
        });
      });
    } else {
      // Yearly trends
      const years = [];
      let current = startDate.getFullYear();
      const end = endDate.getFullYear();
      
      while (current <= end) {
        years.push(current);
        current++;
        if (years.length > 10) break;
      }
      
      years.forEach(year => {
        const yearReceipts = periodFilteredReceipts.filter(r => {
          const receiptDate = new Date(r.receiptDate || r.createdAt);
          return receiptDate.getFullYear() === year;
        }).reduce((sum, r) => sum + (r.finalAmount || 0), 0)
        + periodFilteredWastage
            .filter((t: any) => t.transactionType === 'owned')
            .filter((t: any) => {
              const d = new Date(t.transactionDate || t.createdAt);
              return d.getFullYear() === year;
            })
            .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
        
        const yearDeliveries = periodFilteredDeliveries.filter(d => {
          const deliveryDate = new Date(d.deliveryDate || d.createdAt);
          return deliveryDate.getFullYear() === year;
        }).reduce((sum, d) => sum + (d.amount || 0), 0)
        + periodFilteredWastage
            .filter((t: any) => t.transactionType === 'consignment')
            .filter((t: any) => {
              const d = new Date(t.transactionDate || t.createdAt);
              return d.getFullYear() === year;
            })
            .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
        
        trends.push({
          period: `${year}`,
          receipts: yearReceipts,
          deliveries: yearDeliveries
        });
      });
    }
    
    // Calculate top companies
    const companyTransactions: Record<string, { amount: number; transactions: number }> = {};
    
    // Process receipts
    periodFilteredReceipts.forEach(r => {
      const company = companiesCategory.find((c: BaseDataItem) => c.id === r.companyId);
      if (company) {
        if (!companyTransactions[company.name]) {
          companyTransactions[company.name] = { amount: 0, transactions: 0 };
        }
        companyTransactions[company.name].amount += r.finalAmount || 0;
        companyTransactions[company.name].transactions += 1;
      }
    });
    
    // Process deliveries
    periodFilteredDeliveries.forEach(d => {
      const company = companiesCategory.find((c: BaseDataItem) => c.id === d.companyId);
      if (company) {
        if (!companyTransactions[company.name]) {
          companyTransactions[company.name] = { amount: 0, transactions: 0 };
        }
        companyTransactions[company.name].amount += d.amount || 0;
        companyTransactions[company.name].transactions += 1;
      }
    });
    
    const topCompanies = Object.entries(companyTransactions)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        transactions: data.transactions
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    // Calculate tank utilization
    // وضعیت پر شدن مخازن بر اساس همان فرمول تجمیعی (امانی + تملیکی)
    const tankUtilization = tanksCategory.map((tank: BaseDataItem) => {
      // ظرفیت مخزن
      const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
      const capacityMatch = capacityStr.match(/[\d,]+/);
      const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, '')) : 5000000;

      // داده‌های محدود به این مخزن
      const tankReceipts = periodFilteredReceipts.filter(r => r.tankId === tank.id);
      const tankDeliveries = periodFilteredDeliveries.filter(d => d.tankId === tank.id);
      const tankWastage = periodFilteredWastage.filter((t: any) => t.tankId === tank.id);
      const tankAdjustments = periodFilteredAdjustments.filter((adj: any) => adj.tankId === tank.id);

      // رسیدهای تملیکی در این مخزن
      const tOwnedReceipts = tankReceipts
        .filter((r: any) => r && r.userType === 'owned' && !r.isVoided)
        .reduce((sum, r) => {
          const base =
            (r.receiptBasisAmount && r.receiptBasisAmount > 0 && r.receiptBasisAmount) ||
            (r.finalAmount && r.finalAmount > 0 && r.finalAmount) ||
            (r.amount && r.amount > 0 && r.amount) ||
            0;
          return sum + base;
        }, 0);

      // رسیدهای امانی در این مخزن
      const tConsignmentReceipts = tankReceipts
        .filter((r: any) => r && r.userType === 'consignment' && !r.isVoided)
        .reduce((sum, r) => {
          let baseAmount = 0;
          if (r.receiptBasisAmount && r.receiptBasisAmount > 0) {
            baseAmount = r.receiptBasisAmount;
          } else if (r.finalAmount && r.finalAmount > 0) {
            baseAmount = r.finalAmount;
          } else if (r.amount && r.amount > 0) {
            baseAmount = r.amount;
          } else {
            baseAmount =
              (r.shipUnloadingAmount || 0) +
              (r.tankShoreAmount || 0) +
              (r.shipBillOfLadingAmount || 0) +
              (r.weightGross || 0);
          }
          return sum + baseAmount;
        }, 0);

      // اسناد اضافه انبار در این مخزن
      const tOwnedAdditions = tankAdjustments
        .filter((adj: any) => adj.adjustmentType === 'addition' && adj.productType === 'owned')
        .reduce((sum, adj) => sum + (adj.quantity || 0), 0);

      const tConsignmentAdditions = tankAdjustments
        .filter((adj: any) => adj.adjustmentType === 'addition' && adj.productType === 'consignment')
        .reduce((sum, adj) => sum + (adj.quantity || 0), 0);

      // حواله‌های تملیکی و امانی در این مخزن
      const tOwnedDeliveries = (periodFilteredOwnershipSlips as any[])
        .filter(d => d.tankId === tank.id)
        .reduce((sum, d) => sum + (d.amount || d.finalAmount || 0), 0);

      const tConsignmentDeliveries = [...baseConsignmentSlips, ...generalConsignmentDeliveries]
        .filter(d => d.tankId === tank.id)
        .reduce((sum, d) => sum + (d.amount || d.finalAmount || 0), 0);

      // افت‌ها در این مخزن
      const tOwnedGained = tankWastage
        .filter((t: any) => t.transactionType === 'owned' && !t.isVoided)
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      const tConsignmentLoss = tankWastage
        .filter((t: any) => t.transactionType === 'consignment' && !t.isVoided)
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      // اسناد کسر انبار در این مخزن
      const tOwnedDeductions = tankAdjustments
        .filter((adj: any) => adj.adjustmentType === 'deduction' && adj.productType === 'owned')
        .reduce((sum, adj) => sum + (adj.quantity || 0), 0);

      const tConsignmentDeductions = tankAdjustments
        .filter((adj: any) => adj.adjustmentType === 'deduction' && adj.productType === 'consignment')
        .reduce((sum, adj) => sum + (adj.quantity || 0), 0);

      const tOwnedFinal = tOwnedReceipts + tOwnedAdditions + tOwnedGained - tOwnedDeliveries - tOwnedDeductions;
      const tConsignmentFinal = tConsignmentReceipts + tConsignmentAdditions - tConsignmentDeliveries - tConsignmentLoss - tConsignmentDeductions;
      const currentAmount = tOwnedFinal + tConsignmentFinal;

      const utilization = capacity > 0 ? (currentAmount / capacity) * 100 : 0;

      return {
        tank: tank.name,
        capacity,
        current: currentAmount,
        utilization
      };
    });
    
    // محاسبه ظرفیت کل مخازن با توجه به فیلترها
    let totalTankCapacity = 0;
    tanksCategory.forEach((tank: BaseDataItem) => {
      // اگر فیلتر مخزن داریم، فقط همان مخزن
      if (selectedTank !== 'all' && tank.id !== selectedTank) return;
      
      // اگر فیلتر سایت داریم و سایت روی مخزن تعریف شده، باید هم‌خوان باشد
      if (selectedSite !== 'all' && tank.siteId && tank.siteId !== selectedSite) return;
      
      // اگر سایت فیلتر شده اما siteId مخزن خالی است، آن را رد نکن تا ظرفیت صفر نشود
      const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
      const capacityMatch = capacityStr.match(/[\d,]+/);
      const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, '')) : 5000000;
      totalTankCapacity += capacity;
    });
    const emptyCapacity = Math.max(0, totalTankCapacity - combinedFinal);

    const data: AnalyticsData = {
      totalInventory,
      monthlyReceipts,
      monthlyDeliveries,
      overdueContracts,
      activeContracts,
      inventoryByType,
      monthlyTrends: trends,
      topCompanies,
      tankUtilization,
      tankInventoryBreakdown: {
        ownedReceiptsAmount,
        ownedAdditionDocuments,
        ownedDeliveries,
        ownedGainedAmount,
        ownedDeductionDocuments,
        ownedConsumedProducts,
        ownedProducedProducts,
        consignmentReceiptsAmount,
        consignmentAdditions,
        consignmentDeliveries,
        consignmentDeductionAmount,
        consignmentDeductionDocuments,
        consignmentConsumedProducts,
        consignmentProducedProducts,
        ownedFinal,
        consignmentFinal,
        combinedFinal,
        totalTankCapacity,
        emptyCapacity
      }
    };
    
    setAnalyticsData(data);
    setLoading(false);
  };
  
  // Initial data calculation
  useEffect(() => {
    calculateAnalyticsData();
    
    // Listen for base data updates
    const handleBaseDataUpdate = () => {
      calculateAnalyticsData();
    };
    
    window.addEventListener('baseDataUpdated', handleBaseDataUpdate);
    
    return () => {
      window.removeEventListener('baseDataUpdated', handleBaseDataUpdate);
    };
  }, []);
  
  // Recalculate when filters change
  useEffect(() => {
    calculateAnalyticsData();
  }, [selectedPeriod, selectedSite, selectedProductType, selectedCompany, selectedTank, fromDate, toDate]);
  
  const exportAnalytics = () => {
    if (!analyticsData) return;
    
    // Create comprehensive analytics report
    const reportData = {
      'خلاصه کلی': {
        'کل موجودی': `${formatPersianNumber(analyticsData.totalInventory)} کیلوگرم`,
        'رسید ماهانه': `${formatPersianNumber(analyticsData.monthlyReceipts)} کیلوگرم`,
        'حواله ماهانه': `${formatPersianNumber(analyticsData.monthlyDeliveries)} کیلوگرم`,
        'قرارداد های فعال': formatPersianNumber(analyticsData.activeContracts),
        'قرارداد های سررسید': formatPersianNumber(analyticsData.overdueContracts)
      },
      'موجودی بر اساس نوع کالا': analyticsData.inventoryByType,
      'روند ماهانه': analyticsData.monthlyTrends,
      'برترین شرکت ها': analyticsData.topCompanies,
      'وضعیت مخازن': analyticsData.tankUtilization
    };
    
    // Create Excel format
    const excelData = Object.entries(reportData).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map(item => Object.values(item).join(',')).join('\n')}`;
      } else if (typeof value === 'object') {
        return `${key}:\n${Object.entries(value).map(([k, v]) => `${k},${v}`).join('\n')}`;
      }
      return `${key}: ${value}`;
    }).join('\n\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + excelData], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `گزارش_تحلیلی_${formatPersianDate(new Date())}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (loading || !analyticsData) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری داده‌های تحلیلی...</p>
        </div>
      </div>
    );
  }
  
  // Colors for charts
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">تحلیل و بررسی</h1>
            <p className="text-gray-600">تحلیل جامع عملکرد انبار و مخازن</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                calculateAnalyticsData();
                window.dispatchEvent(new CustomEvent('refreshData'));
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              title="به‌روزرسانی اطلاعات"
            >
              <RefreshCw className="h-5 w-5" />
              به‌روزرسانی
            </button>
            <button
              onClick={exportAnalytics}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              title="خروجی اکسل"
            >
              <Download className="h-5 w-5" />
              خروجی اکسل
            </button>
            <img 
              src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">فیلترها:</span>
              </div>
              
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'quarter' | 'year')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="month">ماهانه</option>
                <option value="quarter">فصلی</option>
                <option value="year">سالانه</option>
              </select>
              
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">همه سایت ها</option>
                {baseDataCategories
                  .find(c => c.id === 'sites')
                  ?.items.map((site: BaseDataItem) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
              </select>
              
              <select
                value={selectedProductType}
                onChange={(e) => setSelectedProductType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">همه محصولات</option>
                {[
                  ...(baseDataCategories.find(c => c.id === 'owned-products')?.items || []),
                  ...(baseDataCategories.find(c => c.id === 'consignment-products')?.items || [])
                ].map((product: BaseDataItem) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
              
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">همه شرکت‌ها</option>
                {baseDataCategories
                  .find(c => c.id === 'companies')
                  ?.items.map((company: BaseDataItem) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
              </select>
              
              <select
                value={selectedTank}
                onChange={(e) => setSelectedTank(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">همه مخازن</option>
                {baseDataCategories
                  .find(c => c.id === 'tanks')
                  ?.items.map((tank: BaseDataItem) => (
                    <option key={tank.id} value={tank.id}>{tank.name}</option>
                  ))}
              </select>

              {/* فیلتر از تاریخ / تا تاریخ با تقویم فارسی (مشابه «تاریخ انتخاب شده») */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 inline ml-1" />
                  از تاریخ
                </label>
                <PersianDatePicker
                  value={fromDate}
                  onChange={(date) => setFromDate(date)}
                  placeholder="تاریخ شروع را انتخاب کنید"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 inline ml-1" />
                  تا تاریخ
                </label>
                <PersianDatePicker
                  value={toDate}
                  onChange={(date) => setToDate(date)}
                  placeholder="تاریخ پایان را انتخاب کنید"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={exportAnalytics}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                خروجی گزارش
              </button>
            </div>
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">کل موجودی</p>
                <p className="text-2xl font-bold text-blue-600">{formatPersianNumber(analyticsData.totalInventory)}</p>
                <p className="text-xs text-gray-500">کیلوگرم</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">رسید ماهانه</p>
                <p className="text-2xl font-bold text-green-600">{formatPersianNumber(analyticsData.monthlyReceipts)}</p>
                <p className="text-xs text-gray-500">کیلوگرم</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">حواله ماهانه</p>
                <p className="text-2xl font-bold text-orange-600">{formatPersianNumber(analyticsData.monthlyDeliveries)}</p>
                <p className="text-xs text-gray-500">کیلوگرم</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">قرارداد فعال</p>
                <p className="text-2xl font-bold text-purple-600">{formatPersianNumber(analyticsData.activeContracts)}</p>
                <p className="text-xs text-gray-500">قرارداد</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">سررسید شده</p>
                <p className="text-2xl font-bold text-red-600">{formatPersianNumber(analyticsData.overdueContracts)}</p>
                <p className="text-xs text-gray-500">قرارداد</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedPeriod === 'month' ? 'روند ماهانه' : 
               selectedPeriod === 'quarter' ? 'روند فصلی' : 'روند سالانه'} رسید و حواله
            </h3>
          </div>
          
          <div className="h-80 flex items-center justify-center">
            <CustomBarChart 
              data={analyticsData.monthlyTrends} 
              width={800} 
              height={350}
              title={selectedPeriod === 'month' ? 'روند ماهانه' : 
                     selectedPeriod === 'quarter' ? 'روند فصلی' : 'روند سالانه'} 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Inventory by Type */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">توزیع موجودی بر اساس نوع کالا</h3>
            </div>
            
            <div className="flex items-center justify-center">
              <CustomPieChart 
                data={analyticsData.inventoryByType} 
                width={350} 
                height={350}
                title="توزیع موجودی بر اساس نوع کالا"
              />
            </div>
          </div>
          
          {/* Monthly Trends */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedPeriod === 'month' ? 'آمار ماهانه' : 
                 selectedPeriod === 'quarter' ? 'آمار فصلی' : 'آمار سالانه'}
              </h3>
            </div>
            
            <div className="space-y-4">
              {analyticsData.monthlyTrends.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">{item.period}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">رسید</div>
                      <div className="text-sm font-bold text-green-600">
                        {formatPersianNumber(item.receipts)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">حواله</div>
                      <div className="text-sm font-bold text-orange-600">
                        {formatPersianNumber(item.deliveries)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Companies */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">برترین شرکت های طرف حساب</h3>
            </div>
            
            <div className="space-y-4">
              {analyticsData.topCompanies.map((company, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{company.name}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-gray-900">
                      {formatPersianNumber(company.amount)} کیلوگرم
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPersianNumber(company.transactions)} تراکنش
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tank Utilization */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">وضعیت پر شدن مخازن</h3>
            </div>
            
            <div className="space-y-4">
              {analyticsData.tankUtilization.map((tank, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{tank.tank}</span>
                    <span className={`text-sm font-bold ${
                      tank.utilization >= 90 ? 'text-red-600' :
                      tank.utilization >= 70 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {formatPersianNumber(tank.utilization)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full ${
                        tank.utilization >= 90 ? 'bg-red-500' :
                        tank.utilization >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${tank.utilization}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>فعلی: {formatPersianNumber(tank.current)} کیلوگرم</span>
                    <span>ظرفیت: {formatPersianNumber(tank.capacity)} کیلوگرم</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* نمایش/عدم نمایش پکیج موجودی و فیلترها */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={showInventoryPackage}
            onChange={(e) => setShowInventoryPackage(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="text-sm text-gray-700">نمایش پکیج موجودی مخازن و فیلترها</label>
        </div>

        {showInventoryPackage && (
          <>
            {/* هشدار تاریخ */}
            {(() => {
              const today = new Date();
              const todayPersian = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const selectedPersian = new Date(upToDate.getFullYear(), upToDate.getMonth(), upToDate.getDate());
              const isDateDifferent = selectedPersian.getTime() !== todayPersian.getTime();
              
              return isDateDifferent ? (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-amber-400 ml-2" />
                    <p className="text-amber-800 font-medium">گزارش موجودی به روز نیست</p>
                  </div>
                  <p className="text-amber-700 text-sm mt-1">
                    تاریخ انتخاب شده ({formatPersianDate(upToDate)}) با تاریخ امروز ({formatPersianDate(new Date())}) تفاوت دارد
                  </p>
                </div>
              ) : null;
            })()}

            {/* فیلترهای گزارش موجودی */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline ml-1" />
                  تا تاریخ
                </label>
                <PersianDatePicker
                  value={upToDate}
                  onChange={(date) => {
                    if (date) {
                      setUpToDate(date);
                    }
                  }}
                  placeholder="تاریخ را انتخاب کنید"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Warehouse className="w-4 h-4 inline ml-1" />
                  نام مخزن
                </label>
                <select
                  value={selectedTankForFilter}
                  onChange={(e) => setSelectedTankForFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">تمام مخازن</option>
                  {uniqueTanks.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Package className="w-4 h-4 inline ml-1" />
                  سایت مخازن
                </label>
                <select
                  value={selectedSiteForFilter}
                  onChange={(e) => setSelectedSiteForFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">تمام سایت‌ها</option>
                  {uniqueSites.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end gap-2">
                <button
                  onClick={() => setUpToDate(new Date())}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  امروز
                </button>
                <button
                  onClick={() => {
                    setUpToDate(new Date());
                    setSelectedTankForFilter('');
                    setSelectedSiteForFilter('');
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  بازنشانی فیلترها
                </button>
              </div>
            </div>

            {/* جداول موجودی مخازن */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Table 1: موجودی مخازن امانی و تملیکی */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden lg:col-span-2">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
              <h2 className="text-xl font-semibold">موجودی مخازن امانی و تملیکی</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                {(() => {
                  const inventory = calculateConsignmentOwnedTanksInventory(selectedSiteForFilter || undefined, selectedTankForFilter || undefined);
                  const totalCapacity = calculateTotalTankCapacity(selectedSiteForFilter || undefined, selectedTankForFilter || undefined);
                  const emptyCapacity = Math.max(0, totalCapacity - inventory.finalInventory);
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span>رسیدهای تملیکی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.ownedReceiptsAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>سند اضافه تملیکی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.ownedAdditionDocuments)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>حواله‌های تملیکی:</span>
                        <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedDeliveries)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>افزودن به تملیکی از محل افت:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.ownedGainedAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>سند کسر تملیکی:</span>
                        <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedDeductionDocuments)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>رسیدهای امانی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.consignmentReceiptsAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>سند اضافه امانی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.consignmentAdditions)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>حواله‌های امانی:</span>
                        <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeliveries)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>کسر از امانی از محل افت:</span>
                        <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeductionAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>سند کسر امانی:</span>
                        <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeductionDocuments)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>کالای مصرفی امانی:</span>
                        <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentConsumedProducts || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>کالای تولیدی امانی:</span>
                        <span className="font-semibold text-green-600">+{formatPersianNumber(inventory.consignmentProducedProducts || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>کالای مصرفی تملیکی:</span>
                        <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedConsumedProducts || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>کالای تولیدی تملیکی:</span>
                        <span className="font-semibold text-green-600">+{formatPersianNumber(inventory.ownedProducedProducts || 0)}</span>
                      </div>
                      <hr className="col-span-full border-gray-300" />
                      <div className="flex justify-between text-lg font-bold text-blue-900 col-span-full">
                        <span>ظرفیت مخازن:</span>
                        <span>{formatPersianNumber(totalCapacity)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-green-900 col-span-full">
                        <span>موجودی نهایی (امانی + تملیکی):</span>
                        <span>{formatPersianNumber(inventory.finalInventory)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-orange-900 col-span-full">
                        <span>ظرفیت خالی مخزن (کیلوگرم):</span>
                        <span>{formatPersianNumber(emptyCapacity)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Table 2: موجودی مخازن امانی */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
              <h2 className="text-xl font-semibold">موجودی مخازن امانی</h2>
            </div>
            <div className="p-4">
              {(() => {
                const inventory = calculateConsignmentTanksInventory(selectedSiteForFilter || undefined, selectedTankForFilter || undefined);
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>رسیدهای امانی:</span>
                      <span className="font-semibold">{formatPersianNumber(inventory.consignmentReceiptsAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>سند اضافه امانی:</span>
                      <span className="font-semibold">{formatPersianNumber(inventory.consignmentAdditions)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>حواله‌های امانی:</span>
                      <span className="font-semibold">-{formatPersianNumber(inventory.consignmentDeliveries)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>کسر از امانی از محل افت:</span>
                      <span className="font-semibold">-{formatPersianNumber(inventory.consignmentDeductionAmount)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>سند کسر امانی:</span>
                      <span className="font-semibold">-{formatPersianNumber(inventory.consignmentDeductionDocuments)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>کالای مصرفی امانی:</span>
                      <span className="font-semibold">-{formatPersianNumber(inventory.consignmentConsumedProducts || 0)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>کالای تولیدی امانی:</span>
                      <span className="font-semibold">+{formatPersianNumber(inventory.consignmentProducedProducts || 0)}</span>
                    </div>
                    <hr className="border-green-300" />
                    <div className="flex justify-between text-lg font-bold text-green-900">
                      <span>موجودی نهایی (امانی):</span>
                      <span>{formatPersianNumber(inventory.finalInventory)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Table 3: موجودی مخازن تملیکی */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
              <h2 className="text-xl font-semibold">موجودی مخازن تملیکی</h2>
            </div>
            <div className="p-4">
              {(() => {
                const inventory = calculateOwnedTanksInventory(selectedSiteForFilter || undefined, selectedTankForFilter || undefined);
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>رسیدهای تملیکی:</span>
                      <span className="font-semibold">{formatPersianNumber(inventory.ownedReceiptsAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>سند اضافه تملیکی:</span>
                      <span className="font-semibold">{formatPersianNumber(inventory.ownedAdditionDocuments)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>حواله‌های تملیکی:</span>
                      <span className="font-semibold">-{formatPersianNumber(inventory.ownedDeliveries)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>افزودن به تملیکی از محل افت:</span>
                      <span className="font-semibold">{formatPersianNumber(inventory.ownedGainedAmount)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>سند کسر تملیکی:</span>
                      <span className="font-semibold">-{formatPersianNumber(inventory.ownedDeductionDocuments)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>کالای مصرفی تملیکی:</span>
                      <span className="font-semibold">-{formatPersianNumber(inventory.ownedConsumedProducts || 0)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>کالای تولیدی تملیکی:</span>
                      <span className="font-semibold">+{formatPersianNumber(inventory.ownedProducedProducts || 0)}</span>
                    </div>
                    <hr className="border-purple-300" />
                    <div className="flex justify-between text-lg font-bold text-purple-900">
                      <span>موجودی نهایی (تملیکی):</span>
                      <span>{formatPersianNumber(inventory.finalInventory)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};