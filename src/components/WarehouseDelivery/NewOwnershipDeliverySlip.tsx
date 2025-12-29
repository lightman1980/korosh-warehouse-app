// کامپوننت کامل "حواله انبار تملیکی" - طراحی شده بر اساس تمام درخواست‌های کاربر
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  ArrowLeft, 
  Save, 
  Edit2, 
  X, 
  Printer, 
  Calendar, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Package, 
  ChevronDown,
  RefreshCw,
  Archive,
  TrendingUp,
  BarChart3,
  FileText,
  Eye,
  CheckSquare,
  Calculator,
  Building2,
  Truck,
  Trash2,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import { logSaveAction, logCreateAction } from "../../hooks/useActivityLogger.ts";
import PersianDatePicker from '../Common/PersianDatePicker';

// تابع کمکی برای تبدیل ایمن مقادیر به عدد - اصلاح شده
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') return defaultValue;
  
  // اگر مقدار خودش عدد باشد
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value;
  }
  
  // اگر رشته باشد
  const num = parseFloat(value.toString());
  return isNaN(num) ? defaultValue : num;
};

// تعریف تایپ‌های اصلی
interface Receipt {
  id: string;
  receiptNumber: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  productId: string;
  productName: string;
  userType: 'owned' | 'consignment';
  amount: number;
  receiptBasisAmount?: number; // اضافه شده: مقدار مبنای رسید
  finalAmount?: number; // اضافه شده: مقدار نهایی
  wastageAmount: number;
  receiptDate: Date;
  unit: string;
  status: string;
  isVoided?: boolean;
  // فیلدهای اضافی
  shipId?: string;
  shipName?: string;
  cotageId?: string;
  cotageNumber?: string;
  indexId?: string;
  indexNumber?: string;
  driverId?: string;
  driverName?: string;
  shipBillOfLadingAmount?: number;
  shipUnloadingAmount?: number;
  tankShoreAmount?: number;
  weightGross?: number;
  contractNumber?: string;
  transactionNumber?: string; // اضافه شده: شماره تراکنش
  // فیلدهای اضافی برای اجاره
  rentalTypeId?: string;
  rentalTypeName?: string;
  rentalRate?: number;
}

interface InventoryAdjustment {
  id: string;
  documentDate: Date;
  adjustmentType: 'deduction' | 'addition';
  productType: 'owned' | 'consignment';
  productId: string;
  productName: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  quantity: number;
  description: string;
  isVoided?: boolean;
  // فیلدهای اضافی
  contractNumber?: string;
  driverName?: string;
  shipBillOfLadingAmount?: number;
  shipUnloadingAmount?: number;
  tankShoreAmount?: number;
  weightGross?: number;
}

interface OwnershipDelivery {
  id: string;
  deliveryDate: Date;
  receiptNumber: string;
  productName: string;
  productId: string;
  siteName: string;
  siteId: string;
  tankName: string;
  tankId: string;
  amount: number;
  unit: string;
  wastageAmount?: number;
  status: 'draft' | 'issued'; // تغییر کرده: پیش نویس / صادر شده
  notes?: string;
  transactionNumber?: string;
  isVoided?: boolean;
  // فیلدهای اضافی از رسید
  shipId?: string;
  shipName?: string;
  cotageId?: string;
  cotageNumber?: string;
  indexId?: string;
  indexNumber?: string;
  driverId?: string;
  driverName?: string;
  shipBillOfLadingAmount?: number;
  shipUnloadingAmount?: number;
  tankShoreAmount?: number;
  weightGross?: number;
  contractNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  // فیلدهای اضافی برای اجاره
  rentalTypeId?: string;
  rentalTypeName?: string;
  rentalRate?: number;
}

interface InventoryCalculation {
  totalOwnedReceipts: number;
  totalConsignmentReceipts: number;
  totalOwnedWastage: number;
  totalConsignmentWastage: number;
  totalOwnedSurplus: number;
  totalConsignmentSurplus: number;
  totalOwnedDeliveries: number;
  totalConsignmentDeliveries: number;
  totalOwnedDeliveryWastage: number;
  totalConsignmentDeliveryWastage: number;
  totalOwnedDeductions: number;
  totalConsignmentDeductions: number;
  finalInventory: number;
}

// کامپوننت اصلی
interface Props {
  onBack: () => void;
  baseData?: any;
  initialData?: any;
  onSave?: (data: any) => void;
  receipts?: any[];
  adjustments?: any[];
  additions?: any[];
  deductions?: any[];
}

const NewOwnershipDeliverySlip: React.FC<Props> = ({ 
  onBack, 
  baseData, 
  initialData, 
  onSave,
  receipts: propReceipts,
  adjustments: propAdjustments,
  additions: propAdditions,
  deductions: propDeductions
}) => {
  // State های اصلی
  const [availableReceipts, setAvailableReceipts] = useState<Receipt[]>([]);
  const [inventoryAdjustmentsState, setInventoryAdjustmentsState] = useState<InventoryAdjustment[]>([]);
  const [ownershipDeliveries, setOwnershipDeliveries] = useState<OwnershipDelivery[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedTank, setSelectedTank] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<OwnershipDelivery | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set()); // برای نمایش خلاصه/جزئیات
  const [deliveryAmount, setDeliveryAmount] = useState<number>(0); // اضافه شده: مقدار حواله
  const [isLoading, setIsLoading] = useState(false); // اضافه شده
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date()); // اضافه شده: تاریخ تحویل
  const [deliveryNotes, setDeliveryNotes] = useState<string>(''); // اضافه شده: توضیحات
  
  // فیلدهای جدید طبق درخواست کاربر
  const [upToDate, setUpToDate] = useState<Date>(new Date());
  const [selectedTankForFilter, setSelectedTankForFilter] = useState<string>('');
  
  // State برای اطلاعات تکمیلی حواله
  const [showDeliveryExtraInfo, setShowDeliveryExtraInfo] = useState<boolean>(false);
  const [deliveryExtraInfo, setDeliveryExtraInfo] = useState<{
    driverFirstName?: string;
    driverLastName?: string;
    driverNationalId?: string;
    billOfLadingNumber?: string;
    plateNumber?: string;
    weight?: number;
    billAmount?: number;
    destination?: string;
    billDate?: Date;
    transportCompany?: string;
    driverMobile?: string;
    destinationAddress?: string;
    backBillAmount?: number;
    destinationPostalCode?: string;
  }>({});
  const [deliveryExtraInfoErrors, setDeliveryExtraInfoErrors] = useState<Record<string, string>>({});
  const [showExtraInfoInTable, setShowExtraInfoInTable] = useState<boolean>(false);
  
  // بارگذاری تنظیمات برای اجباری/اختیاری بودن
  const [enforceDeliveryExtraInfo, setEnforceDeliveryExtraInfo] = useState<{ consignment: boolean; owned: boolean }>({ consignment: false, owned: false });
  
  useEffect(() => {
    const storage = DataStorage.getInstance();
    const savedSettings = (storage.loadData('settings') || {}) as any;
    const performance = savedSettings.performance || {};
    setEnforceDeliveryExtraInfo({
      consignment: performance.requireConsignmentDeliveryExtraInfo || false,
      owned: performance.requireOwnedDeliveryExtraInfo || false
    });
  }, []);

  // همگام‌سازی وزن (مبنا) با مقدار حواله و تاریخ بارنامه با تاریخ حواله
  useEffect(() => {
    if ((showDeliveryExtraInfo || enforceDeliveryExtraInfo.owned) && deliveryAmount !== undefined) {
      setDeliveryExtraInfo(prev => ({
        ...prev,
        weight: deliveryAmount
      }));
    }
    if ((showDeliveryExtraInfo || enforceDeliveryExtraInfo.owned) && deliveryDate) {
      setDeliveryExtraInfo(prev => ({
        ...prev,
        billDate: prev.billDate || deliveryDate
      }));
    }
    // همگام‌سازی آدرس مقصد
    if ((showDeliveryExtraInfo || enforceDeliveryExtraInfo.owned) && selectedReceipt) {
      const destinationAddress = selectedReceipt.siteName || '';
      if (destinationAddress && !deliveryExtraInfo.destinationAddress) {
        setDeliveryExtraInfo(prev => ({
          ...prev,
          destinationAddress
        }));
      }
    }
  }, [deliveryAmount, deliveryDate, selectedReceipt?.siteName, showDeliveryExtraInfo, enforceDeliveryExtraInfo.owned]);
  const [selectedSiteForFilter, setSelectedSiteForFilter] = useState<string>('');
  const [showInventoryPackage, setShowInventoryPackage] = useState<boolean>(true); // اضافه شده: نمایش پکیج موجودی
  const [showCacheClearConfirm, setShowCacheClearConfirm] = useState(false); // اضافه شده: dialog پاک کردن کش
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // اضافه شده: تاریخ انتخاب شده برای فیلتر
  const [printPreviewDelivery, setPrintPreviewDelivery] = useState<OwnershipDelivery | null>(null); // اضافه شده: جداسازی print preview از edit mode
  const [deletingDelivery, setDeletingDelivery] = useState<OwnershipDelivery | null>(null); // اضافه شده: جداسازی delete confirmation از edit mode
  const [isOwnershipTableMinimized, setIsOwnershipTableMinimized] = useState<boolean>(false); // اضافه شده: حالت minimize/maximize جدول

  // داده‌های پایه
  const storage = DataStorage.getInstance();
  
  // بارگذاری baseData از localStorage در صورت عدم وجود در props (مشابه WarehouseReceiptManager)
  const [baseDataState, setBaseDataState] = useState<any>(baseData || {});
  
  useEffect(() => {
    if (!baseData || !baseData.tanks || baseData.tanks.length === 0) {
      try {
        const loadDataWithFallback = (key: string, fallbackData: any[] = []) => {
          try {
            const categories = (storage.loadData('baseDataCategories') || []) as any[];
            const category = categories.find((c: any) => c.id === key.replace('category_', ''));
            const data = (category?.items || []) as any[];
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
        
        setBaseDataState(loadedBaseData);
      } catch (error) {
        console.error('خطا در بارگذاری baseData از localStorage:', error);
      }
    } else {
      setBaseDataState(baseData);
    }
  }, [baseData, storage]);
  
  // استفاده از baseDataState به جای baseData
  const effectiveBaseData = baseDataState;
  
// ======================= شروع کدهای جدید =======================

  // ۱. تابع شروع ویرایش حواله
  const startEditDelivery = useCallback((delivery: OwnershipDelivery) => {
    console.log('📝 شروع ویرایش حواله:', delivery.transactionNumber);
    console.log('📝 startEditDelivery - delivery object:', delivery);
    console.log('📝 startEditDelivery - delivery.id:', delivery.id);
    console.log('📝 startEditDelivery - delivery.amount:', delivery.amount);
    console.log('📝 startEditDelivery - delivery.deliveryDate:', delivery.deliveryDate);
    
    // بارگذاری داده‌های کامل تراکنش از storage
    const deliveries = (storage.loadData('ownership-delivery-slips') || []) as any[];
    const fullDelivery = deliveries.find((d: any) => d.id === delivery.id) || delivery;
    
    console.log('📋 Full delivery data loaded from storage:', fullDelivery);
    console.log('📋 Full delivery amount:', fullDelivery.amount);
    console.log('📋 Full delivery deliveryDate:', fullDelivery.deliveryDate);
    
    // تنظیم حواله برای ویرایش
    setEditingDelivery(fullDelivery);
    setIsAddingNew(false); // غیرفعال کردن حالت افزودن جدید
    
    console.log('✅ EditingDelivery state set:', fullDelivery);
    console.log('✅ IsAddingNew set to: false');
    
    // بارگذاری رسید مربوطه از storage
    const receipts = (storage.loadData('receipts') || []) as any[];
    const receipt = receipts.find((r: any) => 
      r.receiptNumber === fullDelivery.receiptNumber || 
      r.transactionNumber === fullDelivery.receiptNumber
    );
    
    if (receipt) {
      console.log('✅ Found receipt for editing:', receipt);
      setSelectedReceipt(receipt);
      
      // تنظیم سایت و مخزن از رسید
      setSelectedSite(receipt.siteId);
      setSelectedTank(receipt.tankId);
    } else {
      console.warn('⚠️ Receipt not found, using delivery data');
      // اگر رسید یافت نشد، از داده‌های حواله استفاده کن
      const receiptData = {
        ...fullDelivery,
        id: fullDelivery.receiptNumber,
        receiptNumber: fullDelivery.receiptNumber,
        productName: fullDelivery.productName,
        siteName: fullDelivery.siteName,
        tankName: fullDelivery.tankName,
        amount: fullDelivery.amount,
        unit: fullDelivery.unit,
        receiptDate: fullDelivery.deliveryDate,
        userType: 'owned' as const,
        productId: fullDelivery.productId,
        siteId: fullDelivery.siteId,
        tankId: fullDelivery.tankId,
        shipName: fullDelivery.shipName,
        cotageNumber: fullDelivery.cotageNumber,
        indexNumber: fullDelivery.indexNumber,
        driverName: fullDelivery.driverName,
        contractNumber: fullDelivery.contractNumber,
        shipBillOfLadingAmount: fullDelivery.shipBillOfLadingAmount || 0,
        shipUnloadingAmount: fullDelivery.shipUnloadingAmount || 0,
        tankShoreAmount: fullDelivery.tankShoreAmount || 0,
        weightGross: fullDelivery.weightGross || 0,
        wastageAmount: fullDelivery.wastageAmount || 0,
      };
      setSelectedReceipt(receiptData);
      
      // تنظیم سایت و مخزن از داده‌های حواله
      setSelectedSite(fullDelivery.siteId);
      setSelectedTank(fullDelivery.tankId);
    }
    
    // تنظیم مقادیر فرم برای ویرایش
    setDeliveryAmount(fullDelivery.amount || 0);
    setDeliveryDate(new Date(fullDelivery.deliveryDate || new Date()));
    setDeliveryNotes(fullDelivery.notes || '');
    setErrors({});
    
    // بارگذاری اطلاعات تکمیلی
    if ((fullDelivery as any).additionalInfo) {
      setDeliveryExtraInfo((fullDelivery as any).additionalInfo);
      setShowDeliveryExtraInfo(true);
    } else {
      setDeliveryExtraInfo({});
      setShowDeliveryExtraInfo(false);
    }
    
    console.log('✅ Form values set for editing:', {
      deliveryAmount: fullDelivery.amount || 0,
      deliveryDate: fullDelivery.deliveryDate || new Date(),
      deliveryNotes: fullDelivery.notes || ''
    });
    console.log('✅ Edit mode activated successfully');
    
    // اسکرول به فرم ویرایش
    setTimeout(() => {
      const editForm = document.querySelector('[data-edit-form]');
      if (editForm) {
        editForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [storage]);

  // ۲. تابع کمکی برای شروع ویرایش از initialData
  const startEditDeliveryFromInitialData = useCallback((data: any) => {
    try {
      console.log('🔧 Starting edit delivery from initial data:', data);
      
      // بارگذاری داده‌های کامل تراکنش
      const deliveries = (storage.loadData('ownership-delivery-slips') || []) as any[];
      const delivery = deliveries.find((d: any) => d.id === data.id);
      
      if (!delivery) {
        console.error('❌ Delivery not found with id:', data.id);
        alert('تراکنش مورد نظر یافت نشد.');
        return;
      }
      
      console.log('✅ Found delivery for editing:', delivery);
      
      // استفاده از تابع startEditDelivery برای شروع ویرایش
      startEditDelivery(delivery);
      
      console.log('✅ Edit mode activated successfully from initial data');
      
    } catch (error) {
      console.error('❌ Error starting edit from initial data:', error);
      alert('خطا در شروع ویرایش تراکنش.');
    }
  }, [storage, startEditDelivery]);

  // ۳. مدیریت initialData برای حالت ویرایش مستقیم
  useEffect(() => {
    if (initialData) {
      console.log('🔧 NewOwnershipDeliverySlip - InitialData received:', initialData);
      console.log('🔧 NewOwnershipDeliverySlip - InitialData keys:', Object.keys(initialData));
      console.log('🔧 NewOwnershipDeliverySlip - InitialData _editingSource:', initialData._editingSource);
      console.log('🔧 NewOwnershipDeliverySlip - InitialData _isParentEdit:', initialData._isParentEdit);
      
      // تشخیص حالت ویرایش از تراکنش‌ها
      const isFromTransactionList = initialData.id && 
                                    !initialData.id.startsWith('new_') && 
                                    initialData._editingSource === 'transaction-list';
      
      const isFromParentEdit = initialData.id && 
                               !initialData.id.startsWith('new_') && 
                               initialData._isParentEdit;
      
      const isNewFromPermit = initialData.id && initialData.id.startsWith('new_');
      
      console.log('🔧 NewOwnershipDeliverySlip - Edit mode detection:', {
        isFromParentEdit,
        isFromTransactionList,
        isNewFromPermit,
        id: initialData.id,
        startsWithNew: initialData.id?.startsWith('new_')
      });
      
      if (isFromTransactionList) {
        console.log('🚀 NewOwnershipDeliverySlip - Activating Direct Edit Mode');
        // حالت ویرایش مستقیم از جدول تراکنش‌ها
        startEditDeliveryFromInitialData(initialData);
      } else if (isFromParentEdit) {
        console.log('🚀 NewOwnershipDeliverySlip - Activating Parent Edit Mode');
        // حالت ویرایش از والد
        startEditDeliveryFromInitialData(initialData);
      } else if (isNewFromPermit) {
        console.log('🚀 NewOwnershipDeliverySlip - Activating Create Mode');
        // حالت ایجاد جدید
        setIsAddingNew(true);
        setEditingDelivery(null);
      } else {
        console.log('🚀 NewOwnershipDeliverySlip - Activating Default Create Mode');
        // حالت پیش‌فرض
        setIsAddingNew(true);
        setEditingDelivery(null);
      }
    }
  }, [initialData, startEditDeliveryFromInitialData]);

// ======================= پایان کدهای جدید =======================
  const loadData = useCallback(() => {
    try {
      console.log('📂 Starting data loading...');
      
      // همیشه مستقیماً از storage بخوانیم تا آخرین داده‌ها (شامل رسیدهای امانی) را داشته باشیم
      const rawReceipts = (storage.loadData('receipts') || []) as any[];
      console.log('📦 Loaded receipts:', rawReceipts.length, 'items');
      
      // لاگ دیباگ: بررسی تعداد رسیدهای امانی و تملیکی
      const consignmentCount = rawReceipts.filter((r: any) => r.userType === 'consignment').length;
      const ownedCount = rawReceipts.filter((r: any) => r.userType === 'owned').length;
      console.log('🔍 تعداد رسیدهای بارگذاری شده:', {
        total: rawReceipts.length,
        consignment: consignmentCount,
        owned: ownedCount
      });
      
      // نمونه رسیدهای امانی
      const consignmentSamples = rawReceipts.filter((r: any) => r.userType === 'consignment').slice(0, 2);
      if (consignmentSamples.length > 0) {
        console.log('✅ نمونه رسیدهای امانی:', consignmentSamples.map(r => ({
          id: r.id,
          transactionNumber: r.transactionNumber,
          userType: r.userType,
          receiptBasisAmount: r.receiptBasisAmount,
          finalAmount: r.finalAmount,
          amount: r.amount
        })));
      } else {
        console.log('⚠️ هیچ رسید امانی بارگذاری نشد!');
      }
      
      console.log('🔍 First receipt sample:', rawReceipts[0]);
      
      // تبدیل receiptBasisAmount به amount برای سازگاری
      const receipts = rawReceipts.map((r: any) => ({
        ...r,
        amount: r.amount || r.receiptBasisAmount || 0, // استفاده از receiptBasisAmount اگر amount وجود نداشته باشد
        receiptNumber: r.receiptNumber || r.transactionNumber || r.id // استفاده از transactionNumber اگر receiptNumber وجود نداشته باشد
      }));
      
      // تغییر کرده: فقط رسیدهای تملیکی برای محاسبات موجودی
      const filteredReceipts = receipts.filter((r: any) => 
        !r.isVoided && new Date(r.receiptDate) <= selectedDate && r.userType === 'owned'
      );
      console.log('🔍 Filtered owned receipts:', filteredReceipts.length, 'items');
      console.log('📝 First filtered receipt:', filteredReceipts[0]);
      if (filteredReceipts[0]) {
        console.log('💰 Receipt amount check:', {
          amount: filteredReceipts[0].amount,
          receiptBasisAmount: filteredReceipts[0].receiptBasisAmount,
          finalAmount: filteredReceipts[0].finalAmount
        });
      }
      
      // بررسی دقیق فیلدهای کشتی و راننده
      if (filteredReceipts[0]) {
        console.log('🚢 Ship fields check:', {
          shipId: filteredReceipts[0].shipId,
          shipName: filteredReceipts[0].shipName,
          cotageId: filteredReceipts[0].cotageId,
          cotageNumber: filteredReceipts[0].cotageNumber,
          indexId: filteredReceipts[0].indexId,
          indexNumber: filteredReceipts[0].indexNumber,
          driverId: filteredReceipts[0].driverId,
          driverName: filteredReceipts[0].driverName
        });
      }
      
      // دیباگ تعداد رسیدهای امانی دریافت شده
      const consignmentReceiptsCount = filteredReceipts.filter(r => r.userType === 'consignment').length;
      const ownedReceiptsCount = filteredReceipts.filter(r => r.userType === 'owned').length;
      console.log('📊 Debug - تعداد رسیدهای دریافت شده:', {
        totalReceipts: filteredReceipts.length,
        consignmentReceipts: consignmentReceiptsCount,
        ownedReceipts: ownedReceiptsCount,
        sampleConsignmentReceipt: filteredReceipts.find(r => r.userType === 'consignment')
      });
      
      setAvailableReceipts(filteredReceipts);

      // بارگذاری تنظیمات موجودی از props یا storage
      const adjustmentsFromProps = propAdjustments || propAdditions?.concat(propDeductions || []) || [];
      const adjustmentsFromStorage = ((storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
        adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= selectedDate
      ) as InventoryAdjustment[];
      const adjustments = adjustmentsFromProps.length > 0 ? adjustmentsFromProps : adjustmentsFromStorage;
      console.log('⚙️ Loaded adjustments:', {
        fromProps: adjustmentsFromProps.length,
        fromStorage: Array.isArray(adjustmentsFromStorage) ? adjustmentsFromStorage.length : 0,
        final: adjustments.length,
        sample: adjustments[0]
      });
      if (adjustments.length > 0 && adjustments[0]) {
        console.log('📝 Sample adjustment details:', {
          id: adjustments[0].id,
          siteId: adjustments[0].siteId,
          tankId: adjustments[0].tankId,
          productType: adjustments[0].productType,
          adjustmentType: adjustments[0].adjustmentType,
          quantity: adjustments[0].quantity
        });
      }
      setInventoryAdjustmentsState(adjustments);

      // بارگذاری حواله‌های تملیکی قبلی
      const deliveries = ((storage.loadData('ownership-delivery-slips') || []) as any[]).filter((d: any) => 
        d && typeof d === 'object' && !d.isVoided && new Date(d.deliveryDate) <= selectedDate
      ) as OwnershipDelivery[];
      console.log('📋 Loaded existing ownership deliveries:', deliveries.length, 'items');
      setOwnershipDeliveries(deliveries);
      
      // بارگذاری wastage transactions با فیلتر تاریخ
      const wastageTransactionsFromStorage = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
        t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= selectedDate
      );
      console.log('📋 Loaded filtered wastage transactions:', wastageTransactionsFromStorage.length, 'items');
      
      console.log('✅ Data loading completed successfully');
    } catch (error) {
      console.error('❌ خطا در بارگذاری داده‌ها:', error);
    }
  }, [propReceipts, propAdjustments, propAdditions, propDeductions, selectedDate]);

  // بارگذاری داده‌ها از فایل‌های مربوطه
  useEffect(() => {
    loadData();
  }, [loadData]);

  // مدیریت initialData برای حالت ویرایش مستقیم
  

  // تابع کمکی برای شروع ویرایش از initialData
 

  // مدیریت selectedSite و selectedTank بر اساس selectedReceipt
  useEffect(() => {
    if (selectedReceipt && !selectedSite && !selectedTank) {
      setSelectedSite(selectedReceipt.siteId);
      setSelectedTank(selectedReceipt.tankId);
    }
  }, [selectedReceipt, selectedSite, selectedTank]);

  // محاسبه موجودی مخزن نسبت به سایت با فرمول کامل
  const calculateTankInventory = useCallback((siteId: string, tankId: string): InventoryCalculation => {
    console.log('🧮 محاسبه موجودی مخزن نسبت به سایت:', { siteId, tankId });
    
    // فرمول کامل: (جمع تمام رسیدهای امانی و تملیکی + جمع رسیدهای افت امانی و تملیکی + جمع تمامی رسیدهای اضافه انبار) - (جمع تمام حواله های امانی و تملیکی + جمع حواله های افت امانی و تملیکی + جمع تمام سندهای کسر انبار)

    // اطمینان از دریافت داده‌های معتبر - همیشه مستقیماً از storage بخوانیم تا آخرین داده‌ها را داشته باشیم
    const allReceipts = ((storage.loadData('receipts') || []) as any[]).filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= selectedDate
    );
    const allAdjustments = ((propAdjustments || propAdditions?.concat(propDeductions || []) || storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= selectedDate
    );
    const allDeliveries = ((storage.loadData('ownership-delivery-slips') || []) as any[]).filter((d: any) => 
      d && typeof d === 'object' && !d.isVoided && new Date(d.deliveryDate) <= selectedDate
    );
    // حواله های امانی - فیلتر با تاریخ (پشتیبانی از deliveryDate و slipDate)
    const consignmentDeliveries = ((storage.loadData('consignment-delivery-slips') || []) as any[]).filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      
      // بررسی تاریخ - ممکن است deliveryDate یا slipDate باشد
      const dateValue = d.deliveryDate || d.slipDate;
      
      // اگر تاریخ خالی باشد، حواله را شامل کن (برای سازگاری با داده‌های قدیمی)
      if (!dateValue || dateValue === undefined || dateValue === null) {
        return true;
      }
      
      // تبدیل تاریخ به Date object (ممکن است string یا Date باشد)
      const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      
      // اگر تاریخ نامعتبر است، حواله را شامل کن
      if (isNaN(deliveryDate.getTime())) {
        return true;
      }
      
      // فیلتر بر اساس تاریخ انتخاب شده
      return deliveryDate <= selectedDate;
    });

    console.log('📊 داده‌های بارگذاری شده:', {
      receipts: allReceipts.length,
      adjustments: allAdjustments.length,
      deliveries: allDeliveries.length,
      consignmentDeliveries: consignmentDeliveries.length,
      sampleReceipt: allReceipts[0] ? { siteId: allReceipts[0].siteId, tankId: allReceipts[0].tankId, amount: allReceipts[0].amount } : null,
      sampleAdjustment: allAdjustments[0] ? { siteId: allAdjustments[0].siteId, tankId: allAdjustments[0].tankId, quantity: allAdjustments[0].quantity } : null
    });

    // 🔍 دیباگ حواله‌های امانی
    const consignmentDeliveriesFromStorage = ((storage.loadData('consignment-delivery-slips') || []) as any[]);
    console.log('🔍 دیباگ حواله‌های امانی:', {
      'کل حواله‌های امانی در storage': consignmentDeliveriesFromStorage.length,
      'حواله‌های امانی فیلتر شده': consignmentDeliveries.length,
      'مقدار کل حواله‌های امانی': consignmentDeliveries.reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
      'نمونه حواله امانی': consignmentDeliveries[0] || 'هیچ',
      'تاریخ انتخاب شده': upToDate.toISOString().split('T')[0]
    });

    // 🔍 نمایش جزئیات کامل حواله‌های امانی از storage
    if (consignmentDeliveriesFromStorage.length > 0) {
      console.log('📋 جزئیات کامل حواله‌های امانی در storage:', consignmentDeliveriesFromStorage.map(d => ({
        id: d.id,
        amount: d.amount,
        deliveryDate: d.deliveryDate,
        siteId: d.siteId,
        tankId: d.tankId,
        isVoided: d.isVoided,
        selectedDate: selectedDate.toISOString().split('T')[0],
        dateComparison: `deliveryDate: ${d.deliveryDate} <= selectedDate: ${selectedDate.toISOString().split('T')[0]}`,
        willBeIncluded: new Date(d.deliveryDate) <= selectedDate && !d.isVoided
      })));
    }

    // فیلتر کردن داده‌ها بر اساس سایت و مخزن انتخاب شده (اگر خالی باشند، از selectedReceipt استفاده کن)
    const currentSiteId = siteId || selectedReceipt?.siteId;
    const currentTankId = tankId || selectedReceipt?.tankId;
    
    console.log('🔍 فیلتر کردن بر اساس:', { currentSiteId, currentTankId });
    
    const siteTankReceipts = allReceipts.filter((r: any) => {
      const matches = r && r.siteId === currentSiteId && r.tankId === currentTankId && !r.isVoided && r.userType === 'owned';
      if (!matches && r && (r.siteId === currentSiteId || r.tankId === currentTankId)) {
        console.log('⚠️ رسید فیلتر نشد:', { 
          receiptId: r.id, 
          receiptSiteId: r.siteId, 
          receiptTankId: r.tankId,
          currentSiteId, 
          currentTankId,
          siteMatch: r.siteId === currentSiteId,
          tankMatch: r.tankId === currentTankId,
          isVoided: r.isVoided,
          userType: r.userType
        });
      }
      return matches;
    });
    const siteTankAdjustments = allAdjustments.filter((adj: any) => {
      const matches = adj && adj.siteId === currentSiteId && adj.tankId === currentTankId && !adj.isVoided && adj.productType === 'owned';
      if (!matches && adj && (adj.siteId === currentSiteId || adj.tankId === currentTankId)) {
        console.log('⚠️ تنظیم موجودی فیلتر نشد:', { 
          adjId: adj.id, 
          adjSiteId: adj.siteId, 
          adjTankId: adj.tankId,
          currentSiteId, 
          currentTankId,
          siteMatch: adj.siteId === currentSiteId,
          tankMatch: adj.tankId === currentTankId,
          isVoided: adj.isVoided,
          productType: adj.productType
        });
      }
      return matches;
    });
    const siteTankDeliveries = allDeliveries.filter((d: any) => 
      d && d.siteId === currentSiteId && d.tankId === currentTankId && !d.isVoided
    );
    const siteTankConsignmentDeliveries = consignmentDeliveries.filter((d: any) => 
      d && d.siteId === currentSiteId && d.tankId === currentTankId && !d.isVoided && new Date(d.deliveryDate) <= selectedDate
    );

    console.log('📊 داده‌های فیلتر شده:', {
      receipts: siteTankReceipts.length,
      adjustments: siteTankAdjustments.length,
      deliveries: siteTankDeliveries.length,
      consignmentDeliveries: siteTankConsignmentDeliveries.length
    });

    // تابع کمکی برای تبدیل عدد و جلوگیری از NaN
    const safeNumber = (value: any, defaultValue = 0): number => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    // جمع رسیدهای تملیکی برای سایت و مخزن انتخاب شده - فقط تملیکی
    const totalOwnedReceipts = siteTankReceipts
      .reduce((sum: number, r: any) => {
        const amount = r.amount || r.receiptBasisAmount || 0;
        return sum + safeNumber(amount, 0);
      }, 0);

    // حذف شده: جمع رسیدهای امانی - فقط تملیکی
    const totalConsignmentReceipts = 0;

    // جمع افزودن به تملیکی برای سایت و مخزن انتخاب شده - فقط تملیکی
    const totalOwnedWastage = siteTankReceipts
      .reduce((sum: number, r: any) => sum + safeNumber(r.wastageAmount, 0), 0);

    // حذف شده: جمع رسیدهای افت امانی - فقط تملیکی
    const totalConsignmentWastage = 0;

    // جمع رسیدهای اضافه انبار تملیکی برای سایت و مخزن انتخاب شده - فقط تملیکی
    const totalOwnedSurplus = siteTankAdjustments
      .filter((adj: any) => adj && adj.adjustmentType === 'addition' && adj.productType === 'owned')
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // حذف شده: جمع رسیدهای اضافه انبار امانی - فقط تملیکی
    const totalConsignmentSurplus = 0;

    // جمع حواله‌های تملیکی برای سایت و مخزن انتخاب شده
    const totalOwnedDeliveries = siteTankDeliveries
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    // جمع حواله‌های امانی برای سایت و مخزن انتخاب شده
    const totalConsignmentDeliveries = siteTankConsignmentDeliveries
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    // توجه: طبق فرمول کاربر، افت حواله‌ها در خروجی لحاظ نمی‌شود
    // فقط حواله‌های اصلی (amount) محاسبه می‌شوند
    const totalOwnedDeliveryWastage = 0; // حذف شد طبق فرمول کاربر
    const totalConsignmentDeliveryWastage = 0; // حذف شد طبق فرمول کاربر

    // جمع سندهای کسر انبار تملیکی برای سایت و مخزن انتخاب شده
    const totalOwnedDeductions = siteTankAdjustments
      .filter((adj: any) => adj && adj.adjustmentType === 'deduction' && adj.productType === 'owned')
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // حذف شده: جمع سندهای کسر انبار امانی - فقط تملیکی
    const totalConsignmentDeductions = 0;

    // فرمول موجودی مخزن فقط شامل تملیکی (طبق درخواست کاربر)
    // (رسیدهای تملیکی + رسیدهای افت تملیکی + اضافه انبار تملیکی) - (حواله‌های تملیکی + کسر انبار تملیکی)
    const finalInventory = (totalOwnedReceipts + totalOwnedWastage + totalOwnedSurplus) - 
      (totalOwnedDeliveries + totalOwnedDeductions);

    // اطمینان از عدم NaN و عدد معتبر در نتیجه نهایی
    const validFinalInventory = isNaN(finalInventory) ? 0 : finalInventory;

    console.log('🧮 محاسبه موجودی مخزن نسبت به سایت - نتایج (فقط تملیکی):', {
      'رسیدهای تملیکی': totalOwnedReceipts,
      'افت تملیکی': totalOwnedWastage,
      'اضافه انبار تملیکی': totalOwnedSurplus,
      'حواله‌های تملیکی': totalOwnedDeliveries,
      'کسر انبار تملیکی': totalOwnedDeductions,
      'موجودی نهایی (فقط تملیکی)': validFinalInventory,
      'توضیح': 'فقط فیلدهای تملیکی محاسبه می‌شوند طبق درخواست کاربر',
      'سایت': currentSiteId,
      'مخزن': currentTankId,
      'تعداد رسیدهای فیلتر شده': siteTankReceipts.length,
      'تعداد تنظیمات فیلتر شده': siteTankAdjustments.length,
      'نمونه رسید': siteTankReceipts[0] ? { amount: siteTankReceipts[0].amount, userType: siteTankReceipts[0].userType } : null,
      'نمونه تنظیم': siteTankAdjustments[0] ? { quantity: siteTankAdjustments[0].quantity, adjustmentType: siteTankAdjustments[0].adjustmentType, productType: siteTankAdjustments[0].productType } : null
    });

    return {
      totalOwnedReceipts,
      totalConsignmentReceipts,
      totalOwnedWastage,
      totalConsignmentWastage,
      totalOwnedSurplus,
      totalConsignmentSurplus,
      totalOwnedDeliveries,
      totalConsignmentDeliveries,
      totalOwnedDeliveryWastage,
      totalConsignmentDeliveryWastage,
      totalOwnedDeductions,
      totalConsignmentDeductions,
      finalInventory: validFinalInventory
    };
  }, [propReceipts, propAdjustments, propAdditions, propDeductions, selectedDate]);

  // محاسبه مانده موجودی تملیکی برای رسید انتخاب شده
  const calculateRemainingInventory = useCallback((receipt: Receipt | null): number => {
    if (!receipt) {
      console.log('⚠️ calculateRemainingInventory: receipt is null');
      return 0;
    }

    console.log('🧮 محاسبه مانده موجودی تملیکی برای رسید:', {
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      siteId: receipt.siteId,
      tankId: receipt.tankId,
      productId: receipt.productId,
      amount: receipt.amount
    });

    // فرمول دقیق: (مقدار رسید انبار + سند اضافه انبار تملیکی - سند کسر انبار تملیکی - جمع مقدار "حواله انبار های تملیکی" که از محل رسید انبار انتخاب شده، ایجاد شده اند و در وضعیت "صادر شده" هستند)

    // اطمینان از دریافت داده‌های معتبر
    const allAdjustments = ((propAdjustments || propAdditions?.concat(propDeductions || []) || storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= selectedDate
    );
    const allDeliveries = ((storage.loadData('ownership-delivery-slips') || []) as any[]).filter((d: any) => 
      d && typeof d === 'object' && !d.isVoided && new Date(d.deliveryDate) <= selectedDate
    );
    
    // بارگذاری تراکنش‌های wastage و فیلتر کردن تراکنش‌های "افزودن به تملیکی"
    const wastageTransactionsForCalculation = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= selectedDate
    );
    const ownedWastageTransactionsForReceipt = wastageTransactionsForCalculation.filter((transaction: any) => 
      transaction.transactionType === 'owned' && 
      !transaction.isVoided
    );

    console.log('📊 داده‌های برای محاسبه مانده موجودی:', {
      adjustments: allAdjustments.length,
      deliveries: allDeliveries.length,
      wastageTransactions: wastageTransactionsForCalculation.length,
      ownedWastageTransactionsForReceipt: ownedWastageTransactionsForReceipt.length
    });

    // اطمینان از معتبر بودن receipt.amount - استفاده از receiptBasisAmount اگر amount وجود نداشته باشد
    const receiptAmount = safeNumber(receipt.amount, safeNumber((receipt as any).receiptBasisAmount, safeNumber((receipt as any).finalAmount, 0)));
    console.log('💰 مقدار رسید اولیه:', {
      amount: receipt.amount,
      receiptBasisAmount: (receipt as any).receiptBasisAmount,
      finalAmount: (receipt as any).finalAmount,
      calculated: receiptAmount
    });

    // جمع سندهای اضافه انبار تملیکی برای این محصول، سایت و مخزن
    const totalSurplus = allAdjustments
      .filter((adj: any) => {
        // تطابق دقیق با رسید انتخاب شده
        return adj.siteId === receipt.siteId && 
               adj.tankId === receipt.tankId &&
               adj.productId === receipt.productId &&
               adj.adjustmentType === 'addition' && 
               adj.productType === 'owned' &&
               !adj.isVoided;
      })
      .reduce((sum, adj) => {
        const qty = safeNumber(adj.quantity, 0);
        return sum + qty;
      }, 0);

    // جمع سندهای کسر انبار تملیکی برای این محصول، سایت و مخزن
    const totalDeductions = allAdjustments
      .filter((adj: any) => {
        // تطابق دقیق با رسید انتخاب شده
        return adj.siteId === receipt.siteId && 
               adj.tankId === receipt.tankId &&
               adj.productId === receipt.productId &&
               adj.adjustmentType === 'deduction' && 
               adj.productType === 'owned' &&
               !adj.isVoided;
      })
      .reduce((sum, adj) => {
        const qty = safeNumber(adj.quantity, 0);
        return sum + qty;
      }, 0);

    // جمع حواله‌های تملیکی که از محل رسید انبار انتخاب شده، ایجاد شده اند و در وضعیت "صادر شده" هستند
    const totalIssuedDeliveries = allDeliveries
      .filter((d: any) => {
        // تطابق دقیق با رسید انتخاب شده و وضعیت "صادر شده"
        return d.receiptNumber === receipt.receiptNumber && 
               d.status === 'issued' &&
               !d.isVoided;
      })
      .reduce((sum: number, d: any) => {
        const amount = safeNumber(d.amount, 0);
        return sum + amount;
      }, 0);

    // جمع تراکنش‌های "افزودن به تملیکی" از wastage transactions برای این محصول، سایت و مخزن
    const ownedWastageTransactionsForInventory = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= selectedDate
    );
    const ownedWastageTransactions = ownedWastageTransactionsForInventory.filter((transaction: any) => 
      transaction.transactionType === 'owned' && 
      !transaction.isVoided
    );
    
    const totalOwnedWastage = ownedWastageTransactions
      .filter((transaction: any) => {
        // تطابق دقیق با رسید انتخاب شده
        return transaction.siteId === receipt.siteId && 
               transaction.tankId === receipt.tankId &&
               transaction.productId === receipt.productId &&
               !transaction.isVoided;
      })
      .reduce((sum, transaction) => {
        const qty = safeNumber(transaction.amount, 0);
        return sum + qty;
      }, 0);

    // فرمول نهایی: (مقدار رسید انبار + سندهای اضافه انبار تملیکی + تراکنش‌های افزودن به تملیکی - سندهای کسر انبار تملیکی - حواله‌های صادر شده از این رسید)
    const remainingInventory = receiptAmount + totalSurplus + totalOwnedWastage - totalDeductions - totalIssuedDeliveries;
    
    // حذف state update از داخل calculation function برای جلوگیری از infinite loop
    
    // اطمینان از عدم NaN و عدد معتبر - حداقل صفر
    const validRemainingInventory = isNaN(remainingInventory) ? 0 : Math.max(0, remainingInventory);
    
    console.log('🧮 محاسبه مانده موجودی تملیکی - نتایج:', {
      'رسید اولیه': receiptAmount,
      'سندهای اضافه انبار': totalSurplus,
      'افزودن به تملیکی': totalOwnedWastage,
      'سندهای کسر انبار': totalDeductions,
      'حواله‌های صادر شده': totalIssuedDeliveries,
      'مانده نهایی': validRemainingInventory,
      'شماره رسید': receipt.receiptNumber,
      'نام محصول': receipt.productName,
      'سایت': receipt.siteId,
      'مخزن': receipt.tankId,
      'محصول': receipt.productId,
      'تعداد تنظیمات فیلتر شده': allAdjustments.filter((adj: any) => 
        adj.siteId === receipt.siteId && 
        adj.tankId === receipt.tankId &&
        adj.productId === receipt.productId
      ).length,
      'تعداد حواله‌های فیلتر شده': allDeliveries.filter((d: any) => 
        d.receiptNumber === receipt.receiptNumber && 
        d.status === 'issued'
      ).length,
      'تعداد تراکنش‌های wastage فیلتر شده': ownedWastageTransactions.filter((t: any) => 
        t.siteId === receipt.siteId && 
        t.tankId === receipt.tankId &&
        t.productId === receipt.productId
      ).length
    });

    return validRemainingInventory;
  }, [propAdjustments, propAdditions, propDeductions, selectedDate]);

  // محاسبه موجودی مخازن تملیکی بر اساس فرمول کاربر
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _calculateOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن تملیکی:', { siteId, tankId });
    
    // اطمینان از دریافت داده‌های معتبر - همیشه مستقیماً از storage بخوانیم تا آخرین داده‌ها را داشته باشیم
    const allReceipts = ((storage.loadData('receipts') || []) as any[]).filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= selectedDate
    );
    const allAdjustments = ((propAdjustments || propAdditions?.concat(propDeductions || []) || storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= selectedDate
    );
    const allDeliveries = ((storage.loadData('ownership-delivery-slips') || []) as any[]).filter((d: any) => 
      d && typeof d === 'object' && !d.isVoided && new Date(d.deliveryDate) <= selectedDate
    );
    // بارگذاری تراکنش‌های wastage برای دسترسی به "افزودن به تملیکی" و "کسر از امانی"
    const allWastageTransactions = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= selectedDate
    );
    // فیلتر کردن داده‌ها بر اساس سایت و مخزن انتخاب شده
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    const siteTankReceipts = allReceipts.filter((r: any) => {
      if (currentSiteId && r.siteId !== currentSiteId) return false;
      if (currentTankId && r.tankId !== currentTankId) return false;
      return r.userType === 'owned' && !r.isVoided && new Date(r.receiptDate) <= selectedDate;
    });
    
    const siteTankAdjustments = allAdjustments.filter((adj: any) => {
      if (currentSiteId && adj.siteId !== currentSiteId) return false;
      if (currentTankId && adj.tankId !== currentTankId) return false;
      return adj.productType === 'owned' && !adj.isVoided && new Date(adj.documentDate) <= selectedDate;
    });
    
    const siteTankDeliveries = allDeliveries.filter((d: any) => {
      if (currentSiteId && d.siteId !== currentSiteId) return false;
      if (currentTankId && d.tankId !== currentTankId) return false;
      return !d.isVoided && new Date(d.deliveryDate) <= selectedDate;
    });

    // تابع کمکی برای تبدیل عدد و جلوگیری از NaN
    const safeNumber = (value: any, defaultValue = 0): number => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    // فرمول کاربر: جمع(رسید انبارهای تملیکی + سند اضافه انبارهای تملیکی - حواله های تملیکی - افت تملیکی ها - سند کسر انبارهای تملیکی)
    
    // 1. جمع رسید انبارهای تملیکی
    const ownedReceiptsAmount = siteTankReceipts.reduce((sum, r) => {
      const amount = r.amount || r.receiptBasisAmount || 0;
      return sum + safeNumber(amount, 0);
    }, 0);

    // 2. سند اضافه انبارهای تملیکی
    const ownedAdditionDocuments = siteTankAdjustments
      .filter(adj => adj.adjustmentType === 'addition')
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // 3. حواله های تملیکی
    const ownedDeliveries = siteTankDeliveries
      .filter(d => !d.isVoided && new Date(d.deliveryDate) <= selectedDate)
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    // 4. افزودن به تملیکی - استفاده از جدول wastageTransactions با transactionType === 'owned'
    const ownedGainedFiltered = allWastageTransactions.filter((t: any) => 
      t && typeof t === 'object' &&
      t.transactionType === 'owned' && 
      !t.isVoided &&
      (currentSiteId ? t.siteId === currentSiteId : true) &&
      (currentTankId ? t.tankId === currentTankId : true)
    );
    
    console.log('🔍 [calculateOwnedTanksInventory] تراکنش‌های wastage برای "افزودن به تملیکی":', {
      count: ownedGainedFiltered.length,
      amounts: ownedGainedFiltered.map(t => t.amount)
    });
    
    // مقدار amount ممکن است منفی باشد، پس از Math.abs استفاده می‌کنیم تا همیشه مثبت باشد
    const ownedGainedAmount = ownedGainedFiltered.reduce((sum, t) => {
      const amount = safeNumber(t.amount, 0);
      return sum + Math.abs(amount);
    }, 0);

    // 5. سند کسر انبارهای تملیکی
    const ownedDeductionDocuments = siteTankAdjustments
      .filter(adj => adj.adjustmentType === 'deduction' && !adj.isVoided && new Date(adj.documentDate) <= selectedDate)
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // فرمول جدید: جمع تمامی فیلدهای تملیکی + تمامی تراکنش‌های امانی
    // رسید انبارهای امانی + سند اضافه انبارهای امانی - حواله های امانی - کسر از امانی - سند کسر انبارهای امانی
    const consignmentTransactions = allWastageTransactions.filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided &&
      (currentSiteId ? t.siteId === currentSiteId : true) &&
      (currentTankId ? t.tankId === currentTankId : true)
    );
    
    // تغییر کرده: رسیدهای امانی - با استفاده از userType='consignment'
    const consignmentReceipts = allReceipts.filter((r: any) => 
      r && typeof r === 'object' &&
      r.userType === 'consignment' && 
      !r.isVoided &&
      (currentSiteId ? r.siteId === currentSiteId : true) &&
      (currentTankId ? r.tankId === currentTankId : true)
    );
    
    console.log('🔍 [calculateOwnedTanksInventory] رسیدهای امانی فیلتر شده:', {
      count: consignmentReceipts.length,
      siteFilter: currentSiteId,
      tankFilter: currentTankId,
      sampleData: consignmentReceipts.slice(0, 2).map(r => ({
        id: r.id,
        transactionNumber: r.transactionNumber || r.receiptNumber,
        receiptBasisAmount: r.receiptBasisAmount,
        finalAmount: r.finalAmount,
        amount: r.amount,
        shipBillOfLadingAmount: r.shipBillOfLadingAmount,
        shipUnloadingAmount: r.shipUnloadingAmount,
        tankShoreAmount: r.tankShoreAmount,
        weightGross: r.weightGross,
        userType: r.userType,
        isVoided: r.isVoided
      }))
    });
    
    // بهبود: مطمئن شویم که داده‌های امانی موجود است
    if (consignmentReceipts.length === 0) {
      console.log('⚠️ هیچ رسید امانی یافت نشد. بررسی دلیل:');
      const allConsignmentReceipts = allReceipts.filter(r => r.userType === 'consignment');
      console.log('📋 کل رسیدهای امانی در allReceipts:', {
        total: allConsignmentReceipts.length,
        sample: allConsignmentReceipts[0],
        siteMismatch: allConsignmentReceipts.filter(r => r.siteId !== currentSiteId),
        tankMismatch: allConsignmentReceipts.filter(r => r.tankId !== currentTankId)
      });
    }
    
    const consignmentReceiptsAmount = consignmentReceipts
      .filter((r: any) => !r.isVoided && new Date(r.receiptDate) <= selectedDate)
      .reduce((sum: number, r: any) => {
      // بهبود: برای رسیدهای امانی، همان اولویت رسیدهای تملیکی را اعمال می‌کنیم
      let baseAmount = 0;
      
      // اولویت 1: receiptBasisAmount
      if (r.receiptBasisAmount && r.receiptBasisAmount > 0) {
        baseAmount = r.receiptBasisAmount;
        console.log('📊 [رسید امانی - receiptBasisAmount پیدا شد]:', {
          transactionNumber: r.transactionNumber || r.receiptNumber,
          receiptBasisAmount: r.receiptBasisAmount,
          selectedAmount: baseAmount,
          userType: r.userType
        });
      }
      // اولویت 2: finalAmount
      else if (r.finalAmount && r.finalAmount > 0) {
        baseAmount = r.finalAmount;
        console.log('📊 [رسید امانی - finalAmount استفاده شد]:', {
          transactionNumber: r.transactionNumber || r.receiptNumber,
          finalAmount: r.finalAmount,
          selectedAmount: baseAmount
        });
      }
      // اولویت 3: amount
      else if (r.amount && r.amount > 0) {
        baseAmount = r.amount;
        console.log('📊 [رسید امانی - amount استفاده شد]:', {
          transactionNumber: r.transactionNumber || r.receiptNumber,
          amount: r.amount,
          selectedAmount: baseAmount
        });
      }
      // fallback: با محاسبات جزئی
      else {
        baseAmount = (safeNumber(r.shipUnloadingAmount, 0) + 
                     safeNumber(r.tankShoreAmount, 0) + 
                     safeNumber(r.shipBillOfLadingAmount, 0) + 
                     safeNumber(r.weightGross, 0));
        console.log('📊 [رسید امانی - محاسبات جزئی]:', {
          transactionNumber: r.transactionNumber || r.receiptNumber,
          calculations: {
            shipUnloadingAmount: safeNumber(r.shipUnloadingAmount, 0),
            tankShoreAmount: safeNumber(r.tankShoreAmount, 0),
            shipBillOfLadingAmount: safeNumber(r.shipBillOfLadingAmount, 0),
            weightGross: safeNumber(r.weightGross, 0)
          },
          selectedAmount: baseAmount
        });
      }
      
      const finalSum = sum + baseAmount;
      console.log('📊 [رسید امانی در calculateOwnedTanksInventory - محاسبه نهایی]:', {
        previousSum: sum,
        currentAmount: baseAmount,
        newSum: finalSum,
        transactionNumber: r.transactionNumber || r.receiptNumber
      });
      
      return finalSum;
    }, 0);
    
    // سند اضافه انبارهای امانی - فیلتر بهتر
    const consignmentAdditions = allAdjustments
      .filter(adj => 
        adj.adjustmentType === 'addition' && 
        adj.productType === 'consignment' &&
        (currentSiteId ? adj.siteId === currentSiteId : true) &&
        (currentTankId ? adj.tankId === currentTankId : true) &&
        !adj.isVoided && new Date(adj.documentDate) <= selectedDate
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);
    
    // حواله های امانی - فیلتر با تاریخ (پشتیبانی از deliveryDate و slipDate)
    const allConsignmentDeliveries = ((storage.loadData('consignment-delivery-slips') || []) as any[]).filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      
      // بررسی تاریخ - ممکن است deliveryDate یا slipDate باشد
      const dateValue = d.deliveryDate || d.slipDate;
      
      // اگر تاریخ خالی باشد، حواله را شامل کن (برای سازگاری با داده‌های قدیمی)
      if (!dateValue || dateValue === undefined || dateValue === null) {
        return true;
      }
      
      // تبدیل تاریخ به Date object (ممکن است string یا Date باشد)
      const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      
      // اگر تاریخ نامعتبر است، حواله را شامل کن
      if (isNaN(deliveryDate.getTime())) {
        return true;
      }
      
      // فیلتر بر اساس تاریخ انتخاب شده
      return deliveryDate <= selectedDate;
    }) as any[];
    
    // فیلتر حواله‌های امانی بر اساس سایت و مخزن (تاریخ قبلاً فیلتر شده) - شامل تمام حواله‌ها بدون محدودیت نوع
    const consignmentDeliveries = allConsignmentDeliveries
      .filter((d: any) => {
        if (!d || typeof d !== 'object' || d.isVoided) return false;
        
        // فیلتر سایت و مخزن (تاریخ قبلاً فیلتر شده)
        return (!currentSiteId || d.siteId === currentSiteId) &&
               (!currentTankId || d.tankId === currentTankId);
      })
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    // 🔍 لاگ برای تشخیص مشکل حواله‌های امانی
    console.log('🔍 دیباگ حواله‌های امانی در calculateOwnedTanksInventory:', {
      'مقدار کل حواله‌های امانی': consignmentDeliveries,
      'فیلتر سایت': currentSiteId,
      'فیلتر مخزن': currentTankId,
      'تاریخ انتخاب شده': upToDate.toISOString().split('T')[0]
    });
    
    // کسر از امانی (جایگزین شده به جای consignmentWastageAmount) - اصلاح شده
    const consignmentDeductionAmount = consignmentTransactions
      .filter((t: any) => t.transactionType === 'consignment' && !t.isVoided && new Date(t.transactionDate) <= upToDate)
      .reduce((sum, t) => sum + Math.abs(safeNumber(t.amount, 0)), 0);
    
    // سند کسر انبارهای امانی - استفاده از inventoryAdjustments
    const consignmentDeductionDocuments = allAdjustments
      .filter((adj: any) => 
        adj && typeof adj === 'object' &&
        adj.adjustmentType === 'deduction' && 
        adj.productType === 'consignment' &&
        (currentSiteId ? adj.siteId === currentSiteId : true) &&
        (currentTankId ? adj.tankId === currentTankId : true) &&
        !adj.isVoided && new Date(adj.documentDate) <= selectedDate
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);
    
    // محاسبه کالای مصرفی و تولیدی برای تملیکی
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
    
    const consignmentConsumedProducts = siteTankConversions
      .filter((c: any) => c.consumedProductType === 'consignment')
      .reduce((sum: number, c: any) => sum + safeNumber(c.consumedQuantity, 0), 0);
    
    const consignmentProducedProducts = siteTankConversions
      .filter((c: any) => c.producedProductType === 'consignment')
      .reduce((sum: number, c: any) => sum + safeNumber(c.producedQuantity, 0), 0);

    // محاسبه نهایی: فیلدهای تملیکی + فیلدهای امانی (با در نظر گیری کالای مصرفی و تولیدی)
    const totalOwnedValue = ownedReceiptsAmount + ownedAdditionDocuments + ownedGainedAmount + ownedProducedProducts - ownedDeliveries - ownedDeductionDocuments - ownedConsumedProducts;

    // ✅ اصلاح شده: نباید ownedGainedAmount را از بخش امانی کم کنیم
    const totalConsignmentValue = consignmentReceiptsAmount + consignmentAdditions + consignmentProducedProducts - consignmentDeliveries - consignmentDeductionAmount - consignmentDeductionDocuments - consignmentConsumedProducts;

    const finalInventory = totalOwnedValue + totalConsignmentValue;

    // 🔍 لاگ اضافی برای تشخیص مشکل حواله‌های امانی
    console.log('🔍 دیباگ تفصیلی حواله‌های امانی:', {
      'مقدار کل حواله‌های امانی': consignmentDeliveries,
      'فیلتر سایت': currentSiteId,
      'فیلتر مخزن': currentTankId,
      'تاریخ انتخاب شده': upToDate.toISOString().split('T')[0]
    });

    console.log('🧮 محاسبه موجودی مخازن تملیکی - نتایج و داده‌های خام:', {
      'رسید انبارهای تملیکی': ownedReceiptsAmount,
      'سند اضافه انبارهای تملیکی': ownedAdditionDocuments,
      'حواله های تملیکی': ownedDeliveries,
      'افزودن به تملیکی از محل افت': ownedGainedAmount,
      'سند کسر انبارهای تملیکی': ownedDeductionDocuments,
      // تراکنش‌های امانی
      'رسید انبارهای امانی': consignmentReceiptsAmount,
      'سند اضافه انبارهای امانی': consignmentAdditions,
      'حواله های امانی': consignmentDeliveries,
      'کسر از امانی از محل افت': consignmentDeductionAmount,
      'سند کسر انبارهای امانی': consignmentDeductionDocuments,
      'موجودی نهایی': finalInventory,
      'سایت': currentSiteId,
      'مخزن': currentTankId,
      // دیباگ اطلاعات
      'تعداد رسیدهای تملیکی': siteTankReceipts.length,
      'تعداد رسیدهای امانی': consignmentReceipts.length,
      'تعداد تنظیمات': siteTankAdjustments.length,
      'تعداد allAdjustments': allAdjustments.length,
      'تعداد wastageTransactions': consignmentTransactions.length,
      'آیا از fallback استفاده شد؟': {
        'ownedGainedAmount': ownedGainedAmount > 0 ? 'دارد مقدار' : 'استفاده از fallback یا صفر',
        'consignmentReceiptsAmount': consignmentReceipts.length > 0 ? 'از receipts اصلی' : 'از fallback',
        'consignmentDeductionDocuments': consignmentDeductionDocuments > 0 ? 'دارد مقدار' : 'استفاده از fallback یا صفر'
      }
    });

    // محاسبه totalConsignmentDeliveries برای return
    const totalConsignmentDeliveries = consignmentDeliveries;
    
    // محاسبه consignmentAdditionDocuments برای return
    const consignmentAdditionDocuments = consignmentAdditions;
    
    return {
      ownedReceiptsAmount,
      ownedAdditionDocuments,
      ownedDeliveries,
      ownedGainedAmount,
      ownedDeductionDocuments,
      ownedConsumedProducts,
      ownedProducedProducts,
      // اضافه کردن اطلاعات امانی
      consignmentReceiptsAmount,
      consignmentAdditions: consignmentAdditionDocuments,
      consignmentAdditionDocuments,
      consignmentDeliveries: totalConsignmentDeliveries,
      totalConsignmentDeliveries,
      consignmentDeductionAmount,
      consignmentDeductionDocuments,
      consignmentConsumedProducts,
      consignmentProducedProducts,
      finalInventory
    };
  }, [propReceipts, propAdjustments, propAdditions, propDeductions, upToDate, selectedSiteForFilter, selectedTankForFilter]);

  // محاسبه موجودی مخازن امانی/تملیکی بر اساس فرمول کاربر
  const calculateConsignmentOwnedTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن امانی/تملیکی:', { siteId, tankId });
    
    // اطمینان از دریافت داده‌های معتبر - همیشه مستقیماً از storage بخوانیم تا آخرین داده‌ها را داشته باشیم
    // استفاده از upToDate به جای selectedDate برای هماهنگی با صفحه کسر/اضافه انبار
    const allReceipts = ((storage.loadData('receipts') || []) as any[]).filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= upToDate
    );
    const allAdjustments = ((propAdjustments || propAdditions?.concat(propDeductions || []) || storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= upToDate
    );
    
    // حواله های امانی - فیلتر با تاریخ (پشتیبانی از deliveryDate و slipDate)
    // استفاده از upToDate به جای selectedDate برای هماهنگی با صفحه کسر/اضافه انبار
    const allConsignmentDeliveries = ((storage.loadData('consignment-delivery-slips') || []) as any[]).filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      
      // بررسی تاریخ - ممکن است deliveryDate یا slipDate باشد
      const dateValue = d.deliveryDate || d.slipDate;
      
      // اگر تاریخ خالی باشد، حواله را شامل کن (برای سازگاری با داده‌های قدیمی)
      if (!dateValue || dateValue === undefined || dateValue === null) {
        return true;
      }
      
      // تبدیل تاریخ به Date object (ممکن است string یا Date باشد)
      const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      
      // اگر تاریخ نامعتبر است، حواله را شامل کن
      if (isNaN(deliveryDate.getTime())) {
        return true;
      }
      
      // فیلتر بر اساس تاریخ upToDate (مشابه صفحه کسر/اضافه انبار)
      return deliveryDate <= upToDate;
    }) as any[];
    
    // بارگذاری تراکنش‌های wastage برای دسترسی به "کسر از امانی"
    const wastageTransactionsForConsignment = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= upToDate
    );

    // فیلتر کردن داده‌ها بر اساس سایت و مخزن انتخاب شده
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    // فیلتر حواله‌های امانی بر اساس سایت و مخزن (تاریخ قبلاً فیلتر شده) - شامل تمام حواله‌ها بدون محدودیت نوع
    const consignmentDeliveries = allConsignmentDeliveries.filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      
      // فیلتر سایت و مخزن (تاریخ قبلاً فیلتر شده)
      return (!currentSiteId || d.siteId === currentSiteId) &&
             (!currentTankId || d.tankId === currentTankId);
    });

    console.log('🔍 نتیجه فیلتر حواله‌های امانی:', {
      'کل حواله‌ها': allConsignmentDeliveries.length,
      'حواله‌های فیلتر شده': consignmentDeliveries.length,
      'اولین حواله امانی': consignmentDeliveries[0] || 'none'
    });

    // فیلتر تراکنش‌های wastage بر اساس سایت و مخزن (تاریخ قبلاً در wastageTransactionsForConsignment فیلتر شده)
    const consignmentTransactions = wastageTransactionsForConsignment.filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided &&
      (currentSiteId ? t.siteId === currentSiteId : true) &&
      (currentTankId ? t.tankId === currentTankId : true)
    );
    
    const siteTankReceipts = allReceipts.filter((r: any) => {
      if (currentSiteId && r.siteId !== currentSiteId) return false;
      if (currentTankId && r.tankId !== currentTankId) return false;
      return !r.isVoided && new Date(r.receiptDate) <= upToDate; // شامل هر دو نوع امانی و تملیکی
    });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _siteTankAdjustments = allAdjustments.filter((adj: any) => {
      if (currentSiteId && adj.siteId !== currentSiteId) return false;
      if (currentTankId && adj.tankId !== currentTankId) return false;
      return !adj.isVoided && new Date(adj.documentDate) <= upToDate; // شامل هر دو نوع امانی و تملیکی
    });

    // تابع کمکی برای تبدیل عدد و جلوگیری از NaN
    const safeNumber = (value: any, defaultValue = 0): number => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    // فرمول کاربر: جمع(رسید انبارهای امانی + سند اضافه انبارهای امانی - حواله های امانی - افت امانی ها - سند کسر انبارهای امانی)
    
    // تفکیک رسیدها بر اساس نوع - بهبود منطق
    let consignmentReceipts = siteTankReceipts.filter(r => r.userType === 'consignment');
    
    // اگر هیچ رسید امانی پیدا نشد، جستجو با روش‌های جایگزین
    if (consignmentReceipts.length === 0) {
      consignmentReceipts = siteTankReceipts.filter(r => 
        (r.receiptType === 'consignment' || r.type === 'consignment' || r.category === 'consignment') &&
        new Date(r.receiptDate) <= selectedDate
      );
    }
    
    // اصلاح شده: جمع رسیدهای امانی با همان روش رسیدهای تملیکی
    console.log('🔍 بررسی تمام رسیدهای موجود:', {
      totalReceipts: allReceipts.length,
      sampleReceipt: allReceipts.length > 0 ? {
        userType: allReceipts[0].userType,
        finalAmount: allReceipts[0].finalAmount,
        gainedWeight: allReceipts[0].gainedWeight,
        isVoided: allReceipts[0].isVoided,
        siteId: allReceipts[0].siteId,
        tankId: allReceipts[0].tankId
      } : null
    });
    
    // دیباگ تفصیلی: بررسی دقیق رسیدهای امانی در allReceipts
    const totalConsignmentReceipts = allReceipts.filter(r => r.userType === 'consignment' && !r.isVoided && new Date(r.receiptDate) <= selectedDate).length;
    const totalOwnedReceipts = allReceipts.filter(r => r.userType === 'owned' && !r.isVoided && new Date(r.receiptDate) <= selectedDate).length;
    const consignmentReceiptsInData = allReceipts.filter(r => r.userType === 'consignment' && !r.isVoided && new Date(r.receiptDate) <= selectedDate);
    
    console.log('📊 Debug - تعداد رسیدهای دریافت شده از WarehouseReceiptManager:', {
      total: allReceipts.length,
      consignment: totalConsignmentReceipts,
      owned: totalOwnedReceipts,
      sampleConsignment: consignmentReceiptsInData[0],
      consignmentReceipts: consignmentReceiptsInData
    });
    
    // بهبود: مطمئن شویم که داده‌های امانی موجود است
    if (totalConsignmentReceipts === 0) {
      console.log('⚠️ هیچ رسید امانی در allReceipts یافت نشد!');
      console.log('🔍 بررسی محتوای allReceipts:', {
        totalCount: allReceipts.length,
        uniqueUserTypes: [...new Set(allReceipts.map(r => r.userType))],
        sampleReceipt: allReceipts[0],
        receiptsWithUserType: allReceipts.map(r => ({ id: r.id, userType: r.userType, receiptBasisAmount: r.receiptBasisAmount }))
      });
    } else {
      console.log('✅ رسیدهای امانی یافت شد:', {
        count: totalConsignmentReceipts,
        totalReceiptBasisAmount: consignmentReceiptsInData.reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0),
        samples: consignmentReceiptsInData.slice(0, 3).map(r => ({
          id: r.id,
          userType: r.userType,
          receiptBasisAmount: r.receiptBasisAmount,
          siteId: r.siteId,
          tankId: r.tankId
        }))
      });
    }
    
    // اصلاح شده: استفاده از همان منطق رسیدهای تملیکی برای امانی
    const consignmentReceiptsFiltered = allReceipts.filter((r: any) => 
      r && typeof r === 'object' &&
      r.userType === 'consignment' && 
      !r.isVoided &&
      (currentSiteId ? r.siteId === currentSiteId : true) &&
      (currentTankId ? r.tankId === currentTankId : true) &&
      new Date(r.receiptDate) <= upToDate
    );
    
    console.log('🔍 رسیدهای امانی فیلتر شده بر اساس سایت و مخزن:', {
      count: consignmentReceiptsFiltered.length,
      siteFilter: currentSiteId,
      tankFilter: currentTankId,
      sampleData: consignmentReceiptsFiltered.slice(0, 2).map(r => ({
        id: r.id,
        transactionNumber: r.transactionNumber || r.receiptNumber,
        finalAmount: r.finalAmount,
        receiptBasisAmount: r.receiptBasisAmount,
        gainedWeight: r.gainedWeight,
        shipUnloadingAmount: r.shipUnloadingAmount,
        userType: r.userType,
        isVoided: r.isVoided,
        siteId: r.siteId,
        tankId: r.tankId
      }))
    });
    
    const consignmentReceiptsAmount = consignmentReceiptsFiltered.reduce((sum, r) => {
      // بهبود: برای رسیدهای امانی، همان اولویت رسیدهای تملیکی را اعمال می‌کنیم
      // ابتدا مقدار اصلی رسید را پیدا می‌کنیم
      let baseAmount = 0;
      
      // اولویت 1: receiptBasisAmount (همانطور که در کنسول مشاهده شد)
      if (r.receiptBasisAmount && r.receiptBasisAmount > 0) {
        baseAmount = r.receiptBasisAmount;
        console.log('📊 [رسید امانی - receiptBasisAmount پیدا شد]:', {
          transactionNumber: r.transactionNumber || r.receiptNumber,
          receiptBasisAmount: r.receiptBasisAmount,
          selectedAmount: baseAmount,
          userType: r.userType
        });
      }
      // اولویت 2: finalAmount
      else if (r.finalAmount && r.finalAmount > 0) {
        baseAmount = r.finalAmount;
        console.log('📊 [رسید امانی - finalAmount استفاده شد]:', {
          transactionNumber: r.transactionNumber || r.receiptNumber,
          finalAmount: r.finalAmount,
          selectedAmount: baseAmount
        });
      }
      // اولویت 3: amount
      else if (r.amount && r.amount > 0) {
        baseAmount = r.amount;
        console.log('📊 [رسید امانی - amount استفاده شد]:', {
          transactionNumber: r.transactionNumber || r.receiptNumber,
          amount: r.amount,
          selectedAmount: baseAmount
        });
      }
      // fallback: با محاسبات جزئی
      else {
        baseAmount = (safeNumber(r.shipUnloadingAmount, 0) + 
                     safeNumber(r.tankShoreAmount, 0) + 
                     safeNumber(r.shipBillOfLadingAmount, 0) + 
                     safeNumber(r.gainedWeight, 0));
        console.log('📊 [رسید امانی - محاسبات جزئی]:', {
          transactionNumber: r.transactionNumber || r.receiptNumber,
          calculations: {
            shipUnloadingAmount: safeNumber(r.shipUnloadingAmount, 0),
            tankShoreAmount: safeNumber(r.tankShoreAmount, 0),
            shipBillOfLadingAmount: safeNumber(r.shipBillOfLadingAmount, 0),
            gainedWeight: safeNumber(r.gainedWeight, 0)
          },
          selectedAmount: baseAmount
        });
      }
      
      const finalSum = sum + baseAmount;
      console.log('📊 [رسید امانی - محاسبه نهایی]:', {
        previousSum: sum,
        currentAmount: baseAmount,
        newSum: finalSum,
        transactionNumber: r.transactionNumber || r.receiptNumber
      });
      
      return finalSum;
    }, 0);
    
    console.log('🧮 [رسید امانی - جمع کل]:', {
      totalConsignmentReceiptsAmount: consignmentReceiptsAmount,
      totalReceipts: consignmentReceiptsFiltered.length,
      expectedFromConsole: 1500000, // مقدار مورد انتظار از کنسول
      match: consignmentReceiptsAmount === 1500000
    });

    // 2. سند اضافه انبارهای امانی - استفاده از allAdjustments
    const consignmentAdditionDocuments = allAdjustments
      .filter(adj => 
        adj && typeof adj === 'object' &&
        adj.adjustmentType === 'addition' && 
        adj.productType === 'consignment' &&
        (currentSiteId ? adj.siteId === currentSiteId : true) &&
        (currentTankId ? adj.tankId === currentTankId : true)
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // 3. حواله های امانی
    const totalConsignmentDeliveries = consignmentDeliveries.reduce((sum, d) => sum + safeNumber(d.amount, 0), 0);

    // 🔍 لاگ برای تشخیص مشکل حواله‌های امانی
    console.log('🔍 دیباگ حواله‌های امانی در calculateConsignmentOwnedTanksInventory:', {
      'مقدار کل حواله‌های امانی': totalConsignmentDeliveries,
      'تعداد حواله‌های امانی فیلتر شده': consignmentDeliveries.length,
      'فیلتر سایت': currentSiteId || 'همه',
      'فیلتر مخزن': currentTankId || 'همه',
      'تاریخ انتخاب شده': upToDate.toISOString().split('T')[0]
    });

    // 4. کسر از امانی (جایگزین شده به جای consignmentWastageAmount) - اصلاح شده
    // مقدار amount ممکن است منفی باشد، پس از Math.abs استفاده می‌کنیم تا همیشه مثبت باشد
    const consignmentDeductionAmount = consignmentTransactions
      .filter((t: any) => t.transactionType === 'consignment')
      .reduce((sum, t) => {
        const amount = safeNumber(t.amount, 0);
        return sum + Math.abs(amount);
      }, 0);
    
    // 4.1 افزودن به تملیکی - استفاده از جدول wastageTransactions با transactionType === 'owned'
    const ownedGainedFiltered = wastageTransactionsForConsignment.filter((t: any) => 
      t && typeof t === 'object' &&
      t.transactionType === 'owned' && 
      !t.isVoided &&
      (currentSiteId ? t.siteId === currentSiteId : true) &&
      (currentTankId ? t.tankId === currentTankId : true) &&
      new Date(t.transactionDate) <= upToDate
    );
    
    console.log('🔍 تراکنش‌های wastage برای "افزودن به تملیکی":', {
      count: ownedGainedFiltered.length,
      sampleData: ownedGainedFiltered.slice(0, 3).map(t => ({
        amount: t.amount,
        transactionType: t.transactionType,
        siteId: t.siteId,
        tankId: t.tankId
      }))
    });
    
    // مقدار amount ممکن است منفی باشد، پس از Math.abs استفاده می‌کنیم تا همیشه مثبت باشد
    const ownedGainedAmount = ownedGainedFiltered.reduce((sum, t) => {
      const amount = safeNumber(t.amount, 0);
      const gained = Math.abs(amount);
      console.log(`  - تراکنش: amount = ${t.amount} → ${gained}`);
      return sum + gained;
    }, 0);
    
    console.log('📈 افزودن به تملیکی از wastageTransactions:', {
      transactionsCount: ownedGainedFiltered.length,
      totalGainedAmount: ownedGainedAmount
    });

    // 5. سند کسر انبارهای امانی - استفاده از allAdjustments
    const consignmentDeductionDocuments = allAdjustments
      .filter(adj => 
        adj && typeof adj === 'object' &&
        adj.adjustmentType === 'deduction' && 
        adj.productType === 'consignment' &&
        (currentSiteId ? adj.siteId === currentSiteId : true) &&
        (currentTankId ? adj.tankId === currentTankId : true)
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // محاسبه کالای مصرفی و تولیدی برای امانی و تملیکی - استفاده از upToDate (قبل از محاسبه موجودی)
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
    
    const ownedConsumedProducts = siteTankConversions
      .filter((c: any) => c.consumedProductType === 'owned')
      .reduce((sum: number, c: any) => sum + safeNumber(c.consumedQuantity, 0), 0);
    
    const ownedProducedProducts = siteTankConversions
      .filter((c: any) => c.producedProductType === 'owned')
      .reduce((sum: number, c: any) => sum + safeNumber(c.producedQuantity, 0), 0);

    // محاسبه بخش امانی: (رسید امانی + سند اضافه امانی + کالای تولیدی امانی) - (حواله امانی + کسر از امانی + سند کسر امانی + کالای مصرفی امانی)
    const consignmentInventory = (consignmentReceiptsAmount + consignmentAdditionDocuments + consignmentProducedProducts) - 
                                 (totalConsignmentDeliveries + consignmentDeductionAmount + consignmentDeductionDocuments + consignmentConsumedProducts);
    
    // محاسبه بخش تملیکی: (رسید تملیکی + سند اضافه تملیکی + افزودن به تملیکی + کالای تولیدی تملیکی) - (حواله تملیکی + سند کسر تملیکی + کالای مصرفی تملیکی)
    // فیلتر رسیدهای تملیکی
    const ownedReceipts = allReceipts.filter((r: any) => {
      if (currentSiteId && r.siteId !== currentSiteId) return false;
      if (currentTankId && r.tankId !== currentTankId) return false;
      return r.userType === 'owned' && !r.isVoided;
    });
    
    const ownedReceiptsAmount = ownedReceipts.reduce((sum, r) => {
      const amount = r.amount || r.receiptBasisAmount || 0;
      return sum + safeNumber(amount, 0);
    }, 0);
    
    // سند اضافه انبارهای تملیکی
    const ownedAdditionDocuments = allAdjustments
      .filter((adj: any) => 
        adj.adjustmentType === 'addition' && 
        adj.productType === 'owned' &&
        (!currentSiteId || adj.siteId === currentSiteId) &&
        (!currentTankId || adj.tankId === currentTankId)
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);
    
    // حواله های تملیکی - استفاده از upToDate به جای selectedDate
    const allOwnedDeliveries = ((storage.loadData('ownership-delivery-slips') || []) as any[]).filter((d: any) => 
      d && typeof d === 'object' && !d.isVoided && new Date(d.deliveryDate) <= upToDate
    );
    
    const ownedDeliveries = allOwnedDeliveries
      .filter((d: any) => {
        if (currentSiteId && d.siteId !== currentSiteId) return false;
        if (currentTankId && d.tankId !== currentTankId) return false;
        return !d.isVoided;
      })
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);
    
    // سند کسر انبارهای تملیکی
    const ownedDeductionDocuments = allAdjustments
      .filter(adj => 
        adj.adjustmentType === 'deduction' && 
        adj.productType === 'owned' &&
        (!currentSiteId || adj.siteId === currentSiteId) &&
        (!currentTankId || adj.tankId === currentTankId)
      )
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);
    
    const ownershipInventory = (ownedReceiptsAmount + ownedAdditionDocuments + ownedGainedAmount + ownedProducedProducts) - 
                               (ownedDeliveries + ownedDeductionDocuments + ownedConsumedProducts);
    
    // محاسبه نهایی: بخش امانی + بخش تملیکی
    const finalInventory = consignmentInventory + ownershipInventory;

    console.log('🧮 محاسبه موجودی مخازن امانی/تملیکی - نتایج:', {
      'بخش امانی': {
        'رسید انبارهای امانی': consignmentReceiptsAmount,
        'سند اضافه انبارهای امانی': consignmentAdditionDocuments,
        'حواله های امانی': totalConsignmentDeliveries,
        'کسر از امانی از محل افت': consignmentDeductionAmount,
        'سند کسر انبارهای امانی': consignmentDeductionDocuments,
        'افزودن به تملیکی از محل افت': ownedGainedAmount,
        'موجودی امانی': consignmentInventory
      },
      'بخش تملیکی': {
        'رسید انبارهای تملیکی': ownedReceiptsAmount,
        'سند اضافه انبارهای تملیکی': ownedAdditionDocuments,
        'حواله های تملیکی': ownedDeliveries,
        'سند کسر انبارهای تملیکی': ownedDeductionDocuments,
        'افزودن به تملیکی از محل افت': ownedGainedAmount,
        'موجودی تملیکی': ownershipInventory
      },
      'کالای مصرفی امانی': consignmentConsumedProducts,
      'کالای تولیدی امانی': consignmentProducedProducts,
      'کالای مصرفی تملیکی': ownedConsumedProducts,
      'کالای تولیدی تملیکی': ownedProducedProducts,
      'موجودی نهایی (امانی + تملیکی)': finalInventory,
      'سایت': currentSiteId,
      'مخزن': currentTankId
    });

    return {
      consignmentReceiptsAmount,
      consignmentAdditions: consignmentAdditionDocuments,
      consignmentAdditionDocuments,
      totalConsignmentDeliveries,
      consignmentDeliveries: totalConsignmentDeliveries,
      consignmentDeductionAmount,
      consignmentDeductionDocuments,
      consignmentConsumedProducts,
      consignmentProducedProducts,
      ownedReceiptsAmount,
      ownedAdditionDocuments,
      ownedDeliveries,
      ownedDeductionDocuments,
      ownedGainedAmount,
      ownedConsumedProducts,
      ownedProducedProducts,
      finalInventory
    };
  }, [propReceipts, propAdjustments, propAdditions, propDeductions, upToDate, selectedSiteForFilter, selectedTankForFilter]);

  // Helper function to calculate total tank capacity based on filters - مشابه InventoryAdjustmentManager
  const calculateTotalTankCapacity = useCallback((siteId?: string, tankId?: string) => {
    if (!effectiveBaseData?.tanks) {
      console.log('⚠️ calculateTotalTankCapacity - effectiveBaseData.tanks موجود نیست');
      return 0;
    }
    const tanks = effectiveBaseData.tanks || [];
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
  }, [effectiveBaseData?.tanks, selectedSiteForFilter, selectedTankForFilter]);

  const calculatePureConsignmentTanksInventory = useCallback((siteId?: string, tankId?: string) => {
  console.log('🧮 محاسبه موجودی خالص امانی - اصلاح شده:', { siteId, tankId });
  
  // اطمینان از دریافت داده‌های معتبر - استفاده از upToDate به جای selectedDate
  const allReceipts = ((storage.loadData('receipts') || []) as any[]).filter((r: any) => 
    r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= upToDate
  );
  
  const allAdjustments = ((propAdjustments || propAdditions?.concat(propDeductions || []) || storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
    adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= upToDate
  );
  
  // حواله های امانی - فیلتر با تاریخ upToDate
  const allConsignmentDeliveries = ((storage.loadData('consignment-delivery-slips') || []) as any[]).filter((d: any) => {
    if (!d || typeof d !== 'object' || d.isVoided) return false;
    const dateValue = d.deliveryDate || d.slipDate;
    if (!dateValue) return true;
    const deliveryDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(deliveryDate.getTime())) return true;
    return deliveryDate <= upToDate;
  }) as any[];
  
  const allWastageTransactions = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
    t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= upToDate
  );

  // فیلتر کردن داده‌ها بر اساس سایت و مخزن
  const currentSiteId = siteId || selectedSiteForFilter;
  const currentTankId = tankId || selectedTankForFilter;
  
  // فیلتر رسیدهای امانی
  const consignmentReceipts = allReceipts.filter((r: any) => {
    if (currentSiteId && r.siteId !== currentSiteId) return false;
    if (currentTankId && r.tankId !== currentTankId) return false;
    return r.userType === 'consignment' && !r.isVoided;
  });

  // ✅ اصلاح شده: محاسبه صحیح ownedGainedAmount با فیلتر دقیق
  const ownedGainedAmount = allWastageTransactions
    .filter((t: any) => {
      if (!t || typeof t !== 'object' || t.isVoided) return false;
      if (t.transactionType !== 'owned') return false;
      if (currentSiteId && t.siteId !== currentSiteId) return false;
      if (currentTankId && t.tankId !== currentTankId) return false;
      return new Date(t.transactionDate) <= upToDate;
    })
    .reduce((sum, t) => sum + Math.abs(safeNumber(t.amount, 0)), 0);

  // محاسبه مقادیر
  const consignmentReceiptsAmount = consignmentReceipts.reduce((sum: number, r: any) => {
    const amount = safeNumber(r.receiptBasisAmount) || safeNumber(r.finalAmount) || safeNumber(r.amount) || 0;
    return sum + amount;
  }, 0);

  const consignmentAdditionDocuments = allAdjustments
    .filter((adj: any) => 
      adj.adjustmentType === 'addition' && 
      adj.productType === 'consignment' &&
      (!currentSiteId || adj.siteId === currentSiteId) &&
      (!currentTankId || adj.tankId === currentTankId)
    )
    .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity), 0);

  const consignmentDeliveries = allConsignmentDeliveries
    .filter((d: any) => {
      if (!d || typeof d !== 'object' || d.isVoided) return false;
      
      return (!currentSiteId || d.siteId === currentSiteId) &&
             (!currentTankId || d.tankId === currentTankId);
    })
    .reduce((sum, d) => sum + safeNumber(d.amount), 0);

  const consignmentDeductionAmount = allWastageTransactions
    .filter((t: any) => {
      if (!t || typeof t !== 'object' || t.isVoided) return false;
      if (t.transactionType !== 'consignment') return false;
      if (currentSiteId && t.siteId !== currentSiteId) return false;
      if (currentTankId && t.tankId !== currentTankId) return false;
      return new Date(t.transactionDate) <= upToDate;
    })
    .reduce((sum, t) => sum + Math.abs(safeNumber(t.amount, 0)), 0);

  const consignmentDeductionDocuments = allAdjustments
    .filter(adj => 
      adj.adjustmentType === 'deduction' && 
      adj.productType === 'consignment' &&
      (!currentSiteId || adj.siteId === currentSiteId) &&
      (!currentTankId || adj.tankId === currentTankId)
    )
    .reduce((sum, adj) => sum + safeNumber(adj.quantity), 0);

  // محاسبه کالای مصرفی و تولیدی امانی - استفاده از upToDate
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

  // ✅ محاسبه نهایی با در نظر گیری کالای مصرفی و تولیدی
  const finalConsignmentInventory = (consignmentReceiptsAmount + consignmentAdditionDocuments + consignmentProducedProducts) - 
                                    (consignmentDeliveries + consignmentDeductionAmount + consignmentDeductionDocuments + consignmentConsumedProducts);

  console.log('🧮 محاسبه موجودی خالص امانی - نتایج اصلاح شده:', {
    'رسید انبارهای امانی': consignmentReceiptsAmount,
    'سند اضافه انبارهای امانی': consignmentAdditionDocuments,
    'حواله‌های امانی': consignmentDeliveries,
    'کسر از امانی از محل افت': consignmentDeductionAmount,
    'سند کسر انبارهای امانی': consignmentDeductionDocuments,
    'کالای مصرفی امانی': consignmentConsumedProducts,
    'کالای تولیدی امانی': consignmentProducedProducts,
    'افزودن به تملیکی از محل افت': ownedGainedAmount,
    'موجودی نهایی امانی': finalConsignmentInventory
  });

  return {
    consignmentReceiptsAmount,
    consignmentAdditions: consignmentAdditionDocuments,
    consignmentAdditionDocuments,
    consignmentDeliveries,
    totalConsignmentDeliveries: consignmentDeliveries,
    consignmentDeductionAmount,
    consignmentDeductionDocuments,
    consignmentConsumedProducts,
    consignmentProducedProducts,
    ownedGainedAmount,
    finalInventory: finalConsignmentInventory,
    finalConsignmentInventory
  };
}, [propAdjustments, propAdditions, propDeductions, upToDate, selectedSiteForFilter, selectedTankForFilter]);

  // محاسبه موجودی مخازن تملیکی (فقط تراکنش‌های تملیکی)
  const calculatePureOwnershipTanksInventory = useCallback((siteId?: string, tankId?: string) => {
    console.log('🧮 محاسبه موجودی مخازن تملیکی (فقط تملیکی):', { siteId, tankId });
    
    // اطمینان از دریافت داده‌های معتبر - همیشه مستقیماً از storage بخوانیم تا آخرین داده‌ها را داشته باشیم
    // استفاده از upToDate به جای selectedDate برای هماهنگی با صفحه کسر/اضافه انبار
    const allReceipts = ((storage.loadData('receipts') || []) as any[]).filter((r: any) => 
      r && typeof r === 'object' && !r.isVoided && new Date(r.receiptDate) <= upToDate
    );
    const allAdjustments = ((propAdjustments || propAdditions?.concat(propDeductions || []) || storage.loadData('inventoryAdjustments') || []) as any[]).filter((adj: any) => 
      adj && typeof adj === 'object' && !adj.isVoided && new Date(adj.documentDate) <= upToDate
    );
    const allDeliveries = ((storage.loadData('ownership-delivery-slips') || []) as any[]).filter((d: any) => 
      d && typeof d === 'object' && !d.isVoided && new Date(d.deliveryDate) <= upToDate
    );
    // بارگذاری تراکنش‌های wastage برای دسترسی به "افزودن به تملیکی"
    const wastageTransactionsForInventory = ((storage.loadData('wastageTransactions') || []) as any[]).filter((t: any) => 
      t && typeof t === 'object' && !t.isVoided && new Date(t.transactionDate) <= upToDate
    ) as any[];

    // فیلتر کردن داده‌ها بر اساس سایت و مخزن انتخاب شده
    const currentSiteId = siteId || selectedSiteForFilter;
    const currentTankId = tankId || selectedTankForFilter;
    
    const siteTankReceipts = allReceipts.filter((r: any) => {
      if (currentSiteId && r.siteId !== currentSiteId) return false;
      if (currentTankId && r.tankId !== currentTankId) return false;
      return r.userType === 'owned' && !r.isVoided && new Date(r.receiptDate) <= selectedDate;
    });
    
    const siteTankAdjustments = allAdjustments.filter((adj: any) => {
      if (currentSiteId && adj.siteId !== currentSiteId) return false;
      if (currentTankId && adj.tankId !== currentTankId) return false;
      return adj.productType === 'owned' && !adj.isVoided && new Date(adj.documentDate) <= selectedDate;
    });
    
    const siteTankDeliveries = allDeliveries.filter((d: any) => {
      if (currentSiteId && d.siteId !== currentSiteId) return false;
      if (currentTankId && d.tankId !== currentTankId) return false;
      return !d.isVoided && new Date(d.deliveryDate) <= selectedDate;
    });

    // تابع کمکی برای تبدیل عدد و جلوگیری از NaN
    const safeNumber = (value: any, defaultValue = 0): number => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    // فرمول موجودی مخازن تملیکی: رسید انبارهای تملیکی + سند اضافه انبارهای تملیکی + افزودن به تملیکی - حواله های تملیکی - سند کسر انبارهای تملیکی
    
    // 1. رسید انبارهای تملیکی
    const ownedReceiptsAmount = siteTankReceipts.reduce((sum, r) => {
      const amount = r.amount || r.receiptBasisAmount || 0;
      return sum + safeNumber(amount, 0);
    }, 0);

    // 2. سند اضافه انبارهای تملیکی
    const ownedAdditionDocuments = siteTankAdjustments
      .filter(adj => adj.adjustmentType === 'addition')
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // 3. حواله های تملیکی
    const ownedDeliveries = siteTankDeliveries
      .filter(d => !d.isVoided && new Date(d.deliveryDate) <= selectedDate)
      .reduce((sum: number, d: any) => sum + safeNumber(d.amount, 0), 0);

    // 4. افزودن به تملیکی - استفاده از جدول wastageTransactions با transactionType === 'owned'
    const ownedGainedFiltered = wastageTransactionsForInventory.filter((t: any) => 
      t && typeof t === 'object' &&
      t.transactionType === 'owned' && 
      !t.isVoided &&
      (currentSiteId ? t.siteId === currentSiteId : true) &&
      (currentTankId ? t.tankId === currentTankId : true) &&
      new Date(t.transactionDate) <= upToDate
    );
    
    console.log('🔍 [calculatePureOwnershipTanksInventory] تراکنش‌های wastage برای "افزودن به تملیکی":', {
      count: ownedGainedFiltered.length,
      amounts: ownedGainedFiltered.map(t => t.amount)
    });
    
    // مقدار amount ممکن است منفی باشد، پس از Math.abs استفاده می‌کنیم تا همیشه مثبت باشد
    const ownedGainedAmount = ownedGainedFiltered.reduce((sum, t) => {
      const amount = safeNumber(t.amount, 0);
      return sum + Math.abs(amount);
    }, 0);

    // 5. سند کسر انبارهای تملیکی
    const ownedDeductionDocuments = siteTankAdjustments
      .filter(adj => adj.adjustmentType === 'deduction' && !adj.isVoided && new Date(adj.documentDate) <= upToDate)
      .reduce((sum: number, adj: any) => sum + safeNumber(adj.quantity, 0), 0);

    // 6. تبدیل‌های کالا: کالای مصرفی (کسر) و کالای تولیدی (اضافه) - استفاده از upToDate
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

    // محاسبه نهایی
    const finalInventory = (ownedReceiptsAmount + ownedAdditionDocuments + ownedGainedAmount + ownedProducedProducts) - 
                          (ownedDeliveries + ownedDeductionDocuments + ownedConsumedProducts);

    console.log('🧮 محاسبه موجودی مخازن تملیکی (فقط تملیکی) - نتایج:', {
      'رسید انبارهای تملیکی': ownedReceiptsAmount,
      'سند اضافه انبارهای تملیکی': ownedAdditionDocuments,
      'حواله های تملیکی': ownedDeliveries,
      'افزودن به تملیکی از محل افت': ownedGainedAmount,
      'سند کسر انبارهای تملیکی': ownedDeductionDocuments,
      'کالای مصرفی تملیکی': ownedConsumedProducts,
      'کالای تولیدی تملیکی': ownedProducedProducts,
      'موجودی نهایی': finalInventory,
      'سایت': currentSiteId,
      'مخزن': currentTankId
    });

    return {
      ownedReceiptsAmount,
      ownedAdditionDocuments,
      ownedDeliveries,
      ownedGainedAmount,
      ownedDeductionDocuments,
      ownedConsumedProducts,
      ownedProducedProducts,
      finalInventory
    };
  }, [propReceipts, propAdjustments, propAdditions, propDeductions, upToDate, selectedSiteForFilter, selectedTankForFilter]);

  // محاسبه مانده موجودی برای رسید انتخاب شده
  const remainingInventory = useMemo(() => {
    return selectedReceipt ? calculateRemainingInventory(selectedReceipt) : 0;
  }, [selectedReceipt, calculateRemainingInventory]);

  // حداکثر مقدار قابل حواله (مانده موجودی)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _maxDeliverableAmount = useMemo(() => {
    return remainingInventory;
  }, [remainingInventory]);

  // اگر props خالی باشند، از storage بارگذاری کن
  const adjustmentsData = useMemo(() => {
    return propAdjustments || inventoryAdjustmentsState || ((storage.loadData('inventoryAdjustments') || []) as any[]);
  }, [propAdjustments, inventoryAdjustmentsState]);

  // const additionDocuments = useMemo(() => {
  //   return propAdditions || [];
  // }, [propAdditions]);

  // const deductionDocuments = useMemo(() => {
  //   return propDeductions || [];
  // }, [propDeductions]);

  // فیلتر کردن رسیدها
  const filteredReceipts = useMemo(() => {
    return availableReceipts.filter(receipt => {
      // فیلتر بر اساس سایت (فیلتر اصلی)
      if (selectedSite && receipt.siteId !== selectedSite) return false;
      
      // فیلتر بر اساس مخزن (فیلتر اصلی)
      if (selectedTank && receipt.tankId !== selectedTank) return false;
      
      // فیلتر بر اساس سایت (فیلتر جدید)
      if (selectedSiteForFilter && receipt.siteId !== selectedSiteForFilter) return false;
      
      // فیلتر بر اساس مخزن (فیلتر جدید)
      if (selectedTankForFilter && receipt.tankId !== selectedTankForFilter) return false;
      
      // فیلتر بر اساس متن جستجو
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          receipt.productName.toLowerCase().includes(searchLower) ||
          receipt.receiptNumber.toLowerCase().includes(searchLower) ||
          receipt.siteName.toLowerCase().includes(searchLower) ||
          receipt.tankName.toLowerCase().includes(searchLower) ||
          (receipt.shipName && receipt.shipName.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [availableReceipts, selectedSite, selectedTank, selectedSiteForFilter, selectedTankForFilter, searchTerm]);

  // ترکیب رسیدها و اسناد اضافه/کسر انبار برای نمایش
  const combinedData = useMemo(() => {
    const combined: any[] = [];
    
    // اضافه کردن رسیدهای تملیکی
    filteredReceipts.forEach(receipt => {
      combined.push({
        id: receipt.id,
        type: 'receipt',
        typeLabel: 'رسید انبار',
        receiptNumber: receipt.receiptNumber,
        productName: receipt.productName,
        siteName: receipt.siteName,
        siteId: receipt.siteId,
        tankName: receipt.tankName,
        tankId: receipt.tankId,
        amount: safeNumber(receipt.amount, safeNumber(receipt.receiptBasisAmount, 0)),
        unit: receipt.unit || 'kg',
        date: receipt.receiptDate,
        productType: receipt.userType,
        productTypeLabel: 'تملیکی',
        colorClass: 'border-green-500 bg-green-50',
        // فیلدهای اضافی - اطمینان از عدم undefined
        shipName: receipt.shipName || '',
        cotageNumber: receipt.cotageNumber || '',
        indexNumber: receipt.indexNumber || '',
        driverName: receipt.driverName || '',
        contractNumber: receipt.contractNumber || '',
        shipBillOfLadingAmount: receipt.shipBillOfLadingAmount || 0,
        shipUnloadingAmount: receipt.shipUnloadingAmount || 0,
        tankShoreAmount: receipt.tankShoreAmount || 0,
        weightGross: receipt.weightGross || 0,
        wastageAmount: receipt.wastageAmount || 0,

        // فیلدهای مهم - اصلاح شده
        productId: receipt.productId || receipt.id // از receipt.productId استفاده شود، اگر وجود نداشت از id استفاده کن
      });
    });
    
    // اضافه کردن اسناد اضافه انبار تملیکی
    adjustmentsData
      .filter((adj: any) => adj.productType === 'owned' && !adj.isVoided)
      .forEach(adjustment => {
        combined.push({
          id: adjustment.id,
          type: adjustment.adjustmentType === 'addition' ? 'addition' : 'deduction',
          typeLabel: adjustment.adjustmentType === 'addition' ? 'سند اضافه انبار' : 'سند کسر انبار',
          receiptNumber: adjustment.documentNumber && adjustment.documentNumber.trim() ? adjustment.documentNumber : `سند-${adjustment.id}`,
          productName: adjustment.productName,
          siteName: adjustment.siteName,
          siteId: adjustment.siteId,
          tankName: adjustment.tankName,
          tankId: adjustment.tankId,
          amount: typeof adjustment.quantity === 'number' && !isNaN(adjustment.quantity) ? adjustment.quantity : 0,
          unit: 'عدد',
          date: adjustment.documentDate,
          productType: 'owned',
          productTypeLabel: 'تملیکی',
          colorClass: adjustment.adjustmentType === 'addition' 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-red-500 bg-red-50',
          // فیلدهای اضافی - اطمینان از عدم undefined
          shipName: '', 
          cotageNumber: '', 
          indexNumber: adjustment.contractNumber || '',
          driverName: adjustment.driverName || '',
          contractNumber: adjustment.contractNumber || '',
          shipBillOfLadingAmount: adjustment.shipBillOfLadingAmount || 0,
          shipUnloadingAmount: adjustment.shipUnloadingAmount || 0,
          tankShoreAmount: adjustment.tankShoreAmount || 0,
          weightGross: adjustment.weightGross || 0,
          wastageAmount: 0,

        });
      });
    
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredReceipts, adjustmentsData]);

  // فیلتر کردن داده‌های ترکیبی
  const filteredCombinedData = useMemo(() => {
    return combinedData.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSite = selectedSite === '' || item.siteId === selectedSite;
      const matchesTank = selectedTank === '' || item.tankId === selectedTank;
      
      return matchesSearch && matchesSite && matchesTank;
    });
  }, [combinedData, searchTerm, selectedSite, selectedTank]);

  // گروه‌بندی بر اساس شماره سند
  const groupedData = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredCombinedData.forEach(item => {
      if (!groups[item.receiptNumber]) {
        groups[item.receiptNumber] = [];
      }
      groups[item.receiptNumber].push(item);
    });
    return groups;
  }, [filteredCombinedData]);

  // لیست سایت‌ها و مخازن منحصر به فرد
  const uniqueSites = useMemo(() => {
    const sites = new Map<string, string>();
    (availableReceipts || []).forEach((receipt: any) => {
      if (receipt && receipt.siteId && receipt.siteName && !sites.has(receipt.siteId)) {
        sites.set(receipt.siteId, receipt.siteName);
      }
    });
    return Array.from(sites.entries());
  }, [availableReceipts]);

  const uniqueTanks = useMemo(() => {
    const tanks = new Map<string, string>();
    (availableReceipts || []).forEach((receipt: any) => {
      if (receipt && receipt.tankId && receipt.tankName && !tanks.has(receipt.tankId)) {
        tanks.set(receipt.tankId, receipt.tankName);
      }
    });
    return Array.from(tanks.entries());
  }, [availableReceipts]);

  // تابع تبدیل تاریخ میلادی به شمسی (برای شماره تراکنش)
  const toPersianDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // const div = (a: number, b: number) => Math.floor(a / b);
    // const mod = (a: number, b: number) => a - b * Math.floor(a / b);
    
    const gy = year;
    const gm = month;
    const gd = day;
    
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    
    const gy2 = gd > 31 ? gy : (gm > 2 ? gy + 1 : gy);
    const jy = gy2 - 621;
    
    const j_day_no = gd + g_d_m[gm - 1] + (gy2 > gy ? 1 : 0);
    
    const j_month_no = j_day_no;
    let j_month = 1;
    
    for (let i = 0; i < 12; i++) {
      if (j_month_no > (i === 11 ? 30 : j_days_in_month[i])) {
        j_month++;
      }
    }
    
    const j_day = j_day_no;
    
    return jy.toString().padStart(4, '0') + 
           j_month.toString().padStart(2, '0') + 
           j_day.toString().padStart(2, '0');
  }, []);

  // تولید شماره تراکنش جدید با فرمت T-YYYYMMDD-XXXXXX
  const generateTransactionNumber = useCallback(() => {
    const deliveries = (storage.loadData('ownership-delivery-slips') || []) as any[];
    const persianDate = toPersianDate(new Date());
    
      const existingTransactionNumbers = (deliveries as any[])
      .map((s: any) => s.transactionNumber)
      .filter((num: string) => num && num.startsWith('OWRE') && num.includes(`-${persianDate}-`))
      .map((num: string) => {
        const parts = num.split('-');
        return parseInt(parts[2] || '0', 10);
      })
      .filter((n: number) => !isNaN(n));
    
    let nextNumber = 1;
    if (existingTransactionNumbers.length > 0) {
      nextNumber = Math.max(...existingTransactionNumbers) + 1;
    }
    
    let newTransactionNumber: string;
    let attempts = 0;
    do {
      newTransactionNumber = `OWRE-${persianDate}-${nextNumber.toString().padStart(6, '0')}`;
      attempts++;
      nextNumber++;
    } while ((deliveries as any[]).some((s: any) => s.transactionNumber === newTransactionNumber) && attempts < 100);
    
    return newTransactionNumber;
  }, [toPersianDate]);

  // اعتبارسنجی فرم - بهبود شده با کنترل جامع تاریخ
  const validateForm = (data: Partial<OwnershipDelivery>): boolean => {
    const newErrors: Record<string, string> = {};

    // اعتبارسنجی فقط فیلدهای اساسی برای حواله تملیکی (بدون نیاز به مجوز یا شماره قرارداد)
    if (!data.receiptNumber) newErrors.receiptNumber = 'شماره رسید الزامی است';
    if (!data.productName) newErrors.productName = 'نام محصول الزامی است';
    
    // کنترل جامع تاریخ - الزامی و معتبر بودن
    if (!data.deliveryDate) {
      newErrors.deliveryDate = 'تاریخ تحویل الزامی است';
    } else {
      // بررسی معتبر بودن تاریخ
      const dateValue = data.deliveryDate instanceof Date ? data.deliveryDate : new Date(data.deliveryDate);
      if (isNaN(dateValue.getTime())) {
        newErrors.deliveryDate = 'تاریخ وارد شده نامعتبر است';
      } else {
        // بررسی اینکه تاریخ در آینده نباشد (اختیاری - بر اساس نیاز کسب و کار)
        const today = new Date();
        const todayWithoutTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const inputDateWithoutTime = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
        
        if (inputDateWithoutTime > todayWithoutTime) {
          newErrors.deliveryDate = 'تاریخ تحویل نمی‌تواند در آینده باشد';
        }
      }
    }
    
    // کنترل مقدار - اگر بیشتر از مانده موجودی باشد، خودکار کاهش می‌یابد
    if (data.amount !== undefined) {
      if (data.amount <= 0) {
        newErrors.amount = 'مقدار حواله باید بزرگتر از صفر باشد';
      }
      // نیازی به خطا نیست، چون خودکار کنترل می‌شود
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // کنترل خودکار مقدار حواله - اگر بیشتر از مانده موجودی باشد، خودکار کاهش می‌یابد
  const handleDeliveryAmountChange = useCallback((value: number) => {
    if (!selectedReceipt) return;
    
    const remainingInventory = calculateRemainingInventory(selectedReceipt);
    
    // اگر مقدار بیشتر از مانده موجودی باشد، به طور خودکار کاهش می‌یابد
    const finalAmount = Math.min(value, remainingInventory);
    
    setDeliveryAmount(finalAmount);
    
    // پاک کردن خطای مقدار
    setErrors(prev => ({ ...prev, amount: '' }));
    
    // اگر مقدار اصلی بیشتر از مانده بود، پیام اطلاعاتی ثبت می‌شود
    if (value > remainingInventory) {
      // پیام اطلاعاتی در UI نمایش داده می‌شود، نیازی به error نیست
    }
  }, [selectedReceipt, calculateRemainingInventory]);

  // ذخیره حواله تملیکی جدید
  const handleSaveDelivery = useCallback(async (deliveryData: Partial<OwnershipDelivery>) => {
    console.log('💾 Starting to save delivery:', deliveryData);
    
    if (!validateForm(deliveryData)) {
      console.log('❌ Form validation failed');
      return;
    }

    setIsSaving(true);
    try {
      const newDelivery: OwnershipDelivery = {
        id: Date.now().toString(),
        deliveryDate: deliveryData.deliveryDate || new Date(),
        receiptNumber: deliveryData.receiptNumber || '',
        productName: deliveryData.productName || '',
        productId: deliveryData.productId || selectedReceipt?.productId || '',
        siteName: deliveryData.siteName || '',
        siteId: deliveryData.siteId || selectedReceipt?.siteId || '',
        tankName: deliveryData.tankName || '',
        tankId: deliveryData.tankId || selectedReceipt?.tankId || '',
        amount: deliveryData.amount || 0,
        unit: deliveryData.unit || selectedReceipt?.unit || '',
        wastageAmount: deliveryData.wastageAmount || 0,
        status: 'draft', // همیشه پیش نویس
        notes: deliveryData.notes || '',
        transactionNumber: generateTransactionNumber(),
        isVoided: false,
        // فیلدهای اضافی از رسید
        shipName: selectedReceipt?.shipName || '',
        cotageNumber: selectedReceipt?.cotageNumber || '',
        indexNumber: selectedReceipt?.indexNumber || '',
        driverName: selectedReceipt?.driverName || '',
        shipBillOfLadingAmount: selectedReceipt?.shipBillOfLadingAmount || 0,
        shipUnloadingAmount: selectedReceipt?.shipUnloadingAmount || 0,
        tankShoreAmount: selectedReceipt?.tankShoreAmount || 0,
        weightGross: selectedReceipt?.weightGross || 0,
        contractNumber: selectedReceipt?.contractNumber || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        // اطلاعات تکمیلی حواله
        additionalInfo: (showDeliveryExtraInfo || enforceDeliveryExtraInfo.owned) ? {
          ...deliveryExtraInfo,
          weight: deliveryExtraInfo.weight || deliveryData.amount || 0,
          billDate: deliveryExtraInfo.billDate || deliveryData.deliveryDate,
          destinationAddress: deliveryExtraInfo.destinationAddress || 
            (deliveryData.siteName || '')
        } : undefined
      };

      console.log('📝 Prepared new delivery:', newDelivery);

        // ذخیره در localStorage
        const existingDeliveries = (storage.loadData('ownership-delivery-slips') || []) as OwnershipDelivery[];
          const updatedDeliveries = [...existingDeliveries, newDelivery];
          storage.saveData('ownership-delivery-slips', updatedDeliveries);

                  // ثبت در لاگ سیستم
                  logCreateAction('حواله تملیکی', `شماره ${newDelivery.transactionNumber}`, {
                    transactionNumber: newDelivery.transactionNumber,
                    productName: newDelivery.productName,
                    amount: newDelivery.amount,
                    unit: newDelivery.unit,
                    site: newDelivery.siteName,
                    tank: newDelivery.tankName,
                    receiptNumber: newDelivery.receiptNumber,
                    shipName: newDelivery.shipName || '---',
                    driverName: newDelivery.driverName || '---',
                    cotageNumber: newDelivery.cotageNumber || '---',
                    indexNumber: newDelivery.indexNumber || '---',
                    contractNumber: newDelivery.contractNumber || '---',
                    shipBillOfLadingAmount: newDelivery.shipBillOfLadingAmount,
                    shipUnloadingAmount: newDelivery.shipUnloadingAmount,
                    tankShoreAmount: newDelivery.tankShoreAmount,
                    weightGross: newDelivery.weightGross,
                    status: newDelivery.status,
                    destinationAddress: newDelivery.additionalInfo?.destinationAddress || '---',
                    fullSummary: `حواله ${formatPersianNumber(newDelivery.amount)} ${newDelivery.unit} ${newDelivery.productName} (رسید: ${newDelivery.receiptNumber}) توسط راننده ${newDelivery.driverName || 'نامشخص'} با کشتی ${newDelivery.shipName || 'نامشخص'} در سایت ${newDelivery.siteName}`
                  });

          // به‌روزرسانی state
      setOwnershipDeliveries(prev => [...prev, newDelivery]);
      setIsAddingNew(false);
      setEditingDelivery(null);
      setSelectedReceipt(null);
      setDeliveryAmount(0);
      setDeliveryDate(new Date());
      setDeliveryNotes('');
      setErrors({});
      
      // Callback اگر موجود باشد
      if (onSave) {
        onSave(newDelivery);
      }

      console.log('🎉 Delivery saved successfully:', newDelivery.transactionNumber);
    } catch (error) {
      console.error('❌ خطا در ذخیره حواله:', error);
      alert(`خطا در ذخیره حواله: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`);
    } finally {
      setIsSaving(false);
    }
  }, [generateTransactionNumber, selectedReceipt, onSave, calculateRemainingInventory, validateForm]);

  // شروع ویرایش حواله - انتقال به فرم ویرایش
  


  
  // ذخیره تغییرات ویرایش (فقط وقتی فرم کاملاً پر شده و کاربر واقعاً روی دکمه ذخیره کلیک کند)
  const saveDeliveryEdit = useCallback(async (updatedData: Partial<OwnershipDelivery>) => {
    console.log('💾 شروع ذخیره ویرایش حواله:', updatedData);
    
    // بررسی اینکه آیا واقعاً در حال ویرایش هستیم
    if (!editingDelivery) {
      console.warn('⚠️ editingDelivery خالی است، امکان ویرایش وجود ندارد');
      alert('هیچ حواله‌ای برای ویرایش انتخاب نشده است');
      return;
    }

    // بررسی اینکه آیا داده‌های ضروری موجود هستند
    if (!updatedData.amount || updatedData.amount <= 0) {
      console.warn('⚠️ مقدار حواله نامعتبر است');
      alert('مقدار حواله باید بزرگتر از صفر باشد');
      return;
    }

    if (!updatedData.deliveryDate) {
      console.warn('⚠️ تاریخ تحویل الزامی است');
      alert('تاریخ تحویل الزامی است');
      return;
    }

    // بررسی اینکه آیا داده‌های ضروری از selectedReceipt موجود هستند
    if (!selectedReceipt) {
      console.warn('⚠️ رسید انتخاب شده خالی است');
      alert('هیچ رسیدی برای ویرایش انتخاب نشده است');
      return;
    }

    setIsLoading(true);
    try {
      console.log('✅ تمام داده‌ها معتبر هستند، شروع ذخیره...');

      // ویرایش همه فیلدها بدون ایجاد رکورد جدید
      const updatedDelivery: OwnershipDelivery = {
        ...editingDelivery,
        ...updatedData,
        amount: deliveryAmount, // استفاده از مقدار فعلی فرم
        deliveryDate: deliveryDate, // استفاده از تاریخ فعلی فرم
        notes: deliveryNotes, // استفاده از توضیحات فعلی فرم
        status: 'draft' as const, // تغییر وضعیت به پیش نویس هنگام ویرایش
        updatedAt: new Date(),
        // اطلاعات تکمیلی حواله
        additionalInfo: (showDeliveryExtraInfo || enforceDeliveryExtraInfo.owned) ? {
          ...deliveryExtraInfo,
          weight: deliveryExtraInfo.weight || deliveryAmount,
          billDate: deliveryExtraInfo.billDate || deliveryDate,
          destinationAddress: deliveryExtraInfo.destinationAddress || 
            (updatedData.siteName || '')
        } : undefined
      } as any;

      console.log('📝 حواله ویرایش شده:', updatedDelivery);

      // به‌روزرسانی در localStorage
      const existingDeliveries = (storage.loadData('ownership-delivery-slips') || []) as OwnershipDelivery[];
      const updatedDeliveries = existingDeliveries.map((d: OwnershipDelivery) => 
        d.id === editingDelivery.id ? updatedDelivery : d
      );
      
          storage.saveData('ownership-delivery-slips', updatedDeliveries);
          setOwnershipDeliveries(updatedDeliveries);
          
                  // ثبت در لاگ سیستم
                  logSaveAction('حواله تملیکی', `شماره ${updatedDelivery.transactionNumber}`, {
                    transactionNumber: updatedDelivery.transactionNumber,
                    productName: updatedDelivery.productName,
                    amount: updatedDelivery.amount,
                    unit: updatedDelivery.unit,
                    site: updatedDelivery.siteName,
                    tank: updatedDelivery.tankName,
                    receiptNumber: updatedDelivery.receiptNumber,
                    shipName: updatedDelivery.shipName || '---',
                    driverName: updatedDelivery.driverName || '---',
                    cotageNumber: updatedDelivery.cotageNumber || '---',
                    indexNumber: updatedDelivery.indexNumber || '---',
                    contractNumber: updatedDelivery.contractNumber || '---',
                    shipBillOfLadingAmount: updatedDelivery.shipBillOfLadingAmount,
                    shipUnloadingAmount: updatedDelivery.shipUnloadingAmount,
                    tankShoreAmount: updatedDelivery.tankShoreAmount,
                    weightGross: updatedDelivery.weightGross,
                    status: updatedDelivery.status,
                    destinationAddress: updatedDelivery.additionalInfo?.destinationAddress || '---',
                    fullSummary: `ویرایش حواله ${formatPersianNumber(updatedDelivery.amount)} ${updatedDelivery.unit} ${updatedDelivery.productName} (رسید: ${updatedDelivery.receiptNumber}) توسط راننده ${updatedDelivery.driverName || 'نامشخص'} با کشتی ${updatedDelivery.shipName || 'نامشخص'} در سایت ${updatedDelivery.siteName}`
                  });

          // ریست کردن state ها
      setEditingDelivery(null);
      setIsAddingNew(false);
      setSelectedReceipt(null);
      setDeliveryAmount(0);
      setDeliveryDate(new Date());
      setDeliveryNotes('');
      setErrors({});

      console.log('🎉 ویرایش با موفقیت انجام شد');
      alert('حواله با موفقیت ویرایش شد');
    } catch (error) {
      console.error('❌ خطا در ویرایش حواله:', error);
      alert(`خطا در ویرایش حواله: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`);
    } finally {
      setIsLoading(false);
    }
  }, [editingDelivery, selectedReceipt, deliveryAmount, deliveryDate, deliveryNotes]);

  // حذف حواله - نمایش dialog تأیید
  const handleDeleteDelivery = useCallback((delivery: OwnershipDelivery) => {
    console.log('🗑️ درخواست حذف حواله:', delivery.transactionNumber);
    setDeletingDelivery(delivery); // نمایش dialog تأیید
  }, []);

  // حذف واقعی حواله پس از تأیید
  const handleActualDeleteDelivery = useCallback(async (delivery: OwnershipDelivery) => {
    console.log('🗑️ حذف واقعی حواله:', delivery.transactionNumber);
    setIsLoading(true);
    
    try {
      // حذف از storage
      const existingDeliveries = (storage.loadData('ownership-delivery-slips') || []) as OwnershipDelivery[];
      const updatedDeliveries = existingDeliveries.filter((d: OwnershipDelivery) => d.id !== delivery.id);
      
      storage.saveData('ownership-delivery-slips', updatedDeliveries);
      setOwnershipDeliveries(updatedDeliveries);
      
      console.log('✅ حواله با موفقیت حذف شد');
      alert('حواله با موفقیت حذف شد');
      
      // بستن modal
      setDeletingDelivery(null);
      
    } catch (error) {
      console.error('❌ خطا در حذف حواله:', error);
      alert(`خطا در حذف حواله: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // تغییر وضعیت حواله
  const handleStatusChange = useCallback(async (delivery: OwnershipDelivery) => {
    setIsLoading(true);
    try {
      const newStatus = delivery.status === 'draft' ? 'issued' : 'draft';
      
      const updatedDelivery: OwnershipDelivery = {
        ...delivery,
        status: newStatus as 'draft' | 'issued',
        updatedAt: new Date()
      };

      const existingDeliveries = (storage.loadData('ownership-delivery-slips') || []) as OwnershipDelivery[];
      const updatedDeliveries = existingDeliveries.map((d: OwnershipDelivery) => 
        d.id === delivery.id ? updatedDelivery : d
      );
      
      storage.saveData('ownership-delivery-slips', updatedDeliveries);
      setOwnershipDeliveries(updatedDeliveries);

      console.log('✅ Delivery status changed to:', newStatus);
    } catch (error) {
      console.error('❌ خطا در تغییر وضعیت حواله:', error);
      alert(`خطا در تغییر وضعیت حواله: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // حذف حواله
  

  // پرینت حواله (دو صفحه) - اصلاح شده برای جداسازی از edit mode
  const handlePrint = useCallback((delivery: OwnershipDelivery) => {
    console.log('🖨️ شروع پیش‌نمایش پرینت برای:', delivery.transactionNumber);
    setPrintPreviewDelivery(delivery); // نمایش مودال پیش‌نمایش پرینت
  }, []);

  // پرینت واقعی حواله (دو صفحه)
  const handleActualPrint = useCallback((delivery: OwnershipDelivery) => {
    console.log('🖨️ پرینت واقعی حواله:', delivery.transactionNumber);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>حواله انبار تملیکی - ${delivery.transactionNumber}</title>
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap');
    
    @page { 
      margin: 12mm; 
      size: A4; 
      @bottom-center { 
        content: "صفحه " counter(page) " از " counter(pages); 
        font-family: 'Vazirmatn', sans-serif; 
        font-size: 9pt; 
        color: #64748b; 
        font-weight: 500;
      }
    }
    
    * { 
      font-family: 'Vazirmatn', sans-serif; 
      box-sizing: border-box;
    }
    
    body {
      direction: rtl;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-size: 11px;
      color: #0f172a;
      line-height: 1.6;
    }
    
    .page-break { 
      page-break-before: always; 
    }
    
    .page {
      width: 100%;
      min-height: 100vh;
      padding: 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
      position: relative;
    }
    
    .document-container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04);
      overflow: hidden;
      border: 1px solid #e2e8f0;
      position: relative;
    }
    
    .header-section {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
      color: white;
      padding: 32px 40px;
      position: relative;
      overflow: hidden;
    }
    
    .header-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.05"><circle cx="30" cy="30" r="4"/></g></svg>') repeat;
    }
    
    .header-content {
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .company-info {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    
    .company-logo {
      width: 72px;
      height: 72px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 6px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }
    
    .company-details h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 8px 0;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .company-details p {
      font-size: 13px;
      margin: 0;
      color: #cbd5e1;
      line-height: 1.5;
    }
    
    .document-title {
      text-align: center;
      flex: 1;
    }
    
    .document-title h2 {
      font-size: 32px;
      font-weight: 900;
      margin: 0 0 8px 0;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      letter-spacing: -0.025em;
    }
    
    .document-title .subtitle {
      font-size: 16px;
      font-weight: 600;
      color: #e2e8f0;
      margin: 0;
    }
    
    .content-section {
      padding: 40px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .info-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    }
    
    .info-card h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 16px 0;
      padding-bottom: 12px;
      border-bottom: 2px solid #3b82f6;
      position: relative;
    }
    
    .info-card h3::after {
      content: '';
      position: absolute;
      bottom: -2px;
      right: 0;
      width: 40px;
      height: 2px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      font-weight: 600;
      color: #64748b;
      font-size: 12px;
    }
    
    .info-value {
      font-weight: 700;
      color: #1e293b;
      font-size: 12px;
    }
    
    .amount-showcase {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
      color: white;
      padding: 32px;
      border-radius: 16px;
      text-align: center;
      margin: 32px 0;
      box-shadow: 0 8px 32px rgba(15, 23, 42, 0.2);
      position: relative;
      overflow: hidden;
    }
    
    .amount-showcase::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
    }
    
    .amount-showcase > * {
      position: relative;
      z-index: 2;
    }
    
    .amount-label {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #cbd5e1;
    }
    
    .amount-number {
      font-size: 28px;
      font-weight: 900;
      margin: 0;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      border: 1px solid #e2e8f0;
    }
    
    .data-table th {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      color: white;
      padding: 16px 12px;
      font-weight: 700;
      text-align: center;
      font-size: 11px;
      border: none;
    }
    
    .data-table td {
      padding: 12px;
      text-align: right;
      border-bottom: 1px solid #f1f5f9;
      font-size: 11px;
    }
    
    .data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    
    .data-table tr:last-child td {
      border-bottom: none;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
      margin: 40px 0 20px 0;
      padding: 16px 24px;
      background: linear-gradient(90deg, #eff6ff, #dbeafe);
      border: 1px solid #3b82f6;
      border-radius: 12px;
      position: relative;
    }
    
    .section-title::before {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 0 12px 12px 0;
    }
    
    .weight-section {
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    
    .weight-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    
    .weight-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .weight-item:last-child {
      border-bottom: none;
    }
    
    .weight-label {
      font-weight: 600;
      color: #64748b;
      font-size: 11px;
    }
    
    .weight-value {
      font-weight: 700;
      color: #1e293b;
      font-size: 11px;
    }
    
    .signature-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin: 48px 0 32px 0;
      padding: 24px;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border-radius: 16px;
      border: 1px solid #e2e8f0;
    }
    
    .signature-box {
      text-align: center;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
      border: 1px solid #e2e8f0;
    }
    
    .signature-box h4 {
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 24px 0;
    }
    
    .signature-line {
      height: 2px;
      background: linear-gradient(90deg, transparent, #64748b, transparent);
      border-radius: 1px;
      margin: 0 auto;
      width: 80%;
      position: relative;
    }
    
    .watermark {
      position: absolute;
      bottom: 60px;
      right: 60px;
      opacity: 0.03;
      font-size: 120px;
      font-weight: 900;
      color: #1e293b;
      transform: rotate(-45deg);
      z-index: 0;
      pointer-events: none;
    }
    
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #64748b;
      padding: 20px;
      background: linear-gradient(90deg, #f8fafc, #f1f5f9);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-top: 32px;
      font-weight: 500;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    
    .status-completed {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }
    
    .status-pending {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
    }
    
    .highlight-text {
      color: #3b82f6;
      font-weight: 700;
    }
    
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 24px 0;
    }
    
    @media print {
      body { margin: 0; padding: 0; }
      .page { padding: 15px; }
    }
    </style>
    </head>
    <body>
    <!-- صفحه اول: اطلاعات حواله -->
    <div class="page">
    <div class="document-container">
    <div class="watermark">کورش</div>
    
    <div class="header-section">
    <div class="header-content">
    <div class="company-info">
    <img src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559" alt="لوگو شرکت" class="company-logo" onerror="this.src='/لوگو صنعت غذایی کورش.jpg'; this.onerror=function(){this.style.display='none';};" />
    <div class="company-details">
    <h1>شرکت صنعت غذایی کورش</h1>
    <p>تهران، خیابان نیل، شماره 241<br>تلفن: 021 83893000 | www.kouroshfood.com</p>
    </div>
    </div>
    
    <div class="document-title">
    <h2>حواله انبار تملیکی</h2>
    <p class="subtitle">شماره تراکنش: ${delivery.transactionNumber || 'نامشخص'}</p>
    <p class="subtitle">شماره رسید: ${delivery.receiptNumber}</p>
    </div>
    </div>
    </div>
    
    <div class="content-section">
    <div class="info-grid">
    <div class="info-card">
    <h3>اطلاعات محصول</h3>
    <div class="info-row">
    <span class="info-label">نام محصول:</span>
    <span class="info-value">${delivery.productName}</span>
    </div>
    <div class="info-row">
    <span class="info-label">شماره رسید:</span>
    <span class="info-value">${delivery.receiptNumber}</span>
    </div>
    <div class="info-row">
    <span class="info-label">واحد:</span>
    <span class="info-value">${delivery.unit}</span>
    </div>
    <div class="info-row">
    <span class="info-label">وضعیت:</span>
    <span class="info-value"><span class="status-badge ${delivery.status === 'issued' ? 'status-completed' : 'status-pending'}">${delivery.status === 'issued' ? 'صادر شده' : 'پیش نویس'}</span></span>
    </div>
    <div class="info-row">
    <span class="info-label">شماره قرارداد:</span>
    <span class="info-value">${delivery.contractNumber || '-'}</span>
    </div>
    </div>
    
    <div class="info-card">
    <h3>اطلاعات موقعیت</h3>
    <div class="info-row">
    <span class="info-label">سایت:</span>
    <span class="info-value">${delivery.siteName}</span>
    </div>
    <div class="info-row">
    <span class="info-label">مخزن:</span>
    <span class="info-value">${delivery.tankName}</span>
    </div>
    <div class="info-row">
    <span class="info-label">تاریخ تحویل:</span>
    <span class="info-value">${formatPersianDate(delivery.deliveryDate)}</span>
    </div>
    <div class="info-row">
    <span class="info-label">نام کشتی:</span>
    <span class="info-value">${delivery.shipName || '-'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">راننده:</span>
    <span class="info-value">${delivery.driverName || '-'}</span>
    </div>
    </div>
    </div>
    
    <div class="amount-showcase">
    <div class="amount-label">مقدار کل تحویل تملیکی</div>
    <div class="amount-number">${formatPersianNumber(delivery.amount)} ${delivery.unit}</div>
    </div>
    
    ${delivery.notes ? `
    <div class="info-card">
    <h3>توضیحات</h3>
    <div style="padding: 12px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
    <p style="margin: 0; color: #1e293b; font-size: 11px; line-height: 1.6;">${delivery.notes}</p>
    </div>
    </div>
    ` : ''}
    
    <div class="footer-note">
    این سند در تاریخ ${formatPersianDate(new Date())} توسط سیستم مدیریت انبار شرکت صنعت غذایی کورش تهیه شده است.
    </div>
    </div>
    </div>
    </div>
    
    <!-- صفحه دوم: اطلاعات رسید انبار مرجع -->
    <div class="page-break">
    <div class="page">
    <div class="document-container">
    <div class="watermark">کورش</div>
    
    <div class="header-section">
    <div class="header-content">
    <div class="company-info">
    <img src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559" alt="لوگو شرکت" class="company-logo" onerror="this.src='/لوگو صنعت غذایی کورش.jpg'; this.onerror=function(){this.style.display='none';};" />
    <div class="company-details">
    <h1>شرکت صنعت غذایی کورش</h1>
    <p>تهران، خیابان نیل، شماره 241<br>تلفن: 021 83893000 | www.kouroshfood.com</p>
    </div>
    </div>
    
    <div class="document-title">
    <h2>اطلاعات رسید انبار مرجع</h2>
    <p class="subtitle">شماره رسید: ${delivery.receiptNumber}</p>
    <p class="subtitle">شماره تراکنش: ${delivery.transactionNumber || 'نامشخص'}</p>
    </div>
    </div>
    </div>
    
    <div class="content-section">
    <div class="section-title">اطلاعات کشتی و حمل و نقل</div>
    <table class="data-table">
    <tr><td width="30%"><strong>نام کشتی</strong></td><td>${delivery.shipName || 'نامشخص'}</td></tr>
    <tr><td><strong>شماره کوتاژ</strong></td><td>${delivery.cotageNumber || 'نامشخص'}</td></tr>
    <tr><td><strong>شماره شاخص</strong></td><td>${delivery.indexNumber || 'نامشخص'}</td></tr>
    <tr><td><strong>شماره قرارداد</strong></td><td>${delivery.contractNumber || 'نامشخص'}</td></tr>
    <tr><td><strong>نام راننده</strong></td><td>${delivery.driverName || 'نامشخص'}</td></tr>
    <tr><td><strong>سایت</strong></td><td>${delivery.siteName}</td></tr>
    <tr><td><strong>مخزن</strong></td><td>${delivery.tankName}</td></tr>
    <tr><td><strong>تاریخ تحویل</strong></td><td>${formatPersianDate(delivery.deliveryDate)}</td></tr>
    <tr><td><strong>وضعیت</strong></td><td><span class="status-badge ${delivery.status === 'issued' ? 'status-completed' : 'status-pending'}">${delivery.status === 'issued' ? 'صادر شده' : 'پیش نویس'}</span></td></tr>
    </table>
    
    <div class="section-title">اطلاعات وزن‌های دقیق</div>
    <div class="weight-section">
    <div class="weight-grid">
    <div class="weight-item">
    <span class="weight-label">وزن بارنامه (Bill of Lading Weight):</span>
    <span class="weight-value">${formatPersianNumber(delivery.shipBillOfLadingAmount || 0)} کیلوگرم</span>
    </div>
    <div class="weight-item">
    <span class="weight-label">وزن تخلیه از کشتی (Ullage Weight):</span>
    <span class="weight-value">${formatPersianNumber(delivery.shipUnloadingAmount || 0)} کیلوگرم</span>
    </div>
    <div class="weight-item">
    <span class="weight-label">وزن شور تانک (Shore Tank Weight):</span>
    <span class="weight-value">${formatPersianNumber(delivery.tankShoreAmount || 0)} کیلوگرم</span>
    </div>
    <div class="weight-item">
    <span class="weight-label">وزن ناخالص (Weight Gross):</span>
    <span class="weight-value">${formatPersianNumber(delivery.weightGross || 0)} کیلوگرم</span>
    </div>
    <div class="weight-item">
    <span class="weight-label">وزن خالص (Weight Net):</span>
    <span class="weight-value highlight-text">${formatPersianNumber(delivery.amount)} ${delivery.unit}</span>
    </div>
    <div class="weight-item">
    <span class="weight-label">اختلاف وزن:</span>
    <span class="weight-value">${formatPersianNumber((delivery.weightGross || 0) - delivery.amount)} ${delivery.unit}</span>
    </div>
    </div>
    </div>
    
    <div class="signature-section">
    <div class="signature-box">
    <h4>امضای انباردار</h4>
    <div class="signature-line"></div>
    </div>
    <div class="signature-box">
    <h4>امضای تأیید کننده</h4>
    <div class="signature-line"></div>
    </div>
    <div class="signature-box">
    <h4>امضای گیرنده</h4>
    <div class="signature-line"></div>
    </div>
    </div>
    
    <div class="footer-note">
    این سند در تاریخ ${formatPersianDate(new Date())} توسط سیستم مدیریت انبار شرکت صنعت غذایی کورش تهیه شده است.
    </div>
    </div>
    </div>
    </div>
    </div>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, []);

  // محاسبه مانده موجودی برای نمایش
  const displayRemainingInventory = useMemo(() => {
    if (!selectedReceipt) {
      console.log('📊 No selected receipt for remaining inventory calculation');
      return 0;
    }
    
    try {
      const result = calculateRemainingInventory(selectedReceipt);
      console.log('🧮 Remaining inventory calculated:', result, 'for receipt:', selectedReceipt.receiptNumber);
      return result;
    } catch (error) {
      console.error('خطا در محاسبه مانده موجودی:', error);
      return 0;
    }
  }, [selectedReceipt, calculateRemainingInventory]);

  // محاسبه حداکثر مقدار قابل حواله
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _calculatedMaxDeliverableAmount = useMemo(() => {
    if (!selectedReceipt) return 0;
    
    const siteId = selectedSite || selectedReceipt?.siteId;
    const tankId = selectedTank || selectedReceipt?.tankId;
    
    if (!siteId || !tankId) return 0;
    
    try {
      const inventory = calculateTankInventory(siteId, tankId);
      // حداکثر مقدار قابل حواله = موجودی نهایی مخزن
      return Math.max(0, inventory.finalInventory);
    } catch (error) {
      console.error('خطا در محاسبه حداکثر مقدار قابل حواله:', error);
      return 0;
    }
  }, [selectedReceipt, selectedSite, selectedTank, calculateTankInventory]);

  // تابع پاک کردن کش localStorage (فقط کش محاسباتی، حفظ داده‌های کاربر)
  const handleClearCache = () => {
    console.log('🗑️ شروع پاک کردن کش محاسباتی localStorage...');
    
    // فقط کش محاسباتی و متادیتا پاک می‌شود - داده‌های کاربر حفظ می‌شوند
    const cacheKeysToRemove = [
      'data-storage-meta',  // متادیتا
      'temp-calculations',  // محاسبات موقتی
      'cache-version',      // نسخه کش
      'calculation-cache'   // کش محاسبات
    ];
    
    let removedCount = 0;
    cacheKeysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`🗑️ کش محاسباتی پاک شد: ${key}`);
        removedCount++;
      }
    });
    
    // نمایش اطلاعات حفظ شده
    const preservedData = {
      'رسیدها': localStorage.getItem('receipts') ? 'حفظ شد' : 'خالی',
      'حواله‌های تملیکی': localStorage.getItem('ownershipDeliveries') ? 'حفظ شد' : 'خالی',
      'حواله‌های امانی': localStorage.getItem('consignment-delivery-slips') ? 'حفظ شد' : 'خالی',
      'تنظیمات موجودی': localStorage.getItem('inventoryAdjustments') ? 'حفظ شد' : 'خالی',
      'محصولات': localStorage.getItem('products') ? 'حفظ شد' : 'خالی'
    };
    
    console.log('✅ داده‌های کاربر حفظ شد:', preservedData);
    console.log(`📊 تعداد کلیدهای پاک شده: ${removedCount}`);
    
    // ریلود صفحه برای اعمال تغییرات
    setTimeout(() => {
      console.log('🔄 ریلود صفحه برای اعمال کش جدید...');
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">بازگشت</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            
            {/* فیلتر تاریخ انتخاب شده */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">تاریخ انتخاب شده:</label>
              <PersianDatePicker
                value={selectedDate}
                onChange={(date) => setSelectedDate(date || new Date())}
                className="w-48"
              />
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                امروز
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="w-7 h-7 text-blue-600" />
              حواله انبار تملیکی
            </h1>
            <p className="text-gray-600 mt-1">مدیریت و صدور حواله‌های تملیکی انبار</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCacheClearConfirm(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="پاک کردن کش و دوباره بارگذاری داده‌ها"
            >
              <RefreshCw className="w-4 h-4" />
              پاک کردن کش
            </button>
            <button
              onClick={() => setIsAddingNew(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              حواله جدید
            </button>
          </div>
        </div>

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
          
          <div className="flex items-end">
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

        {/* فیلترهای جستجو */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* جستجو */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="جستجو در محصولات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          

        </div>
          </>
        )}

        {/* جداول موجودی مخازن - کپی شده از کسر/اضافه انبار */}
        {showInventoryPackage && (
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
                const emptyCapacity = Math.max(0, totalCapacity - (inventory.finalInventory || 0));
                
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>رسیدهای تملیکی:</span>
                      <span className="font-semibold">{formatPersianNumber(inventory.ownedReceiptsAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>سند اضافه تملیکی:</span>
                      <span className="font-semibold">{formatPersianNumber(inventory.ownedAdditionDocuments || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>حواله‌های تملیکی:</span>
                      <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedDeliveries || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>افزودن به تملیکی از محل افت:</span>
                      <span className="font-semibold">{formatPersianNumber(inventory.ownedGainedAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>سند کسر تملیکی:</span>
                      <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.ownedDeductionDocuments || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>رسیدهای امانی:</span>
                      <span className="font-semibold">{formatPersianNumber(inventory.consignmentReceiptsAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>سند اضافه امانی:</span>
                      <span className="font-semibold">{formatPersianNumber(inventory.consignmentAdditions || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>حواله‌های امانی:</span>
                      <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.totalConsignmentDeliveries || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>کسر از امانی از محل افت:</span>
                      <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeductionAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>سند کسر امانی:</span>
                      <span className="font-semibold text-red-600">-{formatPersianNumber(inventory.consignmentDeductionDocuments || 0)}</span>
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
                      <span>{formatPersianNumber(inventory.finalInventory || 0)}</span>
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
              const inventory = calculatePureConsignmentTanksInventory();
              return (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>رسیدهای امانی:</span>
                    <span className="font-semibold">{formatPersianNumber(inventory.consignmentReceiptsAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>سند اضافه امانی:</span>
                    <span className="font-semibold">{formatPersianNumber(inventory.consignmentAdditions || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>حواله‌های امانی:</span>
                    <span className="font-semibold">-{formatPersianNumber(inventory.consignmentDeliveries || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>کسر از امانی از محل افت:</span>
                    <span className="font-semibold">-{formatPersianNumber(inventory.consignmentDeductionAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>سند کسر امانی:</span>
                    <span className="font-semibold">-{formatPersianNumber(inventory.consignmentDeductionDocuments || 0)}</span>
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
                    <span>{formatPersianNumber(inventory.finalInventory || 0)}</span>
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
              const inventory = calculatePureOwnershipTanksInventory();
              return (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>رسیدهای تملیکی:</span>
                    <span className="font-semibold">{formatPersianNumber(inventory.ownedReceiptsAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>سند اضافه تملیکی:</span>
                    <span className="font-semibold">{formatPersianNumber(inventory.ownedAdditionDocuments || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>حواله‌های تملیکی:</span>
                    <span className="font-semibold">-{formatPersianNumber(inventory.ownedDeliveries || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>افزودن به تملیکی از محل افت:</span>
                    <span className="font-semibold">{formatPersianNumber(inventory.ownedGainedAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>سند کسر تملیکی:</span>
                    <span className="font-semibold">-{formatPersianNumber(inventory.ownedDeductionDocuments || 0)}</span>
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
                    <span>{formatPersianNumber(inventory.finalInventory || 0)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        </div>
        )}
      </div>

      
      {/* رسیدهای قابل حواله با موجودی تملیکی - حالت خطی */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-600" />
              رسیدهای قابل حواله (موجودی تملیکی)
            </h2>
            <div className="text-sm text-gray-500">
              تمام رسیدهای تملیکی با مانده موجودی مثبت
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {(() => {
            // فیلتر رسیدها - فقط تملیکی طبق درخواست کاربر
            const filteredAvailableReceipts = availableReceipts.filter(receipt => {
              // فقط رسیدهای تملیکی (userType === 'owned')
              if (receipt.userType !== 'owned') return false;
              
              // محاسبه موجودی باقی‌مانده برای این رسید - استفاده از تابع مخصوص
              const receiptInventory = calculateRemainingInventory(receipt);
              
              // فقط رسیدهایی که موجودی مثبت دارند
              return receiptInventory > 0;
            });

            if (filteredAvailableReceipts.length === 0) {
              return (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    هیچ رسیدی با موجودی تملیکی یافت نشد
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    لطفاً ابتدا رسیدهای تملیکی ایجاد کنید
                  </p>
                </div>
              );
            }

            return (
              <div className="overflow-x-auto">
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-right p-3 font-medium text-gray-900">شماره رسید</th>
                        <th className="text-right p-3 font-medium text-gray-900">نام محصول</th>
                        <th className="text-right p-3 font-medium text-gray-900">سایت / مخزن</th>
                        <th className="text-right p-3 font-medium text-gray-900">مانده موجودی تملیکی</th>
                        <th className="text-right p-3 font-medium text-gray-900">واحد</th>
                        <th className="text-right p-3 font-medium text-gray-900">تاریخ</th>
                        <th className="text-center p-3 font-medium text-gray-900">انتخاب</th>
                      </tr>
                    </thead>
                  <tbody>
                    {filteredAvailableReceipts.map(receipt => {
                      const remainingAmount = calculateRemainingInventory(receipt);
                      
                      // فقط رسیدهایی که مانده موجودی تملیکی > 0 دارند نمایش داده شوند
                      if (remainingAmount <= 0) return null;
                      
                      return (
                        <tr 
                          key={receipt.id}
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedReceipt(receipt);
                            setSelectedSite(receipt.siteId);
                            setSelectedTank(receipt.tankId);
                            setIsAddingNew(true);
                          }}
                        >
                          <td className="p-3 text-gray-900 font-mono text-xs">{receipt.receiptNumber}</td>
                          <td className="p-3 text-gray-900 font-medium">{receipt.productName}</td>
                          <td className="p-3 text-gray-600">{receipt.siteName} / {receipt.tankName}</td>
                          <td className="p-3 font-bold text-green-600">
                            {formatPersianNumber(remainingAmount)} {receipt.unit}
                          </td>
                          <td className="p-3 text-gray-600">{receipt.unit}</td>
                          <td className="p-3 text-gray-600">{formatPersianDate(receipt.receiptDate)}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReceipt(receipt);
                                setSelectedSite(receipt.siteId);
                                setSelectedTank(receipt.tankId);
                                setIsAddingNew(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded transition-colors"
                            >
                              انتخاب
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}
        </div>
      </div>

      {/* محتوای اصلی */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* جدول الف: اطلاعات کالا */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                جدول الف: اطلاعات کالا
              </h2>
              <div className="text-sm text-gray-500">
                {filteredCombinedData.length} آیتم یافت شد
              </div>
            </div>
          </div>

          <div className="p-6">
            {Object.keys(groupedData).length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">هیچ کالایی یافت نشد</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                {Object.entries(groupedData).map(([documentNumber, items]) => (
                  <div key={documentNumber} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        شماره سند: {documentNumber}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {items.length} آیتم
                        </span>
                        <button
                          onClick={() => setShowDetails(showDetails === documentNumber ? null : documentNumber)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${showDetails === documentNumber ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* حالت خلاصه شده */}
                    {collapsedItems.has(documentNumber) ? (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">تعداد کل آیتم‌ها</div>
                            <div className="font-semibold text-lg">{items.length}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">مقدار کل رسیدها</div>
                            <div className="font-semibold text-lg text-green-600">
                              {formatPersianNumber(
                                items.filter(i => i.type === 'receipt').reduce((sum, r) => sum + (typeof r.amount === 'number' ? r.amount : 0), 0)
                              )} {items[0]?.unit || 'kg'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">کل افت</div>
                            <div className="font-semibold text-lg text-red-600">
                              {formatPersianNumber(
                                items.filter(i => i.type === 'receipt').reduce((sum, r) => sum + (r.wastageAmount || 0), 0)
                              )} {items[0]?.unit}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">مقدار خالص کل</div>
                            <div className="font-semibold text-lg text-blue-600">
                              {formatPersianNumber(
                                items.filter(i => i.type === 'receipt').reduce((sum, r) => sum + (safeNumber(r.amount, 0) - safeNumber(r.wastageAmount, 0)), 0)
                              )} {items[0]?.unit}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-center">
                          <button
                            onClick={() => setCollapsedItems(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(documentNumber);
                              return newSet;
                            })}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            نمایش جزئیات
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* حالت جزئیات */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-all ${
                              selectedReceipt?.id === item.id
                                ? 'border-blue-500 bg-blue-50'
                                : item.colorClass
                            }`}
                            onClick={() => {
                              const receipt = {
                                ...item,
                                id: item.id,
                                receiptNumber: item.receiptNumber,
                                productName: item.productName,
                                siteName: item.siteName,
                                tankName: item.tankName,
                                amount: item.amount,
                                unit: item.unit,
                                receiptDate: item.date,
                                userType: 'owned',
                                // فیلدهای اصلاح شده
                                productId: item.productId || item.id,
                                siteId: item.siteId,
                                tankId: item.tankId,
                                shipName: item.shipName,
                                cotageNumber: item.cotageNumber,
                                indexNumber: item.indexNumber,
                                driverName: item.driverName,
                                contractNumber: item.contractNumber,
                                shipBillOfLadingAmount: item.shipBillOfLadingAmount,
                                shipUnloadingAmount: item.shipUnloadingAmount,
                                tankShoreAmount: item.tankShoreAmount,
                                weightGross: item.weightGross,
                                wastageAmount: item.wastageAmount,

                              };
                              
                              console.log('🖱️ Receipt selected:', receipt);
                              
                              setSelectedReceipt(receipt);
                              setDeliveryAmount(0); // ریست مقدار حواله
                            }}
                          >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-gray-900">{item.productName}</div>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    item.type === 'receipt' 
                                      ? 'bg-green-100 text-green-800'
                                      : item.type === 'addition'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {item.typeLabel}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div>شماره رسید: {item.receiptNumber}</div>
                                  <div>سایت: {item.siteName}</div>
                                  <div>مخزن: {item.tankName}</div>
                                  <div>مقدار: {formatPersianNumber(isNaN(item.amount) ? 0 : item.amount)} {item.unit || 'kg'}</div>
                                  {item.shipName && <div>نام کشتی: {item.shipName}</div>}
                                  {item.cotageNumber && <div>شماره کوتاز: {item.cotageNumber}</div>}
                                  {item.indexNumber && <div>شماره شاخص: {item.indexNumber}</div>}
                                  {item.driverName && <div>راننده: {item.driverName}</div>}
                                  {item.weightGross && <div>وزن ناخالص: {formatPersianNumber(item.weightGross)} کیلوگرم</div>}
                                  <div className="text-xs text-gray-500 mt-1">
                                    {item.type === 'receipt' ? 'رسید انبار' : item.type === 'addition' ? 'سند اضافه' : 'سند کسر'}
                                  </div>
                                </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                                  {item.productTypeLabel}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatPersianDate(item.date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* دکمه‌های کنترل نمایش */}
                    <div className="mt-3 flex justify-center">
                      <button
                        onClick={() => {
                          if (collapsedItems.has(documentNumber)) {
                            setCollapsedItems(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(documentNumber);
                              return newSet;
                            });
                          } else {
                            setCollapsedItems(prev => new Set([...prev, documentNumber]));
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {collapsedItems.has(documentNumber) ? (
                          <>
                            <Eye className="w-4 h-4" />
                            نمایش جزئیات
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 rotate-180" />
                            نمایش خلاصه
                          </>
                        )}
                      </button>
                    </div>

                    {showDetails === documentNumber && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">مقدار رسید اولیه</div>
                            <div className="font-semibold">
                              {formatPersianNumber(
                                items.filter(i => i.type === 'receipt').reduce((sum, r) => sum + (typeof r.amount === 'number' ? r.amount : 0), 0)
                              )} {items[0]?.unit || 'kg'}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">کل افت</div>
                            <div className="font-semibold text-red-600">
                              {formatPersianNumber(
                                items.filter(i => i.type === 'receipt').reduce((sum, r) => sum + (r.wastageAmount || 0), 0)
                              )} {items[0]?.unit}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">مقدار خالص</div>
                            <div className="font-semibold text-green-600">
                              {formatPersianNumber(
                                items.filter(i => i.type === 'receipt').reduce((sum, r) => sum + (safeNumber(r.amount, 0) - safeNumber(r.wastageAmount, 0)), 0)
                              )} {items[0]?.unit}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">وزن ناخالص</div>
                            <div className="font-semibold text-blue-600">
                              {formatPersianNumber(
                                items.filter(i => i.type === 'receipt').reduce((sum, r) => sum + (r.weightGross || 0), 0)
                              )} کیلوگرم
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">وزن بارنامه</div>
                            <div className="font-semibold text-blue-600">
                              {formatPersianNumber(
                                items.filter(i => i.type === 'receipt').reduce((sum, r) => sum + (r.shipBillOfLadingAmount || 0), 0)
                              )} کیلوگرم
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">وزن تخلیه</div>
                            <div className="font-semibold text-blue-600">
                              {formatPersianNumber(
                                items.filter(i => i.type === 'receipt').reduce((sum, r) => sum + (r.shipUnloadingAmount || 0), 0)
                              )} کیلوگرم
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">وزن شور تانک</div>
                            <div className="font-semibold text-blue-600">
                              {formatPersianNumber(
                                items.filter(i => i.type === 'receipt').reduce((sum, r) => sum + (r.tankShoreAmount || 0), 0)
                              )} کیلوگرم
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">وضعیت</div>
                            <div className="font-semibold text-green-600">فعال</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* جدول ب: فرم صدور/ویرایش حواله */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200" data-edit-form>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-600" />
              {editingDelivery ? 'جدول ب: ویرایش حواله تملیکی' : 'جدول ب: صدور حواله تملیکی'}
            </h2>
            {editingDelivery && (
              <p className="text-sm text-gray-600 mt-1">
                شماره تراکنش: {editingDelivery.transactionNumber} | وضعیت: تغییر به پیش نویس
              </p>
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* محاسبه موجودی مخزن */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">موجودی مخزن نسبت به سایت</h3>
              </div>
              {(() => {
                // انتخاب سایت و مخزن - اگر خالی باشد، از selectedReceipt استفاده کن
                const siteId = selectedSite || selectedReceipt?.siteId;
                const tankId = selectedTank || selectedReceipt?.tankId;
                
                if (!siteId || !tankId) {
                  return (
                    <div className="text-center text-gray-500 py-4">
                      برای محاسبه موجودی، ابتدا کالایی را از جدول انتخاب کنید
                    </div>
                  );
                }
                
                const inventory = calculateTankInventory(siteId, tankId);
                return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>رسیدهای تملیکی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.totalOwnedReceipts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>افزودن به تملیکی از محل افت:</span>
                        <span className="font-semibold">{formatPersianNumber(calculatePureOwnershipTanksInventory(siteId, tankId).ownedGainedAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>اضافه انبار تملیکی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.totalOwnedSurplus)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>حواله‌های تملیکی (پیش نویس / صادر شده):</span>
                        <span className="font-semibold">-{formatPersianNumber(calculatePureOwnershipTanksInventory(siteId, tankId).ownedDeliveries)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>سندهای کسر تملیکی:</span>
                        <span className="font-semibold">-{formatPersianNumber(calculatePureOwnershipTanksInventory(siteId, tankId).ownedDeductionDocuments)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>کالای مصرفی تملیکی:</span>
                        <span className="font-semibold">-{formatPersianNumber(calculatePureOwnershipTanksInventory(siteId, tankId).ownedConsumedProducts || 0)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>کالای تولیدی تملیکی:</span>
                        <span className="font-semibold">+{formatPersianNumber(calculatePureOwnershipTanksInventory(siteId, tankId).ownedProducedProducts || 0)}</span>
                      </div>
                      <hr className="border-blue-300" />
                      <div className="flex justify-between text-lg font-bold text-green-900">
                        <span>موجودی نهایی (فقط تملیکی):</span>
                        <span>{formatPersianNumber(calculatePureOwnershipTanksInventory(siteId, tankId).finalInventory)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

            {/* فرم حواله */}
            {((isAddingNew && !editingDelivery) || (editingDelivery && selectedReceipt) || selectedReceipt) && (
              <div className="space-y-4" data-edit-form>
                {/* نوع کالا (فقط تملیکی) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع کالا
                  </label>
                  <input
                    type="text"
                    value="تملیکی"
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                {/* سایت */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    سایت
                  </label>
                  <input
                    type="text"
                    value={selectedReceipt?.siteName || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                {/* مخزن */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مخزن
                  </label>
                  <input
                    type="text"
                    value={selectedReceipt?.tankName || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                {/* مانده موجودی تملیکی */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="group relative cursor-help">
                      مانده موجودی تملیکی
                      <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white p-3 rounded-lg text-xs w-96 right-0 -top-2 transform translate-y-full shadow-lg">
                        <div className="font-semibold mb-2">فرمول محاسبه:</div>
                        <div className="space-y-1">
                          <div>مانده موجودی تملیکی =</div>
                          <div className="mr-2">• مقدار رسید اولیه</div>
                          <div className="mr-2">• + سندهای اضافه انبار تملیکی</div>
                          <div className="mr-2">• + تراکنش‌های "افزودن به تملیکی از محل افت"</div>
                          <div className="mr-2">• - سندهای کسر انبار تملیکی</div>
                          <div className="mr-2">• - حواله‌های صادر شده از این رسید</div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-600">
                          <div className="text-yellow-200">نکته: تمام مقادیر بر اساس تاریخ انتخاب شده محاسبه می‌شوند</div>
                        </div>
                        {/* Arrow */}
                        <div className="absolute -top-2 right-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-800"></div>
                      </div>
                    </span>
                  </label>
                  <div className="px-3 py-2 border border-gray-300 rounded-lg bg-green-50">
                    <span className="font-semibold text-green-700 text-lg">
                      {formatPersianNumber(selectedReceipt ? displayRemainingInventory : 0)} {selectedReceipt?.unit || 'kg'}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedReceipt ? 'قابل حواله برای این کالا' : 'ابتدا کالایی را انتخاب کنید'}
                    </div>
                  </div>
                </div>

                {/* مقدار حواله تملیکی */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مقدار حواله تملیکی
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={deliveryAmount || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      // استفاده از تابع کنترل خودکار - اگر بیشتر از مانده باشد، خودکار کاهش می‌یابد
                      handleDeliveryAmountChange(value);
                      // پاک کردن خطا
                      setErrors(prev => ({ ...prev, amount: '' }));
                    }}
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="مقدار حواله را وارد کنید..."
                  />
                  {errors.amount && (
                    <div className="text-red-500 text-xs mt-1">{errors.amount}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    <div>واحد: {selectedReceipt?.unit || 'kg'}</div>
                    <div className="flex items-center justify-between">
                      <span>حداکثر قابل حواله:</span>
                      <span className="font-semibold text-green-600">
                        {formatPersianNumber(selectedReceipt ? displayRemainingInventory : 0)} {selectedReceipt?.unit || 'kg'}
                      </span>
                    </div>
                    {deliveryAmount > (selectedReceipt ? displayRemainingInventory : 0) && (
                      <div className="text-orange-600 text-xs mt-1">
                        مقدار وارد شده بیشتر از موجودی بوده و به {formatPersianNumber(selectedReceipt ? displayRemainingInventory : 0)} کاهش یافت
                      </div>
                    )}
                  </div>
                </div>

                {/* شماره رسید */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    شماره رسید انبار
                  </label>
                  <input
                    type="text"
                    value={selectedReceipt?.receiptNumber || 'ندارد'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="رسیدی انتخاب نشده است"
                  />
                  {selectedReceipt && (
                    <div className="text-xs text-gray-500 mt-1">
                      رسید انتخاب شده: {selectedReceipt.receiptNumber}
                    </div>
                  )}
                </div>

                {/* نام محصول */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نام محصول
                  </label>
                  <input
                    type="text"
                    value={selectedReceipt?.productName || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                {/* تاریخ تحویل */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاریخ تحویل
                  </label>
                  <PersianDatePicker
                    value={deliveryDate}
                    onChange={(date) => setDeliveryDate(date || new Date())}
                    className="w-full"
                  />
                </div>

                {/* توضیحات */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    توضیحات
                  </label>
                  <textarea
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="توضیحات حواله..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* اطلاعات تکمیلی حواله انبار */}
                <div className="md:col-span-2 lg:col-span-4 border border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/40">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        checked={showDeliveryExtraInfo || enforceDeliveryExtraInfo.owned}
                        onChange={(e) => setShowDeliveryExtraInfo(e.target.checked)}
                        disabled={enforceDeliveryExtraInfo.owned}
                      />
                      <span>ثبت اطلاعات تکمیلی حواله انبار</span>
                      {enforceDeliveryExtraInfo.owned && (
                        <span className="text-xs text-red-600">(اجباری توسط تنظیمات عملکرد)</span>
                      )}
                    </label>
                  </div>

                  {(showDeliveryExtraInfo || enforceDeliveryExtraInfo.owned) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نام راننده</label>
                        <input
                          type="text"
                          value={deliveryExtraInfo.driverFirstName || ''}
                          onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, driverFirstName: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.driverFirstName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی راننده</label>
                        <input
                          type="text"
                          value={deliveryExtraInfo.driverLastName || ''}
                          onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, driverLastName: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.driverLastName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">کد ملی راننده</label>
                        <input
                          type="text"
                          value={deliveryExtraInfo.driverNationalId || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setDeliveryExtraInfo(prev => ({ ...prev, driverNationalId: value }));
                          }}
                          maxLength={10}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.driverNationalId ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شماره بارنامه</label>
                        <input
                          type="text"
                          value={deliveryExtraInfo.billOfLadingNumber || ''}
                          onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, billOfLadingNumber: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.billOfLadingNumber ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شماره پلاک</label>
                        <input
                          type="text"
                          value={deliveryExtraInfo.plateNumber || ''}
                          onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, plateNumber: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.plateNumber ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">وزن (مبنا)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={deliveryExtraInfo.weight ?? deliveryAmount}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            const weight = parseFloat(value) || 0;
                            setDeliveryExtraInfo(prev => ({ ...prev, weight }));
                            setDeliveryAmount(weight);
                          }}
                          onKeyPress={(e) => {
                            if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.weight ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ بارنامه</label>
                        <input
                          type="number"
                          step="0.01"
                          value={deliveryExtraInfo.billAmount ?? ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setDeliveryExtraInfo(prev => ({ ...prev, billAmount: parseFloat(value) || 0 }));
                          }}
                          onKeyPress={(e) => {
                            if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.billAmount ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">مقصد بارنامه</label>
                        <input
                          type="text"
                          value={deliveryExtraInfo.destination || ''}
                          onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, destination: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.destination ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ بارنامه</label>
                        <PersianDatePicker
                          value={deliveryExtraInfo.billDate || deliveryDate}
                          onChange={(date) => {
                            if (date) {
                              setDeliveryExtraInfo(prev => ({ ...prev, billDate: date }));
                            }
                          }}
                          placeholder="انتخاب تاریخ"
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.billDate ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شرکت حمل و نقل</label>
                        <input
                          type="text"
                          value={deliveryExtraInfo.transportCompany || ''}
                          onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, transportCompany: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.transportCompany ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شماره موبایل راننده</label>
                        <input
                          type="text"
                          value={deliveryExtraInfo.driverMobile || ''}
                          onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, driverMobile: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.driverMobile ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">آدرس مقصد</label>
                        <input
                          type="text"
                          value={deliveryExtraInfo.destinationAddress || ''}
                          onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, destinationAddress: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.destinationAddress ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ پشت بارنامه</label>
                        <input
                          type="number"
                          step="0.01"
                          value={deliveryExtraInfo.backBillAmount ?? ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setDeliveryExtraInfo(prev => ({ ...prev, backBillAmount: parseFloat(value) || 0 }));
                          }}
                          onKeyPress={(e) => {
                            if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.backBillAmount ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">کدپستی مقصد</label>
                        <input
                          type="text"
                          value={deliveryExtraInfo.destinationPostalCode || ''}
                          onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, destinationPostalCode: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.destinationPostalCode ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  {/* دکمه ویرایش (فقط وقتی editingDelivery وجود دارد و فرم کاملاً پر شده) */}
                  {editingDelivery ? (
                    <button
                      onClick={() => {
                        console.log('🔄 کلیک روی دکمه ذخیره تغییرات ویرایش');
                        console.log('مقادیر فرم:', {
                          editingDelivery: editingDelivery.transactionNumber,
                          selectedReceipt: selectedReceipt?.receiptNumber,
                          deliveryAmount: deliveryAmount,
                          deliveryDate: deliveryDate,
                          isLoading: isLoading
                        });
                        
                        // فقط وقتی فرم کاملاً پر شده و کاربر واقعاً روی دکمه کلیک کرده
                        saveDeliveryEdit({
                          receiptNumber: selectedReceipt?.receiptNumber,
                          productName: selectedReceipt?.productName,
                          productId: selectedReceipt?.productId,
                          siteName: selectedReceipt?.siteName,
                          siteId: selectedReceipt?.siteId,
                          tankName: selectedReceipt?.tankName,
                          tankId: selectedReceipt?.tankId,
                          amount: deliveryAmount,
                          unit: selectedReceipt?.unit,
                          deliveryDate: deliveryDate,
                          notes: deliveryNotes,

                        });
                      }}
                      disabled={isLoading || !selectedReceipt || deliveryAmount <= 0}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          در حال ذخیره تغییرات...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          ذخیره تغییرات
                        </>
                      )}
                    </button>
                  ) : (
                    /* دکمه صدور حواله جدید */
                    <button
                      onClick={() => {
                        console.log('🔄 کلیک روی دکمه صدور حواله جدید');
                        handleSaveDelivery({
                          receiptNumber: selectedReceipt?.receiptNumber,
                          productName: selectedReceipt?.productName,
                          productId: selectedReceipt?.productId,
                          siteName: selectedReceipt?.siteName,
                          siteId: selectedReceipt?.siteId,
                          tankName: selectedReceipt?.tankName,
                          tankId: selectedReceipt?.tankId,
                          amount: deliveryAmount,
                          unit: selectedReceipt?.unit,
                          deliveryDate: deliveryDate,
                          notes: deliveryNotes,

                        });
                      }}
                      disabled={isSaving || !selectedReceipt || deliveryAmount <= 0}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          ذخیره...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          صدور حواله
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      console.log('🔄 کلیک روی دکمه لغو/بازگشت');
                      setIsAddingNew(false);
                      setSelectedReceipt(null);
                      setEditingDelivery(null);
                      setDeliveryAmount(0);
                      setDeliveryDate(new Date());
                      setDeliveryNotes('');
                      setErrors({});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {editingDelivery ? 'بازگشت به لیست' : 'لغو'}
                  </button>
                </div>
              </div>
            )}

            {!isAddingNew && !selectedReceipt && (
              <div className="text-center py-8">
                <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">برای صدور حواله، ابتدا کالایی از جدول الف انتخاب کنید</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* جدول ج: تراکنش‌های حواله انبار تملیکی */}
      {ownershipDeliveries.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-gray-600" />
                  جدول ج: تراکنش‌های حواله انبار تملیکی
                </h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showExtraInfoInTable}
                    onChange={(e) => setShowExtraInfoInTable(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">نمایش اطلاعات تکمیلی</span>
                </label>
              </div>
              <button
                onClick={() => setIsOwnershipTableMinimized(!isOwnershipTableMinimized)}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isOwnershipTableMinimized ? (
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

          {!isOwnershipTableMinimized && (
            <div className="p-6">
            <div className="overflow-x-auto">
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-300">
                    <tr className="border-b-2 border-gray-300 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <th colSpan={6} className="text-center p-2 text-sm font-bold text-blue-900 border-l border-gray-300">
                        اطلاعات حواله تملیکی
                      </th>
                      <th colSpan={6} className="text-center p-2 text-sm font-bold text-orange-900">
                        اطلاعات رسید انبار
                      </th>
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50 sticky top-12">
                      {/* ستون‌های حواله */}
                      <th className="text-right p-2 font-medium text-gray-900 border-l border-gray-200">شماره تراکنش</th>
                      <th className="text-right p-2 font-medium text-gray-900 border-l border-gray-200">مقدار حواله</th>
                      <th className="text-right p-2 font-medium text-gray-900 border-l border-gray-200">تاریخ حواله</th>
                      <th className="text-right p-2 font-medium text-gray-900 border-l border-gray-200">وضعیت تراکنش</th>
                      <th className="text-right p-2 font-medium text-gray-900 border-l-2 border-gray-300">عملیات</th>
                      {/* ستون‌های رسید */}
                      <th className="text-right p-2 font-medium text-gray-900 border-l border-gray-200">شماره رسید</th>
                      <th className="text-right p-2 font-medium text-gray-900 border-l border-gray-200">نام محصول</th>
                      <th className="text-right p-2 font-medium text-gray-900 border-l border-gray-200">سایت/مخزن</th>
                      <th className="text-right p-2 font-medium text-gray-900 border-l border-gray-200">مقدار رسید</th>
                      <th className="text-right p-2 font-medium text-gray-900 border-l border-gray-200">شماره کشتی/کوتاز</th>
                      <th className="text-right p-2 font-medium text-gray-900">راننده/شاخص</th>
                      {showExtraInfoInTable && (
                        <>
                          <th className="text-right p-2 font-medium text-gray-900 border-l-2 border-gray-300">نام راننده</th>
                          <th className="text-right p-2 font-medium text-gray-900">نام خانوادگی راننده</th>
                          <th className="text-right p-2 font-medium text-gray-900">کد ملی راننده</th>
                          <th className="text-right p-2 font-medium text-gray-900">شماره بارنامه</th>
                          <th className="text-right p-2 font-medium text-gray-900">شماره پلاک</th>
                          <th className="text-right p-2 font-medium text-gray-900">وزن (مبنا)</th>
                          <th className="text-right p-2 font-medium text-gray-900">مبلغ بارنامه</th>
                          <th className="text-right p-2 font-medium text-gray-900">مقصد بارنامه</th>
                          <th className="text-right p-2 font-medium text-gray-900">تاریخ بارنامه</th>
                          <th className="text-right p-2 font-medium text-gray-900">شرکت حمل و نقل</th>
                          <th className="text-right p-2 font-medium text-gray-900">شماره موبایل راننده</th>
                          <th className="text-right p-2 font-medium text-gray-900">آدرس مقصد</th>
                          <th className="text-right p-2 font-medium text-gray-900">مبلغ پشت بارنامه</th>
                          <th className="text-right p-2 font-medium text-gray-900">کدپستی مقصد</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ownershipDeliveries.map((delivery) => (
                      <tr key={delivery.id} className="border-b border-gray-200 hover:bg-blue-50/30">
                        {/* اطلاعات حواله */}
                        <td className="p-2 text-gray-900 font-mono border-l border-gray-200">{delivery.transactionNumber}</td>
                        <td className="p-2 text-gray-900 font-bold border-l border-gray-200">
                          {formatPersianNumber(isNaN(delivery.amount) ? 0 : delivery.amount)} {delivery.unit || 'kg'}
                        </td>
                        <td className="p-2 text-gray-600 border-l border-gray-200">
                          {formatPersianDate(delivery.deliveryDate)}
                        </td>
                        <td className="p-2 border-l border-gray-200">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            delivery.status === 'issued' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {delivery.status === 'issued' ? 'صادر شده' : 'پیش نویس'}
                          </span>
                        </td>
                        <td className="p-2 border-l-2 border-gray-300">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditDelivery(delivery)}
                              disabled={isLoading}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                              title="ویرایش - انتقال به فرم ویرایش"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrint(delivery)}
                              className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                              title="پرینت حواله تملیکی (صفحه 1: حواله، صفحه 2: رسید)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(delivery)}
                              disabled={isLoading}
                              className={`p-1 rounded ${
                                delivery.status === 'issued'
                                  ? 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100'
                                  : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                              }`}
                              title={delivery.status === 'issued' ? 'بازگشت به پیش نویس' : 'تغییر به صادر شده'}
                            >
                              {delivery.status === 'issued' ? (
                                <FileText className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteDelivery(delivery)}
                              disabled={isLoading}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        {/* اطلاعات رسید انبار */}
                        <td className="p-2 text-gray-900 font-mono border-l border-gray-200">{delivery.receiptNumber}</td>
                        <td className="p-2 text-gray-900 border-l border-gray-200">{delivery.productName}</td>
                        <td className="p-2 text-gray-600 border-l border-gray-200">
                          {delivery.siteName} / {delivery.tankName}
                        </td>
                        <td className="p-2 text-gray-900 border-l border-gray-200">
                          {(() => {
                            const receipts = (storage.loadData('receipts') || []) as any[];
                            const receipt = receipts.find((r: any) => 
                              (r.receiptNumber === delivery.receiptNumber) || 
                              (r.transactionNumber === delivery.receiptNumber)
                            );
                            if (receipt) {
                              const amount = receipt.amount || receipt.receiptBasisAmount || 0;
                              return `${formatPersianNumber(amount)} ${receipt.unit}`;
                            }
                            return '-';
                          })()}
                        </td>
                        <td className="p-2 text-gray-600 border-l border-gray-200">
                          {delivery.shipName || '-'} / {delivery.cotageNumber || '-'}
                        </td>
                        <td className="p-2 text-gray-600">
                          {delivery.driverName || '-'} / {delivery.indexNumber || '-'}
                        </td>
                        {showExtraInfoInTable && (() => {
                          const extraInfo = (delivery as any).additionalInfo || {};
                          return (
                            <>
                              <td className="p-2 text-gray-900 border-l-2 border-gray-300">{extraInfo.driverFirstName || '-'}</td>
                              <td className="p-2 text-gray-900">{extraInfo.driverLastName || '-'}</td>
                              <td className="p-2 text-gray-900">{extraInfo.driverNationalId || '-'}</td>
                              <td className="p-2 text-gray-900">{extraInfo.billOfLadingNumber || '-'}</td>
                              <td className="p-2 text-gray-900">{extraInfo.plateNumber || '-'}</td>
                              <td className="p-2 text-gray-900">
                                {extraInfo.weight ? formatPersianNumber(extraInfo.weight) : '-'}
                              </td>
                              <td className="p-2 text-gray-900">
                                {extraInfo.billAmount ? formatPersianNumber(extraInfo.billAmount) : '-'}
                              </td>
                              <td className="p-2 text-gray-900">{extraInfo.destination || '-'}</td>
                              <td className="p-2 text-gray-900">
                                {extraInfo.billDate ? formatPersianDate(extraInfo.billDate) : '-'}
                              </td>
                              <td className="p-2 text-gray-900">{extraInfo.transportCompany || '-'}</td>
                              <td className="p-2 text-gray-900">{extraInfo.driverMobile || '-'}</td>
                              <td className="p-2 text-gray-900">{extraInfo.destinationAddress || '-'}</td>
                              <td className="p-2 text-gray-900">
                                {extraInfo.backBillAmount ? formatPersianNumber(extraInfo.backBillAmount) : '-'}
                              </td>
                              <td className="p-2 text-gray-900">{extraInfo.destinationPostalCode || '-'}</td>
                            </>
                          );
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* مودال تایید ویرایش - حذف شده به دلیل تداخل در فرآیند ویرایش */}
      {/* فرآیند ویرایش حالا به درستی کار می‌کند بدون نیاز به تأیید اضافی */}

      {/* مودال تأیید حذف - اصلاح شده برای جداسازی از edit mode */}
      {deletingDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">تأیید حذف</h3>
            <p className="text-gray-600 mb-6">
              آیا از حذف این حواله اطمینان دارید؟ این عمل قابل بازگشت نیست.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleActualDeleteDelivery(deletingDelivery);
                }}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors"
              >
                حذف
              </button>
              <button
                onClick={() => setDeletingDelivery(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال پیش‌نمایش پرینت - اصلاح شده برای جداسازی از edit mode */}
      {printPreviewDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">پیش‌نمایش پرینت</h3>
              <button
                onClick={() => setPrintPreviewDelivery(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* محتوای پیش‌نمایش پرینت */}
              <div className="space-y-6">
                {/* صفحه اول */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 text-center">صفحه اول: حواله انبار تملیکی</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>شماره تراکنش:</strong> {printPreviewDelivery.transactionNumber}
                    </div>
                    <div>
                      <strong>شماره رسید:</strong> {printPreviewDelivery.receiptNumber}
                    </div>
                    <div>
                      <strong>نام محصول:</strong> {printPreviewDelivery.productName}
                    </div>
                    <div>
                      <strong>مقدار:</strong> {formatPersianNumber(isNaN(printPreviewDelivery.amount) ? 0 : printPreviewDelivery.amount)} {printPreviewDelivery.unit || 'kg'}
                    </div>
                    <div>
                      <strong>سایت:</strong> {printPreviewDelivery.siteName}
                    </div>
                    <div>
                      <strong>مخزن:</strong> {printPreviewDelivery.tankName}
                    </div>
                    <div>
                      <strong>تاریخ:</strong> {formatPersianDate(printPreviewDelivery.deliveryDate)}
                    </div>
                    <div>
                      <strong>وضعیت:</strong> {printPreviewDelivery.status === 'issued' ? 'صادر شده' : 'پیش نویس'}
                    </div>
                  </div>
                </div>

                {/* صفحه دوم */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 text-center">صفحه دوم: اطلاعات رسید انبار</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>نام کشتی:</strong> {printPreviewDelivery.shipName || 'نامشخص'}
                    </div>
                    <div>
                      <strong>شماره کوتاز:</strong> {printPreviewDelivery.cotageNumber || 'نامشخص'}
                    </div>
                    <div>
                      <strong>شماره شاخص:</strong> {printPreviewDelivery.indexNumber || 'نامشخص'}
                    </div>
                    <div>
                      <strong>راننده:</strong> {printPreviewDelivery.driverName || 'نامشخص'}
                    </div>
                    <div>
                      <strong>وزن بارنامه:</strong> {formatPersianNumber(printPreviewDelivery.shipBillOfLadingAmount || 0)} کیلوگرم
                    </div>
                    <div>
                      <strong>وزن تخلیه:</strong> {formatPersianNumber(printPreviewDelivery.shipUnloadingAmount || 0)} کیلوگرم
                    </div>
                    <div>
                      <strong>وزن شور تانک:</strong> {formatPersianNumber(printPreviewDelivery.tankShoreAmount || 0)} کیلوگرم
                    </div>
                    <div>
                      <strong>وزن ناخالص:</strong> {formatPersianNumber(printPreviewDelivery.weightGross || 0)} کیلوگرم
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => handleActualPrint(printPreviewDelivery)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                چاپ
              </button>
              <button
                onClick={() => setPrintPreviewDelivery(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal پاک کردن کش */}
      {showCacheClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  پاک کردن کش
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  این عمل تمام داده‌های ذخیره شده در مرورگر را پاک می‌کند
                </p>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                ⚠️ <strong>هشدار:</strong> پس از انجام این عمل:
              </p>
              <ul className="text-amber-700 text-sm mt-2 list-disc list-inside space-y-1">
                <li>✅ تمام رسیدها و حواله‌های ذخیره شده حفظ می‌شوند</li>
                <li>✅ داده‌های کاربر و محاسبات موجودی حفظ می‌شود</li>
                <li>🔄 فقط کش محاسباتی و متادیتا پاک می‌شوند</li>
                <li>🔄 محاسبات دوباره انجام می‌شوند</li>
              </ul>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleClearCache}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                پاک کردن کش
              </button>
              <button
                onClick={() => setShowCacheClearConfirm(false)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewOwnershipDeliverySlip;