-- Add test drivers with "available" status
INSERT INTO drivers (name, phone, password_hash, avatar_letter, rank, balance, credit_limit, total_trips, rating, is_online, created_at, updated_at)
VALUES
  ('محمد أحمد', '01012345678', 'hashed_1234', 'م', 'gold', '0.00', '500.00', 47, '4.8', true, NOW(), NOW()),
  ('علي محمود', '01098765432', 'hashed_1234', 'ع', 'silver', '0.00', '500.00', 32, '4.5', true, NOW(), NOW()),
  ('كريم السيد', '01187654321', 'hashed_1234', 'ك', 'bronze', '0.00', '500.00', 28, '4.2', true, NOW(), NOW()),
  ('حسين فاروق', '01156789012', 'hashed_1234', 'ح', 'silver', '0.00', '500.00', 55, '4.6', true, NOW(), NOW()),
  ('إبراهيم محمد', '01145678901', 'hashed_1234', 'إ', 'bronze', '0.00', '500.00', 19, '3.9', true, NOW(), NOW()),
  ('عمرو خالد', '01134567890', 'hashed_1234', 'ع', 'gold', '0.00', '500.00', 78, '4.9', true, NOW(), NOW())
ON CONFLICT (phone) DO UPDATE SET is_online = true, updated_at = NOW();

-- Verify drivers were added
SELECT id, name, phone, rank, is_online FROM drivers WHERE phone LIKE '011%' ORDER BY created_at DESC LIMIT 6;
