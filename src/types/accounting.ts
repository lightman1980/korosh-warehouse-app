export interface Receipt {
  id: string;
  transactionNumber: string;
  userType: 'consignment' | 'direct';
  status: 'draft' | 'saved' | 'finalized' | 'printed' | 'cancelled' | 'deleted';
  receiptDate: Date;
  counterpartyName: string;
  contractNumber: string;
  receiptBasisAmount: number;
  productName: string;
  contractId: string;
  companyId: string;
  productId: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName?: string;
  unit: 'kg' | 'ton';
  consignmentRemainder?: number;
  contractWeight?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contract {
  id: string;
  contractNumber: string;
  rentalRate: number;
  contractWeight: number;
  unit: 'kg' | 'ton';
  wastageRateValue: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceData {
  id: string;
  receiptId: string;
  transactionNumber: string;
  year: number;
  month: number;
  invoiceAmount: number;
  paidAmount: number;
  remainingDebt: number;
  status: 'draft' | 'issued' | 'paid' | 'settled';
  createdAt: Date;
  updatedAt: Date;
  invoiceType: 'automatic' | 'manual';
  contractId?: string;
  paymentDate?: Date | null;
  calculationBasis?: 'receiptBasis' | 'remainingPermit' | 'contractAmount';
  quantity?: number;
  rate?: number;
}

export interface DeliveryPermit {
  id: string;
  receiptId: string;
  systemPermitNumber: string;
  managementLetterNumber: string;
  permitAmount: number;
  wastageAmount: number;
  finalPermitAmount: number;
  remainingPermit: number;
  status: 'draft' | 'issued' | 'used' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  contractId?: string;
  event?: string;
  approvalDate?: Date | null;
  approvedCount?: number;
  isVoided?: boolean;
}

export interface Delivery {
  id: string;
  transactionNumber: string;
  userType: 'consignment' | 'direct';
  companyId: string;
  companyName: string;
  productId: string;
  productName: string;
  siteId: string;
  siteName: string;
  tankId: string;
  tankName: string;
  amount: number;
  unit: 'kg' | 'ton';
  deliveryDate: Date;
  recipientType: 'first_party' | 'third_party';
  notes: string;
  status: 'draft' | 'saved' | 'finalized' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  contractId?: string;
  contractNumber?: string;
  permitId?: string;
  managementLetterNumber?: string;
  fromPermit?: boolean;
  permitAmount?: number;
  wastageAmount?: number;
  finalPermitAmount?: number;
  fullAmountTransferred?: boolean;
  trustDelivery?: boolean;
  receiptBasisAmount?: number;
}

export interface Adjustment {
  id: string;
  contractId: string;
  type: 'addition' | 'subtraction';
  amount: number;
  description: string;
  status: 'draft' | 'saved' | 'finalized' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface WastageTransaction {
  id: string;
  receiptId: string;
  amount: number;
  description: string;
  createdAt: Date;
}

export interface CorrectionRequest {
  id: string;
  permitId: string;
  receiptId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartData {
  name: string;
  value: number;
}

export type InvoiceBasis = 'receiptBasis' | 'remainingContractWeight' | 'contractAmount';

export type ActiveTab = 'uninvoiced' | 'invoiced' | 'permits';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

export interface BaseDataCategory {
  id: string;
  name: string;
  items: any[];
}