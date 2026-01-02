import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, AlertCircle, Users, Shield, Eye, EyeOff } from 'lucide-react';
import { formatPersianDate, formatPersianDateTime } from '../../utils/persian';
import { useModuleChangeLogger, logSaveAction, logDeleteAction, logCreateAction } from "../../hooks/useActivityLogger";
import { DataStorage } from '../../utils/dataStorage';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  role: 'admin' | 'user';
  permissions: UserPermission[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UserPermission {
  module: string;
  action: 'view' | 'edit';
}

interface Department {
  id: string;
  name: string;
}

const mockDepartments: Department[] = [
  { id: 'dept1', name: 'مخازن انزلی' },
  { id: 'dept2', name: 'برنامه ریزی' },
  { id: 'dept3', name: 'مالی' },
  { id: 'dept4', name: 'مدیریت' }
];

const availableModules = [
  { id: 'dashboard', name: 'داشبورد' },
  { id: 'base-data', name: 'اطلاعات پایه' },
  { id: 'contracts', name: 'قرار داد ها' },
  { id: 'warehouse-receipt', name: 'رسید انبار' },
  { id: 'warehouse-delivery', name: 'حواله انبار' },
  { id: 'reports', name: 'گزارشات' },
  { id: 'inventory-ledger', name: 'کاردکس موجودی' },
  { id: 'analytics', name: 'تحلیل و بررسی' },
  { id: 'users', name: 'مدیریت کاربران' },
  { id: 'settings', name: 'تنظیمات' }
];

const initialUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    password: '123456',
    fullName: 'مدیر سیستم',
    email: 'admin@koroshfood.com',
    departmentId: 'dept4',
    departmentName: 'مدیریت',
    role: 'admin',
    permissions: availableModules.map(m => ({ module: m.id, action: 'edit' as const })),
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date(2024, 0, 1),
    updatedAt: new Date()
  },
  {
    id: '2',
    username: 'warehouse_user',
    password: '123456',
    fullName: 'کاربر انبار',
    email: 'warehouse@koroshfood.com',
    departmentId: 'dept1',
    departmentName: 'مخازن انزلی',
    role: 'user',
    permissions: [
      { module: 'dashboard', action: 'view' },
      { module: 'warehouse-receipt', action: 'edit' },
      { module: 'warehouse-delivery', action: 'edit' },
      { module: 'reports', action: 'view' }
    ],
    isActive: true,
    lastLogin: new Date(2024, 3, 15),
    createdAt: new Date(2024, 1, 1),
    updatedAt: new Date(2024, 3, 15)
  },
  {
    id: '3',
    username: 'finance_user',
    password: '123456',
    fullName: 'کاربر مالی',
    email: 'finance@koroshfood.com',
    departmentId: 'dept3',
    departmentName: 'مالی',
    role: 'user',
    permissions: [
      { module: 'dashboard', action: 'view' },
      { module: 'contracts', action: 'view' },
      { module: 'reports', action: 'edit' },
      { module: 'analytics', action: 'view' }
    ],
    isActive: true,
    createdAt: new Date(2024, 1, 15),
    updatedAt: new Date(2024, 1, 15)
  }
];

export const UserManagementManager: React.FC = () => {
  const storage = DataStorage.getInstance();
  
  // Load users from storage on component mount
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load users from storage on component mount
    const savedUsers = storage.loadData('users');
    if (savedUsers && savedUsers.length > 0) {
      // Convert date strings back to Date objects
      const usersWithDates = savedUsers.map((user: any) => ({
        ...user,
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt)
      }));
      setUsers(usersWithDates);
    } else {
      // Save initial users if none exist
      storage.saveData('users', initialUsers);
    }
  }, [storage]);

  // Save users immediately when they change
  const saveUsers = (usersToSave: User[]) => {
    if (!usersToSave || !Array.isArray(usersToSave)) {
      console.error('❌ Invalid users array provided to saveUsers');
      return;
    }
    storage.saveData('users', usersToSave);
    console.log('✅ Users saved to storage:', usersToSave.length, 'users');
  };

  const filteredUsers = (users || []).filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.departmentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validateUser = (user: Partial<User>): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!user.username?.trim()) {
      errors.username = 'نام کاربری الزامی است';
    } else if (user.username.length < 3) {
      errors.username = 'نام کاربری باید حداقل 3 کاراکتر باشد';
    } else {
      // Check for duplicate username
      const duplicate = users.find(u => 
        u.username === user.username && u.id !== editingUser
      );
      if (duplicate) {
        errors.username = 'نام کاربری تکراری است';
      }
    }

    if (!user.password?.trim()) {
      errors.password = 'رمز عبور الزامی است';
    } else if (user.password.length < 6) {
      errors.password = 'رمز عبور باید حداقل 6 کاراکتر باشد';
    }

    if (!user.fullName?.trim()) {
      errors.fullName = 'نام کامل الزامی است';
    }

    if (!user.email?.trim()) {
      errors.email = 'ایمیل الزامی است';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.email = 'فرمت ایمیل صحیح نیست';
    } else {
      // Check for duplicate email
      const duplicate = users.find(u => 
        u.email === user.email && u.id !== editingUser
      );
      if (duplicate) {
        errors.email = 'ایمیل تکراری است';
      }
    }

    if (!user.departmentId) {
      errors.departmentId = 'انتخاب دپارتمان الزامی است';
    }

    if (!user.role) {
      errors.role = 'انتخاب نقش الزامی است';
    }

    return errors;
  };

  const handleEdit = (userId: string) => {
    setEditingUser(userId);
    const user = users.find(u => u.id === userId);
    if (user) {
      setNewUser({ ...user });
    }
    setErrors({});
  };

  const handleSave = () => {
    const validationErrors = validateUser(newUser);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const selectedDepartment = mockDepartments.find(d => d.id === newUser.departmentId);

    let updatedUsersArray: User[];
    
    if (editingUser) {
      // Update existing user
      updatedUsersArray = users.map(user => 
        user.id === editingUser
          ? {
              ...user,
              ...newUser,
              departmentName: selectedDepartment?.name || '',
              permissions: newUser.permissions || [],
              updatedAt: new Date()
            } as User
          : user
      );
    } else if (isAddingNew) {
      // Add new user
      const newId = `user_${Date.now()}`;
      const newUserData: User = {
        ...newUser,
        id: newId,
        departmentName: selectedDepartment?.name || '',
        permissions: newUser.permissions || [],
        isActive: newUser.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as User;
      
      updatedUsersArray = [...users, newUserData];
    } else {
      updatedUsersArray = users;
    }
    
      setUsers(updatedUsersArray);
      saveUsers(updatedUsersArray);
      
      if (editingUser) {
        logSaveAction('کاربران', newUser.username || '', { action: 'edit' });
      } else {
        logCreateAction('کاربران', newUser.username || '');
      }


    setEditingUser(null);
    setIsAddingNew(false);
    setNewUser({});
    setErrors({});
  };

  const handleCancel = () => {
    setEditingUser(null);
    setIsAddingNew(false);
    setNewUser({});
    setErrors({});
  };

    const handleDelete = (userId: string) => {
      const user = users.find(u => u.id === userId);
      if (user?.role === 'admin') {
        alert('نمی توان کاربر مدیر را حذف کرد');
        return;
      }
  
      if (confirm('آیا از حذف این کاربر اطمینان دارید؟')) {
        const updatedUsers = users.filter(user => user.id !== userId);
        setUsers(updatedUsers);
        saveUsers(updatedUsers);
        if (user) {
          logDeleteAction('کاربران', user.username || '');
        }
      }
    };


  const handleToggleActive = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin') {
      alert('نمی توان کاربر مدیر را غیرفعال کرد');
      return;
    }

    const updatedUsers = users.map(user =>
      user.id === userId
        ? { ...user, isActive: !user.isActive, updatedAt: new Date() }
        : user
    );
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  const handlePermissionChange = (moduleId: string, action: 'view' | 'edit', checked: boolean) => {
    const currentPermissions = newUser.permissions || [];
    
    if (checked) {
      // Add permission
      const updatedPermissions = currentPermissions.filter(p => p.module !== moduleId);
      updatedPermissions.push({ module: moduleId, action });
      setNewUser({ ...newUser, permissions: updatedPermissions });
    } else {
      // Remove permission
      const updatedPermissions = currentPermissions.filter(p => p.module !== moduleId);
      setNewUser({ ...newUser, permissions: updatedPermissions });
    }
  };

  const hasPermission = (moduleId: string, action: 'view' | 'edit'): boolean => {
    const permissions = newUser.permissions || [];
    return permissions.some(p => p.module === moduleId && p.action === action);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Add keyboard shortcuts: Enter to save, Esc to cancel
  useKeyboardShortcuts({
    onEnter: () => {
      if (isAddingNew || editingUser) {
        handleSave();
      }
    },
    onEscape: () => {
      if (isAddingNew || editingUser) {
        handleCancel();
      }
    },
    enabled: isAddingNew || editingUser !== null
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">مدیریت کاربران</h1>
            <p className="text-gray-600">مدیریت کاربران و سطوح دسترسی سیستم</p>
          </div>
          <div className="flex items-center">
            <img 
              src="/لوگو صنعت غذایی کورش copy.jpg" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">لیست کاربران</h2>
                <p className="text-gray-600 text-sm mt-1">
                  مجموع {users.length} کاربر - {users.filter(u => u.isActive).length} فعال
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddingNew(true);
                  setNewUser({
                    role: 'user',
                    isActive: true,
                    permissions: []
                  });
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                کاربر جدید
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام کاربری، نام کامل، ایمیل یا دپارتمان..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Add/Edit User Form */}
          {(isAddingNew || editingUser) && (
            <div className="p-6 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">
                  {isAddingNew ? 'افزودن کاربر جدید' : 'ویرایش کاربر'}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نام کاربری <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser.username || ''}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.username ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="نام کاربری"
                  />
                  {errors.username && (
                    <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رمز عبور <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword[editingUser || 'new'] ? 'text' : 'password'}
                      value={newUser.password || ''}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="رمز عبور"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(editingUser || 'new')}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword[editingUser || 'new'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نام کامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser.fullName || ''}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.fullName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="نام کامل"
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ایمیل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newUser.email || ''}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="ایمیل"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    دپارتمان <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUser.departmentId || ''}
                    onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.departmentId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">انتخاب کنید</option>
                    {mockDepartments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  {errors.departmentId && (
                    <p className="text-red-500 text-xs mt-1">{errors.departmentId}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نقش <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUser.role || ''}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.role ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="admin">مدیر</option>
                    <option value="user">کاربر</option>
                  </select>
                  {errors.role && (
                    <p className="text-red-500 text-xs mt-1">{errors.role}</p>
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-4">سطوح دسترسی</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableModules.map(module => (
                    <div key={module.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="font-medium text-gray-900 mb-2">{module.name}</div>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={hasPermission(module.id, 'view')}
                            onChange={(e) => handlePermissionChange(module.id, 'view', e.target.checked)}
                            className="ml-2"
                          />
                          مشاهده
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={hasPermission(module.id, 'edit')}
                            onChange={(e) => handlePermissionChange(module.id, 'edit', e.target.checked)}
                            className="ml-2"
                          />
                          ثبت و ویرایش
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Status */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newUser.isActive ?? true}
                    onChange={(e) => setNewUser({ ...newUser, isActive: e.target.checked })}
                    className="ml-2"
                  />
                  کاربر فعال
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  ذخیره کاربر
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
          )}

          {/* Users Table */}
          <div className="overflow-x-auto max-w-full w-full">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '200px', maxWidth: '250px' }}>
                        کاربر
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '120px', maxWidth: '150px' }}>
                        دپارتمان
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '80px', maxWidth: '100px' }}>
                        نقش
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '150px', maxWidth: '180px' }}>
                        آخرین ورود
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '80px', maxWidth: '100px' }}>
                        وضعیت
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '150px', maxWidth: '200px' }}>
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user, index) => (
                      <tr key={user.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                                <Users className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div className="mr-4 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate" style={{ maxWidth: '180px' }}>{user.fullName}</div>
                              <div className="text-sm text-gray-500 truncate" style={{ maxWidth: '180px' }}>{user.username}</div>
                              <div className="text-xs text-gray-400 truncate" style={{ maxWidth: '180px' }}>{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 truncate block" style={{ maxWidth: '120px' }}>{user.departmentName}</span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? 'مدیر' : 'کاربر'}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 truncate" style={{ maxWidth: '150px' }}>
                            {user.lastLogin ? formatPersianDateTime(user.lastLogin) : 'هرگز'}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(user.id)}
                            disabled={user.role === 'admin'}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            } ${user.role === 'admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                          >
                            {user.isActive ? 'فعال' : 'غیرفعال'}
                          </button>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleEdit(user.id)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors flex-shrink-0"
                              title="ویرایش"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                                title="حذف"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            <div className="text-gray-400 flex items-center gap-1 flex-shrink-0" title="سطوح دسترسی">
                              <Shield className="h-4 w-4" />
                              <span className="text-xs">{user.permissions.length}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Users className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">کاربری یافت نشد</h3>
              <p className="text-gray-600">
                {searchTerm ? 'نتیجه ای برای جستجوی شما یافت نشد.' : 'هنوز کاربری تعریف نشده است.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};