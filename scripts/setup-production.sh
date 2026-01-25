#!/bin/bash

# Production Database Setup Script for Vercel Deployment

echo "🚀 Starting Production Database Setup..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it first:"
    echo "export DATABASE_URL='your_connection_string'"
    exit 1
fi

# Verify Port 5432 is being used
if [[ $DATABASE_URL == *":6543/"* ]]; then
    echo "⚠️  WARNING: You are using Port 6543 (Transaction Mode)"
    echo "   This will cause migration failures!"
    echo ""
    echo "   Please use Port 5432 instead:"
    NEW_URL=$(echo $DATABASE_URL | sed 's/:6543\//:5432\//' | sed 's/?pgbouncer=true&connection_limit=1//')
    echo "   export DATABASE_URL='$NEW_URL'"
    exit 1
fi

echo "✅ DATABASE_URL is set correctly (Port 5432)"
echo ""

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma Client"
    exit 1
fi

echo "✅ Prisma Client generated"
echo ""

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check your DATABASE_URL is correct"
    echo "2. Make sure you're using Port 5432"
    echo "3. Verify database is accessible"
    exit 1
fi

echo "✅ Migrations completed successfully"
echo ""

# Seed database
echo "🌱 Seeding database with default data..."
npm run seed

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Seeding failed (may already have data)"
else
    echo "✅ Database seeded successfully"
fi

echo ""
echo "🎉 Production database setup complete!"
echo ""
echo "Default Admin Credentials:"
echo "  Email: admin@local.com"
echo "  Password: us786"
echo ""
echo "⚠️  IMPORTANT: Change the default password after first login!"
echo ""
