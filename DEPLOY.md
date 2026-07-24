# Cinema Social - Vercel Deployment Guide

## 📋 پیش‌نیازها

1. حساب GitHub
2. حساب Vercel (رایگان)
3. حساب Supabase (رایگان - برای دیتابیس)
4. حساب Railway (رایگان - برای Socket.IO)

## 🗄️ قدم 1: ساخت دیتابیس Supabase

1. برو به [supabase.com](https://supabase.com)
2. ثبت‌نام کن (رایگان)
3. پروژه جدید بساز:
   - Name: `cinema-social`
   - Database Password: یه رمز قوی بذار
   - Region: `Northeast Asia (Tokyo)` یا هر منطقه نزدیک
4. صبر کن تا پروژه ساخته بشه (~2 دقیقه)
5. برو به Settings → Database
6. Connection string رو کپی کن (URI format):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## 🚀 قدم 2: Deploy به Vercel

### روش 1: با Vercel CLI

```bash
# نصب Vercel CLI
npm i -g vercel

# لاگین
vercel login

# در پوشه پروژه
cd E:\phase2\SINAMAAAA

# Deploy
vercel

# تنظیم environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add TMDB_API_KEY
vercel env add NEXT_PUBLIC_SOCKET_URL
```

### روش 2: با GitHub (توصیه شده)

1. کد رو به GitHub پوش کن:
   ```bash
   cd E:\phase2\SINAMAAAA
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin refactoring-hatching-pascal-phase-2
   ```

2. برو به [vercel.com](https://vercel.com)
3. روی "Add New Project" کلیک کن
4. ریپو GitHub رو انتخاب کن
5. تنظیمات:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

6. Environment Variables اضافه کن:
   ```
   DATABASE_URL = postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
   JWT_SECRET = cinema-social-super-secret-key-change-in-production-2024
   JWT_ACCESS_EXPIRES = 15m
   JWT_REFRESH_EXPIRES = 7d
   TMDB_API_KEY = 8e2be4aa080a70388e9d3514dcc73339
   NEXT_PUBLIC_SOCKET_URL = https://your-socket-server.railway.app
   ```

7. Deploy!

## 🔌 قدم 3: Socket.IO Server روی Railway

Socket.IO نمیتونه روی Vercel اجرا بشه (سرورلس هست). باید جداگانه دیپلوی بشه.

1. برو به [railway.app](https://railway.app)
2. ثبت‌نام کن (رایگان - 5$ ماهانه)
3. New Project → Deploy from GitHub
4. یه ریپو جدید برای Socket.IO بساز:
   ```bash
   # پوشه جدید بساز
   mkdir cinema-socket-server
   cd cinema-socket-server
   git init
   ```

5. فایل `server.ts` رو کپی کن از `mini-services/realtime-service/index.ts`

6. `package.json` بساز:
   ```json
   {
     "name": "cinema-socket-server",
     "version": "1.0.0",
     "scripts": {
       "start": "npx tsx server.ts"
     },
     "dependencies": {
       "socket.io": "^4.8.3",
       "tsx": "^4.0.0"
     }
   }
   ```

7. پوش کن به GitHub
8. در Railway دیپلوی کن
9. URL سرور رو کپی کن و در Vercel به عنوان `NEXT_PUBLIC_SOCKET_URL` ست کن

## 🗃️ قدم 4: اجرای Migration

بعد از دیپلوی، باید دیتابیس رو migrate کنی:

```bash
# در لوکال، با DATABASE_URL جدید
DATABASE_URL="postgresql://..." npx prisma db push

# یا اگه میخوای seed کنی
DATABASE_URL="postgresql://..." npx prisma db seed
```

## ✅ قدم 5: تست

1. آدرس Vercel رو باز کن
2. ثبت‌نام کن
3. یه اتاق بساز
4. تست کن

## ⚠️ نکات مهم

- **JWT_SECRET** رو عوض کن در پروداکشن
- **TMDB_API_KEY** مال خودته، میتونی نگهش داری
- **Socket.IO** باید جداگانه دیپلوی بشه
- **دیتابیس** باید PostgreSQL باشه (نه SQLite)

## 🔗 لینک‌های مفید

- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Prisma + Vercel](https://www.prisma.io/docs/guides/deployment/deploying-to-vercel)
