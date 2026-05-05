# Gumstore Elite — رفع الموقع على GitHub Pages

## الخطوات (5 دقائق فقط)

### 1. إنشاء الـ Repository
- ادخل على [github.com](https://github.com) وسجّل دخول
- اضغط **New repository**
- اسمه مثلاً: `my-store`
- اتركه **Public**
- اضغط **Create repository**

### 2. رفع الملفات
- في صفحة الـ repository الجديد، اضغط **uploading an existing file**
- اسحب **جميع الملفات** من مجلد `gumstore-static` وارفعها
  (index.html، مجلد css، مجلد js)
- اضغط **Commit changes**

### 3. تفعيل GitHub Pages
- اذهب إلى: **Settings → Pages**
- تحت Source: اختر **Deploy from a branch**
- Branch: اختر **main** — Folder: **/ (root)**
- اضغط **Save**
- انتظر دقيقة ثم موقعك سيكون جاهزاً على:
  `https://yourusername.github.io/my-store/`

---

## إضافة نطاق GitHub Pages لـ Firebase Auth (مهم!)

لكي يعمل تسجيل الدخول بـ Google بعد الرفع:
1. اذهب إلى: [Firebase Console](https://console.firebase.google.com)
2. اختر مشروعك ← **Authentication** ← **Settings** ← **Authorized domains**
3. اضغط **Add domain**
4. أضف: `yourusername.github.io`

---

## تعديل الإعدادات

ملف واحد فقط: **`js/config.js`**
- غيّر `siteName` إذا أردت اسماً مختلفاً للموقع
