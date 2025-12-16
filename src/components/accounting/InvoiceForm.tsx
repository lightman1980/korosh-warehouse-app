import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Calculator, Save, X, TriangleAlert as AlertTriangle } from 'lucide-react';
import { Receipt, Contract } from '../../types/accounting';
import { formatPersianNumber, formatPersianDate } from '../../utils/persian';
import PersianDatePicker from '../Common/PersianDatePicker';
import jalaali from 'jalaali-js';

interface InvoiceFormProps {
  receipt?: Receipt;
  contracts: Contract[];
  invoice?: any;
  onSave: (invoice: Partial<any>) => void;
  onCancel: () => void;
  editing?: boolean;
  systemDate: Date;
  calculateRemainingPermitAmount: (receiptId: string, contractId: string) => number;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  receipt, 
  contracts, 
  invoice,
  onSave, 
  onCancel,
  editing = false,
  systemDate,
  calculateRemainingPermitAmount
}) => {
  const [formData, setFormData] = useState({
    receiptId: receipt?.id || '',
    contractId: receipt?.contractId || '',
    invoiceAmount: 0,
    paidAmount: 0,
    remainingDebt: 0,
    year: 1403,
    month: 1,
    paymentDate: null as Date | null,
    invoiceType: 'manual' as 'manual' | 'automatic',
    calculationBasis: 'receiptBasis' as 'receiptBasis' | 'remainingPermit' | 'contractAmount',
    quantity: 0,
    rate: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const contract = contracts.find(c => c.id === formData.contractId);

  // تنظیم سال و ماه شمسی فعلی
  useEffect(() => {
    const currentPersianDate = jalaali.toJalaali(systemDate);
    
    setFormData(prev => ({
      ...prev,
      year: currentPersianDate.jy,
      month: currentPersianDate.jm
    }));
  }, [systemDate]);

  // محاسبه مبلغ فاکتور بر اساس مبنای انتخاب شده
  useEffect(() => {
    if (receipt && contract) {
      let invoiceAmount = 0;
      let quantity = 0;
      const rate = contract.rentalRate || 0;

      if (formData.calculationBasis === 'receiptBasis') {
        // مقدار مبنای رسید * نرخ قرارداد
        quantity = receipt.receiptBasisAmount;
        invoiceAmount = quantity * rate;
      } else if (formData.calculationBasis === 'remainingPermit') {
        // مانده مجوز حواله * نرخ قرارداد
        quantity = calculateRemainingPermitAmount(receipt.id, receipt.contractId);
        invoiceAmount = quantity * rate;
      } else if (formData.calculationBasis === 'contractAmount') {
        // مقدار قرارداد * نرخ قرارداد
        quantity = contract.contractWeight || 0;
        invoiceAmount = quantity * rate;
      }

      const remainingDebt = invoiceAmount - (formData.paidAmount || 0);

      setFormData(prev => ({
        ...prev,
        invoiceAmount,
        remainingDebt,
        quantity,
        rate
      }));
    }
  }, [receipt, contract, formData.calculationBasis, formData.paidAmount, calculateRemainingPermitAmount]);

  // بارگذاری داده‌های فاکتور در حالت ویرایش
  useEffect(() => {
    if (editing && invoice) {
      setFormData({
        receiptId: invoice.receiptId || '',
        contractId: invoice.contractId || '',
        invoiceAmount: invoice.invoiceAmount || 0,
        paidAmount: invoice.paidAmount || 0,
        remainingDebt: invoice.remainingDebt || 0,
        year: invoice.year || 1403,
        month: invoice.month || 1,
        paymentDate: invoice.paymentDate ? new Date(invoice.paymentDate) : null,
        invoiceType: invoice.invoiceType || 'manual',
        calculationBasis: invoice.calculationBasis || 'receiptBasis'
      });
    }
  }, [editing, invoice]);

  // مدیریت تغییرات فرم
  const handleChange = useCallback((field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // محاسبه مجدد مانده بدهی
      if (field === 'paidAmount') {
        newData.remainingDebt = newData.invoiceAmount - value;
      }
      
      return newData;
    });
  }, []);

  // مدیریت تغییر مبلغ واریز با کنترل حداکثر
  const handlePaidAmountChange = useCallback((value: number) => {
    // اگر مبلغ وارد شده بیشتر از مبلغ فاکتور بود، به صورت خودکار مبلغ فاکتور را درج کن
    if (value > formData.invoiceAmount) {
      handleChange('paidAmount', formData.invoiceAmount);
      return;
    }

    setErrors({});
    handleChange('paidAmount', value);
  }, [formData.invoiceAmount, handleChange]);

  // مدیریت تغییر تاریخ
  const handleDateChange = useCallback((date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      paymentDate: date
    }));
  }, []);

  // اعتبارسنجی فرم
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (formData.paidAmount > formData.invoiceAmount) {
      newErrors.paidAmount = 'مبلغ واریز نمی‌تواند بیشتر از مبلغ فاکتور باشد';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ذخیره فرم
  const handleSubmit = useCallback(() => {
    if (!validateForm()) return;
    
    onSave(formData);
  }, [formData, validateForm, onSave]);

  // تولید آرایه سال‌های شمسی
  const persianYears = Array.from({ length: 20 }, (_, i) => {
    const currentYear = jalaali.toJalaali(systemDate).jy;
    return currentYear - 10 + i;
  });

  // نام‌های ماه‌های شمسی
  const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  return (
    <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          صدور فاکتور دستی
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      {receipt && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="font-medium text-blue-800 mb-2">اطلاعات رسید انبار</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">شماره رسید:</span>
              <span className="font-medium mr-2">{receipt.transactionNumber}</span>
            </div>
            <div>
              <span className="text-gray-600">تاریخ رسید:</span>
              <span className="font-medium mr-2">
                {receipt.receiptDate ? formatPersianDate(new Date(receipt.receiptDate)) : ''}
              </span>
            </div>
            <div>
              <span className="text-gray-600">طرف حساب:</span>
              <span className="font-medium mr-2">{receipt.counterpartyName}</span>
            </div>
            <div>
              <span className="text-gray-600">محصول:</span>
              <span className="font-medium mr-2">{receipt.productName}</span>
            </div>
            <div>
              <span className="text-gray-600">مقدار:</span>
              <span className="font-medium mr-2">
                {formatPersianNumber(receipt.receiptBasisAmount)} {receipt.unit === 'kg' ? 'کیلوگرم' : 'تن'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">نرخ قرارداد:</span>
              <span className="font-medium mr-2">
                {formatPersianNumber(contract?.rentalRate || 0)} ریال
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">مبلغ فاکتور محاسبه شده:</span>
              <span className="font-bold text-green-600 mr-2">
                {formatPersianNumber(formData.invoiceAmount)} ریال
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">مبنای محاسبه</label>
          <select
            value={formData.calculationBasis}
            onChange={(e) => handleChange('calculationBasis', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="receiptBasis">مقدار مبنای رسید</option>
            <option value="remainingPermit">مانده مجوز حواله</option>
            <option value="contractAmount">مقدار قرارداد</option>
          </select>
          <div className="mt-1 text-xs text-gray-500">
            {formData.calculationBasis === 'receiptBasis' && 'مبلغ بر اساس مقدار مبنای رسید محاسبه می‌شود'}
            {formData.calculationBasis === 'remainingPermit' && 'مبلغ بر اساس مانده مجوز حواله محاسبه می‌شود'}
            {formData.calculationBasis === 'contractAmount' && 'مبلغ بر اساس مقدار کل قرارداد محاسبه می‌شود'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">مقدار</label>
          <input
            type="number"
            value={formData.quantity}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
          />
          <div className="mt-1 text-xs text-gray-500">
            بر اساس مبنای محاسبه
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نرخ</label>
          <input
            type="number"
            value={formData.rate}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
          />
          <div className="mt-1 text-xs text-gray-500">
            نرخ قرارداد (ریال)
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ قرارداد</label>
          <input
            type="number"
            value={contract?.contractWeight ? (contract.contractWeight * (contract.rentalRate || 0)) : 0}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
          />
          <div className="mt-1 text-xs text-gray-500">
            مقدار قرارداد × نرخ
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ فاکتور</label>
          <div className="relative">
            <input
              type="number"
              value={formData.invoiceAmount}
              readOnly
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
            <Calculator className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            مبلغ واریز طرف حساب
          </label>
          <input
            type="number"
            value={formData.paidAmount}
            onChange={(e) => handlePaidAmountChange(parseFloat(e.target.value) || 0)}
            className={`w-full px-4 py-3 border rounded-lg text-base focus:outline-none focus:ring-2 ${
              errors.paidAmount ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="مبلغ را وارد کنید"
            min="0"
            max={formData.invoiceAmount}
          />
          {errors.paidAmount && (
            <div className="mt-1 text-xs text-red-600 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {errors.paidAmount}
            </div>
          )}
          <div className="mt-1 text-xs text-gray-500">
            حداکثر مبلغ قابل واریز: {formatPersianNumber(formData.invoiceAmount)} ریال
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">مانده بدهی</label>
          <input
            type="number"
            value={formData.remainingDebt}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
          />
          <div className="mt-1 text-xs text-gray-500">
            فرمول: مبلغ فاکتور - مبلغ واریز
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            تاریخ واریز
          </label>
          <PersianDatePicker
            value={formData.paymentDate}
            onChange={handleDateChange}
            placeholder="تاریخ واریز را انتخاب کنید"
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            سال شمسی
          </label>
          <select
            value={formData.year}
            onChange={(e) => handleChange('year', parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            {persianYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ماه شمسی
          </label>
          <select
            value={formData.month}
            onChange={(e) => handleChange('month', parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            {persianMonths.map((monthName, index) => (
              <option key={index + 1} value={index + 1}>
                {monthName}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          انصراف
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={formData.paidAmount > formData.invoiceAmount}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
            formData.paidAmount > formData.invoiceAmount
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <Save className="h-4 w-4 mr-1" />
          ذخیره فاکتور
        </button>
      </div>
    </div>
  );
};