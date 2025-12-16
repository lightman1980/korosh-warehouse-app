import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ArrowLeft, Save, Edit2, X, Printer, Calendar, Trash2, Plus, AlertCircle, CheckCircle, Info, FileText, Package, Users, Settings, Download, Eye, CheckSquare } from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../Common/PersianDatePicker';

// تعريف تايپ‌ها براي اطلاعات حواله تملکی - بدون فیلدهای حذف شده
interface OwnershipAcquisitionInfo {
  id: string;
  receiptId: string;
  counterpartyId: string;
  amount: number;
  slipDate: Date;
  internalSiteId: string;
  contractorSiteId: string;
  locationId: string;
  recipientType: 'company' | 'customer';
  companyLocationId?: string;
  customerLocationId?: string;
  // اين فيلدها از رسيد خوانده مي‌شوند و فقط نمايش داده مي‌شوند
  counterpartyName: string;
  receiptNumber: string;
  productName: string;
  siteName: string;
  tankName: string;
  unit: string;
  wastageAmount: number;
  finalReceiptAmount: number;
  status: string;
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
  calculateRemainingInventory?: (siteId: string, tankId: string, currentSlipId?: string, isEditing?: boolean) => number;
  checkedTransactions?: Set<string>;
  setCheckedTransactions?: React.Dispatch<React.SetStateAction<Set<string>>>;
  disabledTransactions?: Set<string>;
  setDisabledTransactions?: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const OwnershipAcquisitionTable: React.FC<Props> = ({ 
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
  const [availableReceipts, setAvailableReceipts] = useState<OwnershipAcquisitionInfo[]>([]);
  const [selectedSlipInfo, setSelectedSlipInfo] = useState<OwnershipAcquisitionInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [baseData, setBaseData] = useState<any>(propBaseData || {});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState('');
  const [isEditingFromParent, setIsEditingFromParent] = useState(false);
  const [isCreatingFromReceipt, setIsCreatingFromReceipt] = useState(false);
  
  // State for "To be checked" field
  const [checkedTransactions, setCheckedTransactions] = useState<Set<string>>(propCheckedTransactions);
  const [disabledTransactions, setDisabledTransactions] = useState<Set<string>>(propDisabledTransactions);
  
  const storage = DataStorage.getInstance();

  // تابع محاسبه موجودي مخزن - بدون در نظر گرفتن مجوزها
  const calculateTankInventory = useCallback((siteId: string, tankId: string, currentSlipId?: string, isCreating: boolean = false) => {
    // فرمول: (جمع تمام رسیدهای تملیکی انجام شده در آن سایت و در آن مخزن + 
    //  سند اضافه انبار تملیکی در آن سایت و در آن مخزن) - 
    // (جمع تمام حواله های تملیکی انجام شده در آن سایت و در آن مخزن + 
    //  سند کسر انبار تملیکی در آن سایت و در آن مخزن)

    const receipts = storage.loadData('receipts') || [];
    const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
    const tankAdjustmentSlips = storage.loadData('tank-adjustment-slips') || [];
    const inventoryAdjustments = storage.loadData('inventoryAdjustments') || [];

    // فقط رسیدهای تملیکی
    const ownershipReceipts = receipts.filter((r: any) => r.userType === 'owned' && r.siteId === siteId && r.tankId === tankId && !r.isVoided);
    const totalReceipts = ownershipReceipts.reduce((sum, r) => sum + (r.finalAmount || r.amount || 0), 0);

    // محاسبه سندهای اضافه انبار تملیکی
    const totalTankAdditions = tankAdjustmentSlips
      .filter((t: any) => t.siteId === siteId && t.tankId === tankId && t.type === 'add' && !t.isVoided)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // اضافه کردن inventoryAdjustments که نوع addition دارند
    const totalInventoryAdditions = inventoryAdjustments
      .filter((doc: any) => doc.siteId === siteId && doc.tankId === tankId && doc.adjustmentType === 'addition' && !doc.isVoided)
      .reduce((sum, doc: any) => sum + (doc.quantity || 0), 0);

    // محاسبه حواله های تملیکی
    const totalOwnershipDeliveries = ownershipSlips
      .filter((s: any) => {
        if (isCreating && !currentSlipId) {
          return s.siteId === siteId && s.tankId === tankId && !s.isVoided;
        } else if (currentSlipId) {
          return s.siteId === siteId && s.tankId === tankId && !s.isVoided && s.id !== currentSlipId;
        }
        return s.siteId === siteId && s.tankId === tankId && !s.isVoided;
      })
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    // محاسبه سندهای کسر انبار تملیکی
    const totalTankDeductions = tankAdjustmentSlips
      .filter((t: any) => t.siteId === siteId && t.tankId === tankId && t.type === 'deduct' && !t.isVoided)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // اضافه کردن inventoryAdjustments که نوع deduction دارند
    const totalInventoryDeductions = inventoryAdjustments
      .filter((doc: any) => doc.siteId === siteId && doc.tankId === tankId && doc.adjustmentType === 'deduction' && !doc.isVoided)
      .reduce((sum, doc: any) => sum + (doc.quantity || 0), 0);

    const totalInputs = totalReceipts + totalTankAdditions + totalInventoryAdditions;
    const totalOutputs = totalOwnershipDeliveries + totalTankDeductions + totalInventoryDeductions;
    
    return totalInputs - totalOutputs;
  }, [storage]);

  // بارگذاری رسیدهای تملیکی موجود
  useEffect(() => {
    const loadAvailableReceipts = () => {
      const receipts = storage.loadData('receipts') || [];
      const ownershipSlips = storage.loadData('ownership-delivery-slips') || [];
      
      // فقط رسیدهای تملیکی که حواله تملیکی ندارند
      const ownershipReceipts = receipts.filter((r: any) => 
        r.userType === 'owned' && !r.isVoided
      );

      const availableReceiptsData: OwnershipAcquisitionInfo[] = ownershipReceipts.map((receipt: any) => {
        const hasExistingSlip = ownershipSlips.some((slip: any) => 
          slip.receiptId === receipt.id && !slip.isVoided
        );

        return {
          id: `receipt_${receipt.id}`,
          receiptId: receipt.id,
          counterpartyId: receipt.counterpartyId,
          amount: receipt.finalAmount || receipt.amount || 0,
          slipDate: new Date(),
          internalSiteId: receipt.siteId,
          contractorSiteId: receipt.siteId,
          locationId: receipt.locationId,
          recipientType: 'company',
          companyLocationId: receipt.locationId,
          counterpartyName: receipt.counterpartyName,
          receiptNumber: receipt.receiptNumber,
          productName: receipt.productName,
          siteName: receipt.siteName,
          tankName: receipt.tankName,
          unit: receipt.unit,
          wastageAmount: receipt.wastageWeight || 0,
          finalReceiptAmount: receipt.finalAmount || receipt.amount || 0,
          status: 'draft',
          siteId: receipt.siteId,
          tankId: receipt.tankId,
          hasIssuedSlip: hasExistingSlip,
        };
      });

      setAvailableReceipts(availableReceiptsData);
    };

    loadAvailableReceipts();
  }, [storage]);

  // اگر داده اولیه از والد آمده باشد
  useEffect(() => {
    if (initialData) {
      setSelectedSlipInfo(initialData);
      setIsEditingFromParent(true);
      if (initialData.receiptNumber) {
        setSelectedReceiptNumber(initialData.receiptNumber);
      }
    }
  }, [initialData]);

  // فیلتر رسیدها بر اساس جستجو
  const filteredReceipts = useMemo(() => {
    if (!searchTerm) return availableReceipts;
    
    return availableReceipts.filter(receipt =>
      receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.counterpartyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableReceipts, searchTerm]);

  // انتخاب رسید
  const handleSelectReceipt = useCallback((receipt: OwnershipAcquisitionInfo) => {
    const remainingInventory = calculateTankInventory(receipt.siteId!, receipt.tankId!, undefined, true);
    
    setSelectedSlipInfo({
      ...receipt,
      amount: Math.min(receipt.amount, Math.max(0, remainingInventory)),
    });
    setSelectedReceiptNumber(receipt.receiptNumber);
    setIsAddingNew(true);
    setIsEditing(false);
  }, [calculateTankInventory]);

  // ذخیره حواله
  const handleSaveSlip = useCallback(async () => {
    if (!selectedSlipInfo) return;

    setIsSaving(true);
    
    try {
      const slipData = {
        ...selectedSlipInfo,
        id: editingSlipId || `ownership_acquisition_${Date.now()}`,
        status: 'saved',
        slipDate: selectedSlipInfo.slipDate || new Date(),
      };

      // ذخیره در storage
      const existingSlips = storage.loadData('ownership-acquisition-slips') || [];
      
      let updatedSlips;
      if (editingSlipId) {
        updatedSlips = existingSlips.map((slip: any) => 
          slip.id === editingSlipId ? slipData : slip
        );
      } else {
        updatedSlips = [...existingSlips, slipData];
      }
      
      storage.saveData('ownership-acquisition-slips', updatedSlips);
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsAddingNew(false);
        setIsEditing(false);
        setEditingSlipId(null);
        setSelectedSlipInfo(null);
        setSelectedReceiptNumber('');
        
        if (onSave) {
          onSave(slipData);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error saving slip:', error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedSlipInfo, editingSlipId, storage, onSave]);

  // لغو و بازگشت
  const handleCancel = useCallback(() => {
    setSelectedSlipInfo(null);
    setIsAddingNew(false);
    setIsEditing(false);
    setEditingSlipId(null);
    setSelectedReceiptNumber('');
    setErrors({});
  }, []);

  // چاپ حواله
  const handlePrint = useCallback(() => {
    if (!selectedSlipInfo) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>جدول حواله تملکی - ${selectedSlipInfo.receiptNumber}</title>
        <style>
          body { font-family: 'Tahoma', 'Arial', sans-serif; margin: 20px; background: white; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .document-type { font-size: 18px; font-weight: bold; color: #333; }
          .document-title { font-size: 24px; font-weight: bold; color: #d32f2f; margin: 10px 0; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table th, .info-table td { border: 1px solid #ddd; padding: 12px; text-align: right; }
          .info-table th { background-color: #f5f5f5; font-weight: bold; width: 30%; }
          .info-table td { background-color: white; }
          .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature-box { text-align: center; width: 30%; }
          .signature-line { border-top: 2px solid #333; margin-top: 60px; }
          .date-section { margin-top: 30px; text-align: left; }
          .barcode { text-align: center; margin: 20px 0; }
          @media print { body { margin: 10mm; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="document-type">حواله انبار</div>
          <div class="document-title">جدول حواله تملکی</div>
          <div class="barcode">
            <img src="https://barcode.tec-it.com/barcode.ashx?data=${selectedSlipInfo.receiptNumber}&code=Code128&multiplebarcodes=false&translate-esc=false&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0" alt="Barcode" />
          </div>
        </div>

        <table class="info-table">
          <tr><th>شماره رسید</th><td>${selectedSlipInfo.receiptNumber}</td></tr>
          <tr><th>طرف حساب</th><td>${selectedSlipInfo.counterpartyName}</td></tr>
          <tr><th>محصول</th><td>${selectedSlipInfo.productName}</td></tr>
          <tr><th>مقدار</th><td>${formatPersianNumber(selectedSlipInfo.amount)} ${selectedSlipInfo.unit}</td></tr>
          <tr><th>سایت</th><td>${selectedSlipInfo.siteName}</td></tr>
          <tr><th>مخزن</th><td>${selectedSlipInfo.tankName}</td></tr>
          <tr><th>تاریخ حواله</th><td>${formatPersianDate(selectedSlipInfo.slipDate)}</td></tr>
        </table>

        <div class="signature-section">
          <div class="signature-box">
            <div>تحویل گیرنده</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-box">
            <div>تحویل دهنده</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-box">
            <div>مدیر انبار</div>
            <div class="signature-line"></div>
          </div>
        </div>

        <div class="date-section">
          <p>تاریخ: ${formatPersianDate(new Date())}</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  }, [selectedSlipInfo]);

  // فرم جدید
  const renderNewSlipForm = () => {
    if (!selectedSlipInfo) return null;

    const remainingInventory = calculateTankInventory(selectedSlipInfo.siteId!, selectedSlipInfo.tankId!, editingSlipId, !editingSlipId);

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingSlipId ? 'ویرایش' : 'ثبت'} جدول حواله تملکی
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleSaveSlip}
              disabled={isSaving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
            <button
              onClick={handlePrint}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              چاپ
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              انصراف
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            حواله با موفقیت ذخیره شد.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">شماره رسید</label>
            <input
              type="text"
              value={selectedSlipInfo.receiptNumber}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">طرف حساب</label>
            <input
              type="text"
              value={selectedSlipInfo.counterpartyName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">محصول</label>
            <input
              type="text"
              value={selectedSlipInfo.productName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">مقدار رسید</label>
            <input
              type="text"
              value={formatPersianNumber(selectedSlipInfo.finalReceiptAmount)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">مقدار حواله</label>
            <input
              type="number"
              value={selectedSlipInfo.amount}
              onChange={(e) => setSelectedSlipInfo(prev => prev ? {...prev, amount: Number(e.target.value)} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              min="0"
              max={Math.min(selectedSlipInfo.finalReceiptAmount, Math.max(0, remainingInventory))}
            />
            <p className="text-xs text-gray-500 mt-1">
              حداکثر: {formatPersianNumber(Math.min(selectedSlipInfo.finalReceiptAmount, Math.max(0, remainingInventory)))} {selectedSlipInfo.unit}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ حواله</label>
            <PersianDatePicker
              selectedDate={selectedSlipInfo.slipDate}
              onDateChange={(date) => setSelectedSlipInfo(prev => prev ? {...prev, slipDate: date} : null)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">سایت</label>
            <input
              type="text"
              value={selectedSlipInfo.siteName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">مخزن</label>
            <input
              type="text"
              value={selectedSlipInfo.tankName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">واحد</label>
            <input
              type="text"
              value={selectedSlipInfo.unit}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">موجودی مخزن</h3>
          <p className="text-blue-800">
            موجودی فعلی مخزن {selectedSlipInfo.tankName} در سایت {selectedSlipInfo.siteName}: 
            <span className="font-bold">{formatPersianNumber(remainingInventory)} {selectedSlipInfo.unit}</span>
          </p>
        </div>
      </div>
    );
  };

  // لیست رسیدها
  const renderReceiptsList = () => (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">جدول حواله تملکی</h2>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              بازگشت
            </button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="جستجو در رسیدها..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره رسید</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طرف حساب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصول</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مقدار رسید</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سایت</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مخزن</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReceipts.map((receipt) => (
              <tr key={receipt.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {receipt.receiptNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {receipt.counterpartyName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {receipt.productName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPersianNumber(receipt.finalReceiptAmount)} {receipt.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {receipt.siteName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {receipt.tankName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    receipt.hasIssuedSlip ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {receipt.hasIssuedSlip ? 'دارای حواله' : 'آماده برای حواله'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <button
                    onClick={() => handleSelectReceipt(receipt)}
                    disabled={receipt.hasIssuedSlip}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    ایجاد حواله
                  </button>
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
  );

  return (
    <div className="space-y-6">
      {isAddingNew ? renderNewSlipForm() : renderReceiptsList()}
    </div>
  );
};

export default OwnershipAcquisitionTable;