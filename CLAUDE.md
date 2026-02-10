# CLAUDE.md - Aesthetic Clinic Project Guide

## Project Overview

Turkish-language aesthetic (cosmetic) clinic website built with Next.js 16, React 19, and Tailwind CSS 4. Backend infrastructure with PostgreSQL (via Prisma ORM) and REST API routes. Marketing pages still use static data; transition to database is ready.

**Tech Stack:** Next.js 16.0.6 | React 19.2.0 | TypeScript 5 | Tailwind CSS 4 | Framer Motion 12 | Prisma 7 | Zod 4 | Zustand 5 | React Hook Form 7 | Lucide React

---

## Quick Reference

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:push      # Push schema to database (no migration)
npm run db:seed      # Seed database with static data
npm run db:studio    # Open Prisma Studio GUI
```

**Path alias:** `@/*` maps to project root (`./`)

---

## Project Architecture

```
aesthetic-clinic/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (html, body, fonts, metadata)
│   ├── globals.css                   # Global styles + Tailwind @theme
│   ├── loading.tsx                   # Root loading state
│   ├── error.tsx                     # Root error boundary
│   ├── not-found.tsx                 # 404 page
│   ├── sitemap.ts                    # Dynamic sitemap generation
│   ├── robots.ts                     # Robots.txt rules
│   ├── opengraph-image.tsx           # Default OG image (1200x630)
│   │
│   ├── (marketing)/                  # Public marketing site (no URL prefix)
│   │   ├── layout.tsx                # Header + Footer + JSON-LD
│   │   ├── page.tsx                  # Home page
│   │   ├── hizmetler/                # Services listing & detail
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       ├── page.tsx          # Service detail (JSON-LD)
│   │   │       └── opengraph-image.tsx
│   │   ├── urunler/                  # Products listing & detail
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       ├── page.tsx          # Product detail (JSON-LD)
│   │   │       └── opengraph-image.tsx
│   │   ├── blog/                     # Blog listing & detail
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       ├── page.tsx          # Blog post detail (JSON-LD)
│   │   │       └── opengraph-image.tsx
│   │   ├── galeri/page.tsx           # Before/after gallery
│   │   ├── randevu/page.tsx          # Appointment booking
│   │   └── iletisim/page.tsx         # Contact page
│   │
│   ├── (auth)/                       # Auth pages (no URL prefix)
│   │   ├── layout.tsx                # Minimal centered layout
│   │   ├── giris/page.tsx            # /giris (login)
│   │   ├── kayit/page.tsx            # /kayit (register)
│   │   └── sifre-sifirla/page.tsx    # /sifre-sifirla (reset password)
│   │
│   ├── admin/                        # Admin panel (URL prefix: /admin)
│   │   ├── layout.tsx                # Sidebar + TopBar layout
│   │   ├── page.tsx                  # Redirects to /admin/dashboard
│   │   └── dashboard/page.tsx        # Admin dashboard
│   │
│   └── api/                          # REST API routes
│       ├── services/                 # GET (list), POST (create)
│       │   └── [id]/                 # GET, PUT, DELETE
│       ├── products/, blog/, gallery/ # Same CRUD pattern
│       ├── appointments/             # CRUD + status updates
│       ├── contact/                  # GET (list), POST (submit)
│       └── settings/                 # GET, PUT (site settings)
│
├── components/
│   ├── common/                       # Reusable UI components
│   │   ├── Header.tsx                # Fixed navbar (client)
│   │   ├── Footer.tsx                # Site footer (server)
│   │   ├── Button.tsx, Card.tsx      # UI primitives
│   │   ├── Input.tsx, Select.tsx     # Form inputs (ref-as-prop)
│   │   ├── Textarea.tsx, Modal.tsx   # More UI components
│   │   ├── CategoryFilter.tsx        # Category filter (client)
│   │   ├── GalleryGrid.tsx           # Gallery grid + lightbox (client)
│   │   └── Loading.tsx               # Loading spinner
│   ├── admin/                        # Admin panel components
│   │   ├── Sidebar.tsx               # Admin sidebar navigation (client)
│   │   └── TopBar.tsx                # Admin top bar (client)
│   ├── forms/                        # Extracted client form components
│   │   ├── AppointmentForm.tsx       # Multi-step appointment form
│   │   └── ContactForm.tsx           # Contact form + info
│   ├── products/
│   │   └── ProductDetail.tsx         # Product detail view (client)
│   ├── seo/
│   │   └── JsonLd.tsx                # JSON-LD script renderer
│   └── home/                         # Homepage section components
│       ├── Hero.tsx, Statistics.tsx
│       ├── FeaturedServices.tsx
│       └── Testimonials.tsx
│
├── lib/
│   ├── types/index.ts                # All TypeScript interfaces
│   ├── db.ts                         # Prisma client singleton
│   ├── api-utils.ts                  # API response helpers
│   ├── store/useStore.ts             # Zustand store (menu state)
│   ├── seo/jsonld.ts                 # JSON-LD schema generators
│   ├── data/                         # Static data (used for seed + SSG)
│   │   ├── services.ts, products.ts
│   │   ├── blog.ts, gallery.ts
│   ├── validations/                  # Zod schemas for API validation
│   │   ├── service.ts, product.ts
│   │   ├── blog.ts, gallery.ts
│   │   ├── appointment.ts, contact.ts
│   │   ├── auth.ts, settings.ts
│   ├── utils/
│   │   ├── validation.ts, helpers.ts
│   └── utils.ts                      # cn() utility
│
├── prisma/
│   ├── schema.prisma                 # Database schema (PostgreSQL)
│   └── seed.ts                       # Seed script (static data → DB)
│
├── next.config.ts                    # React Compiler, image optimization
├── tailwind.config.ts                # Tailwind (legacy, @theme in CSS)
├── tsconfig.json                     # TypeScript strict mode
└── eslint.config.mjs                 # ESLint config
```

---

## Critical Architecture Rules

### 1. Server Components vs Client Components (Next.js 16 + React 19)

**Default to Server Components.** Only add `'use client'` when the component genuinely needs browser APIs, hooks, or event handlers.

```tsx
// CORRECT: Server Component page (no 'use client')
// app/hizmetler/[slug]/page.tsx
import { getServiceBySlug } from '@/lib/data/services';
import { notFound } from 'next/navigation';

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return <ServiceDetailView service={service} />;
}

// WRONG: Using 'use client' just to read params
'use client';
import { useParams } from 'next/navigation';
export default function ServiceDetailPage() {
  const params = useParams(); // Unnecessary client-side
}
```

Components that MUST be client components:
- `Header.tsx`, `Sidebar.tsx`, `TopBar.tsx` - navigation, `usePathname()`, event handlers
- `Modal.tsx` - uses `useEffect`, event handlers
- `AppointmentForm.tsx`, `ContactForm.tsx` - use `useForm()`, `useState`
- `CategoryFilter.tsx`, `GalleryGrid.tsx` - use `useState`
- `ProductDetail.tsx` - uses `useState` for quantity

Components that are Server Components:
- All `page.tsx` files - receive params as props, export metadata
- `Footer.tsx` - no client hooks
- `Hero.tsx`, `FeaturedServices.tsx`, `Statistics.tsx`, `Testimonials.tsx` - no interactivity
- `Card.tsx`, `Button.tsx`, `Loading.tsx`, `JsonLd.tsx` - no hooks or event handlers

### 2. Dynamic Route Params (Next.js 16)

In Next.js 16, dynamic route `params` are **asynchronous** and received as a Promise prop:

```tsx
// CORRECT: Next.js 16 pattern
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // ...
}

// WRONG: Old pattern (still works with 'use client' but loses SSR benefits)
'use client';
import { useParams } from 'next/navigation';
export default function Page() {
  const params = useParams();
}
```

### 3. Static Generation with generateStaticParams

All dynamic routes (`[slug]`) with static data MUST use `generateStaticParams` for build-time generation:

```tsx
// app/hizmetler/[slug]/page.tsx
import { services } from '@/lib/data/services';

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  // Return page-specific metadata for SEO
}
```

### 4. Per-Page Metadata (SEO)

Every page MUST export its own `metadata` or `generateMetadata`. Currently only `app/layout.tsx` has metadata.

```tsx
// app/hizmetler/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hizmetlerimiz | Aesthetic Clinic',
  description: 'Botoks, dolgu, lazer epilasyon...',
};
```

### 5. React 19: No More forwardRef

React 19 supports `ref` as a regular prop. The React Compiler (enabled in this project) handles this automatically:

```tsx
// CORRECT: React 19 pattern
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: React.Ref<HTMLInputElement>;
  label?: string;
  error?: string;
}

export default function Input({ ref, label, error, ...props }: InputProps) {
  return <input ref={ref} {...props} />;
}

// OUTDATED: forwardRef pattern (still works but unnecessary)
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} />;
});
Input.displayName = 'Input';
```

### 6. Tailwind CSS 4 Configuration

This project has a **hybrid setup** with both `tailwind.config.ts` (v3 style) and `@theme` in `globals.css` (v4 style). In Tailwind CSS 4, theming is done entirely in CSS:

```css
/* globals.css - This is the v4 way (already partially done) */
@import "tailwindcss";

@theme {
  --color-primary-500: #e03aff;
  --font-display: 'Playfair Display', Georgia, serif;
  /* ... */
}
```

The `tailwind.config.ts` file is a **legacy artifact** from v3. In pure Tailwind CSS 4, all theme configuration goes in `@theme` blocks in CSS. When adding new theme values, prefer adding them to `globals.css` `@theme` block.

### 7. Route Groups (Faz 3)

The project uses **route groups** to separate marketing, auth, and admin sections with different layouts:

| Route Group | URL Prefix | Layout | Purpose |
|-------------|-----------|--------|---------|
| `(marketing)` | none | Header + Footer + JSON-LD | Public marketing site |
| `(auth)` | none | Centered card | Login, register, password reset |
| `admin/` | `/admin` | Sidebar + TopBar | Admin panel (placeholder) |

**Rules:**
- Marketing pages go in `app/(marketing)/` - URLs are unchanged (e.g., `/hizmetler`)
- Auth pages go in `app/(auth)/` - URLs are `/giris`, `/kayit`, `/sifre-sifirla`
- Admin pages go in `app/admin/` (not a route group, actual segment) - URLs are `/admin/dashboard`, etc.
- Root `layout.tsx` only contains `<html>`, `<body>`, fonts, and global metadata
- Root `not-found.tsx`, `error.tsx`, `loading.tsx` provide global fallbacks
- Root `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` are metadata routes (not page routes)

### 8. Loading & Error Boundaries

Add Next.js App Router conventions for loading and error states:

```
app/
├── loading.tsx          # Root loading state
├── error.tsx            # Root error boundary ('use client' required)
├── hizmetler/
│   ├── loading.tsx      # Route-specific loading
│   └── error.tsx        # Route-specific error
```

---

## Design System & Styling Conventions

### Color Palette

| Token | Usage | Hex |
|-------|-------|-----|
| `primary-*` | Brand color (purple) | `#e03aff` (500) |
| `secondary-*` | Accent teal | `#14b8a6` (500) |
| `accent-*` | Orange highlights | `#f97316` (500) |

### Typography

- **Body text:** Inter (sans) via `font-sans` / `var(--font-inter)`
- **Headings:** Playfair Display (serif) via `font-display` / `var(--font-playfair)`
- All `h1-h6` tags automatically use `font-display` via base layer

### CSS Utility Classes (globals.css)

| Class | Purpose |
|-------|---------|
| `.glass-card` | Glassmorphism card (white/70, blur, border) |
| `.glass-card-dark` | Dark glassmorphism card |
| `.btn-primary` | Gradient purple button |
| `.btn-secondary` | Gradient teal button |
| `.btn-outline` | Outlined purple button |
| `.section-container` | Max-w-7xl centered container with padding |
| `.gradient-text` | Gradient text effect (purple to teal) |
| `.card-hover` | Hover lift + shadow effect |
| `.image-overlay` | Image with gradient overlay on hover |
| `.shimmer` | Loading shimmer animation |

### Mobile-First Responsive Design (MANDATORY)

Every page and component MUST be mobile-responsive. Design mobile-first, then scale up.

**Breakpoint strategy:** Base styles = mobile (< 640px), then `sm:` (640px), `md:` (768px), `lg:` (1024px).

| Pattern | Mobile | sm+ | md+ | lg+ |
|---------|--------|-----|-----|-----|
| H1 text | `text-3xl` | `sm:text-4xl` | `md:text-5xl` | `lg:text-6xl` |
| H2 text | `text-2xl` | `sm:text-3xl` | `md:text-4xl` | `lg:text-5xl` |
| Body text | `text-base` | `sm:text-lg` | `md:text-xl` | - |
| Section padding | `py-12` | `sm:py-16` | `md:py-20` | - |
| Card padding | `p-4` | `sm:p-6` | `md:p-8` | - |
| Grid gap | `gap-4` or `gap-6` | `sm:gap-6` | `sm:gap-8` | `lg:gap-8` |
| Grid cols | `grid-cols-1` | `sm:grid-cols-2` | `md:grid-cols-2` | `lg:grid-cols-3` |

**Rules:**
- Touch targets: minimum `py-2.5` (44px) on all interactive elements
- Buttons: `active:scale-95` for mobile tap feedback
- Sticky sidebars: `lg:sticky lg:top-24` (disable on mobile, they stack below)
- Hero heights: `h-[50vh] md:h-[60vh]` with `min-h-[350px] md:min-h-[500px]`
- Negative margins: scale down on mobile `(-mt-10 sm:-mt-16 md:-mt-20)`
- Hide decorative elements on mobile: `hidden sm:block` for floating cards
- Filter buttons: `text-xs sm:text-sm` with `px-4 sm:px-6 py-2.5 sm:py-2`
- Footer links: `flex-wrap` with `gap-4 sm:gap-6`
- Lightbox/modals: `max-h-[90vh] overflow-y-auto` for scrollability

**Example - Responsive page hero:**
```tsx
<section className="py-12 sm:py-16 md:py-20 bg-primary-50">
  <div className="section-container text-center">
    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-4 sm:mb-6">
      Page Title
    </h1>
    <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
      Description text
    </p>
  </div>
</section>
```

### Component Patterns

- Use `cn()` from `@/lib/utils` for conditional class merging
- Prefer the `Button` component over raw `<button>` with `.btn-*` classes
- Use `Card` component with `glass` and `hover` props
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints
- Grid patterns: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Framer Motion Conventions

```tsx
// Page entrance animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>

// Scroll-triggered animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, delay: index * 0.1 }}
>

// AnimatePresence for mount/unmount
<AnimatePresence>
  {isVisible && <motion.div exit={{ opacity: 0 }} />}
</AnimatePresence>
```

---

## Data Layer

Marketing pages still use **static TypeScript** in `lib/data/` for build-time generation (`generateStaticParams`). API routes use **Prisma** for database access.

### Data Files

| File | Export | Helpers |
|------|--------|---------|
| `services.ts` | `services`, `serviceCategories` | `getServiceBySlug()`, `getServicesByCategory()` |
| `products.ts` | `products`, `productCategories` | `getProductBySlug()` |
| `blog.ts` | `blogPosts`, `blogCategories` | `getBlogPostBySlug()` |
| `gallery.ts` | `galleryItems`, `galleryCategories` | - |

### Type Definitions (`lib/types/index.ts`)

All interfaces: `Service`, `Product`, `GalleryItem`, `BlogPost`, `Testimonial`, `AppointmentFormData`, `ContactFormData`, `Statistics`

When adding new data entities:
1. Define the interface in `lib/types/index.ts`
2. Create data file in `lib/data/`
3. Export categories array with `{ value, label }` pattern
4. Add `getBySlug()` helper function
5. Each item must have `id` and `slug` fields

---

## Backend Infrastructure (Faz 4)

### Database (Prisma + PostgreSQL)

- **Schema:** `prisma/schema.prisma` - 8 models (User, Service, Product, BlogPost, GalleryItem, Appointment, ContactMessage, SiteSettings)
- **Client:** `lib/db.ts` - Singleton Prisma client (prevents hot-reload connection leaks)
- **Seed:** `prisma/seed.ts` - Populates DB from existing `lib/data/*.ts` static data
- **Env:** `DATABASE_URL` required in `.env` (see `.env.example`)

### API Routes

All routes return `{ success: boolean, data?: T, error?: string }` via `lib/api-utils.ts`:

| Route | Methods | Validation Schema |
|-------|---------|-------------------|
| `/api/services` | GET, POST | `createServiceSchema` |
| `/api/services/[id]` | GET, PUT, DELETE | `updateServiceSchema` |
| `/api/products` | GET, POST | `createProductSchema` |
| `/api/products/[id]` | GET, PUT, DELETE | `updateProductSchema` |
| `/api/blog` | GET, POST | `createBlogPostSchema` |
| `/api/blog/[id]` | GET, PUT, DELETE | `updateBlogPostSchema` |
| `/api/gallery` | GET, POST | `createGalleryItemSchema` |
| `/api/gallery/[id]` | GET, PUT, DELETE | `updateGalleryItemSchema` |
| `/api/appointments` | GET, POST | `createAppointmentSchema` |
| `/api/appointments/[id]` | GET, PUT, DELETE | `updateAppointmentStatusSchema` |
| `/api/contact` | GET, POST | `createContactMessageSchema` |
| `/api/settings` | GET, PUT | `updateSiteSettingsSchema` |

### Zod Validation

All schemas in `lib/validations/`. Each entity has `create*Schema` + `update*Schema` (partial). API routes validate input with `schema.parse(body)`, returning 400 with Turkish error messages on failure.

### Database Setup

```bash
# 1. Set DATABASE_URL in .env
# 2. Generate Prisma client
npm run db:generate
# 3. Push schema to database
npm run db:push
# 4. Seed with static data
npm run db:seed
```

---

## Form Handling

Forms use **React Hook Form** with inline validation:

```tsx
const { register, handleSubmit, formState: { errors } } = useForm<ContactFormData>();

<Input
  label="E-posta"
  {...register('email', {
    required: 'Bu alan zorunludur',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Gecersiz e-posta adresi'
    }
  })}
  error={errors.email?.message as string}
/>
```

**Important:** Always type form data properly. Avoid `any` in `onSubmit`:

```tsx
// CORRECT
const onSubmit = (data: ContactFormData) => { ... };

// WRONG (current state in some files)
const onSubmit = (data: any) => { ... };
```

---

## Known Issues & Technical Debt

### Fixed (Faz 1 + 1.5 + 2 + 3 + 4)
- ~~All pages unnecessarily used `'use client'`~~ -> Refactored to Server Components
- ~~Dynamic routes used `useParams()`~~ -> Async params prop (Next.js 16 pattern)
- ~~No `generateStaticParams`~~ -> Added to all [slug] routes
- ~~No per-page metadata~~ -> Added `metadata`/`generateMetadata` to all pages
- ~~No `loading.tsx`/`error.tsx`~~ -> Added root boundary files
- ~~`forwardRef` in Input/Select/Textarea~~ -> React 19 ref-as-prop pattern
- ~~Hybrid Tailwind config~~ -> Consolidated into CSS `@theme`
- ~~Form `any` types~~ -> Properly typed
- ~~`@tanstack/react-query`, `nodemailer`~~ -> Removed unused deps
- ~~Gallery `item.title` bug~~ -> Uses `item.service`
- ~~Products `shortDescription` bug~~ -> Uses `product.description`
- ~~Address inconsistency~~ -> Unified to Bagdat Caddesi
- ~~Mobile responsiveness issues~~ -> All pages mobile-optimized
- ~~No sitemap or robots.txt~~ -> Dynamic `sitemap.ts` + `robots.ts`
- ~~No structured data~~ -> JSON-LD (Organization, WebSite, MedicalProcedure, BlogPosting, Product, BreadcrumbList)
- ~~No OG images~~ -> Dynamic `opengraph-image.tsx` for root + all [slug] routes
- ~~No canonical URLs~~ -> `alternates.canonical` on all pages + `metadataBase`
- ~~randevu/iletisim/urunler were client pages~~ -> Extracted client components, pages are Server Components with metadata
- ~~All pages in flat app/ directory~~ -> Route groups: (marketing), (auth), admin/
- ~~Root layout had Header/Footer~~ -> Split into marketing layout, root is html/body only
- ~~No auth pages~~ -> Placeholder giris/kayit/sifre-sifirla pages
- ~~No admin panel~~ -> Admin layout with sidebar + dashboard placeholder
- ~~No backend/database~~ -> Prisma + PostgreSQL schema, API routes, Zod validation
- ~~No API routes~~ -> Full CRUD for services, products, blog, gallery, appointments, contact, settings
- ~~No form validation~~ -> Zod schemas with Turkish error messages

### Remaining Debt
- Zustand is used only for mobile menu toggle - could be local state
- `CategoryFilter` and `GalleryGrid` have duplicate filter button styles

### Missing Features
- No actual images (all placeholders)
- Forms still log to console (need wiring to API routes)
- No authentication (Faz 5 - Auth.js v5)
- Marketing pages still use static data (not yet migrated to DB queries)
- Google Maps embed uses placeholder coordinates

---

## Coding Standards

### TypeScript
- Strict mode enabled
- Always type function parameters and return values
- Use interface over type for object shapes
- Export interfaces from `lib/types/index.ts`
- Never use `any` - use proper types or `unknown`

### Naming Conventions
- **Files:** PascalCase for components (`Header.tsx`), camelCase for utilities (`helpers.ts`)
- **Components:** PascalCase (`FeaturedServices`)
- **Functions:** camelCase (`getServiceBySlug`)
- **Constants:** camelCase for arrays/objects (`services`, `blogCategories`)
- **Interfaces:** PascalCase (`Service`, `BlogPost`)
- **CSS classes:** kebab-case (`.glass-card`, `.btn-primary`)
- **Routes:** Turkish lowercase (`hizmetler`, `randevu`, `iletisim`)

### Import Order
1. React / Next.js core
2. Third-party libraries (framer-motion, lucide-react, etc.)
3. Internal components (`@/components/...`)
4. Internal data/utilities (`@/lib/...`)

### Component Structure Pattern
```tsx
// 1. Directive (if needed)
'use client';

// 2. Imports
import { ... } from 'react';
import { ... } from 'next/...';
import { ... } from 'third-party';
import { ... } from '@/components/...';
import { ... } from '@/lib/...';

// 3. Types (if local)
interface Props { ... }

// 4. Constants (if local)
const items = [...];

// 5. Component
export default function ComponentName({ props }: Props) {
  // hooks
  // derived state
  // handlers
  // return JSX
}
```

### Page Structure Pattern
Every page follows a consistent mobile-first section pattern:
```tsx
<div className="min-h-screen pb-20">
  {/* Hero Section - responsive padding & text */}
  <section className="py-12 sm:py-16 md:py-20 bg-primary-50">
    <div className="section-container text-center">
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl ...">...</h1>
      <p className="text-base sm:text-lg ...">...</p>
    </div>
  </section>

  {/* Filter Section (if applicable) */}
  <section className="py-8 border-b border-gray-100 bg-white">
    {/* Category filter buttons with responsive sizing */}
  </section>

  {/* Content Grid - responsive gaps */}
  <section className="section-container">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {/* Items with responsive card padding */}
    </div>
  </section>
</div>
```

---

## SEO Infrastructure (Faz 2)

### Metadata Strategy

Root layout (`app/layout.tsx`) defines site-wide defaults with title template:
```tsx
metadataBase: new URL(siteUrl),
title: { default: '...', template: '%s | Aesthetic Clinic' },
```

- Static pages export `metadata` object
- Dynamic `[slug]` pages export `generateMetadata()` that awaits params
- All pages have `alternates.canonical` for canonical URLs
- Environment variable: `NEXT_PUBLIC_SITE_URL` (defaults to `https://aestheticclinic.com`)

### JSON-LD Structured Data

Schema generators in `lib/seo/jsonld.ts`, rendered via `components/seo/JsonLd.tsx`:

| Function | Schema Type | Used On |
|----------|-------------|---------|
| `organizationJsonLd()` | MedicalBusiness | Root layout |
| `webSiteJsonLd()` | WebSite + SearchAction | Root layout |
| `serviceJsonLd(service)` | MedicalProcedure | hizmetler/[slug] |
| `blogPostJsonLd(post)` | BlogPosting | blog/[slug] |
| `productJsonLd(product)` | Product | urunler/[slug] |
| `breadcrumbJsonLd(items)` | BreadcrumbList | All [slug] detail pages |

### Dynamic OG Images

Each `opengraph-image.tsx` uses `ImageResponse` from `next/og` (edge runtime):
- `app/opengraph-image.tsx` - Site default (purple gradient, clinic info)
- `app/hizmetler/[slug]/opengraph-image.tsx` - Service name + category
- `app/blog/[slug]/opengraph-image.tsx` - Post title + author + date
- `app/urunler/[slug]/opengraph-image.tsx` - Product name + brand + price

All generate 1200x630 PNG images with consistent brand styling.

### Sitemap & Robots

- `app/sitemap.ts` - Generates all static + dynamic routes from data files
- `app/robots.ts` - Allows `/`, disallows `/api/`, `/dashboard/`, `/admin/`

---

## Configuration Details

### next.config.ts
- `reactCompiler: true` - React Compiler (babel-plugin-react-compiler) enabled
- Image formats: AVIF, WebP
- Compression enabled
- `poweredByHeader: false` (security)

### TypeScript
- Target: ES2017
- Strict mode: enabled
- Module resolution: bundler
- Path alias: `@/*` -> `./*`

### ESLint
- Extends: `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`

---

## Language & Content

- All user-facing content is in **Turkish**
- Date formatting uses Turkish locale (`tr-TR`)
- Currency: Turkish Lira (TL) - formatted as string, not numeric
- URL slugs use Turkish-compatible ASCII (`botoks`, `dudak-dolgusu`, `lazer-epilasyon`)

---

## Development Workflow

1. **Before modifying a file:** Read it first to understand current patterns
2. **Adding a new page:** Create directory in `app/`, add `page.tsx`, export metadata
3. **Adding a component:** Place in `components/common/` (reusable) or `components/{section}/` (section-specific)
4. **Adding new data:** Define type in `lib/types/`, create data file in `lib/data/`
5. **Styling:** Use Tailwind utilities directly, add reusable patterns to `globals.css`
6. **Lint check:** Run `npm run lint` before committing
7. **Build check:** Run `npm run build` to verify no TypeScript or build errors
