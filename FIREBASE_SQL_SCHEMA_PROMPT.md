# Firebase SQL Schema Generator Prompt - Bravo Smart Flow

## Layihənin Strukturu

Mən sənə **Firebase Data Connect** üçün **PostgreSQL** sxema generator promptu göstərəcəyəm. Bunu **Claude** və ya **ChatGPT**-yə göndərə bilərsən.

---

## PROMPT MƏTNI

```
System: You are an expert Firebase Data Connect and PostgreSQL schema designer.

User Task:
I need to create a Firebase Data Connect SQL schema for a role-based authentication system with the following requirements:

PROJECT OVERVIEW:
- Application: Bravo Smart Flow (Next.js 16.2.6)
- Database: Firebase Data Connect (PostgreSQL)
- Authentication: Firebase Auth + Custom SQL tables
- Two user roles: SUPPLY (Təchizatçı) and DISTRIBUTION (Distribyutor)

REQUIRED TABLES:

1. USERS TABLE (Base User)
   - id: UUID (PRIMARY KEY)
   - firebase_uid: VARCHAR (UNIQUE) - Links to Firebase Auth UID
   - email: VARCHAR (UNIQUE)
   - role: ENUM ('supply', 'distribution')
   - created_at: TIMESTAMP DEFAULT now()
   - updated_at: TIMESTAMP DEFAULT now()

2. SUPPLY_USERS TABLE (Supply User Profile)
   - id: UUID (PRIMARY KEY)
   - user_id: UUID (FOREIGN KEY → users.id) (UNIQUE)
   - first_name: VARCHAR
   - last_name: VARCHAR
   - company_name: VARCHAR
   - address: VARCHAR
   - phone: VARCHAR
   - voen: VARCHAR (Tax Identification Number)
   - image_url: VARCHAR (NULLABLE)
   - created_at: TIMESTAMP DEFAULT now()
   - updated_at: TIMESTAMP DEFAULT now()

3. DISTRIBUTION_USERS TABLE (Distribution User Profile)
   - id: UUID (PRIMARY KEY)
   - user_id: UUID (FOREIGN KEY → users.id) (UNIQUE)
   - first_name: VARCHAR
   - last_name: VARCHAR
   - image_url: VARCHAR (NULLABLE)
   - created_at: TIMESTAMP DEFAULT now()
   - updated_at: TIMESTAMP DEFAULT now()

REQUIRED OPERATIONS (Firebase Data Connect Mutations & Queries):

MUTATIONS:
1. createUser(firebase_uid: String!, email: String!, role: String!) → BaseUser
2. createSupplyUser(user_id: UUID!, data: SupplyUserData!) → SupplyUser
3. createDistributionUser(user_id: UUID!, data: DistributionUserData!) → DistributionUser
4. updateSupplyUser(user_id: UUID!, data: Partial<SupplyUserData>!) → SupplyUser
5. updateDistributionUser(user_id: UUID!, data: Partial<DistributionUserData>!) → DistributionUser
6. updateUserRole(user_id: UUID!, role: String!) → BaseUser
7. deleteSupplyUser(user_id: UUID!) → Boolean
8. deleteDistributionUser(user_id: UUID!) → Boolean

QUERIES:
1. getUserByFirebaseUid(firebase_uid: String!) → BaseUser + Profile
2. getUserById(user_id: UUID!) → BaseUser + Profile
3. getSupplyUser(user_id: UUID!) → SupplyUser
4. getDistributionUser(user_id: UUID!) → DistributionUser
5. getUsersByRole(role: String!) → [BaseUser + Profile]
6. checkUserExists(email: String!) → Boolean
7. getAllUsers(limit: Int, offset: Int) → [BaseUser + Profile]

DELIVERABLES:
1. Complete PostgreSQL schema (CREATE TABLE statements with indexes)
2. Firebase Data Connect connector.yaml configuration
3. Data Connect mutation definitions (.gql files)
4. Data Connect query definitions (.gql files)
5. TypeScript types for query results
6. Sample implementation for Node.js/TypeScript

FORMAT REQUIREMENTS:
- Use Firebase Data Connect SQLite/PostgreSQL syntax
- Include proper indexing for firebaseUid, email, userId lookups
- Add created_at/updated_at indexes for sorting
- Include cascade delete rules
- Add comments explaining each table/field

Please generate the complete schema, connectors, and query definitions.
```

---

## Necə istifadə etməli?

1. **Chat GPT / Claude-ya gir:**
   - https://chat.openai.com (ChatGPT)
   - https://claude.ai (Claude)

2. **Yuxarıdakı PROMPT-u tam kopyala və yapışdır** (System + User Task hissəsi)

3. **Əl klik et "Send"** və generatora kənarə çıxaraq sabr et

4. **Nəticələr:**
   - PostgreSQL `CREATE TABLE` statements
   - Firebase Data Connect `.gql` faylları
   - TypeScript type definitions
   - Implementation examples

---

## Alternativ: Sadə Versiya

Əgər prompt çox uzun görünürsə, bu qısaltmasını istifadə et:

```
I need Firebase Data Connect SQL schema for:
- 3 tables: users, supply_users, distribution_users
- users has: id, firebase_uid (unique), email, role, timestamps
- supply_users: id, user_id (FK), first_name, last_name, company_name, address, phone, voen, image_url, timestamps
- distribution_users: id, user_id (FK), first_name, last_name, image_url, timestamps

Generate:
1. CREATE TABLE statements
2. Indexes for firebase_uid, email, user_id
3. Data Connect mutations for CRUD
4. Data Connect queries for reads
5. TypeScript types
```

---

## Qeyd:

- Nəticədə aldığın **SQL sxema** Firebase Console-da "Data Connect" bölümündə yaratacaqsan
- **.gql faylları** `lib/queries/` və `lib/mutations/` folder-lərinə yerləşdirəcəksən
- **TypeScript type definitions** `types/dataConnect.ts` faylına əlavə edəcəksən
- **services/ faylları** bu sxemaya əsasən implementasyon edəcəksən

Uğur! 🚀
