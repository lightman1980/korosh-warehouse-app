import React from 'react';

interface CompanySelectorProps {
  companies: any[];
  onSelectCompany: (companyId: string) => void;
  onCancel: () => void;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({ companies, onSelectCompany, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">انتخاب شرکت امانی برای تحویل کالا</h3>
        <div className="space-y-2">
          {companies.map(company => (
            <button
              key={company.id}
              onClick={() => onSelectCompany(company.id)}
              className="w-full bg-gray-100 text-gray-900 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors text-right"
            >
              {company.name}
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

export default CompanySelector;