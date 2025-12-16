// برنامه ChartsSection.tsx
import React from 'react';
import { ChartData, ActiveTab } from '../../types/accounting';
import { formatPersianNumber, formatPersianDate } from '../../utils/persian';
import { PieChart, BarChart, TrendingUp, Calculator } from 'lucide-react';

interface ChartsSectionProps { 
  activeTab: ActiveTab;
  uninvoicedReceipts: any[];
  invoicedReceipts: any[];
  deliveryPermitsData: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export const ChartsSection: React.FC<ChartsSectionProps> = ({ 
  activeTab, 
  uninvoicedReceipts, 
  invoicedReceipts, 
  deliveryPermitsData 
}) => {
  const getChartData = () => {
    if (activeTab === 'uninvoiced') {
      const data: ChartData[] = [
        { name: 'رسيد انبارهای امانی', value: uninvoicedReceipts.length }
      ];
      
      const productCounts: Record<string, number> = {};
      uninvoicedReceipts.forEach(receipt => {
        const productName = receipt.productName || 'نامشخص';
        productCounts[productName] = (productCounts[productName] || 0) + 1;
      });
      
      Object.entries(productCounts).forEach(([name, value]) => {
        data.push({ name, value });
      });
      
      return data;
    } else if (activeTab === 'invoiced') {
      const totalInvoiced = invoicedReceipts.reduce((sum, item) => sum + item.invoiceAmount, 0);
      const totalPaid = invoicedReceipts.reduce((sum, item) => sum + item.paidAmount, 0);
      const totalDebt = invoicedReceipts.reduce((sum, item) => sum + item.remainingDebt, 0);
      const settledCount = invoicedReceipts.filter(item => item.remainingDebt === 0).length;
      const unsettledCount = invoicedReceipts.filter(item => item.remainingDebt > 0).length;
      
      const automaticCount = invoicedReceipts.filter(item => item.invoiceType === 'automatic').length;
      const manualCount = invoicedReceipts.filter(item => item.invoiceType === 'manual').length;
      
      return [
        { name: 'مبلغ کل فاکتورها', value: totalInvoiced },
        { name: 'مبلغ کل پرداخت شده', value: totalPaid },
        { name: 'مبلغ کل بدهي', value: totalDebt },
        { name: 'فاکتورهاي تسويه شده', value: settledCount },
        { name: 'فاکتورهاي تسويه نشده', value: unsettledCount },
        { name: 'فاکتورهاي اتوماتيک', value: automaticCount },
        { name: 'فاکتورهاي دستي', value: manualCount }
      ];
    } else {
      const totalPermitted = deliveryPermitsData.reduce((sum, item) => sum + item.permitAmount, 0);
      const totalWastage = deliveryPermitsData.reduce((sum, item) => sum + item.wastageAmount, 0);
      const totalFinalPermitted = deliveryPermitsData.reduce((sum, item) => sum + item.finalPermitAmount, 0);
      const draftCount = deliveryPermitsData.filter(item => item.status === 'draft').length;
      const issuedCount = deliveryPermitsData.filter(item => item.status === 'issued').length;
      const usedCount = deliveryPermitsData.filter(item => item.status === 'used').length;
      const cancelledCount = deliveryPermitsData.filter(item => item.status === 'cancelled').length;
      
      return [
        { name: 'مجموع مجوزهاي صادر شده', value: totalPermitted },
        { name: 'مجموع افت مجوزها', value: totalWastage },
        { name: 'مجموع مجوزهاي قابل استفاده', value: totalFinalPermitted },
        { name: 'مجوزهاي پيش‌نویس', value: draftCount },
        { name: 'مجوزهاي صادر شده', value: issuedCount },
        { name: 'مجوزهاي استفاده شده', value: usedCount },
        { name: 'مجوزهاي ابطال شده', value: cancelledCount }
      ];
    }
  };
  
  const chartData = getChartData();
  
  const getBarChartData = () => {
    if (activeTab === 'uninvoiced') {
      const monthCounts: Record<string, number> = {};
      
      uninvoicedReceipts.forEach(receipt => {
        const date = new Date(receipt.receiptDate);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      });
      
      return Object.entries(monthCounts).map(([key, value]) => {
        const [year, month] = key.split('-').map(Number);
        return {
          name: `${year}/${month}`,
          value
        };
      });
    } else if (activeTab === 'invoiced') {
      const monthAmounts: Record<string, number> = {};
      
      invoicedReceipts.forEach(item => {
        const monthKey = `${item.year}-${item.month}`;
        monthAmounts[monthKey] = (monthAmounts[monthKey] || 0) + item.invoiceAmount;
      });
      
      return Object.entries(monthAmounts).map(([key, value]) => {
        const [year, month] = key.split('-').map(Number);
        return {
          name: `${year}/${month}`,
          value
        };
      });
    } else {
      const statusAmounts: Record<string, number> = {};
      
      deliveryPermitsData.forEach(item => {
        const status = item.status === 'draft' ? 'پيش‌نویس' : 
                      item.status === 'issued' ? 'صادر شده' : 
                      item.status === 'used' ? 'استفاده شده' : 'ابطال شده';
        statusAmounts[status] = (statusAmounts[status] || 0) + item.permitAmount;
      });
      
      return Object.entries(statusAmounts).map(([name, value]) => ({
        name,
        value
      }));
    }
  };
  
  const barChartData = getBarChartData();
  
  const maxValue = Math.max(...barChartData.map(item => item.value), 1);
  
  // محاسبه جمع کل ستون‌ها
  const calculateColumnSum = (data: any[], column: string) => {
    return data.reduce((sum, item) => sum + (item[column] || 0), 0);
  };
  
  // محاسبه تعداد تراکنش‌ها
  const getRowCount = () => {
    switch (activeTab) {
      case 'uninvoiced':
        return uninvoicedReceipts.length;
      case 'invoiced':
        return invoicedReceipts.length;
      case 'permits':
        return deliveryPermitsData.length;
      default:
        return 0;
    }
  };

  return (
    <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart className="h-5 w-5 mr-2 text-blue-600" />
          گزارشات و نمودارها
        </h3>
        <div className="text-sm text-gray-500 flex items-center">
          <TrendingUp className="h-4 w-4 mr-1" />
          تعداد تراکنش‌ها: <span className="font-bold mr-1">{formatPersianNumber(getRowCount())}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart Representation */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-700 mb-3 text-center flex items-center justify-center">
            <PieChart className="h-4 w-4 mr-1 text-blue-600" />
            توزيع {activeTab === 'uninvoiced' ? 'رسيد انبارهای امانی' : activeTab === 'invoiced' ? 'فاکتورها' : 'مجوزهاي حواله'}
          </h4>
          <div className="space-y-3">
            {chartData.map((item, index) => {
              const total = chartData.reduce((sum, d) => sum + d.value, 0);
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.name}</span>
                      <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${percentage}%`, 
                          backgroundColor: COLORS[index % COLORS.length] 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Bar Chart Representation */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-700 mb-3 text-center flex items-center justify-center">
            <BarChart className="h-4 w-4 mr-1 text-blue-600" />
            {activeTab === 'uninvoiced' ? 'تعداد رسيدها بر اساس ماه' : 
             activeTab === 'invoiced' ? 'مبلغ فاکتورها بر اساس ماه' : 
             'ميزان مجوزها بر اساس وضعيت'}
          </h4>
          <div className="space-y-4">
            {barChartData.map((item, index) => {
              const percentage = (item.value / maxValue) * 100;
              
              return (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatPersianNumber(item.value)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="h-4 rounded-full bg-blue-500" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Summary Statistics */}
      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center">
          <Calculator className="h-4 w-4 mr-1 text-blue-600" />
          خلاصه آماری
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {chartData.slice(0, 3).map((item, index) => (
            <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="text-blue-800 font-medium flex items-center">
                {item.name}
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {formatPersianNumber(item.value)}
                {activeTab === 'invoiced' && index < 3 ? ' ريال' : ''}
                {activeTab === 'permits' && index < 3 ? ' کيلوگرم' : ''}
              </div>
            </div>
          ))}
        </div>
        
        {/* جمع کل ستون‌ها */}
        <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center">
            <Calculator className="h-4 w-4 mr-1 text-blue-600" />
            جمع کل ستون‌ها
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeTab === 'uninvoiced' && (
              <>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-700 text-sm">مجموع مقدار مبنای رسیدها</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPersianNumber(calculateColumnSum(uninvoicedReceipts, 'receiptBasisAmount'))}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-700 text-sm">مجموع وزن قراردادها</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPersianNumber(calculateColumnSum(uninvoicedReceipts, 'contractWeight'))}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-700 text-sm">مجموع مبلغ قراردادها</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPersianNumber(
                      uninvoicedReceipts.reduce((sum, item) => {
                        const contract = item.contract;
                        return sum + (contract?.contractWeight || 0) * (contract?.rentalRate || 0);
                      }, 0)
                    )}
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'invoiced' && (
              <>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-700 text-sm">مجموع مبلغ فاکتورها</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPersianNumber(calculateColumnSum(invoicedReceipts, 'invoiceAmount'))} ريال
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-700 text-sm">مجموع مبلغ پرداخت شده</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPersianNumber(calculateColumnSum(invoicedReceipts, 'paidAmount'))} ريال
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-700 text-sm">مجموع مانده بدهی</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPersianNumber(calculateColumnSum(invoicedReceipts, 'remainingDebt'))} ريال
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'permits' && (
              <>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-700 text-sm">مجموع مجوزهای صادر شده</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPersianNumber(calculateColumnSum(deliveryPermitsData, 'permitAmount'))} کیلوگرم
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-700 text-sm">مجموع افت مجوزها</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPersianNumber(calculateColumnSum(deliveryPermitsData, 'wastageAmount'))} کیلوگرم
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-700 text-sm">مجموع مجوزهای قابل استفاده</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPersianNumber(calculateColumnSum(deliveryPermitsData, 'finalPermitAmount'))} کیلوگرم
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};