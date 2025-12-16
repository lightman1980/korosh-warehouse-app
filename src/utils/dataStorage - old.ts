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
          wastageTransactions: [],
          'correction-requests': []
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(defaultData));
        console.log('📦 Storage initialized with default data');
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
  
  // Save data to localStorage
  saveData(key: string, data: any): void {
    try {
      const existingData = this.getAllData();
      existingData[key] = data;
      localStorage.setItem(this.storageKey, JSON.stringify(existingData));
      
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
      console.error('Error saving data:', error);
      // Fallback: try to save individual key if main storage fails
      try {
        localStorage.setItem(`${this.storageKey}_${key}`, JSON.stringify(data));
        console.log(`⚠️ Data saved as fallback for key: ${key}`);
      } catch (fallbackError) {
        console.error('❌ Fallback save also failed:', fallbackError);
      }
    }
  }
  
  // Load data from localStorage
  loadData<T>(key: string): T | null {
    try {
      const allData = this.getAllData();
      let data = allData[key];
      
      // Fallback: try to load from individual key if not found in main storage
      if (!data) {
        try {
          const fallbackData = localStorage.getItem(`${this.storageKey}_${key}`);
          if (fallbackData) {
            data = JSON.parse(fallbackData);
            console.log(`📂 Data loaded from fallback for key: ${key}`);
          }
        } catch (fallbackError) {
          console.warn('Fallback load failed:', fallbackError);
        }
      }
      
      console.log(`📖 Data loaded for key: ${key}`, Array.isArray(data) ? `${data?.length || 0} items` : typeof data);
      return data || null;
    } catch (error) {
      console.error('Error loading data:', error);
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
  
  // Clear specific data key
  clearData(key: string): void {
    try {
      const allData = this.getAllData();
      if (allData[key]) {
        delete allData[key];
        localStorage.setItem(this.storageKey, JSON.stringify(allData));
        console.log(`🗑️ Data cleared for key: ${key}`);
      }
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
  
  // Clear all data
  clearAllData(): void {
    try {
      localStorage.removeItem(this.storageKey);
      
      // Also clear any fallback data
      Object.keys(localStorage)
        .filter(key => key.startsWith(`${this.storageKey}_`))
        .forEach(key => {
          localStorage.removeItem(key);
        });
      
      console.log('🗑️ All data cleared');
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
  
  // Export data to file
  exportData(): void {
    try {
      const data = this.getAllData();
      
      // Create proper CSV format for Excel
      const csvRows = [];
      csvRows.push(['Key', 'Data'].join(','));
      
      Object.entries(data).forEach(([key, value]) => {
        csvRows.push([key, JSON.stringify(value)].join(','));
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
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }
  
  // Import data from file
  importData(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          localStorage.setItem(this.storageKey, JSON.stringify(data));
          console.log('📥 Data imported successfully');
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
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
  
  // Get storage usage info
  getStorageInfo(): { used: number; total: number; percentage: number } {
    try {
      let used = 0;
      
      // Calculate main storage usage
      const mainData = localStorage.getItem(this.storageKey);
      if (mainData) {
        used += mainData.length;
      }
      
      // Calculate fallback storage usage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`${this.storageKey}_`)) {
          used += localStorage.getItem(key)?.length || 0;
        }
      });
      
      // LocalStorage typically has 5MB limit
      const total = 5 * 1024 * 1024; // 5MB in bytes
      const percentage = (used / total) * 100;
      
      return {
        used,
        total,
        percentage: Math.min(percentage, 100)
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }
}