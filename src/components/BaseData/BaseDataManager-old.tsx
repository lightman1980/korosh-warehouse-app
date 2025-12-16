import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, CreditCard as Edit2, Trash2, Save, X, CircleAlert as AlertCircle } from "lucide-react";
import { DataStorage } from "../../utils/dataStorage";
import { formatPersianDate, safeParseDate } from "../../utils/persian";

interface BaseDataItem {
  id: string;
  code?: string;
  name: string;
  type?: string;
  isActive: boolean;
  canDelete: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  address?: string;
  phone?: string;
  postalCode?: string;
  additionalInfo?: string;
  nationalId?: string;
  plateNumber?: string;
  homeAddress?: string;
  capacity?: string; // فیلد جدید برای مخازن
}

interface BaseDataCategory {
  id: string;
  name: string;
  items: BaseDataItem[];
  hasCode: boolean;
  description: string;
}

// داده‌های اولیه — شامل 10 مخزن با ظرفیت 5,000,000 کیلوگرم
const initialCategories: BaseDataCategory[] = [
  {
    id: "owned-products",
    name: "نام کالای تملیکی",
    hasCode: true,
    description: "لیست کالاهای تملیکی شرکت",
    items: [
      { id: "1", code: "1", name: "روغن آفتابگردان-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "2", code: "2", name: "روغن های اولئیک-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "3", code: "3", name: "روغن کلزا-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "4", code: "4", name: "روغن سویا-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "5", code: "5", name: "روغن پالم اولئین-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "6", code: "6", name: "روغن زیتون-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "7", code: "7", name: "روغن زیتون بکر-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "8", code: "8", name: "روغن زیتون فرابکر-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "9", code: "9", name: "روغن ذرت-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "10", code: "10", name: "روغن کنجد-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "11", code: "11", name: "دانه-تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "consignment-products",
    name: "نام کالاي اماني",
    hasCode: true,
    description: "ليست کالاهاي اماني",
    items: [
      { id: "1-1", code: "1-1", name: "روغن آفتابگردان-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "2-2", code: "2-2", name: "روغن هاي اولئيک-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "3-3", code: "3-3", name: "روغن کلزا-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "4-4", code: "4-4", name: "روغن سويا-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "5-5", code: "5-5", name: "روغن پالم اولئين-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "6-6", code: "6-6", name: "روغن زيتون-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "7-7", code: "7-7", name: "روغن زيتون بکر-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "8-8", code: "8-8", name: "روغن زيتون فرابکر-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "9-9", code: "9-9", name: "روغن ذرت-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "10-10", code: "10-10", name: "روغن کنجد-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "11-11", code: "11-11", name: "دانه-اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "sites",
    name: "نام سايت مخازن",
    hasCode: false,
    description: "ليست سايت هاي مخازن",
    items: [
      { id: "site1", name: "سايت مخازن انزلي", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "site2", name: "سايت مخازن جنوب", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "internal-sites",
    name: "سايت هاي داخلي",
    hasCode: false,
    description: "ليست سايت هاي داخلي شرکت",
    items: [
      { id: "internal-site1", name: "کارخانه تاکستان", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "internal-site2", name: "کارخانه اشتهارد", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "contractor-sites",
    name: "سايت هاي پيمانکاري",
    hasCode: false,
    description: "ليست سايت هاي پيمانکاري",
    items: [
      { id: "contractor-site1", name: "سايت پيمانکاري مارگارين", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "contractor-site2", name: "سايت پيکانکاري نوش آذر", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "contractor-site3", name: "سايت پيمانکاري سبوس مازند", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "tanks",
    name: "نام مخزن",
    hasCode: false,
    description: "ليست مخازن",
    items: [
      { id: "tankA", name: "مخزن A", capacity: "5,000,000 کیلوگرم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "tankB", name: "مخزن B", capacity: "5,000,000 کیلوگرم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "tankC", name: "مخزن C", capacity: "5,000,000 کیلوگرم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "tankD", name: "مخزن D", capacity: "5,000,000 کیلوگرم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "tankE", name: "مخزن E", capacity: "5,000,000 کیلوگرم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "tankF", name: "مخزن F", capacity: "5,000,000 کیلوگرم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "tankG", name: "مخزن G", capacity: "5,000,000 کیلوگرم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "tankH", name: "مخزن H", capacity: "5,000,000 کیلوگرم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "tankI", name: "مخزن I", capacity: "5,000,000 کیلوگرم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "tankJ", name: "مخزن J", capacity: "5,000,000 کیلوگرم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "companies",
    name: "شرکت طرف حساب",
    hasCode: false,
    description: "ليست شرکت هاي طرف حساب",
    items: [
      { id: "comp1", name: "شرکت محور طلايي", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "comp2", name: "شرکت مادر تخصصي", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "comp3", name: "شرکت طبيعت", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "comp4", name: "شرکت بهشهر", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "comp5", name: "شرکت تيوان جم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "companies-location",
    name: "لوکيشن طرف حساب",
    hasCode: false,
    description: "ليست لوکيشن هاي طرف حساب",
    items: [
      { id: "comp1", name: "طرف حساب شمال", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "comp2", name: "طرف حساب جنوب", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "comp3", name: "طرف حساب غرب", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "comp5", name: "طرف حساب شرق", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "customer-companies",
    name: "مشتري طرف حساب",
    hasCode: false,
    description: "ليست مشتريان طرف حساب",
    items: [
      { id: "cust1", name: "شرکت مشتري محور طلايي", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cust2", name: "شرکت مشتري مادر تخصصي", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cust3", name: "شرکت مشتري طبيعت", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cust4", name: "شرکت مشتري بهشهر", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cust5", name: "شرکت مشتري تيوان جم", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "customer-companies-location",
    name: "لوکيشن مشتري طرف حساب",
    hasCode: false,
    description: "ليست لوکيشن مشتريان طرف حساب",
    items: [
      { id: "cust1", name: "مشتري طرف حساب شمال", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cust2", name: "مشتري طرف حساب جنوب", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cust3", name: "مشتري طرف حساب غرب", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cust5", name: "مشتري طرف حساب شرق", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "user-types",
    name: "نوع کاربري",
    hasCode: false,
    description: "انواع کاربري سيستم",
    items: [
      { id: "owned", name: "تملیکی", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "consignment", name: "اماني", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "cotage-numbers",
    name: "شماره کوتاژ",
    hasCode: false,
    description: "ليست شماره هاي کوتاژ (8 رقم)",
    items: [
      { id: "cot1", name: "12345678", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cot2", name: "11122233", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cot3", name: "33344455", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cot4", name: "66677788", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "cot5", name: "99988877", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "index-numbers",
    name: "شماره شاخص/ثبت سفارش",
    hasCode: false,
    description: "ليست شماره هاي شاخص (8 رقم)",
    items: [
      { id: "idx1", name: "11111111", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "idx2", name: "22222222", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "idx3", name: "33333333", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "idx4", name: "44444444", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "idx5", name: "55555555", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "ship-names",
    name: "نام کشتي",
    hasCode: false,
    description: "ليست نام کشتي ها",
    items: [
      { id: "ship1", name: "سانجو", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "ship2", name: "هالتي", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "ship3", name: "پاتيتو", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "rental-types",
    name: "نوع اجاره",
    hasCode: false,
    description: "انواع اجاره",
    items: [
      { id: "Alquiler-de-tanque-parcial", name: "اجاره مقداری مخزن", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "Alquiler-de-tanque-completo", name: "اجاره کامل مخزن", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "wastage-rates",
    name: "مقدار افت",
    hasCode: false,
    description: "درصدهاي افت",
    items: [
      { id: "waste1", name: "0.5%", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "waste2", name: "1%", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "receipt-basis",
    name: "مبناي رسيد",
    hasCode: false,
    description: "مبناي محاسبه رسيد",
    items: [
      { id: "bill-lading", name: "وزن بارنامه (Bill of lading weight)", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "ullage", name: "وزن آلج کشتي (Ullage weight)", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "shore-tank", name: "وزن شور تانک (Shore tank)", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "gross", name: "وزن ناخالص (Weight Gross)", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "departments",
    name: "دپارتمان",
    hasCode: false,
    description: "دپارتمان هاي سازماني",
    items: [
      { id: "dept1", name: "مخازن انزلي", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "dept2", name: "برنامه ريزي", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
      { id: "dept3", name: "مالي", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "locations",
    name: "لوکيشن ها",
    hasCode: false,
    description: "ليست لوکيشن ها",
    items: [
      { id: "loc1", name: "دفتر مرکزي شرکت محور طلايي", address: "تهران، خيابان وليعصر", phone: "021-12345678", postalCode: "1234567890", additionalInfo: "دفتر اصلي", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "loc2", name: "انبار شرکت مادر تخصصي", address: "اصفهان، شهرک صنعتي", phone: "031-87654321", postalCode: "0987654321", additionalInfo: "انبار اصلي", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "loc3", name: "کارخانه شرکت طبيعت", address: "شيراز، منطقه ويژه", phone: "071-11223344", postalCode: "1122334455", additionalInfo: "کارخانه توليد", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "loc4", name: "دفتر مشتري محور طلايي", address: "تهران، خيابان کريمخان", phone: "021-87654321", postalCode: "9876543210", additionalInfo: "دفتر مشتري", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "loc5", name: "انبار مشتري مادر تخصصي", address: "اصفهان، خيابان چهارباغ", phone: "031-12345678", postalCode: "5432109876", additionalInfo: "انبار مشتري", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "drivers",
    name: "راننده گان",
    hasCode: false,
    description: "ليست راننده گان",
    items: [
      { id: "drv1", name: "احمد محمدي", nationalId: "1234567890", plateNumber: "12ج345-98", homeAddress: "تهران، خيابان آزادي", additionalInfo: "راننده با تجربه", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "drv2", name: "علي رضايي", nationalId: "0987654321", plateNumber: "34د567-12", homeAddress: "اصفهان، خيابان چهارباغ", additionalInfo: "راننده حرفه‌اي", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "drv3", name: "حسن احمدي", nationalId: "1122334455", plateNumber: "56ه789-34", homeAddress: "شيراز، خيابان زند", additionalInfo: "راننده مجرب", isActive: true, canDelete: true, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
  {
    id: "internal-company",
    name: "نام شرکت داخلي",
    hasCode: false,
    description: "شرکت داخلي",
    items: [
      { id: "internal1", name: "شرکت صنعت غذايي کورش", isActive: true, canDelete: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  },
];

// --- تابع اصلی کامپوننت ---
const BaseDataManager = () => {
  const storage = DataStorage.getInstance();
  const [categories, setCategories] = useState<BaseDataCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<BaseDataItem>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // بارگذاری اولیه داده‌ها
  useEffect(() => {
    try {
      const saved = storage.loadData("baseDataCategories");
      const savedSelected = storage.loadData("baseDataSelectedCategory");
      if (saved && Array.isArray(saved)) {
        const processed = saved.map((cat) => ({
          ...cat,
          items: cat.items.map((item) => ({
            ...item,
            createdAt: safeParseDate(item.createdAt) || new Date(),
            updatedAt: safeParseDate(item.updatedAt) || new Date(),
          })),
        }));
        setCategories(processed);
        setSelectedCategory(savedSelected || processed[0]?.id || "tanks");
      } else {
        setCategories(initialCategories);
        setSelectedCategory(initialCategories[0]?.id || "tanks");
        storage.saveData("baseDataCategories", initialCategories);
      }
    } catch (err) {
      console.error("Error loading base data:", err);
      setCategories(initialCategories);
      setSelectedCategory(initialCategories[0]?.id || "tanks");
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  // ذخیره خودکار دسته‌بندی‌ها
  useEffect(() => {
    if (!isDataLoaded) return;
    storage.saveData("baseDataCategories", categories);
    categories.forEach((cat) => storage.saveData(`category_${cat.id}`, cat));
  }, [categories, isDataLoaded]);

  // ذخیره دسته‌بندی انتخاب شده
  useEffect(() => {
    if (!isDataLoaded) return;
    storage.saveData("baseDataSelectedCategory", selectedCategory);
  }, [selectedCategory, isDataLoaded]);

  const currentCategory = categories.find((c) => c.id === selectedCategory);
  const filteredItems = useMemo(() => {
    return (
      currentCategory?.items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.code && item.code.includes(searchTerm))
      ) || []
    );
  }, [currentCategory, searchTerm]);

  // تشخیص دسته‌بندی‌های خاص
  const isTanksCategory = selectedCategory === "tanks";
  const isLocationCategory = ["locations", "companies-location", "customer-companies-location"].includes(selectedCategory);
  const isDriverCategory = selectedCategory === "drivers";

  const handleEdit = (itemId: string) => {
    const item = currentCategory?.items.find((i) => i.id === itemId);
    if (item) {
      setEditingItem(itemId);
      setNewItem({ ...item });
    }
  };

  const handleSave = () => {
    if (!currentCategory || !newItem.name?.trim()) return;
    const newId = `custom_${Date.now()}`;
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== selectedCategory) return cat;
        const updatedItems = [...cat.items];
        if (editingItem) {
          const index = updatedItems.findIndex((i) => i.id === editingItem);
          if (index !== -1) {
            updatedItems[index] = {
              ...updatedItems[index],
              ...newItem,
              updatedAt: new Date(),
            };
          }
        } else if (isAddingNew) {
          updatedItems.push({
            id: newId,
            name: newItem.name!,
            code: newItem.code,
            isActive: true,
            canDelete: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            address: newItem.address,
            phone: newItem.phone,
            postalCode: newItem.postalCode,
            additionalInfo: newItem.additionalInfo,
            nationalId: newItem.nationalId,
            plateNumber: newItem.plateNumber,
            homeAddress: newItem.homeAddress,
            capacity: newItem.capacity,
          });
        }
        return { ...cat, items: updatedItems };
      })
    );
    setEditingItem(null);
    setIsAddingNew(false);
    setNewItem({});
    
    // ارسال رویداد به‌روزرسانی داده‌های پایه
    window.dispatchEvent(new CustomEvent("baseDataUpdated", {
      detail: { categoryId: selectedCategory, action: editingItem ? "edit" : "add", itemId: editingItem || newId }
    }));
  };

  const handleCancel = () => {
    setEditingItem(null);
    setIsAddingNew(false);
    setNewItem({});
  };

  const handleDelete = (itemId: string) => {
    if (!currentCategory) return;
    const receipts = storage.loadData("receipts") || [];
    const deliveries = storage.loadData("deliveries") || [];
    const isUsed = [...receipts, ...deliveries].some((r: any) =>
      r.companyId === itemId ||
      r.productId === itemId ||
      r.siteId === itemId ||
      r.tankId === itemId ||
      r.locationId === itemId ||
      r.driverId === itemId
    );
    if (isUsed) {
      alert("اين آيتم در سيستم استفاده شده و قابل حذف نيست.");
      return;
    }
    if (confirm("آيا از حذف اين آيتم اطمينان داريد؟")) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === selectedCategory
            ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) }
            : cat
        )
      );
      
      // ارسال رویداد به‌روزرسانی داده‌های پایه
      window.dispatchEvent(new CustomEvent("baseDataUpdated", {
        detail: { categoryId: selectedCategory, action: "delete", itemId }
      }));
    }
  };

  const handleToggleActive = (itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === selectedCategory
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId
                  ? { ...item, isActive: !item.isActive, updatedAt: new Date() }
                  : item
              ),
            }
          : cat
      )
    );
    
    // ارسال رویداد به‌روزرسانی داده‌های پایه
    window.dispatchEvent(new CustomEvent("baseDataUpdated", {
      detail: { categoryId: selectedCategory, action: "toggle", itemId }
    }));
  };

  const validateInput = (value: string, field: "code" | "name"): boolean => {
    if (field === "code") {
      if (selectedCategory === "cotage-numbers" || selectedCategory === "index-numbers") {
        return /^\d{8}$/.test(value);
      }
    }
    return value.trim().length > 0;
  };

  if (!isDataLoaded) {
    return <div className="p-6 text-center">در حال بارگذاری اطلاعات پایه...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">مديريت اطلاعات پايه</h1>
            <p className="text-gray-600">مديريت و ويرايش اطلاعات پايه سيستم</p>
          </div>
          <div className="flex items-center">
            <img
              src="/لوگو صنعت غذایی کورش.jpg"
              alt="لوگو شرکت"
              className="h-16 w-auto"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">دسته بندي ها</h3>
              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSearchTerm("");
                      setEditingItem(null);
                      setIsAddingNew(false);
                      setNewItem({});
                    }}
                    className={`w-full text-right p-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{category.items.length} آيتم</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{currentCategory?.name}</h2>
                    <p className="text-gray-600 text-sm mt-1">{currentCategory?.description}</p>
                  </div>
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    افزودن جديد
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="جستجو..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {/* فرم افزودن/ویرایش */}
              {(isAddingNew || editingItem) && (
                <div className="p-6 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">
                      {isAddingNew ? "افزودن آيتم جديد" : "ويرايش آيتم"}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentCategory?.hasCode && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          کد
                          {(selectedCategory === "cotage-numbers" || selectedCategory === "index-numbers") && (
                            <span className="text-red-500"> (8 رقم)</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={newItem.code || ""}
                          onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          maxLength={selectedCategory === "cotage-numbers" || selectedCategory === "index-numbers" ? 8 : undefined}
                        />
                      </div>
                    )}
                    <div className={currentCategory?.hasCode ? "" : "md:col-span-2"}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        نام <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newItem.name || ""}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {isTanksCategory && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ظرفیت مخزن</label>
                        <input
                          type="text"
                          value={newItem.capacity || "5,000,000 کیلوگرم"}
                          onChange={(e) => setNewItem({ ...newItem, capacity: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                    {isLocationCategory && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">آدرس</label>
                          <textarea
                            value={newItem.address || ""}
                            onChange={(e) => setNewItem({ ...newItem, address: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            maxLength={500}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">شماره تماس</label>
                          <input
                            type="text"
                            value={newItem.phone || ""}
                            onChange={(e) => setNewItem({ ...newItem, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">شماره کد پستي</label>
                          <input
                            type="text"
                            value={newItem.postalCode || ""}
                            onChange={(e) => setNewItem({ ...newItem, postalCode: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">ساير اطلاعات لوکيشن</label>
                          <textarea
                            value={newItem.additionalInfo || ""}
                            onChange={(e) => setNewItem({ ...newItem, additionalInfo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            maxLength={500}
                          />
                        </div>
                      </>
                    )}
                    {isDriverCategory && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">کد ملي راننده</label>
                          <input
                            type="text"
                            value={newItem.nationalId || ""}
                            onChange={(e) => setNewItem({ ...newItem, nationalId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            maxLength={10}
                            placeholder="10 رقم"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">شماره پلاک</label>
                          <input
                            type="text"
                            value={newItem.plateNumber || ""}
                            onChange={(e) => setNewItem({ ...newItem, plateNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            maxLength={10}
                            placeholder="شماره پلاک"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">آدرس منزل</label>
                          <textarea
                            value={newItem.homeAddress || ""}
                            onChange={(e) => setNewItem({ ...newItem, homeAddress: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            maxLength={500}
                            placeholder="آدرس کامل منزل"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">ساير اطلاعات رانندگان</label>
                          <textarea
                            value={newItem.additionalInfo || ""}
                            onChange={(e) => setNewItem({ ...newItem, additionalInfo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            maxLength={500}
                            placeholder="ساير اطلاعات"
                          />
                        </div>
                      </>
                    )}
                    <div className="flex items-end gap-2 md:col-span-3">
                      <button
                        onClick={handleSave}
                        disabled={!newItem.name?.trim()}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        ذخيره
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        انصراف
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* جدول */}
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {currentCategory?.hasCode && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کد</th>
                      )}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                      {isTanksCategory && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ظرفیت مخزن</th>
                      )}
                      {isLocationCategory && (
                        <>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">آدرس</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تلفن</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کد پستي</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ساير اطلاعات</th>
                        </>
                      )}
                      {isDriverCategory && (
                        <>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کد ملي</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره پلاک</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">آدرس منزل</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ساير اطلاعات</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعيت</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ ايجاد</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">آخرين بروزرساني</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عمليات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-50"}>
                        {currentCategory?.hasCode && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingItem === item.id ? (
                              <input
                                type="text"
                                value={newItem.code || ""}
                                onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                maxLength={selectedCategory === "cotage-numbers" || selectedCategory === "index-numbers" ? 8 : undefined}
                              />
                            ) : (
                              <span className="text-sm font-mono text-gray-900">{item.code}</span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingItem === item.id ? (
                            <input
                              type="text"
                              value={newItem.name || ""}
                              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{item.name}</span>
                          )}
                        </td>
                        {isTanksCategory && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingItem === item.id ? (
                              <input
                                type="text"
                                value={newItem.capacity || "5,000,000 کیلوگرم"}
                                onChange={(e) => setNewItem({ ...newItem, capacity: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            ) : (
                              <span className="text-sm text-gray-900">{item.capacity || "5,000,000 کیلوگرم"}</span>
                            )}
                          </td>
                        )}
                        {isLocationCategory && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">{item.address || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.phone || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.postalCode || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.additionalInfo || "-"}</td>
                          </>
                        )}
                        {isDriverCategory && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">{item.nationalId || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.plateNumber || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.homeAddress || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.additionalInfo || "-"}</td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(item.id)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.isActive ? "فعال" : "غيرفعال"}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPersianDate(item.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPersianDate(item.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {editingItem === item.id ? (
                            <div className="flex items-center gap-2">
                              <button onClick={handleSave} className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors">
                                <Save className="h-3 w-3" />
                              </button>
                              <button onClick={handleCancel} className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleEdit(item.id)} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseDataManager;