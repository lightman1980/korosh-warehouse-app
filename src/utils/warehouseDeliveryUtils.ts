import { WarehouseDelivery } from '../types/WarehouseDeliveryTypes';
import { DataStorage } from '../utils/dataStorage';

/**
 * محاسبه مقدار باقی‌مانده مجوز تحویل
 * فرمول: (مبلغ کل مجوز) - (مجموع تحویل‌های قبلی + کسورات رسید) + (اضافات رسید)
 */
export const calculateRemainingPermitAmount = (delivery: Partial<WarehouseDelivery>): number => {
  if (!delivery.fromPermit || !delivery.permitId || !delivery.permitAmount) {
    return 0;
  }

  const storage = DataStorage.getInstance();
  
  // محاسبه مجموع تحویل‌های قبلی (به جز تحویل فعلی)
  const allDeliveries = storage.loadData('deliveries') || [];
  const totalPreviousDeliveriesForPermit = allDeliveries
    .filter((d: any) => d.permitId === delivery.permitId && d.id !== delivery.id)
    .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
  
  // محاسبه مجموع کسورات رسید
  const receipts = storage.loadData('receipts') || [];
  const totalReceiptReductions = receipts
    .filter((r: any) => r.permitId === delivery.permitId && r.type === 'reduction')
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  
  // محاسبه مجموع اضافات رسید
  const totalReceiptAdditions = receipts
    .filter((r: any) => r.permitId === delivery.permitId && r.type === 'addition')
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  
  // محاسبه مقدار باقی‌مانده
  const totalUsedAmount = totalPreviousDeliveriesForPermit + totalReceiptReductions;
  const calculatedRemaining = totalUsedAmount - totalReceiptAdditions;

  return calculatedRemaining;
};

/**
 * بررسی آیا تحویل قابل ویرایش است یا خیر
 */
export const canEditDelivery = (delivery: WarehouseDelivery): boolean => {
  if (delivery.status === 'correction_requested' && delivery.fromPermit) {
    const storage = DataStorage.getInstance();
    const permits = storage.loadData('delivery-permits') || [];
    const permit = permits.find((p: any) => p.id === delivery.permitId);
    
    if (permit && (permit.event === 'انتقال مجوز' || permit.event === 'برگشت از انبار')) {
      return true;
    }
  }
  
  return !delivery.fromPermit;
};

/**
 * دریافت متن وضعیت تحویل
 */
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'draft': return 'پیش‌نویس';
    case 'saved': return 'ذخیره شده';
    case 'finalized': return 'نهایی شده';
    case 'printed': return 'چاپ شده';
    case 'correction_requested': return 'درخواست اصلاح';
    default: return status;
  }
};

/**
 * دریافت رنگ وضعیت تحویل
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'saved': return 'bg-blue-100 text-blue-800';
    case 'finalized': return 'bg-green-100 text-green-800';
    case 'printed': return 'bg-purple-100 text-purple-800';
    case 'correction_requested': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

/**
 * دریافت متن مرحله بعدی
 */
export const getNextStageText = (status: string): string | null => {
  switch (status) {
    case 'draft': return 'ذخیره';
    case 'saved': return 'نهایی کردن';
    case 'finalized': return 'چاپ حواله';
    default: return null;
  }
};

/**
 * دریافت وضعیت بعدی
 */
export const getNextStatus = (status: string): string => {
  switch (status) {
    case 'draft': return 'saved';
    case 'saved': return 'finalized';
    case 'finalized': return 'printed';
    default: return status;
  }
};