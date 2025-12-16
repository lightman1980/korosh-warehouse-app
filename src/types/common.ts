export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'admin' | 'user' | 'manager';
  department: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface Theme {
  id: string;
  name: string;
  isDark: boolean;
  primaryColor: string;
  secondaryColor: string;
}

export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline';
  lastChecked: Date;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: string | number | boolean;
  description: string;
  category: string;
}