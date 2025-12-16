// برنامه PermitForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FieldWithTooltip } from './FieldWithTooltip';
import { SimplePersianDateField } from './SimplePersianDateField';
import { DeliveryPermit, Receipt, Contract } from '../../types/accounting';
import { formatPersianNumber, getContractUnit, isManagementLetterNumberUnique } from '../../utils/persian';
import { AlertTriangle, Save, X, Calculator } from 'lucide-react';

interface PermitFormProps {
  permit?: Partial<DeliveryPermit>;
  receiptId?: string;
  onSave: (permit: Partial<DeliveryPermit>, editingPermitId: string | null) => void;
  onCancel: () => void;
  editingPermitId?: string | null;
  receipts: Receipt[];
  contracts: Contract[];
  deliveryPermits: DeliveryPermit[];
}

export const PermitForm: React.FC<PermitFormProps> = ({
  permit,
  receiptId,
  onSave,
  onCancel,
  editingPermitId,
  receipts,
  contracts,
  deliveryPermits
}) => {
  const [formData, setFormData] = useState<Partial<DeliveryPermit>>({
    systemPermitNumber: '',
    managementLetterNumber: '',
    permitAmount: 0,
    wastageAmount: 0,
    finalPermitAmount: 0,
    remainingPermit: 0,
    status: 'draft' as const,
    ...permit
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const receipt = receipts.find(r => r.id === receiptId);
  const contract = contracts.find(c => c.id === receipt?.contractId);

  // محاسبه مانده مجوز حواله با فرمول جدید
  const calculateRemainingPermitAmount = useCallback((receipt: Receipt, contract: Contract): number => {
    // فرمول: (مقدار مبنای رسید) - (وزن افت قرارداد)
    const wastageAmount = receipt.receiptBasisAmount * (contract.wastageRateValue || 0.5) / 100;
    return receipt.receiptBasisAmount - wastageAmount;
  }, []);

  // محاسبه مانده مجوز حواله پس از کسر مجوزهای صادر شده
  const calculateRemainingAfterPermits = useCallback((receipt: Receipt, contract: Contract, excludePermitId?: string): number => {
    const remainingPermitAmount = calculateRemainingPermitAmount(receipt, contract);
    
    // محاسبه مجموع مجوزهای صادر شده برای این رسید
    const existingPermits = deliveryPermits.filter(p => 
      p.receiptId === receipt.id && 
      p.status !== 'cancelled' && 
      p.status !== 'deleted' &&
      p.id !== excludePermitId
    );
    
    const totalPermitted = existingPermits.reduce((sum, p) => sum + (p.permitAmount || 0), 0);
    return remainingPermitAmount - totalPermitted;
  }, [deliveryPermits, calculateRemainingPermitAmount]);

  useEffect(() => {
    if (permit) {
      // محاسبه مجدد مانده مجوز حواله هنگام ویرایش
      const remainingAfterPermits = calculateRemainingAfterPermits(receipt!, contract!, editingPermitId);
      const remainingPermit = remainingAfterPermits - (permit.permitAmount || 0);
      
      setFormData({
        ...permit,
        status: 'draft',
        remainingPermit
      });
    } else if (receipt && contract) {
      // محاسبه مقدار پیش‌فرض برای مجوز جدید
      const remainingAfterPermits = calculateRemainingAfterPermits(receipt, contract);
      
      setFormData({
        systemPermitNumber: `MP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        managementLetterNumber: '',
        permitAmount: remainingAfterPermits,
        wastageAmount: 0,
        finalPermitAmount: 0,
        remainingPermit: remainingAfterPermits,
        status: 'draft',
        receiptId,
        contractId: receipt.contractId
      });
    }
  }, [permit, receiptId, receipt, contracts, calculateRemainingAfterPermits, editingPermitId]);

  const handleInputChange = useCallback((field: keyof DeliveryPermit, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePermitAmountChange = useCallback((value: number) => {
    if (!receipt || !contract) return;
    
    const wastagePercentage = contract?.wastageRateValue || 0.5;
    const wastageAmount = value * (wastagePercentage / 100);
    const finalPermitAmount = value - wastageAmount;
    
    // محاسبه مانده مجاز با فرمول جدید
    const remainingAfterPermits = calculateRemainingAfterPermits(receipt, contract, editingPermitId);
    
    // کنترل مقدار مجوز حواله
    if (value > remainingAfterPermits) {
      alert(`مقدار مجوز حواله نمی‌تواند بیشتر از ${formatPersianNumber(remainingAfterPermits)} باشد.`);
      return;
    }
    
    // محاسبه مانده پس از کسر مقدار فعلی
    const remainingAfterPermit = remainingAfterPermits - value;
    
    setFormData(prev => ({
      ...prev,
      permitAmount: value,
      wastageAmount,
      finalPermitAmount,
      remainingPermit: remainingAfterPermit
    }));
  }, [receipt, contract, calculateRemainingAfterPermits, editingPermitId]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    // کنترل شماره نامه مدیریت
    if (!formData.managementLetterNumber?.trim()) {
      newErrors.managementLetterNumber = 'شماره نامه مدیریت الزامی است';
    }
    
    // کنترل منحصر به فرد بودن شماره نامه مدیریت
    if (!isManagementLetterNumberUnique(formData.managementLetterNumber || '', deliveryPermits, editingPermitId)) {
      newErrors.managementLetterNumber = 'این شماره نامه مدیریت قبلاً استفاده شده است';
    }
    
    // کنترل مقدار مجوز حواله
    if (!formData.permitAmount || formData.permitAmount <= 0) {
      newErrors.permitAmount = 'مقدار مجوز حواله باید بزرگتر از صفر باشد';
    }
    
    // کنترل مقدار مجوز حواله نسبت به مانده مجاز
    if (receipt && contract) {
      const remainingAfterPermits = calculateRemainingAfterPermits(receipt, contract, editingPermitId);
      if (formData.permitAmount && formData.permitAmount > remainingAfterPermits) {
        newErrors.permitAmount = `مقدار مجوز حواله نمی‌تواند بیشتر از ${formatPersianNumber(remainingAfterPermits)} باشد`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, receipt, contract, deliveryPermits, editingPermitId, calculateRemainingAfterPermits]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // بررسی نهایی مقدار مجوز حواله
    if (receipt && contract) {
      const remainingAfterPermits = calculateRemainingAfterPermits(receipt, contract, editingPermitId);
      if (formData.permitAmount && formData.permitAmount > remainingAfterPermits) {
        alert(`مقدار مجوز حواله نمی‌تواند بیشتر از ${formatPersianNumber(remainingAfterPermits)} باشد.`);
        return;
      }
    }
    
    onSave(formData, editingPermitId || null);
    
    // نمایش پیام مناسب
    if (editingPermitId) {
      alert('مجوز با موفقیت ویرایش شد.');
    } else {
      alert('مجوز با موفقیت ذخیره شد.');
    }
  }, [formData, receipt, contract, editingPermitId, onSave, validateForm, calculateRemainingAfterPermits]);

  // وضعیت غیرفعال بودن فرم برای مجوزهای ابطال شده
  const isDisabled = formData.status === 'cancelled';

  return (
    <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {editingPermitId ? 'ویرایش مجوز حواله' : 'صدور مجوز حواله'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FieldWithTooltip
              label="شماره سیستمی"
              formula="شماره منحصر به فرد سیستم برای مجوز"
            >
              <input
                type="text"
                value={formData.systemPermitNumber}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </FieldWithTooltip>
          </div>
          
          <div className="md:col-span-2">
            <FieldWithTooltip
              label="شماره نامه مدیریت"
              formula="شماره نامه مدیریت برای مجوز"
            >
              <input
                type="text"
                value={formData.managementLetterNumber || ''}
                onChange={(e) => handleInputChange('managementLetterNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.managementLetterNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="شماره نامه مدیریت"
                required
                disabled={isDisabled}
              />
              {errors.managementLetterNumber && (
                <div className="mt-1 text-xs text-red-600 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {errors.managementLetterNumber}
                </div>
              )}
            </FieldWithTooltip>
          </div>
          
          <div>
            <FieldWithTooltip
              label="مقدار مجوز حواله"
              formula="مقدار قابل تایپ توسط کاربر"
            >
              <input
                type="number"
                value={formData.permitAmount || 0}
                onChange={(e) => handlePermitAmountChange(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.permitAmount ? 'border-red-500' : 'border-gray-300'
                }`}
                min="0"
                step="0.01"
                required
                disabled={isDisabled}
              />
              {errors.permitAmount && (
                <div className="mt-1 text-xs text-red-600 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {errors.permitAmount}
                </div>
              )}
              <div className="mt-1 text-xs text-gray-500">
                حداکثر مقدار: {formatPersianNumber(formData.remainingPermit || 0)}
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
                value={formData.wastageAmount || 0}
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
                value={formData.finalPermitAmount || 0}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </FieldWithTooltip>
          </div>
          
          <div>
            <FieldWithTooltip
              label="مانده مجوز حواله"
              formula="(مقدار مبنای رسید) - (وزن افت قرارداد) - (مجموع مجوزهای صادر شده)"
            >
              <input
                type="number"
                value={formData.remainingPermit || 0}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </FieldWithTooltip>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            disabled={isDisabled}
          >
            {editingPermitId ? 'ویرایش مجوز' : 'ذخیره مجوز'}
          </button>
        </div>
      </form>
    </div>
  );
};