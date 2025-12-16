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
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
    
    // Listen for user changes
    const interval = setInterval(loadPermissions, 5000);
    return () => clearInterval(interval);
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
 */
function calculateEffectivePermissions(user: UserProfile): EffectivePermissions {
  const storage = DataStorage.getInstance();
  const settings = storage.loadData('appSettings') || {};
  const userManagement = settings.userManagement || {};
  const userAccess = (userManagement.userAccess || []).find((ua: any) => ua.userId === user.id);
  const groups = userManagement.userGroups || [];

  const effective: EffectivePermissions = {};

  // Get permissions from groups
  if (userAccess && userAccess.groups) {
    userAccess.groups.forEach((groupId: string) => {
      const group = groups.find((g: any) => g.id === groupId);
      if (group && group.permissions) {
        group.permissions.forEach((perm: any) => {
          if (!effective[perm.moduleId]) {
            effective[perm.moduleId] = {
              create: false,
              edit: false,
              view: false,
              delete: false
            };
          }
          // Merge: if any group has permission, grant it
          effective[perm.moduleId] = {
            create: effective[perm.moduleId].create || perm.create,
            edit: effective[perm.moduleId].edit || perm.edit,
            view: effective[perm.moduleId].view || perm.view,
            delete: effective[perm.moduleId].delete || perm.delete
          };
        });
      }
    });
  }

  // Apply individual overrides (priority)
  if (userAccess && userAccess.overrides) {
    userAccess.overrides.forEach((override: any) => {
      const hasOverride = override.actions.create || override.actions.edit || 
                         override.actions.view || override.actions.delete;
      
      if (hasOverride) {
        effective[override.moduleId] = { ...override.actions };
      }
    });
  }

  return effective;
}

