// src/components/Warehouse/SimpleOwnershipDeliverySlip.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ArrowLeft, Save, Edit2, X, Printer, Calendar, Trash2, Plus, AlertCircle, CheckCircle, Info, FileText, Package, Users, Download } from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../Common/PersianDatePicker';

// تعریف تایپ‌ها برای اطلاعات حواله تملیکی ساده
interface SimpleOwnershipSlipInfo {
  id?: string;
  slipNumber?: string;
  date?: string;
  receiptId: string;
  receiptNumber: string;
  tankId: string;
  tankName: string;
  productId?: string;
  productName: string;
  internalSiteId: string;
  contractorSiteId: string;
  locationId: string;
  recipientType: 'company' | 'customer';
  companyLocationId?: string;
  customerLocationId?: string;
  amount: number;
  remainingTankInventory: number;
  description?: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
  // این فیلدها از رسید خوانده می‌شوند و فقط نمایش داده می‌شوند
  counterpartyName: string;
  siteName: string;
  unit: string;
  wastageAmount: number;
  receiptBasisAmount: number;
  wastagePercentage: number;
  notes: string;
  // فیلدهای مربوط به سایت و مخزن
  siteId?: string;
  slipDate?: Date;
  // فیلدهای اضافی از رسید
  driverName?: string;
  driverNationalId?: string;
  driverPlateNumber?: string;
  shipName?: string;
  indexNumber?: string;
  cotageNumber?: string;
  customerCounterpartyName?: string;
  counterpartyLocationName?: string;
  customerCounterpartyLocationName?: string;
  receiptDate?: Date;
}

interface Props {
  onBack: () => void;
  baseData: any;
  initialData?: any;
  onSave?: (data: any) => void;
}

const SimpleOwnershipDeliverySlip: React.FC<Props> = ({ onBack, baseData, initialData, onSave }) => {
  const [availableReceipts, setAvailableReceipts] = useState<SimpleOwnershipSlipInfo[]>([]);
  const [selectedSlipInfo, setSelectedSlipInfo] = useState<SimpleOwnershipSlipInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const storage = DataStorage.getInstance();

  // تابع محاسبه موجودی مخزن - با فرمول جدید طبق درخواست کاربر
  // فرمول: (جمع تمامی رسید های امانی و تملیکی + جمع رسیدهای افت امانی و تملیکی + جمع تمامی رسید های اضافه انبار) - 
  //        (جمع تمامی حواله های امانی و تملیکی + جمع حواله های افت امانی و تملیکی + جمع تمامی سند های کسر انبار)
  const calculateTankInventory = useCallback((siteId: string, tankId: string, currentSlipId?: string, isEditing: boolean = false) => {
    try {
      const receipts = storage.loadData('receipts') || [];
      const consignmentSlips = storage.loadData('consignment-delivery-slips') || [];
      const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
      const tankAdjustmentSlips = storage.loadData('tank-adjustment-slips') || [];
      const inventoryAdjustments = storage.loadData('inventoryAdjustments') || [];

      // 1. جمع تمامی رسید های امانی و تملیکی
      const totalReceipts = receipts
        .filter((r: any) => r.siteId === siteId && r.tankId === tankId && !r.isVoided && r.status === 'approved')
        .reduce((sum, r) => sum + (r.finalAmount || r.amount || 0), 0);

      // 2. جمع رسیدهای افت امانی و تملیکی
      const allReceipts = receipts.filter((r: any) => r.siteId === siteId && r.tankId === tankId && !r.isVoided && r.status === 'approved');
      const totalWastageLosses = allReceipts.reduce((sum, r) => sum + Math.abs(r.wastageWeight || 0), 0);

      // 3. جمع تمامی رسید های اضافه انبار (سندهای اضافه انبار)
      const totalTankAdditions = tankAdjustmentSlips
        .filter((t: any) => t.siteId === siteId && t.tankId === tankId && t.type === 'add' && !t.isVoided && t.status === 'approved')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const totalInventoryAdditions = inventoryAdjustments
        .filter((doc: any) => doc.siteId === siteId && doc.tankId === tankId && doc.adjustmentType === 'addition' && !doc.isVoided && doc.status === 'approved')
        .reduce((sum, doc: any) => sum + (doc.quantity || 0), 0);

      // 4. جمع تمامی حواله های امانی و تملیکی
      const totalConsignmentDeliveries = consignmentSlips
        .filter((s: any) => s.siteId === siteId && s.tankId === tankId && !s.isVoided && s.status === 'approved' && (!isEditing || s.id !== currentSlipId))
        .reduce((sum, s) => sum + (s.amount || 0), 0);

      const totalOwnershipDeliveries = ownershipSlips
        .filter((s: any) => s.siteId === siteId && s.tankId === tankId && !s.isVoided && s.status === 'approved' && (!isEditing || s.id !== currentSlipId))
        .reduce((sum, s) => sum + (s.amount || 0), 0);

      // 5. جمع حواله های افت امانی و تملیکی (افت در حواله‌ها)
      // توجه: افت در حواله‌ها معمولاً در رسیدها محاسبه می‌شود، اما اگر در حواله‌ها هم باشد:
      const consignmentWastage = consignmentSlips
        .filter((s: any) => s.siteId === siteId && s.tankId === tankId && !s.isVoided && s.status === 'approved')
        .reduce((sum, s) => sum + Math.abs(s.wastageAmount || 0), 0);
      
      const ownershipWastage = ownershipSlips
        .filter((s: any) => s.siteId === siteId && s.tankId === tankId && !s.isVoided && s.status === 'approved' && (!isEditing || s.id !== currentSlipId))
        .reduce((sum, s) => sum + Math.abs(s.wastageAmount || 0), 0);

      // 6. جمع تمامی سند های کسر انبار
      const totalTankDeductions = tankAdjustmentSlips
        .filter((t: any) => t.siteId === siteId && t.tankId === tankId && t.type === 'deduct' && !t.isVoided && t.status === 'approved')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const totalInventoryDeductions = inventoryAdjustments
        .filter((doc: any) => doc.siteId === siteId && doc.tankId === tankId && doc.adjustmentType === 'deduction' && !doc.isVoided && doc.status === 'approved')
        .reduce((sum, doc: any) => sum + (doc.quantity || 0), 0);

      // فرمول کلی: مجموع ورودی - مجموع خروجی
      const totalInputs = totalReceipts + totalWastageLosses + totalTankAdditions + totalInventoryAdditions;
      const totalOutputs = totalConsignmentDeliveries + totalOwnershipDeliveries + consignmentWastage + ownershipWastage + totalTankDeductions + totalInventoryDeductions;
      
      return Math.max(0, totalInputs - totalOutputs);
    } catch (error) {
      console.error('Error calculating tank inventory:', error);
      return 0;
    }
  }, [storage]);

  // بارگذاری رسیدهای تملیکی قابل استفاده
  useEffect(() => {
    const receipts = storage.loadData('receipts') || [];
    const ownershipReceipts = receipts.filter((r: any) => r.userType === 'owned' && r.status === 'approved' && !r.isVoided);

    const validReceipts = ownershipReceipts.map((receipt: any) => {
      // محاسبه مانده موجودی مخزن برای این رسید
      const remainingInventory = calculateTankInventory(receipt.siteId, receipt.tankId);
      
      return {
        id: receipt.id,
        receiptId: receipt.id,
        amount: 0, // مقدار اولیه 0، کاربر باید وارد کند
        slipDate: new Date(),
        internalSiteId: '',
        contractorSiteId: '',
        locationId: '',
        recipientType: 'company' as const,
        companyLocationId: '',
        customerLocationId: '',
        counterpartyName: receipt.companyName || receipt.counterpartyName || 'تملیکی',
        receiptNumber: receipt.transactionNumber,
        productName: receipt.productName,
        siteName: receipt.siteName,
        tankName: receipt.tankName,
        unit: receipt.unit,
        wastageAmount: receipt.wastageWeight || 0,
        receiptBasisAmount: receipt.receiptBasisAmount || 0,
        wastagePercentage: receipt.wastagePercentage || 0,
        status: 'draft',
        notes: '',
        siteId: receipt.siteId,
        tankId: receipt.tankId,
        remainingTankInventory: remainingInventory,
        // فیلدهای اضافی از رسید
        driverName: receipt.driverName || '',
        driverNationalId: receipt.driverNationalId || '',
        driverPlateNumber: receipt.driverPlateNumber || '',
        shipName: receipt.shipName || '',
        indexNumber: receipt.indexNumber || '',
        cotageNumber: receipt.cotageNumber || '',
        customerCounterpartyName: receipt.customerCounterpartyName || '',
        counterpartyLocationName: receipt.counterpartyLocationName || '',
        customerCounterpartyLocationName: receipt.customerCounterpartyLocationName || '',
        receiptDate: receipt.receiptDate || receipt.createdAt || new Date()
      };
    });

    setAvailableReceipts(validReceipts);
  }, [storage, calculateTankInventory]);

  // بارگذاری حواله‌های ذخیره شده
  useEffect(() => {
    const slips = storage.loadData('ownership-delivery-slips') || [];
    if (slips.length > 0) {
      const slipsWithInventory = slips.map((slip: any) => ({
        ...slip,
        remainingTankInventory: calculateTankInventory(slip.siteId, slip.tankId, slip.id, true)
      }));
      setAvailableReceipts(prev => [...prev, ...slipsWithInventory]);
    }
  }, [storage, calculateTankInventory]);

  // اگر داده اولیه وجود دارد، آن را به عنوان حواله انتخاب شده تنظیم کن
  useEffect(() => {
    if (initialData) {
      handleSelectReceipt(initialData);
    }
  }, [initialData]);

  // فیلتر کردن رسیدها بر اساس جستجو
  const filteredReceipts = useMemo(() => {
    return availableReceipts.filter(receipt =>
      receipt.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.counterpartyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.productName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableReceipts, searchTerm]);

  // انتخاب یک ردیف از جدول
  const handleSelectReceipt = (receipt: any) => {
    setSelectedSlipInfo(receipt);
    setIsEditing(false);
  };

  // ویرایش حواله
  const handleEditSlip = (receipt: any) => {
    handleSelectReceipt(receipt);
    setIsEditing(true);
    setEditingSlipId(receipt.id);
  };

  // افزودن حواله جدید
  const handleAddNewSlip = () => {
    const emptySlip: SimpleOwnershipSlipInfo = {
      id: `ownership_slip_${Date.now()}`,
      receiptId: '',
      amount: 0,
      slipDate: new Date(),
      internalSiteId: '',
      contractorSiteId: '',
      locationId: '',
      recipientType: 'company',
      companyLocationId: '',
      customerLocationId: '',
      counterpartyName: '',
      receiptNumber: '',
      productName: '',
      siteName: '',
      tankName: '',
      unit: 'kg',
      wastageAmount: 0,
      receiptBasisAmount: 0,
      wastagePercentage: 0,
      status: 'draft',
      notes: '',
      siteId: '',
      tankId: '',
      remainingTankInventory: 0
    };
    
    setSelectedSlipInfo(emptySlip);
    setIsEditing(true);
    setIsAddingNew(true);
    setEditingSlipId(null);
  };

  // تابع اصلی ذخیره با تمام اعتبارسنجی‌ها
  const handleSaveSlip = async () => {
    if (isSaving) return;
    if (!selectedSlipInfo) return;

    // اعتبارسنجی اولیه
    const newErrors: Record<string, string> = {};
    if (!selectedSlipInfo.internalSiteId) newErrors.internalSiteId = 'انتخاب سایت تحویل الزامی است';
    if (!selectedSlipInfo.contractorSiteId) newErrors.contractorSiteId = 'انتخاب سایت پیمانکار الزامی است';
    if (!selectedSlipInfo.locationId) newErrors.locationId = 'انتخاب مکان الزامی است';
    if (!selectedSlipInfo.receiptId) newErrors.receiptId = 'انتخاب رسید الزامی است';
    
    // اعتبارسنجی طرف حساب
    if (selectedSlipInfo.recipientType === 'company' && !selectedSlipInfo.companyLocationId) {
      newErrors.companyLocationId = 'انتخاب طرف حساب الزامی است';
    }
    if (selectedSlipInfo.recipientType === 'customer' && !selectedSlipInfo.customerLocationId) {
      newErrors.customerLocationId = 'انتخاب طرف حساب الزامی است';
    }
    
    const amount = parseFloat(selectedSlipInfo.amount?.toString() || '0');
    if (amount <= 0) {
      newErrors.amount = 'مقدار حواله باید بزرگتر از صفر باشد';
    }

    // بررسی اینکه مقدار حواله از مانده موجودی مخزن بیشتر نباشد
    if (selectedSlipInfo.siteId && selectedSlipInfo.tankId) {
      const currentSlipId = editingSlipId || null;
      const isEditingMode = !!currentSlipId;
      
      const remainingInventory = calculateTankInventory(
        selectedSlipInfo.siteId,
        selectedSlipInfo.tankId,
        currentSlipId || undefined,
        isEditingMode
      );
      
      if (amount > remainingInventory) {
        newErrors.amount = `مقدار حواله نمی‌تواند از مانده موجودی مخزن در سایت (${formatPersianNumber(remainingInventory)} ${selectedSlipInfo.unit}) بیشتر باشد`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const actualAmount = parseFloat(selectedSlipInfo.amount?.toString() || '0');
    
    setIsSaving(true);
    
    try {
      let updatedSlipInfo = { 
        ...selectedSlipInfo,
        amount: actualAmount,
        status: 'approved'
      };

      // دریافت لیست فعلی اسلیپ‌ها
      const slips = storage.loadData('ownership-delivery-slips') || [];
      let updatedSlips = [...slips];

      const slipIdToEdit = editingSlipId;

      if (slipIdToEdit) {
        // ویرایش حواله موجود
        const index = updatedSlips.findIndex((s: any) => s.id === slipIdToEdit);
        if (index !== -1) {
          updatedSlips[index] = { 
            ...updatedSlipInfo, 
            updatedAt: new Date() 
          };
        }
      } else {
        // افزودن حواله جدید
        updatedSlips.push({ ...updatedSlipInfo, createdAt: new Date() });
      }

      storage.setData('ownership-delivery-slips', updatedSlips);

      // موفقیت ذخیره
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      if (onSave) {
        onSave(updatedSlipInfo);
      }
      
    } catch (err) {
      console.error('Save slip error:', err);
      setErrors({ submit: 'خطا در ذخیره‌سازی حواله. لطفاً دوباره تلاش کنید.' });
    } finally {
      setIsSaving(false);
      setIsEditing(false);
      setEditingSlipId(null);
      setErrors({});
      setIsAddingNew(false);
    }
  };

  // بازگشت به حالت اولیه
  const handleBackToList = () => {
    setSelectedSlipInfo(null);
    setIsEditing(false);
    setEditingSlipId(null);
    setIsAddingNew(false);
    setErrors({});
  };

  // چاپ حواله تملیکی
  const handlePrintSlip = useCallback(() => {
    if (!selectedSlipInfo) return;

    const logoUrl = "https://z-cdn-media.chatglm.cn/files/7094d229-4d09-430e-98c1-73f61a7991d6_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4.jpg?auth_key=1788869487-700454f4145444fcabf14d4109c175fd-0-531d677f789c51954e01f268eaedd559";
    
    const printContent = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<title>حواله انبار تملیکی - ${selectedSlipInfo.receiptNumber}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@page { margin: 8mm; size: A4; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
font-family: 'Tahoma', 'B Nazanin', sans-serif;
direction: rtl;
line-height: 1.6;
margin: 0;
padding: 5px;
background: #f8f9fa;
color: #1a1a1a;
font-size: 14px;
}
.document {
width: 100%;
max-width: 190mm;
margin: 0 auto;
background: #ffffff;
position: relative;
border: 3px solid #2563eb;
border-radius: 12px;
padding: 20px;
box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}
.document::before {
content: '';
position: absolute;
top: 2px;
left: 2px;
right: 2px;
bottom: 2px;
border: 1px solid #60a5fa;
border-radius: 9px;
pointer-events: none;
}
.header {
display: flex;
justify-content: space-between;
align-items: flex-start;
padding: 0 0 15px 0;
border-bottom: 2px solid #3b82f6;
margin-bottom: 20px;
}
.company-section {
flex: 1;
display: flex;
align-items: flex-start;
gap: 15px;
}
.company-logo {
width: 70px;
height: 70px;
object-fit: contain;
border-radius: 8px;
border: 1px solid #e5e7eb;
background: white;
padding: 5px;
}
.company-info {
flex: 1;
}
.company-name {
font-size: 22px;
font-weight: 700;
color: #1e40af;
margin-bottom: 6px;
letter-spacing: -0.5px;
}
.document-title-section {
text-align: center;
flex: 1;
}
.document-type {
font-size: 10px;
color: #64748b;
text-transform: uppercase;
letter-spacing: 2px;
margin-bottom: 4px;
}
.document-title {
font-size: 24px;
font-weight: 700;
color: #1e293b;
margin-bottom: 6px;
}
.document-number {
font-size: 15px;
font-weight: 600;
color: #1e40af;
background: #eff6ff;
padding: 6px 14px;
border-radius: 6px;
display: inline-block;
border: 1px solid #bfdbfe;
}
.details-table {
width: 100%;
border-collapse: collapse;
border: 1px solid #e2e8f0;
border-radius: 8px;
overflow: hidden;
font-size: 11px;
margin: 20px 0;
}
.details-table thead { background: #f1f5f9; }
.details-table th {
padding: 10px 12px;
text-align: right;
font-weight: 600;
color: #475569;
border-bottom: 1px solid #e2e8f0;
font-size: 11px;
text-transform: uppercase;
letter-spacing: 0.5px;
}
.details-table td {
padding: 10px 12px;
text-align: right;
border-bottom: 1px solid #f1f5f9;
color: #1e293b;
font-weight: 500;
}
.section-title { 
font-size: 14px; 
font-weight: bold; 
color: #2563eb; 
margin-top: 20px; 
margin-bottom: 10px;
padding-bottom: 6px;
border-bottom: 2px solid #e2e8f0;
}
.signature-section {
display: flex;
justify-content: space-between;
margin-top: 30px;
padding-top: 15px;
border-top: 2px solid #3b82f6;
}
.signature-box {
text-align: center;
padding: 15px 8px;
border: 1px solid #e2e8f0;
border-radius: 6px;
background: #fafbfc;
flex: 1;
margin: 0 8px;
}
.signature-title {
font-size: 11px;
font-weight: 600;
color: #475569;
margin-bottom: 15px;
}
.signature-line {
border-top: 1px solid #94a3b8;
height: 1px;
width: 80%;
margin: 30px auto 5px;
}
.watermark {
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%) rotate(-45deg);
font-size: 120px;
color: rgba(37, 99, 235, 0.04);
font-weight: 900;
z-index: 0;
pointer-events: none;
letter-spacing: 15px;
}
@media print {
body { font-size: 13px; padding: 0; }
.document { box-shadow: none; border: 2px solid #2563eb; }
.print-button { display: none; }
}
.print-button {
position: fixed;
top: 20px;
right: 20px;
background: #3b82f6;
color: white;
border: none;
padding: 10px 15px;
border-radius: 5px;
cursor: pointer;
font-weight: 600;
display: flex;
align-items: center;
gap: 5px;
box-shadow: 0 2px 5px rgba(0,0,0,0.2);
z-index: 1000;
}
.print-button:hover { background: #2563eb; }
</style>
</head>
<body>
<button class="print-button" onclick="window.print()">🖨️ چاپ سند</button>
<div class="document">
<div class="watermark">کورش</div>
<div class="header">
<div class="company-section">
<img src="${logoUrl}" alt="لوگو شرکت صنعت غذایی کورش" class="company-logo" onerror="this.src='/لوگو صنعت غذایی کورش.jpg'; this.onerror=function(){this.style.display='none';};" />
<div class="company-info">
<div class="company-name">شرکت صنعت غذایی کورش</div>
<div style="font-size: 11px; color: #64748b; line-height: 1.3;">
تهران، خیابان نیل، شماره 241<br>
تلفن: 021 83893000<br>
www.kouroshfood.com
</div>
</div>
</div>
<div class="document-title-section">
<div class="document-type">حواله انبار</div>
<div class="document-title">حواله انبار تملیکی</div>
<div class="document-number">شماره: ${selectedSlipInfo.receiptNumber || '-'}</div>
</div>
<div style="flex: 1; text-align: left; font-size: 11px;">
<div style="margin-bottom: 6px;"><span style="color: #64748b; font-weight: 500;">تاریخ:</span> <span style="color: #1e293b; font-weight: 600;">${formatPersianDate(new Date())}</span></div>
</div>
</div>

<div class="section-title">اطلاعات حواله</div>
<table class="details-table">
<tr><td width="30%">نام شرکت</td><td>${selectedSlipInfo.counterpartyName}</td></tr>
<tr><td>مقدار حواله</td><td>${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</td></tr>
<tr><td>تاریخ حواله</td><td>${formatPersianDate(selectedSlipInfo.slipDate || new Date())}</td></tr>
<tr><td>لوکیشن</td><td>${baseData.locations?.find((l: any) => l.id === selectedSlipInfo.locationId)?.name || ''}</td></tr>
<tr><td>سایت داخلی</td><td>${baseData.internalSites?.find((s: any) => s.id === selectedSlipInfo.internalSiteId)?.name || ''}</td></tr>
<tr><td>سایت پیمانکار</td><td>${baseData.contractorSites?.find((s: any) => s.id === selectedSlipInfo.contractorSiteId)?.name || ''}</td></tr>
<tr><td>موجودی مخزن نسبت به سایت</td><td>${formatPersianNumber(selectedSlipInfo.remainingTankInventory)} ${selectedSlipInfo.unit}</td></tr>
</table>

<div class="section-title">اطلاعات رسید انبار</div>
<table class="details-table">
<tr><td width="30%">طرف حساب</td><td>${selectedSlipInfo.counterpartyName}</td></tr>
<tr><td>مقدار مبنای رسید</td><td>${formatPersianNumber(selectedSlipInfo.receiptBasisAmount || 0)} ${selectedSlipInfo.unit}</td></tr>
<tr><td>درصد افت</td><td>${selectedSlipInfo.wastagePercentage ? `${selectedSlipInfo.wastagePercentage}%` : '-'}</td></tr>
<tr><td>وزن افت</td><td>${formatPersianNumber(selectedSlipInfo.wastageAmount)} ${selectedSlipInfo.unit}</td></tr>
<tr><td>مقدار رسید</td><td>${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</td></tr>
<tr><td>نام کالا</td><td>${selectedSlipInfo.productName}</td></tr>
<tr><td>سایت مخازن</td><td>${selectedSlipInfo.siteName}</td></tr>
<tr><td>مخزن</td><td>${selectedSlipInfo.tankName}</td></tr>
<tr><td>واحد سنجش</td><td>${selectedSlipInfo.unit}</td></tr>
<tr><td>شماره رسید انبار</td><td>${selectedSlipInfo.receiptNumber}</td></tr>
</table>

<div class="signature-section">
<div class="signature-box">
<div>تحویل گیرنده</div>
<div class="signature-line"></div>
<div>امضا و نام</div>
</div>
<div class="signature-box">
<div>تحویل دهنده</div>
<div class="signature-line"></div>
<div>امضا و نام</div>
</div>
<div class="signature-box">
<div>مدیر انبار</div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4" dir="rtl">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 mb-6 overflow-hidden">
          <div className="p-6 border-b-2 border-green-200 bg-gradient-to-r from-green-600 to-blue-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors shadow-sm"
                  title="بازگشت"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <FileText className="h-7 w-7 ml-3" />
                  حواله انبار تملیکی
                </h1>
              </div>
              <div className="flex gap-2">
                {/* حذف دکمه جدول حواله تملکی */}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="جستجو بر اساس شماره رسید، طرف حساب، محصول..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              {saveSuccess && (
                <div className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg border border-green-300">
                  <CheckCircle className="h-4 w-4 ml-2" />
                  حواله با موفقیت ذخیره شد
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ستون چپ - جدول اطلاعات تملیکی */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-green-600 to-blue-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <Users className="h-5 w-5 ml-2" />
                    اطلاعات تملیکی
                  </h2>
                  <div className="text-sm text-green-100">
                    تعداد رسیدهای قابل استفاده: {filteredReceipts.length}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره رسید</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طرف حساب</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصول</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار رسید</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مانده مخزن</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار حواله</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReceipts.map((receipt) => (
                      <tr 
                        key={receipt.id} 
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedSlipInfo?.id === receipt.id ? 'bg-green-50 border-green-200' : ''
                        }`}
                        onClick={() => handleSelectReceipt(receipt)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {receipt.receiptNumber}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {receipt.counterpartyName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {receipt.productName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianNumber(receipt.receiptBasisAmount)} {receipt.unit}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianNumber(receipt.remainingTankInventory)} {receipt.unit}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPersianNumber(receipt.amount)} {receipt.unit}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSlip(receipt);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100 transition-colors"
                              title="ویرایش"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ستون راست - فرم اطلاعات حواله تملیکی */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-green-600 to-green-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <FileText className="h-5 w-5 ml-2" />
                    اطلاعات حواله تملیکی
                  </h2>
                  <div className="flex gap-2">
                    {selectedSlipInfo && (
                      <button
                        onClick={handlePrintSlip}
                        className="p-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors shadow-sm"
                        title="چاپ حواله"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    )}
                    {isEditing ? (
                      <button
                        onClick={handleSaveSlip}
                        className={`p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-all shadow-sm ${
                          isSaving ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                        disabled={isSaving}
                        title="ذخیره"
                      >
                        {isSaving ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            در حال ذخیره...
                          </div>
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <button onClick={() => setIsEditing(true)} className="p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors shadow-sm" title="ویرایش">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-96 overflow-y-auto">
                <div className="space-y-6">
                  {selectedSlipInfo ? (
                    <React.Fragment>
                      {/* جدول اطلاعات کالا */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-700 mb-4">جدول اطلاعات کالا</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">شماره حواله</label>
                            <input
                              type="text"
                              value={selectedSlipInfo.id || selectedSlipInfo.receiptNumber || ''}
                              disabled={true}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                              placeholder="شماره حواله ذخیره شده"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">سایت موجودی کالا</label>
                            <input
                              type="text"
                              value={selectedSlipInfo?.siteName || ''}
                              disabled={true}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">مخزن موجودی کالا</label>
                            <input
                              type="text"
                              value={selectedSlipInfo?.tankName || ''}
                              disabled={true}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">موجودی مخزن نسبت به سایت</label>
                            <input
                              type="text"
                              value={`${formatPersianNumber(selectedSlipInfo.remainingTankInventory)} ${selectedSlipInfo.unit}`}
                              disabled={true}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-amber-50 font-bold text-amber-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ حواله</label>
                            <input
                              type="text"
                              value={selectedSlipInfo.slipDate ? formatPersianDate(selectedSlipInfo.slipDate) : ''}
                              disabled={true}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* جدول صدور حواله تملیکی */}
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-lg font-semibold text-green-700 mb-4">جدول صدور حواله تملیکی</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              مقدار حواله 
                              {selectedSlipInfo?.remainingTankInventory !== undefined && (
                                <span className="text-xs text-gray-500 mr-2">
                                  (حداکثر: {formatPersianNumber(selectedSlipInfo.remainingTankInventory)} {selectedSlipInfo.unit})
                                </span>
                              )}
                            </label>
                            <input
                              type="number"
                              value={selectedSlipInfo.amount || 0}
                              onChange={(e) => {
                                const raw = parseFloat(e.target.value);
                                const val = isNaN(raw) ? 0 : raw;
                                const max = selectedSlipInfo.remainingTankInventory || 0;
                                const clamped = val > max ? max : val;
                                setSelectedSlipInfo({
                                  ...selectedSlipInfo,
                                  amount: clamped
                                });
                              }}
                              disabled={!isEditing}
                              max={selectedSlipInfo.remainingTankInventory}
                              min={0.1}
                              step={0.1}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                errors.amount ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">نوع گیرنده</label>
                            <select
                              value={selectedSlipInfo?.recipientType || 'company'}
                              onChange={(e) => setSelectedSlipInfo({...selectedSlipInfo, recipientType: e.target.value as 'company' | 'customer'})}
                              disabled={!isEditing}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                              <option value="company">شرکت</option>
                              <option value="customer">مشتری</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ حواله</label>
                            <PersianDatePicker
                              selectedDate={selectedSlipInfo?.slipDate || new Date()}
                              onDateChange={(date) => setSelectedSlipInfo({...selectedSlipInfo, slipDate: date})}
                              disabled={!isEditing}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">طرف حساب تحویل گیرنده کالا</label>
                            <select
                              value={selectedSlipInfo?.recipientType === 'company' ? selectedSlipInfo?.companyLocationId || '' : selectedSlipInfo?.customerLocationId || ''}
                              onChange={(e) => {
                                if (selectedSlipInfo.recipientType === 'company') {
                                  setSelectedSlipInfo({...selectedSlipInfo, companyLocationId: e.target.value});
                                } else {
                                  setSelectedSlipInfo({...selectedSlipInfo, customerLocationId: e.target.value});
                                }
                              }}
                              disabled={!isEditing}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                errors.companyLocationId || errors.customerLocationId ? 'border-red-500' : 'border-gray-300'
                              }`}
                            >
                              <option value="">انتخاب کنيد</option>
                              {selectedSlipInfo?.recipientType === 'company' 
                                ? baseData?.companiesLocation?.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))
                                : baseData?.customerCompaniesLocation?.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))
                              }
                            </select>
                            {(errors.companyLocationId || errors.customerLocationId) && 
                              <p className="text-red-500 text-xs mt-1">{errors.companyLocationId || errors.customerLocationId}</p>
                            }
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">سایت داخلی</label>
                            <select
                              value={selectedSlipInfo?.internalSiteId || ''}
                              onChange={(e) => setSelectedSlipInfo({...selectedSlipInfo, internalSiteId: e.target.value})}
                              disabled={!isEditing}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                errors.internalSiteId ? 'border-red-500' : 'border-gray-300'
                              }`}
                            >
                              <option value="">انتخاب کنيد</option>
                              {baseData?.internalSites?.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            {errors.internalSiteId && <p className="text-red-500 text-xs mt-1">{errors.internalSiteId}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">لوکیشن</label>
                            <select
                              value={selectedSlipInfo?.locationId || ''}
                              onChange={(e) => setSelectedSlipInfo({...selectedSlipInfo, locationId: e.target.value})}
                              disabled={!isEditing}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                errors.locationId ? 'border-red-500' : 'border-gray-300'
                              }`}
                            >
                              <option value="">انتخاب کنيد</option>
                              {baseData?.locations?.map((l: any) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                            </select>
                            {errors.locationId && <p className="text-red-500 text-xs mt-1">{errors.locationId}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">سایت پیمانکار</label>
                            <select
                              value={selectedSlipInfo?.contractorSiteId || ''}
                              onChange={(e) => setSelectedSlipInfo({...selectedSlipInfo, contractorSiteId: e.target.value})}
                              disabled={!isEditing}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                errors.contractorSiteId ? 'border-red-500' : 'border-gray-300'
                              }`}
                            >
                              <option value="">انتخاب کنيد</option>
                              {baseData?.contractorSites?.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            {errors.contractorSiteId && <p className="text-red-500 text-xs mt-1">{errors.contractorSiteId}</p>}
                          </div>
                          <div className="md:col-span-2 lg:col-span-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">توضیحات</label>
                            <textarea
                              value={selectedSlipInfo?.notes || ''}
                              onChange={(e) => setSelectedSlipInfo({...selectedSlipInfo, notes: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              rows={3}
                              placeholder="توضیحات اضافی را اینجا وارد کنید..."
                              disabled={!isEditing}
                            />
                          </div>
                        </div>
                      </div>

                    {errors.submit && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-600 text-sm">{errors.submit}</p>
                      </div>
                    )}

                    {/* دکمه‌های عملیات */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleBackToList}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        بازگشت به لیست
                      </button>
                      {isEditing && (
                        <button
                          onClick={handleSaveSlip}
                          disabled={isSaving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSaving ? (
                            <>
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              در حال ذخیره...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              ذخیره حواله
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </React.Fragment>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">لطفاً یک رسید تملیکی را از لیست انتخاب کنید</p>
                      <p className="text-sm mt-2">یا برای ایجاد حواله جدید روی دکمه "حواله جدید" کلیک کنید</p>
                    </div>
                  )}
                </div>
              </div>

              {/* جدول اطلاعات رسید انبار */}
              {selectedSlipInfo && (
                <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden mt-6">
                  <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-orange-600 to-orange-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <Package className="h-5 w-5 ml-2" />
                        اطلاعات رسید انبار
                      </h2>
                      <div className="flex gap-2">
                        <button className="p-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors shadow-sm" title="دانلود">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                          <Users className="h-4 w-4 ml-1" />
                          طرف حساب
                        </h3>
                        <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.counterpartyName}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                          <FileText className="h-4 w-4 ml-1" />
                          مقدار مبنای رسید
                        </h3>
                        <p className="text-gray-900 font-semibold text-base">{formatPersianNumber(selectedSlipInfo.receiptBasisAmount || 0)} {selectedSlipInfo.unit}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                          <AlertCircle className="h-4 w-4 ml-1" />
                          درصد افت
                        </h3>
                        <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.wastagePercentage ? `${selectedSlipInfo.wastagePercentage}%` : '-'}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                          <Package className="h-4 w-4 ml-1" />
                          وزن افت
                        </h3>
                        <p className="text-gray-900 font-semibold text-base">{formatPersianNumber(selectedSlipInfo.wastageAmount)} {selectedSlipInfo.unit}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                          <FileText className="h-4 w-4 ml-1" />
                          نام کالا
                        </h3>
                        <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.productName}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                          <Info className="h-4 w-4 ml-1" />
                          سایت مخازن
                        </h3>
                        <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.siteName}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                          <Package className="h-4 w-4 ml-1" />
                          مخزن
                        </h3>
                        <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.tankName}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                          <FileText className="h-4 w-4 ml-1" />
                          واحد سنجش
                        </h3>
                        <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.unit}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                          <FileText className="h-4 w-4 ml-1" />
                          شماره رسید انبار
                        </h3>
                        <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.receiptNumber}</p>
                      </div>
                      {selectedSlipInfo.customerCounterpartyName && (
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                          <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                            <Users className="h-4 w-4 ml-1" />
                            مشتری طرف حساب
                          </h3>
                          <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.customerCounterpartyName}</p>
                        </div>
                      )}
                      {selectedSlipInfo.counterpartyLocationName && (
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                          <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                            <Info className="h-4 w-4 ml-1" />
                            لوکیشن طرف حساب
                          </h3>
                          <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.counterpartyLocationName}</p>
                        </div>
                      )}
                      {selectedSlipInfo.customerCounterpartyLocationName && (
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                          <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                            <Info className="h-4 w-4 ml-1" />
                            لوکیشن مشتری طرف حساب
                          </h3>
                          <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.customerCounterpartyLocationName}</p>
                        </div>
                      )}
                      {selectedSlipInfo.indexNumber && (
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                          <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                            <FileText className="h-4 w-4 ml-1" />
                            شماره شاخص / ثبت سفارش
                          </h3>
                          <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.indexNumber}</p>
                        </div>
                      )}
                      {selectedSlipInfo.cotageNumber && (
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                          <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                            <FileText className="h-4 w-4 ml-1" />
                            شماره کوتاژ
                          </h3>
                          <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.cotageNumber}</p>
                        </div>
                      )}
                      {selectedSlipInfo.driverName && (
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                          <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                            <Users className="h-4 w-4 ml-1" />
                            نام راننده
                          </h3>
                          <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.driverName}</p>
                        </div>
                      )}
                      {selectedSlipInfo.driverPlateNumber && (
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                          <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                            <FileText className="h-4 w-4 ml-1" />
                            پلاک خودرو
                          </h3>
                          <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.driverPlateNumber}</p>
                        </div>
                      )}
                      {selectedSlipInfo.shipName && (
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                          <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                            <Package className="h-4 w-4 ml-1" />
                            نام کشتی
                          </h3>
                          <p className="text-gray-900 font-semibold text-base">{selectedSlipInfo.shipName}</p>
                        </div>
                      )}
                      {selectedSlipInfo.receiptDate && (
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                          <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center">
                            <Calendar className="h-4 w-4 ml-1" />
                            تاریخ رسید
                          </h3>
                          <p className="text-gray-900 font-semibold text-base">{formatPersianDate(new Date(selectedSlipInfo.receiptDate))}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleOwnershipDeliverySlip;