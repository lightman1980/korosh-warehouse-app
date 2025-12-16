// src/components/Warehouse/DeliverySlipTypeSelector.tsx
import React, { useEffect } from 'react';

interface DeliverySlipTypeSelectorProps {
  onSelectType: (type: 'consignment' | 'ownership') => void;
  onCancel: () => void;
  deliveryCreationMode?: 'general' | 'ownership-direct';
}

const DeliverySlipTypeSelector: React.FC<DeliverySlipTypeSelectorProps> = ({ onSelectType, onCancel, deliveryCreationMode }) => {
  
  useEffect(() => {
    if (deliveryCreationMode === 'ownership-direct') {
      onSelectType('ownership');
    }
  }, [deliveryCreationMode, onSelectType]);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">انتخاب نوع حواله</h3>
        <div className="space-y-3">
          <button
            onClick={() => onSelectType('consignment')}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-right font-medium"
          >
            حواله امانی
          </button>
          <button
            onClick={() => onSelectType('ownership')}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-right font-medium"
          >
            حواله تملیکی
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors text-right font-medium"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliverySlipTypeSelector;