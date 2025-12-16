import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Search, CreditCard as Edit2, Trash2, Save, X, CircleAlert as AlertCircle, Calendar, FileText, Printer, ArrowLeft, Eye, Users, Building, Filter, Download, Upload, CheckCircle, AlertTriangle, Info, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  formatPersianDate, 
  formatPersianDateTime,
  getGregorianToPersianYearMonth,
  generateTransactionNumber, // >>>>> اصلاح شد: ويرگول فراموش شده اضافه شد <<<<<
  formatPersianNumber
} from '../../utils/persian';
import { PersianDatePicker } from '../Common/PersianDatePicker';
import { DataStorage } from '../../utils/dataStorage';
import { baseDataCategories } from '../../data/baseData';

// تعريف نوع WarehouseDelivery براي استفاده در تابع
interface WarehouseDelivery {
  id: string;
  transactionNumber: string;
  userType: 'owned' | 'consignment';
  productId: string;
  productName: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  amount: number;
  unit: 'kg' | 'ton';
  deliveryDate: Date;
  status: 'draft' | 'saved' | 'finalized' | 'printed' | 'correction_requested';
  notes?: string;
  companyId?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyContactPerson?: string;
  companyRegistrationNumber?: string;
  contractId?: string;
  contractNumber?: string;
  locationId?: string;
  locationName?: string;
  locationAddress?: string;
  locationPhone?: string;
  locationPostalCode?: string;
  internalSiteId?: string;
  internalSiteName?: string;
  contractorSiteId?: string;
  contractorSiteName?: string;
  driverId?: string;
  driverName?: string;
  driverNationalId?: string;
  driverPlateNumber?: string;
  driverHomeAddress?: string;
  recipientType?: 'company' | 'customer';
  customerCompanyId?: string;
  customerCompanyName?: string;
  customerLocationId?: string;
  customerLocationName?: string;
  companyLocationId?: string;
  companyLocationName?: string;
  fromPermit?: boolean;
  permitId?: string;
  systemPermitNumber?: string;
  managementLetterNumber?: string;
  permitAmount?: number;
  wastageAmount?: number;
  finalPermitAmount?: number;
  receiptId?: string;
  receiptNumber?: string;
  permitDate?: string;
  approvalDate?: string;
  trustDelivery?: boolean;
  receiptBasisAmount?: number;
  remainingTransferPermit?: number;
  createdAt: Date;
  updatedAt: Date;
  shipName?: string;
  quotaNumber?: string;
  registrationOrderNumber?: string;
}

// تعريف متغير اوليه براي حل خطا
const initialDeliveries: WarehouseDelivery[] = [];

// کامپوننت براي انتخاب نوع حواله
const DeliveryTypeSelector: React.FC<{
  onSelectType: (type: 'owned' | 'consignment') => void;
  onCancel: () => void;
}> = ({ onSelectType, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium text-gray-900 mb-4">انتخاب نوع حواله</h3>
        <div className="space-y-3">
          <button
            onClick={() => onSelectType('consignment')}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-right"
          >
            حواله اماني
          </button>
          <button
            onClick={() => onSelectType('owned')}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-right"
          >
            حواله تملکي
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors text-right"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};

// کامپوننت براي انتخاب شرکت طرف حساب
const CompanySelector: React.FC<{
  companies: any[];
  onSelectCompany: (companyId: string) => void;
  onCancel: () => void;
}> = ({ companies, onSelectCompany, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">لطفا نام شرکت طرف حساب را انتخاب فرماييد</h3>
        <div className="space-y-2">
          {companies.map(company => (
            <button
              key={company.id}
              onClick={() => onSelectCompany(company.id)}
              className="w-full bg-gray-100 text-gray-900 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors text-right"
            >
              {company.name}
            </button>
          ))}
          <button
            onClick={onCancel}
            className="w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition-colors text-right mt-4"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};

// کامپوننت براي انتخاب قرارداد
const ContractSelector: React.FC<{
  contracts: any[];
  onSelectContract: (contractId: string) => void;
  onCancel: () => void;
}> = ({ contracts, onSelectContract, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">لطفا شماره قرارداد را انتخاب فرماييد</h3>
        <div className="space-y-2">
          {contracts.map(contract => (
            <button
              key={contract.id}
              onClick={() => onSelectContract(contract.id)}
              className="w-full bg-gray-100 text-gray-900 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors text-right"
            >
              <div className="text-right">
                <div className="font-medium">{contract.contractNumber}</div>
                <div className="text-xs text-gray-500">
                  از تاريخ: {formatPersianDate(new Date(contract.startDate))} تا تاريخ: {formatPersianDate(new Date(contract.endDate))}
                </div>
              </div>
            </button>
          ))}
          <button
            onClick={onCancel}
            className="w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition-colors text-right mt-4"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};

// کامپوننت براي انتخاب مجوز
// کامپوننت انتخاب مجوز
// کامپوننت انتخاب مجوز
const PermitSelector: React.FC<{
  permits: any[];
  onSelectPermit: (permitId: string, permitAmount: number, remainingAmount: number) => void;
  onCancel: () => void;
}> = ({ permits, onSelectPermit, onCancel }) => {
  
  // تعريف storage در سطح کامپوننت
  const storage = DataStorage.getInstance();
  
  const handleSelectPermit = (permitId: string) => {
    const permits = storage.loadData('delivery-permits') || [];
    const selectedPermit = permits.find(p => p.id === permitId);
    if (selectedPermit) {
      // ابتدا بررسي مي‌کنيم آيا اطلاعات منتقل شده از AccountingManager وجود دارد
      const transferredPermitData = storage.loadData(`permit_${permitId}`);
      
      if (transferredPermitData && transferredPermitData.remainingTransferPermit !== undefined) {
        // اگر اطلاعات منتقل شده وجود دارد، از آن استفاده مي‌کنيم
        onSelectPermit(permitId, selectedPermit.permitAmount, transferredPermitData.remainingTransferPermit);
      } else {
        // در غير اين صورت، محاسبات معمول را انجام مي‌دهيم
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">انتخاب مجوز حواله براي تحويل کالا</h3>
        <div className="space-y-2">
          {permits.map(permit => {
            // بررسي وجود اطلاعات منتقل شده از AccountingManager
            const transferredPermitData = storage.loadData(`permit_${permit.id}`); // <-- حالا storage تعريف شده است
            let remainingAmount;
            
            if (transferredPermitData && transferredPermitData.remainingTransferPermit !== undefined) {
              // استفاده از اطلاعات منتقل شده
              remainingAmount = transferredPermitData.remainingTransferPermit;
            } else {
              // محاسبه معمول در صورت عدم وجود اطلاعات منتقل شده
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
                  <div className="text-xs text-gray-500">شماره نامه مديريت: {permit.managementLetterNumber}</div>
                  <div className="text-xs text-gray-500">مقدار مجوز حواله: {formatPersianNumber(permit.permitAmount)}</div>
                  <div className="text-xs text-green-600 font-medium">مانده مجوز حواله: {formatPersianNumber(remainingAmount)}</div>
                  {transferredPermitData && (
                    <div className="text-xs text-blue-600 font-medium">داده‌ها از بخش حسابداري منتقل شده‌اند</div>
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
///////////////////////////////////
///////////////////////////////////
/**
 * محاسبه "مانده مجوز حواله" بر اساس فرمول درخواستي
 * فرمول: ((مقدار حواله هاي ثبت شده + سند کسر انبار) - سند اضافه انبار)
 */
 const calculateRemainingPermitAmount = (delivery: Partial<WarehouseDelivery>): number => {
  if (!delivery.fromPermit || !delivery.permitId || !delivery.permitAmount) {
    return 0;
  }

  const storage = DataStorage.getInstance();
  
  // ?. دريافت تحويل‌هاي قبلي (به جز تراکنش فعلي)
  const allDeliveries = storage.loadData('deliveries') || [];
  const totalPreviousDeliveriesForPermit = allDeliveries
    .filter((d: any) => d.permitId === delivery.permitId && d.id !== delivery.id)
    .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
  
  // ?. دريافت اسناد کسر انبار
  const receipts = storage.loadData('receipts') || [];
  const totalReceiptReductions = receipts
    .filter((r: any) => r.permitId === delivery.permitId && r.type === 'reduction')
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  
  // ?. دريافت اسناد اضافه انبار
  const totalReceiptAdditions = receipts
    .filter((r: any) => r.permitId === delivery.permitId && r.type === 'addition')
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  
  // ?. اعمال فرمول
  const totalUsedAmount = totalPreviousDeliveriesForPermit + totalReceiptReductions;
  const calculatedRemaining = totalUsedAmount - totalReceiptAdditions;

  return calculatedRemaining;
};
//////////////////////////////////
//////////////////////////////////
// کامپوننت جداگانه براي فرم حواله
const DeliveryForm: React.FC<{
  delivery: Partial<WarehouseDelivery>;
  baseData: any;
  contracts: any[];
  errors: Record<string, string>;
  isEditing: boolean;
  fromPermit: boolean;
  onChange: (delivery: Partial<WarehouseDelivery>) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({ delivery, baseData, contracts, errors, isEditing, fromPermit, onChange, onSave, onCancel }) => {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // محاسبه مانده حواله با فرمول جديد: "مقدار مجوز حواله" - "مقدار حواله"هاي ثبت شده براي اين قرارداد
// محاسبه مقدار باقي‌مانده مجوز براي تحويل
////////////////
////////////////
// استفاده از تابع جديد براي محاسبه مانده مجوز
const remainingPermitAmount = useMemo(() => {
  if (!delivery.fromPermit) return 0;
  
  const calculatedRemaining = calculateRemainingPermitAmount(delivery);

  // به‌روزرساني استيت در صورت تغيير
  if (delivery.remainingTransferPermit !== calculatedRemaining) {
    onChange({ ...delivery, remainingTransferPermit: calculatedRemaining });
  }
  
  return calculatedRemaining;
}, [delivery.fromPermit, delivery.permitId, delivery.permitAmount, delivery.id, onChange]);
////////////////
////////////////
  
  // بررسي اينکه آيا حواله از رسيد انبار ايجاد شده است
  const receiptData = useMemo(() => {
    if (!delivery.receiptId) return null;
    const storage = DataStorage.getInstance();
    const receipts = storage.loadData('receipts') || [];
    return receipts.find((r: any) => r.id === delivery.receiptId);
  }, [delivery.receiptId]);
  
  return (
    <div className="p-6 border-b border-gray-200 bg-blue-50">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="h-5 w-5 text-blue-600" />
        <h3 className="font-medium text-blue-900">
          {isEditing ? 'ويرايش حواله' : 'افزودن حواله جديد'}
        </h3>
        {isEditing && fromPermit && (
          <span className="text-red-600 text-sm">(حواله ايجاد شده از مجوز قابل ويرايش نيست)</span>
        )}
      </div>
      
      {/* نمايش اطلاعات مجوز اگر حواله از مجوز ايجاد شده است */}
     {/* نمايش اطلاعات مجوز حواله */}


{/* نمايش اطلاعات مجوز با برچسب‌هاي جديد */}
{/* نمايش اطلاعات مجوز با برچسب‌هاي جديد */}
{delivery.fromPermit && (
  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 mb-6">
    <h4 className="font-medium text-indigo-900 mb-2">اطلاعات مجوز</h4>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">شماره مجوز سيستم</label>
        <input
          type="text"
          value={delivery.systemPermitNumber || ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">شماره نامه مديريت</label>
        <input
          type="text"
          value={delivery.managementLetterNumber || ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">مقدار مجوز حواله</label>
        <input
          type="text"
          value={formatPersianNumber(delivery.permitAmount || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">مانده مجوز حواله</label>
        <input
          type="text"
          value={formatPersianNumber(delivery.remainingTransferPermit || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-yellow-100 font-bold"
          disabled
        />
      </div>
    </div>
    {/* اضافه بخش نمايش منبع داده‌ها */}
    {(() => {
      const storage = DataStorage.getInstance(); // <-- تعريف storage در اينجا
      return delivery.permitId && storage.loadData(`permit_${delivery.permitId}`) && (
        <div className="mt-2 text-xs text-blue-600">
          اطلاعات اين مجوز از بخش حسابداري منتقل شده است
        </div>
      );
    })()}
  </div>
)}


      
      {/* نمايش اطلاعات رسيد انبار اگر حواله از رسيد ايجاد شده است */}
      {receiptData && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
          <h4 className="font-medium text-green-900 mb-2">اطلاعات رسيد انبار</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سايت مخزن</label>
              <input
                type="text"
                value={receiptData.siteName || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مخزن</label>
              <input
                type="text"
                value={receiptData.tankName || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">طرف حساب</label>
              <input
                type="text"
                value={receiptData.companyName || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">قرارداد</label>
              <input
                type="text"
                value={receiptData.contractNumber || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام کالاي اماني</label>
              <input
                type="text"
                value={receiptData.productName || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">واحد سنجش</label>
              <input
                type="text"
                value={receiptData.unit === 'kg' ? 'کيلوگرم' : 'تن'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام کشتي</label>
              <input
                type="text"
                value={receiptData.shipName || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">شماره کوتاژ</label>
              <input
                type="text"
                value={receiptData.quotaNumber || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">شماره شاخص/ثبت سفارش</label>
              <input
                type="text"
                value={receiptData.registrationOrderNumber || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* نوع حواله */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نوع حواله <span className="text-red-500">*</span>
          </label>
          <select
            value={delivery.userType || 'owned'}
            onChange={(e) => onChange({ ...delivery, userType: e.target.value as 'owned' | 'consignment' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isEditing && fromPermit}
          >
            <option value="owned">تملکي</option>
            <option value="consignment">اماني</option>
          </select>
        </div>

        {/* Product */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نام کالا <span className="text-red-500">*</span>
          </label>
          <select
            value={delivery.productId || ''}
            onChange={(e) => onChange({ ...delivery, productId: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.productId ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isEditing && fromPermit}
          >
            <option value="">انتخاب کنيد</option>
            {(delivery.userType === 'consignment' ? baseData.consignmentProducts : baseData.ownedProducts)?.map(product => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
          {errors.productId && (
            <p className="text-red-500 text-xs mt-1">{errors.productId}</p>
          )}
        </div>

        {/* Site */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            سايت مخازن <span className="text-red-500">*</span>
          </label>
          <select
            value={delivery.siteId || ''}
            onChange={(e) => onChange({ ...delivery, siteId: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.siteId ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isEditing && fromPermit || receiptData}
          >
            <option value="">انتخاب کنيد</option>
            {baseData.sites?.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          {errors.siteId && (
            <p className="text-red-500 text-xs mt-1">{errors.siteId}</p>
          )}
        </div>

        {/* Tank */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            مخزن <span className="text-red-500">*</span>
          </label>
          <select
            value={delivery.tankId || ''}
            onChange={(e) => onChange({ ...delivery, tankId: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.tankId ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isEditing && fromPermit || receiptData}
          >
            <option value="">انتخاب کنيد</option>
            {baseData.tanks?.map(tank => (
              <option key={tank.id} value={tank.id}>{tank.name}</option>
            ))}
          </select>
          {errors.tankId && (
            <p className="text-red-500 text-xs mt-1">{errors.tankId}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            مقدار حواله <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={delivery.amount || ''}
            onChange={(e) => {
              const newAmount = parseFloat(e.target.value) || 0;
              // بررسي اينکه مقدار وارد شده بيشتر از مانده مجوز نباشد
              if (delivery.fromPermit && newAmount > remainingPermitAmount) {
                onChange({ ...delivery, amount: remainingPermitAmount });
              } else {
                onChange({ ...delivery, amount: newAmount });
              }
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="مقدار به کيلوگرم"
            disabled={isEditing && fromPermit}
          />
          {errors.amount && (
            <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
          )}
          {delivery.fromPermit && (
            <p className="text-blue-500 text-xs mt-1">
              حداکثر مقدار قابل ثبت: {formatPersianNumber(remainingPermitAmount)} کيلوگرم
            </p>
          )}
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">واحد</label>
          <select
            value={delivery.unit || 'kg'}
            onChange={(e) => onChange({ ...delivery, unit: e.target.value as 'kg' | 'ton' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isEditing && fromPermit || receiptData}
          >
            <option value="kg">کيلوگرم</option>
            <option value="ton">تن</option>
          </select>
        </div>

        {/* Delivery Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تاريخ حواله <span className="text-red-500">*</span>
          </label>
          <PersianDatePicker
            value={delivery.deliveryDate}
            onChange={(date) => onChange({ ...delivery, deliveryDate: date })}
            placeholder="انتخاب تاريخ"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.deliveryDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.deliveryDate && (
            <p className="text-red-500 text-xs mt-1">{errors.deliveryDate}</p>
          )}
        </div>

        {/* Company (for consignment deliveries only) */}
        {delivery.userType === 'consignment' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              شرکت <span className="text-red-500">*</span>
            </label>
            <select
              value={delivery.companyId || ''}
              onChange={(e) => onChange({ ...delivery, companyId: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.companyId ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isEditing && fromPermit || receiptData}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.companies?.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
            {errors.companyId && (
              <p className="text-red-500 text-xs mt-1">{errors.companyId}</p>
            )}
          </div>
        )}

        {/* Contract (for consignment deliveries only) */}
        {delivery.userType === 'consignment' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              قرارداد <span className="text-red-500">*</span>
            </label>
            <select
              value={delivery.contractId || ''}
              onChange={(e) => onChange({ ...delivery, contractId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isEditing && fromPermit || receiptData}
            >
              <option value="">انتخاب کنيد</option>
              {contracts.map(contract => (
                <option key={contract.id} value={contract.id}>{contract.contractNumber}</option>
              ))}
            </select>
          </div>
        )}

        {/* Location (for owned deliveries only) */}
        {delivery.userType === 'owned' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              لوکيشن <span className="text-red-500">*</span>
            </label>
            <select
              value={delivery.locationId || ''}
              onChange={(e) => onChange({ ...delivery, locationId: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.locationId ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isEditing && fromPermit}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.locations?.map(location => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
            {errors.locationId && (
              <p className="text-red-500 text-xs mt-1">{errors.locationId}</p>
            )}
          </div>
        )}
      </div>
      
      {/* Recipient Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تحويل گيرنده <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="recipientType"
                value="company"
                checked={delivery.recipientType === 'company'}
                onChange={() => onChange({ ...delivery, recipientType: 'company' })}
                className="ml-2"
                disabled={isEditing && fromPermit}
              />
              <span>شرکت طرف حساب</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="recipientType"
                value="customer"
                checked={delivery.recipientType === 'customer'}
                onChange={() => onChange({ ...delivery, recipientType: 'customer' })}
                className="ml-2"
                disabled={isEditing && fromPermit}
              />
              <span>شرکت مشتري طرف حساب</span>
            </label>
          </div>
        </div>
        
        {/* Company Location (when recipient is company) */}
        {delivery.recipientType === 'company' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              لوکيشن طرف حساب <span className="text-red-500">*</span>
            </label>
            <select
              value={delivery.companyLocationId || ''}
              onChange={(e) => onChange({ ...delivery, companyLocationId: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.companyLocationId ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isEditing && fromPermit}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.locations?.map(location => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
            {errors.companyLocationId && (
              <p className="text-red-500 text-xs mt-1">{errors.companyLocationId}</p>
            )}
          </div>
        )}
        
        {/* Customer Location (when recipient is customer) */}
        {delivery.recipientType === 'customer' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              لوکيشن مشتري طرف حساب <span className="text-red-500">*</span>
            </label>
            <select
              value={delivery.customerLocationId || ''}
              onChange={(e) => onChange({ ...delivery, customerLocationId: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.customerLocationId ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isEditing && fromPermit}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.locations?.map(location => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
            {errors.customerLocationId && (
              <p className="text-red-500 text-xs mt-1">{errors.customerLocationId}</p>
            )}
          </div>
        )}
      </div>
      
      {/* Advanced Options Toggle */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showAdvancedOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          گزينه‌هاي پيشرفته
        </button>
      </div>
      
      {/* Advanced Options */}
      {showAdvancedOptions && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Internal Sites (for owned deliveries only) */}
          {delivery.userType === 'owned' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سايت هاي داخلي
              </label>
              <select
                value={delivery.internalSiteId || ''}
                onChange={(e) => onChange({ ...delivery, internalSiteId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isEditing && fromPermit}
              >
                <option value="">انتخاب کنيد</option>
                {baseData.internalSites?.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Contractor Sites (for owned deliveries only) */}
          {delivery.userType === 'owned' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سايت هاي پيمانکاري
              </label>
              <select
                value={delivery.contractorSiteId || ''}
                onChange={(e) => onChange({ ...delivery, contractorSiteId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isEditing && fromPermit}
              >
                <option value="">انتخاب کنيد</option>
                {baseData.contractorSites?.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Driver Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              راننده
            </label>
            <select
              value={delivery.driverId || ''}
              onChange={(e) => onChange({ ...delivery, driverId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isEditing && fromPermit}
            >
              <option value="">انتخاب کنيد</option>
              {baseData.drivers?.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - {driver.plateNumber} - {driver.nationalId}
                </option>
              ))}
            </select>
          </div>

          {/* Trust Delivery Checkbox */}
          {delivery.userType === 'consignment' && (
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={delivery.trustDelivery || false}
                  onChange={(e) => onChange({ ...delivery, trustDelivery: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={!delivery.fromPermit}
                />
                <span className="text-sm font-medium text-gray-700">
                  حواله اماني (فقط براي حواله‌هاي ايجاد شده از مجوز)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                با فعال کردن اين گزينه، حواله به صورت اماني ثبت مي‌شود و از موجودي انبار کسر نمي‌شود
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">توضيحات</label>
            <textarea
              value={delivery.notes || ''}
              onChange={(e) => onChange({ ...delivery, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="توضيحات اختياري..."
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onSave}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          disabled={isEditing && fromPermit}
        >
          <Save className="h-4 w-4" />
          ذخيره حواله
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          انصراف
        </button>
      </div>
    </div>
  );
};

// کامپوننت جداگانه براي جدول حواله‌ها
const DeliveriesTable: React.FC<{
  deliveries: WarehouseDelivery[];
  searchTerm: string;
  filters: any;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: WarehouseDelivery['status']) => void;
  onBackToPreviousStage: (id: string) => void;
  onPrint: (delivery: WarehouseDelivery) => void;
}> = ({ deliveries, searchTerm, filters, onEdit, onDelete, onStatusChange, onBackToPreviousStage, onPrint }) => {
  const [sortField, setSortField] = useState<keyof WarehouseDelivery>('deliveryDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // >>>>> شروع تغييرات: تابع کمکي براي محاسبه مانده مجوز حواله <<<<<
  /**
   * تابع کمکي براي محاسبه مانده مجوز حواله بر اساس فرمول:
   * (مانده مجوز حواله) = (مقدار مجوز حواله) - (مجموع حواله هاي ثبت شده تا قبل از اين تراکنش)
   * @param delivery - حواله مورد نظر براي محاسبه
   * @returns مقدار باقي‌مانده از مجوز
   */
  // >>>>> اصلاح جديد: محاسبه مقدار باقي‌مانده مجوز براي تحويل <<<<<
/**
 * محاسبه مقدار باقي‌مانده مجوز براي يک تحويل خاص
 * فرمول: (مقدار باقي‌مانده) = (مقدار مجوز) - (مجموع تحويل‌هاي قبلي براي اين مجوز)
 * @param delivery - رکورد تحويل مورد نظر
 * @returns مقدار باقي‌مانده مجوز
 */
/**
 * محاسبه مقدار باقي‌مانده مجوز براي يک تحويل خاص.
 * اين تابع يک تابع "خالص" است و فقط محاسبه انجام مي‌دهد.
 * @param delivery - رکورد تحويل مورد نظر
 * @returns مقدار باقي‌مانده مجوز
 */
 //////////////
 //////////////
 const calculateRemainingPermitAmount = (delivery: WarehouseDelivery): number => {
  // اگر از مجوز ايجاد نشده باشد، محاسبه معتبر نيست
  if (!delivery.fromPermit || !delivery.permitId || !delivery.permitAmount) {
    return 0;
  }

  const storage = DataStorage.getInstance();
  
  // ?. دريافت تحويل‌هاي قبلي (به جز تراکنش فعلي)
  const allDeliveries = storage.loadData('deliveries') || [];
  const totalPreviousDeliveriesForPermit = allDeliveries
    .filter((d: any) => d.permitId === delivery.permitId && d.id !== delivery.id)
    .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
  
  // ?. دريافت اسناد کسر انبار
  const receipts = storage.loadData('receipts') || [];
  const totalReceiptReductions = receipts
    .filter((r: any) => r.permitId === delivery.permitId && r.type === 'reduction')
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  
  // ?. دريافت اسناد اضافه انبار
  const totalReceiptAdditions = receipts
    .filter((r: any) => r.permitId === delivery.permitId && r.type === 'addition')
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  
  // ?. اعمال فرمول
  const totalUsedAmount = totalPreviousDeliveriesForPermit + totalReceiptReductions;
  const calculatedRemaining = totalUsedAmount - totalReceiptAdditions;

  return calculatedRemaining;
};
 /////////////
 /////////////
// >>>>> پايان اصلاح جديد <<<<<
  // >>>>> پايان تغييرات <<<<<

  // فيلتر و مرتب‌سازي حواله‌ها
  const filteredAndSortedDeliveries = useMemo(() => {
    let filtered = deliveries.filter(delivery => {
      // فيلتر بر اساس عبارت جستجو
      const matchesSearch = 
        delivery.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (delivery.companyName && delivery.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (delivery.customerCompanyName && delivery.customerCompanyName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // فيلتر بر اساس نوع حواله
      const matchesType = !filters.userType || delivery.userType === filters.userType;
      
      // فيلتر بر اساس وضعيت
      const matchesStatus = !filters.status || delivery.status === filters.status;
      
      // فيلتر بر اساس تاريخ
      let matchesDate = true;
      if (filters.dateFrom) {
        matchesDate = matchesDate && new Date(delivery.deliveryDate) >= new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        matchesDate = matchesDate && new Date(delivery.deliveryDate) <= new Date(filters.dateTo);
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
    
    // مرتب‌سازي
    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === undefined || bValue === undefined) return 0;
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [deliveries, searchTerm, filters, sortField, sortDirection]);

  const handleSort = (field: keyof WarehouseDelivery) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleRowExpansion = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'پيش‌نويس';
      case 'saved': return 'ذخيره شده';
      case 'finalized': return 'نهايي شده';
      case 'printed': return 'چاپ شده';
      case 'correction_requested': return 'درخواست اصلاحيه';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'saved': return 'bg-blue-100 text-blue-800';
      case 'finalized': return 'bg-green-100 text-green-800';
      case 'printed': return 'bg-purple-100 text-purple-800';
      case 'correction_requested': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStageText = (status: string) => {
    switch (status) {
      case 'draft': return 'ذخيره';
      case 'saved': return 'نهايي سازي';
      case 'finalized': return 'چاپ حواله';
      default: return null;
    }
  };

  const getNextStatus = (status: string) => {
    switch (status) {
      case 'draft': return 'saved';
      case 'saved': return 'finalized';
      case 'finalized': return 'printed';
      default: return status;
    }
  };

  // بررسي اينکه آيا امکان ويرايش حواله وجود دارد
  const canEditDelivery = (delivery: WarehouseDelivery) => {
    // اگر وضعيت "درخواست اصلاحيه" باشد و در صفحه مجوزها گزينه‌هاي "تاييد مجوز حواله" يا "ويرايش مجوز" فعال باشد
    if (delivery.status === 'correction_requested' && delivery.fromPermit) {
      const storage = DataStorage.getInstance();
      const permits = storage.loadData('delivery-permits') || [];
      const permit = permits.find((p: any) => p.id === delivery.permitId);
      
      if (permit && (permit.event === 'تاييد مجوز حواله' || permit.event === 'ويرايش مجوز')) {
        return true;
      }
    }
    
    // اگر حواله از مجوز ايجاد نشده باشد، قابل ويرايش است
    return !delivery.fromPermit;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('transactionNumber')}
            >
              <div className="flex items-center gap-1">
                شماره تراکنش
                {sortField === 'transactionNumber' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                )}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('userType')}
            >
              <div className="flex items-center gap-1">
                نوع
                {sortField === 'userType' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              شرکت/کالا
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              شماره قرارداد
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              شماره مجوز
            </th>
            <th 
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('amount')}
            >
              <div className="flex items-center gap-1">
                مقدار حواله
                {sortField === 'amount' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                )}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('deliveryDate')}
            >
              <div className="flex items-center gap-1">
                تاريخ
                {sortField === 'deliveryDate' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              وضعيت
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              عمليات
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAndSortedDeliveries.map((delivery, index) => (
            <React.Fragment key={delivery.id}>
              <tr className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{delivery.transactionNumber}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    delivery.userType === 'consignment' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {delivery.userType === 'consignment' ? 'اماني' : 'تملکي'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div className="font-medium">
                      {delivery.userType === 'consignment' ? (
                        delivery.recipientType === 'customer' 
                          ? delivery.customerCompanyName || 'مشتري طرف حساب'
                          : delivery.companyName || 'شرکت طرف حساب'
                      ) : 'شرکت صنعت غذايي کورش'}
                    </div>
                    <div className="text-gray-500">{delivery.productName}</div>
                    {delivery.userType === 'consignment' && delivery.contractNumber && (
                      <div className="text-xs text-blue-600">قرارداد: {delivery.contractNumber}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{delivery.contractNumber || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    {delivery.systemPermitNumber ? (
                      <div>
                        <div className="font-medium text-blue-700">{delivery.systemPermitNumber}</div>
                        {delivery.managementLetterNumber && (
                          <div className="text-xs text-gray-500">نامه: {delivery.managementLetterNumber}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div className="font-medium">{formatPersianNumber(delivery.amount)} {delivery.unit === 'kg' ? 'کيلوگرم' : 'تن'}</div>
                    {delivery.fromPermit && delivery.permitAmount && (
                      <div className="text-xs space-y-1 mt-1">
                        <div className="text-blue-600">مجوز حواله: {formatPersianNumber(delivery.permitAmount)}</div>
                        {delivery.wastageAmount && (
                          <div className="text-red-600">افت: {formatPersianNumber(delivery.wastageAmount)}</div>
                        )}
                        {delivery.finalPermitAmount && (
                          <div className="text-green-600">خالص: {formatPersianNumber(delivery.finalPermitAmount)}</div>
                        )}
                        {/* >>>>> شروع تغييرات: فراخواني تابع جديد براي محاسبه و نمايش مانده مجوز <<<<< */}
                        <div className="text-yellow-600">مانده: {formatPersianNumber(calculateRemainingPermitAmount(delivery))}</div>
                        {/* >>>>> پايان تغييرات <<<<< */}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div>{formatPersianDate(delivery.deliveryDate)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                      {getStatusText(delivery.status)}
                    </span>
                    {delivery.trustDelivery && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                        اماني
                      </span>
                    )}
                    {delivery.fromPermit && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        از مجوز
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex flex-col gap-1">
                    {/* Next Stage Button */}
                    {getNextStageText(delivery.status) && (
                      <button
                        onClick={() => {
                          if (delivery.status === 'finalized') {
                            onPrint(delivery);
                            onStatusChange(delivery.id, 'printed');
                          } else {
                            onStatusChange(delivery.id, getNextStatus(delivery.status));
                          }
                        }}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        {delivery.status === 'finalized' ? <Printer className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                        {getNextStageText(delivery.status)}
                      </button>
                    )}

                    {/* Back to Previous Stage / Edit Button */}
                    {delivery.status !== 'draft' && delivery.status !== 'correction_requested' && (
                      <button
                        onClick={() => onBackToPreviousStage(delivery.id)}
                        className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700 transition-colors flex items-center gap-1"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        برگشت/ويرايش
                      </button>
                    )}

                    {/* Edit Button for Draft or Correction Requested */}
                    {(delivery.status === 'draft' || (delivery.status === 'correction_requested' && canEditDelivery(delivery))) && (
                      <button
                        onClick={() => onEdit(delivery.id)}
                        className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700 transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        ويرايش حواله
                      </button>
                    )}

                    {/* Preview Print Button */}
                    {delivery.status === 'printed' && (
                      <button
                        onClick={() => onPrint(delivery)}
                        className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700 transition-colors flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        پيش‌نمايش
                      </button>
                    )}

                    {/* Delete/Correction Request Button */}
                    {delivery.status === 'draft' && (
                      <button
                        onClick={() => onDelete(delivery.id)}
                        className={`px-2 py-1 rounded text-xs hover:opacity-90 transition-colors flex items-center gap-1 ${
                          delivery.userType === 'consignment' 
                            ? 'bg-orange-600 text-white hover:bg-orange-700' 
                            : 'bg-red-600 text-white hover:bg-red-600'
                        }`}
                      >
                        <Trash2 className="h-3 w-3" />
                        {delivery.userType === 'consignment' ? 'درخواست اصلاحيه' : 'حذف حواله'}
                      </button>
                    )}
                    
                    {/* Expand/Collapse Details Button */}
                    <button
                      onClick={() => toggleRowExpansion(delivery.id)}
                      className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-300 transition-colors flex items-center gap-1"
                    >
                      {expandedRows.has(delivery.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      جزئيات
                    </button>
                  </div>
                </td>
              </tr>
              
              {/* Expanded Row Details */}
              {expandedRows.has(delivery.id) && (
                <tr>
                  <td colSpan={9} className="px-6 py-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {delivery.recipientType === 'company' && delivery.companyLocationName && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          لوکيشن طرف حساب: {delivery.companyLocationName}
                        </div>
                      )}
                      {delivery.recipientType === 'customer' && (
                        <div className="text-xs space-y-1">
                          {delivery.customerCompanyName && (
                            <div className="text-orange-600 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              مشتري: {delivery.customerCompanyName}
                            </div>
                          )}
                          {delivery.customerLocationName && (
                            <div className="text-purple-600 flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              لوکيشن مشتري: {delivery.customerLocationName}
                            </div>
                          )}
                        </div>
                      )}
                      {delivery.driverName && (
                        <div className="text-xs text-orange-600">
                          ?? راننده: {delivery.driverName}
                        </div>
                      )}
                      {delivery.notes && (
                        <div className="text-xs text-blue-600 italic">
                          توضيحات: {delivery.notes}
                        </div>
                      )}
                      {delivery.locationName && (
                        <div className="text-xs text-green-600">
                          ?? لوکيشن: {delivery.locationName}
                        </div>
                      )}
                      {delivery.siteName && (
                        <div className="text-xs text-blue-600">
                          ?? سايت: {delivery.siteName}
                        </div>
                      )}
                      {delivery.tankName && (
                        <div className="text-xs text-blue-600">
                          ??? مخزن: {delivery.tankName}
                        </div>
                      )}
                      {delivery.shipName && (
                        <div className="text-xs text-blue-600">
                          ?? نام کشتي: {delivery.shipName}
                        </div>
                      )}
                      {delivery.quotaNumber && (
                        <div className="text-xs text-blue-600">
                          ?? شماره کوتاژ: {delivery.quotaNumber}
                        </div>
                      )}
                      {delivery.registrationOrderNumber && (
                        <div className="text-xs text-blue-600">
                          ?? شماره شاخص/ثبت سفارش: {delivery.registrationOrderNumber}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {filteredAndSortedDeliveries.length === 0 && (
        <div className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <FileText className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">حواله اي يافت نشد</h3>
          <p className="text-gray-600">
            {searchTerm || filters.userType || filters.status || filters.dateFrom || filters.dateTo 
              ? 'نتيجه اي براي جستجوي شما يافت نشد.' 
              : 'هنوز حواله اي ثبت نشده است.'}
          </p>
        </div>
      )}
    </div>
  );
};

// کامپوننت اصلي
export const WarehouseDeliveryManager: React.FC = () => {
  const storage = DataStorage.getInstance();
  
  const [deliveries, setDeliveries] = useState<WarehouseDelivery[]>([]);
  const [baseData, setBaseData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDelivery, setEditingDelivery] = useState<string | null>(null);
  const [newDelivery, setNewDelivery] = useState<Partial<WarehouseDelivery>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPermitInfo, setShowPermitInfo] = useState(false);
  const [permitData, setPermitData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    userType: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    visible: boolean;
  }>({
    type: 'info',
    message: '',
    visible: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State براي نمايش ديالوگ‌هاي انتخاب
  const [showDeliveryTypeSelector, setShowDeliveryTypeSelector] = useState(false);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [showContractSelector, setShowContractSelector] = useState(false);
  const [showPermitSelector, setShowPermitSelector] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedPermitId, setSelectedPermitId] = useState<string | null>(null);

  // Load deliveries from storage
  useEffect(() => {
    const loadData = () => {
      try {
        const loadedBaseData = {
          companies: storage.loadData('category_companies')?.items || baseDataCategories.companies || [],
          customerCompanies: storage.loadData('category_customer_companies')?.items || baseDataCategories.customer_companies || [],
          ownedProducts: storage.loadData('category_owned_products')?.items || baseDataCategories.owned_products || [],
          consignmentProducts: storage.loadData('category_consignment_products')?.items || baseDataCategories.consignment_products || [],
          sites: storage.loadData('category_sites')?.items || baseDataCategories.sites || [],
          tanks: storage.loadData('category_tanks')?.items || baseDataCategories.tanks || [],
          locations: storage.loadData('category_locations')?.items || baseDataCategories.locations || [],
          drivers: storage.loadData('category_drivers')?.items || baseDataCategories.drivers || [],
          internalSites: storage.loadData('category_internal_sites')?.items || baseDataCategories.internal_sites || [],
          contractorSites: storage.loadData('category_contractor_sites')?.items || baseDataCategories.contractor_sites || []
        };
        
        setBaseData(loadedBaseData);
        
        const savedDeliveries = storage.loadData('deliveries');
        if (savedDeliveries && savedDeliveries.length > 0) {
          const deliveriesWithDates = savedDeliveries.map((delivery: any) => ({
            ...delivery,
            deliveryDate: new Date(delivery.deliveryDate),
            createdAt: new Date(delivery.createdAt),
            updatedAt: new Date(delivery.updatedAt)
          }));
          setDeliveries(deliveriesWithDates);
        } else {
          setDeliveries(initialDeliveries);
          storage.saveData('deliveries', initialDeliveries);
        }

        const savedContracts = storage.loadData('contracts') || [];
        setContracts(savedContracts);
      } catch (error) {
        console.error('Error loading data:', error);
        showNotification('error', 'خطا در بارگذاري داده‌ها');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Save deliveries to storage whenever deliveries change
  useEffect(() => {
    if (deliveries.length > 0) {
      storage.saveData('deliveries', deliveries);
    }
  }, [deliveries]);

  // تابع براي دريافت اطلاعات مجوز از صفحه مجوزها
  // تابع براي دريافت اطلاعات مجوز از صفحه مجوزها
useEffect(() => {
  // بررسي اينکه آيا اطلاعات مجوز از صفحه مجوزها ارسال شده است
  const permitInfo = storage.loadData('permitTransfer');
  if (permitInfo) {
    setPermitData(permitInfo);
    setShowPermitInfo(true);
    
    // دريافت اطلاعات رسيد انبار مرتبط با مجوز
    const receiptData = storage.loadData('receipts')?.find((r: any) => r.id === permitInfo.receiptId);
    
    // ايجاد حواله جديد با اطلاعات مجوز و رسيد انبار
    const newDeliveryFromPermit: Partial<WarehouseDelivery> = {
      fromPermit: true,
      permitId: permitInfo.permitId,
      systemPermitNumber: permitInfo.systemPermitNumber,
      managementLetterNumber: permitInfo.managementLetterNumber,
      receiptId: permitInfo.receiptId,
      receiptNumber: permitInfo.receiptNumber,
      amount: permitInfo.amount, // مقدار مجوز حواله به فيلد مقدار در حواله انبار
      wastageAmount: permitInfo.wastageAmount,
      finalPermitAmount: permitInfo.finalAmount,
      permitDate: permitInfo.permitDate,
      approvalDate: permitInfo.approvalDate, // تاريخ تاييد مجوز هم منتقل مي‌شود
      userType: 'consignment', // حواله‌هاي ايجاد شده از مجوز به صورت پيش‌فرض اماني هستند
      unit: 'kg',
      deliveryDate: new Date(),
      status: 'draft',
      trustDelivery: true, // حواله‌هاي ايجاد شده از مجوز به صورت پيش‌فرض اماني هستند
      
      // --- شروع بخش اصلاح شده ---
      // اضافه کردن فيلدهاي کليدي براي انتقال صحيح مقدار و مانده مجوز
      permitAmount: permitInfo.permitAmount, // <<<< اين خط اضافه شد
      remainingTransferPermit: permitInfo.remainingTransferPermit, // <<<< و اين خط اضافه شد
      // --- پايان بخش اصلاح شده ---
      
      // اطلاعات از رسيد انبار
      siteId: receiptData?.siteId,
      siteName: receiptData?.siteName,
      tankId: receiptData?.tankId,
      tankName: receiptData?.tankName,
      companyId: receiptData?.companyId,
      companyName: receiptData?.companyName,
      contractId: receiptData?.contractId,
      contractNumber: receiptData?.contractNumber,
      productId: receiptData?.productId,
      productName: receiptData?.productName,
      unit: receiptData?.unit,
      shipName: receiptData?.shipName,
      quotaNumber: receiptData?.quotaNumber,
      registrationOrderNumber: receiptData?.registrationOrderNumber
    };
    
    setNewDelivery(newDeliveryFromPermit);
    setIsAddingNew(true);
    
    // پاک کردن اطلاعات منتقل شده از storage
    storage.saveData('permitTransfer', null);
    
    showNotification('info', 'حواله جديد از اطلاعات مجوز ايجاد شد');
  }
}, [storage]);

  // تابع براي بررسي درخواست اصلاحيه انبار
  useEffect(() => {
    const correctionRequests = storage.loadData('correction-requests') || [];
    
    // اگر درخواست اصلاحيه وجود داشته باشد، وضعيت مجوز مربوطه را به‌روزرساني کن
    correctionRequests.forEach((request: any) => {
      if (request.requestType === 'correction' && request.status === 'pending') {
        // پيدا کردن مجوز مربوط به حواله
        const delivery = deliveries.find(d => d.id === request.deliveryId);
        if (delivery && delivery.permitId) {
          // به‌روزرساني وضعيت مجوز
          const deliveryPermits = storage.loadData('delivery-permits') || [];
          const updatedPermits = deliveryPermits.map((permit: any) => {
            if (permit.id === delivery.permitId) {
              return {
                ...permit,
                event: 'درخواست اصلاحيه انبار',
                status: 'issued' // وضعيت همچنان "صادر شده" باقي مي‌ماند
              };
            }
            return permit;
          });
          
          storage.saveData('delivery-permits', updatedPermits);
          
          // به‌روزرساني وضعيت درخواست
          const updatedRequests = correctionRequests.map((req: any) => {
            if (req.id === request.id) {
              return { ...req, status: 'processed' };
            }
            return req;
          });
          
          storage.saveData('correction-requests', updatedRequests);
          
          showNotification('warning', `درخواست اصلاحيه براي حواله ${delivery.transactionNumber} ثبت شد`);
        }
      }
    });
  }, [deliveries, storage]);

  // تابع نمايش اعلان
  const showNotification = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({
      type,
      message,
      visible: true
    });
    
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 5000);
  }, []);

  // اعتبارسنجي تاريخ تراکنش اماني با بازه قرارداد
  const validateConsignmentTransactionDate = (contractId: string, transactionDate: Date): boolean => {
    if (!contractId) return true;
    
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return true;
    
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);
    
    return transactionDate >= startDate && transactionDate <= endDate;
  };

  const validateDelivery = (delivery: Partial<WarehouseDelivery>): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!delivery.productId) {
      errors.productId = 'انتخاب کالا الزامي است';
    }

    if (!delivery.siteId) {
      errors.siteId = 'انتخاب سايت الزامي است';
    }

    if (!delivery.tankId) {
      errors.tankId = 'انتخاب مخزن الزامي است';
    }

    if (!delivery.amount || delivery.amount <= 0) {
      errors.amount = 'مقدار بايد بزرگتر از صفر باشد';
    }

    if (!delivery.deliveryDate) {
      errors.deliveryDate = 'تاريخ حواله الزامي است';
    }

    // For consignment deliveries, validate against available inventory (unless trust delivery)
    if (delivery.userType === 'consignment' && delivery.companyId && delivery.amount && !delivery.trustDelivery) {
      const storage = DataStorage.getInstance();
      const receipts = storage.loadData('receipts') || [];
      const deliveries = storage.loadData('deliveries') || [];

      // Calculate available inventory for this company
      const companyReceipts = receipts.filter(r =>
        r.companyId === delivery.companyId &&
        r.status === 'printed' &&
        r.productId === delivery.productId
      );
      const companyDeliveries = deliveries.filter(d =>
        d.companyId === delivery.companyId &&
        d.status === 'printed' &&
        d.productId === delivery.productId &&
        !d.trustDelivery
      );

      const totalReceived = companyReceipts.reduce((sum, r) => sum + (r.withdrawableAmount || 0), 0);
      const totalDelivered = companyDeliveries.reduce((sum, d) => sum + d.amount, 0);
      const availableInventory = totalReceived - totalDelivered;

      if (delivery.amount > availableInventory) {
        errors.amount = `مقدار حواله نمي‌تواند بيشتر از موجودي قابل برداشت باشد (${formatPersianNumber(availableInventory)} کيلوگرم)`;
      }

      if (!delivery.companyId) {
        errors.companyId = 'براي حواله اماني انتخاب شرکت الزامي است';
      }
    }

    // For owned deliveries, location is required  
    if (delivery.userType === 'owned' && !delivery.locationId) {
      errors.locationId = 'براي حواله تملکي انتخاب لوکيشن الزامي است';
    }

    // Validate recipient type
    if (!delivery.recipientType) {
      errors.recipientType = 'انتخاب تحويل گيرنده الزامي است';
    }

    // Validate location based on recipient type
    if (delivery.recipientType === 'company' && !delivery.companyLocationId) {
      errors.companyLocationId = 'انتخاب لوکيشن طرف حساب الزامي است';
    }

    if (delivery.recipientType === 'customer' && !delivery.customerLocationId) {
      errors.customerLocationId = 'انتخاب لوکيشن مشتري طرف حساب الزامي است';
    }

    return errors;
  };

  const handleStartNewDelivery = () => {
    // نمايش ديالوگ انتخاب نوع حواله
    setShowDeliveryTypeSelector(true);
  };

  // تابع براي انتخاب نوع حواله
  const handleSelectDeliveryType = (type: 'owned' | 'consignment') => {
    setShowDeliveryTypeSelector(false);
    
    if (type === 'consignment') {
      // براي حواله اماني، نمايش ديالوگ انتخاب شرکت
      setShowCompanySelector(true);
    } else {
      // براي حواله تملکي، ايجاد حواله جديد
      setIsAddingNew(true);
      setNewDelivery({
        userType: 'owned',
        unit: 'kg',
        deliveryDate: new Date(),
        status: 'draft',
        amount: 0,
        notes: '',
        trustDelivery: false,
        recipientType: 'company'
      });
      setPermitData(null);
      setShowPermitInfo(false);
    }
  };

  // تابع براي انتخاب شرکت
  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setShowCompanySelector(false);
    
    // دريافت قراردادهاي فعال مربوط به اين شرکت
    const companyContracts = contracts.filter(contract => 
      contract.companyId === companyId && 
      contract.status === 'active'
    );
    
    if (companyContracts.length > 0) {
      setShowContractSelector(true);
    } else {
      showNotification('error', 'هيچ قرارداد فعالي براي اين شرکت يافت نشد');
    }
  };

  // تابع براي انتخاب قرارداد
  const handleSelectContract = (contractId: string) => {
    setSelectedContractId(contractId);
    setShowContractSelector(false);
    
    // دريافت مجوزهاي مربوط به اين قرارداد
    const storage = DataStorage.getInstance();
    const permits = storage.loadData('delivery-permits') || [];
    const contractPermits = permits.filter(permit => 
      permit.contractId === contractId && 
      permit.status === 'issued'
    );
    
    if (contractPermits.length > 0) {
      setShowPermitSelector(true);
    } else {
      showNotification('error', 'هيچ مجوزي براي اين قرارداد يافت نشد');
    }
  };

  // تابع براي انتخاب مجوز
  // تابع براي انتخاب مجوز
const handleSelectPermit = (permitId: string, permitAmount: number, remainingAmount: number) => {
  setSelectedPermitId(permitId);
  setShowPermitSelector(false);
  
  // دريافت اطلاعات مجوز و رسيد انبار مرتبط
  const storage = DataStorage.getInstance();
  const permits = storage.loadData('delivery-permits') || [];
  const receipts = storage.loadData('receipts') || [];
  
  const selectedPermit = permits.find((p: any) => p.id === permitId);
  if (!selectedPermit) return;
  
  const receiptData = receipts.find((r: any) => r.id === selectedPermit.receiptId);
  if (!receiptData) return;
  
  // ايجاد حواله جديد با اطلاعات مجوز و رسيد انبار
  const newDeliveryFromPermit: Partial<WarehouseDelivery> = {
    fromPermit: true,
    permitId: selectedPermit.id,
    systemPermitNumber: selectedPermit.systemPermitNumber,
    managementLetterNumber: selectedPermit.managementLetterNumber,
    
    // --- شروع بخش اصلاح شده ---
    // اطمينان از انتقال صحيح مقادير مجوز و مانده
    permitAmount: permitAmount || selectedPermit.permitAmount, // <<<< اين خط اصلاح شد
    remainingTransferPermit: remainingAmount || 0, // <<<< و اين خط اصلاح شد
    // --- پايان بخش اصلاح شده ---
    
    receiptId: selectedPermit.receiptId,
    receiptNumber: receiptData.transactionNumber,
    amount: selectedPermit.permitAmount, // مقدار مجوز حواله به فيلد مقدار در حواله انبار
    wastageAmount: selectedPermit.wastageAmount,
    finalPermitAmount: selectedPermit.finalPermitAmount,
    permitDate: selectedPermit.permitDate,
    approvalDate: selectedPermit.approvalDate,
    userType: 'consignment',
    unit: receiptData.unit || 'kg',
    deliveryDate: new Date(),
    status: 'draft',
    trustDelivery: true,
    
    // اطلاعات از رسيد انبار
    siteId: receiptData.siteId,
    siteName: receiptData.siteName,
    tankId: receiptData.tankId,
    tankName: receiptData.tankName,
    companyId: receiptData.companyId,
    companyName: receiptData.companyName,
    contractId: receiptData.contractId,
    contractNumber: receiptData.contractNumber,
    productId: receiptData.productId,
    productName: receiptData.productName,
    shipName: receiptData.shipName,
    quotaNumber: receiptData.quotaNumber,
    registrationOrderNumber: receiptData.registrationOrderNumber,
    
    // مقادير اوليه براي فيلدهاي قابل ويرايش
    recipientType: 'company',
    notes: ''
  };
  
  setNewDelivery(newDeliveryFromPermit);
  setIsAddingNew(true);
  showNotification('info', 'حواله جديد از اطلاعات مجوز ايجاد شد');
};

  // تابع براي لغو انتخاب‌ها
  const handleCancelSelection = () => {
    setShowDeliveryTypeSelector(false);
    setShowCompanySelector(false);
    setShowContractSelector(false);
    setShowPermitSelector(false);
    setSelectedCompanyId(null);
    setSelectedContractId(null);
    setSelectedPermitId(null);
  };

  // در تابع handleSave
  const handleSave = () => {
    const validationErrors = validateDelivery(newDelivery);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      showNotification('error', 'لطفاً خطاهاي فرم را برطرف کنيد');
      return;
    }

    // بررسي تاريخ تراکنش اماني
    if (newDelivery.userType === 'consignment' && newDelivery.contractId) {
      const transactionDate = newDelivery.deliveryDate || new Date();
      if (!validateConsignmentTransactionDate(newDelivery.contractId, transactionDate)) {
        showNotification('error', 'خطا: تاريخ تراکنش خارج از بازه زماني قرارداد است');
        return;
      }
    }

    // الزامي بودن شماره قرارداد براي تراکنش‌هاي اماني
    if (newDelivery.userType === 'consignment' && !newDelivery.contractId) {
      showNotification('error', 'براي تراکنش‌هاي اماني انتخاب قرارداد الزامي است');
      return;
    }

    const selectedProduct = (newDelivery.userType === 'consignment' ? baseData.consignmentProducts : baseData.ownedProducts)?.find(p => p.id === newDelivery.productId);
    const selectedSite = baseData.sites?.find(s => s.id === newDelivery.siteId);
    const selectedTank = baseData.tanks?.find(t => t.id === newDelivery.tankId);
    
    // Get complete data from base data storage
    const selectedCompany = baseData.companies?.find(c => c.id === newDelivery.companyId);
    const selectedLocation = baseData.locations?.find(l => l.id === newDelivery.locationId);
    const selectedInternalSite = baseData.internalSites?.find(s => s.id === newDelivery.internalSiteId);
    const selectedContractorSite = baseData.contractorSites?.find(s => s.id === newDelivery.contractorSiteId);
    const selectedDriver = baseData.drivers?.find(d => d.id === newDelivery.driverId);
    const selectedContract = contracts.find(c => c.id === newDelivery.contractId);
    const selectedCompanyLocation = baseData.locations?.find(l => l.id === newDelivery.companyLocationId);
    const selectedCustomerLocation = baseData.locations?.find(l => l.id === newDelivery.customerLocationId);

    setDeliveries(prev => {
      const updatedDeliveries = [...prev];
      
      if (editingDelivery) {
        const index = updatedDeliveries.findIndex(delivery => delivery.id === editingDelivery);
        if (index !== -1) {
          updatedDeliveries[index] = {
            ...updatedDeliveries[index],
            ...newDelivery,
            productName: selectedProduct?.name || '',
            siteName: selectedSite?.name || '',
            tankName: selectedTank?.name || '',
            companyName: selectedCompany?.name,
            companyAddress: selectedCompany?.address,
            companyPhone: selectedCompany?.phone,
            companyContactPerson: selectedCompany?.contactPerson,
            companyRegistrationNumber: selectedCompany?.registrationNumber,
            locationName: selectedLocation?.name,
            locationAddress: selectedLocation?.address,
            locationPhone: selectedLocation?.phone,
            locationPostalCode: selectedLocation?.postalCode,
            driverName: selectedDriver?.name,
            driverNationalId: selectedDriver?.nationalId,
            driverPlateNumber: selectedDriver?.plateNumber,
            driverHomeAddress: selectedDriver?.homeAddress,
            contractNumber: selectedContract?.contractNumber,
            // اضافه کردن فيلدهاي جديد براي انتقال به AccountingManager
            receiptBasisAmount: newDelivery.receiptBasisAmount || 0,
            wastageAmount: newDelivery.wastageAmount || 0,
            // اطمينان از مقداردهي صحيح trustDelivery
            trustDelivery: newDelivery.trustDelivery || false,
            // اضافه کردن فيلدهاي لوکيشن گيرنده
            companyLocationName: selectedCompanyLocation?.name,
            customerLocationName: selectedCustomerLocation?.name,
            // اضافه کردن فيلدهاي کشتي و کوتاژ
            shipName: newDelivery.shipName,
            quotaNumber: newDelivery.quotaNumber,
            registrationOrderNumber: newDelivery.registrationOrderNumber,
            updatedAt: new Date()
          } as WarehouseDelivery;
        }
      } else if (isAddingNew) {
        const newId = `delivery_${Date.now()}`;
        const transactionNumber = generateTransactionNumber('delivery', newDelivery.deliveryDate || new Date());
        
        updatedDeliveries.push({
          ...newDelivery,
          id: newId,
          transactionNumber,
          productName: selectedProduct?.name || '',
          siteName: selectedSite?.name || '',
          tankName: selectedTank?.name || '',
          companyName: selectedCompany?.name,
          companyAddress: selectedCompany?.address,
          companyPhone: selectedCompany?.phone,
          companyContactPerson: selectedCompany?.contactPerson,
          companyRegistrationNumber: selectedCompany?.registrationNumber,
          locationName: selectedLocation?.name,
          locationAddress: selectedLocation?.address,
          locationPhone: selectedLocation?.phone,
          locationPostalCode: selectedLocation?.postalCode,
          driverName: selectedDriver?.name,
          driverNationalId: selectedDriver?.nationalId,
          driverPlateNumber: selectedDriver?.plateNumber,
          driverHomeAddress: selectedDriver?.homeAddress,
          contractNumber: selectedContract?.contractNumber,
          // اضافه کردن فيلدهاي جديد براي انتقال به AccountingManager
          receiptBasisAmount: newDelivery.receiptBasisAmount || 0,
          wastageAmount: newDelivery.wastageAmount || 0,
           // --- شروع بخش اصلاح شده ---
        permitAmount: permitAmount, // <<<< اين خط اضافه شد
        remainingTransferPermit: remainingAmount, // <<<< و اين خط اضافه شد
        // --- پايان بخش اصلاح شده ---
          // اطمينان از مقداردهي صحيح trustDelivery
          trustDelivery: newDelivery.trustDelivery || false,
          // اضافه کردن فيلدهاي لوکيشن گيرنده
          companyLocationName: selectedCompanyLocation?.name,
          customerLocationName: selectedCustomerLocation?.name,
          // اضافه کردن فيلدهاي کشتي و کوتاژ
          shipName: newDelivery.shipName,
          quotaNumber: newDelivery.quotaNumber,
          registrationOrderNumber: newDelivery.registrationOrderNumber,
          createdAt: new Date(),
          updatedAt: new Date()
        } as WarehouseDelivery);
      }
      
      return updatedDeliveries;
    });

    setEditingDelivery(null);
    setIsAddingNew(false);
    setNewDelivery({});
    setErrors({});
    setPermitData(null);
    setShowPermitInfo(false);
    
    showNotification('success', 'حواله با موفقيت ذخيره شد');
  };

  const handleCancel = () => {
    setEditingDelivery(null);
    setIsAddingNew(false);
    setNewDelivery({});
    setErrors({});
    setPermitData(null);
    setShowPermitInfo(false);
  };

  // در کامپوننت WarehouseDeliveryManager
  const handleEdit = (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    
    // بررسي اينکه آيا اين حواله از مجوز ايجاد شده است
    if (delivery.fromPermit && delivery.status !== 'correction_requested') {
      showNotification('warning', 'حواله‌هاي ايجاد شده از مجوز قابل ويرايش نيستند.');
      return;
    }
    
    setEditingDelivery(deliveryId);
    setNewDelivery(delivery);
    setErrors({});
  };

  const handleDelete = (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    
    if (delivery.userType === 'consignment') {
      // براي حواله‌هاي اماني، نمايش "درخواست اصلاحيه"
      if (confirm('آيا از درخواست اصلاحيه براي اين حواله اطمينان داريد؟')) {
        // اضافه کردن اطلاعات اصلاحيه به storage
        const storage = DataStorage.getInstance();
        const correctionRequests = storage.loadData('correction-requests') || [];
        
        correctionRequests.push({
          id: `corr_${Date.now()}`,
          deliveryId,
          transactionNumber: delivery.transactionNumber,
          requestType: 'correction',
          status: 'pending',
          createdAt: new Date(),
          requestBy: 'warehouse'
        });
        
        storage.saveData('correction-requests', correctionRequests);
        
        // به‌روزرساني وضعيت حواله
        setDeliveries(prev => prev.map(d => 
          d.id === deliveryId 
            ? { ...d, status: 'correction_requested', updatedAt: new Date() } 
            : d
        ));
        
        // اگر اين حواله از مجوز ايجاد شده باشد، وضعيت مجوز را هم به‌روزرساني کن
        if (delivery.fromPermit && delivery.permitId) {
          const deliveryPermits = storage.loadData('delivery-permits') || [];
          const updatedPermits = deliveryPermits.map((permit: any) => {
            if (permit.id === delivery.permitId) {
              return {
                ...permit,
                event: 'درخواست اصلاحيه انبار',
                status: 'issued' // وضعيت همچنان "صادر شده" باقي مي‌ماند
              };
            }
            return permit;
          });
          
          storage.saveData('delivery-permits', updatedPermits);
        }
        
        showNotification('warning', 'درخواست اصلاحيه با موفقيت ثبت شد');
      }
    } else {
      // براي حواله‌هاي تملکي، حذف معمولي
      if (confirm('آيا از حذف اين حواله اطمينان داريد؟')) {
        setDeliveries(prev => prev.filter(delivery => delivery.id !== deliveryId));
        showNotification('success', 'حواله با موفقيت حذف شد');
      }
    }
  };

  const handleStatusChange = (deliveryId: string, newStatus: WarehouseDelivery['status']) => {
    setDeliveries(prev => prev.map(delivery =>
      delivery.id === deliveryId
        ? { ...delivery, status: newStatus, updatedAt: new Date() }
        : delivery
    ));
    
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (delivery) {
      showNotification('success', `وضعيت حواله ${delivery.transactionNumber} به ${getStatusText(newStatus)} تغيير يافت`);
    }
  };

  const handleBackToPreviousStage = (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    let previousStatus: WarehouseDelivery['status'] = 'draft';
    
    switch (delivery.status) {
      case 'saved':
        previousStatus = 'draft';
        break;
      case 'finalized':
        previousStatus = 'saved';
        break;
      case 'printed':
        previousStatus = 'finalized';
        break;
    }

    handleStatusChange(deliveryId, previousStatus);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'پيش‌نويس';
      case 'saved': return 'ذخيره شده';
      case 'finalized': return 'نهايي شده';
      case 'printed': return 'چاپ شده';
      case 'correction_requested': return 'درخواست اصلاحيه';
      default: return status;
    }
  };

  const printDelivery = (delivery: WarehouseDelivery) => {
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>حواله انبار - ${delivery.transactionNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
          
          @page {
            margin: 1cm;
            size: A4;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Tajawal', 'Tahoma', sans-serif;
            direction: rtl;
            text-align: right;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            color: #1e293b;
            font-size: 14px;
          }
          
          .container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            padding: 25px 30px;
            position: relative;
            overflow: hidden;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="none" /><path d="M0,0 L100,100 M100,0 L0,100" stroke="rgba(255,255,255,0.1)" stroke-width="2"/></svg>');
            opacity: 0.3;
          }
          
          .header-content {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .company-info {
            flex: 1;
          }
          
          .company-name {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
          }
          
          .document-title {
            font-size: 20px;
            font-weight: 500;
            margin-bottom: 15px;
            opacity: 0.9;
          }
          
          .delivery-number {
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 15px;
            border-radius: 30px;
            font-weight: 600;
            font-size: 16px;
            display: inline-block;
          }
          
          .logo-placeholder {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 28px;
          }
          
          .content {
            padding: 30px;
          }
          
          .section {
            margin-bottom: 25px;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #059669;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
          }
          
          .section-title::before {
            content: '';
            width: 5px;
            height: 20px;
            background: #059669;
            margin-left: 10px;
            border-radius: 3px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
          }
          
          .info-label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 5px;
            font-weight: 500;
          }
          
          .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
          }
          
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .details-table th {
            background: #f1f5f9;
            color: #334155;
            padding: 12px 15px;
            text-align: right;
            font-weight: 600;
            font-size: 14px;
          }
          
          .details-table td {
            padding: 12px 15px;
            text-align: right;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
          }
          
          .details-table tr:last-child td {
            border-bottom: none;
          }
          
          .details-table tr:nth-child(even) {
            background: #f8fafc;
          }
          
          .amount-cell {
            font-weight: 700;
            font-size: 16px;
          }
          
          .positive {
            color: #059669;
          }
          
          .negative {
            color: #dc2626;
          }
          
          .footer {
            background: #f8fafc;
            padding: 25px 30px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .print-info {
            font-size: 12px;
            color: #64748b;
          }
          
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
          }
          
          .signature-box {
            width: 30%;
            text-align: center;
          }
          
          .signature-title {
            font-weight: 600;
            margin-bottom: 5px;
            font-size: 14px;
          }
          
          .signature-line {
            border-top: 1px solid #334155;
            height: 1px;
            width: 80%;
            margin: 30px auto 5px;
          }
          
          .signature-name {
            font-size: 12px;
            color: #64748b;
          }
          
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(5, 150, 105, 0.05);
            font-weight: 700;
            z-index: 0;
            pointer-events: none;
          }
          
          .status-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
          }
          
          .status-draft {
            background: #f1f5f9;
            color: #334155;
          }
          
          .status-saved {
            background: #dbeafe;
            color: #1e40af;
          }
          
          .status-finalized {
            background: #dcfce7;
            color: #166534;
          }
          
          .status-printed {
            background: #e9d5ff;
            color: #7c3aed;
          }
          
          .status-correction {
            background: #fed7aa;
            color: #9a3412;
          }
          
          .permit-info {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
          }
          
          .permit-title {
            font-weight: 600;
            color: #059669;
            margin-bottom: 10px;
            font-size: 14px;
          }
          
          .permit-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          
          .permit-item {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
          }
          
          .permit-label {
            color: #64748b;
          }
          
          .permit-value {
            font-weight: 600;
          }
          
          .qr-code {
            width: 100px;
            height: 100px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #64748b;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="watermark">کورش</div>
          
          <header class="header">
            <div class="header-content">
              <div class="company-info">
                <div class="company-name">شرکت صنعت غذايي کورش</div>
                <div class="document-title">حواله انبار</div>
                <div class="delivery-number">شماره تراکنش: ${delivery.transactionNumber}</div>
              </div>
              <div class="logo-placeholder">کورش</div>
            </div>
          </header>
          
          <div class="content">
            <div class="section">
              <div class="section-title">
                اطلاعات حواله
                <span class="status-badge status-${delivery.status}">
                  ${getStatusText(delivery.status)}
                </span>
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">تاريخ حواله</div>
                  <div class="info-value">${formatPersianDate(delivery.deliveryDate)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">نوع حواله</div>
                  <div class="info-value">${delivery.userType === 'consignment' ? 'اماني' : 'تملکي'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">سايت مخازن</div>
                  <div class="info-value">${delivery.siteName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">مخزن</div>
                  <div class="info-value">${delivery.tankName}</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">اطلاعات گيرنده</div>
              
              <table class="details-table">
                <tr>
                  <th width="25%">نوع گيرنده</th>
                  <td width="25%">${delivery.userType === 'consignment' ? 'اماني' : 'تملکي'}</td>
                  <th width="25%">نام گيرنده</th>
                  <td width="25%">
                    ${delivery.userType === 'consignment' 
                      ? (delivery.recipientType === 'customer' 
                        ? delivery.customerCompanyName || 'مشتري طرف حساب'
                        : delivery.companyName || 'شرکت طرف حساب')
                      : 'شرکت صنعت غذايي کورش'
                    }
                  </td>
                </tr>
                <tr>
                  <th>محل تحويل</th>
                  <td>
                    ${delivery.userType === 'consignment' 
                      ? (delivery.recipientType === 'customer' 
                        ? delivery.customerLocationName || '-'
                        : delivery.companyLocationName || '-')
                      : delivery.locationName || '-'
                    }
                  </td>
                  <th>نام کالا</th>
                  <td>${delivery.productName}</td>
                </tr>
                ${delivery.userType === 'consignment' && delivery.contractNumber ? `
                <tr>
                  <th>شماره قرارداد</th>
                  <td colspan="3">${delivery.contractNumber}</td>
                </tr>
                ` : ''}
                ${delivery.driverName ? `
                <tr>
                  <th>راننده</th>
                  <td colspan="3">${delivery.driverName} - ${delivery.driverPlateNumber || ''}</td>
                </tr>
                ` : ''}
                ${delivery.shipName ? `
                <tr>
                  <th>نام کشتي</th>
                  <td>${delivery.shipName}</td>
                  <th>شماره کوتاژ</th>
                  <td>${delivery.quotaNumber || '-'}</td>
                </tr>
                ` : ''}
                ${delivery.registrationOrderNumber ? `
                <tr>
                  <th>شماره شاخص/ثبت سفارش</th>
                  <td colspan="3">${delivery.registrationOrderNumber}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div class="section">
              <div class="section-title">جزئيات مقداري</div>
              
              <table class="details-table">
                <tr>
                  <th width="30%">شرح</th>
                  <th width="25%">مقدار</th>
                  <th width="15%">واحد</th>
                  <th width="30%">توضيحات</th>
                </tr>
                <tr>
                  <td>مقدار تحويلي</td>
                  <td class="amount-cell positive">${formatPersianNumber(delivery.amount)}</td>
                  <td>${delivery.unit === 'kg' ? 'کيلوگرم' : 'تن'}</td>
                  <td>مقدار خروجي از انبار</td>
                </tr>
                ${delivery.fromPermit ? `
                <tr>
                  <td colspan="4">
                    <div class="permit-info">
                      <div class="permit-title">اطلاعات مجوز مرتبط</div>
                      <div class="permit-details">
                        <div class="permit-item">
                          <span class="permit-label">شماره مجوز سيستم:</span>
                          <span class="permit-value">${delivery.systemPermitNumber || '-'}</span>
                        </div>
                        <div class="permit-item">
                          <span class="permit-label">شماره نامه مديريت:</span>
                          <span class="permit-value">${delivery.managementLetterNumber || '-'}</span>
                        </div>
                        <div class="permit-item">
                          <span class="permit-label">مقدار مجوز حواله:</span>
                          <span class="permit-value">${formatPersianNumber(delivery.permitAmount || 0)}</span>
                        </div>
                        <div class="permit-item">
                          <span class="permit-label">مقدار افت:</span>
                          <span class="permit-value">${formatPersianNumber(delivery.wastageAmount || 0)}</span>
                        </div>
                        <div class="permit-item">
                          <span class="permit-label">مقدار خالص:</span>
                          <span class="permit-value">${formatPersianNumber(delivery.finalPermitAmount || 0)}</span>
                        </div>
                        <div class="permit-item">
                          <span class="permit-label">مانده حواله:</span>
                          <span class="permit-value">${formatPersianNumber((delivery.permitAmount || 0) - delivery.amount)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${delivery.notes ? `
            <div class="section">
              <div class="section-title">توضيحات</div>
              <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px;">
                ${delivery.notes}
              </div>
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <div class="print-info">
              <div>تاريخ چاپ: ${formatPersianDate(new Date())} - ${new Date().toLocaleTimeString('fa-IR')}</div>
              <div>اين حواله توسط سيستم مديريت انبار شرکت صنعت غذايي کورش توليد شده است</div>
            </div>
            <div class="qr-code">
              کد QR براي احراز اصالت<br>
              ${delivery.transactionNumber}
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-title">مدير مالي</div>
              <div class="signature-line"></div>
              <div class="signature-name">نام و امضا</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">مدير انبار</div>
              <div class="signature-line"></div>
              <div class="signature-name">نام و امضا</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">مدير عامل</div>
              <div class="signature-line"></div>
              <div class="signature-name">نام و امضا</div>
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
      printWindow.print();
    }
  };

  // توابع جديد براي قابليت‌هاي هوشمند
  const exportToExcel = () => {
    // ايجاد داده‌ها براي اکسل
    const csvContent = [
      [
        'شماره تراکنش',
        'نوع',
        'نام کالا',
        'شرکت',
        'مقدار',
        'واحد',
        'تاريخ',
        'وضعيت'
      ],
      ...filteredDeliveries.map(delivery => [
        delivery.transactionNumber,
        delivery.userType === 'consignment' ? 'اماني' : 'تملکي',
        delivery.productName,
        delivery.companyName || (delivery.userType === 'owned' ? 'شرکت صنعت غذايي کورش' : '-'),
        delivery.amount,
        delivery.unit === 'kg' ? 'کيلوگرم' : 'تن',
        formatPersianDate(delivery.deliveryDate),
        getStatusText(delivery.status)
      ])
    ].map(row => row.join(',')).join('\n');
    
    // ايجاد و دانلود فايل CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `deliveries_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('success', 'فايل اکسل با موفقيت دانلود شد');
  };

  const importFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        
        // پردازش داده‌ها و افزودن به ليست حواله‌ها
        const newDeliveries: WarehouseDelivery[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue;
          
          const values = lines[i].split(',');
          if (values.length < headers.length) continue;
          
          // ايجاد حواله جديد از داده‌هاي اکسل
          const newDelivery: Partial<WarehouseDelivery> = {
            transactionNumber: values[0],
            userType: values[1] === 'اماني' ? 'consignment' : 'owned',
            productName: values[2],
            companyName: values[3] !== '-' ? values[3] : undefined,
            amount: parseFloat(values[4]),
            unit: values[5] === 'کيلوگرم' ? 'kg' : 'ton',
            deliveryDate: new Date(), // تاريخ امروز به عنوان پيش‌فرض
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // پيدا کردن ID محصول از نام
          const product = [...baseData.ownedProducts, ...baseData.consignmentProducts].find(p => p.name === values[2]);
          if (product) {
            newDelivery.productId = product.id;
          }
          
          // پيدا کردن ID شرکت از نام
          if (values[3] !== '-') {
            const company = baseData.companies.find(c => c.name === values[3]);
            if (company) {
              newDelivery.companyId = company.id;
            }
          }
          
          // ايجاد ID جديد براي حواله
          newDelivery.id = `delivery_${Date.now()}_${i}`;
          
          newDeliveries.push(newDelivery as WarehouseDelivery);
        }
        
        // افزودن حواله‌هاي جديد به ليست
        setDeliveries(prev => [...prev, ...newDeliveries]);
        
        showNotification('success', `${newDeliveries.length} حواله با موفقيت وارد شد`);
      } catch (error) {
        console.error('Error importing from Excel:', error);
        showNotification('error', 'خطا در وارد کردن داده‌ها از فايل اکسل');
      }
    };
    
    reader.readAsText(file);
    
    // ريست کردن ورودي فايل
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(delivery =>
      delivery.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.companyName && delivery.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (delivery.customerCompanyName && delivery.customerCompanyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [deliveries, searchTerm]);

  // اگر در حال بارگذاري هستيم، نمايش لودر
  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">در حال بارگذاري داده‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">حواله انبار</h1>
            <p className="text-gray-600">مديريت حواله هاي انبار و مخازن</p>
          </div>
          <div className="flex items-center">
            <img 
              src="/لوگو صنعت غذايي کورش.jpg" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        {/* Notification */}
        {notification.visible && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' :
            notification.type === 'error' ? 'bg-red-100 text-red-800' :
            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {notification.type === 'error' && <AlertCircle className="h-5 w-5" />}
            {notification.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
            {notification.type === 'info' && <Info className="h-5 w-5" />}
            {notification.message}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">ليست حواله هاي انبار</h2>
                <p className="text-gray-600 text-sm mt-1">
                  مجموع {deliveries.length} حواله
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportToExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  خروجي اکسل
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  ورودي اکسل
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={importFromExcel}
                  className="hidden"
                />
                <button
                  onClick={handleStartNewDelivery}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  حواله جديد
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="جستجو بر اساس شماره تراکنش، نام کالا يا شرکت..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                فيلترها
              </button>
            </div>
            
            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع حواله</label>
                    <select
                      value={filters.userType}
                      onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">همه</option>
                      <option value="owned">تملکي</option>
                      <option value="consignment">اماني</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">وضعيت</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">همه</option>
                      <option value="draft">پيش‌نويس</option>
                      <option value="saved">ذخيره شده</option>
                      <option value="finalized">نهايي شده</option>
                      <option value="printed">چاپ شده</option>
                      <option value="correction_requested">درخواست اصلاحيه</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">از تاريخ</label>
                    <PersianDatePicker
                      value={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                      onChange={(date) => setFilters({ ...filters, dateFrom: date ? date.toISOString() : '' })}
                      placeholder="انتخاب تاريخ"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تا تاريخ</label>
                    <PersianDatePicker
                      value={filters.dateTo ? new Date(filters.dateTo) : undefined}
                      onChange={(date) => setFilters({ ...filters, dateTo: date ? date.toISOString() : '' })}
                      placeholder="انتخاب تاريخ"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setFilters({ userType: '', status: '', dateFrom: '', dateTo: '' })}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    پاک کردن فيلترها
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add/Edit Delivery Form */}
          {(isAddingNew || editingDelivery) && (
            <DeliveryForm
              delivery={newDelivery}
              baseData={baseData}
              contracts={contracts}
              errors={errors}
              isEditing={!!editingDelivery}
              fromPermit={!!editingDelivery && deliveries.find(d => d.id === editingDelivery)?.fromPermit}
              onChange={setNewDelivery}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}

          {/* Deliveries Table */}
          <DeliveriesTable
            deliveries={filteredDeliveries}
            searchTerm={searchTerm}
            filters={filters}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onBackToPreviousStage={handleBackToPreviousStage}
            onPrint={printDelivery}
          />
        </div>
      </div>

      {/* Dialogs for selection process */}
      {showDeliveryTypeSelector && (
        <DeliveryTypeSelector
          onSelectType={handleSelectDeliveryType}
          onCancel={handleCancelSelection}
        />
      )}

      {showCompanySelector && (
        <CompanySelector
          companies={baseData.companies || []}
          onSelectCompany={handleSelectCompany}
          onCancel={handleCancelSelection}
        />
      )}

      {showContractSelector && (
        <ContractSelector
          contracts={contracts.filter(c => c.companyId === selectedCompanyId && c.status === 'active')}
          onSelectContract={handleSelectContract}
          onCancel={handleCancelSelection}
        />
      )}

      {showPermitSelector && (
        <PermitSelector
          permits={(() => {
            const storage = DataStorage.getInstance();
            const permits = storage.loadData('delivery-permits') || [];
            return permits.filter(p => 
              p.contractId === selectedContractId && 
              p.status === 'issued'
            );
          })()}
          onSelectPermit={handleSelectPermit}
          onCancel={handleCancelSelection}
        />
      )}
    </div>
  );
};