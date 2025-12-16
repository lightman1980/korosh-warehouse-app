import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Save, Edit2, Printer, Plus, AlertCircle, CheckCircle, FileText, Package } from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../Common/PersianDatePicker';

interface OwnershipAcquisitionSlipInfo {
  id: string;
  amount: number;
  slipDate: Date;
  internalSiteId: string;
  locationId: string;
  tankId: string;
  // اطلاعات نمایشی از رسید
  productName: string;
  siteName: string;
  tankName: string;
  unit: string;
  receiptNumber: string;
  counterpartyName: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Props {
  onBack: () => void;
  baseData?: any;
  initialData?: any;
  onSave?: (data: any) => void;
}

const OwnershipAcquisitionDeliverySlip: React.FC<Props> = ({ 
  onBack, 
  baseData: propBaseData, 
  initialData, 
  onSave
}) => {
  const [selectedSlipInfo, setSelectedSlipInfo] = useState<OwnershipAcquisitionSlipInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [baseData, setBaseData] = useState<any>(propBaseData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const storage = DataStorage.getInstance();

  // تابع محاسبه موجودي مخزن در سایت با فرمول جدید
  const calculateRemainingInventory = useCallback((siteId: string, tankId: string) => {
    const receipts = storage.loadData('receipts') || [];
    const ownershipDeliveries = storage.loadData('ownership-delivery-slips') || [];
    const consignmentDeliveries = storage.loadData('consignment-delivery-slips') || [];
    const inventoryAdjustments = storage.loadData('inventoryAdjustments') || [];
    const tankAdjustmentSlips = storage.loadData('tank-adjustment-slips') || [];

    // محاسبه ورودی‌ها
    // جمع تمام رسیدهای امانی انجام شده در آن سایت و در آن مخزن
    const consignmentReceipts = receipts
      .filter((r: any) => r.userType === 'consignment' && r.siteId === siteId && r.tankId === tankId && !r.isVoided)
      .reduce((sum, r) => sum + (r.finalAmount || r.amount || 0), 0);

    // جمع تمام رسیدهای تملیکی انجام شده در آن سایت و در آن مخزن
    const ownershipReceipts = receipts
      .filter((r: any) => r.userType === 'owned' && r.siteId === siteId && r.tankId === tankId && !r.isVoided)
      .reduce((sum, r) => sum + (r.finalAmount || r.amount || 0), 0);

    // سند اضافه انبار امانی در آن سایت و در آن مخزن
    const consignmentAdditions = inventoryAdjustments
      .filter((doc: any) => doc.adjustmentType === 'addition' && doc.siteId === siteId && doc.tankId === tankId && !doc.isVoided)
      .reduce((sum, doc: any) => sum + (doc.quantity || 0), 0);

    // سند اضافه انبار تملیکی در آن سایت و در آن مخزن
    const ownershipAdditions = tankAdjustmentSlips
      .filter((t: any) => t.type === 'add' && t.siteId === siteId && t.tankId === tankId && !t.isVoided)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // محاسبه خروجی‌ها
    // جمع تمام حواله‌های امانی انجام شده در آن سایت و در آن مخزن
    const consignmentDeliveriesTotal = consignmentDeliveries
      .filter((d: any) => d.siteId === siteId && d.tankId === tankId && !d.isVoided)
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    // جمع تمام حواله‌های تملیکی انجام شده در آن سایت و در آن مخزن
    const ownershipDeliveriesTotal = ownershipDeliveries
      .filter((d: any) => d.siteId === siteId && d.tankId === tankId && !d.isVoided)
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    // سند کسر انبار امانی در آن سایت و در آن مخزن
    const consignmentDeductions = inventoryAdjustments
      .filter((doc: any) => doc.adjustmentType === 'deduction' && doc.siteId === siteId && doc.tankId === tankId && !doc.isVoided)
      .reduce((sum, doc: any) => sum + (doc.quantity || 0), 0);

    // سند کسر انبار تملیکی در آن سایت و در آن مخزن
    const ownershipDeductions = tankAdjustmentSlips
      .filter((t: any) => t.type === 'deduct' && t.siteId === siteId && t.tankId === tankId && !t.isVoided)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // فرمول: (ورودی‌ها) - (خروجی‌ها)
    const totalInputs = consignmentReceipts + ownershipReceipts + consignmentAdditions + ownershipAdditions;
    const totalOutputs = consignmentDeliveriesTotal + ownershipDeliveriesTotal + consignmentDeductions + ownershipDeductions;
    
    return Math.max(0, totalInputs - totalOutputs);
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
        const locations = categories.find((c: any) => c.id === 'locations')?.items || [];
        const companies = categories.find((c: any) => c.id === 'companies')?.items || [];
        const receipts = storage.loadData('receipts') || [];

        setBaseData({
          internalSites,
          locations,
          companies,
          receipts
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

  // ایجاد حواله تملکی جدید
  const createNewSlip = () => {
    const newSlipInfo: OwnershipAcquisitionSlipInfo = {
      id: `ownership_acq_${Date.now()}`,
      amount: 0,
      slipDate: new Date(),
      internalSiteId: '',
      locationId: '',
      tankId: '',
      productName: '',
      siteName: '',
      tankName: '',
      unit: 'kg',
      receiptNumber: '',
      counterpartyName: '',
      status: 'draft'
    };
    
    setSelectedSlipInfo(newSlipInfo);
    setIsEditing(true);
  };

  // محاسبه موجودی بر اساس سایت و مخزن انتخاب شده
  const currentInventory = useMemo(() => {
    if (!selectedSlipInfo?.internalSiteId || !selectedSlipInfo?.tankId) {
      return 0;
    }
    return calculateRemainingInventory(selectedSlipInfo.internalSiteId, selectedSlipInfo.tankId);
  }, [selectedSlipInfo?.internalSiteId, selectedSlipInfo?.tankId, calculateRemainingInventory]);

  const handleChange = (field: string, value: any) => {
    if (selectedSlipInfo) {
      let updatedSlipInfo = { ...selectedSlipInfo, [field]: value };

      // اگر سایت تغییر کرد، مخزن‌ها را ریست کن
      if (field === 'internalSiteId') {
        updatedSlipInfo.tankId = '';
        updatedSlipInfo.siteName = baseData.internalSites?.find((s: any) => s.id === value)?.name || '';
      }

      // اگر مخزن تغییر کرد، نام مخزن را به‌روز کن
      if (field === 'tankId') {
        // در اینجا باید اطلاعات مخزن از somewhere گرفته شود
        // فعلاً فرض می‌کنیم نام مخزن در selectedSlipInfo.tankName ذخیره شده
      }

      setSelectedSlipInfo(updatedSlipInfo);
      
      // پاک کردن خطا برای این فیلد
      if (errors[field]) {
        setErrors({ ...errors, [field]: '' });
      }
    }
  };

  const handleSaveSlip = async () => {
    if (isSaving) return;
    if (!selectedSlipInfo) return;

    console.log('🚀 Starting save process for ownership acquisition slip...');
    setIsSaving(true);

    try {
      // بررسی‌های اولیه
      const amount = parseFloat(selectedSlipInfo.amount?.toString() || '0');
      if (amount <= 0) {
        throw new Error('مقدار حواله بايد بزرگتر از صفر باشد');
      }

      if (!selectedSlipInfo.internalSiteId) {
        throw new Error('انتخاب سايت الزامي است');
      }

      if (!selectedSlipInfo.locationId) {
        throw new Error('انتخاب مکان الزامي است');
      }

      if (!selectedSlipInfo.tankId) {
        throw new Error('انتخاب مخزن الزامي است');
      }

      console.log('✅ Basic validations passed');

      // بررسی موجودی مخزن
      const remainingInventory = calculateRemainingInventory(selectedSlipInfo.internalSiteId, selectedSlipInfo.tankId);
      
      if (amount > remainingInventory) {
        throw new Error(`مقدار حواله نمی‌تواند از مانده موجودی مخزن (${formatPersianNumber(remainingInventory)}) بیشتر باشد`);
      }

      console.log('✅ Inventory validations passed');

      // ایجاد شیء حواله برای ذخیره
      const deliveryData = {
        ...selectedSlipInfo,
        amount,
        userType: 'owned' as const,
        slipType: 'ownership-acquisition' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // ذخیره در ownership-delivery-slips
      let ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
      const existingIndex = ownershipSlips.findIndex((s: any) => s.id === selectedSlipInfo.id);
      
      if (existingIndex !== -1) {
        ownershipSlips[existingIndex] = { ...deliveryData, updatedAt: new Date() };
      } else {
        ownershipSlips.push(deliveryData);
      }
      storage.saveData('ownership-delivery-slips', ownershipSlips);

      // ذخیره در deliveries
      let deliveries = storage.loadData('deliveries') || [];
      const deliveryIndex = deliveries.findIndex((d: any) => d.id === selectedSlipInfo.id);
      
      if (deliveryIndex !== -1) {
        deliveries[deliveryIndex] = { ...deliveryData, updatedAt: new Date() };
      } else {
        deliveries.push(deliveryData);
      }
      storage.saveData('deliveries', deliveries);

      console.log('✅ Saved to all storage locations');

      // موفقیت ذخیره
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      alert('حواله تملکی با موفقیت ذخیره شد!');
      
    } catch (error) {
      console.error('❌ Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطا در ذخیره‌سازی حواله';
      setErrors({ amount: errorMessage });
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintSlip = useCallback(() => {
    if (!selectedSlipInfo) return;
    
    const printContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
    <meta charset="UTF-8">
    <title>حواله انبار تملکی</title>
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
    .header {
    text-align: center;
    border: 2px solid #2d3748;
    padding: 15px;
    margin-bottom: 20px;
    background: #ffffff;
    }
    .title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 10px;
    }
    .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 20px;
    }
    .info-item {
    display: flex;
    justify-content: space-between;
    padding: 8px;
    border-bottom: 1px dotted #cbd5e0;
    }
    .info-label {
    font-weight: bold;
    color: #4a5568;
    }
    .amount-box {
    text-align: center;
    border: 3px solid #2d3748;
    padding: 20px;
    margin: 20px 0;
    background: #f7fafc;
    }
    .amount {
    font-size: 24px;
    font-weight: bold;
    color: #1a202c;
    }
    .footer {
    margin-top: 30px;
    text-align: center;
    font-size: 12px;
    color: #718096;
    }
    </style>
    </head>
    <body>
    <div class="header">
    <div class="title">حواله انبار تملکی</div>
    <div>شماره: ${selectedSlipInfo.id}</div>
    </div>
    
    <div class="info-grid">
    <div class="info-item">
    <span class="info-label">محصول:</span>
    <span>${selectedSlipInfo.productName}</span>
    </div>
    <div class="info-item">
    <span class="info-label">سایت:</span>
    <span>${selectedSlipInfo.siteName}</span>
    </div>
    <div class="info-item">
    <span class="info-label">مخزن:</span>
    <span>${selectedSlipInfo.tankName}</span>
    </div>
    <div class="info-item">
    <span class="info-label">تاریخ:</span>
    <span>${formatPersianDate(selectedSlipInfo.slipDate)}</span>
    </div>
    </div>
    
    <div class="amount-box">
    <div>مقدار حواله</div>
    <div class="amount">${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</div>
    </div>
    
    <div class="footer">
    <p>این حواله در تاریخ ${formatPersianDate(new Date())} صادر شده است.</p>
    </div>
    </body>
    </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }, [selectedSlipInfo]);

  const handleBack = () => {
    setIsEditing(false);
    setSelectedSlipInfo(null);
    onBack();
  };

  // اگر هیچ حواله‌ای انتخاب نشده، فرم ایجاد را نشان بده
  if (!selectedSlipInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            بازگشت به ليست
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">حواله انبار تملکی</h1>
              <p className="text-gray-600 mt-2">مدیریت حواله‌های انبار تملکی</p>
            </div>
            <button
              onClick={createNewSlip}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              حواله تملکی جديد
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8">
          <div className="text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">هيچ حواله تملکی انتخاب نشده است</h3>
            <p className="text-gray-500 mb-6">برای شروع، یک حواله تملکی جدید ایجاد کنید</p>
            <button
              onClick={createNewSlip}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              ایجاد حواله تملکی جديد
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 ml-2" />
          بازگشت به ليست
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'ويرايش حواله تملکی' : 'جزئيات حواله تملکی'}
        </h1>
      </div>

      {/* فرم اصلي */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8" />
              <div>
                <h2 className="text-xl font-semibold">اطلاعات حواله تملکی</h2>
                <p className="text-green-100 mt-1">
                  {selectedSlipInfo.id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {saveSuccess ? (
                  <div className="flex items-center text-green-200">
                    <CheckCircle className="h-5 w-5 ml-1" />
                    <span className="text-sm">ذخیره شد</span>
                  </div>
                ) : (
                  <div className="flex items-center text-green-200">
                    <div className="w-2 h-2 bg-green-200 rounded-full ml-2"></div>
                    <span className="text-sm">
                      {isEditing ? 'حالت ويرايش' : 'حالت مشاهده'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrintSlip} className="p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors shadow-sm" title="چاپ">
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 ml-1"></div>
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
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* مقدار حواله */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مقدار حواله
                <span className="text-xs text-gray-500 mr-2">
                  (حداکثر: {formatPersianNumber(currentInventory)} {selectedSlipInfo.unit})
                </span>
              </label>
              <input
                type="number"
                value={selectedSlipInfo.amount || 0}
                onChange={(e) => handleChange('amount', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.amount ? 'border-red-500' : 'border-gray-300'}`}
                min="0.01"
                max={currentInventory}
                step="0.01"
              />
              {errors.amount && (
                <div className="flex items-center mt-1 text-red-500 text-xs">
                  <AlertCircle className="h-3 w-3 ml-1" />
                  {errors.amount}
                </div>
              )}
            </div>

            {/* تاریخ حواله */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ حواله</label>
              <PersianDatePicker
                value={selectedSlipInfo.slipDate}
                onChange={(date) => handleChange('slipDate', date)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* سایت داخلی */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">سايت داخلي</label>
              <select
                value={selectedSlipInfo.internalSiteId || ''}
                onChange={(e) => handleChange('internalSiteId', e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">انتخاب کنيد</option>
                {baseData.internalSites?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.internalSiteId && <p className="text-red-500 text-xs mt-1">{errors.internalSiteId}</p>}
            </div>

            {/* لوکیشن */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">لوکيشن</label>
              <select
                value={selectedSlipInfo.locationId || ''}
                onChange={(e) => handleChange('locationId', e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">انتخاب کنيد</option>
                {baseData.locations?.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {errors.locationId && <p className="text-red-500 text-xs mt-1">{errors.locationId}</p>}
            </div>

            {/* مخزن */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">مخزن</label>
              <input
                type="text"
                value={selectedSlipInfo.tankId || ''}
                onChange={(e) => handleChange('tankId', e.target.value)}
                disabled={!isEditing}
                placeholder="شناسه مخزن"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.tankId && <p className="text-red-500 text-xs mt-1">{errors.tankId}</p>}
            </div>

            {/* مانده موجودی در مخزن در سایت */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">مانده موجودی در مخزن در سایت</label>
              <input
                type="number"
                value={currentInventory}
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
              <div className="mt-1 text-xs text-gray-500">
                فرمول: (رسیدهای امانی + رسیدهای تملکی + اضافات انبار) - (حواله‌های امانی + حواله‌های تملکی + کسورات انبار)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* اطلاعات تکمیلی */}
      {selectedSlipInfo.productName && (
        <div className="mt-6 bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4">
            <h3 className="text-lg font-semibold">اطلاعات محصول</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام محصول</label>
                <p className="text-gray-900">{selectedSlipInfo.productName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">واحد سنجش</label>
                <p className="text-gray-900">{selectedSlipInfo.unit}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شماره رسید</label>
                <p className="text-gray-900">{selectedSlipInfo.receiptNumber || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnershipAcquisitionDeliverySlip;