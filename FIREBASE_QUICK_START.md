# Firebase Data Connect Quick Start

**Firebasə SQL sxemanız hazır!** ✅

Burada tez adımlar var:

---

## 1️⃣ Firebase SDK Qur

```bash
npm install @firebase/data-connect
```

---

## 2️⃣ Firebase Console-da Connector Gen et

1. **Firebase Console** → **Data Connect** → **bravo-smart-flow-service**
2. **Generate Connectors** klik et
3. **TypeScript** seç
4. Generasiya kodu kopyala

---

## 3️⃣ Generated Faylları Yerləşdir

Generated faylları buraya kopyala:
```
lib/dataConnect/generated/
```

---

## 4️⃣ Environment Variables

`.env.local` faylına əlavə et:

```env
NEXT_PUBLIC_DATA_CONNECT_PROJECT_ID=bravo-smart-flow-project-id
NEXT_PUBLIC_DATA_CONNECT_SERVICE_ID=bravo-smart-flow-service
NEXT_PUBLIC_DATA_CONNECT_LOCATION=us-east4
```

---

## 5️⃣ Services Update

`services/auth.service.ts` update et:

```typescript
import { 
  CreateUser, 
  GetUserByFirebaseUid 
} from '@/lib/dataConnect/generated';
import { executeMutation, executeQuery } from '@/lib/dataConnect';

export async function createUser(
  firebaseUid: string,
  email: string,
  role: string
) {
  const result = await executeMutation(
    CreateUser(),
    { firebaseUid, email, role }
  );
  return result.user_insert;
}
```

---

## 📁 Struktur

```
lib/dataConnect/
├── mutations/          ✅ GraphQL mutation definitions
│   ├── CreateUser.gql
│   ├── CreateSupplyUser.gql
│   └── ...
├── queries/            ✅ GraphQL query definitions
│   ├── GetUserByFirebaseUid.gql
│   └── ...
├── generated/          🔄 Firebase tərəfindən generasiya ediləcək
├── dataConnect.ts      ✅ Setup & utilities
└── connector.ts        🔄 Sizin yaradacağınız
```

---

## 🔗 Resources

- [Firebase Data Connect Docs](https://firebase.google.com/docs/data-connect)
- [Setup Guide](FIREBASE_DATA_CONNECT_SETUP.md)
- [TypeScript Types](types/dataConnect.ts)

---

## ✅ Hazır?

Bir dəfə **connector generasiya** etdikdən sonra:
1. `services/` faylları `executeQuery`/`executeMutation` istifadə edəcəklər
2. `AuthContext` verilənləri bazadan yüklənəcək
3. Login/Register tam işləyəcəklər ✨

Uğur! 🚀
