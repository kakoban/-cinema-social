# راهنمای پیدا کردن Connection Pooler در Supabase

## مراحل:

### 1. ورود به Dashboard
- برو به: https://supabase.com/dashboard
- لاگین کن
- پروژه **cinema-social** رو انتخاب کن

### 2. رفتن به تنظیمات دیتابیس
- از منوی سمت چپ روی **Settings** کلیک کن (آیکون ⚙️)
- زیرمنو رو باز کن
- روی **Database** کلیک کن

### 3. پیدا کردن Connection string
- صفحه رو به پایین اسکرول کن
- بخش **Connection string** رو پیدا کن
- چند تب میبینی:
  - **URI** (پیش‌فرض)
  - **Host**
  - **JDBC**

### 4. انتخاب Transaction mode
- بالای بخش Connection string، یه سوئیچ هست:
  - **Session** mode
  - **Transaction** mode ← **این رو انتخاب کن**

### 5. کپی کردن
- وقتی **Transaction** mode رو انتخاب کنی، connection string تغییر میکنه
- شکلش اینطوری میشه:
  ```
  postgresql://postgres.gvqvoxgdnijrbczbivgw:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
  ```
- روی دکمه **Copy** کلیک کن

## نکات مهم:

- **Transaction mode** = Connection Pooler (IPv4 سازگار)
- **Session mode** = Direct connection (نیاز به IPv6)
- پورت **6543** = Pooler
- پورت **5432** = Direct

## اگه پیدا نکردی:

1. مطمئن شو پروژه **Active** هست (نه Building)
2. صفحه رو رفرش کن
3. اگه هنوز نیست، ممکنه پروژه هنوز کامل ساخته نشده

## جایگزین: استفاده از Neon Database

اگه Supabase کار نکرد، از Neon استفاده کن:
1. برو به: https://neon.tech
2. ثبت‌نام کن (رایگان)
3. پروژه بساز
4. Connection string رو کپی کن
5. IPv4 سازگار هست
