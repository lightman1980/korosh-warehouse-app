import React, { useState, useCallback, useEffect } from 'react';
import { Save, X, FileCheck, Download, ArrowUpDown, Filter, FilterX, Minimize2, Maximize2 } from 'lucide-react';
import { useSortingAndFiltering } from '../../hooks/useSortingAndFiltering';
import { FieldWithTooltip } from './FieldWithTooltip';
import { ChartsSection } from './ChartsSection';
import { Receipt, Contract, DeliveryPermit, TableColumn } from '../../types/accounting';
import { formatPersianNumber, formatPersianDate } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import PersianDatePicker from '../Common/PersianDatePicker';

interface DeliveryPermitsTabProps {
  receipts: Receipt[];
  contracts: Contract[];
  deliveryPermits: DeliveryPermit[];
  searchTerm: string;
  handleSavePermit: (permit: Partial<any>, editingPermit: string | null) => void;
  handleDeletePermit: (permitId: string) => void;
  handleConfirmPermitTransfer: (permitId: string) => void;
  generateUniquePermitNumber: (date: Date) => string;
  isManagementLetterNumberUnique: (letterNumber: string, excludePermitId?: string) => boolean;
  calculateRemainingPermitAmount: (receiptId: string, contractId: string) => number;
  calculateRemainingTransferPermit: (receiptId: string, contractId: string) => number;
  calculateRemainingPermit: (receiptId: string, contractId: string) => number;
  calculateRemainingReceiptWithoutTransferPermit: (receiptId: string, contractId: string) => number;
  onTransferToWarehouseReceipt: (permitData: any) => void;
  hasWarehouseReceiptForPermit: (permitId: string) => boolean;
}

interface PermitWithReceipt extends DeliveryPermit {
  receipt?: Receipt;
  contract?: Contract;
  remainingReceiptWithoutTransferPermit?: number;
  voidReason?: string;
  isVoided?: boolean;
  permitDate?: string | Date;
  basisType?: string;
  remainingTransferPermit?: number;
}

export const DeliveryPermitsTab: React.FC<DeliveryPermitsTabProps> = ({ 
  receipts, 
  contracts, 
  deliveryPermits, 
  searchTerm,
  handleSavePermit,
  handleDeletePermit,
  handleConfirmPermitTransfer,
  // generateUniquePermitNumber, // unused
  isManagementLetterNumberUnique,
  calculateRemainingPermitAmount,
  calculateRemainingTransferPermit,
  calculateRemainingPermit,
  calculateRemainingReceiptWithoutTransferPermit,
  onTransferToWarehouseReceipt,
  hasWarehouseReceiptForPermit
}) => {
  const [showPermitForm, setShowPermitForm] = useState<string | null>(null);
  const [newPermit, setNewPermit] = useState<Partial<DeliveryPermit>>({});
  const [editingPermit, setEditingPermit] = useState<string | null>(null);
  const [updatedPermits, setUpdatedPermits] = useState<PermitWithReceipt[]>([]);
  const [showApproveForm, setShowApproveForm] = useState<string | null>(null);
  const [approveData, setApproveData] = useState<any>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, _setErrors] = useState<Record<string, string>>({});
  const [isPrinting, setIsPrinting] = useState(false);
  const [showColumnFilters, setShowColumnFilters] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isPermitTableMinimized, setIsPermitTableMinimized] = useState<boolean>(false);
  const storage = DataStorage.getInstance();

  useEffect(() => {
    const permitsData = deliveryPermits
      .filter((permit: DeliveryPermit) => {
        // نمایش تمام مجوزها به جز آنهایی که status === 'cancelled' هستند
        // مجوزهای voided باید نمایش داده شوند
        return permit.status !== 'cancelled';
      })
      .map(permit => {
        const receipt = receipts.find(r => r.id === permit.receiptId);
        const contract = contracts.find(c => c.id === receipt?.contractId);
        
        // محاسبه مقادير با ناديده گرفتن مجوزهاي ابطال شده
        const remainingPermitAmount = receipt && contract ? calculateRemainingPermitAmount(receipt.id, contract.id) : 0;
        const remainingPermit = receipt && contract ? calculateRemainingPermit(receipt.id, contract.id) : 0;
        const remainingTransferPermit = receipt && contract ? calculateRemainingTransferPermit(receipt.id, contract.id) : 0;
        const remainingReceiptWithoutTransferPermit = receipt && contract ? calculateRemainingReceiptWithoutTransferPermit(receipt.id, contract.id) : 0;
        
        return {
          ...permit,
          receipt,
          contract,
          remainingPermitAmount,
          remainingPermit,
          remainingTransferPermit,
          remainingReceiptWithoutTransferPermit,
          isVoided: permit.isVoided || false
        };
      }).filter(item => {
        if (!item.receipt) return false;
        
        // جستجو در تمام فيلدهاي جدول
        const searchLower = searchTerm.toLowerCase();
        if (!searchTerm) return true;
        
        // تبديل تمام مقادير به رشته براي جستجو
        const searchableFields = [
          item.receipt.transactionNumber,
          item.receipt.counterpartyName,
          item.managementLetterNumber,
          item.systemPermitNumber,
          item.status,
          item.event,
          (item as any).voidReason,
          item.permitAmount?.toString(),
          item.wastageAmount?.toString(),
          item.finalPermitAmount?.toString(),
          item.remainingReceiptWithoutTransferPermit?.toString(),
          (item as any).permitDate ? formatPersianDate(new Date((item as any).permitDate)) : '',
          item.approvalDate ? formatPersianDate(new Date(item.approvalDate)) : '',
          item.receipt.contractNumber,
          item.receipt.productName,
          item.receipt.receiptBasisAmount?.toString(),
          (item.receipt as any)?.deliveryDate ? formatPersianDate(new Date((item.receipt as any).deliveryDate)) : '',
          (item.contract as any)?.contractType,
          item.contract?.wastageRateValue?.toString(),
          item.contract?.unit
        ];
        
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(searchLower)
        );
      });
    
    setUpdatedPermits(permitsData);
  }, [deliveryPermits, receipts, contracts, searchTerm, calculateRemainingPermitAmount, calculateRemainingPermit, calculateRemainingTransferPermit, calculateRemainingReceiptWithoutTransferPermit]);

  const calculateRemainingPermitForEdit = useCallback((receiptId: string, contractId: string, currentPermitId?: string): number => {
    const contractReceipts = receipts.filter(r => r.contractId === contractId);
    const totalReceiptBasis = contractReceipts.reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
  
    const totalWastage = contractReceipts.reduce((sum, r) => {
      const contract = contracts.find(c => c.id === r.contractId);
      const wastagePercentage = contract?.wastageRateValue || 0.5;
      return sum + ((r.receiptBasisAmount || 0) * wastagePercentage / 100);
    }, 0);
  
      const deliveries = ((storage.loadData('deliveries') || []) as any[]);
      const contractDeliveries = deliveries.filter((d: any) =>
      d.contractId === contractId &&
      d.receiptId === receiptId &&
      (!currentPermitId || d.permitId !== currentPermitId) &&
      !d.isVoided // ناديده گرفتن حواله هاي ابطال شده
    );
    const totalDeliveries = contractDeliveries.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
  
    // ناديده گرفتن مجوزهاي ابطال شده در محاسبات
    const permits = deliveryPermits.filter(p => 
      p.receiptId === receiptId && 
      p.contractId === contractId &&
      (!currentPermitId || p.id !== currentPermitId) &&
      !p.isVoided // نکته کليدي: مجوزهاي ابطال شده را در محاسبات لحاظ نکن
    );
    const totalPermits = permits.reduce((sum: number, p: any) => sum + (p.permitAmount || 0), 0);
  
    return totalReceiptBasis - totalWastage - totalDeliveries - totalPermits;
  }, [receipts, contracts, storage, deliveryPermits]);

  // تابع کمکی برای محاسبه مقادیر مجوز
  const calculatePermitValues = useCallback((permitAmount: number, contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    const wastageRate = contract?.wastageRateValue || 0.5;
    const wastageAmount = permitAmount * wastageRate / 100;
    const finalPermitAmount = permitAmount - wastageAmount;
    return { wastageAmount, finalPermitAmount };
  }, [contracts]);

  const handleEditPermit = useCallback((permitId: string) => {
    const permit = updatedPermits.find(p => p.id === permitId);
    if (!permit) return;

    const hasWarehouseReceipt = hasWarehouseReceiptForPermit(permitId);
    const isIssued = permit.status === 'issued';
    const isDraft = permit.status === 'draft';
    const isVoided = permit.isVoided || false;
    // اصلاح شد: يکپارچه سازي رشته "درخواست اصلاحيه انبار" و بررسی undefined
    const hasCorrectionRequest = permit.event === 'درخواست اصلاحيه انبار';
    
    // ويرايش مجوز فقط در شرايط مجاز فعال است - شامل مجوزهای ابطال شده
    if (!isDraft && !isIssued && !hasCorrectionRequest && !isVoided) {
      alert('ويرايش مجوز فقط در وضعيت "پيش‌نويس" يا "صادر شده" يا با رخداد "درخواست اصلاحيه انبار" يا "ابطال شده" امکان‌پذير است.');
      return;
    }
    
    // اگر حواله صادر شده باشد، فقط در صورت وجود درخواست اصلاحيه انبار يا ابطال شده مي‌توان ويرايش کرد
    if (hasWarehouseReceipt && !hasCorrectionRequest && !isVoided) {
      alert('ويرايش مجوز امکان‌پذير نيست زيرا وضعيت آن "حواله صادر شده" است.');
      return;
    }
    
    const receipt = receipts.find(r => r.id === permit.receiptId);
    if (receipt) {
      const remainingForEdit = calculateRemainingPermitForEdit(receipt.id, receipt.contractId, permitId);
      const remainingPermit = calculateRemainingPermit(receipt.id, receipt.contractId);
      const remainingTransferPermit = calculateRemainingTransferPermit(receipt.id, receipt.contractId);
      setNewPermit({ 
        ...permit,
        // اصلاح: اطمينان از ذخیره صحیح event
        event: permit.event || '',
        ...(remainingForEdit !== undefined && { remainingPermitAmount: remainingForEdit }),
        ...(remainingPermit !== undefined && { remainingPermit }),
        ...(remainingTransferPermit !== undefined && { remainingTransferPermit }),
        ...((permit as any).basisType && { basisType: (permit as any).basisType }),
        ...((permit as any).permitDate && { permitDate: (permit as any).permitDate }),
        approvalDate: permit.approvalDate
      } as any);
    } else {
      setNewPermit({ 
        ...permit,
        // اصلاح: اطمينان از ذخیره صحیح event
        event: permit.event || '',
        ...((permit as any).permitDate && { permitDate: (permit as any).permitDate }),
        approvalDate: permit.approvalDate
      } as any);
    }

    setEditingPermit(permitId);
    setShowPermitForm(permit.receiptId);
  }, [updatedPermits, receipts, calculateRemainingPermitForEdit, calculateRemainingPermit, calculateRemainingTransferPermit, hasWarehouseReceiptForPermit]);

  const handleVoidPermit = useCallback((permitId: string) => {
    const permit = updatedPermits.find(p => p.id === permitId);
    if (!permit) return;
    
    // اصلاح شد: يکپارچه سازي رشته "درخواست اصلاحيه انبار"
    const hasCorrectionRequest = permit.event === 'درخواست اصلاحيه انبار';
    
    if (!hasCorrectionRequest) {
      alert('ابطال مجوز فقط در صورت وجود رخداد "درخواست اصلاحيه انبار" امکان‌پذير است.');
      return;
    }
    
    if (window.confirm('آيا از ابطال اين مجوز اطمينان داريد؟')) {
      // ابطال مجوز: حفظ تراکنش اما بدون تأثير در محاسبات
      const updatedPermit = { 
        ...permit, 
        status: 'voided',  // وضعیت به "ابطال شد" تغییر می‌کند
        updatedAt: new Date(),
        isVoided: true,  // اين فيلد نشان مي‌دهد که مجوز ابطال شده
        voidReason: 'ابطال توسط کاربر'  // دليل ابطال
      };
      
      handleSavePermit(updatedPermit, permitId);
      
      // به‌روزرسانی فوری state
      setUpdatedPermits(prev => prev.map(p => 
        p.id === permitId ? { ...p, ...updatedPermit } as PermitWithReceipt : p
      ));
      
      // به‌روزرساني حواله‌هاي انبار مرتبط با اين مجوز
      const deliveries = ((storage.loadData('deliveries') || []) as any[]);
      const updatedDeliveries = deliveries.map((d: any) => {
        if (d.permitId === permitId) {
          return { ...d, status: 'voided', isVoided: true, updatedAt: new Date() };
        }
        return d;
      });
      storage.saveData('deliveries', updatedDeliveries);
      
      // به‌روزرساني حواله‌هاي اماني
      const consignmentSlips = ((storage.loadData('consignment-delivery-slips') || []) as any[]);
      const updatedConsignmentSlips = consignmentSlips.map((s: any) => {
        if (s.permitId === permitId) {
          return { ...s, status: 'voided', isVoided: true, updatedAt: new Date() };
        }
        return s;
      });
      storage.saveData('consignment-delivery-slips', updatedConsignmentSlips);
      
      // به‌روزرسانی حواله‌های تملیکی
      const ownershipSlips = ((storage.loadData('ownership-delivery-slips') || []) as any[]);
      const updatedOwnershipSlips = ownershipSlips.map((s: any) => {
        if (s.permitId === permitId) {
          return { ...s, status: 'voided', isVoided: true, updatedAt: new Date() };
        }
        return s;
      });
      storage.saveData('ownership-delivery-slips', updatedOwnershipSlips);
      
      alert('مجوز با موفقيت ابطال شد. تراکنش در سيستم باقي مي‌ماند اما در محاسبات تأثيري نخواهد داشت.');
    }
  }, [updatedPermits, handleSavePermit, storage]);

  // کد جديد و اصلاح‌شده
const handleDeletePermitLocal = useCallback((permitId: string) => {
  const permit = updatedPermits.find(p => p.id === permitId);
  if (!permit) return;
  
  // فقط اجازه حذف در وضعيت "پيش‌نويس"
  if (permit.status !== 'draft') {
    alert('حذف مجوز فقط در وضعيت "پيش‌نويس" امکان‌پذير است.');
    return;
  }
  
  if (window.confirm('آيا از حذف کامل اين مجوز اطمينان داريد؟ اين عمليات قابل بازگشت نيست.')) {
    setIsDeleting(permitId);
    
    try {
      // 1. حذف از storage اصلي (منبع داده)
      const permits = ((storage.loadData('delivery-permits') || []) as any[]);
      const updatedPermitsInStorage = permits.filter((p: any) => p.id !== permitId);
      storage.saveData('delivery-permits', updatedPermitsInStorage);
      
      // 2. حذف حواله‌هاي مرتبط از storage
      const deliveries = ((storage.loadData('deliveries') || []) as any[]);
      const updatedDeliveries = deliveries.filter((d: any) => d.permitId !== permitId);
      storage.saveData('deliveries', updatedDeliveries);
      
      const consignmentSlips = ((storage.loadData('consignment-delivery-slips') || []) as any[]);
      const updatedConsignmentSlips = consignmentSlips.filter((s: any) => s.permitId !== permitId);
      storage.saveData('consignment-delivery-slips', updatedConsignmentSlips);
      
      const ownershipSlips = ((storage.loadData('ownership-delivery-slips') || []) as any[]);
      const updatedOwnershipSlips = ownershipSlips.filter((s: any) => s.permitId !== permitId);
      storage.saveData('ownership-delivery-slips', updatedOwnershipSlips);

      // 3. به‌روزرساني فوري state براي آپديت UI (بلافاصله تراکنش از جدول حذف مي‌شود)
      setUpdatedPermits(prev => prev.filter(p => p.id !== permitId));
      
      // 4. فراخواني تابع اصلي حذف از props براي همگام‌سازي با کامپوننت والد
      handleDeletePermit(permitId);
      
      alert('مجوز با موفقيت حذف شد.');
    } catch (error) {
      console.error('Error deleting permit:', error);
      alert('خطا در حذف مجوز. لطفاً دوباره تلاش کنيد.');
    } finally {
      setIsDeleting(null);
    }
  }
}, [updatedPermits, handleDeletePermit, storage]);

  const handleSavePermitForm = useCallback(() => {
    if (!newPermit.managementLetterNumber?.trim()) {
      alert('لطفاً شماره نامه مديريت را وارد کنيد.');
      return;
    }
    
    if (!isManagementLetterNumberUnique(newPermit.managementLetterNumber || '', editingPermit || undefined)) {
      alert('اين شماره نامه مديريت قبلاً استفاده شده است.');
      return;
    }
    
    if (!newPermit.permitAmount || newPermit.permitAmount <= 0) {
      alert('مقدار مجوز حواله بايد بزرگتر از صفر باشد.');
      return;
    }
    
    // بررسی اینکه آیا تاریخ مجوز و تاریخ تأیید هر دو حذف شده‌اند
    const permitDateValue = (newPermit as any).permitDate;
    const approvalDateValue = newPermit.approvalDate;
    const hasPermitDate = permitDateValue !== null && 
      permitDateValue !== undefined && 
      (typeof permitDateValue !== 'string' || permitDateValue !== '') &&
      !(permitDateValue instanceof Date && isNaN(permitDateValue.getTime()));
    const hasApprovalDate = approvalDateValue !== null && 
      approvalDateValue !== undefined && 
      (typeof approvalDateValue !== 'string' || approvalDateValue !== '') &&
      !(approvalDateValue instanceof Date && isNaN(approvalDateValue.getTime()));
    const bothDatesRemoved = !hasPermitDate && !hasApprovalDate;
    
    // اصلاح: بهبود مدیریت event
    let updatedPermit = { ...newPermit };
    
    // اطمينان از ذخیره صحیح event (بدون undefined)
    if (!updatedPermit.event) {
      updatedPermit.event = '';
    }

    // اگر هر دو تاریخ حذف شده‌اند، event "درخواست اصلاحيه انبار" را پاک کن
    if (bothDatesRemoved && editingPermit) {
      updatedPermit.event = '';
      updatedPermit.approvalDate = undefined;
      (updatedPermit as any).permitDate = undefined;
      
      // به‌روزرساني حواله‌هاي انبار مرتبط با اين مجوز براي حذف درخواست اصلاحيه
      const deliveries = ((storage.loadData('deliveries') || []) as any[]);
      const updatedDeliveries = deliveries.map((d: any) => {
        if (d.permitId === editingPermit) {
          return { ...d, event: '', updatedAt: new Date() };
        }
        return d;
      });
      storage.saveData('deliveries', updatedDeliveries);
      
      // به‌روزرساني حواله‌هاي اماني
      const consignmentSlips = ((storage.loadData('consignment-delivery-slips') || []) as any[]);
      const updatedConsignmentSlips = consignmentSlips.map((s: any) => {
        if (s.permitId === editingPermit) {
          return { ...s, event: '', updatedAt: new Date() };
        }
        return s;
      });
      storage.saveData('consignment-delivery-slips', updatedConsignmentSlips);
      
      // به‌روزرسانی حواله‌های تملیکی
      const ownershipSlips = ((storage.loadData('ownership-delivery-slips') || []) as any[]);
      const updatedOwnershipSlips = ownershipSlips.map((s: any) => {
        if (s.permitId === editingPermit) {
          return { ...s, event: '', updatedAt: new Date() };
        }
        return s;
      });
      storage.saveData('ownership-delivery-slips', updatedOwnershipSlips);
    }
    
    // محاسبه مقادير افت و مقدار نهايي مجوز
    const receipt = receipts.find(r => r.id === newPermit.receiptId);
    const contract = contracts.find(c => c.id === receipt?.contractId);
    let wastageAmount, finalPermitAmount;
    
    if (contract && newPermit.permitAmount) {
      const calculatedValues = calculatePermitValues(newPermit.permitAmount, contract.id);
      wastageAmount = calculatedValues.wastageAmount;
      finalPermitAmount = calculatedValues.finalPermitAmount;
    } else {
      const wastageRate = contract?.wastageRateValue || 0.5;
      wastageAmount = (newPermit.permitAmount || 0) * wastageRate / 100;
      finalPermitAmount = (newPermit.permitAmount || 0) - wastageAmount;
    }
    
    // تعیین وضعیت: اگر هر دو تاریخ وارد شده، وضعیت "صادر شده" شود
    let status: string;
    let isVoided: boolean | undefined;
    
    if (editingPermit) {
      const originalPermit = updatedPermits.find(p => p.id === editingPermit);
      const origIsVoided = originalPermit?.isVoided ?? false;
      const origStatus = originalPermit?.status ?? 'draft';
      
      if (origIsVoided) {
        status = 'issued';
        isVoided = false;
      } else if (bothDatesRemoved) {
        status = 'draft';
        isVoided = origIsVoided;
      } else if (hasPermitDate && hasApprovalDate) {
        status = 'issued';
        isVoided = false;
      } else {
        status = origStatus;
        isVoided = origIsVoided;
      }
    } else {
      // مجوز جدید: اگر هر دو تاریخ وارد شده "صادر شده" وگرنه "پیش‌نویس"
      status = (hasPermitDate && hasApprovalDate) ? 'issued' : 'draft';
      isVoided = false;
    }
    
    const permitData = {
      ...updatedPermit,
      permitDate: (updatedPermit as any).permitDate || null,
      approvalDate: updatedPermit.approvalDate || null,
      wastageAmount,
      finalPermitAmount,
      status,
      isVoided,
      updatedAt: new Date(),
      id: editingPermit || newPermit.id || `permit_${Date.now()}`
    };
    
    // اصلاح: ذخیره مستقیم در storage برای اطمینان از ذخیره صحیح
    console.log('Saving permit data:', permitData);
    
    // ذخیره مستقیم در storage
    const permits = ((storage.loadData('delivery-permits') || []) as any[]);
    if (editingPermit) {
      // ویرایش مجوز موجود
      const updatedPermitsInStorage = permits.map((p: any) => 
        p.id === editingPermit ? { ...p, ...permitData } : p
      );
      storage.saveData('delivery-permits', updatedPermitsInStorage);
    } else {
      // ایجاد مجوز جدید
      permits.push(permitData);
      storage.saveData('delivery-permits', permits);
    }
    
    // به‌روزرسانی فوری state برای نمایش سریع تغییرات
    setUpdatedPermits(prev => {
      if (editingPermit) {
        return prev.map(p => p.id === editingPermit ? { ...p, ...permitData } as PermitWithReceipt : p);
      } else {
        const receipt = receipts.find(r => r.id === permitData.receiptId);
        const contract = contracts.find(c => c.id === receipt?.contractId);
        return [...prev, { ...permitData, receipt, contract } as PermitWithReceipt];
      }
    });
    
    // همچنین handleSavePermit را برای همگام‌سازی با کامپوننت والد فراخوانی کن
    handleSavePermit(permitData, editingPermit);
    
    setShowPermitForm(null);
    setEditingPermit(null);
    setNewPermit({});
    
    if (editingPermit) {
      const originalPermit = updatedPermits.find(p => p.id === editingPermit);
      if (originalPermit && originalPermit.isVoided) {
        alert('مجوز با موفقيت ويرايش شد. وضعيت آن به "صادر شده" تغيير کرد و ابطال لغو شد.');
      } else if (bothDatesRemoved) {
        alert('مجوز با موفقيت ويرايش شد. وضعيت آن به "پيش‌نويس" تغيير کرد و رخداد "درخواست اصلاحيه انبار" حذف شد.');
      } else {
        alert('مجوز با موفقيت ويرايش شد.');
      }
    } else {
      alert('مجوز با موفقيت ايجاد شد. وضعيت آن "پيش‌نويس" است.');
    }
  }, [newPermit, editingPermit, handleSavePermit, isManagementLetterNumberUnique, calculateRemainingPermitAmount, calculateRemainingTransferPermit, calculateRemainingPermit, storage, updatedPermits, receipts, contracts, calculatePermitValues]);

  const handleSaveApproveForm = useCallback(() => {
    if (!approveData.permitAmount || approveData.permitAmount <= 0) {
      alert('مقدار مجوز حواله بايد بزرگتر از صفر باشد.');
      return;
    }
    
    // بررسي اينکه تاريخ مجوز و تاريخ تأييد مجوز وارد شده باشند
    if (!approveData.permitDate) {
      alert('لطفاً تاريخ مجوز را وارد کنيد.');
      return;
    }
    
    if (!approveData.approvalDate) {
      alert('لطفاً تاريخ تاييد مجوز را وارد کنيد.');
      return;
    }
    
    // تغيير: ابتدا اطلاعات را به WarehouseDeliveryManager.tsx منتقل کن
    const permit = updatedPermits.find(p => p.id === showApproveForm);
    if (permit) {
      const warehouseReceiptData = {
        permitId: permit.id,
        systemPermitNumber: permit.systemPermitNumber,
        managementLetterNumber: permit.managementLetterNumber,
        receiptNumber: permit.receipt?.transactionNumber,
        contractNumber: permit.receipt?.contractNumber,
        counterpartyName: permit.receipt?.counterpartyName,
        // مقادير مربوط به مجوز حواله
        permitAmount: permit.permitAmount, // مقدار مجوز حواله
        remainingTransferPermit: permit.remainingTransferPermit, // مانده مجوز حواله
        wastageAmount: permit.wastageAmount,
        finalPermitAmount: permit.finalPermitAmount,
        amount: permit.finalPermitAmount, // مقدار نهايي براي تحويل
        maxAmount: permit.finalPermitAmount, // حداکثر مقدار قابل تحويل
        contractId: permit.receipt?.contractId,
        receiptId: permit.receiptId,
        permitDate: approveData.permitDate,
        approvalDate: approveData.approvalDate,
        fromPermit: true
      };
      
      // ابتدا اطلاعات را منتقل کن
      onTransferToWarehouseReceipt(warehouseReceiptData);
      
      // سپس وضعيت را به "صادر شده" تغيير بده
      const updatedPermitData = {
        ...approveData,
        status: 'issued',
        approvalDate: approveData.approvalDate,
        permitDate: approveData.permitDate
      };
      
      handleSavePermit(updatedPermitData, showApproveForm!);
    }
    
    setShowApproveForm(null);
    setApproveData({});
    alert('مجوز با موفقيت تاييد شد. اطلاعات به صفحه حواله انبار منتقل گرديد.');
  }, [approveData, showApproveForm, handleSavePermit, updatedPermits, onTransferToWarehouseReceipt]);

  // تابع دانلود داده‌ها به صورت اکسل
  const handleDownloadData = useCallback(() => {
    try {
      // تبديل داده‌ها به فرمت مناسب براي اکسل
      const dataForExcel = updatedPermits.map(permit => {
        const contract = contracts.find(c => c.id === permit.contractId);
        const unit = contract?.unit || 'kg';
        const unitText = unit === 'kg' ? 'کيلوگرم' : 'تن';
        
        // تعيين وضعيت نمايشي
        let statusText = '';
        if (permit.isVoided) {
          statusText = 'ابطال شده';
        } else if (hasWarehouseReceiptForPermit(permit.id)) {
          statusText = 'حواله صادر شده';
        } else if (permit.status === 'used') {
          statusText = 'استفاده شده';
        } else if (permit.status === 'issued') {
          statusText = 'صادر شده';
        } else if (permit.status === 'cancelled') {
          statusText = 'ابطال شده';
        } else {
          statusText = 'پيش‌نويس';
        }
        
        // براي مجوزهاي ابطال شده، مقادير عددي را صفر نمايش مي‌دهيم
        const isVoided = permit.isVoided || false;
        
        return {
          'شماره مجوز': permit.systemPermitNumber || '',
          'شماره نامه مديريت': permit.managementLetterNumber || '',
          'شماره رسيد': permit.receipt?.transactionNumber || '',
          'شماره قرارداد': permit.receipt?.contractNumber || '',
          'طرف حساب': permit.receipt?.counterpartyName || '',
          'نوع محصول': permit.receipt?.productName || '',
          'مقدار مجوز حواله': isVoided ? '0' : `${formatPersianNumber(permit.permitAmount || 0)} ${unitText}`,
          'مقدار افت مجوز': isVoided ? '0' : `${formatPersianNumber(permit.wastageAmount || 0)} ${unitText}`,
          'مقدار مجوز بعد از کسر افت': isVoided ? '0' : `${formatPersianNumber(permit.finalPermitAmount || 0)} ${unitText}`,
          'مانده رسید فاقد مجوز حواله': isVoided ? '0' : `${formatPersianNumber(permit.remainingReceiptWithoutTransferPermit || 0)} ${unitText}`,
          'درصد افت قرارداد': contract ? `${contract.wastageRateValue || 0.5}%` : '',
          'تاريخ مجوز': (permit as any).permitDate ? formatPersianDate(new Date((permit as any).permitDate)) : '',
          'تاريخ تأييد مجوز': permit.approvalDate ? formatPersianDate(new Date(permit.approvalDate)) : '',
          'وضعيت': statusText,
          'رخداد': permit.event === 'درخواست اصلاحيه انبار' ? 'درخواست اصلاحيه انبار' : (permit.event || '-'),
          'دليل ابطال': isVoided ? (permit.voidReason || 'ابطال شده') : '-'
        };
      });

      // ايجاد CSV content با فرمت بهتر
      const headers = Object.keys(dataForExcel[0] || {});
      const csvContent = [
        headers.join(','),
        ...dataForExcel.map((row: any) => headers.map((header: string) => {
          // اطمينان از فرمت صحيح مقادير
          const value = row[header];
          // اگر مقدار شامل کاراکترهاي خاص باشد، آن را در کوتيشن قرار مي‌دهيم
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return `"${value}"`;
        }).join(','))
      ].join('\n');

      // ايجاد blob و دانلود فايل
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `delivery_permits_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('داده‌ها با موفقيت دانلود شد.');
    } catch (error) {
      console.error('Error downloading data:', error);
      alert('خطا در دانلود داده‌ها. لطفاً دوباره تلاش کنيد.');
    }
  }, [updatedPermits, contracts, hasWarehouseReceiptForPermit]);

  const handlePrintPermit = useCallback(async (permit: PermitWithReceipt) => {
    if (isPrinting) {
      alert('Print operation is currently in progress. Please wait.');
      return;
    }

    try {
      setIsPrinting(true);
      
      const permitForPrint = {
        ...permit,
        permitAmount: parseFloat(permit.permitAmount?.toString() || '0'),
        wastageAmount: parseFloat(permit.wastageAmount?.toString() || '0'),
        finalPermitAmount: parseFloat(permit.finalPermitAmount?.toString() || '0'),
        remainingReceiptWithoutTransferPermit: parseFloat(permit.remainingReceiptWithoutTransferPermit?.toString() || '0'),
      };
      
      // دريافت اطلاعات حواله انبار مرتبط با اين مجوز
      const deliveries = ((storage.loadData('deliveries') || []) as any[]);
      const warehouseReceipts = deliveries.filter((d: any) => d.permitId === permit.id);
      
      // ايجاد يک پنجره جديد براي پيش‌نمايش چاپ
      const printWindow = window.open('', '_blank', 'width=900,height=800,scrollbars=yes,resizable=yes');
      if (!printWindow) {
        setIsPrinting(false);
        alert('Could not open print window. Please allow popups for this site.');
        return;
      }
      
      // ارسال اطلاعات مجوز به پنجره چاپ
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="ltr" lang="en">
        <head>
          <meta charset="UTF-8">
          <title>DELIVERY PERMIT - ${permit.systemPermitNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            @page {
              margin: 8mm;
              size: A4;
            }
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Inter', sans-serif;
              direction: ltr;
              text-align: left;
              line-height: 1.5;
              background: #f8f9fa;
              color: #1a1a1a;
              font-size: 14px;
              padding: 5px;
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
            
            /* Header Section */
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
            
            .company-address {
              font-size: 11px;
              color: #64748b;
              line-height: 1.3;
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
            
            .document-details {
              flex: 1;
              text-align: right;
            }
            
            .detail-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
              font-size: 11px;
            }
            
            .detail-label {
              color: #64748b;
              font-weight: 500;
            }
            
            .detail-value {
              color: #1e293b;
              font-weight: 600;
            }
            
            /* Main Content */
            .content {
              margin-bottom: 25px;
            }
            
            /* Two Column Layout */
            .two-column {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            
            .info-section {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
            }
            
            .section-title {
              font-size: 12px;
              font-weight: 600;
              color: #475569;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            
            .info-item {
              display: flex;
              flex-direction: column;
            }
            
            .info-label {
              font-size: 10px;
              color: #64748b;
              margin-bottom: 2px;
              font-weight: 500;
            }
            
            .info-value {
              font-size: 12px;
              color: #1e293b;
              font-weight: 600;
            }
            
            /* Amount Section */
            .amount-highlight {
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
              border: 2px solid #3b82f6;
              border-radius: 10px;
              padding: 18px;
              text-align: center;
              margin: 20px 0;
              position: relative;
            }
            
            .amount-label {
              font-size: 12px;
              color: #1e40af;
              font-weight: 600;
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .amount-value {
              font-size: 19px;
              font-weight: 700;
              color: #1e3a8a;
              margin-bottom: 12px;
            }
            
            .amount-breakdown {
              display: flex;
              justify-content: center;
              gap: 30px;
            }
            
            .breakdown-item {
              text-align: center;
            }
            
            .breakdown-label {
              font-size: 10px;
              color: #64748b;
              margin-bottom: 3px;
              font-weight: 500;
            }
            
            .breakdown-value {
              font-size: 13px;
              font-weight: 600;
              color: #334155;
            }
            
            /* Table Section */
            .table-section {
              margin: 20px 0;
            }
            
            .data-table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
              font-size: 11px;
            }
            
            .data-table thead {
              background: #f1f5f9;
            }
            
            .data-table th {
              padding: 10px 12px;
              text-align: left;
              font-weight: 600;
              color: #475569;
              border-bottom: 1px solid #e2e8f0;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .data-table td {
              padding: 10px 12px;
              text-align: left;
              border-bottom: 1px solid #f1f5f9;
              color: #1e293b;
              font-weight: 500;
            }
            
            .data-table tbody tr:hover {
              background: #f8fafc;
            }
            
            .data-table tbody tr:last-child td {
              border-bottom: none;
            }
            
            .row-number {
              background: #f8fafc;
              font-weight: 600;
              text-align: center;
              color: #64748b;
            }
            
            .positive {
              color: #059669;
              font-weight: 600;
            }
            
            .negative {
              color: #dc2626;
              font-weight: 600;
            }
            
            /* Status Badge */
            .status-badge {
              display: inline-block;
              padding: 3px 10px;
              border-radius: 20px;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .status-issued {
              background: #d1fae5;
              color: #065f46;
              border: 1px solid #a7f3d0;
            }
            
            .status-draft {
              background: #f1f5f9;
              color: #475569;
              border: 1px solid #cbd5e1;
            }
            
            .status-cancelled {
              background: #fee2e2;
              color: #991b1b;
              border: 1px solid #fecaca;
            }
            
            /* Footer Section */
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #3b82f6;
            }
            
            .signatures {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 15px;
            }
            
            .signature-box {
              text-align: center;
              padding: 15px 8px;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              background: #fafbfc;
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
              margin: 0 auto 6px;
            }
            
            .signature-name {
              font-size: 9px;
              color: #64748b;
            }
            
            .footer-note {
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              margin-top: 12px;
              padding-top: 12px;
              border-top: 1px dashed #e2e8f0;
            }
            
            /* Alert Box */
            .alert-box {
              background: #fef3c7;
              border: 1px solid #fcd34d;
              border-radius: 6px;
              padding: 10px 14px;
              margin: 12px 0;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .alert-icon {
              color: #f59e0b;
              font-size: 14px;
            }
            
            .alert-text {
              font-size: 11px;
              color: #92400e;
              font-weight: 500;
            }
            
            /* Watermark */
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
            
            /* Page Break */
            .page-break {
              page-break-before: always;
            }
            
            /* Print Optimization */
            @media print {
              body {
                font-size: 13px;
                padding: 0;
              }
              
              .document {
                box-shadow: none;
                border: 2px solid #2563eb;
              }
              
              .amount-value {
                font-size: 18px;
              }
            }
            
            /* Print Button */
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
            
            .print-button:hover {
              background: #2563eb;
            }
            
            @media print {
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Document
          </button>
          
          <!-- Page 1: Permit Information -->
          <div class="document">
            <div class="watermark">KOUROSH</div>
            
            <!-- Header -->
            <header class="header">
              <div class="company-section">
                <img src="https://z-cdn-media.chatglm.cn/files/80aca498-526f-49d3-8bde-985daf1ef318_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4%20copy%20copy.jpg?auth_key=1791798053-818794251920419faec5d18c76e1cd49-0-c90f22440460d45cc17da360d919b61d" alt="Kourosh Food Industries Logo" class="company-logo">
                <div class="company-info">
                  <div class="company-name">KOUROSH FOOD INDUSTRIES</div>
                  <div class="company-address">
                    Tehran, Nil Street, No. 241<br>
                    Tel: +98 21 83893000<br>
                    www.kouroshfood.com
                  </div>
                </div>
              </div>
              
              <div class="document-title-section">
                <div class="document-type">Delivery Permit</div>
                <div class="document-title">WAREHOUSE DELIVERY PERMIT</div>
                <div class="document-number">#${permit.systemPermitNumber}</div>
              </div>
              
              <div class="document-details">
                <div class="detail-item">
                  <span class="detail-label">Issue Date:</span>
                  <span class="detail-value">${formatPersianDate(new Date())}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Permit Date:</span>
                  <span class="detail-value">${(permit as any).permitDate ? formatPersianDate(new Date((permit as any).permitDate)) : '-'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Approval Date:</span>
                  <span class="detail-value">${permit.approvalDate ? formatPersianDate(new Date(permit.approvalDate)) : '-'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <span class="status-badge ${permit.status === 'issued' ? 'status-issued' : permit.status === 'draft' ? 'status-draft' : 'status-cancelled'}">
                      ${permit.status === 'issued' ? 'ISSUED' : permit.status === 'draft' ? 'DRAFT' : 'CANCELLED'}
                    </span>
                  </span>
                </div>
              </div>
            </header>
            
            <!-- Main Content -->
            <div class="content">
              <!-- Two Column Info -->
              <div class="two-column">
                <div class="info-section">
                  <div class="section-title">Permit Information</div>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Management Letter No.</span>
                      <span class="info-value">${permit.managementLetterNumber}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Receipt No.</span>
                      <span class="info-value">${permit.receipt?.transactionNumber || '-'}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Contract No.</span>
                      <span class="info-value">${permit.receipt?.contractNumber || '-'}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Product Type</span>
                      <span class="info-value">${permit.receipt?.productName || '-'}</span>
                    </div>
                  </div>
                </div>
                
                <div class="info-section">
                  <div class="section-title">Party Information</div>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Counterparty</span>
                      <span class="info-value">${permit.receipt?.counterpartyName || '-'}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Unit</span>
                      <span class="info-value">${permit.contract?.unit === 'kg' ? 'KILOGRAM' : 'TON'}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Wastage Rate</span>
                      <span class="info-value">${(permit.contract?.wastageRateValue || 0.5)}%</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Event</span>
                      <span class="info-value">${permit.event === 'درخواست اصلاحيه انبار' ? 'WAREHOUSE ADJUSTMENT REQUEST' : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Amount Highlight -->
              <div class="amount-highlight">
                <div class="amount-label">Permit Amount</div>
                <div class="amount-value">
                  ${formatPersianNumber(permitForPrint.permitAmount)} ${permit.contract?.unit === 'kg' ? 'KG' : 'TON'}
                </div>
                <div class="amount-breakdown">
                  <div class="breakdown-item">
                    <div class="breakdown-label">Wastage Amount</div>
                    <div class="breakdown-value negative">${formatPersianNumber(permitForPrint.wastageAmount)}</div>
                  </div>
                  <div class="breakdown-item">
                    <div class="breakdown-label">Final Amount</div>
                    <div class="breakdown-value positive">${formatPersianNumber(permitForPrint.finalPermitAmount)}</div>
                  </div>
                  <div class="breakdown-item">
                    <div class="breakdown-label">Wastage %</div>
                    <div class="breakdown-value">${(permit.contract?.wastageRateValue || 0.5)}%</div>
                  </div>
                </div>
              </div>
              
              <!-- Alert for Special Events -->
              ${permit.event === 'درخواست اصلاحيه انبار' ? `
                <div class="alert-box">
                  <span class="alert-icon">?</span>
                  <span class="alert-text">This permit has a "WAREHOUSE ADJUSTMENT REQUEST" event.</span>
                </div>
              ` : ''}
              
              <!-- Details Table -->
              <div class="table-section">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th width="5%">#</th>
                      <th width="35%">Description</th>
                      <th width="20%">Amount</th>
                      <th width="10%">Unit</th>
                      <th width="30%">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="row-number">1</td>
                      <td>Delivery Permit Amount</td>
                      <td class="positive">${formatPersianNumber(permitForPrint.permitAmount)}</td>
                      <td>${permit.contract?.unit === 'kg' ? 'KG' : 'TON'}</td>
                      <td>-</td>
                    </tr>
                    <tr>
                      <td class="row-number">2</td>
                      <td>Permit Wastage Amount</td>
                      <td class="negative">${formatPersianNumber(permitForPrint.wastageAmount)}</td>
                      <td>${permit.contract?.unit === 'kg' ? 'KG' : 'TON'}</td>
                      <td>Wastage Rate: ${(permit.contract?.wastageRateValue || 0.5)}%</td>
                    </tr>
                    <tr>
                      <td class="row-number">3</td>
                      <td>Final Permit Amount After Wastage</td>
                      <td class="positive">${formatPersianNumber(permitForPrint.finalPermitAmount)}</td>
                      <td>${permit.contract?.unit === 'kg' ? 'KG' : 'TON'}</td>
                      <td>Deliverable Amount</td>
                    </tr>
                    <tr>
                      <td class="row-number">4</td>
                      <td>Remaining Receipt Without Transfer Permit</td>
                      <td>${formatPersianNumber(permitForPrint.remainingReceiptWithoutTransferPermit)}</td>
                      <td>${permit.contract?.unit === 'kg' ? 'KG' : 'TON'}</td>
                      <td>-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Footer -->
            <footer class="footer">
              <div class="signatures">
                <div class="signature-box">
                  <div class="signature-title">Planning</div>
                  <div class="signature-line"></div>
                  <div class="signature-name">Name & Signature</div>
                </div>
                <div class="signature-box">
                  <div class="signature-title">Managing Director</div>
                  <div class="signature-line"></div>
                  <div class="signature-name">Name & Signature</div>
                </div>
                <div class="signature-box">
                  <div class="signature-title">Warehouse Keeper</div>
                  <div class="signature-line"></div>
                  <div class="signature-name">Name & Signature</div>
                </div>
                <div class="signature-box">
                  <div class="signature-title">Site Manager</div>
                  <div class="signature-line"></div>
                  <div class="signature-name">Name & Signature</div>
                </div>
              </div>
              
              <div class="footer-note">
                This document was generated by Kourosh Food Industries Warehouse Management System<br>
                Print Date: ${formatPersianDate(new Date())} - ${new Date().toLocaleTimeString('fa-IR')} | Version: 2.0
              </div>
            </footer>
          </div>
          
          <!-- Page 2: Warehouse Receipt Information -->
          ${warehouseReceipts.length > 0 ? `
            <div class="page-break"></div>
            <div class="document">
              <div class="watermark">KOUROSH</div>
              
              <!-- Header -->
              <header class="header">
                <div class="company-section">
                  <img src="https://z-cdn-media.chatglm.cn/files/80aca498-526f-49d3-8bde-985daf1ef318_%D9%84%D9%88%DA%AF%D9%88%20%D8%B5%D9%86%D8%B9%D8%AA%20%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C%20%DA%A9%D9%88%D8%B1%D8%B4%20copy%20copy.jpg?auth_key=1791798053-818794251920419faec5d18c76e1cd49-0-c90f22440460d45cc17da360d919b61d" alt="Kourosh Food Industries Logo" class="company-logo">
                  <div class="company-info">
                    <div class="company-name">KOUROSH FOOD INDUSTRIES</div>
                    <div class="company-address">
                      Tehran, Nil Street, No. 241<br>
                      Tel: +98 21 83893000<br>
                      www.kouroshfood.com
                    </div>
                  </div>
                </div>
                
                <div class="document-title-section">
                  <div class="document-type">Warehouse Receipt</div>
                  <div class="document-title">WAREHOUSE RECEIPT DETAILS</div>
                  <div class="document-number">Permit: #${permit.systemPermitNumber}</div>
                </div>
                
                <div class="document-details">
                  <div class="detail-item">
                    <span class="detail-label">Issue Date:</span>
                    <span class="detail-value">${formatPersianDate(new Date())}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Receipt Count:</span>
                    <span class="detail-value">${warehouseReceipts.length}</span>
                  </div>
                </div>
              </header>
              
              <!-- Main Content -->
              <div class="content">
                <!-- Receipts Table -->
                <div class="table-section">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th width="5%">#</th>
                        <th width="20%">Receipt Number</th>
                        <th width="20%">Delivery Date</th>
                        <th width="20%">Amount</th>
                        <th width="15%">Unit</th>
                        <th width="20%">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${warehouseReceipts.map((receipt: any, index: number) => `
                        <tr>
                          <td class="row-number">${index + 1}</td>
                          <td>${receipt.receiptNumber || '-'}</td>
                          <td>${receipt.deliveryDate ? formatPersianDate(new Date(receipt.deliveryDate)) : '-'}</td>
                          <td class="positive">${formatPersianNumber(receipt.amount || 0)}</td>
                          <td>${receipt.unit || '-'}</td>
                          <td>
                            <span class="status-badge ${receipt.status === 'issued' ? 'status-issued' : receipt.status === 'draft' ? 'status-draft' : 'status-cancelled'}">
                              ${receipt.status === 'issued' ? 'ISSUED' : receipt.status === 'draft' ? 'DRAFT' : 'CANCELLED'}
                            </span>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
                
                <!-- Summary Section -->
                <div class="amount-highlight">
                  <div class="amount-label">Total Delivered Amount</div>
                  <div class="amount-value">
                    ${formatPersianNumber(warehouseReceipts.reduce((sum: number, r: any) => sum + (r.amount || 0), 0))} ${permit.contract?.unit === 'kg' ? 'KG' : 'TON'}
                  </div>
                </div>
              </div>
              
              <!-- Footer -->
              <footer class="footer">
                <div class="signatures">
                  <div class="signature-box">
                    <div class="signature-title">Warehouse Keeper</div>
                    <div class="signature-line"></div>
                    <div class="signature-name">Name & Signature</div>
                  </div>
                  <div class="signature-box">
                    <div class="signature-title">Recipient</div>
                    <div class="signature-line"></div>
                    <div class="signature-name">Name & Signature</div>
                  </div>
                  <div class="signature-box">
                    <div class="signature-title">Site Manager</div>
                    <div class="signature-line"></div>
                    <div class="signature-name">Name & Signature</div>
                  </div>
                  <div class="signature-box">
                    <div class="signature-title">Quality Control</div>
                    <div class="signature-line"></div>
                    <div class="signature-name">Name & Signature</div>
                  </div>
                </div>
                
                <div class="footer-note">
                  This document was generated by Kourosh Food Industries Warehouse Management System<br>
                  Print Date: ${formatPersianDate(new Date())} - ${new Date().toLocaleTimeString('fa-IR')} | Version: 2.0
                </div>
              </footer>
            </div>
          ` : ''}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // اطمينان از بارگذاري کامل محتوا قبل از چاپ
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setIsPrinting(false);
        }, 500);
      };
      
      // در صورتي که پنجره بسته شد، حالت چاپ را ريست کن
      printWindow.onbeforeunload = () => {
        setIsPrinting(false);
      };
    } catch (error) {
      console.error('Error during print:', error);
      setIsPrinting(false);
      alert('Error printing permit. Please try again.');
    }
  }, [isPrinting, formatPersianDate, storage]);
  
  const {
    sortConfig,
    columnFilters,
    handleSort,
    handleColumnFilterChange,
    clearColumnFilter,
    getSortedAndFilteredData
  } = useSortingAndFiltering(updatedPermits);

  const columns: TableColumn<PermitWithReceipt>[] = [
    {
      key: 'actions' as any,
      title: 'عمليات',
      sortable: false,
      filterable: false,
      width: 'w-40',
      render: (_, item) => {
        const isDraft = item.status === 'draft';
        const isIssued = item.status === 'issued';
        // اصلاح شد: يکپارچه سازي رشته "درخواست اصلاحيه انبار"
        const hasCorrectionRequest = item.event === 'درخواست اصلاحيه انبار';
        const isVoided = item.isVoided || false;
        const hasWarehouseReceipt = hasWarehouseReceiptForPermit(item.id);
        
        // تغيير: بررسي اينکه تاريخ مجوز و تاريخ تأييد مجوز وارد شده باشند
        const hasPermitDate = !!(item as any).permitDate;
        const hasApprovalDate = !!item.approvalDate;
        const canConfirmTransfer = hasPermitDate && hasApprovalDate;

        // براي عيب‌يابي: لاگ گرفتن از مقادير کليدي
        console.log(`Permit ID: ${item.id}, Event: "${item.event || ''}", hasCorrectionRequest: ${hasCorrectionRequest}, isVoided: ${isVoided}`);

        return (
          <div className="flex flex-col gap-1">
            {/* ويرايش مجوز: فعال در شرايط مشخص شده - شامل مجوزهای ابطال شده */}
            {((isDraft || isIssued || hasCorrectionRequest || isVoided) && !hasWarehouseReceipt) && (
              <button
                onClick={() => handleEditPermit(item.id)}
                className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700 transition-colors"
              >
                ويرايش مجوز
              </button>
            )}
            
            {/* تغيير: تاييد مجوز حواله: فقط در وضعيت "صادر شده" و بدون حواله انبار و با تاريخ‌هاي کامل */}
            {isIssued && !hasWarehouseReceipt && !isVoided && canConfirmTransfer && (
              <button
                onClick={() => handleConfirmPermitTransfer(item.id)}
                className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
              >
                تاييد مجوز حواله
              </button>
            )}

            {/* تغيير: حذف مجوز: فقط در وضعيت "پيش‌نويس" */}
            {isDraft && !hasWarehouseReceipt && (
              <button
                onClick={() => handleDeletePermitLocal(item.id)}
                disabled={isDeleting === item.id}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  isDeleting === item.id
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isDeleting === item.id ? 'در حال حذف...' : 'حذف مجوز'}
              </button>
            )}
            
            {/* اصلاح: ابطال مجوز در صورت وجود رخداد "درخواست اصلاحيه انبار" بدون نیاز به تاریخ‌ها */}
            {/* گزینه "ابطال مجوز" زمانی نمایش داده می‌شود که event "درخواست اصلاحيه انبار" باشد و مجوز ابطال نشده باشد */}
            {hasCorrectionRequest && !isVoided && (
              <button
                onClick={() => handleVoidPermit(item.id)}
                className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700 transition-colors"
              >
                ابطال مجوز
              </button>
            )}
            
            {/* پرينت مجوز */}
            <button
              onClick={() => handlePrintPermit(item)}
              disabled={isPrinting}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                isPrinting 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isPrinting ? 'در حال چاپ...' : 'پرينت مجوز'}
            </button>
          </div>
        );
      }
    },
    {
      key: 'systemPermitNumber',
      title: 'شماره مجوز',
      sortable: true,
      filterable: true,
      width: 'w-40'
    },
    {
      key: 'managementLetterNumber',
      title: 'شماره نامه مديريت',
      sortable: true,
      filterable: true,
      width: 'w-32'
    },
    {
      key: 'receiptNumber' as any,
      title: 'شماره رسيد',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => <span>{item.receipt?.transactionNumber}</span>
    },
    {
      key: 'contractNumber' as any,
      title: 'شماره قرارداد',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => <span>{item.receipt?.contractNumber}</span>
    },
    {
      key: 'counterpartyName' as any,
      title: 'طرف حساب',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => <span>{item.receipt?.counterpartyName}</span>
    },
    {
      key: 'permitAmount',
      title: 'مقدار مجوز حواله',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const unit = contract?.unit || 'kg';
        const isVoided = item.isVoided || false;
        return (
          <span className={isVoided ? 'text-gray-400 line-through' : ''}>
            {formatPersianNumber(value)} {unit === 'kg' ? 'کيلوگرم' : 'تن'}
          </span>
        );
      }
    },
    {
      key: 'wastageAmount',
      title: 'مقدار افت مجوز',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const unit = contract?.unit || 'kg';
        const isVoided = item.isVoided || false;
        return (
          <span className={`${isVoided ? 'text-gray-400 line-through' : 'text-red-600'}`}>
            {formatPersianNumber(value)} {unit === 'kg' ? 'کيلوگرم' : 'تن'}
          </span>
        );
      }
    },
    {
      key: 'finalPermitAmount',
      title: 'مقدار مجوز بعد از کسر افت',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const unit = contract?.unit || 'kg';
        const isVoided = item.isVoided || false;
        return (
          <span className={`${isVoided ? 'text-gray-400 line-through' : 'font-bold text-green-600'}`}>
            {formatPersianNumber(value)} {unit === 'kg' ? 'کيلوگرم' : 'تن'}
          </span>
        );
      }
    },
    {
      key: 'remainingReceiptWithoutTransferPermit',
      title: 'مانده رسید فاقد مجوز حواله',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const unit = contract?.unit || 'kg';
        const isVoided = item.isVoided || false;
        return (
          <FieldWithTooltip
            label="مانده رسید فاقد مجوز حواله"
            formula="(مانده مجوز حواله که در صفحه فاکتورها می‌باشد) - (تمام مقدار مجوز حواله‌هایی که برای این رسید انبار و این قرارداد ثبت شده است)"
          >
            <span className={`${isVoided ? 'text-gray-400 line-through' : 'font-bold text-indigo-600'}`}>
              {formatPersianNumber(value || 0)} {unit === 'kg' ? 'کيلوگرم' : 'تن'}
            </span>
          </FieldWithTooltip>
        );
      }
    },
    {
      key: 'permitDate' as any,
      title: 'تاريخ مجوز',
      sortable: true,
      filterable: true,
      width: 'w-40',
      render: (value) => value ? formatPersianDate(new Date(value)) : '-'
    },
    {
      key: 'approvalDate',
      title: 'تاريخ تاييد مجوز',
      sortable: true,
      filterable: true,
      width: 'w-40',
      render: (value) => value ? formatPersianDate(new Date(value)) : '-'
    },
    {
      key: 'status',
      title: 'وضعيت',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value, item) => {
        if (item.isVoided) {
          return (
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
              ابطال شده
            </span>
          );
        }
        
        if (hasWarehouseReceiptForPermit(item.id)) {
          return (
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
              حواله صادر شده
            </span>
          );
        }
        
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            value === 'used' ? 'bg-green-100 text-green-800' :
            value === 'issued' ? 'bg-blue-100 text-blue-800' :
            value === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {value === 'used' ? 'استفاده شده' :
             value === 'issued' ? 'صادر شده' :
             value === 'cancelled' ? 'ابطال شده' : 'پيش‌نويس'}
          </span>
        );
      }
    },
    {
      key: 'event',
      title: 'رخداد',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        // اصلاح شد: يکپارچه سازي رشته "درخواست اصلاحيه انبار" و بررسی undefined
        if (item.event === 'درخواست اصلاحيه انبار') {
          return (
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
              درخواست اصلاحيه انبار
            </span>
          );
        }
        return <span>-</span>;
      }
    },
    {
      key: 'voidReason',
      title: 'دليل ابطال',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        if (item.isVoided) {
          return (
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
              {item.voidReason || 'ابطال شده'}
            </span>
          );
        }
        return <span>-</span>;
      }
    }
  ];

  const renderRow = (item: PermitWithReceipt) => (
    <tr key={item.id} className={`hover:bg-gray-50 ${
      item.isVoided ? 'bg-gray-100' :
      hasWarehouseReceiptForPermit(item.id) ? 'bg-indigo-50' :
      item.status === 'used' ? 'bg-green-100' : 
      item.status === 'issued' ? 'bg-blue-50' : 
      item.status === 'cancelled' ? 'bg-red-100' : 'bg-yellow-50'
    }`}>
      {columns.map(column => (
        <td key={String(column.key)} className="px-2 py-3 text-sm text-gray-900">
          {column.render 
            ? column.render(item[column.key as keyof PermitWithReceipt], item)
            : String(item[column.key as keyof PermitWithReceipt] ?? '')}
        </td>
      ))}
    </tr>
  );

  const renderFooter = (data: PermitWithReceipt[]) => {
    // فيلتر کردن مجوزهاي ابطال شده براي محاسبات
    const nonVoidedData = data.filter(item => !item.isVoided);
    
    return (
      <tr className="bg-gray-100 font-bold">
        <td className="px-2 py-3 text-sm font-medium text-gray-900">جمع کل:</td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900"></td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900"></td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900"></td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900"></td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900"></td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900">
          {formatPersianNumber(nonVoidedData.reduce((sum, item) => sum + (item.permitAmount || 0), 0))}
        </td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900">
          {formatPersianNumber(nonVoidedData.reduce((sum, item) => sum + (item.wastageAmount || 0), 0))}
        </td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900">
          {formatPersianNumber(nonVoidedData.reduce((sum, item) => sum + (item.finalPermitAmount || 0), 0))}
        </td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900">
          {formatPersianNumber(nonVoidedData.reduce((sum, item) => sum + (item.remainingReceiptWithoutTransferPermit || 0), 0))}
        </td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900"></td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900"></td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900"></td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900"></td>
        <td className="px-2 py-3 text-sm font-bold text-gray-900"></td>
      </tr>
    );
  };

  // تابع براي تغيير وضعيت نمايش فيلتر ستون
  const toggleColumnFilterVisibility = useCallback((columnKey: string) => {
    setShowColumnFilters(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  }, []);

  // تابع براي اعمال فيلتر روي ستون
  const applyColumnFilter = useCallback((columnKey: string, filterValue: string) => {
    handleColumnFilterChange(columnKey, filterValue);
  }, [handleColumnFilterChange]);

  // تابع براي پاک کردن فيلتر ستون
  const clearColumnFilterLocal = useCallback((columnKey: string) => {
    clearColumnFilter(columnKey);
  }, [clearColumnFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            مجوزها ({formatPersianNumber(updatedPermits.length)})
          </h3>
          <button
            onClick={() => setIsPermitTableMinimized(!isPermitTableMinimized)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isPermitTableMinimized ? (
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
        <button
          onClick={handleDownloadData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          دانلود داده‌ها
        </button>
      </div>
      
      {!isPermitTableMinimized && (
      <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
            {columns.map(column => (
  <th
    key={String(column.key)}
    className={`px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width || ''}`}
  >
    <div className="flex items-center justify-between">
      <span>{column.title}</span>
      <div className="flex items-center gap-1">
        {column.sortable && (
          <button
            onClick={() => handleSort(column.key)}
            className={`p-1 rounded hover:bg-gray-200 ${
              sortConfig?.key === column.key ? 'text-blue-600' : 'text-gray-400'
            }`}
            title="مرتب‌سازي"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortConfig?.key === column.key && (
              <span className="text-xs">
                {sortConfig?.direction === 'asc' ? ' ?' : ' ?'}
              </span>
            )}
          </button>
        )}
        {column.filterable && (
          <div className="relative">
            <button
              onClick={() => toggleColumnFilterVisibility(column.key)}
              className={`p-1 rounded hover:bg-gray-200 ${
                columnFilters[column.key] ? 'text-blue-600' : 'text-gray-400'
              }`}
              title="فيلتر"
            >
              <Filter className="h-3 w-3" />
            </button>
            
            {showColumnFilters[column.key] && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 p-2 border border-gray-200">
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="جستجو..."
                    value={columnFilters[column.key] || ''}
                    onChange={(e) => applyColumnFilter(column.key, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      clearColumnFilterLocal(column.key);
                      toggleColumnFilterVisibility(column.key);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <FilterX className="h-3 w-3" />
                    پاک کردن
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </th>
))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getSortedAndFilteredData.map((item) => renderRow(item))}
          </tbody>
          <tfoot className="bg-gray-100">
            {renderFooter(getSortedAndFilteredData)}
          </tfoot>
        </table>
      </div>
      )}
      
      <ChartsSection 
        activeTab="permits"
        uninvoicedReceipts={[]}
        invoicedReceipts={[]}
        deliveryPermitsData={getSortedAndFilteredData}
      />
      
      {showPermitForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPermit ? 'ويرايش مجوز حواله' : 'صدور مجوز حواله'}
              </h3>
              <button
                onClick={() => {
                  setShowPermitForm(null);
                  setEditingPermit(null);
                  setNewPermit({});
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="شماره مجوز"
                  formula="شماره يکتاي مجوز"
                >
                  <input
                    type="text"
                    value={newPermit.systemPermitNumber || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </FieldWithTooltip>
              </div>
              
              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="شماره نامه مديريت"
                  formula="شماره نامه مديريت براي مجوز"
                >
                  <input
                    type="text"
                    value={newPermit.managementLetterNumber || ''}
                    onChange={(e) => setNewPermit({ ...newPermit, managementLetterNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="شماره نامه مديريت"
                    required
                  />
                </FieldWithTooltip>
              </div>
              
              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="نوع مبناي محاسبه"
                  formula="انتخاب نوع مبناي محاسبه براي مجوز"
                >
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="basisType"
                        value="remainingReceiptWithoutTransferPermit"
                        checked={(newPermit as any).basisType === 'remainingReceiptWithoutTransferPermit'}
                        onChange={(e) => {
                          const basisType = e.target.value;
                          const receipt = receipts.find(r => r.id === newPermit.receiptId);
                          const contract = contracts.find(c => c.id === receipt?.contractId);
                          
                          if (receipt && contract) {
                            const newPermitAmount = (newPermit as any).remainingReceiptWithoutTransferPermit || 0;
                            const wastageAmount = newPermitAmount * (contract.wastageRateValue || 0.5) / 100;
                            const finalPermitAmount = newPermitAmount - wastageAmount;
                            
                            setNewPermit({
                              ...newPermit,
                              ...(basisType && { basisType }),
                              permitAmount: newPermitAmount,
                              wastageAmount,
                              finalPermitAmount
                            } as any);
                          }
                        }}
                        className="ml-2"
                      />
                      مانده رسید فاقد مجوز حواله
                    </label>
                  </div>
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label="مقدار مجوز حواله"
                  formula="مقدار قابل تايپ توسط کاربر"
                >
                  <input
                    type="number"
                    value={newPermit.permitAmount || 0}
                    onChange={(e) => {
                      let permitAmount = parseFloat(e.target.value) || 0;
                      const receipt = receipts.find(r => r.id === newPermit.receiptId);
                      const contract = contracts.find(c => c.id === receipt?.contractId);
                      
                      if (receipt && contract) {
                        const maxAmount = (newPermit as any).remainingReceiptWithoutTransferPermit || 0;
                        
                        if (permitAmount > maxAmount) {
                          permitAmount = maxAmount;
                        }
                        
                        const { wastageAmount, finalPermitAmount } = calculatePermitValues(permitAmount, contract.id);
                        
                        setNewPermit({
                          ...newPermit,
                          permitAmount,
                          wastageAmount,
                          finalPermitAmount
                        });
                      } else {
                        setNewPermit({
                          ...newPermit,
                          permitAmount
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    required
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    حداکثر مقدار: {formatPersianNumber((newPermit as any).remainingReceiptWithoutTransferPermit || 0)}
                  </div>
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label="مقدار افت مجوز"
                  formula="(مقدار مجوز حواله) × (درصد افت قرارداد)"
                >
                  <input
                    type="number"
                    value={newPermit.wastageAmount || 0}
                    onChange={(e) => {
                      const wastageAmount = parseFloat(e.target.value) || 0;
                      const permitAmount = (newPermit.permitAmount || 0) + wastageAmount;
                      setNewPermit({
                        ...newPermit,
                        wastageAmount,
                        finalPermitAmount: permitAmount - wastageAmount
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label="مقدار مجوز بعد از کسر افت"
                  formula="(مقدار مجوز حواله) - (مقدار افت مجوز)"
                >
                  <input
                    type="number"
                    value={newPermit.finalPermitAmount || 0}
                    onChange={(e) => {
                      const finalPermitAmount = parseFloat(e.target.value) || 0;
                      const wastageAmount = (newPermit.permitAmount || 0) - finalPermitAmount;
                      setNewPermit({
                        ...newPermit,
                        finalPermitAmount,
                        wastageAmount: Math.max(0, wastageAmount)
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label="مانده رسید فاقد مجوز حواله"
                  formula="(مانده مجوز حواله که در صفحه فاکتورها می‌باشد) - (تمام مقدار مجوز حواله‌هایی که برای این رسید انبار و این قرارداد ثبت شده است)"
                >
                  <input
                    type="number"
                    value={(newPermit as any).remainingReceiptWithoutTransferPermit || 0}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </FieldWithTooltip>
              </div>

              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="تاريخ مجوز"
                  formula="تاريخي که کاربر در صفحه فاکتورها نسبت به صدور مجوز اقدام کرده"
                >
                  <div className="relative">
                    <PersianDatePicker
                      value={(newPermit as any).permitDate || null}
                      onChange={(date) => setNewPermit({ ...newPermit, permitDate: date || null } as any)}
                      placeholder="انتخاب تاريخ مجوز"
                      className="w-full"
                    />
                    {(newPermit as any).permitDate && (
                      <button
                        type="button"
                        onClick={() => setNewPermit({ ...newPermit, permitDate: null } as any)}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </FieldWithTooltip>
              </div>

              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="تاريخ تاييد مجوز"
                  formula="تاريخ تاييد مجوز توسط مديريت"
                >
                  <div className="relative">
                    <PersianDatePicker
                      value={newPermit.approvalDate || null}
                      onChange={(date) => setNewPermit({ ...newPermit, approvalDate: date || null })}
                      placeholder="انتخاب تاريخ تاييد مجوز"
                      className="w-full"
                    />
                    {newPermit.approvalDate && (
                      <button
                        type="button"
                        onClick={() => setNewPermit({ ...newPermit, approvalDate: null })}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </FieldWithTooltip>
              </div>

              {/* اصلاح: نمایش فیلد رخداد برای تمام مجوزها (نه فقط در حال ویرایش) */}
              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="رخداد"
                  formula="وضعيت رخداد مجوز"
                >
                  <select
                    value={newPermit.event || ''}
                    onChange={(e) => setNewPermit({ ...newPermit, event: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">بدون رخداد</option>
                    <option value="درخواست اصلاحيه انبار">درخواست اصلاحيه انبار</option>
                  </select>
                </FieldWithTooltip>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPermitForm(null);
                  setEditingPermit(null);
                  setNewPermit({});
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSavePermitForm}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Save className="h-4 w-4 mr-1" />
                {editingPermit ? 'ويرايش مجوز' : 'ذخيره مجوز'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showApproveForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <FileCheck className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-bold text-green-800">فرم تاييد مجوز حواله</h3>
              </div>
              <button
                onClick={() => {
                  setShowApproveForm(null);
                  setApproveData({});
                }}
                className="text-green-600 hover:text-green-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="شماره نامه مديريت"
                  formula="شماره نامه مديريت براي مجوز"
                >
                  <input
                    type="text"
                    value={approveData.managementLetterNumber || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label="مقدار مجوز حواله"
                  formula="مقدار قابل تايپ توسط کاربر"
                >
                  <input
                    type="number"
                    value={approveData.permitAmount || 0}
                    onChange={(e) => {
                      let permitAmount = parseFloat(e.target.value) || 0;
                      const permit = updatedPermits.find(p => p.id === showApproveForm);
                      const receipt = receipts.find(r => r.id === permit?.receiptId);
                      const contract = contracts.find(c => c.id === receipt?.contractId);
                      
                      if (receipt && contract) {
                        const maxAmount = approveData.remainingReceiptWithoutTransferPermit || 0;
                        
                        if (permitAmount > maxAmount) {
                          permitAmount = maxAmount;
                        }
                        
                        const wastageAmount = permitAmount * (contract.wastageRateValue || 0.5) / 100;
                        const finalPermitAmount = permitAmount - wastageAmount;
                        
                        setApproveData({
                          ...approveData,
                          permitAmount,
                          wastageAmount,
                          finalPermitAmount
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    required
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    حداکثر مقدار: {formatPersianNumber(approveData.remainingReceiptWithoutTransferPermit || 0)}
                  </div>
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label="مقدار افت مجوز"
                  formula="(مقدار مجوز حواله) × (درصد افت قرارداد)"
                >
                  <input
                    type="number"
                    value={approveData.wastageAmount || 0}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label="مقدار مجوز بعد از کسر افت"
                  formula="(مقدار مجوز حواله) - (مقدار افت مجوز)"
                >
                  <input
                    type="number"
                    value={approveData.finalPermitAmount || 0}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label="مانده رسید فاقد مجوز حواله"
                  formula="(مانده مجوز حواله که در صفحه فاکتورها می‌باشد) - (تمام مقدار مجوز حواله‌هایی که برای این رسید انبار و این قرارداد ثبت شده است)"
                >
                  <input
                    type="number"
                    value={approveData.remainingReceiptWithoutTransferPermit || 0}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </FieldWithTooltip>
              </div>

              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="تاريخ مجوز"
                  formula="تاريخي که کاربر در صفحه فاکتورها نسبت به صدور مجوز اقدام کرده"
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={approveData.permitDate ? formatPersianDate(new Date(approveData.permitDate)) : ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                    {approveData.permitDate && (
                      <button
                        type="button"
                        onClick={() => setApproveData({ ...approveData, permitDate: null })}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </FieldWithTooltip>
              </div>

              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="تاريخ تاييد مجوز"
                  formula="تاريخ تاييد مجوز توسط مديريت"
                >
                  <div className="relative">
                    <PersianDatePicker
                      value={approveData.approvalDate}
                      onChange={(date) => setApproveData({ ...approveData, approvalDate: date })}
                      placeholder="انتخاب تاريخ تاييد مجوز"
                      className="w-full"
                    />
                    {approveData.approvalDate && (
                      <button
                        type="button"
                        onClick={() => setApproveData({ ...approveData, approvalDate: null })}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </FieldWithTooltip>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowApproveForm(null);
                  setApproveData({});
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveApproveForm}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Save className="h-4 w-4 mr-1" />
                تاييد و انتقال به حواله انبار
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}