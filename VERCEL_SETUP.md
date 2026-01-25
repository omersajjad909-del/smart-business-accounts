# 🚀 Vercel Deployment Setup Guide

## ⚠️ IMPORTANT: Supabase Database Configuration

Aapka Supabase connection string **wrong port** use kar raha hai! 

### ❌ Wrong (Current):
```
postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### ✅ Correct (Use this):
```
postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**Reason:** 
- Port **6543** = Transaction Mode (Pooling) - Migration fail hoti hai
- Port **5432** = Session Mode (Direct) - Migrations ke liye zaruri

---

## 📋 Step-by-Step Deployment

### Step 1: Supabase Dashboard Check Karein

1. Supabase Dashboard → Your Project → Settings → Database
2. **Connection String** section mein jaayen
3. "Session Mode" ya "Direct Connection" select karein
4. Port **5432** wala string copy karein

### Step 2: Vercel Environment Variables

Vercel Dashboard mein jaayen aur ye variables add karein:

```bash
# Database (IMPORTANT: Use Port 5432)
DATABASE_URL=postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres

# Direct URL (Same as DATABASE_URL for Supabase)
DIRECT_URL=postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres

# Email Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=umersajjad981@gmail.com
SMTP_PASS=rpcpgcyypwjrdwhs
SMTP_FROM="US Traders <umersajjad981@gmail.com>"

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Step 3: Deploy to Vercel

```bash
# Install Vercel CLI (agar nahi hai)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Step 4: Database Setup (Important!)

Deployment ke baad ye commands run karein:

```bash
# Set environment variable temporarily for migration
export DATABASE_URL="postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database with admin user
npm run seed
```

### Step 5: Verify Deployment

1. Apni Vercel app URL kholein
2. Login page par jaayen
3. Admin credentials se login karein:
   - **Email:** `admin@local.com`
   - **Password:** `us786`

---

## 🔧 Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create .env.local file
```bash
# Copy from .env.local file that was created
DATABASE_URL="postgresql://postgres:12345678@localhost:5432/smart_accounts"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=umersajjad981@gmail.com
SMTP_PASS=rpcpgcyypwjrdwhs
SMTP_FROM="US Traders <umersajjad981@gmail.com>"
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Setup Local Database
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 🐛 Common Issues & Solutions

### Issue 1: "Prepared statement already exists"
**Cause:** Using pgBouncer (Port 6543) for migrations
**Solution:** Use Port 5432 instead

### Issue 2: "Connection pooling error"
**Cause:** `pgbouncer=true` parameter in connection string
**Solution:** Remove `?pgbouncer=true&connection_limit=1` from DATABASE_URL

### Issue 3: "Users table not found"
**Cause:** Migrations not run properly
**Solution:**
```bash
npx prisma migrate reset --force
npx prisma migrate deploy
npm run seed
```

### Issue 4: Build fails on Vercel
**Cause:** Missing DIRECT_URL environment variable
**Solution:** Add DIRECT_URL in Vercel dashboard (same as DATABASE_URL)

### Issue 5: Email not working
**Cause:** Gmail blocking less secure apps
**Solution:** 
1. Enable 2-Factor Authentication on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password in SMTP_PASS

---

## 📊 Database Connection Modes

### Supabase Port Guide:
- **5432** = Session Mode (Direct) → Use for migrations ✅
- **6543** = Transaction Mode (Pooling) → Use for app queries ⚠️

### For Vercel Deployment:
- Use Port **5432** for both `DATABASE_URL` and `DIRECT_URL`
- Prisma will handle connection pooling automatically

---

## 🔐 Security Checklist

- [ ] Changed default admin password (`us786`)
- [ ] Added all environment variables in Vercel
- [ ] Verified DATABASE_URL uses Port 5432
- [ ] Email credentials are correct
- [ ] NEXT_PUBLIC_APP_URL matches your domain
- [ ] .env files added to .gitignore (already done)

---

## 📞 Need Help?

Check these in order:
1. ✅ Vercel deployment logs
2. ✅ Supabase database connection test
3. ✅ Environment variables in Vercel dashboard
4. ✅ Prisma migrate status: `npx prisma migrate status`

---

## 🎯 Quick Deploy Commands

```bash
# Complete setup in one go
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
vercel --prod
```

---

**Last Updated:** 2026-01-25
**Your Database:** Supabase (Singapore Region)
**Your Email:** umersajjad981@gmail.com
