
# خطة إضافة التحقق بالبصمة (المستوى الرابع)

## نظرة عامة
إضافة مستوى تحقق جديد يستخدم **WebAuthn (البصمة/الوجه)** للتأكد من هوية الموظف قبل تسجيل الحضور، مع **رمز OTP** كبديل للأجهزة غير المدعومة.

---

## مسار العمل

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     مسار التحقق بالبصمة                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  الموظف يضغط "تسجيل حضور" في التيليجرام                             │
│              ↓                                                      │
│  البوت يرسل رابط: "اضغط هنا للتحقق من هويتك"                        │
│              ↓                                                      │
│  الموظف يفتح الرابط في المتصفح                                      │
│              ↓                                                      │
│  ┌─────────────────────────────────────────┐                        │
│  │       صفحة التحقق من الهوية             │                        │
│  │                                          │                        │
│  │   [البصمة/الوجه متاح؟]                   │                        │
│  │         ↓ نعم        ↓ لا                │                        │
│  │   [ضع بصمتك]    [أرسلنا رمز OTP]         │                        │
│  │         ↓              ↓                 │                        │
│  │   [تحقق ناجح]    [أدخل الرمز]            │                        │
│  └─────────────────────────────────────────┘                        │
│              ↓                                                      │
│  يتم تسجيل الحضور تلقائياً                                          │
│              ↓                                                      │
│  البوت يرسل تأكيد: "تم تسجيل حضورك بنجاح ✅"                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## الخطوات التفصيلية

### 1. تعديلات قاعدة البيانات

#### 1.1 إضافة أعمدة للشركات
```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS biometric_verification_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS biometric_otp_fallback BOOLEAN DEFAULT true;
```

#### 1.2 إضافة أعمدة للموظفين (التخصيص الفردي)
```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS biometric_verification_enabled BOOLEAN;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS biometric_credential_id TEXT; -- لحفظ WebAuthn credential
```

#### 1.3 جدول لتخزين رموز OTP
```sql
CREATE TABLE biometric_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  otp_code VARCHAR(6) NOT NULL,
  request_type VARCHAR(20) NOT NULL, -- 'check_in' or 'check_out'
  verification_token UUID NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 1.4 جدول لتتبع محاولات التحقق
```sql
CREATE TABLE biometric_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  verification_type VARCHAR(20) NOT NULL, -- 'biometric' or 'otp'
  success BOOLEAN NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 2. صفحة التحقق في الموقع

#### 2.1 إنشاء صفحة `/verify-attendance`
ملف جديد: `src/pages/VerifyAttendance.tsx`

**المكونات:**
- قراءة الـ `token` من URL
- التحقق من صلاحية الـ token
- عرض واجهة البصمة إذا كان الجهاز يدعم WebAuthn
- عرض واجهة OTP إذا لم يكن مدعوماً
- إرسال النتيجة للـ Edge Function

#### 2.2 مكون التحقق بالبصمة
ملف جديد: `src/components/biometric/BiometricVerification.tsx`

```typescript
// يستخدم WebAuthn API
const authenticate = async () => {
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: new Uint8Array(32),
      timeout: 60000,
      userVerification: 'required',
      rpId: window.location.hostname,
      allowCredentials: [/* stored credentials */]
    }
  });
  // إرسال النتيجة للخادم
};
```

#### 2.3 مكون التحقق بـ OTP
ملف جديد: `src/components/biometric/OTPVerification.tsx`

- عرض حقول إدخال الرمز (6 أرقام)
- زر إعادة إرسال الرمز
- عداد تنازلي للصلاحية (5 دقائق)

---

### 3. Edge Functions

#### 3.1 إنشاء `biometric-verification`
ملف جديد: `supabase/functions/biometric-verification/index.ts`

**الوظائف:**
- `POST /initiate` - إنشاء جلسة تحقق جديدة وإرجاع token
- `POST /verify-biometric` - التحقق من البصمة
- `POST /verify-otp` - التحقق من رمز OTP
- `POST /send-otp` - إرسال رمز OTP جديد عبر التيليجرام

#### 3.2 تعديل `telegram-webhook`
إضافة التعامل مع المستوى الرابع:

```typescript
if (effectiveVerificationLevel === 4) {
  // إنشاء token للتحقق
  const verificationToken = crypto.randomUUID();
  
  // حفظ الجلسة
  await setSession('pending_biometric', { 
    token: verificationToken,
    request_type: 'check_in' 
  });
  
  // إرسال الرابط
  const verifyUrl = `${SITE_URL}/verify-attendance?token=${verificationToken}`;
  await sendMessage(botToken, chatId, 
    '🔐 <b>التحقق من الهوية مطلوب</b>\n\n' +
    'لتسجيل حضورك، يجب التحقق من هويتك أولاً.\n\n' +
    '👆 اضغط على الرابط أدناه وضع بصمتك:',
    { inline_keyboard: [[
      { text: '🔐 التحقق الآن', url: verifyUrl }
    ]]}
  );
}
```

---

### 4. إعدادات الشركة

#### 4.1 تعديل `AttendanceVerificationSettings.tsx`
إضافة المستوى الرابع:

```typescript
{/* Level 4 - Biometric */}
<div className={`flex items-start p-4 border rounded-lg...`}>
  <RadioGroupItem value="4" id="level-4" />
  <div className="flex-1">
    <Label className="flex items-center gap-2">
      <Fingerprint className="w-4 h-4 text-purple-500" />
      المستوى الرابع - التحقق بالبصمة
    </Label>
    <p className="text-sm text-muted-foreground">
      التأكد من هوية الموظف بالبصمة أو التعرف على الوجه
    </p>
  </div>
</div>

{/* Level 4 Settings */}
{verificationLevel === 4 && (
  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
    <Checkbox
      checked={biometricOtpFallback}
      onCheckedChange={setBiometricOtpFallback}
    />
    <Label>السماح برمز OTP كبديل للأجهزة غير المدعومة</Label>
  </div>
)}
```

---

### 5. تسجيل البصمة (مرة واحدة)

#### 5.1 صفحة تسجيل البصمة للموظف
ملف جديد: `src/pages/RegisterBiometric.tsx`

- تُعرض للموظف عند أول استخدام
- تسجل الـ credential في قاعدة البيانات
- يمكن الوصول إليها من التيليجرام أو الموقع

---

## الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `supabase/migrations/xxx_add_biometric.sql` | جديد - تعديلات قاعدة البيانات |
| `src/pages/VerifyAttendance.tsx` | جديد - صفحة التحقق |
| `src/pages/RegisterBiometric.tsx` | جديد - تسجيل البصمة |
| `src/components/biometric/BiometricVerification.tsx` | جديد |
| `src/components/biometric/OTPVerification.tsx` | جديد |
| `supabase/functions/biometric-verification/index.ts` | جديد |
| `supabase/functions/telegram-webhook/index.ts` | تعديل - إضافة المستوى 4 |
| `src/components/settings/AttendanceVerificationSettings.tsx` | تعديل |
| `src/components/employees/EmployeeVerificationForm.tsx` | تعديل |
| `src/App.tsx` | تعديل - إضافة Route جديد |

---

## الأمان

1. **الـ Token** يكون صالحاً لمدة 10 دقائق فقط
2. **رمز OTP** يكون صالحاً لمدة 5 دقائق
3. **تسجيل كل المحاولات** في `biometric_verification_logs`
4. **Rate Limiting** على محاولات OTP (3 محاولات كحد أقصى)
5. **RLS Policies** مناسبة لكل الجداول الجديدة

---

## ملاحظات تقنية

- **WebAuthn** يتطلب HTTPS (متوفر في بيئة الإنتاج)
- **دعم المتصفحات**: Chrome, Safari, Firefox, Edge (جميع الإصدارات الحديثة)
- **دعم الأجهزة**: معظم الهواتف الذكية الحديثة تدعم البصمة أو Face ID
- **OTP** يُرسل عبر التيليجرام نفسه لضمان وصوله

---

## هل تريد المتابعة بتنفيذ هذه الخطة؟
