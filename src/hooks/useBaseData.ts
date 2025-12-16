import { useState, useEffect } from 'react';
import { DataStorage } from '../utils/dataStorage';
import { initialCategories, BaseDataCategory } from '../data/baseData';

/**
 * Hook برای بارگذاری و مدیریت اطلاعات پایه
 * این hook تضمین می‌کند که اطلاعات پایه همیشه در دسترس است
 * حتی بعد از پاک کردن کش مرورگر
 */
export const useBaseData = () => {
  const [baseData, setBaseData] = useState<BaseDataCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storage = DataStorage.getInstance();

  useEffect(() => {
    loadBaseData();
  }, []);

  const loadBaseData = () => {
    try {
      setIsLoading(true);
      setError(null);

      // تلاش برای بارگذاری از localStorage
      const savedData = storage.loadData('baseDataCategories');

      if (savedData && Array.isArray(savedData) && savedData.length > 0) {
        // اگر داده موجود است، از آن استفاده کن
        setBaseData(savedData);
      } else {
        // اگر داده موجود نیست، از داده‌های اولیه استفاده کن
        setBaseData(initialCategories);
        storage.saveData('baseDataCategories', initialCategories);

        // ذخیره هر دسته‌بندی به صورت جداگانه برای دسترسی سریع‌تر
        initialCategories.forEach(category => {
          storage.saveData(`category_${category.id}`, category);
        });
      }
    } catch (err) {
      console.error('Error loading base data:', err);
      setError('خطا در بارگذاری اطلاعات پایه');

      // در صورت خطا، از داده‌های اولیه استفاده کن
      setBaseData(initialCategories);

      try {
        storage.saveData('baseDataCategories', initialCategories);
      } catch (saveErr) {
        console.error('Error saving initial data:', saveErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * بازنشانی اطلاعات پایه به حالت اولیه
   */
  const resetBaseData = () => {
    try {
      storage.saveData('baseDataCategories', initialCategories);
      initialCategories.forEach(category => {
        storage.saveData(`category_${category.id}`, category);
      });
      setBaseData(initialCategories);
      return true;
    } catch (err) {
      console.error('Error resetting base data:', err);
      setError('خطا در بازنشانی اطلاعات');
      return false;
    }
  };

  /**
   * دریافت یک دسته‌بندی خاص
   */
  const getCategory = (categoryId: string): BaseDataCategory | undefined => {
    return baseData.find(cat => cat.id === categoryId);
  };

  /**
   * دریافت آیتم‌های یک دسته‌بندی
   */
  const getCategoryItems = (categoryId: string) => {
    const category = getCategory(categoryId);
    return category?.items || [];
  };

  /**
   * دریافت آیتم‌های فعال یک دسته‌بندی
   */
  const getActiveCategoryItems = (categoryId: string) => {
    const items = getCategoryItems(categoryId);
    return items.filter(item => item.isActive);
  };

  return {
    baseData,
    isLoading,
    error,
    loadBaseData,
    resetBaseData,
    getCategory,
    getCategoryItems,
    getActiveCategoryItems,
  };
};