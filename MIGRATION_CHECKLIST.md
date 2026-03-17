
# Supabase Project Migration Checklist

## Target Project Details
- **Project Name:** (New Deployment)
- **Project ID:** `raykfnoptzzsdcvjupzf`
- **URL:** `https://raykfnoptzzsdcvjupzf.supabase.co`
- **Migration Date:** October 2023

## 1. Environment Configuration
- [x] Update `.env` file with new `VITE_SUPABASE_URL`
- [x] Update `.env` file with new `VITE_SUPABASE_ANON_KEY`
- [x] Update `src/lib/customSupabaseClient.js` to rely on env vars
- [x] Update `src/lib/api-endpoints.js` with new Project ID
- [ ] Update CI/CD secrets (GitHub Actions, Netlify, Vercel, etc.) if applicable

## 2. Database Schema Migration (Manual Steps)
Since direct SQL migration isn't automated here, perform these via Supabase Dashboard SQL Editor:

### Tables
- [ ] `profiles` (id [PK, FK auth.users], username, role, plan_tier, etc.)
- [ ] `billing_plans`
- [ ] `license_keys`
- [ ] `user_plans`
- [ ] `payments`
- [ ] `api_keys`
- [ ] `system_settings`
- [ ] `banned_ips`
- [ ] `spam_reports`
- [ ] `newsletter_subscribers`
- [ ] `trial_keys` & `trial_key_limits`
- [ ] `downloads` (storage bucket tracking)
- [ ] `tiktok_accounts`, `videos`, `events`, `comments` (TikTok integration)
- [ ] Forum tables: `forum_categories`, `forum_subforums`, `forum_threads`, `forum_posts`, `post_reactions`, `thread_bookmarks`, `user_follows`
- [ ] RBAC tables: `rbac_roles`, `rbac_permissions`, `rbac_role_permissions`

### Storage Buckets
- [ ] Create bucket: `profiles` (public)
- [ ] Create bucket: `downloads` (private/authenticated)
- [ ] Apply storage policies

### Database Functions (RPC)
Deploy the following functions (ensure SECURITY DEFINER is set):
- [ ] `handle_new_user` (Trigger function)
- [ ] `generate_license_keys`
- [ ] `validate_license_key`
- [ ] `redeem_license_key` / `redeem_license_key_v2`
- [ ] `admin_ban_user`, `admin_ban_ip`
- [ ] `reset_hwid`
- [ ] `get_trial_key_limits`, `create_trial_keys`

### Triggers
- [ ] Add trigger on `auth.users` -> `handle_new_user`

### RLS Policies
- [ ] Enable RLS on all tables
- [ ] Re-apply policies for `profiles` (view all, update own)
- [ ] Re-apply policies for `license_keys` (view own, admin all)
- [ ] Re-apply policies for all other tables matching original schema

## 3. Edge Functions Deployment
Deploy these functions to project `raykfnoptzzsdcvjupzf`:
- [ ] `verify-license-key`
- [ ] `redeem-license-key`
- [ ] `paypal-create-order`
- [ ] `paypal-capture-order`
- [ ] `license-api`
- [ ] `tiktok-auth-callback`

## 4. Third-Party Integrations
- [ ] Update PayPal Webhook URL to point to new Supabase project
- [ ] Update TikTok App Developer Console with new Redirect URIs
- [ ] Update Discord Bot configuration (if applicable)

## 5. Verification
- [ ] Test Sign Up / Sign In
- [ ] Verify `auth-health-check` returns online
- [ ] Generate a test license key via Admin Panel
- [ ] Redeem test license key as a user
- [ ] Check API Endpoint connectivity (browser console network tab)
