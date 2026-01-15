# Xinote Development Account Setup

Quick guide to set up development accounts for testing the Xinote application.

---

## Quick Start (admin/admin)

### Option 1: Automatic Setup (Recommended)

```bash
cd docker/supabase

# Set your Supabase credentials
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the setup script
./create-dev-accounts.sh
```

### Option 2: Manual Setup via Supabase Dashboard

1. **Go to Supabase Dashboard:**
   - Navigate to: `https://supabase.com/dashboard/project/YOUR_PROJECT/auth/users`

2. **Create Auth User:**
   - Click "Add user"
   - Email: `admin@xinote.dev`
   - Password: `admin`
   - Auto Confirm: **YES** ✅
   - Click "Create user"

3. **Load Database Records:**
   - Go to SQL Editor in Supabase Dashboard
   - Open file: `docker/supabase/dev-seed-data.sql`
   - Execute the SQL

4. **Verify:**
   - Login at: `https://xinote.amega.one/login`
   - Email: `admin@xinote.dev`
   - Password: `admin`

---

## Available Dev Accounts

### 1. Admin Account (Primary)
```
Email:    admin@xinote.dev
Password: admin
Name:     Dr. Admin Test
Structure: Xinote Development Clinic
API Key:  xin_dev_admin_test_key_12345
```

**Use for:**
- Primary development testing
- Admin dashboard access
- API integration testing

### 2. Test Account
```
Email:    test@xinote.dev
Password: test123
Name:     Dr. Test User
Structure: Xinote Test Hospital
```

**Use for:**
- Multi-user testing
- Testing user permissions
- Separate test data

### 3. Demo Account
```
Email:    demo@xinote.dev
Password: demo123
Name:     Dr. Demo Medecin
Structure: Hôpital Saint-Louis
```

**Use for:**
- Demonstrations
- Training
- Client presentations

---

## Mobile App Configuration

### Configure Settings in Flutter App

1. **Open the Xinote app**
2. **Go to Settings (⚙️ icon)**
3. **Enter Backend Configuration:**
   ```
   URL du serveur backend: https://xinote.amega.one
   Endpoint API: /api/recordings/upload
   Clé API: xin_dev_admin_test_key_12345
   ```
4. **Save Settings**
5. **Test Connection** - Should show "Connexion réussie"

### Or Update Settings Code Directly

Edit `lib/screens/settings_screen.dart` with default values:

```dart
final _baseUrlController = TextEditingController(text: 'https://xinote.amega.one');
final _webhookController = TextEditingController(text: '/api/recordings/upload');
final _apiKeyController = TextEditingController(text: 'xin_dev_admin_test_key_12345');
```

---

## Sample Data

The dev seed includes:

### Sample Patients
- **PAT-2026-001**: Jean Dupont (45 ans, M) - Hypertension, diabète
- **PAT-2026-002**: Marie Martin (62 ans, F) - Asthme, allergies

### Sample Recordings
- Will be created when you upload from mobile app

---

## Testing Workflow

### 1. Test Admin Dashboard Login

```bash
# Open browser
open https://xinote.amega.one/login

# Login with:
Email: admin@xinote.dev
Password: admin
```

**Expected:**
- ✅ Successful login
- ✅ Redirect to dashboard
- ✅ See recording statistics
- ✅ See sample patients (if any recordings uploaded)

### 2. Test Mobile App Upload

1. **Open Flutter app on device/emulator**
2. **Complete initial setup** with any doctor name
3. **Go to Settings** and configure backend (see above)
4. **Test connection** - should succeed
5. **Create new consultation:**
   - Patient: Test Patient
   - Age: 30
   - Gender: M
   - Medical history: Test consultation
6. **Record audio** (at least 15 seconds)
7. **Save and upload**
8. **Check dashboard** for new recording

### 3. Test API Key Authentication

```bash
# Test upload via API (requires actual M4A file)
curl -X POST https://xinote.amega.one/api/recordings/upload \
  -H "Authorization: xin_dev_admin_test_key_12345" \
  -F "audio_file=@test.m4a" \
  -F "exam_datetime=2026-01-15T14:30:00Z" \
  -F "device_info={\"platform\":\"test\"}"
```

**Expected:**
- ✅ 201 Created response
- ✅ Recording ID returned
- ✅ File stored in Supabase Storage
- ✅ Database record created

---

## Troubleshooting

### "User already exists" Error

**Cause:** Auth account already created
**Solution:** This is fine - the script is idempotent

### "Invalid login credentials" Error

**Cause:** Auth account not created OR wrong password
**Solution:**
1. Check if user exists in Supabase Dashboard > Auth > Users
2. If exists, reset password
3. If not exists, create manually via dashboard

### "Clé API manquante" in Mobile App

**Cause:** API key not configured
**Solution:**
1. Go to Settings in app
2. Enter API key: `xin_dev_admin_test_key_12345`
3. Save settings

### Backend Not Responding

**Cause:** Backend not deployed or URL wrong
**Solution:**
1. Check backend is running: `curl https://xinote.amega.one/api/health`
2. Verify URL in mobile app settings
3. Check Docker containers: `docker ps`

### Database Connection Error

**Cause:** Supabase credentials incorrect
**Solution:**
1. Verify `SUPABASE_URL` in `.env` file
2. Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env`
3. Check Supabase project is active

---

## Security Notes

### ⚠️ Development Only

These accounts are **ONLY for development**:
- ❌ DO NOT use in production
- ❌ DO NOT commit real passwords
- ❌ DO NOT expose API keys publicly

### Production Account Creation

For production, use:
1. **Strong passwords** (minimum 12 characters)
2. **Unique API keys** generated via dashboard
3. **Email verification** enabled
4. **Rate limiting** configured
5. **MFA/2FA** for admin accounts

---

## Database Schema Reference

### xinote.doctors
| Field | Value |
|-------|-------|
| id | a0000000-0000-0000-0000-000000000001 |
| email | admin@xinote.dev |
| full_name | Dr. Admin Test |
| structure | Xinote Development Clinic |
| specialization | General Medicine |
| is_active | TRUE |

### auth.users (Supabase)
| Field | Value |
|-------|-------|
| email | admin@xinote.dev |
| encrypted_password | bcrypt('admin') |
| email_confirmed_at | NOW() |

### xinote.api_keys
| Field | Value |
|-------|-------|
| key_prefix | xin_dev |
| scopes | recordings:upload, recordings:read, transcriptions:read |
| expires_at | 1 year from creation |

---

## Next Steps

After setting up dev accounts:

1. ✅ Test dashboard login
2. ✅ Configure mobile app
3. ✅ Test audio recording
4. ✅ Test upload to backend
5. ✅ Verify transcription pipeline
6. ✅ Test data sync
7. ✅ Review audit logs

---

## Support

If you encounter issues:

1. **Check logs:**
   ```bash
   # Backend logs
   docker logs xinote-backend

   # Database logs
   docker logs supabase-db

   # Mobile app logs
   flutter logs
   ```

2. **Verify configuration:**
   ```bash
   # Check environment variables
   cat docker/.env | grep SUPABASE

   # Test backend health
   curl https://xinote.amega.one/api/health
   ```

3. **Reset dev accounts:**
   ```bash
   # Delete and recreate
   cd docker/supabase
   ./create-dev-accounts.sh
   ```

---

## Files Reference

| File | Purpose |
|------|---------|
| `docker/supabase/dev-seed-data.sql` | Database seed data (doctors, patients, API keys) |
| `docker/supabase/create-dev-accounts.sh` | Automated setup script |
| `DEV_ACCOUNT_SETUP.md` | This documentation |
| `CONFIGURATION_QUICK_START.md` | Mobile app configuration guide |

---

**Last Updated:** 2026-01-15
**Environment:** Development
**Status:** Ready for testing
