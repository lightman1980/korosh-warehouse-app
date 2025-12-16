import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ArrowLeft, Save, Edit2, X, Printer, Calendar, Trash2, Plus, AlertCircle, CheckCircle, Info, FileText, Package, Users, Settings, Download, Eye, CheckSquare } from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../Common/PersianDatePicker';

// تعريف تايپ‌ها براي اطلاعات حواله
interface ConsignmentSlipInfo {
  id: string;
  permitId: string;
  receiptId: string;
  counterpartyId: string;
  contractId: string;
  permitNumber: string;
  managementLetterNumber: string;
  amount: number;
  // فيلد جديد براي مقدار مجوز حواله
  permitAmount: number;
  // فيلد جديد براي مانده مجوز حواله
  remainingPermitAmount: number;
  slipDate: Date;
  internalSiteId: string;
  contractorSiteId: string;
  locationId: string;
  recipientType: 'company' | 'customer';
  companyLocationId?: string;
  customerLocationId?: string;
  // اين فيلدها از مجوز و رسيد خوانده مي‌شوند و فقط نمايش داده مي‌شوند
  counterpartyName: string;
  contractNumber: string;
  receiptNumber: string;
  productName: string;
  siteName: string;
  tankName: string;
  unit: string;
  wastageAmount: number;
  finalPermitAmount: number;
  remainingTransferPermit: number;
  permitDate: Date;
  approvalDate: Date;
  status: string;
  event: string;
  // فيلدهاي جديد از رسيد
  quotaNumber?: string;
  registrationOrderNumber?: string;
  receiptBasisAmount?: number;
  driverName?: string;
  driverNationalId?: string;
  driverPlateNumber?: string;
  shipName?: string;
  wastagePercentage?: number;
  customerCounterpartyName?: string;
  counterpartyLocationName?: string;
  customerCounterpartyLocationName?: string;
  indexNumber?: string;
  cotageNumber?: string;
  // فيلدهاي مربوط به سايت و مخزن
  siteId?: string;
  tankId?: string;
  // فيلد جديد براي بررسي وضعيت صدور حواله
  hasIssuedSlip?: boolean;
}

interface Props {
  onBack: () => void;
  baseData?: any;
  initialData?: any;
  onSave?: (data: any) => void;
  calculateRemainingInventory?: (permitId: string, isEditing?: boolean, currentTransactionId?: string) => number;
  checkedTransactions?: Set<string>;
  setCheckedTransactions?: React.Dispatch<React.SetStateAction<Set<string>>>;
  disabledTransactions?: Set<string>;
  setDisabledTransactions?: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const ConsignmentDeliverySlip: React.FC<Props> = ({ 
  onBack, 
  baseData: propBaseData, 
  initialData, 
  onSave, 
  calculateRemainingInventory,
  checkedTransactions: propCheckedTransactions = new Set(),
  setCheckedTransactions: propSetCheckedTransactions,
  disabledTransactions: propDisabledTransactions = new Set(),
  setDisabledTransactions: propSetDisabledTransactions
}) => {
  const [availablePermits, setAvailablePermits] = useState<ConsignmentSlipInfo[]>([]);
  const [selectedSlipInfo, setSelectedSlipInfo] = useState<ConsignmentSlipInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [baseData, setBaseData] = useState<any>(propBaseData || {});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedPermitNumber, setSelectedPermitNumber] = useState('');
  // متغير جديد براي تشخيص اينکه آيا از کامپوننت والد براي ويرايش آمده‌ايم يا خير
  const [isEditingFromParent, setIsEditingFromParent] = useState(false);
  // متغير جديد براي تشخيص اينکه آيا از مسير "ايجاد حواله" آمده‌ايم يا خير
  const [isCreatingFromPermit, setIsCreatingFromPermit] = useState(false);
  
  // State for "To be checked" field
  const [checkedTransactions, setCheckedTransactions] = useState<Set<string>>(propCheckedTransactions);
  const [disabledTransactions, setDisabledTransactions] = useState<Set<string>>(propDisabledTransactions);
  
  const storage = DataStorage.getInstance();

  // تابع محاسبه موجودي مخزن - با فرمول جديد براي حالت ويرايش و ايجاد
 // تابع محاسبه موجودي مخزن - با فرمول جديد براي حالت ويرايش و ايجاد
// تابع محاسبه موجودي مخزن - با فرمول جديد براي حالت ويرايش و ايجاد
const calculateTankInventory = useCallback((siteId: string, tankId: string, permitId?: string, currentSlipId?: string, isCreating: boolean = false) => {
  // فرمول جدید "مانده موجودی مخزن در سایت":
  // (جمع تمام رسیدهای امانی انجام شده در آن سایت و در آن مخزن + 
  //  جمع تمام رسیدهای تملیکی انجام شده در آن سایت و در آن مخزن + 
  //  سند اضافه انبار امانی در آن سایت و در آن مخزن + 
  //  سند اضافه انبار تملیکی در آن سایت و در آن مخزن) - 
  // (جمع تمام حواله های امانی انجام شده در آن سایت و در آن مخزن + 
  //  جمع تمام حواله های تملیکی انجام شده در آن سایت و در آن مخزن + 
  //  سند کسر انبار امانی در آن سایت و در آن مخزن + 
  //  سند کسر انبار تملیکی در آن سایت و در آن مخزن)

  const receipts = storage.loadData('receipts') || [];
  const consignmentSlips = storage.loadData('consignment-delivery-slips') || [];
  const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
  const tankAdjustmentSlips = storage.loadData('tank-adjustment-slips') || [];
  const inventoryAdjustments = storage.loadData('inventoryAdjustments') || [];

  // محاسبه رسیدهای امانی و تملیکی
  const totalReceipts = receipts
    .filter((r: any) => r.siteId === siteId && r.tankId === tankId && !r.isVoided)
    .reduce((sum, r) => sum + (r.finalAmount || r.amount || 0), 0);

  // محاسبه سندهای اضافه انبار امانی و تملیکی (tankAdjustmentSlips)
  const totalTankAdditions = tankAdjustmentSlips
    .filter((t: any) => t.siteId === siteId && t.tankId === tankId && t.type === 'add' && !t.isVoided)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // اضافه کردن inventoryAdjustments که نوع addition دارند
  const totalInventoryAdditions = inventoryAdjustments
    .filter((doc: any) => doc.siteId === siteId && doc.tankId === tankId && doc.adjustmentType === 'addition' && !doc.isVoided)
    .reduce((sum, doc: any) => sum + (doc.quantity || 0), 0);

  // محاسبه تمام افت های امانی (wastage)
  // توجه: افت نباید به موجودی اضافه شود، چون از مقدار رسید کسر می‌شود
  // finalAmount در رسیدها قبلاً افت را در نظر گرفته است
  // اما بر اساس فرمول کاربر، افت باید به ورودی اضافه شود
  const consignmentReceipts = receipts.filter((r: any) => r.userType === 'consignment' && r.siteId === siteId && r.tankId === tankId && !r.isVoided);
  const totalConsignmentLosses = consignmentReceipts.reduce((sum, r) => sum + Math.abs(r.wastageWeight || 0), 0);

  // محاسبه حواله های امانی (Consignment) - حذف حواله فعلی در حالت ویرایش/ایجاد
  const totalConsignmentDeliveries = consignmentSlips
    .filter((s: any) => {
      // در حالت ایجاد، حواله فعلی هنوز ذخیره نشده پس نیازی به فیلتر نیست
      // در حالت ویرایش، حواله فعلی را حذف کن
      if (isCreating && !currentSlipId) {
        // حالت ایجاد: همه حواله‌های ذخیره شده را حساب کن (حواله فعلی هنوز ذخیره نشده)
        return s.siteId === siteId && s.tankId === tankId && !s.isVoided;
      } else if (currentSlipId) {
        // حالت ویرایش: حواله فعلی را حذف کن
        return s.siteId === siteId && s.tankId === tankId && !s.isVoided && s.id !== currentSlipId;
      }
      // حالت عادی: همه را حساب کن
      return s.siteId === siteId && s.tankId === tankId && !s.isVoided;
    })
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  // محاسبه حواله های تملیکی (Ownership) - در حالت ایجاد حواله امانی، حواله فعلی تملیکی را حذف نکن
  const totalOwnershipDeliveries = ownershipSlips
    .filter((s: any) => s.siteId === siteId && s.tankId === tankId && !s.isVoided)
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  // محاسبه سندهای کسر انبار امانی و تملیکی (tankAdjustmentSlips)
  const totalTankDeductions = tankAdjustmentSlips
    .filter((t: any) => t.siteId === siteId && t.tankId === tankId && t.type === 'deduct' && !t.isVoided)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // اضافه کردن inventoryAdjustments که نوع deduction دارند
  const totalInventoryDeductions = inventoryAdjustments
    .filter((doc: any) => doc.siteId === siteId && doc.tankId === tankId && doc.adjustmentType === 'deduction' && !doc.isVoided)
    .reduce((sum, doc: any) => sum + (doc.quantity || 0), 0);

  // فرمول کلی: مجموع ورودی - مجموع خروجی
  // طبق درخواست کاربر: افت‌های امانی باید به ورودی اضافه شود
  const totalInputs = totalReceipts + totalTankAdditions + totalInventoryAdditions + totalConsignmentLosses;
  const totalOutputs = totalConsignmentDeliveries + totalOwnershipDeliveries + totalTankDeductions + totalInventoryDeductions;
  
  // اجازه نمایش موجودی منفی برای نشان دادن مشکل - اما در validation باید 0 در نظر گرفته شود
  return totalInputs - totalOutputs;
}, [storage]);

  // تابع محاسبه مانده مجوز حواله با در نظر گرفتن حالت ایجاد/ویرایش
  const calculateRemainingPermitAmount = useCallback((permitId: string, permitAmount: number, currentSlipId?: string, isEditing: boolean = false) => {
    const slips = storage.loadData('consignment-delivery-slips') || [];
    
    // در حالت ویرایش، حواله فعلی را از محاسبه حذف کن
    // در حالت ایجاد، همه حواله‌های موجود را در نظر بگیر (حواله فعلی هنوز ذخیره نشده)
    const registeredSlips = slips.filter((s: any) => {
      if (s.permitId !== permitId) return false;
      // در حالت ویرایش، حواله فعلی را حذف کن
      if (isEditing && currentSlipId && s.id === currentSlipId) return false;
      return true;
    });
    
    const totalRegisteredAmount = registeredSlips.reduce((sum: number, slip: any) => sum + (slip.amount || 0), 0);
    const remainingAmount = permitAmount - totalRegisteredAmount;
    return Math.max(0, remainingAmount);
  }, [storage]);

  useEffect(() => {
    if (propBaseData && Object.keys(propBaseData).length > 0) {
      setBaseData(propBaseData);
      return;
    }

    const loadBaseData = () => {
      try {
        const categories = storage.loadData('baseDataCategories') || [];
        const internalSites = categories.find((c: any) => c.id === 'internal-sites')?.items || [];
        const contractorSites = categories.find((c: any) => c.id === 'contractor-sites')?.items || [];
        const companies = categories.find((c: any) => c.id === 'companies')?.items || [];
        const customerCompanies = categories.find((c: any) => c.id === 'customer-companies')?.items || [];
        const locations = categories.find((c: any) => c.id === 'locations')?.items || [];
        const companiesLocation = categories.find((c: any) => c.id === 'companies-location')?.items || [];
        const customerCompaniesLocation = categories.find((c: any) => c.id === 'customer-companies-location')?.items || [];
        const drivers = categories.find((c: any) => c.id === 'drivers')?.items || [];

        setBaseData({
          internalSites,
          contractorSites,
          companies,
          customerCompanies,
          locations,
          companiesLocation,
          customerCompaniesLocation,
          drivers
        });
      } catch (error) {
        console.error('Error loading base data:', error);
      }
    };

    loadBaseData();

    const handleBaseDataUpdate = () => {
      loadBaseData();
    };

    window.addEventListener('baseDataUpdated', handleBaseDataUpdate);

    return () => {
      window.removeEventListener('baseDataUpdated', handleBaseDataUpdate);
    };
  }, [propBaseData, storage]);

  // اين useEffect را براي مديريت initialData به طور کامل جايگزين کنيد
  useEffect(() => {
    if (initialData) {
      // اگر داده اوليه يک آيدي معتبر دارد (نه يک آيدي جديد)، پس حالت ويرايش است
      if (initialData.id && !initialData.id.startsWith('new_')) {
        setIsEditingFromParent(true);
        setIsEditing(true); // فعال کردن فرم براي ويرايش
        setEditingSlipId(initialData.id); // تنظيم آيدي رکوردي که ويرايش مي‌شود
        
        // پر کردن فرم با داده‌هاي موجود + محاسبه مجدد مانده مجوز حواله بر اساس فرمول ويرايش (ب)
        const permits = storage.loadData('delivery-permits') || [];
        const permit = permits.find((p: any) => p.id === initialData.permitId);
        const permitAmount = permit ? (permit.permitAmount || permit.amount || 0) : (initialData.permitAmount || 0);
        const remainingForEdit = calculateRemainingPermitAmount(
          initialData.permitId,
          permitAmount,
          initialData.id,
          true
        );
        setSelectedSlipInfo({ ...initialData, remainingPermitAmount: remainingForEdit });
      } else {
        // در غير اين صورت، يک رکورد جديد از روي مجوز در حال ساخت است
        setIsCreatingFromPermit(true);
        handleSelectPermit(initialData);
      }
    }
  }, [initialData]);

  useEffect(() => {
    const permits = storage.loadData('delivery-permits') || [];
    const receipts = storage.loadData('receipts') || [];
    const contracts = storage.loadData('contracts') || [];
    const slips = storage.loadData('consignment-delivery-slips') || [];

    const validPermits = permits
      .filter((p: any) => p.status === 'issued' && p.remainingTransferPermit > 0)
      .map((p: any) => {
        const receipt = receipts.find((r: any) => r.id === p.receiptId);
        const contract = contracts.find((c: any) => c.id === receipt?.contractId);
        
        const permitAmountValue = p.permitAmount || p.amount || p.permit_amount || p.finalPermitAmount || p.final_permit_amount || 0;
        // محاسبه مانده مجوز حواله برای نمایش در لیست (حالت ایجاد - بدون حواله فعلی)
        const remainingPermitAmount = calculateRemainingPermitAmount(
          p.id, 
          parseFloat(permitAmountValue?.toString() || '0'),
          undefined, // currentSlipId - در لیست حواله فعلی نداریم
          false // isEditing - در لیست همیشه حالت ایجاد است
        );
        const registeredSlips = slips.filter((s: any) => s.permitId === p.id);
        const hasIssuedSlip = registeredSlips.length > 0;
        
        return {
          ...p,
          receipt,
          contract,
          permitAmount: parseFloat(permitAmountValue?.toString() || '0'),
          remainingPermitAmount,
          counterpartyName: receipt?.counterpartyName,
          contractNumber: contract?.contractNumber,
          receiptNumber: receipt?.transactionNumber,
          productName: receipt?.productName,
          siteName: receipt?.siteName,
          tankName: receipt?.tankName,
          unit: receipt?.unit || contract?.unit || 'kg',
          siteId: receipt?.siteId,
          tankId: receipt?.tankId,
          hasIssuedSlip
        };
      });

    setAvailablePermits(validPermits);
  }, [storage, calculateRemainingPermitAmount]);

  const filteredPermits = useMemo(() => {
    return availablePermits.filter(permit =>
      permit.systemPermitNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.managementLetterNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.counterpartyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.permitNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availablePermits, searchTerm]);

  const handleDownloadData = useCallback(() => {
    try {
      const dataForExcel = filteredPermits.map(permit => ({
        'شماره مجوز': permit.systemPermitNumber || permit.permitNumber,
        'شماره نامه مديريت': permit.managementLetterNumber,
        'طرف حساب': permit.counterpartyName,
        'مقدار مجوز حواله': permit.permitAmount || 0,
        'مانده مجوز حواله': permit.remainingPermitAmount || 0,
        'تاريخ حواله': permit.slipDate ? formatPersianDate(new Date(permit.slipDate)) : '',
        'سايت داخلي': baseData.internalSites?.find((s: any) => s.id === permit.internalSiteId)?.name || '',
        'سايت پيمانکار': baseData.contractorSites?.find((s: any) => s.id === permit.contractorSiteId)?.name || '',
        'لوکيشن': baseData.locations?.find((l: any) => l.id === permit.locationId)?.name || '',
        'وضعيت': permit.status === 'issued' ? 'صادر شده' : permit.status === 'draft' ? 'پيش‌نويس' : 'ابطال شده',
        'رخداد': permit.event || ''
      }));

      const headers = Object.keys(dataForExcel[0] || {});
      const csvContent = [
        headers.join(','),
        ...dataForExcel.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `consignment_slips_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('داده‌ها با موفقيت دانلود شد.');
    } catch (error) {
      console.error('Error downloading data:', error);
      alert('خطا در دانلود داده‌ها. لطفاً دوباره تلاش کنيد.');
    }
  }, [filteredPermits, baseData]);

  const handleRequestCorrection = useCallback(() => {
    if (!selectedSlipInfo) {
      alert('لطفاً ابتدا يک حواله را انتخاب کنيد.');
      return;
    }

    const updatedSlipInfo = {
      ...selectedSlipInfo,
      event: 'درخواست اصلاحيه',
      updatedAt: new Date()
    };

    const slips = storage.loadData('consignment-delivery-slips') || [];
    const updatedSlips = slips.map((s: any) => s.id === selectedSlipInfo.id ? updatedSlipInfo : s);
    storage.saveData('consignment-delivery-slips', updatedSlips);

    const permits = storage.loadData('delivery-permits') || [];
    const updatedPermits = permits.map((p: any) => {
      if (p.id === selectedSlipInfo.permitId) {
        return { ...p, event: 'درخواست اصلاحيه انبار', updatedAt: new Date() };
      }
      return p;
    });
    storage.saveData('delivery-permits', updatedPermits);

    const deliveries = storage.loadData('deliveries') || [];
    const updatedDeliveries = deliveries.map((d: any) => {
      if (d.permitId === selectedSlipInfo.permitId) {
        return { ...d, event: 'درخواست اصلاحيه', updatedAt: new Date() };
      }
      return d;
    });
    storage.saveData('deliveries', updatedDeliveries);

    setSelectedSlipInfo(updatedSlipInfo);
    setAvailablePermits(prev => prev.map(p => p.id === selectedSlipInfo.permitId ? { ...p, event: 'درخواست اصلاحيه انبار' } : p));

    alert('درخواست اصلاحيه با موفقيت ثبت شد.');
  }, [selectedSlipInfo, storage]);

  const handleSelectPermit = (permit: any) => {
    const receipts = storage.loadData('receipts') || [];
    const receipt = receipts.find((r: any) => r.id === permit.receiptId);
    
    // تعیین حالت: ایجاد یا ویرایش
    const currentSlipId = editingSlipId || (isEditingFromParent ? selectedSlipInfo?.id : null);
    const isEditingMode = !!currentSlipId;
    
    // محاسبه مانده مجوز حواله بر اساس فرمول:
    // الف) حالت ایجاد: مانده = مقدار مجوز اولیه - کل حواله‌های صادر شده
    // ب) حالت ویرایش: مانده = مقدار مجوز اولیه - کل حواله‌های صادر شده (به جز حواله فعلی)
    const permitAmount = parseFloat((permit.permitAmount || permit.amount || 0)?.toString() || '0');
    const remainingPermitAmount = calculateRemainingPermitAmount(
      permit.permitId || permit.id, 
      permitAmount,
      currentSlipId || undefined,
      isEditingMode
    );
    
    // همچنین از remainingTransferPermit مجوز هم استفاده می‌کنیم (که باید به‌روز باشد)
    const remainingTransferPermitFromPermit = permit.remainingTransferPermit !== undefined 
      ? parseFloat(permit.remainingTransferPermit?.toString() || '0')
      : remainingPermitAmount;
    
    const slips = storage.loadData('consignment-delivery-slips') || [];
    const registeredSlips = slips.filter((s: any) => s.permitId === (permit.permitId || permit.id));
    const hasIssuedSlip = registeredSlips.length > 0;

    // تعيين مقدار اوليه amount بر اساس حالت (ايجاد vs ويرايش):
    // الف) حالت ايجاد: amount = مانده مجوز (اجازه ثبت کمتر وجود دارد)
    // ب) حالت ويرايش: amount = مقدار فعلي حواله (حفظ مي‌شود)
    let initialAmount = 0;
    if (isEditingFromParent && selectedSlipInfo?.amount) {
      // حالت ويرايش: حفظ مقدار فعلي حواله
      initialAmount = selectedSlipInfo.amount;
    } else {
      // حالت ايجاد: مقدار اولیه را برابر مانده مجوز قرار می‌دهیم (تا کاربر بتواند آن را کمتر کند)
      // علاوه بر آن، سقف را با موجودی مخزن هم کنترل می‌کنیم
      const remainingInventory = calculateTankInventory(
        permit.siteId,
        permit.tankId,
        permit.permitId || permit.id,
        undefined,
        true
      );
      initialAmount = Math.max(0, Math.min(remainingPermitAmount, remainingInventory));
    }

    const newSlipInfo: ConsignmentSlipInfo = {
      id: permit.id || `slip_${Date.now()}`,
      permitId: permit.permitId || permit.id,
      receiptId: permit.receiptId,
      counterpartyId: permit.receipt?.counterpartyId || permit.counterpartyId,
      contractId: permit.contractId,
      permitNumber: permit.systemPermitNumber || permit.permitNumber,
      managementLetterNumber: permit.managementLetterNumber,
      amount: initialAmount,
      // مقدار مجوز حواله: از permit.permitAmount استفاده می‌کنیم (نه کل رسید انبار)
      permitAmount: parseFloat((permit.permitAmount || permit.amount || 0)?.toString() || '0'),
      remainingPermitAmount,
      slipDate: new Date(permit.slipDate) || new Date(),
      internalSiteId: permit.internalSiteId || '',
      contractorSiteId: permit.contractorSiteId || '',
      locationId: permit.locationId || '',
      recipientType: permit.recipientType || 'company',
      companyLocationId: permit.companyLocationId || '',
      customerLocationId: permit.customerLocationId || '',
      counterpartyName: permit.counterpartyName,
      contractNumber: permit.contractNumber,
      receiptNumber: permit.receiptNumber,
      productName: permit.productName,
      siteName: permit.siteName,
      tankName: permit.tankName,
      unit: permit.unit,
      wastageAmount: parseFloat(permit.wastageAmount?.toString() || '0'),
      finalPermitAmount: parseFloat(permit.finalPermitAmount?.toString() || '0'),
      // استفاده از مقدار محاسبه شده برای remainingPermitAmount و remainingTransferPermit
      remainingTransferPermit: remainingPermitAmount, // استفاده از مقدار محاسبه شده
      permitDate: new Date(permit.permitDate),
      approvalDate: new Date(permit.approvalDate),
      status: permit.status,
      event: permit.event,
      quotaNumber: receipt?.quotaNumber,
      registrationOrderNumber: receipt?.registrationOrderNumber,
      receiptBasisAmount: parseFloat(receipt?.receiptBasisAmount?.toString() || '0'),
      driverName: receipt?.driverName,
      driverNationalId: receipt?.driverNationalId,
      driverPlateNumber: receipt?.driverPlateNumber,
      shipName: receipt?.shipName,
      wastagePercentage: parseFloat(receipt?.wastagePercentage?.toString() || '0'),
      customerCounterpartyName: receipt?.customerCounterpartyName,
      counterpartyLocationName: receipt?.counterpartyLocationName,
      customerCounterpartyLocationName: receipt?.customerCounterpartyLocationName,
      indexNumber: receipt?.indexNumber,
      cotageNumber: receipt?.cotageNumber,
      siteId: permit.siteId,
      tankId: permit.tankId,
      hasIssuedSlip
    };
    
    setSelectedSlipInfo(newSlipInfo);
    setIsEditing(true); // هميشه در حالت ويرايش قرار بگيرد
  };

  const handleEditSlip = (permit: any) => {
    // در حالت ويرايش مستقيم، ابتدا editingSlipId را تنظيم می‌کنيم
    setEditingSlipId(permit.id);
    setIsCreatingFromPermit(false);
    setIsEditingFromParent(false);
    // سپس handleSelectPermit را صدا می‌کنيم
    handleSelectPermit(permit);
    setIsEditing(true);
  };

  const handleDeleteSlip = (slipId: string) => {
    if (confirm('آيا از حذف اين حواله اطمينان داريد؟')) {
      // 1. دریافت اطلاعات حواله قبل از حذف
      const slips = storage.loadData('consignment-delivery-slips') || [];
      const slipToDelete = slips.find((s: any) => s.id === slipId);
      
      if (!slipToDelete) {
        alert('خطا: حواله مورد نظر يافت نشد.');
        return;
      }

      const deletedAmount = slipToDelete.amount || 0;
      const permitId = slipToDelete.permitId;

      // 2. بازگردانی مانده مجوز حواله در صورت وجود permitId
      if (permitId) {
        const permits = storage.loadData('delivery-permits') || [];
        const permitIndex = permits.findIndex((p: any) => p.id === permitId);
        
        if (permitIndex !== -1) {
          const permit = permits[permitIndex];
          // بازگردانی مقدار حذف شده به مانده مجوز حواله
          permits[permitIndex] = {
            ...permit,
            remainingTransferPermit: (permit.remainingTransferPermit || 0) + deletedAmount,
            updatedAt: new Date()
          };
          storage.saveData('delivery-permits', permits);
        }
      }

      // 3. حذف از consignment-delivery-slips
      const updatedSlips = slips.filter((s: any) => s.id !== slipId);
      storage.saveData('consignment-delivery-slips', updatedSlips);

      // 4. حذف از deliveries
      const deliveries = storage.loadData('deliveries') || [];
      const updatedDeliveries = deliveries.filter((d: any) => d.id !== slipId);
      storage.saveData('deliveries', updatedDeliveries);

      // 5. به‌روزرسانی state
      setAvailablePermits(prev => prev.filter(p => p.id !== slipId));

      if (selectedSlipInfo?.id === slipId) {
        setSelectedSlipInfo(null);
      }

      alert('حواله با موفقيت حذف شد و مانده مجوز به‌روزرساني شد.');
    }
  };

  const handleAddNewSlip = () => {
    setIsAddingNew(true);
    setIsEditing(true);
    setEditingSlipId(null);
    setIsCreatingFromPermit(false);
    setIsEditingFromParent(false);
    
    const emptySlip: ConsignmentSlipInfo = {
      id: `new_slip_${Date.now()}`,
      permitId: '',
      receiptId: '',
      counterpartyId: '',
      contractId: '',
      permitNumber: '',
      managementLetterNumber: '',
      amount: 0,
      permitAmount: 0,
      remainingPermitAmount: 0,
      slipDate: new Date(),
      internalSiteId: '',
      contractorSiteId: '',
      locationId: '',
      recipientType: 'company',
      companyLocationId: '',
      customerLocationId: '',
      counterpartyName: '',
      contractNumber: '',
      receiptNumber: '',
      productName: '',
      siteName: '',
      tankName: '',
      unit: 'kg',
      wastageAmount: 0,
      finalPermitAmount: 0,
      remainingTransferPermit: 0,
      permitDate: new Date(),
      approvalDate: new Date(),
      status: 'draft',
      event: 'پيش‌نويس',
      quotaNumber: '',
      registrationOrderNumber: '',
      receiptBasisAmount: 0,
      driverName: '',
      driverNationalId: '',
      driverPlateNumber: '',
      shipName: '',
      wastagePercentage: 0,
      customerCounterpartyName: '',
      counterpartyLocationName: '',
      customerCounterpartyLocationName: '',
      indexNumber: '',
      cotageNumber: '',
      siteId: '',
      tankId: '',
      hasIssuedSlip: false
    };
    
    setSelectedSlipInfo(emptySlip);
    setSelectedPermitNumber('');
  };

  const handleSelectPermitNumber = (permitNumber: string) => {
    setSelectedPermitNumber(permitNumber);
    
    const selectedPermit = availablePermits.find(p => p.systemPermitNumber === permitNumber || p.permitNumber === permitNumber);
    
    if (selectedPermit) {
      handleSelectPermit(selectedPermit);
      setIsEditing(true);
      setEditingSlipId(null);
      setIsCreatingFromPermit(true);
      setIsEditingFromParent(false); // اطمينان از اينکه در حالت ايجاد هستيم
    }
  };

  // تابع handleSaveSlip را به طور کامل جايگزين کنيد
  const handleSaveSlip = async () => {
    if (isSaving) return;
    if (!selectedSlipInfo) return;

    // ابتدا تمام validation ها را انجام بده - قبل از setIsSaving(true)
    const newErrors: Record<string, string> = {};
    if (!selectedSlipInfo.internalSiteId) newErrors.internalSiteId = 'انتخاب سايت تحويل الزامي است';
    if (!selectedSlipInfo.locationId) newErrors.locationId = 'انتخاب مکان الزامي است';
    
    const amount = parseFloat(selectedSlipInfo.amount?.toString() || '0');
    if (amount <= 0) {
      newErrors.amount = 'مقدار حواله بايد بزرگتر از صفر باشد';
    }
    
    // اعتبارسنجي جديد براي مقدار مجوز حواله:
    // استفاده از فرمول جدید برای محاسبه مانده مجوز حواله:
    // الف) حالت ایجاد: مانده = مقدار مجوز اولیه - کل حواله‌های صادر شده
    // ب) حالت ویرایش: مانده = مقدار مجوز اولیه - کل حواله‌های صادر شده (به جز حواله فعلی)
    let maxPermitAmount = 0;
    const currentSlipId = editingSlipId || (isEditingFromParent ? selectedSlipInfo.id : null);
    const isEditingMode = !!currentSlipId;
    
    // دریافت مقدار مجوز اولیه
    const permits = storage.loadData('delivery-permits') || [];
    const currentPermit = permits.find((p: any) => p.id === selectedSlipInfo.permitId);
    const permitAmount = currentPermit ? (currentPermit.permitAmount || currentPermit.amount || 0) : (selectedSlipInfo.permitAmount || 0);
    
    // محاسبه مانده مجوز حواله با استفاده از فرمول جدید
    const calculatedRemaining = calculateRemainingPermitAmount(
      selectedSlipInfo.permitId,
      permitAmount,
      currentSlipId || undefined,
      isEditingMode
    );
    
    if (currentSlipId) {
      // حالت ويرايش: حداکثر = مانده محاسبه شده + مقدار فعلي حواله (که در حال ویرایش است)
      const slips = storage.loadData('consignment-delivery-slips') || [];
      const currentSlip = slips.find((s: any) => s.id === currentSlipId);
      const currentAmount = currentSlip ? (currentSlip.amount || 0) : 0;
      maxPermitAmount = calculatedRemaining + currentAmount;
    } else {
      // حالت ايجاد: حداکثر = مانده محاسبه شده
      maxPermitAmount = calculatedRemaining;
    }
    
    if (amount > maxPermitAmount) {
      newErrors.amount = `مقدار حواله نبايد بيشتر از حد مجاز (${formatPersianNumber(maxPermitAmount)}) باشد`;
    }

    // بررسی مانده موجودی مخزن در سایت
    if (selectedSlipInfo.siteId && selectedSlipInfo.tankId) {
      const remainingInventory = calculateTankInventory(
        selectedSlipInfo.siteId,
        selectedSlipInfo.tankId,
        selectedSlipInfo.permitId,
        currentSlipId || undefined,
        !currentSlipId
      );
      
      if (amount > remainingInventory) {
        newErrors.amount = `مقدار حواله نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد`;
      }
    }

    // اگر validation اولیه خطا داشت، متوقف کن
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSaving(false);
      alert(`خطا در ثبت حواله:\n${Object.values(newErrors).join('\n')}`);
      return;
    }

    // اطمینان از اینکه مقدار amount واقعی کاربر استفاده می‌شود
    // نه receiptBasisAmount یا permitAmount
    const actualAmount = parseFloat(selectedSlipInfo.amount?.toString() || '0');
    
    // بررسی مجدد مقدار واقعی
    if (actualAmount <= 0) {
      setErrors({ amount: 'مقدار حواله بايد بزرگتر از صفر باشد' });
      setIsSaving(false);
      alert('خطا: مقدار حواله بايد بزرگتر از صفر باشد');
      return;
    }

    // انجام validation های پیشرفته‌تر - قبل از setIsSaving(true)
    
    // بررسی مانده مجوز حواله - برای حالت ایجاد
    if (!currentSlipId && selectedSlipInfo.permitId) {
      const permitIndex = permits.findIndex((p: any) => p.id === selectedSlipInfo.permitId);
      if (permitIndex !== -1) {
        const permit = permits[permitIndex];
        if (actualAmount > (permit.remainingTransferPermit || 0)) {
          setErrors({ amount: `مقدار حواله (${formatPersianNumber(actualAmount)}) نمی‌تواند بیشتر از مانده مجوز حواله (${formatPersianNumber(permit.remainingTransferPermit || 0)}) باشد.` });
          setIsSaving(false);
          alert(`خطا: مقدار حواله (${formatPersianNumber(actualAmount)}) نمی‌تواند بیشتر از مانده مجوز حواله (${formatPersianNumber(permit.remainingTransferPermit || 0)}) باشد.`);
          return;
        }
        
        const newRemainingTransferPermit = (permit.remainingTransferPermit || 0) - actualAmount;
        if (newRemainingTransferPermit < 0) {
          setErrors({ amount: `مانده مجوز حواله نمی‌تواند منفی شود. مانده فعلی: ${formatPersianNumber(permit.remainingTransferPermit || 0)}` });
          setIsSaving(false);
          alert(`هشدار: مانده مجوز حواله نمی‌تواند منفی شود. مانده فعلی: ${formatPersianNumber(permit.remainingTransferPermit || 0)}`);
          return;
        }
      }
    }

    // بررسی نهایی مانده موجودی مخزن - قبل از setIsSaving(true)
    if (selectedSlipInfo.siteId && selectedSlipInfo.tankId) {
      const remainingInventory = calculateTankInventory(
        selectedSlipInfo.siteId,
        selectedSlipInfo.tankId,
        selectedSlipInfo.permitId,
        currentSlipId || undefined,
        !currentSlipId
      );
      
      if (actualAmount > remainingInventory) {
        setErrors({ amount: `مقدار حواله (${formatPersianNumber(actualAmount)}) نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد.` });
        setIsSaving(false);
        alert(`خطا: مقدار حواله (${formatPersianNumber(actualAmount)}) نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد.`);
        return;
      }
    }

    // فقط بعد از تمام validation ها، setIsSaving را true کن
    setIsSaving(true);
    
    try {
      // اطمینان از اینکه مقدار amount واقعی کاربر است (نه مقدار دیگری)
      let updatedSlipInfo = { 
        ...selectedSlipInfo,
        amount: actualAmount // استفاده از مقدار واقعی که کاربر وارد کرده
      };
    
    if (selectedSlipInfo.event === 'درخواست اصلاحيه') {
      updatedSlipInfo.event = '';
      const permits = storage.loadData('delivery-permits') || [];
      const updatedPermits = permits.map((p: any) => {
        if (p.id === selectedSlipInfo.permitId) {
          return { ...p, event: '', updatedAt: new Date() };
        }
        return p;
      });
      storage.saveData('delivery-permits', updatedPermits);
      
      const deliveries = storage.loadData('deliveries') || [];
      const updatedDeliveries = deliveries.map((d: any) => {
        if (d.permitId === selectedSlipInfo.permitId) {
          return { ...d, event: '', updatedAt: new Date() };
        }
        return d;
      });
      storage.saveData('deliveries', updatedDeliveries);
      
      setAvailablePermits(prev => prev.map(p => p.id === selectedSlipInfo.permitId ? { ...p, event: '' } : p));
    }

    let updatedSlips = [...slips];

    // تعيين آيدي رکوردي که بايد ويرايش شود
    // تشخيص حالت:
    // - اگر editingSlipId وجود داشته باشد: ويرايش رکورد موجود
    // - اگر isEditingFromParent=true باشد: ويرايش از طريق کامپوننت والد
    // - در غير اين صورت: ايجاد رکورد جديد
    const slipIdToEdit = editingSlipId || (isEditingFromParent ? selectedSlipInfo?.id : null);

    if (slipIdToEdit) {
      // به‌روزرساني حواله موجود
      const index = updatedSlips.findIndex((s: any) => s.id === slipIdToEdit);
      if (index !== -1) {
        // ذخیره مقدار قبلی برای برگرداندن در صورت خطا
        const oldSlip = { ...updatedSlips[index] };
        
        // استفاده از مقدار واقعی amount که کاربر وارد کرده (نه permitAmount یا receiptBasisAmount)
        const oldAmount = parseFloat(oldSlip.amount?.toString() || '0');
        const newAmount = parseFloat(updatedSlipInfo.amount?.toString() || '0');
        const amountDifference = newAmount - oldAmount;
        
        // ابتدا تمام validation ها را انجام بده، بعد مقدار را تغییر بده
        
        // بررسی نهایی مانده موجودی مخزن در سایت (قبل از تغییر)
        if (updatedSlipInfo.siteId && updatedSlipInfo.tankId) {
          const remainingInventory = calculateTankInventory(
            updatedSlipInfo.siteId,
            updatedSlipInfo.tankId,
            updatedSlipInfo.permitId,
            slipIdToEdit || undefined,
            false
          );
          
          if (newAmount > remainingInventory) {
            setIsSaving(false);
            setErrors({ amount: `مقدار حواله (${formatPersianNumber(newAmount)}) نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد.` });
            alert(`خطا: مقدار حواله (${formatPersianNumber(newAmount)}) نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد.`);
            return;
          }
        }
        
        // به‌روزرساني مانده مجوز حواله
        if (updatedSlipInfo.permitId) {
          const permits = storage.loadData('delivery-permits') || [];
          const permitIndex = permits.findIndex((p: any) => p.id === updatedSlipInfo.permitId);
          if (permitIndex !== -1) {
            const permit = permits[permitIndex];
            
            // بررسی validation: تفاوت نباید بیشتر از مانده مجوز باشد
            if (amountDifference > 0 && amountDifference > (permit.remainingTransferPermit || 0)) {
              setIsSaving(false);
              setErrors({ amount: `افزایش مقدار حواله (${formatPersianNumber(amountDifference)}) نمی‌تواند بیشتر از مانده مجوز حواله (${formatPersianNumber(permit.remainingTransferPermit || 0)}) باشد.` });
              alert(`خطا: افزایش مقدار حواله (${formatPersianNumber(amountDifference)}) نمی‌تواند بیشتر از مانده مجوز حواله (${formatPersianNumber(permit.remainingTransferPermit || 0)}) باشد.`);
              return;
            }
            
            const newRemainingTransferPermit = (permit.remainingTransferPermit || 0) - amountDifference;
            
            // اطمینان از اینکه مانده منفی نشود
            if (newRemainingTransferPermit < 0) {
              setIsSaving(false);
              setErrors({ amount: `مانده مجوز حواله نمی‌تواند منفی شود. مانده فعلی: ${formatPersianNumber(permit.remainingTransferPermit || 0)}` });
              alert(`هشدار: مانده مجوز حواله نمی‌تواند منفی شود. مانده فعلی: ${formatPersianNumber(permit.remainingTransferPermit || 0)}`);
              return;
            }
            
            // فقط بعد از تمام validation ها، تغییرات را اعمال کن
            permits[permitIndex] = {
              ...permit,
              remainingTransferPermit: Math.max(0, newRemainingTransferPermit),
              updatedAt: new Date()
            };
            storage.saveData('delivery-permits', permits);
          }
        }
        
        // فقط بعد از تمام validation ها، مقدار را تغییر بده
        updatedSlips[index] = { 
          ...updatedSlipInfo, 
          amount: newAmount, // استفاده از مقدار واقعی
          updatedAt: new Date() 
        };
        
        // به‌روزرساني deliveries - اطمینان از استفاده مقدار واقعی amount
        const deliveries = storage.loadData('deliveries') || [];
        const deliveryIndex = deliveries.findIndex((d: any) => d.id === slipIdToEdit);
        if (deliveryIndex !== -1) {
          deliveries[deliveryIndex] = { 
            ...updatedSlipInfo, 
            amount: newAmount, // استفاده از مقدار واقعی که کاربر وارد کرده
            updatedAt: new Date() 
          };
          storage.saveData('deliveries', deliveries);
        }
      }
    } else {
      // افزودن حواله جديد - ابتدا تمام validation ها را انجام بده
      let validationPassed = true;
      
      // به‌روزرساني مانده مجوز حواله - انجام validation قبل از push
      if (updatedSlipInfo.permitId) {
        const permits = storage.loadData('delivery-permits') || [];
        const permitIndex = permits.findIndex((p: any) => p.id === updatedSlipInfo.permitId);
        if (permitIndex !== -1) {
          const permit = permits[permitIndex];
          // استفاده از مقدار واقعی actualAmount که قبلاً محاسبه شده
          
          // بررسی validation: مقدار حواله نباید بیشتر از مانده مجوز باشد
          if (actualAmount > (permit.remainingTransferPermit || 0)) {
            setIsSaving(false);
            setErrors({ amount: `مقدار حواله (${formatPersianNumber(actualAmount)}) نمی‌تواند بیشتر از مانده مجوز حواله (${formatPersianNumber(permit.remainingTransferPermit || 0)}) باشد.` });
            alert(`خطا: مقدار حواله (${formatPersianNumber(actualAmount)}) نمی‌تواند بیشتر از مانده مجوز حواله (${formatPersianNumber(permit.remainingTransferPermit || 0)}) باشد.`);
            validationPassed = false;
          }
          
          // بررسی مانده منفی - فقط اگر validation قبلی pass شد
          if (validationPassed) {
            const newRemainingTransferPermit = (permit.remainingTransferPermit || 0) - actualAmount;
            
            if (newRemainingTransferPermit < 0) {
              setIsSaving(false);
              setErrors({ amount: `مانده مجوز حواله نمی‌تواند منفی شود. مانده فعلی: ${formatPersianNumber(permit.remainingTransferPermit || 0)}` });
              alert(`هشدار: مانده مجوز حواله نمی‌تواند منفی شود. مانده فعلی: ${formatPersianNumber(permit.remainingTransferPermit || 0)}`);
              validationPassed = false;
            }
          }
          
          // بررسی نهایی مانده موجودی مخزن در سایت (قبل از ذخیره) - فقط اگر validation قبلی pass شد
          if (validationPassed && updatedSlipInfo.siteId && updatedSlipInfo.tankId) {
            const remainingInventory = calculateTankInventory(
              updatedSlipInfo.siteId,
              updatedSlipInfo.tankId,
              updatedSlipInfo.permitId,
              undefined,
              true
            );
            
            if (actualAmount > remainingInventory) {
              setIsSaving(false);
              setErrors({ amount: `مقدار حواله (${formatPersianNumber(actualAmount)}) نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد.` });
              alert(`خطا: مقدار حواله (${formatPersianNumber(actualAmount)}) نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد.`);
              validationPassed = false;
            }
          }
          
          // فقط اگر تمام validation ها pass شدند، تغییرات را اعمال کن
          if (validationPassed) {
            const newRemainingTransferPermit = (permit.remainingTransferPermit || 0) - actualAmount;
            permits[permitIndex] = {
              ...permit,
              remainingTransferPermit: Math.max(0, newRemainingTransferPermit),
              updatedAt: new Date()
            };
            storage.saveData('delivery-permits', permits);
          }
        }
      } else {
        // اگر permitId نداریم، فقط بررسی مانده موجودی مخزن را انجام بده
        if (updatedSlipInfo.siteId && updatedSlipInfo.tankId) {
          const remainingInventory = calculateTankInventory(
            updatedSlipInfo.siteId,
            updatedSlipInfo.tankId,
            undefined,
            undefined,
            true
          );
          
          if (actualAmount > remainingInventory) {
            setIsSaving(false);
            setErrors({ amount: `مقدار حواله (${formatPersianNumber(actualAmount)}) نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد.` });
            alert(`خطا: مقدار حواله (${formatPersianNumber(actualAmount)}) نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد.`);
            validationPassed = false;
          }
        }
      }
      
      // اگر validation ها pass نشدند، متوقف کن
      if (!validationPassed) {
        return;
      }
      
      // فقط بعد از تمام validation ها، حواله را اضافه کن
      updatedSlips.push({ ...updatedSlipInfo, createdAt: new Date() });
      
      // افزودن به deliveries - فقط بعد از validation
      const deliveries = storage.loadData('deliveries') || [];
      deliveries.push({ ...updatedSlipInfo, createdAt: new Date() });
      storage.saveData('deliveries', deliveries);
    }

    storage.saveData('consignment-delivery-slips', updatedSlips);

    // موفقیت ذخیره
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    
    } catch (err) {
      console.error('Save slip error:', err);
      alert('خطا در ذخیره‌سازی حواله. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSaving(false);
      setIsEditing(false);
      setEditingSlipId(null);
      setIsEditingFromParent(false); // ريست کردن حالت ويرايش والد
      setIsCreatingFromPermit(false); // ريست کردن حالت ايجاد از مجوز
      setErrors({});
      setIsAddingNew(false);
    }
  };
///////////
///////////
//////////
const handlePrintSlip = useCallback(() => {
  if (!selectedSlipInfo) return;
  
  const printContent = `
  <!DOCTYPE html>
  <html dir="rtl" lang="fa">
  <head>
  <meta charset="UTF-8">
  <title>حواله انبار اماني - ${selectedSlipInfo.permitNumber}</title>
  <style>
  @page { margin: 15mm; size: A4; }
  body {
  font-family: 'Tahoma', 'B Nazanin', sans-serif;
  direction: rtl;
  line-height: 1.8;
  margin: 0;
  padding: 20px;
  background: #fdfdfd;
  font-size: 13px;
  color: #2d3748;
  }
  .slip-container {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  border: 3px double #1e40af;
  border-radius: 12px;
  padding: 25px;
  box-sizing: border-box;
  background: white;
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
  position: relative;
  }
  .slip-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(90deg, #1e40af, #3b82f6, #1e40af);
  border-radius: 12px 12px 0 0;
  }
  .header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 3px solid #1e40af;
  margin-bottom: 25px;
  position: relative;
  }
  .logo-container {
  display: flex;
  align-items: center;
  gap: 15px;
  }
  .company-logo {
  width: 80px;
  height: 80px;
  border: 2px solid #1e40af;
  border-radius: 8px;
  padding: 5px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .company-info {
  text-align: right;
  }
  .company-name {
  font-size: 16px;
  font-weight: bold;
  color: #1e40af;
  margin-bottom: 5px;
  }
  .company-details {
  font-size: 11px;
  color: #4a5568;
  line-height: 1.4;
  }
  .title {
  font-size: 24px;
  font-weight: bold;
  color: #1e40af;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
  }
  .subtitle {
  font-size: 16px;
  color: #4a5568;
  text-align: center;
  margin-top: 5px;
  }
  .details-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  border: 2px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .details-table th {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: white;
  padding: 12px 8px;
  font-weight: bold;
  text-align: center;
  border: 1px solid #1e40af;
  font-size: 12px;
  }
  .details-table td {
  border: 1px solid #e2e8f0;
  padding: 10px 8px;
  text-align: right;
  background: white;
  font-size: 12px;
  }
  .details-table tr:nth-child(even) td {
  background: #f8fafc;
  }
  .section-title { 
  font-size: 16px; 
  font-weight: bold; 
  color: #1e40af; 
  margin: 25px 0 15px 0; 
  padding: 8px 15px;
  background: linear-gradient(90deg, #eff6ff, #dbeafe);
  border: 2px solid #3b82f6;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .signature-section {
  display: flex;
  justify-content: space-around;
  margin-top: 50px;
  padding-top: 25px;
  border-top: 3px dashed #cbd5e0;
  background: linear-gradient(0deg, transparent, #f7fafc, transparent);
  }
  .signature-box {
  text-align: center;
  width: 30%;
  padding: 15px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
  }
  .signature-line {
  border-top: 2px solid #4a5568;
  height: 2px;
  width: 80%;
  margin: 35px auto 8px;
  position: relative;
  }
  .signature-line::after {
  content: '';
  position: absolute;
  right: 0;
  top: -2px;
  width: 8px;
  height: 6px;
  background: #4a5568;
  border-radius: 50%;
  }
  .amount-highlight {
  background: linear-gradient(135deg, #fef3c7, #fbbf24);
  color: #92400e;
  font-weight: bold;
  text-align: center;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .footer-note {
  text-align: center;
  font-size: 10px;
  color: #6b7280;
  margin-top: 20px;
  padding: 10px;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  }
  </style>
  </head>
  <body>
  <div class="slip-container">
  <div class="header">
  <div class="logo-container">
  <img src="https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559" alt="لوگو شرکت" class="company-logo" onerror="this.src='/لوگو صنعت غذایی کورش.jpg'; this.onerror=function(){this.style.display='none';};" />
  <div class="company-info">
  <div class="company-name">شرکت صنعت غذایی کورش</div>
  <div class="company-details">
  تهران، خیابان نیل، شماره 241<br>
  تلفن: 021 83893000<br>
  www.kouroshfood.com
  </div>
  </div>
  </div>
  <div style="flex: 1; text-align: center;">
  <div class="title">حواله انبار اماني</div>
  <div class="subtitle">شماره: ${selectedSlipInfo.permitNumber}</div>
  <div class="subtitle">تاريخ: ${formatPersianDate(new Date())}</div>
  </div>
  </div>
  
  <div class="section-title">اطلاعات حواله</div>
  <table class="details-table">
  <tr><td width="30%">طرف حساب</td><td>${selectedSlipInfo.counterpartyName}</td></tr>
  <tr><td>شماره قرارداد</td><td>${selectedSlipInfo.contractNumber}</td></tr>
  <tr><td>مقدار حواله</td><td>${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</td></tr>
  <tr><td>تاريخ حواله</td><td>${formatPersianDate(selectedSlipInfo.slipDate)}</td></tr>
  <tr><td>سايت داخلي</td><td>${baseData.internalSites?.find((s: any) => s.id === selectedSlipInfo.internalSiteId)?.name || ''}</td></tr>
  <tr><td>سايت پيمانکار</td><td>${baseData.contractorSites?.find((s: any) => s.id === selectedSlipInfo.contractorSiteId)?.name || ''}</td></tr>
  <tr><td>لوکيشن</td><td>${baseData.locations?.find((l: any) => l.id === selectedSlipInfo.locationId)?.name || ''}</td></tr>
   ${selectedSlipInfo.recipientType === 'company' ?
    `<tr><td>لوکيشن طرف حساب</td><td>${baseData.companiesLocation?.find((l: any) => l.id === selectedSlipInfo.companyLocationId)?.name || ''}</td></tr>` :
    `<tr><td>مشتري طرف حساب</td><td>${baseData.customerCompanies?.find((c: any) => c.id === selectedSlipInfo.customerLocationId)?.name || ''}</td></tr>
    <tr><td>لوکيشن مشتري طرف حساب</td><td>${baseData.customerCompaniesLocation?.find((l: any) => l.id === selectedSlipInfo.customerLocationId)?.name || ''}</td></tr>`
  }
  </table>
  
  <div class="section-title">اطلاعات رسيد انبار</div>
  <table class="details-table">
  <tr><td width="30%">طرف حساب</td><td>${selectedSlipInfo.counterpartyName}</td></tr>
  <tr><td>مشتري طرف حساب</td><td>${selectedSlipInfo.customerCounterpartyName || '-'}</td></tr>
  <tr><td>لوکيشن طرف حساب</td><td>${selectedSlipInfo.counterpartyLocationName || '-'}</td></tr>
  <tr><td>لوکيشن مشتري طرف حساب</td><td>${selectedSlipInfo.customerCounterpartyLocationName || '-'}</td></tr>
  <tr><td>شماره قرارداد</td><td>${selectedSlipInfo.contractNumber}</td></tr>
  <tr><td>مقدار مبناي رسيد</td><td>${formatPersianNumber(selectedSlipInfo.receiptBasisAmount || 0)} ${selectedSlipInfo.unit}</td></tr>
  <tr><td>درصد افت</td><td>${selectedSlipInfo.wastagePercentage ? `${selectedSlipInfo.wastagePercentage}%` : '-'}</td></tr>
  <tr><td>وزن افت</td><td>${formatPersianNumber(selectedSlipInfo.wastageAmount)} ${selectedSlipInfo.unit}</td></tr>
  <tr><td>مقدار رسيد</td><td>${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</td></tr>
  <tr><td>نام کالا اماني</td><td>${selectedSlipInfo.productName}</td></tr>
  <tr><td>سايت مخازن</td><td>${selectedSlipInfo.siteName}</td></tr>
  <tr><td>مخزن</td><td>${selectedSlipInfo.tankName}</td></tr>
  <tr><td>تاريخ رسيد</td><td>${formatPersianDate(selectedSlipInfo.permitDate)}</td></tr>
  <tr><td>واحد سنجش</td><td>${selectedSlipInfo.unit}</td></tr>
  <tr><td>وضعيت تراکنش</td><td>${selectedSlipInfo.status}</td></tr>
  <tr><td>شماره رسيد انبار</td><td>${selectedSlipInfo.receiptNumber}</td></tr>
  <tr><td>شماره شاخص /ثبت سفارش</td><td>${selectedSlipInfo.indexNumber || '-'}</td></tr>
  <tr><td>شماره کوتاژ</td><td>${selectedSlipInfo.cotageNumber || '-'}</td></tr>
  <tr><td>نام کشتي</td><td>${selectedSlipInfo.shipName || '-'}</td></tr>
  <tr><td>نام راننده</td><td>${selectedSlipInfo.driverName || '-'}</td></tr>
  </table>
  
  <div class="section-title">مجوزها</div>
  <table class="details-table">
  <tr><td width="30%">مقدار مجوز حواله</td><td>${formatPersianNumber(selectedSlipInfo.permitAmount)} ${selectedSlipInfo.unit}</td></tr>
  <tr><td>مقدار افت مجوز</td><td>${formatPersianNumber(selectedSlipInfo.wastageAmount)} ${selectedSlipInfo.unit}</td></tr>
  <tr><td>مقدار مجوز بعد از کسر افت</td><td>${formatPersianNumber(selectedSlipInfo.finalPermitAmount)} ${selectedSlipInfo.unit}</td></tr>
  <tr><td>مانده مجوز حواله</td><td>${formatPersianNumber(selectedSlipInfo.remainingPermitAmount)} ${selectedSlipInfo.unit}</td></tr>
  <tr><td>مانده مجوز</td><td>${formatPersianNumber(selectedSlipInfo.remainingTransferPermit)} ${selectedSlipInfo.unit}</td></tr>
  <tr><td>تاريخ مجوز</td><td>${formatPersianDate(selectedSlipInfo.permitDate)}</td></tr>
  <tr><td>تاريخ تاييد مجوز</td><td>${formatPersianDate(selectedSlipInfo.approvalDate)}</td></tr>
  <tr><td>وضعيت تراکنش</td><td>${selectedSlipInfo.status}</td></tr>
  <tr><td>رخداد</td><td>${selectedSlipInfo.event}</td></tr>
  <tr><td>شماره مجوز</td><td>${selectedSlipInfo.permitNumber}</td></tr>
  <tr><td>شماره نامه مديريت</td><td>${selectedSlipInfo.managementLetterNumber}</td></tr>
  </table>
  
  <div class="signature-section">
  <div class="signature-box">
  <div>تحويل گيرنده</div>
  <div class="signature-line"></div>
  <div>امضا و نام</div>
  </div>
  <div class="signature-box">
  <div>تحويل دهنده</div>
  <div class="signature-line"></div>
  <div>امضا و نام</div>
  </div>
  <div class="signature-box">
  <div>مدير انبار</div>
  <div class="signature-line"></div>
  <div>امضا و نام</div>
  </div>
  </div>
  </div>
  </body>
  </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
}, [selectedSlipInfo, baseData]);

  const handleChange = (field: keyof ConsignmentSlipInfo, value: any) => {
    if (!selectedSlipInfo) return;
    
    if (field === 'amount') {
      const newAmount = parseFloat(value) || 0;
      
      if (errors.amount) {
        setErrors({ ...errors, amount: undefined });
      }
      
      let updatedSlipInfo = { ...selectedSlipInfo };
      
      // محدوديت مقدار بر اساس حالت - استفاده از فرمول جدید
      const currentSlipId = editingSlipId || (isEditingFromParent ? selectedSlipInfo.id : null);
      const isEditingMode = !!currentSlipId;
      
      // دریافت مقدار مجوز اولیه
      const permits = storage.loadData('delivery-permits') || [];
      const currentPermit = permits.find((p: any) => p.id === selectedSlipInfo.permitId);
      const permitAmount = currentPermit ? (currentPermit.permitAmount || currentPermit.amount || 0) : (selectedSlipInfo.permitAmount || 0);
      
      // محاسبه مانده مجوز حواله با استفاده از فرمول جدید
      const calculatedRemaining = calculateRemainingPermitAmount(
        selectedSlipInfo.permitId,
        permitAmount,
        currentSlipId || undefined,
        isEditingMode
      );
      
      let maxAllowed = 0;
      if (currentSlipId) {
        // حالت ويرايش: حداکثر = مانده محاسبه شده + مقدار فعلي
        const slips = storage.loadData('consignment-delivery-slips') || [];
        const currentSlip = slips.find((s: any) => s.id === currentSlipId);
        const currentAmount = currentSlip ? (currentSlip.amount || 0) : 0;
        maxAllowed = calculatedRemaining + currentAmount;
      } else {
        // حالت ايجاد: حداکثر = مانده مجوز حواله
        maxAllowed = calculatedRemaining;
      }
      
      // بررسی مانده موجودی مخزن
      if (selectedSlipInfo.siteId && selectedSlipInfo.tankId) {
        const remainingInventory = calculateTankInventory(
          selectedSlipInfo.siteId,
          selectedSlipInfo.tankId,
          selectedSlipInfo.permitId,
          currentSlipId || undefined,
          !currentSlipId
        );
        
        // مقدار حواله نباید بیشتر از مانده موجودی مخزن باشد
        if (newAmount > remainingInventory) {
          setErrors({
            ...errors,
            amount: `مقدار حواله نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد`
          });
          // مقدار را محدود نکن، فقط خطا نشان بده تا کاربر خودش مقدار را اصلاح کند
          return; // جلوگیری از تغییر مقدار
        }
      }
      
      if (newAmount > maxAllowed) {
        setErrors({
          ...errors,
          amount: `مقدار حواله نبايد بيشتر از حد مجاز (${formatPersianNumber(maxAllowed)}) باشد`
        });
        // مقدار را محدود نکن، فقط خطا نشان بده
        return; // جلوگیری از تغییر مقدار
      } else {
        updatedSlipInfo.amount = newAmount;
        // اگر خطای قبلی وجود داشت و حالا مقدار صحیح است، خطا را پاک کن
        if (errors.amount) {
          const newErrors = { ...errors };
          delete newErrors.amount;
          setErrors(newErrors);
        }
      }
      
      // فقط اگر همه validation ها pass شد، مقدار را تغییر بده
      if (isEditing && selectedSlipInfo.event === 'درخواست اصلاحيه') {
        updatedSlipInfo.event = '';
        const permits = storage.loadData('delivery-permits') || [];
        const updatedPermits = permits.map((p: any) => {
          if (p.id === selectedSlipInfo.permitId) {
            return { ...p, event: '', updatedAt: new Date() };
          }
          return p;
        });
        storage.saveData('delivery-permits', updatedPermits);
        
        const deliveries = storage.loadData('deliveries') || [];
        const updatedDeliveries = deliveries.map((d: any) => {
          if (d.permitId === selectedSlipInfo.permitId) {
            return { ...d, event: '', updatedAt: new Date() };
          }
          return d;
        });
        storage.saveData('deliveries', updatedDeliveries);
        
        setAvailablePermits(prev => prev.map(p => p.id === selectedSlipInfo.permitId ? { ...p, event: '' } : p));
      }
      
      // فقط وقتی که validation pass شد، مقدار را به‌روزرسانی کن
      setSelectedSlipInfo(updatedSlipInfo);
      return;
    }
    
    let updatedSlipInfo = { ...selectedSlipInfo, [field]: value };
    
    if (isEditing && selectedSlipInfo.event === 'درخواست اصلاحيه') {
      updatedSlipInfo.event = '';
      const permits = storage.loadData('delivery-permits') || [];
      const updatedPermits = permits.map((p: any) => {
        if (p.id === selectedSlipInfo.permitId) {
          return { ...p, event: '', updatedAt: new Date() };
        }
        return p;
      });
      storage.saveData('delivery-permits', updatedPermits);
      
      const deliveries = storage.loadData('deliveries') || [];
      const updatedDeliveries = deliveries.map((d: any) => {
        if (d.permitId === selectedSlipInfo.permitId) {
          return { ...d, event: '', updatedAt: new Date() };
        }
        return d;
      });
      storage.saveData('deliveries', updatedDeliveries);
      
      setAvailablePermits(prev => prev.map(p => p.id === selectedSlipInfo.permitId ? { ...p, event: '' } : p));
    }
    
    setSelectedSlipInfo(updatedSlipInfo);
  };

  // Toggle "To be checked" status
  const toggleCheckTransaction = useCallback((transactionId: string) => {
    const newCheckedTransactions = new Set(checkedTransactions);
    const newDisabledTransactions = new Set(disabledTransactions);
    
    if (newCheckedTransactions.has(transactionId)) {
      newCheckedTransactions.delete(transactionId);
      newDisabledTransactions.delete(transactionId);
    } else {
      newCheckedTransactions.add(transactionId);
      newDisabledTransactions.add(transactionId);
    }
    
    setCheckedTransactions(newCheckedTransactions);
    setDisabledTransactions(newDisabledTransactions);
    storage.saveData('checked-transactions', Array.from(newCheckedTransactions));
    storage.saveData('disabled-transactions', Array.from(newDisabledTransactions));
    
    // اگر propSetCheckedTransactions وجود دارد، آن را نيز فراخواني کن
    if (propSetCheckedTransactions) {
      propSetCheckedTransactions(newCheckedTransactions);
    }
    
    // اگر propSetDisabledTransactions وجود دارد، آن را نيز فراخواني کن
    if (propSetDisabledTransactions) {
      propSetDisabledTransactions(newDisabledTransactions);
    }
  }, [checkedTransactions, disabledTransactions, storage, propSetCheckedTransactions, propSetDisabledTransactions]);

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <div className="w-1 h-8 bg-blue-600 rounded ml-3"></div>
              حواله انبار اماني
            </h1>
            <p className="text-gray-600">مديريت و صدور حواله‌هاي انبار اماني</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onBack()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              بازگشت
            </button>
            <img
              src="/لوگو صنعت غذايي کورش.jpg"
              alt="لوگو شرکت"
              className="h-16 w-auto"
            />
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center shadow-sm">
            <CheckCircle className="h-5 w-5 text-green-600 ml-2" />
            <span className="text-green-800">
              {editingSlipId || isEditingFromParent ? 
                'حواله با موفقيت به‌روزرساني شد.' : 
                'حواله با موفقيت ثبت شد.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ستون چپ - جدول اطلاعات اماني */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <FileText className="h-5 w-5 ml-2" />
                    جدول اطلاعات اماني
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadData}
                      className="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                      title="دانلود"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleAddNewSlip}
                      className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      افزودن حواله جديد
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-200 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="جستجو..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-white focus:border-transparent bg-white/90"
                  />
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                <table className="w-full min-w-[1200px] h-full">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">شماره مجوز</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">طرف حساب</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">مشتري طرف حساب</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">شماره قرارداد</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">مقدار مجوز حواله</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">مانده مجوز حواله</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">مقدار حواله</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">مانده موجودي مخزن</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">تاريخ حواله</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">سايت داخلي</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">سايت پيمانکار</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">لوکيشن</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">نوع گيرنده</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">لوکيشن گيرنده</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">نام کالا</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">مخزن</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">مقدار مبناي رسيد</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">درصد افت</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">نام راننده</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">پلاک</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">نام کشتي</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">شماره نامه مديريت</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">وضعيت</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">عمليات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
  {filteredPermits.map((permit, index) => {
    // Check if this transaction is marked for checking
    const isChecked = checkedTransactions.has(permit.id);
    const isDisabled = disabledTransactions.has(permit.id);
    
    return (
      <tr
        key={permit.id}
        className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 cursor-pointer transition-colors ${
          isChecked ? 'bg-yellow-100' : ''
        } ${
          isDisabled ? 'opacity-50' : ''
        }`}
        onClick={() => handleSelectPermit(permit)}
      >
        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {permit.systemPermitNumber || permit.permitNumber}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.counterpartyName}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.customerCounterpartyName || '-'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.contractNumber}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatPersianNumber(permit.permitAmount || permit.amount)} {permit.unit}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatPersianNumber(permit.remainingPermitAmount)} {permit.unit}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatPersianNumber(permit.amount || 0)} {permit.unit}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatPersianNumber(calculateTankInventory(
            permit.siteId || '', 
            permit.tankId || '',
            permit.permitId,
            permit.id,
            !permit.hasIssuedSlip // اگر هنوز حواله صادر نشده، حالت ايجاد است
          ))} {permit.unit}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatPersianDate(permit.slipDate || new Date())}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {baseData.internalSites?.find((s: any) => s.id === permit.internalSiteId)?.name || '-'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {baseData.contractorSites?.find((s: any) => s.id === permit.contractorSiteId)?.name || '-'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {baseData.locations?.find((l: any) => l.id === permit.locationId)?.name || '-'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.recipientType === 'company' ? 'طرف حساب' : 'مشتري طرف حساب'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.recipientType === 'company' 
            ? baseData.companiesLocation?.find((l: any) => l.id === permit.companyLocationId)?.name || '-'
            : baseData.customerCompaniesLocation?.find((l: any) => l.id === permit.customerLocationId)?.name || '-'
          }
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.productName}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.tankName}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatPersianNumber(permit.receiptBasisAmount || 0)} {permit.unit}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.wastagePercentage ? `${permit.wastagePercentage}%` : '-'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.driverName || '-'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.driverPlateNumber || '-'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.shipName || '-'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.managementLetterNumber}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            permit.status === 'issued' ? 'bg-green-100 text-green-800' : 
            permit.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            {permit.status === 'issued' ? 'صادر شده' : 
             permit.status === 'draft' ? 'پيش‌نويس' : 
             'ابطال شده'}
          </span>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditSlip(permit);
              }}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100 transition-colors"
              title="ويرايش"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRequestCorrection();
              }}
              className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-100 transition-colors"
              title="درخواست اصلاحيه"
            >
              <AlertCircle className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCheckTransaction(permit.id);
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
                handleDeleteSlip(permit.id);
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
              </div>
            </div>
          </div>

          {/* ستون راست - جدول اطلاعات حواله اماني */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <FileText className="h-5 w-5 ml-2" />
                    اطلاعات حواله اماني
                  </h2>
                  <div className="flex items-center gap-2 mb-2">
                    {isCreatingFromPermit ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        حالت ايجاد از مجوز
                      </span>
                    ) : isEditingFromParent ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        حالت ويرايش از والد
                      </span>
                    ) : editingSlipId ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        حالت ويرايش مستقيم
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        حالت ايجاد جديد
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handlePrintSlip} className="p-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors shadow-sm" title="چاپ">
                      <Printer className="h-4 w-4" />
                    </button>
                    {isEditing ? (
                      <button
                        onClick={handleSaveSlip}
                        className={`p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-all shadow-sm ${
                          isSaving ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                        disabled={isSaving}
                        title="ذخيره"
                      >
                        {isSaving ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            در حال ذخيره...
                          </div>
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <button onClick={() => setIsEditing(true)} className="p-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors shadow-sm" title="ويرايش">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-x-auto overflow-y-auto max-h-[500px] h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-[600px]">
                  {/* ... تمام فيلدهاي فرم بدون تغيير ... */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <div className="w-1 h-4 bg-purple-500 rounded ml-1"></div>
                      شماره مجوز
                    </label>
                    {isAddingNew ? (
                      <select
                        value={selectedPermitNumber}
                        onChange={(e) => handleSelectPermitNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        <option value="">انتخاب کنيد</option>
                        {availablePermits.filter(p => !selectedSlipInfo?.counterpartyId || p.counterpartyId === selectedSlipInfo.counterpartyId).map((p: any) => (
                          <option key={p.id} value={p.systemPermitNumber || p.permitNumber}>
                            {p.systemPermitNumber || p.permitNumber}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={selectedSlipInfo?.permitNumber || ''}
                        onChange={(e) => {
                          const selectedPermit = availablePermits.find(p => (p.systemPermitNumber || p.permitNumber) === e.target.value);
                          if (selectedPermit) {
                            handleSelectPermit(selectedPermit);
                          }
                        }}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-100"
                      >
                        <option value="">{selectedSlipInfo?.permitNumber || 'انتخاب کنيد'}</option>
                        {availablePermits.filter(p => !selectedSlipInfo?.counterpartyId || p.counterpartyId === selectedSlipInfo.counterpartyId).map((p: any) => (
                          <option key={p.id} value={p.systemPermitNumber || p.permitNumber}>
                            {p.systemPermitNumber || p.permitNumber}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <div className="w-1 h-4 bg-purple-500 rounded ml-1"></div>
                      نام شرکت
                    </label>
                    <select
                      value={selectedSlipInfo?.counterpartyId || ''}
                      onChange={(e) => {
                        handleChange('counterpartyId', e.target.value);
                        const selectedCompany = baseData.companies?.find((c: any) => c.id === e.target.value);
                        if (selectedCompany) {
                          const companyPermits = availablePermits.filter(p => p.counterpartyId === e.target.value);
                          if (companyPermits.length > 0) {
                            handleSelectPermit(companyPermits[0]);
                          }
                        }
                      }}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    >
                      <option value="">{selectedSlipInfo?.counterpartyName || 'انتخاب کنيد'}</option>
                      {baseData.companies?.filter((c: any) => availablePermits.some(p => p.counterpartyId === c.id)).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">شماره قرارداد</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedSlipInfo?.contractId || ''}
                        onChange={(e) => handleChange('contractId', e.target.value)}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">{selectedSlipInfo?.contractNumber || 'انتخاب کنيد'}</option>
                        {baseData.contracts?.filter((c: any) => c.companyId === selectedSlipInfo?.counterpartyId).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.contractNumber}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      مقدار حواله
                      <span className="text-xs text-gray-500 mr-2">
                        (حداکثر: {formatPersianNumber(calculateTankInventory(
                          selectedSlipInfo?.siteId || '', 
                          selectedSlipInfo?.tankId || '',
                          selectedSlipInfo?.permitId,
                          selectedSlipInfo?.id,
                          isCreatingFromPermit || !isEditingFromParent
                        ))} {selectedSlipInfo?.unit})
                      </span>
                    </label>
                    <input
                      type="number"
                      value={selectedSlipInfo?.amount || 0}
                      onChange={(e) => handleChange('amount', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.amount ? 'border-red-500' : 'border-gray-300'}`}
                      min="0.01"
                      max={calculateTankInventory(
                        selectedSlipInfo?.siteId || '', 
                        selectedSlipInfo?.tankId || '',
                        selectedSlipInfo?.permitId,
                        selectedSlipInfo?.id,
                        isCreatingFromPermit || !isEditingFromParent
                      )}
                      step="0.01"
                    />
                    {errors.amount && (
                      <div className="flex items-center mt-1 text-red-500 text-xs">
                        <AlertCircle className="h-3 w-3 ml-1" />
                        {errors.amount}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-500">
                      فرمول محاسبه حداکثر مجاز: {editingSlipId || isEditingFromParent ? 
                        "مانده مجوز حواله + مقدار حواله فعلي" : 
                        "مانده مجوز حواله"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">مقدار مجوز حواله</label>
                    <input
                      type="number"
                      value={selectedSlipInfo?.permitAmount || 0}
                      disabled={true}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">مانده مجوز حواله</label>
                    <input
                      type="number"
                      value={selectedSlipInfo?.remainingPermitAmount || 0}
                      disabled={true}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ حواله</label>
                    <PersianDatePicker
                      value={selectedSlipInfo?.slipDate || new Date()}
                      onChange={(date) => handleChange('slipDate', date)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">سايت داخلي</label>
                    <select
                      value={selectedSlipInfo?.internalSiteId || ''}
                      onChange={(e) => handleChange('internalSiteId', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">انتخاب کنيد</option>
                      {baseData.internalSites?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {errors.internalSiteId && <p className="text-red-500 text-xs mt-1">{errors.internalSiteId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">سايت پيمانکار</label>
                    <select
                      value={selectedSlipInfo?.contractorSiteId || ''}
                      onChange={(e) => handleChange('contractorSiteId', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">انتخاب کنيد</option>
                      {baseData.contractorSites?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">لوکيشن</label>
                    <select
                      value={selectedSlipInfo?.locationId || ''}
                      onChange={(e) => handleChange('locationId', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">انتخاب کنيد</option>
                      {baseData.locations?.map((l: any) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    {errors.locationId && <p className="text-red-500 text-xs mt-1">{errors.locationId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نوع گيرنده</label>
                    <select
                      value={selectedSlipInfo?.recipientType || 'company'}
                      onChange={(e) => handleChange('recipientType', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="company">طرف حساب</option>
                      <option value="customer">مشتري طرف حساب</option>
                    </select>
                  </div>
                  {selectedSlipInfo?.recipientType === 'company' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">طرف حساب</label>
                        <select
                          value={selectedSlipInfo?.counterpartyId || ''}
                          onChange={(e) => handleChange('counterpartyId', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">انتخاب کنيد</option>
                          {baseData.companies?.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">لوکيشن طرف حساب</label>
                        <select
                          value={selectedSlipInfo?.companyLocationId || ''}
                          onChange={(e) => handleChange('companyLocationId', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">انتخاب کنيد</option>
                          {baseData.companiesLocation?.map((l: any) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  {selectedSlipInfo?.recipientType === 'customer' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">مشتري طرف حساب</label>
                        <select
                          value={selectedSlipInfo?.customerCompanyId || ''}
                          onChange={(e) => handleChange('customerCompanyId', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">انتخاب کنيد</option>
                          {baseData.customerCompanies?.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">لوکيشن مشتري طرف حساب</label>
                        <select
                          value={selectedSlipInfo?.customerLocationId || ''}
                          onChange={(e) => handleChange('customerLocationId', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">انتخاب کنيد</option>
                          {baseData.customerCompaniesLocation?.map((l: any) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* جداول پايين صفحه - اطلاعات رسيد انبار، مجوزها و اطلاعات حواله جديد */}
        <div className="mt-6 space-y-6">
          {/* جدول اطلاعات رسيد انبار */}
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
            <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-orange-600 to-orange-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Package className="h-5 w-5 ml-2" />
                  اطلاعات رسيد انبار
                </h2>
                <div className="flex gap-2">
                  <button className="p-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors shadow-sm" title="دانلود">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-x-auto overflow-y-auto max-h-[300px]">
              {selectedSlipInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 min-w-[800px]">
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">طرف حساب</h3>
                    <p className="text-gray-900">{selectedSlipInfo.counterpartyName}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">مشتري طرف حساب</h3>
                    <p className="text-gray-900">{selectedSlipInfo.customerCounterpartyName || '-'}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">لوکيشن طرف حساب</h3>
                    <p className="text-gray-900">{selectedSlipInfo.counterpartyLocationName || '-'}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">لوکيشن مشتري طرف حساب</h3>
                    <p className="text-gray-900">{selectedSlipInfo.customerCounterpartyLocationName || '-'}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">شماره قرارداد</h3>
                    <p className="text-gray-900">{selectedSlipInfo.contractNumber}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">مقدار مبناي رسيد</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.receiptBasisAmount || 0)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">درصد افت</h3>
                    <p className="text-gray-900">{selectedSlipInfo.wastagePercentage ? `${selectedSlipInfo.wastagePercentage}%` : '-'}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">وزن افت</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.wastageAmount)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">مقدار رسيد</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.amount)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">نام کالا اماني</h3>
                    <p className="text-gray-900">{selectedSlipInfo.productName}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">سايت مخازن</h3>
                    <p className="text-gray-900">{selectedSlipInfo.siteName}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">مخزن</h3>
                    <p className="text-gray-900">{selectedSlipInfo.tankName}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">تاريخ رسيد</h3>
                    <p className="text-gray-900">{formatPersianDate(selectedSlipInfo.permitDate)}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">واحد سنجش</h3>
                    <p className="text-gray-900">{selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">وضعيت تراکنش</h3>
                    <p className="text-gray-900">{selectedSlipInfo.status}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">شماره رسيد انبار</h3>
                    <p className="text-gray-900">{selectedSlipInfo.receiptNumber}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">شماره شاخص /ثبت سفارش</h3>
                    <p className="text-gray-900">{selectedSlipInfo.indexNumber || '-'}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">شماره کوتاژ</h3>
                    <p className="text-gray-900">{selectedSlipInfo.cotageNumber || '-'}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">رانندگان</h3>
                    <p className="text-gray-900">{selectedSlipInfo.driverName || '-'}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="text-sm font-medium text-orange-600 mb-1">نام کشتي</h3>
                    <p className="text-gray-900">{selectedSlipInfo.shipName || '-'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                  <Info className="h-8 w-8 mb-2 text-gray-400" />
                  لطفاً يک مورد را از جدول "اطلاعات اماني" انتخاب کنيد.
                </div>
              )}
            </div>
          </div>

          {/* جدول مجوزها */}
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
            <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Settings className="h-5 w-5 ml-2" />
                  مجوزها
                </h2>
                <div className="flex gap-2">
                  <button className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm" title="دانلود">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-x-auto overflow-y-auto max-h-[300px]">
              {selectedSlipInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 min-w-[800px]">
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">مقدار مجوز حواله</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.permitAmount)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">مانده مجوز حواله</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.remainingPermitAmount)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">مقدار افت مجوز</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.wastageAmount)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">مقدار مجوز بعد از کسر افت</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.finalPermitAmount)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">مانده مجوز</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.remainingTransferPermit)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">تاريخ مجوز</h3>
                    <p className="text-gray-900">{formatPersianDate(selectedSlipInfo.permitDate)}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">تاريخ تاييد مجوز</h3>
                    <p className="text-gray-900">{formatPersianDate(selectedSlipInfo.approvalDate)}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">وضعيت تراکنش</h3>
                    <p className="text-gray-900">{selectedSlipInfo.status}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">رخداد</h3>
                    <p className="text-gray-900">{selectedSlipInfo.event}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">شماره مجوز</h3>
                    <p className="text-gray-900">{selectedSlipInfo.permitNumber}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-600 mb-1">شماره نامه مديريت</h3>
                    <p className="text-gray-900">{selectedSlipInfo.managementLetterNumber}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                  <Info className="h-8 w-8 mb-2 text-gray-400" />
                  لطفاً يک مورد را از جدول "اطلاعات اماني" انتخاب کنيد.
                </div>
              )}
            </div>
          </div>

          {/* جدول اطلاعات حواله جديد */}
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
            <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-green-600 to-green-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Package className="h-5 w-5 ml-2" />
                  اطلاعات حواله جديد
                </h2>
                <div className="flex gap-2">
                  <button className="p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors shadow-sm" title="دانلود">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-x-auto overflow-y-auto max-h-[300px]">
              {selectedSlipInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 min-w-[800px]">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">شماره حواله</h3>
                    <p className="text-gray-900">{selectedSlipInfo.permitNumber}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">طرف حساب</h3>
                    <p className="text-gray-900">{selectedSlipInfo.counterpartyName}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">مقدار حواله</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.amount)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">تاريخ حواله</h3>
                    <p className="text-gray-900">{formatPersianDate(selectedSlipInfo.slipDate)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">سايت داخلي</h3>
                    <p className="text-gray-900">{baseData.internalSites?.find((s: any) => s.id === selectedSlipInfo.internalSiteId)?.name || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">سايت پيمانکار</h3>
                    <p className="text-gray-900">{baseData.contractorSites?.find((s: any) => s.id === selectedSlipInfo.contractorSiteId)?.name || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">لوکيشن</h3>
                    <p className="text-gray-900">{baseData.locations?.find((l: any) => l.id === selectedSlipInfo.locationId)?.name || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">نوع گيرنده</h3>
                    <p className="text-gray-900">{selectedSlipInfo.recipientType === 'company' ? 'طرف حساب' : 'مشتري طرف حساب'}</p>
                  </div>
                  {selectedSlipInfo.recipientType === 'company' ? (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">لوکيشن طرف حساب</h3>
                      <p className="text-gray-900">{baseData.companiesLocation?.find((l: any) => l.id === selectedSlipInfo.companyLocationId)?.name || '-'}</p>
                    </div>
                  ) : (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">لوکيشن مشتري طرف حساب</h3>
                      <p className="text-gray-900">{baseData.customerCompaniesLocation?.find((l: any) => l.id === selectedSlipInfo.customerLocationId)?.name || '-'}</p>
                    </div>
                  )}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">نام کالا</h3>
                    <p className="text-gray-900">{selectedSlipInfo.productName}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">مخزن</h3>
                    <p className="text-gray-900">{selectedSlipInfo.tankName}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">وضعيت</h3>
                    <p className="text-gray-900">{selectedSlipInfo.status}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">شماره قرارداد</h3>
                    <p className="text-gray-900">{selectedSlipInfo.contractNumber}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">مانده مجوز حواله</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.remainingPermitAmount)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">مقدار مجوز حواله</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.permitAmount)} {selectedSlipInfo.unit}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">نام راننده</h3>
                    <p className="text-gray-900">{selectedSlipInfo.driverName || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">پلاک راننده</h3>
                    <p className="text-gray-900">{selectedSlipInfo.driverPlateNumber || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">کد ملي راننده</h3>
                    <p className="text-gray-900">{selectedSlipInfo.driverNationalId || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">نام کشتي</h3>
                    <p className="text-gray-900">{selectedSlipInfo.shipName || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">شماره شاخص</h3>
                    <p className="text-gray-900">{selectedSlipInfo.indexNumber || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">شماره کوتاژ</h3>
                    <p className="text-gray-900">{selectedSlipInfo.cotageNumber || '-'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">درصد افت</h3>
                    <p className="text-gray-900">{selectedSlipInfo.wastagePercentage ? `${selectedSlipInfo.wastagePercentage}%` : '-'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-600 mb-1">مقدار مبناي رسيد</h3>
                    <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.receiptBasisAmount || 0)} {selectedSlipInfo.unit}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                  <Info className="h-8 w-8 mb-2 text-gray-400" />
                  لطفاً يک مورد را از جدول "اطلاعات اماني" انتخاب کنيد.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsignmentDeliverySlip;