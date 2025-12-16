import { useState, useEffect, useCallback } from 'react';
import { DataStorage } from '../utils/dataStorage';
import { 
  Receipt, 
  Contract, 
  InvoiceData, 
  DeliveryPermit, 
  Delivery, 
  Adjustment, 
  WastageTransaction,
  CorrectionRequest 
} from '../types/accounting';

export const useAccountingData = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [deliveryPermits, setDeliveryPermits] = useState<DeliveryPermit[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [wastageTransactions, setWastageTransactions] = useState<WastageTransaction[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(() => {
    try {
      setIsLoading(true);
      const savedReceipts = DataStorage.getInstance().loadData('receipts') || [];
      const savedContracts = DataStorage.getInstance().loadData('contracts') || [];
      const savedInvoices = DataStorage.getInstance().loadData('invoices') || [];
      const savedPermits = DataStorage.getInstance().loadData('delivery-permits') || [];
      const savedDeliveries = DataStorage.getInstance().loadData('deliveries') || [];
      const savedAdjustments = DataStorage.getInstance().loadData('adjustments') || [];
      const savedWastageTransactions = DataStorage.getInstance().loadData('wastageTransactions') || [];
      const savedCorrectionRequests = DataStorage.getInstance().loadData('correction-requests') || [];
      
      // Convert date strings back to Date objects
      const processedReceipts = savedReceipts.map((item: any) => ({
        ...item,
        receiptDate: item.receiptDate ? new Date(item.receiptDate) : new Date()
      }));
      
      const processedContracts = savedContracts.map((item: any) => ({
        ...item,
        startDate: item.startDate ? new Date(item.startDate) : new Date(),
        endDate: item.endDate ? new Date(item.endDate) : new Date()
      }));
      
      const processedInvoices = savedInvoices.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        paymentDate: item.paymentDate ? new Date(item.paymentDate) : null
      }));
      
      const processedPermits = savedPermits.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        approvalDate: item.approvalDate ? new Date(item.approvalDate) : null,
        permitDate: item.permitDate ? new Date(item.permitDate) : null
      }));
      
      const processedDeliveries = savedDeliveries.map((item: any) => ({
        ...item,
        deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : new Date(),
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
      }));
      
      const processedAdjustments = savedAdjustments.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
      }));
      
      const processedWastageTransactions = savedWastageTransactions.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
      }));
      
      const processedCorrectionRequests = savedCorrectionRequests.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
      }));
      
      setReceipts(processedReceipts);
      setContracts(processedContracts);
      setInvoices(processedInvoices);
      setDeliveryPermits(processedPermits);
      setDeliveries(processedDeliveries);
      setAdjustments(processedAdjustments);
      setWastageTransactions(processedWastageTransactions);
      setCorrectionRequests(processedCorrectionRequests);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    receipts,
    contracts,
    invoices,
    deliveryPermits,
    deliveries,
    adjustments,
    wastageTransactions,
    correctionRequests,
    isLoading,
    loadData,
    setReceipts,
    setContracts,
    setInvoices,
    setDeliveryPermits,
    setDeliveries,
    setAdjustments,
    setWastageTransactions,
    setCorrectionRequests
  };
};