# Environment Variables برای Vercel

این مقادیر رو در Vercel → Settings → Environment Variables اضافه کن:

## 1. DATABASE_URL
```
postgresql://neondb_owner:npg_BFPIN0GgDf1o@ep-floral-bar-agpdz61w-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

## 2. JWT_SECRET
```
cinema-social-super-secret-key-change-in-production-2024
```

## 3. JWT_ACCESS_EXPIRES
```
15m
```

## 4. JWT_REFRESH_EXPIRES
```
7d
```

## 5. TMDB_API_KEY
```
8e2be4aa080a70388e9d3514dcc73339
```

## نحوه اضافه کردن:
1. Name: DATABASE_URL
2. Value: postgresql://neondb_owner:...
3. Environments: ✅ Production ✅ Preview ✅ Development
4. Add

بعد از اضافه کردن همه، Redeploy کن.
