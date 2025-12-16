// hooks/useAutoInvoiceChecker.ts
import { useEffect, useState } from 'react';
import { DataStorage } from '../utils/dataStorage';

export const useAutoInvoiceChecker = (enabled: boolean) => {
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const storage = DataStorage.getInstance();

  useEffect(() => {
    if (!enabled) return;

    const checkForAutomaticInvoices = async () => {
      setIsChecking(true);
      
      try {
        // Get current date in Persian
        const currentDate = new Date();
        
        // Load receipts and contracts
        const receipts = storage.loadData('receipts') || [];
        const contracts = storage.loadData('contracts') || [];
        const invoices = storage.loadData('invoices') || [];
        
        // Filter receipts that need automatic invoicing
        const uninvoicedReceipts = receipts.filter(receipt => 
          receipt.userType === 'consignment' && 
          receipt.status !== 'draft' &&
          receipt.status !== 'cancelled' &&
          receipt.status !== 'deleted'
        );
        
        // Process each receipt to check if automatic invoice should be issued
        for (const receipt of uninvoicedReceipts) {
          const contract = contracts.find(c => c.id === receipt.contractId);
          if (!contract) continue;
          
          // Check if automatic invoice already exists for this receipt in current month
          const receiptDate = new Date(receipt.receiptDate);
          const persianDate = {
            year: receiptDate.getFullYear(),
            month: receiptDate.getMonth() + 1
          };
          
          const currentPersianDate = {
            year: currentDate.getFullYear(),
            month: currentDate.getMonth() + 1
          };
          
          const existingInvoice = invoices.find(invoice => 
            invoice.receiptId === receipt.id &&
            invoice.year === currentPersianDate.year &&
            invoice.month === currentPersianDate.month &&
            invoice.invoiceType === 'automatic'
          );
          
          if (!existingInvoice) {
            // Calculate invoice amount based on conditions
            let invoiceAmount;
            
            if (currentPersianDate.year !== persianDate.year || 
                currentPersianDate.month !== persianDate.month) {
              // Condition 1: Different month
              const wastageAmount = receipt.receiptBasisAmount * (contract.wastageRateValue || 0.5) / 100;
              const remainingPermit = receipt.receiptBasisAmount - wastageAmount;
              invoiceAmount = remainingPermit * (contract.rentalRate || 0);
            } else {
              // Condition 2: Same month
              invoiceAmount = receipt.receiptBasisAmount * (contract.rentalRate || 0);
            }
            
            // Create new automatic invoice
            const newInvoice = {
              id: `invoice_${Date.now()}`,
              receiptId: receipt.id,
              contractId: receipt.contractId,
              transactionNumber: `INV-${Date.now().toString().slice(-6)}`,
              invoiceAmount,
              paidAmount: 0,
              remainingDebt: invoiceAmount,
              year: currentPersianDate.year,
              month: currentPersianDate.month,
              paymentDate: null,
              invoiceType: 'automatic',
              createdAt: new Date(),
              updatedAt: new Date(),
              status: 'draft'
            };
            
            // Save the new invoice
            const updatedInvoices = [...invoices, newInvoice];
            storage.saveData('invoices', updatedInvoices);
            
            console.log(`Automatic invoice created for receipt ${receipt.transactionNumber}`);
          }
        }
        
        setLastCheckTime(new Date());
      } catch (error) {
        console.error('Error checking for automatic invoices:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check
    checkForAutomaticInvoices();
    
    // Set up interval for automatic checks (every 5 minutes)
    const interval = setInterval(checkForAutomaticInvoices, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [enabled, storage]);

  return { lastCheckTime, isChecking };
};