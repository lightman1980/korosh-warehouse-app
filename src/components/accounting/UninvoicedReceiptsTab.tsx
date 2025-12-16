import React, { useState, useCallback, useMemo } from 'react';
import { Plus, FileText, Info, Minimize2, Maximize2 } from 'lucide-react';
import { useSortingAndFiltering } from '../../hooks/useSortingAndFiltering';
import { DataTable } from './DataTable';
import { FieldWithTooltip } from './FieldWithTooltip';
import { InvoiceForm } from './InvoiceForm';
import { ChartsSection } from './ChartsSection';
import { Receipt, Contract, TableColumn } from '../../types/accounting';
import { formatPersianNumber, formatPersianDate } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';

interface UninvoicedReceiptsTabProps {
  receipts: Receipt[];
  contracts: Contract[];
  searchTerm: string;
  handleSaveInvoice: (invoice: Partial<any>, editingInvoice: string | null) => void;
  systemDate: Date;
  calculateRemainingPermitAmount: (receiptId: string, contractId: string) => number;
}

export const UninvoicedReceiptsTab: React.FC<UninvoicedReceiptsTabProps> = ({ 
  receipts, 
  contracts, 
  searchTerm,
  handleSaveInvoice,
  systemDate,
  calculateRemainingPermitAmount
}) => {
  const [showInvoiceForm, setShowInvoiceForm] = useState<string | null>(null);
  const [isReceiptTableMinimized, setIsReceiptTableMinimized] = useState<boolean>(false);
  const storage = DataStorage.getInstance();

  // محاسبه وزن مانده قرارداد
  const calculateRemainingContractWeight = useCallback((contractId: string): number => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return 0;
    
    // جمع کل مقدار مبنای رسیدهای این قرارداد
    const contractReceipts = receipts.filter(r => r.contractId === contractId);
    const totalReceiptBasis = contractReceipts.reduce((sum, r) => sum + (r.receiptBasisAmount || 0), 0);
    
    return (contract.contractWeight || 0) - totalReceiptBasis;
  }, [receipts, contracts]);

  // محاسبه موجودی مخزن
  const calculateTankInventory = useCallback((tankId: string, targetDate?: Date): number => {
    const allReceipts = storage.loadData('receipts') || [];
    const allDeliveries = storage.loadData('deliveries') || [];
    const allAdjustments = storage.loadData('adjustments') || [];
    
    const tankCapacity = 5000000; // ظرفیت پیش‌فرض مخزن
    
    const dateFilter = (item: any) => {
      if (!targetDate) return true;
      const itemDate = new Date(item.receiptDate || item.deliveryDate || item.adjustmentDate || item.createdAt);
      return itemDate <= targetDate;
    };
    
    // رسید انبارها
    const tankReceipts = allReceipts
      .filter((r: any) => r.tankId === tankId && dateFilter(r))
      .reduce((sum: number, r: any) => sum + (r.receiptBasisAmount || 0), 0);
    
    // سند اضافه انبار
    const tankAdditions = allAdjustments
      .filter((a: any) => a.tankId === tankId && a.adjustmentType === 'addition' && dateFilter(a))
      .reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
    
    // حواله انبار
    const tankDeliveries = allDeliveries
      .filter((d: any) => d.tankId === tankId && dateFilter(d))
      .reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    
    // سند کسر انبار
    const tankSubtractions = allAdjustments
      .filter((a: any) => a.tankId === tankId && a.adjustmentType === 'subtraction' && dateFilter(a))
      .reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
    
    // فرمول: ظرفیت مخزن - (رسید انبارها + سند اضافه انبار) + (حواله انبار + سند کسر انبار)
    const inventory = tankCapacity - (tankReceipts + tankAdditions) + (tankDeliveries + tankSubtractions);
    
    return Math.max(0, inventory);
  }, [storage]);

  // محاسبه مبلغ فاکتور
  const calculateInvoiceAmount = useCallback((receipt: Receipt, contract: Contract, basis: 'receiptBasis' | 'remainingPermit'): number => {
    if (basis === 'receiptBasis') {
      // مقدار مبنای رسید * نرخ قرارداد
      return receipt.receiptBasisAmount * (contract.rentalRate || 0);
    } else {
      // مانده مجوز حواله * نرخ قرارداد
      const remainingPermit = calculateRemainingPermitAmount(receipt.id, receipt.contractId);
      return remainingPermit * (contract.rentalRate || 0);
    }
  }, [calculateRemainingPermitAmount]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      if (receipt.userType !== 'consignment') return false;
      if (receipt.status === 'draft') return false;
      if (receipt.status === 'cancelled' || receipt.status === 'deleted') return false;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        receipt.transactionNumber.toLowerCase().includes(searchLower) ||
        receipt.counterpartyName?.toLowerCase().includes(searchLower) ||
        receipt.contractNumber?.toLowerCase().includes(searchLower) ||
        receipt.productName.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
  }, [receipts, searchTerm]);

  const {
    sortConfig,
    columnFilters,
    showColumnFilter,
    handleSort,
    toggleColumnFilter,
    handleColumnFilterChange,
    clearColumnFilter,
    getSortedAndFilteredData,
    calculateColumnSum
  } = useSortingAndFiltering(filteredReceipts);

  const columns: TableColumn<Receipt>[] = [
    {
      key: 'actions',
      title: 'عملیات',
      width: 'w-32',
      render: (_, item) => (
        <button
          onClick={() => setShowInvoiceForm(item.id)}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          صدور فاکتور دستی
        </button>
      )
    },
    {
      key: 'transactionNumber',
      title: 'شماره رسید',
      sortable: true,
      filterable: true,
      width: 'w-32'
    },
    {
      key: 'receiptDate',
      title: 'تاریخ رسید',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value) => formatPersianDate(new Date(value))
    },
    {
      key: 'counterpartyName',
      title: 'طرف حساب',
      sortable: true,
      filterable: true,
      width: 'w-32'
    },
    {
      key: 'contractNumber',
      title: 'شماره قرارداد',
      sortable: true,
      filterable: true,
      width: 'w-32'
    },
    {
      key: 'receiptBasisAmount',
      title: 'مقدار مبنای رسید',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const unit = contract?.unit || 'kg';
        return (
          <FieldWithTooltip
            label="مقدار مبنای رسید"
            formula="مقدار مبنای رسید ثبت شده در انبار"
          >
            <span>{formatPersianNumber(value)} {unit === 'kg' ? 'کیلوگرم' : 'تن'}</span>
          </FieldWithTooltip>
        );
      }
    },
    {
      key: 'remainingContractWeight',
      title: 'وزن مانده قرارداد',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const unit = contract?.unit || 'kg';
        const remaining = calculateRemainingContractWeight(item.contractId);
        
        return (
          <FieldWithTooltip
            label="وزن مانده قرارداد"
            formula="وزن قرارداد - جمع کل مقدار مبنای رسیدهای مربوط به این قرارداد"
          >
            <span>{formatPersianNumber(Math.max(0, remaining))} {unit === 'kg' ? 'کیلوگرم' : 'تن'}</span>
          </FieldWithTooltip>
        );
      }
    },
    {
      key: 'tankInventory',
      title: 'موجودی مخزن',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const unit = contract?.unit || 'kg';
        const inventory = calculateTankInventory(item.tankId, systemDate);
        
        return (
          <FieldWithTooltip
            label="موجودی مخزن"
            formula="ظرفیت مخزن - (رسید انبارها + سند اضافه انبار) + (حواله انبار + سند کسر انبار)"
          >
            <span>{formatPersianNumber(inventory)} {unit === 'kg' ? 'کیلوگرم' : 'تن'}</span>
          </FieldWithTooltip>
        );
      }
    },
    {
      key: 'rentalRate',
      title: 'نرخ قرارداد',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        return <span>{formatPersianNumber(contract?.rentalRate || 0)}</span>;
      }
    },
    {
      key: 'contractAmount',
      title: 'مبلغ قرارداد',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        const contractAmount = (contract?.contractWeight || 0) * (contract?.rentalRate || 0);
        return <span>{formatPersianNumber(contractAmount)}</span>;
      }
    },
    {
      key: 'calculatedInvoiceAmount',
      title: 'مبلغ فاکتور محاسبه شده',
      sortable: true,
      filterable: true,
      width: 'w-40',
      render: (_, item) => {
        const contract = contracts.find(c => c.id === item.contractId);
        if (!contract) return <span>0</span>;
        
        // محاسبه بر اساس مقدار مبنای رسید (پیش‌فرض برای رسید انبارها)
        const invoiceAmount = calculateInvoiceAmount(item, contract, 'receiptBasis');
        
        return (
          <FieldWithTooltip
            label="مبلغ فاکتور محاسبه شده"
            formula="مقدار مبنای رسید × نرخ قرارداد"
          >
            <span className="font-bold text-green-600">{formatPersianNumber(invoiceAmount)} ریال</span>
          </FieldWithTooltip>
        );
      }
    }
    // حذف ستون "مبنای محاسبه فاکتور"
  ];

  const renderRow = (receipt: Receipt, index: number) => (
    <tr key={receipt.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
      {columns.map(column => (
        <td key={String(column.key)} className="px-4 py-3 text-sm text-gray-900">
          {column.render 
            ? column.render(receipt[column.key], receipt) 
            : receipt[column.key]}
        </td>
      ))}
    </tr>
  );

  const renderFooter = (data: Receipt[]) => (
    <tr className="bg-gray-100 font-bold">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">جمع کل:</td>
      <td colSpan={4}></td>
      <td className="px-4 py-3 text-sm font-bold text-gray-900">
        {formatPersianNumber(calculateColumnSum('receiptBasisAmount'))}
      </td>
      <td className="px-4 py-3 text-sm font-bold text-gray-900">
        {formatPersianNumber(data.reduce((sum, item) => {
          return sum + calculateRemainingContractWeight(item.contractId);
        }, 0))}
      </td>
      <td className="px-4 py-3 text-sm font-bold text-gray-900">
        {formatPersianNumber(data.reduce((sum, item) => {
          return sum + calculateTankInventory(item.tankId, systemDate);
        }, 0))}
      </td>
      <td colSpan={3}></td>
    </tr>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            رسید انبارها ({formatPersianNumber(filteredReceipts.length)})
          </h3>
          <button
            onClick={() => setIsReceiptTableMinimized(!isReceiptTableMinimized)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isReceiptTableMinimized ? (
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
      </div>
      
      {!isReceiptTableMinimized && (
      <DataTable
        data={getSortedAndFilteredData}
        columns={columns}
        onSort={handleSort}
        onFilter={handleColumnFilterChange}
        sortConfig={sortConfig}
        columnFilters={columnFilters}
        showColumnFilter={showColumnFilter}
        toggleColumnFilter={toggleColumnFilter}
        handleColumnFilterChange={handleColumnFilterChange}
        clearColumnFilter={clearColumnFilter}
        renderRow={renderRow}
        renderFooter={renderFooter}
        emptyMessage="هیچ رسید فاکتور نشده‌ای یافت نشد"
        showColumnSum={true}
        numericColumns={['receiptBasisAmount', 'remainingContractWeight', 'rentalRate', 'contractAmount', 'calculatedInvoiceAmount']}
        showRowCount={true}
        rowCount={filteredReceipts.length}
      />
      )}
      
      <ChartsSection 
        activeTab="uninvoiced"
        uninvoicedReceipts={getSortedAndFilteredData}
        invoicedReceipts={[]}
        deliveryPermitsData={[]}
      />
      
      {showInvoiceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <InvoiceForm
            receipt={receipts.find(r => r.id === showInvoiceForm)}
            contracts={contracts}
            onSave={(invoice) => {
              handleSaveInvoice(invoice, null);
              setShowInvoiceForm(null);
            }}
            onCancel={() => setShowInvoiceForm(null)}
            systemDate={systemDate}
            calculateRemainingPermitAmount={calculateRemainingPermitAmount}
          />
        </div>
      )}
    </div>
  );
};//