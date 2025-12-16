// برنامه DataTable.tsx
import React from 'react';
import { Filter, ChevronUp, ChevronDown, Calculator } from 'lucide-react';
import { TableColumn, SortConfig, SortDirection } from '../../types/accounting';

interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onSort?: (key: string) => void;
  onFilter?: (key: string, value: string) => void;
  sortConfig?: SortConfig | null;
  columnFilters?: Record<string, string>;
  showColumnFilter?: string | null;
  toggleColumnFilter?: (columnKey: string) => void;
  handleColumnFilterChange?: (columnKey: string, value: string) => void;
  clearColumnFilter?: (columnKey: string) => void;
  renderRow?: (item: T, index: number) => React.ReactNode;
  renderFooter?: (data: T[]) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  showColumnSum?: boolean;
  numericColumns?: string[];
  formatSum?: (value: number) => string;
  showRowCount?: boolean;
  rowCount?: number;
  sumRowTitle?: string;
  sumRowClassName?: string;
}

export const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  onSort,
  onFilter,
  sortConfig,
  columnFilters,
  showColumnFilter,
  toggleColumnFilter,
  handleColumnFilterChange,
  clearColumnFilter,
  renderRow,
  renderFooter,
  emptyMessage = 'داده‌اي براي نمايش وجود ندارد',
  loading = false,
  showColumnSum = false,
  numericColumns = [],
  formatSum = (value: number) => value.toLocaleString('fa-IR'),
  showRowCount = false,
  rowCount,
  sumRowTitle = 'جمع کل:',
  sumRowClassName = 'bg-gray-100 font-bold'
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  // محاسبه مجموع ستون‌های عددی
  const calculateColumnSum = (columnKey: string): number => {
    if (!numericColumns.includes(columnKey)) return 0;
    
    return data.reduce((sum, item) => {
      const value = parseFloat(item[columnKey]);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  };

  return (
    <div className="overflow-x-auto">
      {showRowCount && rowCount !== undefined && (
        <div className="mb-4 text-sm text-gray-600">
          تعداد تراکنش‌ها: <span className="font-bold">{rowCount.toLocaleString('fa-IR')}</span>
        </div>
      )}
      
      <table className="w-full">
        <thead className="bg-gray-50">
          {/* ردیف مجموع ستون‌ها */}
          {showColumnSum && (
            <tr className={sumRowClassName}>
              <td className="px-4 py-2 text-sm text-gray-700">{sumRowTitle}</td>
              {columns.slice(1).map((column) => {
                const columnKey = String(column.key);
                const isNumeric = numericColumns.includes(columnKey);
                const sum = isNumeric ? calculateColumnSum(columnKey) : null;
                
                return (
                  <th key={`sum-${columnKey}`} className="px-4 py-2 text-sm text-gray-700">
                    {isNumeric && sum !== null ? (
                      <div className="flex items-center">
                        <Calculator className="h-4 w-4 ml-1 text-gray-500" />
                        {formatSum(sum)}
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </th>
                );
              })}
            </tr>
          )}
          
          {/* ردیف هدر اصلی */}
          <tr>
            {columns.map((column) => (
              <th 
                key={String(column.key)} 
                className={`px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase ${column.width || ''}`}
              >
                {column.sortable ? (
                  <div className="flex items-center justify-between relative">
                    <span>{column.title}</span>
                    <div className="flex flex-col">
                      {sortConfig?.key === column.key && sortConfig.direction === 'asc' && <ChevronUp size={14} />}
                      {sortConfig?.key === column.key && sortConfig.direction === 'desc' && <ChevronDown size={14} />}
                    </div>
                    {column.filterable && (
                      <button 
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleColumnFilter?.(String(column.key));
                        }}
                      >
                        <Filter size={14} />
                      </button>
                    )}
                    {showColumnFilter === String(column.key) && (
                      <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 z-10 w-48">
                        <input
                          type="text"
                          placeholder={`فيلتر ${column.title}...`}
                          value={columnFilters?.[String(column.key)] || ''}
                          onChange={(e) => handleColumnFilterChange?.(String(column.key), e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button 
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => clearColumnFilter?.(String(column.key))}
                        >
                          پاک کردن فيلتر
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span>{column.title}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => 
            renderRow ? renderRow(item, index) : (
              <tr key={item.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-sm text-gray-900">
                    {column.render 
                      ? column.render(item[column.key], item) 
                      : item[column.key]}
                  </td>
                ))}
              </tr>
            )
          )}
        </tbody>
        {renderFooter && (
          <tfoot className="bg-gray-50">
            {renderFooter(data)}
          </tfoot>
        )}
      </table>
    </div>
  );
};