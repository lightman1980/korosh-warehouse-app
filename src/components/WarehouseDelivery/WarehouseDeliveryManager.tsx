import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Download, RefreshCw, Edit2, Trash2, AlertCircle, Printer, CheckSquare, Calendar, Building2, Clock, Truck, Minimize2, Maximize2 } from 'lucide-react';
import { useModuleChangeLogger, logSaveAction, logDeleteAction, logCreateAction } from "../../hooks/useActivityLogger";

interface WarehouseDeliveryManagerProps {

  sharedData: {
    baseData: any;
    contracts: any[];
    permits: any[];
    receipts: any[];
    adjustments: any[];
    additions: any[];
    deductions: any[];
  };
  updateSharedData: (dataType: string, newData: any) => void;
  onRefresh: () => void;
}

const WarehouseDeliveryManager: React.FC<WarehouseDeliveryManagerProps> = ({
  sharedData,
  updateSharedData,
  onRefresh
}) => {
  // Initialize storage first before any hooks that use it
  const storage = DataStorage.getInstance();
  const { canCreate, canEdit, canDelete } = usePermissions();
  
  // Helper function for type-safe data loading (currently unused but kept for future use)
  // const loadDataSafe = <T,>(key: string, defaultValue: T): T => {
  //   const data = storage.loadData(key);
  //   return (Array.isArray(data) ? data : (data && typeof data === 'object' ? Object.values(data) : defaultValue)) as T;
  // };

  // Utility function to save data and notify DashboardStats
  const saveDataWithNotification = (key: string, data: any) => {
    storage.saveData(key, data);
    
    // Clear cache and notify DashboardStats
    const cacheKey = `warehouse_${key}`;
    localStorage.removeItem(cacheKey);
    
    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: cacheKey,
      newValue: JSON.stringify(data),
      storageArea: localStorage
    }));
    
    // Also trigger custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('warehouseDataUpdate'));
    
    console.log(`💾 Data saved and DashboardStats notified for key: ${key}`);
  };
  
  // State management
  const [deliveries, setDeliveries] = useState<WarehouseDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Removed unused: filters, setFilters, showFilters, setShowFilters
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0); // برای refresh کردن محاسبات موجودی
  const [isConsignmentTableMinimized, setIsConsignmentTableMinimized] = useState<boolean>(false); // برای minimize/maximize جدول امانی
  
  // Form state
  const [_isAddingDelivery, setIsAddingDelivery] = useState(false); // setter is used
  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [currentDelivery, setCurrentDelivery] = useState<Partial<WarehouseDelivery>>({});
  const [_errors, setErrors] = useState<Record<string, string>>({}); // setter is used
  // Removed unused: fromPermit, setFromPermit
  
  // Selector states (removed unused)
  // Removed: showDeliveryTypeSelector, setShowDeliveryTypeSelector, showCompanySelector, setShowCompanySelector, showContractSelector, setShowContractSelector, showPermitSelector, setShowPermitSelector
  
  // View states
  const [showDeliverySlipTypeSelector, setShowDeliverySlipTypeSelector] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'consignment-slip' | 'ownership-slip' | 'modern-ownership-slip' | 'new-ownership-slip'>('list');
  const [existingSlips, setExistingSlips] = useState<any[]>([]);
  const [deliveryCreationMode, setDeliveryCreationMode] = useState<'general' | 'from-permit'>('general');
  
  // Selected permit for detailed view
  const [selectedPermit, setSelectedPermit] = useState<any>(null);
  
  // State for "To be checked" field
  const [checkedTransactions, setCheckedTransactions] = useState<Set<string>>(new Set());
  const [disabledTransactions, setDisabledTransactions] = useState<Set<string>>(new Set());
  
  // New state for tank inventory calculations
  const [selectedDate] = useState<Date>(new Date()); // Used in dependency arrays
  const [selectedTankForFilter, setSelectedTankForFilter] = useState<string>('');
  const [selectedSiteForFilter, setSelectedSiteForFilter] = useState<string>('');
  const [upToDate, setUpToDate] = useState<Date>(new Date());
  const [showInventoryPackage, setShowInventoryPackage] = useState<boolean>(true);
  
  // State for showing extra info in consignment transactions table
  const [showExtraInfoInConsignmentTable, setShowExtraInfoInConsignmentTable] = useState<boolean>(false);
  
  // تابع جدید برای toggle کردن وضعیت بررسی
  const toggleCheckTransaction = useCallback((transactionId: string) => {
    setCheckedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
    
    // ذخیره وضعیت بررسی شده در storage برای حفظ وضعیت پس از رفرش
    const updatedCheckedTransactions = checkedTransactions.has(transactionId) 
      ? Array.from(checkedTransactions).filter(id => id !== transactionId)
      : [...Array.from(checkedTransactions), transactionId];
    
    saveDataWithNotification('checked-transactions', updatedCheckedTransactions);
    
    console.log('🎯 وضعیت بررسی تغییر کرد:', {
      transactionId,
      isChecked: !checkedTransactions.has(transactionId),
      totalChecked: updatedCheckedTransactions.length
    });
  }, [checkedTransactions]);
  
  // Data from shared props - با چک ایمنی برای sharedData
  const sharedDataSafe = sharedData || {
    baseData: null,
    contracts: [],
    permits: [],
    receipts: [],
    adjustments: [],
    additions: [],
    deductions: []
  };
  
  const { baseData: baseDataFromProps } = sharedDataSafe;
  
  // بارگذاری baseData از localStorage در صورت عدم وجود در props (مشابه WarehouseReceiptManager)
  const [baseData, setBaseData] = useState<any>(baseDataFromProps || {});
  
  useEffect(() => {
    if (!baseDataFromProps || !baseDataFromProps.tanks || baseDataFromProps.tanks.length === 0) {
      const storage = DataStorage.getInstance();
      try {
        const loadDataWithFallback = (key: string, fallbackData: any[] = []) => {
          try {
            const categories = (storage.loadData('baseDataCategories') || []) as any[];
            const category = categories.find((c: any) => c.id === key.replace('category_', ''));
            const data = category?.items || [];
            return data.length > 0 ? data : fallbackData;
          } catch (error) {
            return fallbackData;
          }
        };
        
        const tanks = loadDataWithFallback('tanks');
        const sites = loadDataWithFallback('sites');
        const ownedProducts = loadDataWithFallback('owned-products');
        const consignmentProducts = loadDataWithFallback('consignment-products');
        const companies = loadDataWithFallback('companies');
        const customerCompanies = loadDataWithFallback('customer-companies');
        const locations = loadDataWithFallback('locations');
        const drivers = loadDataWithFallback('drivers');
        const shipNames = loadDataWithFallback('ship-names');
        const cotageNumbers = loadDataWithFallback('cotage-numbers');
        const indexNumbers = loadDataWithFallback('index-numbers');
        const receiptBasis = loadDataWithFallback('receipt-basis');
        const internalCompany = loadDataWithFallback('internal-company');
        const wastageRates = loadDataWithFallback('wastage-rates');
        
        const loadedBaseData = {
          tanks,
          sites,
          ownedProducts,
          consignmentProducts,
          companies,
          customerCompanies,
          locations,
          drivers,
          shipNames,
          cotageNumbers,
          indexNumbers,
          receiptBasis,
          internalCompany,
          wastageRates,
          counterparties: companies,
          customerCounterparties: customerCompanies,
          counterpartyLocations: locations,
          customerCounterpartyLocations: locations
        };
        
        setBaseData(loadedBaseData);
      } catch (error) {
        console.error('خطا در بارگذاری baseData از localStorage:', error);
      }
    } else {
      setBaseData(baseDataFromProps);
    }
  }, [baseDataFromProps, storage]);
  // Type assertions to ensure arrays
  const permits = (Array.isArray(sharedDataSafe.permits) ? sharedDataSafe.permits : []) as any[];
  const receipts = (Array.isArray(sharedDataSafe.receipts) ? sharedDataSafe.receipts : []) as any[];
  const adjustments = (Array.isArray(sharedDataSafe.adjustments) ? sharedDataSafe.adjustments : []) as any[];
  // Removed unused: additions, deductions (using additionDocuments and deductionDocuments instead)

  // Helper function to safely load array data from storage (currently unused but kept for future use)
  // const loadArrayData = (key: string): any[] => {
  //   const data = storage.loadData(key);
  //   return Array.isArray(data) ? data : [];
  // };

  // Safe number conversion function
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    
    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value;
    }
    
    const num = parseFloat(value.toString());
    return isNaN(num) ? defaultValue : num;
  };

  // منحصربه‌فرد مخازن و سایت‌ها برای فیلترها
  const uniqueTanks = useMemo(() => {
    const tankMap = new Map();
    const allReceipts = (storage.loadData('receipts') || []) as any[];
    allReceipts.forEach((receipt: any) => {
      if (receipt.tankId && receipt.tankName && !receipt.isVoided) {
        tankMap.set(receipt.tankId, receipt.tankName);
      }
    });
    return Array.from(tankMap.entries());
  }, [storage]);

  const uniqueSites = useMemo(() => {
    const siteMap = new Map();
    const allReceipts = (storage.loadData('receipts') || []) as any[];
    allReceipts.forEach((receipt: any) => {
      if (receipt.siteId && receipt.siteName && !receipt.isVoided) {
        siteMap.set(receipt.siteId, receipt.siteName);
      }
    });
    return Array.from(siteMap.entries());
  }, [storage]);
  
  // تابع تولید شماره تراکنش با فرمت جدید کاربر
  const toPersianDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // الگوریتم تبدیل تاریخ میلادی به شمسی
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    
    const gy2 = day > 31 ? year : (month > 2 ? year + 1 : year);
    const jy = gy2 - 621;
    
    const j_day_no = day + g_d_m[month - 1] + (gy2 > year ? 1 : 0);
    
    let j_month = 1;
    for (let i = 0; i < 12; i++) {
      if (j_day_no > (i === 11 ? 30 : j_days_in_month[i])) {
        j_month++;
      }
    }
    
    const j_day = j_day_no;
    
    // بازگرداندن با فرمت YYYYMMDD
    return jy.toString().padStart(4, '0') + 
           j_month.toString().padStart(2, '0') + 
           j_day.toString().padStart(2, '0');
  }, []);

  // تابع تولید شماره تراکنش با پیشوندهای مختلف
  const generateTransactionNumber = useCallback((type: string, storage: DataStorage, date: Date = new Date()) => {
    const persianDate = toPersianDate(date); // YYYYMMDD format
    
    // تعیین پیشوند و datasource بر اساس نوع
    let prefix = '';
    let dataKey = '';
    let data: any[] = [];
    
    switch (type) {
      case 'consignment':
        prefix = 'EWRE';
        dataKey = 'consignment-delivery-slips';
        break;
      case 'owned':
        prefix = 'OWRE';
        dataKey = 'ownership-delivery-slips';
        break;
      case 'consignment_receipt':
        prefix = 'EWRT';
        dataKey = 'warehouse-receipts';
        break;
      case 'owned_receipt':
        prefix = 'OWRT';
        dataKey = 'warehouse-receipts';
        break;
      default:
        prefix = 'T';
        dataKey = 'warehouse-receipts';
    }
    
    data = storage.loadData(dataKey) || [];
    
    // شماره‌گذاری پیوسته برای هر تاریخ با کنترل تکرار
    const existingTransactionNumbers = data
      .map((s: any) => s.transactionNumber)
      .filter((num: string) => num && num.startsWith(prefix) && num.includes(`-${persianDate}-`))
      .map((num: string) => {
        const parts = num.split('-');
        // بخش سوم که شماره 6 رقمی است (مثلاً 000000, 100000, 200000)
        const serialPart = parts[2] || '0';
        return parseInt(serialPart, 10);
      })
      .filter(n => !isNaN(n));
    
    // شماره بعدی: از 000001 شروع می‌شود و به صورت پیوسته افزایش می‌یابد (000001, 000002, 000003, ...)
    let nextNumber = 1; // از 1 شروع شود
    if (existingTransactionNumbers.length > 0) {
      const maxNumber = Math.max(...existingTransactionNumbers);
      nextNumber = maxNumber + 1; // افزایش پیوسته
    }
    
    // تولید شماره جدید و اطمینان از عدم تکرار
    let newTransactionNumber: string = '';
    let attempts = 0;
    do {
      newTransactionNumber = `${prefix}-${persianDate}-${nextNumber.toString().padStart(6, '0')}`;
      const exists = data.some((s: any) => s.transactionNumber === newTransactionNumber);
      if (!exists) break;
      nextNumber++; // افزایش 1 برای شماره بعدی
      attempts++;
    } while (attempts < 1000);
    
    return newTransactionNumber;
  }, [toPersianDate]);

  // Initialize data and refresh function
  const refreshData = useCallback(() => {
    try {
      // Load deliveries
      const deliveriesData = (storage.loadData('deliveries') as WarehouseDelivery[]) || [];
      setDeliveries(Array.isArray(deliveriesData) ? deliveriesData : []);
      
      // Load existing slips - به‌روزرسانی موجودی حواله‌ها
      const consignmentSlips = (storage.loadData('consignment-delivery-slips') as any[]) || [];
      const ownershipSlips = (storage.loadData('ownership-delivery-slips') as any[]) || [];
      const updatedSlips = [...(Array.isArray(consignmentSlips) ? consignmentSlips : []), ...(Array.isArray(ownershipSlips) ? ownershipSlips : [])];
      setExistingSlips(updatedSlips);
      
      console.log('🔄 داده‌ها به‌روزرسانی شدند:', {
        deliveries: deliveriesData.length,
        consignmentSlips: consignmentSlips.length,
        ownershipSlips: ownershipSlips.length,
        totalSlips: updatedSlips.length
      });
      
      // Load checked transactions
      const checkedData = (storage.loadData('checked-transactions') as string[]) || [];
      setCheckedTransactions(new Set(Array.isArray(checkedData) ? checkedData : []));
      
      // Load disabled transactions
      const disabledData = (storage.loadData('disabled-transactions') as string[]) || [];
      setDisabledTransactions(new Set(Array.isArray(disabledData) ? disabledData : []));
      
      // به‌روزرسانی inventoryRefreshKey برای refresh محاسبات موجودی
      setInventoryRefreshKey(prev => prev + 1);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoading(false);
    }
  }, [storage]);

  // Initialize data
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // بازگرداندن اندازه تصوير صفحه به حالت عادي
  useEffect(() => {
    document.body.style.transform = '';
    document.body.style.transformOrigin = '';
    document.body.style.width = '';
  }, []);

  // Save deliveries to storage and notify parent
  const saveDeliveries = useCallback((updatedDeliveries: WarehouseDelivery[]) => {
    saveDataWithNotification('deliveries', updatedDeliveries);
    setDeliveries(updatedDeliveries);
    updateSharedData('deliveries', updatedDeliveries);
  }, [updateSharedData, storage]);



  // Generate a new delivery object
  const createNewDelivery = useCallback((userType: 'owned' | 'consignment', fromPermit: boolean = false): Partial<WarehouseDelivery> => {
    const now = new Date();
    return {
      id: `delivery_${Date.now()}`,
      transactionNumber: generateTransactionNumber(userType, storage, now), // استفاده از تابع جدید با فرمت درخواستی
      userType: fromPermit ? 'consignment' : userType, // اگر از طريق مجوز ايجاد شود، هميشه اماني است
      status: 'draft', // وضعيت اوليه "پيش‌نويس" باشد
      deliveryDate: now,
      createdAt: now,
      updatedAt: now,
      unit: 'kg'
    };
  }, [generateTransactionNumber, storage]);

  // Start adding a new delivery
  const handleAddDelivery = useCallback(() => {
    setDeliveryCreationMode('general');
    setShowDeliverySlipTypeSelector(true);
  }, []);

  // Start adding delivery from permit (currently unused but kept for future use)
  // const handleAddDeliveryFromPermit = useCallback(() => {
  //   setDeliveryCreationMode('from-permit');
  //   setShowDeliverySlipTypeSelector(true);
  // }, []);


  // Handle delivery type selection - updated to use simplified ownership slip
  const handleSelectDeliverySlipType = useCallback((type: 'consignment' | 'ownership') => {
    setShowDeliverySlipTypeSelector(false);
    if (deliveryCreationMode === 'general') {
      // حالت کلی: کاربر از دکمه "حواله انبار جدید" آمده است
      if (type === 'consignment') {
        // برای حواله امانی، ابتدا مجوز را انتخاب می کنیم
        const newDelivery = createNewDelivery(type, false);
        setCurrentDelivery(newDelivery);
        setIsAddingDelivery(true);
        setIsEditingDelivery(false);
        setCurrentView('consignment-slip');
      } else {
        // برای حواله تملیکی، مستقیماً به فرم حواله تملیکی ساده می رویم
        const newDelivery = createNewDelivery('owned', false);
        setCurrentDelivery(newDelivery);
        setIsAddingDelivery(true);
        setIsEditingDelivery(false);
        setCurrentView('new-ownership-slip');
      }
    } else if (deliveryCreationMode === 'from-permit') {
      // حالت ایجاد از مجوز: مستقیماً به فرم حواله امانی برو
      if (type === 'consignment') {
        const newDelivery = createNewDelivery(type, false);
        setCurrentDelivery(newDelivery);
        setIsAddingDelivery(true);
        setIsEditingDelivery(false);
        setCurrentView('consignment-slip');
      }
    }
  }, [createNewDelivery, deliveryCreationMode]);

  // Handle viewing permit details - Modified to not change view
  const handleViewPermitDetails = useCallback((permit: any) => {
    setSelectedPermit(permit);
    // Don't change the view, just set the selected permit
  }, []);

  // Handle transaction edit - اصلاح شده براي محاسبه صحيح مقدار در حالت ويرايش
  const handleEditTransaction = useCallback((transaction: any) => {
    // اگر تراکنش داراي مجوز باشد، نوع حواله اماني است
    // اگر داراي شماره قرارداد باشد، نوع حواله اماني است
    // در غیر این صورت، نوع حواله تملیکی است
    const isConsignment = transaction.contractNumber || transaction.permitId;
    const slipType = isConsignment ? 'consignment' : 'ownership';
    
    // اطمینان از استفاده از ID اصلی تراکنش - بدون تولید ID جدید
    const originalTransactionId = transaction.id;
    if (!originalTransactionId) {
      console.error('❌ خطا: ID تراکنش اصلی یافت نشد. تراکنش:', transaction);
      alert('خطا: اطلاعات تراکنش ناقص است و قابل ویرایش نیست.');
      return;
    }
    
    // حفظ اطلاعات تراکنش بدون تغيير مقدار
    // در حالت ويرايش، مقدار بايد حفظ شود نه تغيير يابد
    let updatedTransaction = { 
      ...transaction,
      // هنگام ورود به حالت ویرایش، وضعیت باید پیش‌نویس شود
      status: 'draft',
      // تعيين flag براي تشخيص نوع ويرايش
      _isParentEdit: false, // ويرايش از مسیر "تراکنش‌هاي ثبت شده امانی/تملیکی" = حالت ویرایش مستقیم
      _editingSource: 'transaction-list', // تعيين منبع ويرايش از تراکنش‌ها
      editMode: 'حالت ویرایش مستقیم' // تعيين حالت ویرایش برای نمایش در UI
    };
    
    // حفظ ID اصلی تراکنش برای ویرایش درست - هیچگاه ID جدید تولید نکن
    setCurrentDelivery({
      ...updatedTransaction,
      id: originalTransactionId // همیشه از ID اصلی استفاده کن
    });
    
    // به‌روزرسانی وضعیت در storage و لیست‌ها تا جدول فوراً "پیش‌نویس" را نشان دهد
    try {
      // به‌روز کردن deliveries
      const deliveriesList = (storage.loadData('deliveries') || []) as any[];
      const updatedDeliveries = deliveriesList.map((d: any) => {
        const sameById = d.id === transaction.id;
        const sameByNumber = d.transactionNumber && d.transactionNumber === transaction.transactionNumber;
        return (sameById || sameByNumber) ? { ...d, status: 'draft', updatedAt: new Date() } : d;
      });
      saveDataWithNotification('deliveries', updatedDeliveries);

      // به‌روز کردن لیست حواله‌ها بر اساس نوع - با بررسی موفقیت اصلی
      const existingTransaction = deliveriesList.find((d: any) => 
        d.id === transaction.id || 
        (d.transactionNumber && d.transactionNumber === transaction.transactionNumber)
      );
      
      if (existingTransaction) {
        // فقط اگر تراکنش اصلی پیدا شد، رکوردهای دیگر را draft کن
        if (slipType === 'consignment') {
          const consignmentSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
          const updatedConsignmentSlips = consignmentSlips.map((s: any) => {
            const sameById = s.id === transaction.id;
            const sameByNumber = s.transactionNumber && s.transactionNumber === transaction.transactionNumber;
            return (sameById || sameByNumber) ? { ...s, status: 'draft', updatedAt: new Date() } : s;
          });
          saveDataWithNotification('consignment-delivery-slips', updatedConsignmentSlips);
          // بازسازی لیست موجود برای بازتاب فوری
          const ownershipSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
          setExistingSlips([...(updatedConsignmentSlips || []), ...(ownershipSlips || [])]);
        } else {
          const ownershipSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
          const updatedOwnershipSlips = ownershipSlips.map((s: any) => {
            const sameById = s.id === transaction.id;
            const sameByNumber = s.transactionNumber && s.transactionNumber === transaction.transactionNumber;
            return (sameById || sameByNumber) ? { ...s, status: 'draft', updatedAt: new Date() } : s;
          });
          saveDataWithNotification('ownership-delivery-slips', updatedOwnershipSlips);
          // بازسازی لیست موجود برای بازتاب فوری
          const consignmentSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
          setExistingSlips([...(consignmentSlips || []), ...(updatedOwnershipSlips || [])]);
        }
      } else {
        console.log('⚠️ تراکنش اصلی پیدا نشد - تغییری در وضعیت‌ها انجام نمی‌شود');
      }
    } catch (e) {
      // اگر به هر دلیل ذخیره انجام نشد، ادامه می‌دهیم تا ویرایش باز شود
      console.warn('به‌روزرسانی وضعیت به پیش‌نویس هنگام شروع ویرایش با خطا مواجه شد.', e);
    }

    // Set states براي مديريت صحيح حالت ويرايش
    setIsEditingDelivery(true);
    setIsAddingDelivery(true);
    
    // انتقال به نماي مناسب بر اساس نوع حواله
    if (slipType === 'consignment') {
      setCurrentView('consignment-slip');
    } else {
      setCurrentView('new-ownership-slip');
    }
  }, [isEditingDelivery]);

  // Handle edit from parent (جدول اطلاعات امانی)
  const handleEditFromParent = useCallback((permit: any) => {
    // ویرایش از مسیر "جدول اطلاعات امانی" = حالت ویرایش والد
    // ابتدا باید تراکنش مربوط به این مجوز را پیدا کنیم
    const existingTransaction = existingSlips.find((s: any) => 
      (s.permitId === permit.id || s.contractNumber === permit.contractNumber) && 
      !s.isVoided
    );

    if (!existingTransaction) {
      alert('برای این مجوز هیچ تراکنشی یافت نشد.');
      return;
    }

    // اگر تراکنش داراي مجوز باشد، نوع حواله اماني است
    const isConsignment = existingTransaction.contractNumber || existingTransaction.permitId;
    const slipType = isConsignment ? 'consignment' : 'ownership';

    // اطمینان از استفاده از ID اصلی تراکنش - بدون تولید ID جدید
    const originalTransactionId = existingTransaction.id;
    if (!originalTransactionId) {
      console.error('❌ خطا: ID تراکنش اصلی یافت نشد. تراکنش:', existingTransaction);
      alert('خطا: اطلاعات تراکنش ناقص است و قابل ویرایش نیست.');
      return;
    }

    let updatedTransaction = { 
      ...existingTransaction,
      // هنگام ورود به حالت ویرایش، وضعیت باید پیش‌نویس شود (مشابه ویرایش از جدول تراکنش‌ها)
      status: 'draft',
      persianStatus: 'پیش‌نویس',
      // تعيين flag براي تشخيص نوع ويرايش والد
      _isParentEdit: true, // ويرايش از مسیر "جدول اطلاعات امانی" = حالت ویرایش والد
      _editingSource: 'parent', // تعيين منبع ويرايش از والد
      editMode: 'حالت ویرایش والد' // تعيين حالت ویرایش برای نمایش در UI
    };

    setCurrentDelivery({
      ...updatedTransaction,
      id: originalTransactionId // همیشه از ID اصلی استفاده کن
    });

    // به‌روزرسانی وضعیت در storage و لیست‌ها تا جدول فوراً "پیش‌نویس" را نشان دهد (مشابه handleEditTransaction)
    try {
      // به‌روز کردن deliveries
      const deliveriesList = (storage.loadData('deliveries') || []) as any[];
      const updatedDeliveries = deliveriesList.map((d: any) => {
        const sameById = d.id === existingTransaction.id;
        const sameByNumber = d.transactionNumber && d.transactionNumber === existingTransaction.transactionNumber;
        return (sameById || sameByNumber) ? { ...d, status: 'draft', persianStatus: 'پیش‌نویس', updatedAt: new Date() } : d;
      });
      saveDataWithNotification('deliveries', updatedDeliveries);

      // به‌روز کردن لیست حواله‌ها بر اساس نوع
      if (slipType === 'consignment') {
        const consignmentSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
        const updatedConsignmentSlips = consignmentSlips.map((s: any) => {
          const sameById = s.id === existingTransaction.id;
          const sameByNumber = s.transactionNumber && s.transactionNumber === existingTransaction.transactionNumber;
          return (sameById || sameByNumber) ? { ...s, status: 'draft', persianStatus: 'پیش‌نویس', updatedAt: new Date() } : s;
        });
        saveDataWithNotification('consignment-delivery-slips', updatedConsignmentSlips);
        // بازسازی لیست موجود برای بازتاب فوری
        const ownershipSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
        setExistingSlips([...(updatedConsignmentSlips || []), ...(ownershipSlips || [])]);
      } else {
        const ownershipSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
        const updatedOwnershipSlips = ownershipSlips.map((s: any) => {
          const sameById = s.id === existingTransaction.id;
          const sameByNumber = s.transactionNumber && s.transactionNumber === existingTransaction.transactionNumber;
          return (sameById || sameByNumber) ? { ...s, status: 'draft', persianStatus: 'پیش‌نویس', updatedAt: new Date() } : s;
        });
        saveDataWithNotification('ownership-delivery-slips', updatedOwnershipSlips);
        // بازسازی لیست موجود برای بازتاب فوری
        const consignmentSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
        setExistingSlips([...(consignmentSlips || []), ...(updatedOwnershipSlips || [])]);
      }
    } catch (e) {
      // اگر به هر دلیل ذخیره انجام نشد، ادامه می‌دهیم تا ویرایش باز شود
      console.warn('به‌روزرسانی وضعیت به پیش‌نویس هنگام شروع ویرایش با خطا مواجه شد.', e);
    }

    setIsEditingDelivery(true);
    setIsAddingDelivery(true);

    if (slipType === 'consignment') {
      setCurrentView('consignment-slip');
    } else {
      setCurrentView('new-ownership-slip');
    }
  }, [isEditingDelivery, existingSlips]);

  const handleBackToList = useCallback(() => {
    console.log('🔄 handleBackToList: شروع بازگشت به لیست و رفرش داده‌ها...');
    
    setCurrentView('list');
    setDeliveryCreationMode('general'); // Reset delivery creation mode
    // Reset form states
    setCurrentDelivery({});
    setIsAddingDelivery(false);
    setIsEditingDelivery(false);
    
    // Refresh existing slips when returning to list
    const consignmentSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
    const ownershipSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
    
    console.log('🔄 handleBackToList: داده‌های خوانده شده از storage:', {
      'تعداد حواله‌های امانی': consignmentSlips.length,
      'تعداد حواله‌های تملیکی': ownershipSlips.length,
      'مجموع': consignmentSlips.length + ownershipSlips.length
    });
    
    setExistingSlips([...consignmentSlips, ...ownershipSlips]);
    
    // به‌روزرسانی deliveries state
    const deliveriesData = (storage.loadData('deliveries') || []) as any[];
    setDeliveries(deliveriesData);
    
    console.log('✅ handleBackToList: رفرش داده‌ها کامل شد');
  }, [storage]);

  // Handle export
  const handleExport = useCallback(() => {
    // In a real application, this would export data to CSV or Excel
    window.alert('صدور خروجي اکسل');
  }, []);

  // پرینت حرفه‌ای حواله انبار - فرمت 2025
  const handlePrintTransaction = useCallback((transaction: any) => {
    console.log('🖨️ شروع پرینت حرفه‌ای حواله انبار:', transaction.transactionNumber);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // تعریف displayStatus برای نمایش وضعیت
    const displayStatus = transaction.status || 'draft';

    // ایجاد محتوای HTML برای پرینت
    const printContent = `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>حواله انبار - ${transaction.transactionNumber || transaction.permitNumber || '-'}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Vazirmatn', Tahoma, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        
        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        /* صفحه‌بندی */
        .page {
            min-height: 297mm;
            padding: 20mm;
            page-break-after: always;
            position: relative;
            background: white;
        }
        
        .page:last-child {
            page-break-after: avoid;
        }
        
        /* هدر */
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
        }
        
        .company-name {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .document-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 15px;
            background: rgba(255,255,255,0.2);
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
        }
        
        .document-number {
            font-size: 18px;
            font-weight: 500;
            background: rgba(255,255,255,0.9);
            color: #333;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
        }
        
        /* اطلاعات کلی */
        .info-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 25px;
            margin-bottom: 25px;
            border-radius: 15px;
            border-right: 5px solid #2563eb;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #2563eb;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
            position: relative;
        }
        
        .section-title::after {
            content: '';
            position: absolute;
            bottom: -2px;
            right: 0;
            width: 50px;
            height: 2px;
            background: #2563eb;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .info-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            border-right: 4px solid #10b981;
            transition: transform 0.2s ease;
        }
        
        .info-item:hover {
            transform: translateY(-2px);
        }
        
        .info-label {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
        }
        
        /* جداول */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .data-table th {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 15px;
            text-align: right;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .data-table td {
            padding: 15px;
            border-bottom: 1px solid #e5e7eb;
            text-align: right;
        }
        
        .data-table tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .data-table tr:hover {
            background: #eff6ff;
        }
        
        /* امضاها */
        .signatures {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e5e7eb;
        }
        
        .signature-block {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border: 2px dashed #d1d5db;
        }
        
        .signature-line {
            margin-top: 50px;
            border-bottom: 2px solid #374151;
            padding-bottom: 5px;
            font-weight: 600;
        }
        
        /* فوتر */
        .footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
        }
        
        /* صفحه شمارنده */
        .page-number {
            position: absolute;
            bottom: 10mm;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
        }
        
        /* چاپ */
        @media print {
            body {
                background: white;
            }
            
            .container {
                box-shadow: none;
                max-width: none;
                margin: 0;
                padding: 0;
            }
            
            .page {
                margin: 0;
                padding: 20mm;
                min-height: auto;
            }
            
            .page:last-child {
                page-break-after: avoid;
            }
        }
        
        /* برای صفحه دوم */
        .page2 {
            background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
        }
        
        .page2 .section-title {
            color: #d97706;
        }
        
        .page2 .section-title::after {
            background: #d97706;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- صفحه اول: اطلاعات حواله انبار -->
        <div class="page">
            <div class="header">
                <div class="company-name">شرکت مدیریت انبار</div>
                <div class="document-title">حواله انبار امانی</div>
                <div class="document-number">شماره: ${transaction.transactionNumber || transaction.permitNumber || '-'}</div>
            </div>
            
            <div class="info-section">
                <div class="section-title">اطلاعات کلی حواله</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">شماره تراکنش</div>
                        <div class="info-value">${transaction.transactionNumber || transaction.permitNumber || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">شماره مجوز</div>
                        <div class="info-value">${transaction.permitNumber || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">شماره قرارداد</div>
                        <div class="info-value">${transaction.contractNumber || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">نوع گیرنده</div>
                        <div class="info-value">${transaction.recipientType ? (
                          transaction.recipientType === 'internal-site' ? 'سایت داخلی' :
                          transaction.recipientType === 'contractor-site' ? 'سایت پیمانکار' :
                          transaction.recipientType === 'counterparty' ? 'طرف حساب' :
                          transaction.recipientType === 'customer-counterparty' ? 'مشتری طرف حساب' :
                          transaction.recipientType
                        ) : '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">محصول</div>
                        <div class="info-value">${transaction.productName || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">مقدار حواله</div>
                        <div class="info-value">${formatPersianNumber(transaction.amount || 0)} ${transaction.unit || 'kg'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">تاریخ حواله</div>
                        <div class="info-value">${formatPersianDate(new Date(transaction.slipDate || transaction.deliveryDate || transaction.createdAt))}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">وضعیت</div>
                        <div class="info-value">${displayStatus === 'issued' ? 'صادر شده' : displayStatus === 'draft' ? 'پیش نویس' : displayStatus}</div>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <div class="section-title">اطلاعات تحویل</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">سایت داخلی</div>
                        <div class="info-value">${transaction.internalSiteId && baseData?.internalSites?.find((s: any) => s.id === transaction.internalSiteId)?.name || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">لوکیشن</div>
                        <div class="info-value">${transaction.locationId && baseData?.locations?.find((l: any) => l.id === transaction.locationId)?.name || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">سایت پیمانکار</div>
                        <div class="info-value">${transaction.contractorSiteId && baseData?.contractorSites?.find((s: any) => s.id === transaction.contractorSiteId)?.name || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">طرف حساب تحویل گیرنده</div>
                        <div class="info-value">${transaction.deliveryCounterpartyName || transaction.counterpartyName || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">لوکیشن طرف حساب</div>
                        <div class="info-value">${transaction.companyLocationId && baseData?.companiesLocation?.find((l: any) => l.id === transaction.companyLocationId)?.name || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">مشتری طرف حساب</div>
                        <div class="info-value">${transaction.customerCounterpartyName || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">لوکیشن مشتری طرف حساب</div>
                        <div class="info-value">${transaction.customerLocationId && baseData?.customerCompaniesLocation?.find((l: any) => l.id === transaction.customerLocationId)?.name || '-'}</div>
                    </div>
                </div>
            </div>
            
            <div class="signatures">
                <div class="signature-block">
                    <div class="signature-line">امضای مسئول انبار</div>
                </div>
                <div class="signature-block">
                    <div class="signature-line">امضای دریافت کننده</div>
                </div>
            </div>
            
            <div class="footer">
                تاریخ چاپ: ${formatPersianDate(new Date())} | شرکت مدیریت انبار
            </div>
            <div class="page-number">صفحه 1 از 2</div>
        </div>
        
        <!-- صفحه دوم: اطلاعات رسید انبار و مجوز -->
        <div class="page page2">
            <div class="header">
                <div class="company-name">شرکت مدیریت انبار</div>
                <div class="document-title">اطلاعات رسید انبار و مجوز</div>
                <div class="document-number">شماره حواله: ${transaction.transactionNumber || transaction.permitNumber || '-'}</div>
            </div>
            
            <div class="info-section">
                <div class="section-title">اطلاعات رسید انبار</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">شماره رسید انبار</div>
                        <div class="info-value">${transaction.receiptNumber || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">سایت موجودی</div>
                        <div class="info-value">${transaction.siteName || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">مخزن موجودی</div>
                        <div class="info-value">${transaction.tankName || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">نام کالا</div>
                        <div class="info-value">${transaction.productName || '-'}</div>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <div class="section-title">اطلاعات مجوز</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">شماره مجوز</div>
                        <div class="info-value">${transaction.permitNumber || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">شماره قرارداد</div>
                        <div class="info-value">${transaction.contractNumber || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">مانده مجوز حواله</div>
                        <div class="info-value">${formatPersianNumber(transaction.remainingPermitAmount || 0)} ${transaction.unit || 'kg'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">مقدار مجوز</div>
                        <div class="info-value">${formatPersianNumber(transaction.permitAmount || 0)} ${transaction.unit || 'kg'}</div>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <div class="section-title">اطلاعات تکمیلی</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">رخداد</div>
                        <div class="info-value">${transaction.event || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">تاریخ ایجاد</div>
                        <div class="info-value">${formatPersianDate(new Date(transaction.createdAt))}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">آخرین بروزرسانی</div>
                        <div class="info-value">${formatPersianDate(new Date(transaction.updatedAt || transaction.createdAt))}</div>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                تاریخ چاپ: ${formatPersianDate(new Date())} | شرکت مدیریت انبار | صفحه 2 از 2
            </div>
            <div class="page-number">صفحه 2 از 2</div>
        </div>
    </div>
    
    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }, [baseData, formatPersianDate, formatPersianNumber]);

  // Handle refresh - بهبود یافته
  const handleRefresh = useCallback(() => {
    console.log('🔄 شروع به‌روزرسانی داده‌ها...');
    // به‌روزرسانی مانده مجوزها بر اساس حواله‌های جدید
    const updatedPermits = permits.map((permit: any) => {
      const totalIssued = deliveries
        .filter((d: any) => d.permitId === permit.id && d.status === 'issued')
        .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
      
      if (permit.remainingTransferPermit !== (permit.permitAmount || 0) - totalIssued) {
        const calculatedRemaining = (permit.permitAmount || 0) - totalIssued;
        console.log(`به‌روزرسانی مانده مجوز ${permit.systemPermitNumber}: از ${permit.remainingTransferPermit} به ${calculatedRemaining}`);
        permit.remainingTransferPermit = Math.max(0, calculatedRemaining);
        permit.updatedAt = new Date();
      }
    });
    
    saveDataWithNotification('delivery-permits', updatedPermits);
    updateSharedData('permits', updatedPermits);
    
    // بروزرسانی موجودی‌ها در صورت نیاز
    const inventoryRefreshKey = Date.now();
    setInventoryRefreshKey(inventoryRefreshKey);
    
    console.log('✅ به‌روزرسانی داده‌ها کامل شد');
    onRefresh();
  }, [onRefresh, storage, updateSharedData, permits, deliveries]);

  // دريافت اطلاعات کامل مجوز از سيستم مجوزها
  const getPermitInfo = (permitId: string) => {
    const permits = (storage.loadData('delivery-permits') || []) as any[];
    return permits.find((p: any) => p.id === permitId);
  };

  // Filter permits into issued and closed - فقط مجوزهاي تأييد شده نمايش داده مي‌شوند
  const { issuedPermits, closedPermits } = useMemo(() => {
    const allPermits = (storage.loadData('delivery-permits') || []) as any[];
    const issued = allPermits.filter((p: any) => {
      // بررسی null
      if (!p) return false;
      // ناديده گرفتن مجوزهاي ابطال شده
      if (p.isVoided) return false;
      // فقط مجوزهايي که تأييد شده‌اند نمايش داده شوند
      if (!p.approvalDate) return false;
      // محاسبه مجموع حواله‌هاي در وضعیت "صادر شده" از اين مجوز
      const deliveriesForPermit = deliveries.filter(d => d.permitId === p.id && !d.isVoided && d.status === 'issued');
      const totalIssued = deliveriesForPermit.reduce((sum, d) => sum + (d.amount || 0), 0);
      // محاسبه مانده مجوز حواله: مقدار مجوز - مجموع حواله‌هاي صادر شده
      const remainingTransferPermit = (p.permitAmount || 0) - totalIssued;
      // مجوز صادر شده است اگر مانده مجوز حواله بزرگتر از صفر باشد
      return remainingTransferPermit > 0;
    });
    const closed = allPermits.filter((p: any) => {
      // بررسی null
      if (!p) return false;
      // ناديده گرفتن مجوزهاي ابطال شده
      if (p.isVoided) return false;
      // فقط مجوزهايي که تأييد شده‌اند نمايش داده شوند
      if (!p.approvalDate) return false;
      // محاسبه مجموع حواله‌هاي در وضعیت "صادر شده"
      const deliveriesForPermit = deliveries.filter(d => d.permitId === p.id && !d.isVoided && d.status === 'issued');
      const totalIssued = deliveriesForPermit.reduce((sum, d) => sum + (d.amount || 0), 0);
      // محاسبه مانده مجوز حواله: مقدار مجوز - مجموع حواله‌هاي صادر شده
      const remainingTransferPermit = (p.permitAmount || 0) - totalIssued;
      // مجوز بسته شده است اگر مانده مجوز حواله صفر يا کمتر از صفر باشد
      // يعني تمام مجوز صادر شده به حواله تبديل شده و باقيمانده ندارد
      return remainingTransferPermit <= 0;
    });
    return { issuedPermits: issued, closedPermits: closed };
  }, [deliveries, storage]);

  // Get receipt information for selected permit (currently unused but kept for future use)
  // const receiptInfo = useMemo(() => {
  //   if (!selectedPermit) return null;
  //   const receipts = (storage.loadData('receipts') || []) as any[];
  //   return receipts.find((r: any) => r.id === selectedPermit.receiptId);
  // }, [selectedPermit, storage]);

  // Get addition/subtraction documents for selected permit (currently unused but kept for future use)
  // const additionSubtractionDocs = useMemo(() => {
  //   if (!selectedPermit) return [];
  //   const allDocs = (storage.loadData('inventoryAdjustments') || []) as any[];
  //   return allDocs.filter((doc: any) => 
  //     doc.contractId === selectedPermit.contractId || 
  //     doc.permitId === selectedPermit.id
  //   );
  // }, [selectedPermit, storage]);

  // Calculate owned tanks inventory based on user formula
  const calculateOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن تملیکی:', { siteId, tankId });
    
    // اطمینان از دریافت داده‌های معتبر
    const allReceipts = ((storage.loadData('receipts') || []) as any[]).filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= upToDate
    );
    const allAdjustments = ((storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= upToDate
    );
    const allDeliveries = ((storage.loadData('ownership-delivery-slips') || []) as any[]).filter((d: any) => 
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
    const allWastageTransactions = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
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
    const allConversions = ((storage.loadData('productConversions') || []) as any[]).filter((c: any) => 
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
  }, [upToDate, selectedDate, selectedSiteForFilter, selectedTankForFilter]);

  // Calculate consignment tanks inventory - بهبود یافته برای به‌روزرسانی
  const calculateConsignmentTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن امانی:', { siteId, tankId, refreshKey: inventoryRefreshKey });
    
    // اطمینان از خواندن آخرین داده‌ها
    const allReceipts = ((storage.loadData('receipts') || []) as any[]).filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= upToDate
    );
    const allAdjustments = ((storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= upToDate
    );
    const allConsignmentDeliveries = ((storage.loadData('consignment-delivery-slips') || []) as any[]).filter((d: any) => {
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
    
    const consignmentDeliveries = allConsignmentDeliveries
      .filter((d: any) => {
        if (!d || typeof d !== 'object' || d.isVoided) return false;
        
        // تشخیص حواله امانی بر اساس معیارهای مختلف
        const isConsignmentDelivery = 
          // بر اساس نوع کاربر
          d.userType === 'consignment' ||
          // بر اساس وجود مجوز
          d.permitId ||
          // بر اساس شماره قرارداد
          d.contractNumber ||
          // بر اساس نوع فیلد (برای backward compatibility)
          d.type === 'امانی';
        
        // فقط حواله‌های امانی را شامل شود
        if (!isConsignmentDelivery) return false;
        
        // فیلتر مکان و مخزن
        return (!currentSiteId || d.siteId === currentSiteId) &&
               (!currentTankId || d.tankId === currentTankId);
      })
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    console.log('🔍 دیباگ حواله‌های امانی در WarehouseDeliveryManager:', {
      'تعداد کل consignment-delivery-slips': allConsignmentDeliveries.length,
      'مقدار محاسبه شده consignmentDeliveries': consignmentDeliveries,
      'فیلترها': { currentSiteId, currentTankId, upToDate },
      'تعداد داده‌های اولیه': allConsignmentDeliveries.length,
      'مثال چند رکورد اول': allConsignmentDeliveries.slice(0, 3).map(d => ({
        userType: d.userType,
        permitId: d.permitId,
        contractNumber: d.contractNumber,
        type: d.type,
        amount: d.amount,
        siteId: d.siteId,
        tankId: d.tankId,
        deliveryDate: d.deliveryDate
      }))
    });

    const allWastageTransactions = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
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
    const allConversions = ((storage.loadData('productConversions') || []) as any[]).filter((c: any) => 
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

    console.log('📊 نتایج محاسبه موجودی امانی:', {
      consignmentReceiptsAmount,
      consignmentAdditions,
      consignmentDeliveries, // تمام حواله‌های امانی (چه پیش‌نویس چه صادر شده)
      consignmentDeductionAmount,
      consignmentDeductionDocuments,
      consignmentConsumedProducts,
      consignmentProducedProducts,
      finalInventory: totalConsignmentValue,
      totalDeliveries: allConsignmentDeliveries.length,
      currentSiteId,
      currentTankId,
      refreshKey: inventoryRefreshKey,
      deliveryFilters: 'شامل تمام حواله‌های امانی بدون توجه به وضعیت'
    });

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
  }, [upToDate, selectedDate, selectedSiteForFilter, selectedTankForFilter, inventoryRefreshKey]);

  // Calculate consignment+owned tanks inventory - بهبود یافته برای به‌روزرسانی
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
    
    console.log('📊 نتایج محاسبه موجودی امانی/تملیکی:', {
      ownedDeliveries: owned.ownedDeliveries,
      consignmentDeliveries: consignment.consignmentDeliveries,
      totalDeliveries: owned.ownedDeliveries + consignment.consignmentDeliveries,
      finalInventory: result.finalInventory
    });

    return result;
  }, [calculateOwnedTanksInventory, calculateConsignmentTanksInventory]);

  // Helper function to calculate total tank capacity based on filters
  const calculateTotalTankCapacity = useCallback((siteId?: string, tankId?: string) => {
    const tanks = baseData?.tanks || [];
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
  }, [baseData?.tanks, selectedSiteForFilter, selectedTankForFilter]);

  // Helper function to calculate empty tank capacity - مشابه صفحه کسر/اضافه انبار (currently unused but kept for future use)
  // const calculateEmptyTankCapacity = useCallback(() => {
  //   const totalCapacity = calculateTotalTankCapacity();
  //   const inventory = calculateConsignmentOwnedTanksInventory();
  //   const finalInventory = inventory.finalInventory || 0;
  //   // فرمول مشابه InventoryAdjustmentManager: ظرفیت کل - موجودی نهایی
  //   return Math.max(0, totalCapacity - finalInventory);
  // }, [calculateTotalTankCapacity, calculateConsignmentOwnedTanksInventory]);

  // Calculate warehouse inventory - بهبود فرمول محاسبه موجودي (currently unused but kept for future use)
  // const warehouseInventory = useMemo(() => {
  //   const receipts = (storage.loadData('receipts') || []) as any[];
  //   const deliveries = (storage.loadData('deliveries') || []) as any[];
  //   const additionDocs = (storage.loadData('inventoryAdjustments') || []) as any[];
  //   
  //   // Group by site and tank
  //   const inventory: Record<string, any> = {};
  //   
  //   // تفکیک رسیدها بر اساس نوع (امانی/تملیکی)
  //   const consignmentReceipts = receipts.filter((r: any) => r.userType === 'consignment' && !r.isVoided);
  //   const ownershipReceipts = receipts.filter((r: any) => r.userType === 'owned' && !r.isVoided);
  //   
  //   // Process consignment receipts - رسيدهاي اماني
  //   consignmentReceipts.forEach((receipt: any) => {
  //     const key = `${receipt.siteId}-${receipt.tankId}`;
  //     if (!inventory[key]) {
  //       inventory[key] = {
  //         siteId: receipt.siteId,
  //         siteName: receipt.siteName,
  //         tankId: receipt.tankId,
  //         tankName: receipt.tankName,
  //         capacity: receipt.tankCapacity || 0,
  //         totalConsignmentReceipt: 0,
  //         totalOwnershipReceipt: 0,
  //         totalConsignmentDelivery: 0,
  //         totalOwnershipDelivery: 0,
  //         totalAddition: 0,
  //         totalSubtraction: 0,
  //         products: {},
  //         counterparty: 'امانی/تملیکی'
  //       };
  //     }
  //     inventory[key].totalConsignmentReceipt += receipt.amount || 0;
  //     // Track products
  //     if (!inventory[key].products[receipt.productName]) {
  //       inventory[key].products[receipt.productName] = 0;
  //     }
  //     inventory[key].products[receipt.productName] += receipt.amount || 0;
  //   });
  //   
  //   // Process ownership receipts - رسیدهای تملیکی
  //   ownershipReceipts.forEach((receipt: any) => {
  //     const key = `${receipt.siteId}-${receipt.tankId}`;
  //     if (!inventory[key]) {
  //       inventory[key] = {
  //         siteId: receipt.siteId,
  //         siteName: receipt.siteName,
  //         tankId: receipt.tankId,
  //         tankName: receipt.tankName,
  //         capacity: receipt.tankCapacity || 0,
  //         totalConsignmentReceipt: 0,
  //         totalOwnershipReceipt: 0,
  //         totalConsignmentDelivery: 0,
  //         totalOwnershipDelivery: 0,
  //         totalAddition: 0,
  //         totalSubtraction: 0,
  //         products: {},
  //         counterparty: 'امانی/تملیکی'
  //       };
  //     }
  //     inventory[key].totalOwnershipReceipt += receipt.amount || 0;
  //     // Track products
  //     if (!inventory[key].products[receipt.productName]) {
  //       inventory[key].products[receipt.productName] = 0;
  //     }
  //     inventory[key].products[receipt.productName] += receipt.amount || 0;
  //   });
  //   
  //   // Process deliveries - تفکيک حواله‌ها بر اساس نوع
  //   const consignmentDeliveries = deliveries.filter((d: any) => (d.contractNumber || d.permitId) && !d.isVoided);
  //   const ownershipDeliveries = deliveries.filter((d: any) => !d.contractNumber && !d.permitId && !d.isVoided);
  //   
  //   // Process consignment deliveries - حواله‌هاي اماني
  //   consignmentDeliveries.forEach((delivery: any) => {
  //     const key = `${delivery.siteId}-${delivery.tankId}`;
  //     if (inventory[key]) {
  //       inventory[key].totalConsignmentDelivery += delivery.amount || 0;
  //     }
  //   });
  //   
  //   // Process ownership deliveries - حواله‌های تملیکی
  //   ownershipDeliveries.forEach((delivery: any) => {
  //     const key = `${delivery.siteId}-${delivery.tankId}`;
  //     if (inventory[key]) {
  //       inventory[key].totalOwnershipDelivery += delivery.amount || 0;
  //     }
  //   });
  //   
  //   // Process addition documents - سند اضافه انبار
  //   additionDocs.forEach((doc: any) => {
  //     if (doc.isVoided) return;
  //     if (doc.adjustmentType === 'addition') {
  //       const key = `${doc.siteId}-${doc.tankId}`;
  //       if (inventory[key]) {
  //         inventory[key].totalAddition += doc.quantity || 0;
  //         // Track products
  //         if (!inventory[key].products[doc.productName]) {
  //           inventory[key].products[doc.productName] = 0;
  //         }
  //         inventory[key].products[doc.productName] += doc.quantity || 0;
  //       }
  //     }
  //   });
  //   
  //   // Process subtraction documents - سند کسر انبار
  //   additionDocs.forEach((doc: any) => {
  //     if (doc.isVoided) return;
  //     if (doc.adjustmentType === 'deduction') {
  //       const key = `${doc.siteId}-${doc.tankId}`;
  //       if (inventory[key]) {
  //         inventory[key].totalSubtraction += doc.quantity || 0;
  //       }
  //     }
  //   });
  //   
  //   // Calculate remaining inventory with improved formula:
  //   // (جمع تمام رسیدهای امانی + جمع تمام رسیدهای تملیکی + سند اضافه انبار امانی + سند اضافه انبار تملیکی) - 
  //   // (جمع تمام حواله‌های امانی + جمع تمام حواله‌های تملیکی + سند کسر انبار امانی + سند کسر انبار تملیکی)
  //   Object.values(inventory).forEach((item: any) => {
  //     item.remaining = (
  //       item.totalConsignmentReceipt + 
  //       item.totalOwnershipReceipt + 
  //       item.totalAddition - 
  //       item.totalConsignmentDelivery - 
  //       item.totalOwnershipDelivery - 
  //       item.totalSubtraction
  //     );
  //     item.remainingCapacity = item.capacity - item.remaining;
  //   });
  //   
  //   return Object.values(inventory);
  // }, [storage]);

  // Handle permit selection (currently unused but kept for future use)
  // const handleSelectPermit = useCallback((permit: any) => {
  //   setSelectedPermit(permit);
  //   // Load receipt information
  //   const receipts = (storage.loadData('receipts') || []) as any[];
  //   const receiptInfo = receipts.find((r: any) => r.id === permit.receiptId);
  //   // Load addition/subtraction documents
  //   const additionDocs = (storage.loadData('inventoryAdjustments') || []) as any[];
  //   const additionSubtractionDocs = additionDocs.filter((doc: any) => doc.contractId === permit.contractId);
  //   // Update selected permit with additional information
  //   const updatedPermit = {
  //     ...permit,
  //     receiptInfo,
  //     additionSubtractionDocs
  //   };
  //   setSelectedPermit(updatedPermit);
  // }, [storage]);

  // Calculate remaining inventory for a permit - فرمول صحیح بر اساس درخواست کاربر
  const calculateRemainingInventory = useCallback((permitId: string, isEditing: boolean = false, currentTransactionId?: string, editingSource?: 'parent' | 'transaction-list') => {
    const permits = (storage.loadData('delivery-permits') || []) as any[];
    const permit = permits.find((p: any) => p.id === permitId);
    if (!permit) return 0;
    
    const deliveries = (storage.loadData('deliveries') || []) as any[];
    const deliveriesForPermit = deliveries.filter((d: any) => d.permitId === permitId && !d.isVoided);
    
    // محاسبه فقط تراکنش‌هایی که در وضعیت "صادر شده" هستند
    const totalIssuedDeliveries = deliveriesForPermit
      .filter((d: any) => d.status === 'issued')
      .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    
    // فرمول جدید کاربر: "مانده مجوز حواله" = (مقدار مجوز اولیه - کل حواله‌هایی که در وضعیت صادر شده هستند)
    if (isEditing && currentTransactionId && editingSource) {
      if (editingSource === 'transaction-list') {
        // حالت ویرایش از مستقیم: حواله فعلی را از محاسبات حذف و سپس دوباره اضافه می‌کنیم
        const currentTransaction = deliveriesForPermit.find((d: any) => d.id === currentTransactionId);
        const currentTransactionAmount = currentTransaction ? (currentTransaction.amount || 0) : 0;
        
        // اگر حواله فعلی در وضعیت "صادر شده" است، آن را از محاسبات حذف می‌کنیم
        let adjustedTotalIssued = totalIssuedDeliveries;
        if (currentTransaction && currentTransaction.status === 'issued') {
          adjustedTotalIssued -= currentTransactionAmount;
        }
        
        // فرمول: (مقدار مجوز - کل حواله‌های صادر شده) + مقدار حواله فعلی
        return Math.max(0, (permit.permitAmount - adjustedTotalIssued) + currentTransactionAmount);
      }
      // در حالت ویرایش والد، حواله فعلی در محاسبات باقی می‌ماند
      return Math.max(0, permit.permitAmount - totalIssuedDeliveries);
    }
    
    // فرمول نهایی (حالت ایجاد): مقدار مجوز - کل حواله‌های صادر شده
    return Math.max(0, permit.permitAmount - totalIssuedDeliveries);
  }, [storage]);

  // Handle creating delivery from permit - اصلاح منطق تشخيص حالت ايجاد vs ويرايش
 // Handle creating delivery from permit - اصلاح منطق تشخيص حالت ايجاد vs ويرايش
// Handle creating delivery from permit - اصلاح منطق تشخيص حالت ايجاد vs ويرايش
const handleCreateDeliveryFromPermit = useCallback((permit: any) => {
  // دريافت اطلاعات کامل مجوز
  const permits = (storage.loadData('delivery-permits') || []) as any[];
  const fullPermit = permits.find((p: any) => p.id === permit.id);
  // دريافت اطلاعات رسيد انبار مرتبط با مجوز
  const receipts = (storage.loadData('receipts') || []) as any[];
  const receipt = receipts.find((r: any) => r.id === fullPermit?.receiptId);
  // دريافت اطلاعات قرارداد مرتبط با رسيد
  const contracts = (storage.loadData('contracts') || []) as any[];
  const contract = contracts.find((c: any) => c.id === receipt?.contractId);
  // ايجاد تراکنش جديد - هميشه از نوع اماني از طريق مجوز
  const newDelivery = createNewDelivery('consignment', true);
  // Reset states براي حالت ايجاد جديد
  setIsEditingDelivery(false);
  setIsAddingDelivery(true);
  
  // استخراج اطلاعات "طرف حسابی تحویل دهنده کالا" از منابع مختلف - روش‌های متعدد و پشت‌سرهم
  let deliveryCounterpartyId = '';
  let deliveryCounterpartyName = '';
  
  // روش ۱: از مجوز کامل
  if (!deliveryCounterpartyId) deliveryCounterpartyId = fullPermit?.counterpartyId;
  if (!deliveryCounterpartyName) deliveryCounterpartyName = fullPermit?.counterpartyName;
  
  // روش ۲: از مجوز اولیه
  if (!deliveryCounterpartyId) deliveryCounterpartyId = permit?.counterpartyId;
  if (!deliveryCounterpartyName) deliveryCounterpartyName = permit?.counterpartyName;
  
  // روش ۳: از قرارداد
  if (!deliveryCounterpartyId) deliveryCounterpartyId = contract?.counterpartyId;
  if (!deliveryCounterpartyName) deliveryCounterpartyName = contract?.counterpartyName || contract?.supplierName;
  
  // روش ۴: از رسید انبار
  if (!deliveryCounterpartyId) deliveryCounterpartyId = receipt?.deliveryCounterpartyId;
  if (!deliveryCounterpartyName) deliveryCounterpartyName = receipt?.deliveryCounterpartyName || receipt?.customerCounterpartyName;
  
  // روش ۵: از قرارداد (فیلدهای دیگر)
  if (!deliveryCounterpartyId) deliveryCounterpartyId = contract?.deliveryCounterpartyId;
  if (!deliveryCounterpartyName) deliveryCounterpartyName = contract?.deliveryCounterpartyName;
  
  // روش ۶: از مجوز (فیلدهای دیگر)
  if (!deliveryCounterpartyId) deliveryCounterpartyId = fullPermit?.deliveryCounterpartyId;
  if (!deliveryCounterpartyName) deliveryCounterpartyName = fullPermit?.deliveryCounterpartyName;
  
  // روش ۷: دریافت از تمام داده‌های موجود در receipt
  if (!deliveryCounterpartyId && receipt) {
    deliveryCounterpartyId = receipt.counterpartyId || receipt.partyId || receipt.partnerId || receipt.deliveryCounterpartyId;
  }
  if (!deliveryCounterpartyName && receipt) {
    deliveryCounterpartyName = receipt.counterpartyName || receipt.partyName || receipt.partnerName || receipt.customerCounterpartyName || receipt.deliveryCounterpartyName;
  }
  
  // روش ۸: دریافت از تمام داده‌های موجود در contract
  if (!deliveryCounterpartyId && contract) {
    deliveryCounterpartyId = contract.counterpartyId || contract.partyId || contract.partnerId || contract.deliveryCounterpartyId;
  }
  if (!deliveryCounterpartyName && contract) {
    deliveryCounterpartyName = contract.counterpartyName || contract.partyName || contract.partnerName || contract.supplierName || contract.deliveryCounterpartyName;
  }
  
  // روش ۹: دریافت از تمام داده‌های موجود در fullPermit
  if (!deliveryCounterpartyId && fullPermit) {
    deliveryCounterpartyId = fullPermit.counterpartyId || fullPermit.partyId || fullPermit.partnerId || fullPermit.deliveryCounterpartyId;
  }
  if (!deliveryCounterpartyName && fullPermit) {
    deliveryCounterpartyName = fullPermit.counterpartyName || fullPermit.partyName || fullPermit.partnerName || fullPermit.supplierName || fullPermit.deliveryCounterpartyName;
  }
  
  // روش ۱۰: دریافت از تمام داده‌های موجود در permit
  if (!deliveryCounterpartyId && permit) {
    deliveryCounterpartyId = permit.counterpartyId || permit.partyId || permit.partnerId || permit.deliveryCounterpartyId;
  }
  if (!deliveryCounterpartyName && permit) {
    deliveryCounterpartyName = permit.counterpartyName || permit.partyName || permit.partnerName || permit.supplierName || permit.deliveryCounterpartyName;
  }
  
  // گزارش داده‌های یافت شده برای دیباگ
  console.log('🔍 استخراج اطلاعات طرف حسابی تحویل دهنده کالا:', {
    'deliveryCounterpartyId': deliveryCounterpartyId,
    'deliveryCounterpartyName': deliveryCounterpartyName,
    'منابع بررسی شده': {
      'fullPermit': {
        'counterpartyId': fullPermit?.counterpartyId,
        'counterpartyName': fullPermit?.counterpartyName,
        'deliveryCounterpartyId': fullPermit?.deliveryCounterpartyId,
        'deliveryCounterpartyName': fullPermit?.deliveryCounterpartyName
      },
      'permit': {
        'counterpartyId': permit?.counterpartyId,
        'counterpartyName': permit?.counterpartyName,
        'deliveryCounterpartyId': permit?.deliveryCounterpartyId,
        'deliveryCounterpartyName': permit?.deliveryCounterpartyName
      },
      'contract': {
        'counterpartyId': contract?.counterpartyId,
        'counterpartyName': contract?.counterpartyName,
        'supplierName': contract?.supplierName,
        'deliveryCounterpartyId': contract?.deliveryCounterpartyId,
        'deliveryCounterpartyName': contract?.deliveryCounterpartyName
      },
      'receipt': {
        'counterpartyId': receipt?.counterpartyId,
        'counterpartyName': receipt?.counterpartyName,
        'customerCounterpartyName': receipt?.customerCounterpartyName,
        'deliveryCounterpartyId': receipt?.deliveryCounterpartyId,
        'deliveryCounterpartyName': receipt?.deliveryCounterpartyName
      }
    }
  });
  
  // استخراج نام سایت داخلی، لوکیشن، سایت پیمانکار، و لوکیشن طرف حساب از baseData
  // Note: These are calculated but not used - values are taken directly from fullPermit/receipt in setCurrentDelivery
  // const internalSiteId = fullPermit?.internalSiteId || receipt?.internalSiteId || '';
  // const internalSiteName = internalSiteId ? (
  //   baseData?.internalSites?.find((s: any) => s.id === internalSiteId)?.name || 
  //   fullPermit?.internalSiteName || 
  //   receipt?.internalSiteName || ''
  // ) : '';
  // 
  // const locationId = fullPermit?.locationId || receipt?.locationId || '';
  // const locationName = locationId ? (
  //   baseData?.locations?.find((l: any) => l.id === locationId)?.name || 
  //   fullPermit?.locationName || 
  //   receipt?.locationName || ''
  // ) : '';
  // 
  // const contractorSiteId = fullPermit?.contractorSiteId || receipt?.contractorSiteId || '';
  // const contractorSiteName = contractorSiteId ? (
  //   baseData?.contractorSites?.find((s: any) => s.id === contractorSiteId)?.name || 
  //   fullPermit?.contractorSiteName || 
  //   receipt?.contractorSiteName || ''
  // ) : '';
  // 
  // const companyLocationId = fullPermit?.companyLocationId || receipt?.companyLocationId || contract?.companyLocationId || '';
  // const companyLocationName = companyLocationId ? (
  //   baseData?.companiesLocation?.find((l: any) => l.id === companyLocationId)?.name || 
  //   fullPermit?.companyLocationName || 
  //   receipt?.counterpartyLocationName || ''
  // ) : (receipt?.counterpartyLocationName || '');
  // 
  // const customerLocationId = fullPermit?.customerLocationId || receipt?.customerLocationId || contract?.customerLocationId || '';
  // const customerLocationName = customerLocationId ? (
  //   baseData?.customerCompaniesLocation?.find((l: any) => l.id === customerLocationId)?.name || 
  //   fullPermit?.customerLocationName || 
  //   receipt?.customerCounterpartyLocationName || ''
  // ) : (receipt?.customerCounterpartyLocationName || '');
  
  // انتقال تمام اطلاعات مجوز، رسيد و قرارداد به حواله جديد
  setCurrentDelivery({
    ...newDelivery,
    // اطلاعات اصلي مجوز
    permitId: fullPermit?.id,
    permitNumber: fullPermit?.systemPermitNumber,
    managementLetterNumber: fullPermit?.managementLetterNumber,
    permitAmount: fullPermit?.permitAmount,
    remainingPermitAmount: fullPermit?.remainingTransferPermit,
    finalPermitAmount: fullPermit?.finalPermitAmount,
    remainingTransferPermit: fullPermit?.remainingTransferPermit,
    permitDate: fullPermit?.permitDate,
    approvalDate: fullPermit?.approvalDate,
    status: fullPermit?.status,
    event: fullPermit?.event,
    // اطلاعات طرف حساب و قرارداد (این فیلدها در ادامه دوباره تعریف می‌شوند)
    contractId: fullPermit?.contractId,
    contractNumber: contract?.contractNumber,
    // اطلاعات رسيد انبار
    receiptId: fullPermit?.receiptId,
    receiptNumber: receipt?.transactionNumber,
    productName: receipt?.productName,
    siteId: receipt?.siteId,
    siteName: receipt?.siteName,
    tankId: receipt?.tankId,
    tankName: receipt?.tankName,
    unit: receipt?.unit || 'kg',
    wastageAmount: receipt?.wastageAmount || 0,
    receiptBasisAmount: receipt?.receiptBasisAmount || 0,
    // receiptAmount removed - not in WarehouseDelivery type
    driverName: receipt?.driverName || '',
    driverNationalId: receipt?.driverNationalId || '',
    driverPlateNumber: receipt?.driverPlateNumber || '',
    shipName: receipt?.shipName || '',
    quotaNumber: receipt?.quotaNumber || '',
    registrationOrderNumber: receipt?.registrationOrderNumber || '',
    // indexNumber removed - not in WarehouseDelivery type
    // cotageNumber removed - not in WarehouseDelivery type
    // counterpartyLocationName and customerCounterpartyLocationName removed - not in WarehouseDelivery type
    
    // ⭐ اطمینان از انتقال کامل 5 فیلد مورد نظر کاربر برای نمایش در جدول "تراکنش‌های ثبت شده امانی":
    
    // 1. طرف حساب (Counterparty)
    // counterpartyId removed - not in WarehouseDelivery type, use counterpartyName instead
    counterpartyName: permit?.counterpartyName || fullPermit?.counterpartyName || contract?.counterpartyName || contract?.supplierName || receipt?.customerCounterpartyName || '',
    
    // 2. لوکیشن مشتری طرف حساب (Customer Counterparty Location)
    customerLocationId: fullPermit?.customerLocationId || receipt?.customerLocationId || contract?.customerLocationId || '',
    customerLocationName: fullPermit?.customerLocationName || receipt?.customerCounterpartyLocationName || '',
    
    // 3. سایت داخلی (Internal Site)
    internalSiteId: fullPermit?.internalSiteId || receipt?.internalSiteId || '',
    internalSiteName: fullPermit?.internalSiteName || receipt?.internalSiteName || '',
    
    // 4. لوکیشن (Location)
    locationId: fullPermit?.locationId || receipt?.locationId || '',
    locationName: fullPermit?.locationName || receipt?.locationName || '',
    
    // 5. سایت پیمانکار (Contractor Site)
    contractorSiteId: fullPermit?.contractorSiteId || receipt?.contractorSiteId || '',
    contractorSiteName: fullPermit?.contractorSiteName || receipt?.contractorSiteName || '',
    
    // اطلاعات تکمیلی برای انواع مختلف گیرنده
    companyLocationId: fullPermit?.companyLocationId || receipt?.companyLocationId || contract?.companyLocationId || '',
    companyLocationName: fullPermit?.companyLocationName || receipt?.counterpartyLocationName || '',
    customerCompanyId: fullPermit?.customerCompanyId || receipt?.customerCompanyId || contract?.customerCompanyId || '',
    // customerCounterpartyName removed - not in WarehouseDelivery type
  });
  // انتقال به نماي اماني
  setCurrentView('consignment-slip');
}, [createNewDelivery, storage]);

  // Handle transaction save - اصلاح شده براي مديريت صحيح موجودي مجوز در حالت ويرايش
  const handleSaveTransaction = useCallback(() => {
    // بررسی اطلاعات ضروری
    if (!currentDelivery.permitId && !currentDelivery.contractNumber && currentDelivery.userType !== 'owned') {
      alert('خطا: اطلاعات تراکنش ناقص است. مجوز، شماره قرارداد یا نوع تملیکی الزامی است.');
      return;
    }

    // validation تاریخ حواله - اضافه شده
    const deliveryDate = currentDelivery.deliveryDate || currentDelivery.slipDate || new Date();
    const today = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setDate(today.getDate() + 30); // حداکثر 30 روز آینده
    
    if (deliveryDate > maxFutureDate) {
      alert('خطا: تاریخ حواله نمی‌تواند بیش از 30 روز آینده باشد.');
      return;
    }
    
    // بررسی اینکه تاریخ معتبر باشد
    if (deliveryDate.toString() === 'Invalid Date') {
      alert('خطا: تاریخ حواله معتبر نیست.');
      return;
    }

    // محاسبه مانده مجوز حواله بر اساس حالت ویرایش - بهبود یافته
    let maxAmount = currentDelivery.remainingPermitAmount || 0;

    if (currentDelivery.permitId) {
      const deliveries = (storage.loadData('deliveries') || []) as any[];
      const allDeliveries = deliveries.filter((d: any) => d.permitId === currentDelivery.permitId && !d.isVoided);
      
      if (currentDelivery._editingSource === 'parent') {
        // روش ب) حالت ویرایش والد: فقط حواله‌های "صادر شده" محاسبه شوند
        // مانده = مقدار مجوز - مجموع حواله‌های در وضعیت "صادر شده"
        const totalIssuedDeliveries = allDeliveries
          .filter((d: any) => d.status === 'issued')
          .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        maxAmount = Math.max(0, (currentDelivery.permitAmount || 0) - totalIssuedDeliveries);
        console.log('حالت ویرایش والد - فرمول محاسبه مانده مجوز (اصلاح شده):', {
          permitAmount: currentDelivery.permitAmount,
          totalIssuedDeliveries,
          formula: `${currentDelivery.permitAmount} - ${totalIssuedDeliveries} = ${maxAmount}`,
          explanation: 'مقدار مجوز اولیه - کل حواله‌هایی که در وضعیت "صادر شده" هستند'
        });
      } else if (currentDelivery._editingSource === 'transaction-list') {
        // روش الف) حالت ویرایش مستقیم: فقط حواله‌های "صادر شده" محاسبه شوند
        // مانده = مقدار مجوز - مجموع حواله‌های در وضعیت "صادر شده" (به‌جز همین تراکنش در صورت issued بودن)
        const totalIssuedDeliveries = allDeliveries
          .filter((d: any) => d.status === 'issued')
          .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        const currentAmount = currentDelivery.amount || 0;

        let adjustedTotalIssued = totalIssuedDeliveries;
        const currentTransaction = allDeliveries.find((d: any) => d.id === currentDelivery.id);
        if (currentTransaction && currentTransaction.status === 'issued') {
          adjustedTotalIssued -= currentAmount;
        }

        // مانده مجوز حواله: مقدار مجوز - کل حواله‌های صادر شده (بدون در نظر گرفتن همین تراکنش اگر صادر شده باشد)
        maxAmount = Math.max(0, (currentDelivery.permitAmount || 0) - adjustedTotalIssued);
        console.log('حالت ویرایش از مستقیم - فرمول محاسبه مانده مجوز (اصلاح شده):', {
          permitAmount: currentDelivery.permitAmount,
          totalIssuedDeliveries,
          adjustedTotalIssued,
          currentAmount,
          formula: `(${currentDelivery.permitAmount} - ${adjustedTotalIssued}) = ${maxAmount}`,
          explanation: 'مقدار مجوز اولیه - کل حواله‌هایی که در وضعیت "صادر شده" هستند'
        });
      }
    }

    // کنترل مقدار حواله بر اساس مانده مجوز - فقط برای مجوزهای امانی
    let effectiveAmount = currentDelivery.amount || 0;
    
    // فقط برای حواله‌های امانی (که مجوز دارند) محدودیت حداقل اعمال کن
    if (currentDelivery.permitId) {
      const minAmount = 0.1; // حداقل مقدار مجاز برای حواله‌های امانی
      
      if (effectiveAmount > maxAmount) {
        // اگر مقدار حواله بیشتر از مانده مجوز باشد، به‌صورت خودکار مقدار را برابر مانده قرار بده
        effectiveAmount = Math.max(minAmount, maxAmount);
        alert(`⚠️ مقدار حواله نمی‌تواند از "مانده مجوز حواله" بیشتر باشد.\n\nمقدار حواله به ${formatPersianNumber(effectiveAmount)} ${currentDelivery.unit || 'کیلوگرم'} تنظیم شد.`);
      } else if (effectiveAmount < minAmount) {
        effectiveAmount = minAmount;
        alert(`⚠️ مقدار حواله نمی‌تواند کمتر از ${minAmount} باشد.\n\nمقدار حواله به ${formatPersianNumber(effectiveAmount)} ${currentDelivery.unit || 'کیلوگرم'} تنظیم شد.`);
      }
    }
    // برای حواله‌های تملیکی (بدون مجوز)، هیچ محدودیت حداقل اعمال نکن

    // کنترل شماره تراکنش تکراری - اصلاح شده
    const allDeliveries = (storage.loadData('deliveries') || []) as any[];
    const isEditingExistingTransaction = currentDelivery.id && !currentDelivery.id.startsWith('delivery_');
    
    // در حالت ویرایش، تراکنش فعلی را از بررسی مستثنی کن
    const existingTransactionNumbers = allDeliveries
      .filter((d: any) => !isEditingExistingTransaction || d.id !== currentDelivery.id)
      .map((d: any) => d.transactionNumber)
      .filter((num: any) => num && num !== currentDelivery.transactionNumber);
    
    if (existingTransactionNumbers.includes(currentDelivery.transactionNumber)) {
      alert(`خطا: شماره تراکنش "${currentDelivery.transactionNumber}" قبلاً استفاده شده است. لطفاً شماره دیگری انتخاب کنید.`);
      return;
    }

  // تشخیص دقیق حالت ذخیره‌سازی بر اساس درخواست کاربر - بهبود یافته
    // الف) حالت "ایجاد از مجوز": حواله جدید ایجاد می‌شود (تراکنش جدید)
    // ب) حالت‌های ویرایش ("ویرایش مستقیم" و "ویرایش والد"): حواله موجود ویرایش می‌شود (بدون تراکنش جدید)
    // ج) حالت "حواله تملیکی از NewOwnershipDeliverySlip": نیازی به ایجاد تراکنش جدید نیست (از قبل ایجاد شده)
    
    const isOwnershipDeliveryFromComponent = currentDelivery.userType === 'owned' && !currentDelivery.permitId && !currentDelivery.contractNumber;
    const isEditMode = isEditingDelivery && (
      currentDelivery._editingSource === 'parent' || 
      currentDelivery._editingSource === 'transaction-list' ||
      (currentDelivery.id && !currentDelivery.id.startsWith('delivery_') && !currentDelivery.id.startsWith('new_'))
    );
    
    console.log('🎯 حالت تشخیص داده شده:', {
      isEditingDelivery,
      currentDeliveryId: currentDelivery.id,
      editingSource: currentDelivery._editingSource,
      editMode: currentDelivery.editMode,
      isEditMode,
      isOwnershipDeliveryFromComponent,
      source: isEditMode ? 'update' : (isOwnershipDeliveryFromComponent ? 'skip' : 'create')
    });

    // تشخیص دقیق تراکنش موجود برای ویرایش
    let existingTransaction = null;
    let allDeliveriesList = (storage.loadData('deliveries') || []) as any[];
    
    if (isEditMode) {
      // جستجوی تراکنش موجود برای ویرایش
      existingTransaction = allDeliveriesList.find((d: any) => {
        const matchById = currentDelivery.id && d.id === currentDelivery.id;
        const matchByNumber = currentDelivery.transactionNumber && d.transactionNumber === currentDelivery.transactionNumber;
        const matchByPermit = currentDelivery.permitId && d.permitId === currentDelivery.permitId && 
          currentDelivery.amount && d.amount === currentDelivery.amount;
        return matchById || matchByNumber || matchByPermit;
      });
      
      if (!existingTransaction) {
        console.error('❌ خطا: تراکنش مورد نظر برای ویرایش یافت نشد:', {
          searchCriteria: {
            id: currentDelivery.id,
            transactionNumber: currentDelivery.transactionNumber,
            permitId: currentDelivery.permitId,
            amount: currentDelivery.amount
          },
          availableDeliveries: allDeliveriesList.map((d: any) => ({
            id: d.id,
            transactionNumber: d.transactionNumber,
            permitId: d.permitId,
            amount: d.amount
          }))
        });
        alert('خطا: تراکنش مورد نظر برای ویرایش یافت نشد. لطفاً صفحه را رفرش کنید و دوباره تلاش کنید.');
        return;
      }
    }

    // برای حواله‌های تملیکی که از کامپوننت‌های مخصوص خود می‌آیند، نیازی به پردازش اضافی نیست
    if (isOwnershipDeliveryFromComponent) {
      console.log('🚫 حواله تملیکی از کامپوننت مخصوص - نیازی به ایجاد/ویرایش تراکنش اضافی نیست');
      alert('✅ حواله تملیکی با موفقیت ذخیره شد.');
      return;
    }

    let newDelivery;
    if (isEditMode) {
      // حالت ويرايش - اطلاعات در همان تراکنش ذخيره مي‌شود
      newDelivery = {
        ...currentDelivery,
        id: currentDelivery.id, // اطمینان از حفظ ID اصلی
        amount: effectiveAmount,
        deliveryDate: deliveryDate,
        slipDate: deliveryDate,
        status: 'issued', // بعد از ویرایش، وضعیت "صادر شده" شود
        persianStatus: 'صادر شده', // اطمینان از تنظیم فارسی وضعیت
        updatedAt: new Date(),
        _editingSource: currentDelivery._editingSource, // حفظ منبع ویرایش
        editMode: currentDelivery.editMode, // حفظ حالت ویرایش
        
        // ⭐ اطمینان از حفظ کامل 5 فیلد مورد نظر کاربر در حالت ویرایش:
        counterpartyName: currentDelivery.counterpartyName || '',
        customerLocationId: currentDelivery.customerLocationId || '',
        customerLocationName: currentDelivery.customerLocationName || '',
        internalSiteId: currentDelivery.internalSiteId || '',
        internalSiteName: currentDelivery.internalSiteName || '',
        locationId: currentDelivery.locationId || '',
        locationName: currentDelivery.locationName || '',
        contractorSiteId: currentDelivery.contractorSiteId || '',
        contractorSiteName: currentDelivery.contractorSiteName || '',
        companyLocationId: currentDelivery.companyLocationId || '',
        companyLocationName: currentDelivery.companyLocationName || '',
        customerCompanyId: currentDelivery.customerCompanyId || '',
        recipientType: currentDelivery.recipientType || 'no-selection',
      } as WarehouseDelivery & { counterpartyId?: string; customerCounterpartyName?: string };
      console.log('حالت ویرایش: تراکنش موجود به‌روزرسانی می‌شود', { transactionId: newDelivery.id, transactionNumber: newDelivery.transactionNumber });
    } else {
      // حالت ايجاد - تراکنش جديد ايجاد مي‌شود
      const newTransactionId = `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      newDelivery = {
        ...currentDelivery,
        id: newTransactionId,
        transactionNumber: currentDelivery.transactionNumber || generateTransactionNumber(currentDelivery.userType || 'consignment', storage),
        amount: effectiveAmount,
        deliveryDate: deliveryDate,
        slipDate: deliveryDate,
        status: 'issued', // اطمینان از ایجاد با وضعیت "صادر شده"
        persianStatus: 'صادر شده',
        createdAt: new Date(),
        updatedAt: new Date(),
        
        // ⭐ اطمینان از انتقال کامل 5 فیلد مورد نظر کاربر در حالت ایجاد:
        counterpartyName: currentDelivery.counterpartyName || '',
        customerLocationId: currentDelivery.customerLocationId || '',
        customerLocationName: currentDelivery.customerLocationName || '',
        internalSiteId: currentDelivery.internalSiteId || '',
        internalSiteName: currentDelivery.internalSiteName || '',
        locationId: currentDelivery.locationId || '',
        locationName: currentDelivery.locationName || '',
        contractorSiteId: currentDelivery.contractorSiteId || '',
        contractorSiteName: currentDelivery.contractorSiteName || '',
        companyLocationId: currentDelivery.companyLocationId || '',
        companyLocationName: currentDelivery.companyLocationName || '',
        customerCompanyId: currentDelivery.customerCompanyId || '',
        recipientType: currentDelivery.recipientType || 'no-selection',
      } as WarehouseDelivery & { counterpartyId?: string; customerCounterpartyName?: string };
      console.log('حالت ایجاد: تراکنش جدید ایجاد می‌شود', { transactionId: newDelivery.id, transactionNumber: newDelivery.transactionNumber });
    }

    // 1. ذخيره در ليست اصلي تحويل‌ها (deliveries)
    let updatedDeliveries;
    if (isEditMode) {
      // در حالت ویرایش: به‌روزرسانی رکورد موجود
      updatedDeliveries = allDeliveriesList.map((d: any) => {
        const isMatch = (
          (currentDelivery.id && d.id === currentDelivery.id) ||
          (currentDelivery.transactionNumber && d.transactionNumber === currentDelivery.transactionNumber)
        );
        return isMatch ? newDelivery : d;
      });
    } else {
      // در حالت ایجاد: اضافه کردن رکورد جدید
      updatedDeliveries = [...allDeliveriesList, newDelivery];
    }
    saveDeliveries(updatedDeliveries);

    // 2. ذخیره در لیست حواله‌های امانی یا تملیکی
    const slipType = (newDelivery.contractNumber || newDelivery.permitId) ? 'consignment-delivery-slips' : 'ownership-delivery-slips';
    let slips = (storage.loadData(slipType) || []) as any[];
    let updatedSlips;
    if (isEditMode) {
      // در حالت ویرایش: به‌روزرسانی رکورد موجود
      updatedSlips = slips.map((s: any) => {
        const isMatch = (
          (currentDelivery.id && s.id === currentDelivery.id) ||
          (currentDelivery.transactionNumber && s.transactionNumber === currentDelivery.transactionNumber)
        );
        return isMatch ? newDelivery : s;
      });
    } else {
      // در حالت ایجاد: اضافه کردن رکورد جدید
      updatedSlips = [...slips, newDelivery];
    }
      saveDataWithNotification(slipType, updatedSlips);

      // ثبت در لاگ سیستم
      logUserActivity({
        action: `${isEditMode ? 'ویرایش' : 'ثبت'} حواله انبار - شماره ${newDelivery.transactionNumber}`,
        category: 'release',
        status: 'success',
        page: 'مدیریت حواله انبار',
        details: {
          transactionNumber: newDelivery.transactionNumber,
          productName: newDelivery.productName,
          amount: newDelivery.amount,
          site: newDelivery.siteName,
          tank: newDelivery.tankName
        }
      });

      // 3. به‌روزرساني موجودي مجوز (فقط براي مجوزهاي اماني) - بهبود یافته
    if (newDelivery.permitId) {
      const permits = (storage.loadData('delivery-permits') || []) as any[];
      const permitIndex = permits.findIndex((p: any) => p.id === newDelivery.permitId);
      if (permitIndex !== -1) {
        const permit = permits[permitIndex];
        let newRemainingTransferPermit;
        
        if (isEditMode) {
          const editingSource = newDelivery._editingSource;
          const oldDelivery = allDeliveriesList.find((d: any) => d.id === newDelivery.id);
          
          if (editingSource === 'transaction-list') {
            // روش الف) حالت ویرایش از مستقیم: فرمول (مقدار مجوز اولیه - کل حواله‌های صادر شده) + همین حواله فعلی
            // مثال: (5000 - (500+300+200)) + 100 = (5000 - 1000) + 100 = 4100 (فقط تراکنش‌های صادر شده)
            const oldAmount = oldDelivery ? (oldDelivery.amount || 0) : 0;
            const newAmount = newDelivery.amount || 0;
            // محاسبه فقط تراکنش‌هایی که در وضعیت "صادر شده" هستند
            const allDeliveries = allDeliveriesList.filter((d: any) => d.permitId === newDelivery.permitId && !d.isVoided);
            const totalIssuedDeliveries = allDeliveries
              .filter((d: any) => d.status === 'issued')
              .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
            
            // اگر حواله فعلی در وضعیت "صادر شده" است، آن را از محاسبات حذف می‌کنیم
            let adjustedTotalIssued = totalIssuedDeliveries;
            if (oldDelivery && oldDelivery.status === 'issued') {
              adjustedTotalIssued -= oldAmount;
            }
            
            // فرمول: (مقدار مجوز - کل حواله‌های صادر شده) + مقدار حواله جدید
            // این یعنی: (5000 - 1000) + 100 = 4100
            newRemainingTransferPermit = (permit.permitAmount || 0) - adjustedTotalIssued + newAmount;
            console.log('فرمول ویرایش از مستقیم در ذخیره (اصلاح شده):', {
              permitAmount: permit.permitAmount,
              totalIssuedDeliveries,
              adjustedTotalIssued,
              oldAmount,
              newAmount,
              formula: `(${permit.permitAmount} - ${adjustedTotalIssued}) + ${newAmount} = ${newRemainingTransferPermit}`,
              explanation: '(مقدار مجوز اولیه - کل حواله‌هایی که در وضعیت "صادر شده" هستند) + همین حواله فعلی'
            });
          } else {
            // روش ب) حالت ویرایش والد: فقط حواله‌های "صادر شده" محاسبه شوند
            // مانده = مقدار مجوز - مجموع حواله‌های در وضعیت "صادر شده"
            const oldAmount = oldDelivery ? (oldDelivery.amount || 0) : 0;
            const newAmount = newDelivery.amount || 0;
            const allDeliveries = allDeliveriesList.filter((d: any) => d.permitId === newDelivery.permitId && !d.isVoided);
            const totalIssuedDeliveries = allDeliveries
              .filter((d: any) => d.status === 'issued')
              .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
            newRemainingTransferPermit = (permit.permitAmount || 0) - totalIssuedDeliveries;
            console.log('فرمول ویرایش والد در ذخیره (اصلاح شده):', {
              permitAmount: permit.permitAmount,
              totalIssuedDeliveries,
              oldAmount,
              newAmount,
              formula: `${permit.permitAmount} - ${totalIssuedDeliveries} = ${newRemainingTransferPermit}`,
              explanation: 'مقدار مجوز اولیه - کل حواله‌هایی که در وضعیت "صادر شده" هستند'
            });
          }
        } else {
          // در حالت ايجاد، کل مقدار از موجودي کم مي‌شود
          newRemainingTransferPermit = (permit.remainingTransferPermit || 0) - (newDelivery.amount || 0);
        }
        
        // اطمینان از اینکه مانده منفی نشود
        if (newRemainingTransferPermit < 0) {
          alert(`هشدار: مانده مجوز حواله نمی‌تواند منفی شود. مانده فعلی: ${formatPersianNumber(permit.remainingTransferPermit || 0)}`);
          return;
        }
        
        permits[permitIndex] = {
          ...permit,
          remainingTransferPermit: Math.max(0, newRemainingTransferPermit),
          updatedAt: new Date()
        };
        saveDataWithNotification('delivery-permits', permits);
      }
    }

      // 4. به‌روزرساني state براي نمايش صحيح در جدول
      const reloadedConsignmentSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
      const reloadedOwnershipSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
      setExistingSlips([...reloadedConsignmentSlips, ...reloadedOwnershipSlips]);

      // به‌روزرسانی inventoryRefreshKey برای refresh محاسبات موجودی
      setInventoryRefreshKey(prev => prev + 1);

      // Reset form
      setIsAddingDelivery(false);
      setIsEditingDelivery(false);
      setCurrentDelivery({});
      setErrors({});
      setCurrentView('list');
      
      console.log('🎉 ذخیره تراکنش با موفقیت انجام شد:', {
        transactionNumber: newDelivery.transactionNumber,
        permitId: newDelivery.permitId,
        amount: newDelivery.amount,
        status: newDelivery.status
      });
      
      // بازگشت به لیست حواله‌ها بعد از ذخیره موفق
      handleBackToList();
      
      alert(isEditMode ? '✅ تراکنش با موفقيت ويرايش شد.' : '✅ تراکنش جديد با موفقيت ذخيره شد.');


      // ثبت لاگ فعالیت کاربر
      if (typeof (window as any).logUserActivity === 'function') {
        const user = storage.loadData('currentUser') as any;
        (window as any).logUserActivity(
          user?.id || 'unknown',
          user?.fullName || 'کاربر سیستم',
          isEditMode ? 'ویرایش حواله انبار' : 'ثبت حواله انبار جدید',
          'delivery',
          'success',
          'حواله انبار',
          isEditMode ? 'دکمه ویرایش' : 'دکمه ثبت',
          { transactionNumber: newDelivery.transactionNumber }
        );
      }
    }, [currentDelivery, deliveries, saveDeliveries, storage, isEditingDelivery, formatPersianNumber, handleBackToList]);

  // Handle transaction delete - اصلاح شده براي بازگرداني مانده مجوز
  const handleDeleteTransaction = useCallback((transactionToDelete: any) => {
    if (window.confirm('آيا از حذف اين تراکنش اطمينان داريد؟')) {
      const id = transactionToDelete.id;
      const deletedAmount = transactionToDelete.amount || 0;
      
      // 1. بازگرداني مانده مجوز حواله در صورت وجود permitId
      if (transactionToDelete.permitId) {
        const permits = (storage.loadData('delivery-permits') || []) as any[];
        const permitIndex = permits.findIndex((p: any) => p.id === transactionToDelete.permitId);
        if (permitIndex !== -1) {
          const permit = permits[permitIndex];
          // بازگرداني مقدار حذف شده به مانده مجوز حواله
          permits[permitIndex] = {
            ...permit,
            remainingTransferPermit: (permit.remainingTransferPermit || 0) + deletedAmount,
            updatedAt: new Date()
          };
          saveDataWithNotification('delivery-permits', permits);
        }
      }
      
      // 2. حذف تراکنش از منبع اصلي (deliveries)
      const updatedDeliveries = deliveries.filter(d => d.id !== id);
      saveDeliveries(updatedDeliveries);
      
      // 3. حذف تراکنش از ليست حواله‌هاي مربوطه
      const slipType = transactionToDelete.contractNumber || transactionToDelete.permitId ? 'consignment' : 'ownership';
      if (slipType === 'consignment') {
        const consignmentSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
        const updatedConsignmentSlips = consignmentSlips.filter((s: any) => s.id !== id);
        saveDataWithNotification('consignment-delivery-slips', updatedConsignmentSlips);
      } else {
        const ownershipSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
        const updatedOwnershipSlips = ownershipSlips.filter((s: any) => s.id !== id);
        saveDataWithNotification('ownership-delivery-slips', updatedOwnershipSlips);
      }
      
      // 4. به‌روزرساني state با بارگذاري مجدد از حافظه
      const reloadedConsignmentSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
      const reloadedOwnershipSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
      setExistingSlips([...reloadedConsignmentSlips, ...reloadedOwnershipSlips]);
      
      // به‌روزرسانی inventoryRefreshKey برای refresh محاسبات موجودی
      setInventoryRefreshKey(prev => prev + 1);
      
        // 5. به‌روزرسانی deliveries state برای محاسبه مجدد مانده مجوز
        const reloadedDeliveries = (storage.loadData('deliveries') || []) as WarehouseDelivery[];
        setDeliveries(reloadedDeliveries);
        logDeleteAction('حواله انبار', transactionToDelete.transactionNumber || transactionToDelete.id);
        alert('تراکنش با موفقيت حذف شد و مانده مجوز به‌روزرساني شد.');

    }
  }, [deliveries, saveDeliveries, storage]);

  // تابع جديد براي به‌روزرساني رويداد در تمام جاهاي مرتبط با مجوز
  const updatePermitEvent = useCallback((permitId: string, event: string) => {
    // به‌روزرساني مجوزها
    const permits = (storage.loadData('delivery-permits') || []) as any[];
    const updatedPermits = permits.map((p: any) => {
      if (p.id === permitId) {
        return { ...p, event, updatedAt: new Date() };
      }
      return p;
    });
    saveDataWithNotification('delivery-permits', updatedPermits);
    
    // به‌روزرساني حواله‌هاي انبار
    const deliveries = (storage.loadData('deliveries') || []) as any[];
    const updatedDeliveries = deliveries.map((d: any) => {
      if (d.permitId === permitId) {
        return { ...d, event, updatedAt: new Date() };
      }
      return d;
    });
    saveDataWithNotification('deliveries', updatedDeliveries);
    
    // به‌روزرساني حواله‌هاي اماني
    const consignmentSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
    const updatedConsignmentSlips = consignmentSlips.map((s: any) => {
      if (s.permitId === permitId) {
        return { ...s, event, updatedAt: new Date() };
      }
      return s;
    });
    storage.saveData('consignment-delivery-slips', updatedConsignmentSlips);
    
    // به‌روزرسانی حواله‌های تملیکی
    const ownershipSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
    const updatedOwnershipSlips = ownershipSlips.map((s: any) => {
      if (s.permitId === permitId) {
        return { ...s, event, updatedAt: new Date() };
      }
      return s;
    });
    storage.saveData('ownership-delivery-slips', updatedOwnershipSlips);
    
    // به‌روزرساني ليست حواله‌هاي موجود
    setExistingSlips([...updatedConsignmentSlips, ...updatedOwnershipSlips]);
    
    // به‌روزرسانی inventoryRefreshKey برای refresh محاسبات موجودی
    setInventoryRefreshKey(prev => prev + 1);
    
    // به‌روزرساني داده‌هاي مشترک (مجوزها به‌صورت خودکار از storage به‌روز می‌شوند)
    updateSharedData('permits', updatedPermits);
  }, [storage, updateSharedData]);

  // Handle request correction - کاملاً اصلاح شده
  const handleRequestCorrection = useCallback((permitId: string, currentTransactionStatus?: string) => {
    // اگر تراکنش فعلی در وضعیت "صادر شده" است، اجازه ثبت "درخواست اصلاحیه" نده
    if (currentTransactionStatus === 'issued') {
      alert('شما مجاز به ثبت "درخواست اصلاحيه" نمي باشيد زيرا این تراکنش در وضعیت "صادر شده" است.');
      return;
    }

    // Find permit
    const permit = issuedPermits.find((p: any) => p.id === permitId);
    if (!permit) {
      alert('خطا: مجوز مورد نظر يافت نشد.');
      return;
    }

    // 1. بررسي اينکه آيا براي اين مجوز حواله‌ای در وضعیت "صادر شده" وجود دارد
    const issuedDeliveriesForPermit = deliveries.filter(d => 
      d.permitId === permitId && 
      !d.isVoided && 
      d.status === 'issued'
    );
    if (issuedDeliveriesForPermit.length > 0) {
      alert('شما مجاز به ثبت "درخواست اصلاحيه" نمي باشيد زيرا از اين مجوز، تراکنشی در وضعیت "صادر شده" وجود دارد.');
      return;
    }

    // 2. بررسي اينکه آيا هیچ حواله‌ای مربوط به اين مجوز در سیستم وجود دارد (در هر وضعیتی)
    const allDeliveriesForPermit = existingSlips.filter(d => 
      d.permitId === permitId && 
      !d.isVoided
    );
    if (allDeliveriesForPermit.length > 0) {
      alert('شما مجاز به ثبت "درخواست اصلاحيه" نمي باشيد زيرا برای این مجوز، تراکنشی در سیستم ثبت شده است.');
      return;
    }

    // اگر هیچ حواله‌ای وجود نداشت، اجازه ثبت درخواست اصلاحیه بده
    updatePermitEvent(permitId, 'درخواست اصلاحيه انبار');
    alert('درخواست اصلاحيه با موفقيت ثبت شد.');
  }, [issuedPermits, deliveries, existingSlips, updatePermitEvent]);

    // Handle status change - کاملاً اصلاح شده برای toggle کردن صحیح
    const handleChangeStatus = useCallback((id: string) => {
      // Find transaction (by id or transactionNumber for robustness)
      const transaction = existingSlips.find(s => s.id === id) || existingSlips.find(s => s.transactionNumber === id);
      if (!transaction) {
        alert('خطا: تراکنش مورد نظر يافت نشد.');
        return;
      }

      // تعیین وضعیت جدید: اگر فعلاً "پیش نویس" است، به "صادر شده" تغییر کند و بالعکس
      const currentStatus = transaction.status || 'draft';
      const newStatus = currentStatus === 'draft' || currentStatus === 'پیش‌نویس' || currentStatus === 'پيش‌نويس' ? 'issued' : 'draft';
      const newPersianStatus = newStatus === 'issued' ? 'صادر شده' : 'پیش‌نویس';

      console.log('تغییر وضعیت تراکنش:', {
        transactionId: id,
        currentStatus,
        newStatus,
        newPersianStatus,
        transactionNumber: transaction.transactionNumber
      });

      // لاگ تغییر وضعیت
      logSaveAction('حواله انبار', transaction.transactionNumber || id, { 
        oldStatus: currentStatus, 
        newStatus: newStatus,
        type: transaction.type || transaction.userType 
      });

      // Update delivery status in main deliveries list (match by id OR transactionNumber)

    const updatedDeliveries = deliveries.map((d: any) => {
      const sameById = d.id === id || d.id === transaction.id;
      const sameByNumber = d.transactionNumber && (d.transactionNumber === transaction.transactionNumber || d.transactionNumber === id);
      return (sameById || sameByNumber) ? { ...d, status: newStatus, persianStatus: newPersianStatus, updatedAt: new Date() } : d;
    });
    saveDeliveries(updatedDeliveries as WarehouseDelivery[]);

    // تشخیص نوع تراکنش بر اساس contractNumber یا permitId (برای امانی) یا userType
    const isConsignment = !!(transaction.contractNumber || transaction.permitId) || transaction.userType === 'consignment' || transaction.type === 'امانی';
    
    // Update corresponding slip - اصلاح شده برای استفاده از existingSlips به جای storage
    let updatedSlips = [];
    if (isConsignment) {
      // استفاده از existingSlips به جای storage برای جلوگیری از race condition
      const slips = existingSlips.filter((s: any) => s.type === 'امانی' || s.userType === 'consignment' || s.contractNumber || s.permitId);
      updatedSlips = slips.map((s: any) => {
        const sameById = s.id === id || s.id === transaction.id;
        const sameByNumber = s.transactionNumber && (s.transactionNumber === transaction.transactionNumber || s.transactionNumber === id);
        return (sameById || sameByNumber) ? { ...s, status: newStatus, persianStatus: newPersianStatus, updatedAt: new Date() } : s;
      });
      
      // اگر هیچ slip امانی در existingSlips نباشد، از storage بخوانیم
      if (updatedSlips.length === 0) {
        const storageSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
        updatedSlips = storageSlips.map((s: any) => {
          const sameById = s.id === id || s.id === transaction.id;
          const sameByNumber = s.transactionNumber && (s.transactionNumber === transaction.transactionNumber || s.transactionNumber === id);
          return (sameById || sameByNumber) ? { ...s, status: newStatus, persianStatus: newPersianStatus, updatedAt: new Date() } : s;
        });
      }
      
      saveDataWithNotification('consignment-delivery-slips', updatedSlips);
    } else if (transaction.userType === 'owned' || transaction.type === 'تملیکی') {
      // استفاده از existingSlips به جای storage برای جلوگیری از race condition
      const slips = existingSlips.filter((s: any) => s.type === 'تملیکی' || s.userType === 'owned');
      updatedSlips = slips.map((s: any) => {
        const sameById = s.id === id || s.id === transaction.id;
        const sameByNumber = s.transactionNumber && (s.transactionNumber === transaction.transactionNumber || s.transactionNumber === id);
        return (sameById || sameByNumber) ? { ...s, status: newStatus, persianStatus: newPersianStatus, updatedAt: new Date() } : s;
      });
      
      // اگر هیچ slip تملیکی در existingSlips نباشد، از storage بخوانیم
      if (updatedSlips.length === 0) {
        const storageSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
        updatedSlips = storageSlips.map((s: any) => {
          const sameById = s.id === id || s.id === transaction.id;
          const sameByNumber = s.transactionNumber && (s.transactionNumber === transaction.transactionNumber || s.transactionNumber === id);
          return (sameById || sameByNumber) ? { ...s, status: newStatus, persianStatus: newPersianStatus, updatedAt: new Date() } : s;
        });
      }
      
      saveDataWithNotification('ownership-delivery-slips', updatedSlips);
    }

    // Update existing slips list in memory (UI should reflect instantly)
    setExistingSlips(prev => {
      // 1) اگر نوع مشخص باشد، از updatedSlips استفاده می‌کنیم
      let merged = prev.map(slip => {
        const sameById = slip.id === id || slip.id === (transaction?.id);
        const sameByNumber = slip.transactionNumber && (slip.transactionNumber === transaction?.transactionNumber || slip.transactionNumber === id);
        if (sameById || sameByNumber) {
          return { ...slip, status: newStatus, persianStatus: newPersianStatus, updatedAt: new Date() };
        }
        return slip;
      });
      return merged;
    });

    // Recalculate and persist remainingTransferPermit for related permit (issued-only)
    if (transaction.permitId) {
      const permits = (storage.loadData('delivery-permits') || []) as any[];
      const permitIndex = permits.findIndex((p: any) => p.id === transaction.permitId);
      if (permitIndex !== -1) {
        const permit = permits[permitIndex];
        const allForPermit = (updatedDeliveries || deliveries).filter((d: any) => d.permitId === transaction.permitId && !d.isVoided);
        const totalIssuedForPermit = allForPermit.filter((d: any) => d.status === 'issued').reduce((s: number, d: any) => s + (d.amount || 0), 0);
        const newRemaining = Math.max(0, (permit.permitAmount || 0) - totalIssuedForPermit);
        permits[permitIndex] = { ...permit, remainingTransferPermit: newRemaining, updatedAt: new Date() };
        saveDataWithNotification('delivery-permits', permits);
        updateSharedData('permits', permits);
      }
    }

    // اگر وضعيت به "issued" تغيير کرد و تراکنش دارای مجوز باشد، پیام "درخواست اصلاحیه انبار" را پاک کن
    if (newStatus === 'issued' && transaction.permitId) {
      updatePermitEvent(transaction.permitId, '');
    }

    // به‌روزرسانی inventoryRefreshKey برای refresh محاسبات موجودی
    setInventoryRefreshKey(prev => prev + 1);

    // اعلان تغییر وضعیت
    const statusText = newStatus === 'draft' ? 'پيش‌نويس' : 'صادر شده';
    alert(`وضعيت تراکنش ${transaction.transactionNumber} با موفقيت به "${statusText}" تغيير يافت.`);
  }, [deliveries, saveDeliveries, existingSlips, storage, updatePermitEvent]);

  // Listen for inventory adjustments updates
  useEffect(() => {
    const handleInventoryAdjustmentsUpdated = (event: CustomEvent) => {
      console.log('Inventory adjustments updated:', event.detail);
      // Update addition/subtraction documents if a permit is selected
      if (selectedPermit) {
        // Force re-render by updating state
        setSelectedPermit((prev: any) => prev ? { ...prev } : null);
      }
    };

    window.addEventListener('inventoryAdjustmentsUpdated', handleInventoryAdjustmentsUpdated as EventListener);
    return () => {
      window.removeEventListener('inventoryAdjustmentsUpdated', handleInventoryAdjustmentsUpdated as EventListener);
    };
  }, [selectedPermit, storage]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64" style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
        <div className="text-lg text-gray-600">در حال بارگذاري...</div>
      </div>
    );
  }

  // Main view with all tables
  if (currentView === 'list') {
    return (
      <div className="container mx-auto px-4 py-8" style={{ transform: 'scale(0.9)', transformOrigin: 'top center', width: '111.11%', marginBottom: '10%' }}>
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">حواله انبار</h1>
            <p className="text-gray-600">مدیریت حواله‌های انبار امانی و تملیکی</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={handleAddDelivery}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                حواله انبار جديد
              </button>
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-5 w-5" />
                خروجي اکسل
              </button>
              <button
                onClick={handleRefresh}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                تازه‌سازي
              </button>
            </div>
            <img 
              src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        {/* هشدار تاریخ */}
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const selected = new Date(upToDate);
          selected.setHours(0, 0, 0, 0);
          const isDifferentDay = selected.getTime() !== today.getTime();
          
          return isDifferentDay ? (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-amber-800 font-medium">گزارش موجودی به روز نیست</p>
                  <p className="text-amber-700 text-sm">
                    تاریخ انتخاب شده: {formatPersianDate(upToDate)} | تاریخ امروز: {formatPersianDate(new Date())}
                  </p>
                </div>
              </div>
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
            {/* فیلترهای گزارش موجودی */}
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
          {/* Table 1: موجودی مخازن امانی و تملیکی */}
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

        {/* فیلترهای جستجو */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="جستجو..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table 1: Issued Permits */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
              <h2 className="text-xl font-semibold">مجوزهاي صادر شده</h2>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طرف حساب</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ تأييد مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مانده مجوز حواله</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مانده مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعيت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رخداد</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عمليات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {issuedPermits.map((permit: any) => {
                    const permitInfo = getPermitInfo(permit.id);
                    return (
                      <tr
                        key={permit.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewPermitDetails(permit)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {permit.systemPermitNumber}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {permit.counterpartyName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianDate(new Date(permit.permitDate))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {permit.approvalDate ? formatPersianDate(new Date(permit.approvalDate)) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianNumber(permit.permitAmount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianNumber(permitInfo ? permitInfo.remainingTransferPermit : permit.remainingTransferPermit)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianNumber(permitInfo ? permitInfo.remainingPermit : permit.remainingPermit)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            permitInfo ? (
                              permitInfo.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              permitInfo.status === 'saved' ? 'bg-blue-100 text-blue-800' :
                              permitInfo.status === 'issued' ? 'bg-green-100 text-green-800' :
                              permitInfo.status === 'printed' ? 'bg-purple-100 text-purple-800' :
                              permitInfo.status === 'correction_requested' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            ) : (
                              'bg-gray-100 text-gray-800'
                            )
                          }`}>
                            {permitInfo ? (
                              permitInfo.status === 'draft' ? 'پيش‌نويس' :
                              permitInfo.status === 'saved' ? 'ذخيره شده' :
                              permitInfo.status === 'issued' ? 'صادر شده' :
                              permitInfo.status === 'printed' ? 'چاپ شده' :
                              permitInfo.status === 'correction_requested' ? 'درخواست اصلاحيه' :
                              permitInfo.status === 'cancelled' ? 'لغو شده' :
                              'نامشخص'
                            ) : 'نامشخص'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {permit.event === 'درخواست اصلاحيه انبار' ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                              درخواست اصلاحيه انبار
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col gap-1">
                            {canCreate('warehouse_delivery') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateDeliveryFromPermit(permit);
                                }}
                                className="text-green-600 hover:text-green-800"
                              >
                                ايجاد حواله
                              </button>
                            )}
                            {canEdit('warehouse_delivery') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditFromParent(permit);
                                }}
                                className="text-purple-600 hover:text-purple-800"
                              >
                                ويرايش
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestCorrection(permit.id);
                              }}
                              className="text-yellow-600 hover:text-yellow-800"
                            >
                              درخواست اصلاحيه
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPermitDetails(permit);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              مشاهده جزئيات
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {issuedPermits.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  هيچ مجوز صادر شده‌اي وجود ندارد.
                </div>
              )}
            </div>
          </div>

          {/* Table 2: Closed Permits */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white p-4">
              <h2 className="text-xl font-semibold">مجوزهاي بسته شده</h2>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طرف حساب</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ تأييد مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مانده مجوز حواله</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مانده مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعيت</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {closedPermits.map((permit: any) => {
                    const permitInfo = getPermitInfo(permit.id);
                    return (
                      <tr key={permit.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {permit.systemPermitNumber}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {permit.counterpartyName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianDate(new Date(permit.permitDate))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {permit.approvalDate ? formatPersianDate(new Date(permit.approvalDate)) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianNumber(permit.permitAmount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianNumber(permitInfo ? permitInfo.remainingTransferPermit : permit.remainingTransferPermit)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianNumber(permitInfo ? permitInfo.remainingPermit : permit.remainingPermit)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            permitInfo ? (
                              permitInfo.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              permitInfo.status === 'saved' ? 'bg-blue-100 text-blue-800' :
                              permitInfo.status === 'issued' ? 'bg-green-100 text-green-800' :
                              permitInfo.status === 'printed' ? 'bg-purple-100 text-purple-800' :
                              permitInfo.status === 'correction_requested' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            ) : (
                              'bg-red-100 text-red-800'
                            )
                          }`}>
                            {permitInfo ? (
                              permitInfo.status === 'draft' ? 'پيش‌نويس' :
                              permitInfo.status === 'saved' ? 'ذخيره شده' :
                              permitInfo.status === 'issued' ? 'صادر شده' :
                              permitInfo.status === 'printed' ? 'چاپ شده' :
                              permitInfo.status === 'correction_requested' ? 'درخواست اصلاحيه' :
                              permitInfo.status === 'cancelled' ? 'لغو شده' :
                              'نامشخص'
                            ) : 'بسته شده'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {closedPermits.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  هيچ مجوز بسته شده‌اي وجود ندارد.
                </div>
              )}
            </div>
          </div>

          {/* Table 5: Permit Details */}
          {selectedPermit && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden lg:col-span-2">
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-4">
                <h2 className="text-xl font-semibold">جزئيات مجوز انتخاب شده</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">شماره مجوز:</span>
                    <span className="text-gray-900">{selectedPermit.systemPermitNumber}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">طرف حساب:</span>
                    <span className="text-gray-900">{selectedPermit.counterpartyName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">قرارداد:</span>
                    <span className="text-gray-900">{selectedPermit.contractNumber}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">تاريخ مجوز:</span>
                    <span className="text-gray-900">{formatPersianDate(new Date(selectedPermit.permitDate))}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">تاريخ تأييد مجوز:</span>
                    <span className="text-gray-900">
                      {selectedPermit.approvalDate ? formatPersianDate(new Date(selectedPermit.approvalDate)) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">مقدار مجوز:</span>
                    <span className="text-gray-900">{formatPersianNumber(selectedPermit.permitAmount)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">مانده مجوز حواله:</span>
                    <span className="text-gray-900">{formatPersianNumber(selectedPermit.remainingTransferPermit)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">مانده مجوز:</span>
                    <span className="text-gray-900">{formatPersianNumber(selectedPermit.remainingPermit)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">محصول:</span>
                    <span className="text-gray-900">{selectedPermit.productName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">سايت:</span>
                    <span className="text-gray-900">{selectedPermit.siteName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">مخزن:</span>
                    <span className="text-gray-900">{selectedPermit.tankName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">وضعيت:</span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedPermit.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      selectedPermit.status === 'saved' ? 'bg-blue-100 text-blue-800' :
                      selectedPermit.status === 'issued' ? 'bg-green-100 text-green-800' :
                      selectedPermit.status === 'printed' ? 'bg-purple-100 text-purple-800' :
                      selectedPermit.status === 'correction_requested' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedPermit.status === 'draft' ? 'پيش‌نويس' :
                      selectedPermit.status === 'saved' ? 'ذخيره شده' :
                      selectedPermit.status === 'issued' ? 'صادر شده' :
                      selectedPermit.status === 'printed' ? 'چاپ شده' :
                      selectedPermit.status === 'correction_requested' ? 'درخواست اصلاحيه' :
                      selectedPermit.status === 'cancelled' ? 'لغو شده' :
                      'نامشخص'}
                    </span>
                  </div>
                  {selectedPermit.event && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">رخداد:</span>
                      <span className="text-gray-900">{selectedPermit.event}</span>
                    </div>
                  )}
                  {selectedPermit.description && (
                    <div className="flex justify-between py-2 border-b md:col-span-2 lg:col-span-3">
                      <span className="font-medium text-gray-700">توضيحات:</span>
                      <span className="text-gray-900">{selectedPermit.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


            {/* Table 9: Registered Transactions */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden lg:col-span-2">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">تراکنش‌های ثبت شده امانی</h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={showExtraInfoInConsignmentTable}
                      onChange={(e) => setShowExtraInfoInConsignmentTable(e.target.checked)}
                      className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-white font-medium">نمایش اطلاعات تکمیلی</span>
                  </label>
                  <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsConsignmentTableMinimized(!isConsignmentTableMinimized)}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-white text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                  >
                    {isConsignmentTableMinimized ? (
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
                    onClick={async () => {
                      try {
                        if ('caches' in window) {
                          const keys = await caches.keys();
                          await Promise.all(keys.map(k => caches.delete(k)));
                        }
                        if ('serviceWorker' in navigator) {
                          const regs = await navigator.serviceWorker.getRegistrations();
                          await Promise.all(regs.map(r => r.unregister()));
                        }
                        alert('کش برنامه پاک شد. صفحه اکنون رفرش می‌شود.');
                        window.location.reload();
                      } catch (e) {
                        alert('پاکسازی کش با خطا مواجه شد. لطفاً یکبار دیگر تلاش کنید.');
                        console.warn('Cache clear error', e);
                      }
                    }}
                    className="px-3 py-1.5 rounded-md bg-white text-teal-700 hover:bg-teal-50 transition-colors text-sm"
                    title="پاکسازی کش برنامه (داده‌های شما حذف نمی‌شود)"
                  >
                    پاکسازی کش برنامه
                  </button>
                  </div>
                </div>
              </div>
              {!isConsignmentTableMinimized && (
              <div className="overflow-auto max-h-[600px]">
                <table className="w-full">

                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره تراکنش</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصول</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار حواله</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طرف حساب</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مشتری طرف حساب</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">لوکیشن طرف حساب</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">لوکیشن مشتری طرف حساب</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار مبنای رسید</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">درصد افت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وزن افت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار رسید</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سایت مخازن</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مخزن</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ رسید</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">واحد سنجش</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره شاخص/ثبت سفارش</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره کوتاژ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">راننده</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام کشتی</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار مجوز حواله</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مانده مجوز حواله</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار افت مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار مجوز بعد از کسر افت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مانده مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ تایید مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره مجوز</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره نامه مدیریت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع گیرنده</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سایت داخلی</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">لوکیشن</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سایت پیمانکار</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره قرارداد</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره رسید انبار</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ حواله</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعيت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رخداد</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عمليات</th>
                    {showExtraInfoInConsignmentTable && (
                      <>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام راننده</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام خانوادگی راننده</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کد ملی راننده</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره بارنامه</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره پلاک</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وزن (مبنا)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مبلغ بارنامه</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مبدا بارنامه</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ بارنامه</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شرکت حمل و نقل</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره موبایل راننده</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">آدرس مبدا</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مبلغ پشت بارنامه</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کدپستی مبدا</th>
                      </>
                    )}
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {existingSlips
                    .filter((slip: any) => {
                      // نمایش تمام حواله‌ها به جز آنهایی که isVoided: true هستند
                      if (slip.isVoided) return false;
                      
                      const isConsignmentDelivery = (slip.permitId || slip.contractNumber || slip.userType === 'consignment') && 
                        slip.amount && 
                        parseFloat(slip.amount?.toString() || '0') > 0;
                      
                      const isOwnershipDelivery = slip.userType === 'owned' && 
                        !slip.permitId && 
                        !slip.contractNumber && 
                        slip.amount && 
                        parseFloat(slip.amount?.toString() || '0') > 0;
                      
                      return isConsignmentDelivery || isOwnershipDelivery;
                    })
                    .map((slip: any) => {
                      const slipType = (slip.contractNumber || slip.permitId) ? 'امانی' : 'تملیکی';
                      const isChecked = checkedTransactions.has(slip.id);
                      const authoritative = deliveries.find((d: any) => d.id === slip.id || d.transactionNumber === slip.transactionNumber);
                      const displayStatus = authoritative?.status || slip.status;
                      
                      return (
                        <tr
                          key={slip.id}
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            isChecked ? 'bg-yellow-200 border-2 border-yellow-400' : ''
                          } ${
                            displayStatus === 'draft' ? 'ring-2 ring-red-400 ring-opacity-75 bg-red-50' : ''
                          }`}
                          onClick={() => slip.permitId && handleViewPermitDetails(getPermitInfo(slip.permitId))}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {slip.transactionNumber || slip.permitNumber || slip.receiptNumber || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              slipType === 'امانی' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {slipType}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.productName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatPersianNumber(slip.amount)} {slip.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.counterpartyName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.customerCounterpartyName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.companyLocationId && baseData?.companiesLocation?.find((l: any) => l.id === slip.companyLocationId)?.name || 
                             slip.companyLocationName || slip.counterpartyLocationName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.customerLocationId && baseData?.customerCompaniesLocation?.find((l: any) => l.id === slip.customerLocationId)?.name || 
                             slip.customerLocationName || slip.customerCounterpartyLocationName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatPersianNumber(slip.receiptBasisAmount || 0)} {slip.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {(slip as any).wastagePercentage ? `${(slip as any).wastagePercentage}%` : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatPersianNumber(slip.wastageAmount || 0)} {slip.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatPersianNumber(slip.receiptAmount || 0)} {slip.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.siteName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.tankName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.permitDate ? formatPersianDate(new Date(slip.permitDate)) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.unit || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.indexNumber || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.cotageNumber || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.driverName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.shipName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatPersianNumber(slip.permitAmount || 0)} {slip.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatPersianNumber(slip.remainingPermitAmount || 0)} {slip.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatPersianNumber(slip.wastageAmount || 0)} {slip.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatPersianNumber(slip.finalPermitAmount || 0)} {slip.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatPersianNumber(slip.remainingTransferPermit || 0)} {slip.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.permitDate ? formatPersianDate(new Date(slip.permitDate)) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.approvalDate ? formatPersianDate(new Date(slip.approvalDate)) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.permitNumber || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.managementLetterNumber || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.recipientType ? (
                              slip.recipientType === 'internal-site' ? 'سایت داخلی' :
                              slip.recipientType === 'contractor-site' ? 'سایت پیمانکار' :
                              slip.recipientType === 'counterparty' ? 'طرف حساب' :
                              slip.recipientType === 'customer-counterparty' ? 'مشتری طرف حساب' :
                              slip.recipientType
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.internalSiteId && baseData?.internalSites?.find((s: any) => s.id === slip.internalSiteId)?.name || 
                             slip.internalSiteName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.locationId && baseData?.locations?.find((l: any) => l.id === slip.locationId)?.name || 
                             slip.locationName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.contractorSiteId && baseData?.contractorSites?.find((s: any) => s.id === slip.contractorSiteId)?.name || 
                             slip.contractorSiteName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.contractNumber || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {slip.receiptNumber || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatPersianDate(new Date(slip.slipDate || slip.deliveryDate || slip.createdAt))}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              displayStatus === 'draft' ? 'bg-gray-100 text-gray-800' :
                              displayStatus === 'saved' ? 'bg-blue-100 text-blue-800' :
                              displayStatus === 'issued' ? 'bg-green-100 text-green-800' :
                              displayStatus === 'finalized' ? 'bg-green-100 text-green-800' :
                              displayStatus === 'printed' ? 'bg-purple-100 text-purple-800' :
                              displayStatus === 'correction_requested' ? 'bg-yellow-100 text-yellow-800' :
                              displayStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {displayStatus === 'draft' ? 'پيش‌نويس' :
                              displayStatus === 'saved' ? 'ذخيره شده' :
                              displayStatus === 'issued' ? 'صادر شده' :
                              displayStatus === 'finalized' ? 'نهايي شده' :
                              displayStatus === 'printed' ? 'چاپ شده' :
                              displayStatus === 'correction_requested' ? 'درخواست اصلاحيه' :
                              displayStatus === 'cancelled' ? 'ابطال شده' :
                              'نامشخص'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {slip.event === 'درخواست اصلاحيه انبار' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                                درخواست اصلاحيه انبار
                              </span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              {canEdit('warehouse_delivery') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTransaction(slip);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                                  title="ويرايش"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCheckTransaction(slip.id);
                                }}
                                className={`p-1 rounded transition-colors ${checkedTransactions.has(slip.id) ? 'bg-yellow-300 text-yellow-900 hover:bg-yellow-400' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                                title="بررسی گردد"
                              >
                                <CheckSquare className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChangeStatus(slip.transactionNumber || slip.id);
                                }}
                                className={`p-1 rounded transition-colors ${
                                  displayStatus === 'draft' || displayStatus === 'پیش‌نویس' || displayStatus === 'پيش‌نويس'
                                  ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                                  : 'text-orange-600 bg-orange-100 hover:bg-orange-200'
                                }`}
                                title="تغییر وضعیت"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                              {slip.permitId ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestCorrection(slip.permitId, slip.status);
                                  }}
                                  className="p-1 rounded transition-colors text-orange-700 bg-orange-100 hover:bg-orange-200"
                                  title="درخواست اصلاحیه"
                                  disabled={slip.status === 'issued'}
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </button>
                              ) : null}
                              {canDelete('warehouse_delivery') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTransaction(slip);
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintTransaction(slip);
                                }}
                                className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50 transition-colors"
                                title="پرینت حرفه‌ای"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          {showExtraInfoInConsignmentTable && (() => {
                            // پیدا کردن رسید مرتبط برای دریافت اطلاعات تکمیلی
                            const relatedReceipt = receipts.find((r: any) => 
                              r.transactionNumber === slip.receiptNumber || 
                              r.id === slip.receiptId ||
                              r.transactionNumber === slip.receiptTransactionNumber
                            );
                            const extraInfo = relatedReceipt?.additionalInfo || {};
                            return (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{extraInfo.driverFirstName || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{extraInfo.driverLastName || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{extraInfo.driverNationalId || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{extraInfo.billOfLadingNumber || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{extraInfo.plateNumber || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {extraInfo.weight ? formatPersianNumber(extraInfo.weight) : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {extraInfo.billAmount ? formatPersianNumber(extraInfo.billAmount) : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{extraInfo.origin || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {extraInfo.billDate && extraInfo.billDate instanceof Date ? formatPersianDate(extraInfo.billDate) : 
                                   extraInfo.billDate ? formatPersianDate(new Date(extraInfo.billDate)) : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{extraInfo.transportCompany || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{extraInfo.driverMobile || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{extraInfo.originAddress || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {extraInfo.backBillAmount ? formatPersianNumber(extraInfo.backBillAmount) : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{extraInfo.originPostalCode || '-'}</td>
                              </>
                            );
                          })()}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {existingSlips.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  هيچ تراکنشي ثبت نشده است.
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        {showDeliverySlipTypeSelector && (
          <DeliverySlipTypeSelector
            onSelectType={handleSelectDeliverySlipType}
            onCancel={() => {
              setShowDeliverySlipTypeSelector(false);
              setDeliveryCreationMode('general');
            }}
            deliveryCreationMode={deliveryCreationMode === 'from-permit' ? 'general' : deliveryCreationMode}
          />
        )}
      </div>
    );
  }

  // Consignment slip view
  if (currentView === 'consignment-slip') {
    return (
      <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center', width: '111.11%', marginBottom: '10%' }}>
      <ConsignmentDeliverySlip
        baseData={baseData}
        onBack={handleBackToList}
        initialData={currentDelivery}
        onSave={handleSaveTransaction}
        calculateRemainingInventory={(permitId) => calculateRemainingInventory(
          permitId, 
          isEditingDelivery,
          currentDelivery.id,
          currentDelivery._editingSource
        )}
        checkedTransactions={checkedTransactions}
        setCheckedTransactions={setCheckedTransactions}
        disabledTransactions={disabledTransactions}
        setDisabledTransactions={setDisabledTransactions}
      />
      </div>
    );
  }

  // Ownership slip view
  if (currentView === 'ownership-slip') {
    return (
      <OwnershipDeliverySlip
        baseData={baseData}
        onBack={handleBackToList}
        initialData={isEditingDelivery ? currentDelivery : null}
        onSave={handleSaveTransaction}
      />
    );
  }

  // Modern ownership slip view
  if (currentView === 'modern-ownership-slip') {
    return (
      <ModernOwnershipDeliverySlip
        baseData={baseData}
        onBack={handleBackToList}
        initialData={isEditingDelivery ? currentDelivery : null}
        onSave={handleSaveTransaction}
      />
    );
  }

  // New ownership slip view (اصلاح شده و مدرن)
  if (currentView === 'new-ownership-slip') {
    // فیلتر کردن رسیدهای تملیکی و تنظیمات موجودی
    const ownershipReceipts = ((receipts as any[]) || []).filter((r: any) => r.userType === 'owned' && !r.isVoided);
    // اگر adjustments از props خالی باشد، از storage بارگذاری کن
    const inventoryAdjustments = (adjustments && Array.isArray(adjustments) && adjustments.length > 0 
      ? adjustments 
      : (storage.loadData('inventoryAdjustments') || [])) as any[];
    console.log('📊 Inventory adjustments for NewOwnershipDeliverySlip:', {
      fromProps: (adjustments as any[])?.length || 0,
      fromStorage: ((storage.loadData('inventoryAdjustments') || []) as any[]).length,
      final: inventoryAdjustments.length,
      sample: inventoryAdjustments[0]
    });
    const additionDocuments = inventoryAdjustments.filter((adj: any) => adj.adjustmentType === 'addition' && !adj.isVoided);
    const deductionDocuments = inventoryAdjustments.filter((adj: any) => adj.adjustmentType === 'deduction' && !adj.isVoided);

    return (
      <NewOwnershipDeliverySlip
        baseData={baseData || {}}
        onBack={handleBackToList}
        initialData={isEditingDelivery ? currentDelivery : null}
        onSave={handleSaveTransaction}
        receipts={ownershipReceipts || []}
        adjustments={inventoryAdjustments || []}
        additions={additionDocuments || []}
        deductions={deductionDocuments || []}
      />
    );
  }


  // اگر هیچ‌کدام از view های بالا فعال نباشد، چیزی رندر نکن
  return null;
};

export default WarehouseDeliveryManager;
