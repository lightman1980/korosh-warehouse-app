import { useState, useEffect } from 'react';
import { authService } from '../utils/AuthService';
import { UserProfile } from '../utils/AuthService';
import { DataStorage } from '../utils/dataStorage';

export interface EffectivePermissions {
  [moduleId: string]: {
    create: boolean;
    edit: boolean;
    view: boolean;
    delete: boolean;
  };
}

/**
 * Hook for checking user permissions
 */
export const usePermissions = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermissions>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = () => {
      try {
        const user = authService.getCurrentUser();
        setCurrentUser(user);
        
        if (user) {
          const permissions = calculateEffectivePermissions(user);
          setEffectivePermissions(permissions);
          console.log('Permissions loaded for user:', user.username, permissions);
        } else {
          setEffectivePermissions({});
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
        setEffectivePermissions({});
      } finally {
        setIsLoading(false);
      }
    };

    // Load immediately
    loadPermissions();
    
    // Listen for storage changes (when permissions are updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appSettings' || e.key === 'users') {
        console.log('Storage changed, reloading permissions...');
        loadPermissions();
      }
    };

    // Listen for custom events (when permissions are updated programmatically)
    const handlePermissionUpdate = () => {
      console.log('Permission update event received, reloading permissions...');
      loadPermissions();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('permissionsUpdated', handlePermissionUpdate);
    
    // Also check periodically (every 2 seconds) for changes
    const interval = setInterval(loadPermissions, 2000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('permissionsUpdated', handlePermissionUpdate);
    };
  }, []);

  /**
   * Check if user can perform action on module
   */
  const can = (moduleId: string, action: 'create' | 'edit' | 'view' | 'delete'): boolean => {
    if (!currentUser) return false;
    
    // Admin has all permissions
    if (currentUser.permissions.includes('*') || currentUser.role === 'admin') {
      return true;
    }

    const modulePerms = effectivePermissions[moduleId];
    if (!modulePerms) return false;

    return modulePerms[action] || false;
  };

  /**
   * Check if user can view module
   */
  const canView = (moduleId: string): boolean => can(moduleId, 'view');

  /**
   * Check if user can create in module
   */
  const canCreate = (moduleId: string): boolean => can(moduleId, 'create');

  /**
   * Check if user can edit in module
   */
  const canEdit = (moduleId: string): boolean => can(moduleId, 'edit');

  /**
   * Check if user can delete in module
   */
  const canDelete = (moduleId: string): boolean => can(moduleId, 'delete');

  return {
    currentUser,
    effectivePermissions,
    isLoading,
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasPermission: (permission: string) => {
      if (!currentUser) return false;
      return currentUser.permissions.includes('*') || 
             currentUser.permissions.includes(permission) ||
             currentUser.role === 'admin';
    }
  };
};

/**
 * Calculate effective permissions from user groups and overrides
 * دسترسی فردی بر دسترسی گروهی ارجحیت دارد
 */
function calculateEffectivePermissions(user: UserProfile): EffectivePermissions {
  const storage = DataStorage.getInstance();
  const settings = storage.loadData('appSettings') || {};
  const userManagement = settings.userManagement || {};
  const userAccess = (userManagement.userAccess || []).find((ua: any) => ua.userId === user.id);
  const groups = userManagement.userGroups || [];
  const permissionCatalog = userManagement.permissionCatalog || [];

  const effective: EffectivePermissions = {};

  // Step 1: Initialize all modules with default permissions (deny all)
  permissionCatalog.forEach((module: any) => {
    effective[module.id] = {
      create: false,
      edit: false,
      view: false,
      delete: false
    };
  });

  // Step 2: Apply role-based default permissions (if any)
  // This is a fallback - typically permissions come from groups or individual overrides
  // But we can add role-based defaults here if needed

  // Step 3: Apply group permissions (OR logic - if any group has permission, grant it)
  const groupPermissions: EffectivePermissions = {};

  if (userAccess && userAccess.groups && Array.isArray(userAccess.groups)) {
    userAccess.groups.forEach((groupId: string) => {
      const group = groups.find((g: any) => g.id === groupId);
      if (group && group.isActive && group.permissions && Array.isArray(group.permissions)) {
        group.permissions.forEach((perm: any) => {
          if (!groupPermissions[perm.moduleId]) {
            groupPermissions[perm.moduleId] = {
              create: false,
              edit: false,
              view: false,
              delete: false
            };
          }
          // Merge: if any group has permission, grant it (OR logic)
          groupPermissions[perm.moduleId] = {
            create: groupPermissions[perm.moduleId].create || perm.create,
            edit: groupPermissions[perm.moduleId].edit || perm.edit,
            view: groupPermissions[perm.moduleId].view || perm.view,
            delete: groupPermissions[perm.moduleId].delete || perm.delete
          };
        });
      }
    });
  }

  // Step 4: Apply group permissions to effective
  Object.keys(groupPermissions).forEach(moduleId => {
    if (effective[moduleId]) {
      effective[moduleId] = { ...groupPermissions[moduleId] };
    }
  });

  // Step 5: Apply individual overrides (highest priority - completely replaces group permissions)
  if (userAccess && userAccess.overrides && Array.isArray(userAccess.overrides)) {
    userAccess.overrides.forEach((override: any) => {
      const hasAnyOverride = override.actions && (
        override.actions.create !== undefined || 
        override.actions.edit !== undefined || 
        override.actions.view !== undefined || 
        override.actions.delete !== undefined
      );
      
      if (hasAnyOverride && effective[override.moduleId]) {
        // Individual override completely replaces group permissions for this module
        effective[override.moduleId] = {
          create: override.actions.create ?? false,
          edit: override.actions.edit ?? false,
          view: override.actions.view ?? false,
          delete: override.actions.delete ?? false
        };
      }
    });
  }

  return effective;
}

