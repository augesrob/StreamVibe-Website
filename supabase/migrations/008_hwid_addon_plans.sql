-- ============================================================
-- HWID Add-on Plans + max_devices on plans
-- https://supabase.com/dashboard/project/ugodapqlmajfhvrodlyf/sql
-- ============================================================

-- 1. Add max_devices column to plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_devices integer DEFAULT NULL;

-- 2. Seed HWID add-on plans
INSERT INTO plans (name, tier, price, billing_interval, duration_days, max_devices, is_active, features, custom_note)
VALUES
  ('HWID +1 Device',  'free', 1.99, 'one_time', NULL, 1, true, ARRAY['Add 1 extra device slot to your license key'], 'Add-on'),
  ('HWID +3 Devices', 'free', 4.99, 'one_time', NULL, 3, true, ARRAY['Add 3 extra device slots to your license key'], 'Add-on'),
  ('HWID +5 Devices', 'free', 7.99, 'one_time', NULL, 5, true, ARRAY['Add 5 extra device slots to your license key'], 'Add-on')
ON CONFLICT DO NOTHING;
