/**
 * ============================================================
 * سويفت لوجستكس — Supabase Client
 * ============================================================
 * للتفعيل:
 * 1. اربط مشروعك من خلال زر Supabase في Figma Make
 * 2. سيتم تعيين المتغيرات تلقائياً
 * 3. نفّذ ملفات المايجريشن بالترتيب من /src/migrations/
 *
 * To activate:
 * 1. Connect your project via the Supabase button
 * 2. Environment variables will be set automatically
 * 3. Run migration files in order from /src/migrations/
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ─── Database Types (matches migration schema) ───

export type UserRole = 'admin' | 'restaurant' | 'dispatcher';
export type RestaurantStatus = 'active' | 'inactive' | 'suspended';
export type SubscriptionType = 'basic' | 'pro' | 'enterprise';
export type DriverStatus = 'available' | 'busy' | 'offline';
export type DriverRank = 'gold' | 'silver' | 'bronze';
export type OrderStatus = 'pending' | 'assigned' | 'picked' | 'on_way' | 'delivered' | 'cancelled';

export interface DBUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface DBRestaurant {
  id: string;
  user_id?: string;
  name: string;
  phone?: string;
  address?: string;
  city: string;
  status: RestaurantStatus;
  subscription_type: SubscriptionType;
  subscription_expires?: string;
  wallet_balance: number;
  logo_url?: string;
  lat?: number;
  lng?: number;
  total_orders: number;
  total_revenue: number;
  rating: number;
  created_at: string;
}

export interface DBDriver {
  id: string;
  name: string;
  phone: string;
  national_id?: string;
  rank: DriverRank;
  wallet_balance: number;
  status: DriverStatus;
  rating: number;
  orders_count: number;
  lat?: number;
  lng?: number;
  has_warning: boolean;
  warning_reason?: string;
  is_active: boolean;
  completion_rate: number;
  avg_delivery_min: number;
  created_at: string;
}

export interface DBOrder {
  id: string;
  order_number: string;
  restaurant_id?: string;
  driver_id?: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  order_value: number;
  delivery_fee: number;
  platform_commission: number;
  status: OrderStatus;
  estimated_minutes: number;
  notes?: string;
  cancel_reason?: string;
  created_at: string;
  assigned_at?: string;
  picked_at?: string;
  on_way_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
}

export interface DBMenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  image_url?: string;
  emoji: string;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

export interface DBWalletTransaction {
  id: string;
  wallet_owner_type: 'restaurant' | 'driver';
  wallet_owner_id: string;
  order_id?: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  balance_after: number;
  created_at: string;
}

export interface DBSettlement {
  id: string;
  entity_type: 'restaurant' | 'driver';
  entity_id: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  fee_amount: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  paid_at?: string;
  created_at: string;
}

export interface DBSubscription {
  id: string;
  restaurant_id: string;
  plan_type: SubscriptionType;
  price_egp: number;
  starts_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'cancelled';
  auto_renew: boolean;
  created_at: string;
}

// ─── Migration order (run in sequence) ───
export const MIGRATION_ORDER = [
  '001_users.sql',
  '002_restaurants.sql',
  '003_drivers.sql',
  '004_orders.sql',
  '005_menu_items.sql',
  '006_wallet_transactions.sql',
  '007_settlements.sql',
  '008_subscriptions.sql',
] as const;
