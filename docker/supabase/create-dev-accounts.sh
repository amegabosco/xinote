#!/bin/bash

# ============================================================
# Xinote Dev Account Setup Script
# ============================================================
# Creates development accounts for testing
# ⚠️  DO NOT RUN IN PRODUCTION
# ============================================================

set -e  # Exit on error

echo ""
echo "================================================"
echo "Xinote Dev Account Setup"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: Missing required environment variables${NC}"
    echo ""
    echo "Please set the following environment variables:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "You can find these in:"
    echo "  1. Supabase Dashboard > Settings > API"
    echo "  2. Your .env file"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} Environment variables found"
echo ""

# Function to create Supabase auth user
create_auth_user() {
    local email=$1
    local password=$2
    local name=$3

    echo "Creating auth account for: $email"

    # Create user via Supabase Admin API
    response=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"email_confirm\": true,
            \"user_metadata\": {
                \"full_name\": \"$name\"
            }
        }")

    # Check if user was created or already exists
    if echo "$response" | grep -q "User already registered"; then
        echo -e "${YELLOW}  ℹ${NC} User already exists: $email"
    elif echo "$response" | grep -q "\"id\""; then
        echo -e "${GREEN}  ✓${NC} Created: $email"
    else
        echo -e "${RED}  ✗${NC} Failed to create: $email"
        echo "  Response: $response"
    fi
}

echo "Step 1: Loading database schema..."
echo ""

# Run the dev seed data SQL script
if [ -f "./dev-seed-data.sql" ]; then
    echo "Running dev-seed-data.sql..."

    # Use psql if available, otherwise provide instructions
    if command -v psql &> /dev/null; then
        # Extract connection details from SUPABASE_URL if it's a postgres:// URL
        if [[ $SUPABASE_URL == postgres://* ]]; then
            psql "$SUPABASE_URL" -f ./dev-seed-data.sql
            echo -e "${GREEN}✓${NC} Database records created"
        else
            echo -e "${YELLOW}ℹ${NC} Please run this SQL manually in Supabase SQL Editor:"
            echo "  File: ./dev-seed-data.sql"
        fi
    else
        echo -e "${YELLOW}ℹ${NC} psql not found. Please run this SQL manually in Supabase SQL Editor:"
        echo "  File: ./dev-seed-data.sql"
    fi
else
    echo -e "${RED}✗${NC} dev-seed-data.sql not found"
    exit 1
fi

echo ""
echo "Step 2: Creating Supabase auth accounts..."
echo ""

# Create auth accounts
create_auth_user "admin@xinote.dev" "admin" "Dr. Admin Test"
create_auth_user "test@xinote.dev" "test123" "Dr. Test User"
create_auth_user "demo@xinote.dev" "demo123" "Dr. Demo Medecin"

echo ""
echo "================================================"
echo "Dev Accounts Setup Complete!"
echo "================================================"
echo ""
echo "You can now log in with:"
echo ""
echo -e "${GREEN}Primary Account:${NC}"
echo "  Email:    admin@xinote.dev"
echo "  Password: admin"
echo ""
echo -e "${GREEN}Test Account:${NC}"
echo "  Email:    test@xinote.dev"
echo "  Password: test123"
echo ""
echo -e "${GREEN}Demo Account:${NC}"
echo "  Email:    demo@xinote.dev"
echo "  Password: demo123"
echo ""
echo "API Key for mobile app:"
echo "  xin_dev_admin_test_key_12345"
echo ""
echo -e "${YELLOW}⚠️  These are DEV accounts - DO NOT use in production!${NC}"
echo ""
echo "Dashboard URL: https://xinote.amega.one/login"
echo ""
