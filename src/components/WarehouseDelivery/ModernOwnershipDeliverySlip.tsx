import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Save, Edit2, Printer, Plus, AlertCircle, CheckCircle, FileText, Package, Search, Eye, Download, RefreshCw } from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../Common/PersianDatePicker';

// تعریف تایپ‌ها برای اطلاعات حواله تملیکی جدید
interface ModernOwnershipSlipInfo {
  id: string;
  receiptId: string;
  receiptNumber: string;
  counterpartyName: string;
  productName: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  unit: string;
  amount: number;
  receiptBasisAmount: number;
  wastageAmount: number;
  wastagePercentage: number;
  slipDate: Date;
  internalSiteId: string;
  contractorSiteId: string;
  locationId: string;
  recipientType: 'company' | 'customer';
  companyLocationId?: string;
  customerLocationId?: string;
  notes: string;
  status: 'draft' | 'approved' | 'cancelled';
  remainingTankInventory: number;
  createdAt?: Date;
  updatedAt?: Date;
  // فیلدهای اضافی از رسید
  customerCounterpartyName?: string;
  counterpartyLocationName?: string;
  customerCounterpartyLocationName?: string;
  indexNumber?: string;
  cotageNumber?: string;
  driverName?: string;
  shipName?: string;
}

interface Props {
  onBack: () => void;
  baseData?: any;
  initialData?: any;
  onSave?: (data: any) => void;
}

const ModernOwnershipDeliverySlip: React.FC<Props> = ({ 
  onBack, 
  baseData: propBaseData, 
  initialData, 
  onSave 
}) => {
  const [selectedSlipInfo, setSelectedSlipInfo] = useState<ModernOwnershipSlipInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [baseData, setBaseData] = useState<any>(propBaseData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableReceipts, setAvailableReceipts] = useState<ModernOwnershipSlipInfo[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ModernOwnershipSlipInfo | null>(null);
  
  const storage = DataStorage.getInstance();

  // تابع محاسبه موجودی مخزن نسبت به سایت - مطابق فرمول درخواستی کاربر
  const calculateRemainingInventory = useCallback((siteId: string, tankId: string, currentSlipId?: string, isEditing: boolean = false) => {
    try {
      const receipts = storage.loadData('receipts') || [];
      const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
      const consignmentSlips = storage.loadData('consignment-delivery-slips') || [];
      const inventoryAdjustments = storage.loadData('inventoryAdjustments') || [];
      const tankAdjustmentSlips = storage.loadData('tank-adjustment-slips') || [];

      // 1. جمع تمامی رسید های امانی و تملیکی در آن سایت و در آن مخزن
      const allReceipts = receipts.filter((r: any) => 
        r.siteId === siteId && r.tankId === tankId && !r.isVoided && r.status === 'approved'
      );
      const totalAllReceipts = allReceipts.reduce((sum, r) => sum + (r.finalAmount || r.amount || 0), 0);

      // 2. جمع رسیدهای افت امانی و تملیکی 
      const totalWastageLosses = allReceipts.reduce((sum, r) => sum + Math.abs(r.wastageWeight || 0), 0);

      // 3. جمع تمامی رسید های اضافه انبار (سندهای اضافه انبار)
      const totalTankAdditions = tankAdjustmentSlips
        .filter((t: any) => t.siteId === siteId && t.tankId === tankId && t.type === 'add' && !t.isVoided && t.status === 'approved')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const totalInventoryAdditions = inventoryAdjustments
        .filter((doc: any) => doc.siteId === siteId && doc.tankId === tankId && doc.adjustmentType === 'addition' && !doc.isVoided && doc.status === 'approved')
        .reduce((sum, doc: any) => sum + (doc.quantity || 0), 0);

      // 4. جمع تمامی حواله های امانی و تملیکی در آن سایت و در آن مخزن
      const filteredOwnershipSlips = ownershipSlips.filter((s: any) => 
        s.siteId === siteId && s.tankId === tankId && !s.isVoided && s.status === 'approved' && (!isEditing || s.id !== currentSlipId)
      );
      const totalOwnershipDeliveries = filteredOwnershipSlips.reduce((sum, s) => sum + (s.amount || 0), 0);

      const filteredConsignmentSlips = consignmentSlips.filter((s: any) => 
        s.siteId === siteId && s.tankId === tankId && !s.isVoided && s.status === 'approved'
      );
      const totalConsignmentDeliveries = filteredConsignmentSlips.reduce((sum, s) => sum + (s.amount || 0), 0);

      // 5. جمع حواله های افت امانی و تملیکی
      const totalOwnershipWastage = filteredOwnershipSlips.reduce((sum, s) => sum + Math.abs(s.wastageAmount || 0), 0);
      const totalConsignmentWastage = filteredConsignmentSlips.reduce((sum, s) => sum + Math.abs(s.wastageAmount || 0), 0);

      // 6. جمع تمامی سند های کسر انبار
      const totalTankDeductions = tankAdjustmentSlips
        .filter((t: any) => t.siteId === siteId && t.tankId === tankId && t.type === 'deduct' && !t.isVoided && t.status === 'approved')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const totalInventoryDeductions = inventoryAdjustments
        .filter((doc: any) => doc.siteId === siteId && doc.tankId === tankId && doc.adjustmentType === 'deduction' && !doc.isVoided && doc.status === 'approved')
        .reduce((sum, doc: any) => sum + (doc.quantity || 0), 0);

      // فرمول کلی: مجموع ورودی - مجموع خروجی
      const totalInputs = totalAllReceipts + totalWastageLosses + totalTankAdditions + totalInventoryAdditions;
      const totalOutputs = totalOwnershipDeliveries + totalConsignmentDeliveries + totalOwnershipWastage + totalConsignmentWastage + totalTankDeductions + totalInventoryDeductions;
      
      return Math.max(0, totalInputs - totalOutputs);
    } catch (error) {
      console.error('Error calculating tank inventory:', error);
      return 0;
    }
  }, [storage]);

  // بارگذاری داده‌های پایه
  useEffect(() => {
    if (propBaseData && Object.keys(propBaseData).length > 0) {
      setBaseData(propBaseData);
      return;
    }

    const loadBaseData = async () => {
      try {
        const categories = storage.loadData('baseDataCategories') || [];
        const internalSites = categories.find((c: any) => c.id === 'internal-sites')?.items || [];
        const contractorSites = categories.find((c: any) => c.id === 'contractor-sites')?.items || [];
        const locations = categories.find((c: any) => c.id === 'locations')?.items || [];
        const companies = categories.find((c: any) => c.id === 'companies')?.items || [];
        const companiesLocation = categories.find((c: any) => c.id === 'companies-location')?.items || [];
        const customerCompanies = categories.find((c: any) => c.id === 'customer-companies')?.items || [];
        const customerCompaniesLocation = categories.find((c: any) => c.id === 'customer-companies-location')?.items || [];

        setBaseData({
          internalSites,
          contractorSites,
          locations,
          companies,
          companiesLocation,
          customerCompanies,
          customerCompaniesLocation
        });
      } catch (error) {
        console.error('Error loading base data:', error);
      }
    };

    loadBaseData();
  }, [propBaseData, storage]);

  // بارگذاری رسیدهای تملیکی موجود
  useEffect(() => {
    const loadAvailableReceipts = () => {
      const receipts = storage.loadData('receipts') || [];
      const ownershipReceipts = receipts.filter((r: any) => 
        r.userType === 'owned' && r.status === 'approved' && !r.isVoided
      );

      const receiptsData: ModernOwnershipSlipInfo[] = ownershipReceipts.map((receipt: any) => {
        const remainingInventory = calculateRemainingInventory(receipt.siteId, receipt.tankId);
        
        return {
          id: `ownership_${receipt.id}`,
          receiptId: receipt.id,
          receiptNumber: receipt.transactionNumber || '',
          counterpartyName: receipt.companyName || receipt.counterpartyName || 'تملیکی',
          productName: receipt.productName || '',
          siteId: receipt.siteId || '',
          siteName: receipt.siteName || '',
          tankId: receipt.tankId || '',
          tankName: receipt.tankName || '',
          unit: receipt.unit || 'kg',
          amount: 0, // مقدار اولیه 0، کاربر وارد می‌کند
          receiptBasisAmount: receipt.receiptBasisAmount || 0,
          wastageAmount: receipt.wastageWeight || 0,
          wastagePercentage: receipt.wastagePercentage || 0,
          slipDate: new Date(),
          internalSiteId: '',
          contractorSiteId: '',
          locationId: '',
          recipientType: 'company' as const,
          companyLocationId: '',
          customerLocationId: '',
          notes: '',
          status: 'draft' as const,
          remainingTankInventory: remainingInventory,
          // فیلدهای اضافی از رسید
          customerCounterpartyName: receipt.customerCounterpartyName || '',
          counterpartyLocationName: receipt.counterpartyLocationName || '',
          customerCounterpartyLocationName: receipt.customerCounterpartyLocationName || '',
          indexNumber: receipt.indexNumber || '',
          cotageNumber: receipt.cotageNumber || '',
          driverName: receipt.driverName || '',
          shipName: receipt.shipName || '',
          createdAt: new Date()
        };
      });

      setAvailableReceipts(receiptsData);
    };

    loadAvailableReceipts();
  }, [storage, calculateRemainingInventory]);

  // فیلتر کردن رسیدها بر اساس جستجو
  const filteredReceipts = useMemo(() => {
    if (!searchTerm) return availableReceipts;
    
    return availableReceipts.filter(receipt =>
      receipt.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.counterpartyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.productName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableReceipts, searchTerm]);

  // انتخاب رسید و انتقال اطلاعات
  const handleSelectReceipt = (receipt: ModernOwnershipSlipInfo) => {
    const newSlipInfo: ModernOwnershipSlipInfo = {
      ...receipt,
      remainingTankInventory: calculateRemainingInventory(receipt.siteId, receipt.tankId)
    };
    
    setSelectedSlipInfo(newSlipInfo);
    setSelectedReceipt(receipt);
    setIsEditing(false);
  };

  // ایجاد حواله جدید از رسید انتخاب شده
  const handleCreateNewSlip = () => {
    if (!selectedReceipt) return;
    
    const newSlip: ModernOwnershipSlipInfo = {
      ...selectedReceipt,
      id: `ownership_slip_${Date.now()}`,
      slipDate: new Date(),
      internalSiteId: '',
      contractorSiteId: '',
      locationId: '',
      recipientType: 'company',
      companyLocationId: '',
      customerLocationId: '',
      notes: '',
      status: 'draft'
    };
    
    setSelectedSlipInfo(newSlip);
    setIsEditing(true);
  };

  // تغییر مقادیر فرم
  const handleChange = (field: string, value: any) => {
    if (!selectedSlipInfo) return;

    let updatedSlipInfo = { ...selectedSlipInfo, [field]: value };

    // محاسبه مجدد موجودی مخزن در صورت تغییر سایت یا مخزن
    if (field === 'siteId' || field === 'tankId') {
      const newInventory = calculateRemainingInventory(
        field === 'siteId' ? value : selectedSlipInfo.siteId,
        field === 'tankId' ? value : selectedSlipInfo.tankId
      );
      updatedSlipInfo.remainingTankInventory = newInventory;
    }

    setSelectedSlipInfo(updatedSlipInfo);
    
    // پاک کردن خطا برای این فیلد
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // ذخیره حواله
  const handleSaveSlip = async () => {
    if (!selectedSlipInfo || isSaving) return;

    // اعتبارسنجی
    const newErrors: Record<string, string> = {};
    
    if (!selectedSlipInfo.internalSiteId) newErrors.internalSiteId = 'انتخاب سایت داخلی الزامی است';
    if (!selectedSlipInfo.contractorSiteId) newErrors.contractorSiteId = 'انتخاب سایت پیمانکار الزامی است';
    if (!selectedSlipInfo.locationId) newErrors.locationId = 'انتخاب مکان الزامی است';
    if (!selectedSlipInfo.receiptId) newErrors.receiptId = 'انتخاب رسید الزامی است';
    
    const amount = parseFloat(selectedSlipInfo.amount?.toString() || '0');
    if (amount <= 0) {
      newErrors.amount = 'مقدار حواله باید بزرگتر از صفر باشد';
    }

    if (amount > selectedSlipInfo.remainingTankInventory) {
      newErrors.amount = `مقدار حواله نمی‌تواند از موجودی مخزن (${formatPersianNumber(selectedSlipInfo.remainingTankInventory)}) بیشتر باشد`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);

    try {
      const slipData = {
        ...selectedSlipInfo,
        amount,
        status: 'approved',
        updatedAt: new Date()
      };

      // ذخیره در storage
      const existingSlips = storage.loadData('ownership-delivery-slips') || [];
      const existingIndex = existingSlips.findIndex((s: any) => s.id === selectedSlipInfo.id);
      
      if (existingIndex !== -1) {
        existingSlips[existingIndex] = slipData;
      } else {
        existingSlips.push({
          ...slipData,
          createdAt: new Date()
        });
      }
      
      storage.saveData('ownership-delivery-slips', existingSlips);

      // موفقیت ذخیره
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      if (onSave) {
        onSave(slipData);
      }
      
    } catch (error) {
      console.error('Save error:', error);
      setErrors({ submit: 'خطا در ذخیره‌سازی. لطفاً دوباره تلاش کنید.' });
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  // چاپ حواله
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
    border: 3px solid #059669;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0 0 15px 0;
    border-bottom: 2px solid #059669;
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
    color: #065f46;
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
    color: #059669;
    background: #ecfdf5;
    padding: 6px 14px;
    border-radius: 6px;
    display: inline-block;
    border: 1px solid #a7f3d0;
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
    .details-table thead { background: #ecfdf5; }
    .details-table th {
    padding: 10px 12px;
    text-align: right;
    font-weight: 600;
    color: #065f46;
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
    color: #059669; 
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
    border-top: 2px solid #059669;
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
    color: rgba(5, 150, 105, 0.04);
    font-weight: 900;
    z-index: 0;
    pointer-events: none;
    letter-spacing: 15px;
    }
    @media print {
    body { font-size: 13px; padding: 0; }
    .document { box-shadow: none; border: 2px solid #059669; }
    }
    </style>
    </head>
    <body>
    <div class="document">
    <div class="watermark">تملیکی</div>
    <div class="header">
    <div class="company-section">
    <img src="${logoUrl}" alt="لوگو شرکت" class="company-logo" onerror="this.src='/لوگو شرکت.jpg'; this.onerror=function(){this.style.display='none';};" />
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

    <div class="section-title">اطلاعات حواله تملیکی</div>
    <table class="details-table">
    <tr><td width="30%">طرف حساب</td><td>${selectedSlipInfo.counterpartyName}</td></tr>
    <tr><td>مقدار حواله</td><td>${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td>موجودی مخزن نسبت به سایت</td><td>${formatPersianNumber(selectedSlipInfo.remainingTankInventory)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td>تاریخ حواله</td><td>${formatPersianDate(selectedSlipInfo.slipDate)}</td></tr>
    <tr><td>سایت داخلی</td><td>${baseData.internalSites?.find((s: any) => s.id === selectedSlipInfo.internalSiteId)?.name || ''}</td></tr>
    <tr><td>سایت پیمانکار</td><td>${baseData.contractorSites?.find((s: any) => s.id === selectedSlipInfo.contractorSiteId)?.name || ''}</td></tr>
    <tr><td>لوکیشن</td><td>${baseData.locations?.find((l: any) => l.id === selectedSlipInfo.locationId)?.name || ''}</td></tr>
    </table>

    <div class="section-title">اطلاعات رسید انبار</div>
    <table class="details-table">
    <tr><td width="30%">مقدار مبنای رسید</td><td>${formatPersianNumber(selectedSlipInfo.receiptBasisAmount || 0)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td>درصد افت</td><td>${selectedSlipInfo.wastagePercentage ? `${selectedSlipInfo.wastagePercentage}%` : '-'}</td></tr>
    <tr><td>وزن افت</td><td>${formatPersianNumber(selectedSlipInfo.wastageAmount)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td>مقدار رسید</td><td>${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</td></tr>
    <tr><td>نام کالا</td><td>${selectedSlipInfo.productName}</td></tr>
    <tr><td>سایت مخازن</td><td>${selectedSlipInfo.siteName}</td></tr>
    <tr><td>مخزن</td><td>${selectedSlipInfo.tankName}</td></tr>
    <tr><td>واحد سنجش</td><td>${selectedSlipInfo.unit}</td></tr>
    <tr><td>شماره رسید انبار</td><td>${selectedSlipInfo.receiptNumber}</td></tr>
    ${selectedSlipInfo.indexNumber ? `<tr><td>شماره شاخص</td><td>${selectedSlipInfo.indexNumber}</td></tr>` : ''}
    ${selectedSlipInfo.cotageNumber ? `<tr><td>شماره کوتاژ</td><td>${selectedSlipInfo.cotageNumber}</td></tr>` : ''}
    ${selectedSlipInfo.driverName ? `<tr><td>نام راننده</td><td>${selectedSlipInfo.driverName}</td></tr>` : ''}
    ${selectedSlipInfo.shipName ? `<tr><td>نام کشتی</td><td>${selectedSlipInfo.shipName}</td></tr>` : ''}
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

  // بازگشت به حالت اولیه
  const handleBackToList = () => {
    setSelectedSlipInfo(null);
    setSelectedReceipt(null);
    setIsEditing(false);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4" dir="rtl">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 mb-6 overflow-hidden">
          <div className="p-6 border-b-2 border-green-200 bg-gradient-to-r from-green-600 to-emerald-600">
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
                  حواله انبار تملیکی جدید
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <div className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg border border-green-300">
                    <CheckCircle className="h-4 w-4 ml-2" />
                    <span className="text-sm font-medium">ذخیره شد</span>
                  </div>
                )}
                <div className="text-sm text-green-100">
                  نسخه 2025 - مدرن و بهینه
                </div>
              </div>
            </div>
          </div>

          {/* Search and Actions */}
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
              {selectedReceipt && !selectedSlipInfo && (
                <button
                  onClick={handleCreateNewSlip}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  ایجاد حواله جدید
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ستون چپ - لیست رسیدها */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <Package className="h-5 w-5 ml-2" />
                    رسیدهای تملیکی موجود
                  </h2>
                  <div className="text-sm text-green-100">
                    تعداد: {filteredReceipts.length}
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
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">موجودی مخزن</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReceipts.map((receipt) => (
                      <tr 
                        key={receipt.id} 
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedReceipt?.id === receipt.id ? 'bg-green-50 border-green-200' : ''
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
                          {formatPersianNumber(receipt.remainingTankInventory)} {receipt.unit}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectReceipt(receipt);
                              }}
                              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-100 transition-colors"
                              title="انتخاب"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredReceipts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? 'رسیدی با این مشخصات یافت نشد.' : 'هیچ رسید تملیکی موجود نیست.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ستون راست - فرم اطلاعات حواله */}
          <div className="space-y-6">
            {selectedSlipInfo ? (
              <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
                <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-green-600 to-emerald-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white flex items-center">
                      <FileText className="h-5 w-5 ml-2" />
                      اطلاعات حواله تملیکی
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePrintSlip}
                        className="p-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors shadow-sm"
                        title="چاپ حواله"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
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
                              <RefreshCw className="animate-spin h-4 w-4 ml-1" />
                              ذخیره...
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

                <div className="p-6 h-96 overflow-y-auto">
                  <div className="space-y-6">
                    {/* اطلاعات کالا */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
                        <Package className="h-5 w-5 ml-2" />
                        جدول اطلاعات کالا
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">شماره حواله</label>
                          <input
                            type="text"
                            value={selectedSlipInfo.id}
                            disabled={true}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            placeholder="شماره حواله"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">سایت موجودی کالا</label>
                          <input
                            type="text"
                            value={selectedSlipInfo.siteName}
                            disabled={true}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">مخزن موجودی کالا</label>
                          <input
                            type="text"
                            value={selectedSlipInfo.tankName}
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">نام کالا</label>
                          <input
                            type="text"
                            value={selectedSlipInfo.productName}
                            disabled={true}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">شماره رسید انبار</label>
                          <input
                            type="text"
                            value={selectedSlipInfo.receiptNumber}
                            disabled={true}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* جدول صدور حواله تملیکی */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center">
                        <FileText className="h-5 w-5 ml-2" />
                        جدول صدور حواله تملیکی
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            مقدار حواله 
                            <span className="text-xs text-gray-500 mr-2">
                              (حداکثر: {formatPersianNumber(selectedSlipInfo.remainingTankInventory)} {selectedSlipInfo.unit})
                            </span>
                          </label>
                          <input
                            type="number"
                            value={selectedSlipInfo.amount || 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const clamped = Math.min(val, selectedSlipInfo.remainingTankInventory);
                              handleChange('amount', clamped);
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ حواله</label>
                          <PersianDatePicker
                            value={selectedSlipInfo.slipDate}
                            onChange={(date) => handleChange('slipDate', date)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">نوع گیرنده</label>
                          <select
                            value={selectedSlipInfo.recipientType}
                            onChange={(e) => handleChange('recipientType', e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="company">شرکت</option>
                            <option value="customer">مشتری</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">سایت داخلی</label>
                          <select
                            value={selectedSlipInfo.internalSiteId}
                            onChange={(e) => handleChange('internalSiteId', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                              errors.internalSiteId ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">انتخاب کنید</option>
                            {baseData.internalSites?.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          {errors.internalSiteId && <p className="text-red-500 text-xs mt-1">{errors.internalSiteId}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">سایت پیمانکار</label>
                          <select
                            value={selectedSlipInfo.contractorSiteId}
                            onChange={(e) => handleChange('contractorSiteId', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                              errors.contractorSiteId ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">انتخاب کنید</option>
                            {baseData.contractorSites?.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          {errors.contractorSiteId && <p className="text-red-500 text-xs mt-1">{errors.contractorSiteId}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">لوکیشن</label>
                          <select
                            value={selectedSlipInfo.locationId}
                            onChange={(e) => handleChange('locationId', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                              errors.locationId ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">انتخاب کنید</option>
                            {baseData.locations?.map((l: any) => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>
                          {errors.locationId && <p className="text-red-500 text-xs mt-1">{errors.locationId}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {selectedSlipInfo.recipientType === 'company' ? 'طرف حساب' : 'مشتری طرف حساب'}
                          </label>
                          <select
                            value={selectedSlipInfo.recipientType === 'company' ? selectedSlipInfo.companyLocationId : selectedSlipInfo.customerLocationId}
                            onChange={(e) => {
                              if (selectedSlipInfo.recipientType === 'company') {
                                handleChange('companyLocationId', e.target.value);
                              } else {
                                handleChange('customerLocationId', e.target.value);
                              }
                            }}
                            disabled={!isEditing}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="">انتخاب کنید</option>
                            {selectedSlipInfo.recipientType === 'company' 
                              ? baseData.companiesLocation?.map((c: any) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))
                              : baseData.customerCompaniesLocation?.map((c: any) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))
                            }
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">توضیحات</label>
                          <textarea
                            value={selectedSlipInfo.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            rows={3}
                            placeholder="توضیحات اضافی..."
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
                              <RefreshCw className="animate-spin h-4 w-4" />
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
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
                <div className="p-12 text-center">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لطفاً یک رسید تملیکی را انتخاب کنید</h3>
                  <p className="text-gray-500">برای شروع، یکی از رسیدهای موجود در لیست سمت چپ را انتخاب کنید</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernOwnershipDeliverySlip;