import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Database, 
  Layers, 
  Calendar, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  RefreshCw, 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Package,
  AlertTriangle,
  History,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { storage } from '../../utils/dataStorage';
import { formatPersianNumber, safeNumber } from '../../utils/warehouseDeliveryUtils';
import PermissionGuard from '../Common/PermissionGuard';
import PersianDatePicker from '../Common/PersianDatePicker';
import { BaseDataItem } from '../../types';

interface Transaction {
  id: string;
  date: string;
  type: string;
  tankName: string;
  siteName: string;
  amount: number;
  description: string;
  userType: 'consignment' | 'owned';
  [key: string]: any;
}

const InventoryLedgerManager: React.FC = () => {
  const [selectedSiteForFilter, setSelectedSiteForFilter] = useState<string>('');
  const [selectedTankForFilter, setSelectedTankForFilter] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');
  const [unitToggle, setUnitToggle] = useState<'kg' | 'ton'>('kg');
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [baseData, setBaseData] = useState<Record<string, BaseDataItem[]>>({});

  // بارگذاری تمام دسته‌بندی‌های داده‌های پایه در یک مرحله
  const baseDataCategories = useMemo(() => storage.loadData('baseDataCategories') || [], []);

  useEffect(() => {
    loadBaseData();
  }, []);

  const upToDate = toDate || '9999/99/99';

  // Memoized data structures for fast lookup
  const memoizedInventoryData = useMemo(() => {
    console.log('🚀 Pre-calculating inventory data for Ledger...');
    const tanks = (baseData.tanks || []).filter((t: any) => t.isActive !== false);
    const tankData: Record<string, any> = {};
    tanks.forEach(t => {
      tankData[t.id] = {
        receipts: [], adjustments: [], deliveries: [], consignmentSlips: [], 
        ownershipSlips: [], generalDeliveries: [], wastage: [], conversions: []
      };
    });

    // Load and filter all data sources
    const allReceipts = (storage.loadData('receipts') || []).filter((r: any) => !r.isVoided && (r.date || r.documentDate) <= upToDate);
    const allAdjustments = (storage.loadData('inventoryAdjustments') || []).filter((a: any) => !a.isVoided && (a.date || a.documentDate) <= upToDate);
    const allDeliveries = (storage.loadData('deliveries') || []).filter((d: any) => !d.isVoided && (d.date || d.documentDate) <= upToDate);
    const allConsignmentSlips = (storage.loadData('consignment-delivery-slips') || []).filter((s: any) => !s.isVoided && (s.date || s.documentDate) <= upToDate);
    const allOwnershipSlips = (storage.loadData('ownership-delivery-slips') || []).filter((s: any) => !s.isVoided && (s.date || s.documentDate) <= upToDate);
    const allGeneralDeliveries = (storage.loadData('general-deliveries') || []).filter((d: any) => !d.isVoided && (d.date || d.documentDate) <= upToDate);
    const allWastage = (storage.loadData('wastageTransactions') || []).filter((t: any) => !t.isVoided && (t.date || t.transactionDate) <= upToDate);
    const allConversions = (storage.loadData('productConversions') || []).filter((c: any) => !c.isVoided && (c.date || c.documentDate) <= upToDate);

    // Grouping
    allReceipts.forEach(r => { if(tankData[r.tankId]) tankData[r.tankId].receipts.push(r); });
    allAdjustments.forEach(a => { if(tankData[a.tankId]) tankData[a.tankId].adjustments.push(a); });
    allDeliveries.forEach(d => { if(tankData[d.tankId]) tankData[d.tankId].deliveries.push(d); });
    allConsignmentSlips.forEach(s => { if(tankData[s.tankId]) tankData[s.tankId].consignmentSlips.push(s); });
    allOwnershipSlips.forEach(s => { if(tankData[s.tankId]) tankData[s.tankId].ownershipSlips.push(s); });
    allGeneralDeliveries.forEach(d => { if(tankData[d.tankId]) tankData[d.tankId].generalDeliveries.push(d); });
    allWastage.forEach(w => { if(tankData[w.tankId]) tankData[w.tankId].wastage.push(w); });
    allConversions.forEach(c => { if(tankData[c.tankId]) tankData[c.tankId].conversions.push(c); });

    return { tankData, activeTanks: tanks };
  }, [baseData.tanks, upToDate, inventoryRefreshKey]);

  // Calculate inventory for a specific tank/site
  const calculateOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    let ownedReceiptsAmount = 0;
    let ownedAdditionDocuments = 0;
    let ownedDeliveries = 0;
    let ownedDeductionDocuments = 0;
    let ownedConsumedProducts = 0;
    let ownedProducedProducts = 0;
    let ownedWastage = 0;

    const tanksToProcess = currentTankId ? [currentTankId] : Object.keys(memoizedInventoryData.tankData);

    tanksToProcess.forEach(id => {
      const data = memoizedInventoryData.tankData[id];
      if (!data) return;

      const siteMatch = (t: any) => !currentSiteId || String(t.siteId || t.locationId || '') === String(currentSiteId);

      data.receipts.filter(siteMatch).filter((r: any) => r.userType === 'owned').forEach((r: any) => ownedReceiptsAmount += safeNumber(r.amount || r.receiptBasisAmount, 0));
      data.adjustments.filter(siteMatch).filter((a: any) => a.productType === 'owned').forEach((a: any) => {
        if (a.adjustmentType === 'addition') ownedAdditionDocuments += safeNumber(a.quantity, 0);
        else ownedDeductionDocuments += safeNumber(a.quantity, 0);
      });
      data.deliveries.filter(siteMatch).filter((d: any) => d.userType === 'owned').forEach((d: any) => ownedDeliveries += safeNumber(d.amount, 0));
      data.ownershipSlips.filter(siteMatch).forEach((s: any) => ownedDeliveries += safeNumber(s.amount, 0));
      data.wastage.filter(siteMatch).filter((t: any) => t.transactionType === 'owned').forEach((t: any) => ownedWastage += Math.abs(safeNumber(t.amount, 0)));
      data.conversions.filter(siteMatch).forEach((c: any) => {
        if (c.consumedProductType === 'owned') ownedConsumedProducts += safeNumber(c.consumedQuantity, 0);
        if (c.producedProductType === 'owned') ownedProducedProducts += safeNumber(c.producedQuantity, 0);
      });
    });

    const finalInventory = ownedReceiptsAmount + ownedAdditionDocuments + ownedProducedProducts - ownedDeliveries - ownedWastage - ownedDeductionDocuments - ownedConsumedProducts;
    return { finalInventory };
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

    const tanksToProcess = currentTankId ? [currentTankId] : Object.keys(memoizedInventoryData.tankData);

    tanksToProcess.forEach(id => {
      const data = memoizedInventoryData.tankData[id];
      if (!data) return;

      const siteMatch = (t: any) => !currentSiteId || String(t.siteId || t.locationId || '') === String(currentSiteId);

      data.receipts.filter(siteMatch).filter((r: any) => r.userType === 'consignment').forEach((r: any) => consignmentReceiptsAmount += safeNumber(r.amount || r.receiptBasisAmount, 0));
      data.adjustments.filter(siteMatch).filter((a: any) => a.productType === 'consignment').forEach((a: any) => {
        if (a.adjustmentType === 'addition') consignmentAdditions += safeNumber(a.quantity, 0);
        else consignmentDeductionDocuments += safeNumber(a.quantity, 0);
      });
      data.consignmentSlips.filter(siteMatch).forEach((s: any) => consignmentDeliveries += safeNumber(s.amount, 0));
      data.generalDeliveries.filter(siteMatch).filter((d: any) => d.userType === 'consignment').forEach((d: any) => consignmentDeliveries += safeNumber(d.amount, 0));
      data.wastage.filter(siteMatch).filter((t: any) => t.transactionType === 'consignment').forEach((t: any) => consignmentDeductionAmount += Math.abs(safeNumber(t.amount, 0)));
      data.conversions.filter(siteMatch).forEach((c: any) => {
        if (c.consumedProductType === 'consignment') consignmentConsumedProducts += safeNumber(c.consumedQuantity, 0);
        if (c.producedProductType === 'consignment') consignmentProducedProducts += safeNumber(c.producedQuantity, 0);
      });
    });

    const finalInventory = consignmentReceiptsAmount + consignmentAdditions + consignmentProducedProducts - consignmentDeliveries - consignmentDeductionAmount - consignmentDeductionDocuments - consignmentConsumedProducts;
    return { finalInventory };
  }, [memoizedInventoryData, selectedSiteForFilter, selectedTankForFilter]);

  const calculateConsignmentOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    const owned = calculateOwnedTanksInventory(siteId, tankId);
    const consignment = calculateConsignmentTanksInventory(siteId, tankId);
    return { finalInventory: owned.finalInventory + consignment.finalInventory };
  }, [calculateOwnedTanksInventory, calculateConsignmentTanksInventory]);

    const calculateTankStatusCounts = useCallback(() => {
      const tanksList = (baseData.tanks || []).filter((t: any) => t.isActive !== false);
      const currentSiteId = selectedSiteForFilter;
      const currentTankId = selectedTankForFilter;

      let totalTanks = 0;
      let withInventoryCount = 0;
      let withoutInventoryCount = 0;
      let lowInventoryAlert = false;
      let lowInventoryTanks: any[] = [];
      let totalShortageSum = 0;

      // Get all unique sites to find site names
      const siteCategory = (baseDataCategories || []).find((c: any) => c.id === 'tank-sites');
      const uniqueSites = siteCategory?.items.map((i: any) => [i.id, i.name]) || [];

      tanksList.forEach((tank: any) => {
        // Apply filters
        if (currentTankId && String(tank.id) !== currentTankId) return;
        
        const tankSiteIdMeta = String(tank.siteId || tank.locationId || '');
        if (currentSiteId && tankSiteIdMeta && tankSiteIdMeta !== currentSiteId) return;

        const inventoryData = calculateConsignmentOwnedTanksInventory(currentSiteId, tank.id);
        const inventory = inventoryData.finalInventory || 0;

        // Check if there are ANY transactions for this tank in the filtered context
        const hasTransactions = (() => {
          const filterSite = currentSiteId || undefined;
          const data = memoizedInventoryData.tankData[tank.id];
          if (!data) return false;

          const matches = (t: any) => {
            const dateMatch = !toDate || (t.date && t.date <= toDate);
            const siteMatch = !filterSite || (String(t.siteId || t.locationId || '') === filterSite);
            return dateMatch && siteMatch;
          };

          return (
            data.receipts.some(matches) ||
            data.generalDeliveries.some(matches) ||
            data.consignmentSlips.some(matches) ||
            data.ownershipSlips.some(matches) ||
            data.wastage.some(matches) ||
            data.adjustments.some(matches) ||
            data.conversions.some(matches)
          );
        })();

        // Logic: Exclude if no transactions, unless it's All Sites & All Tanks
        const isAllSelected = !currentSiteId && !currentTankId;
        if (!hasTransactions && !isAllSelected) return;

        totalTanks++;
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
          
          let effectiveSiteId = tankSiteIdMeta;
          if (!effectiveSiteId && hasTransactions) {
            effectiveSiteId = currentSiteId || '';
          }
          
          const siteName = uniqueSites.find(([id]) => id === effectiveSiteId)?.[1] || (currentSiteId ? uniqueSites.find(([id]) => id === currentSiteId)?.[1] : '') || '';
          
          lowInventoryTanks.push({
            name: tank.name || tank.id,
            siteName: siteName,
            inventory: inventory,
            minInventory: minInventory,
            deficit: deficit
          });
        }
      });

      return { totalTanks, withInventoryCount, withoutInventoryCount, lowInventoryAlert, lowInventoryTanks, totalShortageSum };
    }, [baseData.tanks, selectedSiteForFilter, selectedTankForFilter, calculateConsignmentOwnedTanksInventory, memoizedInventoryData, baseDataCategories, toDate]);

  const loadBaseData = () => {
    try {
      const allCategories = storage.getAllData() || {};
      const loadedBaseData: Record<string, BaseDataItem[]> = {};
      const baseDataCategories = storage.loadData('baseDataCategories') || [];
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
      return loadedBaseData;
    } catch (error) {
      console.error('Error loading base data:', error);
      return {};
    }
  };

  const getFilteredData = () => {
    let allTransactions: any[] = [];
    const filterSite = selectedSiteForFilter || undefined;
    const filterTank = selectedTankForFilter || undefined;

    Object.keys(memoizedInventoryData.tankData).forEach(tankId => {
      if (filterTank && tankId !== filterTank) return;
      const data = memoizedInventoryData.tankData[tankId];
      
      const siteMatch = (t: any) => !filterSite || String(t.siteId || t.locationId || '') === String(filterSite);

      data.receipts.filter(siteMatch).forEach((r: any) => allTransactions.push({ ...r, type: 'رسید' }));
      data.deliveries.filter(siteMatch).forEach((d: any) => allTransactions.push({ ...d, type: 'حواله' }));
      data.consignmentSlips.filter(siteMatch).forEach((s: any) => allTransactions.push({ ...s, type: 'حواله امانی' }));
      data.ownershipSlips.filter(siteMatch).forEach((s: any) => allTransactions.push({ ...s, type: 'حواله تملیکی' }));
      data.generalDeliveries.filter(siteMatch).forEach((d: any) => allTransactions.push({ ...d, type: 'حواله عمومی' }));
      data.wastage.filter(siteMatch).forEach((w: any) => allTransactions.push({ ...w, type: 'تلفات' }));
      data.adjustments.filter(siteMatch).forEach((a: any) => allTransactions.push({ ...a, type: a.adjustmentType === 'addition' ? 'اضافه انبار' : 'کسر انبار' }));
      data.conversions.filter(siteMatch).forEach((c: any) => allTransactions.push({ ...c, type: 'تبدیل کالا' }));
    });

    return allTransactions.sort((a, b) => (b.date || b.documentDate || b.transactionDate || '').localeCompare(a.date || a.documentDate || a.transactionDate || ''));
  };

  const filteredData = getFilteredData();
  const summary = calculateConsignmentOwnedTanksInventory();

  return (
    <PermissionGuard permission="reports.view">
      <div className="p-6 bg-gray-50 min-h-screen font-['Vazirmatn']" dir="rtl">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <History className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">کاردکس موجودی</h1>
              <p className="text-gray-500 font-medium">مشاهده دقیق ریز گردش کالا و وضعیت مخازن</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setInventoryRefreshKey(prev => prev + 1)}
              className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 rounded-xl border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all font-bold shadow-sm"
            >
              <RefreshCw className="h-5 w-5" />
              <span>به‌روزرسانی</span>
            </button>
            <button className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-100">
              <Printer className="h-5 w-5" />
              <span>چاپ کاردکس</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
            <Filter className="h-6 w-6 text-indigo-500" />
            <h2 className="text-xl font-black text-gray-800">فیلترهای هوشمند</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-gray-700 mr-1 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-500" />
                سایت مخازن
              </label>
              <select 
                value={selectedSiteForFilter}
                onChange={(e) => setSelectedSiteForFilter(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold text-gray-800"
              >
                <option value="">تمام سایت‌ها</option>
                {(baseData['tank-sites'] || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-gray-700 mr-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                نام مخزن
              </label>
              <select 
                value={selectedTankForFilter}
                onChange={(e) => setSelectedTankForFilter(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all font-bold text-gray-800"
              >
                <option value="">تمام مخازن</option>
                {(baseData.tanks || []).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-gray-700 mr-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-500" />
                تا تاریخ
              </label>
              <PersianDatePicker
                value={toDate}
                onChange={setToDate}
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-400 transition-all font-bold text-gray-800"
              />
            </div>

            <div className="flex items-end gap-3">
              <button 
                onClick={() => {
                  setSelectedSiteForFilter('');
                  setSelectedTankForFilter('');
                  setToDate('');
                }}
                className="flex-1 p-3.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-black text-sm"
              >
                پاکسازی فیلترها
              </button>
            </div>
          </div>
        </div>

        {/* View Selection */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex-1 bg-white p-2 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 flex gap-2">
            <button 
              onClick={() => setViewMode('detailed')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-black ${viewMode === 'detailed' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <FileText className="h-5 w-5" />
              <span>ریز گردش کاردکس جزئیات</span>
            </button>
            <button 
              onClick={() => setViewMode('summary')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-black ${viewMode === 'summary' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <BarChart2 className="h-5 w-5" />
              <span>خلاصه وضعیت انبار</span>
            </button>
          </div>
          
          <div className="bg-white p-2 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 flex gap-2">
            <button 
              onClick={() => setUnitToggle('kg')}
              className={`px-6 py-3 rounded-xl transition-all font-black ${unitToggle === 'kg' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              کیلوگرم
            </button>
            <button 
              onClick={() => setUnitToggle('ton')}
              className={`px-6 py-3 rounded-xl transition-all font-black ${unitToggle === 'ton' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              تن
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {viewMode === 'detailed' && (
            <>
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-transparent">
                  <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-indigo-600" />
                    تاریخچه تراکنش‌ها (ریز گردش کاردکس جزئیات)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-5 font-black text-gray-700 text-sm">تاریخ</th>
                        <th className="p-5 font-black text-gray-700 text-sm">نوع تراکنش</th>
                        <th className="p-5 font-black text-gray-700 text-sm">نام مخزن</th>
                        <th className="p-5 font-black text-gray-700 text-sm">سایت</th>
                        <th className="p-5 font-black text-gray-700 text-sm text-center">مقدار ({unitToggle === 'kg' ? 'kg' : 'ton'})</th>
                        <th className="p-5 font-black text-gray-700 text-sm">توضیحات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredData.length > 0 ? (
                        filteredData.map((t, i) => {
                          const amount = Number(t.amount || t.receiptBasisAmount || t.quantity || t.producedQuantity || t.consumedQuantity || 0);
                          const isNegative = ['حواله', 'حواله امانی', 'حواله تملیکی', 'حواله عمومی', 'کسر انبار', 'تلفات'].includes(t.type) || t.consumedQuantity;
                          
                          return (
                            <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="p-5 font-bold text-gray-800 text-sm tabular-nums">{formatPersianNumber(t.date || t.documentDate || t.transactionDate)}</td>
                              <td className="p-5">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-sm ${
                                  t.type === 'رسید' ? 'bg-green-100 text-green-700' :
                                  t.type.includes('حواله') ? 'bg-red-100 text-red-700' :
                                  'bg-indigo-100 text-indigo-700'
                                }`}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="p-5 font-black text-gray-900">{t.tankName || 'نامشخص'}</td>
                              <td className="p-5 font-bold text-gray-600">{t.siteName || t.locationName || '-'}</td>
                              <td className="p-5 text-center">
                                <span className={`text-lg font-black tabular-nums ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                                  {isNegative ? '-' : '+'}{formatPersianNumber(unitToggle === 'kg' ? amount : (amount / 1000).toFixed(3))}
                                </span>
                              </td>
                              <td className="p-5 text-gray-500 font-medium text-xs max-w-xs truncate">{t.description || t.notes || '-'}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-20 text-center">
                            <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-black text-xl">هیچ تراکنشی یافت نشد</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* گزارش حداقل موجودی */}
              <div className="lg:col-span-2">
                {(() => {
                  const { lowInventoryAlert, lowInventoryTanks, totalShortageSum } = calculateTankStatusCounts();
                  const allSameSite = lowInventoryTanks.length > 0 && lowInventoryTanks.every((t: any) => t.siteName && t.siteName === lowInventoryTanks[0].siteName);
                  const commonSiteName = allSameSite ? lowInventoryTanks[0].siteName : null;

                  return (
                    <div className={`${lowInventoryAlert ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-gray-50 border-gray-200 opacity-60'} p-6 rounded-3xl border-2 shadow-lg transition-all`}>
                      <div className="flex justify-between items-start mb-6 border-b pb-4 border-red-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${lowInventoryAlert ? 'bg-red-100' : 'bg-gray-100'}`}>
                            <AlertTriangle className={`w-6 h-6 ${lowInventoryAlert ? 'text-red-600' : 'text-gray-600'}`} />
                          </div>
                          <span className={`${lowInventoryAlert ? 'text-red-900' : 'text-gray-900'} font-black text-2xl`}>گزارش حداقل موجودی مخازن</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {commonSiteName && (
                            <div className="bg-white/80 border border-green-400 text-green-800 px-4 py-1 rounded-lg text-center font-bold text-sm shadow-sm">
                              سایت: {commonSiteName}
                            </div>
                          )}
                          <div className={`flex items-center justify-between gap-4 px-4 py-2 rounded-full ${lowInventoryAlert ? 'bg-red-400 text-white shadow-lg' : 'bg-gray-400 text-white'}`}>
                            <span className="font-bold">تعداد مخزن:</span>
                            <span className="text-xl font-black">{formatPersianNumber(lowInventoryTanks?.length || 0)}</span>
                          </div>
                          {lowInventoryAlert && (
                            <div className="flex items-center justify-between gap-4 px-4 py-2 rounded-full bg-red-500 text-white shadow-lg">
                              <span className="font-bold text-xs">جمع کل کسر موجودی:</span>
                              <span className="text-lg font-black">{formatPersianNumber(totalShortageSum)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lowInventoryAlert && lowInventoryTanks && lowInventoryTanks.length > 0 ? (
                          lowInventoryTanks.map((t: any, i: number) => (
                            <div key={i} className="p-4 bg-white rounded-2xl border-2 border-red-100 shadow-sm">
                              <div className="font-black text-blue-600 text-2xl mb-3 border-b border-red-50 pb-2 flex items-center justify-between">
                                <span>{t.name}</span>
                                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{t.siteName || 'بدون سایت'}</span>
                              </div>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                  <span className="font-bold text-gray-600 text-sm">حداقل تعریف شده:</span>
                                  <span className="font-black text-lg">{formatPersianNumber(t.minInventory)}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                                  <span className="font-bold text-green-700 text-sm">موجودي فعلي:</span>
                                  <span className="font-black text-lg text-green-600">{formatPersianNumber(t.inventory)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-red-400 text-white rounded-lg font-black">
                                  <span>کسری موجودی:</span>
                                  <span className="text-xl">{formatPersianNumber(t.deficit)}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full py-10 text-center bg-green-50 rounded-2xl border border-green-100">
                            <p className="text-green-600 font-bold text-xl">وضعیت موجودی تمام مخازن مطلوب است ✅</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}

          {viewMode === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-black text-gray-500">موجودی کل</p>
                  <Package className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-3xl font-black text-gray-900 tabular-nums">
                  {formatPersianNumber(unitToggle === 'kg' ? summary.finalInventory : (summary.finalInventory / 1000).toFixed(3))}
                </p>
                <p className="text-xs text-gray-400 mt-2">مجموع موجودی امانی و تملیکی</p>
              </div>
              {/* Add more summary cards as needed */}
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
};

export default InventoryLedgerManager;