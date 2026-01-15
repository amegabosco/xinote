-- ============================================================
-- XINOTE DEV SEED DATA
-- ============================================================
-- Creates development accounts for testing
-- ⚠️  DO NOT RUN IN PRODUCTION - CONTAINS WEAK PASSWORDS
-- ============================================================

-- Ensure we're using the xinote schema
SET search_path TO xinote, public;

-- ============================================================
-- DEV DOCTOR ACCOUNT: admin@xinote.dev / admin
-- ============================================================

-- Insert doctor record into xinote.doctors table
INSERT INTO xinote.doctors (
    id,
    email,
    full_name,
    structure,
    specialization,
    phone,
    is_active,
    created_at,
    updated_at,
    settings
) VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'admin@xinote.dev',
    'Dr. Admin Test',
    'Xinote Development Clinic',
    'General Medicine',
    '+33 1 23 45 67 89',
    TRUE,
    NOW(),
    NOW(),
    '{"theme": "light", "language": "fr", "notifications": true}'::jsonb
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    structure = EXCLUDED.structure,
    updated_at = NOW();

-- ============================================================
-- ADDITIONAL DEV ACCOUNTS (Optional)
-- ============================================================

-- Dev Doctor #2: test@xinote.dev / test123
INSERT INTO xinote.doctors (
    id,
    email,
    full_name,
    structure,
    specialization,
    is_active,
    created_at,
    updated_at,
    settings
) VALUES (
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'test@xinote.dev',
    'Dr. Test User',
    'Xinote Test Hospital',
    'Cardiology',
    TRUE,
    NOW(),
    NOW(),
    '{"theme": "dark", "language": "fr", "notifications": false}'::jsonb
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    structure = EXCLUDED.structure,
    updated_at = NOW();

-- Dev Doctor #3: demo@xinote.dev / demo123
INSERT INTO xinote.doctors (
    id,
    email,
    full_name,
    structure,
    specialization,
    is_active,
    created_at,
    updated_at,
    settings
) VALUES (
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'demo@xinote.dev',
    'Dr. Demo Medecin',
    'Hôpital Saint-Louis',
    'Pediatrics',
    TRUE,
    NOW(),
    NOW(),
    '{}'::jsonb
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    structure = EXCLUDED.structure,
    updated_at = NOW();

-- ============================================================
-- SAMPLE PATIENT DATA (For dev/testing)
-- ============================================================

-- Sample patient for admin doctor
INSERT INTO xinote.patients (
    id,
    doctor_id,
    encrypted_name,
    encrypted_age,
    encrypted_gender,
    encrypted_medical_history,
    patient_code,
    created_at,
    updated_at,
    last_consultation_at,
    tags
) VALUES (
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Jean Dupont', -- In production, this would be PGP encrypted
    '45',
    'M',
    'Hypertension artérielle, diabète type 2',
    'PAT-2026-001',
    NOW(),
    NOW(),
    NOW(),
    ARRAY['test', 'dev']::text[]
)
ON CONFLICT (patient_code) DO UPDATE SET
    updated_at = NOW();

-- Sample patient #2
INSERT INTO xinote.patients (
    id,
    doctor_id,
    encrypted_name,
    encrypted_age,
    encrypted_gender,
    encrypted_medical_history,
    patient_code,
    created_at,
    updated_at,
    last_consultation_at,
    tags
) VALUES (
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Marie Martin',
    '62',
    'F',
    'Asthme, allergie au pollen',
    'PAT-2026-002',
    NOW(),
    NOW(),
    NOW() - INTERVAL '2 days',
    ARRAY['test']::text[]
)
ON CONFLICT (patient_code) DO UPDATE SET
    updated_at = NOW();

-- ============================================================
-- SAMPLE API KEYS
-- ============================================================

-- API Key for admin doctor: xin_dev_admin_test_key_12345
-- This is a dev key - in production, generate secure keys via API
INSERT INTO xinote.api_keys (
    id,
    doctor_id,
    key_hash,
    key_prefix,
    description,
    scopes,
    is_active,
    expires_at,
    created_at,
    last_used_at
) VALUES (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    crypt('dev_admin_test_key_12345', gen_salt('bf', 12)),
    'xin_dev',
    'Development Admin API Key',
    ARRAY['recordings:upload', 'recordings:read', 'recordings:delete', 'transcriptions:read']::text[],
    TRUE,
    NOW() + INTERVAL '1 year',
    NOW(),
    NULL
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Show created doctors
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'DEV SEED DATA LOADED SUCCESSFULLY';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created Doctor Accounts:';
    RAISE NOTICE '';
END $$;

SELECT
    email,
    full_name,
    structure,
    specialization,
    is_active,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM xinote.doctors
WHERE email LIKE '%@xinote.dev'
ORDER BY email;

-- ============================================================
-- SUPABASE AUTH SETUP INSTRUCTIONS
-- ============================================================

/*
 * IMPORTANT: SUPABASE AUTH ACCOUNT CREATION
 *
 * The SQL above creates records in xinote.doctors table, but Supabase
 * authentication requires separate auth.users records.
 *
 * To create auth accounts, use ONE of these methods:
 *
 * METHOD 1: Via Supabase Dashboard (Recommended for Dev)
 * --------------------------------------------------------
 * 1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/users
 * 2. Click "Add user"
 * 3. Enter credentials:
 *    - Email: admin@xinote.dev
 *    - Password: admin
 *    - Auto Confirm: YES
 * 4. Repeat for other dev accounts
 *
 * METHOD 2: Via Supabase CLI
 * --------------------------------------------------------
 * npx supabase users create admin@xinote.dev --password admin
 * npx supabase users create test@xinote.dev --password test123
 * npx supabase users create demo@xinote.dev --password demo123
 *
 * METHOD 3: Via SQL (Direct Insert) - Advanced
 * --------------------------------------------------------
 * See create-dev-auth-accounts.sql for full SQL inserts
 *
 * METHOD 4: Via REST API
 * --------------------------------------------------------
 * curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/signup \
 *   -H "apikey: YOUR_ANON_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"admin@xinote.dev","password":"admin"}'
 *
 * VERIFICATION:
 * --------------------------------------------------------
 * SELECT email, confirmed_at FROM auth.users WHERE email LIKE '%@xinote.dev';
 *
 */

-- ============================================================
-- DEV ACCOUNT SUMMARY
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'DEV ACCOUNT CREDENTIALS';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Primary Dev Account:';
    RAISE NOTICE '  Email:    admin@xinote.dev';
    RAISE NOTICE '  Password: admin';
    RAISE NOTICE '  Name:     Dr. Admin Test';
    RAISE NOTICE '  API Key:  xin_dev_admin_test_key_12345';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Account #2:';
    RAISE NOTICE '  Email:    test@xinote.dev';
    RAISE NOTICE '  Password: test123';
    RAISE NOTICE '  Name:     Dr. Test User';
    RAISE NOTICE '';
    RAISE NOTICE 'Demo Account #3:';
    RAISE NOTICE '  Email:    demo@xinote.dev';
    RAISE NOTICE '  Password: demo123';
    RAISE NOTICE '  Name:     Dr. Demo Medecin';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  REMEMBER: These are DEV accounts only!';
    RAISE NOTICE '⚠️  DO NOT use in production!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create Supabase auth accounts (see instructions above)';
    RAISE NOTICE '2. Login at: https://xinote.amega.one/login';
    RAISE NOTICE '3. Configure mobile app with API key';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
END $$;
