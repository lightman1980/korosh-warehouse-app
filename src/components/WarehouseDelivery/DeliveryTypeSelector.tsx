import React from 'react';

interface DeliveryTypeSelectorProps {
  onSelectType: (type: 'owned' | 'consignment') => void;
  onCancel: () => void;
}

const DeliveryTypeSelector: React.FC<DeliveryTypeSelectorProps> = ({ onSelectType, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium text-gray-900 mb-4">انتخاب نوع تحویل</h3>
        <div className="space-y-3">
          <button
            onClick={() => onSelectType('consignment')}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-right"
          >
            تحویل امانی
          </button>
          <button
            onClick={() => onSelectType('owned')}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-right"
          >
            تحویل متعلق به شرکت
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

export default DeliveryTypeSelector;