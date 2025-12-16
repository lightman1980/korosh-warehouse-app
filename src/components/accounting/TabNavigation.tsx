import React from 'react';
import { ActiveTab } from '../../types/accounting';

interface TabNavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  uninvoicedCount: number;
  invoicedCount: number;
  permitsCount: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  setActiveTab,
  uninvoicedCount,
  invoicedCount,
  permitsCount
}) => {
  const tabs = [
    {
      id: 'uninvoiced' as ActiveTab,
      label: 'رسيد انبارهای امانی',
      count: uninvoicedCount
    },
    {
      id: 'invoiced' as ActiveTab,
      label: 'فاکتورها',
      count: invoicedCount
    },
    {
      id: 'permits' as ActiveTab,
      label: 'مجوزها',
      count: permitsCount
    }
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm flex items-center
              ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.label}
            <span className={`
              mr-2 py-0.5 px-2 rounded-full text-xs
              ${activeTab === tab.id
                ? 'bg-blue-100 text-blue-600'
                : 'bg-gray-100 text-gray-600'
              }
            `}>
              {tab.count}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};//