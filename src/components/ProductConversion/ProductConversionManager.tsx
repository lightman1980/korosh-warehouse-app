import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RefreshCw, Search, Save, X, AlertCircle, Calendar, Package, Warehouse, FileText, 
  Edit2, Trash2, Printer, Download, ArrowLeft, Truck, Building2, Clock, Minus, Plus, CheckCircle,
  Minimize2, Maximize2
} from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { PersianDatePicker } from '../Common/PersianDatePicker';
import { DataStorage } from '../../utils/dataStorage';
import { usePermissions } from '../../hooks/usePermissions';
import { logUserActivity } from '../../utils/logger';
import jalaali from 'jalaali-js';

interface ProductConversion {
  id: string;
  transactionNumber: string; // شماره تراکنش با فرمت C-تاریخ-6رقم
  documentDate: Date;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  // کالای مصرفی
  consumedProductType: 'owned' | 'consignment';
  consumedProductId: string;
  consumedProductName: string;
  consumedQuantity: number;
  consumedUnit: string;
  // کالای تولیدی
  producedProductType: 'owned' | 'consignment';
  producedProductId: string;
  producedProductName: string;
  producedQuantity: number;
  producedUnit: string;
  // قرارداد (فقط برای امانی)
  contractId?: string;
  contractNumber?: string;
  emptyTankCapacity: number; // ظرفیت خالی مخزن در زمان ثبت
  status: 'temporary' | 'printed' | 'attached' | 'finalized';
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// داده‌های پیش‌فرض
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
    { id: 'tankA', name: 'مخزن A', capacity: '5,000,000 کیلوگرم' },
    { id: 'tankB', name: 'مخزن B', capacity: '3,000,000 کیلوگرم' },
  ],
  'units': [
    { id: 'kg', name: 'کیلوگرم' },
    { id: 'ton', name: 'تن' },
    { id: 'liter', name: 'لیتر' },
  ],
};

const defaultContracts = [
  {
    id: '1',
    contractNumber: 'CON-001-1404',
    siteId: 'site1',
    siteName: 'سايت مخازن انزلي',
    tankId: 'tankA',
    tankName: 'مخزن A',
    isActive: true,
  },
];

export const ProductConversionManager: React.FC = () => {
  const storage = DataStorage.getInstance();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [documentDate, setDocumentDate] = useState<Date>(new Date());
  const [conversions, setConversions] = useState<ProductConversion[]>([]);
  const [baseData, setBaseData] = useState<Record<string, any[]>>(defaultBaseData);
  const [contracts, setContracts] = useState<any[]>(defaultContracts);
  
  // تابع برای بازگشت به صفحه اصلی
  const handleBackToMain = () => {
    window.location.hash = '#/dashboard';
    window.location.reload();
  };
  
  // فرم تبدیل کالا
  const [form, setForm] = useState<Record<string, any>>({
    siteId: '',
    tankId: '',
    consumedProductType: '',
    consumedProductId: '',
    consumedQuantity: 0,
    consumedUnit: 'kg',
    producedProductType: '',
    producedProductId: '',
    producedQuantity: 0,
    producedUnit: 'kg',
    contractId: '',
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedContractInfo, setSelectedContractInfo] = useState<any>(null);
  
  // State های اضافی از InventoryAdjustmentManager
  const [selectedTankForFilter, setSelectedTankForFilter] = useState<string>('');
  const [selectedSiteForFilter, setSelectedSiteForFilter] = useState<string>('');
  const [upToDate, setUpToDate] = useState<Date>(new Date());
  const [showConsignmentRelatedTable, setShowConsignmentRelatedTable] = useState<boolean>(false);
  const [showInventoryPackage, setShowInventoryPackage] = useState<boolean>(true); // اضافه شده: نمایش پکیج موجودی
  const [isConversionTableMinimized, setIsConversionTableMinimized] = useState<boolean>(false); // اضافه شده: حالت minimize/maximize جدول

  // بارگذاری داده‌ها
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(() => {
    try {
      
      // بارگذاری داده‌های پایه
      const savedBaseData = storage.loadData('baseDataCategories');
      if (savedBaseData && Array.isArray(savedBaseData)) {
        const baseDataMap: Record<string, any[]> = {};
        savedBaseData.forEach((category: any) => {
          if (category && category.id && Array.isArray(category.items)) {
            baseDataMap[category.id] = category.items;
          }
        });
        // اطمینان از وجود tanks در baseDataMap
        if (!baseDataMap.tanks || baseDataMap.tanks.length === 0) {
          baseDataMap.tanks = defaultBaseData.tanks;
        }
        setBaseData({ ...defaultBaseData, ...baseDataMap });
      } else {
        setBaseData(defaultBaseData);
      }
      
      // بارگذاری قراردادها
      const savedContracts = storage.loadData('contracts');
      if (savedContracts && Array.isArray(savedContracts) && savedContracts.length > 0) {
        setContracts(savedContracts);
      } else {
        setContracts(defaultContracts);
      }
      
      // بارگذاری تبدیل‌های کالا
      const savedConversions = storage.loadData('productConversions');
      const conversionsArray = Array.isArray(savedConversions) ? savedConversions : [];
      const validConversions = conversionsArray
        .filter((c: any) => c && typeof c === 'object' && !c.isVoided)
        .map((c: any) => ({
          ...c,
          documentDate: c.documentDate ? new Date(c.documentDate) : new Date(),
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
        }));
      setConversions(validConversions);
    } catch (error) {
      console.error('خطا در بارگذاری داده‌ها:', error);
      setConversions([]);
    }
  }, [storage]);

  // تبدیل تاریخ میلادی به شمسی برای شماره تراکنش
  const toPersianDate = useCallback((date: Date) => {
    const j = jalaali.toJalaali(date);
    const j_year = j.jy.toString();
    const j_month = (j.jm + 1).toString().padStart(2, '0');
    const j_day = j.jd.toString().padStart(2, '0');
    return j_year + j_month + j_day;
  }, []);

  // تولید شماره تراکنش با فرمت C-تاریخ-6رقم
  const generateTransactionNumber = useCallback((date: Date): string => {
    const persianDate = toPersianDate(date);
    const existingConversionsData = storage.loadData('productConversions');
    const existingConversions = Array.isArray(existingConversionsData) ? existingConversionsData : [];
    const existingNumbers = existingConversions
      .filter((c: any) => c.transactionNumber && c.transactionNumber.startsWith(`C-${persianDate}-`))
      .map((c: any) => {
        const parts = c.transactionNumber.split('-');
        return parseInt(parts[2] || '0', 10);
      })
      .filter((n: number) => !isNaN(n));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const sequenceNumber = (maxNumber + 1).toString().padStart(6, '0');
    
    return `C-${persianDate}-${sequenceNumber}`;
  }, [toPersianDate, storage]);

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
  // Helper function to calculate total tank capacity based on filters - مشابه InventoryAdjustmentManager
  // توجه: این تابع فقط از فیلترهای جداول موجودی استفاده می‌کند و از فرم تبدیل کالا استفاده نمی‌کند
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
      const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, ''), 10) : 5000000;
      totalCapacity += capacity;
    });
    return totalCapacity;
  }, [baseData.tanks, selectedSiteForFilter, selectedTankForFilter]);

  // منحصربه‌فرد مخازن و سایت‌ها برای فیلترها
  const uniqueTanks = useMemo(() => {
    const tankMap = new Map<string, string>();
    const allReceipts = storage.loadData('receipts');
    const receiptsArray = Array.isArray(allReceipts) ? allReceipts : [];
    receiptsArray.forEach((receipt: any) => {
      if (receipt && receipt.tankId && receipt.tankName && !receipt.isVoided) {
        tankMap.set(receipt.tankId, receipt.tankName);
      }
    });
    return Array.from(tankMap.entries());
  }, [storage]);

  const uniqueSites = useMemo(() => {
    const siteMap = new Map<string, string>();
    const allReceipts = storage.loadData('receipts');
    const receiptsArray = Array.isArray(allReceipts) ? allReceipts : [];
    receiptsArray.forEach((receipt: any) => {
      if (receipt && receipt.siteId && receipt.siteName && !receipt.isVoided) {
        siteMap.set(receipt.siteId, receipt.siteName);
      }
    });
    return Array.from(siteMap.entries());
  }, [storage]);

  // Calculate owned tanks inventory based on user formula
  const calculateOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن تملیکی:', { siteId, tankId });
    
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

  // Calculate consignment tanks inventory
  const calculateConsignmentTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن امانی:', { siteId, tankId });
    
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
    
    // تشخیص پیشرفته حواله‌های امانی - الگو از InventoryAdjustmentManager
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
    console.log('🧮 محاسبه موجودی مخازن امانی/تملیکی:', { siteId, tankId });
    
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

  // Helper function to calculate empty capacity for a specific tank - مطابق با فرمول WarehouseInventoryTable
  // فرمول: ظرفیت خالی = ظرفیت تعریف شده مخزن - (کل وارده - کل صادره)
  // ظرفیت خالی = ظرفیت کل - موجودی فعلی
  const calculateEmptyTankCapacity = useCallback((siteId: string, tankId: string) => {
    console.log('📊 محاسبه ظرفیت خالی مخزن: شروع', { siteId, tankId });
    
    if (!siteId || !tankId) {
      console.warn('⚠️ siteId یا tankId خالی است:', { siteId, tankId });
      return 0;
    }
    
    // پیدا کردن مخزن در baseData.tanks
    // ابتدا سعی می‌کنیم با siteId و tankId پیدا کنیم، سپس فقط با tankId
    let tank = baseData.tanks?.find((t: any) => {
      if (t.siteId && siteId) {
        return t.id === tankId && t.siteId === siteId;
      }
      return t.id === tankId;
    });
    
    // اگر با siteId پیدا نشد، فقط با tankId جستجو کن
    if (!tank) {
      tank = baseData.tanks?.find((t: any) => t.id === tankId);
    }
    
    if (!tank) {
      console.warn('⚠️ مخزن پیدا نشد:', { 
        siteId,
        tankId, 
        availableTanks: baseData.tanks?.map((t: any) => ({ 
          id: t.id, 
          name: t.name, 
          siteId: t.siteId,
          capacity: t.capacity 
        })) || [],
        totalTanks: baseData.tanks?.length || 0
      });
      return 0;
    }
    
    console.log('📊 مخزن پیدا شد:', {
      tankId: tank.id,
      tankName: tank.name,
      tankSiteId: tank.siteId,
      requestedSiteId: siteId,
      tankCapacity: tank.capacity,
      tankFullData: tank
    });
    
    // استخراج ظرفیت مخزن
    let capacity = 0;
    if (tank.capacity) {
      if (typeof tank.capacity === 'number') {
        capacity = tank.capacity;
      } else if (typeof tank.capacity === 'string') {
        const capacityStr = tank.capacity;
        const capacityMatch = capacityStr.match(/[\d,]+/);
        if (capacityMatch) {
          capacity = parseInt(capacityMatch[0].replace(/,/g, ''), 10);
        } else {
          console.warn('⚠️ نتوانست ظرفیت را از رشته استخراج کند:', capacityStr);
          capacity = 5000000; // مقدار پیش‌فرض
        }
      }
    } else {
      console.warn('⚠️ ظرفیت مخزن تعریف نشده است، استفاده از مقدار پیش‌فرض');
      capacity = 5000000; // مقدار پیش‌فرض
    }
    
    console.log('📊 ظرفیت استخراج شده:', {
      originalCapacity: tank.capacity,
      extractedCapacity: capacity,
      formattedCapacity: capacity.toLocaleString('fa-IR')
    });
    
    // محاسبه موجودی تجمیعی (امانی + تملیکی) برای این سایت و مخزن خاص
    const combinedInventory = calculateConsignmentOwnedTanksInventory(siteId, tankId);
    const currentInventory = combinedInventory.finalInventory || 0;
    
    console.log('📊 موجودی محاسبه شده:', {
      ownedReceipts: combinedInventory.ownedReceiptsAmount,
      ownedAdditions: combinedInventory.ownedAdditionDocuments,
      ownedDeliveries: combinedInventory.ownedDeliveries,
      ownedConsumed: combinedInventory.ownedConsumedProducts || 0,
      ownedProduced: combinedInventory.ownedProducedProducts || 0,
      consignmentReceipts: combinedInventory.consignmentReceiptsAmount,
      consignmentAdditions: combinedInventory.consignmentAdditions,
      consignmentDeliveries: combinedInventory.consignmentDeliveries,
      consignmentConsumed: combinedInventory.consignmentConsumedProducts || 0,
      consignmentProduced: combinedInventory.consignmentProducedProducts || 0,
      finalInventory: combinedInventory.finalInventory
    });
    
    // فرمول: ظرفیت خالی = ظرفیت کل - موجودی تجمیعی
    // فرمول کاربر: (ظرفیت تعریف شده در داده پایه - کل ورودی + کل خروجی = موجودی باقیمانده مخزن در آن سایت)
    const emptyCapacity = Math.max(0, capacity - currentInventory);
    
    console.log('📊 نتیجه نهایی محاسبه ظرفیت خالی:', { 
      siteId, 
      tankId, 
      tankName: tank.name,
      capacity: capacity,
      capacityFormatted: capacity.toLocaleString('fa-IR'),
      currentInventory: currentInventory,
      currentInventoryFormatted: currentInventory.toLocaleString('fa-IR'),
      emptyCapacity: emptyCapacity,
      emptyCapacityFormatted: emptyCapacity.toLocaleString('fa-IR'),
      formula: `ظرفیت (${capacity.toLocaleString('fa-IR')}) - موجودی (${currentInventory.toLocaleString('fa-IR')}) = ظرفیت خالی (${emptyCapacity.toLocaleString('fa-IR')})`
    });
    
    return emptyCapacity;
  }, [baseData.tanks, calculateConsignmentOwnedTanksInventory]);

  // محاسبه ظرفیت خالی مخزن برای کالای تملیکی با فرمول خاص
  // فرمول: ظرفیت مخزن - کل وارده‌های انجام شده + کل خروجی‌های انجام شده
  // توجه: باید هم امانی و هم تملیکی را در نظر بگیریم (مطابق با جدول موجودی مخازن)
  const calculateEmptyTankCapacityForOwned = useCallback((siteId: string, tankId: string) => {
    console.log('📊 محاسبه ظرفیت خالی مخزن برای کالای تملیکی: شروع', { siteId, tankId });
    
    if (!siteId || !tankId) {
      console.warn('⚠️ siteId یا tankId خالی است:', { siteId, tankId });
      return 0;
    }
    
    // پیدا کردن مخزن
    let tank = baseData.tanks?.find((t: any) => {
      if (t.siteId && siteId) {
        return t.id === tankId && t.siteId === siteId;
      }
      return t.id === tankId;
    });
    
    if (!tank) {
      tank = baseData.tanks?.find((t: any) => t.id === tankId);
    }
    
    if (!tank) {
      console.warn('⚠️ مخزن پیدا نشد:', { siteId, tankId });
      return 0;
    }
    
    // استخراج ظرفیت مخزن
    let capacity = 0;
    if (tank.capacity) {
      if (typeof tank.capacity === 'number') {
        capacity = tank.capacity;
      } else if (typeof tank.capacity === 'string') {
        const capacityStr = tank.capacity;
        const capacityMatch = capacityStr.match(/[\d,]+/);
        if (capacityMatch) {
          capacity = parseInt(capacityMatch[0].replace(/,/g, ''), 10);
        } else {
          capacity = 5000000; // مقدار پیش‌فرض
        }
      }
    } else {
      capacity = 5000000; // مقدار پیش‌فرض
    }
    
    // محاسبه موجودی تجمیعی (امانی + تملیکی) برای این سایت و مخزن
    const combinedInventory = calculateConsignmentOwnedTanksInventory(siteId, tankId);
    
    // کل وارده‌ها (ورودی‌ها) = تملیکی + امانی
    // تملیکی: رسیدها + سند اضافه + افزودن از محل افت + کالای تولیدی
    // امانی: رسیدها + سند اضافه + کالای تولیدی
    const totalInputs = 
      combinedInventory.ownedReceiptsAmount +
      combinedInventory.ownedAdditionDocuments +
      combinedInventory.ownedGainedAmount +
      combinedInventory.ownedProducedProducts +
      combinedInventory.consignmentReceiptsAmount +
      combinedInventory.consignmentAdditions +
      combinedInventory.consignmentProducedProducts;
    
    // کل خروجی‌ها = تملیکی + امانی
    // تملیکی: حواله‌ها + سند کسر + کالای مصرفی
    // امانی: حواله‌ها + کسر از امانی از محل افت + سند کسر + کالای مصرفی
    const totalOutputs = 
      combinedInventory.ownedDeliveries +
      combinedInventory.ownedDeductionDocuments +
      combinedInventory.ownedConsumedProducts +
      combinedInventory.consignmentDeliveries +
      combinedInventory.consignmentDeductionAmount +
      combinedInventory.consignmentDeductionDocuments +
      combinedInventory.consignmentConsumedProducts;
    
    // فرمول: ظرفیت مخزن - کل وارده‌ها + کل خروجی‌ها
    // این معادل است با: ظرفیت - موجودی نهایی
    const emptyCapacity = Math.max(0, capacity - totalInputs + totalOutputs);
    
    console.log('📊 نتیجه محاسبه ظرفیت خالی برای تملیکی:', {
      siteId,
      tankId,
      tankName: tank.name,
      capacity: capacity,
      // تملیکی
      ownedInputs: combinedInventory.ownedReceiptsAmount + combinedInventory.ownedAdditionDocuments + combinedInventory.ownedGainedAmount + combinedInventory.ownedProducedProducts,
      ownedOutputs: combinedInventory.ownedDeliveries + combinedInventory.ownedDeductionDocuments + combinedInventory.ownedConsumedProducts,
      // امانی
      consignmentInputs: combinedInventory.consignmentReceiptsAmount + combinedInventory.consignmentAdditions + combinedInventory.consignmentProducedProducts,
      consignmentOutputs: combinedInventory.consignmentDeliveries + combinedInventory.consignmentDeductionAmount + combinedInventory.consignmentDeductionDocuments + combinedInventory.consignmentConsumedProducts,
      // کل
      totalInputs: totalInputs,
      totalOutputs: totalOutputs,
      finalInventory: combinedInventory.finalInventory,
      emptyCapacity: emptyCapacity,
      formula: `ظرفیت (${capacity.toLocaleString('fa-IR')}) - وارده‌ها (${totalInputs.toLocaleString('fa-IR')}) + خروجی‌ها (${totalOutputs.toLocaleString('fa-IR')}) = ظرفیت خالی (${emptyCapacity.toLocaleString('fa-IR')})`
    });
    
    return emptyCapacity;
  }, [baseData.tanks, calculateConsignmentOwnedTanksInventory]);

  // تغییر فیلدهای فرم
  const handleFormChange = useCallback((field: string, value: any) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // اگر نوع کالای مصرفی امانی انتخاب شد، قرارداد را فعال کن
      if (field === 'consumedProductType') {
        if (value === 'consignment') {
          // فعال کردن قرارداد
          newForm.contractId = '';
          // اگر قرارداد انتخاب نشده، سایت و مخزن را پاک کن
          if (!prev.contractId) {
            newForm.siteId = '';
            newForm.tankId = '';
          }
        } else {
          // غیرفعال کردن قرارداد و پاک کردن سایت/مخزن (برای تملیکی باید دوباره انتخاب شوند)
          newForm.contractId = '';
          newForm.siteId = '';
          newForm.tankId = '';
        }
        // پاک کردن فیلدهای مرتبط
        newForm.consumedProductId = '';
        setSelectedContractInfo(null);
        setShowConsignmentRelatedTable(false);
      }
      
      // اگر نوع کالای تولیدی تغییر کرد
      if (field === 'producedProductType') {
        newForm.producedProductId = '';
        // اگر به حالت امانی تغییر کرد، سایت و مخزن را پاک کن (چون از قرارداد می‌آید)
        if (value === 'consignment') {
          newForm.siteId = '';
          newForm.tankId = '';
        }
        // اگر به حالت تملیکی تغییر کرد، سایت و مخزن را پاک کن (باید دوباره انتخاب شوند)
        if (value === 'owned') {
          newForm.siteId = '';
          newForm.tankId = '';
        }
      }
      
      // اگر قرارداد انتخاب شد، سایت و مخزن را از قرارداد بگیر
      if (field === 'contractId' && value) {
        const contract = contracts.find(c => c.id === value);
        if (contract) {
          newForm.siteId = contract.siteId || '';
          newForm.tankId = contract.tankId || '';
          setSelectedContractInfo(contract);
          setShowConsignmentRelatedTable(true);
        }
      }
      
      return newForm;
    });
  }, [contracts]);

  // اعتبارسنجی فرم
  const validateForm = useCallback((): { isValid: boolean; message?: string } => {
    if (!form.siteId) {
      return { isValid: false, message: 'لطفاً نام سایت را انتخاب کنید' };
    }
    if (!form.tankId) {
      return { isValid: false, message: 'لطفاً نام مخزن را انتخاب کنید' };
    }
    if (!form.consumedProductType) {
      return { isValid: false, message: 'لطفاً نوع کالای مصرفی را انتخاب کنید' };
    }
    if (!form.consumedProductId) {
      return { isValid: false, message: 'لطفاً نام کالای مصرفی را انتخاب کنید' };
    }
    if (!form.consumedQuantity || form.consumedQuantity <= 0) {
      return { isValid: false, message: 'لطفاً مقدار مصرفی را وارد کنید' };
    }
    if (!form.producedProductType) {
      return { isValid: false, message: 'لطفاً نوع کالای تولیدی را انتخاب کنید' };
    }
    if (!form.producedProductId) {
      return { isValid: false, message: 'لطفاً نام کالای تولیدی را انتخاب کنید' };
    }
    if (!form.producedQuantity || form.producedQuantity <= 0) {
      return { isValid: false, message: 'لطفاً مقدار تولیدی را وارد کنید' };
    }
    if (form.consumedProductType === 'consignment' && !form.contractId) {
      return { isValid: false, message: 'برای کالای امانی، لطفاً قرارداد را انتخاب کنید' };
    }
    return { isValid: true };
  }, [form]);

  // ذخیره تبدیل کالا
  const saveConversion = useCallback(() => {
    const validation = validateForm();
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    try {
      const productKey = form.consumedProductType === 'owned' ? 'owned-products' : 'consignment-products';
      const consumedProduct = baseData[productKey]?.find((p: any) => p.id === form.consumedProductId);
      
      const producedProductKey = form.producedProductType === 'owned' ? 'owned-products' : 'consignment-products';
      const producedProduct = baseData[producedProductKey]?.find((p: any) => p.id === form.producedProductId);
      
      const site = baseData.sites?.find((s: any) => s.id === form.siteId);
      const tank = baseData.tanks?.find((t: any) => t.id === form.tankId);
      const contract = contracts.find((c: any) => c.id === form.contractId);

      const emptyCapacity = calculateEmptyTankCapacity(form.siteId, form.tankId);

      const conversion: ProductConversion = {
        id: editingId || `conv_${Date.now()}`,
        transactionNumber: editingId && editForm.transactionNumber 
          ? editForm.transactionNumber 
          : generateTransactionNumber(documentDate),
        documentDate: documentDate,
        siteId: form.siteId,
        siteName: site?.name || '',
        tankId: form.tankId,
        tankName: tank?.name || '',
        consumedProductType: form.consumedProductType,
        consumedProductId: form.consumedProductId,
        consumedProductName: consumedProduct?.name || '',
        consumedQuantity: form.consumedQuantity,
        consumedUnit: form.consumedUnit,
        producedProductType: form.producedProductType,
        producedProductId: form.producedProductId,
        producedProductName: producedProduct?.name || '',
        producedQuantity: form.producedQuantity,
        producedUnit: form.producedUnit,
        contractId: form.contractId || undefined,
        contractNumber: contract?.contractNumber || undefined,
        emptyTankCapacity: emptyCapacity,
        status: editingId && editForm.status ? (editForm.status === 'finalized' ? 'temporary' : editForm.status) : 'temporary',
        createdAt: editingId && editForm.createdAt ? new Date(editForm.createdAt) : new Date(),
        updatedAt: new Date(),
      };

      const updatedConversions = editingId
        ? conversions.map(c => c.id === editingId ? conversion : c)
        : [...conversions, conversion];
      
      storage.saveData('productConversions', updatedConversions);
      setConversions(updatedConversions);
      
        // ثبت در لاگ سیستم
        logUserActivity({
          action: `${editingId ? 'ویرایش' : 'ثبت'} تبدیل کالا: ${conversion.consumedProductName} (مقدار: ${formatPersianNumber(conversion.consumedQuantity)}) به ${conversion.producedProductName} (مقدار: ${formatPersianNumber(conversion.producedQuantity)})`,
          category: 'product-conversion',
          status: 'success',
          page: 'تبدیل کالا',
          amount: conversion.producedQuantity,
          product: `${conversion.consumedProductName} ⬅️ ${conversion.producedProductName}`,
          receiptDate: formatPersianDate(conversion.documentDate),
          documentType: 'تبدیل کالا',
          counterparty: conversion.siteName || '',
          logNature: `${editingId ? 'ویرایش' : 'ایجاد'}`,
          details: {
            transactionNumber: conversion.transactionNumber,
            consumedProduct: conversion.consumedProductName,
            consumedQuantity: conversion.consumedQuantity,
            consumedProductType: conversion.consumedProductType === 'owned' ? 'تملیکی' : 'امانی',
            producedProduct: conversion.producedProductName,
            producedQuantity: conversion.producedQuantity,
            producedProductType: conversion.producedProductType === 'owned' ? 'تملیکی' : 'امانی',
            site: conversion.siteName,
            tank: conversion.tankName,
            contractNumber: conversion.contractNumber,
            emptyTankCapacity: conversion.emptyTankCapacity
          }
        });

      // ارسال رویداد برای به‌روزرسانی موجودی
      window.dispatchEvent(new CustomEvent('productConversionsUpdated', { 
        detail: { conversion, type: editingId ? 'edit' : 'add' }
      }));

      // پاک کردن فرم
      setForm({
        siteId: '',
        tankId: '',
        consumedProductType: '',
        consumedProductId: '',
        consumedQuantity: 0,
        consumedUnit: 'kg',
        producedProductType: '',
        producedProductId: '',
        producedQuantity: 0,
        producedUnit: 'kg',
        contractId: '',
      });
      setEditingId(null);
      setEditForm({});
      setSelectedContractInfo(null);
      
      alert('تبدیل کالا با موفقیت ثبت شد');
    } catch (error) {
      console.error('خطا در ذخیره تبدیل کالا:', error);
      alert('خطا در ذخیره تبدیل کالا');
    }
  }, [form, editingId, editForm, documentDate, conversions, baseData, contracts, validateForm, generateTransactionNumber, calculateEmptyTankCapacity, storage]);

  // ویرایش
  const handleEdit = useCallback((conversion: ProductConversion) => {
    // اگر تراکنش قطعی شده است، آن را به موقت تبدیل کن
    if (conversion.status === 'finalized') {
      const updatedConversions = conversions.map(c => 
        c.id === conversion.id ? { ...c, status: 'temporary' as const, updatedAt: new Date() } : c
      );
      storage.saveData('productConversions', updatedConversions);
      setConversions(updatedConversions);
      conversion = { ...conversion, status: 'temporary' };
    }
    
    setEditingId(conversion.id);
    setEditForm({
      ...conversion,
      documentDate: conversion.documentDate,
      status: 'temporary', // همیشه به موقت تبدیل می‌شود
    });
    setForm({
      siteId: conversion.siteId,
      tankId: conversion.tankId,
      consumedProductType: conversion.consumedProductType,
      consumedProductId: conversion.consumedProductId,
      consumedQuantity: conversion.consumedQuantity,
      consumedUnit: conversion.consumedUnit,
      producedProductType: conversion.producedProductType,
      producedProductId: conversion.producedProductId,
      producedQuantity: conversion.producedQuantity,
      producedUnit: conversion.producedUnit,
      contractId: conversion.contractId || '',
    });
    setDocumentDate(conversion.documentDate);
    if (conversion.contractId) {
      const contract = contracts.find(c => c.id === conversion.contractId);
      if (contract) {
        setSelectedContractInfo(contract);
      }
    }
  }, [contracts, conversions, storage]);

  // پرینت تراکنش
  const handlePrint = useCallback((conversion: ProductConversion) => {
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('لطفاً پنجره پاپ‌آپ را فعال کنید');
        return;
      }

      const printContent = `
        <html dir="rtl">
          <head>
            <title>پرینت سند تبدیل کالا</title>
            <style>
              body {
                font-family: 'Tahoma', Arial, sans-serif;
                direction: rtl;
                margin: 20px;
                line-height: 1.6;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .header h1 {
                color: #2c3e50;
                font-size: 24px;
                margin-bottom: 10px;
              }
              .header .subtitle {
                color: #7f8c8d;
                font-size: 16px;
              }
              .info-section {
                margin-bottom: 25px;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background-color: #f9f9f9;
              }
              .info-section h3 {
                color: #2c3e50;
                font-size: 18px;
                margin-bottom: 15px;
                border-bottom: 1px solid #bdc3c7;
                padding-bottom: 5px;
              }
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
              }
              .info-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px dotted #bdc3c7;
              }
              .info-item:last-child {
                border-bottom: none;
              }
              .info-label {
                font-weight: bold;
                color: #34495e;
              }
              .info-value {
                color: #2c3e50;
              }
              .conversion-details {
                background-color: #ecf0f1;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .conversion-arrow {
                text-align: center;
                font-size: 24px;
                color: #3498db;
                margin: 15px 0;
              }
              .product-box {
                background-color: white;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #bdc3c7;
                text-align: center;
              }
              .consumed {
                border-color: #e74c3c;
                background-color: #fdf2f2;
              }
              .produced {
                border-color: #27ae60;
                background-color: #f2fdf2;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                border-top: 1px solid #bdc3c7;
                padding-top: 20px;
                color: #7f8c8d;
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>سند تبدیل کالا</h1>
              <div class="subtitle">شماره تراکنش: ${conversion.transactionNumber}</div>
            </div>

            <div class="info-section">
              <h3>اطلاعات کلی</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">تاریخ سند:</span>
                  <span class="info-value">${formatPersianDate(conversion.documentDate)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">سایت:</span>
                  <span class="info-value">${conversion.siteName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">مخزن:</span>
                  <span class="info-value">${conversion.tankName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">قرارداد:</span>
                  <span class="info-value">${conversion.contractNumber || '-'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">ظرفیت خالی مخزن:</span>
                  <span class="info-value">${conversion.emptyTankCapacity ? formatPersianNumber(conversion.emptyTankCapacity) + ' کیلوگرم' : '-'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">وضعیت:</span>
                  <span class="info-value">${
                    conversion.status === 'temporary' ? 'موقت' :
                    conversion.status === 'printed' ? 'چاپ شده' :
                    conversion.status === 'attached' ? 'ضمیمه شده' : 'نهایی شده'
                  }</span>
                </div>
              </div>
            </div>

            <div class="conversion-details">
              <h3 style="text-align: center; color: #2c3e50; margin-bottom: 20px;">جزئیات تبدیل کالا</h3>
              
              <div class="product-box consumed">
                <h4 style="color: #e74c3c; margin-bottom: 10px;">کالای مصرفی</h4>
                <div><strong>نام کالا:</strong> ${conversion.consumedProductName}</div>
                <div><strong>نوع:</strong> ${conversion.consumedProductType === 'owned' ? 'تملیکی' : 'امانی'}</div>
                <div><strong>مقدار:</strong> ${formatPersianNumber(conversion.consumedQuantity)} ${conversion.consumedUnit}</div>
              </div>

              <div class="conversion-arrow">
                ↓ تبدیل به ↓
              </div>

              <div class="product-box produced">
                <h4 style="color: #27ae60; margin-bottom: 10px;">کالای تولیدی</h4>
                <div><strong>نام کالا:</strong> ${conversion.producedProductName}</div>
                <div><strong>نوع:</strong> ${conversion.producedProductType === 'owned' ? 'تملیکی' : 'امانی'}</div>
                <div><strong>مقدار:</strong> ${formatPersianNumber(conversion.producedQuantity)} ${conversion.producedUnit}</div>
              </div>
            </div>

            <div class="info-section">
              <h3>اطلاعات سیستم</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">تاریخ ایجاد:</span>
                  <span class="info-value">${formatPersianDate(conversion.createdAt)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">آخرین ویرایش:</span>
                  <span class="info-value">${formatPersianDate(conversion.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>این سند توسط سیستم مدیریت انبار تهیه شده است</p>
              <p>تاریخ پرینت: ${formatPersianDate(new Date())}</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <button onclick="window.print()" style="padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">پرینت</button>
              <button onclick="window.close()" style="padding: 10px 20px; background-color: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px;">بستن</button>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
    } catch (error) {
      console.error('خطا در پرینت:', error);
      alert('خطا در پرینت سند');
    }
  }, [formatPersianDate, formatPersianNumber]);

  // حذف
  const handleDelete = useCallback((id: string) => {
    if (!confirm('آیا از حذف این تبدیل کالا اطمینان دارید؟')) return;
    
    const updated = conversions.filter(c => c.id !== id);
    storage.saveData('productConversions', updated);
    setConversions(updated);
    alert('تبدیل کالا حذف شد');
  }, [conversions, storage]);

  // قطعی شدن
  const handleFinalize = useCallback((id: string) => {
    if (!confirm('آیا از قطعی شدن این تراکنش اطمینان دارید؟ پس از قطعی شدن، امکان ویرایش وجود ندارد.')) return;
    
    const updated = conversions.map(c => 
      c.id === id ? { ...c, status: 'finalized' as const, updatedAt: new Date() } : c
    );
    storage.saveData('productConversions', updated);
    setConversions(updated);
    alert('تراکنش با موفقیت قطعی شد');
  }, [conversions, storage]);

  // فیلتر کردن تبدیل‌ها
  const filteredConversions = useMemo(() => {
    if (!searchTerm) return conversions;
    
    const searchLower = searchTerm.toLowerCase();
    return conversions.filter(c => 
      c.transactionNumber?.toLowerCase().includes(searchLower) ||
      c.consumedProductName?.toLowerCase().includes(searchLower) ||
      c.producedProductName?.toLowerCase().includes(searchLower) ||
      c.siteName?.toLowerCase().includes(searchLower) ||
      c.tankName?.toLowerCase().includes(searchLower) ||
      c.contractNumber?.toLowerCase().includes(searchLower)
    );
  }, [conversions, searchTerm]);

  // تابع برای دریافت رسیدهای انبار مرتبط با قرارداد انتخاب شده
  const getConsignmentReceiptsForContract = useCallback((contractId: string) => {
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
      receiptBasisName: r.receiptBasisName || '',
      companyId: r.companyId,
      companyName: r.companyName,
      customerCompanyId: r.customerCompanyId,
      customerCompanyName: r.customerCounterpartyName || r.customerCompanyName,
      locationId: r.locationId,
      locationName: r.locationName,
      driverId: r.driverId,
      driverName: r.driverName,
      unit: r.unit || 'kg',
      notes: r.notes || ''
    }));
  }, [storage]);

  // تابع خروجی به اکسل
  const handleExportToExcel = () => {
    try {
      // ایجاد جدول HTML برای اکسل - با فرمت ستونی درست
      const tableRows = filteredConversions.map(conv => `
        <tr>
          <td>${conv.transactionNumber || ''}</td>
          <td>${formatPersianDate(conv.documentDate)}</td>
          <td>${conv.siteName}</td>
          <td>${conv.tankName}</td>
          <td>${conv.consumedProductName}</td>
          <td>${conv.consumedProductType === 'owned' ? 'تملیکی' : 'امانی'}</td>
          <td>${formatPersianNumber(conv.consumedQuantity)}</td>
          <td>${conv.consumedUnit}</td>
          <td>${conv.producedProductName}</td>
          <td>${conv.producedProductType === 'owned' ? 'تملیکی' : 'امانی'}</td>
          <td>${formatPersianNumber(conv.producedQuantity)}</td>
          <td>${conv.producedUnit}</td>
          <td>${conv.contractNumber || '-'}</td>
          <td>${conv.emptyTankCapacity ? formatPersianNumber(conv.emptyTankCapacity) : '-'}</td>
          <td>${conv.status === 'temporary' ? 'موقت' : 
                conv.status === 'printed' ? 'چاپ شده' : 
                conv.status === 'attached' ? 'ضمیمه شده' : 'نهایی شده'}</td>
          <td>${formatPersianDate(conv.createdAt)}</td>
          <td>${formatPersianDate(conv.updatedAt)}</td>
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
                text-align: right;
                font-size: 12px;
              }
              th {
                background-color: #4CAF50;
                color: white;
                font-weight: bold;
              }
              tr:nth-child(even) {
                background-color: #f2f2f2;
              }
              .header {
                text-align: center;
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 20px;
                color: #333;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>گزارش تراکنش‌های تبدیل کالا</h2>
              <p>تاریخ تهیه گزارش: ${formatPersianDate(new Date())}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>شماره تراکنش</th>
                  <th>تاریخ سند</th>
                  <th>سایت</th>
                  <th>مخزن</th>
                  <th>کالای مصرفی</th>
                  <th>نوع کالای مصرفی</th>
                  <th>مقدار مصرفی</th>
                  <th>واحد مصرفی</th>
                  <th>کالای تولیدی</th>
                  <th>نوع کالای تولیدی</th>
                  <th>مقدار تولیدی</th>
                  <th>واحد تولیدی</th>
                  <th>قرارداد</th>
                  <th>ظرفیت خالی مخزن</th>
                  <th>وضعیت</th>
                  <th>تاریخ ایجاد</th>
                  <th>تاریخ آخرین ویرایش</th>
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
      link.setAttribute('download', `گزارش_تراکنش_تبدیل_کالا_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xls`);
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

  // رندر جدول اطلاعات قرارداد انتخاب شده
  const renderContractInfoTable = () => {
    if (!selectedContractInfo) return null;

    return (
      <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-xl">
          <h3 className="font-semibold">اطلاعات قرارداد انتخاب شده</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">شماره قرارداد:</span>
              <div className="font-medium">{selectedContractInfo.contractNumber || '-'}</div>
            </div>
            <div>
              <span className="text-gray-600">شرکت:</span>
              <div className="font-medium">{selectedContractInfo.companyName || '-'}</div>
            </div>
            <div>
              <span className="text-gray-600">مشتری:</span>
              <div className="font-medium">{selectedContractInfo.customerCounterpartyName || '-'}</div>
            </div>
            <div>
              <span className="text-gray-600">سایت:</span>
              <div className="font-medium">{selectedContractInfo.siteName || '-'}</div>
            </div>
            <div>
              <span className="text-gray-600">مخزن:</span>
              <div className="font-medium">{selectedContractInfo.tankName || '-'}</div>
            </div>
            <div>
              <span className="text-gray-600">تاریخ شروع:</span>
              <div className="font-medium">{selectedContractInfo.startDate ? formatPersianDate(new Date(selectedContractInfo.startDate)) : '-'}</div>
            </div>
            <div>
              <span className="text-gray-600">تاریخ پایان:</span>
              <div className="font-medium">{selectedContractInfo.endDate ? formatPersianDate(new Date(selectedContractInfo.endDate)) : '-'}</div>
            </div>
            <div>
              <span className="text-gray-600">وضعیت:</span>
              <div className="font-medium">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedContractInfo.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedContractInfo.isActive ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // رندر جدول اطلاعات امانی مرتبط با قرارداد انتخاب شده
  const renderConsignmentRelatedTable = () => {
    if (!showConsignmentRelatedTable || !selectedContractInfo) return null;

    const relatedReceipts = getConsignmentReceiptsForContract(selectedContractInfo.id);

    return (
      <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-t-xl">
          <h3 className="font-semibold">موجودی امانی مرتبط با قرارداد انتخاب شده</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره تراکنش</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاریخ رسید</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">محصول</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">مقدار</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">واحد</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">شرکت</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {relatedReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-600">{receipt.transactionNumber}</td>
                  <td className="px-4 py-3">{formatPersianDate(receipt.receiptDate)}</td>
                  <td className="px-4 py-3">{receipt.productName}</td>
                  <td className="px-4 py-3 font-medium">{formatPersianNumber(receipt.receiptBasisAmount)}</td>
                  <td className="px-4 py-3">{receipt.unit}</td>
                  <td className="px-4 py-3">{receipt.companyName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {relatedReceipts.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              هیچ رسید انباری برای این قرارداد یافت نشد
            </div>
          )}
        </div>
      </div>
    );
  };

  // مودال تقویم
  const renderDatePickerModal = () => {
    if (!showDateModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={() => setShowDateModal(false)}>
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">انتخاب تاریخ سند</h3>
            <button
              onClick={() => setShowDateModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="mb-4">
            <PersianDatePicker
              value={documentDate}
              onChange={(date) => {
                if (date) {
                  setDocumentDate(date);
                }
              }}
              placeholder="انتخاب تاریخ"
              isFloating={false}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDocumentDate(new Date());
              }}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              امروز
            </button>
            <button
              onClick={() => setShowDateModal(false)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              تایید
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* هدر و دکمه بازگشت */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <button
              onClick={handleBackToMain}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              بازگشت به صفحه اصلی
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">تبدیل کالا</h1>
            <p className="text-gray-600">ثبت تبدیل کالا و مدیریت تراکنش‌های تبدیل</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('refreshData'));
                window.location.reload();
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
          {/* Table 1: موجودی مخازن امانی و تملیکی */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden lg:col-span-2">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
              <h2 className="text-xl font-semibold">موجودی مخازن امانی و تملیکی</h2>
            </div>
            <div className="p-4 space-y-4">
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

          {/* Table 3: موجودی مخازن تملیکی */}
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
                <p>• زمانی که نوع کالای مصرفی "امانی" انتخاب می‌کنید، اطلاعات قرارداد در قسمت بالا نمایش داده می‌شود</p>
                <p>• فلش‌های آبی رنگ ارتباط بین اطلاعات قرارداد و فرم‌ها را نشان می‌دهند</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* جدول اطلاعات قرارداد انتخاب شده */}
        {renderContractInfoTable()}
        
        {/* جدول اطلاعات امانی مرتبط با قرارداد انتخاب شده */}
        {renderConsignmentRelatedTable()}

        {/* فرم تبدیل کالا - تقسیم شده به دو بخش */}
        {/* تاریخ سند مشترک برای هر دو فرم */}
        <div className="mb-6 bg-white rounded-xl border border-blue-200 shadow-sm">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <h3 className="font-semibold">تاریخ سند - مشترک برای ثبت سند تولید و مصرف کالا</h3>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ سند</label>
                <div
                  onClick={() => setShowDateModal(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors flex items-center justify-between"
                >
                  <span className="text-gray-900">{formatPersianDate(documentDate)}</span>
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* فرم کالای مصرفی (سمت چپ) */}
          <div className="p-6 rounded-xl border border-green-200 bg-green-50 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Minus className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">ثبت سند تولید کالا</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* نوع کالای تولیدی */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع کالای تولیدی *</label>
                <select
                  value={form.producedProductType}
                  onChange={(e) => handleFormChange('producedProductType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">انتخاب نوع</option>
                  <option value="owned">تملیکی</option>
                  <option value="consignment">امانی</option>
                </select>
              </div>

              {/* نام کالای تولیدی */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نام کالای تولیدی *</label>
                <select
                  value={form.producedProductId}
                  onChange={(e) => handleFormChange('producedProductId', e.target.value)}
                  disabled={!form.producedProductType}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">انتخاب کالا</option>
                  {form.producedProductType && baseData[form.producedProductType === 'owned' ? 'owned-products' : 'consignment-products']?.map((product: any) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>

              {/* مقدار تولیدی */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">مقدار تولیدی *</label>
                <input
                  type="number"
                  value={form.producedQuantity}
                  onChange={(e) => handleFormChange('producedQuantity', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* واحد سنجش کالای تولیدی */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">واحد سنجش کالای تولیدی *</label>
                <select
                  value={form.producedUnit}
                  onChange={(e) => handleFormChange('producedUnit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {baseData.units?.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>

              {/* نام سایت - فقط برای کالای تملیکی */}
              {form.producedProductType === 'owned' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نام سایت *</label>
                  <select
                    value={form.siteId}
                    onChange={(e) => handleFormChange('siteId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">انتخاب سایت</option>
                    {baseData.sites?.map((site: any) => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* نام مخزن - فقط برای کالای تملیکی */}
              {form.producedProductType === 'owned' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نام مخزن *</label>
                  <select
                    value={form.tankId}
                    onChange={(e) => handleFormChange('tankId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">انتخاب مخزن</option>
                    {baseData.tanks?.map((tank: any) => (
                      <option key={tank.id} value={tank.id}>{tank.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ظرفیت خالی مخزن - فقط برای کالای تملیکی */}
              {form.siteId && form.tankId && form.producedProductType === 'owned' && (() => {
                const emptyCapacity = calculateEmptyTankCapacityForOwned(form.siteId, form.tankId);
                return (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">ظرفیت خالی مخزن (کیلوگرم)</label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      {formatPersianNumber(emptyCapacity)}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          
          {/* فرم کالای تولیدی (سمت راست) */}
          <div className="p-6 rounded-xl border border-red-200 bg-red-50 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">ثبت سند مصرف کالا</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* نوع کالای مصرفی */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع کالای مصرفی *</label>
                <select
                  value={form.consumedProductType}
                  onChange={(e) => handleFormChange('consumedProductType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">انتخاب نوع</option>
                  <option value="owned">تملیکی</option>
                  <option value="consignment">امانی</option>
                </select>
              </div>

              {/* نام کالای مصرفی */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نام کالای مصرفی *</label>
                <select
                  value={form.consumedProductId}
                  onChange={(e) => handleFormChange('consumedProductId', e.target.value)}
                  disabled={!form.consumedProductType}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">انتخاب کالا</option>
                  {form.consumedProductType && baseData[form.consumedProductType === 'owned' ? 'owned-products' : 'consignment-products']?.map((product: any) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>

              {/* مقدار مصرفی */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">مقدار مصرفی *</label>
                <input
                  type="number"
                  value={form.consumedQuantity}
                  onChange={(e) => handleFormChange('consumedQuantity', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* واحد سنجش کالای مصرفی */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">واحد سنجش کالای مصرفی *</label>
                <select
                  value={form.consumedUnit}
                  onChange={(e) => handleFormChange('consumedUnit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {baseData.units?.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>

              {/* نام سایت - فقط برای کالای تملیکی */}
              {form.consumedProductType === 'owned' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نام سایت *</label>
                  <select
                    value={form.siteId}
                    onChange={(e) => handleFormChange('siteId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">انتخاب سایت</option>
                    {baseData.sites?.map((site: any) => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* نام مخزن - فقط برای کالای تملیکی */}
              {form.consumedProductType === 'owned' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نام مخزن *</label>
                  <select
                    value={form.tankId}
                    onChange={(e) => handleFormChange('tankId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">انتخاب مخزن</option>
                    {baseData.tanks?.map((tank: any) => (
                      <option key={tank.id} value={tank.id}>{tank.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* قرارداد (فقط برای امانی) */}
              {form.consumedProductType === 'consignment' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">قرارداد *</label>
                  <select
                    value={form.contractId}
                    onChange={(e) => handleFormChange('contractId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">انتخاب قرارداد</option>
                    {contracts.filter((c: any) => c.isActive).map((contract: any) => (
                      <option key={contract.id} value={contract.id}>{contract.contractNumber}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ظرفیت خالی مخزن - فقط برای کالای تملیکی */}
              {form.siteId && form.tankId && form.consumedProductType === 'owned' && (() => {
                const emptyCapacity = calculateEmptyTankCapacityForOwned(form.siteId, form.tankId);
                return (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">ظرفیت خالی مخزن (کیلوگرم)</label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      {formatPersianNumber(emptyCapacity)}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        
        {/* دکمه‌های عملیات */}
        <div className="flex gap-4 mb-8">
          {!editingId && canCreate('product_conversion') && (
            <button
              onClick={saveConversion}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              ثبت تبدیل کالا
            </button>
          )}
          {editingId && canEdit('product_conversion') && (
            <button
              onClick={saveConversion}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              ویرایش تبدیل کالا
            </button>
          )}
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setEditForm({});
                setForm({
                  siteId: '',
                  tankId: '',
                  consumedProductType: '',
                  consumedProductId: '',
                  consumedQuantity: 0,
                  consumedUnit: 'kg',
                  producedProductType: '',
                  producedProductId: '',
                  producedQuantity: 0,
                  producedUnit: 'kg',
                  contractId: '',
                });
                setSelectedContractInfo(null);
              }}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              انصراف
            </button>
          )}
        </div>

        {/* جدول گزارش تراکنش‌ها */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">گزارش تراکنش‌های تبدیل کالا</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsConversionTableMinimized(!isConversionTableMinimized)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {isConversionTableMinimized ? (
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
          
            {/* فیلترهای جستجو */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="جستجو در تمام فیلدها..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchTerm && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isConversionTableMinimized && (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: '2000px' }}>
              <colgroup>
                <col style={{ width: '120px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '120px' }} />
              </colgroup>
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">شماره تراکنش</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">نوع تراکنش</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">تاریخ سند</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">سایت</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">مخزن</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">کالای مصرفی</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">نوع مصرفی</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">مقدار مصرفی</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">واحد مصرفی</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">کالای تولیدی</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">نوع تولیدی</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">مقدار تولیدی</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">واحد تولیدی</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">قرارداد</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">ظرفیت خالی</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">وضعیت</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">تاریخ ایجاد</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 whitespace-nowrap align-middle">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConversions.flatMap((conversion, index) => {
                  return [
                  // ردیف کالای مصرفی (کسر)
                  <tr key={`${conversion.id}-consumed`} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-blue-600 font-medium border border-gray-200">
                      {conversion.transactionNumber || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        مصرفی کسر شده
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {formatPersianDate(conversion.documentDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <div className="flex items-center">
                        <Warehouse className="h-4 w-4 text-gray-400 ml-2" />
                        <span className="text-sm text-gray-900">{conversion.siteName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200 text-right align-middle">
                      {conversion.tankName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 ml-2" />
                        <span className="text-sm font-medium text-gray-900">{conversion.consumedProductName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        conversion.consumedProductType === 'owned' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {conversion.consumedProductType === 'owned' ? 'تملیکی' : 'امانی'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <span className="text-sm font-medium text-gray-900">
                        {formatPersianNumber(conversion.consumedQuantity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {conversion.consumedUnit}
                    </td>
                    {/* کالای تولیدی - خالی در ردیف مصرفی */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 border border-gray-200">
                      -
                    </td>
                    {/* نوع تولیدی - خالی در ردیف مصرفی */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 border border-gray-200">
                      -
                    </td>
                    {/* مقدار تولیدی - خالی در ردیف مصرفی */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 border border-gray-200">
                      -
                    </td>
                    {/* واحد تولیدی - خالی در ردیف مصرفی */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 border border-gray-200">
                      -
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {conversion.contractNumber || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {conversion.emptyTankCapacity ? formatPersianNumber(conversion.emptyTankCapacity) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        conversion.status === 'temporary' ? 'bg-yellow-100 text-yellow-800' :
                        conversion.status === 'printed' ? 'bg-blue-100 text-blue-800' :
                        conversion.status === 'attached' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {conversion.status === 'temporary' ? 'موقت' :
                         conversion.status === 'printed' ? 'چاپ شده' :
                         conversion.status === 'attached' ? 'ضمیمه شده' : 'نهایی شده'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {formatPersianDate(conversion.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium border border-gray-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(conversion)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {conversion.status === 'temporary' && (
                          <button
                            onClick={() => handleFinalize(conversion.id)}
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
                            title="قطعی شدن"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handlePrint(conversion)}
                          className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-50 transition-colors"
                          title="پرینت"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(conversion.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="حذف"
                          disabled={conversion.status === 'finalized'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>,
                  // ردیف کالای تولیدی (اضافه)
                  <tr key={`${conversion.id}-produced`} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-blue-600 font-medium border border-gray-200">
                      {conversion.transactionNumber || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        تبدیلی اضافه شده
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {formatPersianDate(conversion.documentDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <div className="flex items-center">
                        <Warehouse className="h-4 w-4 text-gray-400 ml-2" />
                        <span className="text-sm text-gray-900">{conversion.siteName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {conversion.tankName}
                    </td>
                    {/* کالای مصرفی - خالی در ردیف تولیدی */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 border border-gray-200">
                      -
                    </td>
                    {/* نوع مصرفی - خالی در ردیف تولیدی */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 border border-gray-200">
                      -
                    </td>
                    {/* مقدار مصرفی - خالی در ردیف تولیدی */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 border border-gray-200">
                      -
                    </td>
                    {/* واحد مصرفی - خالی در ردیف تولیدی */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 border border-gray-200">
                      -
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 ml-2" />
                        <span className="text-sm font-medium text-gray-900">{conversion.producedProductName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        conversion.producedProductType === 'owned' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {conversion.producedProductType === 'owned' ? 'تملیکی' : 'امانی'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <span className="text-sm font-medium text-gray-900">
                        {formatPersianNumber(conversion.producedQuantity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {conversion.producedUnit}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {conversion.contractNumber || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {conversion.emptyTankCapacity ? formatPersianNumber(conversion.emptyTankCapacity) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border border-gray-200 text-right align-middle">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        conversion.status === 'temporary' ? 'bg-yellow-100 text-yellow-800' :
                        conversion.status === 'printed' ? 'bg-blue-100 text-blue-800' :
                        conversion.status === 'attached' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {conversion.status === 'temporary' ? 'موقت' :
                         conversion.status === 'printed' ? 'چاپ شده' :
                         conversion.status === 'attached' ? 'ضمیمه شده' : 'نهایی شده'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200">
                      {formatPersianDate(conversion.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium border border-gray-200">
                      <div className="flex items-center gap-2">
                        {canEdit('product_conversion') && (
                          <button
                            onClick={() => handleEdit(conversion)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="ویرایش"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {conversion.status === 'temporary' && (
                          <button
                            onClick={() => handleFinalize(conversion.id)}
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
                            title="قطعی شدن"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handlePrint(conversion)}
                          className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-50 transition-colors"
                          title="پرینت"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {canDelete('product_conversion') && (
                          <button
                            onClick={() => handleDelete(conversion.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                            title="حذف"
                            disabled={conversion.status === 'finalized'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  ];
                })}
              </tbody>
            </table>
            {filteredConversions.length === 0 && (
              <div className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">تراکنشی یافت نشد</h3>
                <p className="text-gray-600">
                  با فیلترهای انتخاب شده، هیچ تراکنش تبدیل کالایی یافت نشد.
                </p>
              </div>
            )}
            </div>
          )}
        </div>

        {/* مودال تقویم */}
        {renderDatePickerModal()}
      </div>
    </div>
  );
};
