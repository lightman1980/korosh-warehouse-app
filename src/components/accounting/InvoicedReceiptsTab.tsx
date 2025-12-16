import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Printer, Trash2, CreditCard as Edit2, Save, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, X, SquareCheck as CheckSquare, Square, Minimize2, Maximize2 } from 'lucide-react';
import { useSortingAndFiltering } from '../../hooks/useSortingAndFiltering';
import { DataTable } from './DataTable';
import { FieldWithTooltip } from './FieldWithTooltip';
import { InvoiceForm } from './InvoiceForm';
import { ChartsSection } from './ChartsSection';
import { Receipt, Contract, InvoiceData, TableColumn } from '../../types/accounting';
import { formatPersianNumber, formatPersianDate } from '../../utils/persian';
import PersianDatePicker from '../Common/PersianDatePicker';
import { DataStorage } from '../../utils/dataStorage';
// import jalaali from 'jalaali-js'; // unused

// --- شروع تغییر: اضافه شدن propهای جدید ---
interface InvoicedReceiptsTabProps {
  receipts: Receipt[];
  contracts: Contract[];
  invoices: InvoiceData[];
  searchTerm: string;
  handleSaveInvoice: (invoice: Partial<any>, editingInvoice: string | null) => void;
  handleDeleteInvoice: (invoiceId: string) => void;
  handlePrintInvoice: (invoice: any) => void;
  systemDate: Date;
  calculateRemainingPermitAmount: (receiptId: string, contractId: string) => number;
  // Propهای جدید از کامپوننت والد
  calculateRemainingTransferPermit: (receiptId: string, contractId: string) => number;
  calculateRemainingPermit: (receiptId: string, contractId: string) => number;
  generateUniquePermitNumber: (date: Date) => string;
  isManagementLetterNumberUnique: (letterNumber: string, excludePermitId?: string) => boolean;
  handleSavePermit: (permit: Partial<any>, editingPermit: string | null) => void;
  autoInvoiceEnabled: boolean;
  setAutoInvoiceEnabled: (enabled: boolean) => void;
  refreshInvoices?: () => void;
}
// --- پایان تغییر ---

interface InvoiceWithReceipt extends InvoiceData {
  receipt?: Receipt;
  contract?: Contract;
  isSettled: boolean;
  isOverpaid: boolean;
  canIssuePermit: boolean;
  selected?: boolean;
}

// --- شروع تغییر: اضافه شدن propهای جدید ---
export const InvoicedReceiptsTab: React.FC<InvoicedReceiptsTabProps> = ({
  receipts,
  contracts,
  invoices,
  searchTerm,
  handleSaveInvoice,
  handleDeleteInvoice,
  handlePrintInvoice,
  systemDate,
  calculateRemainingPermitAmount,
  // دریافت propهای جدید
  calculateRemainingTransferPermit,
  calculateRemainingPermit,
  generateUniquePermitNumber,
  isManagementLetterNumberUnique,
  handleSavePermit,
  autoInvoiceEnabled,
  setAutoInvoiceEnabled,
  refreshInvoices
}) => {
// --- پایان تغییر ---
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [updatedInvoices, setUpdatedInvoices] = useState<InvoiceWithReceipt[]>([]);
  const [showPermitForm, setShowPermitForm] = useState<string | null>(null);
  const [permitData, setPermitData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allSelected, setAllSelected] = useState(false);
  const [localDataVersion, setLocalDataVersion] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isInvoiceTableMinimized, setIsInvoiceTableMinimized] = useState<boolean>(false);
  const storage = DataStorage.getInstance();
  const invoicesRef = useRef(invoices);

  const calculateInvoiceAmount = useCallback((receipt: Receipt, contract: Contract, basis: 'receiptBasis' | 'remainingPermit' | 'contractAmount'): number => {
    if (basis === 'receiptBasis') {
      return receipt.receiptBasisAmount * (contract.rentalRate || 0);
    } else if (basis === 'remainingPermit') {
      const remainingPermit = calculateRemainingPermitAmount(receipt.id, receipt.contractId);
      return remainingPermit * (contract.rentalRate || 0);
    } else {
      return (contract.contractWeight || 0) * (contract.rentalRate || 0);
    }
  }, [calculateRemainingPermitAmount]);

  const calculateRemainingDebt = useCallback((invoiceAmount: number, paidAmount: number): number => {
    return invoiceAmount - paidAmount;
  }, []);

  const handlePaymentChange = useCallback((invoiceId: string, field: 'paidAmount' | 'paymentDate', value: number | Date | null) => {
    const newUpdatedInvoices = [...updatedInvoices];
    const invoiceIndex = newUpdatedInvoices.findIndex(inv => inv.id === invoiceId);
    
    if (invoiceIndex !== -1) {
      const updatedInvoice = { ...newUpdatedInvoices[invoiceIndex] };
      (updatedInvoice as any)[field] = value;
      
      if (field === 'paidAmount') {
        const paidAmount = value as number;
        const remainingDebt = calculateRemainingDebt(updatedInvoice.invoiceAmount, paidAmount);
        const isSettled = remainingDebt === 0;
        const isOverpaid = paidAmount > updatedInvoice.invoiceAmount;
        const canIssuePermit = isSettled || isOverpaid;
        
        updatedInvoice.remainingDebt = remainingDebt;
        updatedInvoice.isSettled = isSettled;
        updatedInvoice.isOverpaid = isOverpaid;
        updatedInvoice.canIssuePermit = canIssuePermit;
      }
      
      newUpdatedInvoices[invoiceIndex] = updatedInvoice;
      setUpdatedInvoices(newUpdatedInvoices);
      
      const allInvoices = ((storage.loadData('invoices') || []) as any[]);
      const storageInvoiceIndex = allInvoices.findIndex((inv: any) => inv.id === invoiceId);
      
      if (storageInvoiceIndex !== -1) {
        const valueToStore = (value instanceof Date && !isNaN(value.getTime())) ? value.toISOString() : value;
        allInvoices[storageInvoiceIndex] = {
          ...allInvoices[storageInvoiceIndex],
          [field]: valueToStore,
          updatedAt: new Date()
        };
        storage.saveData('invoices', allInvoices);
      }
    }
  }, [updatedInvoices, calculateRemainingDebt, storage]);

  useEffect(() => {
    if (invoicesRef.current === invoices && localDataVersion > 0) {
      return;
    }
    
    invoicesRef.current = invoices;
    
      const storedInvoices = ((storage.loadData('invoices') || []) as any[]);
      const storedInvoicesMap = new Map(storedInvoices.map((inv: any) => [inv.id, inv]));

    const finalInvoices = invoices.map(invoice => {
      const storedInvoice = storedInvoicesMap.get(invoice.id);
      
      if (storedInvoice) {
        const paidAmount = (storedInvoice as any).paidAmount !== undefined ? (storedInvoice as any).paidAmount : invoice.paidAmount || 0;
        const remainingDebt = calculateRemainingDebt(invoice.invoiceAmount, paidAmount);
        const isSettled = remainingDebt === 0;
        const isOverpaid = paidAmount > invoice.invoiceAmount;
        const canIssuePermit = isSettled || isOverpaid;
        
        const paymentDate = (typeof (storedInvoice as any).paymentDate === 'string') 
          ? new Date((storedInvoice as any).paymentDate) 
          : (storedInvoice as any).paymentDate;

        return {
          ...invoice,
          ...storedInvoice,
          remainingDebt,
          isSettled,
          isOverpaid,
          canIssuePermit,
          paymentDate,
        };
      }
      
      const paidAmount = invoice.paidAmount || 0;
      const remainingDebt = calculateRemainingDebt(invoice.invoiceAmount, paidAmount);
      const isSettled = remainingDebt === 0;
      const isOverpaid = paidAmount > invoice.invoiceAmount;
      const canIssuePermit = isSettled || isOverpaid;

      return {
        ...invoice,
        remainingDebt,
        isSettled,
        isOverpaid,
        canIssuePermit,
      };
    });

    const invoicedReceipts = finalInvoices
      .filter((invoice: any) => {
        // Status type checking fix
        const status = invoice.status as string;
        if (status === 'cancelled' || status === 'deleted') return false;
        if (invoice.transactionNumber?.startsWith('INV') && invoice.status === 'draft') return false;
        const receipt = receipts.find(r => r.id === invoice.receiptId);
        if (!receipt) return false;

        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          if (
            !receipt.transactionNumber.toLowerCase().includes(searchLower) &&
            !receipt.counterpartyName?.toLowerCase().includes(searchLower) &&
            !receipt.contractNumber?.toLowerCase().includes(searchLower) &&
            !invoice.transactionNumber.toLowerCase().includes(searchLower)
          ) {
            return false;
          }
        }
        return true;
      })
      .map(invoice => {
        const receipt = receipts.find(r => r.id === invoice.receiptId);
        const contract = contracts.find(c => c.id === receipt?.contractId);
        return {
          ...invoice,
          receipt,
          contract,
          selected: false
        };
      });
    
      setUpdatedInvoices(invoicedReceipts);
  }, [invoices, receipts, contracts, searchTerm, calculateRemainingDebt, localDataVersion]);

  // --- شروع تغییر: useEffect و توابع محلی حذف شدند ---
  // این بخش دیگر وجود ندارد چون منطق به کامپوننت والد منتقل شده است.
  // --- پایان تغییر ---

  const handlePrintInvoiceWithCorrectBasis = useCallback((invoice: InvoiceWithReceipt) => {
    if (isPrinting) {
      alert('در حال حاضر عملیات چاپ در حال انجام است. لطفاً صبر کنید.');
      return;
    }

    try {
      setIsPrinting(true);
      
      setTimeout(() => {
        if (!invoice.receipt || !invoice.contract) {
          setIsPrinting(false);
          return;
        }
        
        let quantity = 0;
        
        if (invoice.calculationBasis === 'receiptBasis') {
          quantity = invoice.receipt.receiptBasisAmount;
        } else if (invoice.calculationBasis === 'remainingPermit') {
          quantity = calculateRemainingPermitAmount(invoice.receipt.id, invoice.receipt.contractId);
        } else if (invoice.calculationBasis === 'contractAmount') {
          quantity = invoice.contract.contractWeight || 0;
        }
        
        const invoiceForPrint = {
          ...invoice,
          basisAmount: quantity,
          calculationBasis: invoice.calculationBasis || 'receiptBasis',
          invoiceAmount: quantity * (invoice.contract.rentalRate || 0)
        };
        
        handlePrintInvoice(invoiceForPrint);
        
        setTimeout(() => {
          setIsPrinting(false);
        }, 1000);
      }, 100);
    } catch (error) {
      console.error('Error during print:', error);
      setIsPrinting(false);
      alert('خطا در هنگام چاپ فاکتور. لطفاً دوباره تلاش کنید.');
    }
  }, [handlePrintInvoice, calculateRemainingPermitAmount, isPrinting]);

  // تابع برای صدور مجوز
  const handleIssuePermit = useCallback((invoice: InvoiceWithReceipt) => {
    if (!invoice.receipt || !invoice.contract) return;
    
    const receipt = invoice.receipt;
    const contract = invoice.contract;
    
    // --- شروع تغییر: محاسبه مقادیر جدید ---
    // NOTE: Now using props from parent component
    const remainingTransferPermit = calculateRemainingTransferPermit(receipt.id, contract.id);
    const remainingPermit = calculateRemainingPermit(receipt.id, contract.id);
    // --- پایان تغییر ---
    
    setPermitData({
      receiptId: receipt.id,
      contractId: contract.id,
      permitAmount: remainingTransferPermit, // مقدار پیش‌فرض بر اساس مانده مجوز حواله
      wastageAmount: 0,
      finalPermitAmount: 0,
      remainingPermitAmount: remainingTransferPermit,
      // --- شروع تغییرات: اضافه کردن مقادیر جدید ---
      remainingTransferPermit,
      remainingPermit,
      basisType: 'remainingTransferPermit' // مقدار پیش‌فرض الف)
      // --- پایان تغییرات ---
    });
    
    setShowPermitForm(invoice.id);
    // NOTE: Dependencies now use the props from the parent
  }, [calculateRemainingTransferPermit, calculateRemainingPermit, generateUniquePermitNumber, systemDate]);

  const handleSavePermitForm = useCallback(() => {
    setErrors({});
    
    if (!permitData.managementLetterNumber?.trim()) {
      setErrors({ managementLetterNumber: 'لطفاً شماره نامه مدیریت را وارد کنید' });
      return;
    }
    
    if (!isManagementLetterNumberUnique(permitData.managementLetterNumber)) {
      setErrors({ managementLetterNumber: 'این شماره نامه مدیریت قبلاً استفاده شده است' });
      return;
    }
    
    if (!permitData.permitAmount || permitData.permitAmount <= 0) {
      setErrors({ permitAmount: 'مقدار مجوز حواله باید بزرگتر از صفر باشد' });
      return;
    }
    
    // --- شروع تغییرات: اعتبارسنجی بر اساس نوع مبنای محاسبه ---
    const maxAmount = permitData.basisType === 'remainingTransferPermit' 
      ? permitData.remainingTransferPermit 
      : permitData.remainingPermit;
      
    if (permitData.permitAmount > maxAmount) {
      setErrors({ permitAmount: `مقدار مجوز حواله نباید بیشتر از ${formatPersianNumber(maxAmount)} باشد` });
      return;
    }
    // --- پایان تغییرات ---
    
    const receipt = receipts.find(r => r.id === permitData.receiptId);
    const contract = contracts.find(c => c.id === permitData.contractId);
    
    if (!receipt || !contract) return;
    
    const wastageAmount = permitData.permitAmount * (contract.wastageRateValue || 0.5) / 100;
    const finalPermitAmount = permitData.permitAmount - wastageAmount;
    
    const permitToSave = {
      ...permitData,
      wastageAmount,
      finalPermitAmount,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedCount: 0,
      basisType: permitData.basisType
    };

    handleSavePermit(permitToSave, null);

    setShowPermitForm(null);
    setPermitData({});

    alert('مجوز با موفقیت ذخیره شد. برای انتقال به حواله انبار، لطفاً از صفحه مجوزها گزینه "تایید مجوز حواله" را انتخاب کنید.');
    // NOTE: Dependencies now use the props from the parent
  }, [permitData, isManagementLetterNumberUnique, receipts, contracts, handleSavePermit, calculateRemainingTransferPermit, calculateRemainingPermit]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleSelectAll = useCallback(() => {
    const newAllSelected = !allSelected;
    setAllSelected(newAllSelected);
    
    setUpdatedInvoices(prev => prev.map(invoice => ({
      ...invoice,
      selected: newAllSelected
    })));
  }, [allSelected]);

  const handleSelectInvoice = useCallback((invoiceId: string) => {
    setUpdatedInvoices(prev => {
      const updatedInvoices = prev.map(invoice => 
        invoice.id === invoiceId ? { ...invoice, selected: !invoice.selected } : invoice
      );
      
      const allSelectedNow = updatedInvoices.length > 0 && updatedInvoices.every(invoice => invoice.selected);
      setAllSelected(allSelectedNow);
      
      return updatedInvoices;
    });
  }, []);

  const handleDeleteSelectedInvoices = useCallback(() => {
    const selectedInvoices = updatedInvoices.filter(invoice => invoice.selected);
    
    if (selectedInvoices.length === 0) {
      alert('هیچ فاکتوری برای حذف انتخاب نشده است');
      return;
    }
    
    if (confirm(`آیا از حذف ${selectedInvoices.length} فاکتور انتخاب شده اطمینان دارید؟`)) {
      selectedInvoices.forEach(invoice => {
        handleDeleteInvoice(invoice.id);
      });
      setAllSelected(false);
    }
  }, [updatedInvoices, handleDeleteInvoice]);

  const {
    sortConfig,
    columnFilters,
    // showColumnFilter, // unused
    handleSort,
    // toggleColumnFilter, // unused
    handleColumnFilterChange,
    clearColumnFilter,
    getSortedAndFilteredData,
    calculateColumnSum
  } = useSortingAndFiltering(updatedInvoices);

  const columns: TableColumn<InvoiceWithReceipt>[] = [
    {
      key: 'selected' as any,
      title: 'انتخاب' as any, // Using string title instead of React element
      width: 'w-12',
      render: (_, item) => (
        <button 
          onClick={() => handleSelectInvoice(item.id)}
          className="flex items-center justify-center w-full h-full"
        >
          {item.selected ? 
            <CheckSquare className="h-5 w-5 text-blue-600" /> : 
            <Square className="h-5 w-5 text-gray-400" />
          }
        </button>
      )
    },
    {
      key: 'actions' as any,
      title: 'عملیات',
      width: 'w-40',
      render: (_, item) => (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => handlePrintInvoiceWithCorrectBasis(item)}
            disabled={isPrinting}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center justify-center ${
              isPrinting 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Printer className="h-3 w-3 mr-1" />
            {isPrinting ? 'در حال چاپ...' : 'پرینت فاکتور'}
          </button>
          <button
            onClick={() => setEditingInvoice(item.id)}
            className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700 transition-colors flex items-center justify-center"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            ویرایش
          </button>
          {item.canIssuePermit && (
            <button
              onClick={() => handleIssuePermit(item)}
              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <Save className="h-3 w-3 mr-1" />
              صدور مجوز
            </button>
          )}
          <button
            onClick={() => handleDeleteInvoice(item.id)}
            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors flex items-center justify-center"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            حذف فاکتور
          </button>
        </div>
      )
    },
    {
      key: 'transactionNumber',
      title: 'شماره فاکتور',
      sortable: true,
      filterable: true,
      width: 'w-40'
    },
    {
      key: 'receiptNumber' as any,
      title: 'شماره رسید',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => <span>{item.receipt?.transactionNumber}</span>
    },
    {
      key: 'receiptId' as any, // receiptDate doesn't exist, using receiptId
      title: 'تاریخ رسید',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => <span>{item.receipt?.receiptDate ? formatPersianDate(new Date(item.receipt.receiptDate)) : ''}</span>
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
      key: 'year',
      title: 'سال',
      sortable: true,
      filterable: true,
      width: 'w-24',
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      key: 'month',
      title: 'ماه',
      sortable: true,
      filterable: true,
      width: 'w-24',
      render: (value) => <span className="font-medium">{String(value).padStart(2, '0')}</span>
    },
    {
      key: 'calculationBasis',
      title: 'مبنای محاسبه',
      sortable: true,
      filterable: true,
      width: 'w-40',
      render: (value, item) => (
        <select
          value={value || 'receiptBasis'}
          onChange={(e) => {
            const basis = e.target.value as 'receiptBasis' | 'remainingPermit' | 'contractAmount';
            const newInvoiceAmount = item.receipt && item.contract
              ? calculateInvoiceAmount(item.receipt, item.contract, basis)
              : item.invoiceAmount;
            
            const paidAmount = item.paidAmount || 0;
            const remainingDebt = calculateRemainingDebt(newInvoiceAmount, paidAmount);
            const isSettled = remainingDebt === 0;
            const isOverpaid = paidAmount > newInvoiceAmount;
            const canIssuePermit = isSettled || isOverpaid;
            
            const updatedInvoice = {
              ...item,
              calculationBasis: basis,
              invoiceAmount: newInvoiceAmount,
              remainingDebt,
              isSettled,
              isOverpaid,
              canIssuePermit
            };
            
            const newUpdatedInvoices = [...updatedInvoices];
            const invoiceIndex = newUpdatedInvoices.findIndex(inv => inv.id === item.id);
            
            if (invoiceIndex !== -1) {
              newUpdatedInvoices[invoiceIndex] = updatedInvoice;
              setUpdatedInvoices(newUpdatedInvoices);
            }
            
            const allInvoices = ((storage.loadData('invoices') || []) as any[]);
            const storageInvoiceIndex = allInvoices.findIndex((inv: any) => inv.id === item.id);
            
            if (storageInvoiceIndex !== -1) {
              allInvoices[storageInvoiceIndex] = updatedInvoice;
              storage.saveData('invoices', allInvoices);
            }
            
            setLocalDataVersion(prev => prev + 1);
          }}
          className="w-full px-2 py-1 border rounded text-sm"
        >
          <option value="receiptBasis">مقدار مبنای رسید</option>
          <option value="remainingPermit">مانده مجوز حواله</option>
          <option value="contractAmount">مقدار قرارداد</option>
        </select>
      )
    },
    {
      key: 'quantity',
      title: 'مقدار',
      sortable: true,
      filterable: true,
      width: 'w-28',
      render: (_, item) => {
        let quantity = 0;
        if (item.receipt && item.contract) {
          if (item.calculationBasis === 'receiptBasis') {
            quantity = item.receipt.receiptBasisAmount;
          } else if (item.calculationBasis === 'remainingPermit') {
            quantity = calculateRemainingPermitAmount(item.receipt.id, item.receipt.contractId);
          } else if (item.calculationBasis === 'contractAmount') {
            quantity = item.contract.contractWeight || 0;
          }
        }
        return <span>{formatPersianNumber(quantity)}</span>;
      }
    },
    {
      key: 'rate',
      title: 'نرخ',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => (
        <span>{formatPersianNumber(item.contract?.rentalRate || 0)} ریال</span>
      )
    },
    {
      key: 'contractAmount' as any,
      title: 'مبلغ قرارداد',
      sortable: true,
      filterable: true,
      width: 'w-36',
      render: (_, item) => {
        const amount = item.contract?.contractWeight && item.contract?.rentalRate
          ? item.contract.contractWeight * item.contract.rentalRate
          : 0;
        return <span>{formatPersianNumber(amount)} ریال</span>;
      }
    },
    {
      key: 'invoiceAmount',
      title: 'مبلغ فاکتور',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value, item) => {
        const basisText = item.calculationBasis === 'receiptBasis'
          ? 'مقدار مبنای رسید'
          : item.calculationBasis === 'remainingPermit'
          ? 'مانده مجوز حواله'
          : 'مقدار قرارداد';
        return (
          <FieldWithTooltip
            label="مبلغ فاکتور"
            formula={`مبلغ فاکتور = ${basisText} × نرخ قرارداد`}
          >
            <span className="font-bold text-green-600">{formatPersianNumber(value)} ریال</span>
          </FieldWithTooltip>
        );
      }
    },
    {
      key: 'paidAmount',
      title: 'مبلغ واریز',
      sortable: true,
      filterable: true,
      width: 'w-40',
      render: (value, item) => (
        <input
          type="number"
          value={value || 0}
          onChange={(e) => {
            const paidAmount = parseFloat(e.target.value) || 0;
            handlePaymentChange(item.id, 'paidAmount', paidAmount);
          }}
          onFocus={(e) => e.target.select()}
          className="w-full px-2 py-1 border border-blue-300 rounded text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          min="0"
          placeholder="0"
        />
      )
    },
    {
      key: 'remainingDebt',
      title: 'مانده بدهی',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (value) => (
        <FieldWithTooltip
          label="مانده بدهی"
          formula="مانده بدهی = مبلغ فاکتور - مبلغ واریز"
        >
          <span className={`font-bold ${
            value > 0 ? 'text-red-600' : 
            value < 0 ? 'text-blue-600' : 'text-green-600'
          }`}>
            {formatPersianNumber(value)} ریال
          </span>
        </FieldWithTooltip>
      )
    },
    {
      key: 'status',
      title: 'وضعیت',
      sortable: true,
      filterable: true,
      width: 'w-32',
      render: (_, item) => {
        let statusText = 'بدهکار';
        let statusClass = 'bg-yellow-100 text-yellow-800';
        
        if (item.isOverpaid) {
          statusText = 'طلبکار';
          statusClass = 'bg-blue-100 text-blue-800';
        } else if (item.isSettled) {
          statusText = 'تسویه ریالی';
          statusClass = 'bg-green-100 text-green-800';
        }
        
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
            {statusText}
          </span>
        );
      }
    },
    {
      key: 'paymentDate',
      title: 'تاریخ واریز',
      width: 'w-44',
      render: (value, item) => (
        <div className="flex items-center">
          <PersianDatePicker
            value={value}
            onChange={(date) => {
              handlePaymentChange(item.id, 'paymentDate', date);
            }}
            // onClear prop not supported by PersianDatePicker
            placeholder="تاریخ واریز"
            className="w-full text-xs"
          />
          {value && (
            <button
              onClick={() => handlePaymentChange(item.id, 'paymentDate', null)}
              className="mr-1 p-1 text-red-500 hover:text-red-700 transition-colors"
              title="پاک کردن تاریخ"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    },
    {
      key: 'invoiceType',
      title: 'نوع فاکتور',
      width: 'w-32',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'automatic' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
        }`}>
          {value === 'automatic' ? 'فاکتور اتومات' : 'فاکتور دستی'}
        </span>
      )
    }
  ];

  const renderRow = (item: InvoiceWithReceipt) => (
    <tr key={item.id} className={`hover:bg-gray-50 ${
      item.isOverpaid ? 'bg-blue-50' : 
      item.isSettled ? 'bg-green-50' : 
      item.remainingDebt > 0 ? 'bg-yellow-50' : 'bg-white'
    }`}>
      {columns.map(column => (
        <td key={String(column.key)} className="px-2 py-3 text-sm text-gray-900">
          {column.render 
            ? column.render(item[column.key as keyof InvoiceWithReceipt], item) 
            : String(item[column.key as keyof InvoiceWithReceipt] ?? '')}
        </td>
      ))}
    </tr>
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderFooter = (_data: InvoiceWithReceipt[]) => (
    <tr className="bg-gray-100 font-bold">
      <td colSpan={10} className="px-4 py-3 text-sm font-medium text-gray-900">جمع کل:</td>
      <td className="px-4 py-3 text-sm font-bold text-gray-900">
        {formatPersianNumber(calculateColumnSum('invoiceAmount'))} ریال
      </td>
      <td className="px-4 py-3 text-sm font-bold text-gray-900">
        {formatPersianNumber(calculateColumnSum('paidAmount'))} ریال
      </td>
      <td className="px-4 py-3 text-sm font-bold text-gray-900">
        {formatPersianNumber(calculateColumnSum('remainingDebt'))} ریال
      </td>
      <td colSpan={3}></td>
    </tr>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            فاکتورها ({formatPersianNumber(getSortedAndFilteredData.length)})
          </h3>
          <button
            onClick={() => setIsInvoiceTableMinimized(!isInvoiceTableMinimized)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isInvoiceTableMinimized ? (
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoInvoiceEnabled(!autoInvoiceEnabled)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
              autoInvoiceEnabled
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-white hover:bg-gray-500'
            }`}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            فاکتور اتوماتیک {autoInvoiceEnabled ? 'فعال' : 'غیرفعال'}
          </button>

          <button
            onClick={handleDeleteSelectedInvoices}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            حذف فاکتورهای انتخاب شده
          </button>
        </div>
      </div>
      
      {!isInvoiceTableMinimized && (
      <DataTable
        data={getSortedAndFilteredData}
        columns={columns}
        onSort={handleSort}
        onFilter={handleColumnFilterChange}
        sortConfig={sortConfig}
        columnFilters={columnFilters}
        // showColumnFilter and toggleColumnFilter removed - not in useSortingAndFiltering
        handleColumnFilterChange={handleColumnFilterChange}
        clearColumnFilter={clearColumnFilter}
        renderRow={renderRow}
        renderFooter={renderFooter}
        emptyMessage="هیچ رسید فاکتور شده‌ای یافت نشد"
        showColumnSum={true}
        numericColumns={['invoiceAmount', 'paidAmount', 'remainingDebt']}
        showRowCount={true}
        rowCount={getSortedAndFilteredData.length}
      />
      )}
      
      <ChartsSection 
        activeTab="invoiced"
        uninvoicedReceipts={[]}
        invoicedReceipts={getSortedAndFilteredData}
        deliveryPermitsData={[]}
      />
      
      {editingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <InvoiceForm
            invoice={updatedInvoices.find(inv => inv.id === editingInvoice)}
            receipt={updatedInvoices.find(inv => inv.id === editingInvoice)?.receipt}
            contracts={contracts}
            onSave={(invoice) => {
              const allInvoices = ((storage.loadData('invoices') || []) as any[]);
              const invoiceIndex = allInvoices.findIndex((inv: any) => inv.id === invoice.id);
              
              if (invoiceIndex !== -1) {
                const paidAmount = invoice.paidAmount || 0;
                const remainingDebt = calculateRemainingDebt(invoice.invoiceAmount, paidAmount);
                const isSettled = remainingDebt === 0;
                const isOverpaid = paidAmount > invoice.invoiceAmount;
                const canIssuePermit = isSettled || isOverpaid;
                
                const paymentDateToStore = (invoice.paymentDate instanceof Date && !isNaN(invoice.paymentDate.getTime()))
                  ? invoice.paymentDate.toISOString()
                  : invoice.paymentDate;

                allInvoices[invoiceIndex] = {
                  ...allInvoices[invoiceIndex],
                  ...invoice,
                  paidAmount: invoice.paidAmount,
                  paymentDate: paymentDateToStore,
                  remainingDebt,
                  isSettled,
                  isOverpaid,
                  canIssuePermit,
                  updatedAt: new Date()
                };
                storage.saveData('invoices', allInvoices);
                
                setLocalDataVersion(prev => prev + 1);
              }

              handleSaveInvoice(invoice, editingInvoice);

              setEditingInvoice(null);
              if (refreshInvoices) {
                refreshInvoices();
              }
            }}
            onCancel={() => setEditingInvoice(null)}
            editing={true}
            systemDate={systemDate}
            calculateRemainingPermitAmount={calculateRemainingPermitAmount}
          />
        </div>
      )}
      
      {showPermitForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">فرم مجوز حواله</h3>
              <button
                onClick={() => {
                  setShowPermitForm(null);
                  setPermitData({});
                  setErrors({});
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="شماره نامه مدیریت"
                  formula="شماره نامه مدیریت برای مجوز"
                >
                  <input
                    type="text"
                    value={permitData.managementLetterNumber || ''}
                    onChange={(e) => {
                      setPermitData({...permitData, managementLetterNumber: e.target.value});
                      if (errors.managementLetterNumber) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.managementLetterNumber;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.managementLetterNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="شماره نامه مدیریت"
                    required
                  />
                  {errors.managementLetterNumber && (
                    <div className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {errors.managementLetterNumber}
                    </div>
                  )}
                </FieldWithTooltip>
              </div>
              
              <div className="md:col-span-2">
                <FieldWithTooltip
                  label="نوع مبنای محاسبه"
                  formula="انتخاب نوع مبنای محاسبه برای مجوز"
                >
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="basisType"
                        value="remainingTransferPermit"
                        checked={permitData.basisType === 'remainingTransferPermit'}
                        onChange={(e) => {
                          const basisType = e.target.value;
                          const receipt = receipts.find(r => r.id === permitData.receiptId);
                          const contract = contracts.find(c => c.id === permitData.contractId);
                          
                          if (receipt && contract) {
                            let newPermitAmount = 0;
                            
                            if (basisType === 'remainingTransferPermit') {
                              newPermitAmount = permitData.remainingTransferPermit || 0;
                            } else {
                              newPermitAmount = permitData.remainingPermit || 0;
                            }
                            
                            const wastageAmount = newPermitAmount * (contract.wastageRateValue || 0.5) / 100;
                            const finalPermitAmount = newPermitAmount - wastageAmount;
                            
                            setPermitData({
                              ...permitData,
                              basisType,
                              permitAmount: newPermitAmount,
                              wastageAmount,
                              finalPermitAmount
                            });
                          }
                        }}
                        className="ml-2"
                      />
                      الف) مانده مجوز حواله
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="basisType"
                        value="remainingPermit"
                        checked={permitData.basisType === 'remainingPermit'}
                        onChange={(e) => {
                          const basisType = e.target.value;
                          const receipt = receipts.find(r => r.id === permitData.receiptId);
                          const contract = contracts.find(c => c.id === permitData.contractId);
                          
                          if (receipt && contract) {
                            let newPermitAmount = 0;
                            
                            if (basisType === 'remainingTransferPermit') {
                              newPermitAmount = permitData.remainingTransferPermit || 0;
                            } else {
                              newPermitAmount = permitData.remainingPermit || 0;
                            }
                            
                            const wastageAmount = newPermitAmount * (contract.wastageRateValue || 0.5) / 100;
                            const finalPermitAmount = newPermitAmount - wastageAmount;
                            
                            setPermitData({
                              ...permitData,
                              basisType,
                              permitAmount: newPermitAmount,
                              wastageAmount,
                              finalPermitAmount
                            });
                          }
                        }}
                        className="ml-2"
                      />
                      ب) مانده مجوز
                    </label>
                  </div>
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label="مقدار مجوز حواله"
                  formula="مقدار قابل تایپ توسط کاربر"
                >
                  <input
                    type="number"
                    value={permitData.permitAmount || 0}
                    onChange={(e) => {
                      let permitAmount = parseFloat(e.target.value) || 0;
                      const maxAmount = permitData.basisType === 'remainingTransferPermit' 
                        ? permitData.remainingTransferPermit 
                        : permitData.remainingPermit;
                      
                      if (permitAmount > maxAmount) {
                        permitAmount = maxAmount;
                        setErrors({ permitAmount: `مقدار وارد شده نباید بیشتر از ${formatPersianNumber(maxAmount)} باشد` });
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.permitAmount;
                          return newErrors;
                        });
                      }
                      
                      const receipt = receipts.find(r => r.id === permitData.receiptId);
                      const contract = contracts.find(c => c.id === permitData.contractId);
                      
                      if (receipt && contract) {
                        const wastageAmount = permitAmount * (contract.wastageRateValue || 0.5) / 100;
                        const finalPermitAmount = permitAmount - wastageAmount;
                        
                        setPermitData({
                          ...permitData,
                          permitAmount,
                          wastageAmount,
                          finalPermitAmount
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.permitAmount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    min="0"
                    max={permitData.basisType === 'remainingTransferPermit' 
                      ? permitData.remainingTransferPermit 
                      : permitData.remainingPermit}
                    step="0.01"
                    required
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    حداکثر مقدار: {formatPersianNumber(
                      permitData.basisType === 'remainingTransferPermit' 
                        ? permitData.remainingTransferPermit || 0
                        : permitData.remainingPermit || 0
                    )}
                  </div>
                  {errors.permitAmount && (
                    <div className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {errors.permitAmount}
                    </div>
                  )}
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label="مقدار افت مجوز"
                  formula="(مقدار مجوز حواله) × (درصد افت قرارداد)"
                >
                  <input
                    type="number"
                    value={permitData.wastageAmount || 0}
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
                    value={permitData.finalPermitAmount || 0}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </FieldWithTooltip>
              </div>
              
              <div>
                <FieldWithTooltip
                  label={permitData.basisType === 'remainingTransferPermit' ? "مانده مجوز حواله" : "مانده مجوز"}
                  formula={permitData.basisType === 'remainingTransferPermit' 
                    ? "مانده مجوز حواله = مقدار مبنای رسید - (مقدار مبنای رسید × درصد افت قرارداد) - مجموع حواله‌های صادر شده یا پیش‌نویس (به جز درخواست‌های اصلاحیه انبار)"
                    : "مانده مجوز = مقدار مبنای رسید - (مقدار مبنای رسید × درصد افت قرارداد) - مجموع مجوزهای پیش‌نویس یا صادرشده مرتبط با همان رسید (به جز ابطال شده)"}
                >
                  <input
                    type="number"
                    value={
                      permitData.basisType === 'remainingTransferPermit' 
                        ? permitData.remainingTransferPermit || 0
                        : permitData.remainingPermit || 0
                    }
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </FieldWithTooltip>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPermitForm(null);
                  setPermitData({});
                  setErrors({});
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
                ذخیره حواله
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}//