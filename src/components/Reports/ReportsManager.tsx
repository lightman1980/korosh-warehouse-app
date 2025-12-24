import React, { useState, useMemo, useCallback } from 'react';
import { 
  FileText, 
  BarChart3, 
  Search, 
  Download, 
  Printer, 
  Filter, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Database
} from 'lucide-react';
import { storage } from '../../utils/dataStorage';
import { formatPersianNumber } from '../../utils/warehouseDeliveryUtils';
import PermissionGuard from '../Common/PermissionGuard';
import PersianDatePicker from '../Common/PersianDatePicker';

const ReportsManager: React.FC = () => {
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedTank, setSelectedTank] = useState<string>('all');
  const [toDate, setToDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');
  const [unitToggle, setUnitToggle] = useState<'kg' | 'ton'>('kg');
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);

  // Load basic data
  const baseDataCategories = storage.loadData('baseDataCategories') || [];
  const tanks = (baseDataCategories.find((c: any) => c.id === 'tanks')?.items || []).filter((t: any) => t.isActive !== false);
  const receipts = (storage.loadData('receipts') || []).filter((r: any) => !r.isVoided);
  const deliveries = (storage.loadData('deliveries') || []).filter((d: any) => !d.isVoided);
  const consignmentSlips = (storage.loadData('consignment-delivery-slips') || []).filter((s: any) => !s.isVoided);
  const ownershipSlips = (storage.loadData('ownership-delivery-slips') || []).filter((s: any) => !s.isVoided);
  const wastageTransactions = (storage.loadData('wastageTransactions') || []).filter((t: any) => !t.isVoided);
  const inventoryAdjustments = (storage.loadData('inventoryAdjustments') || []).filter((t: any) => !t.isVoided);
  const productConversions = (storage.loadData('productConversions') || []).filter((t: any) => !t.isVoided);

  const upToDate = toDate || '9999/99/99';

  const memoizedInventoryData = useMemo(() => {
    console.log('🚀 Pre-calculating all inventory data for Reports...');
    const activeTankIds = new Map();
    tanks.forEach((t: any) => activeTankIds.set(t.id, t.name));

    // Filter transactions up to date
    const allReceipts = receipts.filter((r: any) => (r.date || r.documentDate) <= upToDate);
    const allAdjustments = inventoryAdjustments.filter((a: any) => (a.date || a.documentDate) <= upToDate);
    const allDeliveries = deliveries.filter((d: any) => (d.date || d.documentDate) <= upToDate);
    const allConsignmentSlips = consignmentSlips.filter((s: any) => (s.date || s.documentDate) <= upToDate);
    const allOwnershipSlips = ownershipSlips.filter((s: any) => (s.date || s.documentDate) <= upToDate);
    const allWastage = wastageTransactions.filter((t: any) => (t.date || t.transactionDate) <= upToDate);
    const allConversions = productConversions.filter((t: any) => (t.date || t.documentDate) <= upToDate);

    // Group by tankId for fast lookup
    const tankData: Record<string, any> = {};
    activeTankIds.forEach((name, id) => {
      tankData[id] = {
        receipts: [], adjustments: [], deliveries: [], consignmentSlips: [], 
        ownershipSlips: [], wastage: [], conversions: []
      };
    });

    allReceipts.forEach((r: any) => { if(tankData[r.tankId]) tankData[r.tankId].receipts.push(r); });
    allAdjustments.forEach((a: any) => { if(tankData[a.tankId]) tankData[a.tankId].adjustments.push(a); });
    allDeliveries.forEach((d: any) => { if(tankData[d.tankId]) tankData[d.tankId].deliveries.push(d); });
    allConsignmentSlips.forEach((s: any) => { if(tankData[s.tankId]) tankData[s.tankId].consignmentSlips.push(s); });
    allOwnershipSlips.forEach((s: any) => { if(tankData[s.tankId]) tankData[s.tankId].ownershipSlips.push(s); });
    allWastage.forEach((w: any) => { if(tankData[w.tankId]) tankData[w.tankId].wastage.push(w); });
    allConversions.forEach((c: any) => { if(tankData[c.tankId]) tankData[c.tankId].conversions.push(c); });

    return { tankData, activeTanks: tanks };
  }, [tanks, receipts, deliveries, consignmentSlips, ownershipSlips, wastageTransactions, inventoryAdjustments, productConversions, upToDate, inventoryRefreshKey]);

  // منحصربه‌فرد مخازن و سایت‌ها برای فیلترها - فیلتر شده بر اساس موجودی و تراکنش‌ها
  const uniqueSitesForFilter = useMemo(() => {
    const siteMap = new Map<string, string>();
    receipts.forEach((receipt: any) => {
      if (receipt && receipt.siteId && receipt.siteName) {
        siteMap.set(receipt.siteId, receipt.siteName);
      }
    });
    return Array.from(siteMap.entries());
  }, [receipts]);

  const calculateTankInventory = (tankId: string, siteId?: string) => {
    const data = memoizedInventoryData.tankData[tankId];
    if (!data) return 0;

    let total = 0;
    
    // Helper to check site
    const siteMatch = (t: any) => !siteId || String(t.siteId || t.locationId || '') === String(siteId);

    // Additions
    data.receipts.filter(siteMatch).forEach((r: any) => total += Number(r.amount || r.receiptBasisAmount || 0));
    data.adjustments.filter(siteMatch).filter((a: any) => a.adjustmentType === 'addition').forEach((a: any) => total += Number(a.quantity || 0));
    data.conversions.filter(siteMatch).forEach((c: any) => total += Number(c.producedQuantity || 0));

    // Deductions
    data.deliveries.filter(siteMatch).forEach((d: any) => total -= Number(d.amount || 0));
    data.consignmentSlips.filter(siteMatch).forEach((s: any) => total -= Number(s.amount || 0));
    data.ownershipSlips.filter(siteMatch).forEach((s: any) => total -= Number(s.amount || 0));
    data.wastage.filter(siteMatch).forEach((w: any) => total -= Math.abs(Number(w.amount || 0)));
    data.adjustments.filter(siteMatch).filter((a: any) => a.adjustmentType === 'deduction').forEach((a: any) => total -= Number(a.quantity || 0));
    data.conversions.filter(siteMatch).forEach((c: any) => total -= Number(c.consumedQuantity || 0));

    return total;
  };

    const calculateTankStatusCounts = () => {
      let lowInventoryAlert = false;
      const lowInventoryTanks: any[] = [];
      let totalShortageSum = 0;

      // Get all unique sites to find site names
      const siteCategory = baseDataCategories.find((c: any) => c.id === 'tank-sites');
      const uniqueSites = siteCategory?.items.map((i: any) => [i.id, i.name]) || [];

      tanks.forEach((tank: any) => {
        // Apply tank filter
        if (selectedTank !== 'all' && tank.id !== selectedTank) return;
        
        // Calculate inventory for this tank with current filters
        const inventory = calculateTankInventory(tank.id, selectedSite === 'all' ? undefined : selectedSite);
        const minInventory = Number(tank.minInventory || 0);

        // Check if there are ANY transactions for this tank in the filtered context
        const hasTransactions = (() => {
          const filterSite = selectedSite === 'all' ? undefined : selectedSite;
          
          const matches = (t: any) => {
            const dateMatch = !toDate || (t.date && t.date <= toDate);
            const siteMatch = !filterSite || (String(t.siteId || t.locationId || '') === filterSite);
            const tankMatch = String(t.tankId || '') === tank.id;
            return dateMatch && siteMatch && tankMatch;
          };

          return (
            receipts.some(matches) ||
            deliveries.some(matches) ||
            consignmentSlips.some(matches) ||
            ownershipSlips.some(matches) ||
            wastageTransactions.some(matches) ||
            inventoryAdjustments.some(matches) ||
            productConversions.some(matches)
          );
        })();

        // Logic: Exclude if no transactions, unless it's All Sites & All Tanks
        const isAllSelected = selectedSite === 'all' && selectedTank === 'all';
        if (!hasTransactions && !isAllSelected) return;

        if (minInventory > 0 && inventory <= minInventory) {
          lowInventoryAlert = true;
          const deficit = minInventory - inventory;
          totalShortageSum += deficit;
          
          let tankSiteId = String(tank.siteId || tank.locationId || '');
          if (!tankSiteId && hasTransactions) {
            const filterSite = selectedSite === 'all' ? undefined : selectedSite;
            const matches = (t: any) => (!filterSite || String(t.siteId || t.locationId || '') === filterSite) && String(t.tankId || '') === tank.id;
            const sampleTx = receipts.find(matches) || deliveries.find(matches) || consignmentSlips.find(matches);
            if (sampleTx) tankSiteId = String(sampleTx.siteId || sampleTx.locationId || '');
          }
          
          const siteName = uniqueSites.find(([id]) => id === tankSiteId)?.[1] || (selectedSite !== 'all' ? uniqueSites.find(([id]) => id === selectedSite)?.[1] : '') || '';
          
          lowInventoryTanks.push({
            name: tank.name || tank.id,
            siteName: siteName,
            inventory: inventory,
            minInventory: minInventory,
            deficit: deficit
          });
        }
      });

      return { lowInventoryAlert, lowInventoryTanks, totalShortageSum };
    };

  const getFilteredData = () => {
    let allTransactions: any[] = [];
    
    const filterSite = selectedSite === 'all' ? undefined : selectedSite;
    const filterTank = selectedTank === 'all' ? undefined : selectedTank;

    const matchesFilter = (t: any) => {
      const siteMatch = !filterSite || String(t.siteId || t.locationId || '') === filterSite;
      const tankMatch = !filterTank || String(t.tankId || '') === filterTank;
      const dateMatch = !toDate || (t.date || t.documentDate || t.transactionDate) <= toDate;
      return siteMatch && tankMatch && dateMatch;
    };

    receipts.filter(matchesFilter).forEach((r: any) => allTransactions.push({ ...r, type: 'رسید' }));
    deliveries.filter(matchesFilter).forEach((d: any) => allTransactions.push({ ...d, type: 'حواله' }));
    consignmentSlips.filter(matchesFilter).forEach((s: any) => allTransactions.push({ ...s, type: 'حواله امانی' }));
    ownershipSlips.filter(matchesFilter).forEach((s: any) => allTransactions.push({ ...s, type: 'حواله تملیکی' }));
    wastageTransactions.filter(matchesFilter).forEach((w: any) => allTransactions.push({ ...w, type: 'تلفات' }));
    inventoryAdjustments.filter(matchesFilter).forEach((a: any) => allTransactions.push({ ...a, type: a.adjustmentType === 'addition' ? 'اضافه انبار' : 'کسر انبار' }));
    productConversions.filter(matchesFilter).forEach((c: any) => allTransactions.push({ ...c, type: 'تبدیل کالا' }));

    return allTransactions.sort((a, b) => (b.date || b.documentDate || b.transactionDate).localeCompare(a.date || a.documentDate || a.transactionDate));
  };

  const calculateSummary = () => {
    const data = getFilteredData();
    const summary = {
      totalReceipts: 0,
      receiptCount: 0,
      totalDeliveries: 0,
      deliveryCount: 0,
      totalAdjustmentAdditions: 0,
      totalAdjustmentDeductions: 0,
      totalInventory: 0
    };

    data.forEach(t => {
      const amount = Number(t.amount || t.receiptBasisAmount || t.quantity || t.producedQuantity || t.consumedQuantity || 0);
      if (t.type === 'رسید') {
        summary.totalReceipts += amount;
        summary.receiptCount++;
      } else if (t.type.includes('حواله')) {
        summary.totalDeliveries += amount;
        summary.deliveryCount++;
      } else if (t.type === 'اضافه انبار') {
        summary.totalAdjustmentAdditions += amount;
      } else if (t.type === 'کسر انبار') {
        summary.totalAdjustmentDeductions += amount;
      }
    });

    summary.totalInventory = summary.totalReceipts + summary.totalAdjustmentAdditions - summary.totalDeliveries - summary.totalAdjustmentDeductions;
    
    return summary;
  };

  const filteredData = getFilteredData();
  const summary = calculateSummary();

  return (
    <PermissionGuard permission="reports.view">
      <div className="p-6 bg-gray-50 min-h-screen font-['Vazirmatn']" dir="rtl">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">گزارشات انبار</h1>
              <p className="text-gray-500 font-medium">مشاهده و تحلیل تراکنش‌ها و موجودی مخازن</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setInventoryRefreshKey(prev => prev + 1)}
              className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all font-bold shadow-sm"
            >
              <RefreshCw className="h-5 w-5" />
              <span>به‌روزرسانی</span>
            </button>
            <button className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100">
              <Printer className="h-5 w-5" />
              <span>چاپ گزارش</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
            <Filter className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-black text-gray-800">فیلترهای گزارش</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-gray-700 mr-1 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                سایت مخازن
              </label>
              <select 
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all font-bold text-gray-800"
              >
                <option value="all">تمام سایت‌ها</option>
                {uniqueSitesForFilter.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-gray-700 mr-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                نام مخزن
              </label>
              <select 
                value={selectedTank}
                onChange={(e) => setSelectedTank(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all font-bold text-gray-800"
              >
                <option value="all">تمام مخازن</option>
                {tanks.map((t: any) => (
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
                  setSelectedSite('all');
                  setSelectedTank('all');
                  setToDate('');
                }}
                className="flex-1 p-3.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-black text-sm"
              >
                حذف فیلترها
              </button>
            </div>
          </div>
        </div>

        {/* Views & Toggle */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex-1 bg-white p-2 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 flex gap-2">
            <button 
              onClick={() => setViewMode('detailed')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-black ${viewMode === 'detailed' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Layers className="h-5 w-5" />
              <span>ریز گردش گزارش جزئیات</span>
            </button>
            <button 
              onClick={() => setViewMode('summary')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-black ${viewMode === 'summary' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <BarChart3 className="h-5 w-5" />
              <span>خلاصه آمار گزارش</span>
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

        {/* Content Section */}
        <div className="space-y-8">
          {/* Detailed View */}
          {viewMode === 'detailed' && (
            <>
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent">
                  <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-blue-600" />
                    لیست تراکنش‌ها (ریز گردش گزارش جزئیات)
                  </h3>
                  <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full font-black text-sm">
                    {formatPersianNumber(filteredData.length)} تراکنش یافت شد
                  </span>
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
                          const isNegative = ['حواله', 'کسر انبار', 'تلفات'].includes(t.type) || t.consumedQuantity;
                          
                          return (
                            <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                              <td className="p-5 font-bold text-gray-800 text-sm">{formatPersianNumber(t.date || t.documentDate || t.transactionDate)}</td>
                              <td className="p-5">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-sm ${
                                  t.type === 'رسید' ? 'bg-green-100 text-green-700 border border-green-200' :
                                  t.type.includes('حواله') ? 'bg-red-100 text-red-700 border border-red-200' :
                                  'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="p-5 font-black text-gray-900">{t.tankName || 'نامشخص'}</td>
                              <td className="p-5 font-bold text-gray-600">{t.siteName || t.locationName || '-'}</td>
                              <td className="p-5 text-center">
                                <span className={`text-lg font-black font-['Vazirmatn'] tabular-nums ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
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
                            <div className="flex flex-col items-center gap-4">
                              <Search className="w-16 h-16 text-gray-200" />
                              <p className="text-gray-400 font-black text-xl">هیچ تراکنشی یافت نشد</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* خلاصه موجودی به تفکیک مخزن */}
              <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Layers className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-800">موجودی فعلی به تفکیک مخزن</h3>
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {tanks.filter((t: any) => selectedTank === 'all' || t.id === selectedTank).map((tank: any) => {
                    const inventory = calculateTankInventory(tank.id, selectedSite === 'all' ? undefined : selectedSite);
                    const percentage = Math.min(100, (inventory / Number(tank.capacity || 5000000)) * 100);
                    
                    return (
                      <div key={tank.id} className="p-4 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-purple-200 transition-all group">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-black text-gray-800 text-lg group-hover:text-purple-700 transition-colors">{tank.name}</span>
                          <span className="font-black text-xl text-gray-900">
                            {formatPersianNumber(unitToggle === 'kg' ? inventory : (inventory / 1000).toFixed(3))} 
                            <span className="text-xs text-gray-400 mr-1">{unitToggle === 'kg' ? 'kg' : 'ton'}</span>
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full transition-all duration-1000 ease-out shadow-sm ${
                              percentage > 80 ? 'bg-green-500' : percentage > 30 ? 'bg-blue-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-black text-gray-400">
                          <span>ظرفیت: {formatPersianNumber(tank.capacity || 5000000)} kg</span>
                          <span>{formatPersianNumber(percentage.toFixed(1))}% تکمیل شده</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* گزارش حداقل موجودی مخزن - ردیف آخر کامل */}
              <div className="lg:col-span-2 mt-2">
                {(() => {
                  const { lowInventoryAlert, lowInventoryTanks, totalShortageSum } = calculateTankStatusCounts();
                  const allSameSite = lowInventoryTanks.length > 0 && lowInventoryTanks.every((t: any) => t.siteName && t.siteName === lowInventoryTanks[0].siteName);
                  const commonSiteName = allSameSite ? lowInventoryTanks[0].siteName : null;
                  
                  return (
                    <div className={`${lowInventoryAlert ? 'bg-red-50 border-red-300 animate-[pulse_3s_infinite]' : 'bg-gray-50 border-gray-200 opacity-60'} p-6 rounded-2xl border-2 shadow-md relative overflow-hidden group transition-all`}>
                      <div className="flex justify-between items-start mb-4 border-b pb-4 border-red-100">
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
                            <div key={i} className="p-4 bg-white rounded-xl border-2 border-red-100 shadow-sm hover:shadow-md transition-shadow">
                              <div className="font-black text-blue-600 text-2xl mb-3 border-b border-red-50 pb-2 flex items-center justify-between">
                                <span>{t.name}</span>
                                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{t.siteName || 'بدون سایت'}</span>
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
                          {formatPersianNumber(summary.totalReceipts || 0)}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {formatPersianNumber(summary.receiptCount || 0)} تراکنش | {unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <ArrowDownLeft className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">کل حواله‌ها</p>
                        <p className="text-2xl font-bold text-red-900">
                          {formatPersianNumber(summary.totalDeliveries || 0)}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {formatPersianNumber(summary.deliveryCount || 0)} تراکنش | {unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <ArrowUpRight className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">خالص موجودی</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {formatPersianNumber(summary.totalInventory || 0)}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          بر اساس فیلترهای اعمال شده | {unitToggle === 'kg' ? 'کیلوگرم' : 'تن'}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </PermissionGuard>
  );
};

export default ReportsManager;