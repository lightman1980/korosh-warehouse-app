import React from 'react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';

interface PermitSelectorProps {
  permits: any[];
  onSelectPermit: (permitId: string, permitAmount: number, remainingAmount: number) => void;
  onCancel: () => void;
}

const PermitSelector: React.FC<PermitSelectorProps> = ({ permits, onSelectPermit, onCancel }) => {
  
  const storage = DataStorage.getInstance();
  
  const handleSelectPermit = (permitId: string) => {
    const permits = storage.loadData('delivery-permits') || [];
    const selectedPermit = permits.find(p => p.id === permitId);
    if (selectedPermit) {
      const transferredPermitData = storage.loadData(`permit_${permitId}`);
      
      if (transferredPermitData && transferredPermitData.remainingTransferPermit !== undefined) {
        onSelectPermit(permitId, selectedPermit.permitAmount, transferredPermitData.remainingTransferPermit);
      } else {
        const deliveries = storage.loadData('deliveries') || [];
        const totalDeliveriesForPermit = deliveries
          .filter((d: any) => d.permitId === permitId)
          .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        
        const receipts = storage.loadData('receipts') || [];
        const totalReceiptReductions = receipts
          .filter((r: any) => r.permitId === permitId && r.type === 'reduction')
          .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
        const totalReceiptAdditions = receipts
          .filter((r: any) => r.permitId === permitId && r.type === 'addition')
          .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
        
        const totalUsedAmount = totalDeliveriesForPermit + totalReceiptReductions;
        const remainingAmount = totalUsedAmount - totalReceiptAdditions;
        
        onSelectPermit(permitId, selectedPermit.permitAmount, remainingAmount);
      }
    }
  };

  // دریافت اطلاعات کامل مجوز از سیستم مجوزها
  const getPermitInfo = (permitId: string) => {
    const permits = storage.loadData('delivery-permits') || [];
    return permits.find((p: any) => p.id === permitId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">انتخاب مجوز تحویل کالا از انبار</h3>
        <div className="space-y-2">
          {permits.map(permit => {
            const permitInfo = getPermitInfo(permit.id);
            const transferredPermitData = storage.loadData(`permit_${permit.id}`);
            let remainingAmount;
            
            // اگر اطلاعات کامل مجوز موجود است، از آن استفاده کن
            if (permitInfo) {
              remainingAmount = permitInfo.remainingTransferPermit;
            } else if (transferredPermitData && transferredPermitData.remainingTransferPermit !== undefined) {
              remainingAmount = transferredPermitData.remainingTransferPermit;
            } else {
              const deliveries = storage.loadData('deliveries') || [];
              const totalDeliveriesForPermit = deliveries
                .filter((d: any) => d.permitId === permit.id)
                .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
              remainingAmount = permit.permitAmount - totalDeliveriesForPermit;
            }

            return (
              <button
                key={permit.id}
                onClick={() => handleSelectPermit(permit.id)}
                className="w-full bg-gray-100 text-gray-900 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors text-right"
              >
                <div className="text-right">
                  <div className="font-medium">{permit.systemPermitNumber}</div>
                  <div className="text-xs text-gray-500">شماره نامه مدیریت: {permit.managementLetterNumber}</div>
                  <div className="text-xs text-gray-500">مقدار مجوز: {formatPersianNumber(permit.permitAmount)}</div>
                  <div className="text-xs text-orange-600 font-medium">مانده مجوز حواله: {formatPersianNumber(remainingAmount)}</div>
                  {permitInfo && (
                    <>
                      <div className="text-xs text-green-600 font-medium">مانده مجوز: {formatPersianNumber(permitInfo.remainingPermit)}</div>
                      <div className="text-xs text-blue-600 font-medium">
                        وضعیت: {permitInfo.status === 'draft' ? 'پیش‌نویس' :
                               permitInfo.status === 'saved' ? 'ذخیره شده' :
                               permitInfo.status === 'issued' ? 'صادر شده' :
                               permitInfo.status === 'printed' ? 'چاپ شده' :
                               permitInfo.status === 'correction_requested' ? 'درخواست اصلاحیه' :
                               permitInfo.status === 'cancelled' ? 'لغو شده' :
                               'نامشخص'}
                      </div>
                    </>
                  )}
                  {transferredPermitData && (
                    <div className="text-xs text-blue-600 font-medium">داده‌ها از سیستم حسابداری منتقل شده‌اند</div>
                  )}
                </div>
              </button>
            );
          })}
          <button onClick={onCancel} className="w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition-colors text-right mt-4">انصراف</button>
        </div>
      </div>
    </div>
  );
};

export default PermitSelector;