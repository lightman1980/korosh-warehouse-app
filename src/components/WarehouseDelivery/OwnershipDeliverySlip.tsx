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
  Info, 
  Package, 
  Settings, 
  Download,
  ChevronDown,
  Filter,
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
  Clock,
  User,
  Warehouse,
  Activity
} from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../Common/PersianDatePicker';

// تعریف تایپ‌های اصلی
interface WarehouseReceipt {
  id: string;
  transactionNumber: string;
  userType: 'owned' | 'consignment';
  productId: string;
  productName: string;
  productCode?: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  amount: number;
  receiptBasisAmount?: number;
  wastageWeight?: number;
  wastagePercentage?: number;
  finalAmount: number;
  receiptDate: Date;
  unit: string;
  status: string;
  counterpartyName?: string;
  contractNumber?: string;
  notes?: string;
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
  status: string;
}

interface OwnershipDeliverySlip {
  id: string;
  receiptId: string;
  transactionNumber: string;
  deliveryDate: Date;
  productName: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  amount: number;
  unit: string;
  remainingTankInventory: number;
  status: 'draft' | 'saved' | 'finalized' | 'printed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryCalculation {
  totalOwnedReceipts: number;
  totalConsignmentReceipts: number;
  totalWastageReceipts: number;
  totalSurplusDocuments: number;
  totalOwnershipDeliveries: number;
  totalConsignmentDeliveries: number;
  totalWastageDeliveries: number;
  totalDeductionDocuments: number;
  finalInventory: number;
}

interface Props {
  onBack: () => void;
  baseData?: any;
  initialData?: any;
  onSave?: (data: any) => void;
}

const OwnershipDeliverySlip: React.FC<Props> = ({ onBack, baseData: propBaseData, initialData, onSave }) => {
  // State های اصلی
  const [availableReceipts, setAvailableReceipts] = useState<WarehouseReceipt[]>([]);
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>([]);
  const [ownershipDeliverySlips, setOwnershipDeliverySlips] = useState<OwnershipDeliverySlip[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<WarehouseReceipt | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedTank, setSelectedTank] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSlip, setEditingSlip] = useState<OwnershipDeliverySlip | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [newSlipData, setNewSlipData] = useState<Partial<OwnershipDeliverySlip>>({
    deliveryDate: new Date(),
    amount: 0,
    unit: 'kg',
    status: 'draft',
    notes: ''
  });

  const storage = DataStorage.getInstance();

  // بارگذاری داده‌ها از فایل‌های مرتبط
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(() => {
    try {
      // بارگذاری رسیدهای انبار تملیکی از WarehouseReceiptManager
      const receipts = storage.loadData('receipts') || [];
      const ownedReceipts = receipts.filter((r: any) => 
        r.userType === 'owned' && !r.isVoided
      ).map((r: any) => ({
        ...r,
        receiptDate: new Date(r.receiptDate),
        finalAmount: r.finalAmount || r.amount || 0
      }));
      setAvailableReceipts(ownedReceipts);

      // بارگذاری تنظیمات موجودی از InventoryAdjustmentManager
      const adjustments = storage.loadData('inventoryAdjustments') || [];
      const validAdjustments = adjustments.filter((adj: any) => 
        adj.productType === 'owned' && !adj.isVoided
      ).map((adj: any) => ({
        ...adj,
        documentDate: new Date(adj.documentDate)
      }));
      setInventoryAdjustments(validAdjustments);

      // بارگذاری حواله‌های تملیکی قبلی
      const deliverySlips = storage.loadData('ownership-delivery-slips') || [];
      const validDeliverySlips = deliverySlips.map((slip: any) => ({
        ...slip,
        deliveryDate: new Date(slip.deliveryDate),
        createdAt: new Date(slip.createdAt || slip.deliveryDate),
        updatedAt: new Date(slip.updatedAt || slip.deliveryDate)
      }));
      setOwnershipDeliverySlips(validDeliverySlips);
    } catch (error) {
      console.error('خطا در بارگذاری داده‌ها:', error);
    }
  }, []);

  // محاسبه موجودی مخزن نسبت به سایت با فرمول کامل
  const calculateTankInventory = useCallback((siteId: string, tankId: string): InventoryCalculation => {
    // فرمول درخواستی کاربر:
    // (جمع تمامی رسیدهای امانی و تملیکی + جمع رسیدهای افت امانی و تملیکی + جمع تمامی رسیدهای اضافه انبار) 
    // - (جمع تمامی حواله های امانی و تملیکی + جمع حواله های افت امانی و تملیکی + جمع تمامی سند های کسر انبار)

    const receipts = storage.loadData('receipts') || [];
    const adjustments = storage.loadData('inventoryAdjustments') || [];
    const ownershipDeliveries = storage.loadData('ownership-delivery-slips') || [];
    const consignmentDeliveries = storage.loadData('consignment-delivery-slips') || [];

    // جمع تمامی رسیدهای امانی و تملیکی در آن سایت و در آن مخزن
    const totalOwnedReceipts = receipts
      .filter((r: any) => 
        r.siteId === siteId && 
        r.tankId === tankId && 
        r.userType === 'owned' && 
        !r.isVoided &&
        (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
      )
      .reduce((sum, r) => sum + (r.finalAmount || r.amount || 0), 0);

    const totalConsignmentReceipts = receipts
      .filter((r: any) => 
        r.siteId === siteId && 
        r.tankId === tankId && 
        r.userType === 'consignment' && 
        !r.isVoided &&
        (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
      )
      .reduce((sum, r) => sum + (r.finalAmount || r.amount || 0), 0);

    // جمع رسیدهای افت امانی و تملیکی
    const totalWastageReceipts = receipts
      .filter((r: any) => 
        r.siteId === siteId && 
        r.tankId === tankId && 
        !r.isVoided &&
        (r.status === 'saved' || r.status === 'finalized' || r.status === 'printed')
      )
      .reduce((sum, r) => sum + Math.abs(r.wastageWeight || 0), 0);

    // جمع تمامی رسیدهای اضافه انبار (inventory adjustments)
    const totalSurplusDocuments = adjustments
      .filter((adj: any) => 
        adj.siteId === siteId && 
        adj.tankId === tankId && 
        adj.productType === 'owned' &&
        adj.adjustmentType === 'addition' && 
        !adj.isVoided &&
        adj.status === 'saved'
      )
      .reduce((sum, adj) => sum + (adj.quantity || 0), 0);

    // جمع تمامی حواله های امانی و تملیکی
    const totalOwnershipDeliveries = ownershipDeliveries
      .filter((d: any) => 
        d.siteId === siteId && 
        d.tankId === tankId && 
        !d.isVoided &&
        (d.status === 'saved' || d.status === 'finalized' || d.status === 'printed')
      )
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const totalConsignmentDeliveries = consignmentDeliveries
      .filter((d: any) => 
        d.siteId === siteId && 
        d.tankId === tankId && 
        !d.isVoided &&
        (d.status === 'saved' || d.status === 'finalized' || d.status === 'printed')
      )
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    // جمع حواله های افت امانی و تملیکی
    const totalWastageDeliveries = [
      ...ownershipDeliveries.filter((d: any) => 
        d.siteId === siteId && d.tankId === tankId && !d.isVoided
      ),
      ...consignmentDeliveries.filter((d: any) => 
        d.siteId === siteId && d.tankId === tankId && !d.isVoided
      )
    ].reduce((sum, d) => sum + Math.abs(d.wastageAmount || 0), 0);

    // جمع تمامی سند های کسر انبار
    const totalDeductionDocuments = adjustments
      .filter((adj: any) => 
        adj.siteId === siteId && 
        adj.tankId === tankId && 
        adj.productType === 'owned' &&
        adj.adjustmentType === 'deduction' && 
        !adj.isVoided &&
        adj.status === 'saved'
      )
      .reduce((sum, adj) => sum + (adj.quantity || 0), 0);

    const finalInventory = (totalOwnedReceipts + totalConsignmentReceipts + totalWastageReceipts + totalSurplusDocuments) - 
      (totalOwnershipDeliveries + totalConsignmentDeliveries + totalWastageDeliveries + totalDeductionDocuments);

    return {
      totalOwnedReceipts,
      totalConsignmentReceipts,
      totalWastageReceipts,
      totalSurplusDocuments,
      totalOwnershipDeliveries,
      totalConsignmentDeliveries,
      totalWastageDeliveries,
      totalDeductionDocuments,
      finalInventory
    };
  }, []);

  // فیلتر کردن رسیدها بر اساس انتخاب‌ها
  const filteredReceipts = useMemo(() => {
    return availableReceipts.filter(receipt => {
      // فیلتر بر اساس سایت
      if (selectedSite && receipt.siteId !== selectedSite) return false;
      
      // فیلتر بر اساس مخزن
      if (selectedTank && receipt.tankId !== selectedTank) return false;
      
      // فیلتر بر اساس متن جستجو
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          receipt.productName.toLowerCase().includes(searchLower) ||
          receipt.transactionNumber.toLowerCase().includes(searchLower) ||
          receipt.siteName.toLowerCase().includes(searchLower) ||
          receipt.tankName.toLowerCase().includes(searchLower) ||
          (receipt.counterpartyName && receipt.counterpartyName.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [availableReceipts, selectedSite, selectedTank, searchTerm]);

  // گروه‌بندی رسیدها بر اساس شماره رسید
  const groupedReceipts = useMemo(() => {
    const groups: { [key: string]: WarehouseReceipt[] } = {};
    filteredReceipts.forEach(receipt => {
      if (!groups[receipt.transactionNumber]) {
        groups[receipt.transactionNumber] = [];
      }
      groups[receipt.transactionNumber].push(receipt);
    });
    return groups;
  }, [filteredReceipts]);

  // لیست سایت‌ها و مخازن منحصر به فرد
  const uniqueSites = useMemo(() => {
    const sites = new Map();
    availableReceipts.forEach(receipt => {
      if (!sites.has(receipt.siteId)) {
        sites.set(receipt.siteId, receipt.siteName);
      }
    });
    return Array.from(sites.entries());
  }, [availableReceipts]);

  const uniqueTanks = useMemo(() => {
    const tanks = new Map();
    availableReceipts.forEach(receipt => {
      if (!tanks.has(receipt.tankId)) {
        tanks.set(receipt.tankId, receipt.tankName);
      }
    });
    return Array.from(tanks.entries());
  }, [availableReceipts]);

  // تولید شماره تراکنش جدید
  const generateTransactionNumber = useCallback(() => {
    const deliveries = storage.loadData('ownership-delivery-slips') || [];
    const maxNumber = deliveries.reduce((max, delivery) => {
      const match = delivery.transactionNumber?.match(/OT(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    return `OT${String(maxNumber + 1).padStart(4, '0')}`;
  }, []);

  // اعتبارسنجی فرم
  const validateForm = (data: Partial<OwnershipDeliverySlip>): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.receiptId) newErrors.receiptId = 'انتخاب رسید الزامی است';
    if (!data.productName) newErrors.productName = 'نام محصول الزامی است';
    if (!data.amount || data.amount <= 0) newErrors.amount = 'مقدار باید بزرگتر از صفر باشد';
    if (!data.deliveryDate) newErrors.deliveryDate = 'تاریخ تحویل الزامی است';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ذخیره حواله تملیکی جدید
  const handleSaveDelivery = useCallback(async (deliveryData: Partial<OwnershipDeliverySlip>) => {
    if (!validateForm(deliveryData)) return;

    setIsSaving(true);
    try {
      const newDelivery: OwnershipDeliverySlip = {
        id: Date.now().toString(),
        receiptId: deliveryData.receiptId!,
        transactionNumber: generateTransactionNumber(),
        deliveryDate: deliveryData.deliveryDate || new Date(),
        productName: deliveryData.productName!,
        siteId: deliveryData.siteId!,
        siteName: deliveryData.siteName!,
        tankId: deliveryData.tankId!,
        tankName: deliveryData.tankName!,
        amount: deliveryData.amount!,
        unit: deliveryData.unit || 'kg',
        remainingTankInventory: deliveryData.remainingTankInventory || 0,
        status: 'saved',
        notes: deliveryData.notes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // ذخیره در localStorage
      const existingDeliveries = storage.loadData('ownership-delivery-slips') || [];
      const updatedDeliveries = [...existingDeliveries, newDelivery];
      storage.saveData('ownership-delivery-slips', updatedDeliveries);

      // ثبت در لاگ سیستم
      logUserActivity({
        action: `ایجاد حواله تملیکی - شماره ${newDelivery.transactionNumber}`,
        category: 'release',
        page: 'حواله تملیکی',
        status: 'success',
        logNature: 'ایجاد',
        amount: newDelivery.amount,
        product: newDelivery.productName,
        newValue: {
          transactionNumber: newDelivery.transactionNumber,
          productName: newDelivery.productName,
          amount: newDelivery.amount,
          unit: newDelivery.unit,
          site: newDelivery.siteName,
          tank: newDelivery.tankName
        },
        details: {
          transactionNumber: newDelivery.transactionNumber,
          productName: newDelivery.productName,
          amount: newDelivery.amount,
          unit: newDelivery.unit,
          site: newDelivery.siteName,
          tank: newDelivery.tankName
        }
      });

      // به‌روزرسانی state
      setOwnershipDeliverySlips(prev => [...prev, newDelivery]);
      setIsAddingNew(false);
      setEditingSlip(null);
      setSelectedReceipt(null);
      setNewSlipData({
        deliveryDate: new Date(),
        amount: 0,
        unit: 'kg',
        status: 'draft',
        notes: ''
      });
      setErrors({});

      alert('حواله تملیکی با موفقیت ثبت شد');

    } catch (error) {
      console.error('خطا در ذخیره حواله:', error);
      setErrors({ general: 'خطا در ذخیره‌سازی. لطفاً دوباره تلاش کنید.' });
    } finally {
      setIsSaving(false);
    }
  }, [generateTransactionNumber]);

  // انتخاب رسید و انتقال اطلاعات به فرم
  const handleSelectReceipt = (receipt: WarehouseReceipt) => {
    setSelectedReceipt(receipt);
    setNewSlipData(prev => ({
      ...prev,
      receiptId: receipt.id,
      productName: receipt.productName,
      siteId: receipt.siteId,
      siteName: receipt.siteName,
      tankId: receipt.tankId,
      tankName: receipt.tankName,
      unit: receipt.unit,
      remainingTankInventory: calculateTankInventory(receipt.siteId, receipt.tankId).finalInventory
    }));
  };

  // تغییر مقادیر فرم
  const handleFormChange = (field: string, value: any) => {
    setNewSlipData(prev => ({ ...prev, [field]: value }));
    
    // محاسبه مجدد موجودی مخزن در صورت تغییر سایت یا مخزن
    if (field === 'siteId' || field === 'tankId') {
      const siteId = field === 'siteId' ? value : newSlipData.siteId;
      const tankId = field === 'tankId' ? value : newSlipData.tankId;
      if (siteId && tankId) {
        const inventory = calculateTankInventory(siteId, tankId);
        setNewSlipData(prev => ({ ...prev, remainingTankInventory: inventory.finalInventory }));
      }
    }

    // پاک کردن خطا برای این فیلد
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // پرینت حواله
  const handlePrint = useCallback((delivery: OwnershipDeliverySlip) => {
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
          @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700&display=swap');
          
          * { font-family: 'Vazirmatn', Arial, sans-serif; }
          
          body {
            margin: 0;
            padding: 20px;
            background: white;
            color: #1a1a1a;
            direction: rtl;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #059669;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .company-name {
            font-size: 24px;
            font-weight: 700;
            color: #065f46;
            margin-bottom: 8px;
          }
          
          .document-title {
            font-size: 20px;
            font-weight: 600;
            color: #374151;
            margin: 10px 0;
          }
          
          .transaction-number {
            font-size: 16px;
            color: #6b7280;
            background: #f3f4f6;
            padding: 8px 16px;
            border-radius: 6px;
            display: inline-block;
            margin-top: 10px;
          }
          
          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 30px 0;
          }
          
          .info-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
          }
          
          .info-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 15px;
            border-bottom: 2px solid #059669;
            padding-bottom: 8px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          
          .info-label {
            font-weight: 500;
            color: #6b7280;
          }
          
          .info-value {
            font-weight: 600;
            color: #1f2937;
          }
          
          .amount-highlight {
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
          }
          
          .amount-number {
            font-size: 24px;
            font-weight: 700;
          }
          
          .footer {
            margin-top: 50px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            color: #6b7280;
            font-size: 14px;
          }
          
          @media print {
            body { margin: 0; padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">شرکت انرژی پارس</div>
          <div class="document-title">حواله انبار تملیکی</div>
          <div class="transaction-number">شماره تراکنش: ${delivery.transactionNumber}</div>
        </div>
        
        <div class="info-section">
          <div class="info-card">
            <div class="info-title">اطلاعات محصول</div>
            <div class="info-row">
              <span class="info-label">نام محصول:</span>
              <span class="info-value">${delivery.productName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">واحد:</span>
              <span class="info-value">${delivery.unit}</span>
            </div>
            <div class="info-row">
              <span class="info-label">موجودی مخزن:</span>
              <span class="info-value">${formatPersianNumber(delivery.remainingTankInventory)} ${delivery.unit}</span>
            </div>
          </div>
          
          <div class="info-card">
            <div class="info-title">اطلاعات موقعیت</div>
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
          </div>
        </div>
        
        <div class="amount-highlight">
          <div>مقدار تحویل</div>
          <div class="amount-number">${formatPersianNumber(delivery.amount)} ${delivery.unit}</div>
        </div>
        
        ${delivery.notes ? `
        <div class="info-card">
          <div class="info-title">توضیحات</div>
          <div style="padding: 10px; background: white; border-radius: 4px;">
            ${delivery.notes}
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <div>تاریخ چاپ: ${formatPersianDate(new Date())}</div>
          <div style="margin-top: 10px;">این سند توسط سیستم مدیریت انبار تهیه شده است</div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 p-4 md:p-6">
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Package className="w-7 h-7 text-emerald-600" />
                حواله انبار تملیکی
              </h1>
              <p className="text-gray-600 mt-1">مدیریت و صدور حواله‌های تملیکی انبار</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddingNew(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              حواله جدید
            </button>
          </div>
        </div>

        {/* فیلترها و جستجو */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* جستجو */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="جستجو در محصولات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* فیلتر سایت */}
          <select
            value={selectedSite}
            onChange={(e) => {
              setSelectedSite(e.target.value);
              setSelectedTank('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">تمام سایت‌ها</option>
            {uniqueSites.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          {/* فیلتر مخزن */}
          <select
            value={selectedTank}
            onChange={(e) => setSelectedTank(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={!selectedSite}
          >
            <option value="">تمام مخازن</option>
            {uniqueTanks
              .filter(([id, name]) => {
                if (!selectedSite) return true;
                return availableReceipts.some(r => r.tankId === id && r.siteId === selectedSite);
              })
              .map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
          </select>

          {/* وضعیت */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {filteredReceipts.length} آیتم یافت شد
            </span>
          </div>
        </div>
      </div>

      {/* محتوای اصلی */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* جدول الف: اطلاعات کالا */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                جدول الف: اطلاعات کالا
              </h2>
              <div className="text-sm text-gray-500">
                کالاهای تملیکی موجود در مخزن
              </div>
            </div>
          </div>

          <div className="p-6">
            {Object.keys(groupedReceipts).length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">هیچ کالای تملیکی یافت نشد</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedReceipts).map(([receiptNumber, receipts]) => (
                  <div key={receiptNumber} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        شماره رسید: {receiptNumber}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {receipts.length} آیتم
                        </span>
                        <button
                          onClick={() => setShowDetails(showDetails === receiptNumber ? null : receiptNumber)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${showDetails === receiptNumber ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {receipts.map((receipt) => (
                        <div
                          key={receipt.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            selectedReceipt?.id === receipt.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-emerald-300'
                          }`}
                          onClick={() => handleSelectReceipt(receipt)}
                        >
                          <div className="space-y-2">
                            <div className="font-medium text-gray-900">{receipt.productName}</div>
                            <div className="text-sm text-gray-600">
                              <div>سایت: {receipt.siteName}</div>
                              <div>مخزن: {receipt.tankName}</div>
                              <div>مقدار: {formatPersianNumber(receipt.finalAmount)} {receipt.unit}</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                                تملیکی
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatPersianDate(receipt.receiptDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {showDetails === receiptNumber && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">کل موجودی</div>
                            <div className="font-semibold">
                              {formatPersianNumber(
                                receipts.reduce((sum, r) => sum + r.finalAmount, 0)
                              )} {receipts[0]?.unit}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">کل افت</div>
                            <div className="font-semibold text-red-600">
                              {formatPersianNumber(
                                receipts.reduce((sum, r) => sum + Math.abs(r.wastageWeight || 0), 0)
                              )} {receipts[0]?.unit}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">مقدار خالص</div>
                            <div className="font-semibold text-emerald-600">
                              {formatPersianNumber(
                                receipts.reduce((sum, r) => sum + (r.finalAmount - Math.abs(r.wastageWeight || 0)), 0)
                              )} {receipts[0]?.unit}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">وضعیت</div>
                            <div className="font-semibold text-emerald-600">فعال</div>
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

        {/* جدول ب: فرم صدور حواله */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              جدول ب: صدور حواله تملیکی
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {/* محاسبه موجودی مخزن */}
            {selectedReceipt && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-emerald-900">موجودی مخزن نسبت به سایت</h3>
                </div>
                {(() => {
                  const inventory = calculateTankInventory(selectedReceipt.siteId, selectedReceipt.tankId);
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>رسیدهای تملیکی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.totalOwnedReceipts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>رسیدهای امانی:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.totalConsignmentReceipts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>رسیدهای افت:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.totalWastageReceipts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>اضافه انبار:</span>
                        <span className="font-semibold">{formatPersianNumber(inventory.totalSurplusDocuments)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>حواله‌های تملیکی:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.totalOwnershipDeliveries)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>حواله‌های امانی:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.totalConsignmentDeliveries)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>افت حواله‌ها:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.totalWastageDeliveries)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>سندهای کسر:</span>
                        <span className="font-semibold">-{formatPersianNumber(inventory.totalDeductionDocuments)}</span>
                      </div>
                      <hr className="border-emerald-300" />
                      <div className="flex justify-between text-lg font-bold text-emerald-900">
                        <span>موجودی نهایی:</span>
                        <span>{formatPersianNumber(inventory.finalInventory)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* فرم حواله */}
            {isAddingNew && selectedReceipt ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    شماره رسید
                  </label>
                  <input
                    type="text"
                    value={selectedReceipt.transactionNumber}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نام محصول
                  </label>
                  <input
                    type="text"
                    value={selectedReceipt.productName}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    سایت و مخزن
                  </label>
                  <input
                    type="text"
                    value={`${selectedReceipt.siteName} - ${selectedReceipt.tankName}`}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مقدار تحویل
                    <span className="text-xs text-gray-500 mr-2">
                      (حداکثر: {formatPersianNumber(newSlipData.remainingTankInventory || 0)} {newSlipData.unit})
                    </span>
                  </label>
                  <input
                    type="number"
                    value={newSlipData.amount || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const clamped = Math.min(val, newSlipData.remainingTankInventory || 0);
                      handleFormChange('amount', clamped);
                    }}
                    max={newSlipData.remainingTankInventory}
                    min={0.1}
                    step={0.1}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      errors.amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    واحد: {newSlipData.unit}
                  </div>
                  {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاریخ تحویل
                  </label>
                  <PersianDatePicker
                    value={newSlipData.deliveryDate}
                    onChange={(date) => handleFormChange('deliveryDate', date)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    توضیحات
                  </label>
                  <textarea
                    value={newSlipData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    placeholder="توضیحات حواله..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleSaveDelivery(newSlipData)}
                    disabled={isSaving || !newSlipData.amount || newSlipData.amount <= 0}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
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
                  
                  <button
                    onClick={() => {
                      setIsAddingNew(false);
                      setSelectedReceipt(null);
                      setNewSlipData({
                        deliveryDate: new Date(),
                        amount: 0,
                        unit: 'kg',
                        status: 'draft',
                        notes: ''
                      });
                      setErrors({});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    لغو
                  </button>
                </div>

                {errors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{errors.general}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">برای صدور حواله، ابتدا کالایی از جدول الف انتخاب کنید</p>
              </div>
            )}

            {/* حواله‌های صادر شده */}
            {ownershipDeliverySlips.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-gray-600" />
                  حواله‌های صادر شده
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ownershipDeliverySlips.slice(-5).map((delivery) => (
                    <div
                      key={delivery.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{delivery.productName}</div>
                          <div className="text-xs text-gray-600">
                            {delivery.siteName} - {delivery.tankName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatPersianNumber(delivery.amount)} {delivery.unit}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePrint(delivery)}
                            className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                            title="پرینت"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <span className={`text-xs px-2 py-1 rounded ${
                            delivery.status === 'saved' 
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {delivery.status === 'saved' ? 'صادر شده' : 'پیش‌نویس'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnershipDeliverySlip;