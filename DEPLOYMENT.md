# Vercel Deployment Guide - Smart Business Accounts

## 🚀 Vercel پر Deploy کرنے کی ہدایات

### Step 1: Database Setup (PostgreSQL)

Aap ko ek PostgreSQL database chahiye. Options:

1. **Vercel Postgres** (Recommended)
   - Vercel Dashboard → Storage → Create Database → Postgres
   - Connection string copy karein

2. **Supabase** (Free)
   - https://supabase.com
   - New project banayein
   - Settings → Database → Connection string copy karein

3. **Neon** (Free)
   - https://neon.tech
   - New project banayein
   - Connection string copy karein

### Step 2: Vercel پر Project Import کریں

1. Vercel Dashboard par jaayen
2. "Import Project" click karein
3. Apna GitHub repository select karein
4. Configure project:

### Step 3: Environment Variables Set کریں

Vercel Dashboard mein Environment Variables add karein:

```
DATABASE_URL = your_postgres_connection_string
```

**مثال:**
```
DATABASE_URL = postgres://user:password@host:5432/database?sslmode=require
```

### Step 4: Build & Deploy

1. Deploy button click karein
2. Wait for deployment to complete
3. Deployment successful hone ke baad:

### Step 5: Database Migration & Seeding

Terminal mein commands run karein:

```bash
# Migrations run karein
npx prisma migrate deploy

# Default admin user banayein
npm run seed
```

**Default Admin Credentials:**
- Email: `admin@local.com`
- Password: `us786`

### Step 6: Verification

1. Deployed URL kholein
2. Login page par jaayen
3. Admin credentials se login karein

## ⚠️ Common Issues & Solutions

### Issue 1: "Users not found" Error

**Solution:**
```bash
# Database connection check karein
npx prisma db pull

# Migrations deploy karein
npx prisma migrate deploy

# Seed file run karein
npm run seed
```

### Issue 2: Prisma Client Error

**Solution:**
```bash
# Prisma client regenerate karein
npx prisma generate
```

### Issue 3: Build Failed

**Check karein:**
- DATABASE_URL environment variable set hai?
- Database accessible hai?
- Migrations properly run hui hain?

## 🔧 Local Development

```bash
# Dependencies install karein
npm install

# .env file banayein
cp .env.example .env

# DATABASE_URL update karein .env mein

# Migrations run karein
npx prisma migrate dev

# Seed data add karein
npm run seed

# Development server start karein
npm run dev
```

## 📝 Database Schema Updates

Agar aap schema change karte hain:

```bash
# Local development
npx prisma migrate dev --name your_migration_name

# Production (Vercel)
npx prisma migrate deploy
```

## 🔐 Security Notes

1. **Strong Password Use Karein**: Production mein default password change kar dein
2. **Environment Variables**: Kabhi bhi .env file git mein commit na karein
3. **Database Backups**: Regular backups lein

## 📞 Support

Issues face kar rahe hain? Check karein:

1. Vercel Deployment Logs
2. Database Connection String
3. Environment Variables
4. Prisma Migration Status

---

**Developed with ❤️ for Smart Business Management**
