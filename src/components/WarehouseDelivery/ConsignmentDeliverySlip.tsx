import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ArrowLeft, Save, Edit2, Printer, Trash2, Plus, AlertCircle, CheckCircle, Info, FileText, Package, Settings, Download, CheckSquare } from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../Common/PersianDatePicker';
import { Tooltip } from '../Common/Tooltip';

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
  deliveryCounterpartyId?: string;
  deliveryCounterpartyName?: string;
  _deliveryCounterpartySource?: string;
  // فيلد جديد براي مقدار مجوز حواله
  permitAmount: number;
  // فيلد جديد براي مانده مجوز حواله
  remainingPermitAmount: number;
  slipDate: Date;
  internalSiteId: string;
  internalSiteName?: string; // ✅ اضافه شد
  contractorSiteId: string;
  contractorSiteName?: string; // ✅ اضافه شد
  locationId: string;
  locationName?: string; // ✅ اضافه شد
  recipientType: 'no-selection' | 'internal-site' | 'contractor-site' | 'counterparty' | 'customer-counterparty';

  companyLocationId?: string;
  companyLocationName?: string; // ✅ اضافه شد
  customerLocationId?: string;
  customerLocationName?: string; // ✅ اضافه شد
  customerCompanyId?: string; // ✅ اضافه شد برای مشتری طرف حساب
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
  // فیلدهای اضافی برای اجاره
  rentalTypeId?: string;
  rentalTypeName?: string;
  rentalRate?: number;
  // فيلدهاي جديد از رسيد
  quotaNumber?: string;
  registrationOrderNumber?: string;
  receiptBasisAmount?: number;
  receiptAmount?: number;
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
  // فیلد توضیحات
  description?: string;
  // فیلد شماره تراکنش حواله
  transactionNumber?: string;
  // فیلد حالت ویرایش
  editMode?: string;
  // فیلد وضعیت بررسی شده
  isChecked?: boolean;
  // فیلدهای کمکی برای حالت‌های مختلف
  _editingSource?: string;
  _isParentEdit?: boolean;
  _originalAmount?: number;
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
  onSave: _onSave, 
  calculateRemainingInventory: _calculateRemainingInventory,
  checkedTransactions: propCheckedTransactions = new Set(),
  setCheckedTransactions: _propSetCheckedTransactions,
  disabledTransactions: propDisabledTransactions = new Set(),
  setDisabledTransactions: _propSetDisabledTransactions
}) => {
  const [availablePermits, setAvailablePermits] = useState<ConsignmentSlipInfo[]>([]);
  const [selectedSlipInfo, setSelectedSlipInfo] = useState<ConsignmentSlipInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [baseData, setBaseData] = useState<any>(propBaseData || {
    sites: [],
    internalSites: [],
    contractorSites: [],
    locations: [],
    companies: [],
    customerCompanies: [],
    companiesLocation: [],
    customerCompaniesLocation: [],
    tanks: [],
    drivers: [],
    contracts: []
  });
  const [_isAddingNew, setIsAddingNew] = useState(false);
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, _setSaveSuccess] = useState(false);
  const [_selectedPermitNumber, setSelectedPermitNumber] = useState('');
  // ✨ حالت‌های عملیاتی (سه حالت اصلی)
  const [isEditingFromParent, setIsEditingFromParent] = useState(false); // حالت ویرایش از والد (جدول اطلاعات امانی)
  const [isCreatingFromPermit, setIsCreatingFromPermit] = useState(false); // حالت ایجاد از مجوز
  const [isEditingFromTransactionList, setIsEditingFromTransactionList] = useState(false); // حالت ویرایش مستقیم (از تراکنش‌های ثبت شده)
  
  // State برای کنترل تولید خودکار شماره حواله
  const [autoGeneratedTransactionNumber, setAutoGeneratedTransactionNumber] = useState('');
  const [autoGeneratedDate, setAutoGeneratedDate] = useState(new Date());
  
  // State for "To be checked" field
  const [checkedTransactions, setCheckedTransactions] = useState<Set<string>>(propCheckedTransactions);
  const [disabledTransactions, _setDisabledTransactions] = useState<Set<string>>(propDisabledTransactions);
  
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
  
  const storage = DataStorage.getInstance();
  
  useEffect(() => {
    const savedSettings = (storage.loadData('settings') || {}) as any;
    const performance = savedSettings.performance || {};
    setEnforceDeliveryExtraInfo({
      consignment: performance.requireConsignmentDeliveryExtraInfo || false,
      owned: performance.requireOwnedDeliveryExtraInfo || false
    });
  }, [storage]);

  // همگام‌سازی وزن (مبنا) با مقدار حواله و تاریخ بارنامه با تاریخ حواله
  useEffect(() => {
    if ((showDeliveryExtraInfo || enforceDeliveryExtraInfo.consignment) && selectedSlipInfo?.amount !== undefined) {
      setDeliveryExtraInfo(prev => ({
        ...prev,
        weight: selectedSlipInfo.amount || 0
      }));
    }
    if ((showDeliveryExtraInfo || enforceDeliveryExtraInfo.consignment) && selectedSlipInfo?.slipDate) {
      setDeliveryExtraInfo(prev => ({
        ...prev,
        billDate: prev.billDate || selectedSlipInfo.slipDate
      }));
    }
    // همگام‌سازی آدرس مقصد
    if ((showDeliveryExtraInfo || enforceDeliveryExtraInfo.consignment) && selectedSlipInfo) {
      const destinationAddress = 
        selectedSlipInfo.internalSiteName || 
        selectedSlipInfo.contractorSiteName || 
        selectedSlipInfo.counterpartyName || 
        selectedSlipInfo.customerCounterpartyName || '';
      if (destinationAddress && !deliveryExtraInfo.destinationAddress) {
        setDeliveryExtraInfo(prev => ({
          ...prev,
          destinationAddress
        }));
      }
    }
  }, [selectedSlipInfo?.amount, selectedSlipInfo?.slipDate, selectedSlipInfo?.internalSiteName, selectedSlipInfo?.contractorSiteName, selectedSlipInfo?.counterpartyName, selectedSlipInfo?.customerCounterpartyName, showDeliveryExtraInfo, enforceDeliveryExtraInfo.consignment]);
  
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
  }, []);

  // تابع محاسبه موجودي مخزن - با فرمول جديد براي حالت ويرايش و ايجاد
  const calculateTankInventory = useCallback((siteId: string, tankId: string, _permitId?: string, currentSlipId?: string, _isCreating: boolean = false) => {
  // فرمول جدید "مانده موجودی مخزن در سایت":
  // (جمع تمام رسیدهای امانی انجام شده در آن سایت و در آن مخزن + 
  //  جمع تمام رسیدهای تملیکی انجام شده در آن سایت و در آن مخزن + 
  //  سند اضافه انبار امانی در آن سایت و در آن مخزن + 
  //  سند اضافه انبار تملیکی در آن سایت و در آن مخزن) - 
  // (جمع تمام حواله های امانی انجام شده در آن سایت و در آن مخزن + 
  //  جمع تمام حواله های تملیکی انجام شده در آن سایت و در آن مخزن + 
  //  سند کسر انبار امانی در آن سایت و در آن مخزن + 
  //  سند کسر انبار تملیکی در آن سایت و در آن مخزن)

  const receipts = (storage.loadData('receipts') || []) as any[];
  const consignmentSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
  const ownershipSlips = (storage.loadData('ownership-delivery-slips') || []) as any[];
  const tankAdjustmentSlips = (storage.loadData('tank-adjustment-slips') || []) as any[];
  const inventoryAdjustments = (storage.loadData('inventoryAdjustments') || []) as any[];

  // محاسبه رسیدهای امانی و تملیکی
  const totalReceipts = receipts
    .filter((r: any) => r.siteId === siteId && r.tankId === tankId && !r.isVoided)
    .reduce((sum: number, r: any) => sum + (r.finalAmount || r.amount || 0), 0);

  // محاسبه سندهای اضافه انبار امانی و تملیکی (tankAdjustmentSlips)
  const totalTankAdditions = tankAdjustmentSlips
    .filter((t: any) => t.siteId === siteId && t.tankId === tankId && t.type === 'add' && !t.isVoided)
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
  
  // اضافه کردن inventoryAdjustments که نوع addition دارند
  const totalInventoryAdditions = inventoryAdjustments
    .filter((doc: any) => doc.siteId === siteId && doc.tankId === tankId && doc.adjustmentType === 'addition' && !doc.isVoided)
    .reduce((sum: number, doc: any) => sum + (doc.quantity || 0), 0);

  // محاسبه تمام افت های امانی (wastage)
  // توجه: افت نباید به موجودی اضافه شود، چون از مقدار رسید کسر می‌شود
  // finalAmount در رسیدها قبلاً افت را در نظر گرفته است
  // اما بر اساس فرمول کاربر، افت باید به ورودی اضافه شود
  const consignmentReceipts = receipts.filter((r: any) => r.userType === 'consignment' && r.siteId === siteId && r.tankId === tankId && !r.isVoided);
  const totalConsignmentLosses = consignmentReceipts.reduce((sum: number, r: any) => sum + Math.abs(r.wastageWeight || 0), 0);

  // محاسبه حواله های امانی (Consignment) - حذف حواله فعلی در حالت ویرایش/ایجاد + فیلتر نوع و تاریخ
  const totalConsignmentDeliveries = consignmentSlips
    .filter((s: any) => {
      // فیلتر اولیه: سایت، مخزن، عدم void بودن
      let isValid = s.siteId === siteId && s.tankId === tankId && !s.isVoided;
      
      // فیلتر نوع تراکنش - فقط تراکنش‌های با type='امانی'
      if (isValid && s.type !== 'امانی') {
        isValid = false;
      }
      
      // فیلتر تاریخ - فقط تراکنش‌های تا تاریخ انتخاب شده
      if (isValid) {
        const dateValue = s.deliveryDate || s.slipDate;
        if (dateValue) {
          const deliveryDate = new Date(dateValue);
          // فرض می‌کنیم selectedDate از context آمده، اگر نه از تاریخ امروز استفاده می‌کنیم
          const upToDate = new Date();
          if (deliveryDate > upToDate) {
            isValid = false;
          }
        }
      }
      
      // در حالت ایجاد، حواله فعلی هنوز ذخیره نشده پس نیازی به فیلتر نیست
      // در حالت ویرایش، حواله فعلی را حذف کن
      if (isValid && currentSlipId) {
        if (s.id === currentSlipId) {
          isValid = false;
        }
      }
      
      return isValid;
    })
    .reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

  // محاسبه حواله های تملیکی (Ownership) - در حالت ایجاد حواله امانی، حواله فعلی تملیکی را حذف نکن
  const totalOwnershipDeliveries = ownershipSlips
    .filter((s: any) => s.siteId === siteId && s.tankId === tankId && !s.isVoided)
    .reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

  // محاسبه سندهای کسر انبار امانی و تملیکی (tankAdjustmentSlips)
  const totalTankDeductions = tankAdjustmentSlips
    .filter((t: any) => t.siteId === siteId && t.tankId === tankId && t.type === 'deduct' && !t.isVoided)
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
  
  // اضافه کردن inventoryAdjustments که نوع deduction دارند
  const totalInventoryDeductions = inventoryAdjustments
    .filter((doc: any) => doc.siteId === siteId && doc.tankId === tankId && doc.adjustmentType === 'deduction' && !doc.isVoided)
    .reduce((sum: number, doc: any) => sum + (doc.quantity || 0), 0);

  // فرمول کلی: مجموع ورودی - مجموع خروجی
  // طبق درخواست کاربر: افت‌های امانی باید به ورودی اضافه شود
  const totalInputs = totalReceipts + totalTankAdditions + totalInventoryAdditions + totalConsignmentLosses;
  const totalOutputs = totalConsignmentDeliveries + totalOwnershipDeliveries + totalTankDeductions + totalInventoryDeductions;
  
  // اجازه نمایش موجودی منفی برای نشان دادن مشکل - اما در validation باید 0 در نظر گرفته شود
  return totalInputs - totalOutputs;
}, [storage]);

  // Helper function to calculate total tank capacity based on filters - مشابه InventoryAdjustmentManager
  const calculateTotalTankCapacity = useCallback(() => {
    const tanks = baseData?.tanks || [];
    let totalCapacity = 0;
    tanks.forEach((tank: any) => {
      const capacityStr = tank.capacity || "5,000,000 کیلوگرم";
      const capacityMatch = capacityStr.match(/[\d,]+/);
      const capacity = capacityMatch ? parseInt(capacityMatch[0].replace(/,/g, '')) : 5000000;
      totalCapacity += capacity;
    });
    return totalCapacity;
  }, [baseData?.tanks]);

  // تابع تبدیل تاریخ میلادی به شمسی با فرمت YYYYMMDD
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

  // تابع تولید شماره تراکنش حواله با فرمت جدید کاربر
  const generateConsignmentTransactionNumber = useCallback((date: Date) => {
    const slips = (storage.loadData('consignment-delivery-slips') || []) as any[];
    const persianDate = toPersianDate(date); // YYYYMMDD format
    
    // شماره‌گذاری پیوسته برای هر تاریخ با کنترل تکرار
    // فرمت جدید کاربر: W-تاریخ-سریال نامبر (مثل W-14040817-000000)
    // سریال نامبر از صفر شروع شود تا 6 رقم
    const existingTransactionNumbers = slips
      .map((s: any) => s.transactionNumber)
      .filter((num: string) => num && num.startsWith('EWRE') && num.includes(`-${persianDate}-`))
      .map((num: string) => {
        const parts = num.split('-');
        return parseInt(parts[2] || '0', 10); // بخش سوم که شماره 6 رقمی است
      })
      .filter(n => !isNaN(n));
    
    let nextNumber = 1; // از 1 شروع شود (000001, 000002, 000003, ...)
    if (existingTransactionNumbers.length > 0) {
      nextNumber = Math.max(...existingTransactionNumbers) + 1;
    }
    
    // تولید شماره جدید و اطمینان از عدم تکرار
    let newTransactionNumber: string = '';
    let attempts = 0;
    do {
      newTransactionNumber = `EWRE-${persianDate}-${nextNumber.toString().padStart(6, '0')}`;
      const exists = (slips as any[]).some((s: any) => s.transactionNumber === newTransactionNumber);
      if (!exists) break;
      nextNumber++; // افزایش 1 برای شماره بعدی
      attempts++;
    } while (attempts < 1000);
    
    // بازگرداندن با فرمت صحیح: W-YYYYMMDD-XXXXXX
    return newTransactionNumber;
  }, [toPersianDate, storage]);

  // تابع محاسبه مانده مجوز حواله با فرمول جدید کاربر - کاملاً اصلاح شده
  const calculateRemainingPermitAmount = useCallback((
    permitId: string, 
    permitAmount: number, 
    currentSlipId?: string, 
    isEditing: boolean = false, 
    newAmount?: number, 
    editingSource?: 'parent' | 'transaction-list'
  ) => {
  // مرجع محاسبه: ليست اصلي deliveries (معتبرتر از اسلاپ‌ها)
  const deliveries = (storage.loadData('deliveries') || []) as any[];
  const allForPermit = deliveries.filter((d: any) => d.permitId === permitId && !d.isVoided);

  // فقط تراکنش‌های "صادر شده" در مجموع لحاظ می‌شوند
  let totalIssued = allForPermit
    .filter((d: any) => d.status === 'issued')
    .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

  // اگر در حالت ویرایش مستقیم هستیم و تراکنش فعلی قبلاً issued بوده، مقدار قدیمی‌اش را از مجموع issued کم کن
  if (isEditing && currentSlipId && editingSource === 'transaction-list') {
    const current = allForPermit.find((d: any) => d.id === currentSlipId);
    const currentOriginalAmount = current ? (current.amount || 0) : 0;
    if (current && current.status === 'issued') {
      totalIssued -= currentOriginalAmount;
    }
  }

  // مانده = مقدار مجوز − مجموع issued
  let remainingAmount = Math.max(0, (permitAmount || 0) - totalIssued);

  // اگر مقدار جديد براي همين تراکنش در حال ويرايش داده شده بود، براي نمايش لحظه‌اي مي‌توانيد آن را لحاظ کنيد
  if (isEditing && newAmount !== undefined && editingSource === 'transaction-list') {
    remainingAmount = Math.max(0, (permitAmount || 0) - totalIssued); // newAmount را به مانده اضافه نمي‌کنيم
  }

  return remainingAmount;
}, [storage]);

// NOTE: اثر محاسبه مانده مجوز را بعد از تعريف تابع calculateRemainingPermitAmount اضافه مي‌کنيم (پايين‌تر)

  // اطمینان از محاسبه و نمایش صحیح "مانده مجوز حواله" فقط بر اساس حواله‌های صادر شده
  useEffect(() => {
    try {
      if (selectedSlipInfo?.permitId && selectedSlipInfo?.permitAmount !== undefined) {
        const isEditingFromParent = selectedSlipInfo?._editingSource === 'parent';
        const isEditingFromTransactionList = selectedSlipInfo?._editingSource === 'transaction-list';
        const editingSlipId = selectedSlipInfo?.id;
        const isEditingMode = isEditingFromParent || isEditingFromTransactionList || !!editingSlipId;

        const newRemaining = calculateRemainingPermitAmount(
          selectedSlipInfo.permitId,
          Number(selectedSlipInfo.permitAmount) || 0,
          editingSlipId,
          isEditingMode
        );

        if (Number(selectedSlipInfo.remainingPermitAmount) !== Number(newRemaining)) {
          setSelectedSlipInfo((prev: ConsignmentSlipInfo | null) => {
            if (!prev) return null;
            return { ...prev, remainingPermitAmount: newRemaining };
          });
        }
      }
    } catch (e) {
      // ignore
    }
    // وابستگی‌ها را به فیلدهای لازم محدود می‌کنیم تا از خطای TDZ جلوگیری شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlipInfo?.permitId, selectedSlipInfo?.permitAmount, selectedSlipInfo?._editingSource, selectedSlipInfo?.id]);
  
  // ⭐ useEffect برای پر کردن خودکار فیلدهای سایت و لوکیشن از baseData
  useEffect(() => {
    if (!selectedSlipInfo || !baseData) {
      console.log('⚠️ useEffect: selectedSlipInfo یا baseData موجود نیست', { 
        hasSelectedSlipInfo: !!selectedSlipInfo, 
        hasBaseData: !!baseData,
        baseDataKeys: baseData ? Object.keys(baseData) : []
      });
      return;
    }
    
    console.log('🔍 useEffect: بررسی فیلدها برای پر کردن از baseData', {
      internalSiteId: selectedSlipInfo.internalSiteId,
      internalSiteName: selectedSlipInfo.internalSiteName,
      contractorSiteId: selectedSlipInfo.contractorSiteId,
      contractorSiteName: selectedSlipInfo.contractorSiteName,
      companyLocationId: selectedSlipInfo.companyLocationId,
      companyLocationName: selectedSlipInfo.companyLocationName,
      customerLocationId: selectedSlipInfo.customerLocationId,
      customerLocationName: selectedSlipInfo.customerLocationName,
      recipientType: selectedSlipInfo.recipientType,
      baseDataInternalSites: baseData.internalSites?.length || 0,
      baseDataContractorSites: baseData.contractorSites?.length || 0,
      baseDataCompaniesLocation: baseData.companiesLocation?.length || 0,
      baseDataCustomerCompaniesLocation: baseData.customerCompaniesLocation?.length || 0
    });
    
    let updated = false;
    const updatedSlipInfo = { ...selectedSlipInfo };
    
    // ⭐ پر کردن خودکار سایت داخلی از baseData (اگر ID موجود است اما نام خالی است)
    if (updatedSlipInfo.internalSiteId && !updatedSlipInfo.internalSiteName) {
      const site = baseData.internalSites?.find((s: any) => s.id === updatedSlipInfo.internalSiteId);
      if (site) {
        updatedSlipInfo.internalSiteName = site.name;
        updated = true;
        console.log('✅ سایت داخلی به صورت خودکار از baseData پر شد:', site.name);
      } else {
        console.warn('⚠️ سایت داخلی با ID', updatedSlipInfo.internalSiteId, 'در baseData.internalSites یافت نشد');
      }
    }
    
    // ⭐ پر کردن خودکار سایت پیمانکار از baseData (اگر ID موجود است اما نام خالی است)
    if (updatedSlipInfo.contractorSiteId && !updatedSlipInfo.contractorSiteName) {
      const site = baseData.contractorSites?.find((s: any) => s.id === updatedSlipInfo.contractorSiteId);
      if (site) {
        updatedSlipInfo.contractorSiteName = site.name;
        updated = true;
        console.log('✅ سایت پیمانکار به صورت خودکار از baseData پر شد:', site.name);
      }
    }
    
    // ⭐ پر کردن خودکار لوکیشن طرف حساب از baseData (اگر ID موجود است اما نام خالی است)
    if (updatedSlipInfo.companyLocationId && !updatedSlipInfo.companyLocationName) {
      const location = baseData.companiesLocation?.find((l: any) => l.id === updatedSlipInfo.companyLocationId);
      if (location) {
        updatedSlipInfo.companyLocationName = location.name;
        updatedSlipInfo.counterpartyLocationName = location.name;
        updated = true;
        console.log('✅ لوکیشن طرف حساب به صورت خودکار از baseData پر شد:', location.name);
      } else {
        console.warn('⚠️ لوکیشن طرف حساب با ID', updatedSlipInfo.companyLocationId, 'در baseData.companiesLocation یافت نشد');
      }
    }
    
    // ⭐ پر کردن خودکار لوکیشن مشتری طرف حساب از baseData (اگر ID موجود است اما نام خالی است)
    if (updatedSlipInfo.customerLocationId && !updatedSlipInfo.customerLocationName) {
      const location = baseData.customerCompaniesLocation?.find((l: any) => l.id === updatedSlipInfo.customerLocationId);
      if (location) {
        updatedSlipInfo.customerLocationName = location.name;
        updatedSlipInfo.customerCounterpartyLocationName = location.name;
        updated = true;
        console.log('✅ لوکیشن مشتری طرف حساب به صورت خودکار از baseData پر شد:', location.name);
      } else {
        console.warn('⚠️ لوکیشن مشتری طرف حساب با ID', updatedSlipInfo.customerLocationId, 'در baseData.customerCompaniesLocation یافت نشد');
      }
    }
    
    // ⭐ اگر ID موجود است اما نام خالی است، از baseData پیدا کن (حتی اگر ID در baseData نباشد)
    if (updatedSlipInfo.internalSiteId && !updatedSlipInfo.internalSiteName && baseData.internalSites) {
      const site = baseData.internalSites.find((s: any) => s.id === updatedSlipInfo.internalSiteId);
      if (site) {
        updatedSlipInfo.internalSiteName = site.name;
        updated = true;
        console.log('✅ سایت داخلی نام از baseData پیدا شد:', site.name);
      }
    }
    
    if (updatedSlipInfo.contractorSiteId && !updatedSlipInfo.contractorSiteName && baseData.contractorSites) {
      const site = baseData.contractorSites.find((s: any) => s.id === updatedSlipInfo.contractorSiteId);
      if (site) {
        updatedSlipInfo.contractorSiteName = site.name;
        updated = true;
        console.log('✅ سایت پیمانکار نام از baseData پیدا شد:', site.name);
      }
    }
    
    if (updatedSlipInfo.companyLocationId && !updatedSlipInfo.companyLocationName && baseData.companiesLocation) {
      const location = baseData.companiesLocation.find((l: any) => l.id === updatedSlipInfo.companyLocationId);
      if (location) {
        updatedSlipInfo.companyLocationName = location.name;
        updatedSlipInfo.counterpartyLocationName = location.name;
        updated = true;
        console.log('✅ لوکیشن طرف حساب نام از baseData پیدا شد:', location.name);
      }
    }
    
    if (updatedSlipInfo.customerLocationId && !updatedSlipInfo.customerLocationName && baseData.customerCompaniesLocation) {
      const location = baseData.customerCompaniesLocation.find((l: any) => l.id === updatedSlipInfo.customerLocationId);
      if (location) {
        updatedSlipInfo.customerLocationName = location.name;
        updatedSlipInfo.customerCounterpartyLocationName = location.name;
        updated = true;
        console.log('✅ لوکیشن مشتری طرف حساب نام از baseData پیدا شد:', location.name);
      }
    }
    
    // ⭐ اگر فیلدها خالی هستند، سعی کن از counterpartyId یا customerCompanyId پیدا کنی
    if (!updatedSlipInfo.companyLocationId && updatedSlipInfo.counterpartyId && updatedSlipInfo.counterpartyId !== 'no-selection' && baseData?.companiesLocation) {
      const autoLocation = baseData.companiesLocation.find((loc: any) => 
        loc.companyId === updatedSlipInfo.counterpartyId || loc.id === updatedSlipInfo.counterpartyId
      );
      if (autoLocation) {
        updatedSlipInfo.companyLocationId = autoLocation.id;
        updatedSlipInfo.companyLocationName = autoLocation.name;
        updatedSlipInfo.counterpartyLocationName = autoLocation.name;
        updated = true;
        console.log('✅ لوکیشن طرف حساب به صورت خودکار از baseData بر اساس counterpartyId پر شد:', autoLocation.name);
      }
    }
    
    if (!updatedSlipInfo.customerLocationId && updatedSlipInfo.customerCompanyId && baseData?.customerCompaniesLocation) {
      const autoLocation = baseData.customerCompaniesLocation.find((loc: any) => 
        loc.companyId === updatedSlipInfo.customerCompanyId || 
        loc.customerCompanyId === updatedSlipInfo.customerCompanyId || 
        loc.id === updatedSlipInfo.customerCompanyId
      );
      if (autoLocation) {
        updatedSlipInfo.customerLocationId = autoLocation.id;
        updatedSlipInfo.customerLocationName = autoLocation.name;
        updatedSlipInfo.customerCounterpartyLocationName = autoLocation.name;
        updated = true;
        console.log('✅ لوکیشن مشتری طرف حساب به صورت خودکار از baseData بر اساس customerCompanyId پر شد:', autoLocation.name);
      }
    }
    
    // ⭐ اگر فیلدها هنوز خالی هستند و baseData موجود است، اولین گزینه را به صورت خودکار انتخاب کن
    // (فقط اگر یک گزینه وجود دارد یا برای تست)
    if (!updatedSlipInfo.internalSiteId && baseData?.internalSites && baseData.internalSites.length > 0) {
      // فقط اگر recipientType مربوط به internal-site است
      if (updatedSlipInfo.recipientType === 'internal-site') {
        const firstSite = baseData.internalSites[0];
        updatedSlipInfo.internalSiteId = firstSite.id;
        updatedSlipInfo.internalSiteName = firstSite.name;
        updated = true;
        console.log('✅ سایت داخلی به صورت خودکار از baseData (اولین گزینه) پر شد:', firstSite.name);
      }
    }
    
    if (!updatedSlipInfo.contractorSiteId && baseData?.contractorSites && baseData.contractorSites.length > 0) {
      // فقط اگر recipientType مربوط به contractor-site است
      if (updatedSlipInfo.recipientType === 'contractor-site') {
        const firstSite = baseData.contractorSites[0];
        updatedSlipInfo.contractorSiteId = firstSite.id;
        updatedSlipInfo.contractorSiteName = firstSite.name;
        updated = true;
        console.log('✅ سایت پیمانکار به صورت خودکار از baseData (اولین گزینه) پر شد:', firstSite.name);
      }
    }
    
    if (!updatedSlipInfo.companyLocationId && baseData?.companiesLocation && baseData.companiesLocation.length > 0) {
      // فقط اگر recipientType مربوط به counterparty است
      if (updatedSlipInfo.recipientType === 'counterparty') {
        const firstLocation = baseData.companiesLocation[0];
        updatedSlipInfo.companyLocationId = firstLocation.id;
        updatedSlipInfo.companyLocationName = firstLocation.name;
        updatedSlipInfo.counterpartyLocationName = firstLocation.name;
        updated = true;
        console.log('✅ لوکیشن طرف حساب به صورت خودکار از baseData (اولین گزینه) پر شد:', firstLocation.name);
      }
    }
    
    if (!updatedSlipInfo.customerLocationId && baseData?.customerCompaniesLocation && baseData.customerCompaniesLocation.length > 0) {
      // فقط اگر recipientType مربوط به customer-counterparty است
      if (updatedSlipInfo.recipientType === 'customer-counterparty') {
        const firstLocation = baseData.customerCompaniesLocation[0];
        updatedSlipInfo.customerLocationId = firstLocation.id;
        updatedSlipInfo.customerLocationName = firstLocation.name;
        updatedSlipInfo.customerCounterpartyLocationName = firstLocation.name;
        updated = true;
        console.log('✅ لوکیشن مشتری طرف حساب به صورت خودکار از baseData (اولین گزینه) پر شد:', firstLocation.name);
      }
    }
    
    if (updated) {
      setSelectedSlipInfo(updatedSlipInfo);
    }
  }, [selectedSlipInfo?.internalSiteId, selectedSlipInfo?.contractorSiteId, selectedSlipInfo?.companyLocationId, selectedSlipInfo?.customerLocationId, selectedSlipInfo?.counterpartyId, selectedSlipInfo?.customerCompanyId, selectedSlipInfo?.recipientType, baseData]);
  
  useEffect(() => {
    // اگر baseData از props آمده و حاوی داده‌های واقعی است، از آن استفاده کن
    const hasRealData = propBaseData && 
      Object.keys(propBaseData).length > 0 && 
      (propBaseData.companies?.length > 0 || 
       propBaseData.internalSites?.length > 0 || 
       propBaseData.locations?.length > 0 ||
       propBaseData.contractorSites?.length > 0 ||
       propBaseData.sites?.length > 0);
    
    if (hasRealData) {
      console.log('=== USING PROPBASE DATA ===');
      console.log('Received baseData:', propBaseData);
      console.log('🔍 بررسی فیلدهای مورد نیاز در propBaseData:', {
        internalSites: propBaseData.internalSites?.length || 0,
        contractorSites: propBaseData.contractorSites?.length || 0,
        companiesLocation: propBaseData.companiesLocation?.length || 0,
        customerCompaniesLocation: propBaseData.customerCompaniesLocation?.length || 0
      });
      
      // ⭐ اگر فیلدهای مورد نیاز موجود نیستند، از localStorage load کن
      if (!propBaseData.internalSites || propBaseData.internalSites.length === 0 ||
          !propBaseData.contractorSites || propBaseData.contractorSites.length === 0 ||
          !propBaseData.companiesLocation || propBaseData.companiesLocation.length === 0 ||
          !propBaseData.customerCompaniesLocation || propBaseData.customerCompaniesLocation.length === 0) {
        console.log('⚠️ برخی فیلدهای مورد نیاز در propBaseData موجود نیستند، بارگذاری از localStorage...');
        // ادامه به loadBaseData
      } else {
        setBaseData(propBaseData);
        return;
      }
    }

    // تلاش برای بارگذاری baseData از localStorage
    const loadBaseData = () => {
      try {
        console.log('=== LOADING BASE DATA FROM STORAGE ===');
        
        // تلاش برای بارگذاری از categories
        let categories = (storage.loadData('baseDataCategories') || []) as any[];
        console.log('Categories loaded:', categories.length);
        
        if (categories.length === 0) {
          // اگر categories موجود نبود، از کلیدهای جداگانه بخوان
          const categoryKeys = ['sites', 'internal-sites', 'contractor-sites', 'locations', 'companies', 'companies-location', 'customer-companies', 'customer-companies-location', 'tanks', 'drivers'];
          
          categories = categoryKeys.map(key => {
            const categoryData = storage.loadData(`category_${key}`) as any;
            if (categoryData && categoryData.items) {
              return {
                id: key,
                name: categoryData.name || key,
                items: categoryData.items
              };
            }
            return null;
          }).filter(Boolean) as any[];
        }
        
        // استخراج داده‌ها از categories
        const internalSites = categories.find((c: any) => c.id === 'internal-sites')?.items || [];
        const contractorSites = categories.find((c: any) => c.id === 'contractor-sites')?.items || [];
        const companies = categories.find((c: any) => c.id === 'companies')?.items || [];
        const customerCompanies = categories.find((c: any) => c.id === 'customer-companies')?.items || [];
        const locations = categories.find((c: any) => c.id === 'locations')?.items || [];
        const companiesLocation = categories.find((c: any) => c.id === 'companies-location')?.items || [];
        const customerCompaniesLocation = categories.find((c: any) => c.id === 'customer-companies-location')?.items || [];
        const sites = categories.find((c: any) => c.id === 'sites')?.items || [];
        const tanks = categories.find((c: any) => c.id === 'tanks')?.items || [];
        const drivers = categories.find((c: any) => c.id === 'drivers')?.items || [];
        
        console.log('🔍 بررسی categories برای فیلدهای مورد نیاز:', {
          'categories.length': categories.length,
          'category IDs': categories.map((c: any) => c.id),
          'internal-sites found': !!categories.find((c: any) => c.id === 'internal-sites'),
          'internal-sites count': internalSites.length,
          'contractor-sites found': !!categories.find((c: any) => c.id === 'contractor-sites'),
          'contractor-sites count': contractorSites.length,
          'companies-location found': !!categories.find((c: any) => c.id === 'companies-location'),
          'companies-location count': companiesLocation.length,
          'customer-companies-location found': !!categories.find((c: any) => c.id === 'customer-companies-location'),
          'customer-companies-location count': customerCompaniesLocation.length
        });
        
        // بارگذاری قراردادها
        const contracts = (storage.loadData('contracts') || []) as any[];

        const loadedBaseData = {
          sites,
          internalSites,
          contractorSites,
          locations,
          companies,
          customerCompanies,
          companiesLocation,
          customerCompaniesLocation,
          tanks,
          drivers,
          contracts
        };
        
        console.log('=== BASE DATA LOADED ===');
        console.log('Loaded data counts:', {
          sites: sites.length,
          internalSites: internalSites.length,
          contractorSites: contractorSites.length,
          locations: locations.length,
          companies: companies.length,
          customerCompanies: customerCompanies.length,
          companiesLocation: companiesLocation.length,
          customerCompaniesLocation: customerCompaniesLocation.length,
          tanks: tanks.length,
          drivers: drivers.length,
          contracts: contracts.length
        });
        
        // ⭐ همیشه فیلدهای خالی را از loadedBaseData پر کن (حتی اگر propBaseData موجود باشد)
        if (propBaseData && Object.keys(propBaseData).length > 0) {
          const mergedBaseData = {
            ...propBaseData,
            // ⭐ اگر فیلدها در propBaseData خالی هستند یا موجود نیستند، از loadedBaseData استفاده کن
            internalSites: (propBaseData.internalSites && propBaseData.internalSites.length > 0) ? propBaseData.internalSites : loadedBaseData.internalSites,
            contractorSites: (propBaseData.contractorSites && propBaseData.contractorSites.length > 0) ? propBaseData.contractorSites : loadedBaseData.contractorSites,
            companiesLocation: (propBaseData.companiesLocation && propBaseData.companiesLocation.length > 0) ? propBaseData.companiesLocation : loadedBaseData.companiesLocation,
            customerCompaniesLocation: (propBaseData.customerCompaniesLocation && propBaseData.customerCompaniesLocation.length > 0) ? propBaseData.customerCompaniesLocation : loadedBaseData.customerCompaniesLocation,
            // سایر فیلدها
            sites: (propBaseData.sites && propBaseData.sites.length > 0) ? propBaseData.sites : loadedBaseData.sites,
            locations: (propBaseData.locations && propBaseData.locations.length > 0) ? propBaseData.locations : loadedBaseData.locations,
            companies: (propBaseData.companies && propBaseData.companies.length > 0) ? propBaseData.companies : loadedBaseData.companies,
            customerCompanies: (propBaseData.customerCompanies && propBaseData.customerCompanies.length > 0) ? propBaseData.customerCompanies : loadedBaseData.customerCompanies,
            tanks: (propBaseData.tanks && propBaseData.tanks.length > 0) ? propBaseData.tanks : loadedBaseData.tanks,
            drivers: (propBaseData.drivers && propBaseData.drivers.length > 0) ? propBaseData.drivers : loadedBaseData.drivers,
            contracts: (propBaseData.contracts && propBaseData.contracts.length > 0) ? propBaseData.contracts : loadedBaseData.contracts
          };
          console.log('✅ Merged baseData (propBaseData + loadedBaseData):', {
            internalSites: mergedBaseData.internalSites.length,
            contractorSites: mergedBaseData.contractorSites.length,
            companiesLocation: mergedBaseData.companiesLocation.length,
            customerCompaniesLocation: mergedBaseData.customerCompaniesLocation.length,
            source: {
              internalSites: (propBaseData.internalSites && propBaseData.internalSites.length > 0) ? 'propBaseData' : 'loadedBaseData',
              contractorSites: (propBaseData.contractorSites && propBaseData.contractorSites.length > 0) ? 'propBaseData' : 'loadedBaseData',
              companiesLocation: (propBaseData.companiesLocation && propBaseData.companiesLocation.length > 0) ? 'propBaseData' : 'loadedBaseData',
              customerCompaniesLocation: (propBaseData.customerCompaniesLocation && propBaseData.customerCompaniesLocation.length > 0) ? 'propBaseData' : 'loadedBaseData'
            }
          });
          setBaseData(mergedBaseData);
        } else {
          setBaseData(loadedBaseData);
        }
      } catch (error) {
        console.error('Error loading base data:', error);
        // در صورت خطا، baseData خالی قرار بده
        setBaseData({
          sites: [],
          internalSites: [],
          contractorSites: [],
          locations: [],
          companies: [],
          customerCompanies: [],
          companiesLocation: [],
          customerCompaniesLocation: [],
          tanks: [],
          drivers: [],
          contracts: []
        });
      }
    };

    loadBaseData();

    // گوش دادن به رویدادهای به‌روزرسانی baseData
    const handleBaseDataUpdate = () => {
      console.log('Base data updated, reloading...');
      loadBaseData();
    };

    window.addEventListener('baseDataUpdated', handleBaseDataUpdate);

    return () => {
      window.removeEventListener('baseDataUpdated', handleBaseDataUpdate);
    };
  }, [propBaseData, storage]);

  // بارگذاری مجدد داده‌ها در صورت عدم بارگذاری اولیه
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!baseData || Object.keys(baseData).length === 0) {
        console.log('Attempting to reload base data after timeout...');
        // loadBaseData is defined in the useEffect above, we need to reload manually
        const reloadBaseData = () => {
          try {
            let categories = (storage.loadData('baseDataCategories') || []) as any[];
            if (categories.length === 0) {
              const categoryKeys = ['sites', 'internal-sites', 'contractor-sites', 'locations', 'companies', 'companies-location', 'customer-companies', 'customer-companies-location', 'tanks', 'drivers'];
              categories = categoryKeys.map(key => {
                const categoryData = storage.loadData(`category_${key}`) as any;
                if (categoryData && categoryData.items) {
                  return { id: key, name: categoryData.name || key, items: categoryData.items };
                }
                return null;
              }).filter(Boolean) as any[];
            }
            const internalSites = categories.find((c: any) => c.id === 'internal-sites')?.items || [];
            const contractorSites = categories.find((c: any) => c.id === 'contractor-sites')?.items || [];
            const companies = categories.find((c: any) => c.id === 'companies')?.items || [];
            const customerCompanies = categories.find((c: any) => c.id === 'customer-companies')?.items || [];
            const locations = categories.find((c: any) => c.id === 'locations')?.items || [];
            const companiesLocation = categories.find((c: any) => c.id === 'companies-location')?.items || [];
            const customerCompaniesLocation = categories.find((c: any) => c.id === 'customer-companies-location')?.items || [];
            const sites = categories.find((c: any) => c.id === 'sites')?.items || [];
            const tanks = categories.find((c: any) => c.id === 'tanks')?.items || [];
            const drivers = categories.find((c: any) => c.id === 'drivers')?.items || [];
            const contracts = (storage.loadData('contracts') || []) as any[];
            setBaseData({ sites, internalSites, contractorSites, locations, companies, customerCompanies, companiesLocation, customerCompaniesLocation, tanks, drivers, contracts });
          } catch (error) {
            console.error('Error reloading base data:', error);
          }
        };
        reloadBaseData();
      }
    }, 2000); // بعد از 2 ثانیه دوباره تلاش کن

    return () => clearTimeout(timer);
  }, [baseData]);

  // بارگذاری مجدد داده‌ها در صورت عدم بارگذاری اولیه
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!baseData || Object.keys(baseData).length === 0 || 
          (!baseData.sites?.length && !baseData.internalSites?.length && !baseData.companies?.length)) {
        console.log('Retrying base data load...');
        const loadBaseData = () => {
          try {
            let categories = (storage.loadData('baseDataCategories') || []) as any[];
            
            if (categories.length === 0) {
              const categoryKeys = ['sites', 'internal-sites', 'contractor-sites', 'locations', 'companies', 'companies-location', 'customer-companies', 'customer-companies-location', 'tanks', 'drivers'];
              
              categories = categoryKeys.map(key => {
                const categoryData = storage.loadData(`category_${key}`) as any;
                if (categoryData && categoryData.items) {
                  return {
                    id: key,
                    name: categoryData.name || key,
                    items: categoryData.items
                  };
                }
                return null;
              }).filter(Boolean) as any[];
            }
            
            const internalSites = (categories as any[]).find((c: any) => c.id === 'internal-sites')?.items || [];
            const contractorSites = (categories as any[]).find((c: any) => c.id === 'contractor-sites')?.items || [];
            const companies = (categories as any[]).find((c: any) => c.id === 'companies')?.items || [];
            const customerCompanies = (categories as any[]).find((c: any) => c.id === 'customer-companies')?.items || [];
            const locations = (categories as any[]).find((c: any) => c.id === 'locations')?.items || [];
            const companiesLocation = (categories as any[]).find((c: any) => c.id === 'companies-location')?.items || [];
            const customerCompaniesLocation = (categories as any[]).find((c: any) => c.id === 'customer-companies-location')?.items || [];
            const sites = (categories as any[]).find((c: any) => c.id === 'sites')?.items || [];
            const tanks = (categories as any[]).find((c: any) => c.id === 'tanks')?.items || [];
            const drivers = (categories as any[]).find((c: any) => c.id === 'drivers')?.items || [];
            
            const contracts = (storage.loadData('contracts') || []) as any[];

            const loadedBaseData = {
              sites,
              internalSites,
              contractorSites,
              locations,
              companies,
              customerCompanies,
              companiesLocation,
              customerCompaniesLocation,
              tanks,
              drivers,
              contracts
            };
            
            setBaseData(loadedBaseData);
          } catch (error) {
            console.error('Error in retry load:', error);
          }
        };
        loadBaseData();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [baseData, storage]);

  // اين useEffect را براي مديريت initialData به طور کامل جايگزين کنيد
  useEffect(() => {
    if (initialData) {
      console.log('🔧 InitialData received:', initialData);
      console.log('🔧 InitialData keys:', Object.keys(initialData));
      console.log('🔧 InitialData _editingSource:', initialData._editingSource);
      console.log('🔧 InitialData _isParentEdit:', initialData._isParentEdit);
      console.log('🔧 InitialData editMode:', initialData.editMode);
      console.log('🔧 InitialData id:', initialData.id);
      console.log('🔧 InitialData فیلدهای سایت و لوکیشن:', {
        internalSiteId: initialData.internalSiteId,
        internalSiteName: initialData.internalSiteName,
        contractorSiteId: initialData.contractorSiteId,
        contractorSiteName: initialData.contractorSiteName,
        companyLocationId: initialData.companyLocationId,
        companyLocationName: initialData.companyLocationName,
        customerLocationId: initialData.customerLocationId,
        customerLocationName: initialData.customerLocationName,
        recipientType: initialData.recipientType
      });
      
      // تشخیص حالت بر اساس ویژگی‌های initialData
      const isFromParentEdit = initialData.id && 
                               !initialData.id.startsWith('new_') && 
                               initialData._isParentEdit;
      
      // تشخیص حالت ویرایش از تراکنش‌ها
      const isFromTransactionList = initialData.id && 
                                    !initialData.id.startsWith('new_') && 
                                    initialData._editingSource === 'transaction-list';
      
      const isNewFromPermit = initialData.id && initialData.id.startsWith('new_');
      
      console.log('🔧 Edit mode detection:', {
        isFromParentEdit,
        isFromTransactionList,
        isNewFromPermit,
        id: initialData.id,
        startsWithNew: initialData.id?.startsWith('new_'),
        editingSource: initialData._editingSource,
        isParentEdit: initialData._isParentEdit
      });
      
      if (isFromParentEdit) {
        console.log('🚀 Activating Parent Edit Mode');
        // حالت ویرایش از والد (جدول اطلاعات امانی) - "حالت ویرایش والد"
        setIsEditingFromParent(true);
        setIsEditingFromTransactionList(false);
        setIsEditing(true);
        setIsCreatingFromPermit(false);
        setEditingSlipId(initialData.id);
        
        const permits = (storage.loadData('delivery-permits') || []) as any[];
        const permit = permits.find((p: any) => p.id === initialData.permitId);
        const permitAmount = permit ? (permit.permitAmount || permit.amount || 0) : (initialData.permitAmount || 0);
        const remainingForEdit = calculateRemainingPermitAmount(
          initialData.permitId,
          permitAmount,
          initialData.id,
          true,
          undefined,
          'parent'
        );
        // روش‌های متعدد برای دریافت اطلاعات طرف حسابی تحویل دهنده کالا
        let deliveryCounterpartyId = '';
        let deliveryCounterpartyName = '';
        
        // روش ۱: از initialData
        if (!deliveryCounterpartyId) deliveryCounterpartyId = initialData.deliveryCounterpartyId;
        if (!deliveryCounterpartyName) deliveryCounterpartyName = initialData.deliveryCounterpartyName;
        
        // روش ۲: از counterpartyId/counterpartyName
        if (!deliveryCounterpartyId) deliveryCounterpartyId = initialData.counterpartyId;
        if (!deliveryCounterpartyName) deliveryCounterpartyName = initialData.counterpartyName;
        
        // روش ۳: از partyId/partyName
        if (!deliveryCounterpartyId) deliveryCounterpartyId = initialData.partyId || initialData.partnerId;
        if (!deliveryCounterpartyName) deliveryCounterpartyName = initialData.partyName || initialData.partnerName;
        
        // روش ۴: از supplierName
        if (!deliveryCounterpartyName) deliveryCounterpartyName = initialData.supplierName;
        
        setSelectedSlipInfo({ 
          ...initialData, 
          remainingPermitAmount: remainingForEdit,
          counterpartyId: initialData.counterpartyId || 'no-selection',
          transactionNumber: initialData.transactionNumber || generateConsignmentTransactionNumber(new Date(initialData.slipDate || new Date())),
          // اطلاعات طرف حسابی تحویل دهنده کالا - روش‌های متعدد
          deliveryCounterpartyId: deliveryCounterpartyId,
          deliveryCounterpartyName: deliveryCounterpartyName,
          _deliveryCounterpartySource: initialData._deliveryCounterpartySource || 'parent-edit',
          // ثبت "حالت ویرایش والد" در اطلاعات انتخاب شده
          editMode: 'حالت ویرایش والد',
          // ذخیره مقدار اصلی برای محاسبه تفاوت در حین ویرایش
          _originalAmount: initialData.amount || 0,
          
          // ⭐ حفظ تمام فیلدهای لوکیشن برای انتقال صحیح هنگام ویرایش
          // اگر ID موجود است اما نام خالی است، از baseData پیدا کن
          internalSiteId: initialData.internalSiteId || '',
          internalSiteName: initialData.internalSiteName || (() => {
            if (initialData.internalSiteId && baseData?.internalSites) {
              const site = baseData.internalSites.find((s: any) => s.id === initialData.internalSiteId);
              if (site) {
                console.log('✅ سایت داخلی نام از baseData پیدا شد در initialData (transaction-list):', site.name);
                return site.name;
              }
            }
            return '';
          })(),
          contractorSiteId: initialData.contractorSiteId || '',
          contractorSiteName: initialData.contractorSiteName || (() => {
            if (initialData.contractorSiteId && baseData?.contractorSites) {
              const site = baseData.contractorSites.find((s: any) => s.id === initialData.contractorSiteId);
              if (site) {
                console.log('✅ سایت پیمانکار نام از baseData پیدا شد در initialData (transaction-list):', site.name);
                return site.name;
              }
            }
            return '';
          })(),
          companyLocationId: initialData.companyLocationId || '',
          companyLocationName: initialData.companyLocationName || initialData.counterpartyLocationName || (() => {
            if (initialData.companyLocationId && baseData?.companiesLocation) {
              const location = baseData.companiesLocation.find((l: any) => l.id === initialData.companyLocationId);
              if (location) {
                console.log('✅ لوکیشن طرف حساب نام از baseData پیدا شد در initialData (transaction-list):', location.name);
                return location.name;
              }
            }
            return '';
          })(),
          counterpartyLocationName: initialData.counterpartyLocationName || initialData.companyLocationName || (() => {
            if (initialData.companyLocationId && baseData?.companiesLocation) {
              const location = baseData.companiesLocation.find((l: any) => l.id === initialData.companyLocationId);
              if (location) {
                return location.name;
              }
            }
            return '';
          })(),
          customerLocationId: initialData.customerLocationId || '',
          customerLocationName: initialData.customerLocationName || initialData.customerCounterpartyLocationName || (() => {
            if (initialData.customerLocationId && baseData?.customerCompaniesLocation) {
              const location = baseData.customerCompaniesLocation.find((l: any) => l.id === initialData.customerLocationId);
              if (location) {
                console.log('✅ لوکیشن مشتری طرف حساب نام از baseData پیدا شد در initialData (transaction-list):', location.name);
                return location.name;
              }
            }
            return '';
          })(),
          customerCounterpartyLocationName: initialData.customerCounterpartyLocationName || initialData.customerLocationName || (() => {
            if (initialData.customerLocationId && baseData?.customerCompaniesLocation) {
              const location = baseData.customerCompaniesLocation.find((l: any) => l.id === initialData.customerLocationId);
              if (location) {
                return location.name;
              }
            }
            return '';
          })(),
          locationId: initialData.locationId || '',
          locationName: initialData.locationName || '',
          customerCompanyId: initialData.customerCompanyId || '',
          customerCounterpartyName: initialData.customerCounterpartyName || '',
          counterpartyName: initialData.counterpartyName || ''
        });
        
        console.log('🔍 اطلاعات طرف حسابی تحویل دهنده کالا - حالت ویرایش والد:', {
          'deliveryCounterpartyId': deliveryCounterpartyId,
          'deliveryCounterpartyName': deliveryCounterpartyName,
          'initialData_sources': {
            'deliveryCounterpartyId': initialData.deliveryCounterpartyId,
            'deliveryCounterpartyName': initialData.deliveryCounterpartyName,
            'counterpartyId': initialData.counterpartyId,
            'counterpartyName': initialData.counterpartyName,
            'partyId': initialData.partyId,
            'partyName': initialData.partyName,
            'partnerId': initialData.partnerId,
            'partnerName': initialData.partnerName,
            'supplierName': initialData.supplierName
          }
        });
        console.log('✅ حالت ویرایش والد فعال شد - فرمول: مقدار مجوز - کل حواله‌ها', {
          example: 'مثال: 5000 - (500+300+200+100) = 3900',
          remainingForEdit
        });
      } else if (isFromTransactionList) {
        console.log('🚀 Activating Direct Edit Mode');
        // حالت ویرایش از تراکنش‌های ثبت شده - "حالت ویرایش مستقیم"
        setIsEditingFromParent(false);
        setIsEditingFromTransactionList(true); // فعال کردن فلگ حالت ویرایش از مستقیم
        setIsEditing(true);
        setIsCreatingFromPermit(false);
        setEditingSlipId(initialData.id);
        
        const permits = (storage.loadData('delivery-permits') || []) as any[];
        const permit = permits.find((p: any) => p.id === initialData.permitId);
        const permitAmount = permit ? (permit.permitAmount || permit.amount || 0) : (initialData.permitAmount || 0);
        const remainingForEdit = calculateRemainingPermitAmount(
          initialData.permitId,
          permitAmount,
          initialData.id,
          true,
          undefined,
          'transaction-list'
        );
        // روش‌های متعدد برای دریافت اطلاعات طرف حسابی تحویل دهنده کالا
        let deliveryCounterpartyId = '';
        let deliveryCounterpartyName = '';
        
        // روش ۱: از initialData
        if (!deliveryCounterpartyId) deliveryCounterpartyId = initialData.deliveryCounterpartyId;
        if (!deliveryCounterpartyName) deliveryCounterpartyName = initialData.deliveryCounterpartyName;
        
        // روش ۲: از counterpartyId/counterpartyName
        if (!deliveryCounterpartyId) deliveryCounterpartyId = initialData.counterpartyId;
        if (!deliveryCounterpartyName) deliveryCounterpartyName = initialData.counterpartyName;
        
        // روش ۳: از partyId/partyName
        if (!deliveryCounterpartyId) deliveryCounterpartyId = initialData.partyId || initialData.partnerId;
        if (!deliveryCounterpartyName) deliveryCounterpartyName = initialData.partyName || initialData.partnerName;
        
        // روش ۴: از supplierName
        if (!deliveryCounterpartyName) deliveryCounterpartyName = initialData.supplierName;
        
        setSelectedSlipInfo({ 
          ...initialData, 
          remainingPermitAmount: remainingForEdit,
          counterpartyId: initialData.counterpartyId || 'no-selection',
          transactionNumber: initialData.transactionNumber || generateConsignmentTransactionNumber(new Date(initialData.slipDate || new Date())),
          // اطلاعات طرف حسابی تحویل دهنده کالا - روش‌های متعدد
          deliveryCounterpartyId: deliveryCounterpartyId,
          deliveryCounterpartyName: deliveryCounterpartyName,
          _deliveryCounterpartySource: initialData._deliveryCounterpartySource || 'transaction-edit',
          // ثبت "حالت ویرایش مستقیم" در اطلاعات انتخاب شده
          editMode: 'حالت ویرایش مستقیم',
          // ذخیره مقدار اصلی برای محاسبه تفاوت در حین ویرایش
          _originalAmount: initialData.amount || 0,
          
          // ⭐ حفظ تمام فیلدهای لوکیشن برای انتقال صحیح هنگام ویرایش
          // اگر ID موجود است اما نام خالی است، از baseData پیدا کن
          internalSiteId: initialData.internalSiteId || '',
          internalSiteName: initialData.internalSiteName || (() => {
            if (initialData.internalSiteId && baseData?.internalSites) {
              const site = baseData.internalSites.find((s: any) => s.id === initialData.internalSiteId);
              if (site) {
                console.log('✅ سایت داخلی نام از baseData پیدا شد در initialData (transaction-list):', site.name);
                return site.name;
              }
            }
            return '';
          })(),
          contractorSiteId: initialData.contractorSiteId || '',
          contractorSiteName: initialData.contractorSiteName || (() => {
            if (initialData.contractorSiteId && baseData?.contractorSites) {
              const site = baseData.contractorSites.find((s: any) => s.id === initialData.contractorSiteId);
              if (site) {
                console.log('✅ سایت پیمانکار نام از baseData پیدا شد در initialData (transaction-list):', site.name);
                return site.name;
              }
            }
            return '';
          })(),
          companyLocationId: initialData.companyLocationId || '',
          companyLocationName: initialData.companyLocationName || initialData.counterpartyLocationName || (() => {
            if (initialData.companyLocationId && baseData?.companiesLocation) {
              const location = baseData.companiesLocation.find((l: any) => l.id === initialData.companyLocationId);
              if (location) {
                console.log('✅ لوکیشن طرف حساب نام از baseData پیدا شد در initialData (transaction-list):', location.name);
                return location.name;
              }
            }
            return '';
          })(),
          counterpartyLocationName: initialData.counterpartyLocationName || initialData.companyLocationName || (() => {
            if (initialData.companyLocationId && baseData?.companiesLocation) {
              const location = baseData.companiesLocation.find((l: any) => l.id === initialData.companyLocationId);
              if (location) {
                return location.name;
              }
            }
            return '';
          })(),
          customerLocationId: initialData.customerLocationId || '',
          customerLocationName: initialData.customerLocationName || initialData.customerCounterpartyLocationName || (() => {
            if (initialData.customerLocationId && baseData?.customerCompaniesLocation) {
              const location = baseData.customerCompaniesLocation.find((l: any) => l.id === initialData.customerLocationId);
              if (location) {
                console.log('✅ لوکیشن مشتری طرف حساب نام از baseData پیدا شد در initialData (transaction-list):', location.name);
                return location.name;
              }
            }
            return '';
          })(),
          customerCounterpartyLocationName: initialData.customerCounterpartyLocationName || initialData.customerLocationName || (() => {
            if (initialData.customerLocationId && baseData?.customerCompaniesLocation) {
              const location = baseData.customerCompaniesLocation.find((l: any) => l.id === initialData.customerLocationId);
              if (location) {
                return location.name;
              }
            }
            return '';
          })(),
          locationId: initialData.locationId || '',
          locationName: initialData.locationName || '',
          customerCompanyId: initialData.customerCompanyId || '',
          customerCounterpartyName: initialData.customerCounterpartyName || '',
          counterpartyName: initialData.counterpartyName || ''
        });
        
        console.log('🔍 اطلاعات طرف حسابی تحویل دهنده کالا - حالت ویرایش مستقیم:', {
          'deliveryCounterpartyId': deliveryCounterpartyId,
          'deliveryCounterpartyName': deliveryCounterpartyName,
          'initialData_sources': {
            'deliveryCounterpartyId': initialData.deliveryCounterpartyId,
            'deliveryCounterpartyName': initialData.deliveryCounterpartyName,
            'counterpartyId': initialData.counterpartyId,
            'counterpartyName': initialData.counterpartyName,
            'partyId': initialData.partyId,
            'partyName': initialData.partyName,
            'partnerId': initialData.partnerId,
            'partnerName': initialData.partnerName,
            'supplierName': initialData.supplierName
          }
        });
        console.log('✅ حالت ویرایش از مستقیم فعال شد - فرمول: (مجوز - کل حواله‌ها) + مقدار حواله فعلی', {
          example: 'مثال: (5000 - (500+300+200+100)) + 100 = 4000',
          remainingForEdit
        });
      } else if (isNewFromPermit || initialData._isNewFromPermit) {
        console.log('🚀 Activating Create from Permit Mode');
        // حالت ایجاد جدید از مجوز
        setIsCreatingFromPermit(true);
        setIsEditingFromParent(false);
        setIsEditingFromTransactionList(false);
        setIsEditing(false);
        handleSelectPermit(initialData);
      } else {
        console.log('🚀 Activating Default Create Mode');
        // حالت پیش‌فرض: ایجاد جدید
        setIsCreatingFromPermit(true);
        setIsEditingFromParent(false);
        setIsEditingFromTransactionList(false);
        setIsEditing(false);
        
        // تولید خودکار شماره حواله و تاریخ امروز برای حالت ایجاد
        const today = new Date();
        const generatedTransactionNumber = generateConsignmentTransactionNumber(today);
        setAutoGeneratedTransactionNumber(generatedTransactionNumber);
        setAutoGeneratedDate(today);
        
        handleSelectPermit(initialData);
      }
    }
  }, [initialData]);

  useEffect(() => {
    const permits = (storage.loadData('delivery-permits') || []) as any[];
    const receipts = (storage.loadData('receipts') || []) as any[];
    const contracts = (storage.loadData('contracts') || []) as any[];
    const slips = (storage.loadData('consignment-delivery-slips') || []) as any[];

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
          false, // isEditing - در لیست همیشه حالت ایجاد است
          undefined,
          undefined // editingSource - برای حالت ایجاد مهم نیست
        );
        const registeredSlips = (slips as any[]).filter((s: any) => s.permitId === p.id);
        const hasIssuedSlip = registeredSlips.length > 0;
        // const allSlipsForPermit = slips.filter((s: any) => s.permitId === p.id && !s.isVoided); // unused
        
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
      permit.permitNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.managementLetterNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.counterpartyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.permitNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availablePermits, searchTerm]);

  const handleDownloadData = useCallback(() => {
    try {
      const dataForExcel = filteredPermits.map(permit => ({
        'شماره مجوز': permit.permitNumber,
        'شماره تراکنش حواله': permit.transactionNumber || '-',
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
        ...dataForExcel.map((row: any) => headers.map((header: string) => `"${(row as any)[header]}"`).join(','))
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

    // 1. بررسي اينکه آيا براي اين مجوز حواله‌ای در وضعیت "صادر شده" وجود دارد
    const issuedSlips = (storage.loadData('consignment-delivery-slips') || []) as any[];
    const issuedDeliveriesForPermit = issuedSlips.filter(s => 
      s.permitId === selectedSlipInfo.permitId && 
      !s.isVoided && 
      s.status === 'issued'
    );
    if (issuedDeliveriesForPermit.length > 0) {
      alert('شما مجاز به ثبت "درخواست اصلاحيه" نمي باشيد زيرا از اين مجوز، تراکنشی در وضعیت "صادر شده" وجود دارد.');
      return;
    }

    // 2. بررسي اينکه آيا هیچ حواله‌ای مربوط به اين مجوز در سیستم وجود دارد (در هر وضعیتی)
    const allSlipsForPermit = issuedSlips.filter(s => 
      s.permitId === selectedSlipInfo.permitId && 
      !s.isVoided
    );
    if (allSlipsForPermit.length > 0) {
      alert('شما مجاز به ثبت "درخواست اصلاحيه" نمي باشيد زيرا برای این مجوز، تراکنشی در سیستم ثبت شده است.');
      return;
    }

    const updatedSlipInfo = {
      ...selectedSlipInfo,
      event: 'درخواست اصلاحيه',
      updatedAt: new Date()
    };

    const slips = (storage.loadData('consignment-delivery-slips') || []) as any[];
    const updatedSlips = slips.map((s: any) => s.id === selectedSlipInfo.id ? updatedSlipInfo : s);
    storage.saveData('consignment-delivery-slips', updatedSlips);

    const permits = (storage.loadData('delivery-permits') || []) as any[];
    const updatedPermits = permits.map((p: any) => {
      if (p.id === selectedSlipInfo.permitId) {
        return { ...p, event: 'درخواست اصلاحيه انبار', updatedAt: new Date() };
      }
      return p;
    });
    storage.saveData('delivery-permits', updatedPermits);

    const deliveries = (storage.loadData('deliveries') || []) as any[];
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
/////////////////////////////+++++///////+++//////////////
//? 'مثال: 5000 - (500+300+200+100) = 3900'

    
  // تابع جدید handleSelectPermit با انتقال خودکار اطلاعات
  const handleSelectPermit = useCallback((permit: any, editSource?: string) => {
  // 1. بارگذاری اطلاعات مربوط به رسید انبار و قرارداد
  const receipts = (storage.loadData('receipts') || []) as any[];
  const contracts = (storage.loadData('contracts') || []) as any[];
  const receipt = receipts.find((r: any) => r.id === permit.receiptId);
  const contract = contracts.find((c: any) => c.id === receipt?.contractId);

  // 2. استخراج مقدار مجوز
  const permitAmountValue = permit.permitAmount || permit.amount || permit.permit_amount || permit.finalPermitAmount || permit.final_permit_amount || 0;
  
  // 3. محاسبه مانده مجوز حواله
  const remainingPermitAmount = calculateRemainingPermitAmount(
    permit.id || permit.permitId,
    parseFloat(permitAmountValue?.toString() || '0'),
    undefined, // currentSlipId
    false, // isEditing
    undefined,
    undefined // editingSource
  );
  
  // 4. بررسی وضعیت حواله‌های صادر شده
  const slips = (storage.loadData('consignment-delivery-slips') || []) as any[];
  const registeredSlips = slips.filter((s: any) => s.permitId === (permit.permitId || permit.id));
  const hasIssuedSlip = registeredSlips.length > 0;

  // تعیین مقدار اولیه amount بر اساس حالت (ایجاد vs ویرایش)
  let initialAmount = 0;
  if ((isEditingFromParent || isEditingFromTransactionList) && selectedSlipInfo?.amount) {
    initialAmount = selectedSlipInfo.amount;
  } else {
    initialAmount = 0;
  }
  
  // تولید شماره تراکنش جدید در حالت ایجاد
  const existingTransactionNumber = isEditingFromParent && selectedSlipInfo?.transactionNumber 
    ? selectedSlipInfo.transactionNumber
    : (!isCreatingFromPermit && permit.transactionNumber 
        ? permit.transactionNumber 
        : generateConsignmentTransactionNumber(new Date(permit.slipDate || new Date())));
  
  // تعیین حالت ویرایش برای نمایش
  let editMode = '';
  if (editSource === 'parent') {
    editMode = 'حالت ویرایش والد';
  } else if (editSource === 'transaction-list') {
    editMode = 'حالت ویرایش از مستقیم';
  } else if (isCreatingFromPermit) {
    editMode = 'حالت ایجاد از مجوز';
  }
  
  // پیدا کردن شناسه طرف حساب بر اساس نام طرف حساب
  let foundCounterpartyId = 'no-selection';
  if (permit.counterpartyName && baseData.companies) {
    const counterparty = baseData.companies.find((c: any) => c.name === permit.counterpartyName);
    if (counterparty) {
      foundCounterpartyId = counterparty.id;
    }
  }
  
  // تولید شماره حواله خودکار برای حالت ایجاد (تابع معمولی - نه useCallback)
  // @ts-ignore - ممکن است در آینده استفاده شود
  const _getTransactionNumber = () => {
    if (!isCreatingFromPermit && !isEditingFromParent && !isEditingFromTransactionList) {
      // حالت ایجاد جدید - استفاده از شماره خودکار تولید شده
      return autoGeneratedTransactionNumber || generateConsignmentTransactionNumber(new Date());
    }
    
    // حالت‌های ویرایش - استفاده از شماره موجود یا تولید جدید
    const existingTransactionNumber = isEditingFromParent && selectedSlipInfo?.transactionNumber 
      ? selectedSlipInfo.transactionNumber
      : (!isCreatingFromPermit && permit.transactionNumber 
          ? permit.transactionNumber 
          : generateConsignmentTransactionNumber(new Date(permit.slipDate || new Date())));
    
    return existingTransactionNumber;
  };
  
  // دریافت تاریخ حواله (خودکار برای حالت ایجاد) (تابع معمولی - نه useCallback)
  // @ts-ignore - ممکن است در آینده استفاده شود
  const _getSlipDate = () => {
    if (!isCreatingFromPermit && !isEditingFromParent && !isEditingFromTransactionList) {
      // حالت ایجاد جدید - استفاده از تاریخ امروز
      return autoGeneratedDate;
    }
    
    // حالت‌های ویرایش - استفاده از تاریخ موجود
    return new Date(permit.slipDate || permit.permitDate || new Date());
  };

  // ⭐ استخراج نام سایت داخلی، لوکیشن، سایت پیمانکار، و لوکیشن طرف حساب از baseData
  // همیشه از permit/receipt و baseData پر می‌شوند (نه فقط در حالت ویرایش)
  // اولویت: baseData > permit > receipt
  // ⚠️ توجه: permit ممکن است در واقع initialData (delivery) باشد
  let internalSiteId = permit.internalSiteId || receipt?.internalSiteId || '';
  let internalSiteName = permit.internalSiteName || receipt?.internalSiteName || '';
  
  console.log('🔍 handleSelectPermit - بررسی فیلدهای سایت و لوکیشن:', {
    'permit.internalSiteId': permit.internalSiteId,
    'permit.internalSiteName': permit.internalSiteName,
    'receipt?.internalSiteId': receipt?.internalSiteId,
    'receipt?.internalSiteName': receipt?.internalSiteName,
    'internalSiteId (final)': internalSiteId,
    'internalSiteName (final)': internalSiteName,
    'baseData.internalSites.length': baseData?.internalSites?.length || 0
  });
  
  if (internalSiteId) {
    // ⭐ اولویت با baseData از صفحه اطلاعات پایه
    const siteFromBaseData = baseData?.internalSites?.find((s: any) => s.id === internalSiteId);
    if (siteFromBaseData) {
      internalSiteName = siteFromBaseData.name;
      console.log('✅ سایت داخلی از baseData (اطلاعات پایه) پیدا شد:', siteFromBaseData.name);
    } else if (internalSiteId && !internalSiteName) {
      console.warn('⚠️ سایت داخلی با ID', internalSiteId, 'در baseData یافت نشد');
    }
  } else {
    // ⭐ اگر در permit موجود نبود، از baseData اولین گزینه را انتخاب کن (اگر فقط یک گزینه وجود دارد)
    if (baseData?.internalSites && baseData.internalSites.length === 1) {
      internalSiteId = baseData.internalSites[0].id;
      internalSiteName = baseData.internalSites[0].name;
      console.log('✅ سایت داخلی به صورت خودکار از baseData (تنها گزینه) انتخاب شد:', internalSiteName);
    }
  }
  
  const locationId = permit.locationId || receipt?.locationId || '';
  const locationName = locationId ? (
    baseData?.locations?.find((l: any) => l.id === locationId)?.name || 
    permit.locationName || 
    receipt?.locationName || ''
  ) : '';
  
  let contractorSiteId = permit.contractorSiteId || receipt?.contractorSiteId || '';
  let contractorSiteName = permit.contractorSiteName || receipt?.contractorSiteName || '';
  
  if (contractorSiteId) {
    // ⭐ اولویت با baseData از صفحه اطلاعات پایه
    const siteFromBaseData = baseData?.contractorSites?.find((s: any) => s.id === contractorSiteId);
    if (siteFromBaseData) {
      contractorSiteName = siteFromBaseData.name;
      console.log('✅ سایت پیمانکار از baseData (اطلاعات پایه) پیدا شد:', siteFromBaseData.name);
    } else if (contractorSiteId && !contractorSiteName) {
      console.warn('⚠️ سایت پیمانکار با ID', contractorSiteId, 'در baseData یافت نشد');
    }
  } else {
    // ⭐ اگر در permit موجود نبود، از baseData اولین گزینه را انتخاب کن (اگر فقط یک گزینه وجود دارد)
    if (baseData?.contractorSites && baseData.contractorSites.length === 1) {
      contractorSiteId = baseData.contractorSites[0].id;
      contractorSiteName = baseData.contractorSites[0].name;
      console.log('✅ سایت پیمانکار به صورت خودکار از baseData (تنها گزینه) انتخاب شد:', contractorSiteName);
    }
  }
  
  // ⭐ لوکیشن طرف حساب: همیشه از permit/receipt و baseData پر می‌شود
  // اولویت: baseData (صفحه اطلاعات پایه) > permit > receipt
  let companyLocationId = permit.companyLocationId || receipt?.companyLocationId || '';
  let companyLocationName = permit.companyLocationName || permit.counterpartyLocationName || receipt?.companyLocationName || '';
  
  if (companyLocationId) {
    // ⭐ اولویت با baseData از صفحه اطلاعات پایه
    const locationFromBaseData = baseData?.companiesLocation?.find((l: any) => l.id === companyLocationId);
    if (locationFromBaseData) {
      companyLocationName = locationFromBaseData.name;
      console.log('✅ لوکیشن طرف حساب از baseData (اطلاعات پایه) پیدا شد:', locationFromBaseData.name);
    } else if (companyLocationId && !companyLocationName) {
      console.warn('⚠️ لوکیشن طرف حساب با ID', companyLocationId, 'در baseData یافت نشد');
    }
  } else {
    // ⭐ اگر در permit موجود نبود، از baseData بر اساس counterpartyId جستجو کن
    if (foundCounterpartyId && foundCounterpartyId !== 'no-selection' && baseData?.companiesLocation) {
      const autoLocation = baseData.companiesLocation.find((loc: any) => 
        loc.companyId === foundCounterpartyId || loc.id === foundCounterpartyId
      );
      if (autoLocation) {
        companyLocationId = autoLocation.id;
        companyLocationName = autoLocation.name;
        console.log('✅ لوکیشن طرف حساب به صورت خودکار از baseData بر اساس counterpartyId پیدا شد:', autoLocation.name);
      } else if (baseData.companiesLocation.length === 1) {
        // اگر فقط یک گزینه وجود دارد، آن را انتخاب کن
        companyLocationId = baseData.companiesLocation[0].id;
        companyLocationName = baseData.companiesLocation[0].name;
        console.log('✅ لوکیشن طرف حساب به صورت خودکار از baseData (تنها گزینه) انتخاب شد:', companyLocationName);
      }
    }
  }
  
  // ⭐ لوکیشن مشتری طرف حساب: همیشه از permit/receipt و baseData پر می‌شود
  // اولویت: baseData (صفحه اطلاعات پایه) > permit > receipt
  let customerLocationId = permit.customerLocationId || receipt?.customerLocationId || '';
  let customerLocationName = permit.customerLocationName || permit.customerCounterpartyLocationName || receipt?.customerLocationName || receipt?.customerCounterpartyLocationName || '';
  
  if (customerLocationId) {
    // ⭐ اولویت با baseData از صفحه اطلاعات پایه
    const locationFromBaseData = baseData?.customerCompaniesLocation?.find((l: any) => l.id === customerLocationId);
    if (locationFromBaseData) {
      customerLocationName = locationFromBaseData.name;
      console.log('✅ لوکیشن مشتری طرف حساب از baseData (اطلاعات پایه) پیدا شد:', locationFromBaseData.name);
    } else if (customerLocationId && !customerLocationName) {
      console.warn('⚠️ لوکیشن مشتری طرف حساب با ID', customerLocationId, 'در baseData یافت نشد');
    }
  } else {
    // ⭐ اگر در permit موجود نبود، از baseData بر اساس customerCompanyId جستجو کن
    const customerCompanyId = permit.customerCompanyId || receipt?.customerCompanyId;
    if (customerCompanyId && baseData?.customerCompaniesLocation) {
      const autoLocation = baseData.customerCompaniesLocation.find((loc: any) => 
        loc.companyId === customerCompanyId || loc.customerCompanyId === customerCompanyId || loc.id === customerCompanyId
      );
      if (autoLocation) {
        customerLocationId = autoLocation.id;
        customerLocationName = autoLocation.name;
        console.log('✅ لوکیشن مشتری طرف حساب به صورت خودکار از baseData بر اساس customerCompanyId پیدا شد:', autoLocation.name);
      } else if (baseData.customerCompaniesLocation.length === 1) {
        // اگر فقط یک گزینه وجود دارد، آن را انتخاب کن
        customerLocationId = baseData.customerCompaniesLocation[0].id;
        customerLocationName = baseData.customerCompaniesLocation[0].name;
        console.log('✅ لوکیشن مشتری طرف حساب به صورت خودکار از baseData (تنها گزینه) انتخاب شد:', customerLocationName);
      }
    }
  }
  
  // ایجاد اطلاعات جدید حواله با تمام فیلدهای مورد نیاز
  const newSlipInfo: ConsignmentSlipInfo = {
    id: isCreatingFromPermit ? `new_slip_${Date.now()}` : (permit.id || `slip_${Date.now()}`),
    permitId: permit.permitId || permit.id,
    receiptId: permit.receiptId,
    counterpartyId: foundCounterpartyId,
    contractId: permit.contractId,
    
    // فیلدهای اصلی که باید منتقل شوند
    permitNumber: permit.permitNumber,
    contractNumber: permit.contractNumber,
    counterpartyName: permit.counterpartyName,
    siteName: permit.siteName,
    tankName: permit.tankName,
    
    // اصلاح اطلاعات طرف حسابی تحویل گیرنده کالا (نه تحویل دهنده)
    deliveryCounterpartyId: permit.deliveryCounterpartyId || 
      permit.counterpartyId || 
      receipt?.counterpartyId ||
      receipt?.customerCounterpartyId ||
      contract?.counterpartyId ||
      contract?.supplierId,
    deliveryCounterpartyName: permit.deliveryCounterpartyName || 
      permit.counterpartyName ||
      receipt?.counterpartyName ||
      receipt?.customerCounterpartyName ||
      contract?.counterpartyName ||
      contract?.supplierName,
    _deliveryCounterpartySource: 'permit',
    permitAmount: parseFloat((permit.permitAmount || permit.amount || 0)?.toString() || '0'),
    remainingPermitAmount: remainingPermitAmount,
    
    // سایر فیلدها
    managementLetterNumber: permit.managementLetterNumber,
    amount: initialAmount,
    slipDate: new Date(permit.slipDate) || new Date(),
    
    // اصلاح: پر کردن فیلدهای سایت و لوکیشن با هم ID و هم نام
    internalSiteId: internalSiteId,
    internalSiteName: internalSiteName, // ✅ اضافه شد
    contractorSiteId: contractorSiteId,
    contractorSiteName: contractorSiteName, // ✅ اضافه شد
    locationId: locationId,
    locationName: locationName, // ✅ اضافه شد
    
    // recipientType: از permit خوانده می‌شود، در غیر این صورت 'no-selection'
    recipientType: permit.recipientType || 'no-selection',
    
    // ⭐ فیلدهای لوکیشن: همیشه از permit/receipt و baseData پر می‌شوند
    // اگر در permit موجود نبود، از baseData بر اساس طرف حساب جستجو می‌شود
    companyLocationId: companyLocationId || (() => {
      // اگر لوکیشن طرف حساب در permit موجود نبود، از baseData بر اساس counterpartyId جستجو کن
      if (foundCounterpartyId && baseData?.companiesLocation) {
        const autoLocation = baseData.companiesLocation.find((loc: any) => 
          loc.companyId === foundCounterpartyId || loc.id === foundCounterpartyId
        );
        return autoLocation?.id || '';
      }
      return '';
    })(),
    companyLocationName: companyLocationName || (() => {
      if (foundCounterpartyId && baseData?.companiesLocation) {
        const autoLocation = baseData.companiesLocation.find((loc: any) => 
          loc.companyId === foundCounterpartyId || loc.id === foundCounterpartyId
        );
        return autoLocation?.name || '';
      }
      return '';
    })(),
    customerLocationId: customerLocationId || (() => {
      // اگر لوکیشن مشتری طرف حساب در permit موجود نبود، از baseData بر اساس customerCompanyId جستجو کن
      const customerCompanyId = permit.customerCompanyId || receipt?.customerCompanyId;
      if (customerCompanyId && baseData?.customerCompaniesLocation) {
        const autoLocation = baseData.customerCompaniesLocation.find((loc: any) => 
          loc.companyId === customerCompanyId || loc.customerCompanyId === customerCompanyId || loc.id === customerCompanyId
        );
        return autoLocation?.id || '';
      }
      return '';
    })(),
    customerLocationName: customerLocationName || (() => {
      const customerCompanyId = permit.customerCompanyId || receipt?.customerCompanyId;
      if (customerCompanyId && baseData?.customerCompaniesLocation) {
        const autoLocation = baseData.customerCompaniesLocation.find((loc: any) => 
          loc.companyId === customerCompanyId || loc.customerCompanyId === customerCompanyId || loc.id === customerCompanyId
        );
        return autoLocation?.name || '';
      }
      return '';
    })(),
    customerCounterpartyName: receipt?.customerCounterpartyName,
    
    // ⚠️ این فیلدها برای جدول هستند - فقط در حالت ویرایش پر می‌شوند
    counterpartyLocationName: companyLocationName || (() => {
      if (foundCounterpartyId && baseData?.companiesLocation) {
        const autoLocation = baseData.companiesLocation.find((loc: any) => 
          loc.companyId === foundCounterpartyId || loc.id === foundCounterpartyId
        );
        return autoLocation?.name || '';
      }
      return '';
    })(), // حذف fallback به receipt
    customerCounterpartyLocationName: customerLocationName || (() => {
      const customerCompanyId = permit.customerCompanyId || receipt?.customerCompanyId;
      if (customerCompanyId && baseData?.customerCompaniesLocation) {
        const autoLocation = baseData.customerCompaniesLocation.find((loc: any) => 
          loc.companyId === customerCompanyId || loc.customerCompanyId === customerCompanyId || loc.id === customerCompanyId
        );
        return autoLocation?.name || '';
      }
      return '';
    })(), // حذف fallback به receipt
    receiptNumber: receipt?.transactionNumber || receipt?.receiptNumber || '',
    productName: permit.productName,
    unit: permit.unit,
    wastageAmount: parseFloat(permit.wastageAmount?.toString() || '0'),
    finalPermitAmount: parseFloat(permit.finalPermitAmount?.toString() || '0'),
    remainingTransferPermit: remainingPermitAmount,
    permitDate: new Date(permit.permitDate),
    approvalDate: new Date(permit.approvalDate),
    status: permit.status,
    event: permit.event,
    quotaNumber: receipt?.quotaNumber,
    registrationOrderNumber: receipt?.registrationOrderNumber,
    receiptBasisAmount: parseFloat(receipt?.receiptBasisAmount?.toString() || '0'),
    receiptAmount: parseFloat(receipt?.amount?.toString() || receipt?.finalAmount?.toString() || '0'),
    driverName: receipt?.driverName,
    driverNationalId: receipt?.driverNationalId,
    driverPlateNumber: receipt?.driverPlateNumber,
    shipName: receipt?.shipName,
    wastagePercentage: parseFloat(receipt?.wastagePercentage?.toString() || '0'),
    indexNumber: receipt?.indexNumber,
    cotageNumber: receipt?.cotageNumber,
    siteId: permit.siteId,
    tankId: permit.tankId,
    hasIssuedSlip,
    description: permit.description || '',
    transactionNumber: existingTransactionNumber,
    editMode: editMode,
    
    // فیلدهای کمکی برای حالت‌های مختلف
    _editingSource: editSource,
    _isParentEdit: editSource === 'parent',
    _originalAmount: isEditingFromParent || isEditingFromTransactionList ? (permit.amount || 0) : 0
  };
  
  setSelectedSlipInfo(newSlipInfo);
  setIsEditing(true);
  
  // بارگذاری اطلاعات تکمیلی
  if (permit.additionalInfo) {
    setDeliveryExtraInfo(permit.additionalInfo);
    setShowDeliveryExtraInfo(true);
  } else {
    setDeliveryExtraInfo({});
    setShowDeliveryExtraInfo(false);
  }
  
  console.log('handleSelectPermit - اطلاعات منتقل شده:', {
    slipId: newSlipInfo.id,
    isCreatingFromPermit,
    permitId: newSlipInfo.permitId,
    transferredFields: {
      'شماره مجوز': newSlipInfo.permitNumber,
      'شماره قرارداد': newSlipInfo.contractNumber,
      'طرف حساب': newSlipInfo.counterpartyName,
      'شناسه طرف حساب': newSlipInfo.counterpartyId,
      'طرف حسابی تحویل دهنده کالا': newSlipInfo.deliveryCounterpartyName,
      'شناسه طرف حسابی تحویل دهنده کالا': newSlipInfo.deliveryCounterpartyId,
      'سایت موجودی کالا': newSlipInfo.siteName,
      'مخزن موجودی کالا': newSlipInfo.tankName,
      'مانده مجوز حواله': newSlipInfo.remainingPermitAmount,
      'مقدار مجوز': newSlipInfo.permitAmount,
      // ⭐ اضافه کردن فیلدهای مورد نظر
      'سایت داخلی ID': newSlipInfo.internalSiteId,
      'سایت داخلی نام': newSlipInfo.internalSiteName,
      'سایت پیمانکار ID': newSlipInfo.contractorSiteId,
      'سایت پیمانکار نام': newSlipInfo.contractorSiteName,
      'لوکیشن طرف حساب ID': newSlipInfo.companyLocationId,
      'لوکیشن طرف حساب نام': newSlipInfo.companyLocationName,
      'لوکیشن مشتری طرف حساب ID': newSlipInfo.customerLocationId,
      'لوکیشن مشتری طرف حساب نام': newSlipInfo.customerLocationName,
      'نوع گیرنده': newSlipInfo.recipientType
    },
    debugSources: {
      'permit.counterpartyId': permit.counterpartyId,
      'permit.counterpartyName': permit.counterpartyName,
      'receipt.counterpartyId': receipt?.counterpartyId,
      'receipt.counterpartyName': receipt?.counterpartyName,
      'receipt.customerCounterpartyName': receipt?.customerCounterpartyName,
      'contract.counterpartyId': contract?.counterpartyId,
      'contract.counterpartyName': contract?.counterpartyName,
      'contract.supplierName': contract?.supplierName
    },
    editSource,
    editMode
  });
}, [storage, calculateRemainingPermitAmount, generateConsignmentTransactionNumber, isEditingFromParent, isEditingFromTransactionList, selectedSlipInfo, baseData, formatPersianNumber, setSelectedSlipInfo, setIsEditing, setEditingSlipId, setIsCreatingFromPermit, setIsEditingFromParent]);
/////////////////////////////////////////////////////////////////////////
  const handleEditSlip = (permit: any) => {
    console.log('🔧 handleEditSlip called with data:', permit);
    console.log('🔧 handleEditSlip - permit.id:', permit.id);
    console.log('🔧 handleEditSlip - permit._editingSource:', permit._editingSource);
    console.log('🔧 handleEditSlip - permit._isParentEdit:', permit._isParentEdit);
    
    // در حالت ويرايش مستقيم (از مسیر تراکنش‌های ثبت شده)، ابتدا editingSlipId را تنظيم می‌کنيم
    setEditingSlipId(permit.id);
    setIsCreatingFromPermit(false);
    setIsEditingFromParent(false);
    setIsEditingFromTransactionList(true); // فعال کردن فلگ حالت ویرایش از مستقیم
    
    // اطلاعات مربوط به ویرایش از مستقیم را اضافه می‌کنیم
    const editData = {
      ...permit,
      _editingSource: 'transaction-list', // تعيين منبع ويرايش از تراکنش‌ها
      _isParentEdit: false,
      deliveryCounterpartyId: permit.counterpartyId,
      deliveryCounterpartyName: permit.counterpartyName,
      _deliveryCounterpartySource: 'transaction-list',
      // اضافه کردن editMode برای نمایش در UI
      editMode: 'حالت ویرایش مستقیم',
      
      // ⭐ حفظ دقیق فیلدهای لوکیشن از تراکنش موجود (بدون fallback اضافی)
      companyLocationId: permit.companyLocationId || '',
      companyLocationName: permit.companyLocationName || '',
      counterpartyLocationName: permit.counterpartyLocationName || permit.companyLocationName || '',
      customerLocationId: permit.customerLocationId || '',
      customerLocationName: permit.customerLocationName || '',
      customerCounterpartyLocationName: permit.customerCounterpartyLocationName || permit.customerLocationName || '',
      internalSiteId: permit.internalSiteId || '',
      internalSiteName: permit.internalSiteName || '',
      locationId: permit.locationId || '',
      locationName: permit.locationName || '',
      contractorSiteId: permit.contractorSiteId || '',
      contractorSiteName: permit.contractorSiteName || '',
      customerCompanyId: permit.customerCompanyId || '',
      customerCounterpartyName: permit.customerCounterpartyName || '',
      counterpartyName: permit.counterpartyName || ''
    };
    
    console.log('🔧 handleEditSlip - editData prepared:', editData);
    console.log('🔧 handleEditSlip - editData._editingSource:', editData._editingSource);
    console.log('🔧 handleEditSlip - editData.editMode:', editData.editMode);
    console.log('🔧 handleEditSlip - فیلدهای لوکیشن:', {
      'لوکیشن طرف حساب': `${editData.counterpartyLocationName} (ID: ${editData.companyLocationId})`,
      'لوکیشن مشتری طرف حساب': `${editData.customerCounterpartyLocationName} (ID: ${editData.customerLocationId})`,
      'سایت داخلی': `${editData.internalSiteName} (ID: ${editData.internalSiteId})`,
      'لوکیشن': `${editData.locationName} (ID: ${editData.locationId})`,
      'سایت پیمانکار': `${editData.contractorSiteName} (ID: ${editData.contractorSiteId})`
    });
    
    // بارگذاری اطلاعات تکمیلی
    if (permit.additionalInfo) {
      setDeliveryExtraInfo(permit.additionalInfo);
      setShowDeliveryExtraInfo(true);
    } else {
      setDeliveryExtraInfo({});
      setShowDeliveryExtraInfo(false);
    }
    
    // سپس handleSelectPermit را با editSource='transaction-list' صدا می‌کنيم
    handleSelectPermit(editData, 'transaction-list');
    setIsEditing(true);
    
    console.log('✅ حواله از مسیر تراکنش‌های ثبت شده برای ویرایش انتخاب شد', {
      permitId: permit.id,
      editMode: 'حالت ویرایش از مستقیم',
      formula: '(مجوز - کل حواله‌ها) + مقدار حواله فعلی'
    });
  };

  // تابع تغییر وضعیت تراکنش
  // @ts-ignore - ممکن است در آینده استفاده شود
  const _handleChangeStatus = useCallback((id: string) => {
    // Find transaction from storage
    const slips = (storage.loadData('consignment-delivery-slips') || []) as any[];
    const transaction = slips.find((s: any) => s.id === id) || slips.find((s: any) => s.transactionNumber === id);
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

    // Update delivery status in main deliveries list (match by id OR transactionNumber)
    const updatedDeliveries = (storage.loadData('deliveries') || []) as any[];
    const newDeliveries = updatedDeliveries.map((d: any) => {
      const sameById = d.id === id || d.id === transaction.id;
      const sameByNumber = d.transactionNumber && (d.transactionNumber === transaction.transactionNumber || d.transactionNumber === id);
      return (sameById || sameByNumber) ? { ...d, status: newStatus, persianStatus: newPersianStatus, updatedAt: new Date() } : d;
    });
    storage.saveData('deliveries', newDeliveries);

    // Update corresponding slip in consignment-delivery-slips (match by id OR transactionNumber)
    const updatedSlips = slips.map((s: any) => {
      const sameById = s.id === id || s.id === transaction.id;
      const sameByNumber = s.transactionNumber && (s.transactionNumber === transaction.transactionNumber || s.transactionNumber === id);
      return (sameById || sameByNumber) ? { ...s, status: newStatus, persianStatus: newPersianStatus, updatedAt: new Date() } : s;
    });
    storage.saveData('consignment-delivery-slips', updatedSlips);

    // Clear cache and notify DashboardStats
    const cacheKey = 'warehouse_consignment-delivery-slips';
    localStorage.removeItem(cacheKey);
    window.dispatchEvent(new StorageEvent('storage', {
      key: cacheKey,
      newValue: JSON.stringify(updatedSlips),
      storageArea: localStorage
    }));
    window.dispatchEvent(new CustomEvent('warehouseDataUpdate'));

    // اگر وضعيت به "issued" تغيير کرد و تراکنش دارای مجوز باشد، پیام "درخواست اصلاحیه انبار" را پاک کن
    if (newStatus === 'issued' && transaction.permitId) {
      const permits = (storage.loadData('delivery-permits') || []) as any[];
      const updatedPermits = permits.map((p: any) => {
        if (p.id === transaction.permitId) {
          return { ...p, event: '', updatedAt: new Date() };
        }
        return p;
      });
      storage.saveData('delivery-permits', updatedPermits);
    }

    // اعلان تغییر وضعیت
    const statusText = newStatus === 'draft' ? 'پيش‌نويس' : 'صادر شده';
    alert(`وضعيت تراکنش ${transaction.transactionNumber} با موفقيت به "${statusText}" تغيير يافت.`);
  }, [storage]);

  const handleDeleteSlip = (slipId: string) => {
    if (confirm('آيا از حذف اين حواله اطمينان داريد؟')) {
      // 1. دریافت اطلاعات حواله قبل از حذف
      const slips = (storage.loadData('consignment-delivery-slips') || []) as any[];
      const slipToDelete = slips.find((s: any) => s.id === slipId);
      
      if (!slipToDelete) {
        alert('خطا: حواله مورد نظر يافت نشد.');
        return;
      }

      const deletedAmount = slipToDelete.amount || 0;
      const permitId = slipToDelete.permitId;

      // 2. بازگردانی مانده مجوز حواله در صورت وجود permitId
      if (permitId) {
        const permits = (storage.loadData('delivery-permits') || []) as any[];
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
      const deliveries = (storage.loadData('deliveries') || []) as any[];
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
    setIsCreatingFromPermit(true); // تصحیح: باید true باشد
    setIsEditingFromParent(false);
    
    const emptySlip: ConsignmentSlipInfo = {
      id: `new_slip_${Date.now()}`,
      permitId: '',
      receiptId: '',
      counterpartyId: 'no-selection', // <-- خط جدید
      contractId: '',
      permitNumber: '',
      managementLetterNumber: '',
      amount: 0,
      permitAmount: 0,
      remainingPermitAmount: 0,
      slipDate: new Date(),
      deliveryCounterpartyId: '',
  deliveryCounterpartyName: '',
  _deliveryCounterpartySource: '',
      internalSiteId: '',
      contractorSiteId: '',
      locationId: '',
      recipientType: 'no-selection',
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
      hasIssuedSlip: false,
      description: '',
      transactionNumber: generateConsignmentTransactionNumber(new Date())
    };
    
    setSelectedSlipInfo(emptySlip);
    setSelectedPermitNumber('');
  };

  // @ts-ignore - ممکن است در آینده استفاده شود
  const handleSelectPermitNumber = (permitNumber: string) => {
    setSelectedPermitNumber(permitNumber);
    
    const selectedPermit = availablePermits.find(p => p.permitNumber === permitNumber);
    
    if (selectedPermit) {
      handleSelectPermit(selectedPermit);
      setIsEditing(true);
      setEditingSlipId(null);
      setIsCreatingFromPermit(true);
      setIsEditingFromParent(false); // اطمينان از اينکه در حالت ايجاد هستيم
    }
  };

  // تابع کمکی برای بررسی الزامی بودن فیلد بر اساس نوع گیرنده
  const isFieldRequired = useCallback((fieldName: string, recipientType: string): boolean => {
    // فیلدهای مشترک برای همه انواع گیرنده
    const commonRequiredFields = ['amount', 'slipDate', 'permitNumber', 'contractNumber', 'siteId', 'tankId'];
    if (commonRequiredFields.includes(fieldName)) {
      return true;
    }

    // فیلدهای اختصاصی بر اساس نوع گیرنده
    switch (recipientType) {
      case 'internal-site':
        return ['internalSiteId', 'locationId'].includes(fieldName);
      case 'contractor-site':
        return ['contractorSiteId'].includes(fieldName);
      case 'counterparty':
        return ['counterpartyId', 'companyLocationId'].includes(fieldName);
      case 'customer-counterparty':
        return ['customerCompanyId', 'customerLocationId'].includes(fieldName);
      default:
        return false;
    }
  }, []);

  // تابع برای بررسی خالی بودن فیلد
  const isFieldEmpty = useCallback((_fieldName: string, value: any): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '' || value === 'no-selection';
  if (typeof value === 'number') return value <= 0;
  if (value instanceof Date) return isNaN(value.getTime()); // بررسی تاریخ نامعتبر
  return false;
}, []);

  // تابع جدید برای صدور حواله (تغییر وضعیت از draft به issued)
  const handleIssueSlip = async () => {
    if (isSaving) return;
    if (!selectedSlipInfo) {
      alert('لطفاً ابتدا يک حواله انتخاب کنيد.');
      return;
    }

    // بررسی اینکه آیا حواله قبلاً issued شده یا نه
    if (selectedSlipInfo.status === 'issued') {
      alert('این حواله قبلاً صادر شده است.');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('🚀 شروع صدور حواله:', {
        id: selectedSlipInfo.id,
        transactionNumber: selectedSlipInfo.transactionNumber,
        currentStatus: selectedSlipInfo.status
      });

      // تغییر وضعیت به issued
      const updatedSlipInfo = {
        ...selectedSlipInfo,
        status: 'issued',
        persianStatus: 'صادر شده',
        updatedAt: new Date(),
        issuedAt: new Date()
      };

      // ذخیره در storage
      const slips = (storage.loadData('consignment-delivery-slips') || []) as any[];
      const deliveries = (storage.loadData('deliveries') || []) as any[];
      
      console.log('📊 داده‌های موجود قبل از صدور:', {
        تعداد_حواله_های_امانی: slips.length,
        تعداد_deliveries: deliveries.length
      });
      
      const slipIndex = slips.findIndex((s: any) => s.id === selectedSlipInfo.id);
      const deliveryIndex = deliveries.findIndex((d: any) => d.id === selectedSlipInfo.id);
      
      console.log('🔍 ایندکس‌های پیدا شده:', {
        slipIndex,
        deliveryIndex
      });
      
      if (slipIndex !== -1) {
        slips[slipIndex] = updatedSlipInfo;
        console.log('✅ حواله امانی به‌روزرسانی شد');
      }
      
      if (deliveryIndex !== -1) {
        deliveries[deliveryIndex] = updatedSlipInfo;
        console.log('✅ delivery به‌روزرسانی شد');
      }
      
      storage.saveData('consignment-delivery-slips', slips);
      storage.saveData('deliveries', deliveries);

      // به‌روزرسانی state محلی
      setSelectedSlipInfo(updatedSlipInfo);

      console.log('✅ حواله با موفقیت صادر شد:', updatedSlipInfo);

      alert('✅ حواله با موفقیت صادر شد!\n\nوضعیت حواله به "صادر شده" تغییر کرد.');
      
      // refresh صفحه برای نمایش تغییرات
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('خطا در صدور حواله:', error);
      alert('❌ خطا در صدور حواله. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSaving(false);
    }
  };
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////
// تابع جدید handleSaveSlip با اعتبارسنجی نوع گیرنده
const handleSaveSlip = async () => {
  if (isSaving) return;
  if (!selectedSlipInfo) {
    alert('لطفاً ابتدا يک حواله انتخاب کنيد.');
    return;
  }

  setIsSaving(true);
  let errorMessage = '';
  
  try {
    // --- 1. اعتبارسنجی اولیه ---
    
    // ✅ اعتبارسنجی الزامی بودن نوع گیرنده (باید چیزی به جز "فاقد انتخاب" انتخاب شده باشد)
    if (!selectedSlipInfo.recipientType || selectedSlipInfo.recipientType === 'no-selection') {
      alert('⚠️ خطا: لطفاً نوع گیرنده را انتخاب کنید.\n\nگزینه‌های مجاز:\n• سایت داخلی\n• سایت پیمانکار\n• طرف حساب\n• مشتری طرف حساب');
      return;
    }
     // ✅ اعتبارسنجی الزامی بودن تاریخ حواله (کنترل مشابه نوع گیرنده)
  if (!selectedSlipInfo.slipDate || isNaN(new Date(selectedSlipInfo.slipDate).getTime())) {
    alert('⚠️ خطا: لطفاً تاریخ حواله را انتخاب کنید.\n\nتاریخ حواله یک فیلد الزامی است و باید یک تاریخ معتبر باشد.');
    return;
  }
    // ✅ اعتبارسنجی مقدار حواله
    if (!selectedSlipInfo.amount || selectedSlipInfo.amount <= 0) {
      alert('لطفاً مقدار حواله را به درستی وارد کنید.');
      return;
    }
    
    // ✅ اعتبارسنجی مجوز در حالت ایجاد
    if (selectedSlipInfo.id?.startsWith('new_') && (!selectedSlipInfo.permitId || selectedSlipInfo.permitId.trim() === '')) {
      alert('لطفاً ابتدا یک مجوز را انتخاب کنید.');
      return;
    }
      
    // --- 2. اعتبارسنجی فیلدهای الزامی بر اساس نوع گیرنده ---
    const recipientType = selectedSlipInfo.recipientType;
    const missingFields: string[] = [];
    
    // بررسی فیلدهای مشترک برای همه انواع گیرنده
    if (isFieldEmpty('amount', selectedSlipInfo.amount)) missingFields.push('مقدار حواله');
    if (isFieldEmpty('slipDate', selectedSlipInfo.slipDate)) missingFields.push('تاریخ حواله');
    if (isFieldEmpty('permitNumber', selectedSlipInfo.permitNumber)) missingFields.push('شماره مجوز');
    if (isFieldEmpty('contractNumber', selectedSlipInfo.contractNumber)) missingFields.push('شماره قرارداد');
    if (isFieldEmpty('siteId', selectedSlipInfo.siteId)) missingFields.push('سایت موجودی کالا');
    if (isFieldEmpty('tankId', selectedSlipInfo.tankId)) missingFields.push('مخزن موجودی کالا');

    // بررسی فیلدهای اختصاصی بر اساس نوع گیرنده
    if (recipientType === 'internal-site') {
      if (isFieldEmpty('internalSiteId', selectedSlipInfo.internalSiteId)) missingFields.push('سایت داخلی');
      if (isFieldEmpty('locationId', selectedSlipInfo.locationId)) missingFields.push('لوکیشن');
    } else if (recipientType === 'contractor-site') {
      if (isFieldEmpty('contractorSiteId', selectedSlipInfo.contractorSiteId)) missingFields.push('سایت پیمانکار');
    } else if (recipientType === 'counterparty') {
      if (isFieldEmpty('counterpartyId', selectedSlipInfo.counterpartyId)) missingFields.push('طرف حساب');
      if (isFieldEmpty('companyLocationId', selectedSlipInfo.companyLocationId)) missingFields.push('لوکیشن طرف حساب');
    } else if (recipientType === 'customer-counterparty') {
      if (isFieldEmpty('customerCompanyId', selectedSlipInfo.customerCompanyId)) missingFields.push('مشتری طرف حساب');
      if (isFieldEmpty('customerLocationId', selectedSlipInfo.customerLocationId)) missingFields.push('لوکیشن مشتری طرف حساب');
    }
    
    // نمایش پیام خطا در صورت وجود فیلدهای ناقص
    if (missingFields.length > 0) {
      const recipientTypeText = {
        'internal-site': 'سایت داخلی',
        'contractor-site': 'سایت پیمانکار',
        'counterparty': 'طرف حساب',
        'customer-counterparty': 'مشتری طرف حساب'
      }[recipientType] || recipientType;
      
      alert(`برای ذخیره حواله با نوع گیرنده "${recipientTypeText}"، لطفاً موارد زیر را تکمیل کنید:\n\n${missingFields.map(field => `• ${field}`).join('\n')}`);
      return;
    }

    // --- 3. تشخیص دقیق حالت ذخیره‌سازی (ایجاد یا ویرایش) ---
    const slips = (storage.loadData('consignment-delivery-slips') || []) as any[];
    const deliveries = (storage.loadData('deliveries') || []) as any[];
    
    const existingSlipIndex = slips.findIndex((s: any) => s.id === selectedSlipInfo.id);
    const isEditMode = existingSlipIndex !== -1;

    console.log('🔍 تشخیص حالت ذخیره‌سازی:', {
      'selectedSlipInfo.id': selectedSlipInfo.id,
      'existingSlipIndex': existingSlipIndex,
      'isEditMode': isEditMode,
      'تعداد حواله‌ها در storage': slips.length,
      'حالت': isEditMode ? 'ویرایش (UPDATE)' : 'ایجاد (INSERT)'
    });

    // آماده‌سازی نهایی اطلاعات برای ذخیره - اصلاح شده برای انتقال کامل 5 فیلد مورد نظر کاربر
    const finalSlipInfo = {
      ...selectedSlipInfo,
      amount: parseFloat(selectedSlipInfo.amount.toString()) || 0,
      slipDate: new Date(selectedSlipInfo.slipDate),
      status: 'issued', // تغییر وضعیت به "صادر شده" مشابه دکمه "صدور حواله"
      persianStatus: 'صادر شده', // اطمینان از تنظیم فارسی وضعیت
      updatedAt: new Date(),
      transactionNumber: isEditMode ? selectedSlipInfo.transactionNumber : (selectedSlipInfo.transactionNumber || generateConsignmentTransactionNumber(new Date(selectedSlipInfo.slipDate || new Date()))),
      
      // ⭐ اطمینان از انتقال کامل 5 فیلد مورد نظر کاربر به جدول "تراکنش‌های ثبت شده امانی":
      
      // 1. طرف حساب (Counterparty)
      counterpartyId: selectedSlipInfo.counterpartyId || '',
      counterpartyName: selectedSlipInfo.counterpartyName || 
        (selectedSlipInfo.counterpartyId && selectedSlipInfo.counterpartyId !== 'no-selection' 
          ? baseData.companies?.find((c: any) => c.id === selectedSlipInfo.counterpartyId)?.name || ''
          : ''),
      
      // 2. لوکیشن مشتری طرف حساب (Customer Counterparty Location)
      customerLocationId: selectedSlipInfo.customerLocationId || '',
      customerLocationName: selectedSlipInfo.customerLocationName ||
        (selectedSlipInfo.customerLocationId 
          ? baseData.customerCompaniesLocation?.find((l: any) => l.id === selectedSlipInfo.customerLocationId)?.name || ''
          : ''),
      
      // 3. سایت داخلی (Internal Site)
      internalSiteId: selectedSlipInfo.internalSiteId || '',
      internalSiteName: selectedSlipInfo.internalSiteName ||
        (selectedSlipInfo.internalSiteId 
          ? baseData.internalSites?.find((s: any) => s.id === selectedSlipInfo.internalSiteId)?.name || ''
          : ''),
      
      // 4. لوکیشن (Location)
      locationId: selectedSlipInfo.locationId || '',
      locationName: selectedSlipInfo.locationName ||
        (selectedSlipInfo.locationId 
          ? baseData.locations?.find((l: any) => l.id === selectedSlipInfo.locationId)?.name || ''
          : ''),
      
      // 5. سایت پیمانکار (Contractor Site)
      contractorSiteId: selectedSlipInfo.contractorSiteId || '',
      contractorSiteName: selectedSlipInfo.contractorSiteName ||
        (selectedSlipInfo.contractorSiteId 
          ? baseData.contractorSites?.find((s: any) => s.id === selectedSlipInfo.contractorSiteId)?.name || ''
          : ''),
      
      // اطمینان از انتقال سایر فیلدهای مرتبط برای نمایش کامل در جدول
      recipientType: selectedSlipInfo.recipientType || 'no-selection',
      
      // اطلاعات تکمیلی حواله
      additionalInfo: (showDeliveryExtraInfo || enforceDeliveryExtraInfo.consignment) ? {
        ...deliveryExtraInfo,
        weight: deliveryExtraInfo.weight || selectedSlipInfo.amount || 0,
        billDate: deliveryExtraInfo.billDate || selectedSlipInfo.slipDate,
        destinationAddress: deliveryExtraInfo.destinationAddress || 
          (selectedSlipInfo.internalSiteName || 
           selectedSlipInfo.contractorSiteName || 
           selectedSlipInfo.counterpartyName || 
           selectedSlipInfo.customerCounterpartyName || '')
      } : undefined,
      
      // ⚠️ فیلدهای لوکیشن طرف حساب: فقط از مقادیر واقعی کاربر استفاده می‌شود
      companyLocationId: selectedSlipInfo.companyLocationId || '',
      companyLocationName: selectedSlipInfo.companyLocationName ||
        (selectedSlipInfo.companyLocationId 
          ? baseData.companiesLocation?.find((l: any) => l.id === selectedSlipInfo.companyLocationId)?.name || ''
          : ''),
      
      customerCompanyId: selectedSlipInfo.customerCompanyId || '',
      customerCounterpartyName: selectedSlipInfo.customerCounterpartyName ||
        (selectedSlipInfo.customerCompanyId 
          ? baseData.customerCompanies?.find((c: any) => c.id === selectedSlipInfo.customerCompanyId)?.name || ''
          : ''),
      
      // ⭐ فیلدهای اصلی که جدول "تراکنش‌های ثبت شده امانی" از آنها استفاده می‌کند:
      // لوکیشن طرف حساب - نام فیلد مورد استفاده در جدول
      counterpartyLocationName: selectedSlipInfo.companyLocationName ||
        (selectedSlipInfo.companyLocationId 
          ? baseData.companiesLocation?.find((l: any) => l.id === selectedSlipInfo.companyLocationId)?.name || ''
          : ''),
      
      // لوکیشن مشتری طرف حساب - نام فیلد مورد استفاده در جدول
      customerCounterpartyLocationName: selectedSlipInfo.customerLocationName ||
        (selectedSlipInfo.customerLocationId 
          ? baseData.customerCompaniesLocation?.find((l: any) => l.id === selectedSlipInfo.customerLocationId)?.name || ''
          : ''),
    };

    // ⭐ حذف فیلدهای داخلی و موقت که نباید در storage ذخیره شوند
    // این فیلدها فقط برای منطق UI استفاده می‌شوند و باعث تداخل اطلاعات می‌شوند
    const fieldsToRemove = [
      '_editingSource',
      '_isParentEdit',
      '_isNewFromPermit',
      'editMode',
      '_originalAmount',
      '_deliveryCounterpartySource',
      'remainingPermitAmount',
      '_transferredFields',
      '_debugSources'
    ];
    
    fieldsToRemove.forEach(field => {
      if (field in finalSlipInfo) {
        delete (finalSlipInfo as any)[field];
      }
    });

    console.log('🧹 فیلدهای داخلی حذف شدند:', fieldsToRemove);
    console.log('📦 finalSlipInfo پس از پاکسازی:', Object.keys(finalSlipInfo));

    console.log('✅ فیلدهای کامل انتقال یافته به جدول "تراکنش‌های ثبت شده امانی":', {
      '1. طرف حساب': `${finalSlipInfo.counterpartyName} (ID: ${finalSlipInfo.counterpartyId})`,
      '2. لوکیشن مشتری طرف حساب': `${finalSlipInfo.customerCounterpartyLocationName} (ID: ${finalSlipInfo.customerLocationId})`,
      '3. سایت داخلی': `${finalSlipInfo.internalSiteName} (ID: ${finalSlipInfo.internalSiteId})`,
      '4. لوکیشن': `${finalSlipInfo.locationName} (ID: ${finalSlipInfo.locationId})`,
      '5. سایت پیمانکار': `${finalSlipInfo.contractorSiteName} (ID: ${finalSlipInfo.contractorSiteId})`,
      'نوع گیرنده': finalSlipInfo.recipientType,
      'لوکیشن طرف حساب': `${finalSlipInfo.counterpartyLocationName} (ID: ${finalSlipInfo.companyLocationId})`,
      'مشتری طرف حساب': `${finalSlipInfo.customerCounterpartyName} (ID: ${finalSlipInfo.customerCompanyId})`
    });
    
    // کنترل شماره تراکنش تکراری (فقط در حالت ایجاد)
    if (!isEditMode && finalSlipInfo.transactionNumber) {
      const existingTransactionNumbers = [...slips, ...deliveries]
        .map(s => s.transactionNumber)
        .filter(num => num && num === finalSlipInfo.transactionNumber);
      
      if (existingTransactionNumbers.length > 0) {
        alert(`خطا: شماره تراکنش "${finalSlipInfo.transactionNumber}" قبلاً استفاده شده است. لطفاً شماره دیگری انتخاب کنید.`);
        return;
      }
    }
    
    // --- 4. ذخیره بر اساس حالت ---
    if (isEditMode) {
      // حالت ویرایش: UPDATE - جایگزینی کامل رکورد قدیمی
      console.log('📝 حالت ویرایش - جایگزینی رکورد قدیمی با index:', existingSlipIndex);
      console.log('📝 رکورد قدیمی:', slips[existingSlipIndex]);
      
      // جایگزینی کامل با داده‌های جدید (نه merge)
      slips[existingSlipIndex] = { ...finalSlipInfo };
      
      console.log('📝 رکورد جدید:', slips[existingSlipIndex]);
      
      // به‌روزرسانی در deliveries هم
      const deliveryIndex = deliveries.findIndex((d: any) => d.id === finalSlipInfo.id);
      if (deliveryIndex !== -1) {
        deliveries[deliveryIndex] = { ...finalSlipInfo };
        console.log('📝 Delivery با index', deliveryIndex, 'هم به‌روزرسانی شد');
      }
    } else {
      // حالت ایجاد: INSERT
      slips.push(finalSlipInfo);
      deliveries.push(finalSlipInfo);
      
      // به‌روزرسانی مانده مجوز (فقط برای حواله‌های جدید)
      if (finalSlipInfo.permitId) {
        const permits = (storage.loadData('delivery-permits') || []) as any[];
        const permitIndex = permits.findIndex((p: any) => p.id === finalSlipInfo.permitId);
        
        if (permitIndex !== -1) {
          const permit = permits[permitIndex];
          const newRemainingTransferPermit = Math.max(0, (permit.remainingTransferPermit || 0) - finalSlipInfo.amount);
          
          permits[permitIndex] = {
            ...permit,
            remainingTransferPermit: newRemainingTransferPermit,
            updatedAt: new Date()
          };
          
          storage.saveData('delivery-permits', permits);
        }
      }
    }
    
    // ذخیره نهایی تغییرات
    storage.saveData('consignment-delivery-slips', slips);
    storage.saveData('deliveries', deliveries);
    
    // Clear cache and notify DashboardStats (مشابه handleIssueSlip)
    const cacheKey = 'warehouse_consignment-delivery-slips';
    localStorage.removeItem(cacheKey);
    window.dispatchEvent(new StorageEvent('storage', {
      key: cacheKey,
      newValue: JSON.stringify(slips),
      storageArea: localStorage
    }));
    window.dispatchEvent(new CustomEvent('warehouseDataUpdate'));
    
    console.log('✅ داده‌ها در storage ذخیره شدند:', {
      'تعداد حواله‌های امانی': slips.length,
      'تعداد deliveries': deliveries.length,
      'حالت': isEditMode ? 'ویرایش' : 'ایجاد',
      'ID حواله': finalSlipInfo.id,
      'وضعیت': finalSlipInfo.status,
      'آخرین حواله ذخیره شده': slips[slips.length - 1]
    });
    
    // پیام موفقیت
    const successMessage = isEditMode
      ? `✅ حواله امانی با موفقیت ویرایش شد\n\nداده‌ها اکنون در جدول "تراکنش‌های ثبت شده امانی" به‌روزرسانی می‌شوند.`
      : `✅ حواله امانی جدید با موفقیت ایجاد شد\n\nداده‌ها اکنون در جدول نمایش داده می‌شوند.`;
    
    alert(successMessage);
    
    // 🔄 راه حل قطعی: بعد از ذخیره، بازگشت به لیست و اجبار به refresh
    // این باعث می‌شود کامپوننت والد داده‌های جدید را از storage بخواند
    setIsSaving(false);
    
    // استفاده از onBack برای بازگشت به لیست (کامپوننت والد خودش refresh می‌کند)
    if (onBack) {
      onBack();
    }
    
    // ⭐ در آخر، اطمینان از reload کامل صفحه
    // از setTimeout استفاده می‌کنیم تا alert بسته شود و onBack اجرا شود
    // سپس صفحه reload می‌شود تا تمام state‌ها پاک شوند
    setTimeout(() => {
      window.location.reload();
    }, 100);
    
    // خروج سریع از function تا جلوی اجرای کدهای بعدی را بگیریم
    return;
    
  } catch (error) {
    console.error('❌ خطا در ذخیره‌سازی حواله:', error);
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = 'خطای نامشخص در ذخیره‌سازی';
    }
    
    alert(`❌ خطا در ذخیره‌سازی حواله. لطفاً دوباره تلاش کنید.\n\nجزئیات خطا: ${errorMessage}`);
  } finally {
    setIsSaving(false);
  }
};
  const handleChange = useCallback((field: keyof ConsignmentSlipInfo, value: any) => {
  if (!selectedSlipInfo) return;
  
  let updatedSlipInfo = {
    ...selectedSlipInfo,
    [field]: value
  };
  
  // 🔧 اضافه کردن منطق برای set کردن نام‌ها هنگام انتخاب ID و پر کردن خودکار از baseData
  if (field === 'counterpartyId' && value && value !== 'no-selection') {
    // پیدا کردن نام طرف حساب تحویل گیرنده کالا از baseData.companies
    const company = baseData?.companies?.find((c: any) => c.id === value);
    if (company) {
      updatedSlipInfo.deliveryCounterpartyName = company.name;
      console.log('✅ نام طرف حساب تحویل گیرنده کالا set شد:', company.name);
      
      // ⭐ پر کردن خودکار لوکیشن طرف حساب از baseData اگر خالی باشد
      if (!updatedSlipInfo.companyLocationId && baseData?.companiesLocation) {
        // جستجوی لوکیشن مرتبط با این شرکت از baseData
        const relatedLocation = baseData.companiesLocation.find((loc: any) => 
          loc.companyId === value || loc.id === value || loc.name?.includes(company.name)
        );
        if (relatedLocation) {
          updatedSlipInfo.companyLocationId = relatedLocation.id;
          updatedSlipInfo.companyLocationName = relatedLocation.name;
          updatedSlipInfo.counterpartyLocationName = relatedLocation.name;
          console.log('✅ لوکیشن طرف حساب به صورت خودکار از baseData پر شد:', relatedLocation.name);
        }
      }
    } else {
      updatedSlipInfo.deliveryCounterpartyName = '';
      console.log('⚠️ طرف حساب با ID', value, 'یافت نشد');
    }
  } else if (field === 'customerCompanyId' && value && value !== '') {
    // پیدا کردن نام مشتری طرف حساب تحویل گیرنده کالا از baseData.customerCompanies
    const customerCompany = baseData?.customerCompanies?.find((c: any) => c.id === value);
    if (customerCompany) {
      updatedSlipInfo.customerCounterpartyName = customerCompany.name;
      console.log('✅ نام مشتری طرف حساب تحویل گیرنده کالا set شد:', customerCompany.name);
      
      // ⭐ پر کردن خودکار لوکیشن مشتری طرف حساب از baseData اگر خالی باشد
      if (!updatedSlipInfo.customerLocationId && baseData?.customerCompaniesLocation) {
        // جستجوی لوکیشن مرتبط با این مشتری از baseData
        const relatedLocation = baseData.customerCompaniesLocation.find((loc: any) => 
          loc.companyId === value || loc.customerCompanyId === value || loc.id === value || loc.name?.includes(customerCompany.name)
        );
        if (relatedLocation) {
          updatedSlipInfo.customerLocationId = relatedLocation.id;
          updatedSlipInfo.customerLocationName = relatedLocation.name;
          updatedSlipInfo.customerCounterpartyLocationName = relatedLocation.name;
          console.log('✅ لوکیشن مشتری طرف حساب به صورت خودکار از baseData پر شد:', relatedLocation.name);
        }
      }
    } else {
      updatedSlipInfo.customerCounterpartyName = '';
      console.log('⚠️ مشتری طرف حساب با ID', value, 'یافت نشد');
    }
  } else if (field === 'internalSiteId') {
    // ⭐ پیدا کردن نام سایت داخلی از baseData.internalSites
    const site = baseData?.internalSites?.find((s: any) => s.id === value);
    const siteName = site ? site.name : '';
    updatedSlipInfo.internalSiteName = siteName;
    console.log('✅ سایت داخلی set شد از baseData:', siteName, '(ID:', value, ')');
  } else if (field === 'contractorSiteId') {
    // ⭐ پیدا کردن نام سایت پیمانکار از baseData.contractorSites
    const site = baseData?.contractorSites?.find((s: any) => s.id === value);
    const siteName = site ? site.name : '';
    updatedSlipInfo.contractorSiteName = siteName;
    console.log('✅ سایت پیمانکار set شد از baseData:', siteName, '(ID:', value, ')');
  } else if (field === 'companyLocationId') {
    // ⭐ پیدا کردن نام لوکیشن طرف حساب از baseData.companiesLocation
    const location = baseData?.companiesLocation?.find((l: any) => l.id === value);
    const locationName = location ? location.name : '';
    updatedSlipInfo.companyLocationName = locationName;
    updatedSlipInfo.counterpartyLocationName = locationName; // ⭐ نام فیلد مورد استفاده در جدول
    console.log('✅ لوکیشن طرف حساب set شد از baseData:', locationName, '(ID:', value, ')');
  } else if (field === 'customerLocationId') {
    // ⭐ پیدا کردن نام لوکیشن مشتری طرف حساب از baseData.customerCompaniesLocation
    const location = baseData?.customerCompaniesLocation?.find((l: any) => l.id === value);
    const locationName = location ? location.name : '';
    updatedSlipInfo.customerLocationName = locationName;
    updatedSlipInfo.customerCounterpartyLocationName = locationName; // ⭐ نام فیلد مورد استفاده در جدول
    console.log('✅ لوکیشن مشتری طرف حساب set شد از baseData:', locationName, '(ID:', value, ')');
  }
  
  // کنترل مقدار حواله بر اساس مانده مجوز
  if (field === 'amount' && selectedSlipInfo.permitId) {
    const newAmount = parseFloat(value) || 0;
    const minAmount = 0.1; // حداقل مقدار مجاز
    
    // تشخیص منبع ویرایش برای اعمال فرمول صحیح
    const editingSource = isEditingFromParent ? 'parent' : (isEditingFromTransactionList || editingSlipId ? 'transaction-list' : undefined);
    const isEditingMode = isEditingFromParent || isEditingFromTransactionList || !!editingSlipId;
    
    // محاسبه جدید مانده مجوز حواله با فرمول صحیح کاربر
    const newRemainingPermitAmount = calculateRemainingPermitAmount(
      selectedSlipInfo.permitId,
      selectedSlipInfo.permitAmount,
      selectedSlipInfo.id || editingSlipId || undefined,
      isEditingMode,
      newAmount,
      editingSource
    );
    
    // محدود کردن مقدار وارده به بازه مجاز
    let finalAmount = newAmount;
    
    // کنترل حداقل مقدار (0.1)
    if (finalAmount < minAmount) {
      finalAmount = minAmount;
      updatedSlipInfo.amount = finalAmount;
      
      // هشدار فقط برای مقدار بسیار کم (کمتر از 0.05)
      if (newAmount < 0.05) {
        alert(`⚠️ هشدار: مقدار حواله نمی‌تواند کمتر از ${minAmount} باشد.\n\nمقدار حواله به ${formatPersianNumber(finalAmount)} ${selectedSlipInfo.unit || 'کیلوگرم'} تغییر یافت (حداقل مقدار مجاز).`);
      }
    }
    // کنترل حداکثر مقدار (مانده مجوز حواله)
    else if (finalAmount > newRemainingPermitAmount) {
      finalAmount = newRemainingPermitAmount;
      updatedSlipInfo.amount = finalAmount;
      
      // هشدار برای محدود کردن مقدار
      alert(`⚠️ هشدار: مقدار حواله نمی‌تواند از مانده مجوز حواله (${formatPersianNumber(newRemainingPermitAmount)} ${selectedSlipInfo.unit || 'کیلوگرم'}) بیشتر باشد.\n\nمقدار حواله به ${formatPersianNumber(finalAmount)} ${selectedSlipInfo.unit || 'کیلوگرم'} تغییر یافت (حداکثر مقدار مجاز).`);
    }
    
    // در هر صورت، مانده مجوز را به‌روزرسانی کن
    updatedSlipInfo.remainingPermitAmount = newRemainingPermitAmount;
    
    // در صورت تغییر مقدار، مقدار نهایی را برای ذخیره‌سازی آماده کن
    value = finalAmount;
    updatedSlipInfo.amount = finalAmount;
    
    console.log('کنترل مقدار حواله:', {
      originalAmount: newAmount,
      finalAmount,
      minAmount,
      maxAmount: newRemainingPermitAmount,
      remainingPermitAmount: newRemainingPermitAmount,
      editingSource,
      isEditingMode
    });
  }
  
  setSelectedSlipInfo(updatedSlipInfo);
  
  // پاک کردن خطاهای مربوط به این فیلد
  if (errors[field]) {
    const newErrors = { ...errors };
    delete newErrors[field];
    setErrors(newErrors);
  }
}, [selectedSlipInfo, isEditingFromParent, isEditingFromTransactionList, editingSlipId, calculateRemainingPermitAmount, setSelectedSlipInfo, errors, setErrors, formatPersianNumber, baseData]);
  const handlePrintSlip = useCallback(() => {
    if (!selectedSlipInfo) return;
    
    const printContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
    <meta charset="UTF-8">
    <title>حواله انبار امانی - ${selectedSlipInfo.permitNumber}</title>
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap');
    
    @page { 
      margin: 15mm; 
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
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      font-size: 11px;
      color: #0f172a;
      line-height: 1.7;
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
      border-radius: 20px;
      box-shadow: 
        0 10px 25px rgba(15, 23, 42, 0.15),
        0 4px 10px rgba(15, 23, 42, 0.1),
        0 1px 3px rgba(15, 23, 42, 0.05);
      overflow: hidden;
      border: 1px solid #e2e8f0;
      position: relative;
    }
    
    .header-section {
      background: linear-gradient(135deg, #1e293b 0%, #334155 25%, #475569 50%, #1e293b 100%);
      color: white;
      padding: 40px 50px;
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
      background: 
        radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
        url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.03"><polygon points="50,10 90,30 50,50 10,30"/></g></svg>') repeat;
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
      width: 80px;
      height: 80px;
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }
    
    .company-details h1 {
      font-size: 26px;
      font-weight: 900;
      margin: 0 0 10px 0;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      letter-spacing: -0.025em;
    }
    
    .company-details p {
      font-size: 13px;
      margin: 0;
      color: #cbd5e1;
      line-height: 1.6;
      font-weight: 400;
    }
    
    .document-title {
      text-align: center;
      flex: 1;
    }
    
    .document-title h2 {
      font-size: 36px;
      font-weight: 900;
      margin: 0 0 12px 0;
      color: #ffffff;
      text-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
      letter-spacing: -0.025em;
    }
    
    .document-title .subtitle {
      font-size: 16px;
      font-weight: 600;
      color: #e2e8f0;
      margin: 0;
      opacity: 0.9;
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
    <h2>حواله انبار امانی</h2>
    <p class="subtitle">شماره: ${selectedSlipInfo.permitNumber}</p>
    <p class="subtitle">شماره تراکنش: ${selectedSlipInfo.transactionNumber || '-'}</p>
    </div>
    </div>
    </div>
    
    <div class="content-section">
    <div class="info-grid">
    <div class="info-card">
    <h3>اطلاعات حواله</h3>
    <div class="info-row">
    <span class="info-label">طرف حساب تحویل گیرنده:</span>
    <span class="info-value">${selectedSlipInfo.counterpartyName}</span>
    </div>
    <div class="info-row">
    <span class="info-label">شماره قرارداد:</span>
    <span class="info-value">${selectedSlipInfo.contractNumber}</span>
    </div>
    <div class="info-row">
    <span class="info-label">شماره مجوز:</span>
    <span class="info-value">${selectedSlipInfo.permitNumber}</span>
    </div>
    <div class="info-row">
    <span class="info-label">شماره رسید انبار:</span>
    <span class="info-value">${selectedSlipInfo.receiptNumber}</span>
    </div>
    <div class="info-row">
    <span class="info-label">مقدار حواله:</span>
    <span class="info-value highlight-text">${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</span>
    </div>
    <div class="info-row">
    <span class="info-label">تاریخ حواله:</span>
    <span class="info-value">${formatPersianDate(selectedSlipInfo.slipDate)}</span>
    </div>
    </div>
    
    <div class="info-card">
    <h3>مکان‌ها و موقعیت</h3>
    <div class="info-row">
    <span class="info-label">نوع گیرنده:</span>
    <span class="info-value">${selectedSlipInfo.recipientType === 'counterparty' ? 'طرف حساب' : selectedSlipInfo.recipientType === 'customer-counterparty' ? 'مشتری طرف حساب' : selectedSlipInfo.recipientType}</span>
    </div>
    <div class="info-row">
    <span class="info-label">سایت داخلی:</span>
    <span class="info-value">${baseData.internalSites?.find((s: any) => s.id === selectedSlipInfo.internalSiteId)?.name || '-'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">لوکیشن:</span>
    <span class="info-value">${baseData.locations?.find((l: any) => l.id === selectedSlipInfo.locationId)?.name || '-'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">سایت پیمانکار:</span>
    <span class="info-value">${baseData.contractorSites?.find((s: any) => s.id === selectedSlipInfo.contractorSiteId)?.name || '-'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">سایت مخازن:</span>
    <span class="info-value">${selectedSlipInfo.siteName}</span>
    </div>
    <div class="info-row">
    <span class="info-label">مخزن:</span>
    <span class="info-value">${selectedSlipInfo.tankName}</span>
    </div>
    </div>
    </div>
    
    <div class="amount-showcase">
    <div class="amount-label">مقدار کل حواله امانی</div>
    <div class="amount-number">${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</div>
    </div>
    
    <div class="info-grid">
    <div class="info-card">
    <h3>اطلاعات تکمیلی</h3>
    <div class="info-row">
    <span class="info-label">طرف حساب:</span>
    <span class="info-value">${selectedSlipInfo.counterpartyName || '-'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">لوکیشن طرف حساب:</span>
    <span class="info-value">${selectedSlipInfo.counterpartyLocationName || '-'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">مشتری طرف حساب:</span>
    <span class="info-value">${selectedSlipInfo.customerCounterpartyName || '-'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">لوکیشن مشتری:</span>
    <span class="info-value">${selectedSlipInfo.customerCounterpartyLocationName || '-'}</span>
    </div>
    </div>
    
    <div class="info-card">
    <h3>اطلاعات حمل و نقل</h3>
    <div class="info-row">
    <span class="info-label">نام راننده:</span>
    <span class="info-value">${selectedSlipInfo.driverName || '-'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">کد ملی راننده:</span>
    <span class="info-value">${selectedSlipInfo.driverNationalId || '-'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">پلاک راننده:</span>
    <span class="info-value">${selectedSlipInfo.driverPlateNumber || '-'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">نام کشتی:</span>
    <span class="info-value">${selectedSlipInfo.shipName || '-'}</span>
    </div>
    </div>
    </div>
    
    <div class="footer-note">
    این سند در تاریخ ${formatPersianDate(new Date())} توسط سیستم اتوماسیون انبارداری شرکت صنعت غذایی کورش صادر شده است و دارای اعتبار قانونی می‌باشد.
    </div>
    </div>
    </div>
    </div>
    
    <!-- صفحه دوم: اطلاعات رسید انبار و مجوز -->
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
    <h2>جزئیات رسید انبار و مجوز</h2>
    <p class="subtitle">شماره: ${selectedSlipInfo.permitNumber}</p>
    <p class="subtitle">شماره تراکنش: ${selectedSlipInfo.transactionNumber || '-'}</p>
    </div>
    </div>
    </div>
    
    <div class="content-section">
    <div class="section-title">اطلاعات رسید انبار</div>
    <table class="data-table">
    <tr><td width="30%"><strong>طرف حساب</strong></td><td>${selectedSlipInfo.counterpartyName}</td></tr>
    <tr><td><strong>مشتری طرف حساب</strong></td><td>${selectedSlipInfo.customerCounterpartyName || '-'}</td></tr>
    <tr><td><strong>لوکیشن طرف حساب</strong></td><td>${selectedSlipInfo.counterpartyLocationName || '-'}</td></tr>
    <tr><td><strong>لوکیشن مشتری طرف حساب</strong></td><td>${selectedSlipInfo.customerCounterpartyLocationName || '-'}</td></tr>
    <tr><td><strong>شماره قرارداد</strong></td><td>${selectedSlipInfo.contractNumber}</td></tr>
    <tr><td><strong>شماره رسید انبار</strong></td><td>${selectedSlipInfo.receiptNumber}</td></tr>
    <tr><td><strong>نام کالا امانی</strong></td><td>${selectedSlipInfo.productName}</td></tr>
    <tr><td><strong>مقدار مبنی رسید</strong></td><td>${formatPersianNumber(selectedSlipInfo.receiptBasisAmount || 0)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td><strong>درصد افت</strong></td><td>${selectedSlipInfo.wastagePercentage ? `${selectedSlipInfo.wastagePercentage}%` : '-'}</td></tr>
    <tr><td><strong>وزن افت</strong></td><td>${formatPersianNumber(selectedSlipInfo.wastageAmount)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td><strong>مقدار رسید نهایی</strong></td><td>${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td><strong>شماره سهمیه</strong></td><td>${selectedSlipInfo.quotaNumber || '-'}</td></tr>
    <tr><td><strong>شماره ثبت</strong></td><td>${selectedSlipInfo.registrationOrderNumber || '-'}</td></tr>
    <tr><td><strong>شماره شاخص/ثبت سفارش</strong></td><td>${selectedSlipInfo.indexNumber || '-'}</td></tr>
    <tr><td><strong>شماره کوتاژ</strong></td><td>${selectedSlipInfo.cotageNumber || '-'}</td></tr>
    <tr><td><strong>شماره نامه مدیریت</strong></td><td>${selectedSlipInfo.managementLetterNumber || '-'}</td></tr>
    </table>
    
    <div class="section-title">اطلاعات مجوز و وضعیت</div>
    <table class="data-table">
    <tr><td width="30%"><strong>شماره مجوز</strong></td><td>${selectedSlipInfo.permitNumber}</td></tr>
    <tr><td><strong>مقدار مجوز حواله</strong></td><td>${formatPersianNumber(selectedSlipInfo.permitAmount)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td><strong>مانده مجوز حواله</strong></td><td>${formatPersianNumber(selectedSlipInfo.remainingPermitAmount)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td><strong>مقدار افت مجوز</strong></td><td>${formatPersianNumber(selectedSlipInfo.wastageAmount)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td><strong>مقدار مجوز بعد از کسر افت</strong></td><td>${formatPersianNumber(selectedSlipInfo.finalPermitAmount)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td><strong>مانده مجوز نهایی</strong></td><td>${formatPersianNumber(selectedSlipInfo.remainingTransferPermit)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td><strong>تاریخ مجوز</strong></td><td>${formatPersianDate(selectedSlipInfo.permitDate)}</td></tr>
    <tr><td><strong>تاریخ تأیید مجوز</strong></td><td>${formatPersianDate(selectedSlipInfo.approvalDate)}</td></tr>
    <tr><td><strong>وضعیت تراکنش</strong></td><td><span class="status-badge ${selectedSlipInfo.status === 'completed' ? 'status-completed' : 'status-pending'}">${selectedSlipInfo.status}</span></td></tr>
    <tr><td><strong>رخداد</strong></td><td>${selectedSlipInfo.event || '-'}</td></tr>
    <tr><td><strong>شماره تراکنش حواله</strong></td><td>${selectedSlipInfo.transactionNumber || '-'}</td></tr>
    </table>
    
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
    این سند در تاریخ ${formatPersianDate(new Date())} توسط سیستم اتوماسیون انبارداری شرکت صنعت غذایی کورش صادر شده است.
    </div>
    </div>
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
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 1000);
    } else {
      alert('لطفاً پنجره جدید را در مرورگر خود مجاز کنید.');
    }
  }, [selectedSlipInfo, baseData]);

  // توابع برای دریافت اطلاعات کامل از BaseDataManager
  const getInternalSiteInfo = (siteId: string) => {
    if (!siteId) return null;
    return baseData.internalSites?.find((site: any) => site.id === siteId);
  };

  const getContractorSiteInfo = (siteId: string) => {
    if (!siteId) return null;
    return baseData.contractorSites?.find((site: any) => site.id === siteId);
  };

  const getLocationInfo = (locationId: string) => {
    if (!locationId) return null;
    return baseData.locations?.find((location: any) => location.id === locationId);
  };

  const getCompanyInfo = (companyId: string) => {
    if (!companyId) return null;
    return baseData.companies?.find((company: any) => company.id === companyId);
  };

  const getCompanyLocationInfo = (locationId: string) => {
    if (!locationId) return null;
    return baseData.companiesLocation?.find((location: any) => location.id === locationId);
  };

  const getCustomerCompanyInfo = (companyId: string) => {
    if (!companyId) return null;
    return baseData.customerCompanies?.find((company: any) => company.id === companyId);
  };

  const getCustomerLocationInfo = (locationId: string) => {
    if (!locationId) return null;
    return baseData.customerCompaniesLocation?.find((location: any) => location.id === locationId);
  };

  // اطلاعات انتخاب شده فعلی برای نمایش در جدول
  const selectedInternalSiteInfo = useMemo(() => 
    selectedSlipInfo?.internalSiteId ? getInternalSiteInfo(selectedSlipInfo.internalSiteId) : null, 
    [selectedSlipInfo?.internalSiteId, baseData.internalSites]
  );
  
  const selectedContractorSiteInfo = useMemo(() => 
    selectedSlipInfo?.contractorSiteId ? getContractorSiteInfo(selectedSlipInfo.contractorSiteId) : null, 
    [selectedSlipInfo?.contractorSiteId, baseData.contractorSites]
  );
  
  const selectedLocationInfo = useMemo(() => 
    selectedSlipInfo?.locationId ? getLocationInfo(selectedSlipInfo.locationId) : null, 
    [selectedSlipInfo?.locationId, baseData.locations]
  );
  
  const selectedCompanyInfo = useMemo(() => 
    selectedSlipInfo?.counterpartyId ? getCompanyInfo(selectedSlipInfo.counterpartyId) : null, 
    [selectedSlipInfo?.counterpartyId, baseData.companies]
  );
  
  const selectedCompanyLocationInfo = useMemo(() => 
    selectedSlipInfo?.companyLocationId ? getCompanyLocationInfo(selectedSlipInfo.companyLocationId) : null, 
    [selectedSlipInfo?.companyLocationId, baseData.companiesLocation]
  );
  
  const selectedCustomerCompanyInfo = useMemo(() => 
    selectedSlipInfo?.customerCompanyId ? getCustomerCompanyInfo(selectedSlipInfo.customerCompanyId) : null, 
    [selectedSlipInfo?.customerCompanyId, baseData.customerCompanies]
  );
  
  const selectedCustomerLocationInfo = useMemo(() => 
    selectedSlipInfo?.customerLocationId ? getCustomerLocationInfo(selectedSlipInfo.customerLocationId) : null, 
    [selectedSlipInfo?.customerLocationId, baseData.customerCompaniesLocation]
  );



  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="w-full mx-auto max-w-screen-2xl">
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row items-start justify-between gap-4">
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {/* ستون چپ - جدول اطلاعات اماني */}
          <div className="space-y-4 md:space-y-6">
  <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
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
              
              {/* خلاصه ظرفیت مخازن */}
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-blue-900">ظرفیت مخازن:</span>
                    <span className="font-bold text-blue-900">{formatPersianNumber(calculateTotalTankCapacity())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-green-900">موجودی کل مخازن:</span>
                    <span className="font-bold text-green-900">
                      {formatPersianNumber(
                        filteredPermits.reduce((sum, permit) => {
                          return sum + calculateTankInventory(permit.siteId || '', permit.tankId || '');
                        }, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-orange-900">ظرفیت خالی مخازن:</span>
                    <span className="font-bold text-orange-900">
                      {formatPersianNumber(Math.max(0, calculateTotalTankCapacity() - 
                        filteredPermits.reduce((sum, permit) => {
                          return sum + calculateTankInventory(permit.siteId || '', permit.tankId || '');
                        }, 0)
                      ))}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mb-4 flex items-center justify-between px-4">
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
              <div className="h-96 overflow-auto">
  <table className="w-full min-w-max">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">بررسی گردد</th>
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
                      {showExtraInfoInTable && (
                        <>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">نام راننده</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">نام خانوادگی راننده</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">کد ملی راننده</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">شماره بارنامه</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">شماره پلاک</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">وزن (مبنا)</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">مبلغ بارنامه</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">مقصد بارنامه</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">تاریخ بارنامه</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">شرکت حمل و نقل</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">شماره موبایل راننده</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">آدرس مقصد</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">مبلغ پشت بارنامه</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">کدپستی مقصد</th>
                        </>
                      )}
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
          isChecked ? 'bg-yellow-100 border-2 border-red-500' : ''
        } ${
          isDisabled ? 'opacity-50' : ''
        }`}
        onClick={() => handleSelectPermit(permit)}
      >
        <td className="px-4 py-4 whitespace-nowrap text-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              toggleCheckTransaction(permit.id);
            }}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {permit.permitNumber}
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
          {permit.recipientType === 'counterparty' ? 'طرف حساب' : 'مشتري طرف حساب'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {permit.recipientType === 'counterparty' 
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
          // در جدول اطلاعات امانی، دکمه ویرایش را به شکل زیر اصلاح کنید
<button
  onClick={(e) => {
    e.stopPropagation();
    handleEditSlip(permit); // استفاده از تابع اصلاح شده
  }}
  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100 transition-colors"
  title="ویرایش"
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
        {showExtraInfoInTable && (() => {
          const extraInfo = permit.additionalInfo || {};
          return (
            <>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{extraInfo.driverFirstName || '-'}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{extraInfo.driverLastName || '-'}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{extraInfo.driverNationalId || '-'}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{extraInfo.billOfLadingNumber || '-'}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{extraInfo.plateNumber || '-'}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {extraInfo.weight ? formatPersianNumber(extraInfo.weight) : '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {extraInfo.billAmount ? formatPersianNumber(extraInfo.billAmount) : '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{extraInfo.destination || '-'}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {extraInfo.billDate ? formatPersianDate(extraInfo.billDate) : '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{extraInfo.transportCompany || '-'}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{extraInfo.driverMobile || '-'}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{extraInfo.destinationAddress || '-'}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {extraInfo.backBillAmount ? formatPersianNumber(extraInfo.backBillAmount) : '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{extraInfo.destinationPostalCode || '-'}</td>
            </>
          );
        })()}
      </tr>
    );
  })}
</tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ستون راست - جدول اطلاعات حواله اماني */}
          <div className="space-y-4 md:space-y-6">
            
            
<div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
  <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-white flex items-center">
        <FileText className="h-5 w-5 ml-2" />
        اطلاعات حواله اماني
      </h2>
      <div className="flex items-center gap-2 mb-2">
        {/* نمایش وضعیت حواله */}
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          selectedSlipInfo?.status === 'issued' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {selectedSlipInfo?.status === 'issued' ? 'صادر شده' : 'پیش‌نویس'}
        </span>
        
        {/* نمایش حالت ویرایش */}
        {isCreatingFromPermit ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            حالت ايجاد از مجوز
          </span>
        ) : isEditingFromParent ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            حالت ويرايش والد
          </span>
        ) : editingSlipId ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            حالت ويرايش مستقيم
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
           حالت ايجاد از مجوز
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={handlePrintSlip} className="p-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors shadow-sm" title="چاپ">
          <Printer className="h-4 w-4" />
        </button>
        
        {/* دکمه صدور حواله - فقط وقتی وضعیت draft باشد نمایش داده می‌شود */}
        {selectedSlipInfo?.status === 'draft' && (
          <button
            onClick={handleIssueSlip}
            className={`p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-all shadow-sm ${
              isSaving ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={isSaving}
            title="صدور حواله"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
        
        {isEditing ? (
          <button
            onClick={handleSaveSlip}
            className={`p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all shadow-sm ${
              isSaving ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={isSaving}
            title="ذخيره"
          >
            {isSaving ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

  <div className="h-80 md:h-96 overflow-auto">
    <div className="space-y-4 md:space-y-6 p-4">
  
<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
  <h3 className="text-lg font-semibold text-blue-700 mb-4">جدول اطلاعات کالا</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">شماره حواله</label>
      <input
        type="text"
        value={selectedSlipInfo?.transactionNumber || ''}
        disabled={true}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
        placeholder="شماره حواله ذخیره شده"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        طرف حسابی تحویل دهنده کالا
        {selectedSlipInfo?.deliveryCounterpartyName && (
          <span className="ml-1 text-xs text-green-600">(منتقل شده از مجوز)</span>
        )}
      </label>
      <input
        type="text"
        value={selectedSlipInfo?.deliveryCounterpartyName || ''}
        disabled={true}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        شماره مجوز 
        {selectedSlipInfo?.permitNumber && (
          <span className="ml-1 text-xs text-green-600">(منتقل شده از مجوز)</span>
        )}
      </label>
      <input
        type="text"
        value={selectedSlipInfo?.permitNumber || ''}
        disabled={true}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
        placeholder="شماره مجوز"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        شماره قرارداد
        {selectedSlipInfo?.contractNumber && (
          <span className="ml-1 text-xs text-green-600">(منتقل شده از مجوز)</span>
        )}
      </label>
      <input
        type="text"
        value={selectedSlipInfo?.contractNumber || ''}
        disabled={true}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        سایت موجودی کالا
        {selectedSlipInfo?.siteName && (
          <span className="ml-1 text-xs text-green-600">(منتقل شده از مجوز)</span>
        )}
      </label>
      <input
        type="text"
        value={selectedSlipInfo?.siteName || ''}
        disabled={true}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        مخزن موجودی کالا
        {selectedSlipInfo?.tankName && (
          <span className="ml-1 text-xs text-green-600">(منتقل شده از مجوز)</span>
        )}
      </label>
      <input
        type="text"
        value={selectedSlipInfo?.tankName || ''}
        disabled={true}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        مانده مجوز حواله
        {selectedSlipInfo?.remainingPermitAmount !== undefined && (
          <span className="ml-1 text-xs text-green-600">(محاسبه شده)</span>
        )}
      </label>
      <input
        type="number"
        value={selectedSlipInfo?.remainingPermitAmount || 0}
        disabled={true}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        مقدار مجوز
        {selectedSlipInfo?.permitAmount && (
          <span className="ml-1 text-xs text-green-600">(منتقل شده از مجوز)</span>
        )}
      </label>
      <input
        type="number"
        value={selectedSlipInfo?.permitAmount || 0}
        disabled={true}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ حواله</label>
      <input
        type="text"
        value={selectedSlipInfo?.slipDate ? formatPersianDate(selectedSlipInfo.slipDate) : ''}
        disabled={true}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
      />
    </div>
  </div>
</div>
      
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-700 mb-4">جدول صدور حواله امانی</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مقدار حواله <span className="text-red-500">*</span>
              {selectedSlipInfo?.remainingPermitAmount !== undefined && (
                <span className="inline-flex items-center mr-2 align-middle">
                  <Tooltip
                    placement="top"
                    title="راهنمای مقدار حواله"
                    text={
                      (isEditingFromTransactionList
                        ? `حالت ویرایش از مستقیم:\nمی‌توانید مقدار دلخواه وارد کنید. اگر مقدار بیشتر از مانده مجوز باشد، خودکار محدود می‌شود.\nفرمول: (مقدار مجوز - کل حواله‌ها) + همین حواله = ${formatPersianNumber(selectedSlipInfo?.remainingPermitAmount || 0)} ${selectedSlipInfo?.unit || 'کیلوگرم'}`
                        : `محدودیت‌ها:\n• حداقل: 0.1 ${selectedSlipInfo?.unit || 'کیلوگرم'}\n• حداکثر: ${formatPersianNumber(selectedSlipInfo?.remainingPermitAmount || 0)} ${selectedSlipInfo?.unit || 'کیلوگرم'} (مانده مجوز حواله)`)
                    }
                  />
                </span>
              )}
            </label>
            <input
              type="number"
              value={selectedSlipInfo?.amount || 0}
              onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
              disabled={!isEditing}
              max={isEditingFromTransactionList ? undefined : selectedSlipInfo?.remainingPermitAmount} // در حالت ویرایش از مستقیم max تعریف نمی‌شود
              min={0.1}
              step={0.1}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                isEditingFromTransactionList ? 'bg-blue-50 border-blue-300' : 'border-gray-300'
              } ${isFieldRequired('amount', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('amount', selectedSlipInfo?.amount) && isEditing ? 'border-red-500' : ''}`}
              title=""
            />
            {isFieldRequired('amount', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('amount', selectedSlipInfo?.amount) && isEditing && (
              <p className="text-red-500 text-xs mt-1">مقدار حواله الزامی است</p>
            )}
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            {selectedSlipInfo?.editMode && !isEditingFromTransactionList && (
              <p className="text-xs text-blue-600 mt-1">
                {selectedSlipInfo.editMode}
              </p>
            )}
          </div>
         
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    نوع گیرنده <span className="text-red-500">*</span>
  </label>
  <select
    value={selectedSlipInfo?.recipientType || 'no-selection'}
    onChange={(e) => handleChange('recipientType', e.target.value)}
    disabled={!isEditing}
    className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
      isFieldRequired('recipientType', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('recipientType', selectedSlipInfo?.recipientType) && isEditing ? 'border-red-500' : 'border-gray-300'
    }`}
  >
    <option value="no-selection">-- لطفاً نوع گیرنده را انتخاب کنید --</option>
    <option value="internal-site">سایت داخلی</option>
    <option value="contractor-site">سایت پیمانکار</option>
    <option value="counterparty">طرف حساب</option>
    <option value="customer-counterparty">مشتری طرف حساب</option>
  </select>
  {(!selectedSlipInfo?.recipientType || selectedSlipInfo.recipientType === 'no-selection') && isEditing && (
    <p className="text-red-500 text-xs mt-1">
      ⚠️ انتخاب نوع گیرنده الزامی است. لطفاً یکی از گزینه‌ها را انتخاب کنید.
    </p>
  )}
  {selectedSlipInfo?.recipientType && selectedSlipInfo.recipientType !== 'no-selection' && (
    <p className="text-xs text-green-600 mt-1">
      ✅ نوع گیرنده انتخاب شده: {
        selectedSlipInfo.recipientType === 'internal-site' ? 'سایت داخلی' :
        selectedSlipInfo.recipientType === 'contractor-site' ? 'سایت پیمانکار' :
        selectedSlipInfo.recipientType === 'counterparty' ? 'طرف حساب' :
        selectedSlipInfo.recipientType === 'customer-counterparty' ? 'مشتری طرف حساب' : selectedSlipInfo.recipientType
      }
    </p>
  )}
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    تاریخ حواله <span className="text-red-500">*</span>
  </label>
  <PersianDatePicker
    value={selectedSlipInfo?.slipDate || new Date()}
    onChange={(date) => handleChange('slipDate', date)}
    disabled={!isEditing}
    className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
      (!selectedSlipInfo?.slipDate || isNaN(new Date(selectedSlipInfo.slipDate).getTime())) && isEditing ? 'border-red-500 bg-red-50' : 'border-gray-300'
    }`}
  />
  {(!selectedSlipInfo?.slipDate || isNaN(new Date(selectedSlipInfo.slipDate).getTime())) && isEditing && (
    <p className="text-red-500 text-xs mt-1">
      ⚠️ تاریخ حواله الزامی است. لطفاً تاریخ صحیحی را انتخاب کنید.
    </p>
  )}
  {selectedSlipInfo?.slipDate && !isNaN(new Date(selectedSlipInfo.slipDate).getTime()) && (
    <p className="text-xs text-green-600 mt-1">
      ✅ تاریخ حواله انتخاب شده: {formatPersianDate(selectedSlipInfo.slipDate)}
    </p>
  )}
  {errors.slipDate && <p className="text-red-500 text-xs mt-1">{errors.slipDate}</p>}
</div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              طرف حساب تحویل گیرنده کالا 
              {isFieldRequired('counterpartyId', selectedSlipInfo?.recipientType || 'no-selection') && <span className="text-red-500">*</span>}
            </label>
            <select
              value={selectedSlipInfo?.counterpartyId || 'no-selection'}
              onChange={(e) => handleChange('counterpartyId', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                isFieldRequired('counterpartyId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('counterpartyId', selectedSlipInfo?.counterpartyId) && isEditing ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="no-selection">فاقد انتخاب</option>
              {baseData.companies && baseData.companies.length > 0 ? (
                baseData.companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              ) : (
                <option value="" disabled>هیچ شرکت طرف حسابی یافت نشد</option>
              )}
            </select>
            {isFieldRequired('counterpartyId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('counterpartyId', selectedSlipInfo?.counterpartyId) && isEditing && (
              <p className="text-red-500 text-xs mt-1">طرف حساب الزامی است</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مشتری طرف حساب تحویل گیرنده کالا 
              {isFieldRequired('customerCompanyId', selectedSlipInfo?.recipientType || 'no-selection') && <span className="text-red-500">*</span>}
            </label>
            <select
              value={selectedSlipInfo?.customerCompanyId || ''}
              onChange={(e) => handleChange('customerCompanyId', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                isFieldRequired('customerCompanyId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('customerCompanyId', selectedSlipInfo?.customerCompanyId) && isEditing ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.customerCompanies && baseData.customerCompanies.length > 0 ? (
                baseData.customerCompanies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              ) : (
                <option value="" disabled>هيچ مشتري طرف حساب يافت نشد</option>
              )}
            </select>
            {isFieldRequired('customerCompanyId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('customerCompanyId', selectedSlipInfo?.customerCompanyId) && isEditing && (
              <p className="text-red-500 text-xs mt-1">مشتری طرف حساب الزامی است</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سایت داخلی 
              {isFieldRequired('internalSiteId', selectedSlipInfo?.recipientType || 'no-selection') && <span className="text-red-500">*</span>}
            </label>
            <select
              value={selectedSlipInfo?.internalSiteId || ''}
              onChange={(e) => handleChange('internalSiteId', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                isFieldRequired('internalSiteId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('internalSiteId', selectedSlipInfo?.internalSiteId) && isEditing ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.internalSites && baseData.internalSites.length > 0 ? (
                baseData.internalSites.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              ) : (
                <option value="" disabled>هيچ سايت داخلي يافت نشد</option>
              )}
            </select>
            {isFieldRequired('internalSiteId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('internalSiteId', selectedSlipInfo?.internalSiteId) && isEditing && (
              <p className="text-red-500 text-xs mt-1">سایت داخلی الزامی است</p>
            )}
            {errors.internalSiteId && <p className="text-red-500 text-xs mt-1">{errors.internalSiteId}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              لوکیشن 
              {isFieldRequired('locationId', selectedSlipInfo?.recipientType || 'no-selection') && <span className="text-red-500">*</span>}
            </label>
            <select
              value={selectedSlipInfo?.locationId || ''}
              onChange={(e) => handleChange('locationId', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                isFieldRequired('locationId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('locationId', selectedSlipInfo?.locationId) && isEditing ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.locations && baseData.locations.length > 0 ? (
                baseData.locations.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))
              ) : (
                <option value="" disabled>هيچ لوکيشن يافت نشد</option>
              )}
            </select>
            {isFieldRequired('locationId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('locationId', selectedSlipInfo?.locationId) && isEditing && (
              <p className="text-red-500 text-xs mt-1">لوکیشن الزامی است</p>
            )}
            {errors.locationId && <p className="text-red-500 text-xs mt-1">{errors.locationId}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سایت پیمانکار 
              {isFieldRequired('contractorSiteId', selectedSlipInfo?.recipientType || 'no-selection') && <span className="text-red-500">*</span>}
            </label>
            <select
              value={selectedSlipInfo?.contractorSiteId || ''}
              onChange={(e) => handleChange('contractorSiteId', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                isFieldRequired('contractorSiteId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('contractorSiteId', selectedSlipInfo?.contractorSiteId) && isEditing ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.contractorSites && baseData.contractorSites.length > 0 ? (
                baseData.contractorSites.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              ) : (
                <option value="" disabled>هيچ سايت پيمانکاري يافت نشد</option>
              )}
            </select>
            {isFieldRequired('contractorSiteId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('contractorSiteId', selectedSlipInfo?.contractorSiteId) && isEditing && (
              <p className="text-red-500 text-xs mt-1">سایت پیمانکار الزامی است</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              لوکیشن طرف حساب 
              {isFieldRequired('companyLocationId', selectedSlipInfo?.recipientType || 'no-selection') && <span className="text-red-500">*</span>}
            </label>
            <select
              value={selectedSlipInfo?.companyLocationId || ''}
              onChange={(e) => handleChange('companyLocationId', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                isFieldRequired('companyLocationId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('companyLocationId', selectedSlipInfo?.companyLocationId) && isEditing ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.companiesLocation && baseData.companiesLocation.length > 0 ? (
                baseData.companiesLocation.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))
              ) : (
                <option value="" disabled>هيچ لوکيشن طرف حساب يافت نشد</option>
              )}
            </select>
            {isFieldRequired('companyLocationId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('companyLocationId', selectedSlipInfo?.companyLocationId) && isEditing && (
              <p className="text-red-500 text-xs mt-1">لوکیشن طرف حساب الزامی است</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              لوکیشن مشتری طرف حساب 
              {isFieldRequired('customerLocationId', selectedSlipInfo?.recipientType || 'no-selection') && <span className="text-red-500">*</span>}
            </label>
            <select
              value={selectedSlipInfo?.customerLocationId || ''}
              onChange={(e) => handleChange('customerLocationId', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                isFieldRequired('customerLocationId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('customerLocationId', selectedSlipInfo?.customerLocationId) && isEditing ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.customerCompaniesLocation && baseData.customerCompaniesLocation.length > 0 ? (
                baseData.customerCompaniesLocation.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))
              ) : (
                <option value="" disabled>هيچ لوکيشن مشتري يافت نشد</option>
              )}
            </select>
            {isFieldRequired('customerLocationId', selectedSlipInfo?.recipientType || 'no-selection') && isFieldEmpty('customerLocationId', selectedSlipInfo?.customerLocationId) && isEditing && (
              <p className="text-red-500 text-xs mt-1">لوکیشن مشتری طرف حساب الزامی است</p>
            )}
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">توضیحات</label>
            <textarea
              value={selectedSlipInfo?.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
              placeholder="توضیحات اضافی را اینجا وارد کنید..."
              disabled={!isEditing}
            />
          </div>

          {/* اطلاعات تکمیلی حواله انبار */}
          <div className="md:col-span-2 lg:col-span-4 border border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/40">
            <div className="flex items-center justify-between gap-3 mb-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  checked={showDeliveryExtraInfo || enforceDeliveryExtraInfo.consignment}
                  onChange={(e) => setShowDeliveryExtraInfo(e.target.checked)}
                  disabled={enforceDeliveryExtraInfo.consignment}
                />
                <span>ثبت اطلاعات تکمیلی حواله انبار</span>
                {enforceDeliveryExtraInfo.consignment && (
                  <span className="text-xs text-red-600">(اجباری توسط تنظیمات عملکرد)</span>
                )}
              </label>
            </div>

            {(showDeliveryExtraInfo || enforceDeliveryExtraInfo.consignment) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نام راننده</label>
                  <input
                    type="text"
                    value={deliveryExtraInfo.driverFirstName || ''}
                    onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, driverFirstName: e.target.value }))}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.driverFirstName ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی راننده</label>
                  <input
                    type="text"
                    value={deliveryExtraInfo.driverLastName || ''}
                    onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, driverLastName: e.target.value }))}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.billOfLadingNumber ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">شماره پلاک</label>
                  <input
                    type="text"
                    value={deliveryExtraInfo.plateNumber || ''}
                    onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, plateNumber: e.target.value }))}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.plateNumber ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وزن (مبنا)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={deliveryExtraInfo.weight ?? (selectedSlipInfo?.amount || 0)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      const weight = parseFloat(value) || 0;
                      setDeliveryExtraInfo(prev => ({ ...prev, weight }));
                      // همگام‌سازی با مقدار حواله
                      if (selectedSlipInfo) {
                        handleChange('amount', weight);
                      }
                    }}
                    onKeyPress={(e) => {
                      if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.billAmount ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مقصد بارنامه</label>
                  <input
                    type="text"
                    value={deliveryExtraInfo.destination || ''}
                    onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, destination: e.target.value }))}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.destination ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ بارنامه</label>
                  <PersianDatePicker
                    value={deliveryExtraInfo.billDate || selectedSlipInfo?.slipDate}
                    onChange={(date) => {
                      if (date) {
                        setDeliveryExtraInfo(prev => ({ ...prev, billDate: date }));
                      }
                    }}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.transportCompany ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">شماره موبایل راننده</label>
                  <input
                    type="text"
                    value={deliveryExtraInfo.driverMobile || ''}
                    onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, driverMobile: e.target.value }))}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.driverMobile ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">آدرس مقصد</label>
                  <input
                    type="text"
                    value={deliveryExtraInfo.destinationAddress || ''}
                    onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, destinationAddress: e.target.value }))}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.backBillAmount ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">کدپستی مقصد</label>
                  <input
                    type="text"
                    value={deliveryExtraInfo.destinationPostalCode || ''}
                    onChange={(e) => setDeliveryExtraInfo(prev => ({ ...prev, destinationPostalCode: e.target.value }))}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${deliveryExtraInfoErrors.destinationPostalCode ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* راهنمای فیلدهای الزامی */}
          // بخش راهنمای فیلدهای الزامی (بهبود یافته)
<div className="md:col-span-2 lg:col-span-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
  <div className="flex items-start">
    <Info className="h-5 w-5 text-blue-600 mt-0.5 ml-2 flex-shrink-0" />
    <div>
      <h4 className="text-sm font-medium text-blue-800 mb-2">راهنمای فیلدهای الزامی</h4>
      <p className="text-xs text-blue-700 mb-2">
        فیلدهای مشخص شده با <span className="font-bold text-red-500">ستاره قرمز (*)</span> و <span className="font-bold text-red-500">خط قرمز</span> الزامی هستند.
      </p>
      <div className="text-xs text-blue-600 space-y-1">
        <p>• <span className="font-medium">نوع گیرنده:</span> باید یکی از گزینه‌ها به جز "فاقد انتخاب" باشد.</p>
        <p>• <span className="font-medium">تاریخ حواله:</span> باید یک تاریخ معتبر انتخاب شود.</p>
        <p>• <span className="font-medium">مقدار حواله:</span> باید بزرگتر از صفر باشد.</p>
      </div>
      {selectedSlipInfo?.recipientType && selectedSlipInfo.recipientType !== 'no-selection' && (
        <div className="text-xs text-blue-600 mt-2">
          <span className="font-medium">نوع گیرنده فعلی:</span> {
            selectedSlipInfo.recipientType === 'internal-site' ? 'سایت داخلی' :
            selectedSlipInfo.recipientType === 'contractor-site' ? 'سایت پیمانکار' :
            selectedSlipInfo.recipientType === 'counterparty' ? 'طرف حساب' :
            selectedSlipInfo.recipientType === 'customer-counterparty' ? 'مشتری طرف حساب' : selectedSlipInfo.recipientType
          }
        </div>
      )}
      {selectedSlipInfo?.slipDate && !isNaN(new Date(selectedSlipInfo.slipDate).getTime()) && (
        <div className="text-xs text-blue-600 mt-1">
          <span className="font-medium">تاریخ حواله انتخاب شده:</span> {formatPersianDate(selectedSlipInfo.slipDate)}
        </div>
      )}
    </div>
  </div>
</div>
        </div>
      </div>
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
            <div className="h-80 md:h-96 overflow-auto">
              {selectedSlipInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
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
                    <p className="text-gray-900">
                      {(() => {
                        const receipts = (storage.loadData('receipts') || []) as any[];
                        const r = receipts.find((rr: any) => rr.id === selectedSlipInfo.receiptId);
                        const unitText = (r?.unit === 'kg' || selectedSlipInfo.unit === 'kg') ? 'کیلوگرم' : 'تن';
                        return `${formatPersianNumber(r?.amount || 0)} ${unitText}`;
                      })()}
                    </p>
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
            <div className="h-80 md:h-96 overflow-auto">
              {selectedSlipInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
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
            <div className="h-80 md:h-96 overflow-auto">
              {selectedSlipInfo ? (
              <div className="space-y-4 md:space-y-6 p-4">
                  {/* هشدار حالت ویرایش */}
                  {selectedSlipInfo.editMode && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-yellow-600 ml-2" />
                        <div>
                          <h3 className="text-sm font-medium text-yellow-800">حالت ویرایش فعال</h3>
                          <p className="text-sm text-yellow-700 mt-1">
                            {selectedSlipInfo.editMode}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            فرمول محاسبه مانده مجوز حواله بر اساس حالت انتخابی محاسبه می‌شود.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* اطلاعات اصلی حواله */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">شماره حواله</h3>
                      <p className="text-gray-900">{selectedSlipInfo.transactionNumber}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">شماره مجوز</h3>
                      <p className="text-gray-900 font-mono">{selectedSlipInfo.permitNumber || '-'}</p>
                    </div>
                    {(selectedSlipInfo.editMode) && (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h3 className="text-sm font-medium text-yellow-600 mb-1">حالت ویرایش</h3>
                        <p className="text-gray-900 font-semibold">{selectedSlipInfo.editMode}</p>
                      </div>
                    )}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">مقدار حواله</h3>
                      <p className="text-gray-900">{formatPersianNumber(selectedSlipInfo.amount)} {selectedSlipInfo.unit}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">تاريخ حواله</h3>
                      <p className="text-gray-900">{formatPersianDate(selectedSlipInfo.slipDate)}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
  <h3 className="text-sm font-medium text-green-600 mb-1">نوع گیرنده</h3>
  <p className="text-gray-900">
    {selectedSlipInfo.recipientType === 'no-selection' ? 'فاقد انتخاب' :
     selectedSlipInfo.recipientType === 'internal-site' ? 'سایت داخلی' :
     selectedSlipInfo.recipientType === 'contractor-site' ? 'سایت پیمانکار' :
     selectedSlipInfo.recipientType === 'counterparty' ? 'طرف حساب' :
     selectedSlipInfo.recipientType === 'customer-counterparty' ? 'مشتری طرف حساب' :
     'نامشخص'}
  </p>
</div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">توضیحات</h3>
                      <p className="text-gray-900 text-sm">{selectedSlipInfo.description || 'بدون توضیحات'}</p>
                    </div>
                  </div>

                  {/* اطلاعات سایت داخلی */}
                  {selectedInternalSiteInfo && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="text-sm font-medium text-blue-600 mb-3">اطلاعات سایت داخلی</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <h4 className="text-xs font-medium text-blue-500 mb-1">نام سایت</h4>
                          <p className="text-gray-900 text-sm">{selectedInternalSiteInfo.name}</p>
                        </div>
                        {selectedInternalSiteInfo.address && (
                          <div>
                            <h4 className="text-xs font-medium text-blue-500 mb-1">آدرس</h4>
                            <p className="text-gray-900 text-sm">{selectedInternalSiteInfo.address}</p>
                          </div>
                        )}
                        {selectedInternalSiteInfo.phone && (
                          <div>
                            <h4 className="text-xs font-medium text-blue-500 mb-1">تلفن</h4>
                            <p className="text-gray-900 text-sm">{selectedInternalSiteInfo.phone}</p>
                          </div>
                        )}
                        {selectedInternalSiteInfo.postalCode && (
                          <div>
                            <h4 className="text-xs font-medium text-blue-500 mb-1">کد پستی</h4>
                            <p className="text-gray-900 text-sm">{selectedInternalSiteInfo.postalCode}</p>
                          </div>
                        )}
                        {selectedInternalSiteInfo.additionalInfo && (
                          <div className="md:col-span-2">
                            <h4 className="text-xs font-medium text-blue-500 mb-1">توضیحات</h4>
                            <p className="text-gray-900 text-sm">{selectedInternalSiteInfo.additionalInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* اطلاعات سایت پیمانکار */}
                  {selectedContractorSiteInfo && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h3 className="text-sm font-medium text-purple-600 mb-3">اطلاعات سایت پیمانکار</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <h4 className="text-xs font-medium text-purple-500 mb-1">نام سایت</h4>
                          <p className="text-gray-900 text-sm">{selectedContractorSiteInfo.name}</p>
                        </div>
                        {selectedContractorSiteInfo.address && (
                          <div>
                            <h4 className="text-xs font-medium text-purple-500 mb-1">آدرس</h4>
                            <p className="text-gray-900 text-sm">{selectedContractorSiteInfo.address}</p>
                          </div>
                        )}
                        {selectedContractorSiteInfo.phone && (
                          <div>
                            <h4 className="text-xs font-medium text-purple-500 mb-1">تلفن</h4>
                            <p className="text-gray-900 text-sm">{selectedContractorSiteInfo.phone}</p>
                          </div>
                        )}
                        {selectedContractorSiteInfo.postalCode && (
                          <div>
                            <h4 className="text-xs font-medium text-purple-500 mb-1">کد پستی</h4>
                            <p className="text-gray-900 text-sm">{selectedContractorSiteInfo.postalCode}</p>
                          </div>
                        )}
                        {selectedContractorSiteInfo.additionalInfo && (
                          <div className="md:col-span-2">
                            <h4 className="text-xs font-medium text-purple-500 mb-1">توضیحات</h4>
                            <p className="text-gray-900 text-sm">{selectedContractorSiteInfo.additionalInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* اطلاعات لوکیشن */}
                  {selectedLocationInfo && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h3 className="text-sm font-medium text-orange-600 mb-3">اطلاعات لوکیشن</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <h4 className="text-xs font-medium text-orange-500 mb-1">نام لوکیشن</h4>
                          <p className="text-gray-900 text-sm">{selectedLocationInfo.name}</p>
                        </div>
                        {selectedLocationInfo.address && (
                          <div>
                            <h4 className="text-xs font-medium text-orange-500 mb-1">آدرس</h4>
                            <p className="text-gray-900 text-sm">{selectedLocationInfo.address}</p>
                          </div>
                        )}
                        {selectedLocationInfo.phone && (
                          <div>
                            <h4 className="text-xs font-medium text-orange-500 mb-1">تلفن</h4>
                            <p className="text-gray-900 text-sm">{selectedLocationInfo.phone}</p>
                          </div>
                        )}
                        {selectedLocationInfo.postalCode && (
                          <div>
                            <h4 className="text-xs font-medium text-orange-500 mb-1">کد پستی</h4>
                            <p className="text-gray-900 text-sm">{selectedLocationInfo.postalCode}</p>
                          </div>
                        )}
                        {selectedLocationInfo.additionalInfo && (
                          <div className="md:col-span-2">
                            <h4 className="text-xs font-medium text-orange-500 mb-1">توضیحات</h4>
                            <p className="text-gray-900 text-sm">{selectedLocationInfo.additionalInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* اطلاعات شرکت طرف حساب */}
                  {selectedSlipInfo.recipientType === 'counterparty' && selectedCompanyInfo && (
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <h3 className="text-sm font-medium text-indigo-600 mb-3">اطلاعات شرکت طرف حساب</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <h4 className="text-xs font-medium text-indigo-500 mb-1">نام شرکت</h4>
                          <p className="text-gray-900 text-sm">{selectedCompanyInfo.name}</p>
                        </div>
                        {selectedCompanyInfo.address && (
                          <div>
                            <h4 className="text-xs font-medium text-indigo-500 mb-1">آدرس</h4>
                            <p className="text-gray-900 text-sm">{selectedCompanyInfo.address}</p>
                          </div>
                        )}
                        {selectedCompanyInfo.phone && (
                          <div>
                            <h4 className="text-xs font-medium text-indigo-500 mb-1">تلفن</h4>
                            <p className="text-gray-900 text-sm">{selectedCompanyInfo.phone}</p>
                          </div>
                        )}
                        {selectedCompanyInfo.postalCode && (
                          <div>
                            <h4 className="text-xs font-medium text-indigo-500 mb-1">کد پستی</h4>
                            <p className="text-gray-900 text-sm">{selectedCompanyInfo.postalCode}</p>
                          </div>
                        )}
                        {selectedCompanyInfo.additionalInfo && (
                          <div className="md:col-span-2">
                            <h4 className="text-xs font-medium text-indigo-500 mb-1">توضیحات</h4>
                            <p className="text-gray-900 text-sm">{selectedCompanyInfo.additionalInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* اطلاعات لوکیشن طرف حساب */}
                  {selectedSlipInfo.recipientType === 'counterparty' && selectedCompanyLocationInfo && (
                    <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                      <h3 className="text-sm font-medium text-teal-600 mb-3">اطلاعات لوکیشن طرف حساب</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <h4 className="text-xs font-medium text-teal-500 mb-1">نام لوکیشن</h4>
                          <p className="text-gray-900 text-sm">{selectedCompanyLocationInfo.name}</p>
                        </div>
                        {selectedCompanyLocationInfo.address && (
                          <div>
                            <h4 className="text-xs font-medium text-teal-500 mb-1">آدرس</h4>
                            <p className="text-gray-900 text-sm">{selectedCompanyLocationInfo.address}</p>
                          </div>
                        )}
                        {selectedCompanyLocationInfo.phone && (
                          <div>
                            <h4 className="text-xs font-medium text-teal-500 mb-1">تلفن</h4>
                            <p className="text-gray-900 text-sm">{selectedCompanyLocationInfo.phone}</p>
                          </div>
                        )}
                        {selectedCompanyLocationInfo.postalCode && (
                          <div>
                            <h4 className="text-xs font-medium text-teal-500 mb-1">کد پستی</h4>
                            <p className="text-gray-900 text-sm">{selectedCompanyLocationInfo.postalCode}</p>
                          </div>
                        )}
                        {selectedCompanyLocationInfo.additionalInfo && (
                          <div className="md:col-span-2">
                            <h4 className="text-xs font-medium text-teal-500 mb-1">توضیحات</h4>
                            <p className="text-gray-900 text-sm">{selectedCompanyLocationInfo.additionalInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* اطلاعات مشتری طرف حساب */}
                  {selectedSlipInfo.recipientType === 'customer-counterparty' && selectedCustomerCompanyInfo && (
                    <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                      <h3 className="text-sm font-medium text-pink-600 mb-3">اطلاعات مشتری طرف حساب</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <h4 className="text-xs font-medium text-pink-500 mb-1">نام شرکت</h4>
                          <p className="text-gray-900 text-sm">{selectedCustomerCompanyInfo.name}</p>
                        </div>
                        {selectedCustomerCompanyInfo.address && (
                          <div>
                            <h4 className="text-xs font-medium text-pink-500 mb-1">آدرس</h4>
                            <p className="text-gray-900 text-sm">{selectedCustomerCompanyInfo.address}</p>
                          </div>
                        )}
                        {selectedCustomerCompanyInfo.phone && (
                          <div>
                            <h4 className="text-xs font-medium text-pink-500 mb-1">تلفن</h4>
                            <p className="text-gray-900 text-sm">{selectedCustomerCompanyInfo.phone}</p>
                          </div>
                        )}
                        {selectedCustomerCompanyInfo.postalCode && (
                          <div>
                            <h4 className="text-xs font-medium text-pink-500 mb-1">کد پستی</h4>
                            <p className="text-gray-900 text-sm">{selectedCustomerCompanyInfo.postalCode}</p>
                          </div>
                        )}
                        {selectedCustomerCompanyInfo.additionalInfo && (
                          <div className="md:col-span-2">
                            <h4 className="text-xs font-medium text-pink-500 mb-1">توضیحات</h4>
                            <p className="text-gray-900 text-sm">{selectedCustomerCompanyInfo.additionalInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* اطلاعات لوکیشن مشتری طرف حساب */}
                  {selectedSlipInfo.recipientType === 'customer-counterparty' && selectedCustomerLocationInfo && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h3 className="text-sm font-medium text-red-600 mb-3">اطلاعات لوکیشن مشتری طرف حساب</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <h4 className="text-xs font-medium text-red-500 mb-1">نام لوکیشن</h4>
                          <p className="text-gray-900 text-sm">{selectedCustomerLocationInfo.name}</p>
                        </div>
                        {selectedCustomerLocationInfo.address && (
                          <div>
                            <h4 className="text-xs font-medium text-red-500 mb-1">آدرس</h4>
                            <p className="text-gray-900 text-sm">{selectedCustomerLocationInfo.address}</p>
                          </div>
                        )}
                        {selectedCustomerLocationInfo.phone && (
                          <div>
                            <h4 className="text-xs font-medium text-red-500 mb-1">تلفن</h4>
                            <p className="text-gray-900 text-sm">{selectedCustomerLocationInfo.phone}</p>
                          </div>
                        )}
                        {selectedCustomerLocationInfo.postalCode && (
                          <div>
                            <h4 className="text-xs font-medium text-red-500 mb-1">کد پستی</h4>
                            <p className="text-gray-900 text-sm">{selectedCustomerLocationInfo.postalCode}</p>
                          </div>
                        )}
                        {selectedCustomerLocationInfo.additionalInfo && (
                          <div className="md:col-span-2">
                            <h4 className="text-xs font-medium text-red-500 mb-1">توضیحات</h4>
                            <p className="text-gray-900 text-sm">{selectedCustomerLocationInfo.additionalInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* سایر اطلاعات حواله */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">شماره حواله</h3>
                      <p className="text-gray-900 text-sm font-mono">{selectedSlipInfo.transactionNumber || '-'}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">شماره مجوز</h3>
                      <p className="text-gray-900 text-sm font-mono">{selectedSlipInfo.permitNumber || '-'}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">شماره قرارداد</h3>
                      <p className="text-gray-900 text-sm">{selectedSlipInfo.contractNumber || '-'}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">طرف حسابی تحویل دهنده کالا</h3>
                      <p className="text-gray-900 text-sm">{selectedSlipInfo.deliveryCounterpartyName || '-'}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">سایت موجودی کالا</h3>
                      <p className="text-gray-900 text-sm">{selectedSlipInfo.siteName || '-'}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">مخزن موجودی کالا</h3>
                      <p className="text-gray-900 text-sm">{selectedSlipInfo.tankName || '-'}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">مانده مجوز حواله</h3>
                      <p className="text-gray-900 text-sm font-semibold">{formatPersianNumber(selectedSlipInfo.remainingPermitAmount)} {selectedSlipInfo.unit}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">مقدار مجوز</h3>
                      <p className="text-gray-900 text-sm">{formatPersianNumber(selectedSlipInfo.permitAmount)} {selectedSlipInfo.unit}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">نام کالا</h3>
                      <p className="text-gray-900 text-sm">{selectedSlipInfo.productName}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">وضعيت</h3>
                      <p className="text-gray-900 text-sm">{selectedSlipInfo.status}</p>
                    </div>
                    {selectedSlipInfo.driverName && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-600 mb-1">نام راننده</h3>
                        <p className="text-gray-900 text-sm">{selectedSlipInfo.driverName}</p>
                      </div>
                    )}
                    {selectedSlipInfo.driverPlateNumber && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-600 mb-1">پلاک راننده</h3>
                        <p className="text-gray-900 text-sm">{selectedSlipInfo.driverPlateNumber}</p>
                      </div>
                    )}
                    {selectedSlipInfo.driverNationalId && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-600 mb-1">کد ملي راننده</h3>
                        <p className="text-gray-900 text-sm">{selectedSlipInfo.driverNationalId}</p>
                      </div>
                    )}
                    {selectedSlipInfo.shipName && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-600 mb-1">نام کشتي</h3>
                        <p className="text-gray-900 text-sm">{selectedSlipInfo.shipName}</p>
                      </div>
                    )}
                    {selectedSlipInfo.indexNumber && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-600 mb-1">شماره شاخص</h3>
                        <p className="text-gray-900 text-sm">{selectedSlipInfo.indexNumber}</p>
                      </div>
                    )}
                    {selectedSlipInfo.cotageNumber && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-600 mb-1">شماره کوتاژ</h3>
                        <p className="text-gray-900 text-sm">{selectedSlipInfo.cotageNumber}</p>
                      </div>
                    )}
                    {selectedSlipInfo.wastagePercentage && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-600 mb-1">درصد افت</h3>
                        <p className="text-gray-900 text-sm">{selectedSlipInfo.wastagePercentage}%</p>
                      </div>
                    )}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-600 mb-1">مقدار مبناي رسيد</h3>
                      <p className="text-gray-900 text-sm">{formatPersianNumber(selectedSlipInfo.receiptBasisAmount || 0)} {selectedSlipInfo.unit}</p>
                    </div>
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

/**
 * خلاصه منطق ویرایش تراکنش‌های امانی:
 * 
 * 1. ویرایش از مسیر "تراکنش‌های ثبت شده امانی/تملیکی" (حالت ویرایش از مستقیم):
 *    - حالت: "حالت ویرایش از مستقیم"
 *    - فرمول: (مقدار مجوز - کل حواله‌ها) + مقدار حواله فعلی
 *    - مثال: (5000 - (500+300+200+100)) + 100 = 4000
 *    - توضیح: حواله فعلی از محاسبات کل حذف می‌شود و سپس دوباره اضافه می‌شود
 * 
 * 2. ویرایش از مسیر "جدول اطلاعات امانی" (حالت ویرایش والد):
 *    - حالت: "حالت ویرایش والد"
 *    - فرمول: مقدار مجوز - کل حواله‌ها (شامل حواله فعلی)
 *    - مثال: 5000 - (500+300+200+100) = 3900
 *    - توضیح: حواله فعلی در محاسبات باقی می‌ماند
 * 
 * 3. ویرایش از مسیر "ایجاد حواله جدید" (حالت ایجاد):
 *    - فرمول: مقدار مجوز - کل حواله‌های صادر شده
 *    - توضیح: حالت پیش‌فرض برای ایجاد حواله جدید
 * 
 * کنترل مقدار حواله:
 * - در هر دو حالت ویرایش، مقدار حواله نباید بیشتر از "مانده مجوز حواله" باشد
 * - اگر مقدار وارد شده بیشتر باشد، به صورت خودکار به "مانده مجوز حواله" محدود می‌شود
 */

export default ConsignmentDeliverySlip;