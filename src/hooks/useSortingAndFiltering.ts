import { useState, useCallback, useMemo } from 'react';
import { SortConfig, SortDirection } from '../types/accounting';

export const useSortingAndFiltering = <T extends Record<string, any>>(
  data: T[],
  initialSortConfig?: SortConfig | null
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(initialSortConfig || null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showColumnFilter, setShowColumnFilter] = useState<Record<string, boolean>>({});

  const handleSort = useCallback((key: string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  const toggleColumnFilter = useCallback((columnKey: string) => {
    setShowColumnFilter(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  }, []);

  const handleColumnFilterChange = useCallback((columnKey: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
  }, []);

  const clearColumnFilter = useCallback((columnKey: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[columnKey];
      return newFilters;
    });
  }, []);

  const getSortedAndFilteredData = useMemo(() => {
    // Apply column filters
    let filteredData = data.filter(item => {
      return Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        
        const itemValue = item[key];
        const itemValueStr = String(itemValue || '').toLowerCase();
        const filterValue = value.toLowerCase();
        
        return itemValueStr.includes(filterValue);
      });
    });
    
    // Apply sorting
    if (sortConfig !== null) {
      filteredData = [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        // Handle number comparison
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filteredData;
  }, [data, columnFilters, sortConfig]);

  const calculateColumnSum = useCallback((columnKey: string) => {
    return getSortedAndFilteredData.reduce((sum, item) => {
      const value = item[columnKey] || 0;
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }, [getSortedAndFilteredData]);

  return {
    sortConfig,
    columnFilters,
    showColumnFilter,
    handleSort,
    toggleColumnFilter,
    handleColumnFilterChange,
    clearColumnFilter,
    getSortedAndFilteredData,
    calculateColumnSum
  };
};