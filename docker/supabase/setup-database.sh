#!/bin/bash

#####################################################
# Xinote Supabase Database Setup Script
# Automatically configures database schema and storage
#####################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🗄️  Xinote Database Setup${NC}"
echo "================================"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql is not installed${NC}"
    echo "Install it with: apt-get install postgresql-client"
    exit 1
fi

# Configuration
SUPABASE_DIR="/opt/supabase-project"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Step 1: Get Supabase connection details
echo -e "\n${YELLOW}📋 Getting Supabase connection details...${NC}"

if [ ! -f "$SUPABASE_DIR/.env" ]; then
    echo -e "${RED}❌ Supabase .env file not found at $SUPABASE_DIR/.env${NC}"
    exit 1
fi

# Load Supabase environment variables
source "$SUPABASE_DIR/.env"

# Get database password
DB_PASSWORD="${POSTGRES_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Could not find database password in Supabase config${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase configuration loaded${NC}"

# Step 2: Test database connection
echo -e "\n${YELLOW}🔌 Testing database connection...${NC}"

# Connect to the database via Docker
if ! docker exec supabase-db psql -U postgres -d postgres -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${RED}❌ Could not connect to database${NC}"
    echo "Is Supabase running? Check with: docker ps | grep supabase"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Step 3: Run main schema
echo -e "\n${YELLOW}📝 Creating database schema...${NC}"

docker exec -i supabase-db psql -U postgres -d postgres < "$SCRIPT_DIR/schema.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema created successfully${NC}"
else
    echo -e "${RED}❌ Schema creation failed${NC}"
    exit 1
fi

# Step 4: Run storage setup
echo -e "\n${YELLOW}🗂️  Configuring storage...${NC}"

docker exec -i supabase-db psql -U postgres -d postgres < "$SCRIPT_DIR/storage-setup.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Storage configured successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Storage setup had warnings (this is normal if bucket exists)${NC}"
fi

# Step 5: Run database migrations
echo -e "\n${YELLOW}🔄 Running database migrations...${NC}"

MIGRATIONS_DIR="$(dirname $(dirname "$SCRIPT_DIR"))/database/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
    MIGRATION_COUNT=0
    for migration in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            MIGRATION_FILE=$(basename "$migration")
            echo -e "${BLUE}  → Applying $MIGRATION_FILE${NC}"

            docker exec -i supabase-db psql -U postgres -d postgres < "$migration"

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}    ✅ $MIGRATION_FILE applied${NC}"
                MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
            else
                echo -e "${YELLOW}    ⚠️  $MIGRATION_FILE had warnings (may already exist)${NC}"
            fi
        fi
    done

    if [ $MIGRATION_COUNT -gt 0 ]; then
        echo -e "${GREEN}✅ Applied $MIGRATION_COUNT migration(s)${NC}"
    else
        echo -e "${YELLOW}⚠️  No new migrations applied${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Migrations directory not found: $MIGRATIONS_DIR${NC}"
fi

# Step 6: Verify tables were created
echo -e "\n${YELLOW}🔍 Verifying database setup...${NC}"

TABLES=$(docker exec supabase-db psql -U postgres -d postgres -t -c "
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'xinote'
    AND table_name IN ('doctors', 'patients', 'recordings', 'transcriptions', 'audit_log', 'api_keys', 'report_metadata');
")

TABLES=$(echo $TABLES | tr -d ' ')

if [ "$TABLES" -eq 7 ]; then
    echo -e "${GREEN}✅ All 7 tables created successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Expected 7 tables, found $TABLES${NC}"
fi

# Step 7: Show table information
echo -e "\n${BLUE}📊 Database Tables:${NC}"
docker exec supabase-db psql -U postgres -d postgres -c "
    SELECT table_name,
           pg_size_pretty(pg_total_relation_size(('xinote.' || quote_ident(table_name))::regclass)) as size
    FROM information_schema.tables
    WHERE table_schema = 'xinote'
    AND table_name IN ('doctors', 'patients', 'recordings', 'transcriptions', 'audit_log', 'api_keys', 'storage_quotas', 'report_metadata')
    ORDER BY table_name;
"

# Step 8: Get Supabase credentials for .env file
echo -e "\n${BLUE}🔑 Supabase Credentials for Xinote .env:${NC}"
echo "================================"

# Get the anon key
ANON_KEY=$(docker exec supabase-db psql -U postgres -d postgres -t -c "
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE name = 'anon_key'
    LIMIT 1;
" 2>/dev/null || echo "")

# Get service role key
SERVICE_ROLE_KEY=$(docker exec supabase-db psql -U postgres -d postgres -t -c "
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
" 2>/dev/null || echo "")

# If vault lookup fails, try getting from .env or config
if [ -z "$ANON_KEY" ]; then
    ANON_KEY="${ANON_KEY:-$(grep ANON_KEY $SUPABASE_DIR/.env | cut -d'=' -f2 || echo 'Check Supabase Studio')}"
fi

if [ -z "$SERVICE_ROLE_KEY" ]; then
    SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-$(grep SERVICE_ROLE_KEY $SUPABASE_DIR/.env | cut -d'=' -f2 || echo 'Check Supabase Studio')}"
fi

echo "SUPABASE_URL=http://supabase-kong:8000"
echo "SUPABASE_ANON_KEY=${ANON_KEY}"
echo "SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}"

echo -e "\n${YELLOW}⚠️  Copy these values to /opt/xinote-backend/.env${NC}"

# Step 9: Create a test doctor account (optional)
echo -e "\n${YELLOW}👤 Create test doctor account? (y/N)${NC}"
read -r CREATE_TEST_DOCTOR

if [ "$CREATE_TEST_DOCTOR" = "y" ] || [ "$CREATE_TEST_DOCTOR" = "Y" ]; then
    echo -e "${YELLOW}Creating test doctor account...${NC}"

    docker exec supabase-db psql -U postgres -d postgres -c "
        INSERT INTO xinote.doctors (
            id,
            email,
            full_name,
            structure,
            specialization
        ) VALUES (
            '00000000-0000-0000-0000-000000000001',
            'dr.test@xinote.com',
            'Dr. Test Account',
            'Test Hospital',
            'General Medicine'
        )
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, full_name;
    "

    echo -e "${GREEN}✅ Test doctor account created${NC}"
    echo -e "${BLUE}Email: dr.test@xinote.com${NC}"
    echo -e "${BLUE}ID: 00000000-0000-0000-0000-000000000001${NC}"
fi

# Step 10: Summary
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo -e "${GREEN}================================${NC}"

echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Copy the Supabase credentials above to /opt/xinote-backend/.env"
echo "2. Update OPENAI_API_KEY in .env"
echo "3. Generate JWT_SECRET and ENCRYPTION_KEY:"
echo "   openssl rand -base64 32"
echo "4. Deploy the backend:"
echo "   cd /opt/xinote-backend && ./deploy.sh"

echo -e "\n${BLUE}Useful commands:${NC}"
echo "  View tables:    docker exec supabase-db psql -U postgres -d postgres -c '\dt xinote.*'"
echo "  View doctors:   docker exec supabase-db psql -U postgres -d postgres -c 'SELECT * FROM xinote.doctors;'"
echo "  View RLS:       docker exec supabase-db psql -U postgres -d postgres -c '\d+ xinote.recordings'"
echo "  Drop schema:    docker exec supabase-db psql -U postgres -d postgres -c 'DROP SCHEMA xinote CASCADE;'"

echo -e "\n${GREEN}🎉 Setup completed successfully!${NC}"
