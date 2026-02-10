# Aesthetic Clinic - SaaS Donusum Plani

## Genel Bakis

Bu plan, mevcut frontend-only UI projesini tam kapsamli bir SaaS uygulamasina donusturmek icin 6 fazdan olusur. Her faz bagimsiz olarak deploy edilebilir durumda birakir.

---

## Faz 1: Kritik Mimari Duzeltmeler

> Mevcut kodun Next.js 16 + React 19 + Tailwind CSS 4 best practice'lerine uygun hale getirilmesi.

### 1.1 Server Component Donusumu

**Sorun:** 7 sayfa gereksiz yere `'use client'` kullaniyor. Bu SSR, SEO ve performansi olumsuz etkiliyor.

**Cozum:** Interaktif parcalari ayri client componentlere cikar, sayfa kendisi Server Component kalsin.

| Dosya | Islem |
|-------|-------|
| `app/hizmetler/page.tsx` | Filter butonlarini `components/common/CategoryFilter.tsx` ('use client') olarak ayir |
| `app/urunler/page.tsx` | Ayni CategoryFilter componentini kullan |
| `app/blog/page.tsx` | Ayni CategoryFilter componentini kullan |
| `app/galeri/page.tsx` | Filter + lightbox modal ayri client componentlere |
| `app/hizmetler/[slug]/page.tsx` | Tamamen Server Component yap — interaktivite yok |
| `app/blog/[slug]/page.tsx` | Tamamen Server Component yap — interaktivite yok |
| `app/not-found.tsx` | `window.history.back()` kaldir, sadece Link kullan |

**Yeni component:** `components/common/CategoryFilter.tsx`
```
'use client'
- selectedCategory state
- Filtreleme mantigi
- Filtrelenmis veriyi children veya render prop ile goster
```

### 1.2 Dynamic Route Params Duzeltmesi

**Sorun:** `useParams()` kullanimi Next.js 16 async params pattern'ine aykiri.

| Dosya | Degisiklik |
|-------|-----------|
| `app/hizmetler/[slug]/page.tsx` | `useParams()` -> async `params` prop, `notFound()` kullan |
| `app/blog/[slug]/page.tsx` | Ayni degisiklik |
| `app/urunler/[slug]/page.tsx` | Ayni degisiklik (dosya varsa) |

### 1.3 generateStaticParams Eklenmesi

Tum dynamic route'lara statik uretim icin `generateStaticParams` ekle:

```tsx
// app/hizmetler/[slug]/page.tsx
export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}
```

Eklenecek dosyalar:
- `app/hizmetler/[slug]/page.tsx`
- `app/blog/[slug]/page.tsx`
- `app/urunler/[slug]/page.tsx`

### 1.4 React 19 forwardRef Kaldirilmasi

3 component'te `forwardRef` -> normal `ref` prop donusumu:

- `components/common/Input.tsx`
- `components/common/Select.tsx`
- `components/common/Textarea.tsx`

### 1.5 Tailwind CSS 4 Konfigurasyonu Temizligi

- `tailwind.config.ts` icerigini tamamen `app/globals.css` `@theme` bloguna tasi
- `tailwind.config.ts` dosyasini sil (veya bos birak)
- `content` dizisini kaldir (Tailwind v4'te otomatik)

### 1.6 Type Hatalarinin Duzeltilmesi

| Dosya | Hata | Duzeltme |
|-------|------|---------|
| `app/galeri/page.tsx:90` | `item.title` yok | `item.service` veya `item.description` kullan |
| `app/urunler/page.tsx:100` | `product.shortDescription` yok | `product.description` kullan |
| `app/randevu/page.tsx:23` | `(data: any)` | `(data: AppointmentFormData)` |
| `app/iletisim/page.tsx:12` | `(data: any)` | `(data: ContactFormData)` |

### 1.7 Kullanilmayan Bagimliliklarin Kaldirilmasi

```bash
npm uninstall @tanstack/react-query nodemailer @types/nodemailer
```

### 1.8 Icerik Tutarsizliklarinin Duzeltilmesi

- Footer adresi ile Contact sayfasi adresini esitle
- `© 2024` -> dinamik yil (`new Date().getFullYear()`)

### 1.9 loading.tsx ve error.tsx Dosyalarinin Eklenmesi

```
app/
├── loading.tsx              # Root loading (mevcut Loading componenti kullan)
├── error.tsx                # Root error boundary
├── hizmetler/
│   └── [slug]/
│       └── loading.tsx
├── blog/
│   └── [slug]/
│       └── loading.tsx
```

---

## Faz 2: Dinamik SEO Altyapisi ✅

> SaaS odakli, tum sayfalarda dinamik metadata, structured data ve teknik SEO.

### 2.1 Per-Page Metadata

Her sayfaya `export const metadata` veya `generateMetadata` ekle:

| Sayfa | Metadata Tipi |
|-------|---------------|
| `app/page.tsx` | Static `metadata` (anasayfa) |
| `app/hizmetler/page.tsx` | Static `metadata` |
| `app/hizmetler/[slug]/page.tsx` | `generateMetadata` (dinamik baslik, aciklama) |
| `app/urunler/page.tsx` | Static `metadata` |
| `app/urunler/[slug]/page.tsx` | `generateMetadata` |
| `app/blog/page.tsx` | Static `metadata` |
| `app/blog/[slug]/page.tsx` | `generateMetadata` (baslik, excerpt, OG image) |
| `app/galeri/page.tsx` | Static `metadata` |
| `app/randevu/page.tsx` | Static `metadata` |
| `app/iletisim/page.tsx` | Static `metadata` |

### 2.2 Dynamic OG Image Generation

```
app/
├── opengraph-image.tsx              # Default OG image (site geneli)
├── blog/[slug]/
│   └── opengraph-image.tsx          # Blog yazisi icin dinamik OG
├── hizmetler/[slug]/
│   └── opengraph-image.tsx          # Hizmet icin dinamik OG
```

### 2.3 sitemap.ts

```tsx
// app/sitemap.ts
// Tum sayfalari, hizmetleri, blog yazilarini ve urunleri icerir
// Ileride backend'den dinamik olarak cekilecek
```

### 2.4 robots.ts

```tsx
// app/robots.ts
// /dashboard/, /api/, /admin/ yollarini engelle
// sitemap.xml referansi ekle
```

### 2.5 JSON-LD Structured Data

| Sayfa | Schema Tipi |
|-------|-------------|
| Root layout | `Organization`, `WebSite` (SearchAction dahil) |
| Anasayfa | `LocalBusiness`, `MedicalBusiness` |
| Hizmet detay | `MedicalProcedure`, `Service`, `FAQPage` |
| Blog detay | `Article`, `BlogPosting` |
| Urun detay | `Product` |
| Iletisim | `ContactPage`, `LocalBusiness` (adres, saat) |

### 2.6 Teknik SEO

- `<html lang="tr">` (zaten var)
- Canonical URL'ler (`alternates.canonical`)
- Open Graph + Twitter Card metadata
- Breadcrumb yapilandirilmis veri

---

## Faz 3: Proje Yapi Degisikligi (Route Groups) ✅

> Marketing sitesi ve admin panelini ayirmak icin route group mimarisi.

### 3.1 Dosya Yapisi Degisikligi

Mevcut yapidan:
```
app/
├── layout.tsx          # Header + Footer iceriyor
├── page.tsx
├── hizmetler/
├── blog/
├── ...
```

Yeni yapiya:
```
app/
├── layout.tsx                  # Root: <html>, <body>, global providers
│
├── (marketing)/                # Acik site (URL'de /marketing OLMAZ)
│   ├── layout.tsx              # Header + Footer
│   ├── page.tsx                # Anasayfa
│   ├── hizmetler/
│   ├── urunler/
│   ├── blog/
│   ├── galeri/
│   ├── randevu/
│   └── iletisim/
│
├── (auth)/                     # Giris/kayit sayfalari
│   ├── layout.tsx              # Minimal layout (merkezi kart)
│   ├── giris/page.tsx          # /giris
│   ├── kayit/page.tsx          # /kayit
│   └── sifre-sifirla/page.tsx  # /sifre-sifirla
│
├── (admin)/                    # Admin panel (korunmus)
│   ├── layout.tsx              # Sidebar + TopBar + auth check
│   ├── dashboard/page.tsx      # /dashboard
│   ├── hastalar/page.tsx       # /hastalar
│   ├── randevular/page.tsx     # /randevular
│   ├── hizmetler/page.tsx      # /hizmetler (admin CRUD)
│   ├── blog/page.tsx           # /blog (admin CRUD)
│   ├── urunler/page.tsx        # /urunler (admin CRUD)
│   ├── galeri/page.tsx         # /galeri (admin CRUD)
│   ├── ayarlar/page.tsx        # /ayarlar
│   └── seo/page.tsx            # /seo (meta yonetimi)
│
└── api/                        # API route handler'lari
    ├── auth/[...nextauth]/route.ts
    ├── services/
    ├── products/
    ├── blog/
    ├── gallery/
    ├── appointments/
    ├── patients/
    ├── contact/
    └── upload/
```

### 3.2 Root Layout Sadeletirilmesi

```tsx
// app/layout.tsx — sadece <html>, <body>, fontlar, global provider
export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
```

### 3.3 Marketing Layout

```tsx
// app/(marketing)/layout.tsx
import Header from '@/components/marketing/Header';
import Footer from '@/components/marketing/Footer';

export default function MarketingLayout({ children }) {
  return (
    <>
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
```

### 3.4 Admin Layout

```tsx
// app/(admin)/layout.tsx — auth kontrolu + sidebar + topbar
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }) {
  const session = await auth();
  if (!session) redirect('/giris');
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

---

## Faz 4: Backend Altyapisi ✅

> Veritabani, ORM, API route'lari ve veri katmani.

### 4.1 Veritabani ve ORM Secimi

**Oneri:** PostgreSQL + Prisma ORM

- PostgreSQL: En yaygin SaaS veritabani, JSON destegi, full-text search
- Prisma: Schema-first, otomatik migration, genis Next.js ekosistem destegi
- Hosting: Neon (serverless PostgreSQL) veya Supabase

### 4.2 Prisma Schema Tasarimi

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String?
  role          Role      @default(STAFF)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  appointments  Appointment[]
}

model Service {
  id               String    @id @default(cuid())
  slug             String    @unique
  title            String
  category         String
  shortDescription String
  description      String    @db.Text
  price            String
  duration         String
  image            String?
  benefits         String[]
  process          String[]
  recovery         String?   @db.Text
  isActive         Boolean   @default(true)
  order            Int       @default(0)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  // SEO
  metaTitle        String?
  metaDescription  String?
  ogImage          String?
}

model Product {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  brand       String
  category    String
  description String   @db.Text
  price       String
  image       String?
  features    String[]
  isActive    Boolean  @default(true)
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  metaTitle       String?
  metaDescription String?
}

model BlogPost {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String
  excerpt   String   @db.Text
  content   String   @db.Text
  author    String
  category  String
  image     String?
  tags      String[]
  readTime  String
  isPublished Boolean @default(false)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  metaTitle       String?
  metaDescription String?
}

model GalleryItem {
  id          String   @id @default(cuid())
  category    String
  service     String
  beforeImage String
  afterImage  String
  description String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model Appointment {
  id        String            @id @default(cuid())
  name      String
  email     String
  phone     String
  service   String
  date      DateTime
  time      String
  message   String?
  status    AppointmentStatus @default(PENDING)
  userId    String?
  user      User?             @relation(fields: [userId], references: [id])
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
}

model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  phone     String?
  subject   String
  message   String   @db.Text
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

model SiteSettings {
  id          String @id @default("main")
  siteName    String @default("Aesthetic Clinic")
  phone       String @default("")
  email       String @default("")
  address     String @default("")
  whatsapp    String @default("")
  instagram   String @default("")
  facebook    String @default("")
  twitter     String @default("")
  youtube     String @default("")
  mapEmbedUrl String @default("")
  workingHours Json   @default("{}")
}

enum Role {
  ADMIN
  STAFF
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}
```

### 4.3 API Route Yapisi

```
app/api/
├── auth/[...nextauth]/route.ts    # Auth.js handler
├── services/
│   ├── route.ts                   # GET (list), POST (create)
│   └── [id]/route.ts              # GET, PUT, DELETE
├── products/
│   ├── route.ts
│   └── [id]/route.ts
├── blog/
│   ├── route.ts
│   └── [id]/route.ts
├── gallery/
│   ├── route.ts
│   └── [id]/route.ts
├── appointments/
│   ├── route.ts
│   └── [id]/route.ts
├── contact/route.ts               # POST (form gonderimi)
├── settings/route.ts              # GET, PUT (site ayarlari)
├── upload/route.ts                # POST (gorsel yukleme)
└── seo/route.ts                   # GET, PUT (SEO ayarlari)
```

### 4.4 Validation Layer (Zod)

```bash
npm install zod
```

```
lib/validations/
├── service.ts      # serviceSchema, serviceUpdateSchema
├── product.ts
├── blog.ts
├── appointment.ts
├── contact.ts
└── auth.ts         # loginSchema, registerSchema
```

### 4.5 Statik Veriden Veritabanina Gecis

1. Prisma schema olustur ve migration yap
2. Seed scripti yaz: mevcut `lib/data/*.ts` verilerini veritabanina aktar
3. Sayfalarda `import { services }` yerine `db.service.findMany()` cagrilari
4. `lib/data/` dosyalarini seed-only olarak sakla, runtime'da kullanma

---

## Faz 5: Authentication ve Yetkilendirme ✅

> Auth.js v5 ile giris, kayit ve rol tabanli erisim kontrolu.

### 5.1 Auth.js v5 Kurulumu

```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

Dosyalar:
```
lib/
├── auth.ts              # NextAuth config (Credentials provider, JWT sessions)
```

### 5.2 Middleware (Admin Route Korumasi)

```tsx
// middleware.ts
export { auth as middleware } from '@/lib/auth';
export const config = { matcher: ['/admin/:path*'] };
```

Auth.js v5 `authorized` callback ile middleware entegrasyonu:
- `/admin/*` path'leri icin oturum kontrolu
- Oturumsuz kullanicilar `/giris` sayfasina yonlendirilir

### 5.3 Auth Sayfalari ve Componentler

```
app/(auth)/
├── layout.tsx                     # Merkezi minimal layout (Header/Footer yok)
├── giris/page.tsx                 # Server Component + LoginForm import
├── kayit/page.tsx                 # Server Component + RegisterForm import
└── sifre-sifirla/page.tsx         # Server Component + ResetPasswordForm import

components/auth/
├── LoginForm.tsx                  # Client: signIn('credentials'), hata/yukleniyor state
├── RegisterForm.tsx               # Client: fetch /api/auth/register, sifre eslestirme
├── ResetPasswordForm.tsx          # Client: fetch /api/auth/reset-password, basari state
└── SessionProvider.tsx            # Client: next-auth SessionProvider wrapper

app/api/auth/
├── [...nextauth]/route.ts         # Auth.js GET/POST handlers
├── register/route.ts              # Kayit endpoint (bcrypt hash, duplicate check)
└── reset-password/route.ts        # Sifre sifirlama endpoint (placeholder)
```

### 5.4 Admin Layout Auth Entegrasyonu

```tsx
// app/admin/layout.tsx
const session = await auth();
if (!session?.user) redirect('/giris');

// SessionProvider ile client componentlere session verisi saglanir
// TopBar: useSession() ile kullanici adi/email gosterir, cikis butonu
// Sidebar: signOut() ile cikis butonu
```

### 5.5 Rol Tabanli Erisim

- `ADMIN`: Tum admin paneline erisim, kullanici yonetimi
- `STAFF`: Sinirli erisim (randevular, hastalar)
- JWT callback'te `token.role`, session callback'te `session.user.role`

### 5.6 Seed Script

- Varsayilan admin kullanici: `admin@aestheticclinic.com` / `admin123`
- `prisma/seed.ts` icinde bcrypt hash ile olusturulur

---

## Faz 6: Admin Panel

> Tam kapsamli admin dashboard — icerik, randevu, hasta ve SEO yonetimi.

### 6.1 UI Framework

**shadcn/ui** kullan — Next.js 16 + React 19 + Tailwind CSS 4 uyumlu:

```bash
npx shadcn@latest init
npx shadcn@latest add button card table dialog input select textarea
npx shadcn@latest add dropdown-menu sidebar sheet badge tabs
```

### 6.2 Admin Sayfalari

| Sayfa | Yol | Islevler |
|-------|-----|---------|
| Dashboard | `/dashboard` | Istatistikler, son randevular, grafikler |
| Hizmetler | `/hizmetler` | CRUD, siralama, aktif/pasif |
| Urunler | `/urunler` | CRUD, kategori yonetimi |
| Blog | `/blog` | CRUD, yayinla/taslak, editor |
| Galeri | `/galeri` | Gorsel yukleme, oncesi/sonrasi eslestirme |
| Randevular | `/randevular` | Liste, filtre, durum guncelleme |
| Hastalar | `/hastalar` | Hasta kayitlari, gecmis |
| Mesajlar | `/mesajlar` | Iletisim formu mesajlari, okundu/okunmadi |
| SEO | `/seo` | Sayfa bazli meta, OG image yonetimi |
| Ayarlar | `/ayarlar` | Site bilgileri, iletisim, calisma saatleri |

### 6.3 Admin Component Yapisi

```
components/admin/
├── layout/
│   ├── Sidebar.tsx            # Yan menu (collapse destegi)
│   ├── TopBar.tsx             # Ust bar (kullanici, bildirimler)
│   └── AdminShell.tsx         # Sidebar + TopBar wrapper
├── dashboard/
│   ├── StatsCards.tsx         # KPI kartlari
│   ├── RecentAppointments.tsx # Son randevular tablosu
│   └── Charts.tsx             # Grafik componentleri
├── shared/
│   ├── DataTable.tsx          # Genel CRUD tablo (siralama, filtreleme, sayfalama)
│   ├── FormDialog.tsx         # Olustur/duzenle dialog
│   ├── DeleteConfirm.tsx      # Silme onay dialog
│   ├── ImageUpload.tsx        # Gorsel yukleme componenti
│   └── RichTextEditor.tsx     # Blog icin zengin metin editoru
```

### 6.4 Dinamik SEO Yonetimi (Admin)

Admin panelinde her icerik turune SEO alanlari ekle:
- `metaTitle` — Ozel sayfa basligi
- `metaDescription` — Ozel aciklama
- `ogImage` — Open Graph gorseli

Marketing sayfalarinda `generateMetadata` bu alanlari veritabanindan ceker:

```tsx
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = await db.service.findUnique({ where: { slug } });
  return {
    title: service.metaTitle || `${service.title} | Aesthetic Clinic`,
    description: service.metaDescription || service.shortDescription,
    openGraph: { images: [service.ogImage || '/default-og.png'] },
  };
}
```

---

## Uygulama Sirasi ve Oncelikler

```
Faz 1 ──► Faz 2 ──► Faz 3 ──► Faz 4 ──► Faz 5 ──► Faz 6
 │          │          │          │          │          │
 │          │          │          │          │          └─ Admin Panel
 │          │          │          │          └─ Authentication
 │          │          │          └─ Backend (DB + API)
 │          │          └─ Route Groups (yapi degisikligi)
 │          └─ Dinamik SEO
 └─ Kritik Mimari Duzeltmeler
```

**Her faz sonunda:**
- `npm run build` basariyla gecmeli
- `npm run lint` hatasiz olmali
- CLAUDE.md guncellenmeli

---

## Yeni Bagimliliklar (Tum Fazlar)

### Faz 1
```bash
# Kaldirilacaklar
npm uninstall @tanstack/react-query nodemailer @types/nodemailer
```

### Faz 4
```bash
npm install prisma @prisma/client zod
npm install -D prisma
```

### Faz 5
```bash
npm install next-auth@5 @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

### Faz 6
```bash
npx shadcn@latest init
# + gerekli shadcn componentleri
```

---

## Ortam Degiskenleri (.env)

```env
# Veritabani
DATABASE_URL="postgresql://..."

# Auth.js
AUTH_SECRET="..."
AUTH_URL="http://localhost:3000"

# Gorsel Yukleme (Cloudinary/S3)
UPLOAD_API_KEY="..."
UPLOAD_API_SECRET="..."

# Site
NEXT_PUBLIC_SITE_URL="https://aestheticclinic.com"
```
