# Kotlin + Spring Boot — Multi-Tenant SaaS Backend Mimarisi

## 1. Genel Bakış

Bu doküman, mevcut Next.js frontend'i destekleyecek **Kotlin + Spring Boot** tabanlı multi-tenant SaaS backend mimarisini tanımlar. Platform; güzellik klinikleri, diş klinikleri, berber dükkanları ve kuaför salonları için randevu yönetim sistemi sunar.

### Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Dil | Kotlin 1.9+ |
| Framework | Spring Boot 3.3+ |
| Veritabanı | MySQL 8.0+ |
| ORM | Spring Data JPA + Hibernate 6 |
| Güvenlik | Spring Security 6 + JWT (jjwt) |
| Validation | Jakarta Validation (Bean Validation 3.0) |
| Migration | Flyway |
| API Docs | SpringDoc OpenAPI (Swagger UI) |
| Cache | Redis (opsiyonel, session + cache) |
| Build | Gradle (Kotlin DSL) |
| Test | JUnit 5 + Testcontainers + MockK |
| Containerization | Docker + Docker Compose |

---

## 2. Multi-Tenant Strateji

### 2.1 Yaklaşım: Shared Database, Shared Schema (Discriminator Column)

Tüm tenant'lar **aynı veritabanı ve aynı tabloları** paylaşır. Her tablo `tenant_id` sütununa sahiptir. Bu yaklaşım:

- **Avantaj:** Düşük maliyet, kolay yönetim, hızlı tenant oluşturma
- **Avantaj:** Tek migration ile tüm tenant'lar güncellenir
- **Dezavantaj:** Veri izolasyonu uygulama seviyesinde (Hibernate Filter ile)
- **Uygunluk:** Orta ölçekli SaaS (10.000+ tenant'a kadar)

### 2.2 Tenant Çözümleme (Resolution)

```
İstek akışı:
  salon1.app.com → DNS → Load Balancer → Spring Boot
                                           │
                                     TenantFilter
                                           │
                                   Subdomain'den tenant_id çöz
                                           │
                                   TenantContext (ThreadLocal)
                                           │
                                   Hibernate Filter aktif
                                           │
                                   Tüm sorgular tenant_id ile filtrelenir
```

**Çözümleme sırası:**
1. Subdomain: `{tenant-slug}.app.com`
2. Header fallback: `X-Tenant-ID` (API entegrasyonları için)
3. JWT claim: token içinde `tenantId` (authenticated istekler)

### 2.3 Implementasyon

```kotlin
// TenantContext.kt — ThreadLocal ile tenant bilgisi taşıma
object TenantContext {
    private val currentTenant = ThreadLocal<String>()

    fun setTenantId(tenantId: String) = currentTenant.set(tenantId)
    fun getTenantId(): String = currentTenant.get()
        ?: throw TenantNotFoundException("Tenant context bulunamadı")
    fun clear() = currentTenant.remove()
}
```

```kotlin
// TenantFilter.kt — Her istekte tenant çözümleme
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class TenantFilter : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        try {
            val tenantId = resolveTenant(request)
            TenantContext.setTenantId(tenantId)
            filterChain.doFilter(request, response)
        } finally {
            TenantContext.clear()
        }
    }

    private fun resolveTenant(request: HttpServletRequest): String {
        // 1. Subdomain
        val host = request.serverName
        val subdomain = host.split(".").firstOrNull()
        if (subdomain != null && subdomain != "www" && subdomain != "api") {
            return subdomain
        }
        // 2. Header
        val headerTenant = request.getHeader("X-Tenant-ID")
        if (!headerTenant.isNullOrBlank()) return headerTenant
        // 3. Platform admin istekleri tenant gerektirmez
        throw TenantNotFoundException("Tenant belirlenemedi: $host")
    }
}
```

```kotlin
// Hibernate Filter — Otomatik tenant filtreleme
@FilterDef(
    name = "tenantFilter",
    parameters = [ParamDef(name = "tenantId", type = "string")]
)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@MappedSuperclass
abstract class TenantAwareEntity {
    @Column(name = "tenant_id", nullable = false, updatable = false)
    lateinit var tenantId: String
}
```

```kotlin
// TenantAwareRepository — EntityManager'da filter aktifleştirme
@Aspect
@Component
class TenantAspect(private val entityManager: EntityManager) {

    @Before("execution(* com.aesthetic.backend.repository..*.*(..))")
    fun enableTenantFilter() {
        val session = entityManager.unwrap(Session::class.java)
        session.enableFilter("tenantFilter")
            .setParameter("tenantId", TenantContext.getTenantId())
    }
}
```

---

## 3. Proje Yapısı

```
aesthetic-saas-backend/
├── build.gradle.kts
├── settings.gradle.kts
├── docker-compose.yml
├── Dockerfile
│
├── src/
│   ├── main/
│   │   ├── kotlin/com/aesthetic/backend/
│   │   │   │
│   │   │   ├── AestheticBackendApplication.kt          # Main entry point
│   │   │   │
│   │   │   ├── config/                                  # Konfigürasyon
│   │   │   │   ├── SecurityConfig.kt                    # Spring Security + JWT
│   │   │   │   ├── JwtConfig.kt                         # JWT token ayarları
│   │   │   │   ├── WebConfig.kt                         # CORS, interceptors
│   │   │   │   ├── CacheConfig.kt                       # Redis cache config
│   │   │   │   ├── OpenApiConfig.kt                     # Swagger UI config
│   │   │   │   └── FlywayConfig.kt                      # DB migration config
│   │   │   │
│   │   │   ├── tenant/                                  # Multi-tenant altyapısı
│   │   │   │   ├── TenantContext.kt                     # ThreadLocal tenant holder
│   │   │   │   ├── TenantFilter.kt                     # HTTP filter (subdomain → tenant)
│   │   │   │   ├── TenantAspect.kt                     # Hibernate filter AOP
│   │   │   │   ├── TenantAwareEntity.kt                # Base entity (tenant_id)
│   │   │   │   └── TenantInterceptor.kt                # JPA interceptor (auto-set tenant_id)
│   │   │   │
│   │   │   ├── security/                                # Auth & güvenlik
│   │   │   │   ├── JwtTokenProvider.kt                  # Token oluşturma/doğrulama
│   │   │   │   ├── JwtAuthenticationFilter.kt           # Request filter
│   │   │   │   ├── CustomUserDetailsService.kt          # UserDetails yükleme
│   │   │   │   └── SecurityExpressions.kt               # @PreAuthorize ifadeleri
│   │   │   │
│   │   │   ├── domain/                                  # JPA Entity'ler
│   │   │   │   ├── tenant/
│   │   │   │   │   └── Tenant.kt                        # Tenant (işletme) entity
│   │   │   │   ├── user/
│   │   │   │   │   ├── User.kt
│   │   │   │   │   └── Role.kt                          # Enum: PLATFORM_ADMIN, TENANT_ADMIN, STAFF, CLIENT
│   │   │   │   ├── service/
│   │   │   │   │   ├── Service.kt
│   │   │   │   │   └── ServiceCategory.kt
│   │   │   │   ├── product/
│   │   │   │   │   └── Product.kt
│   │   │   │   ├── blog/
│   │   │   │   │   └── BlogPost.kt
│   │   │   │   ├── gallery/
│   │   │   │   │   └── GalleryItem.kt
│   │   │   │   ├── appointment/
│   │   │   │   │   ├── Appointment.kt
│   │   │   │   │   ├── AppointmentStatus.kt             # Enum
│   │   │   │   │   ├── TimeSlot.kt                      # Müsait zaman dilimi
│   │   │   │   │   └── WorkingHours.kt                  # Çalışma saatleri
│   │   │   │   ├── contact/
│   │   │   │   │   └── ContactMessage.kt
│   │   │   │   └── settings/
│   │   │   │       └── SiteSettings.kt
│   │   │   │
│   │   │   ├── repository/                              # Spring Data JPA Repository'ler
│   │   │   │   ├── TenantRepository.kt
│   │   │   │   ├── UserRepository.kt
│   │   │   │   ├── ServiceRepository.kt
│   │   │   │   ├── ProductRepository.kt
│   │   │   │   ├── BlogPostRepository.kt
│   │   │   │   ├── GalleryItemRepository.kt
│   │   │   │   ├── AppointmentRepository.kt
│   │   │   │   ├── ContactMessageRepository.kt
│   │   │   │   └── SiteSettingsRepository.kt
│   │   │   │
│   │   │   ├── service/                                 # İş mantığı (Business Logic)
│   │   │   │   ├── TenantService.kt                     # Tenant CRUD + onboarding
│   │   │   │   ├── AuthService.kt                       # Login, register, token refresh
│   │   │   │   ├── UserService.kt                       # Kullanıcı yönetimi
│   │   │   │   ├── ServiceManagementService.kt          # Hizmet CRUD
│   │   │   │   ├── ProductService.kt                    # Ürün CRUD
│   │   │   │   ├── BlogService.kt                       # Blog CRUD
│   │   │   │   ├── GalleryService.kt                    # Galeri CRUD
│   │   │   │   ├── AppointmentService.kt                # Randevu: oluştur, iptal, tamamla
│   │   │   │   ├── AvailabilityService.kt               # Müsait slot hesaplama
│   │   │   │   ├── ContactService.kt                    # İletişim mesajları
│   │   │   │   ├── SettingsService.kt                   # Site ayarları
│   │   │   │   ├── FileUploadService.kt                 # Görsel yükleme (S3/MinIO)
│   │   │   │   └── NotificationService.kt               # E-posta + SMS bildirimleri
│   │   │   │
│   │   │   ├── controller/                              # REST API Controller'lar
│   │   │   │   ├── AuthController.kt                    # /api/auth/**
│   │   │   │   ├── TenantController.kt                  # /api/platform/tenants/** (platform admin)
│   │   │   │   ├── ServiceController.kt                 # /api/services/**
│   │   │   │   ├── ProductController.kt                 # /api/products/**
│   │   │   │   ├── BlogController.kt                    # /api/blog/**
│   │   │   │   ├── GalleryController.kt                 # /api/gallery/**
│   │   │   │   ├── AppointmentController.kt             # /api/appointments/**
│   │   │   │   ├── AvailabilityController.kt            # /api/availability/**
│   │   │   │   ├── ContactController.kt                 # /api/contact/**
│   │   │   │   ├── SettingsController.kt                # /api/settings/**
│   │   │   │   ├── FileUploadController.kt              # /api/upload/**
│   │   │   │   └── PublicController.kt                  # /api/public/** (auth gerektirmeyen)
│   │   │   │
│   │   │   ├── dto/                                     # Request/Response DTO'lar
│   │   │   │   ├── request/
│   │   │   │   │   ├── LoginRequest.kt
│   │   │   │   │   ├── RegisterRequest.kt
│   │   │   │   │   ├── CreateServiceRequest.kt
│   │   │   │   │   ├── UpdateServiceRequest.kt
│   │   │   │   │   ├── CreateProductRequest.kt
│   │   │   │   │   ├── UpdateProductRequest.kt
│   │   │   │   │   ├── CreateBlogPostRequest.kt
│   │   │   │   │   ├── UpdateBlogPostRequest.kt
│   │   │   │   │   ├── CreateAppointmentRequest.kt
│   │   │   │   │   ├── UpdateAppointmentStatusRequest.kt
│   │   │   │   │   ├── CreateContactMessageRequest.kt
│   │   │   │   │   ├── UpdateSiteSettingsRequest.kt
│   │   │   │   │   └── CreateTenantRequest.kt
│   │   │   │   └── response/
│   │   │   │       ├── ApiResponse.kt                   # Standart response wrapper
│   │   │   │       ├── TokenResponse.kt                 # JWT token pair
│   │   │   │       ├── PagedResponse.kt                 # Paginated list response
│   │   │   │       ├── ServiceResponse.kt
│   │   │   │       ├── ProductResponse.kt
│   │   │   │       ├── BlogPostResponse.kt
│   │   │   │       ├── AppointmentResponse.kt
│   │   │   │       ├── AvailabilityResponse.kt          # Müsait slotlar
│   │   │   │       └── DashboardStatsResponse.kt
│   │   │   │
│   │   │   ├── mapper/                                  # Entity ↔ DTO dönüşümleri
│   │   │   │   ├── ServiceMapper.kt
│   │   │   │   ├── ProductMapper.kt
│   │   │   │   ├── BlogPostMapper.kt
│   │   │   │   ├── AppointmentMapper.kt
│   │   │   │   └── UserMapper.kt
│   │   │   │
│   │   │   └── exception/                               # Hata yönetimi
│   │   │       ├── GlobalExceptionHandler.kt            # @RestControllerAdvice
│   │   │       ├── TenantNotFoundException.kt
│   │   │       ├── ResourceNotFoundException.kt
│   │   │       ├── DuplicateResourceException.kt
│   │   │       ├── AppointmentConflictException.kt
│   │   │       └── UnauthorizedException.kt
│   │   │
│   │   └── resources/
│   │       ├── application.yml                          # Ana konfigürasyon
│   │       ├── application-dev.yml                      # Geliştirme ortamı
│   │       ├── application-prod.yml                     # Prodüksiyon ortamı
│   │       └── db/migration/                            # Flyway migration dosyaları
│   │           ├── V1__create_tenant_table.sql
│   │           ├── V2__create_user_table.sql
│   │           ├── V3__create_service_tables.sql
│   │           ├── V4__create_product_table.sql
│   │           ├── V5__create_blog_table.sql
│   │           ├── V6__create_gallery_table.sql
│   │           ├── V7__create_appointment_tables.sql
│   │           ├── V8__create_contact_table.sql
│   │           └── V9__create_settings_table.sql
│   │
│   └── test/
│       └── kotlin/com/aesthetic/backend/
│           ├── service/
│           │   ├── AppointmentServiceTest.kt            # Randevu iş mantığı testleri
│           │   └── AvailabilityServiceTest.kt           # Müsaitlik testleri
│           ├── controller/
│           │   ├── AppointmentControllerTest.kt         # API entegrasyon testleri
│           │   └── AuthControllerTest.kt
│           ├── repository/
│           │   └── AppointmentRepositoryTest.kt         # DB testleri (Testcontainers)
│           └── tenant/
│               └── TenantIsolationTest.kt               # Tenant izolasyon testleri

```

---

## 4. Entity / Model Tasarımı (JPA)

### 4.1 Tenant (İşletme)

```kotlin
@Entity
@Table(name = "tenants")
class Tenant(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,

    @Column(unique = true, nullable = false)
    val slug: String,                       // subdomain: "salon1" → salon1.app.com

    @Column(nullable = false)
    var name: String,                       // "Güzellik Merkezi Ayşe"

    @Enumerated(EnumType.STRING)
    var businessType: BusinessType,         // BEAUTY_CLINIC, DENTAL, BARBER, HAIR_SALON

    var phone: String = "",
    var email: String = "",
    var address: String = "",
    var logoUrl: String? = null,
    var domain: String? = null,             // Özel domain (opsiyonel)

    @Enumerated(EnumType.STRING)
    var plan: SubscriptionPlan = SubscriptionPlan.TRIAL,

    var isActive: Boolean = true,

    @Column(name = "created_at")
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at")
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

enum class BusinessType {
    BEAUTY_CLINIC,      // Güzellik kliniği
    DENTAL_CLINIC,      // Diş kliniği
    BARBER_SHOP,        // Berber
    HAIR_SALON          // Kuaför salonu
}

enum class SubscriptionPlan {
    TRIAL,              // 14 gün deneme
    BASIC,              // Temel özellikler
    PROFESSIONAL,       // Gelişmiş özellikler
    ENTERPRISE          // Sınırsız, özel destek
}
```

### 4.2 User (Kullanıcı)

```kotlin
@Entity
@Table(name = "users")
@FilterDef(name = "tenantFilter", parameters = [ParamDef(name = "tenantId", type = "string")])
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,

    @Column(name = "tenant_id", nullable = false)
    val tenantId: String,

    @Column(nullable = false)
    var name: String,

    @Column(unique = true, nullable = false)
    var email: String,

    @Column(nullable = false)
    var passwordHash: String,

    var phone: String? = null,
    var image: String? = null,

    @Enumerated(EnumType.STRING)
    var role: Role = Role.CLIENT,

    var isActive: Boolean = true,

    val createdAt: LocalDateTime = LocalDateTime.now(),
    var updatedAt: LocalDateTime = LocalDateTime.now(),

    // İlişkiler
    @OneToMany(mappedBy = "client", fetch = FetchType.LAZY)
    val appointments: MutableList<Appointment> = mutableListOf()
)

enum class Role {
    PLATFORM_ADMIN,     // Tüm platforma erişim (SaaS sahibi)
    TENANT_ADMIN,       // İşletme sahibi — tüm tenant verilerine erişim
    STAFF,              // Personel — randevular, hastalar
    CLIENT              // Müşteri — kendi randevuları, profili
}
```

### 4.3 Service (Hizmet)

```kotlin
@Entity
@Table(name = "services")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class Service(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,

    @Column(name = "tenant_id", nullable = false)
    val tenantId: String,

    @Column(nullable = false, unique = true)
    var slug: String,

    @Column(nullable = false)
    var title: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    var category: ServiceCategory? = null,

    var shortDescription: String = "",

    @Column(columnDefinition = "TEXT")
    var description: String = "",

    var price: BigDecimal = BigDecimal.ZERO,
    var currency: String = "TRY",

    var durationMinutes: Int = 30,         // Dakika cinsinden süre

    var image: String? = null,

    @ElementCollection
    @CollectionTable(name = "service_benefits")
    var benefits: MutableList<String> = mutableListOf(),

    @ElementCollection
    @CollectionTable(name = "service_process_steps")
    var processSteps: MutableList<String> = mutableListOf(),

    @Column(columnDefinition = "TEXT")
    var recovery: String? = null,

    var isActive: Boolean = true,
    var sortOrder: Int = 0,

    // SEO
    var metaTitle: String? = null,
    var metaDescription: String? = null,
    var ogImage: String? = null,

    val createdAt: LocalDateTime = LocalDateTime.now(),
    var updatedAt: LocalDateTime = LocalDateTime.now()
)
```

### 4.4 Appointment (Randevu) — KRİTİK

```kotlin
@Entity
@Table(
    name = "appointments",
    indexes = [
        Index(name = "idx_appointment_tenant_date", columnList = "tenant_id, date"),
        Index(name = "idx_appointment_staff_date", columnList = "staff_id, date, start_time, end_time"),
        Index(name = "idx_appointment_status", columnList = "status")
    ]
)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class Appointment(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,

    @Column(name = "tenant_id", nullable = false)
    val tenantId: String,

    // Müşteri bilgileri
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    var client: User? = null,               // Kayıtlı müşteri (nullable: misafir randevu)

    var clientName: String,                  // Misafir randevular için
    var clientEmail: String,
    var clientPhone: String,

    // Randevu detayları
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    var service: Service,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    var staff: User? = null,                // Atanan personel

    @Column(nullable = false)
    var date: LocalDate,

    @Column(name = "start_time", nullable = false)
    var startTime: LocalTime,

    @Column(name = "end_time", nullable = false)
    var endTime: LocalTime,

    @Column(columnDefinition = "TEXT")
    var notes: String? = null,

    @Enumerated(EnumType.STRING)
    var status: AppointmentStatus = AppointmentStatus.PENDING,

    // İptal bilgisi
    var cancelledAt: LocalDateTime? = null,
    var cancellationReason: String? = null,

    val createdAt: LocalDateTime = LocalDateTime.now(),
    var updatedAt: LocalDateTime = LocalDateTime.now(),

    // Optimistic locking
    @Version
    var version: Long = 0
)

enum class AppointmentStatus {
    PENDING,            // Onay bekliyor
    CONFIRMED,          // Onaylandı
    IN_PROGRESS,        // Devam ediyor
    COMPLETED,          // Tamamlandı
    CANCELLED,          // İptal edildi
    NO_SHOW             // Gelmedi
}
```

### 4.5 WorkingHours (Çalışma Saatleri)

```kotlin
@Entity
@Table(name = "working_hours")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class WorkingHours(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,

    @Column(name = "tenant_id", nullable = false)
    val tenantId: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    var staff: User? = null,                // null ise genel işletme saatleri

    @Enumerated(EnumType.STRING)
    var dayOfWeek: DayOfWeek,               // MONDAY, TUESDAY, ...

    var startTime: LocalTime,               // 09:00
    var endTime: LocalTime,                 // 18:00

    var breakStartTime: LocalTime? = null,  // 12:00 (öğle arası)
    var breakEndTime: LocalTime? = null,    // 13:00

    var isWorkingDay: Boolean = true         // false = kapalı gün
)
```

### 4.6 BlockedTimeSlot (Bloklanmış Zaman Dilimi)

```kotlin
@Entity
@Table(name = "blocked_time_slots")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class BlockedTimeSlot(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,

    @Column(name = "tenant_id", nullable = false)
    val tenantId: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    var staff: User? = null,

    var date: LocalDate,
    var startTime: LocalTime,
    var endTime: LocalTime,
    var reason: String? = null               // "Tatil", "Toplantı" vb.
)
```

### 4.7 Diğer Entity'ler

```kotlin
// Product.kt
@Entity
@Table(name = "products")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class Product(
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,
    @Column(name = "tenant_id", nullable = false)
    val tenantId: String,
    var slug: String,
    var name: String,
    var brand: String,
    var category: String,
    @Column(columnDefinition = "TEXT") var description: String = "",
    var price: BigDecimal = BigDecimal.ZERO,
    var currency: String = "TRY",
    var image: String? = null,
    @ElementCollection var features: MutableList<String> = mutableListOf(),
    var isActive: Boolean = true,
    var sortOrder: Int = 0,
    var metaTitle: String? = null,
    var metaDescription: String? = null,
    val createdAt: LocalDateTime = LocalDateTime.now(),
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

// BlogPost.kt
@Entity
@Table(name = "blog_posts")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class BlogPost(
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,
    @Column(name = "tenant_id", nullable = false)
    val tenantId: String,
    var slug: String,
    var title: String,
    @Column(columnDefinition = "TEXT") var excerpt: String = "",
    @Column(columnDefinition = "LONGTEXT") var content: String = "",
    var author: String,
    var category: String,
    var image: String? = null,
    @ElementCollection var tags: MutableList<String> = mutableListOf(),
    var readTime: String = "",
    var isPublished: Boolean = false,
    var publishedAt: LocalDateTime? = null,
    var metaTitle: String? = null,
    var metaDescription: String? = null,
    val createdAt: LocalDateTime = LocalDateTime.now(),
    var updatedAt: LocalDateTime = LocalDateTime.now()
)

// GalleryItem.kt
@Entity
@Table(name = "gallery_items")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class GalleryItem(
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,
    @Column(name = "tenant_id", nullable = false)
    val tenantId: String,
    var category: String,
    var serviceName: String,
    var beforeImage: String,
    var afterImage: String,
    var description: String = "",
    var isActive: Boolean = true,
    val createdAt: LocalDateTime = LocalDateTime.now()
)

// ContactMessage.kt
@Entity
@Table(name = "contact_messages")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class ContactMessage(
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,
    @Column(name = "tenant_id", nullable = false)
    val tenantId: String,
    var name: String,
    var email: String,
    var phone: String? = null,
    var subject: String,
    @Column(columnDefinition = "TEXT") var message: String,
    var isRead: Boolean = false,
    val createdAt: LocalDateTime = LocalDateTime.now()
)

// SiteSettings.kt
@Entity
@Table(name = "site_settings")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class SiteSettings(
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,
    @Column(name = "tenant_id", nullable = false, unique = true)
    val tenantId: String,
    var siteName: String = "",
    var phone: String = "",
    var email: String = "",
    var address: String = "",
    var whatsapp: String = "",
    var instagram: String = "",
    var facebook: String = "",
    var twitter: String = "",
    var youtube: String = "",
    var mapEmbedUrl: String = "",
    @Column(columnDefinition = "JSON")
    var workingHoursJson: String = "{}"
)
```

---

## 5. Randevu Sistemi — Çift Randevu Engelleme

Bu sistemin en kritik parçasıdır. Aynı personel, aynı zaman diliminde iki randevu alamamalıdır.

### 5.1 Strateji: Pessimistic Locking + DB Constraint

```
Randevu oluşturma akışı:

  Müşteri "14:00 Botoks" seçer
           │
           ▼
  ① Müsaitlik kontrolü (READ — lock yok)
     → availabilityService.getAvailableSlots(date, serviceId, staffId)
           │
           ▼
  ② Randevu oluşturma isteği
     → POST /api/appointments
           │
           ▼
  ③ Transaction başlat (@Transactional + SERIALIZABLE)
           │
           ▼
  ④ Pessimistic Lock ile çakışma kontrolü
     → SELECT ... FOR UPDATE
     → Aynı staff + tarih + saat aralığında aktif randevu var mı?
           │
     ┌─────┴──────┐
     │ VAR         │ YOK
     │             │
     ▼             ▼
  HATA döndür   ⑤ Randevu kaydet
  409 Conflict     → appointmentRepository.save()
                         │
                         ▼
                  ⑥ Bildirim gönder (async)
                     → E-posta + SMS
                         │
                         ▼
                  ⑦ 201 Created döndür
```

### 5.2 AppointmentService Implementasyonu

```kotlin
@Service
class AppointmentService(
    private val appointmentRepository: AppointmentRepository,
    private val availabilityService: AvailabilityService,
    private val serviceRepository: ServiceRepository,
    private val notificationService: NotificationService,
    private val entityManager: EntityManager
) {
    /**
     * Randevu oluşturma — Pessimistic Locking ile çift randevu engelleme
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    fun createAppointment(request: CreateAppointmentRequest): Appointment {
        val tenantId = TenantContext.getTenantId()
        val service = serviceRepository.findById(request.serviceId)
            .orElseThrow { ResourceNotFoundException("Hizmet bulunamadı") }

        val startTime = request.startTime
        val endTime = startTime.plusMinutes(service.durationMinutes.toLong())

        // ── Pessimistic Lock ile çakışma kontrolü ──
        val conflicts = appointmentRepository.findConflictingAppointmentsWithLock(
            tenantId = tenantId,
            staffId = request.staffId,
            date = request.date,
            startTime = startTime,
            endTime = endTime
        )

        if (conflicts.isNotEmpty()) {
            throw AppointmentConflictException(
                "Bu zaman diliminde zaten bir randevu mevcut. " +
                "Lütfen başka bir saat seçin."
            )
        }

        // ── Çalışma saatleri kontrolü ──
        val isWithinWorkingHours = availabilityService.isWithinWorkingHours(
            tenantId = tenantId,
            staffId = request.staffId,
            date = request.date,
            startTime = startTime,
            endTime = endTime
        )
        if (!isWithinWorkingHours) {
            throw IllegalArgumentException("Seçilen saat çalışma saatleri dışında")
        }

        // ── Bloklanmış zaman kontrolü ──
        val isBlocked = availabilityService.isTimeSlotBlocked(
            tenantId = tenantId,
            staffId = request.staffId,
            date = request.date,
            startTime = startTime,
            endTime = endTime
        )
        if (isBlocked) {
            throw AppointmentConflictException("Bu zaman dilimi bloklanmış")
        }

        // ── Randevu oluştur ──
        val appointment = Appointment(
            tenantId = tenantId,
            clientName = request.clientName,
            clientEmail = request.clientEmail,
            clientPhone = request.clientPhone,
            service = service,
            staffId = request.staffId,
            date = request.date,
            startTime = startTime,
            endTime = endTime,
            notes = request.notes,
            status = AppointmentStatus.PENDING
        )

        val saved = appointmentRepository.save(appointment)

        // ── Bildirim gönder (asenkron) ──
        notificationService.sendAppointmentConfirmation(saved)

        return saved
    }

    /**
     * Randevu durumu güncelleme
     */
    @Transactional
    fun updateStatus(id: String, newStatus: AppointmentStatus, reason: String? = null): Appointment {
        val appointment = appointmentRepository.findById(id)
            .orElseThrow { ResourceNotFoundException("Randevu bulunamadı: $id") }

        // Durum geçiş kuralları
        validateStatusTransition(appointment.status, newStatus)

        appointment.status = newStatus
        appointment.updatedAt = LocalDateTime.now()

        if (newStatus == AppointmentStatus.CANCELLED) {
            appointment.cancelledAt = LocalDateTime.now()
            appointment.cancellationReason = reason
        }

        return appointmentRepository.save(appointment)
    }

    private fun validateStatusTransition(current: AppointmentStatus, next: AppointmentStatus) {
        val allowedTransitions = mapOf(
            AppointmentStatus.PENDING to setOf(
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.CANCELLED
            ),
            AppointmentStatus.CONFIRMED to setOf(
                AppointmentStatus.IN_PROGRESS,
                AppointmentStatus.CANCELLED,
                AppointmentStatus.NO_SHOW
            ),
            AppointmentStatus.IN_PROGRESS to setOf(
                AppointmentStatus.COMPLETED
            )
        )

        val allowed = allowedTransitions[current] ?: emptySet()
        if (next !in allowed) {
            throw IllegalStateException(
                "'$current' durumundan '$next' durumuna geçiş yapılamaz"
            )
        }
    }
}
```

### 5.3 Repository — Pessimistic Lock Query

```kotlin
@Repository
interface AppointmentRepository : JpaRepository<Appointment, String> {

    /**
     * Çakışan randevuları pessimistic lock ile sorgula.
     * SELECT ... FOR UPDATE ile satır seviyesinde kilit alır.
     * Aynı anda gelen ikinci istek, ilk transaction bitene kadar bekler.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.tenantId = :tenantId
        AND a.date = :date
        AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
        AND (a.staff.id = :staffId OR :staffId IS NULL)
        AND a.startTime < :endTime
        AND a.endTime > :startTime
    """)
    fun findConflictingAppointmentsWithLock(
        @Param("tenantId") tenantId: String,
        @Param("staffId") staffId: String?,
        @Param("date") date: LocalDate,
        @Param("startTime") startTime: LocalTime,
        @Param("endTime") endTime: LocalTime
    ): List<Appointment>

    /**
     * Belirli bir tarih aralığındaki randevuları getir
     */
    fun findByTenantIdAndDateBetweenAndStatusNot(
        tenantId: String,
        startDate: LocalDate,
        endDate: LocalDate,
        excludeStatus: AppointmentStatus
    ): List<Appointment>

    /**
     * Personelin belirli gündeki randevuları
     */
    fun findByTenantIdAndStaffIdAndDateOrderByStartTime(
        tenantId: String,
        staffId: String,
        date: LocalDate
    ): List<Appointment>
}
```

### 5.4 AvailabilityService — Müsait Slot Hesaplama

```kotlin
@Service
class AvailabilityService(
    private val workingHoursRepository: WorkingHoursRepository,
    private val appointmentRepository: AppointmentRepository,
    private val blockedTimeSlotRepository: BlockedTimeSlotRepository
) {
    /**
     * Belirli bir gün için müsait zaman dilimlerini hesapla
     *
     * Algoritma:
     * 1. Çalışma saatlerini al → tüm slotları oluştur
     * 2. Mevcut randevuları çıkar
     * 3. Bloklanmış zamanları çıkar
     * 4. Kalan slotları döndür
     */
    fun getAvailableSlots(
        tenantId: String,
        staffId: String?,
        date: LocalDate,
        durationMinutes: Int,
        slotIntervalMinutes: Int = 30    // 30 dakikalık aralıklarla slot
    ): List<TimeSlotResponse> {

        val dayOfWeek = date.dayOfWeek

        // 1. Çalışma saatleri
        val workingHours = workingHoursRepository.findByTenantIdAndStaffIdAndDayOfWeek(
            tenantId, staffId, dayOfWeek
        ) ?: return emptyList()

        if (!workingHours.isWorkingDay) return emptyList()

        // 2. Tüm olası slotları oluştur
        val allSlots = generateTimeSlots(
            start = workingHours.startTime,
            end = workingHours.endTime,
            duration = durationMinutes,
            interval = slotIntervalMinutes,
            breakStart = workingHours.breakStartTime,
            breakEnd = workingHours.breakEndTime
        )

        // 3. Mevcut randevuları al
        val existingAppointments = appointmentRepository
            .findByTenantIdAndStaffIdAndDateOrderByStartTime(
                tenantId, staffId ?: "", date
            )
            .filter { it.status !in listOf(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW) }

        // 4. Bloklanmış zamanları al
        val blockedSlots = blockedTimeSlotRepository
            .findByTenantIdAndStaffIdAndDate(tenantId, staffId, date)

        // 5. Çakışanları çıkar
        return allSlots.map { slot ->
            val isBooked = existingAppointments.any { appt ->
                slot.startTime < appt.endTime && slot.endTime > appt.startTime
            }
            val isBlocked = blockedSlots.any { blocked ->
                slot.startTime < blocked.endTime && slot.endTime > blocked.startTime
            }
            TimeSlotResponse(
                startTime = slot.startTime,
                endTime = slot.endTime,
                isAvailable = !isBooked && !isBlocked
            )
        }
    }

    private fun generateTimeSlots(
        start: LocalTime,
        end: LocalTime,
        duration: Int,
        interval: Int,
        breakStart: LocalTime?,
        breakEnd: LocalTime?
    ): List<TimeSlot> {
        val slots = mutableListOf<TimeSlot>()
        var current = start

        while (current.plusMinutes(duration.toLong()) <= end) {
            val slotEnd = current.plusMinutes(duration.toLong())

            // Öğle arası kontrolü
            val isDuringBreak = breakStart != null && breakEnd != null &&
                current < breakEnd && slotEnd > breakStart

            if (!isDuringBreak) {
                slots.add(TimeSlot(startTime = current, endTime = slotEnd))
            }

            current = current.plusMinutes(interval.toLong())
        }

        return slots
    }

    fun isWithinWorkingHours(
        tenantId: String,
        staffId: String?,
        date: LocalDate,
        startTime: LocalTime,
        endTime: LocalTime
    ): Boolean {
        val wh = workingHoursRepository.findByTenantIdAndStaffIdAndDayOfWeek(
            tenantId, staffId, date.dayOfWeek
        ) ?: return false

        return wh.isWorkingDay && startTime >= wh.startTime && endTime <= wh.endTime
    }

    fun isTimeSlotBlocked(
        tenantId: String,
        staffId: String?,
        date: LocalDate,
        startTime: LocalTime,
        endTime: LocalTime
    ): Boolean {
        val blocked = blockedTimeSlotRepository.findByTenantIdAndStaffIdAndDate(
            tenantId, staffId, date
        )
        return blocked.any { it.startTime < endTime && it.endTime > startTime }
    }
}
```

---

## 6. API Endpoint Tasarımı

### 6.1 Public API (Auth gerektirmez)

Tenant'ın açık sitesinden gelen istekler. Subdomain'den tenant çözümlenir.

```
GET    /api/public/services                  # Aktif hizmetleri listele
GET    /api/public/services/{slug}           # Hizmet detayı
GET    /api/public/products                  # Aktif ürünleri listele
GET    /api/public/products/{slug}           # Ürün detayı
GET    /api/public/blog                      # Yayınlanmış blog yazıları
GET    /api/public/blog/{slug}               # Blog yazısı detayı
GET    /api/public/gallery                   # Aktif galeri öğeleri
GET    /api/public/availability              # Müsait randevu slotları
       ?date=2026-02-15
       &serviceId=xxx
       &staffId=xxx (opsiyonel)
POST   /api/public/appointments              # Randevu oluştur (misafir)
POST   /api/public/contact                   # İletişim formu gönder
GET    /api/public/settings                  # Site ayarları (isim, adres, vb.)
```

### 6.2 Auth API

```
POST   /api/auth/login                       # Email + şifre → JWT token pair
POST   /api/auth/register                    # Yeni müşteri kaydı
POST   /api/auth/refresh                     # Refresh token → yeni access token
POST   /api/auth/forgot-password             # Şifre sıfırlama e-postası gönder
POST   /api/auth/reset-password              # Token ile şifre sıfırla
GET    /api/auth/me                          # Mevcut kullanıcı bilgisi
```

### 6.3 Admin API (TENANT_ADMIN + STAFF)

```
# Dashboard
GET    /api/admin/dashboard/stats            # İstatistikler (randevu, hasta, gelir)

# Hizmetler
GET    /api/admin/services                   # Tüm hizmetler (aktif + pasif)
POST   /api/admin/services                   # Yeni hizmet oluştur
GET    /api/admin/services/{id}              # Hizmet detayı
PUT    /api/admin/services/{id}              # Hizmet güncelle
DELETE /api/admin/services/{id}              # Hizmet sil (soft delete)
PATCH  /api/admin/services/{id}/sort         # Sıralama güncelle

# Ürünler
GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/{id}
DELETE /api/admin/products/{id}

# Blog
GET    /api/admin/blog
POST   /api/admin/blog
PUT    /api/admin/blog/{id}
DELETE /api/admin/blog/{id}
PATCH  /api/admin/blog/{id}/publish          # Yayınla/taslak yap

# Galeri
GET    /api/admin/gallery
POST   /api/admin/gallery
PUT    /api/admin/gallery/{id}
DELETE /api/admin/gallery/{id}

# Randevular
GET    /api/admin/appointments               # Filtreli liste
       ?status=PENDING
       &date=2026-02-15
       &staffId=xxx
POST   /api/admin/appointments               # Admin'den randevu oluştur
PUT    /api/admin/appointments/{id}          # Randevu güncelle
PATCH  /api/admin/appointments/{id}/status   # Durum değiştir (confirm, cancel, complete)

# Hastalar / Müşteriler
GET    /api/admin/patients                   # Hasta listesi
GET    /api/admin/patients/{id}              # Hasta detayı + randevu geçmişi
PUT    /api/admin/patients/{id}              # Hasta bilgisi güncelle

# İletişim Mesajları
GET    /api/admin/messages                   # Mesaj listesi
GET    /api/admin/messages/{id}              # Mesaj detayı
PATCH  /api/admin/messages/{id}/read         # Okundu işaretle
DELETE /api/admin/messages/{id}              # Mesaj sil

# Personel Yönetimi
GET    /api/admin/staff                      # Personel listesi
POST   /api/admin/staff                      # Yeni personel ekle
PUT    /api/admin/staff/{id}                 # Personel güncelle
DELETE /api/admin/staff/{id}                 # Personel çıkar

# Çalışma Saatleri
GET    /api/admin/working-hours              # Genel çalışma saatleri
PUT    /api/admin/working-hours              # Çalışma saatlerini güncelle
GET    /api/admin/working-hours/staff/{id}   # Personel çalışma saatleri
PUT    /api/admin/working-hours/staff/{id}   # Personel saatlerini güncelle

# Bloklanmış Zamanlar
GET    /api/admin/blocked-slots              # Bloklanmış zaman dilimleri
POST   /api/admin/blocked-slots              # Zaman dilimi blokla
DELETE /api/admin/blocked-slots/{id}         # Bloklamayı kaldır

# Site Ayarları
GET    /api/admin/settings                   # Site ayarlarını getir
PUT    /api/admin/settings                   # Site ayarlarını güncelle

# SEO Yönetimi
GET    /api/admin/seo/pages                  # Tüm sayfaların SEO bilgileri
PUT    /api/admin/seo/pages/{type}/{id}      # Sayfa SEO bilgisi güncelle

# Dosya Yükleme
POST   /api/admin/upload                     # Görsel yükle (multipart)
DELETE /api/admin/upload/{fileId}            # Görseli sil
```

### 6.4 Platform Admin API (PLATFORM_ADMIN only)

```
# Tenant Yönetimi
GET    /api/platform/tenants                 # Tüm tenant'ları listele
POST   /api/platform/tenants                 # Yeni tenant oluştur (onboarding)
GET    /api/platform/tenants/{id}            # Tenant detayı
PUT    /api/platform/tenants/{id}            # Tenant güncelle
PATCH  /api/platform/tenants/{id}/activate   # Tenant aktif/pasif
PATCH  /api/platform/tenants/{id}/plan       # Plan değiştir

# Platform İstatistikler
GET    /api/platform/stats                   # Genel platform istatistikleri
GET    /api/platform/stats/tenants           # Tenant bazlı istatistikler
```

### 6.5 Standart Response Format

```kotlin
// Başarılı yanıt
data class ApiResponse<T>(
    val success: Boolean = true,
    val data: T? = null,
    val message: String? = null,
    val timestamp: LocalDateTime = LocalDateTime.now()
)

// Sayfalı yanıt
data class PagedResponse<T>(
    val success: Boolean = true,
    val data: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int
)

// Hata yanıtı
data class ErrorResponse(
    val success: Boolean = false,
    val error: String,
    val code: String,           // "APPOINTMENT_CONFLICT", "VALIDATION_ERROR", vb.
    val details: Map<String, String>? = null,
    val timestamp: LocalDateTime = LocalDateTime.now()
)
```

---

## 7. Güvenlik Mimarisi

### 7.1 JWT Token Yapısı

```
Access Token (15 dk ömür):
{
  "sub": "user-uuid",
  "tenantId": "salon1",
  "role": "TENANT_ADMIN",
  "email": "admin@salon1.com",
  "iat": 1707580800,
  "exp": 1707581700
}

Refresh Token (7 gün ömür):
{
  "sub": "user-uuid",
  "type": "refresh",
  "iat": 1707580800,
  "exp": 1708185600
}
```

### 7.2 Spring Security Konfigürasyonu

```kotlin
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
class SecurityConfig(
    private val jwtAuthFilter: JwtAuthenticationFilter,
    private val tenantFilter: TenantFilter
) {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .cors { it.configurationSource(corsConfigSource()) }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .addFilterBefore(tenantFilter, UsernamePasswordAuthenticationFilter::class.java)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)
            .authorizeHttpRequests { auth ->
                auth
                    // Public endpoints
                    .requestMatchers("/api/public/**").permitAll()
                    .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
                    .requestMatchers("/api/auth/forgot-password", "/api/auth/reset-password").permitAll()
                    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                    // Platform admin
                    .requestMatchers("/api/platform/**").hasRole("PLATFORM_ADMIN")
                    // Admin endpoints
                    .requestMatchers("/api/admin/**").hasAnyRole("TENANT_ADMIN", "STAFF")
                    // Authenticated
                    .anyRequest().authenticated()
            }

        return http.build()
    }

    @Bean
    fun corsConfigSource(): CorsConfigurationSource {
        val config = CorsConfiguration()
        config.allowedOriginPatterns = listOf(
            "https://*.app.com",        // Tüm tenant subdomain'leri
            "http://localhost:3000"       // Geliştirme
        )
        config.allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        config.allowedHeaders = listOf("*")
        config.allowCredentials = true
        config.maxAge = 3600

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", config)
        return source
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder(12)
}
```

### 7.3 Rol Tabanlı Erişim Kontrolü

```kotlin
// Controller'da kullanım
@RestController
@RequestMapping("/api/admin/services")
class ServiceController(private val serviceService: ServiceManagementService) {

    @GetMapping
    @PreAuthorize("hasAnyRole('TENANT_ADMIN', 'STAFF')")
    fun listServices(pageable: Pageable): PagedResponse<ServiceResponse> {
        // STAFF ve TENANT_ADMIN görebilir
    }

    @PostMapping
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    fun createService(@Valid @RequestBody request: CreateServiceRequest): ApiResponse<ServiceResponse> {
        // Sadece TENANT_ADMIN oluşturabilir
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    fun deleteService(@PathVariable id: String): ApiResponse<Nothing> {
        // Sadece TENANT_ADMIN silebilir
    }
}
```

---

## 8. Veritabanı Şeması (MySQL)

### 8.1 ER Diyagramı (İlişkiler)

```
┌──────────┐       ┌──────────┐       ┌──────────────┐
│ tenants  │───1:N─│  users   │───1:N─│ appointments │
└──────────┘       └──────────┘       └──────────────┘
     │                  │                     │
     │ 1:N              │                     │ N:1
     ▼                  │                     ▼
┌──────────┐            │              ┌──────────┐
│ services │────────────┘              │ services │
└──────────┘                           └──────────┘
     │
     │ (tenant_id FK)
     │
┌──────────┐  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐
│ products │  │ blog_posts   │  │ gallery_items │  │ contact_msgs  │
└──────────┘  └──────────────┘  └───────────────┘  └───────────────┘
     │              │                   │                   │
     └──────────────┴───────────────────┴───────────────────┘
                    Hepsi tenant_id ile filtrelenir
```

### 8.2 Kritik Indexler

```sql
-- Randevu çakışma sorgularını hızlandırmak için
CREATE INDEX idx_appt_conflict
    ON appointments(tenant_id, staff_id, date, start_time, end_time, status);

-- Tenant çözümleme
CREATE UNIQUE INDEX idx_tenant_slug ON tenants(slug);
CREATE UNIQUE INDEX idx_tenant_domain ON tenants(domain) WHERE domain IS NOT NULL;

-- Kullanıcı araması
CREATE UNIQUE INDEX idx_user_email_tenant ON users(email, tenant_id);

-- Blog/hizmet SEO slug'ları
CREATE UNIQUE INDEX idx_service_slug_tenant ON services(slug, tenant_id);
CREATE UNIQUE INDEX idx_product_slug_tenant ON products(slug, tenant_id);
CREATE UNIQUE INDEX idx_blog_slug_tenant ON blog_posts(slug, tenant_id);
```

### 8.3 Flyway Migration Örneği

```sql
-- V1__create_tenant_table.sql
CREATE TABLE tenants (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    business_type ENUM('BEAUTY_CLINIC','DENTAL_CLINIC','BARBER_SHOP','HAIR_SALON') NOT NULL,
    phone VARCHAR(20) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    address TEXT DEFAULT '',
    logo_url VARCHAR(500),
    domain VARCHAR(255),
    plan ENUM('TRIAL','BASIC','PROFESSIONAL','ENTERPRISE') DEFAULT 'TRIAL',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- V7__create_appointment_tables.sql
CREATE TABLE appointments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    client_id VARCHAR(36),
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    service_id VARCHAR(36) NOT NULL,
    staff_id VARCHAR(36),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    notes TEXT,
    status ENUM('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')
        DEFAULT 'PENDING',
    cancelled_at TIMESTAMP NULL,
    cancellation_reason VARCHAR(500),
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (staff_id) REFERENCES users(id),

    INDEX idx_appt_conflict (tenant_id, staff_id, date, start_time, end_time, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE working_hours (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    staff_id VARCHAR(36),
    day_of_week ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start_time TIME,
    break_end_time TIME,
    is_working_day BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (staff_id) REFERENCES users(id),

    UNIQUE KEY uk_working_hours (tenant_id, staff_id, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE blocked_time_slots (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    staff_id VARCHAR(36),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(500),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (staff_id) REFERENCES users(id),

    INDEX idx_blocked_slot (tenant_id, staff_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 9. Konfigürasyon

### 9.1 application.yml

```yaml
spring:
  application:
    name: aesthetic-saas-backend

  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:aesthetic_saas}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Europe/Istanbul
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 20000

  jpa:
    hibernate:
      ddl-auto: validate     # Flyway yönetir, Hibernate sadece doğrular
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true
        default_batch_fetch_size: 20
    open-in-view: false       # Performans için kapalı

  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB

  jackson:
    serialization:
      write-dates-as-timestamps: false
    time-zone: Europe/Istanbul

# JWT
jwt:
  secret: ${JWT_SECRET:my-super-secret-key-that-should-be-at-least-256-bits}
  access-token-expiration: 900000       # 15 dakika (ms)
  refresh-token-expiration: 604800000   # 7 gün (ms)

# File Upload
file:
  upload:
    provider: ${FILE_PROVIDER:local}     # local | s3 | minio
    local-path: ./uploads
    s3:
      bucket: ${S3_BUCKET:aesthetic-saas}
      region: ${S3_REGION:eu-central-1}
      access-key: ${S3_ACCESS_KEY:}
      secret-key: ${S3_SECRET_KEY:}

# Logging
logging:
  level:
    root: INFO
    com.aesthetic.backend: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE

server:
  port: ${SERVER_PORT:8080}
```

### 9.2 build.gradle.kts

```kotlin
plugins {
    kotlin("jvm") version "1.9.25"
    kotlin("plugin.spring") version "1.9.25"
    kotlin("plugin.jpa") version "1.9.25"
    id("org.springframework.boot") version "3.3.5"
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.aesthetic"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot Starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // Kotlin
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    // Database
    runtimeOnly("com.mysql:mysql-connector-j")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-mysql")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    // Password Hashing
    implementation("org.springframework.security:spring-security-crypto")

    // OpenAPI / Swagger
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

    // Redis (opsiyonel cache)
    // implementation("org.springframework.boot:spring-boot-starter-data-redis")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("io.mockk:mockk:1.13.12")
    testImplementation("org.testcontainers:testcontainers:1.20.3")
    testImplementation("org.testcontainers:mysql:1.20.3")
    testImplementation("org.testcontainers:junit-jupiter:1.20.3")
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

---

## 10. Docker & Deployment

### 10.1 docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=aesthetic_saas
      - DB_USERNAME=root
      - DB_PASSWORD=secret
      - JWT_SECRET=your-production-secret-key-min-256-bits
      - FILE_PROVIDER=local
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - uploads:/app/uploads

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=secret
      - MYSQL_DATABASE=aesthetic_saas
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis (opsiyonel — cache + session)
  # redis:
  #   image: redis:7-alpine
  #   ports:
  #     - "6379:6379"

volumes:
  mysql-data:
  uploads:
```

### 10.2 Dockerfile

```dockerfile
FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

COPY build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 10.3 Multi-Stage Build (Prodüksiyon)

```dockerfile
# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build
COPY . .
RUN ./gradlew bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xmx512m", "-jar", "app.jar"]
```

---

## 11. Frontend Entegrasyonu

### 11.1 Next.js Frontend'den API Çağrıları

Mevcut Next.js frontend, şu anda kendi API route'larını (`app/api/*`) kullanıyor. Spring Boot backend'e geçişte:

```
Mevcut:   Next.js → app/api/services/route.ts → Prisma → PostgreSQL
Yeni:     Next.js → Spring Boot API → JPA → MySQL
```

**Geçiş stratejisi:**

1. Next.js `app/api/` route'larını Spring Boot URL'lerine proxy olarak yönlendir
2. Veya doğrudan frontend'den Spring Boot API'ye istek at (CORS ayarlı)

```typescript
// lib/api-client.ts (Next.js tarafı)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function fetchServices() {
  const res = await fetch(`${API_BASE}/api/public/services`, {
    headers: {
      'X-Tenant-ID': getTenantSlug(), // veya subdomain'den otomatik
    },
  });
  return res.json();
}

export async function createAppointment(data: AppointmentFormData) {
  const res = await fetch(`${API_BASE}/api/public/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': getTenantSlug(),
    },
    body: JSON.stringify(data),
  });
  return res.json();
}
```

### 11.2 Admin Panel Entegrasyonu

```typescript
// lib/admin-api-client.ts
export async function adminFetch(endpoint: string, options?: RequestInit) {
  const token = getAccessToken(); // JWT from localStorage/cookie

  const res = await fetch(`${API_BASE}/api/admin${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    // Token expired → refresh
    await refreshToken();
    return adminFetch(endpoint, options); // Retry
  }

  return res.json();
}
```

---

## 12. Tenant Onboarding Akışı

```
Yeni işletme kaydı:

  ① İşletme sahibi kayıt formu doldurur
     → POST /api/platform/tenants
     │
     ▼
  ② Tenant oluşturulur (slug: "guzellik-merkezi-ayse")
     → tenants tablosuna kayıt
     │
     ▼
  ③ Varsayılan admin kullanıcı oluşturulur
     → users tablosuna TENANT_ADMIN rolünde
     │
     ▼
  ④ Varsayılan site ayarları oluşturulur
     → site_settings tablosuna
     │
     ▼
  ⑤ Varsayılan çalışma saatleri oluşturulur
     → working_hours tablosuna (Pzt-Cmt 09:00-18:00)
     │
     ▼
  ⑥ Deneme süresi başlar (14 gün)
     → plan = TRIAL
     │
     ▼
  ⑦ Subdomain aktif: guzellik-merkezi-ayse.app.com
```

---

## 13. Performans Optimizasyonları

### 13.1 N+1 Problemi Çözümü
- `@EntityGraph` ile eager fetch (kontrollü)
- `JOIN FETCH` JPQL sorguları
- `default_batch_fetch_size: 20` (Hibernate)

### 13.2 Sayfalama
- Tüm liste endpoint'leri `Pageable` destekler
- `?page=0&size=20&sort=createdAt,desc`

### 13.3 Cache Stratejisi (Redis ile)
- Hizmet listesi: 5 dk TTL
- Ürün listesi: 5 dk TTL
- Blog listesi: 5 dk TTL
- Müsaitlik: 1 dk TTL (kısa, güncel olmalı)
- Site ayarları: 15 dk TTL
- Cache invalidation: Entity değiştiğinde `@CacheEvict`

### 13.4 Connection Pool
- HikariCP (Spring Boot default)
- `maximum-pool-size: 20` (tenant sayısına göre ayarlanır)

---

## 14. Monitoring & Logging

### 14.1 Spring Actuator Endpoint'leri
```
/actuator/health         # Sağlık durumu (DB, Redis)
/actuator/metrics        # JVM, HTTP, DB metrikleri
/actuator/prometheus     # Prometheus formatında metrikler
```

### 14.2 Structured Logging
```kotlin
// Her log satırında tenant bilgisi
logger.info("[tenant={}] Randevu oluşturuldu: {}", tenantId, appointmentId)
```

### 14.3 Audit Log
```kotlin
@Entity
@Table(name = "audit_logs")
class AuditLog(
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null,
    val tenantId: String,
    val userId: String,
    val action: String,          // "CREATE_APPOINTMENT", "UPDATE_SERVICE"
    val entityType: String,      // "Appointment", "Service"
    val entityId: String,
    val details: String? = null, // JSON: değişen alanlar
    val ipAddress: String? = null,
    val createdAt: LocalDateTime = LocalDateTime.now()
)
```

---

## 15. Test Stratejisi

### 15.1 Katmanlı Test

| Katman | Araç | Kapsam |
|--------|------|--------|
| Unit Test | JUnit 5 + MockK | Service katmanı (iş mantığı) |
| Integration Test | Testcontainers (MySQL) | Repository + Service + DB |
| API Test | MockMvc + WebTestClient | Controller endpoint'leri |
| Tenant Isolation | Testcontainers | Tenant A verisi Tenant B'den izole mi? |
| Concurrency Test | CountDownLatch + Threads | Çift randevu engelleme testi |

### 15.2 Kritik Test: Çift Randevu Engelleme

```kotlin
@SpringBootTest
@Testcontainers
class AppointmentConcurrencyTest {

    @Test
    fun `aynı slota eşzamanlı iki randevu isteği geldiğinde sadece biri başarılı olmalı`() {
        val latch = CountDownLatch(1)
        val results = ConcurrentHashMap<String, Boolean>()

        val thread1 = Thread {
            latch.await()
            try {
                appointmentService.createAppointment(request1)
                results["thread1"] = true
            } catch (e: AppointmentConflictException) {
                results["thread1"] = false
            }
        }

        val thread2 = Thread {
            latch.await()
            try {
                appointmentService.createAppointment(request2) // aynı slot
                results["thread2"] = true
            } catch (e: AppointmentConflictException) {
                results["thread2"] = false
            }
        }

        thread1.start()
        thread2.start()
        latch.countDown() // İkisini aynı anda başlat

        thread1.join()
        thread2.join()

        // Sadece biri başarılı olmalı
        val successCount = results.values.count { it }
        assertEquals(1, successCount,
            "Aynı slota iki randevu oluşturulmamalı!")
    }
}
```

---

## 16. Uygulama Yol Haritası

```
Faz B1: Proje İskeleti (1 hafta)
├── Spring Boot projesi oluştur
├── Gradle + bağımlılıklar
├── application.yml konfigürasyonu
├── Docker Compose (MySQL)
├── Flyway migration'lar
└── Temel entity'ler + repository'ler

Faz B2: Multi-Tenant Altyapı (1 hafta)
├── TenantContext + TenantFilter
├── Hibernate Filter entegrasyonu
├── Tenant CRUD (Platform Admin)
├── Tenant izolasyon testleri
└── Onboarding akışı

Faz B3: Auth & Güvenlik (1 hafta)
├── JWT token provider
├── Spring Security konfigürasyonu
├── Login / Register / Refresh endpoints
├── Role-based access control
└── Auth testleri

Faz B4: CRUD API'ler (2 hafta)
├── Service CRUD + DTO'lar + validation
├── Product CRUD
├── Blog CRUD (yayınla/taslak)
├── Gallery CRUD
├── Contact mesajları
├── Site ayarları
├── Dosya yükleme
└── Swagger UI dokümantasyonu

Faz B5: Randevu Sistemi (2 hafta)
├── Appointment entity + repository
├── WorkingHours + BlockedTimeSlot
├── AvailabilityService (müsait slot hesaplama)
├── AppointmentService (pessimistic locking)
├── Çift randevu engelleme testleri
├── Durum yönetimi (state machine)
└── Dashboard istatistikleri

Faz B6: Entegrasyon & Deployment (1 hafta)
├── Next.js frontend API client güncelleme
├── CORS ayarları
├── Docker production build
├── Monitoring (Actuator + logging)
├── Performans testleri
└── Deployment (VPS / Cloud)
```

---

## 17. Ortam Değişkenleri

```env
# Veritabanı
DB_HOST=localhost
DB_PORT=3306
DB_NAME=aesthetic_saas
DB_USERNAME=root
DB_PASSWORD=secret

# JWT
JWT_SECRET=min-256-bit-secret-key-for-production-use

# Server
SERVER_PORT=8080

# File Upload
FILE_PROVIDER=local          # local | s3 | minio
S3_BUCKET=aesthetic-saas
S3_REGION=eu-central-1
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Redis (opsiyonel)
# REDIS_HOST=localhost
# REDIS_PORT=6379

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000
```
