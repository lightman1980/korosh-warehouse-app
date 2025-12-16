import React from 'react';
import { formatPersianDate } from '../../utils/persian'; // اصلاح شد

// ... بقیه کد بدون تغییر ...

interface ContractSelectorProps {
  contracts: any[];
  onSelectContract: (contractId: string) => void;
  onCancel: () => void;
}

const ContractSelector: React.FC<ContractSelectorProps> = ({ contracts, onSelectContract, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">انتخاب قرارداد برای تحویل کالا</h3>
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
                  از تاریخ: {formatPersianDate(new Date(contract.startDate))} تا تاریخ: {formatPersianDate(new Date(contract.endDate))}
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

export default ContractSelector;