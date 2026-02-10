/**
 * Online Customer entity interface
 */
export interface OnlineCustomer {
    id: string;
    onlineStoreId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
    defaultAddressId?: string;
    isActive: boolean;
    isVerified: boolean;
    createdAt?: string;
    updatedAt?: string;
    lastLoginAt?: string;
}
/**
 * Customer Address entity interface
 */
export interface CustomerAddress {
    id: string;
    customerId: string;
    label: string;
    fullName: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    addressLine: string;
    isDefault: boolean;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Online Customer with addresses
 */
export interface OnlineCustomerWithAddresses extends OnlineCustomer {
    addresses: CustomerAddress[];
}
/**
 * Create customer input
 */
export interface CreateOnlineCustomerInput {
    onlineStoreId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
}
/**
 * Create address input
 */
export interface CreateCustomerAddressInput {
    customerId: string;
    label: string;
    fullName: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    addressLine: string;
    isDefault?: boolean;
}
/**
 * Online Customer repository for managing online store customers
 */
export declare class OnlineCustomerRepository {
    /**
     * Map database record to OnlineCustomer entity
     */
    private mapCustomerToEntity;
    /**
     * Map database record to CustomerAddress entity
     */
    private mapAddressToEntity;
    /**
     * Find customer by ID
     */
    findById(id: string, onlineStoreId: string): Promise<OnlineCustomer | null>;
    /**
     * Find customer by email (for authentication)
     */
    findByEmail(email: string, onlineStoreId: string): Promise<OnlineCustomer | null>;
    /**
     * Check if email exists
     */
    emailExists(email: string, onlineStoreId: string, excludeId?: string): Promise<boolean>;
    /**
     * Create a new customer (registration)
     */
    create(data: CreateOnlineCustomerInput): Promise<OnlineCustomer>;
    /**
     * Update customer profile
     */
    update(id: string, data: Partial<Pick<OnlineCustomer, 'firstName' | 'lastName' | 'phone'>>, onlineStoreId: string): Promise<OnlineCustomer>;
    /**
     * Update password
     */
    updatePassword(id: string, passwordHash: string, onlineStoreId: string): Promise<boolean>;
    /**
     * Update last login timestamp
     */
    updateLastLogin(id: string, onlineStoreId: string): Promise<boolean>;
    /**
     * Verify customer email
     */
    verifyEmail(id: string, onlineStoreId: string): Promise<boolean>;
    /**
     * Deactivate customer
     */
    deactivate(id: string, onlineStoreId: string): Promise<boolean>;
    /**
     * Get customer with addresses
     */
    getCustomerWithAddresses(id: string, onlineStoreId: string): Promise<OnlineCustomerWithAddresses | null>;
    /**
     * Get all addresses for a customer
     */
    getAddresses(customerId: string): Promise<CustomerAddress[]>;
    /**
     * Get address by ID
     */
    getAddressById(addressId: string, customerId: string): Promise<CustomerAddress | null>;
    /**
     * Get default address
     */
    getDefaultAddress(customerId: string): Promise<CustomerAddress | null>;
    /**
     * Create a new address
     */
    createAddress(data: CreateCustomerAddressInput): Promise<CustomerAddress>;
    /**
     * Update an address
     */
    updateAddress(addressId: string, customerId: string, data: Partial<Omit<CreateCustomerAddressInput, 'customerId'>>): Promise<CustomerAddress>;
    /**
     * Delete an address
     */
    deleteAddress(addressId: string, customerId: string): Promise<boolean>;
    /**
     * Set address as default
     */
    setDefaultAddress(addressId: string, customerId: string): Promise<boolean>;
}
export declare const onlineCustomerRepository: OnlineCustomerRepository;
//# sourceMappingURL=online-customer-repository.d.ts.map