/**
 * Offline Storage Manager
 * Handles persistent storage and sync with API
 * Uses AsyncStorage for React Native (including web)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  // Auth
  AUTH_TOKEN: 'dm:auth:token',
  DRIVER_DATA: 'dm:driver:data',
  TENANT_ID: 'dm:tenant:id',
  USER_ROLE: 'dm:user:role',
  
  // Data
  ORDERS: 'dm:orders:list',
  INCOMING_ORDER: 'dm:order:incoming',
  WEEKLY_EARNINGS: 'dm:earnings:weekly',
  DRIVER_LOCATION: 'dm:location:current',
  
  // Pending syncs
  PENDING_LOCATION_UPDATES: 'dm:pending:locations',
  PENDING_EARNINGS: 'dm:pending:earnings',
  PENDING_ORDER_UPDATES: 'dm:pending:orders',
  
  // Metadata
  LAST_SYNC_AT: 'dm:meta:last_sync',
  OFFLINE_MODE: 'dm:meta:offline',
};

export interface StoredDriver {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  rank: 'bronze' | 'silver' | 'gold' | 'platinum';
  balance: number;
  creditLimit: number;
  totalTrips: number;
  rating: number;
}

export interface StoredOrder {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLatitude: number;
  restaurantLongitude: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerLatitude: number;
  customerLongitude: number;
  distance: string;
  fare: number;
  cashToCollect: number;
  commission: number;
  status: 'to_restaurant' | 'picked_up' | 'to_customer' | 'delivered';
}

export interface StoredEarning {
  date: string;
  trips: number;
  earnings: number;
  cashCollected: number;
  commission: number;
}

export interface StoredLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface PendingLocationUpdate {
  id: string; // unique id for dedup
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  orderId: number | null;
  timestamp: number;
  retries: number;
}

export interface PendingEarning {
  id: string; // unique id
  amount: number;
  cashCollected: number;
  commission: number;
  orderId?: number;
  earningDate?: string;
  tripsCount?: number;
  timestamp: number;
  retries: number;
}

/**
 * Auth Storage
 */
export const OfflineStorage = {
  // Auth
  async saveAuth(driver: StoredDriver, tenantId: string, role: string) {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.DRIVER_DATA, JSON.stringify(driver)),
      AsyncStorage.setItem(STORAGE_KEYS.TENANT_ID, tenantId),
      AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role),
    ]);
  },

  async getAuth(): Promise<{ driver: StoredDriver | null; tenantId: string; role: string } | null> {
    try {
      const [driverStr, tenantId, role] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DRIVER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.TENANT_ID),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE),
      ]);

      if (!driverStr || !tenantId || !role) return null;

      return {
        driver: JSON.parse(driverStr),
        tenantId,
        role,
      };
    } catch (e) {
      console.error('[OfflineStorage] getAuth error:', e);
      return null;
    }
  },

  async clearAuth() {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.DRIVER_DATA),
      AsyncStorage.removeItem(STORAGE_KEYS.TENANT_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE),
      AsyncStorage.removeItem(STORAGE_KEYS.PENDING_LOCATION_UPDATES),
      AsyncStorage.removeItem(STORAGE_KEYS.PENDING_EARNINGS),
      AsyncStorage.removeItem(STORAGE_KEYS.PENDING_ORDER_UPDATES),
    ]);
  },

  // Driver
  async saveDriver(driver: StoredDriver) {
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVER_DATA, JSON.stringify(driver));
  },

  async getDriver(): Promise<StoredDriver | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DRIVER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[OfflineStorage] getDriver error:', e);
      return null;
    }
  },

  // Orders
  async saveOrders(orders: StoredOrder[]) {
    await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },

  async getOrders(): Promise<StoredOrder[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[OfflineStorage] getOrders error:', e);
      return [];
    }
  },

  async saveIncomingOrder(order: StoredOrder | null) {
    if (order) {
      await AsyncStorage.setItem(STORAGE_KEYS.INCOMING_ORDER, JSON.stringify(order));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.INCOMING_ORDER);
    }
  },

  async getIncomingOrder(): Promise<StoredOrder | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.INCOMING_ORDER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[OfflineStorage] getIncomingOrder error:', e);
      return null;
    }
  },

  // Earnings
  async saveWeeklyEarnings(earnings: StoredEarning[]) {
    await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_EARNINGS, JSON.stringify(earnings));
  },

  async getWeeklyEarnings(): Promise<StoredEarning[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_EARNINGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[OfflineStorage] getWeeklyEarnings error:', e);
      return [];
    }
  },

  // Location
  async saveLocation(location: StoredLocation) {
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVER_LOCATION, JSON.stringify(location));
  },

  async getLocation(): Promise<StoredLocation | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DRIVER_LOCATION);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[OfflineStorage] getLocation error:', e);
      return null;
    }
  },

  // Pending syncs
  async addPendingLocation(update: Omit<PendingLocationUpdate, 'id' | 'retries'>) {
    try {
      const pending = await this.getPendingLocations();
      const newUpdate: PendingLocationUpdate = {
        ...update,
        id: `loc_${Date.now()}_${Math.random()}`,
        retries: 0,
      };
      pending.push(newUpdate);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_LOCATION_UPDATES, JSON.stringify(pending));
      return newUpdate.id;
    } catch (e) {
      console.error('[OfflineStorage] addPendingLocation error:', e);
    }
  },

  async getPendingLocations(): Promise<PendingLocationUpdate[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_LOCATION_UPDATES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[OfflineStorage] getPendingLocations error:', e);
      return [];
    }
  },

  async removePendingLocation(id: string) {
    try {
      const pending = await this.getPendingLocations();
      const filtered = pending.filter(p => p.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_LOCATION_UPDATES, JSON.stringify(filtered));
    } catch (e) {
      console.error('[OfflineStorage] removePendingLocation error:', e);
    }
  },

  async incrementLocationRetry(id: string) {
    try {
      const pending = await this.getPendingLocations();
      const updated = pending.map(p => p.id === id ? { ...p, retries: p.retries + 1 } : p);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_LOCATION_UPDATES, JSON.stringify(updated));
    } catch (e) {
      console.error('[OfflineStorage] incrementLocationRetry error:', e);
    }
  },

  async addPendingEarning(earning: Omit<PendingEarning, 'id' | 'timestamp' | 'retries'>) {
    try {
      const pending = await this.getPendingEarnings();
      const newEarning: PendingEarning = {
        ...earning,
        id: `earn_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        retries: 0,
      };
      pending.push(newEarning);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_EARNINGS, JSON.stringify(pending));
      return newEarning.id;
    } catch (e) {
      console.error('[OfflineStorage] addPendingEarning error:', e);
    }
  },

  async getPendingEarnings(): Promise<PendingEarning[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_EARNINGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[OfflineStorage] getPendingEarnings error:', e);
      return [];
    }
  },

  async removePendingEarning(id: string) {
    try {
      const pending = await this.getPendingEarnings();
      const filtered = pending.filter(p => p.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_EARNINGS, JSON.stringify(filtered));
    } catch (e) {
      console.error('[OfflineStorage] removePendingEarning error:', e);
    }
  },

  async incrementEarningRetry(id: string) {
    try {
      const pending = await this.getPendingEarnings();
      const updated = pending.map(p => p.id === id ? { ...p, retries: p.retries + 1 } : p);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_EARNINGS, JSON.stringify(updated));
    } catch (e) {
      console.error('[OfflineStorage] incrementEarningRetry error:', e);
    }
  },

  // Metadata
  async setLastSyncAt(timestamp: number) {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_AT, String(timestamp));
  },

  async getLastSyncAt(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_AT);
      return data ? parseInt(data) : 0;
    } catch (e) {
      console.error('[OfflineStorage] getLastSyncAt error:', e);
      return 0;
    }
  },

  async setOfflineMode(isOffline: boolean) {
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, String(isOffline));
  },

  async getOfflineMode(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODE);
      return data === 'true';
    } catch (e) {
      console.error('[OfflineStorage] getOfflineMode error:', e);
      return false;
    }
  },
};
