import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Download, BarChart3, FileText, Calculator, X, Calendar, RefreshCw, Package, Warehouse, Database, Clock, Truck, Scale, Droplets, FlaskConical, AlertTriangle, AlertOctagon, Info, Building2 } from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { safeParseDate } from '../../utils/persian';
import { PersianDatePicker } from '../Common/PersianDatePicker';
import { DataStorage } from '../../utils/dataStorage';

interface LedgerFilters {
  [key: string]: any; // برای پشتیبانی از فیلترهای داینامیک
  userType?: 'owned' | 'consignment' | '';
  dateFrom?: Date;
  dateTo?: Date;
  status?: 'draft' | 'saved' | 'finalized' | 'invoiced' | 'pending_payment' | 'settled' | '';
  filterType?: 'filter1' | 'filter2' | 'filter3'; // نوع فیلتر انتخابی
  // فیلترهای جدید
  amountMin?: string;
  amountMax?: string;
}

interface LedgerEntry {
  id: string;
  date: Date;
  transactionNumber: string;
  type: 'receipt' | 'delivery' | 'adjustment';
  transactionType?: 'receipt' | 'delivery' | 'adjustment-addition' | 'adjustment-deduction' | 'conversion-produced' | 'conversion-consumed';
  description: string;
  receiptAmount: number;
  deliveryAmount: number;
  balance: number;
  runningBalance: number;
  unit: 'kg' | 'ton';
  userType: 'owned' | 'consignment';
  companyName?: string;
  productName: string;
  siteName: string;
  tankName: string;
  status?: string;
  // فیلدهای اضافی برای پشتیبانی از تمام فیلترها
  customerCompanyId?: string;
  customerCompanyName?: string;
  locationId?: string;
  locationName?: string;
  companyLocationId?: string;
  companyLocationName?: string;
  customerLocationId?: string;
  customerLocationName?: string;
  departmentId?: string;
  departmentName?: string;
  driverId?: string;
  driverName?: string;
  internalSiteId?: string;
  internalSiteName?: string;
  contractorSiteId?: string;
  contractorSiteName?: string;
  cotageId?: string;
  cotageNumber?: string;
  indexId?: string;
  indexNumber?: string;
  shipId?: string;
  shipName?: string;
  rentalType?: string;
  wastageRate?: number;
  receiptBasis?: string;
  internalCompanyId?: string;
  internalCompanyName?: string;
  contractId?: string;
  contractNumber?: string;
  permitId?: string;
  permitNumber?: string;
  referenceNumber?: string;
  invoiceNumber?: string;
  rentalRate?: number;
}

interface BaseDataItem {
  id: string;
  code?: string;
  name: string;
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
}

export const InventoryLedgerManager: React.FC = () => {
  const [filters, setFilters] = useState<LedgerFilters>({});
  const [filteredData, setFilteredData] = useState<LedgerEntry[]>([]);
  const [baseData, setBaseData] = useState<Record<string, BaseDataItem[]>>({});
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('detailed');
  const [searchTerm, setSearchTerm] = useState('');
  const [unitToggle, setUnitToggle] = useState<'kg' | 'ton'>('kg');
  const [includeNonFinalized, setIncludeNonFinalized] = useState(true);
  const [filterType, setFilterType] = useState<'filter1' | 'filter2' | 'filter3'>('filter3');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const storage = DataStorage.getInstance();

  // Helper function for safe number conversion
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    
    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value;
    }
    
    const num = parseFloat(value.toString());
    return isNaN(num) ? defaultValue : num;
  };

  // State for tank inventory calculations
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [selectedTankForFilter, setSelectedTankForFilter] = useState<string>('');
  const [selectedSiteForFilter, setSelectedSiteForFilter] = useState<string>('');
  const [upToDate, setUpToDate] = useState<Date>(new Date());
  const [showInventoryPackage, setShowInventoryPackage] = useState<boolean>(true);

  // Multi-select dropdown component
  const MultiSelectDropdown = ({ options, selectedValues, onChange, label, placeholder }: { 
    options: [string, string][], 
    selectedValues: string[], 
    onChange: (values: string[]) => void,
    label: string,
    placeholder: string
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

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
      let newValues;
      if (event?.ctrlKey) {
        // Ctrl + Click: Toggle
        newValues = selectedValues.includes(value)
          ? selectedValues.filter(v => v !== value)
          : [...selectedValues, value];
      } else {
        // Normal Click: Select only this one (or toggle if it's already selected and alone)
        if (selectedValues.length === 1 && selectedValues[0] === value) {
          newValues = [];
        } else {
          newValues = [value];
        }
      }
      onChange(newValues);
    };

    const isAllSelected = options.length > 0 && selectedValues.length === options.length;

    const toggleAll = () => {
      if (isAllSelected) {
        onChange([]);
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
            {selectedValues.length === 0 
              ? placeholder 
              : selectedValues.length === options.length 
                ? 'همه انتخاب شده‌اند' 
                : `${selectedValues.length} مورد انتخاب شده`}
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
                      checked={selectedValues.includes(id)}
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

    // منحصربه‌فرد مخازن و سایت‌ها برای فیلترها
    const uniqueTanks = useMemo(() => {
      const tankMap = new Map<string, string>();
      // مشابه ProductConversionManager: فقط از رسیدها استخراج می‌کنیم
      const allReceipts = storage.loadData('receipts');
      const receiptsArray = Array.isArray(allReceipts) ? allReceipts : [];
      
      // ابتدا مخازن فعال از داده‌های پایه را می‌گیریم
      const baseTanks = (storage.loadData('category_tanks')?.items || storage.loadData('baseDataCategories')?.find((c: any) => c.id === 'tanks')?.items || []);
      const activeTankIds = new Set(baseTanks.filter((t: any) => t.isActive !== false).map((t: any) => t.id));
      
      receiptsArray.forEach((receipt: any) => {
        if (receipt && receipt.tankId && receipt.tankName && !receipt.isVoided && activeTankIds.has(receipt.tankId)) {
          tankMap.set(receipt.tankId, receipt.tankName);
        }
      });
      return Array.from(tankMap.entries());
    }, [storage]);

    const uniqueSites = useMemo(() => {
      const siteMap = new Map<string, string>();
      // مشابه ProductConversionManager: فقط از رسیدها استخراج می‌کنیم
      const allReceipts = storage.loadData('receipts');
      const receiptsArray = Array.isArray(allReceipts) ? allReceipts : [];
      receiptsArray.forEach((receipt: any) => {
        if (receipt && receipt.siteId && receipt.siteName && !receipt.isVoided) {
          siteMap.set(receipt.siteId, receipt.siteName);
        }
      });
      return Array.from(siteMap.entries());
    }, [storage, inventoryRefreshKey]);

    // Pre-calculated inventory data for all tanks to improve performance
    const memoizedInventoryData = useMemo(() => {
      console.log('🚀 Pre-calculating all inventory data...');
      const activeTanks = (baseData.tanks || []).filter((t: any) => t.isActive !== false);
      const activeTankIds = new Set(activeTanks.map((t: any) => t.id));

      const allReceipts = (storage.loadData('receipts') || []).filter((r: any) => 
        r && !r.isVoided && new Date(r.receiptDate) <= upToDate && activeTankIds.has(r.tankId)
      );
      const allAdjustments = (storage.loadData('inventoryAdjustments') || []).filter((adj: any) => 
        adj && !adj.isVoided && new Date(adj.documentDate) <= upToDate && activeTankIds.has(adj.tankId)
      );
      const allDeliveries = (storage.loadData('ownership-delivery-slips') || []).filter((d: any) => 
        d && !d.isVoided && new Date(d.deliveryDate) <= upToDate && activeTankIds.has(d.tankId)
      );
      const allConsignmentSlips = (storage.loadData('consignment-delivery-slips') || []).filter((d: any) => {
        if (!d || d.isVoided || !activeTankIds.has(d.tankId)) return false;
        const dateValue = d.deliveryDate || d.slipDate;
        if (!dateValue) return true;
        const deliveryDate = new Date(dateValue);
        return isNaN(deliveryDate.getTime()) || deliveryDate <= upToDate;
      });
      const allGeneralDeliveries = (storage.loadData('deliveries') || []).filter((d: any) => {
        if (!d || d.isVoided || !activeTankIds.has(d.tankId)) return false;
        const dateValue = d.deliveryDate || d.createdAt;
        if (!dateValue) return false;
        const deliveryDate = new Date(dateValue);
        return !isNaN(deliveryDate.getTime()) && deliveryDate <= upToDate;
      });
      const allWastage = (storage.loadData('wastageTransactions') || []).filter((t: any) => 
        t && !t.isVoided && new Date(t.transactionDate) <= upToDate && activeTankIds.has(t.tankId)
      );
      const allConversions = (storage.loadData('productConversions') || []).filter((c: any) => 
        c && !c.isVoided && new Date(c.documentDate) <= upToDate && activeTankIds.has(c.tankId)
      );

      // Group by tankId for fast lookup
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

    // Calculate owned tanks inventory based on user formula
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

        // Receipts
        data.receipts.forEach((r: any) => {
          if (currentSiteId && r.siteId !== currentSiteId) return;
          if (currentTankId && r.tankId !== currentTankId) return;
          if (r.userType === 'owned') {
            ownedReceiptsAmount += safeNumber(r.amount || r.receiptBasisAmount, 0);
          }
        });

        // Adjustments
        data.adjustments.forEach((adj: any) => {
          if (currentSiteId && adj.siteId !== currentSiteId) return;
          if (currentTankId && adj.tankId !== currentTankId) return;
          if (adj.productType === 'owned') {
            if (adj.adjustmentType === 'addition') ownedAdditionDocuments += safeNumber(adj.quantity, 0);
            else if (adj.adjustmentType === 'deduction') ownedDeductionDocuments += safeNumber(adj.quantity, 0);
          }
        });

        // Deliveries
        data.deliveries.forEach((d: any) => {
          if (currentSiteId && d.siteId !== currentSiteId) return;
          if (currentTankId && d.tankId !== currentTankId) return;
          ownedDeliveries += safeNumber(d.amount, 0);
        });

        // Wastage
        data.wastage.forEach((t: any) => {
          if (currentSiteId && t.siteId !== currentSiteId) return;
          if (currentTankId && t.tankId !== currentTankId) return;
          if (t.transactionType === 'owned') {
            ownedGainedAmount += Math.abs(safeNumber(t.amount, 0));
          }
        });

        // Conversions
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

    // Calculate consignment tanks inventory
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

        // Receipts
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

        // Adjustments
        data.adjustments.forEach((adj: any) => {
          if (currentSiteId && adj.siteId !== currentSiteId) return;
          if (currentTankId && adj.tankId !== currentTankId) return;
          if (adj.productType === 'consignment') {
            if (adj.adjustmentType === 'addition') consignmentAdditions += safeNumber(adj.quantity, 0);
            else if (adj.adjustmentType === 'deduction') consignmentDeductionDocuments += safeNumber(adj.quantity, 0);
          }
        });

        // Consignment Deliveries (Slips + General)
        const processDelivery = (d: any, isConsignmentCheck: boolean) => {
          if (currentSiteId && d.siteId !== currentSiteId) return;
          if (currentTankId && d.tankId !== currentTankId) return;
          if (!isConsignmentCheck || (d.contractNumber || d.permitId || d.userType === 'consignment' || d.type === 'امانی' || d.nature === 'consignment')) {
            consignmentDeliveries += safeNumber(d.amount, 0);
          }
        };
        data.consignmentSlips.forEach((s: any) => processDelivery(s, false));
        data.generalDeliveries.forEach((d: any) => processDelivery(d, true));

        // Wastage
        data.wastage.forEach((t: any) => {
          if (currentSiteId && t.siteId !== currentSiteId) return;
          if (currentTankId && t.tankId !== currentTankId) return;
          if (t.transactionType === 'consignment') {
            consignmentDeductionAmount += Math.abs(safeNumber(t.amount, 0));
          }
        });

        // Conversions
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

    // Calculate consignment+owned tanks inventory
    const calculateConsignmentOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
      const owned = calculateOwnedTanksInventory(siteId, tankId);
      const consignment = calculateConsignmentTanksInventory(siteId, tankId);
      
      return {
        ...owned,
        ...consignment,
        finalInventory: owned.finalInventory + consignment.finalInventory
      };
    }, [calculateOwnedTanksInventory, calculateConsignmentTanksInventory]);

    // Helper function to calculate total tank capacity based on filters
    const calculateTotalTankCapacity = useCallback((siteId?: string, tankId?: string) => {
      const tanks = (baseData.tanks || []).filter((t: any) => t.isActive !== false);
      let totalCapacity = 0;
      const currentSiteId = siteId || selectedSiteForFilter;
      const currentTankId = tankId || selectedTankForFilter;
      
      tanks.forEach((tank: any) => {
        // اگر فیلتر مخزن داریم، فقط همان مخزن
        if (currentTankId && String(tank.id) !== currentTankId) return;
        
        // اگر فیلتر سایت داریم و سایت روی مخزن تعریف شده، باید هم‌خوان باشد
        // اگر سایت روی مخزن تعریف نشده باشد (null/empty)، آن را رد نمی‌کنیم تا ظرفیت صفر نشود
        const tankSiteId = String(tank.siteId || tank.locationId || '');
        if (currentSiteId && tankSiteId && tankSiteId !== currentSiteId) return;
        
        const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
        const capacityMatch = typeof capacityStr === 'string' ? capacityStr.match(/[\d,]+/) : null;
        const capacity = capacityMatch 
          ? parseInt(capacityMatch[0].replace(/,/g, ''), 10) 
          : (typeof capacityStr === 'number' ? capacityStr : 5000000);
        
        totalCapacity += capacity;
      });
      return totalCapacity;
    }, [baseData.tanks, selectedSiteForFilter, selectedTankForFilter]);

    // Helper function to calculate empty tank capacity
    const calculateEmptyTankCapacity = useCallback(() => {
      const totalCapacity = calculateTotalTankCapacity(selectedSiteForFilter || undefined, selectedTankForFilter || undefined);
      const finalInventory = calculateConsignmentOwnedTanksInventory(selectedSiteForFilter || undefined, selectedTankForFilter || undefined).finalInventory || 0;
      return Math.max(0, totalCapacity - finalInventory);
    }, [calculateTotalTankCapacity, calculateConsignmentOwnedTanksInventory, selectedSiteForFilter, selectedTankForFilter]);

    // Helper function to calculate tank counts and low inventory alert
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

      tanks.forEach((tank: any) => {
        // اگر فیلتر مخزن داریم، فقط همان مخزن
        if (currentTankId && String(tank.id) !== currentTankId) return;
        
        // اگر فیلتر سایت داریم و سایت روی مخزن تعریف شده، باید هم‌خوان باشد
        // اگر سایت روی مخزن تعریف نشده باشد (null/empty)، آن را رد نمی‌کنیم
        const tankSiteId = String(tank.siteId || tank.locationId || '');
        if (currentSiteId && tankSiteId && tankSiteId !== currentSiteId) return;

        totalTanks++;

        const inventoryData = calculateConsignmentOwnedTanksInventory(currentSiteId, tank.id);
        const inventory = inventoryData.finalInventory || 0;

        if (inventory > 0) withInventoryCount++;
        else withoutInventoryCount++;

        const minInventoryStr = tank.minimumStock || tank.minInventory || tank.minimumInventory || "0";
        const minInventoryMatch = typeof minInventoryStr === 'string' ? minInventoryStr.match(/[\d,]+/) : null;
        const minInventory = minInventoryMatch 
          ? parseInt(minInventoryMatch[0].replace(/,/g, '')) 
          : (typeof minInventoryStr === 'number' ? minInventoryStr : 0);

        if (minInventory > 0 && inventory <= minInventory) {
          lowInventoryAlert = true;
          const deficit = minInventory - inventory;
          totalShortageSum += deficit;
          
          // Get site name
          const site = baseData.sites?.find((s: any) => s.id === tank.siteId || s.id === tank.locationId);
          const siteName = site?.name || tank.siteName || '';

          lowInventoryTanks.push({
            name: tank.name || tank.id,
            inventory: inventory,
            minInventory: minInventory,
            deficit: deficit,
            siteId: tank.siteId || tank.locationId,
            siteName: siteName
          });
        }
      });

      // Check if all lowInventoryTanks are from the same site
      let commonSiteName = '';
      if (lowInventoryTanks.length > 0) {
        const firstSiteId = lowInventoryTanks[0].siteId;
        const allSameSite = lowInventoryTanks.every(t => t.siteId === firstSiteId);
        if (allSameSite) {
          commonSiteName = lowInventoryTanks[0].siteName;
        }
      }

      return { totalTanks, withInventoryCount, withoutInventoryCount, lowInventoryAlert, lowInventoryTanks, totalShortageSum, commonSiteName };
    }, [baseData.tanks, baseData.sites, selectedSiteForFilter, selectedTankForFilter, calculateConsignmentOwnedTanksInventory]);


  // تابع برای بارگذاری داده‌های پایه به صورت داینامیک
  const loadBaseData = () => {
    try {
      // دریافت تمام دسته‌بندی‌ها از storage
      const allCategories = storage.getAllData() || {};
      
      // تبدیل داده‌ها به فرمت مورد نیاز
      const loadedBaseData: Record<string, BaseDataItem[]> = {};
      
      // بارگذاری داده‌های اولیه
      const baseDataCategories = storage.loadData('baseDataCategories') || [];
      if (Array.isArray(baseDataCategories)) {
        baseDataCategories.forEach((category: any) => {
          if (category && category.id && category.items) {
            loadedBaseData[category.id] = category.items;
          }
        });
      }
      
      // به‌روزرسانی با داده‌های ذخیره شده
      Object.keys(allCategories).forEach(key => {
        if (key.startsWith('category_')) {
          const categoryKey = key.replace('category_', '');
          if (allCategories[key]?.items) {
            loadedBaseData[categoryKey] = allCategories[key].items;
          }
        }
      });
      
      setBaseData(loadedBaseData);
      console.log('📊 Base data loaded for Inventory Ledger:', Object.keys(loadedBaseData).map(key => `${key}: ${loadedBaseData[key]?.length || 0} items`));
      
      return loadedBaseData;
    } catch (error) {
      console.error('Error loading base data:', error);
      return {};
    }
  };

  // تابع کمکی برای تطبیق دادن نام فیلدها بین داده‌های مختلف
  const normalizeFieldName = (fieldName: string, data: any): string | null => {
    // تطبیق مستقیم
    if (data[fieldName]) return data[fieldName];
    
    // تطبیق با نام‌های جایگزین
    const fieldMappings: Record<string, string[]> = {
      customerCompanyName: ['customerCounterpartyName', 'customerCompanyName', 'counterpartyName', 'companyName'],
      customerCompanyId: ['customerCounterpartyId', 'customerCompanyId', 'counterpartyId', 'companyId'],
      companyLocationName: ['counterpartyLocationName', 'companyLocationName', 'locationName'],
      companyLocationId: ['counterpartyLocationId', 'companyLocationId', 'locationId'],
      customerLocationName: ['customerCounterpartyLocationName', 'customerLocationName', 'locationName'],
      customerLocationId: ['customerCounterpartyLocationId', 'customerLocationId', 'locationId'],
      contractNumber: ['contractNumber', 'contractNumber'],
      permitNumber: ['permitNumber', 'permitNumber', 'receiptNumber'],
      internalCompanyName: ['internalCompanyName', 'internalCompanyName'],
      receiptBasis: ['receiptBasis', 'receiptBasisName'],
      rentalType: ['rentalType', 'rentalTypeName', 'rentalTypeId'],
      indexNumber: ['indexNumber', 'registrationOrderNumber', 'quotaNumber'],
      cotageNumber: ['cotageNumber', 'cotageNumber'],
      shipName: ['shipName', 'shipName'],
      wastageRate: ['wastageRate', 'wastagePercentage', 'wastageRateName', 'wastageRateValue', 'wastageRateId'],
      invoiceNumber: ['invoiceNumber', 'invoiceNumber'],
      referenceNumber: ['referenceNumber', 'referenceNumber', 'transactionNumber'],
      driverName: ['driverName', 'driverName'],
      departmentName: ['departmentName', 'departmentName'],
      description: ['description', 'notes', 'event'],
      locationName: ['locationName', 'locationName', 'siteLocationName']
    };
    
    const alternativeFields = fieldMappings[fieldName] || [fieldName];
    for (const altField of alternativeFields) {
      if (data[altField]) return data[altField];
    }
    
    return null;
  };

  // تابع کمکی برای تطبیق آی‌دی‌ها
  const normalizeFieldId = (fieldName: string, data: any): string | null => {
    const fieldMappings: Record<string, string[]> = {
      customerCompanyId: ['customerCounterpartyId', 'customerCompanyId', 'counterpartyId', 'companyId'],
      companyLocationId: ['counterpartyLocationId', 'companyLocationId'],
      customerLocationId: ['customerCounterpartyLocationId', 'customerLocationId'],
      contractId: ['contractId', 'contractId'],
      permitId: ['permitId', 'permitId'],
      internalCompanyId: ['internalCompanyId', 'internalCompanyId'],
      driverId: ['driverId', 'driverId'],
      departmentId: ['departmentId', 'departmentId'],
      internalSiteId: ['internalSiteId', 'internalSiteId'],
      contractorSiteId: ['contractorSiteId', 'contractorSiteId'],
      cotageId: ['cotageId', 'cotageId'],
      indexId: ['indexId', 'indexId'],
      shipId: ['shipId', 'shipId']
    };
    
    const alternativeFields = fieldMappings[fieldName] || [fieldName];
    for (const altField of alternativeFields) {
      if (data[altField]) return data[altField];
    }
    
    return null;
  };

  // تابع برای ایجاد فیلترهای داینامیک کامل
  const generateDynamicFilters = (baseData: Record<string, BaseDataItem[]>) => {
    const filtersConfig = [
      // فیلترهای اصلی
      {
        id: 'userType',
        label: 'نوع کاربری',
        type: 'select',
        options: [
          { value: '', label: 'همه' },
          { value: 'consignment', label: 'امانی' },
          { value: 'owned', label: 'تملیکی' }
        ],
        static: true
      },
      {
        id: 'type',
        label: 'نوع تراکنش',
        type: 'select',
        options: [
          { value: '', label: 'همه' },
          { value: 'receipt', label: 'رسید' },
          { value: 'delivery', label: 'حواله' },
          { value: 'adjustment-addition', label: 'سند اضافه انبار' },
          { value: 'adjustment-deduction', label: 'سند کسر انبار' },
          { value: 'conversion-produced', label: 'تبدیلی اضافه شده' },
          { value: 'conversion-consumed', label: 'مصرفی کسر شده' }
        ],
        static: true
      },
      // فیلترهای شرکت و طرف حساب
      {
        id: 'companyName',
        label: 'شرکت طرف حساب',
        type: 'select',
        dataKey: 'companies',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'customerCompanyName',
        label: 'مشتری طرف حساب',
        type: 'select',
        dataKey: 'customer-companies',
        valueField: 'name',
        labelField: 'name'
      },
      // فیلترهای محصول و مکان
      {
        id: 'productName',
        label: 'نام کالا',
        type: 'select',
        dataKey: ['owned-products', 'consignment-products'],
        valueField: 'name',
        labelField: 'name',
        combine: true
      },
      {
        id: 'siteName',
        label: 'سایت مخازن',
        type: 'multiSelect',
        dataKey: 'sites',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'tankName',
        label: 'مخزن',
        type: 'multiSelect',
        dataKey: 'tanks',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'locationName',
        label: 'لوکیشن',
        type: 'select',
        dataKey: 'locations',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'companyLocationName',
        label: 'لوکیشن طرف حساب',
        type: 'select',
        dataKey: 'companies-location',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'customerLocationName',
        label: 'لوکیشن مشتری طرف حساب',
        type: 'select',
        dataKey: 'customer-companies-location',
        valueField: 'name',
        labelField: 'name'
      },
      // فیلترهای نیروی انسانی
      {
        id: 'driverName',
        label: 'راننده',
        type: 'select',
        dataKey: 'drivers',
        valueField: 'name',
        labelField: 'name',
        formatLabel: (item: BaseDataItem) => `${item.name} - ${item.plateNumber || ''}`
      },
      {
        id: 'departmentName',
        label: 'دپارتمان',
        type: 'select',
        dataKey: 'departments',
        valueField: 'name',
        labelField: 'name'
      },
      // فیلترهای سایت‌های خاص
      {
        id: 'internalSiteName',
        label: 'سایت های داخلی',
        type: 'select',
        dataKey: 'internal-sites',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'contractorSiteName',
        label: 'سایت های پیمانکاری',
        type: 'select',
        dataKey: 'contractor-sites',
        valueField: 'name',
        labelField: 'name'
      },
      // فیلترهای شماره‌های مرجع
      {
        id: 'transactionNumber',
        label: 'شماره تراکنش',
        type: 'text',
        static: true,
        placeholder: 'جستجو در شماره تراکنش'
      },
      {
        id: 'contractNumber',
        label: 'شماره قرارداد',
        type: 'text',
        static: true,
        placeholder: 'جستجو در شماره قرارداد'
      },
      {
        id: 'permitNumber',
        label: 'شماره مجوز',
        type: 'text',
        static: true,
        placeholder: 'جستجو در شماره مجوز'
      },
      {
        id: 'receiptNumber',
        label: 'شماره رسید انبار',
        type: 'text',
        static: true,
        placeholder: 'جستجو در شماره رسید انبار'
      },
      {
        id: 'invoiceNumber',
        label: 'شماره فاکتور',
        type: 'text',
        static: true,
        placeholder: 'جستجو در شماره فاکتور'
      },
      {
        id: 'referenceNumber',
        label: 'شماره مرجع',
        type: 'text',
        static: true,
        placeholder: 'جستجو در شماره مرجع'
      },
      // فیلترهای حمل و نقل
      {
        id: 'shipName',
        label: 'نام کشتی',
        type: 'select',
        dataKey: 'ship-names',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'cotageNumber',
        label: 'شماره کوتاژ',
        type: 'select',
        dataKey: 'cotage-numbers',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'indexNumber',
        label: 'شماره شاخص/ثبت سفارش',
        type: 'select',
        dataKey: 'index-numbers',
        valueField: 'name',
        labelField: 'name'
      },
      // فیلترهای محاسباتی
      {
        id: 'rentalType',
        label: 'نوع اجاره',
        type: 'select',
        dataKey: 'rental-types',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'rentalRate',
        label: 'نرخ اجاره (ریال)',
        type: 'number',
        static: true,
        placeholder: 'جستجو بر اساس نرخ اجاره'
      },
      {
        id: 'wastageRate',
        label: 'درصد افت',
        type: 'select',
        dataKey: 'wastage-rates',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'receiptBasis',
        label: 'مبنای رسید',
        type: 'select',
        dataKey: 'receipt-basis',
        valueField: 'name',
        labelField: 'name'
      },
      {
        id: 'description',
        label: 'شرح تراکنش',
        type: 'text',
        static: true,
        placeholder: 'جستجو در شرح'
      },
      // فیلترهای سازمانی
      {
        id: 'internalCompanyName',
        label: 'نام شرکت داخلی',
        type: 'select',
        dataKey: 'internal-company',
        valueField: 'name',
        labelField: 'name'
      },
      // فیلترهای وضعیت
      {
        id: 'status',
        label: 'مرحله',
        type: 'select',
        options: [
          { value: '', label: 'همه' },
          { value: 'draft', label: 'پیش‌نویس' },
          { value: 'saved', label: 'ذخیره شده' },
          { value: 'finalized', label: 'نهایی شده' },
          { value: 'printed', label: 'چاپ شده' },
          { value: 'invoiced', label: 'فاکتور شده' },
          { value: 'pending_payment', label: 'در انتظار واریز' },
          { value: 'settled', label: 'تسویه شده' },
          { value: 'attached', label: 'پیوست شده' },
          { value: 'temporary', label: 'موقت' },
          { value: 'voided', label: 'ابطال شده' }
        ],
        static: true
      },
      // فیلترهای تاریخ
      {
        id: 'dateFrom',
        label: 'از تاریخ',
        type: 'date',
        static: true
      },
      {
        id: 'dateTo',
        label: 'تا تاریخ',
        type: 'date',
        static: true
      },
      // فیلترهای واحد و مقدار
      {
        id: 'unit',
        label: 'واحد',
        type: 'select',
        options: [
          { value: '', label: 'همه' },
          { value: 'kg', label: 'کیلوگرم' },
          { value: 'ton', label: 'تن' }
        ],
        static: true
      },
      {
        id: 'amount',
        label: 'مقدار (کیلوگرم)',
        type: 'range',
        static: true,
        minPlaceholder: 'حداقل مقدار',
        maxPlaceholder: 'حداکثر مقدار'
      }
    ];
    
    return filtersConfig;
  };

  // Load base data on component mount
  useEffect(() => {
    const loadedBaseData = loadBaseData();
    setBaseData(loadedBaseData);
    
    // گوش دادن به تغییرات در داده‌های پایه
    const handleBaseDataUpdate = (event: Event) => {
      console.log('🔄 Base data update event received:', event);
      const updatedData = loadBaseData();
      setBaseData(updatedData);
    };
    
    // اضافه کردن event listener برای رویداد baseDataUpdated
    window.addEventListener('baseDataUpdated', handleBaseDataUpdate);
    
    // تمیز کردن event listener
    return () => {
      window.removeEventListener('baseDataUpdated', handleBaseDataUpdate);
    };
  }, []);

  const toggleUnit = () => {
    const newUnit = unitToggle === 'kg' ? 'ton' : 'kg';
    setUnitToggle(newUnit);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, searchTerm, unitToggle, includeNonFinalized, baseData, sortConfig]);

  const applyFilters = () => {
    // Get real data from storage
    const receipts = storage.loadData('receipts') || [];
    const deliveries = storage.loadData('deliveries') || [];
    const inventoryAdjustments = storage.loadData('inventoryAdjustments') || [];
    const consignmentSlips = storage.loadData('consignment-delivery-slips') || [];
    const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
    const wastageTransactions = storage.loadData('wastageTransactions') || [];
    const productConversionsData = storage.loadData('productConversions');
    const productConversions = Array.isArray(productConversionsData) ? productConversionsData : [];
    
    // اعمال سورت در صورت وجود
    const sortData = (data: LedgerEntry[]) => {
      if (!sortConfig) return data;
      
      return [...data].sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        // تعیین مقادیر بر اساس کلید سورت
        switch (sortConfig.key) {
          case 'date':
            aValue = a.date.getTime();
            bValue = b.date.getTime();
            break;
          case 'transactionNumber':
            aValue = a.transactionNumber || '';
            bValue = b.transactionNumber || '';
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'contractNumber':
            aValue = a.contractNumber || '';
            bValue = b.contractNumber || '';
            break;
          case 'permitNumber':
            aValue = a.permitNumber || '';
            bValue = b.permitNumber || '';
            break;
          case 'userType':
            aValue = a.userType;
            bValue = b.userType;
            break;
          case 'receiptBasis':
            aValue = a.receiptBasis || '';
            bValue = b.receiptBasis || '';
            break;
          case 'rentalType':
            aValue = a.rentalType || '';
            bValue = b.rentalType || '';
            break;
          case 'rentalRate':
            aValue = a.rentalRate || 0;
            bValue = b.rentalRate || 0;
            break;
          case 'productName':
            aValue = a.productName || '';
            bValue = b.productName || '';
            break;
          case 'siteName':
            aValue = a.siteName || '';
            bValue = b.siteName || '';
            break;
          case 'tankName':
            aValue = a.tankName || '';
            bValue = b.tankName || '';
            break;
          case 'companyName':
            aValue = a.companyName || '';
            bValue = b.companyName || '';
            break;
          case 'customerCompanyName':
            aValue = a.customerCompanyName || '';
            bValue = b.customerCompanyName || '';
            break;
          case 'companyLocationName':
            aValue = a.companyLocationName || '';
            bValue = b.companyLocationName || '';
            break;
          case 'customerLocationName':
            aValue = a.customerLocationName || '';
            bValue = b.customerLocationName || '';
            break;
          case 'locationName':
            aValue = a.locationName || '';
            bValue = b.locationName || '';
            break;
          case 'shipName':
            aValue = a.shipName || '';
            bValue = b.shipName || '';
            break;
          case 'cotageNumber':
            aValue = a.cotageNumber || '';
            bValue = b.cotageNumber || '';
            break;
          case 'indexNumber':
            aValue = a.indexNumber || '';
            bValue = b.indexNumber || '';
            break;
          case 'wastageRate':
            aValue = a.wastageRate || 0;
            bValue = b.wastageRate || 0;
            break;
          case 'description':
            aValue = a.description || '';
            bValue = b.description || '';
            break;
          case 'invoiceNumber':
            aValue = a.invoiceNumber || '';
            bValue = b.invoiceNumber || '';
            break;
          case 'referenceNumber':
            aValue = a.referenceNumber || '';
            bValue = b.referenceNumber || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'driverName':
            aValue = a.driverName || '';
            bValue = b.driverName || '';
            break;
          case 'departmentName':
            aValue = a.departmentName || '';
            bValue = b.departmentName || '';
            break;
          case 'internalCompanyName':
            aValue = a.internalCompanyName || '';
            bValue = b.internalCompanyName || '';
            break;
          case 'internalSiteName':
            aValue = a.internalSiteName || '';
            bValue = b.internalSiteName || '';
            break;
          case 'contractorSiteName':
            aValue = a.contractorSiteName || '';
            bValue = b.contractorSiteName || '';
            break;
          case 'unit':
            aValue = a.unit;
            bValue = b.unit;
            break;
          case 'receiptAmount':
            aValue = a.receiptAmount || 0;
            bValue = b.receiptAmount || 0;
            break;
          case 'deliveryAmount':
            aValue = a.deliveryAmount || 0;
            bValue = b.deliveryAmount || 0;
            break;
          case 'balance':
            aValue = a.balance || 0;
            bValue = b.balance || 0;
            break;
          case 'runningBalance':
            aValue = a.runningBalance || 0;
            bValue = b.runningBalance || 0;
            break;
          default:
            return 0;
        }
        
        // مقایسه مقادیر
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue, 'fa');
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        } else {
          const comparison = (aValue || 0) - (bValue || 0);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
      });
    };
    
    // Convert to ledger format with normalized field names
    const realLedgerData: LedgerEntry[] = [
      // رسیدهای امانی و تملیکی
      ...receipts.map(r => {
        // تشخیص صحیح نوع تراکنش بر اساس الگوی WarehouseDeliveryManager
        const isConsignmentReceipt = 
          r.userType === 'consignment' ||
          r.contractNumber ||
          r.permitId ||
          r.type === 'امانی';
        
        return {
        id: r.id,
        date: safeParseDate(r.receiptDate) || new Date(),
        transactionNumber: r.transactionNumber,
        type: 'receipt' as const,
        transactionType: 'receipt' as const,
        description: normalizeFieldName('description', r) || `رسید ${isConsignmentReceipt ? 'امانی' : 'تملیکی'} ${r.productName} از ${normalizeFieldName('companyName', r) || 'شرکت صنعت غذایی کورش'}`,
        receiptAmount: r.receiptBasisAmount || r.finalAmount || r.amount || 0,
        deliveryAmount: 0,
        balance: r.receiptBasisAmount || r.finalAmount || r.amount || 0,
        runningBalance: 0, // Will be calculated
        unit: r.unit,
        userType: isConsignmentReceipt ? 'consignment' as const : 'owned' as const,
        companyName: normalizeFieldName('companyName', r),
        productName: r.productName,
        siteName: r.siteName,
        tankName: r.tankName,
        status: r.status,
        // فیلدهای اضافی با تطبیق نام‌ها
        customerCompanyId: normalizeFieldId('customerCompanyId', r),
        customerCompanyName: normalizeFieldName('customerCompanyName', r),
        locationId: r.locationId,
        locationName: r.locationName,
        companyLocationId: normalizeFieldId('companyLocationId', r),
        companyLocationName: normalizeFieldName('companyLocationName', r),
        customerLocationId: normalizeFieldId('customerLocationId', r),
        customerLocationName: normalizeFieldName('customerLocationName', r),
        departmentId: normalizeFieldId('departmentId', r),
        departmentName: normalizeFieldName('departmentName', r),
        driverId: normalizeFieldId('driverId', r),
        driverName: normalizeFieldName('driverName', r),
        internalSiteId: normalizeFieldId('internalSiteId', r),
        internalSiteName: normalizeFieldName('internalSiteName', r),
        contractorSiteId: normalizeFieldId('contractorSiteId', r),
        contractorSiteName: normalizeFieldName('contractorSiteName', r),
        cotageId: normalizeFieldId('cotageId', r),
        cotageNumber: normalizeFieldName('cotageNumber', r),
        indexId: normalizeFieldId('indexId', r),
        indexNumber: normalizeFieldName('indexNumber', r),
        shipId: normalizeFieldId('shipId', r),
        shipName: normalizeFieldName('shipName', r),
        rentalType: normalizeFieldName('rentalType', r),
        wastageRate: normalizeFieldName('wastageRate', r),
        receiptBasis: normalizeFieldName('receiptBasis', r),
        internalCompanyId: normalizeFieldId('internalCompanyId', r),
        internalCompanyName: normalizeFieldName('internalCompanyName', r),
        contractId: normalizeFieldId('contractId', r),
        contractNumber: normalizeFieldName('contractNumber', r),
        permitId: normalizeFieldId('permitId', r),
        permitNumber: normalizeFieldName('permitNumber', r),
        referenceNumber: normalizeFieldName('referenceNumber', r),
        invoiceNumber: normalizeFieldName('invoiceNumber', r),
        rentalRate: r.rentalRate || null
        };
      }),
      // حواله‌های امانی (consignment slips)
      ...consignmentSlips.map(s => ({
        id: s.id,
        date: safeParseDate(s.slipDate || s.createdAt) || new Date(),
        transactionNumber: s.permitNumber || s.id,
        type: 'delivery' as const,
        transactionType: 'delivery' as const,
        description: normalizeFieldName('description', s) || `حواله امانی ${s.productName || ''} به ${normalizeFieldName('counterpartyName', s) || 'مقصد'}`,
        receiptAmount: 0,
        deliveryAmount: s.amount || 0,
        balance: -(s.amount || 0),
        runningBalance: 0,
        unit: s.unit || 'kg',
        userType: 'consignment' as const,
        companyName: normalizeFieldName('counterpartyName', s) || '',
        productName: s.productName || '',
        siteName: s.siteName || '',
        tankName: s.tankName || '',
        status: s.status || 'printed',
        // فیلدهای اضافی
        customerCompanyId: normalizeFieldId('customerCompanyId', s),
        customerCompanyName: normalizeFieldName('customerCompanyName', s),
        locationId: s.locationId,
        locationName: s.locationName,
        companyLocationId: normalizeFieldId('companyLocationId', s),
        companyLocationName: normalizeFieldName('companyLocationName', s),
        customerLocationId: normalizeFieldId('customerLocationId', s),
        customerLocationName: normalizeFieldName('customerLocationName', s),
        departmentId: normalizeFieldId('departmentId', s),
        departmentName: normalizeFieldName('departmentName', s),
        driverId: normalizeFieldId('driverId', s),
        driverName: normalizeFieldName('driverName', s),
        internalSiteId: normalizeFieldId('internalSiteId', s),
        internalSiteName: normalizeFieldName('internalSiteName', s),
        contractorSiteId: normalizeFieldId('contractorSiteId', s),
        contractorSiteName: normalizeFieldName('contractorSiteName', s),
        cotageId: normalizeFieldId('cotageId', s),
        cotageNumber: normalizeFieldName('cotageNumber', s),
        indexId: normalizeFieldId('indexId', s),
        indexNumber: normalizeFieldName('indexNumber', s),
        shipId: normalizeFieldId('shipId', s),
        shipName: normalizeFieldName('shipName', s),
        rentalType: normalizeFieldName('rentalType', s),
        wastageRate: normalizeFieldName('wastageRate', s),
        receiptBasis: normalizeFieldName('receiptBasis', s),
        internalCompanyId: normalizeFieldId('internalCompanyId', s),
        internalCompanyName: normalizeFieldName('internalCompanyName', s),
        contractId: normalizeFieldId('contractId', s),
        contractNumber: normalizeFieldName('contractNumber', s),
        permitId: normalizeFieldId('permitId', s),
        permitNumber: normalizeFieldName('permitNumber', s),
        referenceNumber: normalizeFieldName('referenceNumber', s),
        invoiceNumber: normalizeFieldName('invoiceNumber', s),
        rentalRate: s.rentalRate || null
      })),
      // حواله‌های تملیکی (ownership slips)
      ...ownershipSlips.map(s => ({
        id: s.id,
        date: safeParseDate(s.slipDate || s.createdAt) || new Date(),
        transactionNumber: s.receiptNumber || s.id,
        type: 'delivery' as const,
        transactionType: 'delivery' as const,
        description: normalizeFieldName('description', s) || `حواله تملیکی ${s.productName || ''} به ${normalizeFieldName('counterpartyName', s) || 'مقصد'}`,
        receiptAmount: 0,
        deliveryAmount: s.amount || 0,
        balance: -(s.amount || 0),
        runningBalance: 0,
        unit: s.unit || 'kg',
        userType: 'owned' as const,
        companyName: normalizeFieldName('counterpartyName', s) || 'شرکت صنعت غذایی کورش',
        productName: s.productName || '',
        siteName: s.siteName || '',
        tankName: s.tankName || '',
        status: s.status || 'printed',
        // فیلدهای اضافی
        customerCompanyId: normalizeFieldId('customerCompanyId', s),
        customerCompanyName: normalizeFieldName('customerCompanyName', s),
        locationId: s.locationId,
        locationName: s.locationName,
        companyLocationId: normalizeFieldId('companyLocationId', s),
        companyLocationName: normalizeFieldName('companyLocationName', s),
        customerLocationId: normalizeFieldId('customerLocationId', s),
        customerLocationName: normalizeFieldName('customerLocationName', s),
        departmentId: normalizeFieldId('departmentId', s),
        departmentName: normalizeFieldName('departmentName', s),
        driverId: normalizeFieldId('driverId', s),
        driverName: normalizeFieldName('driverName', s),
        internalSiteId: normalizeFieldId('internalSiteId', s),
        internalSiteName: normalizeFieldName('internalSiteName', s),
        contractorSiteId: normalizeFieldId('contractorSiteId', s),
        contractorSiteName: normalizeFieldName('contractorSiteName', s),
        cotageId: normalizeFieldId('cotageId', s),
        cotageNumber: normalizeFieldName('cotageNumber', s),
        indexId: normalizeFieldId('indexId', s),
        indexNumber: normalizeFieldName('indexNumber', s),
        shipId: normalizeFieldId('shipId', s),
        shipName: normalizeFieldName('shipName', s),
        rentalType: normalizeFieldName('rentalType', s),
        wastageRate: normalizeFieldName('wastageRate', s),
        receiptBasis: normalizeFieldName('receiptBasis', s),
        internalCompanyId: normalizeFieldId('internalCompanyId', s),
        internalCompanyName: normalizeFieldName('internalCompanyName', s),
        contractId: normalizeFieldId('contractId', s),
        contractNumber: normalizeFieldName('contractNumber', s),
        permitId: normalizeFieldId('permitId', s),
        permitNumber: normalizeFieldName('permitNumber', s),
        referenceNumber: normalizeFieldName('referenceNumber', s),
        invoiceNumber: normalizeFieldName('invoiceNumber', s),
        rentalRate: s.rentalRate || null
      })),
      // حواله‌های قدیمی (deliveries)
      ...deliveries.map(d => {
        // تشخیص صحیح نوع تراکنش بر اساس الگوی WarehouseDeliveryManager
        const isConsignmentDelivery = 
          d.userType === 'consignment' ||
          d.contractNumber ||
          d.permitId ||
          d.type === 'امانی';
        
        return {
        id: d.id,
        date: safeParseDate(d.deliveryDate) || new Date(),
        transactionNumber: d.transactionNumber,
        type: 'delivery' as const,
        transactionType: 'delivery' as const,
        description: normalizeFieldName('description', d) || `حواله ${isConsignmentDelivery ? 'امانی' : 'تملیکی'} ${d.productName} به ${normalizeFieldName('companyName', d) || d.locationName || 'مقصد'}`,
        receiptAmount: 0,
        deliveryAmount: d.amount,
        balance: -d.amount,
        runningBalance: 0, // Will be calculated
        unit: d.unit,
        userType: isConsignmentDelivery ? 'consignment' as const : 'owned' as const,
        companyName: normalizeFieldName('companyName', d),
        productName: d.productName,
        siteName: d.siteName,
        tankName: d.tankName,
        status: d.status,
        // فیلدهای اضافی
        customerCompanyId: normalizeFieldId('customerCompanyId', d),
        customerCompanyName: normalizeFieldName('customerCompanyName', d),
        locationId: d.locationId,
        locationName: d.locationName,
        companyLocationId: normalizeFieldId('companyLocationId', d),
        companyLocationName: normalizeFieldName('companyLocationName', d),
        customerLocationId: normalizeFieldId('customerLocationId', d),
        customerLocationName: normalizeFieldName('customerLocationName', d),
        departmentId: normalizeFieldId('departmentId', d),
        departmentName: normalizeFieldName('departmentName', d),
        driverId: normalizeFieldId('driverId', d),
        driverName: normalizeFieldName('driverName', d),
        internalSiteId: normalizeFieldId('internalSiteId', d),
        internalSiteName: normalizeFieldName('internalSiteName', d),
        contractorSiteId: normalizeFieldId('contractorSiteId', d),
        contractorSiteName: normalizeFieldName('contractorSiteName', d),
        cotageId: normalizeFieldId('cotageId', d),
        cotageNumber: normalizeFieldName('cotageNumber', d),
        indexId: normalizeFieldId('indexId', d),
        indexNumber: normalizeFieldName('indexNumber', d),
        shipId: normalizeFieldId('shipId', d),
        shipName: normalizeFieldName('shipName', d),
        rentalType: normalizeFieldName('rentalType', d),
        wastageRate: normalizeFieldName('wastageRate', d),
        receiptBasis: normalizeFieldName('receiptBasis', d),
        internalCompanyId: normalizeFieldId('internalCompanyId', d),
        internalCompanyName: normalizeFieldName('internalCompanyName', d),
        contractId: normalizeFieldId('contractId', d),
        contractNumber: normalizeFieldName('contractNumber', d),
        permitId: normalizeFieldId('permitId', d),
        permitNumber: normalizeFieldName('permitNumber', d),
        referenceNumber: normalizeFieldName('referenceNumber', d),
        invoiceNumber: normalizeFieldName('invoiceNumber', d),
        rentalRate: d.rentalRate || null
        };
      }),
      // سندهای اضافه انبار (امانی و تملیکی)
      ...inventoryAdjustments
        .filter((adj: any) => adj.adjustmentType === 'addition')
        .map((adj: any) => ({
          id: adj.id,
          date: safeParseDate(adj.documentDate || adj.createdAt) || new Date(),
          transactionNumber: `ADD-${adj.id}`,
          type: 'adjustment' as const,
          transactionType: 'adjustment-addition' as const,
          description: normalizeFieldName('description', adj) || `سند اضافه انبار ${adj.nature === 'consignment' ? 'امانی' : 'تملیکی'} ${adj.productName || ''}`,
          receiptAmount: adj.quantity || 0,
          deliveryAmount: 0,
          balance: adj.quantity || 0,
          runningBalance: 0,
          unit: 'kg' as const,
          userType: adj.productType === 'consignment' ? 'consignment' : 'owned',
          companyName: normalizeFieldName('companyName', adj) || '',
          productName: adj.productName || '',
          siteName: adj.siteName || '',
          tankName: adj.tankName || '',
          status: adj.status || 'printed',
          // فیلدهای اضافی
          customerCompanyId: normalizeFieldId('customerCompanyId', adj),
          customerCompanyName: normalizeFieldName('customerCompanyName', adj),
          locationId: adj.locationId,
          locationName: adj.locationName,
          companyLocationId: normalizeFieldId('companyLocationId', adj),
          companyLocationName: normalizeFieldName('companyLocationName', adj),
          customerLocationId: normalizeFieldId('customerLocationId', adj),
          customerLocationName: normalizeFieldName('customerLocationName', adj),
          departmentId: normalizeFieldId('departmentId', adj),
          departmentName: normalizeFieldName('departmentName', adj),
          driverId: normalizeFieldId('driverId', adj),
          driverName: normalizeFieldName('driverName', adj),
          internalSiteId: normalizeFieldId('internalSiteId', adj),
          internalSiteName: normalizeFieldName('internalSiteName', adj),
          contractorSiteId: normalizeFieldId('contractorSiteId', adj),
          contractorSiteName: normalizeFieldName('contractorSiteName', adj),
          cotageId: normalizeFieldId('cotageId', adj),
          cotageNumber: normalizeFieldName('cotageNumber', adj),
          indexId: normalizeFieldId('indexId', adj),
          indexNumber: normalizeFieldName('indexNumber', adj),
          shipId: normalizeFieldId('shipId', adj),
          shipName: normalizeFieldName('shipName', adj),
          rentalType: normalizeFieldName('rentalType', adj),
          wastageRate: normalizeFieldName('wastageRate', adj),
          receiptBasis: normalizeFieldName('receiptBasis', adj),
          internalCompanyId: normalizeFieldId('internalCompanyId', adj),
          internalCompanyName: normalizeFieldName('internalCompanyName', adj),
          contractId: normalizeFieldId('contractId', adj),
          contractNumber: normalizeFieldName('contractNumber', adj),
          permitId: normalizeFieldId('permitId', adj),
          permitNumber: normalizeFieldName('permitNumber', adj),
          referenceNumber: normalizeFieldName('referenceNumber', adj),
          invoiceNumber: normalizeFieldName('invoiceNumber', adj),
          rentalRate: adj.rentalRate || null
        })),
      // سندهای کسر انبار (امانی و تملیکی)
      ...inventoryAdjustments
        .filter((adj: any) => adj.adjustmentType === 'deduction')
        .map((adj: any) => ({
          id: adj.id,
          date: safeParseDate(adj.documentDate || adj.createdAt) || new Date(),
          transactionNumber: `SUB-${adj.id}`,
          type: 'adjustment' as const,
          transactionType: 'adjustment-deduction' as const,
          description: normalizeFieldName('description', adj) || `سند کسر انبار ${adj.nature === 'consignment' ? 'امانی' : 'تملیکی'} ${adj.productName || ''}`,
          receiptAmount: 0,
          deliveryAmount: adj.quantity || 0,
          balance: -(adj.quantity || 0),
          runningBalance: 0,
          unit: 'kg' as const,
          userType: adj.productType === 'consignment' ? 'consignment' : 'owned',
          companyName: normalizeFieldName('companyName', adj) || '',
          productName: adj.productName || '',
          siteName: adj.siteName || '',
          tankName: adj.tankName || '',
          status: adj.status || 'printed',
          // فیلدهای اضافی
          customerCompanyId: normalizeFieldId('customerCompanyId', adj),
          customerCompanyName: normalizeFieldName('customerCompanyName', adj),
          locationId: adj.locationId,
          locationName: adj.locationName,
          companyLocationId: normalizeFieldId('companyLocationId', adj),
          companyLocationName: normalizeFieldName('companyLocationName', adj),
          customerLocationId: normalizeFieldId('customerLocationId', adj),
          customerLocationName: normalizeFieldName('customerLocationName', adj),
          departmentId: normalizeFieldId('departmentId', adj),
          departmentName: normalizeFieldName('departmentName', adj),
          driverId: normalizeFieldId('driverId', adj),
          driverName: normalizeFieldName('driverName', adj),
          internalSiteId: normalizeFieldId('internalSiteId', adj),
          internalSiteName: normalizeFieldName('internalSiteName', adj),
          contractorSiteId: normalizeFieldId('contractorSiteId', adj),
          contractorSiteName: normalizeFieldName('contractorSiteName', adj),
          cotageId: normalizeFieldId('cotageId', adj),
          cotageNumber: normalizeFieldName('cotageNumber', adj),
          indexId: normalizeFieldId('indexId', adj),
          indexNumber: normalizeFieldName('indexNumber', adj),
          shipId: normalizeFieldId('shipId', adj),
          shipName: normalizeFieldName('shipName', adj),
          rentalType: normalizeFieldName('rentalType', adj),
          wastageRate: normalizeFieldName('wastageRate', adj),
          receiptBasis: normalizeFieldName('receiptBasis', adj),
          internalCompanyId: normalizeFieldId('internalCompanyId', adj),
          internalCompanyName: normalizeFieldName('internalCompanyName', adj),
          contractId: normalizeFieldId('contractId', adj),
          contractNumber: normalizeFieldName('contractNumber', adj),
          permitId: normalizeFieldId('permitId', adj),
          permitNumber: normalizeFieldName('permitNumber', adj),
          referenceNumber: normalizeFieldName('referenceNumber', adj),
          invoiceNumber: normalizeFieldName('invoiceNumber', adj),
          rentalRate: adj.rentalRate || null
        })),
      // تراکنش‌های افت: کسر از امانی (خروجی)
      ...wastageTransactions
        .filter((t: any) => t.transactionType === 'consignment')
        .map((t: any) => ({
          id: t.id,
          date: safeParseDate(t.transactionDate) || new Date(),
          transactionNumber: t.transactionNumber || `W-C-${t.referenceId}`,
          type: 'adjustment' as const,
          description: normalizeFieldName('description', t) || `کسر از امانی بابت افت ${t.productName || ''}`,
          receiptAmount: 0,
          deliveryAmount: Math.abs(t.amount || 0),
          balance: -(Math.abs(t.amount || 0)),
          runningBalance: 0,
          unit: t.unit || 'kg',
          userType: 'consignment' as const,
          companyName: '',
          productName: t.productName || '',
          siteName: t.siteName || '',
          tankName: t.tankName || '',
          status: 'printed',
          // فیلدهای اضافی
          customerCompanyId: normalizeFieldId('customerCompanyId', t),
          customerCompanyName: normalizeFieldName('customerCompanyName', t),
          locationId: t.locationId,
          locationName: t.locationName,
          companyLocationId: normalizeFieldId('companyLocationId', t),
          companyLocationName: normalizeFieldName('companyLocationName', t),
          customerLocationId: normalizeFieldId('customerLocationId', t),
          customerLocationName: normalizeFieldName('customerLocationName', t),
          departmentId: normalizeFieldId('departmentId', t),
          departmentName: normalizeFieldName('departmentName', t),
          driverId: normalizeFieldId('driverId', t),
          driverName: normalizeFieldName('driverName', t),
          internalSiteId: normalizeFieldId('internalSiteId', t),
          internalSiteName: normalizeFieldName('internalSiteName', t),
          contractorSiteId: normalizeFieldId('contractorSiteId', t),
          contractorSiteName: normalizeFieldName('contractorSiteName', t),
          cotageId: normalizeFieldId('cotageId', t),
          cotageNumber: normalizeFieldName('cotageNumber', t),
          indexId: normalizeFieldId('indexId', t),
          indexNumber: normalizeFieldName('indexNumber', t),
          shipId: normalizeFieldId('shipId', t),
          shipName: normalizeFieldName('shipName', t),
          rentalType: normalizeFieldName('rentalType', t),
          wastageRate: normalizeFieldName('wastageRate', t),
          receiptBasis: normalizeFieldName('receiptBasis', t),
          internalCompanyId: normalizeFieldId('internalCompanyId', t),
          internalCompanyName: normalizeFieldName('internalCompanyName', t),
          contractId: normalizeFieldId('contractId', t),
          contractNumber: normalizeFieldName('contractNumber', t),
          permitId: normalizeFieldId('permitId', t),
          permitNumber: normalizeFieldName('permitNumber', t),
          referenceNumber: normalizeFieldName('referenceNumber', t),
          invoiceNumber: normalizeFieldName('invoiceNumber', t),
        rentalRate: t.rentalRate || null
        })),
      // تراکنش‌های افت: افزودن به تملیکی (ورودی)
      ...wastageTransactions
        .filter((t: any) => t.transactionType === 'owned')
        .map((t: any) => ({
          id: t.id,
          date: safeParseDate(t.transactionDate) || new Date(),
          transactionNumber: t.transactionNumber || `W-O-${t.referenceId}`,
          type: 'adjustment' as const,
          description: normalizeFieldName('description', t) || `افزودن به تملیکی بابت افت ${t.productName || ''}`,
          receiptAmount: Math.abs(t.amount || 0),
          deliveryAmount: 0,
          balance: Math.abs(t.amount || 0),
          runningBalance: 0,
          unit: t.unit || 'kg',
          userType: 'owned' as const,
          companyName: '',
          productName: t.productName || '',
          siteName: t.siteName || '',
          tankName: t.tankName || '',
          status: 'printed',
          // فیلدهای اضافی
          customerCompanyId: normalizeFieldId('customerCompanyId', t),
          customerCompanyName: normalizeFieldName('customerCompanyName', t),
          locationId: t.locationId,
          locationName: t.locationName,
          companyLocationId: normalizeFieldId('companyLocationId', t),
          companyLocationName: normalizeFieldName('companyLocationName', t),
          customerLocationId: normalizeFieldId('customerLocationId', t),
          customerLocationName: normalizeFieldName('customerLocationName', t),
          departmentId: normalizeFieldId('departmentId', t),
          departmentName: normalizeFieldName('departmentName', t),
          driverId: normalizeFieldId('driverId', t),
          driverName: normalizeFieldName('driverName', t),
          internalSiteId: normalizeFieldId('internalSiteId', t),
          internalSiteName: normalizeFieldName('internalSiteName', t),
          contractorSiteId: normalizeFieldId('contractorSiteId', t),
          contractorSiteName: normalizeFieldName('contractorSiteName', t),
          cotageId: normalizeFieldId('cotageId', t),
          cotageNumber: normalizeFieldName('cotageNumber', t),
          indexId: normalizeFieldId('indexId', t),
          indexNumber: normalizeFieldName('indexNumber', t),
          shipId: normalizeFieldId('shipId', t),
          shipName: normalizeFieldName('shipName', t),
          rentalType: normalizeFieldName('rentalType', t),
          wastageRate: normalizeFieldName('wastageRate', t),
          receiptBasis: normalizeFieldName('receiptBasis', t),
          internalCompanyId: normalizeFieldId('internalCompanyId', t),
          internalCompanyName: normalizeFieldName('internalCompanyName', t),
          contractId: normalizeFieldId('contractId', t),
          contractNumber: normalizeFieldName('contractNumber', t),
          permitId: normalizeFieldId('permitId', t),
          permitNumber: normalizeFieldName('permitNumber', t),
          referenceNumber: normalizeFieldName('referenceNumber', t),
          invoiceNumber: normalizeFieldName('invoiceNumber', t),
        rentalRate: t.rentalRate || null
        })),
      // تبدیل‌های کالا: کالای مصرفی (کسر)
      ...productConversions
        .filter((c: any) => c && !c.isVoided)
        .map((c: any) => ({
          id: `${c.id}-consumed`,
          date: safeParseDate(c.documentDate) || new Date(),
          transactionNumber: c.transactionNumber || `C-${c.id}`,
          type: 'adjustment' as const,
          transactionType: 'conversion-consumed' as const,
          description: `تبدیل کالا - کالای مصرفی: ${c.consumedProductName || ''} (${c.consumedProductType === 'consignment' ? 'امانی' : 'تملیکی'})`,
          receiptAmount: 0,
          deliveryAmount: c.consumedQuantity || 0,
          balance: -(c.consumedQuantity || 0),
          runningBalance: 0,
          unit: c.consumedUnit || 'kg',
          userType: c.consumedProductType === 'consignment' ? 'consignment' : 'owned',
          companyName: '',
          productName: c.consumedProductName || '',
          siteName: c.siteName || '',
          tankName: c.tankName || '',
          status: c.status || 'printed',
          // فیلدهای اضافی
          customerCompanyId: undefined,
          customerCompanyName: '',
          locationId: undefined,
          locationName: '',
          companyLocationId: undefined,
          companyLocationName: '',
          customerLocationId: undefined,
          customerLocationName: '',
          departmentId: undefined,
          departmentName: '',
          driverId: undefined,
          driverName: '',
          internalSiteId: undefined,
          internalSiteName: '',
          contractorSiteId: undefined,
          contractorSiteName: '',
          cotageId: undefined,
          cotageNumber: '',
          indexId: undefined,
          indexNumber: '',
          shipId: undefined,
          shipName: '',
          rentalType: '',
          wastageRate: '',
          receiptBasis: '',
          internalCompanyId: undefined,
          internalCompanyName: '',
          contractId: c.contractId,
          contractNumber: c.contractNumber || '',
          permitId: undefined,
          permitNumber: '',
          referenceNumber: '',
          invoiceNumber: '',
          rentalRate: null
        })),
      // تبدیل‌های کالا: کالای تولیدی (اضافه)
      ...productConversions
        .filter((c: any) => c && !c.isVoided)
        .map((c: any) => ({
          id: `${c.id}-produced`,
          date: safeParseDate(c.documentDate) || new Date(),
          transactionNumber: c.transactionNumber || `C-${c.id}`,
          type: 'adjustment' as const,
          transactionType: 'conversion-produced' as const,
          description: `تبدیل کالا - کالای تولیدی: ${c.producedProductName || ''} (${c.producedProductType === 'consignment' ? 'امانی' : 'تملیکی'})`,
          receiptAmount: c.producedQuantity || 0,
          deliveryAmount: 0,
          balance: c.producedQuantity || 0,
          runningBalance: 0,
          unit: c.producedUnit || 'kg',
          userType: c.producedProductType === 'consignment' ? 'consignment' : 'owned',
          companyName: '',
          productName: c.producedProductName || '',
          siteName: c.siteName || '',
          tankName: c.tankName || '',
          status: c.status || 'printed',
          // فیلدهای اضافی
          customerCompanyId: undefined,
          customerCompanyName: '',
          locationId: undefined,
          locationName: '',
          companyLocationId: undefined,
          companyLocationName: '',
          customerLocationId: undefined,
          customerLocationName: '',
          departmentId: undefined,
          departmentName: '',
          driverId: undefined,
          driverName: '',
          internalSiteId: undefined,
          internalSiteName: '',
          contractorSiteId: undefined,
          contractorSiteName: '',
          cotageId: undefined,
          cotageNumber: '',
          indexId: undefined,
          indexNumber: '',
          shipId: undefined,
          shipName: '',
          rentalType: '',
          wastageRate: '',
          receiptBasis: '',
          internalCompanyId: undefined,
          internalCompanyName: '',
          contractId: c.contractId,
          contractNumber: c.contractNumber || '',
          permitId: undefined,
          permitNumber: '',
          referenceNumber: '',
          invoiceNumber: '',
          rentalRate: null
        }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // اعمال فیلترها
    let filtered = realLedgerData.filter(item => {
      // فیلتر تراکنش‌های مجوز امانی که با M شروع می‌شوند
      if (item.transactionNumber && item.transactionNumber.startsWith('M')) {
        return false;
      }
      
      // Filter by finalization status
      if (!includeNonFinalized) {
        const allowedStatuses = new Set(['printed', 'finalized', 'issued', 'saved', 'invoiced', 'settled']);
        if (!allowedStatuses.has((item.status || '').toString())) {
          return false;
        }
      }
      
      // Search term filter - بهبود یافته برای تمام فیلدهای کاردکس
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchFields = [
          item.transactionNumber,
          item.description,
          item.productName,
          item.companyName,
          item.customerCompanyName,
          item.siteName,
          item.tankName,
          item.locationName,
          item.companyLocationName,
          item.customerLocationName,
          item.contractNumber,
          item.permitNumber,
          item.invoiceNumber,
          item.referenceNumber,
          item.shipName,
          item.cotageNumber,
          item.indexNumber,
          item.driverName,
          item.departmentName,
          item.internalCompanyName,
          item.internalSiteName,
          item.contractorSiteName,
          item.rentalType,
          item.wastageRate,
          item.receiptBasis,
          item.status
        ].filter(Boolean).join(' ');
        
        if (!searchFields.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // فیلترهای بهبود یافته با بررسی وجود فیلد
      if (filters.userType && item.userType !== filters.userType) return false;
      // فیلتر نوع تراکنش: اگر فیلتر تنظیم شده باشد، بر اساس transactionType فیلتر می‌کنیم
      if (filters.type) {
        // اگر transactionType وجود دارد، از آن استفاده می‌کنیم
        if (item.transactionType) {
          if (item.transactionType !== filters.type) return false;
        } else {
          // برای backward compatibility، اگر transactionType وجود نداشت، از type استفاده می‌کنیم
          if (item.type !== filters.type) return false;
        }
      }
      
      // فیلترهای نام و شماره با تطبیق داده
      if (filters.transactionNumber) {
        const transactionNumber = (item.transactionNumber || '').toLowerCase();
        if (!transactionNumber.includes(filters.transactionNumber.toLowerCase())) return false;
      }
      if (filters.contractNumber) {
        const contractNumber = (normalizeFieldName('contractNumber', item) || '').toLowerCase();
        if (!contractNumber.includes(filters.contractNumber.toLowerCase())) return false;
      }
      if (filters.permitNumber) {
        const permitNumber = (normalizeFieldName('permitNumber', item) || '').toLowerCase();
        if (!permitNumber.includes(filters.permitNumber.toLowerCase())) return false;
      }
      if (filters.receiptNumber) {
        const receiptNumber = (item.transactionNumber || '').toLowerCase();
        if (!receiptNumber.includes(filters.receiptNumber.toLowerCase())) return false;
      }
      if (filters.invoiceNumber) {
        const invoiceNumber = (normalizeFieldName('invoiceNumber', item) || '').toLowerCase();
        if (!invoiceNumber.includes(filters.invoiceNumber.toLowerCase())) return false;
      }
      if (filters.referenceNumber) {
        const referenceNumber = (normalizeFieldName('referenceNumber', item) || '').toLowerCase();
        if (!referenceNumber.includes(filters.referenceNumber.toLowerCase())) return false;
      }
      
          // فیلترهای انتخاب از dropdown
          if (filters.productName) {
            if (!item.productName || item.productName !== filters.productName) return false;
          }
        if (filters.locationName) {
          if (!item.locationName || item.locationName !== filters.locationName) return false;
        }
      if (filters.companyLocationName) {
        const value = normalizeFieldName('companyLocationName', item);
        if (!value || value !== filters.companyLocationName) return false;
      }
      if (filters.customerLocationName) {
        const value = normalizeFieldName('customerLocationName', item);
        if (!value || value !== filters.customerLocationName) return false;
      }
      if (filters.companyName) {
        if (!item.companyName || item.companyName !== filters.companyName) return false;
      }
      if (filters.customerCompanyName) {
        const value = normalizeFieldName('customerCompanyName', item);
        if (!value || value !== filters.customerCompanyName) return false;
      }
      if (filters.shipName) {
        const value = normalizeFieldName('shipName', item);
        if (!value || value !== filters.shipName) return false;
      }
      if (filters.cotageNumber) {
        const value = normalizeFieldName('cotageNumber', item);
        if (!value || value !== filters.cotageNumber) return false;
      }
      if (filters.indexNumber) {
        const value = normalizeFieldName('indexNumber', item);
        if (!value || value !== filters.indexNumber) return false;
      }
      
      // فیلتر نوع اجاره - بهبود یافته با پشتیبانی از چندین نوع نام
      if (filters.rentalType) {
        const rentalTypeValue = normalizeFieldName('rentalType', item);
        if (!rentalTypeValue || rentalTypeValue !== filters.rentalType) return false;
      }
      
      // فیلتر نرخ اجاره - جستجوی جزئی با پشتیبانی از چندین منبع
      if (filters.rentalRate) {
        const rentalRateValue = normalizeFieldName('rentalRate', item);
        // فقط تراکنش‌هایی که فیلد نرخ اجاره دارند
        if (!rentalRateValue && rentalRateValue !== 0) return false;
        
        // تبدیل به عدد برای مقایسه
        const numericRentalRate = typeof rentalRateValue === 'number' ? rentalRateValue : parseFloat(rentalRateValue?.toString() || '0');
        const filterText = filters.rentalRate.toString();
        
        // جستجوی جزئی: چک کنید فیلتر در نرخ وجود دارد (به صورت متنی)
        if (!numericRentalRate.toString().includes(filterText)) return false;
      }
      
      // فیلتر درصد افت - بهبود یافته با پشتیبانی از مقدار عددی و متنی
      if (filters.wastageRate) {
        const wastageValue = normalizeFieldName('wastageRate', item);
        if (!wastageValue) return false;
        
        // مقایسه با نام انتخاب شده (برای فیلدهای select)
        if (wastageValue === filters.wastageRate) return true;
        
        // اگر مقدار عددی باشد (مثل 0.5) و فیلتر متنی باشد (مثل "0.5%")
        if (typeof wastageValue === 'number') {
          // استخراج عدد از فیلتر (حذف % و سایر کاراکترها)
          const filterNumber = parseFloat(filters.wastageRate.toString().replace(/[^\d.]/g, ''));
          if (wastageValue === filterNumber || wastageValue.toString() === filters.wastageRate) return true;
        }
        
        // اگر مقدار متنی باشد و نام فیلتر شامل آن باشد
        if (typeof wastageValue === 'string' && wastageValue.includes(filters.wastageRate)) return true;
        
        return false;
      }
      
      if (filters.receiptBasis) {
        const value = normalizeFieldName('receiptBasis', item);
        if (!value || value !== filters.receiptBasis) return false;
      }
      if (filters.status && item.status !== filters.status) return false;
      if (filters.driverName) {
        const value = normalizeFieldName('driverName', item);
        if (!value || value !== filters.driverName) return false;
      }
      if (filters.departmentName) {
        const value = normalizeFieldName('departmentName', item);
        if (!value || value !== filters.departmentName) return false;
      }
      if (filters.internalCompanyName) {
        const value = normalizeFieldName('internalCompanyName', item);
        if (!value || value !== filters.internalCompanyName) return false;
      }
      if (filters.internalSiteName) {
        const value = normalizeFieldName('internalSiteName', item);
        if (!value || value !== filters.internalSiteName) return false;
      }
      if (filters.contractorSiteName) {
        const value = normalizeFieldName('contractorSiteName', item);
        if (!value || value !== filters.contractorSiteName) return false;
      }
      
      // فیلترهای محتوای متنی
      if (filters.description) {
        const description = (normalizeFieldName('description', item) || '').toLowerCase();
        if (!description.includes(filters.description.toLowerCase())) return false;
      }
      
      // فیلترهای عددی
      if (filters.unit && item.unit !== filters.unit) return false;
      
      // فیلترهای محدوده مقدار
      if (filters.amountMin || filters.amountMax) {
        const amount = Math.abs(item.balance);
        const minAmount = parseFloat(filters.amountMin) || 0;
        const maxAmount = parseFloat(filters.amountMax) || Number.MAX_SAFE_INTEGER;
        
        console.log(`فیلتر مقدار: amount=${amount}, min=${minAmount}, max=${maxAmount}`);
        
        if (amount < minAmount || amount > maxAmount) return false;
      }
      
      // Date filters
      if (filters.dateFrom && item.date < filters.dateFrom) return false;
      if (filters.dateTo && item.date > filters.dateTo) return false;
      
      return true;
    });
    
    console.log('📊 تعداد آیتم‌های فیلتر شده:', filtered.length);
    
    // ذخیره داده‌های فیلتر شده بدون تبدیل واحد برای محاسبات دقیق
    const filteredWithoutUnitConversion = [...filtered];
    
    // Calculate running balance
    let runningBalance = 0;
    filtered = filtered.map(item => {
      runningBalance += item.balance;
      return { ...item, runningBalance: Math.round(runningBalance * 100) / 100 };
    });
    
    // Convert units if needed
    if (unitToggle === 'ton') {
      filtered = filtered.map(item => ({
        ...item,
        receiptAmount: item.unit === 'kg' ? Math.round((item.receiptAmount / 1000) * 100) / 100 : item.receiptAmount,
        deliveryAmount: item.unit === 'kg' ? Math.round((item.deliveryAmount / 1000) * 100) / 100 : item.deliveryAmount,
        balance: item.unit === 'kg' ? Math.round((item.balance / 1000) * 100) / 100 : item.balance,
        runningBalance: item.unit === 'kg' ? Math.round((item.runningBalance / 1000) * 100) / 100 : item.runningBalance,
        unit: 'ton' as const
      }));
    } else {
      filtered = filtered.map(item => ({
        ...item,
        receiptAmount: item.unit === 'ton' ? Math.round((item.receiptAmount * 1000) * 100) / 100 : item.receiptAmount,
        deliveryAmount: item.unit === 'ton' ? Math.round((item.deliveryAmount * 1000) * 100) / 100 : item.deliveryAmount,
        balance: item.unit === 'ton' ? Math.round((item.balance * 1000) * 100) / 100 : item.balance,
        runningBalance: item.unit === 'ton' ? Math.round((item.runningBalance * 1000) * 100) / 100 : item.runningBalance,
        unit: 'kg' as const
      }));
    }
    
    // اعمال سورت
    const sortedData = sortData(filtered);
    
    setFilteredData(sortedData);
    
    // تست و گزارش فیلترهای اعمال شده
    console.log('🎯 خلاصه فیلترهای اعمال شده:');
    console.log('📝 کل آیتم‌های داده:', realLedgerData.length);
    console.log('✅ آیتم‌های فیلتر شده:', sortedData.length);
    console.log('📋 فیلترهای فعال:', filters);
    console.log('🔍 عبارت جستجو:', searchTerm);
  };
  
  // تابع سورت کردن
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.key === key) {
        // تغییر جهت اگر همان کلید باشد
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // شروع سورت صعودی برای کلید جدید
        return {
          key,
          direction: 'asc'
        };
      }
    });
  };
  
  // تابع نمایش آیکون سورت
  const getSortIcon = (columnKey: string) => {
    if (sortConfig?.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  // تابع تست فیلترها برای دیباگ
  const exportToExcel = () => {
    try {
      const headers = [
        'تاریخ',
        'شماره تراکنش',
        'نوع کاربری',
        'شرکت',
        'کالا',
        'سایت',
        'مخزن',
        'مشتری طرف حساب',
        'لوکیشن',
        'لوکیشن طرف حساب',
        'دپارتمان',
        'راننده',
        'شماره کوتاژ',
        'شماره شاخص',
        'نام کشتی',
        'نوع اجاره',
        'مقدار افت',
        'مبنای رسید',
        'نام شرکت داخلی',
        'مرحله',
        'شماره قرارداد',
        'شماره مجوز',
        'شماره مرجع',
        'شماره فاکتور',
        'شرح',
        'رسید',
        'حواله',
        'مانده',
        'مانده برخط',
        'واحد'
      ];
      
      const excelData = [
        headers.join(','),
        ...filteredData.map(item => [
          formatPersianDate(item.date),
          item.transactionNumber,
          item.userType === 'consignment' ? 'امانی' : 'تملیکی',
          item.companyName || 'شرکت صنعت غذایی کورش',
          item.productName,
          item.siteName,
          item.tankName,
          item.customerCompanyName || '',
          item.locationName || '',
          item.companyLocationName || '',
          item.departmentName || '',
          item.driverName || '',
          item.cotageNumber || '',
          item.indexNumber || '',
          item.shipName || '',
          item.rentalType || '',
          item.wastageRate || '',
          item.receiptBasis || '',
          item.internalCompanyName || '',
          item.status || '',
          item.contractNumber || '',
          item.permitNumber || '',
          item.referenceNumber || '',
          item.invoiceNumber || '',
          item.description,
          item.receiptAmount,
          item.deliveryAmount,
          item.balance,
          item.runningBalance,
          item.unit === 'kg' ? 'کیلوگرم' : 'تن'
        ].join(','))
      ].join('\n');
      
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + excelData], { 
        type: 'text/csv;charset=utf-8;'
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `گزارش_انبار_${formatPersianDate(new Date())}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('خطا در ایجاد فایل اکسل');
    }
  };

  const getSummaryData = () => {
    // استفاده از داده‌های با واحد یکسان (kg) برای محاسبات دقیق
    const normalizedData = filteredData.map(item => {
      // تبدیل همه به کیلوگرم برای محاسبه دقیق
      if (item.unit === 'ton') {
        return {
          ...item,
          receiptAmount: item.receiptAmount * 1000,
          deliveryAmount: item.deliveryAmount * 1000,
          balance: item.balance * 1000,
          runningBalance: item.runningBalance * 1000
        };
      }
      return item;
    });
    
    const receiptTransactions = normalizedData.filter(item => item.type === 'receipt');
    const deliveryTransactions = normalizedData.filter(item => item.type === 'delivery');
    const adjustmentTransactions = normalizedData.filter(item => item.type === 'adjustment');
    
    // محاسبه موجودی امانی و تملیکی با جمع balance هر نوع
    const consignmentTransactions = normalizedData.filter(item => item.userType === 'consignment');
    const ownedTransactions = normalizedData.filter(item => item.userType === 'owned');
    
    // محاسبه جمع‌ها با اطمینان از مقادیر عددی صحیح
    const totalReceipts = normalizedData.reduce((sum, item) => {
      const amount = typeof item.receiptAmount === 'number' ? item.receiptAmount : 0;
      return sum + amount;
    }, 0);
    
    const totalDeliveries = normalizedData.reduce((sum, item) => {
      const amount = typeof item.deliveryAmount === 'number' ? item.deliveryAmount : 0;
      return sum + amount;
    }, 0);
    
    const consignmentBalance = consignmentTransactions.reduce((sum, item) => {
      const balance = typeof item.balance === 'number' ? item.balance : 0;
      return sum + balance;
    }, 0);
    
    const ownedBalance = ownedTransactions.reduce((sum, item) => {
      const balance = typeof item.balance === 'number' ? item.balance : 0;
      return sum + balance;
    }, 0);
    
    // تبدیل به واحد انتخابی کاربر
    const unitFactor = unitToggle === 'ton' ? 1000 : 1;
    
    const summary = {
      totalReceipts: Math.round((totalReceipts / unitFactor) * 100) / 100,
      totalDeliveries: Math.round((totalDeliveries / unitFactor) * 100) / 100,
      finalBalance: filteredData.length > 0 ? filteredData[filteredData.length - 1].runningBalance : 0,
      transactionCount: normalizedData.length,
      receiptCount: receiptTransactions.length,
      deliveryCount: deliveryTransactions.length,
      adjustmentCount: adjustmentTransactions.length,
      consignmentBalance: Math.round((consignmentBalance / unitFactor) * 100) / 100,
      ownedBalance: Math.round((ownedBalance / unitFactor) * 100) / 100,
      averageTransactionValue: normalizedData.length > 0 
        ? Math.round((normalizedData.reduce((sum, item) => sum + Math.abs(item.balance || 0), 0) / normalizedData.length / unitFactor) * 100) / 100
        : 0
    };
    return summary;
  };

  const summary = getSummaryData();
  
  // تولید فیلترهای داینامیک
  const dynamicFilters = generateDynamicFilters(baseData);
  
  // تعیین فیلترهای فعال بر اساس نوع فیلتر انتخابی
  const getActiveFilters = () => {
    const baseFilters = dynamicFilters.filter(f => f.static);
    
    if (filterType === 'filter1') {
      return [
        ...baseFilters,
        dynamicFilters.find(f => f.id === 'productName'),
        dynamicFilters.find(f => f.id === 'siteName'),
        dynamicFilters.find(f => f.id === 'tankName'),
        dynamicFilters.find(f => f.id === 'receiptBasis'),
        dynamicFilters.find(f => f.id === 'rentalType'),
        dynamicFilters.find(f => f.id === 'rentalRate'),
        dynamicFilters.find(f => f.id === 'wastageRate'),
        dynamicFilters.find(f => f.id === 'amount'),
      ].filter(Boolean);
    } else if (filterType === 'filter2') {
      return [
        ...baseFilters,
        dynamicFilters.find(f => f.id === 'productName'),
        dynamicFilters.find(f => f.id === 'siteName'),
        dynamicFilters.find(f => f.id === 'tankName'),
        dynamicFilters.find(f => f.id === 'companyName'),
        dynamicFilters.find(f => f.id === 'customerCompanyName'),
        dynamicFilters.find(f => f.id === 'companyLocationName'),
        dynamicFilters.find(f => f.id === 'customerLocationName'),
        dynamicFilters.find(f => f.id === 'locationName'),
        dynamicFilters.find(f => f.id === 'shipName'),
        dynamicFilters.find(f => f.id === 'cotageNumber'),
        dynamicFilters.find(f => f.id === 'indexNumber'),
        dynamicFilters.find(f => f.id === 'receiptBasis'),
        dynamicFilters.find(f => f.id === 'rentalType'),
        dynamicFilters.find(f => f.id === 'rentalRate'),
        dynamicFilters.find(f => f.id === 'wastageRate'),
        dynamicFilters.find(f => f.id === 'description'),
        dynamicFilters.find(f => f.id === 'amount'),
      ].filter(Boolean);
    } else {
      return [
        ...baseFilters,
        dynamicFilters.find(f => f.id === 'productName'),
        dynamicFilters.find(f => f.id === 'siteName'),
        dynamicFilters.find(f => f.id === 'tankName'),
        dynamicFilters.find(f => f.id === 'contractNumber'),
        dynamicFilters.find(f => f.id === 'permitNumber'),
        dynamicFilters.find(f => f.id === 'companyName'),
        dynamicFilters.find(f => f.id === 'customerCompanyName'),
        dynamicFilters.find(f => f.id === 'companyLocationName'),
        dynamicFilters.find(f => f.id === 'customerLocationName'),
        dynamicFilters.find(f => f.id === 'locationName'),
        dynamicFilters.find(f => f.id === 'shipName'),
        dynamicFilters.find(f => f.id === 'cotageNumber'),
        dynamicFilters.find(f => f.id === 'indexNumber'),
        dynamicFilters.find(f => f.id === 'receiptBasis'),
        dynamicFilters.find(f => f.id === 'rentalType'),
        dynamicFilters.find(f => f.id === 'rentalRate'),
        dynamicFilters.find(f => f.id === 'wastageRate'),
        dynamicFilters.find(f => f.id === 'description'),
        dynamicFilters.find(f => f.id === 'invoiceNumber'),
        dynamicFilters.find(f => f.id === 'referenceNumber'),
        dynamicFilters.find(f => f.id === 'status'),
        dynamicFilters.find(f => f.id === 'driverName'),
        dynamicFilters.find(f => f.id === 'departmentName'),
        dynamicFilters.find(f => f.id === 'internalCompanyName'),
        dynamicFilters.find(f => f.id === 'amount'),
      ].filter(Boolean);
    }
  };
  
  // تعیین ستون‌های جدول بر اساس نوع فیلتر - کامل شده
  const getTableColumns = () => {
    const baseColumns = [
      'date', 'transactionNumber', 'type', 'receiptAmount', 'deliveryAmount', 'balance', 'runningBalance'
    ];
    
    if (filterType === 'filter1') {
      return [
        ...baseColumns,
        'contractNumber', 'permitNumber', 'receiptBasis', 'rentalType', 'rentalRate', 'productName', 'siteName', 'tankName', 'wastageRate'
      ];
    } else if (filterType === 'filter2') {
      return [
        ...baseColumns,
        'contractNumber', 'permitNumber', 'userType', 'receiptBasis', 'rentalType', 'rentalRate', 'productName', 'siteName', 'tankName',
        'companyName', 'customerCompanyName', 'companyLocationName', 'customerLocationName', 'locationName', 
        'shipName', 'cotageNumber', 'indexNumber', 'wastageRate', 'description'
      ];
    } else {
      return [
        ...baseColumns,
        'contractNumber', 'permitNumber', 'userType', 'receiptBasis', 'rentalType', 'rentalRate', 'productName', 'siteName', 'tankName',
        'companyName', 'customerCompanyName', 'companyLocationName', 'customerLocationName', 'locationName', 
        'shipName', 'cotageNumber', 'indexNumber', 'wastageRate', 'description',
        'invoiceNumber', 'referenceNumber', 'status', 'driverName', 'departmentName', 'internalCompanyName',
        'internalSiteName', 'contractorSiteName', 'unit'
      ];
    }
  };
  
  const activeFilters = getActiveFilters();
  const tableColumns = getTableColumns();
  
  // رندر کردن فیلتر بر اساس نوع آن - بهبود یافته
    const renderFilter = (filterConfig: any) => {
      const { id, label, type, options, dataKey, valueField, labelField, formatLabel, combine, static: isStatic } = filterConfig;
      
      if (type === 'multiSelect') {
        let selectOptions = options || [];
        
        if (!options && dataKey) {
          if (Array.isArray(dataKey) && combine) {
            selectOptions = dataKey.flatMap(key => 
              (baseData[key] || []).map((item: BaseDataItem) => ({
                value: item[valueField as keyof BaseDataItem],
                label: formatLabel ? formatLabel(item) : item[labelField as keyof BaseDataItem]
              }))
            );
          } else {
            const key = Array.isArray(dataKey) ? dataKey[0] : dataKey;
            selectOptions = (baseData[key] || []).map((item: BaseDataItem) => ({
              value: item[valueField as keyof BaseDataItem],
              label: formatLabel ? formatLabel(item) : item[labelField as keyof BaseDataItem]
            }));
          }
        }
        
        const uniqueOptionsMap = new Map();
        selectOptions.forEach((opt: any) => {
          if (opt.value) uniqueOptionsMap.set(opt.value, opt.label);
        });
        const uniqueOptionsArray: [string, string][] = Array.from(uniqueOptionsMap.entries());

        return (
          <div key={id} className="mb-4">
            <MultiSelectDropdown
              label={label}
              placeholder={`انتخاب ${label}...`}
              options={uniqueOptionsArray}
              selectedValues={filters[id] || []}
              onChange={(values) => setFilters({ ...filters, [id]: values })}
            />
          </div>
        );
      }
      
      if (type === 'select') {
      let selectOptions = options || [];
      
      // اگر گزینه‌ها از پیش تعریف نشده‌اند، از داده‌های پایه استفاده کن
      if (!options && dataKey) {
        if (Array.isArray(dataKey) && combine) {
          // ترکیب چند منبع داده
          selectOptions = dataKey.flatMap(key => 
            (baseData[key] || []).map((item: BaseDataItem) => ({
              value: item[valueField as keyof BaseDataItem],
              label: formatLabel ? formatLabel(item) : item[labelField as keyof BaseDataItem]
            }))
          );
        } else {
          // استفاده از یک منبع داده
          const key = Array.isArray(dataKey) ? dataKey[0] : dataKey;
          selectOptions = (baseData[key] || []).map((item: BaseDataItem) => ({
            value: item[valueField as keyof BaseDataItem],
            label: formatLabel ? formatLabel(item) : item[labelField as keyof BaseDataItem]
          }));
        }
      }
      
      // حذف مقادیر تکراری
      const uniqueOptions = selectOptions.filter((option: any, index: number, arr: any[]) => 
        arr.findIndex(o => o.value === option.value) === index
      );
      
      return (
        <div key={id} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <select
            value={filters[id] || ''}
            onChange={(e) => setFilters({ ...filters, [id]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">همه</option>
            {uniqueOptions.map((option: any, index: number) => (
              <option key={index} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      );
    }
    
    if (type === 'date') {
      return (
        <div key={id} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <PersianDatePicker
            value={filters[id]}
            onChange={(date) => setFilters({ ...filters, [id]: date })}
            placeholder={id === 'dateFrom' ? "انتخاب تاریخ شروع" : "انتخاب تاریخ پایان"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      );
    }
    
    if (type === 'text') {
      return (
        <div key={id} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <input
            type="text"
            placeholder={filterConfig.placeholder || `جستجو در ${label}`}
            value={filters[id] || ''}
            onChange={(e) => setFilters({ ...filters, [id]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      );
    }
    
    if (type === 'number') {
      return (
        <div key={id} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <input
            type="number"
            placeholder={filterConfig.placeholder || `جستجو بر اساس ${label}`}
            value={filters[id] || ''}
            onChange={(e) => setFilters({ ...filters, [id]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      );
    }
    
    if (type === 'range') {
      return (
        <div key={id} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder={filterConfig.minPlaceholder || 'حداقل'}
              value={filters[`${id}Min`] || ''}
              onChange={(e) => setFilters({ ...filters, [`${id}Min`]: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <input
              type="number"
              placeholder={filterConfig.maxPlaceholder || 'حداکثر'}
              value={filters[`${id}Max`] || ''}
              onChange={(e) => setFilters({ ...filters, [`${id}Max`]: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo and Professional Design */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">کاردکس موجودی پیشرفته</h1>
                  <p className="text-blue-100">مدیریت و پایش جامع موجودی انبار با گزارش‌گیری حرفه‌ای</p>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>آخرین به‌روزرسانی: {formatPersianDate(new Date())}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>{formatPersianNumber(filteredData.length)} تراکنش فعال</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    loadBaseData();
                    applyFilters();
                    window.dispatchEvent(new CustomEvent('refreshData'));
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/20"
                  title="به‌روزرسانی اطلاعات"
                >
                  <RefreshCw className="h-4 w-4" />
                  به‌روزرسانی
                </button>
                <img 
                  src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559"
                  alt="لوگو شرکت" 
                  className="h-16 w-auto rounded-lg shadow-md"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = "/لوگو صنعت غذایی کورش.jpg";
                    target.onerror = () => {
                      target.style.display = 'none';
                    };
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">فیلترهای کاردکس</h3>
          </div>
          
          {/* Scrollable Filters Container */}
          <div className="max-h-96 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeFilters.map(renderFilter)}
            </div>
          </div>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="جستجو بر اساس تمام فیلدهای کاردکس (شماره تراکنش، شرح، نام کالا، شرکت، قرارداد، مجوز، مرجع، فاکتور، لوکیشن، راننده، دپارتمان و ...)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Active Filters Display */}
          {Object.keys(filters).length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">فیلترهای فعال:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (!value) return null;
                  
                  const filterConfig = dynamicFilters.find(f => f.id === key);
                  const label = filterConfig?.label || key;
                  
                    // تبدیل مقدار به متن قابل فهم
                    let displayValue = value;
                    if (value instanceof Date) {
                      displayValue = formatPersianDate(value);
                    } else if (Array.isArray(value)) {
                      displayValue = value.length === 0 
                        ? 'همه' 
                        : value.length > 3 
                          ? `${value.length} مورد انتخاب شده` 
                          : value.join('، ');
                    } else if (typeof value === 'string' && value.length > 20) {
                    displayValue = value.substring(0, 20) + '...';
                  } else if (key.includes('Min') || key.includes('Max')) {
                    // برای فیلترهای محدوده مقدار
                    const baseKey = key.replace(/Min|Max$/, '');
                    const filterConfig = dynamicFilters.find(f => f.id === baseKey);
                    const baseLabel = filterConfig?.label || baseKey;
                    if (key.includes('Min')) {
                      displayValue = `${baseLabel} (حداقل): ${value}`;
                    } else {
                      displayValue = `${baseLabel} (حداکثر): ${value}`;
                    }
                  }
                  
                  return (
                    <span key={key} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      <span className="font-medium">{label}:</span>
                      <span>{displayValue}</span>
                      <button
                        onClick={() => {
                          const newFilters = { ...filters };
                          delete newFilters[key];
                          setFilters(newFilters);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeNonFinalizedLedger"
                checked={includeNonFinalized}
                onChange={(e) => setIncludeNonFinalized(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeNonFinalizedLedger" className="text-sm text-gray-700">
              تراکنش های نهایی و موقت
              </label>
            </div>
            
            {/* نوع فیلتر Selector */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">نوع گزارش:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'filter1' | 'filter2' | 'filter3')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="filter1">🔍 گزارش پایه</option>
                <option value="filter2">📊 گزارش کامل</option>
                <option value="filter3">🎯 گزارش جامع</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'summary' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline ml-2" />
                سرجمع
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'detailed' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FileText className="h-4 w-4 inline ml-2" />
                ریز گردش جزئیات
              </button>
            </div>
            
            <button
              onClick={() => setFilters({})}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              پاک کردن فیلترها
            </button>
            

            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              خروجی اکسل
            </button>
            
            <button
              onClick={toggleUnit}
              className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                unitToggle === 'kg' 
                  ? 'bg-blue-600 text-white transform translate-x-0' 
                  : 'bg-orange-600 text-white transform -translate-x-1'
              }`}
            >
              <div className={`transition-transform duration-300 ${unitToggle === 'ton' ? 'rotate-180' : ''}`}>
                ⚖️
              </div>
              {unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}
            </button>
          </div>
        </div>
        
        {/* Professional Inventory Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">خلاصه موجودی انبار</h3>
              <p className="text-sm text-gray-600">وضعیت کلی موجودی در تاریخ {formatPersianDate(new Date())}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-600 mb-1">موجودی امانی</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatPersianNumber(summary.consignmentBalance)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}
                  </div>
                </div>
                <div className="p-3 bg-blue-200 rounded-full">
                  <Package className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-green-600 mb-1">موجودی تملیکی</div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatPersianNumber(summary.ownedBalance)}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}
                  </div>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <Warehouse className="h-6 w-6 text-green-700" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-purple-600 mb-1">تعداد تراکنش‌ها</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {formatPersianNumber(summary.transactionCount)}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    تراکنش فعال
                  </div>
                </div>
                <div className="p-3 bg-purple-200 rounded-full">
                  <FileText className="h-6 w-6 text-purple-700" />
                </div>
              </div>
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
            {/* فیلترهای گزارش موجودی */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline ml-1" />
              تا تاریخ
            </label>
            <PersianDatePicker
              value={upToDate}
              onChange={(date) => setUpToDate(date)}
              placeholder="تاریخ را انتخاب کنید"
            />
          </div>
          
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline ml-1" />
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
                <Truck className="w-4 h-4 inline ml-1" />
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* موجودی مخازن تملیکی - ردیف اول ستون اول */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-purple-200">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
                  <h2 className="text-xl font-semibold text-center">موجودی مخازن تملیکی</h2>
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

              {/* موجودی مخازن امانی - ردیف اول ستون دوم */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-green-200">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
                  <h2 className="text-xl font-semibold text-center">موجودی مخازن امانی</h2>
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

              {/* موجودی مخازن امانی و تملیکی - ردیف دوم کامل */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden lg:col-span-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">موجودی مخازن امانی و تملیکی</h2>
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
                  {/* نتایج محاسبات */}
                  <div className="bg-gray-50 rounded-lg p-4">
                      {(() => {
                        const inventory = calculateConsignmentOwnedTanksInventory(selectedSiteForFilter, selectedTankForFilter);
                        const totalCapacity = calculateTotalTankCapacity(selectedSiteForFilter, selectedTankForFilter);
                        const emptyCapacity = Math.max(0, totalCapacity - (inventory.finalInventory || 0));
                        const { totalTanks, withInventoryCount, withoutInventoryCount } = calculateTankStatusCounts();
                      
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-6">
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
                              <span className="font-semibold text-green-600">+{formatPersianNumber(inventory.consignmentProducedProducts || 0)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">کالای مصرفی تملیکی:</span>
                              <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedConsumedProducts || 0)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-gray-100">
                              <span className="text-gray-600">کالای تولیدی تملیکی:</span>
                              <span className="font-semibold text-green-600">+{formatPersianNumber(inventory.ownedProducedProducts || 0)}</span>
                            </div>
                          </div>
  
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* ظرفیت مخازن */}
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
  
                            {/* موجودی نهایی */}
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
  
                            {/* ظرفیت خالی مخازن */}
                            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden group">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-orange-800 font-bold text-lg">ظرفیت خالی مخزن:</span>
                                <span className="text-2xl font-black text-orange-900">{formatPersianNumber(emptyCapacity)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-orange-600 text-sm">
                                <FlaskConical className="w-4 h-4" />
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

              {/* گزارش حداقل موجودی مخزن - ردیف آخر کامل */}
              <div className="lg:col-span-2 mt-2">
                {(() => {
                  const { lowInventoryAlert, lowInventoryTanks, totalShortageSum, commonSiteName } = calculateTankStatusCounts();
                  return (
                    <div className={`${lowInventoryAlert ? 'bg-red-50 border-red-300 animate-[pulse_3s_infinite]' : 'bg-gray-50 border-gray-200 opacity-60'} p-6 rounded-2xl border-2 shadow-md relative overflow-hidden group transition-all`}>
                      <div className="flex justify-between items-center mb-4 border-b pb-4 border-red-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${lowInventoryAlert ? 'bg-red-100' : 'bg-gray-100'}`}>
                            <AlertTriangle className={`w-6 h-6 ${lowInventoryAlert ? 'text-red-600' : 'text-gray-600'}`} />
                          </div>
                          <span className={`${lowInventoryAlert ? 'text-red-900' : 'text-gray-900'} font-black text-2xl`}>گزارش حداقل موجودی مخازن</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {commonSiteName && (
                              <div className="bg-green-500 text-white px-6 py-1.5 rounded-xl text-center font-black text-sm shadow-md border-2 border-green-400 animate-bounce">
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
                                <div key={i} className="p-4 bg-white rounded-xl border-2 border-red-100 shadow-sm hover:shadow-md transition-shadow relative">
                                  <div className="flex justify-between items-center mb-3 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                    <span className="text-[12px] font-black text-blue-800">
                                      سایت: {t.siteName || '---'}
                                    </span>
                                  </div>
                                  <div className="font-black text-blue-600 text-2xl mb-3 border-b border-red-50 pb-2">
                                    {t.name}
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
            </>
          )}
        
        {/* Summary View */}
        {viewMode === 'summary' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">آمار تراکنش‌ها</h3>
                  <p className="text-sm text-gray-600">تحلیل جامع عملیات انبار</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">کل رسیدها</p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatPersianNumber(summary.totalReceipts)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {formatPersianNumber(summary.receiptCount)} تراکنش | {unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}
                      </p>
                    </div>
                    <div className="p-3 bg-green-200 rounded-full">
                      <Package className="h-6 w-6 text-green-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600">کل حواله‌ها</p>
                      <p className="text-2xl font-bold text-red-900">
                        {formatPersianNumber(summary.totalDeliveries)}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {formatPersianNumber(summary.deliveryCount)} تراکنش | {unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}
                      </p>
                    </div>
                    <div className="p-3 bg-red-200 rounded-full">
                      <Truck className="h-6 w-6 text-red-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600">اسناد اضافه/کسر</p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {formatPersianNumber(Math.abs(filteredData.filter(item => item.type === 'adjustment').reduce((sum, item) => sum + item.balance, 0)))}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        {formatPersianNumber(summary.adjustmentCount)} تراکنش | {unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-200 rounded-full">
                      <Calculator className="h-6 w-6 text-yellow-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">مانده نهایی</p>
                    <p className={`text-2xl font-bold ${summary.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPersianNumber(summary.finalBalance)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">{unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <BarChart3 className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">موجودی امانی</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatPersianNumber(summary.consignmentBalance)}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">{unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-full">
                    <Package className="h-6 w-6 text-purple-700" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">موجودی تملیکی</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {formatPersianNumber(summary.ownedBalance)}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">{unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}</p>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-full">
                    <Warehouse className="h-6 w-6 text-orange-700" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600">میانگین مقدار</p>
                    <p className="text-2xl font-bold text-indigo-900">
                      {formatPersianNumber(Math.round(summary.averageTransactionValue))}
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">هر تراکنش | {unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}</p>
                  </div>
                  <div className="p-3 bg-indigo-200 rounded-full">
                    <Calculator className="h-6 w-6 text-indigo-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Detailed View */}
        {viewMode === 'detailed' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      ریز گردش کاردکس جزئیات
                    </h3>
                    <p className="text-sm text-gray-600">
                      جزئیات کامل {formatPersianNumber(filteredData.length)} تراکنش با قابلیت فیلتر پیشرفته
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>آخرین به‌روزرسانی: {formatPersianDate(new Date())}</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {tableColumns.includes('date') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          تاریخ
                          {getSortIcon('date')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('transactionNumber') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('transactionNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره تراکنش
                          {getSortIcon('transactionNumber')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('type') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('type')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نوع تراکنش
                          {getSortIcon('type')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('contractNumber') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('contractNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره قرارداد
                          {getSortIcon('contractNumber')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('permitNumber') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('permitNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره مجوز
                          {getSortIcon('permitNumber')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('userType') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('userType')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نوع کاربری
                          {getSortIcon('userType')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('receiptBasis') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('receiptBasis')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          مبنای رسید
                          {getSortIcon('receiptBasis')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('rentalType') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('rentalType')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نوع اجاره
                          {getSortIcon('rentalType')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('rentalRate') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('rentalRate')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نرخ اجاره
                          {getSortIcon('rentalRate')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('productName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('productName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          کالا
                          {getSortIcon('productName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('siteName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('siteName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          سایت
                          {getSortIcon('siteName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('tankName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('tankName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          مخزن
                          {getSortIcon('tankName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('companyName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('companyName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          طرف حساب
                          {getSortIcon('companyName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('customerCompanyName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('customerCompanyName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          مشتری طرف حساب
                          {getSortIcon('customerCompanyName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('companyLocationName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('companyLocationName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          لوکیشن طرف حساب
                          {getSortIcon('companyLocationName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('customerLocationName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('customerLocationName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          لوکیشن مشتری طرف حساب
                          {getSortIcon('customerLocationName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('locationName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('locationName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          لوکیشن
                          {getSortIcon('locationName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('shipName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('shipName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نام کشتی
                          {getSortIcon('shipName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('cotageNumber') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('cotageNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره کوتاژ
                          {getSortIcon('cotageNumber')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('indexNumber') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('indexNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره شاخص/ثبت سفارش
                          {getSortIcon('indexNumber')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('wastageRate') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('wastageRate')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          درصد افت
                          {getSortIcon('wastageRate')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('description') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('description')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شرح
                          {getSortIcon('description')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('invoiceNumber') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('invoiceNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره فاکتور
                          {getSortIcon('invoiceNumber')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('referenceNumber') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('referenceNumber')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          شماره مرجع
                          {getSortIcon('referenceNumber')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('status') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          مرحله
                          {getSortIcon('status')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('driverName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('driverName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          راننده
                          {getSortIcon('driverName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('departmentName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('departmentName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          دپارتمان
                          {getSortIcon('departmentName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('internalCompanyName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('internalCompanyName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          نام شرکت داخلی
                          {getSortIcon('internalCompanyName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('internalSiteName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('internalSiteName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          سایت داخلی
                          {getSortIcon('internalSiteName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('contractorSiteName') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('contractorSiteName')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          سایت پیمانکاری
                          {getSortIcon('contractorSiteName')}
                        </div>
                      </th>
                    )}
                    {tableColumns.includes('unit') && (
                      <th 
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('unit')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          واحد
                          {getSortIcon('unit')}
                        </div>
                      </th>
                    )}
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('receiptAmount')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        رسید
                        {getSortIcon('receiptAmount')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('deliveryAmount')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        حواله
                        {getSortIcon('deliveryAmount')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('balance')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        مانده موجودی
                        {getSortIcon('balance')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('runningBalance')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        مانده برخط
                        {getSortIcon('runningBalance')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item, index) => (
                    <tr key={item.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {tableColumns.includes('date') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {formatPersianDate(item.date)}
                        </td>
                      )}
                      {tableColumns.includes('transactionNumber') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                          {item.transactionNumber}
                        </td>
                      )}
                      {tableColumns.includes('type') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.type === 'receipt' 
                              ? 'bg-green-100 text-green-800' 
                              : item.type === 'delivery'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.type === 'receipt' ? 'رسید' : item.type === 'delivery' ? 'حواله' : 'سند'}
                          </span>
                        </td>
                      )}
                      {tableColumns.includes('contractNumber') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.contractNumber || '-'}
                        </td>
                      )}
                      {tableColumns.includes('permitNumber') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.permitNumber || '-'}
                        </td>
                      )}
                      {tableColumns.includes('userType') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.userType === 'consignment' ? 'امانی' : 'تملیکی'}
                        </td>
                      )}
                      {tableColumns.includes('receiptBasis') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.receiptBasis || '-'}
                        </td>
                      )}
                      {tableColumns.includes('rentalType') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.rentalType || '-'}
                        </td>
                      )}
                      {tableColumns.includes('rentalRate') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.rentalRate ? formatPersianNumber(item.rentalRate) : '-'}
                        </td>
                      )}
                      {tableColumns.includes('productName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.productName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('siteName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.siteName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('tankName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.tankName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('companyName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.companyName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('customerCompanyName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.customerCompanyName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('companyLocationName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.companyLocationName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('customerLocationName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.customerLocationName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('locationName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.locationName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('shipName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.shipName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('cotageNumber') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.cotageNumber || '-'}
                        </td>
                      )}
                      {tableColumns.includes('indexNumber') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.indexNumber || '-'}
                        </td>
                      )}
                      {tableColumns.includes('wastageRate') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.wastageRate ? formatPersianNumber(item.wastageRate) : '-'}
                        </td>
                      )}
                      {tableColumns.includes('description') && (
                        <td className="px-3 py-4 text-xs text-gray-900 max-w-xs">
                          <div className="truncate" title={item.description}>
                            {item.description}
                          </div>
                        </td>
                      )}
                      {tableColumns.includes('invoiceNumber') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.invoiceNumber || '-'}
                        </td>
                      )}
                      {tableColumns.includes('referenceNumber') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.referenceNumber || '-'}
                        </td>
                      )}
                      {tableColumns.includes('status') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.status || '-'}
                        </td>
                      )}
                      {tableColumns.includes('driverName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.driverName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('departmentName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.departmentName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('internalCompanyName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.internalCompanyName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('internalSiteName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.internalSiteName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('contractorSiteName') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.contractorSiteName || '-'}
                        </td>
                      )}
                      {tableColumns.includes('unit') && (
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-900">
                          {item.unit === 'kg' ? 'کیلوگرم' : 'تن'}
                        </td>
                      )}
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-green-600 font-medium">
                        {item.receiptAmount > 0 ? `+${formatPersianNumber(item.receiptAmount)}` : '-'}
                        {item.receiptAmount > 0 && (
                          <div className="text-xs text-gray-500">
                            {item.unit === 'kg' ? 'کیلوگرم' : 'تن'}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-red-600 font-medium">
                        {item.deliveryAmount > 0 ? `-${formatPersianNumber(item.deliveryAmount)}` : '-'}
                        {item.deliveryAmount > 0 && (
                          <div className="text-xs text-gray-500">
                            {item.unit === 'kg' ? 'کیلوگرم' : 'تن'}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs font-medium">
                        <div className={`${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.balance >= 0 ? '+' : ''}{formatPersianNumber(item.balance)}
                          <div className="text-xs text-gray-500">{item.unit === 'kg' ? 'کیلوگرم' : 'تن'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs font-bold">
                        <div className={`${item.runningBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatPersianNumber(item.runningBalance)}
                          <div className="text-xs text-gray-500">{item.unit === 'kg' ? 'کیلوگرم' : 'تن'}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredData.length === 0 && (
              <div className="p-16 text-center">
                <div className="bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <Search className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">هیچ تراکنشی یافت نشد</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  با فیلترهای انتخاب شده هیچ تراکنشی یافت نشد. لطفاً فیلترها را تغییر دهید یا دوباره تلاش کنید.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setFilters({})}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    پاک کردن فیلترها
                  </button>
                  <button
                    onClick={() => {
                      loadBaseData();
                      applyFilters();
                    }}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    به‌روزرسانی
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};