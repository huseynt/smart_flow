# Bravo Smart Flow

Bravo Smart Flow — Next.js 14 + Firebase Authentication + TypeScript ilə qurulmuş, tam yerli (Azərbaycanca, İngiliscə, Rusca) tətbiqdir.

## Özəlliklər

✨ **Firebase Email/Password Authentication**
- Qeydiyyat, Giriş, Şifrəni Sıfırla
- Middleware-d route protection
- Avtomatik `onAuthStateChanged` listener

🌐 **Dil Dəstəyi**
- Azərbaycanca (🇦🇿)
- İngiliscə (🇬🇧)
- Rusca (🇷🇺)

🎨 **Dark/Light Tema**
- next-themes ilə tema toggle
- Sistem ayarlarını izləyə bilər
- localStorage-da saxlanır

📐 **Dashboard UI**
- Sidebar navigasiya (collapsible mobile menu)
- Header (user menu, theme toggle)
- Responsive design

✅ **Form Validation**
- React Hook Form
- Zod schema validation
- Azərbaycanca error mesajları

## Qurulum

### 1. Layihə Klonlama

```bash
git clone <repo-url>
cd bravo-smart-flow
```

### 2. Dependencies İnstallasiyası

```bash
npm install
```

### 3. Firebase Konfiqurasiyası

#### 3.1 Firebase Console-da Yeni Layihə Yaratma

- [Firebase Console](https://console.firebase.google.com/) saytına gedin
- **New Project** düyməsinə basın
- Layihə adını daxil edin (məs. "bravo-smart-flow")
- **Create Project** düyməsinə basın

#### 3.2 Web App Əlavə Etmə

- Layihəyə daxil olun
- **Project Settings** səhifəsinə keçin
- **Your apps** bölməsində **Web** ikonu seçin
- App adını daxil edin (məs. "bravo-web")
- `firebaseConfig` məlumatlarını kopyalayın

#### 3.3 Authentication Aktiv Etmə

- **Authentication** bölməsinə geçin
- **Get started** düyməsinə basın
- **Email/Password** metodunu seçin
- **Enable** düyməsinə basın

#### 3.4 Environment Variables Tənzimləmə

```bash
# .env.local faylını yaratın
cp .env.local.example .env.local
```

`.env.local` faylını Firebase məlumatlarınız ilə doldurun:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Development Server Başlatma

```bash
npm run dev
```

Server `http://localhost:3000` adresində açılacaq.

## Qovluq Strukturu

```
bravo-smart-flow/
├── app/
│   ├── (auth)/              # Auth səhifələri grupu
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── layout.tsx
│   ├── (dashboard)/         # Dashboard səhifələri grupu
│   │   ├── home/
│   │   ├── settings/
│   │   │   ├── account/
│   │   │   ├── theme/
│   │   │   └── language/
│   │   └── layout.tsx
│   ├── layout.tsx           # Root layout (providers)
│   ├── page.tsx             # Root redirect
│   └── globals.css
├── components/
│   ├── ui/                  # Reusable components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── ThemeToggle.tsx
│   ├── auth/                # Auth form components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ForgotPasswordForm.tsx
│   └── dashboard/           # Dashboard components
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── Logo.tsx
├── lib/
│   ├── firebase.ts          # Firebase init
│   ├── auth.ts              # Auth functions
│   ├── validations.ts       # Zod schemas
│   └── errorMessages.ts     # Error message translations
├── context/
│   └── AuthContext.tsx      # Auth context provider
├── hooks/
│   └── useAuth.ts           # useAuth hook
├── types/
│   └── index.ts             # TypeScript interfaces
├── middleware.ts            # Route protection
├── tailwind.config.ts       # Tailwind configuration
├── .env.local.example       # Environment template
└── package.json
```

## Səhifələr

### Auth Səhifələri

- **`/login`** — Giriş formu
- **`/register`** — Qeydiyyat formu
- **`/forgot-password`** — Şifrə sıfırlama

### Dashboard Səhifələri

- **`/home`** — Dashboard home (xoş gəlmə mesajı)
- **`/settings/account`** — Hesab parametrləri
- **`/settings/theme`** — Tema seçimi (Light/Dark/System)
- **`/settings/language`** — Dil seçimi (AZ/EN/RU)

## Build & Deployment

### Build

```bash
npm run build
```

### Production Start

```bash
npm start
```

### Lint

```bash
npm run lint
```

## Texnologiyalar

- **Next.js 16** — React framework
- **React 19** — UI library
- **TypeScript** — Type safety
- **Firebase** — Authentication
- **Tailwind CSS** — Styling
- **next-themes** — Theme management
- **React Hook Form** — Form state management
- **Zod** — Schema validation
- **lucide-react** — Icons

## Qeyd

⚠️ **Logo:** `components/dashboard/Logo.tsx` faylında logo şəkli üçün `<img src="" />` tagi boş `src` atributu ilə qoyulmuşdur. İstədiyiniz logo faylını əlavə edə bilərsiz.

## Lisenziya

MIT

## Dəstək

Hər hansı sualınız varsa, lütfən issue açın.

---

**Bravo Smart Flow** — Siz bir senior full-stack developer-siniz! 🚀

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
