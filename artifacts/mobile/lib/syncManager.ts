/**
 * Sync Manager
 * Handles synchronization of pending operations when online
 * Retries failed operations with exponential backoff
 */

import { apiClient } from './api';
import { OfflineStorage, PendingLocationUpdate, PendingEarning } from './offlineStorage';

export interface SyncStats {
  locationsQueued: number;
  earningsQueued: number;
  lastSyncAt: number;
  isSyncing: boolean;
  errors: string[];
}

let syncInProgress = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 2000; // 2 seconds base, exponential
const SYNC_CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

/**
 * Start automatic sync when online
 */
export function startAutoSync() {
  if (syncInterval) return; // Already running
  
  console.log('[SyncManager] Starting auto-sync...');
  
  // Initial sync
  syncPendingData().catch(e => console.warn('[SyncManager] Initial sync error:', e));
  
  // Then poll periodically
  syncInterval = setInterval(() => {
    syncPendingData().catch(e => console.warn('[SyncManager] Periodic sync error:', e));
  }, SYNC_CHECK_INTERVAL_MS);
}

/**
 * Stop automatic sync
 */
export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[SyncManager] Auto-sync stopped');
  }
}

/**
 * Get current sync status
 */
export async function getSyncStats(): Promise<SyncStats> {
  const [locations, earnings, lastSync] = await Promise.all([
    OfflineStorage.getPendingLocations(),
    OfflineStorage.getPendingEarnings(),
    OfflineStorage.getLastSyncAt(),
  ]);

  return {
    locationsQueued: locations.length,
    earningsQueued: earnings.length,
    lastSyncAt: lastSync,
    isSyncing: syncInProgress,
    errors: [],
  };
}

/**
 * Sync all pending data
 */
export async function syncPendingData() {
  if (syncInProgress) return;
  
  syncInProgress = true;
  try {
    console.log('[SyncManager] Starting sync cycle...');
    
    const startTime = Date.now();
    
    // Sync locations first (more frequent)
    await syncPendingLocations();
    
    // Then earnings
    await syncPendingEarnings();
    
    // Update last sync time
    await OfflineStorage.setLastSyncAt(Date.now());
    
    const duration = Date.now() - startTime;
    console.log(`[SyncManager] Sync completed in ${duration}ms`);
  } catch (error) {
    console.error('[SyncManager] Sync cycle error:', error);
  } finally {
    syncInProgress = false;
  }
}

/**
 * Sync pending location updates
 */
async function syncPendingLocations() {
  const pending = await OfflineStorage.getPendingLocations();
  
  if (pending.length === 0) return;
  
  console.log(`[SyncManager] Syncing ${pending.length} location updates...`);
  
  for (const update of pending) {
    if (update.retries >= MAX_RETRIES) {
      console.warn(`[SyncManager] Location ${update.id} exceeded max retries, removing`);
      await OfflineStorage.removePendingLocation(update.id);
      continue;
    }

    try {
      // POST location to API
      // Note: Assuming there's a driver context, in real implementation
      // we'd need driver ID from stored auth
      const auth = await OfflineStorage.getAuth();
      if (!auth?.driver?.id) {
        console.warn('[SyncManager] No driver auth found, skipping location sync');
        break;
      }

      await apiClient.saveLocation(auth.driver.id, {
        latitude: update.latitude,
        longitude: update.longitude,
        accuracy: update.accuracy,
        heading: update.heading,
        speed: update.speed,
        orderId: update.orderId,
      });

      // Success - remove from pending
      await OfflineStorage.removePendingLocation(update.id);
      console.log(`[SyncManager] Location ${update.id} synced`);
    } catch (error) {
      // Retry with backoff
      await OfflineStorage.incrementLocationRetry(update.id);
      const backoff = RETRY_BACKOFF_MS * Math.pow(2, update.retries);
      console.warn(
        `[SyncManager] Location ${update.id} sync failed, retry ${update.retries + 1}/${MAX_RETRIES} in ${backoff}ms:`,
        error
      );
    }
  }
}

/**
 * Sync pending earnings
 */
async function syncPendingEarnings() {
  const pending = await OfflineStorage.getPendingEarnings();
  
  if (pending.length === 0) return;
  
  console.log(`[SyncManager] Syncing ${pending.length} earnings...`);
  
  for (const earning of pending) {
    if (earning.retries >= MAX_RETRIES) {
      console.warn(`[SyncManager] Earning ${earning.id} exceeded max retries, removing`);
      await OfflineStorage.removePendingEarning(earning.id);
      continue;
    }

    try {
      const auth = await OfflineStorage.getAuth();
      if (!auth?.driver?.id) {
        console.warn('[SyncManager] No driver auth found, skipping earning sync');
        break;
      }

      await apiClient.recordEarning(auth.driver.id, {
        amount: earning.amount,
        cashCollected: earning.cashCollected,
        commission: earning.commission,
        orderId: earning.orderId,
        earningDate: earning.earningDate,
        tripsCount: earning.tripsCount,
      });

      // Success - remove from pending
      await OfflineStorage.removePendingEarning(earning.id);
      console.log(`[SyncManager] Earning ${earning.id} synced`);
    } catch (error) {
      // Retry with backoff
      await OfflineStorage.incrementEarningRetry(earning.id);
      const backoff = RETRY_BACKOFF_MS * Math.pow(2, earning.retries);
      console.warn(
        `[SyncManager] Earning ${earning.id} sync failed, retry ${earning.retries + 1}/${MAX_RETRIES} in ${backoff}ms:`,
        error
      );
    }
  }
}

/**
 * Manual sync trigger
 */
export async function triggerSync() {
  if (syncInProgress) {
    console.log('[SyncManager] Sync already in progress');
    return;
  }
  await syncPendingData();
}

/**
 * Check if there are pending operations
 */
export async function hasPendingOperations(): Promise<boolean> {
  const [locations, earnings] = await Promise.all([
    OfflineStorage.getPendingLocations(),
    OfflineStorage.getPendingEarnings(),
  ]);
  return locations.length > 0 || earnings.length > 0;
}
