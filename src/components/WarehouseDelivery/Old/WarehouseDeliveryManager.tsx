import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, Download, Upload, RefreshCw, Edit2, Save, Trash2, AlertCircle, Printer, CheckSquare, FileText } from 'lucide-react';
import { WarehouseDelivery, DeliveryFilters } from '../../types/WarehouseDeliveryTypes';
import { generateTransactionNumber, formatPersianNumber, formatPersianDate } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import DeliveryTypeSelector from './DeliveryTypeSelector';
import CompanySelector from './CompanySelector';
import ContractSelector from './ContractSelector';
import PermitSelector from './PermitSelector';
import DeliveryForm from './DeliveryForm';
import DeliveriesTable from './DeliveriesTable';
import DeliverySlipTypeSelector from './DeliverySlipTypeSelector';
import ConsignmentDeliverySlip from './ConsignmentDeliverySlip';
import OwnershipDeliverySlip from './OwnershipDeliverySlip';
import OwnershipAcquisitionTable from './OwnershipAcquisitionTable';

interface WarehouseDeliveryManagerProps {
  sharedData: {
    baseData: any;
    contracts: any[];
    permits: any[];
    receipts: any[];
  };
  updateSharedData: (dataType: string, newData: any) => void;
  onRefresh: () => void;
}

const WarehouseDeliveryManager: React.FC<WarehouseDeliveryManagerProps> = ({
  sharedData,
  updateSharedData,
  onRefresh
}) => {
  // State management
  const [deliveries, setDeliveries] = useState<WarehouseDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DeliveryFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [isAddingDelivery, setIsAddingDelivery] = useState(false);
  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [currentDelivery, setCurrentDelivery] = useState<Partial<WarehouseDelivery>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fromPermit, setFromPermit] = useState(false);

  // Selector states
  const [showDeliveryTypeSelector, setShowDeliveryTypeSelector] = useState(false);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [showContractSelector, setShowContractSelector] = useState(false);
  const [showPermitSelector, setShowPermitSelector] = useState(false);

  // View states
  const [showDeliverySlipTypeSelector, setShowDeliverySlipTypeSelector] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'consignment-slip' | 'ownership-slip' | 'ownership-acquisition-table'>('list');
  const [existingSlips, setExistingSlips] = useState<any[]>([]);
  const [deliveryCreationMode, setDeliveryCreationMode] = useState<'general' | 'ownership-direct'>('general');

  // Selected permit for detailed view
  const [selectedPermit, setSelectedPermit] = useState<any>(null);

  // State for "To be checked" field
  const [checkedTransactions, setCheckedTransactions] = useState<Set<string>>(new Set());
  const [disabledTransactions, setDisabledTransactions] = useState<Set<string>>(new Set());

  // Data from shared props
  const { baseData, contracts, permits, receipts } = sharedData;
  const storage = DataStorage.getInstance();

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load deliveries
        const deliveriesData = storage.loadData('deliveries') || [];
        setDeliveries(deliveriesData);

        // Load existing slips
        const consignmentSlips = storage.loadData('consignment-delivery-slips') || [];
        const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
        setExistingSlips([...consignmentSlips, ...ownershipSlips]);

        // Load checked transactions
        const checkedData = storage.loadData('checked-transactions') || [];
        setCheckedTransactions(new Set(checkedData));
        
        // Load disabled transactions
        const disabledData = storage.loadData('disabled-transactions') || [];
        setDisabledTransactions(new Set(disabledData));

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save deliveries to storage and notify parent
  const saveDeliveries = useCallback((updatedDeliveries: WarehouseDelivery[]) => {
    const storage = DataStorage.getInstance();
    storage.saveData('deliveries', updatedDeliveries);
    setDeliveries(updatedDeliveries);
    updateSharedData('deliveries', updatedDeliveries);
  }, [updateSharedData]);

  // Generate a new delivery object
  const createNewDelivery = useCallback((userType: 'owned' | 'consignment', fromPermit: boolean = false): Partial<WarehouseDelivery> => {
    const now = new Date();
    return {
      id: `delivery_${Date.now()}`,
      transactionNumber: generateTransactionNumber(),
      userType: fromPermit ? 'consignment' : userType, // اگر از طريق مجوز ايجاد شود، هميشه اماني است
      status: 'issued', // وضعيت اوليه "صادره شده" باشد
      deliveryDate: now,
      createdAt: now,
      updatedAt: now,
      unit: 'kg'
    };
  }, []);

  // Start adding a new delivery
  const handleAddDelivery = useCallback(() => {
    setDeliveryCreationMode('general');
    setShowDeliverySlipTypeSelector(true);
  }, []);

  // Handle direct ownership delivery creation - updated to use permit selector like consignment
  const handleAddOwnershipDelivery = useCallback(() => {
    // برای حواله تملیکی هم مثل حواله امانی، ابتدا مجوز را انتخاب می کنیم
    setDeliveryCreationMode('ownership-direct');
    setShowDeliverySlipTypeSelector(true);
  }, []);

  // Handle ownership acquisition table view
  const handleViewOwnershipAcquisitionTable = useCallback(() => {
    setCurrentView('ownership-acquisition-table');
  }, []);

  // Handle delivery type selection - updated to handle both flows
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
        // برای حواله تملیکی، مستقیماً به فرم حواله تملیکی می رویم
        const newDelivery = createNewDelivery('owned', false);
        setCurrentDelivery(newDelivery);
        setIsAddingDelivery(true);
        setIsEditingDelivery(false);
        setCurrentView('ownership-slip');
      }
    } else if (deliveryCreationMode === 'ownership-direct') {
      // حالت مستقیم: کاربر از دکمه "ثبت حواله تملیکی" آمده است
      // مستقیماً به فرم حواله تملیکی می رویم بدون انتخاب نوع
      const newDelivery = createNewDelivery('owned', false);
      setCurrentDelivery(newDelivery);
      setIsAddingDelivery(true);
      setIsEditingDelivery(false);
      setCurrentView('ownership-slip');
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
    
    // تعيين ID اصلي تراکنش از منبع داده اصلي
    const transactionId = transaction.id || `delivery_${Date.now()}`;
    
    // حفظ اطلاعات تراکنش بدون تغيير مقدار
    // در حالت ويرايش، مقدار بايد حفظ شود نه تغيير يابد
    let updatedTransaction = { ...transaction };
    
    // اگر در حالت ويرايش باشد، ID را حفظ مي‌کنيم
    // اگر در حالت ايجاد باشد، ID جديد توليد مي‌شود
    setCurrentDelivery({
      ...updatedTransaction,
      id: isEditingDelivery ? transactionId : `delivery_${Date.now()}`
    });
    
    // Set states براي مديريت صحيح حالت ويرايش
    setIsEditingDelivery(true);
    setIsAddingDelivery(true);
    
    // انتقال به نماي مناسب بر اساس نوع حواله
    if (slipType === 'consignment') {
      setCurrentView('consignment-slip');
    } else {
      setCurrentView('ownership-slip');
    }
  }, [isEditingDelivery]);

  const handleBackToList = useCallback(() => {
    setCurrentView('list');
    setDeliveryCreationMode('general'); // Reset delivery creation mode
    // Refresh existing slips when returning to list
    const consignmentSlips = storage.loadData('consignment-delivery-slips') || [];
    const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
    setExistingSlips([...consignmentSlips, ...ownershipSlips]);
    
    // به‌روزرسانی deliveries state
    const deliveriesData = storage.loadData('deliveries') || [];
    setDeliveries(deliveriesData);
  }, [storage]);

  // Handle export
  const handleExport = useCallback(() => {
    // In a real application, this would export data to CSV or Excel
    window.alert('صدور خروجي اکسل');
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    onRefresh();
    // Refresh data از storage
    const deliveriesData = storage.loadData('deliveries') || [];
    setDeliveries(deliveriesData);
    
    const consignmentSlips = storage.loadData('consignment-delivery-slips') || [];
    const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
    setExistingSlips([...consignmentSlips, ...ownershipSlips]);
    
    // به‌روزرسانی مجوزها برای محاسبه صحیح مانده مجوز
    const permits = storage.loadData('delivery-permits') || [];
    permits.forEach((permit: any) => {
      if (permit.id) {
        const deliveriesForPermit = deliveriesData.filter((d: any) => d.permitId === permit.id && !d.isVoided);
        const totalDelivered = deliveriesForPermit.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        const calculatedRemaining = (permit.permitAmount || 0) - totalDelivered;
        
        if (permit.remainingTransferPermit !== calculatedRemaining) {
          permit.remainingTransferPermit = Math.max(0, calculatedRemaining);
          permit.updatedAt = new Date();
        }
      }
    });
    storage.saveData('delivery-permits', permits);
    updateSharedData('permits', permits);
  }, [onRefresh, storage, updateSharedData]);

  // دريافت اطلاعات کامل مجوز از سيستم مجوزها
  const getPermitInfo = (permitId: string) => {
    const permits = storage.loadData('delivery-permits') || [];
    return permits.find((p: any) => p.id === permitId);
  };

  // Filter permits into issued and closed - فقط مجوزهاي تأييد شده نمايش داده مي‌شوند
  const { issuedPermits, closedPermits } = useMemo(() => {
    const allPermits = storage.loadData('delivery-permits') || [];

    const issued = allPermits.filter((p: any) => {
      // ناديده گرفتن مجوزهاي ابطال شده
      if (p.isVoided) return false;
      
      // فقط مجوزهايي که تأييد شده‌اند نمايش داده شوند
      if (!p.approvalDate) return false;
      
      // محاسبه مجموع حواله‌هاي صادر شده از اين مجوز
      const deliveriesForPermit = deliveries.filter(d => d.permitId === p.id && !d.isVoided);
      const totalDelivered = deliveriesForPermit.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      // محاسبه مانده مجوز حواله: مقدار مجوز - مجموع حواله‌هاي صادر شده
      const remainingTransferPermit = (p.permitAmount || 0) - totalDelivered;
      
      // مجوز صادر شده است اگر مانده مجوز حواله بزرگتر از صفر باشد
      return remainingTransferPermit > 0;
    });

    const closed = allPermits.filter((p: any) => {
      // ناديده گرفتن مجوزهاي ابطال شده
      if (p.isVoided) return false;
      
      // فقط مجوزهايي که تأييد شده‌اند نمايش داده شوند
      if (!p.approvalDate) return false;
      
      // محاسبه مجموع حواله‌هاي صادر شده از اين مجوز
      const deliveriesForPermit = deliveries.filter(d => d.permitId === p.id && !d.isVoided);
      const totalDelivered = deliveriesForPermit.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      // محاسبه مانده مجوز حواله: مقدار مجوز - مجموع حواله‌هاي صادر شده
      const remainingTransferPermit = (p.permitAmount || 0) - totalDelivered;
      
      // مجوز بسته شده است اگر مانده مجوز حواله صفر يا کمتر از صفر باشد
      // يعني تمام مجوز صادر شده به حواله تبديل شده و باقيمانده ندارد
      return remainingTransferPermit <= 0;
    });

    return { issuedPermits: issued, closedPermits: closed };
  }, [deliveries, storage]);

  // Get receipt information for selected permit
  const receiptInfo = useMemo(() => {
    if (!selectedPermit) return null;

    const receipts = storage.loadData('receipts') || [];
    return receipts.find((r: any) => r.id === selectedPermit.receiptId);
  }, [selectedPermit]);

  // Get addition/subtraction documents for selected permit
  const additionSubtractionDocs = useMemo(() => {
    if (!selectedPermit) return [];

    const allDocs = storage.loadData('inventoryAdjustments') || [];
    return allDocs.filter((doc: any) => 
      doc.contractId === selectedPermit.contractId || 
      doc.permitId === selectedPermit.id
    );
  }, [selectedPermit]);

  // Calculate warehouse inventory - بهبود فرمول محاسبه موجودي
  const warehouseInventory = useMemo(() => {
    const receipts = storage.loadData('receipts') || [];
    const deliveries = storage.loadData('deliveries') || [];
    const additionDocs = storage.loadData('inventoryAdjustments') || [];

    // Group by site and tank
    const inventory: Record<string, any> = {};

    // تفکیک رسیدها بر اساس نوع (امانی/تملیکی)
    const consignmentReceipts = receipts.filter((r: any) => r.userType === 'consignment' && !r.isVoided);
    const ownershipReceipts = receipts.filter((r: any) => r.userType === 'owned' && !r.isVoided);

    // Process consignment receipts - رسيدهاي اماني
    consignmentReceipts.forEach((receipt: any) => {
      const key = `${receipt.siteId}-${receipt.tankId}`;
      if (!inventory[key]) {
        inventory[key] = {
          siteId: receipt.siteId,
          siteName: receipt.siteName,
          tankId: receipt.tankId,
          tankName: receipt.tankName,
          capacity: receipt.tankCapacity || 0,
          totalConsignmentReceipt: 0,
          totalOwnershipReceipt: 0,
          totalConsignmentDelivery: 0,
          totalOwnershipDelivery: 0,
          totalAddition: 0,
          totalSubtraction: 0,
          products: {},
          counterparty: 'امانی/تملیکی'
        };
      }

      inventory[key].totalConsignmentReceipt += receipt.amount || 0;

      // Track products
      if (!inventory[key].products[receipt.productName]) {
        inventory[key].products[receipt.productName] = 0;
      }
      inventory[key].products[receipt.productName] += receipt.amount || 0;
    });

    // Process ownership receipts - رسیدهای تملیکی
    ownershipReceipts.forEach((receipt: any) => {
      const key = `${receipt.siteId}-${receipt.tankId}`;
      if (!inventory[key]) {
        inventory[key] = {
          siteId: receipt.siteId,
          siteName: receipt.siteName,
          tankId: receipt.tankId,
          tankName: receipt.tankName,
          capacity: receipt.tankCapacity || 0,
          totalConsignmentReceipt: 0,
          totalOwnershipReceipt: 0,
          totalConsignmentDelivery: 0,
          totalOwnershipDelivery: 0,
          totalAddition: 0,
          totalSubtraction: 0,
          products: {},
          counterparty: 'امانی/تملیکی'
        };
      }

      inventory[key].totalOwnershipReceipt += receipt.amount || 0;

      // Track products
      if (!inventory[key].products[receipt.productName]) {
        inventory[key].products[receipt.productName] = 0;
      }
      inventory[key].products[receipt.productName] += receipt.amount || 0;
    });

    // Process deliveries - تفکيک حواله‌ها بر اساس نوع
    const consignmentDeliveries = deliveries.filter((d: any) => (d.contractNumber || d.permitId) && !d.isVoided);
    const ownershipDeliveries = deliveries.filter((d: any) => !d.contractNumber && !d.permitId && !d.isVoided);

    // Process consignment deliveries - حواله‌هاي اماني
    consignmentDeliveries.forEach((delivery: any) => {
      const key = `${delivery.siteId}-${delivery.tankId}`;
      if (inventory[key]) {
        inventory[key].totalConsignmentDelivery += delivery.amount || 0;
      }
    });

    // Process ownership deliveries - حواله‌های تملیکی
    ownershipDeliveries.forEach((delivery: any) => {
      const key = `${delivery.siteId}-${delivery.tankId}`;
      if (inventory[key]) {
        inventory[key].totalOwnershipDelivery += delivery.amount || 0;
      }
    });

    // Process addition documents - سند اضافه انبار
    additionDocs.forEach((doc: any) => {
      if (doc.isVoided) return;
      
      if (doc.adjustmentType === 'addition') {
        const key = `${doc.siteId}-${doc.tankId}`;
        if (inventory[key]) {
          inventory[key].totalAddition += doc.quantity || 0;

          // Track products
          if (!inventory[key].products[doc.productName]) {
            inventory[key].products[doc.productName] = 0;
          }
          inventory[key].products[doc.productName] += doc.quantity || 0;
        }
      }
    });

    // Process subtraction documents - سند کسر انبار
    additionDocs.forEach((doc: any) => {
      if (doc.isVoided) return;
      
      if (doc.adjustmentType === 'deduction') {
        const key = `${doc.siteId}-${doc.tankId}`;
        if (inventory[key]) {
          inventory[key].totalSubtraction += doc.quantity || 0;
        }
      }
    });

    // Calculate remaining inventory with improved formula:
    // (جمع تمام رسیدهای امانی + جمع تمام رسیدهای تملیکی + سند اضافه انبار امانی + سند اضافه انبار تملیکی) - 
    // (جمع تمام حواله‌های امانی + جمع تمام حواله‌های تملیکی + سند کسر انبار امانی + سند کسر انبار تملیکی)
    Object.values(inventory).forEach((item: any) => {
      item.remaining = (
        item.totalConsignmentReceipt + 
        item.totalOwnershipReceipt + 
        item.totalAddition - 
        item.totalConsignmentDelivery - 
        item.totalOwnershipDelivery - 
        item.totalSubtraction
      );
      item.remainingCapacity = item.capacity - item.remaining;
    });

    return Object.values(inventory);
  }, []);

  // Handle permit selection
  const handleSelectPermit = useCallback((permit: any) => {
    setSelectedPermit(permit);

    // Load receipt information
    const receipts = storage.loadData('receipts') || [];
    const receiptInfo = receipts.find((r: any) => r.id === permit.receiptId);

    // Load addition/subtraction documents
    const additionDocs = storage.loadData('inventoryAdjustments') || [];
    const additionSubtractionDocs = additionDocs.filter((doc: any) => doc.contractId === permit.contractId);

    // Update selected permit with additional information
    const updatedPermit = {
      ...permit,
      receiptInfo,
      additionSubtractionDocs
    };

    setSelectedPermit(updatedPermit);
  }, [storage]);

  // Calculate remaining inventory for a permit - فرمول صحيح محاسبه مانده موجودي
  const calculateRemainingInventory = useCallback((permitId: string, isEditing: boolean = false, currentTransactionId?: string) => {
    const permits = storage.loadData('delivery-permits') || [];
    const permit = permits.find((p: any) => p.id === permitId);
    
    if (!permit) return 0;
    
    const deliveries = storage.loadData('deliveries') || [];
    const deliveriesForPermit = deliveries.filter(d => d.permitId === permitId && !d.isVoided);
    
    // اصلاح فرمول محاسبه: (مقدار مجوز حواله صادر شده - تمام حواله هاي صادر شده از اين مجوز)
    let totalDelivered = deliveriesForPermit.reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // If editing, subtract the current transaction amount from total delivered to avoid double counting
    // اين بخش فرمول حالت ويرايش را پياده‌سازي مي‌کند
    if (isEditing && currentTransactionId) {
      const currentTransaction = deliveriesForPermit.find(d => d.id === currentTransactionId);
      if (currentTransaction) {
        totalDelivered -= currentTransaction.amount || 0;
      }
    }
    
    // فرمول صحيح: مقدار مجوز - مجموع حواله‌هاي صادر شده
    return permit.permitAmount - totalDelivered;
  }, [storage]);

  // Handle creating delivery from permit - اصلاح منطق تشخيص حالت ايجاد vs ويرايش
  const handleCreateDeliveryFromPermit = useCallback((permit: any) => {
    // دريافت اطلاعات کامل مجوز
    const permits = storage.loadData('delivery-permits') || [];
    const fullPermit = permits.find((p: any) => p.id === permit.id);
    
    // دريافت اطلاعات رسيد انبار مرتبط با مجوز
    const receipts = storage.loadData('receipts') || [];
    const receipt = receipts.find((r: any) => r.id === fullPermit?.receiptId);
    
    // دريافت اطلاعات قرارداد مرتبط با رسيد
    const contracts = storage.loadData('contracts') || [];
    const contract = contracts.find((c: any) => c.id === receipt?.contractId);

    // ايجاد تراکنش جديد - هميشه از نوع اماني از طريق مجوز
    const newDelivery = createNewDelivery('consignment', true);
    
    // Reset states براي حالت ايجاد جديد
    setIsEditingDelivery(false);
    setIsAddingDelivery(true);
    
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
      // اطلاعات طرف حساب و قرارداد
      counterpartyId: fullPermit?.counterpartyId,
      counterpartyName: fullPermit?.counterpartyName,
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
      wastagePercentage: receipt?.wastagePercentage || 0,
      receiptBasisAmount: receipt?.receiptBasisAmount || 0,
      // اطلاعات راننده و حمل
      driverName: receipt?.driverName,
      driverNationalId: receipt?.driverNationalId,
      driverPlateNumber: receipt?.driverPlateNumber,
      shipName: receipt?.shipName,
      // اطلاعات طرف حساب‌هاي ثانويه
      customerCounterpartyName: receipt?.customerCounterpartyName,
      counterpartyLocationName: receipt?.counterpartyLocationName,
      customerCounterpartyLocationName: receipt?.customerCounterpartyLocationName,
      // اطلاعات شماره‌ها
      indexNumber: receipt?.indexNumber,
      cotageNumber: receipt?.cotageNumber,
      quotaNumber: receipt?.quotaNumber,
      registrationOrderNumber: receipt?.registrationOrderNumber,
      // اطلاعات محل تحويل
      internalSiteId: fullPermit?.internalSiteId,
      contractorSiteId: fullPermit?.contractorSiteId,
      locationId: fullPermit?.locationId,
      recipientType: fullPermit?.recipientType || 'company',
      companyLocationId: fullPermit?.companyLocationId,
      customerLocationId: fullPermit?.customerLocationId,
      // مقدار اوليه حواله (حداکثر مقدار مجاز)
      amount: fullPermit?.remainingTransferPermit,
    });
    
    // انتقال به نماي اماني
    setCurrentView('consignment-slip');
  }, [createNewDelivery, storage]);

  // Handle transaction save - اصلاح شده براي مديريت صحيح موجودي مجوز در حالت ويرايش
  const handleSaveTransaction = useCallback(() => {
    // بررسي اطلاعات ضروري
    if (!currentDelivery.permitId && !currentDelivery.contractNumber) {
      alert('خطا: اطلاعات تراکنش ناقص است. مجوز يا شماره قرارداد الزامي است.');
      return;
    }
    
    // validation جديد براي مقدار مجوز حواله
    if (currentDelivery.permitId) {
      const maxAmount = currentDelivery.remainingPermitAmount || 0;
      const currentAmount = currentDelivery.amount || 0;
      
      if (currentAmount > maxAmount) {
        alert(`مقدار حواله نبايد بيشتر از حد مجاز (${formatPersianNumber(maxAmount)}) باشد.`);
        return;
      }
    }

    let newDelivery;
    let isUpdate = isEditingDelivery; // استفاده از وضعيت صحيح

    if (isUpdate) {
      // حالت ويرايش - اطلاعات در همان تراکنش ذخيره مي‌شود
      newDelivery = {
        ...currentDelivery,
        status: 'issued',
        updatedAt: new Date()
      };
    } else {
      // حالت ايجاد - تراکنش جديد ايجاد مي‌شود
      newDelivery = {
        ...currentDelivery,
        id: `delivery_${Date.now()}`,
        transactionNumber: generateTransactionNumber(),
        status: 'issued',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    // 1. ذخيره در ليست اصلي تحويل‌ها (deliveries)
    let updatedDeliveries;
    if (isUpdate) {
      updatedDeliveries = deliveries.map(d => d.id === newDelivery.id ? newDelivery : d);
    } else {
      updatedDeliveries = [...deliveries, newDelivery];
    }
    saveDeliveries(updatedDeliveries);

    // 2. ذخیره در لیست حواله‌های امانی یا تملیکی
    const slipType = newDelivery.userType === 'consignment' ? 'consignment-delivery-slips' : 'ownership-delivery-slips';
    let slips = storage.loadData(slipType) || [];
    let updatedSlips;
    if (isUpdate) {
      updatedSlips = slips.map((s: any) => s.id === newDelivery.id ? newDelivery : s);
    } else {
      updatedSlips = [...slips, newDelivery];
    }
    storage.saveData(slipType, updatedSlips);

    // 3. به‌روزرساني موجودي مجوز (فقط براي مجوزهاي اماني)
    if (newDelivery.permitId) {
      const permits = storage.loadData('delivery-permits') || [];
      const permitIndex = permits.findIndex((p: any) => p.id === newDelivery.permitId);
      
      if (permitIndex !== -1) {
        const permit = permits[permitIndex];
        let amountDifference = 0;

        if (isUpdate) {
          // محاسبه تفاوت مقدار در حالت ويرايش
          const oldDelivery = deliveries.find(d => d.id === newDelivery.id);
          if (oldDelivery) {
            // تفاوت = مقدار جديد - مقدار قديم
            amountDifference = (newDelivery.amount || 0) - (oldDelivery.amount || 0);
          }
        } else {
          // در حالت ايجاد، کل مقدار از موجودي کم مي‌شود
          amountDifference = newDelivery.amount || 0;
        }
        
        // محاسبه مانده جديد: مانده فعلي - تفاوت
        const newRemainingTransferPermit = (permit.remainingTransferPermit || 0) - amountDifference;
        
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
        storage.saveData('delivery-permits', permits);
      }
    }

    // 4. به‌روزرساني state براي نمايش صحيح در جدول
    const reloadedConsignmentSlips = storage.loadData('consignment-delivery-slips') || [];
    const reloadedOwnershipSlips = storage.loadData('ownership-delivery-slips') || [];
    setExistingSlips([...reloadedConsignmentSlips, ...reloadedOwnershipSlips]);

    // Reset form
    setIsAddingDelivery(false);
    setIsEditingDelivery(false);
    setCurrentDelivery({});
    setErrors({});
    setCurrentView('list');
    
    alert(isUpdate ? 'تراکنش با موفقيت ويرايش شد.' : 'تراکنش جديد با موفقيت ذخيره شد.');
  }, [currentDelivery, deliveries, saveDeliveries, storage, isEditingDelivery]);

  // Handle transaction delete - اصلاح شده براي بازگرداني مانده مجوز
  const handleDeleteTransaction = useCallback((transactionToDelete: any) => {
    if (window.confirm('آيا از حذف اين تراکنش اطمينان داريد؟')) {
      const id = transactionToDelete.id;
      const deletedAmount = transactionToDelete.amount || 0;

      // 1. بازگرداني مانده مجوز حواله در صورت وجود permitId
      if (transactionToDelete.permitId) {
        const permits = storage.loadData('delivery-permits') || [];
        const permitIndex = permits.findIndex((p: any) => p.id === transactionToDelete.permitId);
        
        if (permitIndex !== -1) {
          const permit = permits[permitIndex];
          // بازگرداني مقدار حذف شده به مانده مجوز حواله
          permits[permitIndex] = {
            ...permit,
            remainingTransferPermit: (permit.remainingTransferPermit || 0) + deletedAmount,
            updatedAt: new Date()
          };
          storage.saveData('delivery-permits', permits);
        }
      }

      // 2. حذف تراکنش از منبع اصلي (deliveries)
      const updatedDeliveries = deliveries.filter(d => d.id !== id);
      saveDeliveries(updatedDeliveries);
      
      // 3. حذف تراکنش از ليست حواله‌هاي مربوطه
      const slipType = transactionToDelete.contractNumber || transactionToDelete.permitId ? 'consignment' : 'ownership';
      
      if (slipType === 'consignment') {
        const consignmentSlips = storage.loadData('consignment-delivery-slips') || [];
        const updatedConsignmentSlips = consignmentSlips.filter((s: any) => s.id !== id);
        storage.saveData('consignment-delivery-slips', updatedConsignmentSlips);
      } else {
        const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
        const updatedOwnershipSlips = ownershipSlips.filter((s: any) => s.id !== id);
        storage.saveData('ownership-delivery-slips', updatedOwnershipSlips);
      }
      
      // 4. به‌روزرساني state با بارگذاري مجدد از حافظه
      const reloadedConsignmentSlips = storage.loadData('consignment-delivery-slips') || [];
      const reloadedOwnershipSlips = storage.loadData('ownership-delivery-slips') || [];
      setExistingSlips([...reloadedConsignmentSlips, ...reloadedOwnershipSlips]);
      
      // 5. به‌روزرساني deliveries state برای محاسبه مجدد مانده مجوز
      const reloadedDeliveries = storage.loadData('deliveries') || [];
      setDeliveries(reloadedDeliveries);
      
      alert('تراکنش با موفقيت حذف شد و مانده مجوز به‌روزرساني شد.');
    }
  }, [deliveries, saveDeliveries, storage]);

  // تابع جديد براي به‌روزرساني رويداد در تمام جاهاي مرتبط با مجوز
  const updatePermitEvent = useCallback((permitId: string, event: string) => {
    // به‌روزرساني مجوزها
    const permits = storage.loadData('delivery-permits') || [];
    const updatedPermits = permits.map((p: any) => {
      if (p.id === permitId) {
        return { ...p, event, updatedAt: new Date() };
      }
      return p;
    });
    storage.saveData('delivery-permits', updatedPermits);
    
    // به‌روزرساني حواله‌هاي انبار
    const deliveries = storage.loadData('deliveries') || [];
    const updatedDeliveries = deliveries.map((d: any) => {
      if (d.permitId === permitId) {
        return { ...d, event, updatedAt: new Date() };
      }
      return d;
    });
    storage.saveData('deliveries', updatedDeliveries);
    
    // به‌روزرساني حواله‌هاي اماني
    const consignmentSlips = storage.loadData('consignment-delivery-slips') || [];
    const updatedConsignmentSlips = consignmentSlips.map((s: any) => {
      if (s.permitId === permitId) {
        return { ...s, event, updatedAt: new Date() };
      }
      return s;
    });
    storage.saveData('consignment-delivery-slips', updatedConsignmentSlips);
    
    // به‌روزرسانی حواله‌های تملیکی
    const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
    const updatedOwnershipSlips = ownershipSlips.map((s: any) => {
      if (s.permitId === permitId) {
        return { ...s, event, updatedAt: new Date() };
      }
      return s;
    });
    storage.saveData('ownership-delivery-slips', updatedOwnershipSlips);
    
    // به‌روزرساني ليست حواله‌هاي موجود
    setExistingSlips([...updatedConsignmentSlips, ...updatedOwnershipSlips]);
    
    // به‌روزرساني مجوزهاي صادر شده
    setIssuedPermits(prev => prev.map(p => {
      if (p.id === permitId) {
        return { ...p, event, updatedAt: new Date() };
      }
      return p;
    }));
    
    // به‌روزرساني داده‌هاي مشترک
    updateSharedData('permits', updatedPermits);
  }, [storage, updateSharedData]);

  // Handle request correction - اصلاح شده
  const handleRequestCorrection = useCallback((permitId: string) => {
    // Find the permit to check if a delivery has been issued
    const permit = issuedPermits.find((p: any) => p.id === permitId);
    
    if (!permit) {
      alert('خطا: مجوز مورد نظر يافت نشد.');
      return;
    }
    
    // بررسي مي‌کند که آيا براي اين مجوز قبلاً حواله انبار صادر شده است يا خير
    const deliveriesForPermit = deliveries.filter(d => d.permitId === permitId && !d.isVoided);
    
    if (deliveriesForPermit.length > 0) {
      alert('شما مجاز به ثبت "درخواست اصلاحيه" نمي باشيد زيرا از اين شماره مجوز حواله انبار صادر شده است');
      return;
    }
    
    // استفاده از تابع جديد براي به‌روزرساني رويداد
    updatePermitEvent(permitId, 'درخواست اصلاحيه انبار');
    
    alert('درخواست اصلاحيه با موفقيت ثبت شد.');
  }, [issuedPermits, deliveries, updatePermitEvent]);

  // Handle status change - اصلاح شده
  const handleChangeStatus = useCallback((id: string, newStatus: string) => {
    // Find the transaction to get its permit ID
    const transaction = existingSlips.find(s => s.id === id);
    
    if (!transaction) {
      alert('خطا: تراکنش مورد نظر يافت نشد.');
      return;
    }
    
    // Update the delivery status
    const updatedDeliveries = deliveries.map(d =>
      d.id === id ? { ...d, status: newStatus, updatedAt: new Date() } : d
    );
    saveDeliveries(updatedDeliveries);

    // Update the corresponding slip if it exists
    let updatedSlips = [];
    
    if (transaction.userType === 'consignment') {
      const slips = storage.loadData('consignment-delivery-slips') || [];
      updatedSlips = slips.map((s: any) =>
        s.id === id ? { ...s, status: newStatus, updatedAt: new Date() } : s
      );
      storage.saveData('consignment-delivery-slips', updatedSlips);
    } else if (transaction.userType === 'owned') {
      const slips = storage.loadData('ownership-delivery-slips') || [];
      updatedSlips = slips.map((s: any) =>
        s.id === id ? { ...s, status: newStatus, updatedAt: new Date() } : s
      );
      storage.saveData('ownership-delivery-slips', updatedSlips);
    }
    
    // Update existing slips list
    if (transaction.userType === 'consignment') {
      setExistingSlips([...updatedSlips, ...storage.loadData('ownership-delivery-slips') || []]);
    } else {
      setExistingSlips([...storage.loadData('consignment-delivery-slips') || [], ...updatedSlips]);
    }

    // Update the corresponding permit event if status is changed to a specific value
    if (transaction.permitId && (newStatus === 'finalized' || newStatus === 'printed')) {
      const permits = storage.loadData('delivery-permits') || [];
      const updatedPermits = permits.map((p: any) => {
        if (p.id === transaction.permitId) {
          // Add the event to the existing events or create a new events array
          const events = p.events || [];
          events.push({
            id: `event_${Date.now()}`,
            type: 'status_change',
            description: newStatus === 'finalized' ? 'نهايي شدن حواله' : 'چاپ حواله',
            timestamp: new Date(),
            transactionId: id
          });
          
          return { ...p, events, updatedAt: new Date() };
        }
        return p;
      });
      storage.saveData('delivery-permits', updatedPermits);
      
      // Update the shared permits data
      updateSharedData('permits', updatedPermits);
    }

    // اگر وضعيت به "issued" تغيير کرد، پيام "درخواست اصلاحيه انبار" را از ستون "رخداد" پاک کن
    if (newStatus === 'issued' && transaction.permitId) {
      // استفاده از تابع جديد براي حذف رويداد
      updatePermitEvent(transaction.permitId, '');
    }

    alert(`وضعيت با موفقيت به ${
      newStatus === 'draft' ? 'پيش‌نويس' :
      newStatus === 'saved' ? 'ذخيره شده' :
      newStatus === 'issued' ? 'صادره شده' :
      newStatus === 'finalized' ? 'نهايي شده' :
      newStatus === 'printed' ? 'چاپ شده' :
      newStatus === 'correction_requested' ? 'درخواست اصلاحيه' :
      'نامشخص'
    } تغيير يافت.`);
  }, [deliveries, saveDeliveries, existingSlips, storage, updateSharedData, updatePermitEvent]);

  // Handle print transaction - اصلاح شده براي بهبود ظاهر فرم چاپ
  const handlePrintTransaction = useCallback((transaction: any) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('پنجره چاپ باز نشد. لطفاً تنظيمات مرورگر خود را بررسي کنيد.');
      return;
    }

    // Get current date
    const currentDate = new Date().toLocaleDateString('fa-IR');
    
    // Get transaction type in Persian
    const transactionType = transaction.contractNumber ? 'امانی' : 'تملیکی';
    
    // Get transaction date
    const transactionDate = formatPersianDate(new Date(transaction.slipDate || transaction.deliveryDate || transaction.createdAt));
    
    // Create HTML content for printing with improved design
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>چاپ حواله</title>
        <style>
          @media print {
            body {
              font-family: 'Tahoma', sans-serif;
              margin: 0;
              padding: 20px;
              direction: rtl;
              background-color: #fff;
            }
            .print-container {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #333;
              padding: 20px;
              position: relative;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              position: relative;
            }
            .logo {
              position: absolute;
              top: 10px;
              right: 10px;
              width: 150px;
              height: auto;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 18px;
              color: #555;
            }
            .info-section {
              margin-bottom: 25px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              border-bottom: 1px dashed #ccc;
              padding-bottom: 5px;
            }
            .info-label {
              font-weight: bold;
              width: 40%;
            }
            .info-value {
              width: 60%;
              text-align: left;
            }
            .amount-section {
              text-align: center;
              margin: 30px 0;
              padding: 15px;
              border: 2px solid #333;
              border-radius: 5px;
              background-color: #f9f9f9;
            }
            .amount-label {
              font-size: 20px;
              margin-bottom: 10px;
            }
            .amount-value {
              font-size: 28px;
              font-weight: bold;
              color: #000;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 14px;
              color: #666;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
            }
            .signature-box {
              width: 45%;
              text-align: center;
              border-top: 1px solid #333;
              padding-top: 20px;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 100px;
              color: rgba(0, 0, 0, 0.1);
              z-index: -1;
            }
            .barcode {
              text-align: center;
              margin: 20px 0;
            }
            .barcode img {
              height: 50px;
            }
            .print-frame {
              border: 3px double #333;
              padding: 15px;
              margin: 10px 0;
              border-radius: 8px;
              background-color: #f9f9f9;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="watermark">ORIGINAL</div>
          <div class="header">
            <img src="/logo.png" alt="Company Logo" class="logo" />
            <div class="title">حواله انبار ${transactionType}</div>
            <div class="subtitle">شماره حواله: ${transaction.permitNumber || transaction.receiptNumber || transaction.transactionNumber}</div>
          </div>
          
          <div class="print-frame">
            <div class="barcode">
              <img src="https://barcode.tec-it.com/barcode.ashx?data=${transaction.permitNumber || transaction.receiptNumber || transaction.transactionNumber}&code=Code128&multiplebarcodes=false&translate-esc=false&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0" alt="Barcode" />
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <div class="info-label">تاريخ حواله:</div>
                <div class="info-value">${transactionDate}</div>
              </div>
              <div class="info-row">
                <div class="info-label">طرف حساب:</div>
                <div class="info-value">${transaction.counterpartyName || '-'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">محصول:</div>
                <div class="info-value">${transaction.productName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">سايت:</div>
                <div class="info-value">${transaction.siteName || '-'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">مخزن:</div>
                <div class="info-value">${transaction.tankName || '-'}</div>
              </div>
              ${transaction.contractNumber ? `
              <div class="info-row">
                <div class="info-label">شماره قرارداد:</div>
                <div class="info-value">${transaction.contractNumber}</div>
              </div>
              ` : ''}
              ${transaction.permitNumber ? `
              <div class="info-row">
                <div class="info-label">شماره مجوز:</div>
                <div class="info-value">${transaction.permitNumber}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="amount-section">
              <div class="amount-label">AMOUNT</div>
              <div class="amount-value">${formatPersianNumber(transaction.amount)} ${transaction.unit}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>اين حواله در تاريخ ${currentDate} صادر شده است.</p>
            <p>کپي اين حواله بدون امضا معتبر نيست.</p>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <p>امضاي صادر کننده</p>
            </div>
            <div class="signature-box">
              <p>امضاي دريافت کننده</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Write content to the new window
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for the content to load before printing
    printWindow.onload = function() {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  }, []);

  // Toggle "To be checked" status - اصلاح شده برای toggle صحیح
  // Toggle "بررسی گردد" - اصلاح شده: فقط تیک و هایلایت، بدون disabled
  const toggleCheckTransaction = useCallback((transactionId: string) => {
    const newCheckedTransactions = new Set(checkedTransactions);
    
    // Toggle کردن: اگر قبلاً تیک خورده بود، تیک را بردار و اگر نبود، تیک بزن
    if (newCheckedTransactions.has(transactionId)) {
      // حذف کردن تیک
      newCheckedTransactions.delete(transactionId);
    } else {
      // اضافه کردن تیک
      newCheckedTransactions.add(transactionId);
    }
    
    setCheckedTransactions(newCheckedTransactions);
    storage.saveData('checked-transactions', Array.from(newCheckedTransactions));
  }, [checkedTransactions, storage]);

  // Listen for inventory adjustments updates
  useEffect(() => {
    const handleInventoryAdjustmentsUpdated = (event: CustomEvent) => {
      console.log('Inventory adjustments updated:', event.detail);
      
      // Update addition/subtraction documents if a permit is selected
      if (selectedPermit) {
        const allDocs = storage.loadData('inventoryAdjustments') || [];
        const filteredDocs = allDocs.filter((doc: any) => 
          doc.contractId === selectedPermit.contractId || 
          doc.permitId === selectedPermit.id
        );
        
        // Force re-render by updating state
        setSelectedPermit(prev => prev ? { ...prev } : null);
      }
    };
    
    window.addEventListener('inventoryAdjustmentsUpdated', handleInventoryAdjustmentsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('inventoryAdjustmentsUpdated', handleInventoryAdjustmentsUpdated as EventListener);
    };
  }, [selectedPermit, storage]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">در حال بارگذاري...</div>
      </div>
    );
  }

  // Main view with all tables
  if (currentView === 'list') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">حواله انبار</h1>
            <p className="text-gray-600 mt-2">مدیریت حواله‌های انبار امانی و تملیکی</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddDelivery}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              حواله انبار جديد
            </button>
            <button
              onClick={handleAddOwnershipDelivery}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              ثبت حواله تملیکی
            </button>
            <button
              onClick={handleViewOwnershipAcquisitionTable}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <FileText className="h-5 w-5" />
              جدول حواله تملکی
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateDeliveryFromPermit(permit);
                              }}
                              className="text-green-600 hover:text-green-800"
                            >
                              ايجاد حواله
                            </button>
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

          {/* Table 3: Receipt Information */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
              <h2 className="text-xl font-semibold">اطلاعات رسید انبارهای امانی/تملیکی</h2>
            </div>
            <div className="p-4">
              {selectedPermit ? (
                receiptInfo ? (
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">شماره رسيد:</span>
                      <span className="text-gray-900">{receiptInfo.transactionNumber}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">نام محصول:</span>
                      <span className="text-gray-900">{receiptInfo.productName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">سايت:</span>
                      <span className="text-gray-900">{receiptInfo.siteName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">مخزن:</span>
                      <span className="text-gray-900">{receiptInfo.tankName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">مقدار:</span>
                      <span className="text-gray-900">{formatPersianNumber(receiptInfo.amount)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">تاريخ:</span>
                      <span className="text-gray-900">{formatPersianDate(new Date(receiptInfo.receiptDate))}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">درصد افت:</span>
                      <span className="text-gray-900">
                        {receiptInfo.wastagePercentage ? `${receiptInfo.wastagePercentage}%` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">مشتري طرف حساب:</span>
                      <span className="text-gray-900">{receiptInfo.customerCounterpartyName || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">لوکيشن طرف حساب:</span>
                      <span className="text-gray-900">{receiptInfo.counterpartyLocationName || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">لوکيشن مشتري طرف حساب:</span>
                      <span className="text-gray-900">{receiptInfo.customerCounterpartyLocationName || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">شماره شاخص /ثبت سفارش:</span>
                      <span className="text-gray-900">{receiptInfo.indexNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">شماره کوتاژ:</span>
                      <span className="text-gray-900">{receiptInfo.cotageNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">نام کشتي:</span>
                      <span className="text-gray-900">{receiptInfo.shipName || '-'}</span>
                    </div>
                    {receiptInfo.driverName && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium text-gray-700">نام راننده:</span>
                        <span className="text-gray-900">{receiptInfo.driverName}</span>
                      </div>
                    )}
                    {receiptInfo.driverNationalId && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium text-gray-700">کد ملي راننده:</span>
                        <span className="text-gray-900">{receiptInfo.driverNationalId}</span>
                      </div>
                    )}
                    {receiptInfo.driverPlateNumber && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium text-gray-700">شماره پلاک راننده:</span>
                        <span className="text-gray-900">{receiptInfo.driverPlateNumber}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    اطلاعات رسيد انبار يافت نشد.
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  لطفاً يک مورد را از جدول "مجوزهاي صادر شده" انتخاب کنيد.
                </div>
              )}
            </div>
          </div>

          {/* Table 4: Addition/Subtraction Documents */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
              <h2 className="text-xl font-semibold">سند کسر انبار/سند اضافه انبار</h2>
              <p className="text-sm mt-1">اسناد مرتبط با قرارداد و مجوز انتخاب شده</p>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره سند</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصول</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعيت</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {additionSubtractionDocs.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.documentNumber || doc.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          doc.adjustmentType === 'addition' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {doc.adjustmentType === 'addition' ? 'اضافه انبار' : 'کسر انبار'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {doc.productName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatPersianNumber(doc.quantity)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatPersianDate(new Date(doc.documentDate))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          doc.status === 'temporary' ? 'bg-yellow-100 text-yellow-800' :
                          doc.status === 'printed' ? 'bg-blue-100 text-blue-800' :
                          doc.status === 'attached' ? 'bg-purple-100 text-purple-800' :
                          doc.status === 'finalized' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.status === 'temporary' ? 'موقت' :
                           doc.status === 'printed' ? 'چاپ شده' :
                           doc.status === 'attached' ? 'ضميمه شده' :
                           doc.status === 'finalized' ? 'نهايي شده' :
                           'نامشخص'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {additionSubtractionDocs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  هيچ سند کسر/اضافه انباري مرتبط با قرارداد و مجوز انتخاب شده وجود ندارد.
                </div>
              )}
            </div>
          </div>

          {/* Table 5: Permit Details - New section */}
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

          {/* Table 6: Warehouse Inventory */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden lg:col-span-2">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4">
              <h2 className="text-xl font-semibold">موجودي انبار</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سايت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مخزن</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ظرفيت کل</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">موجودي فعلي</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ظرفيت خالي</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع کالا</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طرف حساب</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {warehouseInventory.map((item: any, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.siteName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.tankName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatPersianNumber(item.capacity)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatPersianNumber(item.remaining)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatPersianNumber(item.remainingCapacity)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {Object.keys(item.products).join(', ')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.counterparty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {warehouseInventory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  هيچ اطلاعاتي براي نمايش وجود ندارد.
                </div>
              )}
            </div>
          </div>

          {/* Table 7: Registered Transactions - اصلاح شده */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden lg:col-span-2">
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-4">
              <h2 className="text-xl font-semibold">تراکنش‌های ثبت شده امانی/تملیکی</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره تراکنش</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طرف حساب</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصول</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سايت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مخزن</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعيت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رخداد</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عمليات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
  {existingSlips
    .filter((slip: any) => {
      // فقط حواله‌های امانی/تملیکی ثبت شده را نمایش بده
      // حواله امانی: دارای permitId یا contractNumber (از consignment-delivery-slips)
      // حواله تملیکی: از ownership-delivery-slips (دارای userType === 'owned')
      // باید واقعاً یک حواله باشد (نه رسید یا تراکنش دیگر)
      
      // بررسی اینکه آیا این یک حواله امانی است
      // حواله امانی باید amount داشته باشد (حواله واقعی باشد، نه رسید)
      const isConsignmentDelivery = (slip.permitId || slip.contractNumber || slip.userType === 'consignment') && 
                                     slip.amount && 
                                     parseFloat(slip.amount?.toString() || '0') > 0;
      
      // بررسی اینکه آیا این یک حواله تملیکی است
      // حواله تملیکی باید amount داشته باشد (حواله واقعی باشد)
      const isOwnershipDelivery = slip.userType === 'owned' && 
                                   !slip.permitId && 
                                   !slip.contractNumber && 
                                   slip.amount && 
                                   parseFloat(slip.amount?.toString() || '0') > 0;
      
      // فقط حواله‌های امانی یا تملیکی را نمایش بده که amount دارند (نه رسیدها یا تراکنش‌های دیگر)
      return isConsignmentDelivery || isOwnershipDelivery;
    })
    .map((slip: any) => {
    // تعيين نوع حواله بر اساس وجود شماره قرارداد یا permitId
    const slipType = (slip.contractNumber || slip.permitId) ? 'امانی' : 'تملیکی';
    
    // Check if this transaction is marked for checking
    const isChecked = checkedTransactions.has(slip.id);
    
    return (
      <tr
        key={slip.id}
        // هایلایت کردن سطر در صورت تیک خوردن
        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isChecked ? 'bg-yellow-100' : ''}`}
        onClick={() => slip.permitId && handleViewPermitDetails(getPermitInfo(slip.permitId))}
      >
        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
          {slip.permitNumber || slip.receiptNumber || slip.transactionNumber}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            slipType === 'اماني' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          }`}>
            {slipType}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
          {slip.counterpartyName || '-'}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
          {slip.productName}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
          {formatPersianNumber(slip.amount)} {slip.unit}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
          {slip.siteName || '-'}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
          {slip.tankName || '-'}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
          {formatPersianDate(new Date(slip.slipDate || slip.deliveryDate || slip.createdAt))}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            slip.status === 'draft' ? 'bg-gray-100 text-gray-800' :
            slip.status === 'saved' ? 'bg-blue-100 text-blue-800' :
            slip.status === 'issued' ? 'bg-green-100 text-green-800' :
            slip.status === 'finalized' ? 'bg-green-100 text-green-800' :
            slip.status === 'printed' ? 'bg-purple-100 text-purple-800' :
            slip.status === 'correction_requested' ? 'bg-yellow-100 text-yellow-800' :
            slip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {slip.status === 'draft' ? 'پيش‌نويس' :
             slip.status === 'saved' ? 'ذخيره شده' :
             slip.status === 'issued' ? 'صادره شده' :
             slip.status === 'finalized' ? 'نهايي شده' :
             slip.status === 'printed' ? 'چاپ شده' :
             slip.status === 'correction_requested' ? 'درخواست اصلاحيه' :
             slip.status === 'cancelled' ? 'ابطال شده' :
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrintTransaction(slip);
              }}
              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
              title="چاپ"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCheckTransaction(slip.id);
              }}
              className={`p-1 rounded transition-colors ${
                isChecked 
                  ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              title="بررسي گردد"
            >
              {isChecked ? (
                <CheckSquare className="h-4 w-4 fill-current" />
              ) : (
                <CheckSquare className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTransaction(slip);
              }}
              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 transition-colors"
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
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
          </div>
        </div>

        {showDeliverySlipTypeSelector && (
          <DeliverySlipTypeSelector
            onSelectType={handleSelectDeliverySlipType}
            onCancel={() => setShowDeliverySlipTypeSelector(false)}
            deliveryCreationMode={deliveryCreationMode}
          />
        )}
      </div>
    );
  }

  // Consignment slip view
  if (currentView === 'consignment-slip') {
    return (
      <ConsignmentDeliverySlip
        baseData={baseData}
        onBack={handleBackToList}
        initialData={isEditingDelivery ? currentDelivery : selectedPermit}
        onSave={handleSaveTransaction}
        calculateRemainingInventory={(permitId) => calculateRemainingInventory(permitId, isEditingDelivery, currentDelivery.id)}
        checkedTransactions={checkedTransactions}
        setCheckedTransactions={setCheckedTransactions}
        disabledTransactions={disabledTransactions}
        setDisabledTransactions={setDisabledTransactions}
      />
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

  // Ownership acquisition table view
  if (currentView === 'ownership-acquisition-table') {
    return (
      <OwnershipAcquisitionTable
        baseData={baseData}
        onBack={handleBackToList}
        onSave={handleSaveTransaction}
        calculateRemainingInventory={(siteId, tankId, currentSlipId, isEditing) => calculateRemainingInventory('', isEditing, currentSlipId)}
        checkedTransactions={checkedTransactions}
        setCheckedTransactions={setCheckedTransactions}
        disabledTransactions={disabledTransactions}
        setDisabledTransactions={setDisabledTransactions}
      />
    );
  }

  return null;
};

export default WarehouseDeliveryManager;