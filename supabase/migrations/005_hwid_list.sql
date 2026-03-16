-- Run this in: https://supabase.com/dashboard/project/ugodapqlmajfhvrodlyf/sql/new

-- Add hwid_list array to track multiple devices per key
ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS hwid_list text[] DEFAULT '{}';

-- Backfill existing single hwids into the array
UPDATE license_keys SET hwid_list = ARRAY[hwid] WHERE hwid IS NOT NULL AND (hwid_list IS NULL OR hwid_list = '{}');

-- Ensure max_devices defaults to 1
ALTER TABLE license_keys ALTER COLUMN max_devices SET DEFAULT 1;
UPDATE license_keys SET max_devices = 1 WHERE max_devices IS NULL;
