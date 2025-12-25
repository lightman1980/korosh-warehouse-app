import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, Filter, Download, Package, FileText, Calculator, X, Calendar, 
  AlertCircle, Save, Edit2, Trash2, Eye, CheckCircle, Clock, DollarSign, 
  TrendingUp, BarChart3, RefreshCw, ChevronDown, ChevronUp, Activity, Printer, 
  ArrowLeft, Building as BuildingIcon, Info, Database, Droplets, Scale, 
  Warehouse, AlertTriangle, AlertOctagon, Truck, FlaskConical, Minimize2, Maximize2 
} from 'lucide-react';
import { useSortingAndFiltering } from '../../hooks/useSortingAndFiltering';
import { DataTable } from './DataTable';
import { FieldWithTooltip } from './FieldWithTooltip';
import { InvoiceForm } from './InvoiceForm';
import { ChartsSection } from './ChartsSection';
import { Receipt, Contract, TableColumn } from '../../types/accounting';
import { formatPersianNumber, formatPersianDate } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../Common/PersianDatePicker';

/////////////////////////////////////////////////////////////
// کامپوننت جدید SimplePersianDateField با اندازه بزرگتر
/////////////////////////////////////////////////////////////
const SimplePersianDateField: React.FC<{
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}> = ({
  value,
  onChange,
  placeholder = "تاریخ را وارد کنید",
  id,
  className = "",
  label,
  required = false,
  disabled = false
}) => {
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');

  useEffect(() => {
    if (value) {
      const persianDate = formatPersianDate(value).split('/');
      if (persianDate.length === 3) {
        setDay(persianDate[2]);
        setMonth(persianDate[1]);
        setYear(persianDate[0]);
      }
    }
  }, [value]);

  const handleDateChange = () => {
    if (day && month && year) {
      // تبدیل تاریخ شمسی به میلادی
      const gDate = toGregorian(parseInt(year), parseInt(month), parseInt(day));
      const date = new Date(gDate.gy, gDate.gm - 1, gDate.gd);
      onChange?.(date);
    } else {
      onChange?.(undefined);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="سال"
          maxLength={4}
          disabled={disabled}
          className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-center"
          onBlur={handleDateChange}
        />
        <span className="text-gray-500">/</span>
        <input
          type="text"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          placeholder="ماه"
          maxLength={2}
          disabled={disabled}
          className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg text-center"
          onBlur={handleDateChange}
        />
        <span className="text-gray-500">/</span>
        <input
          type="text"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          placeholder="روز"
          maxLength={2}
          disabled={disabled}
          className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg text-center"
          onBlur={handleDateChange}
        />
      </div>
    </div>
  );
};

// Function to convert Gregorian to Jalali
const toGregorian = (jy: number, jm: number, jd: number) => {
  const PERSIAN_EPOCH = 1948321;
  let epyear = jy - 979;
  const epochday = PERSIAN_EPOCH + 365 * epyear + Math.floor(epyear / 33) * 8 + Math.floor(((epyear % 33) + 3) / 4) + (jm <= 6 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) + jd - 1;
  const a = epochday + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const gd = e - Math.floor((153 * m + 2) / 5) + 1;
  const gm = m + 3 - 12 * Math.floor(m / 10);
  const gy = 100 * b + d - 4800 + Math.floor(m / 10);
  return { gy, gm, gd };
};

// Multi-select dropdown component برای فیلترهای موجودی
const MultiSelectDropdown = ({ options, selectedValues, onChange, label, placeholder }: { 
  options: [string, string][], 
  selectedValues: string | string[], 
  onChange: (values: string | string[]) => void,
  label: string,
  placeholder: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string, event?: React.MouseEvent) => {
    const currentValues = Array.isArray(selectedValues) ? selectedValues : (selectedValues ? [selectedValues] : []);
    let newValues;
    if (event?.ctrlKey) {
      newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
    } else {
      if (currentValues.length === 1 && currentValues[0] === value) {
        newValues = [];
      } else {
        newValues = [value];
      }
    }
    onChange(newValues.length === 1 ? newValues[0] : (newValues.length === 0 ? '' : newValues));
  };

  const currentValues = Array.isArray(selectedValues) ? selectedValues : (selectedValues ? [selectedValues] : []);
  const isAllSelected = options.length > 0 && currentValues.length === options.length;

  const toggleAll = () => {
    if (isAllSelected) {
      onChange('');
    } else {
      onChange(options.map(o => o[0]));
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="truncate">
          {currentValues.length === 0 
            ? placeholder 
            : currentValues.length === options.length 
              ? 'همه انتخاب شده‌اند' 
              : `${currentValues.length} مورد انتخاب شده`}
        </span>
        <Filter className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
            <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2"
              />
              <span className="text-sm font-medium text-gray-700">انتخاب همه</span>
            </label>
          </div>
            <div className="p-1">
              {options.map(([id, name]) => (
                <label key={id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={(e) => {
                  e.preventDefault();
                  toggleOption(id, e);
                }}>
                  <input
                    type="checkbox"
                    checked={currentValues.includes(id)}
                    readOnly
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2"
                  />
                  <span className="text-sm text-gray-700">{name}</span>
                </label>
              ))}
            </div>
        </div>
      )}
    </div>
  );
};

interface UninvoicedReceiptsTabProps {
  receipts: Receipt[];
  contracts: Contract[];
  searchTerm: string;
  handleSaveInvoice: (invoice: Partial<any>, editingInvoice: string | null) => void;
  systemDate: Date;
  calculateRemainingPermitAmount: (receiptId: string, contractId: string) => number;
}

export const UninvoicedReceiptsTab: React.FC<UninvoicedReceiptsTabProps> = ({ 
  receipts, 
  contracts, 
  searchTerm,
  handleSaveInvoice,
  systemDate,
  calculateRemainingPermitAmount
}) => {
  const [showInvoiceForm, setShowInvoiceForm] = useState<string | null>(null);
  const [isReceiptTableMinimized, setIsReceiptTableMinimized] = useState<boolean>(false);
  const storage = DataStorage.getInstance();

  // State for inventory package
  const [baseData, setBaseData] = useState<Record<string, any[]>>({});
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [selectedTankForFilter, setSelectedTankForFilter] = useState<string>('');
  const [selectedSiteForFilter, setSelectedSiteForFilter] = useState<string>('');
  const [upToDate, setUpToDate] = useState<Date>(new Date());
  const [showInventoryPackage, setShowInventoryPackage] = useState<boolean>(true);

  // Helper function for safe number conversion
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
    const num = parseFloat(value.toString());
    return isNaN(num) ? defaultValue : num;
  };

  const loadBaseData = useCallback(() => {
    try {
      const allCategories = storage.getAllData() || {};
      const loadedBaseData: Record<string, any[]> = {};
      const baseDataCategories = storage.loadData<any[]>('baseDataCategories') || [];
      if (Array.isArray(baseDataCategories)) {
        baseDataCategories.forEach((category: any) => {
          if (category && category.id && category.items) {
            loadedBaseData[category.id] = category.items;
          }
        });
      }
      Object.keys(allCategories).forEach(key => {
        if (key.startsWith('category_')) {
          const categoryKey = key.replace('category_', '');
          if (allCategories[key]?.items) {
            loadedBaseData[categoryKey] = allCategories[key].items;
          }
        }
      });
      setBaseData(loadedBaseData);
    } catch (error) {
      console.error('Error loading base data:', error);
    }
  }, [storage]);

  useEffect(() => {
    loadBaseData();
    const handleBaseDataUpdate = () => loadBaseData();
    window.addEventListener('baseDataUpdated', handleBaseDataUpdate);
    return () => window.removeEventListener('baseDataUpdated', handleBaseDataUpdate);
  }, [loadBaseData]);

  const memoizedInventoryData = useMemo(() => {
    const activeTanks = (baseData.tanks || []).filter((t: any) => t.isActive !== false);
    const activeTankIds = new Set(activeTanks.map((t: any) => t.id));

    const allReceipts = (storage.loadData<any[]>('receipts') || []).filter((r: any) => 
      r && !r.isVoided && new Date(r.receiptDate) <= upToDate && activeTankIds.has(r.tankId)
    );
    const allAdjustments = (storage.loadData<any[]>('inventoryAdjustments') || []).filter((adj: any) => 
      adj && !adj.isVoided && new Date(adj.documentDate) <= upToDate && activeTankIds.has(adj.tankId)
    );
    const allDeliveries = (storage.loadData<any[]>('ownership-delivery-slips') || []).filter((d: any) => 
      d && !d.isVoided && new Date(d.deliveryDate) <= upToDate && activeTankIds.has(d.tankId)
    );
    const allConsignmentSlips = (storage.loadData<any[]>('consignment-delivery-slips') || []).filter((d: any) => {
      if (!d || d.isVoided || !activeTankIds.has(d.tankId)) return false;
      const dateValue = d.deliveryDate || d.slipDate;
      if (!dateValue) return true;
      const deliveryDate = new Date(dateValue);
      return isNaN(deliveryDate.getTime()) || deliveryDate <= upToDate;
    });
    const allGeneralDeliveries = (storage.loadData<any[]>('deliveries') || []).filter((d: any) => {
      if (!d || d.isVoided || !activeTankIds.has(d.tankId)) return false;
      const dateValue = d.deliveryDate || d.createdAt;
      if (!dateValue) return false;
      const deliveryDate = new Date(dateValue);
      return !isNaN(deliveryDate.getTime()) && deliveryDate <= upToDate;
    });
    const allWastage = (storage.loadData<any[]>('wastageTransactions') || []).filter((t: any) => 
      t && !t.isVoided && new Date(t.transactionDate) <= upToDate && activeTankIds.has(t.tankId)
    );
    const allConversions = (storage.loadData<any[]>('productConversions') || []).filter((c: any) => 
      c && !c.isVoided && new Date(c.documentDate) <= upToDate && activeTankIds.has(c.tankId)
    );

    const tankData: Record<string, any> = {};
    activeTankIds.forEach(id => {
      tankData[id] = {
        receipts: [], adjustments: [], deliveries: [], consignmentSlips: [], 
        generalDeliveries: [], wastage: [], conversions: []
      };
    });

    allReceipts.forEach(r => { if(tankData[r.tankId]) tankData[r.tankId].receipts.push(r); });
    allAdjustments.forEach(a => { if(tankData[a.tankId]) tankData[a.tankId].adjustments.push(a); });
    allDeliveries.forEach(d => { if(tankData[d.tankId]) tankData[d.tankId].deliveries.push(d); });
    allConsignmentSlips.forEach(s => { if(tankData[s.tankId]) tankData[s.tankId].consignmentSlips.push(s); });
    allGeneralDeliveries.forEach(d => { if(tankData[d.tankId]) tankData[d.tankId].generalDeliveries.push(d); });
    allWastage.forEach(w => { if(tankData[w.tankId]) tankData[w.tankId].wastage.push(w); });
    allConversions.forEach(c => { if(tankData[c.tankId]) tankData[c.tankId].conversions.push(c); });

    return { tankData, activeTanks };
  }, [storage, upToDate, baseData.tanks, inventoryRefreshKey]);

  const uniqueTanks = useMemo(() => {
    const tankMap = new Map<string, string>();
    const allReceipts = storage.loadData<any[]>('receipts') || [];
    allReceipts.forEach((receipt: any) => {
      if (receipt && receipt.tankId && receipt.tankName && !receipt.isVoided) {
        tankMap.set(receipt.tankId, receipt.tankName);
      }
    });
    return Array.from(tankMap.entries());
  }, [storage]);

  const uniqueSites = useMemo(() => {
    const siteMap = new Map<string, string>();
    const allReceipts = storage.loadData<any[]>('receipts') || [];
    allReceipts.forEach((receipt: any) => {
      if (receipt && receipt.siteId && receipt.siteName && !receipt.isVoided) {
        siteMap.set(receipt.siteId, receipt.siteName);
      }
    });
    return Array.from(siteMap.entries());
  }, [storage]);

  const calculateOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    let ownedReceiptsAmount = 0;
    let ownedAdditionDocuments = 0;
    let ownedDeliveries = 0;
    let ownedGainedAmount = 0;
    let ownedDeductionDocuments = 0;
    let ownedConsumedProducts = 0;
    let ownedProducedProducts = 0;

    const tanksToProcess = memoizedInventoryData.activeTanks.map(t => t.id);

    tanksToProcess.forEach(tankId => {
      const data = memoizedInventoryData.tankData[tankId];
      if (!data) return;

      data.receipts.forEach((r: any) => {
        if (currentSiteId && r.siteId !== currentSiteId) return;
        if (currentTankId && r.tankId !== currentTankId) return;
        if (r.userType === 'owned') {
          ownedReceiptsAmount += safeNumber(r.amount || r.receiptBasisAmount, 0);
        }
      });

      data.adjustments.forEach((adj: any) => {
        if (currentSiteId && adj.siteId !== currentSiteId) return;
        if (currentTankId && adj.tankId !== currentTankId) return;
        if (adj.productType === 'owned') {
          if (adj.adjustmentType === 'addition') ownedAdditionDocuments += safeNumber(adj.quantity, 0);
          else if (adj.adjustmentType === 'deduction') ownedDeductionDocuments += safeNumber(adj.quantity, 0);
        }
      });

      data.deliveries.forEach((d: any) => {
        if (currentSiteId && d.siteId !== currentSiteId) return;
        if (currentTankId && d.tankId !== currentTankId) return;
        ownedDeliveries += safeNumber(d.amount, 0);
      });

      data.wastage.forEach((t: any) => {
        if (currentSiteId && t.siteId !== currentSiteId) return;
        if (currentTankId && t.tankId !== currentTankId) return;
        if (t.transactionType === 'owned') {
          ownedGainedAmount += Math.abs(safeNumber(t.amount, 0));
        }
      });

      data.conversions.forEach((c: any) => {
        if (currentSiteId && c.siteId !== currentSiteId) return;
        if (currentTankId && c.tankId !== currentTankId) return;
        if (c.consumedProductType === 'owned') ownedConsumedProducts += safeNumber(c.consumedQuantity, 0);
        if (c.producedProductType === 'owned') ownedProducedProducts += safeNumber(c.producedQuantity, 0);
      });
    });

    const totalOwnedValue = ownedReceiptsAmount + ownedAdditionDocuments + ownedGainedAmount + ownedProducedProducts - ownedDeliveries - ownedDeductionDocuments - ownedConsumedProducts;

    return {
      ownedReceiptsAmount, ownedAdditionDocuments, ownedDeliveries, ownedGainedAmount,
      ownedDeductionDocuments, ownedConsumedProducts, ownedProducedProducts, finalInventory: totalOwnedValue
    };
  }, [memoizedInventoryData, selectedSiteForFilter, selectedTankForFilter]);

  const calculateConsignmentTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    let consignmentReceiptsAmount = 0;
    let consignmentAdditions = 0;
    let consignmentDeliveries = 0;
    let consignmentDeductionAmount = 0;
    let consignmentDeductionDocuments = 0;
    let consignmentConsumedProducts = 0;
    let consignmentProducedProducts = 0;

    const tanksToProcess = memoizedInventoryData.activeTanks.map(t => t.id);

    tanksToProcess.forEach(tankId => {
      const data = memoizedInventoryData.tankData[tankId];
      if (!data) return;

      data.receipts.forEach((r: any) => {
        if (currentSiteId && r.siteId !== currentSiteId) return;
        if (currentTankId && r.tankId !== currentTankId) return;
        if (r.userType === 'consignment') {
          const baseAmount = r.receiptBasisAmount || r.finalAmount || r.amount || 
                           (safeNumber(r.shipUnloadingAmount, 0) + safeNumber(r.tankShoreAmount, 0) + 
                            safeNumber(r.shipBillOfLadingAmount, 0) + safeNumber(r.weightGross, 0));
          consignmentReceiptsAmount += baseAmount;
        }
      });

      data.adjustments.forEach((adj: any) => {
        if (currentSiteId && adj.siteId !== currentSiteId) return;
        if (currentTankId && adj.tankId !== currentTankId) return;
        if (adj.productType === 'consignment') {
          if (adj.adjustmentType === 'addition') consignmentAdditions += safeNumber(adj.quantity, 0);
          else if (adj.adjustmentType === 'deduction') consignmentDeductionDocuments += safeNumber(adj.quantity, 0);
        }
      });

      const processDelivery = (d: any, isConsignmentCheck: boolean) => {
        if (currentSiteId && d.siteId !== currentSiteId) return;
        if (currentTankId && d.tankId !== currentTankId) return;
        if (!isConsignmentCheck || (d.contractNumber || d.permitId || d.userType === 'consignment' || d.type === 'امانی' || d.nature === 'consignment')) {
          consignmentDeliveries += safeNumber(d.amount, 0);
        }
      };
      data.consignmentSlips.forEach((s: any) => processDelivery(s, false));
      data.generalDeliveries.forEach((d: any) => processDelivery(d, true));

      data.wastage.forEach((t: any) => {
        if (currentSiteId && t.siteId !== currentSiteId) return;
        if (currentTankId && t.tankId !== currentTankId) return;
        if (t.transactionType === 'consignment') {
          consignmentDeductionAmount += Math.abs(safeNumber(t.amount, 0));
        }
      });

      data.conversions.forEach((c: any) => {
        if (currentSiteId && c.siteId !== currentSiteId) return;
        if (currentTankId && c.tankId !== currentTankId) return;
        if (c.consumedProductType === 'consignment') consignmentConsumedProducts += safeNumber(c.consumedQuantity, 0);
        if (c.producedProductType === 'consignment') consignmentProducedProducts += safeNumber(c.producedQuantity, 0);
      });
    });

    const totalConsignmentValue = consignmentReceiptsAmount + consignmentAdditions + consignmentProducedProducts - consignmentDeliveries - consignmentDeductionAmount - consignmentDeductionDocuments - consignmentConsumedProducts;

    return {
      consignmentReceiptsAmount, consignmentAdditions, consignmentDeliveries,
      consignmentDeductionAmount, consignmentDeductionDocuments, consignmentConsumedProducts,
      consignmentProducedProducts, finalInventory: totalConsignmentValue
    };
  }, [memoizedInventoryData, selectedSiteForFilter, selectedTankForFilter]);

  const calculateConsignmentOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const owned = calculateOwnedTanksInventory(siteId, tankId);
    const consignment = calculateConsignmentTanksInventory(siteId, tankId);
    return {
      ...owned,
      ...consignment,
      finalInventory: owned.finalInventory + consignment.finalInventory
    };
  }, [calculateOwnedTanksInventory, calculateConsignmentTanksInventory]);

  const calculateTotalTankCapacity = useCallback((siteId?: string, tankId?: string) => {
    const tanks = (baseData.tanks || []).filter((t: any) => t.isActive !== false);
    let totalCapacity = 0;
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    tanks.forEach((tank: any) => {
      if (currentTankId && String(tank.id) !== currentTankId) return;
      const tankSiteId = String(tank.siteId || tank.locationId || '');
      if (currentSiteId && tankSiteId && tankSiteId !== currentSiteId) return;
      const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
      const capacityMatch = typeof capacityStr === 'string' ? capacityStr.match(/[\d,]+/) : null;
      const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, ''), 10) : (typeof capacityStr === 'number' ? capacityStr : 5000000);
      totalCapacity += capacity;
    });
    return totalCapacity;
  }, [baseData.tanks, selectedSiteForFilter, selectedTankForFilter]);

  const calculateTankStatusCounts = useCallback(() => {
    const tanks = (baseData.tanks || []).filter((t: any) => t.isActive !== false);
    const currentSiteId = selectedSiteForFilter;
    const currentTankId = selectedTankForFilter;
    let totalTanks = 0;
    let withInventoryCount = 0;
    let withoutInventoryCount = 0;
    let lowInventoryAlert = false;
    let lowInventoryTanks: any[] = [];
    let totalShortageSum = 0;
    const siteIdToNameMap = new Map<string, string>(uniqueSites);
    tanks.forEach((tank: any) => {
      if (currentTankId && String(tank.id) !== currentTankId) return;
      const tankSiteId = String(tank.siteId || tank.locationId || '');
      if (currentSiteId) {
        const filterSiteIds = Array.isArray(currentSiteId) ? currentSiteId : [currentSiteId];
        if (filterSiteIds.length > 0 && tankSiteId && !filterSiteIds.includes(tankSiteId)) return;
      }
      totalTanks++;
      const inventoryData = calculateConsignmentOwnedTanksInventory(currentSiteId as string, tank.id);
      const inventory = inventoryData.finalInventory || 0;
      if (inventory > 0) withInventoryCount++;
      else withoutInventoryCount++;
      const minInventoryStr = tank.minimumStock || tank.minInventory || tank.minimumInventory || "0";
      const minInventoryMatch = typeof minInventoryStr === 'string' ? minInventoryStr.match(/[\d,]+/) : null;
      const minInventory = minInventoryMatch ? parseInt(minInventoryMatch[0].replace(/,/g, '')) : (typeof minInventoryStr === 'number' ? minInventoryStr : 0);
      if (minInventory > 0 && inventory <= minInventory) {
        lowInventoryAlert = true;
        const deficit = minInventory - inventory;
        totalShortageSum += deficit;
        const siteFromBase = baseData.sites?.find((s: any) => s.id === tank.siteId || s.id === tank.locationId);
        const siteFromUnique = siteIdToNameMap.get(tankSiteId);
        let siteName = siteFromBase?.name || siteFromUnique || tank.siteName || tank.locationName || tank.siteLocationName || '';
        if (!siteName && currentSiteId) {
          const activeId = Array.isArray(currentSiteId) ? currentSiteId[0] : currentSiteId;
          if (activeId) siteName = siteIdToNameMap.get(activeId) || '';
        }
        lowInventoryTanks.push({
          name: tank.name || tank.id,
          inventory: inventory,
          minInventory: minInventory,
          deficit: deficit,
          siteId: tankSiteId,
          siteName: siteName || (currentSiteId ? 'نامشخص' : 'تمام سایت ها')
        });
      }
    });
    let commonSiteName = '';
    if (lowInventoryTanks.length > 0) {
      const firstSiteId = lowInventoryTanks[0].siteId;
      const allSameSite = lowInventoryTanks.every(t => t.siteId === firstSiteId);
      if (allSameSite) commonSiteName = lowInventoryTanks[0].siteName !== 'نامشخص' ? lowInventoryTanks[0].siteName : '';
    }
    return { totalTanks, withInventoryCount, withoutInventoryCount, lowInventoryAlert, lowInventoryTanks, totalShortageSum, commonSiteName };
  }, [baseData.tanks, baseData.sites, uniqueSites, selectedSiteForFilter, selectedTankForFilter, calculateConsignmentOwnedTanksInventory]);

  // محاسبه وزن مانده قرارداد
  const calculateRemainingContractWeight = useCallback((contractId: string): number => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return 0;
    
    // جمع کل مقدار مبنای رسیدهای این قرارداد
    const contractReceipts = receipts.filter(r => r.contractId === contractId);
    const totalReceiptBasis = contractReceipts.reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
    
    return (contract.contractWeight || 0) - totalReceiptBasis;
  }, [receipts, contracts]);

  // محاسبه موجودی مخزن
  const calculateTankInventory = useCallback((tankId: string, targetDate?: Date): number => {
    const allReceipts = storage.loadData('receipts') || [];
    const allDeliveries = storage.loadData('deliveries') || [];
    const allAdjustments = storage.loadData('adjustments') || [];
    
    const tankCapacity = 5000000; // ظرفیت پیش‌فرض مخزن
    
    const dateFilter = (item: any) => {
      if (!targetDate) return true;
      const itemDate = new Date(item.receiptDate || item.deliveryDate || item.adjustmentDate || item.createdAt);
      return itemDate <= targetDate;
    };
    
    // رسید انبارها
    const tankReceipts = allReceipts
      .filter((r: any) => r.tankId === tankId && dateFilter(r))
      .reduce((sum: number, r: any) => sum + (r.receiptBasisAmount || 0), 0);
    
    // سند اضافه انبار
    const tankAdditions = allAdjustments
      .filter((a: any) => a.tankId === tankId && a.adjustmentType === 'addition' && dateFilter(a))
      .reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
    
    // حواله انبار
    const tankDeliveries = allDeliveries
      .filter((d: any) => d.tankId === tankId && dateFilter(d))
      .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    
    // سند کسر انبار
    const tankSubtractions = allAdjustments
      .filter((a: any) => a.tankId === tankId && a.adjustmentType === 'subtraction' && dateFilter(a))
      .reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
    
    // فرمول: ظرفیت مخزن - (رسید انبارها + سند اضافه انبار) + (حواله انبار + سند کسر انبار)
    const inventory = tankCapacity - (tankReceipts + tankAdditions) + (tankDeliveries + tankSubtractions);
    
    return Math.max(0, inventory);
  }, [storage]);

  // محاسبه مبلغ فاکتور
  const calculateInvoiceAmount = useCallback((receipt: Receipt, contract: Contract, basis: 'receiptBasis' | 'remainingPermit'): number => {
    if (basis === 'receiptBasis') {
      // مقدار مبنای رسید * نرخ قرارداد
      return receipt.receiptBasisAmount * (contract.rentalRate || 0);
    } else {
      // مانده مجوز حواله * نرخ قرارداد
      const remainingPermit = calculateRemainingPermitAmount(receipt.id, receipt.contractId);
      return remainingPermit * (contract.rentalRate || 0);
    }
  }, [calculateRemainingPermitAmount]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      if (receipt.userType !== 'consignment') return false;
      if (receipt.status === 'draft') return false;
      if (receipt.status === 'cancelled' || receipt.status === 'deleted') return false;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        receipt.transactionNumber.toLowerCase().includes(searchLower) ||
        receipt.counterpartyName?.toLowerCase().includes(searchLower) ||
        receipt.contractNumber?.toLowerCase().includes(searchLower) ||
        receipt.productName.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
  }, [receipts, searchTerm]);

  const {
    sortConfig,
    columnFilters,
    showColumnFilter,
    handleSort,
    toggleColumnFilter,
    handleColumnFilterChange,
    clearColumnFilter,
    getSortedAndFilteredData,
    calculateColumnSum
  } = useSortingAndFiltering(filteredReceipts);

  const columns: TableColumn<Receipt>[] = [
    {
      key: 'actions',
      title: 'عملیات',
      width: 'w-32',
      render: (_, item) => (
        <button
          onClick={() => setShowInvoiceForm(item.id)}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          صدور فاکتور دستی
        </button>
      )
    },
    {
      key: 'transactionNumber',
      title: 'شماره رسید',
      sortable: true,
      filterable: true,
      width: 'w-32'
    },
    {
      key: 'receiptDate',
      title: 'تاریخ رسید',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value) => formatPersianDate(new Date(value))
    },
    {
      key: 'counterpartyName',
      title: 'طرف حساب',
      sortable: true,
      filterable: true,
      width: 'w-32'
    },
    {
      key: 'contractNumber',
      title: 'شماره قرارداد',
      sortable: true,
      filterable: true,
      width: 'w-32'
    },
    {
      key: 'receiptBasisAmount',
      title: 'مقدار مبنای رسید',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const unit = contract?.unit || 'kg';
        return (
          <FieldWithTooltip
            label="مقدار مبنای رسید"
            formula="مقدار مبنای رسید ثبت شده در انبار"
          >
            <span>{formatPersianNumber(value)} {unit === 'kg' ? 'کیلوگرم' : 'تن'}</span>
          </FieldWithTooltip>
        );
      }
    },
    {
      key: 'remainingContractWeight',
      title: 'وزن مانده قرارداد',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const unit = contract?.unit || 'kg';
        const remaining = calculateRemainingContractWeight(item.contractId);
        
        return (
          <FieldWithTooltip
            label="وزن مانده قرارداد"
            formula="وزن قرارداد - جمع کل مقدار مبنای رسیدهای مربوط به این قرارداد"
          >
            <span>{formatPersianNumber(Math.max(0, remaining))} {unit === 'kg' ? 'کیلوگرم' : 'تن'}</span>
          </FieldWithTooltip>
        );
      }
    },
    {
      key: 'tankInventory',
      title: 'موجودی مخزن',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const unit = contract?.unit || 'kg';
        const inventory = calculateTankInventory(item.tankId, systemDate);
        
        return (
          <FieldWithTooltip
            label="موجودی مخزن"
            formula="ظرفیت مخزن - (رسید انبارها + سند اضافه انبار) + (حواله انبار + سند کسر انبار)"
          >
            <span>{formatPersianNumber(inventory)} {unit === 'kg' ? 'کیلوگرم' : 'تن'}</span>
          </FieldWithTooltip>
        );
      }
    },
    {
      key: 'rentalRate',
      title: 'نرخ قرارداد',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        return <span>{formatPersianNumber(contract?.rentalRate || 0)}</span>;
      }
    },
    {
      key: 'contractAmount',
      title: 'مبلغ قرارداد',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const contractAmount = (contract?.contractWeight || 0) * (contract?.rentalRate || 0);
        return <span>{formatPersianNumber(contractAmount)}</span>;
      }
    },
    {
      key: 'calculatedInvoiceAmount',
      title: 'مبلغ فاکتور محاسبه شده',
      sortable: true,
      filterable: true,
      width: 'w-40',
      render: (_, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        if (!contract) return <span>0</span>;
        
        // محاسبه بر اساس مقدار مبنای رسید (پیش‌فرض برای رسید انبارها)
        const invoiceAmount = calculateInvoiceAmount(item, contract, 'receiptBasis');
        
        return (
          <FieldWithTooltip
            label="مبلغ فاکتور محاسبه شده"
            formula="مقدار مبنای رسید × نرخ قرارداد"
          >
            <span className="font-bold text-green-600">{formatPersianNumber(invoiceAmount)} ریال</span>
          </FieldWithTooltip>
        );
      }
    }
    // حذف ستون "مبنای محاسبه فاکتور"
  ];

  const renderRow = (receipt: Receipt, index: number) => (
    <tr key={receipt.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
      {columns.map(column => (
        <td key={String(column.key)} className="px-4 py-3 text-sm text-gray-900">
          {column.render 
            ? column.render(receipt[column.key], receipt) 
            : receipt[column.key]}
        </td>
      ))}
    </tr>
  );

  const renderFooter = (data: Receipt[]) => (
    <tr className="bg-gray-100 font-bold">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">جمع کل:</td>
      <td colSpan={4}></td>
      <td className="px-4 py-3 text-sm font-bold text-gray-900">
        {formatPersianNumber(calculateColumnSum('receiptBasisAmount'))}
      </td>
      <td className="px-4 py-3 text-sm font-bold text-gray-900">
        {formatPersianNumber(data.reduce((sum, item) => {
          return sum + calculateRemainingContractWeight(item.contractId);
        }, 0))}
      </td>
      <td className="px-4 py-3 text-sm font-bold text-gray-900">
        {formatPersianNumber(data.reduce((sum, item) => {
          return sum + calculateTankInventory(item.tankId, systemDate);
        }, 0))}
      </td>
      <td colSpan={3}></td>
    </tr>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            رسید انبارها ({formatPersianNumber(filteredReceipts.length)})
          </h3>
          <button
            onClick={() => setIsReceiptTableMinimized(!isReceiptTableMinimized)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isReceiptTableMinimized ? (
              <>
                <Maximize2 className="h-4 w-4" />
                <span>باز کردن</span>
              </>
            ) : (
              <>
                <Minimize2 className="h-4 w-4" />
                <span>جمع کردن</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {!isReceiptTableMinimized && (
      <DataTable
        data={getSortedAndFilteredData}
        columns={columns}
        onSort={handleSort}
        onFilter={handleColumnFilterChange}
        sortConfig={sortConfig}
        columnFilters={columnFilters}
        showColumnFilter={showColumnFilter}
        toggleColumnFilter={toggleColumnFilter}
        handleColumnFilterChange={handleColumnFilterChange}
        clearColumnFilter={clearColumnFilter}
        renderRow={renderRow}
        renderFooter={renderFooter}
        emptyMessage="هیچ رسید فاکتور نشده‌ای یافت نشد"
        showColumnSum={true}
        numericColumns={['receiptBasisAmount', 'remainingContractWeight', 'rentalRate', 'contractAmount', 'calculatedInvoiceAmount']}
        showRowCount={true}
        rowCount={filteredReceipts.length}
      />
      )}
      
      <ChartsSection 
        activeTab="uninvoiced"
        uninvoicedReceipts={getSortedAndFilteredData}
        invoicedReceipts={[]}
        deliveryPermitsData={[]}
      />

      {/* پکیج موجودی مخازن و فیلترها */}
      <div className="mt-8 border-t pt-8">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={showInventoryPackage}
            onChange={(e) => setShowInventoryPackage(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="text-sm text-gray-700 font-medium">نمایش پکیج موجودی مخازن و فیلترها</label>
        </div>

        {showInventoryPackage && (
          <div className="space-y-6">
            {/* فیلترهای گزارش موجودی */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline ml-1" />
                  تا تاریخ
                </label>
                <PersianDatePicker
                  value={upToDate}
                  onChange={(date) => date && setUpToDate(date)}
                  placeholder="تاریخ را انتخاب کنید"
                />
              </div>
              
              <div>
                <MultiSelectDropdown
                  label="نام مخزن"
                  placeholder="تمام مخازن"
                  options={uniqueTanks}
                  selectedValues={selectedTankForFilter}
                  onChange={(val) => setSelectedTankForFilter(Array.isArray(val) ? val.join(',') : val)}
                />
              </div>
              
              <div>
                <MultiSelectDropdown
                  label="سایت مخازن"
                  placeholder="تمام سایت‌ها"
                  options={uniqueSites}
                  selectedValues={selectedSiteForFilter}
                  onChange={(val) => setSelectedSiteForFilter(Array.isArray(val) ? val.join(',') : val)}
                />
              </div>
            
              <div className="flex items-end gap-2">
                <button
                  onClick={() => setUpToDate(new Date())}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors h-[38px]"
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
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors h-[38px]"
                >
                  <RefreshCw className="w-4 h-4" />
                  بازنشانی فیلترها
                </button>
              </div>
            </div>

            {/* جداول موجودی مخازن */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* موجودی مخازن تملیکی */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-purple-200">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 text-center">
                  <h3 className="text-xl font-semibold">موجودی مخازن تملیکی</h3>
                </div>
                <div className="p-4">
                  {(() => {
                    const inventory = calculateOwnedTanksInventory(selectedSiteForFilter, selectedTankForFilter);
                    return (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">رسیدهای تملیکی:</span>
                          <span className="font-bold text-base">{formatPersianNumber(inventory.ownedReceiptsAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">سند اضافه تملیکی:</span>
                          <span className="font-bold text-base">{formatPersianNumber(inventory.ownedAdditionDocuments)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                          <span className="font-medium">حواله‌های تملیکی:</span>
                          <span className="font-bold text-base">-{formatPersianNumber(inventory.ownedDeliveries)}</span>
                        </div>
                        <div className="flex justify-between items-center text-green-700">
                          <span className="font-medium">افزودن به تملیکی از محل افت:</span>
                          <span className="font-bold text-base">{formatPersianNumber(inventory.ownedGainedAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                          <span className="font-medium">سند کسر تملیکی:</span>
                          <span className="font-bold text-base">-{formatPersianNumber(inventory.ownedDeductionDocuments)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                          <span className="font-medium">کالای مصرفی تملیکی:</span>
                          <span className="font-bold text-base">-{formatPersianNumber(inventory.ownedConsumedProducts || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-green-600">
                          <span className="font-medium">کالای تولیدی تملیکی:</span>
                          <span className="font-bold text-base">+{formatPersianNumber(inventory.ownedProducedProducts || 0)}</span>
                        </div>
                        <hr className="border-purple-300 my-2" />
                        <div className="flex justify-between items-center text-lg font-black text-purple-900 bg-purple-50 p-2 rounded-lg">
                          <span>موجودی نهایی (تملیکی):</span>
                          <span>{formatPersianNumber(inventory.finalInventory)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* موجودی مخازن امانی */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-green-200">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 text-center">
                  <h3 className="text-xl font-semibold">موجودی مخازن امانی</h3>
                </div>
                <div className="p-4">
                  {(() => {
                    const inventory = calculateConsignmentTanksInventory(selectedSiteForFilter, selectedTankForFilter);
                    return (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">رسیدهای امانی:</span>
                          <span className="font-bold text-base">{formatPersianNumber(inventory.consignmentReceiptsAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">سند اضافه امانی:</span>
                          <span className="font-bold text-base">{formatPersianNumber(inventory.consignmentAdditions)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                          <span className="font-medium">حواله‌های امانی:</span>
                          <span className="font-bold text-base">-{formatPersianNumber(inventory.consignmentDeliveries)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                          <span className="font-medium">کسر از امانی از محل افت:</span>
                          <span className="font-bold text-base">-{formatPersianNumber(inventory.consignmentDeductionAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                          <span className="font-medium">سند کسر امانی:</span>
                          <span className="font-bold text-base">-{formatPersianNumber(inventory.consignmentDeductionDocuments)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                          <span className="font-medium">کالای مصرفی امانی:</span>
                          <span className="font-bold text-base">-{formatPersianNumber(inventory.consignmentConsumedProducts || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-green-600">
                          <span className="font-medium">کالای تولیدی امانی:</span>
                          <span className="font-bold text-base">+{formatPersianNumber(inventory.consignmentProducedProducts || 0)}</span>
                        </div>
                        <hr className="border-green-300 my-2" />
                        <div className="flex justify-between items-center text-lg font-black text-green-900 bg-green-50 p-2 rounded-lg">
                          <span>موجودی نهایی (امانی):</span>
                          <span>{formatPersianNumber(inventory.finalInventory)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* موجودی مخازن امانی و تملیکی */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden lg:col-span-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex justify-between items-center">
                  <h3 className="text-xl font-semibold">موجودی مخازن امانی و تملیکی</h3>
                  {(() => {
                    const { lowInventoryAlert } = calculateTankStatusCounts();
                    return lowInventoryAlert && (
                      <div className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-lg animate-pulse border border-red-200">
                        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                        <span className="text-xs font-bold">هشدار: حداقل موجودی مخازن</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      const inventory = calculateConsignmentOwnedTanksInventory(selectedSiteForFilter, selectedTankForFilter);
                      const totalCapacity = calculateTotalTankCapacity(selectedSiteForFilter, selectedTankForFilter);
                      const emptyCapacity = Math.max(0, totalCapacity - (inventory.finalInventory || 0));
                      const { totalTanks, withInventoryCount, withoutInventoryCount } = calculateTankStatusCounts();
                      
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs mb-6">
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">رسیدهای تملیکی:</span>
                              <span className="font-semibold text-green-700">{formatPersianNumber(inventory.ownedReceiptsAmount)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">سند اضافه تملیکی:</span>
                              <span className="font-semibold text-green-700">{formatPersianNumber(inventory.ownedAdditionDocuments)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">حواله‌های تملیکی:</span>
                              <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedDeliveries)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">افزودن تملیکی (افت):</span>
                              <span className="font-semibold text-green-700">{formatPersianNumber(inventory.ownedGainedAmount)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">سند کسر تملیکی:</span>
                              <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedDeductionDocuments)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">رسیدهای امانی:</span>
                              <span className="font-semibold text-green-700">{formatPersianNumber(inventory.consignmentReceiptsAmount)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">سند اضافه امانی:</span>
                              <span className="font-semibold text-green-700">{formatPersianNumber(inventory.consignmentAdditions)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">حواله‌های امانی:</span>
                              <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeliveries)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">کسر از امانی (افت):</span>
                              <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeductionAmount)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">سند کسر امانی:</span>
                              <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeductionDocuments)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">کالای مصرفی امانی:</span>
                              <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentConsumedProducts || 0)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">کالای تولیدی امانی:</span>
                              <span className="font-semibold text-green-700">+{formatPersianNumber(inventory.consignmentProducedProducts || 0)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">کالای مصرفی تملیکی:</span>
                              <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedConsumedProducts || 0)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">کالای تولیدی تملیکی:</span>
                              <span className="font-semibold text-green-700">+{formatPersianNumber(inventory.ownedProducedProducts || 0)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden group">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-blue-800 font-bold text-lg">ظرفیت مخازن:</span>
                                <span className="text-2xl font-black text-blue-900">{formatPersianNumber(totalCapacity)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-blue-600 text-sm">
                                <Database className="w-4 h-4" />
                                <span>تعداد مخازن:</span>
                                <span className="font-bold bg-blue-200 px-2 py-0.5 rounded-full">{formatPersianNumber(totalTanks)}</span>
                              </div>
                            </div>

                            <div className="bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm relative overflow-hidden group">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-green-800 font-bold text-lg">موجودی نهایی:</span>
                                <span className="text-2xl font-black text-green-900">{formatPersianNumber(inventory.finalInventory || 0)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-green-600 text-sm">
                                <Package className="w-4 h-4" />
                                <span>مخازن دارای موجودی:</span>
                                <span className="font-bold bg-green-200 px-2 py-0.5 rounded-full">{formatPersianNumber(withInventoryCount)}</span>
                              </div>
                            </div>

                            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden group">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-orange-800 font-bold text-lg">ظرفیت خالی مخزن:</span>
                                <span className="text-2xl font-black text-orange-900">{formatPersianNumber(emptyCapacity)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-orange-600 text-sm">
                                <Scale className="w-4 h-4" />
                                <span>مخازن فاقد موجودی:</span>
                                <span className="font-bold bg-orange-200 px-2 py-0.5 rounded-full">{formatPersianNumber(withoutInventoryCount)}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* گزارش حداقل موجودی مخازن */}
              <div className="lg:col-span-2">
                {(() => {
                  const { lowInventoryAlert, lowInventoryTanks, totalShortageSum, commonSiteName } = calculateTankStatusCounts();
                  return (
                    <div className={`${lowInventoryAlert ? 'bg-red-50 border-red-300 animate-[pulse_3s_infinite]' : 'bg-gray-50 border-gray-200 opacity-60'} p-6 rounded-2xl border-2 shadow-md relative overflow-hidden transition-all`}>
                      <div className="flex justify-between items-center mb-4 border-b pb-4 border-red-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${lowInventoryAlert ? 'bg-red-100' : 'bg-gray-100'}`}>
                            <AlertTriangle className={`w-6 h-6 ${lowInventoryAlert ? 'text-red-600' : 'text-gray-600'}`} />
                          </div>
                          <span className={`${lowInventoryAlert ? 'text-red-900' : 'text-gray-900'} font-black text-2xl`}>گزارش حداقل موجودی مخازن</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {commonSiteName && (
                              <div className="bg-green-500 text-white px-6 py-1.5 rounded-xl text-center font-black text-sm shadow-md border-2 border-green-400">
                                {commonSiteName}
                              </div>
                            )}
                            <div className={`flex items-center justify-between gap-4 px-4 py-2 rounded-full ${lowInventoryAlert ? 'bg-red-400 text-white shadow-lg' : 'bg-gray-400 text-white'}`}>
                              <span className="font-bold">تعداد مخزن:</span>
                              <span className="text-xl font-black">{formatPersianNumber(lowInventoryTanks?.length || 0)}</span>
                            </div>
                          {lowInventoryAlert && (
                            <div className="flex items-center justify-between gap-4 px-4 py-2 rounded-full bg-red-400 text-white shadow-lg">
                              <span className="font-bold text-xs">جمع کل کسر موجودی ها:</span>
                              <span className="text-lg font-black">{formatPersianNumber(totalShortageSum)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    
                      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${lowInventoryAlert ? 'text-red-700' : 'text-gray-600'}`}>
                          {lowInventoryAlert && lowInventoryTanks && lowInventoryTanks.length > 0 ? (
                              lowInventoryTanks.map((t: any, i: number) => (
                                  <div key={i} className="p-4 bg-white rounded-xl border-2 border-red-100 shadow-sm hover:shadow-md transition-shadow relative pt-10 overflow-hidden">
                                    <div className="absolute top-0 right-0 left-0 bg-blue-600 text-white py-1.5 px-4 text-[11px] font-black flex items-center gap-2 shadow-sm border-b border-blue-700">
                                      <BuildingIcon className="w-3.5 h-3.5 text-blue-200" />
                                        <span>سایت: {t.siteName || (selectedSiteForFilter ? 'نامشخص' : 'تمام سایت ها')}</span>
                                    </div>
                                    <div className="font-black text-blue-600 text-2xl mb-3 border-b border-red-50 pb-2 flex items-center justify-between">
                                      <span>{t.name}</span>
                                      <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></div>
                                    </div>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-2 bg-gray-50/50 rounded-lg">
                                  <span className="font-bold text-black opacity-80">حداقل تعریف شده:</span>
                                  <span className="font-black text-xl text-black">{formatPersianNumber(t.minInventory)}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-green-50/50 rounded-lg">
                                  <span className="font-bold text-green-700 opacity-80">موجودي فعلي:</span>
                                  <span className="font-black text-xl text-green-600">{formatPersianNumber(t.inventory)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-red-400 text-white rounded-lg font-black shadow-inner">
                                  <span className="text-lg">کسری موجودی:</span>
                                  <span className="text-2xl">{formatPersianNumber(t.deficit)}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full py-8 text-center bg-green-50 rounded-xl border border-green-100">
                            <div className="text-green-600 font-bold text-xl">وضعیت تمام مخازن در شرایط نرمال قرار دارد ✅</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {showInvoiceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <InvoiceForm
            receipt={receipts.find(r => r.id === showInvoiceForm)}
            contracts={contracts}
            onSave={(invoice) => {
              handleSaveInvoice(invoice, null);
              setShowInvoiceForm(null);
            }}
            onCancel={() => setShowInvoiceForm(null)}
            systemDate={systemDate}
            calculateRemainingPermitAmount={calculateRemainingPermitAmount}
          />
        </div>
      )}
    </div>
  );
};//