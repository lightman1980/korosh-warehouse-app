// Local storage utilities for data persistence
export class DataStorage {
  private static instance: DataStorage;
  private storageKey = 'warehouseData';
  private listeners: Map<string, Function[]> = new Map();
  
  // Initialize storage with default data
  private initialize(): void {
    try {
      // Check if data already exists
      const existingData = localStorage.getItem(this.storageKey);
      
      if (!existingData) {
        // Create default data structure
        const defaultData = {
          receipts: [],
          contracts: [],
          invoices: [],
          'delivery-permits': [],
          deliveries: [],
          adjustments: [],
          inventoryAdjustments: [],
          wastageTransactions: [],
          'correction-requests': [],
          // ✅ FIX: baseDataCategories را برگردانیم تا مشکل صفحه خالی حل شود
          baseDataCategories: [
            {
              id: 'basic',
              name: 'اطلاعات پایه',
              items: [
                { id: 'warehouses', name: 'انبارها' },
                { id: 'products', name: 'محصولات' },
                { id: 'units', name: 'واحدها' },
                { id: 'suppliers', name: 'تأمین‌کنندگان' },
                { id: 'customers', name: 'مشتریان' }
              ]
            },
            {
              id: 'delivery',
              name: 'تحویل',
              items: [
                { id: 'delivery_types', name: 'انواع تحویل' },
                { id: 'delivery_status', name: 'وضعیت تحویل' }
              ]
            },
            {
              id: 'receipt',
              name: 'رسید',
              items: [
                { id: 'receipt_types', name: 'انواع رسید' },
                { id: 'receipt_status', name: 'وضعیت رسید' }
              ]
            }
          ],
          baseDataSelectedCategory: 'basic',
          // Ownership delivery slips
          'ownership-delivery-slips': [],
          // Checked transactions for warehouse deliveries
          'checked-transactions': [],
          'disabled-transactions': []
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(defaultData));
        console.log('📦 Storage initialized with default data including baseDataCategories');
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }
  
  private constructor() {
    // Initialize storage when instance is created
    this.initialize();
  }
  
  static getInstance(): DataStorage {
    if (!DataStorage.instance) {
      DataStorage.instance = new DataStorage();
    }
    return DataStorage.instance;
  }
  
  // Save data to localStorage with enhanced fallback mechanisms
  saveData(key: string, data: any): void {
    try {
      const existingData = this.getAllData();
      existingData[key] = data;
      localStorage.setItem(this.storageKey, JSON.stringify(existingData));
      
      // Special handling for BaseDataManager categories
      if (key === 'baseDataCategories' && Array.isArray(data)) {
        try {
          // Save each category individually for better fallback support
          data.forEach((category: any) => {
            if (category.id && category.items) {
              localStorage.setItem(`${this.storageKey}_category_${category.id}`, JSON.stringify(category));
            }
          });
          console.log(`💾 Categories saved individually for key: ${key}`);
        } catch (categoryError) {
          console.warn('Individual category save failed:', categoryError);
        }
      }
      
      // Notify listeners
      const keyListeners = this.listeners.get(key) || [];
      keyListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in listener:', error);
        }
      });
      
      console.log(`✅ Data saved for key: ${key}`, Array.isArray(data) ? `${data.length} items` : typeof data);
    } catch (error) {
      console.error('Error saving data to main storage:', error);
      
      // Enhanced fallback: try to save individual key
      try {
        localStorage.setItem(`${this.storageKey}_${key}`, JSON.stringify(data));
        console.log(`⚠️ Data saved as fallback for key: ${key}`);
        
        // Additional fallback for BaseDataManager categories
        if (key === 'baseDataCategories' && Array.isArray(data)) {
          try {
            data.forEach((category: any) => {
              if (category.id && category.items) {
                localStorage.setItem(`${this.storageKey}_category_${category.id}`, JSON.stringify(category));
              }
            });
            console.log(`💾 Categories also saved individually as additional fallback`);
          } catch (categoryFallbackError) {
            console.warn('Individual category fallback save failed:', categoryFallbackError);
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback save also failed:', fallbackError);
        
        // Last resort: try to save to sessionStorage
        try {
          sessionStorage.setItem(`${this.storageKey}_${key}`, JSON.stringify(data));
          console.log(`🆘 Data saved to sessionStorage as last resort for key: ${key}`);
        } catch (sessionError) {
          console.error('❌ SessionStorage fallback also failed:', sessionError);
          throw new Error('All storage mechanisms failed');
        }
      }
    }
  }
  
  // Load data from localStorage with enhanced fallback mechanisms
  loadData<T>(key: string): T | null {
    try {
      const allData = this.getAllData();
      let data = allData[key];
      
      // Fallback 1: try to load from individual key if not found in main storage
      if (!data) {
        try {
          const fallbackData = localStorage.getItem(`${this.storageKey}_${key}`);
          if (fallbackData) {
            data = JSON.parse(fallbackData);
            console.log(`📂 Data loaded from fallback for key: ${key}`);
          }
        } catch (fallbackError) {
          console.warn('Fallback 1 load failed:', fallbackError);
        }
      }
      
      // Fallback 2: for BaseDataManager categories, try individual category keys
      if (!data && key === 'baseDataCategories') {
        try {
          const categories = [];
          Object.keys(localStorage).forEach(storageKey => {
            if (storageKey.startsWith(`${this.storageKey}_category_`)) {
              const categoryData = JSON.parse(localStorage.getItem(storageKey) || '{}');
              if (categoryData.id && categoryData.items) {
                categories.push(categoryData);
              }
            }
          });
          if (categories.length > 0) {
            data = categories;
            console.log(`📂 Data loaded from category fallback for key: ${key} (${categories.length} categories)`);
          }
        } catch (fallbackError) {
          console.warn('Fallback 2 (categories) load failed:', fallbackError);
        }
      }
      
      // Data type validation and fallback values
      if (data === null || data === undefined) {
        // Return appropriate default values based on key type
        switch (key) {
          case 'baseDataCategories':
            return [
              {
                id: 'basic',
                name: 'اطلاعات پایه',
                items: [
                  { id: 'warehouses', name: 'انبارها' },
                  { id: 'products', name: 'محصولات' },
                  { id: 'units', name: 'واحدها' },
                  { id: 'suppliers', name: 'تأمین‌کنندگان' },
                  { id: 'customers', name: 'مشتریان' }
                ]
              }
            ] as T;
          case 'baseDataSelectedCategory':
            return 'basic' as T;
          case 'ownership-delivery-slips':
          case 'consignment-delivery-slips':
          case 'receipts':
          case 'deliveries':
          case 'contracts':
          case 'invoices':
          case 'delivery-permits':
          case 'adjustments':
          case 'inventoryAdjustments':
          case 'wastageTransactions':
          case 'correction-requests':
          case 'checked-transactions':
          case 'disabled-transactions':
            return [] as T; // Default empty array for list data
          default:
            return null;
        }
      }
      
      console.log(`📖 Data loaded for key: ${key}`, Array.isArray(data) ? `${data?.length || 0} items` : typeof data);
      return data;
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Emergency fallback: return empty array for known list keys
      const listKeys = [
        'ownership-delivery-slips', 'consignment-delivery-slips', 'receipts', 'deliveries',
        'contracts', 'invoices', 'delivery-permits', 'adjustments', 'inventoryAdjustments', 'wastageTransactions',
        'correction-requests', 'checked-transactions', 'disabled-transactions', 'baseDataCategories'
      ];
      
      if (listKeys.includes(key)) {
        console.log(`🆘 Emergency fallback: returning empty array for key: ${key}`);
        return [] as T;
      }
      
      return null;
    }
  }
  
  // Add listener for data changes
  addListener(key: string, listener: Function): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(listener);
  }
  
  // Remove listener
  removeListener(key: string, listener: Function): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      const index = keyListeners.indexOf(listener);
      if (index > -1) {
        keyListeners.splice(index, 1);
      }
    }
  }
  
  // Get all data
  getAllData(): any {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting all data:', error);
      return {};
    }
  }
  
  // Clear specific data key with enhanced category handling
  clearData(key: string): void {
    try {
      const allData = this.getAllData();
      if (allData[key]) {
        delete allData[key];
        localStorage.setItem(this.storageKey, JSON.stringify(allData));
        console.log(`🗑️ Data cleared from main storage for key: ${key}`);
      }
      
      // Clear fallback storage
      try {
        localStorage.removeItem(`${this.storageKey}_${key}`);
        console.log(`🗑️ Data cleared from fallback storage for key: ${key}`);
      } catch (fallbackError) {
        console.warn('Fallback clear failed:', fallbackError);
      }
      
      // Special handling for BaseDataManager categories
      if (key === 'baseDataCategories') {
        try {
          // Clear all individual category keys
          Object.keys(localStorage).forEach(storageKey => {
            if (storageKey.startsWith(`${this.storageKey}_category_`)) {
              localStorage.removeItem(storageKey);
            }
          });
          console.log(`🗑️ All individual category data cleared`);
        } catch (categoryError) {
          console.warn('Category clear failed:', categoryError);
        }
      }
      
      console.log(`✅ Data cleared successfully for key: ${key}`);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
  
  // Clear all data including enhanced fallback mechanisms
  clearAllData(): void {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('🗑️ Main storage cleared');
      
      // Clear all fallback data
      Object.keys(localStorage)
        .filter(key => key.startsWith(`${this.storageKey}_`))
        .forEach(key => {
          localStorage.removeItem(key);
        });
      console.log('🗑️ All fallback data cleared');
      
      // Clear sessionStorage backup data
      Object.keys(sessionStorage)
        .filter(key => key.startsWith(`${this.storageKey}_`))
        .forEach(key => {
          sessionStorage.removeItem(key);
        });
      console.log('🗑️ All sessionStorage backup data cleared');
      
      console.log('✅ All data cleared successfully');
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
  
  // Export data to file with enhanced key support
  exportData(): void {
    try {
      const data = this.getAllData();
      
      // Add fallback data to export
      const fallbackData: any = {};
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`${this.storageKey}_`) && !key.includes('test')) {
          try {
            const value = JSON.parse(localStorage.getItem(key) || 'null');
            if (value !== null) {
              fallbackData[key.replace(`${this.storageKey}_`, '')] = value;
            }
          } catch (e) {
            // Skip invalid JSON data
          }
        }
      });
      
      // Create enhanced CSV format for Excel
      const csvRows = [];
      csvRows.push(['Category', 'Key', 'Data Type', 'Item Count', 'Data'].join(','));
      
      // Export main data
      Object.entries(data).forEach(([key, value]) => {
        const dataType = Array.isArray(value) ? 'Array' : typeof value;
        const itemCount = Array.isArray(value) ? value.length : (value && typeof value === 'object' ? Object.keys(value).length : 0);
        const escapedValue = JSON.stringify(value).replace(/"/g, '""');
        const category = this.getKeyCategory(key);
        csvRows.push([category, key, dataType, itemCount, `"${escapedValue}"`].join(','));
      });
      
      // Export fallback data
      Object.entries(fallbackData).forEach(([key, value]) => {
        const dataType = Array.isArray(value) ? 'Array' : typeof value;
        const itemCount = Array.isArray(value) ? value.length : (value && typeof value === 'object' ? Object.keys(value).length : 0);
        const escapedValue = JSON.stringify(value).replace(/"/g, '""');
        csvRows.push(['Fallback', key, dataType, itemCount, `"${escapedValue}"`].join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const BOM = '\uFEFF'; // UTF-8 BOM for proper Persian character display
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `warehouse_backup_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      console.log('✅ Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }

  // Helper method to categorize keys for export
  private getKeyCategory(key: string): string {
    if (key.startsWith('baseData') || key.startsWith('category_')) return 'BaseData';
    if (key.includes('delivery')) return 'Deliveries';
    if (key.includes('receipt')) return 'Receipts';
    if (key.includes('permit')) return 'Permits';
    if (key.includes('contract')) return 'Contracts';
    if (key.includes('adjustment')) return 'Adjustments';
    if (key.includes('transaction')) return 'Transactions';
    if (key.includes('check')) return 'Checks';
    return 'General';
  }
  
  // Import data from file with enhanced validation
  importData(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let data: any;
          
          // Try to parse as JSON first
          try {
            data = JSON.parse(e.target?.result as string);
          } catch (jsonError) {
            // If JSON parsing fails, try CSV parsing
            const csvContent = e.target?.result as string;
            data = this.parseCsvImport(csvContent);
          }
          
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
          }
          
          // Validate and merge data
          const currentData = this.getAllData();
          const mergedData = { ...currentData };
          
          // Merge each key with validation
          Object.entries(data).forEach(([key, value]) => {
            if (this.isValidKeyValue(key, value)) {
              mergedData[key] = value;
              console.log(`📥 Imported key: ${key}`, Array.isArray(value) ? `${value.length} items` : typeof value);
            } else {
              console.warn(`⚠️ Skipped invalid key: ${key}`);
            }
          });
          
          // Save merged data
          localStorage.setItem(this.storageKey, JSON.stringify(mergedData));
          
          // Handle individual category imports
          if (data.baseDataCategories && Array.isArray(data.baseDataCategories)) {
            data.baseDataCategories.forEach((category: any) => {
              if (category.id) {
                localStorage.setItem(`${this.storageKey}_category_${category.id}`, JSON.stringify(category));
              }
            });
          }
          
          console.log('📥 Data imported successfully');
          resolve();
        } catch (error) {
          console.error('Import failed:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }

  // Helper method to parse CSV import
  private parseCsvImport(csvContent: string): any {
    const lines = csvContent.split('\n');
    const data: any = {};
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parsing (assumes no commas in values)
      const parts = line.split(',');
      if (parts.length >= 2) {
        const key = parts[1].trim();
        try {
          // Try to parse the data part (last column)
          const dataPart = parts.slice(4).join(','); // Data is in the last column
          const cleanData = dataPart.replace(/^"|"$/g, '').replace(/""/g, '"');
          const parsedData = JSON.parse(cleanData);
          data[key] = parsedData;
        } catch (e) {
          console.warn(`Failed to parse CSV data for key: ${key}`);
        }
      }
    }
    
    return data;
  }

  // Helper method to validate key-value pairs
  private isValidKeyValue(key: string, value: any): boolean {
    // Skip test keys
    if (key.includes('test') || key.includes('__')) return false;
    
    // Validate based on key type
    if (key.startsWith('baseData') || key.startsWith('category_')) {
      return Array.isArray(value) || typeof value === 'string';
    }
    
    if (key.includes('slips') || key.includes('receipts') || key.includes('deliveries') || 
        key.includes('contracts') || key.includes('permits') || key.includes('adjustments')) {
      return Array.isArray(value);
    }
    
    if (key.includes('transaction') || key.includes('check') || key.includes('disabled')) {
      return Array.isArray(value);
    }
    
    // General validation
    return value !== null && value !== undefined;
  }
  
  // Check if storage is available
  isStorageAvailable(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.error('Storage not available:', e);
      return false;
    }
  }

  // Enhanced method for ownership delivery slips compatibility
  saveOwnershipDeliverySlip(slip: any): void {
    try {
      const slips = this.loadData('ownership-delivery-slips') || [];
      const existingIndex = slips.findIndex((s: any) => s.id === slip.id);
      
      if (existingIndex >= 0) {
        slips[existingIndex] = { ...slip, updatedAt: new Date() };
      } else {
        slips.push({ ...slip, createdAt: new Date(), updatedAt: new Date() });
      }
      
      this.saveData('ownership-delivery-slips', slips);
      console.log(`💾 Ownership delivery slip saved: ${slip.transactionNumber || slip.id}`);
    } catch (error) {
      console.error('Error saving ownership delivery slip:', error);
      throw error;
    }
  }

  // Enhanced method for consignment delivery slips compatibility  
  saveConsignmentDeliverySlip(slip: any): void {
    try {
      const slips = this.loadData('consignment-delivery-slips') || [];
      const existingIndex = slips.findIndex((s: any) => s.id === slip.id);
      
      if (existingIndex >= 0) {
        slips[existingIndex] = { ...slip, updatedAt: new Date() };
      } else {
        slips.push({ ...slip, createdAt: new Date(), updatedAt: new Date() });
      }
      
      this.saveData('consignment-delivery-slips', slips);
      console.log(`💾 Consignment delivery slip saved: ${slip.transactionNumber || slip.id}`);
    } catch (error) {
      console.error('Error saving consignment delivery slip:', error);
      throw error;
    }
  }

  // Get all delivery slips (both ownership and consignment) combined
  getAllDeliverySlips(): any[] {
    try {
      const ownershipSlips = this.loadData('ownership-delivery-slips') || [];
      const consignmentSlips = this.loadData('consignment-delivery-slips') || [];
      return [...ownershipSlips, ...consignmentSlips];
    } catch (error) {
      console.error('Error getting all delivery slips:', error);
      return [];
    }
  }

  // Validate data integrity for BaseDataManager
  validateBaseDataIntegrity(): { isValid: boolean; errors: string[]; warnings: string[] } {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check if baseDataCategories exists and is valid
      const categories = this.loadData('baseDataCategories');
      if (!categories) {
        errors.push('baseDataCategories not found - this should not happen with the fix');
      } else if (!Array.isArray(categories)) {
        errors.push('baseDataCategories is not an array');
      } else {
        // Validate each category
        categories.forEach((cat: any, index: number) => {
          if (!cat.id) {
            errors.push(`Category at index ${index} missing id`);
          }
          if (!cat.name) {
            errors.push(`Category ${cat.id || index} missing name`);
          }
          if (!Array.isArray(cat.items)) {
            errors.push(`Category ${cat.id || index} items is not an array`);
          }
        });
      }
      
      // Check if selected category exists
      const selectedCategory = this.loadData('baseDataSelectedCategory');
      if (selectedCategory && Array.isArray(categories)) {
        const categoryExists = categories.some((cat: any) => cat.id === selectedCategory);
        if (!categoryExists) {
          warnings.push(`Selected category "${selectedCategory}" does not exist`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating base data integrity:', error);
      return {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: []
      };
    }
  }

  // Recovery method for corrupted data
  recoverData(): void {
    try {
      console.log('🔄 Starting data recovery process...');
      
      // Try to recover baseDataCategories from individual category keys
      const categories = [];
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`${this.storageKey}_category_`)) {
          try {
            const categoryData = JSON.parse(localStorage.getItem(key) || '{}');
            if (categoryData.id && categoryData.items) {
              categories.push(categoryData);
            }
          } catch (e) {
            console.warn(`Failed to parse category data from key: ${key}`, e);
          }
        }
      });
      
      if (categories.length > 0) {
        this.saveData('baseDataCategories', categories);
        console.log(`✅ Recovered ${categories.length} categories from individual storage`);
      }
      
      // Clear any invalid data
      const mainData = this.getAllData();
      Object.keys(mainData).forEach(key => {
        if (mainData[key] === null || mainData[key] === undefined) {
          delete mainData[key];
        }
      });
      
      localStorage.setItem(this.storageKey, JSON.stringify(mainData));
      console.log('✅ Data recovery completed');
      
    } catch (error) {
      console.error('❌ Data recovery failed:', error);
    }
  }

  // Check BaseDataManager compatibility
  checkBaseDataCompatibility(): { isCompatible: boolean; missingKeys: string[]; recommendations: string[] } {
    const requiredKeys = [
      'baseDataCategories',
      'baseDataSelectedCategory',
      'ownership-delivery-slips',
      'consignment-delivery-slips',
      'checked-transactions',
      'disabled-transactions'
    ];
    
    const allData = this.getAllData();
    const missingKeys: string[] = [];
    const recommendations: string[] = [];
    
    requiredKeys.forEach(key => {
      if (!(key in allData)) {
        missingKeys.push(key);
      }
    });
    
    // Check if categories are properly structured
    const categories = this.loadData('baseDataCategories');
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      recommendations.push('baseDataCategories is missing or empty - this should not happen with the fix applied');
    } else {
      // Validate category structure
      categories.forEach((cat: any, index: number) => {
        if (!cat.id) {
          recommendations.push(`Category at index ${index} is missing ID`);
        }
        if (!cat.name) {
          recommendations.push(`Category ${cat.id || index} is missing name`);
        }
        if (!Array.isArray(cat.items)) {
          recommendations.push(`Category ${cat.id || index} items is not an array`);
        }
      });
    }
    
    // Check storage space
    const storageInfo = this.getStorageInfo();
    if (storageInfo.percentage > 80) {
      recommendations.push(`Storage usage is high (${storageInfo.percentage.toFixed(1)}%) - consider cleaning up old data`);
    }
    
    return {
      isCompatible: missingKeys.length === 0,
      missingKeys,
      recommendations
    };
  }

  // Initialize BaseDataManager compatible storage
  initializeBaseDataStorage(): void {
    try {
      console.log('🔧 Initializing BaseDataManager compatible storage...');
      
      // Ensure all required keys exist with proper defaults
      const requiredKeys = {
        baseDataCategories: [
          {
            id: 'basic',
            name: 'اطلاعات پایه',
            items: [
              { id: 'warehouses', name: 'انبارها' },
              { id: 'products', name: 'محصولات' },
              { id: 'units', name: 'واحدها' },
              { id: 'suppliers', name: 'تأمین‌کنندگان' },
              { id: 'customers', name: 'مشتریان' }
            ]
          }
        ],
        baseDataSelectedCategory: 'basic',
        'ownership-delivery-slips': [],
        'consignment-delivery-slips': [],
        'checked-transactions': [],
        'disabled-transactions': []
      };
      
      const currentData = this.getAllData();
      let hasChanges = false;
      
      Object.entries(requiredKeys).forEach(([key, defaultValue]) => {
        if (!(key in currentData)) {
          this.saveData(key, defaultValue);
          hasChanges = true;
          console.log(`✅ Initialized key: ${key}`);
        }
      });
      
      if (hasChanges) {
        console.log('✅ BaseDataManager storage initialization completed');
      } else {
        console.log('✅ All BaseDataManager keys already exist');
      }
      
    } catch (error) {
      console.error('❌ BaseDataManager storage initialization failed:', error);
    }
  }
  
  // Get storage usage info with enhanced tracking
  getStorageInfo(): { used: number; total: number; percentage: number; details: any } {
    try {
      let used = 0;
      const details: any = {
        main: 0,
        fallback: 0,
        sessionBackup: 0,
        categories: 0,
        keyCount: {
          main: 0,
          fallback: 0,
          sessionBackup: 0,
          categories: 0
        }
      };
      
      // Calculate main storage usage
      const mainData = localStorage.getItem(this.storageKey);
      if (mainData) {
        used += mainData.length;
        details.main = mainData.length;
        details.keyCount.main = 1;
      }
      
      // Calculate fallback storage usage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`${this.storageKey}_`)) {
          const value = localStorage.getItem(key) || '';
          used += value.length;
          details.fallback += value.length;
          details.keyCount.fallback++;
          
          // Track category-specific storage
          if (key.startsWith(`${this.storageKey}_category_`)) {
            details.categories += value.length;
            details.keyCount.categories++;
          }
        }
      });
      
      // Calculate sessionStorage backup usage
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(`${this.storageKey}_`)) {
          const value = sessionStorage.getItem(key) || '';
          used += value.length;
          details.sessionBackup += value.length;
          details.keyCount.sessionBackup++;
        }
      });
      
      // LocalStorage typically has 5MB limit
      const total = 5 * 1024 * 1024; // 5MB in bytes
      const percentage = (used / total) * 100;
      
      return {
        used,
        total,
        percentage: Math.min(percentage, 100),
        details
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { used: 0, total: 0, percentage: 0, details: {} };
    }
  }
}

// Initialize BaseDataManager compatible storage when module loads
if (typeof window !== 'undefined') {
  // Initialize storage compatibility on app start
  document.addEventListener('DOMContentLoaded', () => {
    const storage = DataStorage.getInstance();
    storage.initializeBaseDataStorage();
    
    // Log storage compatibility status
    const compatibility = storage.checkBaseDataCompatibility();
    if (!compatibility.isCompatible) {
      console.warn('⚠️ BaseDataManager compatibility issues detected:', compatibility.missingKeys);
      compatibility.recommendations.forEach(rec => console.warn('💡 Recommendation:', rec));
    } else {
      console.log('✅ DataStorage is fully compatible with BaseDataManager');
    }
  });
}

// Export default instance for easy importing
export default DataStorage.getInstance();