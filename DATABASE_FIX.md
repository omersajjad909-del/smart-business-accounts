# 🔧 Database Fix - Quick Guide

## ⚠️ Problem: Database Se Data Nahi Utha Raha

**Issue:** DIRECT_URL environment variable missing tha

## ✅ FIXED! Ab Ye Karo:

### **Option 1: Simple Commands (Recommended)**

```bash
# Complete setup (migrations + seed + permissions)
npm run db:setup

# Check status
npm run db:status

# Open database GUI
npm run db:studio
```

### **Option 2: Helper Script**

```bash
# Complete setup
./scripts/db-helper.sh setup

# Just seed
./scripts/db-helper.sh seed

# Just permissions
./scripts/db-helper.sh permissions

# Check status
./scripts/db-helper.sh status
```

### **Option 3: Manual Steps**

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Run migrations
npx prisma migrate deploy

# 3. Seed database
npm run seed

# 4. Setup permissions
npm run permissions:setup
```

---

## 📋 .env File Created

`.env` file ab project mein hai with:
```
DATABASE_URL=your_supabase_url
DIRECT_URL=your_supabase_url (same)
```

Aapko manually set karne ki zaroorat nahi!

---

## ✅ Database Ab Setup Hai

Seed script ne ye kiya:
- ✅ Admin user created: `admin@local.com` / `us786`
- ✅ ACCOUNTANT permissions: 39 configured
- ✅ VIEWER permissions: 21 configured
- ✅ ADMIN: All permissions (automatic)

---

## 🎯 Next Steps

### 1. Verify Setup
```bash
npm run db:status
```

### 2. Check Users
```bash
npm run user:list
```

### 3. Open Database GUI
```bash
npm run db:studio
```

### 4. Login
- Email: `admin@local.com`
- Password: `us786`

---

## 🔧 Available Commands

```bash
# Database
npm run db:setup      # Complete setup
npm run db:status     # Check status
npm run db:studio     # Open GUI
npm run db:reset      # Reset everything

# Users
npm run user:list     # List all users
npm run user:create   # Create new user
npm run user:fix-umer # Fix Umer Sajjad user

# Permissions
npm run permissions:setup  # Setup all permissions

# Seed
npm run seed          # Seed database
```

---

## 🆘 Troubleshooting

### Issue: Still not working

**Check:**
```bash
# 1. Check .env file exists
cat .env

# 2. Check migrations
npm run db:status

# 3. Try complete reset
npm run db:reset
```

### Issue: DIRECT_URL error

**Solution:** `.env` file ab hai, restart karo:
```bash
npm run dev
```

---

## 📊 What's in Database Now?

### Users Table:
- ✅ Admin user (`admin@local.com`)
- ✅ Your user (if added: `umersajjad`)

### RolePermission Table:
- ✅ ACCOUNTANT: 39 permissions
- ✅ VIEWER: 21 permissions

### All Other Tables:
- ✅ Ready for data
- ✅ Migrations applied
- ✅ Schema up-to-date

---

## 💡 Pro Tips

1. **Always use npm run db:setup** for fresh deployment
2. **Check .env file** before running commands
3. **Use db:studio** to view data visually
4. **Backup before db:reset** (it deletes everything!)

---

**Database is now properly configured!** ✅
