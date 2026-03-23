/**
 * Offline-First Integration Tests
 * Tests for offline storage and sync functionality
 */

import { OfflineStorage, StoredDriver, StoredEarning, StoredLocation } from '@/lib/offlineStorage';
import { getSyncStats, hasPendingOperations } from '@/lib/syncManager';

// Mock driver data
const mockDriver: StoredDriver = {
  id: 1,
  name: 'سائق بايلوت',
  phone: '01012345678',
  avatar: 'س',
  rank: 'gold',
  balance: 1250.50,
  creditLimit: 500,
  totalTrips: 45,
  rating: 4.8,
};

const mockEarnings: StoredEarning[] = [
  {
    date: 'السبت',
    trips: 5,
    earnings: 350,
    cashCollected: 200,
    commission: 50,
  },
  {
    date: 'الأحد',
    trips: 3,
    earnings: 210,
    cashCollected: 100,
    commission: 35,
  },
];

const mockLocation: StoredLocation = {
  latitude: 30.0626,
  longitude: 31.1992,
  accuracy: 5,
  heading: 45,
  speed: 25,
  timestamp: Date.now(),
};

/**
 * Test: Save and retrieve driver data
 */
export async function testSaveAndRetrieveDriver() {
  console.log('[Test] Save and retrieve driver...');
  
  try {
    // Save
    await OfflineStorage.saveDriver(mockDriver);
    console.log('✓ Driver saved');
    
    // Retrieve
    const retrieved = await OfflineStorage.getDriver();
    
    if (retrieved?.id === mockDriver.id && retrieved.name === mockDriver.name) {
      console.log('✓ Driver retrieved successfully');
      return true;
    } else {
      console.error('✗ Driver data mismatch');
      return false;
    }
  } catch (error) {
    console.error('✗ Test failed:', error);
    return false;
  }
}

/**
 * Test: Save and retrieve earnings
 */
export async function testSaveAndRetrieveEarnings() {
  console.log('[Test] Save and retrieve earnings...');
  
  try {
    // Save
    await OfflineStorage.saveWeeklyEarnings(mockEarnings);
    console.log('✓ Earnings saved');
    
    // Retrieve
    const retrieved = await OfflineStorage.getWeeklyEarnings();
    
    if (retrieved.length === mockEarnings.length) {
      console.log('✓ Earnings retrieved successfully');
      return true;
    } else {
      console.error('✗ Earnings count mismatch');
      return false;
    }
  } catch (error) {
    console.error('✗ Test failed:', error);
    return false;
  }
}

/**
 * Test: Save and retrieve location
 */
export async function testSaveAndRetrieveLocation() {
  console.log('[Test] Save and retrieve location...');
  
  try {
    // Save
    await OfflineStorage.saveLocation(mockLocation);
    console.log('✓ Location saved');
    
    // Retrieve
    const retrieved = await OfflineStorage.getLocation();
    
    if (retrieved && retrieved.latitude === mockLocation.latitude) {
      console.log('✓ Location retrieved successfully');
      return true;
    } else {
      console.error('✗ Location data mismatch');
      return false;
    }
  } catch (error) {
    console.error('✗ Test failed:', error);
    return false;
  }
}

/**
 * Test: Pending location operations
 */
export async function testPendingLocations() {
  console.log('[Test] Pending location operations...');
  
  try {
    // Add pending
    const id1 = await OfflineStorage.addPendingLocation({
      latitude: 30.0626,
      longitude: 31.1992,
      accuracy: 5,
      heading: null,
      speed: null,
      orderId: 123,
      timestamp: Date.now(),
    });
    console.log('✓ Pending location added:', id1);
    
    const id2 = await OfflineStorage.addPendingLocation({
      latitude: 30.0700,
      longitude: 31.2000,
      accuracy: 8,
      heading: 90,
      speed: 30,
      orderId: 123,
      timestamp: Date.now() + 5000,
    });
    console.log('✓ Another pending location added:', id2);
    
    // Get pending
    const pending = await OfflineStorage.getPendingLocations();
    
    if (pending.length === 2) {
      console.log('✓ Pending locations retrieved:', pending.length);
      
      // Increment retry
      await OfflineStorage.incrementLocationRetry(id1!);
      const updated = await OfflineStorage.getPendingLocations();
      const found = updated.find(p => p.id === id1);
      
      if (found?.retries === 1) {
        console.log('✓ Retry counter incremented');
        
        // Remove
        await OfflineStorage.removePendingLocation(id1!);
        const final = await OfflineStorage.getPendingLocations();
        
        if (final.length === 1) {
          console.log('✓ Pending location removed');
          return true;
        }
      }
    } else {
      console.error('✗ Pending count mismatch');
      return false;
    }
  } catch (error) {
    console.error('✗ Test failed:', error);
    return false;
  }
  
  return false;
}

/**
 * Test: Pending earnings operations
 */
export async function testPendingEarnings() {
  console.log('[Test] Pending earnings operations...');
  
  try {
    // Add pending
    const id1 = await OfflineStorage.addPendingEarning({
      amount: 150,
      cashCollected: 100,
      commission: 25,
      orderId: 456,
      earningDate: '2026-03-24',
      tripsCount: 1,
    });
    console.log('✓ Pending earning added:', id1);
    
    // Get pending
    const pending = await OfflineStorage.getPendingEarnings();
    
    if (pending.length === 1 && pending[0].amount === 150) {
      console.log('✓ Pending earnings retrieved');
      
      // Increment retry
      await OfflineStorage.incrementEarningRetry(id1!);
      const updated = await OfflineStorage.getPendingEarnings();
      const found = updated.find(p => p.id === id1);
      
      if (found?.retries === 1) {
        console.log('✓ Earning retry counter incremented');
        
        // Remove
        await OfflineStorage.removePendingEarning(id1!);
        const final = await OfflineStorage.getPendingEarnings();
        
        if (final.length === 0) {
          console.log('✓ Pending earning removed');
          return true;
        }
      }
    }
  } catch (error) {
    console.error('✗ Test failed:', error);
    return false;
  }
  
  return false;
}

/**
 * Test: Auth save and retrieve
 */
export async function testAuthStorage() {
  console.log('[Test] Auth storage...');
  
  try {
    // Save auth
    await OfflineStorage.saveAuth(mockDriver, 'pilot-main', 'driver');
    console.log('✓ Auth saved');
    
    // Retrieve auth
    const auth = await OfflineStorage.getAuth();
    
    if (auth?.driver?.id === mockDriver.id && auth.tenantId === 'pilot-main') {
      console.log('✓ Auth retrieved successfully');
      
      // Clear auth
      await OfflineStorage.clearAuth();
      const cleared = await OfflineStorage.getAuth();
      
      if (cleared === null) {
        console.log('✓ Auth cleared');
        return true;
      }
    }
  } catch (error) {
    console.error('✗ Test failed:', error);
    return false;
  }
  
  return false;
}

/**
 * Test: Sync stats
 */
export async function testSyncStats() {
  console.log('[Test] Sync stats...');
  
  try {
    // Add some pending operations
    await OfflineStorage.addPendingLocation({
      latitude: 30.0626,
      longitude: 31.1992,
      accuracy: 5,
      heading: null,
      speed: null,
      orderId: null,
      timestamp: Date.now(),
    });
    
    await OfflineStorage.addPendingEarning({
      amount: 100,
      cashCollected: 50,
      commission: 15,
    });
    
    // Get stats
    const stats = await getSyncStats();
    
    if (stats.locationsQueued === 1 && stats.earningsQueued === 1) {
      console.log('✓ Sync stats retrieved:', stats);
      
      const hasPending = await hasPendingOperations();
      if (hasPending) {
        console.log('✓ Pending operations detected');
        return true;
      }
    }
  } catch (error) {
    console.error('✗ Test failed:', error);
    return false;
  }
  
  return false;
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('═══════════════════════════════════════');
  console.log('  Offline-First Tests');
  console.log('═══════════════════════════════════════');
  
  const results = [
    { name: 'Save/Retrieve Driver', passed: await testSaveAndRetrieveDriver() },
    { name: 'Save/Retrieve Earnings', passed: await testSaveAndRetrieveEarnings() },
    { name: 'Save/Retrieve Location', passed: await testSaveAndRetrieveLocation() },
    { name: 'Pending Locations', passed: await testPendingLocations() },
    { name: 'Pending Earnings', passed: await testPendingEarnings() },
    { name: 'Auth Storage', passed: await testAuthStorage() },
    { name: 'Sync Stats', passed: await testSyncStats() },
  ];
  
  console.log('\n═══════════════════════════════════════');
  console.log('  Test Results');
  console.log('═══════════════════════════════════════');
  
  let passCount = 0;
  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    console.log(`${icon} ${result.name}`);
    if (result.passed) passCount++;
  }
  
  console.log(`\nTotal: ${passCount}/${results.length} passed`);
  console.log('═══════════════════════════════════════\n');
  
  return passCount === results.length;
}
