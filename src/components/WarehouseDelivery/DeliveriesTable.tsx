import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Eye, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { WarehouseDelivery, DeliveryFilters } from '../../types/WarehouseDeliveryTypes';
import { 
  canEditDelivery, 
  getStatusText, 
  getStatusColor, 
  getNextStageText, 
  getNextStatus 
} from '../../utils/warehouseDeliveryUtils';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';

interface DeliveriesTableProps {
  deliveries: WarehouseDelivery[];
  searchTerm: string;
  filters: DeliveryFilters;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: WarehouseDelivery['status']) => void;
  onBackToPreviousStage: (id: string) => void;
  onPrint: (delivery: WarehouseDelivery) => void;
  onRequestCorrection: (id: string) => void;
}

const DeliveriesTable: React.FC<DeliveriesTableProps> = ({ 
  deliveries, 
  searchTerm, 
  filters, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  onBackToPreviousStage, 
  onPrint,
  onRequestCorrection
}) => {
  const [sortField, setSortField] = useState<keyof WarehouseDelivery>('deliveryDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const storage = DataStorage.getInstance();

  // فیلتر و مرتب‌سازی تحویل‌ها
  const filteredAndSortedDeliveries = useMemo(() => {
    let filtered = deliveries.filter(delivery => {
      // فیلتر بر اساس عبارت جستجو
      const matchesSearch = 
        delivery.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (delivery.companyName && delivery.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (delivery.customerCompanyName && delivery.customerCompanyName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // فیلتر بر اساس نوع تحویل
      const matchesType = !filters.userType || delivery.userType === filters.userType;
      
      // فیلتر بر اساس وضعیت
      const matchesStatus = !filters.status || delivery.status === filters.status;
      
      // فیلتر بر اساس تاریخ
      let matchesDate = true;
      if (filters.dateFrom) {
        matchesDate = matchesDate && new Date(delivery.deliveryDate) >= new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        matchesDate = matchesDate && new Date(delivery.deliveryDate) <= new Date(filters.dateTo);
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
    
    // مرتب‌سازی
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

  // دریافت اطلاعات مجوز برای تحویل‌های ایجاد شده از مجوز
  const getPermitInfo = (delivery: WarehouseDelivery) => {
    if (!delivery.fromPermit || !delivery.permitId) return null;
    
    const permits = storage.loadData('delivery-permits') || [];
    return permits.find((p: any) => p.id === delivery.permitId);
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
              شرکت/مکان
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              نام محصول
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              مقدار تحویل
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              مقدار مجوز
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              مانده مجوز حواله
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              مانده مجوز
            </th>
            <th 
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('deliveryDate')}
            >
              <div className="flex items-center gap-1">
                تاریخ تحویل
                {sortField === 'deliveryDate' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                )}
              </div>
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              وضعیت
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              عملیات
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAndSortedDeliveries.map((delivery) => {
            const permitInfo = getPermitInfo(delivery);
            
            return (
              <React.Fragment key={delivery.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.transactionNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.userType === 'owned' ? 'تملیکی' : 'امانی'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.userType === 'owned' 
                      ? delivery.locationName 
                      : delivery.companyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPersianNumber(delivery.amount)} {delivery.unit === 'kg' ? 'کیلوگرم' : 'تن'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.fromPermit && permitInfo ? (
                      <span className="font-medium text-blue-600">
                        {formatPersianNumber(permitInfo.permitAmount)} {delivery.unit === 'kg' ? 'کیلوگرم' : 'تن'}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.fromPermit && permitInfo ? (
                      <span className="font-medium text-orange-600">
                        {formatPersianNumber(permitInfo.remainingTransferPermit)} {delivery.unit === 'kg' ? 'کیلوگرم' : 'تن'}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.fromPermit && permitInfo ? (
                      <span className="font-medium text-green-600">
                        {formatPersianNumber(permitInfo.remainingPermit)} {delivery.unit === 'kg' ? 'کیلوگرم' : 'تن'}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPersianDate(new Date(delivery.deliveryDate))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {delivery.fromPermit && permitInfo ? (
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${
                        permitInfo.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        permitInfo.status === 'saved' ? 'bg-blue-100 text-blue-800' :
                        permitInfo.status === 'issued' ? 'bg-green-100 text-green-800' :
                        permitInfo.status === 'printed' ? 'bg-purple-100 text-purple-800' :
                        permitInfo.status === 'correction_requested' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {permitInfo.status === 'draft' ? 'پیش‌نویس' :
                         permitInfo.status === 'saved' ? 'ذخیره شده' :
                         permitInfo.status === 'issued' ? 'صادر شده' :
                         permitInfo.status === 'printed' ? 'چاپ شده' :
                         permitInfo.status === 'correction_requested' ? 'درخواست اصلاحیه' :
                         permitInfo.status === 'cancelled' ? 'لغو شده' :
                         'نامشخص'}
                      </span>
                    ) : (
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${
                        delivery.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        delivery.status === 'saved' ? 'bg-blue-100 text-blue-800' :
                        delivery.status === 'finalized' ? 'bg-green-100 text-green-800' :
                        delivery.status === 'printed' ? 'bg-purple-100 text-purple-800' :
                        delivery.status === 'correction_requested' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getStatusText(delivery.status)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleRowExpansion(delivery.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEditDelivery(delivery) && (
                        <button
                          onClick={() => onEdit(delivery.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {(delivery.status !== 'finalized' && delivery.status !== 'printed') && (
                        <button
                          onClick={() => onDelete(delivery.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {getNextStageText(delivery.status || 'issued') && (
                        <button
                          onClick={() => onStatusChange(delivery.id, getNextStatus(delivery.status || 'issued'))}
                          className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                        >
                          {getNextStageText(delivery.status || 'issued')}
                        </button>
                      )}
                      {(delivery.status || 'issued') !== 'draft' && (
                        <button
                          onClick={() => onBackToPreviousStage(delivery.id)}
                          className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700"
                        >
                          بازگشت به مرحله قبل
                        </button>
                      )}
                      {(delivery.status || 'issued') === 'finalized' && (
                        <button
                          onClick={() => onPrint(delivery)}
                          className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700"
                        >
                          چاپ
                        </button>
                      )}
                      <button
                        onClick={() => onRequestCorrection(delivery.id)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRows.has(delivery.id) && (
                  <tr>
                    <td colSpan={11} className="px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">اطلاعات پایه</h4>
                          <dl className="space-y-1">
                            <div className="flex justify-between">
                              <dt className="text-sm text-gray-500">شماره تراکنش:</dt>
                              <dd className="text-sm text-gray-900">{delivery.transactionNumber}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-sm text-gray-500">نوع تحویل:</dt>
                              <dd className="text-sm text-gray-900">{delivery.userType === 'owned' ? 'متعلق به شرکت' : 'امانی'}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-sm text-gray-500">محل تحویل:</dt>
                              <dd className="text-sm text-gray-900">{delivery.siteName}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-sm text-gray-500">مخزن:</dt>
                              <dd className="text-sm text-gray-900">{delivery.tankName}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-sm text-gray-500">مقدار تحویل:</dt>
                              <dd className="text-sm text-gray-900">{formatPersianNumber(delivery.amount)} {delivery.unit === 'kg' ? 'کیلوگرم' : 'تن'}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-sm text-gray-500">تاریخ تحویل:</dt>
                              <dd className="text-sm text-gray-900">{formatPersianDate(new Date(delivery.deliveryDate))}</dd>
                            </div>
                          </dl>
                        </div>
                        
                        {delivery.userType === 'consignment' && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">اطلاعات شرکت امانی</h4>
                            <dl className="space-y-1">
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">نام شرکت:</dt>
                                <dd className="text-sm text-gray-900">{delivery.companyName}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">شماره قرارداد:</dt>
                                <dd className="text-sm text-gray-900">{delivery.contractNumber}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">تحویل امانی:</dt>
                                <dd className="text-sm text-gray-900">{delivery.trustDelivery ? 'بله' : 'خیر'}</dd>
                              </div>
                            </dl>
                          </div>
                        )}
                        
                        {delivery.userType === 'owned' && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">اطلاعات مکان</h4>
                            <dl className="space-y-1">
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">نام مکان:</dt>
                                <dd className="text-sm text-gray-900">{delivery.locationName}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">آدرس:</dt>
                                <dd className="text-sm text-gray-900">{delivery.locationAddress}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">تلفن:</dt>
                                <dd className="text-sm text-gray-900">{delivery.locationPhone}</dd>
                              </div>
                            </dl>
                          </div>
                        )}
                        
                        {delivery.fromPermit && permitInfo && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">اطلاعات مجوز</h4>
                            <dl className="space-y-1">
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">شماره مجوز سیستم:</dt>
                                <dd className="text-sm text-gray-900">{permitInfo.systemPermitNumber}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">شماره نامه مدیریت:</dt>
                                <dd className="text-sm text-gray-900">{permitInfo.managementLetterNumber}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">مقدار مجوز:</dt>
                                <dd className="text-sm text-gray-900">{formatPersianNumber(permitInfo.permitAmount)}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">مانده مجوز حواله:</dt>
                                <dd className="text-sm text-gray-900">{formatPersianNumber(permitInfo.remainingTransferPermit)}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">مانده مجوز:</dt>
                                <dd className="text-sm text-gray-900">{formatPersianNumber(permitInfo.remainingPermit)}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">وضعیت مجوز:</dt>
                                <dd className="text-sm text-gray-900">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    permitInfo.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                    permitInfo.status === 'saved' ? 'bg-blue-100 text-blue-800' :
                                    permitInfo.status === 'issued' ? 'bg-green-100 text-green-800' :
                                    permitInfo.status === 'printed' ? 'bg-purple-100 text-purple-800' :
                                    permitInfo.status === 'correction_requested' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {permitInfo.status === 'draft' ? 'پیش‌نویس' :
                                     permitInfo.status === 'saved' ? 'ذخیره شده' :
                                     permitInfo.status === 'issued' ? 'صادر شده' :
                                     permitInfo.status === 'printed' ? 'چاپ شده' :
                                     permitInfo.status === 'correction_requested' ? 'درخواست اصلاحیه' :
                                     permitInfo.status === 'cancelled' ? 'لغو شده' :
                                     'نامشخص'}
                                  </span>
                                </dd>
                              </div>
                            </dl>
                          </div>
                        )}
                        
                        {delivery.driverName && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">اطلاعات راننده</h4>
                            <dl className="space-y-1">
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">نام راننده:</dt>
                                <dd className="text-sm text-gray-900">{delivery.driverName}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">کد ملی:</dt>
                                <dd className="text-sm text-gray-900">{delivery.driverNationalId}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-gray-500">شماره پلاک:</dt>
                                <dd className="text-sm text-gray-900">{delivery.driverPlateNumber}</dd>
                              </div>
                            </dl>
                          </div>
                        )}
                        
                        {delivery.notes && (
                          <div className="md:col-span-2 lg:col-span-3">
                            <h4 className="font-medium text-gray-900 mb-2">یادداشت‌ها</h4>
                            <p className="text-sm text-gray-900">{delivery.notes}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {filteredAndSortedDeliveries.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          هیچ تحویلی یافت نشد
        </div>
      )}
    </div>
  );
};

export default DeliveriesTable;