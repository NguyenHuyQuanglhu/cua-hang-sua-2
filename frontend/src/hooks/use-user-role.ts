'use client';

import { useMemo } from "react";
import { useStore } from "@/contexts/store-context";
import type { Permissions, SoftwarePackage } from "@/lib/types";

// Define default permissions for each role
const defaultPermissions: Record<string, Permissions> = {
  owner: {
    dashboard: ['view'],
    pos: ['view', 'add', 'edit', 'delete'],
    categories: ['view', 'add', 'edit', 'delete'],
    units: ['view', 'add', 'edit', 'delete'],
    suppliers: ['view', 'add', 'edit', 'delete'],
    products: ['view', 'add', 'edit', 'delete'],
    purchases: ['view', 'add', 'edit', 'delete'],
    sales: ['view', 'add', 'edit', 'delete'],
    customers: ['view', 'add', 'edit', 'delete'],
    'cash-flow': ['view', 'add', 'edit', 'delete'],
    reports_shifts: ['view'],
    reports_income_statement: ['view'],
    reports_profit: ['view'],
    reports_debt: ['view'],
    reports_supplier_debt: ['view'],
    reports_transactions: ['view'],
    reports_supplier_debt_tracking: ['view'],
    reports_revenue: ['view'],
    reports_sold_products: ['view'],
    reports_inventory: ['view'],
    reports_ai_segmentation: ['view'],
    reports_ai_basket_analysis: ['view'],
    ai_forecast: ['view'],
    users: ['view', 'add', 'edit', 'delete'],
    settings: ['view', 'edit'],
  },
  company_manager: {
    dashboard: ['view'],
    pos: ['view', 'add', 'edit'],
    categories: ['view', 'add', 'edit', 'delete'],
    units: ['view', 'add', 'edit', 'delete'],
    suppliers: ['view', 'add', 'edit'],
    products: ['view', 'add', 'edit', 'delete'],
    purchases: ['view', 'add', 'edit'],
    sales: ['view', 'add', 'edit'],
    customers: ['view', 'add', 'edit'],
    'cash-flow': ['view', 'add', 'edit', 'delete'],
    reports_shifts: ['view'],
    reports_income_statement: ['view'],
    reports_profit: ['view'],
    reports_debt: ['view'],
    reports_supplier_debt: ['view'],
    reports_transactions: ['view'],
    reports_supplier_debt_tracking: ['view'],
    reports_revenue: ['view'],
    reports_sold_products: ['view'],
    reports_inventory: ['view'],
    reports_ai_segmentation: ['view'],
    reports_ai_basket_analysis: ['view'],
    ai_forecast: ['view'],
    users: ['view'],
    settings: ['view'],
  },
  store_manager: {
    dashboard: ['view'],
    pos: ['view', 'add', 'edit'],
    categories: ['view', 'add', 'edit'],
    units: ['view', 'add', 'edit'],
    suppliers: ['view', 'add'],
    products: ['view', 'add', 'edit'],
    purchases: ['view', 'add', 'edit'],
    sales: ['view', 'add', 'edit'],
    customers: ['view', 'add', 'edit'],
    'cash-flow': ['view', 'add', 'edit', 'delete'],
    reports_shifts: ['view'],
    reports_income_statement: ['view'],
    reports_profit: ['view'],
    reports_debt: ['view'],
    reports_supplier_debt: ['view'],
    reports_transactions: ['view'],
    reports_supplier_debt_tracking: ['view'],
    reports_revenue: ['view'],
    reports_sold_products: ['view'],
    reports_inventory: ['view'],
    reports_ai_segmentation: ['view'],
    reports_ai_basket_analysis: ['view'],
    ai_forecast: ['view'],
  },
  salesperson: {
    dashboard: ['view'],
    pos: ['view', 'add'],
    products: ['view'],
    sales: ['view', 'add'],
    customers: ['view', 'add'],
  },
};

// Define permissions for each software package
const packagePermissions: Record<SoftwarePackage, (keyof Permissions)[]> = {
  basic: [
    'dashboard', 'pos', 'categories', 'units', 'suppliers', 'products',
    'purchases', 'sales', 'customers', 'cash-flow',
    'reports_revenue', 'reports_inventory', 'reports_debt', 'reports_supplier_debt'
  ],
  standard: [
    'dashboard', 'pos', 'categories', 'units', 'suppliers', 'products',
    'purchases', 'sales', 'customers', 'cash-flow',
    'reports_shifts', 'reports_income_statement', 'reports_profit', 'reports_debt',
    'reports_supplier_debt', 'reports_transactions', 'reports_supplier_debt_tracking',
    'reports_revenue', 'reports_sold_products', 'reports_inventory',
    'users', 'settings'
  ],
  advanced: [
    'dashboard', 'pos', 'categories', 'units', 'suppliers', 'products',
    'purchases', 'sales', 'customers', 'cash-flow',
    'reports_shifts', 'reports_income_statement', 'reports_profit', 'reports_debt',
    'reports_supplier_debt', 'reports_transactions', 'reports_supplier_debt_tracking',
    'reports_revenue', 'reports_sold_products', 'reports_inventory',
    'reports_ai_segmentation', 'reports_ai_basket_analysis', 'ai_forecast',
    'users', 'settings'
  ],
};

interface UserStoreAssignment {
  storeId: string;
  storeName: string;
  storeCode: string;
  role?: string;
  permissions?: Permissions;
}

export function useUserRole() {
  const { user, currentStore, isLoading, stores } = useStore();

  const permissions = useMemo(() => {
    const role = user?.role;
    const userPermissions = user?.permissions;
    const settings = currentStore?.settings as { softwarePackage?: SoftwarePackage } | undefined;
    const softwarePackage = settings?.softwarePackage || 'advanced';

    // Always prioritize the specific permissions stored on the user object.
    // Fall back to the role's default permissions if the permissions field doesn't exist or is empty.
    let basePermissions: Permissions = 
      (userPermissions && Object.keys(userPermissions).length > 0)
        ? userPermissions
        : (role && defaultPermissions[role] ? defaultPermissions[role] : {});

    // If a software package is set, filter the base permissions
    if (softwarePackage && basePermissions && Object.keys(basePermissions).length > 0) {
      const allowedModules = packagePermissions[softwarePackage];
      const filteredPermissions: Permissions = {};

      for (const module of allowedModules) {
        if (basePermissions[module]) {
          filteredPermissions[module] = basePermissions[module];
        }
      }
      return filteredPermissions;
    }

    return basePermissions || {};
  }, [user, currentStore]);

  // Map stores to UserStoreAssignment format
  const userStores: UserStoreAssignment[] = useMemo(() => {
    return stores.map(store => ({
      storeId: store.id,
      storeName: store.name,
      storeCode: store.code || '',
    }));
  }, [stores]);

  return {
    role: user?.role,
    permissions: permissions,
    isLoading,
    userId: user?.id,
    userStores,
  };
}
