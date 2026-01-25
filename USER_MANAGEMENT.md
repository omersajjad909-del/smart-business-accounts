# 👥 User Management Guide

## ⚠️ IMPORTANT: Login Email Se Hota Hai!

**System email field use karta hai login ke liye, username ya name nahi!**

---

## 🔧 Aapki Current Problem

Aapne Supabase mein manually user add kiya:
- Name: "Umer Sajjad"
- Password: "us786"
- Role: "ADMIN"

**2 Problems:**
1. ❌ Password plain text hai (bcrypt hash nahi)
2. ❌ Login username se try kar rahe hain, email se nahi

---

## ✅ Quick Fix (Apne User Ko Theek Karein)

### Option 1: Email Pata Hai?

Agar aapne email add kiya tha Supabase mein:

```bash
# Pehle users list check karein
npm run user:list

# Phir password fix karein
npm run user:fix "your-email@example.com" "us786"
```

### Option 2: Email Yaad Nahi?

```bash
# Sab users dekho
npm run user:list

# Jo email dikhay, usse fix karo
npm run user:fix "found-email@example.com" "us786"
```

### Option 3: Naya User Banao

```bash
npm run user:create "Umer Sajjad" "umer@example.com" "us786" "ADMIN"
```

---

## 📋 Complete Commands

### 1. List All Users
```bash
npm run user:list
```
Shows all users with:
- Name
- Email (use this for login!)
- Role
- Active status

### 2. Create New User
```bash
npm run user:create "<name>" "<email>" "<password>" "<role>"
```

**Example:**
```bash
npm run user:create "Umer Sajjad" "umer@traders.com" "us786" "ADMIN"
```

**Roles:**
- `ADMIN` - Full access
- `ACCOUNTANT` - Limited accounting access
- `VIEWER` - Read-only access

### 3. Fix Existing User Password
```bash
npm run user:fix "<email>" "<new-password>"
```

**Example:**
```bash
npm run user:fix "umer@traders.com" "newpassword123"
```

### 4. Reset to Default Admin
```bash
npm run seed
```
Creates:
- Email: `admin@local.com`
- Password: `us786`
- Role: `ADMIN`

---

## 🎯 Step-by-Step Solution (Aapke Liye)

### Step 1: Check Current Users
```bash
npm run user:list
```

### Step 2: Choose One Option:

#### Option A: Supabase User Ko Fix Karein
```bash
# Agar email "umer@something.com" hai:
npm run user:fix "umer@something.com" "us786"
```

#### Option B: Naya Proper User Banayein
```bash
npm run user:create "Umer Sajjad" "umer.sajjad@traders.com" "us786" "ADMIN"
```

#### Option C: Default Admin Use Karein
```bash
npm run seed
# Then login with: admin@local.com / us786
```

### Step 3: Login Karein
- **Email:** jo aapne set kiya (username NAHI!)
- **Password:** us786

---

## 🔐 Password Security

### Why Bcrypt?
- Plain text passwords unsafe hain
- Database hack ho jaye to passwords visible hongay
- Bcrypt hash one-way encryption hai

### Manual User Add Mat Karein!
Supabase mein direct table edit karke user add karna wrong hai because:
1. Password plain text save hoga
2. System bcrypt hash expect karta hai
3. Login fail hogi

**Always use scripts:**
- `npm run user:create` - New user
- `npm run user:fix` - Fix password
- `npm run seed` - Default admin

---

## 📱 Login Form Explained

Login form mein:
- **Email field** → User ka email daalein (required)
- **Password field** → Password daalein

**Common Mistakes:**
- ❌ Username dalna (system username field nahi hai)
- ❌ Name dalna (system name se login nahi hota)
- ✅ Email dalna (correct!)

---

## 🐛 Troubleshooting

### Problem: "Invalid email or password"
**Check:**
1. Email correct hai? (`npm run user:list` se verify karein)
2. User active hai? (list mein ✅ dikhna chahiye)
3. Password bcrypt hash hai? (scripts use ki thi?)

**Solution:**
```bash
npm run user:fix "your-email@example.com" "us786"
```

### Problem: User not found
**Check database:**
```bash
npm run user:list
```

**If empty:**
```bash
npm run seed
```

### Problem: Multiple users, confusion hai
**Delete all and start fresh:**
```bash
# Careful! This deletes everything
npm run db:reset
```

Then create proper user:
```bash
npm run user:create "Umer Sajjad" "umer@traders.com" "us786" "ADMIN"
```

---

## 💡 Best Practices

### Production Deployment:
1. ✅ Strong passwords use karein
2. ✅ Real email addresses use karein
3. ✅ Default admin password change karein
4. ✅ Unnecessary users delete karein

### Development:
1. ✅ Use seed script: `npm run seed`
2. ✅ Default credentials use karein initially
3. ✅ Scripts se users manage karein

### Security:
1. ✅ Never commit .env files
2. ✅ Use bcrypt (already done by scripts)
3. ✅ Change default passwords
4. ✅ Deactivate old users (don't delete, set active=false)

---

## 🔄 User Roles Explained

### ADMIN
- Full system access
- Can create/edit/delete users
- All permissions

### ACCOUNTANT
- Can create vouchers
- View accounts
- Limited reports access
- Cannot manage users

### VIEWER
- Read-only access
- View reports
- View accounts
- Cannot create/edit anything

---

## 📞 Quick Reference

```bash
# List users
npm run user:list

# Create user
npm run user:create "Name" "email@example.com" "password" "ROLE"

# Fix password
npm run user:fix "email@example.com" "newpassword"

# Reset everything
npm run seed

# Open database GUI
npm run db:studio
```

---

## 🎯 Your Immediate Next Steps

1. **Run this now:**
   ```bash
   npm run user:list
   ```

2. **Check output** - Aapko apna user dikhega with email

3. **Fix password:**
   ```bash
   npm run user:fix "your-shown-email" "us786"
   ```

4. **Login with:**
   - Email: (jo list mein dikha)
   - Password: us786

5. **After successful login:**
   - Go to Settings → Change Password
   - Use strong password

---

**Made with ❤️ | Questions? Check DEPLOYMENT.md**
