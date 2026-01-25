#!/bin/bash

# Database Helper Script
# Automatically sets environment variables for Supabase

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Supabase connection (adjust if different)
export DATABASE_URL="postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
export DIRECT_URL="postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

echo -e "${BLUE}🔧 Database Helper Script${NC}"
echo -e "${BLUE}=========================${NC}\n"

# Check command argument
COMMAND=$1

case $COMMAND in
  "status")
    echo -e "${YELLOW}📊 Checking migration status...${NC}\n"
    npx prisma migrate status
    ;;
    
  "migrate")
    echo -e "${YELLOW}🔄 Running migrations...${NC}\n"
    npx prisma migrate deploy
    ;;
    
  "generate")
    echo -e "${YELLOW}📦 Generating Prisma Client...${NC}\n"
    npx prisma generate
    ;;
    
  "seed")
    echo -e "${YELLOW}🌱 Seeding database...${NC}\n"
    npm run seed
    ;;
    
  "setup")
    echo -e "${YELLOW}🚀 Complete setup...${NC}\n"
    echo -e "${BLUE}1. Generating Prisma Client...${NC}"
    npx prisma generate
    echo -e "\n${BLUE}2. Running migrations...${NC}"
    npx prisma migrate deploy
    echo -e "\n${BLUE}3. Seeding database...${NC}"
    npm run seed
    echo -e "\n${GREEN}✅ Setup complete!${NC}"
    ;;
    
  "permissions")
    echo -e "${YELLOW}🔐 Setting up permissions...${NC}\n"
    npm run permissions:setup
    ;;
    
  "studio")
    echo -e "${YELLOW}🎨 Opening Prisma Studio...${NC}\n"
    npx prisma studio
    ;;
    
  "reset")
    echo -e "${RED}⚠️  WARNING: This will delete all data!${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      echo -e "\n${YELLOW}🗑️  Resetting database...${NC}\n"
      npx prisma migrate reset --force
      echo -e "\n${GREEN}✅ Database reset complete!${NC}"
    else
      echo -e "\n${BLUE}Cancelled.${NC}"
    fi
    ;;
    
  *)
    echo -e "${GREEN}Available commands:${NC}"
    echo ""
    echo -e "  ${BLUE}./scripts/db-helper.sh status${NC}       - Check migration status"
    echo -e "  ${BLUE}./scripts/db-helper.sh migrate${NC}      - Run migrations"
    echo -e "  ${BLUE}./scripts/db-helper.sh generate${NC}     - Generate Prisma Client"
    echo -e "  ${BLUE}./scripts/db-helper.sh seed${NC}         - Seed database"
    echo -e "  ${BLUE}./scripts/db-helper.sh setup${NC}        - Complete setup (all above)"
    echo -e "  ${BLUE}./scripts/db-helper.sh permissions${NC}  - Setup permissions"
    echo -e "  ${BLUE}./scripts/db-helper.sh studio${NC}       - Open Prisma Studio"
    echo -e "  ${BLUE}./scripts/db-helper.sh reset${NC}        - Reset database (⚠️  deletes all)"
    echo ""
    echo -e "${YELLOW}💡 Tip: Use 'setup' for initial deployment${NC}"
    ;;
esac
