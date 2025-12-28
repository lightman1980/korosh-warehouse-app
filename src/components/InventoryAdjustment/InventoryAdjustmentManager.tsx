import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Minus, Search, X, AlertCircle, Calendar, Package, Warehouse, Truck, FileText, 
  BarChart3, Loader2, Edit2, Trash2, Printer, CheckCircle, Paperclip, Download, Clock, RefreshCw, Building2,
  Minimize2, Maximize2
} from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { PersianDatePicker } from '../Common/PersianDatePicker';
import { DataStorage } from '../../utils/dataStorage';
import { usePermissions } from '../../hooks/usePermissions';

interface InventoryAdjustment {
  id: string;
  transactionNumber: string; // شماره تراکنش با فرمت I-تاریخ-شماره
  documentDate: Date;
  adjustmentType: 'deduction' | 'addition';
  productType: 'owned' | 'consignment';
  productId: string;
  productName: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  companyId: string;
  companyName: string;
  customerCompanyId?: string;
  customerCompanyName?: string;
  locationId: string;
  locationName: string;
  driverId?: string;
  driverName?: string;
  contractId?: string;
  contractNumber?: string;
  permitId?: string;
  quantity: number; // در کیلوگرم
  nature: 'owned' | 'consignment'; // ماهیت موجودی
  status: 'temporary' | 'printed' | 'attached' | 'finalized';
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryRecord {
  id: string;
  productType: 'owned' | 'consignment';
  productId: string;
  productName: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  companyId: string;
  companyName: string;
  customerCompanyId?: string;
  customerCompanyName?: string;
  locationId: string;
  locationName: string;
  driverId?: string;
  driverName?: string;
  contractId?: string;
  contractNumber?: string;
  quantity: number; // موجودی فعلی
  lastUpdated: Date;
}

// داده‌های پیش‌فرض برای تست
const defaultBaseData = {
  'owned-products': [
    { id: '1', name: 'روغن آفتابگردان-تملیکی' },
    { id: '2', name: 'روغن های اولئیک-تملیکی' },
  ],
  'consignment-products': [
    { id: '1-1', name: 'روغن آفتابگردان-اماني' },
    { id: '2-2', name: 'روغن هاي اولئيک-اماني' },
  ],
  'sites': [
    { id: 'site1', name: 'سايت مخازن انزلي' },
    { id: 'site2', name: 'سايت مخازن جنوب' },
  ],
  'tanks': [
    { id: 'tankA', name: 'مخزن A' },
    { id: 'tankB', name: 'مخزن B' },
  ],
  'companies': [
    { id: 'comp1', name: 'شرکت محور طلايي' },
    { id: 'comp2', name: 'شرکت مادر تخصصي' },
  ],
  'customer-companies': [
    { id: 'cust1', name: 'شرکت مشتري محور طلايي' },
    { id: 'cust2', name: 'شرکت مشتري مادر تخصصي' },
  ],
  'locations': [
    { id: 'loc1', name: 'دفتر مرکزي شرکت محور طلايي' },
    { id: 'loc2', name: 'انبار شرکت مادر تخصصي' },
  ],
  'drivers': [
    { id: 'drv1', name: 'احمد محمدي' },
    { id: 'drv2', name: 'علي رضايي' },
  ],
  'counterparties': [
    { id: 'counterparty1', name: 'طرف حساب شمال' },
    { id: 'counterparty2', name: 'طرف حساب جنوب' },
  ],
  'customer-counterparties': [
    { id: 'customer-counterparty1', name: 'مشتري طرف حساب شمال' },
    { id: 'customer-counterparty2', name: 'مشتري طرف حساب جنوب' },
  ],
  'counterparty-locations': [
    { id: 'counterparty-location1', name: 'لوکيشن طرف حساب شمال' },
    { id: 'counterparty-location2', name: 'لوکيشن طرف حساب جنوب' },
  ],
  'customer-counterparty-locations': [
    { id: 'customer-counterparty-location1', name: 'لوکيشن مشتري طرف حساب شمال' },
    { id: 'customer-counterparty-location2', name: 'لوکيشن مشتري طرف حساب جنوب' },
  ],
};

const defaultContracts = [
  {
    id: '1',
    contractNumber: 'CON-001-1404',
    companyId: 'comp1',
    companyName: 'شرکت محور طلايي',
    customerCounterpartyId: 'cust1',
    customerCounterpartyName: 'شرکت مشتري محور طلايي',
    counterpartyLocationId: 'loc1',
    counterpartyLocationName: 'طرف حساب شمال',
    customerCounterpartyLocationId: 'custloc1',
    customerCounterpartyLocationName: 'مشتري طرف حساب شمال',
    startDate: new Date(2024, 2, 1),
    endDate: new Date(2025, 2, 1),
    rentalType: 'monthly',
    rentalRate: 50000000,
    siteId: 'site1',
    siteName: 'سايت مخازن انزلي',
    wastageRate: 0.5,
    isActive: true,
    receiptBasis: 'ullage',
    receiptBasisName: 'وزن آلج کشتي (Ullage weight)',
    contractWeight: 1000000,
    remainingWeight: 1000000,
    createdAt: new Date(2024, 2, 1),
    updatedAt: new Date(2024, 2, 1),
  },
];

export const InventoryAdjustmentManager: React.FC = () => {
  const storage = DataStorage.getInstance();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [deductionDocumentDate, setDeductionDocumentDate] = useState<Date>(new Date());
  const [additionDocumentDate, setAdditionDocumentDate] = useState<Date>(new Date());
  const [isTransactionTableMinimized, setIsTransactionTableMinimized] = useState<boolean>(false);
  const [deductionQuantity, setDeductionQuantity] = useState<number>(0);
  const [additionQuantity, setAdditionQuantity] = useState<number>(0);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  
  // داده‌های پایه
  const [baseData, setBaseData] = useState<Record<string, any[]>>(defaultBaseData);
  const [contracts, setContracts] = useState<any[]>(defaultContracts);
  
  // فرم‌ها
  // تعریف فرم‌ها
  const [deductionForm, setDeductionForm] = useState<Record<string, any>>({
    productType: '',
    productId: '',
    siteId: '',
    tankId: '',
    contractId: '',
    companyId: '',
    customerCompanyId: '',
    locationId: '',
    driverId: ''
  });
  
  const [additionForm, setAdditionForm] = useState<Record<string, any>>({
    productType: '',
    productId: '',
    siteId: '',
    tankId: '',
    contractId: '',
    companyId: '',
    customerCompanyId: '',
    locationId: '',
    driverId: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  
  // گزارش موجودی
  const [inventoryReport, setInventoryReport] = useState<InventoryRecord[]>([]);
  
  // فیلترهای تاریخ - استفاده از Date object مشابه سایر تقویم‌های برنامه
  const [dateFilters, setDateFilters] = useState<{
    fromDate: Date | null;
    toDate: Date | null;
  }>({
    fromDate: null,
    toDate: null
  });
  
  // وضعیت بارگذاری
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // حالت نمایش پیام
  const [showPrintMessage, setShowPrintMessage] = useState<string | null>(null);

  // State for tank inventory calculations - اضافه شده برای محاسبه صحیح موجودی
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTankForFilter, setSelectedTankForFilter] = useState<string>('');
  const [selectedSiteForFilter, setSelectedSiteForFilter] = useState<string>('');
  const [upToDate, setUpToDate] = useState<Date>(new Date());
  const [showInventoryPackage, setShowInventoryPackage] = useState<boolean>(true);
  
  // State برای مودال تقویم در گزارش تراکنش‌ها
  const [showFromDateModal, setShowFromDateModal] = useState(false);
  const [showToDateModal, setShowToDateModal] = useState(false);
  
  // State برای مودال تقویم در فرم‌ها
  const [showDeductionDateModal, setShowDeductionDateModal] = useState(false);
  const [showAdditionDateModal, setShowAdditionDateModal] = useState(false);

  // State برای قرارداد انتخاب شده (برای نمایش جدول اطلاعات قرارداد)
  const [selectedContractInfo, setSelectedContractInfo] = useState<any>(null);
  
  // State برای نمایش ارتباطات و جدول مرتبط
  const [showConsignmentRelatedTable, setShowConsignmentRelatedTable] = useState<boolean>(false);

  // State برای نمایش جداول انتخاب کالا
  const [showOwnedDeductionTable, setShowOwnedDeductionTable] = useState<boolean>(false);
  const [showConsignmentDeductionTable, setShowConsignmentDeductionTable] = useState<boolean>(false);
  const [showConsignmentAdditionReceiptsTable, setShowConsignmentAdditionReceiptsTable] = useState<boolean>(false);

  // بارگذاری داده‌های اولیه
  useEffect(() => {
    const loadData = () => {
      try {
        setLoading(true);
        setError(null);
        
        // بارگذاری داده‌های پایه
        const savedBaseData = storage.loadData('baseDataCategories');
        console.log('Saved base data:', savedBaseData);
        
        if (savedBaseData && Array.isArray(savedBaseData)) {
          const baseDataMap: Record<string, any[]> = {};
          savedBaseData.forEach((category: any) => {
            if (category && category.id && Array.isArray(category.items)) {
              baseDataMap[category.id] = category.items;
            }
          });
          console.log('Processed base data:', baseDataMap);
          setBaseData(baseDataMap);
        } else {
          console.log('Using default base data');
          setBaseData(defaultBaseData);
        }
        
        // بارگذاری قراردادها
        const savedContracts = storage.loadData('contracts');
        console.log('Saved contracts:', savedContracts);
        
        if (savedContracts && Array.isArray(savedContracts)) {
          setContracts(savedContracts);
        } else {
          console.log('Using default contracts');
          setContracts(defaultContracts);
        }
        
        // بارگذاری تنظیمات موجودی
        const savedInventory = storage.loadData('inventory');
        console.log('Saved inventory:', savedInventory);
        
        if (savedInventory && Array.isArray(savedInventory)) {
          // تبدیل تاریخ‌ها به شیء Date معتبر
          const validInventory = savedInventory.map((item: any) => {
            try {
              return {
                ...item,
                lastUpdated: item.lastUpdated ? new Date(item.lastUpdated) : new Date()
              };
            } catch (error) {
              console.error('Error parsing inventory date:', error, item);
              return {
                ...item,
                lastUpdated: new Date()
              };
            }
          });
          setInventory(validInventory);
        } else {
          console.log('No inventory data found');
          setInventory([]);
        }
        
        // بارگذاری تنظیمات انبار
        const savedAdjustments = storage.loadData('inventoryAdjustments');
        console.log('Saved adjustments:', savedAdjustments);
        
        if (savedAdjustments && Array.isArray(savedAdjustments)) {
          // تبدیل تاریخ‌ها به شیء Date معتبر
          const validAdjustments = savedAdjustments.map((item: any) => {
            try {
              return {
                ...item,
                documentDate: item.documentDate ? new Date(item.documentDate) : new Date(),
                createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
                updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
              };
            } catch (error) {
              console.error('Error parsing adjustment date:', error, item);
              return {
                ...item,
                documentDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
              };
            }
          });
          setAdjustments(validAdjustments);
        } else {
          console.log('No adjustments data found');
          setAdjustments([]);
        }
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError('خطا در بارگذاری داده‌ها');
        // استفاده از داده‌های پیش‌فرض در صورت خطا
        setBaseData(defaultBaseData);
        setContracts(defaultContracts);
        setInventory([]);
        setAdjustments([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // گوش دادن به تغییرات در داده‌های پایه
    const handleBaseDataUpdated = () => {
      console.log('Base data updated event received');
      loadData();
    };
    
    window.addEventListener('baseDataUpdated', handleBaseDataUpdated);
    window.addEventListener('contractsUpdated', handleBaseDataUpdated);
    
    return () => {
      window.removeEventListener('baseDataUpdated', handleBaseDataUpdated);
      window.removeEventListener('contractsUpdated', handleBaseDataUpdated);
    };
  }, [storage]);

  // به‌روزرسانی گزارش موجودی
  useEffect(() => {
    updateInventoryReport();
  }, [inventory]);

  // همگام‌سازی upToDate با deductionDocumentDate هنگام نمایش جداول کسر
  useEffect(() => {
    if (showOwnedDeductionTable || showConsignmentDeductionTable) {
      setUpToDate(deductionDocumentDate);
    }
  }, [showOwnedDeductionTable, showConsignmentDeductionTable, deductionDocumentDate]);

  const updateInventoryReport = () => {
    // مرتب‌سازی موجودی بر اساس نوع محصول، سایت و مخزن
    const sortedInventory = [...inventory].sort((a, b) => {
      // ابتدا بر اساس نوع محصول
      if (a.productType !== b.productType) {
        return a.productType === 'owned' ? -1 : 1;
      }
      // سپس بر اساس نام سایت
      if (a.siteName !== b.siteName) {
        return a.siteName.localeCompare(b.siteName, 'fa');
      }
      // سپس بر اساس نام مخزن
      return a.tankName.localeCompare(b.tankName, 'fa');
    });
    setInventoryReport(sortedInventory);
  };

  // Helper function for safe number conversion - کپی شده از WarehouseDeliveryManager
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
    const tanks = baseData.tanks || [];
    let totalCapacity = 0;
    // فقط از فیلترهای جداول موجودی استفاده می‌کنیم، نه از form.siteId و form.tankId
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    tanks.forEach((tank: any) => {
      // اگر فیلتر مخزن داریم، فقط همان مخزن
      if (currentTankId && tank.id !== currentTankId) return;
      
      // اگر فیلتر سایت داریم و سایت روی مخزن تعریف شده، باید هم‌خوان باشد
      if (currentSiteId && tank.siteId && tank.siteId !== currentSiteId) return;
      
      // اگر سایت فیلتر شده اما siteId مخزن خالی است، آن را رد نکن تا ظرفیت صفر نشود
      const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
      const capacityMatch = capacityStr.match(/[\d,]+/);
      const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, '')) : 5000000;
      totalCapacity += capacity;
    });
    return totalCapacity;
  }, [baseData.tanks, selectedSiteForFilter, selectedTankForFilter]);

  // منحصربه‌فرد مخازن و سایت‌ها برای فیلترها - کپی شده از WarehouseDeliveryManager
  const uniqueTanks = useMemo(() => {
    const tankMap = new Map<string, string>();
    const allReceiptsData = storage.loadData('receipts');
    const allReceipts = Array.isArray(allReceiptsData) ? allReceiptsData : [];
    allReceipts.forEach((receipt: any) => {
      if (receipt && receipt.tankId && receipt.tankName && !receipt.isVoided) {
        tankMap.set(receipt.tankId, receipt.tankName);
      }
    });
    return Array.from(tankMap.entries());
  }, [storage]);

  const uniqueSites = useMemo(() => {
    const siteMap = new Map<string, string>();
    const allReceiptsData = storage.loadData('receipts');
    const allReceipts = Array.isArray(allReceiptsData) ? allReceiptsData : [];
    allReceipts.forEach((receipt: any) => {
      if (receipt && receipt.siteId && receipt.siteName && !receipt.isVoided) {
        siteMap.set(receipt.siteId, receipt.siteName);
      }
    });
    return Array.from(siteMap.entries());
  }, [storage]);

  // Calculate owned tanks inventory based on user formula - کپی شده از WarehouseDeliveryManager
  const calculateOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن تملیکی:', { siteId, tankId });
    
    // اطمینان از دریافت داده‌های معتبر
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
    
    // فیلتر کردن داده‌ها بر اساس سایت و مخزن انتخاب شده
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

    // فرمول کاربر: جمع(رسید انبارهای تملیکی + سند اضافه انبارهای تملیکی - حواله های تملیکی - افت تملیکی ها - سند کسر انبارهای تملیکی)
    
    // 1. جمع رسید انبارهای تملیکی
    const ownedReceiptsAmount = siteTankReceipts.reduce((sum: number, r: any) => {
      const amount = r.amount || r.receiptBasisAmount || 0;
      return sum + safeNumber(amount, 0);
    }, 0);

    // 2. سند اضافه انبارهای تملیکی
    const ownedAdditionDocuments = siteTankAdjustments
      .filter((adj: any) => adj.adjustmentType === 'addition')
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // 3. حواله های تملیکی
    const ownedDeliveries = siteTankDeliveries
      .filter((d: any) => !d.isVoided && new Date(d.deliveryDate) <= upToDate)
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    // 4. افزودن به تملیکی
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

    // 5. سند کسر انبارهای تملیکی
    const ownedDeductionDocuments = siteTankAdjustments
      .filter((adj: any) => adj.adjustmentType === 'deduction' && !adj.isVoided && new Date(adj.documentDate) <= upToDate)
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // 6. تبدیل‌های کالا: کالای مصرفی (کسر) و کالای تولیدی (اضافه)
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
    
    // کالای مصرفی تملیکی (کسر از موجودی)
    const ownedConsumedProducts = siteTankConversions
      .filter((c: any) => c.consumedProductType === 'owned')
      .reduce((sum: number, c: any) => sum + safeNumber(c.consumedQuantity, 0), 0);
    
    // کالای تولیدی تملیکی (اضافه به موجودی)
    const ownedProducedProducts = siteTankConversions
      .filter((c: any) => c.producedProductType === 'owned')
      .reduce((sum: number, c: any) => sum + safeNumber(c.producedQuantity, 0), 0);

    // محاسبه نهایی: فیلدهای تملیکی + فیلدهای امانی
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

  // Calculate consignment tanks inventory - بهبود یافته بر اساس ConsignmentDeliverySlip
  const calculateConsignmentTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن امانی:', { siteId, tankId, refreshKey: inventoryRefreshKey });
    
    // اطمینان از خواندن آخرین داده‌ها از تمام منابع
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
    
    // منابع مختلف حواله‌های امانی - با الگو از ConsignmentDeliverySlip
    const consignmentSlipsData = storage.loadData('consignment-delivery-slips');
    const consignmentSlipsArray = Array.isArray(consignmentSlipsData) ? consignmentSlipsData : [];
    const consignmentSlips = consignmentSlipsArray.filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      const dateValue = d.deliveryDate || d.slipDate;
      if (!dateValue || dateValue === undefined || dateValue === null) {
        return true; // اگر تاریخ وجود نداشته باشد، شامل شود
      }
      const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (isNaN(deliveryDate.getTime())) {
        return true; // اگر تاریخ نامعتبر باشد، شامل شود
      }
      return deliveryDate <= upToDate;
    }) as any[];

    // منابع اضافی - حواله‌های عمومی که ممکن است امانی باشند
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
    
    // تشخیص پیشرفته حواله‌های امانی - الگو از ConsignmentDeliverySlip
    const consignmentDeliveries = [
      // از consignment-delivery-slips
      ...consignmentSlips,
      // از deliveries عمومی (آنهایی که ویژگی‌های امانی دارند)
      ...generalDeliveries.filter(d => {
        // تشخیص حواله امانی از deliveries عمومی
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
      
      // فیلتر مکان و مخزن
      return (!currentSiteId || d.siteId === currentSiteId) &&
             (!currentTankId || d.tankId === currentTankId);
    })
    .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    console.log('🔍 دیباگ حواله‌های امانی در InventoryAdjustmentManager:', {
      'تعداد کل consignment-delivery-slips': consignmentSlips.length,
      'تعداد کل general deliveries': generalDeliveries.length,
      'تعداد deliveries امانی تشخیص داده شده': generalDeliveries.filter(d => 
        d.contractNumber || d.permitId || d.userType === 'consignment' || d.type === 'امانی' || d.nature === 'consignment'
      ).length,
      'مقدار محاسبه شده consignmentDeliveries': consignmentDeliveries,
      'فیلترها': { currentSiteId, currentTankId, upToDate },
      'نمونه consignment-delivery-slips': consignmentSlips.slice(0, 2).map((d: any) => ({
        userType: d.userType,
        permitId: d.permitId,
        contractNumber: d.contractNumber,
        type: d.type,
        amount: d.amount,
        siteId: d.siteId,
        tankId: d.tankId
      })),
      'نمونه general deliveries امانی': generalDeliveries.filter((d: any) => 
        d.contractNumber || d.permitId || d.userType === 'consignment' || d.type === 'امانی' || d.nature === 'consignment'
      ).slice(0, 2).map((d: any) => ({
        userType: d.userType,
        permitId: d.permitId,
        contractNumber: d.contractNumber,
        type: d.type,
        amount: d.amount,
        siteId: d.siteId,
        tankId: d.tankId
      }))
    });

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

    // تبدیل‌های کالا: کالای مصرفی (کسر) و کالای تولیدی (اضافه)
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
    
    // کالای مصرفی امانی (کسر از موجودی)
    const consignmentConsumedProducts = siteTankConversions
      .filter((c: any) => c.consumedProductType === 'consignment')
      .reduce((sum: number, c: any) => sum + safeNumber(c.consumedQuantity, 0), 0);
    
    // کالای تولیدی امانی (اضافه به موجودی)
    const consignmentProducedProducts = siteTankConversions
      .filter((c: any) => c.producedProductType === 'consignment')
      .reduce((sum: number, c: any) => sum + safeNumber(c.producedQuantity, 0), 0);

    const totalConsignmentValue = consignmentReceiptsAmount + consignmentAdditions + consignmentProducedProducts - consignmentDeliveries - consignmentDeductionAmount - consignmentDeductionDocuments - consignmentConsumedProducts;

    console.log('📊 نتایج محاسبه موجودی امانی (بهبود یافته):', {
      consignmentReceiptsAmount,
      consignmentAdditions,
      consignmentDeliveries, // حواله‌های امانی از تمام منابع
      consignmentDeductionAmount,
      consignmentDeductionDocuments,
      finalInventory: totalConsignmentValue,
      currentSiteId,
      currentTankId,
      refreshKey: inventoryRefreshKey,
      deliveryFilters: 'شامل تمام حواله‌های امانی از منابع مختلف',
      sources: {
        'consignment-delivery-slips': consignmentSlips.length,
        'general deliveries (consignment)': generalDeliveries.filter(d => 
          d.contractNumber || d.permitId || d.userType === 'consignment' || d.type === 'امانی' || d.nature === 'consignment'
        ).length
      }
    });

    // 🔥 تست اضافی برای تشخیص دقیق‌تر مشکل
    if (consignmentDeliveries === 0) {
      console.log('🔥 تست دیباگ برای مقدار صفر حواله‌های امانی:');
      
      // بررسی consignment-delivery-slips
      const allConsignmentSlipsData = storage.loadData('consignment-delivery-slips');
      const allConsignmentSlips = Array.isArray(allConsignmentSlipsData) ? allConsignmentSlipsData : [];
      console.log('🔍 تمام consignment-delivery-slips:', {
        total: allConsignmentSlips.length,
        sample: allConsignmentSlips.slice(0, 3).map((d: any) => ({
          id: d.id,
          userType: d.userType,
          permitId: d.permitId,
          contractNumber: d.contractNumber,
          type: d.type,
          amount: d.amount,
          siteId: d.siteId,
          tankId: d.tankId,
          isVoided: d.isVoided
        }))
      });

      // بررسی deliveries عمومی
      const allGeneralDeliveriesData = storage.loadData('deliveries');
      const allGeneralDeliveries = Array.isArray(allGeneralDeliveriesData) ? allGeneralDeliveriesData : [];
      console.log('🔍 تمام deliveries عمومی:', {
        total: allGeneralDeliveries.length,
        withConsignmentFeatures: allGeneralDeliveries.filter((d: any) => 
          d.contractNumber || d.permitId || d.userType === 'consignment' || d.type === 'امانی' || d.nature === 'consignment'
        ).length,
        sample: allGeneralDeliveries.filter((d: any) => 
          d.contractNumber || d.permitId || d.userType === 'consignment' || d.type === 'امانی' || d.nature === 'consignment'
        ).slice(0, 3).map((d: any) => ({
          id: d.id,
          userType: d.userType,
          permitId: d.permitId,
          contractNumber: d.contractNumber,
          type: d.type,
          amount: d.amount,
          siteId: d.siteId,
          tankId: d.tankId,
          isVoided: d.isVoided
        }))
      });

      // تست بدون فیلتر سایت و مخزن
      const testWithoutFilters = [
        ...consignmentSlips,
        ...generalDeliveries.filter(d => 
          d.contractNumber || d.permitId || d.userType === 'consignment' || d.type === 'امانی' || d.nature === 'consignment'
        )
      ].reduce((sum, d) => sum + safeNumber(d.amount, 0), 0);
      
      console.log('🔥 مقدار بدون فیلتر سایت/مخزن:', testWithoutFilters);
      
      // بررسی اینکه آیا فیلترهای سایت/مخزن مشکل ساز هستند
      const testWithMinimalFilters = [
        ...consignmentSlips,
        ...generalDeliveries.filter(d => 
          d.contractNumber || d.permitId || d.userType === 'consignment' || d.type === 'امانی' || d.nature === 'consignment'
        )
      ].filter(d => !d.isVoided).reduce((sum, d) => sum + safeNumber(d.amount, 0), 0);
      
      console.log('🔥 مقدار با حداقل فیلتر (فقط isVoided=false):', testWithMinimalFilters);
    }

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
  }, [upToDate, selectedSiteForFilter, selectedTankForFilter, inventoryRefreshKey, storage]);

  // Calculate consignment+owned tanks inventory - کپی شده از WarehouseDeliveryManager
  const calculateConsignmentOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن امانی/تملیکی:', { siteId, tankId });
    
    console.log('🔍 بررسی stateهای فیلتر:', {
      selectedSiteForFilter,
      selectedTankForFilter,
      upToDate,
      inventoryRefreshKey
    });
    
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
    
    console.log('📊 نتایج محاسبه موجودی امانی/تملیکی:', {
      ownedDeliveries: owned.ownedDeliveries,
      consignmentDeliveries: consignment.consignmentDeliveries,
      totalDeliveries: owned.ownedDeliveries + consignment.consignmentDeliveries,
      finalInventory: result.finalInventory
    });

    return result;
  }, [calculateOwnedTanksInventory, calculateConsignmentTanksInventory]);

  // Helper function to calculate empty capacity for a specific tank
  // محاسبه مشابه "ظرفیت خالی باقیمانده": از تمام وارده‌ها (تملیکی + امانی) تمام صادره‌ها را کسر می‌کند
  const calculateEmptyTankCapacity = useCallback((siteId: string, tankId: string) => {
    const tank = baseData.tanks?.find((t: any) => t.id === tankId);
    if (!tank) return 0;
    
    const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
    const capacityMatch = capacityStr.match(/[\d,]+/);
    const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, '')) : 5000000;
    
    // محاسبه موجودی فعلی (مجموع موجودی امانی + تملیکی)
    const combinedInventory = calculateConsignmentOwnedTanksInventory(siteId, tankId);
    const currentInventory = combinedInventory.finalInventory || 0;
    
    return Math.max(0, capacity - currentInventory);
  }, [baseData.tanks, calculateConsignmentOwnedTanksInventory]);

  // تابع برای دریافت تمام رسیدهای انبار تملیکی (برای کسر انبار)
  const getAllOwnedReceipts = useCallback(() => {
    const allReceipts = (storage.loadData('receipts') || []) as any[];
    
    return allReceipts.filter((r: any) => {
      if (!r || typeof r !== 'object' || r.isVoided) return false;
      if (r.userType !== 'owned') return false;
      return true;
    }).map((r: any) => ({
      id: r.id,
      transactionNumber: r.transactionNumber || '',
      receiptDate: r.receiptDate ? new Date(r.receiptDate) : new Date(),
      productId: r.productId || '',
      productName: r.productName || '',
      siteId: r.siteId || '',
      siteName: r.siteName || '',
      tankId: r.tankId || '',
      tankName: r.tankName || '',
      receiptBasisAmount: r.receiptBasisAmount || 0,
      receiptBasis: r.receiptBasis || '',
      receiptBasisName: r.receiptBasisName || '',
      companyId: r.companyId,
      companyName: r.companyName,
      locationId: r.locationId,
      locationName: r.locationName,
      driverId: r.driverId,
      driverName: r.driverName,
      shipId: r.shipId,
      shipName: r.shipName,
      cotageId: r.cotageId,
      cotageNumber: r.cotageNumber,
      indexId: r.indexId,
      indexNumber: r.indexNumber,
      unit: r.unit || 'kg',
      notes: r.notes || ''
    }));
  }, [storage]);

  // تابع برای محاسبه موجودی کالاهای امانی به تفکیک سایت، مخزن، قرارداد و طرف حساب برای کسر انبار
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getConsignmentProductsWithInventory = useCallback(() => {
    const allProducts = baseData['consignment-products'] || [];
    const result: Array<{
      productId: string;
      productName: string;
      siteId: string;
      siteName: string;
      tankId: string;
      tankName: string;
      contractId: string;
      contractNumber: string;
      counterpartyId?: string;
      counterpartyName?: string;
      customerCounterpartyId?: string;
      customerCounterpartyName?: string;
      inventory: number;
    }> = [];

    // برای هر محصول، سایت، مخزن و قرارداد، موجودی را محاسبه می‌کنیم (تا تاریخ سند)
    allProducts.forEach((product: any) => {
      contracts.forEach((contract: any) => {
        if (!contract.isActive) return;
        
        // محاسبه موجودی تا تاریخ سند (از upToDate استفاده می‌کنیم که باید به تاریخ سند تنظیم شده باشد)
        const inventory = calculateConsignmentTanksInventory(contract.siteId, contract.tankId);
        const finalInventory = Math.max(0, inventory.finalInventory);
        
        if (finalInventory > 0) {
          result.push({
            productId: product.id,
            productName: product.name,
            siteId: contract.siteId,
            siteName: contract.siteName,
            tankId: contract.tankId || '',
            tankName: contract.tankName || '',
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            counterpartyId: contract.counterpartyId,
            counterpartyName: contract.counterpartyName,
            customerCounterpartyId: contract.customerCounterpartyId,
            customerCounterpartyName: contract.customerCounterpartyName,
            inventory: finalInventory
          });
        }
      });
    });

    return result;
  }, [baseData, contracts, calculateConsignmentTanksInventory]);

  // تابع برای دریافت تمام رسیدهای انبار امانی (برای کسر انبار)
  const getAllConsignmentReceipts = useCallback(() => {
    const allReceipts = (storage.loadData('receipts') || []) as any[];
    
    return allReceipts.filter((r: any) => {
      if (!r || typeof r !== 'object' || r.isVoided) return false;
      if (r.userType !== 'consignment') return false;
      return true;
    }).map((r: any) => ({
      id: r.id,
      transactionNumber: r.transactionNumber || '',
      receiptDate: r.receiptDate ? new Date(r.receiptDate) : new Date(),
      productId: r.productId || '',
      productName: r.productName || '',
      siteId: r.siteId || '',
      siteName: r.siteName || '',
      tankId: r.tankId || '',
      tankName: r.tankName || '',
      contractId: r.contractId || '',
      contractNumber: r.contractNumber || '',
      receiptBasisAmount: r.receiptBasisAmount || 0,
      receiptBasis: r.receiptBasis || '',
      receiptBasisName: (() => {
        // اول receiptBasisName را بررسی کن
        if (r.receiptBasisName) {
          return r.receiptBasisName;
        }
        // اگر receiptBasisName وجود ندارد، از receiptBasis و baseData استفاده کن
        if (r.receiptBasis) {
          const receiptBasisOption = baseData['receipt-basis']?.find((b: any) => b.id === r.receiptBasis);
          if (receiptBasisOption?.name) {
            return receiptBasisOption.name;
          }
          // اگر در baseData پیدا نشد، از receiptBasisOptions استفاده کن
          const receiptBasisOptions = [
            { id: 'bill-lading', name: 'وزن بارنامه (Bill of lading weight)' },
            { id: 'ullage', name: 'وزن آلج کشتی (Ullage weight)' },
            { id: 'shore-tank', name: 'وزن شور تانک (Shore tank)' },
            { id: 'gross', name: 'وزن ناخالص (Weight Gross)' },
          ];
          const option = receiptBasisOptions.find((b: any) => b.id === r.receiptBasis);
          return option?.name || r.receiptBasis || '';
        }
        return '';
      })(),
      companyId: r.companyId,
      companyName: r.companyName,
      customerCompanyId: r.customerCompanyId,
      customerCompanyName: r.customerCounterpartyName || r.customerCompanyName,
      locationId: r.locationId,
      locationName: r.locationName,
      driverId: r.driverId,
      driverName: r.driverName,
      counterpartyId: r.counterpartyId,
      counterpartyName: r.counterpartyName,
      customerCounterpartyId: r.customerCounterpartyId,
      customerCounterpartyName: r.customerCounterpartyName,
      shipId: r.shipId,
      shipName: r.shipName,
      cotageId: r.cotageId,
      cotageNumber: r.cotageNumber,
      indexId: r.indexId,
      indexNumber: r.indexNumber,
      unit: r.unit || 'kg',
      notes: r.notes || ''
    }));
  }, [storage, baseData]);

  // تابع برای دریافت رسیدهای انبار مرتبط با قرارداد انتخاب شده برای اضافه انبار امانی
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getConsignmentReceiptsForContract = useCallback((contractId: string) => {
    const allReceipts = (storage.loadData('receipts') || []) as any[];
    
    return allReceipts.filter((r: any) => {
      if (!r || typeof r !== 'object' || r.isVoided) return false;
      if (r.userType !== 'consignment') return false;
      if (r.contractId !== contractId) return false;
      return true;
    }).map((r: any) => ({
      id: r.id,
      transactionNumber: r.transactionNumber || '',
      receiptDate: r.receiptDate ? new Date(r.receiptDate) : new Date(),
      productId: r.productId || '',
      productName: r.productName || '',
      siteId: r.siteId || '',
      siteName: r.siteName || '',
      tankId: r.tankId || '',
      tankName: r.tankName || '',
      contractId: r.contractId || '',
      contractNumber: r.contractNumber || '',
      receiptBasisAmount: r.receiptBasisAmount || 0,
      receiptBasis: r.receiptBasis || '',
      receiptBasisName: (() => {
        // اول receiptBasisName را بررسی کن
        if (r.receiptBasisName) {
          return r.receiptBasisName;
        }
        // اگر receiptBasisName وجود ندارد، از receiptBasis و baseData استفاده کن
        if (r.receiptBasis) {
          const receiptBasisOption = baseData['receipt-basis']?.find((b: any) => b.id === r.receiptBasis);
          if (receiptBasisOption?.name) {
            return receiptBasisOption.name;
          }
          // اگر در baseData پیدا نشد، از receiptBasisOptions استفاده کن
          const receiptBasisOptions = [
            { id: 'bill-lading', name: 'وزن بارنامه (Bill of lading weight)' },
            { id: 'ullage', name: 'وزن آلج کشتی (Ullage weight)' },
            { id: 'shore-tank', name: 'وزن شور تانک (Shore tank)' },
            { id: 'gross', name: 'وزن ناخالص (Weight Gross)' },
          ];
          const option = receiptBasisOptions.find((b: any) => b.id === r.receiptBasis);
          return option?.name || r.receiptBasis || '';
        }
        return '';
      })(),
      companyId: r.companyId,
      companyName: r.companyName,
      customerCompanyId: r.customerCompanyId,
      customerCompanyName: r.customerCounterpartyName || r.customerCompanyName,
      locationId: r.locationId,
      locationName: r.locationName,
      driverId: r.driverId,
      driverName: r.driverName,
      counterpartyId: r.counterpartyId,
      counterpartyName: r.counterpartyName,
      customerCounterpartyId: r.customerCounterpartyId,
      customerCounterpartyName: r.customerCounterpartyName,
      shipId: r.shipId,
      shipName: r.shipName,
      cotageId: r.cotageId,
      cotageNumber: r.cotageNumber,
      indexId: r.indexId,
      indexNumber: r.indexNumber,
      unit: r.unit || 'kg',
      notes: r.notes || ''
    }));
  }, [storage, baseData]);

  const handleFormChange = (formType: 'deduction' | 'addition', field: string, value: any) => {
    if (formType === 'deduction') {
      setDeductionForm(prev => {
        const newForm = { ...prev, [field]: value };
        
        // اگر نوع محصول تغییر کرد، فیلدهای مرتبط را پاک کن
        if (field === 'productType') {
          newForm.productId = '';
          newForm.contractId = '';
          newForm.siteId = '';
          newForm.tankId = '';
          // پاک کردن اطلاعات قرارداد انتخاب شده
          setSelectedContractInfo(null);
          // پاک کردن جدول مرتبط امانی
          setShowConsignmentRelatedTable(false);
          
          // نمایش جدول مناسب بر اساس نوع محصول
          if (value === 'owned') {
            setShowOwnedDeductionTable(true);
            setShowConsignmentDeductionTable(false);
          } else if (value === 'consignment') {
            // برای امانی در کسر انبار، نمایش رسیدهای انبار
            setShowOwnedDeductionTable(false);
            setShowConsignmentDeductionTable(true);
          } else {
            setShowOwnedDeductionTable(false);
            setShowConsignmentDeductionTable(false);
          }
        }
        
        // اگر قرارداد انتخاب شد برای کسر انبار امانی، فیلتر رسیدها بر اساس قرارداد
        if (field === 'contractId' && newForm.productType === 'consignment') {
          if (value) {
            const contract = contracts.find((c: any) => c.id === value);
            if (contract) {
              setSelectedContractInfo(contract);
            }
          } else {
            setSelectedContractInfo(null);
          }
        }
        
        // اگر قرارداد انتخاب شد و نوع محصول امانی است، سایت و مخزن را از قرارداد پر کن
        if (field === 'contractId') {
          if (value) {
            // فراخوانی آخرین وضعیت قرارداد از storage
            const latestContractsData = storage.loadData('contracts');
            const latestContracts = Array.isArray(latestContractsData) ? latestContractsData : [];
            const latestContract = latestContracts.find((c: any) => c.id === value);
            const contractsArray = Array.isArray(contracts) ? contracts : [];
            const contract = latestContract || contractsArray.find((c: any) => c.id === value);
            
            if (contract) {
              if (newForm.productType === 'consignment') {
                newForm.siteId = contract.siteId || '';
                newForm.tankId = contract.tankId || '';
              }
              // ذخیره اطلاعات قرارداد برای نمایش جدول (با آخرین داده‌ها)
              setSelectedContractInfo(contract);
              
              // نمایش جدول موجودی امانی به محض انتخاب قرارداد
              setShowConsignmentRelatedTable(true);
            }
          } else {
            // پاک کردن قرارداد انتخاب شده
            setSelectedContractInfo(null);
            setShowConsignmentRelatedTable(false);
          }
        }
        

        
        return newForm;
      });
    } else {
      setAdditionForm(prev => {
        const newForm = { ...prev, [field]: value };
        
        // اگر نوع محصول تغییر کرد، فیلدهای مرتبط را پاک کن
        if (field === 'productType') {
          newForm.productId = '';
          newForm.contractId = '';
          newForm.siteId = '';
          newForm.tankId = '';
          // پاک کردن اطلاعات قرارداد انتخاب شده
          setSelectedContractInfo(null);
          
          // نمایش جدول رسیدهای انبار امانی به محض انتخاب نوع محصول امانی
          if (value === 'consignment') {
            setShowConsignmentAdditionReceiptsTable(true);
          } else {
            setShowConsignmentAdditionReceiptsTable(false);
          }
        }
        
        // اگر قرارداد انتخاب شد و نوع محصول امانی است، سایت و مخزن را از قرارداد پر کن
        if (field === 'contractId') {
          if (value) {
            // فراخوانی آخرین وضعیت قرارداد از storage
            const latestContractsData = storage.loadData('contracts');
            const latestContracts = Array.isArray(latestContractsData) ? latestContractsData : [];
            const latestContract = latestContracts.find((c: any) => c.id === value);
            const contractsArray = Array.isArray(contracts) ? contracts : [];
            const contract = latestContract || contractsArray.find((c: any) => c.id === value);
            
            if (contract) {
              if (newForm.productType === 'consignment') {
                newForm.siteId = contract.siteId || '';
                newForm.tankId = contract.tankId || '';
              }
              // ذخیره اطلاعات قرارداد برای نمایش جدول (با آخرین داده‌ها)
              setSelectedContractInfo(contract);
              
              // نمایش جدول موجودی امانی به محض انتخاب قرارداد
              setShowConsignmentRelatedTable(true);
            }
          } else {
            // پاک کردن قرارداد انتخاب شده
            setSelectedContractInfo(null);
            setShowConsignmentRelatedTable(false);
          }
        }
        

        
        return newForm;
      });
    }
  };

  const validateForm = (form: Record<string, any>, quantity: number): { isValid: boolean; missingField?: string } => {
    // اگر نوع محصول انتخاب نشده، نمی‌توانیم بقیه فیلدها را بررسی کنیم
    if (!form.productType || form.productType === '') {
      return { isValid: false, missingField: 'نوع محصول' };
    }
    
    // فیلدهای الزامی پایه برای هر دو نوع محصول
    const baseRequiredFields = [
      { field: 'productType', label: 'نوع محصول' },
      { field: 'productId', label: 'محصول' },
      { field: 'siteId', label: 'سایت' },
      { field: 'tankId', label: 'مخزن' }
    ];
    
    // بررسی فیلدهای پایه
    for (const reqField of baseRequiredFields) {
      const value = form[reqField.field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return { isValid: false, missingField: reqField.label };
      }
    }
    
    // بررسی مقدار
    if (!quantity || quantity <= 0) {
      return { isValid: false, missingField: 'مقدار' };
    }
    
    // الزامات بر اساس نوع محصول
    if (form.productType === 'consignment') {
      // محصول امانی: نیاز به فیلد قرارداد دارد
      if (!form.contractId || (typeof form.contractId === 'string' && form.contractId.trim() === '')) {
        return { isValid: false, missingField: 'قرارداد' };
      }
    }
    
    return { isValid: true };
  };

  // بررسی اینکه برای انتخاب فعلی کاربر (محصول امانی) قبلاً رسید انبار ثبت شده است یا نه
  // این تابع با توجه به اطلاعات موجود در رسیدها، سایت، مخزن، نوع کالا و در صورت وجود، قرارداد را بررسی می‌کند
  const hasConsignmentReceiptForSelection = (form: Record<string, any>): boolean => {
    try {
      if (!form.siteId || !form.tankId) {
        return false;
      }

      const allReceipts = (storage.loadData('receipts') || []) as any[];

      const hasMatch = allReceipts.some((r: any) => {
        if (!r || typeof r !== 'object' || r.isVoided) return false;

        // فقط رسیدهای امانی
        if (r.userType && r.userType !== 'consignment') return false;

        // تطبیق سایت و مخزن
        if (r.siteId && r.siteId !== form.siteId) return false;
        if (r.tankId && r.tankId !== form.tankId) return false;

        // اگر در رسید، شناسه قرارداد وجود دارد، با فرم مقایسه شود
        if (form.contractId && r.contractId && r.contractId !== form.contractId) return false;

        // اگر در رسید، شناسه محصول وجود دارد، با فرم مقایسه شود
        if (form.productId && r.productId && r.productId !== form.productId) return false;

        return true;
      });

      return hasMatch;
    } catch (e) {
      console.error('خطا در بررسی وجود رسید برای کالای امانی در اضافه انبار:', e);
      // در صورت خطا، برای احتیاط اجازه ندهیم بدون رسید ثبت شود
      return false;
    }
  };

  const handleDeductionSubmit = () => {
    console.log('Deduction form:', deductionForm);
    console.log('Deduction quantity:', deductionQuantity);
    
    // اعتبارسنجی بهبود یافته
    const validation = validateForm(deductionForm, deductionQuantity);
    if (!validation.isValid) {
      const productTypeLabel = deductionForm.productType === 'owned' ? 'تملیکی' : 'امانی';
      alert(`لطفاً فیلد ${validation.missingField} را برای محصول ${productTypeLabel} انتخاب کنید`);
      return;
    }
    
    if (deductionQuantity <= 0) {
      alert('مقدار کسری انبار باید بزرگتر از صفر باشد');
      return;
    }
    
    // بررسی موجودی کافی با محاسبه جامع موجودی انبار - بهبود یافته
    console.log('بررسی موجودی جامع انبار برای:', {
      productId: deductionForm.productId,
      productType: deductionForm.productType,
      siteId: deductionForm.siteId,
      tankId: deductionForm.tankId,
      quantity: deductionQuantity
    });
    
    // محاسبه موجودی واقعی انبار بر اساس تمام منابع داده
    let actualInventory = 0;
    
    if (deductionForm.productType === 'owned') {
      // برای محصولات تملیکی، از calculateOwnedTanksInventory استفاده می‌کنیم
      const ownedInventory = calculateOwnedTanksInventory(deductionForm.siteId, deductionForm.tankId);
      actualInventory = Math.max(0, ownedInventory.finalInventory);
    } else {
      // برای محصولات امانی، از calculateConsignmentTanksInventory استفاده می‌کنیم
      const consignmentInventory = calculateConsignmentTanksInventory(deductionForm.siteId, deductionForm.tankId);
      actualInventory = Math.max(0, consignmentInventory.finalInventory);
    }
    
    console.log('موجودی محاسبه شده انبار:', {
      productType: deductionForm.productType,
      siteId: deductionForm.siteId,
      tankId: deductionForm.tankId,
      actualInventory,
      requestedQuantity: deductionQuantity
    });
    
    if (actualInventory < deductionQuantity) {
      const productTypeLabel = deductionForm.productType === 'owned' ? 'تملیکی' : 'امانی';
      alert(`موجودی کافی برای کسر انبار ${productTypeLabel} وجود ندارد.\n\nموجودی فعلی محاسبه شده: ${formatPersianNumber(actualInventory)} کیلوگرم\nمقدار درخواستی: ${formatPersianNumber(deductionQuantity)} کیلوگرم\n\nموجودی محاسبه شده شامل:\n- رسیدهای انبار\n- اسناد اضافه\n- حواله‌های صادر شده\n- اسناد کسر و افزودن\n- افت تملیکی`);
      return;
    }
    
    // Log activity before saving
    if ((window as any).logUserActivity) {
      const user = storage.loadData('currentUser') as any;
      (window as any).logUserActivity(
        user?.id || 'admin',
        user?.name || 'مدیر سیستم',
        `ثبت سند کسر انبار - ${deductionForm.productType === 'owned' ? 'تملیکی' : 'امانی'}`,
        'adjustment',
        'success',
        'کسر و اضافه انبار',
        'مقدار کسری',
        { 
          productType: deductionForm.productType, 
          productId: deductionForm.productId,
          quantity: deductionQuantity,
          site: deductionForm.siteId,
          tank: deductionForm.tankId,
          contract: deductionForm.contractId
        }
      );
    }
    
    saveAdjustment('deduction');
  };

  const handleAdditionSubmit = () => {
    console.log('Addition form:', additionForm);
    console.log('Addition quantity:', additionQuantity);
    
    // اعتبارسنجی بهبود یافته
    const validation = validateForm(additionForm, additionQuantity);
    if (!validation.isValid) {
      const productTypeLabel = additionForm.productType === 'owned' ? 'تملیکی' : 'امانی';
      alert(`لطفاً فیلد ${validation.missingField} را برای محصول ${productTypeLabel} انتخاب کنید`);
      return;
    }
    
    if (additionQuantity <= 0) {
      alert('مقدار اضافه انبار باید بزرگتر از صفر باشد');
      return;
    }

    // کنترل ویژه برای محصولات امانی در «سند اضافه انبار»
    // طبق درخواست: فقط اگر برای این کالا / قرارداد در این سایت و مخزن قبلاً رسید انبار ثبت شده باشد، اجازه ثبت داده شود
    if (additionForm.productType === 'consignment') {
      const hasReceipt = hasConsignmentReceiptForSelection(additionForm);
      if (!hasReceipt) {
        alert('برای این کالای امانی در این سایت و این مخزن (و در صورت وجود، این قرارداد)، هیچ رسید انبار ثبت نشده است.\nثبت سند اضافه انبار برای این مورد مجاز نیست.');
        return;
      }
    }

    // کنترل ظرفیت مخزن: اجازه نده بیشتر از ظرفیت خالی ثبت شود
    if (additionForm.siteId && additionForm.tankId) {
      try {
        // موجودی فعلی تجمیعی (امانی + تملیکی) برای این مخزن و سایت
        const combinedInventory = calculateConsignmentOwnedTanksInventory(additionForm.siteId, additionForm.tankId);
        const currentCombinedInventory = Math.max(0, combinedInventory.finalInventory);

        // ظرفیت مخزن از اطلاعات پایه
        const tank = baseData.tanks?.find((t: any) => t.id === additionForm.tankId);
        const capacityStr = tank?.capacity || '0';
        const capacityMatch = capacityStr.toString().match(/[\d,]+/);
        const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, ''), 10) : 0;

        const remainingCapacity = Math.max(0, capacity - currentCombinedInventory);

        if (capacity > 0 && additionQuantity > remainingCapacity) {
          alert(
            `مقدار وارد شده بیشتر از ظرفیت خالی مخزن است.\n\n` +
            `ظرفیت اسمی مخزن: ${formatPersianNumber(capacity)} کیلوگرم\n` +
            `موجودی فعلی (امانی + تملیکی): ${formatPersianNumber(currentCombinedInventory)} کیلوگرم\n` +
            `ظرفیت خالی باقیمانده: ${formatPersianNumber(remainingCapacity)} کیلوگرم\n` +
            `\nلطفاً مقدار کمتری وارد کنید تا از ظرفیت مخزن تجاوز نکند.`
          );
          return;
        }
      } catch (e) {
        console.error('خطا در محاسبه ظرفیت مخزن برای اضافه انبار:', e);
      }
    }

    // Log activity before saving
    if ((window as any).logUserActivity) {
      const user = storage.loadData('currentUser') as any;
      (window as any).logUserActivity(
        user?.id || 'admin',
        user?.name || 'مدیر سیستم',
        `ثبت سند اضافه انبار - ${additionForm.productType === 'owned' ? 'تملیکی' : 'امانی'}`,
        'adjustment',
        'success',
        'کسر و اضافه انبار',
        'مقدار اضافی',
        { 
          productType: additionForm.productType, 
          productId: additionForm.productId,
          quantity: additionQuantity,
          site: additionForm.siteId,
          tank: additionForm.tankId,
          contract: additionForm.contractId
        }
      );
    }

    saveAdjustment('addition');
  };

  // تابع تولید شماره تراکنش با فرمت I-تاریخ شمسی-شماره 6 رقمی
  const generateTransactionNumber = (date: Date): string => {
    // تبدیل تاریخ میلادی به شمسی
    const persianDate = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date).replace(/\//g, '');
    
    // شمارش تعداد تراکنش‌های موجود برای تولید شماره 6 رقمی (از 000001 شروع می‌شود)
    const existingAdjustmentsData = storage.loadData('inventoryAdjustments');
    const existingAdjustments = Array.isArray(existingAdjustmentsData) ? existingAdjustmentsData : [];
    const existingNumbers = existingAdjustments
      .filter((adj: any) => adj && adj.transactionNumber && adj.transactionNumber.startsWith(`I-${persianDate}-`))
      .map((adj: any) => {
        const parts = adj.transactionNumber.split('-');
        return parseInt(parts[2] || '0', 10);
      })
      .filter((n: number) => !isNaN(n));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const sequenceNumber = (maxNumber + 1).toString().padStart(6, '0');
    
    return `I-${persianDate}-${sequenceNumber}`;
  };

  const saveAdjustment = (type: 'deduction' | 'addition', isEdit: boolean = false) => {
    try {
      const form = isEdit ? editForm : (type === 'deduction' ? deductionForm : additionForm);
      const quantity = isEdit ? editForm.quantity : (type === 'deduction' ? deductionQuantity : additionQuantity);
      
      console.log('Saving adjustment:', { type, form, quantity, isEdit });
      
      // یافتن نام‌های مرتبط
      const product = baseData[form.productType === 'owned' ? 'owned-products' : 'consignment-products']?.find((p: any) => p.id === form.productId);
      const site = baseData.sites?.find((s: any) => s.id === form.siteId);
      const tank = baseData.tanks?.find((t: any) => t.id === form.tankId);
      const company = baseData.companies?.find((c: any) => c.id === form.companyId);
      const location = baseData.locations?.find((l: any) => l.id === form.locationId);
      const driver = baseData.drivers?.find((d: any) => d.id === form.driverId);
      const contract = contracts.find((c: any) => c.id === form.contractId);
      
      // ایجاد تاریخ معتبر - استفاده از تاریخ مناسب بر اساس نوع فرم
      const docDate = isEdit && form.documentDate 
        ? new Date(form.documentDate) 
        : (type === 'deduction' ? deductionDocumentDate : additionDocumentDate);
      
      // بررسی معتبر بودن تاریخ
      if (isNaN(docDate.getTime())) {
        console.error('Invalid document date:', docDate);
        alert('تاریخ سند معتبر نیست');
        return;
      }
      
      // تولید شماره تراکنش
      const transactionNumber = isEdit && form.transactionNumber 
        ? form.transactionNumber 
        : generateTransactionNumber(docDate);
      
      const adjustment: InventoryAdjustment = {
        id: isEdit ? editingId! : `adj_${Date.now()}`,
        transactionNumber,
        documentDate: docDate,
        adjustmentType: type,
        productType: form.productType,
        productId: form.productId,
        productName: product?.name || '',
        siteId: form.siteId,
        siteName: site?.name || '',
        tankId: form.tankId,
        tankName: tank?.name || '',
        companyId: form.companyId,
        companyName: company?.name || '',
        customerCompanyId: form.customerCompanyId,
        customerCompanyName: baseData['customer-companies']?.find((c: any) => c.id === form.customerCompanyId)?.name,
        locationId: form.locationId,
        locationName: location?.name || '',
        driverId: form.driverId,
        driverName: driver?.name || '',
        contractId: form.contractId,
        contractNumber: contract?.contractNumber,
        permitId: form.permitId,
        quantity,
        nature: form.productType,
        status: isEdit ? form.status : 'temporary',
        attachmentUrl: form.attachmentUrl,
        createdAt: isEdit && form.createdAt ? new Date(form.createdAt) : new Date(),
        updatedAt: new Date()
      };
      
      console.log('Created adjustment:', adjustment);
      
      // ذخیره تنظیم انبار
      let updatedAdjustments;
      if (isEdit) {
        updatedAdjustments = adjustments.map(adj => adj.id === editingId ? adjustment : adj);
      } else {
        updatedAdjustments = [...adjustments, adjustment];
      }
      storage.saveData('inventoryAdjustments', updatedAdjustments);
      setAdjustments(updatedAdjustments);
      
      // به‌روزرسانی موجودی
      if (!isEdit || adjustment.status === 'finalized') {
        updateInventory(adjustment);
        // به‌روزرسانی inventoryRefreshKey برای refresh محاسبات موجودی
        setInventoryRefreshKey(prev => prev + 1);
      }
      
      // ارسال رویداد برای به‌روزرسانی کامپوننت‌های دیگر
      window.dispatchEvent(new CustomEvent('inventoryAdjustmentsUpdated', { 
        detail: { 
          adjustment,
          type: isEdit ? 'edit' : 'add'
        } 
      }));
      
      // ریست فرم‌ها
      if (!isEdit) {
        if (type === 'deduction') {
          setDeductionForm({
            productType: '',
            productId: '',
            siteId: '',
            tankId: '',
            contractId: '',
            companyId: '',
            customerCompanyId: '',
            locationId: '',
            driverId: ''
          });
          setDeductionQuantity(0);
        } else {
          setAdditionForm({
            productType: '',
            productId: '',
            siteId: '',
            tankId: '',
            contractId: '',
            companyId: '',
            customerCompanyId: '',
            locationId: '',
            driverId: ''
          });
          setAdditionQuantity(0);
        }
        
        // پاک کردن اطلاعات قرارداد و جدول مرتبط
        setSelectedContractInfo(null);
        setShowConsignmentRelatedTable(false);
        
        // نمایش پیام پرینت
        setShowPrintMessage(adjustment.id);
      } else {
        setEditingId(null);
        setEditForm({});
      }
      
      alert(`سند ${type === 'deduction' ? 'کسری' : 'اضافه'} انبار با موفقیت ${isEdit ? 'ویرایش' : 'ثبت'} شد`);
    } catch (error) {
      console.error('Error saving adjustment:', error);
      alert('خطایی در ثبت سند رخ داد');
    }
  };

  const updateInventory = (adjustment: InventoryAdjustment) => {
    try {
      console.log('Updating inventory with adjustment:', adjustment);
      
      const existingIndex = inventory.findIndex(item => 
        item.productId === adjustment.productId &&
        item.productType === adjustment.productType &&
        item.siteId === adjustment.siteId &&
        item.tankId === adjustment.tankId
      );
      
      let updatedInventory = [...inventory];
      
      if (existingIndex !== -1) {
        // به‌روزرسانی موجودی موجود
        const updatedItem = { ...updatedInventory[existingIndex] };
        updatedItem.quantity += adjustment.adjustmentType === 'addition' ? adjustment.quantity : -adjustment.quantity;
        updatedItem.lastUpdated = new Date();
        updatedInventory[existingIndex] = updatedItem;
        console.log('Updated existing inventory item:', updatedItem);
      } else {
        // ایجاد رکورد جدید
        const newRecord: InventoryRecord = {
          id: `inv_${Date.now()}`,
          productType: adjustment.productType,
          productId: adjustment.productId,
          productName: adjustment.productName,
          siteId: adjustment.siteId,
          siteName: adjustment.siteName,
          tankId: adjustment.tankId,
          tankName: adjustment.tankName,
          companyId: adjustment.companyId,
          companyName: adjustment.companyName,
          customerCompanyId: adjustment.customerCompanyId,
          customerCompanyName: adjustment.customerCompanyName,
          locationId: adjustment.locationId,
          locationName: adjustment.locationName,
          driverId: adjustment.driverId,
          driverName: adjustment.driverName,
          contractId: adjustment.contractId,
          contractNumber: adjustment.contractNumber,
          quantity: adjustment.adjustmentType === 'addition' ? adjustment.quantity : -adjustment.quantity,
          lastUpdated: new Date()
        };
        updatedInventory.push(newRecord);
        console.log('Created new inventory record:', newRecord);
      }
      
      // حذف رکوردهای با موجودی صفر یا منفی
      updatedInventory = updatedInventory.filter(item => item.quantity > 0);
      
      // ذخیره موجودی
      storage.saveData('inventory', updatedInventory);
      setInventory(updatedInventory);
      console.log('Updated inventory saved:', updatedInventory);
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  };

  const handleEdit = (adjustment: InventoryAdjustment) => {
    // اگر سند قطعی باشد، هنگام شروع ویرایش به موقت برگردان
    if (adjustment.status === 'finalized') {
      const updated = adjustments.map(adj => 
        adj.id === adjustment.id ? { ...adj, status: 'temporary' as const, updatedAt: new Date() } : adj
      );
      storage.saveData('inventoryAdjustments', updated);
      setAdjustments(updated);
      adjustment = { ...adjustment, status: 'temporary' };
    }

    setEditingId(adjustment.id);
    setEditForm({
      ...adjustment,
      documentDate: adjustment.documentDate.toISOString().split('T')[0]
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('آیا از حذف این سند اطمینان دارید؟')) {
      const updatedAdjustments = adjustments.filter(adj => adj.id !== id);
      storage.saveData('inventoryAdjustments', updatedAdjustments);
      setAdjustments(updatedAdjustments);
      
      // ارسال رویداد برای به‌روزرسانی کامپوننت‌های دیگر
      window.dispatchEvent(new CustomEvent('inventoryAdjustmentsUpdated', { 
        detail: { 
          adjustmentId: id,
          type: 'delete'
        } 
      }));
    }
  };

  const handlePrint = (id: string) => {
    const adjustment = adjustments.find(adj => adj.id === id);
    if (!adjustment) return;
    
    // به‌روزرسانی وضعیت به 'printed'
    const updatedAdjustments = adjustments.map(adj => 
      adj.id === id ? { ...adj, status: 'printed' as const, updatedAt: new Date() } : adj
    );
    storage.saveData('inventoryAdjustments', updatedAdjustments);
    setAdjustments(updatedAdjustments);
    
    // ایجاد محتوای پرینت مدرن سبک 2025 - خلاصه و مفید در یک صفحه
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>سند ${adjustment.adjustmentType === 'deduction' ? 'کسری' : 'اضافه'} انبار - ${adjustment.transactionNumber}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8fafc;
            padding: 20px;
            color: #1e293b;
            line-height: 1.6;
          }
          
          .print-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
            overflow: hidden;
            max-width: 750px;
            margin: 0 auto;
          }
          
          .header {
            background: ${adjustment.adjustmentType === 'deduction' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'};
            color: white;
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 20px;
          }
          
          .logo {
            width: 56px;
            height: 56px;
            background: rgba(255,255,255,0.2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            backdrop-filter: blur(10px);
          }
          
          .header-info {
            flex: 1;
          }
          
          .company-name {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          
          .document-title {
            font-size: 14px;
            opacity: 0.9;
          }
          
          .transaction-number {
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            backdrop-filter: blur(10px);
          }
          
          .content {
            padding: 24px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 20px;
          }
          
          .info-item {
            background: #f8fafc;
            padding: 12px 16px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
          }
          
          .info-label {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 4px;
            font-weight: 500;
          }
          
          .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
          }
          
          .highlight-box {
            background: ${adjustment.adjustmentType === 'deduction' ? '#fef2f2' : '#f0fdf4'};
            border: 2px solid ${adjustment.adjustmentType === 'deduction' ? '#fecaca' : '#bbf7d0'};
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          
          .highlight-label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 8px;
          }
          
          .highlight-value {
            font-size: 32px;
            font-weight: 800;
            color: ${adjustment.adjustmentType === 'deduction' ? '#dc2626' : '#16a34a'};
          }
          
          .highlight-unit {
            font-size: 14px;
            color: #64748b;
            margin-top: 4px;
          }
          
          .footer {
            border-top: 1px solid #e2e8f0;
            padding: 16px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
          }
          
          .footer-item {
            text-align: center;
          }
          
          .footer-label {
            font-size: 10px;
            color: #94a3b8;
            margin-bottom: 4px;
          }
          
          .footer-value {
            font-size: 12px;
            font-weight: 600;
            color: #475569;
          }
          
          .signature-area {
            display: flex;
            justify-content: space-around;
            padding: 20px 24px;
            gap: 40px;
          }
          
          .signature-box {
            flex: 1;
            text-align: center;
            padding-top: 40px;
            border-top: 1px dashed #cbd5e1;
          }
          
          .signature-title {
            font-size: 11px;
            color: #64748b;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .print-container {
              box-shadow: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="header">
            <div class="logo">
              ${adjustment.adjustmentType === 'deduction' ? '−' : '+'}
            </div>
            <div class="header-info">
              <div class="company-name">${adjustment.companyName || 'شرکت'}</div>
              <div class="document-title">سند ${adjustment.adjustmentType === 'deduction' ? 'کسری' : 'اضافه'} انبار</div>
            </div>
            <div class="transaction-number">${adjustment.transactionNumber}</div>
          </div>
          
          <div class="content">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">تاریخ سند</div>
                <div class="info-value">${formatPersianDate(adjustment.documentDate)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">نوع محصول</div>
                <div class="info-value">${adjustment.productType === 'owned' ? 'تملیکی' : 'امانی'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">نام محصول</div>
                <div class="info-value">${adjustment.productName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">سایت</div>
                <div class="info-value">${adjustment.siteName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">مخزن</div>
                <div class="info-value">${adjustment.tankName}</div>
              </div>
              ${adjustment.contractNumber ? `
              <div class="info-item">
                <div class="info-label">شماره قرارداد</div>
                <div class="info-value">${adjustment.contractNumber}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="highlight-box">
              <div class="highlight-label">مقدار ${adjustment.adjustmentType === 'deduction' ? 'کسری' : 'اضافه'}</div>
              <div class="highlight-value">${formatPersianNumber(adjustment.quantity)}</div>
              <div class="highlight-unit">کیلوگرم</div>
            </div>
          </div>
          
          <div class="signature-area">
            <div class="signature-box">
              <div class="signature-title">امضای انباردار</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">امضای مسئول</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">امضای تأیید کننده</div>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-item">
              <div class="footer-label">تاریخ ایجاد</div>
              <div class="footer-value">${formatPersianDate(adjustment.createdAt)}</div>
            </div>
            <div class="footer-item">
              <div class="footer-label">تاریخ چاپ</div>
              <div class="footer-value">${formatPersianDate(new Date())}</div>
            </div>
            <div class="footer-item">
              <div class="footer-label">وضعیت</div>
              <div class="footer-value">چاپ شده</div>
            </div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleAttach = (id: string) => {
    // باز کردن دیالوگ انتخاب فایل - باید قبل از پرینت انجام شود
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf';
    
    input.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // پردازش فایل‌ها و ایجاد URL
        const fileUrls = Array.from(files).map(file => URL.createObjectURL(file));
        
        // به‌روزرسانی وضعیت به 'attached' - حالا می‌توان پرینت کرد
        const updatedAdjustments = adjustments.map(adj => 
          adj.id === id ? { 
            ...adj, 
            status: 'attached' as const, 
            attachmentUrl: fileUrls.join(','),
            updatedAt: new Date() 
          } : adj
        );
        storage.saveData('inventoryAdjustments', updatedAdjustments);
        setAdjustments(updatedAdjustments);
        
        alert(`${files.length} فایل با موفقیت ضمیمه شد. اکنون می‌توانید سند را پرینت کنید.`);
      }
    };
    
    // فعال کردن دیالوگ انتخاب فایل
    input.click();
  };

  const handleFinalize = (id: string) => {
    const updatedAdjustments = adjustments.map(adj => 
      adj.id === id ? { ...adj, status: 'finalized' as const } : adj
    );
    storage.saveData('inventoryAdjustments', updatedAdjustments);
    setAdjustments(updatedAdjustments);
    
    // به‌روزرسانی inventoryRefreshKey برای refresh محاسبات موجودی
    setInventoryRefreshKey(prev => prev + 1);
    
    alert('سند با موفقیت نهایی شد');
  };

  // قطعی کردن سریع از "موقت" به "قطعی" در گزارش تراکنش‌ها
  const handleQuickFinalize = (id: string) => {
    const target = adjustments.find(adj => adj.id === id);
    if (!target) return;
    if (target.status !== 'temporary') return;

    const updatedAdjustments = adjustments.map(adj => 
      adj.id === id ? { ...adj, status: 'finalized' as const, updatedAt: new Date() } : adj
    );
    storage.saveData('inventoryAdjustments', updatedAdjustments);
    setAdjustments(updatedAdjustments);
    
    // به‌روزرسانی inventoryRefreshKey برای refresh محاسبات موجودی
    setInventoryRefreshKey(prev => prev + 1);
  };

  // تابع به‌روزرسانی محاسبات موجودی
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleRefreshInventory = useCallback(() => {
    console.log('🔄 به‌روزرسانی محاسبات موجودی...');
    setInventoryRefreshKey(prev => prev + 1);
    
    // به‌روزرسانی داده‌ها
    const savedInventory = storage.loadData('inventory');
    if (savedInventory && Array.isArray(savedInventory)) {
      const validInventory = savedInventory.map((item: any) => {
        try {
          return {
            ...item,
            lastUpdated: item.lastUpdated ? new Date(item.lastUpdated) : new Date()
          };
        } catch (error) {
          return {
            ...item,
            lastUpdated: new Date()
          };
        }
      });
      setInventory(validInventory);
    }
    
    console.log('✅ محاسبات موجودی به‌روزرسانی شد');
  }, [storage]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      temporary: { label: 'موقت', color: 'bg-yellow-100 text-yellow-800' },
      printed: { label: 'چاپ شده', color: 'bg-blue-100 text-blue-800' },
      attached: { label: 'ضمیمه شده', color: 'bg-purple-100 text-purple-800' },
      finalized: { label: 'نهایی شده', color: 'bg-green-100 text-green-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.temporary;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // کامپوننت نمایش اطلاعات قرارداد انتخاب شده
  const renderContractInfoTable = () => {
    // فقط وقتی قرارداد انتخاب شده باشد نمایش داده شود (که فقط برای محصولات امانی اتفاق می‌افتد)
    if (!selectedContractInfo) return null;
    
    // فراخوانی آخرین وضعیت قرارداد از storage
    const latestContractsData = storage.loadData('contracts');
    const latestContracts = Array.isArray(latestContractsData) ? latestContractsData : [];
    const latestContract = latestContracts.find((c: any) => c.id === selectedContractInfo.id);
    
    // استفاده از آخرین اطلاعات قرارداد در صورت وجود، در غیر این صورت از selectedContractInfo
    const contractData = latestContract || selectedContractInfo;
    
    // تشخیص اینکه کدام فرم دارای قرارداد است
    const isDeductionHasContract = deductionForm.productType === 'consignment' && deductionForm.contractId;
    const isAdditionHasContract = additionForm.productType === 'consignment' && additionForm.contractId;
    
    let relatedDocumentTitle = '';
    let documentUsage = '';
    
    if (isDeductionHasContract && isAdditionHasContract) {
      relatedDocumentTitle = 'مربوط به هر دو سند (کسر و اضافه انبار)';
      documentUsage = 'کاربرد در هر دو سند (کسر و اضافه انبار)';
    } else if (isDeductionHasContract) {
      relatedDocumentTitle = 'مربوط به سند (ثبت سند کسر انبار)';
      documentUsage = 'ثبت سند کسر انبار';
    } else if (isAdditionHasContract) {
      relatedDocumentTitle = 'مربوط به سند (ثبت سند اضافه انبار)';
      documentUsage = 'ثبت سند اضافه انبار';
    } else {
      relatedDocumentTitle = 'مربوط به سند (ثبت سند کسر/اضافه انبار)';
      documentUsage = 'ثبت سند کسر/اضافه انبار';
    }
    
    const site = baseData.sites?.find((s: any) => s.id === contractData.siteId);
    const tank = baseData.tanks?.find((t: any) => t.id === contractData.tankId);
    const company = baseData.companies?.find((c: any) => c.id === contractData.companyId);
    // تلاش برای پیدا کردن مبنای رسید از baseData یا از خود قرارداد
    let receiptBasisName = contractData.receiptBasisName;
    if (!receiptBasisName) {
      const receiptBasis = baseData['receipt-basis']?.find((r: any) => r.id === contractData.receiptBasisId);
      receiptBasisName = receiptBasis?.name || '-';
    }
    const rentalType = baseData['rental-types']?.find((r: any) => r.id === contractData.rentalTypeId);
    const wastageRate = baseData['wastage-rates']?.find((w: any) => w.id === contractData.wastageRateId);
    
    // محاسبه وضعیت منقضی شده بر اساس تاریخ پایان قرارداد
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = contractData.endDate ? new Date(contractData.endDate) : null;
    const isExpired = endDate ? (endDate < today) : false;
    
    // محاسبه مقدار افت (dropAmount) - اگر وجود نداشته باشد از فرمول محاسبه می‌شود
    const dropAmount = contractData.dropAmount !== undefined 
      ? contractData.dropAmount 
      : (contractData.contractWeight && contractData.wastageRateValue) 
        ? (contractData.contractWeight * contractData.wastageRateValue) / 100 
        : 0;
    
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-lg overflow-hidden relative mt-8 mb-8 mx-4">
        <div className="bg-blue-600 px-4 py-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-white" />
              <h4 className="text-lg font-bold text-white">اطلاعات قرارداد انتخاب شده</h4>
              <FileText className="h-4 w-4 text-white" />
            </div>
            {/* برچسب مربوط به سند - در header */}
            <div className="bg-white border-2 border-blue-400 rounded-lg px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-transparent border-b-blue-600"></div>
                <span className="text-xs font-bold text-blue-800 whitespace-nowrap text-center">
                  {relatedDocumentTitle}
                </span>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-transparent border-b-blue-600"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 w-full">
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-blue-200 hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 w-1/4 text-sm">شماره قرارداد:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">{contractData.contractNumber || '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 w-1/4 text-sm">کاربرد قرارداد:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                    documentUsage.includes('هر دو') 
                      ? 'bg-purple-100 text-purple-800'
                      : documentUsage.includes('کسر')
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {documentUsage}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-blue-200 hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">سایت:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">{site?.name || '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">وضعیت قرارداد:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                    contractData.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {contractData.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-blue-200 hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">مخزن:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">{tank?.name || '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">منقضی شده:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                    isExpired 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {isExpired ? 'منقضی شده' : 'درجریان'}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-blue-200 hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">طرف حساب/شرکت:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">{company?.name || '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">تاریخ ثبت:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">
                  {contractData.createdAt ? formatPersianDate(new Date(contractData.createdAt)) : '-'}
                </td>
              </tr>
              <tr className="border-b border-blue-200 hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">تاریخ شروع:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">
                  {contractData.startDate ? formatPersianDate(new Date(contractData.startDate)) : '-'}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">تاریخ پایان:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">
                  {contractData.endDate ? formatPersianDate(new Date(contractData.endDate)) : '-'}
                </td>
              </tr>
              <tr className="border-b border-blue-200 hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">مبنای رسید:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">{receiptBasisName}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">مقدار قرارداد:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">
                  {contractData.contractWeight ? formatPersianNumber(contractData.contractWeight) + ' کیلوگرم' : '-'}
                </td>
              </tr>
              <tr className="border-b border-blue-200 hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">نوع اجاره:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">{rentalType?.name || '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">درصد افت:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">
                  {wastageRate ? (wastageRate.name || (contractData.wastageRateValue ? formatPersianNumber(contractData.wastageRateValue) + '%' : '-')) : '-'}
                </td>
              </tr>
              <tr className="border-b border-blue-200 hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">واحد سنجش:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">{contractData.unit || 'کیلوگرم'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm">مقدار افت:</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm">
                  {dropAmount > 0 ? formatPersianNumber(dropAmount) + ' کیلوگرم' : '-'}
                </td>
              </tr>
              <tr className="hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm"></td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm"></td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700 bg-blue-100 text-sm"></td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium text-sm"></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* فلش‌های ارتباطی به فرم‌ها در پایین */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 relative">
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-center animate-pulse">
              <span className="text-xs text-white font-medium whitespace-nowrap mb-1">سند کسر انبار</span>
              <div className="w-4 h-4 bg-white rotate-45 transform shadow-lg"></div>
            </div>
            
            <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-1">
              <FileText className="h-4 w-4 text-white animate-bounce" />
              <span className="text-white font-semibold text-sm">ارتباط با فرم‌ها</span>
              <FileText className="h-4 w-4 text-white animate-bounce" />
            </div>
            
            <div className="flex flex-col items-center animate-pulse">
              <span className="text-xs text-white font-medium whitespace-nowrap mb-1">سند اضافه انبار</span>
              <div className="w-4 h-4 bg-white rotate-45 transform shadow-lg"></div>
            </div>
          </div>
          
          {/* نقطه‌های نورانی برای جلب توجه */}
          <div className="absolute top-1 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
          <div className="absolute top-1 right-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping animation-delay-500"></div>
        </div>
      </div>
    );
  };

  // جدول اطلاعات امانی مرتبط با قرارداد انتخاب شده
  const renderConsignmentRelatedTable = () => {
    if (!showConsignmentRelatedTable || !selectedContractInfo) return null;

    // محاسبه موجودی امانی برای قرارداد انتخاب شده
    const consignmentInventory = calculateConsignmentTanksInventory(selectedContractInfo.siteId, selectedContractInfo.tankId);
    const contractConsignmentAdjustments = adjustments.filter(adj => 
      adj.contractId === selectedContractInfo.id && 
      adj.productType === 'consignment'
    );
    
    // محاسبه تعداد تبدیل‌های کالا مربوط به قرارداد انتخاب شده (بر اساس siteId و tankId)
    const allConversionsData = storage.loadData('productConversions');
    const allConversionsArray = Array.isArray(allConversionsData) ? allConversionsData : [];
    const contractConversions = allConversionsArray.filter((c: any) => 
      c && typeof c === 'object' && 
      !c.isVoided &&
      c.siteId === selectedContractInfo.siteId &&
      c.tankId === selectedContractInfo.tankId
    );
    
    // تعداد کالای مصرفی امانی مربوط به قرارداد
    const consignmentConsumedCount = contractConversions.filter((c: any) => 
      c.consumedProductType === 'consignment'
    ).length;
    
    // تعداد کالای تولیدی امانی مربوط به قرارداد
    const consignmentProducedCount = contractConversions.filter((c: any) => 
      c.producedProductType === 'consignment'
    ).length;

    return (
      <div className="mt-6 mb-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 relative">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Warehouse className="h-6 w-6" />
              موجودی امانی مرتبط با قرارداد انتخاب شده
            </h2>
            <button
              onClick={() => setShowConsignmentRelatedTable(false)}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* فلش ارتباطی */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-8 h-8 bg-green-500 rotate-45 transform"></div>
          </div>
        </div>
        
        {/* پیام راهنما */}
        <div className="bg-blue-50 border-r-4 border-blue-400 p-4 mx-6 mt-4 rounded-lg">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>راهنما:</strong> این جدول به محض انتخاب شماره قرارداد در هر یک از فرم‌ها به طور خودکار نمایش داده می‌شود 
                تا اطلاعات موجودی امانی مربوط به آن قرارداد را نشان دهد.
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* اطلاعات قرارداد */}
          <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-3">اطلاعات قرارداد</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-700">شماره قرارداد:</span>
                <span className="text-green-800 font-bold">{selectedContractInfo.contractNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-700">شرکت:</span>
                <span className="text-blue-800 font-medium">{selectedContractInfo.companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-700">سایت:</span>
                <span className="text-purple-800 font-medium">{selectedContractInfo.siteName}</span>
              </div>
            </div>
          </div>

          {/* خلاصه موجودی امانی */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h4 className="text-lg font-semibold text-green-800 mb-3">خلاصه موجودی امانی</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>رسیدهای امانی:</span>
                  <span className="font-semibold text-green-600">{formatPersianNumber(consignmentInventory.consignmentReceiptsAmount)} کیلوگرم</span>
                </div>
                <div className="flex justify-between">
                  <span>اسناد اضافه امانی:</span>
                  <span className="font-semibold text-green-600">{formatPersianNumber(consignmentInventory.consignmentAdditions)} کیلوگرم</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>حواله‌های امانی:</span>
                  <span className="font-semibold">-{formatPersianNumber(consignmentInventory.consignmentDeliveries)} کیلوگرم</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>کسر از امانی:</span>
                  <span className="font-semibold">-{formatPersianNumber(consignmentInventory.consignmentDeductionAmount)} کیلوگرم</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>اسناد کسر امانی:</span>
                  <span className="font-semibold">-{formatPersianNumber(consignmentInventory.consignmentDeductionDocuments)} کیلوگرم</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>کالای مصرفی امانی:</span>
                  <span className="font-semibold">-{formatPersianNumber(consignmentInventory.consignmentConsumedProducts || 0)} کیلوگرم</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>کالای تولیدی امانی:</span>
                  <span className="font-semibold">+{formatPersianNumber(consignmentInventory.consignmentProducedProducts || 0)} کیلوگرم</span>
                </div>
                <hr className="border-green-300" />
                <div className="flex justify-between text-lg font-bold text-green-900">
                  <span>موجودی نهایی امانی:</span>
                  <span>{formatPersianNumber(consignmentInventory.finalInventory)} کیلوگرم</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-800 mb-3">آمار تراکنش‌های امانی</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>تعداد کل تراکنش‌ها:</span>
                  <span className="font-semibold text-blue-600">{contractConsignmentAdjustments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>تعداد اسناد اضافه:</span>
                  <span className="font-semibold text-green-600">
                    {contractConsignmentAdjustments.filter(adj => adj.adjustmentType === 'addition').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>تعداد اسناد کسر:</span>
                  <span className="font-semibold text-red-600">
                    {contractConsignmentAdjustments.filter(adj => adj.adjustmentType === 'deduction').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>مجموع اضافه انبار:</span>
                  <span className="font-semibold text-green-600">
                    {formatPersianNumber(
                      contractConsignmentAdjustments
                        .filter(adj => adj.adjustmentType === 'addition')
                        .reduce((sum, adj) => sum + adj.quantity, 0)
                    )} کیلوگرم
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>مجموع کسر انبار:</span>
                  <span className="font-semibold text-red-600">
                    {formatPersianNumber(
                      contractConsignmentAdjustments
                        .filter(adj => adj.adjustmentType === 'deduction')
                        .reduce((sum, adj) => sum + adj.quantity, 0)
                    )} کیلوگرم
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>تعداد کالای مصرفی امانی:</span>
                  <span className="font-semibold text-red-600">{consignmentConsumedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>تعداد کالای تولیدی امانی:</span>
                  <span className="font-semibold text-green-600">{consignmentProducedCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* پیام راهنما */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">توضیح ارتباط</h4>
                <p className="text-blue-700 text-sm">
                  این جدول موجودی امانی مرتبط با قرارداد انتخاب شده در فرم دیگر را نمایش می‌دهد. 
                  با تغییر نوع محصول از امانی به تملیکی، می‌توانید موجودی مرتبط را مشاهده کنید.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFormSection = (type: 'deduction' | 'addition') => {
    const form = type === 'deduction' ? deductionForm : additionForm;
    const quantity = type === 'deduction' ? deductionQuantity : additionQuantity;
    const setQuantity = type === 'deduction' ? setDeductionQuantity : setAdditionQuantity;
    const handleSubmit = type === 'deduction' ? handleDeductionSubmit : handleAdditionSubmit;
    const icon = type === 'deduction' ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />;
    const title = type === 'deduction' ? 'ثبت سند کسر انبار' : 'ثبت سند اضافه انبار';
    const quantityLabel = type === 'deduction' ? 'مقدار کسری انبار' : 'مقدار اضافه انبار';
    const colorClass = type === 'deduction' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50';
    
    console.log(`Rendering ${type} form with data:`, { form, quantity });
    
    return (
      <div className={`p-6 rounded-xl border ${colorClass} shadow-sm`}>
        {/* تاریخ سند - برای هر دو فرم کسر و اضافه انبار */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ سند {title}</label>
              <div
                onClick={() => {
                  if (type === 'deduction') {
                    setShowDeductionDateModal(true);
                  } else {
                    setShowAdditionDateModal(true);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors flex items-center justify-between"
              >
                <span className="text-gray-900">
                  {formatPersianDate(type === 'deduction' ? deductionDocumentDate : additionDocumentDate)}
                </span>
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
        
        {/* مودال تقویم برای تاریخ سند کسر انبار */}
        {type === 'deduction' && renderDatePickerModal(
          showDeductionDateModal,
          () => setShowDeductionDateModal(false),
          deductionDocumentDate,
          (date) => {
            if (date) {
              setDeductionDocumentDate(date);
            }
            setShowDeductionDateModal(false);
          },
          'انتخاب تاریخ سند کسر انبار'
        )}
        
        {/* مودال تقویم برای تاریخ سند اضافه انبار */}
        {type === 'addition' && renderDatePickerModal(
          showAdditionDateModal,
          () => setShowAdditionDateModal(false),
          additionDocumentDate,
          (date) => {
            if (date) {
              setAdditionDocumentDate(date);
            }
            setShowAdditionDateModal(false);
          },
          'انتخاب تاریخ سند اضافه انبار'
        )}
        
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* نوع محصول */}
          <div>
            <label className="block text-sm font-medium text-red-600 mb-2">
              نوع محصول <span className="text-red-500">*</span>
              <span className="text-xs text-red-400 block mt-1">فیلد اجباری</span>
            </label>
            <select
              value={form.productType || ''}
              onChange={(e) => handleFormChange(type, 'productType', e.target.value)}
              className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">انتخاب کنید</option>
              <option value="owned">تملیکی</option>
              <option value="consignment">امانی</option>
            </select>
          </div>
          
          {/* محصول */}
          <div>
            <label className="block text-sm font-medium text-red-600 mb-2">
              محصول <span className="text-red-500">*</span>
              <span className="text-xs text-red-400 block mt-1">فیلد اجباری</span>
            </label>
            <select
              value={form.productId || ''}
              onChange={(e) => handleFormChange(type, 'productId', e.target.value)}
              className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              disabled={!form.productType}
            >
              <option value="">انتخاب کنید</option>
              {form.productType && baseData[form.productType === 'owned' ? 'owned-products' : 'consignment-products']?.map((product: any) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>
          
          {/* سایت */}
          <div>
            <label className="block text-sm font-medium text-red-600 mb-2">
              سایت <span className="text-red-500">*</span>
              <span className="text-xs text-red-400 block mt-1">فیلد اجباری</span>
            </label>
            <select
              value={form.siteId || ''}
              onChange={(e) => handleFormChange(type, 'siteId', e.target.value)}
              className={`w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                form.productType === 'consignment' && form.contractId ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={form.productType === 'consignment' && form.contractId ? true : false}
            >
              <option value="">انتخاب کنید</option>
              {baseData.sites?.map((site: any) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>
          
          {/* مخزن */}
          <div>
            <label className="block text-sm font-medium text-red-600 mb-2">
              مخزن <span className="text-red-500">*</span>
              <span className="text-xs text-red-400 block mt-1">فیلد اجباری</span>
            </label>
            <select
              value={form.tankId || ''}
              onChange={(e) => handleFormChange(type, 'tankId', e.target.value)}
              className={`w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                form.productType === 'consignment' && form.contractId ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={form.productType === 'consignment' && form.contractId ? true : false}
            >
              <option value="">انتخاب کنید</option>
              {baseData.tanks?.map((tank: any) => (
                <option key={tank.id} value={tank.id}>{tank.name}</option>
              ))}
            </select>
          </div>
          
          {/* ظرفیت خالی مخزن - نمایش ثابت در هر دو فرم کسر و اضافه (برای هر دو نوع محصول تملیکی و امانی) */}
          <div>
            <label className="block text-sm font-medium text-purple-600 mb-2">
              ظرفیت خالی مخزن (کیلوگرم)
              <span className="text-xs text-purple-400 block mt-1">محاسبه از مجموع موجودی امانی و تملیکی</span>
            </label>
            <input
              type="text"
              value={form.siteId && form.tankId ? formatPersianNumber(calculateEmptyTankCapacity(form.siteId, form.tankId)) : '0'}
              className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg bg-purple-50 cursor-not-allowed"
              readOnly
              disabled={!form.siteId || !form.tankId}
            />
          </div>
          
          {/* شرکت طرف حساب - اختیاری */}
          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              شرکت طرف حساب
              <span className="text-xs text-blue-400 block mt-1">فیلد اختیاری</span>
            </label>
            <select
              value={form.companyId || ''}
              onChange={(e) => handleFormChange(type, 'companyId', e.target.value)}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">انتخاب کنید</option>
              {baseData.companies?.map((company: any) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          
          {/* مشتری طرف حساب - اختیاری */}
          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              مشتری طرف حساب
              <span className="text-xs text-blue-400 block mt-1">فیلد اختیاری</span>
            </label>
            <select
              value={form.customerCompanyId || ''}
              onChange={(e) => handleFormChange(type, 'customerCompanyId', e.target.value)}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">انتخاب کنید</option>
              {baseData['customer-companies']?.map((company: any) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          
          {/* لوکیشن - اختیاری */}
          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              لوکیشن
              <span className="text-xs text-blue-400 block mt-1">فیلد اختیاری</span>
            </label>
            <select
              value={form.locationId || ''}
              onChange={(e) => handleFormChange(type, 'locationId', e.target.value)}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">انتخاب کنید</option>
              {baseData.locations?.map((location: any) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>
          
          {/* راننده - اختیاری */}
          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              راننده
              <span className="text-xs text-blue-400 block mt-1">فیلد اختیاری</span>
            </label>
            <select
              value={form.driverId || ''}
              onChange={(e) => handleFormChange(type, 'driverId', e.target.value)}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">انتخاب کنید</option>
              {baseData.drivers?.map((driver: any) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
          </div>
          
          {/* قرارداد - فقط برای محصولات امانی نمایش داده می‌شود */}
          {form.productType === 'consignment' && (
            <div>
              <label className="block text-sm font-medium text-red-600 mb-2">
                قرارداد <span className="text-red-500">*</span>
                <span className="text-xs text-red-400 block mt-1">فیلد اجباری</span>
              </label>
              <select
                value={form.contractId || ''}
                onChange={(e) => handleFormChange(type, 'contractId', e.target.value)}
                className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              >
                <option value="">انتخاب کنید</option>
                {contracts.map((contract: any) => (
                  <option key={contract.id} value={contract.id}>{contract.contractNumber}</option>
                ))}
              </select>

            </div>
          )}
          
          {/* مقدار */}
          <div>
            <label className="block text-sm font-medium text-red-600 mb-2">
              {quantityLabel} (کیلوگرم) <span className="text-red-500">*</span>
              <span className="text-xs text-red-400 block mt-1">فیلد اجباری</span>
            </label>
            <input
              type="number"
              min="1"
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>
        
        {/* جدول رسیدهای انبار تملیکی برای کسر انبار */}
        {type === 'deduction' && form.productType === 'owned' && showOwnedDeductionTable && (
          <div className="mt-6 bg-white rounded-lg border border-gray-300 p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">رسیدهای انبار تملیکی</h4>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-right">شماره تراکنش</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">تاریخ رسید</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">محصول</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">سایت</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">مخزن</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">مبنای رسید</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">مقدار مبنای رسید (کیلوگرم)</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">کشتی</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">کوتاژ</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">ایندکس</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">راننده</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {getAllOwnedReceipts().map((receipt, index) => (
                    <tr key={receipt.id || index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2">{receipt.transactionNumber}</td>
                      <td className="border border-gray-300 px-3 py-2">{formatPersianDate(receipt.receiptDate)}</td>
                      <td className="border border-gray-300 px-3 py-2">{receipt.productName}</td>
                      <td className="border border-gray-300 px-3 py-2">{receipt.siteName}</td>
                      <td className="border border-gray-300 px-3 py-2">{receipt.tankName}</td>
                      <td className="border border-gray-300 px-3 py-2">{receipt.receiptBasisName || receipt.receiptBasis || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">{formatPersianNumber(receipt.receiptBasisAmount)}</td>
                      <td className="border border-gray-300 px-3 py-2">{receipt.shipName || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">{receipt.cotageNumber || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">{receipt.indexNumber || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">{receipt.driverName || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">
                        <button
                          onClick={() => {
                            handleFormChange(type, 'productId', receipt.productId);
                            handleFormChange(type, 'siteId', receipt.siteId);
                            handleFormChange(type, 'tankId', receipt.tankId);
                            if (receipt.companyId) {
                              handleFormChange(type, 'companyId', receipt.companyId);
                            }
                            if (receipt.locationId) {
                              handleFormChange(type, 'locationId', receipt.locationId);
                            }
                            if (receipt.driverId) {
                              handleFormChange(type, 'driverId', receipt.driverId);
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                        >
                          انتخاب
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {getAllOwnedReceipts().length === 0 && (
                <div className="text-center py-4 text-gray-500">هیچ رسید انبار تملیکی یافت نشد</div>
              )}
            </div>
          </div>
        )}

        {/* جدول رسیدهای انبار امانی برای کسر انبار */}
        {type === 'deduction' && form.productType === 'consignment' && showConsignmentDeductionTable && (
          <div className="mt-6 bg-white rounded-lg border border-gray-300 p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              رسیدهای انبار امانی
              {form.contractId && (
                <span className="text-sm font-normal text-gray-600 mr-2">
                  (فیلتر شده بر اساس قرارداد: {contracts.find(c => c.id === form.contractId)?.contractNumber || ''})
                </span>
              )}
            </h4>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-right">شماره تراکنش</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">تاریخ رسید</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">محصول</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">سایت</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">مخزن</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">قرارداد</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">مبنای رسید</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">مقدار مبنای رسید (کیلوگرم)</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">طرف حساب</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">کشتی</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">کوتاژ</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">ایندکس</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">راننده</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allReceipts = getAllConsignmentReceipts();
                    const filteredReceipts = form.contractId 
                      ? allReceipts.filter(r => r.contractId === form.contractId)
                      : allReceipts;
                    return filteredReceipts.map((receipt, index) => (
                      <tr key={receipt.id || index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{receipt.transactionNumber}</td>
                        <td className="border border-gray-300 px-3 py-2">{formatPersianDate(receipt.receiptDate)}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.productName}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.siteName}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.tankName}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.contractNumber || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.receiptBasisName || receipt.receiptBasis || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{formatPersianNumber(receipt.receiptBasisAmount)}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.counterpartyName || receipt.customerCounterpartyName || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.shipName || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.cotageNumber || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.indexNumber || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.driverName || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">
                          <button
                            onClick={() => {
                              handleFormChange(type, 'productId', receipt.productId);
                              handleFormChange(type, 'siteId', receipt.siteId);
                              handleFormChange(type, 'tankId', receipt.tankId);
                              handleFormChange(type, 'contractId', receipt.contractId);
                              if (receipt.customerCompanyId) {
                                handleFormChange(type, 'customerCompanyId', receipt.customerCompanyId);
                              }
                              if (receipt.companyId) {
                                handleFormChange(type, 'companyId', receipt.companyId);
                              }
                              if (receipt.locationId) {
                                handleFormChange(type, 'locationId', receipt.locationId);
                              }
                              if (receipt.driverId) {
                                handleFormChange(type, 'driverId', receipt.driverId);
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                          >
                            انتخاب
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
              {(() => {
                const allReceipts = getAllConsignmentReceipts();
                const filteredReceipts = form.contractId 
                  ? allReceipts.filter(r => r.contractId === form.contractId)
                  : allReceipts;
                return filteredReceipts.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    {form.contractId 
                      ? 'هیچ رسید انباری برای این قرارداد یافت نشد'
                      : 'هیچ رسید انبار امانی یافت نشد'}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* جدول رسیدهای انبار امانی برای اضافه انبار */}
        {type === 'addition' && form.productType === 'consignment' && showConsignmentAdditionReceiptsTable && (
          <div className="mt-6 bg-white rounded-lg border border-gray-300 p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              رسیدهای انبار امانی
              {form.contractId && (
                <span className="text-sm font-normal text-gray-600 mr-2">
                  (فیلتر شده بر اساس قرارداد: {contracts.find(c => c.id === form.contractId)?.contractNumber || ''})
                </span>
              )}
            </h4>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-right">شماره تراکنش</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">تاریخ رسید</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">محصول</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">سایت</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">مخزن</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">قرارداد</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">مبنای رسید</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">مقدار مبنای رسید (کیلوگرم)</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">طرف حساب</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">کشتی</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">کوتاژ</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">ایندکس</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">راننده</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allReceipts = getAllConsignmentReceipts();
                    const filteredReceipts = form.contractId 
                      ? allReceipts.filter(r => r.contractId === form.contractId)
                      : allReceipts;
                    return filteredReceipts.map((receipt, index) => (
                      <tr key={receipt.id || index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{receipt.transactionNumber}</td>
                        <td className="border border-gray-300 px-3 py-2">{formatPersianDate(receipt.receiptDate)}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.productName}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.siteName}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.tankName}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.contractNumber || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.receiptBasisName || receipt.receiptBasis || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{formatPersianNumber(receipt.receiptBasisAmount)}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.counterpartyName || receipt.customerCounterpartyName || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.shipName || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.cotageNumber || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.indexNumber || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">{receipt.driverName || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2">
                          <button
                            onClick={() => {
                              handleFormChange(type, 'productId', receipt.productId);
                              handleFormChange(type, 'siteId', receipt.siteId);
                              handleFormChange(type, 'tankId', receipt.tankId);
                              handleFormChange(type, 'contractId', receipt.contractId);
                              if (receipt.customerCompanyId) {
                                handleFormChange(type, 'customerCompanyId', receipt.customerCompanyId);
                              }
                              if (receipt.companyId) {
                                handleFormChange(type, 'companyId', receipt.companyId);
                              }
                              if (receipt.locationId) {
                                handleFormChange(type, 'locationId', receipt.locationId);
                              }
                              if (receipt.driverId) {
                                handleFormChange(type, 'driverId', receipt.driverId);
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                          >
                            انتخاب
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
              {(() => {
                const allReceipts = getAllConsignmentReceipts();
                const filteredReceipts = form.contractId 
                  ? allReceipts.filter(r => r.contractId === form.contractId)
                  : allReceipts;
                return filteredReceipts.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    {form.contractId 
                      ? 'هیچ رسید انباری برای این قرارداد یافت نشد'
                      : 'هیچ رسید انبار امانی یافت نشد'}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        
        <div className="mt-4">
          {canCreate('inventory_adjustment') && (
            <button
              onClick={handleSubmit}
              className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 ${
                type === 'deduction' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {icon}
              {title}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!editingId) return null;
    
    const adjustment = adjustments.find(adj => adj.id === editingId);
    if (!adjustment) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">ویرایش سند {adjustment.adjustmentType === 'deduction' ? 'کسری' : 'اضافه'} انبار</h3>
            <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* تاریخ سند */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ سند</label>
              <input
                type="date"
                value={editForm.documentDate || ''}
                onChange={(e) => setEditForm({...editForm, documentDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* نوع محصول */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع محصول</label>
              <select
                value={editForm.productType || ''}
                onChange={(e) => setEditForm({...editForm, productType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="owned">تملیکی</option>
                <option value="consignment">امانی</option>
              </select>
            </div>
            
            {/* محصول */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">محصول</label>
              <select
                value={editForm.productId || ''}
                onChange={(e) => setEditForm({...editForm, productId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">انتخاب کنید</option>
                {baseData[editForm.productType === 'owned' ? 'owned-products' : 'consignment-products']?.map((product: any) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            
            {/* سایت */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">سایت</label>
              <select
                value={editForm.siteId || ''}
                onChange={(e) => setEditForm({...editForm, siteId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">انتخاب کنید</option>
                {baseData.sites?.map((site: any) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            
            {/* مخزن */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">مخزن</label>
              <select
                value={editForm.tankId || ''}
                onChange={(e) => setEditForm({...editForm, tankId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">انتخاب کنید</option>
                {baseData.tanks?.map((tank: any) => (
                  <option key={tank.id} value={tank.id}>{tank.name}</option>
                ))}
              </select>
            </div>
            
            {/* شرکت طرف حساب */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">شرکت طرف حساب</label>
              <select
                value={editForm.companyId || ''}
                onChange={(e) => setEditForm({...editForm, companyId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">انتخاب کنید</option>
                {baseData.companies?.map((company: any) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            
            {/* مقدار */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">مقدار (کیلوگرم)</label>
              <input
                type="number"
                min="1"
                value={editForm.quantity || ''}
                onChange={(e) => setEditForm({...editForm, quantity: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* وضعیت */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">وضعیت</label>
              <select
                value={editForm.status || ''}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="temporary">موقت</option>
                <option value="printed">چاپ شده</option>
                <option value="attached">ضمیمه شده</option>
                <option value="finalized">نهایی شده</option>
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex gap-2">
            {canEdit('inventory_adjustment') && (
              <button
                onClick={() => saveAdjustment(adjustment.adjustmentType, true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ذخیره تغییرات
              </button>
            )}
            <button
              onClick={() => setEditingId(null)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleExportToExcel = () => {
    try {
      // ایجاد جدول HTML برای اکسل - با فرمت ستونی درست
      const tableRows = adjustments.map(adj => `
        <tr>
          <td>${adj.transactionNumber || ''}</td>
          <td>${new Date(adj.documentDate).toLocaleDateString('fa-IR')}</td>
          <td>${adj.adjustmentType === 'deduction' ? 'کسری' : 'اضافه'}</td>
          <td>${adj.productName}</td>
          <td>${adj.productType === 'owned' ? 'تملیکی' : 'امانی'}</td>
          <td>${adj.siteName}</td>
          <td>${adj.tankName}</td>
          <td>${adj.companyName}</td>
          <td>${adj.locationName}</td>
          <td>${adj.driverName || '-'}</td>
          <td>${adj.contractNumber || '-'}</td>
          <td>${adj.quantity.toLocaleString('fa-IR')}</td>
          <td>${adj.status === 'temporary' ? 'موقت' : 
                adj.status === 'printed' ? 'چاپ شده' : 
                adj.status === 'attached' ? 'ضمیمه شده' : 'نهایی شده'}</td>
          <td>${new Date(adj.createdAt).toLocaleDateString('fa-IR')}</td>
          <td>${new Date(adj.updatedAt).toLocaleDateString('fa-IR')}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html xmlns:x="urn:schemas-microsoft-com:office:excel" dir="rtl">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <style>
              table {
                border-collapse: collapse;
                width: 100%;
                font-family: Tahoma, Arial;
                direction: rtl;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: center;
                white-space: nowrap;
              }
              th {
                background-color: #4CAF50;
                color: white;
                font-weight: bold;
              }
              tr:nth-child(even) {
                background-color: #f2f2f2;
              }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  <th>شماره تراکنش</th>
                  <th>تاریخ سند</th>
                  <th>نوع</th>
                  <th>نام محصول</th>
                  <th>نوع محصول</th>
                  <th>سایت</th>
                  <th>مخزن</th>
                  <th>شرکت</th>
                  <th>محل</th>
                  <th>راننده</th>
                  <th>شماره قرارداد</th>
                  <th>مقدار (کیلوگرم)</th>
                  <th>وضعیت</th>
                  <th>تاریخ ایجاد</th>
                  <th>تاریخ به‌روزرسانی</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `;
      
      // اضافه کردن BOM برای نمایش صحیح حروف فارسی در اکسل
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `گزارش_تراکنش_انبار_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('فایل اکسل با موفقیت دانلود شد');
    } catch (error) {
      console.error('خطا در خروجی اکسل:', error);
      alert('خطا در ایجاد فایل اکسل');
    }
  };

  // مودال تقویم برای فیلترهای تاریخ و فرم‌ها
  const renderDatePickerModal = (
    isOpen: boolean, 
    onClose: () => void, 
    value: Date | null, 
    onChange: (date: Date | null) => void,
    title: string
  ) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="mb-4">
            <PersianDatePicker
              value={value || new Date()}
              onChange={(date) => {
                onChange(date);
              }}
              placeholder="انتخاب تاریخ"
              isFloating={false}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                onChange(new Date());
              }}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              امروز
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              تایید
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionsReport = () => {
    // فیلتر کردن تراکنش‌ها بر اساس جستجو
    // نمایش همه تراکنش‌های کسر و اضافه انبار
    let searchFilteredAdjustments = [...adjustments];
    
    console.log('📊 گزارش تراکنش‌ها - تعداد کل تراکنش‌ها:', adjustments.length);
    console.log('📊 تراکنش‌های کسر انبار:', adjustments.filter(a => a.adjustmentType === 'deduction').length);
    console.log('📊 تراکنش‌های اضافه انبار:', adjustments.filter(a => a.adjustmentType === 'addition').length);
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      searchFilteredAdjustments = searchFilteredAdjustments.filter(adj => {
        // جستجو در تمام فیلدهای جدول گزارش تراکنش‌ها
        const typeLabel = adj.adjustmentType === 'deduction' ? 'سند کسر انبار' : 'سند اضافه انبار';
        const productTypeLabel = adj.productType === 'owned' ? 'تملیکی' : 'امانی';
        const statusLabel = adj.status === 'temporary' ? 'موقت' : 
                           adj.status === 'printed' ? 'چاپ شده' : 
                           adj.status === 'attached' ? 'ضمیمه شده' : 'نهایی شده';
        const dateStr = formatPersianDate(adj.documentDate);
        const quantityStr = adj.quantity.toString();
        
        return (
          // شماره تراکنش
          (adj.transactionNumber?.toLowerCase().includes(searchLower)) ||
          // تاریخ سند
          dateStr.includes(searchTerm) ||
          // نوع (کسری/اضافه)
          typeLabel.includes(searchTerm) ||
          adj.adjustmentType.toLowerCase().includes(searchLower) ||
          // نام محصول
          adj.productName.toLowerCase().includes(searchLower) ||
          // نوع محصول (تملیکی/امانی)
          productTypeLabel.includes(searchTerm) ||
          adj.productType.toLowerCase().includes(searchLower) ||
          // سایت
          adj.siteName.toLowerCase().includes(searchLower) ||
          // مخزن
          adj.tankName.toLowerCase().includes(searchLower) ||
          // شرکت
          adj.companyName.toLowerCase().includes(searchLower) ||
          // محل
          adj.locationName.toLowerCase().includes(searchLower) ||
          // راننده
          (adj.driverName?.toLowerCase().includes(searchLower)) ||
          // شماره قرارداد
          (adj.contractNumber?.toLowerCase().includes(searchLower)) ||
          // مقدار
          quantityStr.includes(searchTerm) ||
          // وضعیت
          statusLabel.includes(searchTerm) ||
          adj.status.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // فیلتر کردن تراکنش‌ها بر اساس فیلترهای تاریخ
    let filteredAdjustments = [...searchFilteredAdjustments];
    
    if (dateFilters.fromDate) {
      filteredAdjustments = filteredAdjustments.filter(adj => {
        const adjDate = new Date(adj.documentDate);
        // تنظیم ساعت به ابتدای روز برای مقایسه دقیق
        adjDate.setHours(0, 0, 0, 0);
        const fromDate = new Date(dateFilters.fromDate || new Date());
        fromDate.setHours(0, 0, 0, 0);
        return adjDate >= fromDate;
      });
    }
    
    if (dateFilters.toDate) {
      filteredAdjustments = filteredAdjustments.filter(adj => {
        const adjDate = new Date(adj.documentDate);
        // تنظیم ساعت به انتهای روز برای شامل شدن کل روز
        adjDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateFilters.toDate || new Date());
        toDate.setHours(23, 59, 59, 999);
        return adjDate <= toDate;
      });
    }
    
    return (
      <>
        {/* مودال تقویم از تاریخ */}
        {renderDatePickerModal(
          showFromDateModal,
          () => setShowFromDateModal(false),
          dateFilters.fromDate,
          (date) => setDateFilters({...dateFilters, fromDate: date}),
          'انتخاب تاریخ شروع'
        )}
        
        {/* مودال تقویم تا تاریخ */}
        {renderDatePickerModal(
          showToDateModal,
          () => setShowToDateModal(false),
          dateFilters.toDate,
          (date) => setDateFilters({...dateFilters, toDate: date}),
          'انتخاب تاریخ پایان'
        )}
        
        {/* فیلد جستجو بالای جدول گزارش تراکنش‌ها */}
        <div className="mt-8 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="relative max-w-md">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="جستجو در تمام فیلدهای گزارش تراکنش‌ها..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {searchTerm && (
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="پاک کردن جستجو"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">گزارش تراکنش‌ها</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTransactionTableMinimized(!isTransactionTableMinimized)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {isTransactionTableMinimized ? (
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
                <button 
                  onClick={handleExportToExcel}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  خروجی اکسل
                </button>
              </div>
            </div>
          
          {/* فیلترهای تاریخ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline ml-1" />
                از تاریخ
              </label>
              <div
                onClick={() => setShowFromDateModal(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                {dateFilters.fromDate ? (
                  <span className="text-gray-900">{formatPersianDate(dateFilters.fromDate)}</span>
                ) : (
                  <span className="text-gray-400">انتخاب تاریخ شروع</span>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline ml-1" />
                تا تاریخ
              </label>
              <div
                onClick={() => setShowToDateModal(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                {dateFilters.toDate ? (
                  <span className="text-gray-900">{formatPersianDate(dateFilters.toDate)}</span>
                ) : (
                  <span className="text-gray-400">انتخاب تاریخ پایان</span>
                )}
              </div>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setDateFilters({ fromDate: null, toDate: null })}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                پاک کردن فیلتر
              </button>
            </div>
          </div>
        </div>
        
        {/* جدول تراکنش‌ها */}
        {!isTransactionTableMinimized && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره تراکنش</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ سند</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع محصول</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصول</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سایت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مخزن</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">قرارداد</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شرکت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طرف حساب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">لوکیشن</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">راننده</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار (کیلوگرم)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAdjustments.map((adjustment, index) => (
                <tr key={adjustment.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600 font-medium">
                    {adjustment.transactionNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPersianDate(adjustment.documentDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      adjustment.adjustmentType === 'deduction' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {adjustment.adjustmentType === 'deduction' ? 'سند کسر انبار' : 'سند اضافه انبار'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      adjustment.productType === 'owned' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {adjustment.productType === 'owned' ? 'تملیکی' : 'امانی'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 text-gray-400 ml-2" />
                      <span className="text-sm font-medium text-gray-900">{adjustment.productName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Warehouse className="h-4 w-4 text-gray-400 ml-2" />
                      <span className="text-sm text-gray-900">{adjustment.siteName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {adjustment.tankName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {adjustment.contractNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {adjustment.companyName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {adjustment.customerCompanyName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {adjustment.locationName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {adjustment.driverName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatPersianNumber(adjustment.quantity)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(adjustment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {canEdit('inventory_adjustment') && (
                        <button
                          onClick={() => handleEdit(adjustment)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete('inventory_adjustment') && (
                        <button
                          onClick={() => handleDelete(adjustment.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleAttach(adjustment.id)}
                        disabled={adjustment.status !== 'temporary'}
                        className={`p-1 rounded transition-colors ${
                          adjustment.status === 'temporary' 
                            ? 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50' 
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                        title="ضمیمه فایل"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePrint(adjustment.id)}
                        disabled={adjustment.status !== 'attached'}
                        className={`p-1 rounded transition-colors ${
                          adjustment.status === 'attached' 
                            ? 'text-purple-600 hover:text-purple-800 hover:bg-purple-50' 
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                        title="پرینت (فقط پس از ضمیمه)"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleFinalize(adjustment.id)}
                        disabled={adjustment.status !== 'printed'}
                        className={`p-1 rounded transition-colors ${
                          adjustment.status === 'printed' 
                            ? 'text-green-600 hover:text-green-800 hover:bg-green-50' 
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                        title="نهایی سازی"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleQuickFinalize(adjustment.id)}
                        disabled={adjustment.status !== 'temporary'}
                        className={`px-2 py-1 rounded text-xs transition-colors border ${
                          adjustment.status === 'temporary'
                            ? 'text-green-700 border-green-600 hover:bg-green-50'
                            : 'text-gray-400 border-gray-300 cursor-not-allowed'
                        }`}
                        title="قطعی کردن"
                      >
                        قطعی کردن
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        
        {filteredAdjustments.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">تراکنشی یافت نشد</h3>
            <p className="text-gray-600">
              با فیلترهای انتخاب شده، هیچ تراکنشی یافت نشد.
            </p>
          </div>
        )}
        </div>
      </>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _renderInventoryReport = () => {
    console.log('Rendering inventory report with data:', inventoryReport);
    
    // گروه‌بندی موجودی بر اساس سایت و مخزن برای نمایش تفکیکی
    const groupedInventory = inventory.reduce((groups: any, item) => {
      const key = `${item.siteName}-${item.tankName}`;
      if (!groups[key]) {
        groups[key] = {
          siteName: item.siteName,
          tankName: item.tankName,
          owned: { quantity: 0, items: [] },
          consignment: { quantity: 0, items: [] }
        };
      }
      
      if (item.productType === 'owned') {
        groups[key].owned.quantity += item.quantity;
        groups[key].owned.items.push(item);
      } else {
        groups[key].consignment.quantity += item.quantity;
        groups[key].consignment.items.push(item);
      }
      
      return groups;
    }, {});
    
    const sortedGroups = Object.values(groupedInventory).sort((a: any, b: any) => {
      // مرتب‌سازی بر اساس نام سایت
      if (a.siteName !== b.siteName) {
        return a.siteName.localeCompare(b.siteName, 'fa');
      }
      // سپس بر اساس نام مخزن
      return a.tankName.localeCompare(b.tankName, 'fa');
    });
    
    return (
      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">گزارش موجودی انبار</h3>
            </div>
            <div className="text-sm text-gray-600">
              {sortedGroups.length} مخزن در {new Set(Object.values(groupedInventory).map((g: any) => g.siteName)).size} سایت
            </div>
          </div>
        </div>
        
        {/* جدول گزارش تفکیکی */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سایت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مخزن</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع محصول</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصولات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">موجودی (کیلوگرم)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">موجودی (تن)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedGroups.map((group: any, index) => (
                <>
                  {/* ردیف تملیکی */}
                  <tr key={`${group.siteName}-${group.tankName}-owned`} className={`hover:bg-blue-50 ${index % 2 === 0 ? 'bg-blue-25' : 'bg-blue-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Warehouse className="h-4 w-4 text-blue-400 ml-2" />
                        <span className="text-sm font-medium text-blue-900">{group.siteName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-blue-400 ml-2" />
                        <span className="text-sm text-blue-900 font-medium">{group.tankName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        تملیکی
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-blue-900">
                        {group.owned.items.length > 0 ? (
                          group.owned.items.map((item: any, i: number) => (
                            <div key={i} className="font-medium">
                              {item.productName}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">بدون موجودی</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-blue-600">
                        {formatPersianNumber(group.owned.quantity)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-500">
                        {formatPersianNumber(group.owned.quantity / 1000)}
                      </span>
                    </td>
                  </tr>
                  
                  {/* ردیف امانی */}
                  <tr key={`${group.siteName}-${group.tankName}-consignment`} className={`hover:bg-purple-50 ${index % 2 === 0 ? 'bg-purple-25' : 'bg-purple-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Warehouse className="h-4 w-4 text-purple-400 ml-2" />
                        <span className="text-sm font-medium text-purple-900">{group.siteName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-purple-400 ml-2" />
                        <span className="text-sm text-purple-900 font-medium">{group.tankName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        امانی
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-purple-900">
                        {group.consignment.items.length > 0 ? (
                          group.consignment.items.map((item: any, i: number) => (
                            <div key={i} className="font-medium">
                              {item.productName}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">بدون موجودی</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-purple-600">
                        {formatPersianNumber(group.consignment.quantity)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-purple-500">
                        {formatPersianNumber(group.consignment.quantity / 1000)}
                      </span>
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* خلاصه کل */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatPersianNumber(
                  Object.values(groupedInventory).reduce((sum: number, group: any) => sum + group.owned.quantity, 0)
                )}
              </div>
              <div className="text-sm text-gray-600">مجموع موجودی تملیکی (کیلوگرم)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatPersianNumber(
                  Object.values(groupedInventory).reduce((sum: number, group: any) => sum + group.consignment.quantity, 0)
                )}
              </div>
              <div className="text-sm text-gray-600">مجموع موجودی امانی (کیلوگرم)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatPersianNumber(
                  Object.values(groupedInventory).reduce((sum: number, group: any) => 
                    sum + group.owned.quantity + group.consignment.quantity, 0
                  )
                )}
              </div>
              <div className="text-sm text-gray-600">مجموع کل موجودی (کیلوگرم)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {Object.values(groupedInventory).reduce((sum: number, group: any) => 
                  sum + group.owned.items.length + group.consignment.items.length, 0
                )}
              </div>
              <div className="text-sm text-gray-600">تعداد کل اقلام</div>
            </div>
          </div>
        </div>
        
        {sortedGroups.length === 0 && (
          <div className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">موجودی یافت نشد</h3>
            <p className="text-gray-600">
              در حال حاضر هیچ موجودی در انبار ثبت نشده است.
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">در حال بارگذاری داده‌ها...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  console.log('Rendering component with state:', {
    baseData: Object.keys(baseData),
    contracts: contracts.length,
    inventory: inventory.length,
    adjustments: adjustments.length
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">کسر/اضافه انبار</h1>
            <p className="text-gray-600">مدیریت موجودی انبار و ثبت اسناد کسر و اضافه</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                // loadBaseData() is not defined, using baseData from props instead
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
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        {/* هشدار تاریخ - کپی شده از WarehouseDeliveryManager */}
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
            {/* فیلترهای گزارش موجودی - کپی شده از WarehouseDeliveryManager */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline ml-1" />
              تا تاریخ
            </label>
            <PersianDatePicker
              value={upToDate}
              onChange={(date) => setUpToDate(date || new Date())}
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

            {/* جداول موجودی مخازن - انتقال به بالای فرم‌ها */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Table 6: موجودی مخازن امانی و تملیکی */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden lg:col-span-2">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
              <h2 className="text-xl font-semibold">موجودی مخازن امانی و تملیکی</h2>
            </div>
            <div className="p-4 space-y-4">
              {/* نتایج محاسبات */}
              <div className="bg-gray-50 rounded-lg p-4">
                {(() => {
                  // استفاده از فیلترهای انتخاب شده برای محاسبه موجودی
                  const inventory = calculateConsignmentOwnedTanksInventory(selectedSiteForFilter || undefined, selectedTankForFilter || undefined);
                  // محاسبه ظرفیت کل بر اساس فیلترهای انتخاب شده
                  const totalCapacity = calculateTotalTankCapacity(selectedSiteForFilter || undefined, selectedTankForFilter || undefined);
                  // محاسبه ظرفیت خالی: ظرفیت - موجودی نهایی
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
                      {/* ظرفیت مخازن */}
                      <div className="flex justify-between text-lg font-bold text-blue-900 col-span-full">
                        <span>ظرفیت مخازن:</span>
                        <span>{formatPersianNumber(totalCapacity)}</span>
                      </div>
                      {/* موجودی نهایی */}
                      <div className="flex justify-between text-lg font-bold text-green-900 col-span-full">
                        <span>موجودی نهایی (امانی + تملیکی):</span>
                        <span>{formatPersianNumber(inventory.finalInventory)}</span>
                      </div>
                      {/* ظرفیت خالی مخازن */}
                      <div className="flex justify-between text-lg font-bold text-orange-900 col-span-full">
                        <span>ظرفیت خالی مخازن:</span>
                        <span>{formatPersianNumber(emptyCapacity)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Table 7: موجودی مخازن امانی */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
              <h2 className="text-xl font-semibold">موجودی مخازن امانی</h2>
            </div>
            <div className="p-4">
              {(() => {
                const inventory = calculateConsignmentTanksInventory();
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

          {/* Table 8: موجودی مخازن تملیکی */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
              <h2 className="text-xl font-semibold">موجودی مخازن تملیکی</h2>
            </div>
            <div className="p-4">
              {(() => {
                const inventory = calculateOwnedTanksInventory();
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

        {/* راهنمای عملیاتی */}
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-800 mb-1">راهنمای ارتباط بین فرم‌ها</h4>
              <div className="text-amber-700 text-sm space-y-1">
                <p>• زمانی که در یک فرم نوع محصول "امانی" انتخاب می‌کنید، اطلاعات قرارداد در قسمت بالا نمایش داده می‌شود</p>
                <p>• فلش‌های آبی رنگ ارتباط بین اطلاعات قرارداد و فرم‌ها را نشان می‌دهند</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* جدول اطلاعات قرارداد انتخاب شده */}
        {renderContractInfoTable()}
        
        {/* جدول اطلاعات امانی مرتبط با قرارداد انتخاب شده */}
        {renderConsignmentRelatedTable()}
        
        {/* فرم‌های کسر و اضافه انبار */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {renderFormSection('deduction')}
          {renderFormSection('addition')}
        </div>
        
        {/* پیام پرینت */}
        {showPrintMessage && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">پیام سیستم</h3>
            </div>
            <p className="text-yellow-700">
              لطفا پرینت تایید شده سند کسر یا اضافه انبار را ضمیمه فرمایید
            </p>
            <div className="mt-2">
              <button
                onClick={() => setShowPrintMessage(null)}
                className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
        
        {/* گزارش تراکنش‌ها */}
        {renderTransactionsReport()}
        
        {/* مودال ویرایش */}
        {renderEditModal()}
      </div>
    </div>
  );
};//