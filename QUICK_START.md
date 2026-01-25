# ⚡ Quick Start - Smart Business Accounts

## 🎯 Sabse Pehle Ye Karein!

### Problem:
Aapka Supabase connection string **galat port** use kar raha hai, isiliye "Users not found" error aa raha hai.

### Solution (Copy-Paste Ready):

#### 1️⃣ Correct Database URL:
```bash
postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

#### 2️⃣ Vercel Environment Variables (Copy all):
```
DATABASE_URL=postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=umersajjad981@gmail.com
SMTP_PASS=rpcpgcyypwjrdwhs
SMTP_FROM=US Traders <umersajjad981@gmail.com>
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 🚀 Vercel Deployment - 3 Steps

### Step 1: Vercel mein Environment Variables Add Karein
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Upar wale saare variables copy-paste kar dein
3. `NEXT_PUBLIC_APP_URL` mein apna actual URL daalein

### Step 2: Deploy Karein
```bash
vercel --prod
```

### Step 3: Database Setup (Deployment ke baad)
```bash
export DATABASE_URL="postgresql://postgres.wymblxtcvkwnfrvbobnr:629984596908@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
npx prisma generate
npx prisma migrate deploy
npm run seed
```

**Done!** Ab login karein:
- Email: `admin@local.com`
- Password: `us786`

---

## 💻 Local Development - 2 Steps

### Step 1: .env.local File Banayein
```bash
DATABASE_URL="postgresql://postgres:12345678@localhost:5432/smart_accounts"
DIRECT_URL="postgresql://postgres:12345678@localhost:5432/smart_accounts"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=umersajjad981@gmail.com
SMTP_PASS=rpcpgcyypwjrdwhs
SMTP_FROM="US Traders <umersajjad981@gmail.com>"
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Setup & Run
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

Visit: `http://localhost:3000`

---

## 🆘 Still Not Working?

### Quick Checks:
```bash
# 1. Verify environment variables
npm run verify:env

# 2. Check database connection
npx prisma db pull

# 3. Check migration status
npx prisma migrate status

# 4. Reset everything (if needed)
npm run db:reset
```

### Common Fixes:

**Problem:** "Prepared statement already exists"  
**Fix:** Change Port 6543 → 5432

**Problem:** "Users not found"  
**Fix:** Run `npx prisma migrate deploy && npm run seed`

**Problem:** Build fails  
**Fix:** Add `DIRECT_URL` in Vercel environment variables

---

## 📚 Detailed Guides

- **DEPLOYMENT.md** - Complete Urdu/English deployment guide
- **VERCEL_SETUP.md** - Detailed Vercel-specific instructions
- **README.md** - Project overview and features

---

## ⚡ Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm run db:studio        # Open database GUI

# Production
npm run setup:prod       # Automated production setup
npm run verify:env       # Check environment variables

# Database
npm run db:reset         # Reset database (caution!)
npm run seed             # Add admin user
```

---

**Made with ❤️ | Any issues? Check DEPLOYMENT.md**
