// CorrectionRequest.tsx
import React, { useState, useCallback } from 'react';
import { AlertTriangle, Save, X, Loader2 } from 'lucide-react';
import { DataStorage } from '../../utils/dataStorage';

interface CorrectionRequestProps {
  deliveryId: string;
  permitId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CorrectionRequest: React.FC<CorrectionRequestProps> = ({ 
  deliveryId, 
  permitId, 
  onSuccess, 
  onCancel 
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const storage = DataStorage.getInstance();

  const handleSubmit = useCallback(async () => {
    if (!reason.trim()) {
      alert('لطفاً دلیل درخواست اصلاحیه را وارد کنید.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // به‌روزرسانی مجوز با افزودن رخداد "درخواست اصلاحیه انبار"
      const permits = storage.loadData('delivery-permits') || [];
      const updatedPermits = permits.map((permit: any) => 
        permit.id === permitId 
          ? { 
              ...permit, 
              event: 'درخواست اصلاحیه انبار', 
              correctionReason: reason,
              updatedAt: new Date() 
            } 
          : permit
      );
      
      storage.saveData('delivery-permits', updatedPermits);
      
      // به‌روزرسانی حواله با افزودن وضعیت "درخواست اصلاحیه"
      const deliveries = storage.loadData('deliveries') || [];
      const updatedDeliveries = deliveries.map((delivery: any) => 
        delivery.id === deliveryId 
          ? { 
              ...delivery, 
              status: 'correction_requested', 
              correctionReason: reason,
              updatedAt: new Date() 
            } 
          : delivery
      );
      
      storage.saveData('deliveries', updatedDeliveries);
      
      alert('درخواست اصلاحیه با موفقیت ثبت شد.');
      onSuccess();
    } catch (error) {
      console.error('Error submitting correction request:', error);
      alert('خطا در ثبت درخواست اصلاحیه. لطفاً مجدداً تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  }, [deliveryId, permitId, reason, storage, onSuccess]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <h2 className="text-lg font-bold text-yellow-800">درخواست اصلاحیه انبار</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-yellow-600 hover:text-yellow-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              توجه: این درخواست به واحد انبار ارسال خواهد شد و پس از بررسی، اصلاحات لازم انجام خواهد شد.
            </p>
          </div>
          
          <p className="text-gray-700 mb-4">
            لطفاً دلیل درخواست اصلاحیه را با دقت وارد کنید:
          </p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              دلیل درخواست اصلاحیه <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              rows={4}
              placeholder="لطفاً دلیل درخواست اصلاحیه را به صورت دقیق وارد کنید..."
              required
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim()}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  در حال ثبت...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  ثبت درخواست
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};