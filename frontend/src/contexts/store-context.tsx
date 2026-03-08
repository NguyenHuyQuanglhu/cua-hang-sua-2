'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, CreateStoreRequest, UpdateStoreRequest } from '@/lib/api-client';
import { safeStorage } from '@/lib/error-handling';

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  businessType?: string;
  logo?: string;
  settings?: Record<string, unknown>;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

// Store info from auth response (includes role override)
export interface UserStoreAccess {
  storeId: string;
  storeName: string;
  storeCode: string;
  roleOverride?: string;
}

export interface StoreUser {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  permissions: Record<string, string[]>;
  stores: Store[];
  accessibleStoreIds?: string[]; // Store IDs user has access to
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

interface StoreContextType {
  currentStore: Store | null;
  stores: Store[];
  user: StoreUser | null;
  tenant: TenantInfo | null;
  isLoading: boolean;
  error: string | null;
  switchStore: (storeId: string) => Promise<boolean>;
  canAccessStore: (storeId: string) => boolean;
  refreshStores: () => Promise<void>;
  logout: () => Promise<void>;
  createStore: (data: CreateStoreRequest) => Promise<Store>;
  updateStore: (id: string, data: UpdateStoreRequest) => Promise<Store>;
  deactivateStore: (id: string) => Promise<void>;
  deleteStorePermanently: (id: string) => Promise<void>;
}

const STORE_STORAGE_KEY = 'smartinventory_current_store_id';

const StoreContext = createContext<StoreContextType | null>(null);

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

export function useCurrentStore(): Store | null {
  const { currentStore } = useStore();
  return currentStore;
}

export function useStoreId(): string | null {
  const { currentStore } = useStore();
  return currentStore?.id ?? null;
}

export function useTenant(): TenantInfo | null {
  const { tenant } = useStore();
  return tenant;
}

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [user, setUser] = useState<StoreUser | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessibleStoreIds, setAccessibleStoreIds] = useState<Set<string>>(new Set());

  // Load saved store ID from localStorage with error handling
  const getSavedStoreId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return safeStorage.getItem(STORE_STORAGE_KEY);
  }, []);

  // Save store ID to localStorage and API client with error handling
  const saveStoreId = useCallback((storeId: string | null) => {
    if (typeof window === 'undefined') return;
    if (storeId) {
      safeStorage.setItem(STORE_STORAGE_KEY, storeId);
      apiClient.setStoreId(storeId);
    } else {
      safeStorage.removeItem(STORE_STORAGE_KEY);
      apiClient.setStoreId(null);
    }
  }, []);

  // Check if user can access a specific store
  const canAccessStore = useCallback((storeId: string): boolean => {
    // Owner and company_manager have access to all stores
    if (user?.role === 'owner' || user?.role === 'company_manager' || user?.role === 'admin') {
      return true;
    }
    // Other roles need explicit access
    return accessibleStoreIds.has(storeId);
  }, [user?.role, accessibleStoreIds]);

  // Fetch user data and stores from API
  const fetchUserAndStores = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = apiClient.getToken();
      console.log('[StoreContext] Checking token:', token ? 'exists' : 'null');
      
      if (!token) {
        console.log('[StoreContext] No token found, clearing state');
        setUser(null);
        setStores([]);
        setCurrentStore(null);
        setTenant(null);
        setAccessibleStoreIds(new Set());
        setIsLoading(false);
        return;
      }

      console.log('[StoreContext] Fetching user data...');
      const data = await apiClient.getMe();
      console.log('[StoreContext] User data received:', data.user?.email);
      
      if (data.user) {
        // Set tenant info if available
        if (data.tenant) {
          setTenant(data.tenant as TenantInfo);
          safeStorage.setItem('tenant', JSON.stringify(data.tenant));
        }

        // Extract accessible store IDs from auth response
        const authStores = data.stores || [];
        const storeIds = new Set<string>();
        authStores.forEach((s: string | UserStoreAccess) => {
          if (typeof s === 'string') {
            storeIds.add(s);
          } else {
            storeIds.add(s.storeId);
          }
        });
        setAccessibleStoreIds(storeIds);

        // Sync stores first to ensure user has access to all stores (for owner/admin)
        if (data.user.role === 'owner' || data.user.role === 'admin') {
          try {
            const syncResult = await apiClient.syncStores();
            if (syncResult.addedStores && syncResult.addedStores.length > 0) {
              console.log('Auto-synced stores:', syncResult.addedStores);
            }
          } catch (syncError) {
            console.warn('Store sync failed, continuing with existing stores:', syncError);
          }
        }

        // Fetch stores - this returns only stores user has access to
        const storesData = await apiClient.getStores();
        const userStores = storesData.map(s => ({
          ...s,
          code: s.code || s.slug || '',
        })) as Store[];

        const userData: StoreUser = {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          role: data.user.role,
          permissions: data.user.permissions || {},
          stores: userStores,
          accessibleStoreIds: Array.from(storeIds),
        };

        setUser(userData);
        setStores(userStores);

        // Determine which store to select
        const savedStoreId = getSavedStoreId();
        let storeToSelect: Store | null = null;

        if (savedStoreId) {
          // Only select saved store if user has access to it
          const savedStore = userStores.find(s => s.id === savedStoreId);
          if (savedStore) {
            storeToSelect = savedStore;
          }
        }

        if (!storeToSelect && userStores.length > 0) {
          storeToSelect = userStores[0];
        }

        if (storeToSelect) {
          setCurrentStore(storeToSelect);
          saveStoreId(storeToSelect.id);
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching user and stores:', err);
      
      // Check if it's an auth error (401 or token invalid)
      const isAuthError = err instanceof Error && (
        err.message.includes('Token') ||
        err.message.includes('401') ||
        err.message.includes('hết hạn') ||
        err.message.includes('không hợp lệ') ||
        (err as { status?: number }).status === 401
      );
      
      if (isAuthError) {
        // Clear invalid token and auth state silently
        apiClient.setToken(null);
        apiClient.setStoreId(null);
        safeStorage.removeItem('auth_token');
        safeStorage.removeItem('store_id');
        safeStorage.removeItem('tenant');
        safeStorage.removeItem('user');
        safeStorage.removeItem(STORE_STORAGE_KEY);
        
        // Clear auth state only for auth errors
        setUser(null);
        setStores([]);
        setCurrentStore(null);
        setTenant(null);
        setAccessibleStoreIds(new Set());
      } else {
        // For non-auth errors, set error but don't clear user state
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getSavedStoreId, saveStoreId]);

  // Switch to a different store with permission verification
  const switchStore = useCallback(async (storeId: string): Promise<boolean> => {
    // Verify user has access to the store
    if (!canAccessStore(storeId)) {
      console.warn(`User does not have access to store ${storeId}`);
      setError('Bạn không có quyền truy cập cửa hàng này');
      return false;
    }

    // Check if user has an active shift in current store
    if (currentStore && currentStore.id !== storeId) {
      try {
        const activeShiftResponse = await apiClient.getActiveShift();
        if (activeShiftResponse) {
          setError('Vui lòng đóng ca hiện tại trước khi chuyển sang cửa hàng khác');
          // Show a more prominent error
          if (typeof window !== 'undefined') {
            alert('⚠️ Bạn đang có ca làm việc đang mở!\n\nVui lòng đóng ca tại cửa hàng hiện tại trước khi chuyển sang cửa hàng khác.');
          }
          return false;
        }
      } catch (error) {
        console.error('Error checking active shift:', error);
        // Continue with store switch if we can't check shift status
      }
    }

    const store = stores.find(s => s.id === storeId);
    if (store) {
      setCurrentStore(store);
      saveStoreId(storeId);
      setError(null);
      return true;
    }
    
    // Store not in local list, try to fetch it
    try {
      const storeData = await apiClient.getStore(storeId);
      if (storeData) {
        const store = { ...storeData, code: storeData.code || storeData.slug || '' } as Store;
        setCurrentStore(store);
        saveStoreId(storeId);
        setError(null);
        return true;
      }
    } catch (err) {
      console.error('Error fetching store:', err);
      setError('Không thể chuyển đến cửa hàng này');
    }
    
    return false;
  }, [stores, canAccessStore, saveStoreId, currentStore]);

  // Refresh stores data
  const refreshStores = useCallback(async () => {
    await fetchUserAndStores();
  }, [fetchUserAndStores]);

  // Logout user
  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setUser(null);
      setStores([]);
      setCurrentStore(null);
      setTenant(null);
      setAccessibleStoreIds(new Set());
      saveStoreId(null);
      safeStorage.removeItem('tenant');
      safeStorage.removeItem('user');
    }
  }, [saveStoreId]);

  // Create a new store
  const createStore = useCallback(async (data: CreateStoreRequest): Promise<Store> => {
    const newStore = await apiClient.createStore(data);
    // Refresh stores list to include the new store
    const storesData = await apiClient.getStores();
    const userStores = storesData.map(s => ({
      ...s,
      code: s.code || s.slug || '',
    })) as Store[];
    setStores(userStores);
    // Add new store to accessible stores
    setAccessibleStoreIds(prev => new Set([...prev, newStore.id]));
    // Auto-switch to the new store
    const storeWithCode = { ...newStore, code: newStore.code || newStore.slug || '' } as Store;
    setCurrentStore(storeWithCode);
    saveStoreId(newStore.id);
    return storeWithCode;
  }, [saveStoreId]);

  // Update an existing store
  const updateStore = useCallback(async (id: string, data: UpdateStoreRequest): Promise<Store> => {
    const updatedStore = await apiClient.updateStore(id, data);
    const storeWithCode = { ...updatedStore, code: updatedStore.code || updatedStore.slug || '' } as Store;
    // Update local state
    setStores(prevStores => 
      prevStores.map(store => store.id === id ? { ...store, ...storeWithCode } : store)
    );
    // Update current store if it's the one being updated
    if (currentStore?.id === id) {
      setCurrentStore(prev => prev ? { ...prev, ...storeWithCode } : null);
    }
    return storeWithCode;
  }, [currentStore?.id]);

  // Deactivate a store (soft delete)
  const deactivateStore = useCallback(async (id: string): Promise<void> => {
    await apiClient.deleteStore(id);
    // Remove from stores list
    const remainingStores = stores.filter(store => store.id !== id);
    setStores(remainingStores);
    // Remove from accessible stores
    setAccessibleStoreIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    // If the deactivated store was the current store, switch to another
    if (currentStore?.id === id) {
      if (remainingStores.length > 0) {
        setCurrentStore(remainingStores[0]);
        saveStoreId(remainingStores[0].id);
      } else {
        setCurrentStore(null);
        saveStoreId(null);
      }
    }
  }, [stores, currentStore?.id, saveStoreId]);

  // Permanently delete a store (hard delete)
  const deleteStorePermanently = useCallback(async (id: string): Promise<void> => {
    await apiClient.deleteStorePermanently(id);
    // Remove from stores list
    const remainingStores = stores.filter(store => store.id !== id);
    setStores(remainingStores);
    // Remove from accessible stores
    setAccessibleStoreIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    // If the deleted store was the current store, switch to another
    if (currentStore?.id === id) {
      if (remainingStores.length > 0) {
        setCurrentStore(remainingStores[0]);
        saveStoreId(remainingStores[0].id);
      } else {
        setCurrentStore(null);
        saveStoreId(null);
      }
    }
  }, [stores, currentStore?.id, saveStoreId]);

  // Initial load
  useEffect(() => {
    fetchUserAndStores();
  }, [fetchUserAndStores]);

  const value = useMemo<StoreContextType>(() => ({
    currentStore,
    stores,
    user,
    tenant,
    isLoading,
    error,
    switchStore,
    canAccessStore,
    refreshStores,
    logout,
    createStore,
    updateStore,
    deactivateStore,
    deleteStorePermanently,
  }), [currentStore, stores, user, tenant, isLoading, error, switchStore, canAccessStore, refreshStores, logout, createStore, updateStore, deactivateStore, deleteStorePermanently]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export { StoreContext };
