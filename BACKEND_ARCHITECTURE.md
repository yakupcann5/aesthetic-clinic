# Kotlin + Spring Boot — Multi-Tenant SaaS Backend Mimarisi

## 1. Genel Bakış

Bu doküman, mevcut Next.js frontend'i destekleyecek **Kotlin + Spring Boot** tabanlı multi-tenant SaaS backend mimarisini tanımlar. Platform; güzellik klinikleri, diş klinikleri, berber dükkanları ve kuaför salonları için randevu yönetim sistemi sunar.

### Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Dil | Kotlin 2.0+ |
| Framework | Spring Boot 3.4+ |
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
                              ┌────────────┴────────────┐
                              │                         │
                        Authenticated?              Anonymous?
                              │                         │
                     JWT tenantId claim          Subdomain'den çöz
                              │                         │
                              └────────┬────────────────┘
                                       │
                                TenantContext (ThreadLocal)
                                       │
                                Hibernate Filter aktif
                                       │
                                Tüm sorgular tenant_id ile filtrelenir
```

**Çözümleme sırası (güvenlik öncelikli):**
1. **JWT claim (öncelikli):** Authenticated isteklerde token içindeki `tenantId` kullanılır. Subdomain ile JWT uyuşmazlığı → 403 hatası.
2. **Subdomain:** `{tenant-slug}.app.com` — anonymous istekler için (public API).
3. **Platform admin:** `/api/platform/**` istekleri tenant gerektirmez.

> **GÜVENLİK NOTU:** `X-Tenant-ID` header'ı **KALDIRILDI**. Önceki versiyonda herhangi biri header göndererek başka tenant'ın verisine erişebiliyordu. Artık:
> - Anonymous istekler → subdomain'den çözümlenir (sahteleme mümkün değil, DNS seviyesinde korunur)
> - Authenticated istekler → JWT'deki `tenantId` claim kullanılır (sunucu tarafında imzalı, sahteleme mümkün değil)
> - Subdomain ≠ JWT tenantId → istek reddedilir (cross-tenant saldırı engellenir)

### 2.3 Implementasyon

```kotlin
// TenantContext.kt — ThreadLocal ile tenant bilgisi taşıma
object TenantContext {
    // DİKKAT: InheritableThreadLocal DEĞİL, düz ThreadLocal kullanılmalı!
    // InheritableThreadLocal thread pool'larda sorunludur: thread yeniden kullanıldığında
    // eski parent thread'in tenant bilgisi kalır ve yanlış tenant'a erişim riski oluşur.
    // Async propagation için TenantAwareTaskDecorator kullanılır (bkz. 2.4).
    private val currentTenant = ThreadLocal<String>()

    fun setTenantId(tenantId: String) = currentTenant.set(tenantId)
    fun getTenantId(): String = currentTenant.get()
        ?: throw TenantNotFoundException("Tenant context bulunamadı")
    fun getTenantIdOrNull(): String? = currentTenant.get()
    fun clear() = currentTenant.remove()
}
```

```kotlin
// TenantFilter.kt — Her istekte tenant çözümleme (GÜVENLİ VERSİYON)
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class TenantFilter(
    private val tenantRepository: TenantRepository
) : OncePerRequestFilter() {

    companion object {
        private val logger = LoggerFactory.getLogger(TenantFilter::class.java)
    }

    // Caffeine local cache — Her istekte DB sorgusu yapmayı önler.
    // TTL 5 dakika: Tenant deaktive edilirse max 5 dk gecikmeyle algılanır.
    // Tenant deaktivasyonunda manuel invalidation için invalidateTenantCache() metodu var.
    private val tenantCache: Cache<String, Tenant> = Caffeine.newBuilder()
        .maximumSize(1_000)
        .expireAfterWrite(Duration.ofMinutes(5))
        .build()

    // Platform admin ve auth endpoint'leri tenant gerektirmez
    // exactPaths: Tam eşleşme (prefix değil!)
    // prefixPaths: Prefix eşleşme (alt yollar dahil)
    private val exactExemptPaths = setOf(
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/refresh",
        "/api/auth/forgot-password",
        "/api/auth/reset-password"
    )
    private val prefixExemptPaths = listOf(
        "/api/platform/",
        "/api/webhooks/",           // Dış servis callback (iyzico vb.) — tenant gerektirmez
        "/swagger-ui/",
        "/v3/api-docs",
        "/actuator/"
    )

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        val uri = request.requestURI
        return uri in exactExemptPaths || prefixExemptPaths.any { uri.startsWith(it) }
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        try {
            val host = request.serverName
            val tenant = resolveTenant(host)

            TenantContext.setTenantId(tenant.id!!)
            filterChain.doFilter(request, response)
        } finally {
            TenantContext.clear()
        }
    }

    /**
     * Tenant çözümleme: Önce subdomain, başarısız olursa custom domain dener.
     * Sonuç Caffeine cache'te tutulur (5 dk TTL).
     */
    private fun resolveTenant(host: String): Tenant {
        // 1. Subdomain dene: salon1.app.com → slug = "salon1"
        val slug = extractSubdomain(host)
        if (slug != null) {
            return tenantCache.get(slug) { key ->
                tenantRepository.findBySlugAndIsActiveTrue(key)
                    ?: throw TenantNotFoundException("Tenant bulunamadı veya aktif değil: $key")
            }
        }

        // 2. Custom domain dene: salongüzellik.com → customDomain alanından çöz
        // NOT: Bu özellik Tenant entity'sinde customDomain alanı gerektirir.
        val cacheKey = "domain:$host"
        return tenantCache.get(cacheKey) { _ ->
            tenantRepository.findByCustomDomainAndIsActiveTrue(host)
                ?: throw TenantNotFoundException(
                    "Tenant belirlenemedi. Subdomain ({slug}.app.com) veya kayıtlı custom domain gerekli."
                )
        }
    }

    /**
     * Subdomain çıkarma: salon1.app.com → "salon1"
     * www, api, admin subdomain'leri hariç tutulur.
     */
    private fun extractSubdomain(host: String): String? {
        val parts = host.split(".")
        if (parts.size >= 3) {
            val subdomain = parts.first()
            if (subdomain !in setOf("www", "api", "admin")) {
                return subdomain
            }
        }
        return null
    }

    /**
     * Tenant deaktive edildiğinde cache'ten manual invalidation.
     * Admin API'den çağrılmalı.
     */
    fun invalidateTenantCache(slug: String) {
        tenantCache.invalidate(slug)
        logger.info("Tenant cache invalidated: $slug")
    }
}
```

```kotlin
// JwtAuthenticationFilter.kt — JWT tenantId doğrulaması (cross-tenant saldırı engelleme)
@Component
class JwtAuthenticationFilter(
    private val jwtTokenProvider: JwtTokenProvider
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val token = extractToken(request)
        if (token != null && jwtTokenProvider.validateToken(token)) {
            val claims = jwtTokenProvider.getClaims(token)
            val jwtTenantId = claims["tenantId"] as? String

            // KRİTİK: JWT'deki tenantId ile TenantFilter'dan gelen tenantId eşleşmeli
            val contextTenantId = TenantContext.getTenantIdOrNull()
            if (contextTenantId != null && jwtTenantId != null && contextTenantId != jwtTenantId) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN,
                    "Token ile subdomain tenant uyuşmuyor. Cross-tenant erişim engellendi.")
                return
            }

            // Authentication context'e kullanıcı bilgisi ekle
            val authentication = jwtTokenProvider.getAuthentication(token)
            SecurityContextHolder.getContext().authentication = authentication
        }

        filterChain.doFilter(request, response)
    }

    private fun extractToken(request: HttpServletRequest): String? {
        val header = request.getHeader("Authorization")
        return if (header?.startsWith("Bearer ") == true) header.substring(7) else null
    }
}
```

```kotlin
// TenantAwareEntity.kt — Tüm tenant-scoped entity'lerin base class'ı
// @FilterDef burada tanımlanır, tüm child entity'ler otomatik miras alır.
// @EntityListeners ile INSERT/UPDATE/DELETE koruması sağlanır.
@FilterDef(
    name = "tenantFilter",
    parameters = [ParamDef(name = "tenantId", type = "string")]
)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@EntityListeners(TenantEntityListener::class)
@MappedSuperclass
abstract class TenantAwareEntity {
    @Column(name = "tenant_id", nullable = false, updatable = false)
    lateinit var tenantId: String
}
```

> **ÖNEMLİ:** Tüm tenant-scoped entity'ler `TenantAwareEntity`'den extend etmelidir. Bu sayede:
> - `@FilterDef` ve `@Filter` annotation'ları otomatik miras alınır (SELECT koruması)
> - `@EntityListeners(TenantEntityListener)` otomatik miras alınır (INSERT/UPDATE/DELETE koruması)
> - Entity'lerde tekrar tanımlama gerekmez.
>
> **Hibernate 6 NOTU:** Bazı Hibernate 6 versiyonlarında `@FilterDef`'in `@MappedSuperclass` üzerinden miras alınmasında sorun olabilir. Bu durumda `@FilterDef` + `@Filter` annotation'larını her entity üzerinde ayrı ayrı tanımlayın.

```kotlin
// TenantAspect.kt — EntityManager'da filter aktifleştirme (SELECT koruması)
@Aspect
@Component
class TenantAspect(private val entityManager: EntityManager) {

    // KRİTİK: TenantRepository HARİÇ tutulmalı! Çünkü TenantFilter içinde
    // TenantContext set edilmeden ÖNCE TenantRepository çağrılır.
    // Ayrıca RefreshTokenRepository de hariç (token rotation'da tenant context olmayabilir).
    @Before(
        "execution(* com.aesthetic.backend.repository..*.*(..)) " +
        "&& !execution(* com.aesthetic.backend.repository.TenantRepository.*(..)) " +
        "&& !execution(* com.aesthetic.backend.repository.RefreshTokenRepository.*(..))"
    )
    fun enableTenantFilter() {
        val tenantId = TenantContext.getTenantIdOrNull() ?: return  // Platform admin bypass
        val session = entityManager.unwrap(Session::class.java)
        session.enableFilter("tenantFilter")
            .setParameter("tenantId", tenantId)
    }
}
```

```kotlin
// TenantEntityListener.kt — INSERT/UPDATE/DELETE koruması (JPA EntityListener)
// Hibernate @Filter sadece SELECT'leri korur! INSERT/UPDATE/DELETE için bu listener gerekli.
//
// NOT: JPA EntityListener'lar Spring-managed bean DEĞİLDİR. TenantContext'e erişim için
// static/object erişim kullanılır (TenantContext zaten object singleton).
class TenantEntityListener {

    @PrePersist
    fun onPrePersist(entity: Any) {
        if (entity is TenantAwareEntity) {
            val tenantId = TenantContext.getTenantId()
            if (!entity::tenantId.isInitialized) {
                entity.tenantId = tenantId
            } else if (entity.tenantId != tenantId) {
                throw SecurityException(
                    "Başka tenant'a veri yazma girişimi engellendi! " +
                    "Beklenen: $tenantId, Gelen: ${entity.tenantId}"
                )
            }
        }
    }

    @PreUpdate
    fun onPreUpdate(entity: Any) {
        if (entity is TenantAwareEntity && entity.tenantId != TenantContext.getTenantId()) {
            throw SecurityException(
                "Başka tenant'ın verisini güncelleme girişimi engellendi!"
            )
        }
    }

    @PreRemove
    fun onPreRemove(entity: Any) {
        if (entity is TenantAwareEntity && entity.tenantId != TenantContext.getTenantId()) {
            throw SecurityException(
                "Başka tenant'ın verisini silme girişimi engellendi!"
            )
        }
    }
}
```

### 2.4 Async İşlemlerde Tenant Context Propagation

> **KRİTİK SORUN:** `ThreadLocal` (ve `InheritableThreadLocal`) `@Async` metotlarda, `CompletableFuture`, ve thread pool executor'larda propagate OLMAZ. Bildirim, e-posta, SMS gibi async işlemler tenant bilgisini kaybeder.

```kotlin
// TenantAwareTaskDecorator.kt — Async thread'lere tenant context taşıma
class TenantAwareTaskDecorator : TaskDecorator {
    override fun decorate(runnable: Runnable): Runnable {
        // Ana thread'deki tenant bilgisini yakala
        val tenantId = TenantContext.getTenantIdOrNull()

        // KRİTİK: SecurityContext KOPYALANMALI, referans paylaşılmamalı!
        // Aksi halde parent thread context'i değiştirirse child thread etkilenir.
        val originalContext = SecurityContextHolder.getContext()
        val clonedContext = SecurityContextHolder.createEmptyContext().apply {
            authentication = originalContext.authentication
        }

        return Runnable {
            try {
                // Yeni thread'e tenant bilgisini aktar
                tenantId?.let { TenantContext.setTenantId(it) }
                SecurityContextHolder.setContext(clonedContext)
                runnable.run()
            } finally {
                TenantContext.clear()
                SecurityContextHolder.clearContext()
            }
        }
    }
}
```

```kotlin
// AsyncConfig.kt — Async executor konfigürasyonu
@Configuration
@EnableAsync
@EnableCaching                 // Caffeine local cache aktif
@EnableScheduling              // @Scheduled job'lar aktif (Bölüm 18-19)
@EnableRetry                   // @Retryable (bildirim gönderimi vb.)
class AsyncConfig {
    @Bean("taskExecutor")
    fun taskExecutor(): TaskExecutor {
        val executor = ThreadPoolTaskExecutor()
        executor.corePoolSize = 5
        executor.maxPoolSize = 20
        executor.queueCapacity = 100
        executor.setThreadNamePrefix("async-tenant-")
        executor.setTaskDecorator(TenantAwareTaskDecorator())  // KRİTİK!
        // NOT: executor.initialize() çağrısı GEREKMEZ.
        // Spring @Bean lifecycle otomatik olarak afterPropertiesSet() → initialize() çağırır.
        return executor
    }
}
```

### 2.5 Scheduled Tasks'ta Tenant Context

Zamanlanan görevler (hatırlatıcılar, temizlik, trial süresi kontrolü) tüm tenant'ları iterate etmelidir:

```kotlin
// TenantAwareScheduler.kt — Scheduled task'lar için tenant context yönetimi
@Component
class TenantAwareScheduler(
    private val tenantRepository: TenantRepository
) {
    companion object {
        private val logger = LoggerFactory.getLogger(TenantAwareScheduler::class.java)
    }
    /**
     * Tüm aktif tenant'lar üzerinde bir işlem çalıştır.
     * Her tenant için TenantContext set edilir ve sonra temizlenir.
     */
    fun executeForAllTenants(action: (Tenant) -> Unit) {
        val tenants = tenantRepository.findAllByIsActiveTrue()
        for (tenant in tenants) {
            try {
                TenantContext.setTenantId(tenant.id!!)
                action(tenant)
            } catch (e: Exception) {
                logger.error("[tenant={}] Scheduled task hatası: {}", tenant.slug, e.message, e)
            } finally {
                TenantContext.clear()
            }
        }
    }
}

// Kullanım örneği:
@Component
class AppointmentReminderJob(
    private val tenantAwareScheduler: TenantAwareScheduler,
    private val notificationService: NotificationService
) {
    @Scheduled(fixedRate = 300_000)  // Her 5 dakikada (tüm tenant'lar iterate edilir)
    fun sendReminders() {
        tenantAwareScheduler.executeForAllTenants { tenant ->
            notificationService.sendUpcomingAppointmentReminders()
        }
    }
}
```

### 2.6 Tenant-Aware Cache Stratejisi

Redis cache key'leri tenant bazlı olmalıdır:

```kotlin
// TenantAwareCacheKeyGenerator.kt
@Component("tenantCacheKeyGenerator")
class TenantAwareCacheKeyGenerator : KeyGenerator {
    override fun generate(target: Any, method: Method, vararg params: Any?): Any {
        val tenantId = TenantContext.getTenantId()
        val key = params.joinToString(":")
        return "tenant:$tenantId:${method.name}:$key"
    }
}

// Kullanım:
@Cacheable(value = ["services"], keyGenerator = "tenantCacheKeyGenerator")
fun getActiveServices(): List<Service> { ... }

// DİKKAT: allEntries=true KULLANMAYIN! Tüm tenant'ların cache'ini siler.
// Bunun yerine tenant-scoped eviction yapın:
@CacheEvict(value = ["services"], keyGenerator = "tenantCacheKeyGenerator")
fun createService(request: CreateServiceRequest): Service { ... }

// Eğer bir tenant'ın TÜM cache entry'lerini silmek gerekiyorsa:
// Redis'te pattern-based silme kullanın:
@Component
class TenantCacheManager(private val redisTemplate: StringRedisTemplate) {
    /**
     * Belirli bir tenant'ın belirli bir cache grubundaki TÜM entry'lerini temizler.
     * Pattern: "tenant:{tenantId}:*"
     * allEntries=true yerine bu metodu kullanın!
     */
    fun evictAllForCurrentTenant(cacheName: String) {
        val tenantId = TenantContext.getTenantId()
        val pattern = "tenant:$tenantId:$cacheName:*"
        val keys = redisTemplate.keys(pattern)
        if (keys.isNotEmpty()) {
            redisTemplate.delete(keys)
        }
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
│   │   │   │   ├── AsyncConfig.kt                       # Async executor + TenantAwareTaskDecorator
│   │   │   │   ├── OpenApiConfig.kt                     # Swagger UI config
│   │   │   │   └── FlywayConfig.kt                      # DB migration config
│   │   │   │
│   │   │   ├── tenant/                                  # Multi-tenant altyapısı
│   │   │   │   ├── TenantContext.kt                     # ThreadLocal tenant holder
│   │   │   │   ├── TenantFilter.kt                     # HTTP filter (subdomain/custom domain → tenant)
│   │   │   │   ├── TenantAspect.kt                     # Hibernate filter AOP
│   │   │   │   ├── TenantAwareEntity.kt                # Base entity (tenant_id + @EntityListeners)
│   │   │   │   ├── TenantEntityListener.kt             # JPA Entity Listener (auto-set tenant_id)
│   │   │   │   ├── TenantAwareTaskDecorator.kt         # Async thread'lere tenant context taşıma
│   │   │   │   ├── TenantAwareScheduler.kt             # Scheduled task'lar için tenant iteration
│   │   │   │   ├── TenantAwareCacheKeyGenerator.kt     # Redis cache key'lerine tenant prefix
│   │   │   │   └── TenantCacheManager.kt               # Tenant-scoped cache eviction
│   │   │   │
│   │   │   ├── security/                                # Auth & güvenlik
│   │   │   │   ├── JwtTokenProvider.kt                  # Token oluşturma/doğrulama
│   │   │   │   ├── JwtAuthenticationFilter.kt           # Request filter
│   │   │   │   ├── CustomUserDetailsService.kt          # UserDetails yükleme
│   │   │   │   ├── RefreshToken.kt                      # Refresh token entity (revocation)
│   │   │   │   └── SecurityExpressions.kt               # @PreAuthorize ifadeleri
│   │   │   │
│   │   │   ├── domain/                                  # JPA Entity'ler
│   │   │   │   ├── tenant/
│   │   │   │   │   └── Tenant.kt                        # Tenant (işletme) entity
│   │   │   │   ├── user/
│   │   │   │   │   ├── User.kt
│   │   │   │   │   ├── Role.kt                          # Enum: PLATFORM_ADMIN, TENANT_ADMIN, STAFF, CLIENT
│   │   │   │   │   └── ClientNote.kt                    # Müşteri notları (staff tarafından)
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
│   │   │   │   │   ├── AppointmentService.kt            # Many-to-many pivot (appointment ↔ service)
│   │   │   │   │   ├── AppointmentStatus.kt             # Enum
│   │   │   │   │   ├── RecurringAppointment.kt          # Tekrarlayan randevu şablonu
│   │   │   │   │   ├── TimeSlot.kt                      # Müsait zaman dilimi
│   │   │   │   │   └── WorkingHours.kt                  # Çalışma saatleri
│   │   │   │   ├── review/
│   │   │   │   │   └── Review.kt                        # Müşteri değerlendirmeleri
│   │   │   │   ├── payment/
│   │   │   │   │   ├── Payment.kt                       # Ödeme kayıtları (iyzico)
│   │   │   │   │   ├── Subscription.kt                  # Tenant abonelik yönetimi
│   │   │   │   │   └── Invoice.kt                       # Fatura kayıtları
│   │   │   │   ├── notification/
│   │   │   │   │   ├── Notification.kt                  # Bildirim kayıtları
│   │   │   │   │   └── NotificationTemplate.kt          # SMS/E-posta şablonları
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
│   │   │   │   ├── ReviewRepository.kt
│   │   │   │   ├── PaymentRepository.kt
│   │   │   │   ├── SubscriptionRepository.kt
│   │   │   │   ├── NotificationRepository.kt
│   │   │   │   ├── RefreshTokenRepository.kt
│   │   │   │   ├── ContactMessageRepository.kt
│   │   │   │   └── SiteSettingsRepository.kt
│   │   │   │
│   │   │   ├── usecase/                                 # İş mantığı (Business Logic)
│   │   │   │   ├── TenantService.kt                     # Tenant CRUD + onboarding
│   │   │   │   ├── AuthService.kt                       # Login, register, token refresh
│   │   │   │   ├── UserService.kt                       # Kullanıcı yönetimi
│   │   │   │   ├── ServiceManagementService.kt          # Hizmet CRUD
│   │   │   │   ├── ProductService.kt                    # Ürün CRUD
│   │   │   │   ├── BlogService.kt                       # Blog CRUD
│   │   │   │   ├── GalleryService.kt                    # Galeri CRUD
│   │   │   │   ├── AppointmentService.kt                # Randevu: oluştur, iptal, tamamla
│   │   │   │   ├── AvailabilityService.kt               # Müsait slot hesaplama
│   │   │   │   ├── ReviewService.kt                     # Değerlendirme CRUD
│   │   │   │   ├── PaymentService.kt                    # Ödeme işlemleri (iyzico)
│   │   │   │   ├── SubscriptionService.kt               # Abonelik yönetimi
│   │   │   │   ├── ContactService.kt                    # İletişim mesajları
│   │   │   │   ├── SettingsService.kt                   # Site ayarları
│   │   │   │   ├── FileUploadService.kt                 # Görsel yükleme (S3/MinIO)
│   │   │   │   └── NotificationService.kt               # E-posta (SendGrid) + SMS (Netgsm)
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
│   │   │   │   ├── ReviewController.kt                  # /api/reviews/**
│   │   │   │   ├── PaymentController.kt                 # /api/payments/** + iyzico webhook
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
│   │   │   │   │   ├── CreateReviewRequest.kt
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
│   │   │   │       ├── ReviewResponse.kt
│   │   │   │       ├── PaymentResponse.kt
│   │   │   │       └── DashboardStatsResponse.kt
│   │   │   │
│   │   │   ├── mapper/                                  # Entity ↔ DTO dönüşümleri
│   │   │   │   ├── ServiceMapper.kt
│   │   │   │   ├── ProductMapper.kt
│   │   │   │   ├── BlogPostMapper.kt
│   │   │   │   ├── AppointmentMapper.kt
│   │   │   │   ├── ReviewMapper.kt
│   │   │   │   └── UserMapper.kt
│   │   │   │
│   │   │   ├── job/                                     # Scheduled Jobs
│   │   │   │   ├── AppointmentReminderJob.kt            # Randevu hatırlatıcı
│   │   │   │   ├── TrialExpirationJob.kt                # Deneme süresi kontrolü
│   │   │   │   └── StaleDataCleanupJob.kt               # Eski veri temizliği
│   │   │   │
│   │   │   └── exception/                               # Hata yönetimi
│   │   │       ├── GlobalExceptionHandler.kt            # @RestControllerAdvice
│   │   │       ├── TenantNotFoundException.kt
│   │   │       ├── ResourceNotFoundException.kt
│   │   │       ├── DuplicateResourceException.kt
│   │   │       ├── AppointmentConflictException.kt
│   │   │       ├── PaymentException.kt
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
│   │           ├── V9__create_settings_table.sql
│   │           ├── V10__create_review_table.sql
│   │           ├── V11__create_refresh_token_table.sql
│   │           ├── V12__create_payment_tables.sql
│   │           ├── V13__create_notification_tables.sql
│   │           ├── V14__create_client_notes_table.sql
│   │           ├── V15__create_audit_log_table.sql
│   │           └── V16__create_consent_records_table.sql
│   │
│   └── test/
│       └── kotlin/com/aesthetic/backend/
│           ├── usecase/
│           │   ├── AppointmentServiceTest.kt            # Randevu iş mantığı testleri
│           │   ├── AvailabilityServiceTest.kt           # Müsaitlik testleri
│           │   └── PaymentServiceTest.kt                # Ödeme iş mantığı testleri
│           ├── controller/
│           │   ├── AppointmentControllerTest.kt         # API entegrasyon testleri
│           │   ├── AuthControllerTest.kt
│           │   └── PaymentControllerTest.kt             # Ödeme API testleri
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

    @Column(unique = true)
    var customDomain: String? = null,       // Özel domain (opsiyonel): "salongüzellik.com"

    @Enumerated(EnumType.STRING)
    var plan: SubscriptionPlan = SubscriptionPlan.TRIAL,

    var trialEndDate: LocalDate? = null,    // Trial bitiş tarihi (TRIAL planında zorunlu)

    var isActive: Boolean = true,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,

    @UpdateTimestamp
    var updatedAt: LocalDateTime? = null
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
@Table(
    name = "users",
    uniqueConstraints = [
        // Email tenant bazlı unique — farklı tenant'larda aynı email olabilir
        UniqueConstraint(name = "uk_user_email_tenant", columnNames = ["email", "tenant_id"])
    ]
)
class User : TenantAwareEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    @Column(nullable = false)
    var name: String = ""

    @Column(nullable = false)
    var email: String = ""

    @Column(nullable = false)
    var passwordHash: String = ""

    var phone: String? = null
    var image: String? = null

    @Enumerated(EnumType.STRING)
    var role: Role = Role.CLIENT

    var isActive: Boolean = true

    // Güvenlik: başarısız giriş denemesi sayacı (brute force koruması)
    var failedLoginAttempts: Int = 0
    var lockedUntil: LocalDateTime? = null

    @CreationTimestamp
    val createdAt: LocalDateTime? = null

    @UpdateTimestamp
    var updatedAt: LocalDateTime? = null

    // İlişkiler
    @OneToMany(mappedBy = "client", fetch = FetchType.LAZY)
    val clientAppointments: MutableList<Appointment> = mutableListOf()

    @OneToMany(mappedBy = "staff", fetch = FetchType.LAZY)
    val staffAppointments: MutableList<Appointment> = mutableListOf()

    // Müşteri notları (personel tarafından eklenir)
    @OneToMany(mappedBy = "client", fetch = FetchType.LAZY)
    val notes: MutableList<ClientNote> = mutableListOf()
}

enum class Role {
    PLATFORM_ADMIN,     // Tüm platforma erişim (SaaS sahibi)
    TENANT_ADMIN,       // İşletme sahibi — tüm tenant verilerine erişim
    STAFF,              // Personel — randevular, hastalar
    CLIENT              // Müşteri — kendi randevuları, profili
}

// NOT: PLATFORM_ADMIN kullanıcıları da users tablosunda tutulur ancak özel tenant_id
// değeri olarak sabit "PLATFORM" kullanılır. TenantAspect bu değeri gördüğünde
// Hibernate filter'ı devre dışı bırakır (tüm tenant verilerine erişim).
// Alternatif: Ayrı bir platform_admins tablosu oluşturulabilir ancak bu, auth
// sistemini karmaşıklaştırır. Tek tablo + magic tenant_id daha pragmatiktir.

// ClientNote.kt — Personel'in müşteri hakkında özel notları
@Entity
@Table(name = "client_notes")
class ClientNote : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    lateinit var client: User          // Not hangi müşteriye ait

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    lateinit var author: User          // Notu yazan personel

    @Column(columnDefinition = "TEXT")
    var content: String = ""          // "Lateks alerjisi var", "Sol omuz hassas"

    @CreationTimestamp
    val createdAt: LocalDateTime? = null
}
```

### 4.3 Service (Hizmet)

```kotlin
@Entity
@Table(
    name = "services",
    uniqueConstraints = [
        // Slug tenant bazlı unique — farklı tenant'larda aynı slug olabilir
        UniqueConstraint(name = "uk_service_slug_tenant", columnNames = ["slug", "tenant_id"])
    ]
)
class Service : TenantAwareEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    @Column(nullable = false)
    var slug: String = ""

    @Column(nullable = false)
    var title: String = ""

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    var category: ServiceCategory? = null

    var shortDescription: String = ""

    @Column(columnDefinition = "TEXT")
    var description: String = ""

    @Column(precision = 10, scale = 2)    // KRİTİK: Ondalık hassasiyet
    var price: BigDecimal = BigDecimal.ZERO
    var currency: String = "TRY"

    var durationMinutes: Int = 30          // Dakika cinsinden süre
    var bufferMinutes: Int = 0             // Randevu arası tampon süresi

    var image: String? = null

    @ElementCollection
    @CollectionTable(name = "service_benefits", joinColumns = [JoinColumn(name = "service_id")])
    @Column(name = "benefit")
    var benefits: MutableList<String> = mutableListOf()

    @ElementCollection
    @CollectionTable(name = "service_process_steps", joinColumns = [JoinColumn(name = "service_id")])
    @Column(name = "step")
    var processSteps: MutableList<String> = mutableListOf()

    @Column(columnDefinition = "TEXT")
    var recovery: String? = null

    var isActive: Boolean = true
    var sortOrder: Int = 0

    // SEO
    var metaTitle: String? = null
    var metaDescription: String? = null
    var ogImage: String? = null

    @CreationTimestamp
    val createdAt: LocalDateTime? = null

    @UpdateTimestamp
    var updatedAt: LocalDateTime? = null
}

// ServiceCategory.kt — Hizmet kategorileri
@Entity
@Table(
    name = "service_categories",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_category_slug_tenant", columnNames = ["slug", "tenant_id"])
    ]
)
class ServiceCategory : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    var slug: String = ""               // "yuz-bakimi", "lazer"
    var name: String = ""               // "Yüz Bakımı", "Lazer Epilasyon"
    var description: String? = null
    var image: String? = null
    var sortOrder: Int = 0
    var isActive: Boolean = true

    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY)
    val services: MutableList<Service> = mutableListOf()

    @CreationTimestamp val createdAt: LocalDateTime? = null
    @UpdateTimestamp var updatedAt: LocalDateTime? = null
}
```

### 4.4 Appointment (Randevu) — KRİTİK

```kotlin
@Entity
@Table(
    name = "appointments",
    indexes = [
        Index(name = "idx_appt_tenant_date", columnList = "tenant_id, date"),
        Index(name = "idx_appt_staff_date", columnList = "tenant_id, staff_id, date, start_time, end_time"),
        Index(name = "idx_appt_status", columnList = "tenant_id, status"),
        Index(name = "idx_appt_client", columnList = "tenant_id, client_id")
    ]
)
class Appointment : TenantAwareEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    // Müşteri bilgileri
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    var client: User? = null               // Kayıtlı müşteri (nullable: misafir randevu)

    var clientName: String = ""             // Misafir randevular için
    var clientEmail: String = ""
    var clientPhone: String = ""

    // Randevu hizmetleri — Çoklu hizmet desteği (örn: "Saç boyama + Kesim + Fön")
    @OneToMany(mappedBy = "appointment", cascade = [CascadeType.ALL], orphanRemoval = true)
    var services: MutableList<AppointmentService> = mutableListOf()

    // Birincil hizmet (geriye uyumluluk + basit sorgular için)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_service_id")
    var primaryService: Service? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    var staff: User? = null                // Atanan personel

    @Column(nullable = false)
    var date: LocalDate = LocalDate.now()

    @Column(name = "start_time", nullable = false)
    var startTime: LocalTime = LocalTime.now()

    @Column(name = "end_time", nullable = false)
    var endTime: LocalTime = LocalTime.now()

    // Toplam süre ve fiyat (tüm hizmetlerin toplamı)
    var totalDurationMinutes: Int = 0

    @Column(precision = 10, scale = 2)
    var totalPrice: BigDecimal = BigDecimal.ZERO

    @Column(columnDefinition = "TEXT")
    var notes: String? = null

    @Enumerated(EnumType.STRING)
    var status: AppointmentStatus = AppointmentStatus.PENDING

    // İptal bilgisi
    var cancelledAt: LocalDateTime? = null
    var cancellationReason: String? = null

    // Tekrarlayan randevu desteği
    var recurringGroupId: String? = null        // Tekrarlayan randevuları gruplar
    var recurrenceRule: String? = null           // "WEEKLY", "BIWEEKLY", "MONTHLY"

    // Hatırlatıcı durumu
    var reminder24hSent: Boolean = false
    var reminder1hSent: Boolean = false

    @CreationTimestamp
    val createdAt: LocalDateTime? = null

    @UpdateTimestamp
    var updatedAt: LocalDateTime? = null

    // Optimistic locking — concurrent update koruması
    @Version
    var version: Long = 0
}

// AppointmentService.kt — Randevu-Hizmet ilişkisi (çoklu hizmet desteği)
// KRİTİK: TenantAwareEntity'den extend etmeli! Aksi halde Hibernate filter uygulanmaz
// ve cross-tenant sorgularda yanlış tenant'ın appointment_services satırları dönebilir.
@Entity
@Table(name = "appointment_services")
class AppointmentService : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    var appointment: Appointment? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    var service: Service? = null

    @Column(precision = 10, scale = 2)
    var price: BigDecimal = BigDecimal.ZERO       // Randevu anındaki fiyat (snapshot)

    var durationMinutes: Int = 0                   // Randevu anındaki süre (snapshot)
    var sortOrder: Int = 0                         // Sıralama
}

enum class AppointmentStatus {
    PENDING,            // Onay bekliyor
    CONFIRMED,          // Onaylandı
    IN_PROGRESS,        // Devam ediyor
    COMPLETED,          // Tamamlandı
    CANCELLED,          // İptal edildi
    NO_SHOW             // Gelmedi
}

// Durum geçiş kuralları:
// PENDING    → CONFIRMED, CANCELLED
// CONFIRMED  → IN_PROGRESS, CANCELLED, NO_SHOW
// IN_PROGRESS → COMPLETED
// COMPLETED  → (son durum)
// CANCELLED  → (son durum)
// NO_SHOW    → (son durum)
```

### 4.5 WorkingHours (Çalışma Saatleri)

```kotlin
// KRİTİK DÜZELTME: TenantAwareEntity'den extend ediyor.
// Önceki versiyon manuel tenant_id + @Filter tanımlıyordu ama @FilterDef ve
// @EntityListeners eksikti → filter çalışmaz, tenant_id auto-set olmazdı.
@Entity
@Table(
    name = "working_hours",
    indexes = [
        Index(name = "idx_wh_tenant_staff", columnList = "tenant_id, staff_id, day_of_week")
    ]
)
class WorkingHours : TenantAwareEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    var staff: User? = null                 // null ise genel işletme saatleri

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false)
    var dayOfWeek: DayOfWeek = DayOfWeek.MONDAY

    @Column(nullable = false)
    var startTime: LocalTime = LocalTime.of(9, 0)

    @Column(nullable = false)
    var endTime: LocalTime = LocalTime.of(18, 0)

    var breakStartTime: LocalTime? = null   // 12:00 (öğle arası)
    var breakEndTime: LocalTime? = null     // 13:00

    var isWorkingDay: Boolean = true        // false = kapalı gün
}
```

### 4.6 BlockedTimeSlot (Bloklanmış Zaman Dilimi)

```kotlin
// KRİTİK DÜZELTME: TenantAwareEntity'den extend ediyor (aynı WorkingHours sorunu).
@Entity
@Table(
    name = "blocked_time_slots",
    indexes = [
        Index(name = "idx_bts_tenant_staff_date", columnList = "tenant_id, staff_id, date")
    ]
)
class BlockedTimeSlot : TenantAwareEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    var staff: User? = null

    @Column(nullable = false)
    var date: LocalDate = LocalDate.now()

    @Column(nullable = false)
    var startTime: LocalTime = LocalTime.of(9, 0)

    @Column(nullable = false)
    var endTime: LocalTime = LocalTime.of(10, 0)

    var reason: String? = null               // "Tatil", "Toplantı" vb.
}
```

### 4.7 Diğer Entity'ler

> **NOT:** Tüm entity'ler `TenantAwareEntity`'den extend eder. `@FilterDef` + `@Filter` miras alınır. `@CreationTimestamp` / `@UpdateTimestamp` ile tarihler otomatik yönetilir. `@Column(precision=10, scale=2)` ile fiyatlar doğru saklanır.

```kotlin
// Product.kt
@Entity
@Table(
    name = "products",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_product_slug_tenant", columnNames = ["slug", "tenant_id"])
    ]
)
class Product : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null
    var slug: String = ""
    var name: String = ""
    var brand: String = ""
    var category: String = ""
    @Column(columnDefinition = "TEXT") var description: String = ""
    @Column(precision = 10, scale = 2) var price: BigDecimal = BigDecimal.ZERO
    var currency: String = "TRY"
    var image: String? = null
    @ElementCollection
    @CollectionTable(name = "product_features", joinColumns = [JoinColumn(name = "product_id")])
    @Column(name = "feature")
    var features: MutableList<String> = mutableListOf()
    var stockQuantity: Int? = null          // null = stok takibi yok
    var lowStockThreshold: Int = 5          // Stok uyarı eşiği
    var isActive: Boolean = true
    var sortOrder: Int = 0
    var metaTitle: String? = null
    var metaDescription: String? = null
    @CreationTimestamp val createdAt: LocalDateTime? = null
    @UpdateTimestamp var updatedAt: LocalDateTime? = null
}

// BlogPost.kt
@Entity
@Table(
    name = "blog_posts",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_blog_slug_tenant", columnNames = ["slug", "tenant_id"])
    ]
)
class BlogPost : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null
    var slug: String = ""
    var title: String = ""
    @Column(columnDefinition = "TEXT") var excerpt: String = ""
    @Column(columnDefinition = "LONGTEXT") var content: String = ""

    // Yazar artık User entity'sine bağlı (string değil)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    var author: User? = null

    var category: String = ""
    var image: String? = null
    @ElementCollection
    @CollectionTable(name = "blog_post_tags", joinColumns = [JoinColumn(name = "blog_post_id")])
    @Column(name = "tag")
    var tags: MutableList<String> = mutableListOf()
    var readTime: String = ""
    var isPublished: Boolean = false
    var publishedAt: LocalDateTime? = null
    var metaTitle: String? = null
    var metaDescription: String? = null
    @CreationTimestamp val createdAt: LocalDateTime? = null
    @UpdateTimestamp var updatedAt: LocalDateTime? = null
}

// GalleryItem.kt
@Entity
@Table(name = "gallery_items")
class GalleryItem : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null
    var category: String = ""

    // Service ilişkisi artık entity referansı (string değil)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    var service: Service? = null

    var beforeImage: String = ""
    var afterImage: String = ""
    var description: String = ""
    var isActive: Boolean = true
    @CreationTimestamp val createdAt: LocalDateTime? = null
}

// ContactMessage.kt
@Entity
@Table(name = "contact_messages")
class ContactMessage : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null
    var name: String = ""
    var email: String = ""
    var phone: String? = null
    var subject: String = ""
    @Column(columnDefinition = "TEXT") var message: String = ""
    var isRead: Boolean = false
    var repliedAt: LocalDateTime? = null      // Yanıtlanma durumu
    @CreationTimestamp val createdAt: LocalDateTime? = null
}

// SiteSettings.kt — workingHoursJson KALDIRILDI (WorkingHours entity'si kullanılıyor)
@Entity
@Table(name = "site_settings")
class SiteSettings : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null
    var siteName: String = ""
    var phone: String = ""
    var email: String = ""
    var address: String = ""
    var whatsapp: String = ""
    var instagram: String = ""
    var facebook: String = ""
    var twitter: String = ""
    var youtube: String = ""
    var mapEmbedUrl: String = ""
    var timezone: String = "Europe/Istanbul"   // Tenant bazlı timezone desteği
    var locale: String = "tr"                  // Dil ayarı
    var cancellationPolicyHours: Int = 24      // Ücretsiz iptal süresi (saat)

    @Column(columnDefinition = "JSON")
    var themeSettings: String = "{}"           // Renk, logo vb. özelleştirme
}

// Review.kt — Müşteri değerlendirme sistemi
@Entity
@Table(name = "reviews")
class Review : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    var appointment: Appointment? = null      // Hangi randevu sonrası

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    var client: User? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    var service: Service? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    var staff: User? = null

    @Column(nullable = false)
    var rating: Int = 0                        // 1-5 yıldız (0 = henüz değerlendirilmedi)
    @Column(columnDefinition = "TEXT")
    var comment: String? = null
    var isApproved: Boolean = false             // Admin onayı gerekli
    var isPublic: Boolean = true               // Herkese açık mı
    @CreationTimestamp val createdAt: LocalDateTime? = null
}
```

---

## 5. Randevu Sistemi — Çift Randevu Engelleme

Bu sistemin en kritik parçasıdır. Aynı personel, aynı zaman diliminde iki randevu alamamalıdır.

### 5.1 Strateji: READ_COMMITTED + Pessimistic Write Lock

> **KRİTİK DÜZELTME:** Önceki versiyonda `SERIALIZABLE` isolation + `PESSIMISTIC_WRITE` birlikte kullanılıyordu. MySQL InnoDB'de bu deadlock'a neden olur: SERIALIZABLE tüm SELECT'leri `LOCK IN SHARE MODE`'a çevirir, sonra `FOR UPDATE`'e yükseltme girişiminde her iki transaction karşılıklı bloklanır. Doğru yaklaşım: **`READ_COMMITTED` + `PESSIMISTIC_WRITE` (SELECT ... FOR UPDATE)**.

```
Randevu oluşturma akışı:

  Müşteri "14:00 Botoks" seçer
           │
           ▼
  ① Müsaitlik kontrolü (READ — lock yok, UI için)
     → availabilityService.getAvailableSlots(date, serviceId, staffId)
           │
           ▼
  ② Randevu oluşturma isteği
     → POST /api/appointments
           │
           ▼
  ③ Transaction başlat (READ_COMMITTED)
           │
           ▼
  ④ Geçmiş tarih kontrolü
     → request.date < bugün? → 400 Bad Request
           │
           ▼
  ⑤ Pessimistic Lock ile çakışma kontrolü
     → SELECT ... FOR UPDATE (satır kilidi)
     → Buffer time dahil: endTime + bufferMinutes
     → Aynı staff + tarih + saat aralığında aktif randevu var mı?
           │
     ┌─────┴──────┐
     │ VAR         │ YOK
     │             │
     ▼             ▼
  HATA döndür   ⑥ İptal politikası kontrolü (opsiyonel)
  409 Conflict          │
                        ▼
                  ⑦ Randevu kaydet + hizmetleri ekle
                     → appointmentRepository.save()
                         │
                         ▼
                  ⑧ Bildirim gönder (@Async — TenantAwareTaskDecorator ile)
                     → E-posta + SMS
                         │
                         ▼
                  ⑨ 201 Created döndür
```

### 5.2 AppointmentService Implementasyonu

```kotlin
@Service
class AppointmentService(
    private val appointmentRepository: AppointmentRepository,
    private val appointmentServiceRepository: AppointmentServiceRepository,
    private val availabilityService: AvailabilityService,
    private val serviceRepository: ServiceRepository,
    private val settingsRepository: SiteSettingsRepository,
    private val notificationService: NotificationService,
    private val entityManager: EntityManager    // getReference() için gerekli
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    /**
     * Randevu oluşturma — Pessimistic Locking ile çift randevu engelleme
     *
     * İzolasyon seviyesi: READ_COMMITTED (explicit, MySQL default ile aynı)
     * SERIALIZABLE KULLANMA! Deadlock'a neden olur.
     * PESSIMISTIC_WRITE (@Lock) tek başına yeterli.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    fun createAppointment(request: CreateAppointmentRequest): Appointment {
        val tenantId = TenantContext.getTenantId()

        // ── ① Geçmiş tarih kontrolü ──
        // KRİTİK: Tenant'ın timezone'unu kullan, sunucu timezone'u DEĞİL!
        val settings = settingsRepository.findByTenantId(tenantId)
        val tenantZone = ZoneId.of(settings?.timezone ?: "Europe/Istanbul")
        val now = ZonedDateTime.now(tenantZone)
        val today = now.toLocalDate()
        val currentTime = now.toLocalTime()

        if (request.date.isBefore(today)) {
            throw IllegalArgumentException("Geçmiş bir tarihe randevu oluşturulamaz")
        }
        if (request.date == today && request.startTime.isBefore(currentTime)) {
            throw IllegalArgumentException("Geçmiş bir saate randevu oluşturulamaz")
        }

        // ── ② Hizmetleri yükle ve toplam süre/fiyat hesapla ──
        val serviceIds = request.serviceIds  // Çoklu hizmet desteği
        val services = serviceRepository.findAllById(serviceIds)
        if (services.size != serviceIds.size) {
            throw ResourceNotFoundException("Bir veya daha fazla hizmet bulunamadı")
        }

        val totalDuration = services.sumOf { it.durationMinutes }
        // Buffer time: sıralı hizmetlerde SON hizmetin buffer'ı kullanılır.
        // Ara hizmetlerin buffer'ı anlamsız çünkü sonraki hizmet hemen başlar.
        val totalBuffer = services.lastOrNull()?.bufferMinutes ?: 0
        val totalPrice = services.sumOf { it.price }
        val startTime = request.startTime
        val endTime = startTime.plusMinutes(totalDuration.toLong())
        val endTimeWithBuffer = endTime.plusMinutes(totalBuffer.toLong())

        // ── ③ Personel belirleme ──
        // Eğer staffId null ise → "herhangi bir müsait personel" senaryosu.
        // Tüm aktif personeli iterate et, ilk müsait olanı ata.
        val resolvedStaffId: String = if (request.staffId != null) {
            request.staffId
        } else {
            availabilityService.findAvailableStaff(
                tenantId, request.date, startTime, endTimeWithBuffer
            ) ?: throw AppointmentConflictException(
                "Bu zaman diliminde müsait personel bulunamadı. " +
                "Lütfen başka bir saat seçin."
            )
        }

        // ── ④ Pessimistic Lock ile çakışma kontrolü ──
        // READ_COMMITTED + FOR UPDATE: İkinci transaction ilkinin bitmesini bekler
        // staffId artık non-null zorunlu (yukarıda resolve edildi)
        val conflicts = appointmentRepository.findConflictingAppointmentsWithLock(
            tenantId = tenantId,
            staffId = resolvedStaffId,
            date = request.date,
            startTime = startTime,
            endTime = endTimeWithBuffer   // Buffer time dahil
        )

        if (conflicts.isNotEmpty()) {
            throw AppointmentConflictException(
                "Bu zaman diliminde zaten bir randevu mevcut. " +
                "Lütfen başka bir saat seçin."
            )
        }

        // ── ⑤ Çalışma saatleri kontrolü ──
        if (!availabilityService.isWithinWorkingHours(
                tenantId, resolvedStaffId, request.date, startTime, endTime)) {
            throw IllegalArgumentException("Seçilen saat çalışma saatleri dışında")
        }

        // ── ⑥ Bloklanmış zaman kontrolü ──
        if (availabilityService.isTimeSlotBlocked(
                tenantId, resolvedStaffId, request.date, startTime, endTime)) {
            throw AppointmentConflictException("Bu zaman dilimi bloklanmış")
        }

        // ── ⑥ Randevu oluştur ──
        // NOT: tenantId set etmeye GEREK YOK — TenantEntityListener.onPrePersist otomatik set eder.
        val appointment = Appointment().apply {
            this.clientName = request.clientName
            this.clientEmail = request.clientEmail
            this.clientPhone = request.clientPhone
            this.primaryService = services.first()
            // KRİTİK: User.id val (read-only), yeni User() ile id atayamazsın!
            // entityManager.getReference() lazy proxy döndürür, DB'ye gitmez.
            this.staff = entityManager.getReference(User::class.java, resolvedStaffId)
            this.date = request.date
            this.startTime = startTime
            this.endTime = endTime
            this.totalDurationMinutes = totalDuration
            this.totalPrice = totalPrice
            this.notes = request.notes
            this.status = AppointmentStatus.PENDING
        }

        val saved = appointmentRepository.save(appointment)

        // ── ⑦ Hizmetleri randevuya bağla (fiyat snapshot) ──
        services.forEachIndexed { index, service ->
            val apptService = AppointmentService().apply {
                this.appointment = saved
                this.service = service
                this.price = service.price          // Randevu anındaki fiyat
                this.durationMinutes = service.durationMinutes
                this.sortOrder = index
            }
            appointmentServiceRepository.save(apptService)
        }

        logger.info("[tenant={}] Randevu oluşturuldu: {} ({})",
            tenantId, saved.id, services.map { it.title })

        // ── ⑧ Bildirim gönder (async — TenantAwareTaskDecorator ile) ──
        notificationService.sendAppointmentConfirmation(saved)

        return saved
    }

    /**
     * Randevu iptali — İptal politikası kontrolü ile
     */
    @Transactional
    fun cancelAppointment(id: String, reason: String?, cancelledByClient: Boolean = false): Appointment {
        val appointment = appointmentRepository.findById(id)
            .orElseThrow { ResourceNotFoundException("Randevu bulunamadı: $id") }

        validateStatusTransition(appointment.status, AppointmentStatus.CANCELLED)

        // Müşteri iptali ise iptal politikası kontrolü
        if (cancelledByClient) {
            val settings = settingsRepository.findByTenantId(TenantContext.getTenantId())
            val cancellationDeadline = appointment.date.atTime(appointment.startTime)
                .minusHours(settings?.cancellationPolicyHours?.toLong() ?: 24)

            if (LocalDateTime.now().isAfter(cancellationDeadline)) {
                throw IllegalStateException(
                    "Randevu başlangıcına ${settings?.cancellationPolicyHours ?: 24} " +
                    "saatten az kaldığında iptal yapılamaz"
                )
            }
        }

        appointment.status = AppointmentStatus.CANCELLED
        appointment.cancelledAt = LocalDateTime.now()
        appointment.cancellationReason = reason

        val saved = appointmentRepository.save(appointment)

        // İptal bildirimi gönder
        notificationService.sendAppointmentCancellation(saved)

        return saved
    }

    /**
     * Randevu durumu güncelleme (admin)
     */
    @Transactional
    fun updateStatus(id: String, newStatus: AppointmentStatus, reason: String? = null): Appointment {
        val appointment = appointmentRepository.findById(id)
            .orElseThrow { ResourceNotFoundException("Randevu bulunamadı: $id") }

        validateStatusTransition(appointment.status, newStatus)

        appointment.status = newStatus

        if (newStatus == AppointmentStatus.CANCELLED) {
            appointment.cancelledAt = LocalDateTime.now()
            appointment.cancellationReason = reason
        }

        return appointmentRepository.save(appointment)
    }

    /**
     * Tekrarlayan randevu oluşturma
     *
     * DÜZELTMELER:
     * - recurrenceRule doğrulaması döngü ÖNCESİNDE yapılır (kısmi oluşturma önlenir)
     * - Tüm exception'lar yakalanır (sadece conflict değil, çalışma saati vs. de)
     * - recurringGroupId ve recurrenceRule, appointment oluşturulmadan ÖNCE set edilir (ekstra save yok)
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    fun createRecurringAppointments(
        request: CreateAppointmentRequest,
        recurrenceRule: String,   // "WEEKLY", "BIWEEKLY", "MONTHLY"
        count: Int                // Kaç tekrar
    ): List<Appointment> {
        // ── ① Validasyon (döngü öncesi!) ──
        val validRules = setOf("WEEKLY", "BIWEEKLY", "MONTHLY")
        require(recurrenceRule in validRules) {
            "Geçersiz tekrar kuralı: $recurrenceRule. Geçerli: $validRules"
        }
        require(count in 1..52) {
            "Tekrar sayısı 1-52 arasında olmalıdır"
        }

        val groupId = UUID.randomUUID().toString()
        val appointments = mutableListOf<Appointment>()
        val skippedDates = mutableListOf<LocalDate>()

        var currentDate = request.date
        for (i in 0 until count) {
            val singleRequest = request.copy(date = currentDate)
            try {
                val appointment = createAppointment(singleRequest).apply {
                    this.recurringGroupId = groupId
                    this.recurrenceRule = recurrenceRule
                }
                // recurringGroupId zaten set edildi, save createAppointment içinde yapıldı
                appointments.add(appointment)
            } catch (e: Exception) {
                // Tüm hataları yakala (conflict, çalışma saati dışı, bloklanmış slot vs.)
                logger.warn("Tekrarlayan randevu atlandı: {} tarihinde — {}", currentDate, e.message)
                skippedDates.add(currentDate)
            }

            currentDate = when (recurrenceRule) {
                "WEEKLY" -> currentDate.plusWeeks(1)
                "BIWEEKLY" -> currentDate.plusWeeks(2)
                "MONTHLY" -> currentDate.plusMonths(1)
                else -> error("unreachable")  // Yukarıda validate edildi
            }
        }

        if (skippedDates.isNotEmpty()) {
            logger.info("Tekrarlayan randevu: {} başarılı, {} atlandı (tarihler: {})",
                appointments.size, skippedDates.size, skippedDates)
        }

        return appointments
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
            // COMPLETED, CANCELLED, NO_SHOW → geçiş yapılamaz (son durum)
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
     *
     * DÜZELTMELER:
     * - Enum karşılaştırması parametre ile (string literal JPQL'de hatalı)
     * - staffId NULL durumu: Belirli bir staff'ın randevuları kontrol edilir.
     *   "Herhangi bir personel" senaryosu burada DEĞİL, AvailabilityService'te ele alınır.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.tenantId = :tenantId
        AND a.date = :date
        AND a.status NOT IN (:excludeStatuses)
        AND a.staff.id = :staffId
        AND a.startTime < :endTime
        AND a.endTime > :startTime
    """)
    fun findConflictingAppointmentsWithLock(
        @Param("tenantId") tenantId: String,
        @Param("staffId") staffId: String,
        @Param("date") date: LocalDate,
        @Param("startTime") startTime: LocalTime,
        @Param("endTime") endTime: LocalTime,
        @Param("excludeStatuses") excludeStatuses: List<AppointmentStatus> =
            listOf(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW)
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

### 5.3.1 Diğer Repository Interface'leri

Kod genelinde çağrılan tüm Spring Data JPA repository metodları. Derived query method convention'ı ile otomatik SQL üretilir:

```kotlin
@Repository
interface SubscriptionRepository : JpaRepository<Subscription, String> {
    fun findByTenantIdAndStatus(tenantId: String, status: SubscriptionStatus): Subscription?
}

@Repository
interface UserRepository : JpaRepository<User, String> {
    fun findByEmailAndTenantId(email: String, tenantId: String): User?
    fun findByTenantIdAndRoleInAndIsActiveTrue(tenantId: String, roles: List<Role>): List<User>
    fun countByTenantIdAndRole(tenantId: String, role: Role): Long
}

@Repository
interface AppointmentRepository : JpaRepository<Appointment, String> {
    // ... (Bölüm 5.3'teki pessimistic lock query'leri ek olarak)
    fun countByTenantIdAndCreatedAtAfter(tenantId: String, after: LocalDateTime): Long

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.date = :date AND a.startTime <= :time
        AND a.status = 'CONFIRMED'
        AND (:reminder24hSent IS NULL OR a.reminder24hSent = :reminder24hSent)
        AND (:reminder1hSent IS NULL OR a.reminder1hSent = :reminder1hSent)
    """)
    fun findUpcomingNotReminded(
        @Param("date") date: LocalDate,
        @Param("time") time: LocalTime,
        @Param("reminder24hSent") reminder24hSent: Boolean? = null,
        @Param("reminder1hSent") reminder1hSent: Boolean? = null
    ): List<Appointment>

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.status = 'COMPLETED'
        AND a.updatedAt >= :since
        AND NOT EXISTS (SELECT r FROM Review r WHERE r.appointmentId = a.id)
    """)
    fun findCompletedWithoutReview(@Param("since") since: LocalDateTime): List<Appointment>
}

@Repository
interface ContactMessageRepository : JpaRepository<ContactMessage, String> {
    fun deleteByIsReadTrueAndCreatedAtBefore(cutoff: LocalDateTime)
}

@Repository
interface SiteSettingsRepository : JpaRepository<SiteSettings, String> {
    fun findByTenantId(tenantId: String): SiteSettings?
}

@Repository
interface TenantRepository : JpaRepository<Tenant, String> {
    fun findBySlugAndIsActiveTrue(slug: String): Tenant?
    fun findByCustomDomainAndIsActiveTrue(domain: String): Tenant?
    fun findAllByIsActiveTrue(): List<Tenant>
    @Query("SELECT t.customDomain FROM Tenant t WHERE t.customDomain IS NOT NULL AND t.isActive = true")
    fun findAllCustomDomains(): List<String>
    fun countByIsActiveTrue(): Long
}

@Repository
interface WorkingHoursRepository : JpaRepository<WorkingHours, String> {
    fun findByTenantIdAndStaffIdAndDayOfWeek(
        tenantId: String, staffId: String, dayOfWeek: DayOfWeek
    ): WorkingHours?
}

@Repository
interface BlockedTimeSlotRepository : JpaRepository<BlockedTimeSlot, String> {
    fun findByTenantIdAndStaffIdAndDate(
        tenantId: String, staffId: String, date: LocalDate
    ): List<BlockedTimeSlot>
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
        // DÜZELTME: staffId null durumunda boş string DEĞİL, null-safe sorgu kullanılmalı
        val existingAppointments = if (staffId != null) {
            appointmentRepository.findByTenantIdAndStaffIdAndDateOrderByStartTime(
                tenantId, staffId, date
            ).filter { it.status !in listOf(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW) }
        } else {
            emptyList()  // staffId null ise tüm staff için ayrı ayrı kontrol edilmeli
        }

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

        if (!wh.isWorkingDay) return false
        if (startTime < wh.startTime || endTime > wh.endTime) return false

        // DÜZELTME: Öğle arası kontrolü — randevu break time'a çakışıyor mu?
        if (wh.breakStartTime != null && wh.breakEndTime != null) {
            if (startTime < wh.breakEndTime!! && endTime > wh.breakStartTime!!) {
                return false  // Randevu öğle arasına denk geliyor
            }
        }

        return true
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

    /**
     * "Herhangi bir personel" senaryosu: Verilen zaman diliminde müsait olan
     * ilk personelin ID'sini döndürür. Hiçbiri müsait değilse null.
     */
    fun findAvailableStaff(
        tenantId: String,
        date: LocalDate,
        startTime: LocalTime,
        endTime: LocalTime
    ): String? {
        // Tüm aktif personeli al
        val staffList = userRepository.findByTenantIdAndRoleInAndIsActiveTrue(
            tenantId, listOf(Role.STAFF, Role.TENANT_ADMIN)
        )

        for (staff in staffList) {
            val staffId = staff.id ?: continue

            // 1. Çalışma saatleri uygun mu?
            if (!isWithinWorkingHours(tenantId, staffId, date, startTime, endTime)) continue

            // 2. Bloklanmış mı?
            if (isTimeSlotBlocked(tenantId, staffId, date, startTime, endTime)) continue

            // 3. Çakışan randevu var mı?
            val conflicts = appointmentRepository.findConflictingAppointmentsWithLock(
                tenantId = tenantId,
                staffId = staffId,
                date = date,
                startTime = startTime,
                endTime = endTime
            )
            if (conflicts.isEmpty()) return staffId  // Bu personel müsait!
        }

        return null  // Hiçbir personel müsait değil
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
GET    /api/admin/products/{id}
POST   /api/admin/products
PUT    /api/admin/products/{id}
DELETE /api/admin/products/{id}

# Blog
GET    /api/admin/blog
GET    /api/admin/blog/{id}
POST   /api/admin/blog
PUT    /api/admin/blog/{id}
DELETE /api/admin/blog/{id}
PATCH  /api/admin/blog/{id}/publish          # Yayınla/taslak yap

# Galeri
GET    /api/admin/gallery
GET    /api/admin/gallery/{id}
POST   /api/admin/gallery
PUT    /api/admin/gallery/{id}
DELETE /api/admin/gallery/{id}

# Değerlendirmeler
GET    /api/admin/reviews                    # Değerlendirme listesi
PATCH  /api/admin/reviews/{id}/approve       # Onayla/reddet
DELETE /api/admin/reviews/{id}               # Değerlendirme sil

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
GET    /api/admin/messages/unread-count      # Okunmamış mesaj sayısı (inbox badge)
PATCH  /api/admin/messages/{id}/read         # Okundu işaretle
DELETE /api/admin/messages/{id}              # Mesaj sil

# Bildirim Yönetimi
GET    /api/admin/notifications              # Bildirim geçmişi
GET    /api/admin/notifications/templates    # Bildirim şablonları
PUT    /api/admin/notifications/templates/{id}  # Şablon güncelle

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
    val timestamp: Instant = Instant.now()       // UTC (timezone bağımsız)
)

// Sayfalı yanıt
data class PagedResponse<T>(
    val success: Boolean = true,
    val data: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val message: String? = null,
    val timestamp: Instant = Instant.now()       // ApiResponse ile tutarlı
)

// Hata yanıtı
data class ErrorResponse(
    val success: Boolean = false,
    val error: String,
    val code: ErrorCode,                          // Enum (aşağıda tanımlı)
    val details: Map<String, String>? = null,
    val timestamp: Instant = Instant.now()
)

// Hata kodları enum'u — Tüm API'da tutarlı hata kodları
enum class ErrorCode {
    // Auth
    INVALID_CREDENTIALS,          // Geçersiz e-posta veya şifre
    ACCOUNT_LOCKED,               // Hesap kilitli
    TOKEN_EXPIRED,                // Token süresi dolmuş
    TOKEN_INVALID,                // Geçersiz token

    // Tenant
    TENANT_NOT_FOUND,             // Tenant bulunamadı
    CROSS_TENANT_ACCESS,          // Cross-tenant erişim girişimi

    // Resource
    RESOURCE_NOT_FOUND,           // Kaynak bulunamadı
    DUPLICATE_RESOURCE,           // Aynı kaynak zaten var

    // Appointment
    APPOINTMENT_CONFLICT,         // Zaman çakışması
    APPOINTMENT_INVALID_STATUS,   // Geçersiz durum geçişi
    APPOINTMENT_PAST_DATE,        // Geçmiş tarihe randevu
    NO_AVAILABLE_STAFF,           // Müsait personel yok

    // Validation
    VALIDATION_ERROR,             // Bean validation hatası
    INVALID_FILE_TYPE,            // Desteklenmeyen dosya türü
    FILE_TOO_LARGE,               // Dosya boyutu aşıldı

    // Rate Limiting
    RATE_LIMIT_EXCEEDED,          // Çok fazla istek

    // General
    INTERNAL_ERROR                // Beklenmeyen hata
}
```

---

## 7. Güvenlik Mimarisi

### 7.1 JWT Token Yapısı + Server-Side Revocation

```
Access Token (15 dk ömür):
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "tenantSlug": "salon1",
  "role": "TENANT_ADMIN",
  "email": "admin@salon1.com",
  "tokenFamily": "family-uuid",     // Refresh token theft detection
  "iat": 1707580800,
  "exp": 1707581700
}

Refresh Token (7 gün ömür, DB'de saklanır):
{
  "sub": "user-uuid",
  "type": "refresh",
  "jti": "unique-token-id",         // DB'deki refresh_tokens.id ile eşleşir
  "family": "family-uuid",          // Token ailesi (theft detection)
  "iat": 1707580800,
  "exp": 1708185600
}
```

**Token Revocation Mekanizması:**

```kotlin
// RefreshToken.kt — DB'de saklanan refresh token'lar
@Entity
@Table(
    name = "refresh_tokens",
    indexes = [
        Index(name = "idx_rt_user", columnList = "userId"),              // Kullanıcının tüm token'ları
        Index(name = "idx_rt_family", columnList = "family"),            // Theft detection
        Index(name = "idx_rt_expires", columnList = "expiresAt")         // Expired token temizliği
    ]
)
class RefreshToken(
    @Id
    val id: String,                          // JWT'deki "jti" claim
    val userId: String,
    val tenantId: String,
    val family: String,                       // Token ailesi
    val expiresAt: Instant,                  // UTC (timezone bağımsız)
    var isRevoked: Boolean = false,
    val createdAt: Instant = Instant.now()   // UTC
)
```

**Revocation senaryoları:**
- Kullanıcı şifre değiştirince → o kullanıcının TÜM refresh token'ları revoke
- Hesap deaktive edilince → TÜM token'ları revoke
- Refresh token kullanılınca → eski token revoke, yeni token oluştur (rotation)
- Token theft tespiti → aynı family'deki TÜM token'lar revoke (tüm cihazlardan çıkış)

### 7.2 Brute Force Koruması

```kotlin
@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtTokenProvider: JwtTokenProvider,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val settingsRepository: SiteSettingsRepository
) {
    companion object {
        private val logger = LoggerFactory.getLogger(AuthService::class.java)
        const val MAX_FAILED_ATTEMPTS = 5
        const val LOCK_DURATION_MINUTES = 15L
    }

    @Transactional
    fun login(request: LoginRequest): TokenResponse {
        val tenantId = TenantContext.getTenantId()
        val user = userRepository.findByEmailAndTenantId(request.email, tenantId)
            ?: throw UnauthorizedException("Geçersiz e-posta veya şifre")

        // Hesap kilitli mi kontrol et
        // KRİTİK: Tenant timezone kullan (sunucu timezone'u değil!)
        val settings = settingsRepository.findByTenantId(tenantId)
        val tenantZone = ZoneId.of(settings?.timezone ?: "Europe/Istanbul")
        val now = ZonedDateTime.now(tenantZone).toLocalDateTime()

        if (user.lockedUntil != null && user.lockedUntil!!.isAfter(now)) {
            val remainingMinutes = Duration.between(now, user.lockedUntil).toMinutes()
            throw AccountLockedException(
                "Hesabınız çok fazla başarısız giriş denemesi nedeniyle kilitlendi. " +
                "$remainingMinutes dakika sonra tekrar deneyin."
            )
        }

        // Şifre kontrolü
        if (!passwordEncoder.matches(request.password, user.passwordHash)) {
            user.failedLoginAttempts++
            if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
                user.lockedUntil = now.plusMinutes(LOCK_DURATION_MINUTES)
                logger.warn("[tenant={}] Hesap kilitlendi: {} ({} başarısız deneme)",
                    tenantId, user.email, user.failedLoginAttempts)
            }
            userRepository.save(user)
            throw UnauthorizedException("Geçersiz e-posta veya şifre")
        }

        // Başarılı giriş — sayaçları sıfırla
        user.failedLoginAttempts = 0
        user.lockedUntil = null
        userRepository.save(user)

        // Token pair oluştur
        val family = UUID.randomUUID().toString()
        return generateTokenPair(user, family)
    }
}
```

### 7.3 Spring Security Konfigürasyonu

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
            // CSRF devre dışı: REST API, JWT token-based auth kullanır.
            // CSRF koruması session-based auth için gereklidir, stateless API'da gereksizdir.
            .csrf { it.disable() }
            .cors { it.configurationSource(corsConfigSource()) }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .addFilterBefore(tenantFilter, UsernamePasswordAuthenticationFilter::class.java)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)
            .authorizeHttpRequests { auth ->
                auth
                    // Public endpoints
                    .requestMatchers("/api/public/**").permitAll()
                    .requestMatchers(
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/refresh",              // DÜZELTME: Refresh de permitAll olmalı!
                        "/api/auth/forgot-password",
                        "/api/auth/reset-password"
                    ).permitAll()
                    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                    .requestMatchers("/api/webhooks/**").permitAll()  // Dış servis callback (iyzico vb.)
                    // Platform admin
                    .requestMatchers("/api/platform/**").hasRole("PLATFORM_ADMIN")
                    // Admin endpoints
                    .requestMatchers("/api/admin/**").hasAnyRole("TENANT_ADMIN", "STAFF")
                    // Authenticated
                    .anyRequest().authenticated()
            }

        return http.build()
    }

    /**
     * CORS konfigürasyonu — Dinamik origin desteği.
     * Tüm tenant subdomain'leri + custom domain'ler desteklenir.
     */
    @Bean
    fun corsConfigSource(tenantRepository: TenantRepository): CorsConfigurationSource {
        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", CorsConfiguration().apply {
                // Statik pattern'lar
                allowedOriginPatterns = mutableListOf(
                    "https://*.app.com",        // Tüm tenant subdomain'leri
                    "http://localhost:3000"      // Geliştirme
                )

                // DÜZELTME: Custom domain desteği
                // Tenant'ların kayıtlı custom domain'lerini de CORS origin olarak ekle
                val customDomains = tenantRepository.findAllCustomDomains()
                customDomains.forEach { domain ->
                    allowedOriginPatterns!!.add("https://$domain")
                }

                allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                allowedHeaders = listOf("*")
                allowCredentials = true
                maxAge = 3600
            })
        }
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder(12)
}
```

### 7.4 Rate Limiting

```kotlin
// RateLimitConfig.kt — Bucket4j ile rate limiting
@Configuration
class RateLimitConfig {
    @Bean
    fun rateLimitFilter(): FilterRegistrationBean<RateLimitFilter> {
        val registration = FilterRegistrationBean<RateLimitFilter>()
        registration.filter = RateLimitFilter()
        registration.addUrlPatterns("/api/*")
        return registration
    }
}

// RateLimitFilter.kt — Endpoint bazlı rate limiting
class RateLimitFilter : OncePerRequestFilter() {

    // IP bazlı bucket'lar (ConcurrentHashMap + Caffeine eviction ile)
    private val ipBuckets: Cache<String, Bucket> = Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterAccess(Duration.ofMinutes(5))
        .build()

    // Endpoint bazlı rate limit kuralları
    private val rules = listOf(
        RateLimitRule("/api/auth/login",         5,  Duration.ofMinutes(1)),   // Brute force koruması
        RateLimitRule("/api/public/contact",     3,  Duration.ofMinutes(1)),   // Spam koruması
        RateLimitRule("/api/public/appointments", 10, Duration.ofMinutes(1)),
        RateLimitRule("/api/admin/upload",        20, Duration.ofMinutes(1)),
        RateLimitRule("/api/admin/",             100, Duration.ofMinutes(1)),
        RateLimitRule("/api/public/",            200, Duration.ofMinutes(1))
    )

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val clientIp = request.remoteAddr
        val uri = request.requestURI
        val rule = rules.firstOrNull { uri.startsWith(it.pathPrefix) } ?: run {
            filterChain.doFilter(request, response)
            return
        }

        val bucket = ipBuckets.get("$clientIp:${rule.pathPrefix}") {
            Bucket.builder()
                .addLimit(Bandwidth.simple(rule.limit.toLong(), rule.window))
                .build()
        }

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response)
        } else {
            response.status = 429
            response.contentType = "application/json"
            response.writer.write("""{"success":false,"error":"Çok fazla istek","code":"RATE_LIMIT_EXCEEDED"}""")
        }
    }

    data class RateLimitRule(val pathPrefix: String, val limit: Int, val window: Duration)
}

// build.gradle.kts'e ekle:
// implementation("com.bucket4j:bucket4j-core:8.10.1")
```

### 7.5 Dosya Yükleme Güvenliği

```kotlin
@Service
class SecureFileUploadService(
    private val storageProvider: StorageProvider   // S3 veya MinIO
) {
    companion object {
        val ALLOWED_CONTENT_TYPES = setOf(
            "image/jpeg", "image/png", "image/webp", "image/avif"
        )
        val ALLOWED_EXTENSIONS = setOf("jpg", "jpeg", "png", "webp", "avif")
        const val MAX_FILE_SIZE = 10 * 1024 * 1024L  // 10MB
        const val MAX_IMAGE_DIMENSION = 4096           // Max 4096x4096 px
    }

    fun uploadImage(file: MultipartFile, directory: String): String {
        // 1. Boyut kontrolü
        if (file.size > MAX_FILE_SIZE) {
            throw IllegalArgumentException("Dosya boyutu 10MB'den büyük olamaz")
        }

        // 2. Uzantı kontrolü
        val extension = file.originalFilename?.substringAfterLast(".")?.lowercase()
        if (extension !in ALLOWED_EXTENSIONS) {
            throw IllegalArgumentException(
                "Desteklenmeyen dosya formatı: $extension. " +
                "İzin verilen: ${ALLOWED_EXTENSIONS.joinToString()}"
            )
        }

        // KRİTİK DÜZELTME: inputStream SADECE BİR KEZ okunabilir!
        // Birden fazla işlem için file.bytes kullanılmalı.
        val fileBytes = file.bytes

        // 3. MIME type kontrolü (content sniffing — uzantıya güvenme)
        // Apache Tika kütüphanesi ile gerçek dosya içeriğinden MIME type tespit et
        // build.gradle.kts: implementation("org.apache.tika:tika-core:2.9.1")
        val tika = Tika()
        val detectedType = tika.detect(fileBytes)
        if (detectedType !in ALLOWED_CONTENT_TYPES) {
            throw SecurityException("Dosya içeriği beyan edilen türle uyuşmuyor")
        }

        // 4. Görsel boyut kontrolü (decompression bomb koruması)
        val image = ImageIO.read(ByteArrayInputStream(fileBytes))
            ?: throw IllegalArgumentException("Geçersiz görsel dosyası")
        if (image.width > MAX_IMAGE_DIMENSION || image.height > MAX_IMAGE_DIMENSION) {
            throw IllegalArgumentException("Görsel boyutu ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}'den büyük olamaz")
        }

        // 5. Güvenli dosya adı oluştur (path traversal koruması)
        val tenantId = TenantContext.getTenantId()
        val safeName = "${UUID.randomUUID()}.$extension"
        val path = "tenants/$tenantId/$directory/$safeName"

        // 6. Yükle (ayrı domain'den servis edilmeli — XSS koruması)
        return storageProvider.upload(ByteArrayInputStream(fileBytes), path, detectedType)
    }
}
```

> **GÜVENLİK NOTU:** Yüklenen dosyalar **ayrı bir domain**'den (örn: `cdn.app.com`) servis edilmelidir. Ana domain'den servis edilirse, SVG/HTML dosyaları XSS saldırısı vektörü olur.

### 7.6 Rol Tabanlı Erişim Kontrolü

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
                              ┌─────────────┐
                              │   tenants   │  (root — tenant_id FK olmaz)
                              └──────┬──────┘
                                     │ 1:N (tüm alt tablolar tenant_id ile bağlı)
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
   ┌──────────┐              ┌──────────────┐           ┌──────────────┐
   │  users   │              │   services   │           │   products   │
   └────┬─────┘              └──────┬───────┘           └──────────────┘
        │                           │
        │ 1:N                       │ N:1
        ▼                           ▼
 ┌─────────────┐         ┌───────────────────┐
 │ client_notes│         │service_categories │
 └─────────────┘         └───────────────────┘

   users ───1:N(staff)──→ appointments ←──N:M──→ services
   users ───1:N(client)─→ appointments          (pivot: appointment_services)
                               │
                          ┌────┴────┐
                          ▼         ▼
                    ┌─────────┐ ┌──────────────────┐
                    │ reviews │ │appointment_services│
                    └─────────┘ └──────────────────┘

   ┌────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
   │ blog_posts │  │ gallery_items │  │contact_messages│  │ site_settings │
   └────────────┘  └───────────────┘  └───────────────┘  └───────────────┘

   ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
   │working_hours  │  │blocked_time_ │  │refresh_tokens│
   │(staff + genel)│  │   slots      │  │(per user)    │
   └───────────────┘  └──────────────┘  └──────────────┘

   ┌──────────┐  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐
   │ payments │  │subscriptions │  │   invoices    │  │  notifications   │
   │ (iyzico) │  │(per tenant)  │  │(per payment)  │  │notification_tmpls│
   └──────────┘  └──────────────┘  └───────────────┘  └──────────────────┘

   İlişki özeti:
   • tenants 1:N → users, services, products, blog_posts, gallery_items, ...
   • users   1:N → appointments (staff), appointments (client), reviews, client_notes
   • services N:1 → service_categories
   • appointments N:M → services (pivot: appointment_services)
   • appointments 1:1 → reviews
   • tenants 1:1 → subscriptions, site_settings
   • Tüm tenant-scoped tablolar: tenant_id sütunu + Hibernate @Filter
```

### 8.2 Kritik Indexler

```sql
-- ═══════════════════════════════════════════════════
-- RANDEVU SİSTEMİ
-- ═══════════════════════════════════════════════════

-- Çakışma sorgularını hızlandırmak için (PESSIMISTIC_WRITE ile kullanılır)
CREATE INDEX idx_appt_conflict
    ON appointments(tenant_id, staff_id, date, start_time, end_time, status);

-- Müşteri randevu geçmişi
CREATE INDEX idx_appt_client ON appointments(tenant_id, client_id);

-- ═══════════════════════════════════════════════════
-- TENANT ÇÖZÜMLEME
-- ═══════════════════════════════════════════════════

CREATE UNIQUE INDEX idx_tenant_slug ON tenants(slug);
-- NOT: MySQL partial index desteklemez! NULL custom_domain'ler unique constraint'ten
-- otomatik hariç tutulur (MySQL'de NULL != NULL). Bu yüzden basit UNIQUE yeterlidir.
CREATE UNIQUE INDEX idx_tenant_custom_domain ON tenants(custom_domain);

-- ═══════════════════════════════════════════════════
-- KULLANICI + AUTH
-- ═══════════════════════════════════════════════════

CREATE UNIQUE INDEX idx_user_email_tenant ON users(email, tenant_id);

-- Refresh token sorguları
CREATE INDEX idx_rt_user ON refresh_tokens(user_id);
CREATE INDEX idx_rt_family ON refresh_tokens(family);
CREATE INDEX idx_rt_expires ON refresh_tokens(expires_at);

-- ═══════════════════════════════════════════════════
-- SEO SLUG'LAR (tenant bazlı unique)
-- ═══════════════════════════════════════════════════

CREATE UNIQUE INDEX idx_service_slug_tenant ON services(slug, tenant_id);
CREATE UNIQUE INDEX idx_category_slug_tenant ON service_categories(slug, tenant_id);
CREATE UNIQUE INDEX idx_product_slug_tenant ON products(slug, tenant_id);
CREATE UNIQUE INDEX idx_blog_slug_tenant ON blog_posts(slug, tenant_id);

-- ═══════════════════════════════════════════════════
-- YENİ ENTITY'LER
-- ═══════════════════════════════════════════════════

-- Review sorguları
CREATE INDEX idx_review_service ON reviews(tenant_id, service_id);
CREATE INDEX idx_review_staff ON reviews(tenant_id, staff_id);

-- Payment sorguları
CREATE INDEX idx_payment_tenant ON payments(tenant_id, status);
CREATE INDEX idx_subscription_tenant ON subscriptions(tenant_id);

-- Çalışma saatleri + bloklanmış slotlar
CREATE UNIQUE INDEX uk_working_hours ON working_hours(tenant_id, staff_id, day_of_week);
CREATE INDEX idx_blocked_slot ON blocked_time_slots(tenant_id, staff_id, date);
```

### 8.3 Flyway Migration Örnekleri

> **Collation NOTU:** Tüm tablolarda `utf8mb4_turkish_ci` kullanılır. Bu sayede Türkçe
> karakterler (İ, ı, Ş, ş, Ö, ö, Ü, ü, Ç, ç, Ğ, ğ) doğru sıralanır ve aranır.

> **FK ON DELETE stratejisi:**
> - `ON DELETE CASCADE` → Alt kayıt otomatik silinir (tenant silinince tüm verileri silinir)
> - `ON DELETE SET NULL` → FK null yapılır (staff silinince randevudaki staff_id null olur)
> - `ON DELETE RESTRICT` → Silmeyi engeller (referans varsa silme yapılamaz)

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
    custom_domain VARCHAR(255) UNIQUE,           -- DÜZELTME: domain → custom_domain
    plan ENUM('TRIAL','BASIC','PROFESSIONAL','ENTERPRISE') DEFAULT 'TRIAL',
    trial_end_date DATE,                         -- DÜZELTME: Eksik alan eklendi
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- V3__create_service_tables.sql
CREATE TABLE service_categories (                -- DÜZELTME: Eksik tablo eklendi
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(500),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY uk_category_slug_tenant (slug, tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- V7__create_appointment_tables.sql
CREATE TABLE appointments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    client_id VARCHAR(36),
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    primary_service_id VARCHAR(36),              -- DÜZELTME: service_id → primary_service_id
    staff_id VARCHAR(36),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_duration_minutes INT DEFAULT 0,        -- DÜZELTME: Eksik alanlar eklendi
    total_price DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    status ENUM('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')
        DEFAULT 'PENDING',
    cancelled_at TIMESTAMP NULL,
    cancellation_reason VARCHAR(500),
    recurring_group_id VARCHAR(36),              -- Tekrarlayan randevu grubu
    recurrence_rule VARCHAR(20),                 -- WEEKLY, BIWEEKLY, MONTHLY
    reminder_24h_sent BOOLEAN DEFAULT FALSE,     -- Hatırlatıcı durumları
    reminder_1h_sent BOOLEAN DEFAULT FALSE,
    version BIGINT DEFAULT 0,                    -- Optimistic locking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (primary_service_id) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_appt_conflict (tenant_id, staff_id, date, start_time, end_time, status),
    INDEX idx_appt_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- Pivot tablo: Randevu ↔ Hizmet (çoklu hizmet desteği)
CREATE TABLE appointment_services (              -- DÜZELTME: Eksik pivot tablo eklendi
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    appointment_id VARCHAR(36) NOT NULL,
    service_id VARCHAR(36) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,            -- Randevu anındaki fiyat snapshot
    duration_minutes INT DEFAULT 0,
    sort_order INT DEFAULT 0,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,

    INDEX idx_appt_svc (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

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

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,

    UNIQUE KEY uk_working_hours (tenant_id, staff_id, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE blocked_time_slots (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    staff_id VARCHAR(36),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(500),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_blocked_slot (tenant_id, staff_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- V10__create_review_table.sql
CREATE TABLE reviews (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    appointment_id VARCHAR(36),
    client_id VARCHAR(36) NOT NULL,
    service_id VARCHAR(36),
    staff_id VARCHAR(36),
    rating INT NOT NULL DEFAULT 0,
    comment TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_review_service (tenant_id, service_id),
    INDEX idx_review_staff (tenant_id, staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- V11__create_refresh_token_table.sql
CREATE TABLE refresh_tokens (
    id VARCHAR(36) NOT NULL PRIMARY KEY,         -- JWT jti claim
    user_id VARCHAR(36) NOT NULL,
    tenant_id VARCHAR(36) NOT NULL,
    family VARCHAR(36) NOT NULL,                 -- Token ailesi (theft detection)
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_rt_user (user_id),
    INDEX idx_rt_family (family),
    INDEX idx_rt_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- V12__create_payment_tables.sql
CREATE TABLE subscriptions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    plan VARCHAR(20) NOT NULL DEFAULT 'TRIAL',            -- TRIAL, BASIC, PRO, ENTERPRISE
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    max_staff INT NOT NULL DEFAULT 1,
    max_appointments_per_month INT NOT NULL DEFAULT 50,
    max_storage_mb INT NOT NULL DEFAULT 100,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',         -- ACTIVE, EXPIRED, CANCELLED, SUSPENDED
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_sub_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE payments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    subscription_id VARCHAR(36),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',        -- PENDING, COMPLETED, FAILED, REFUNDED
    provider VARCHAR(20) NOT NULL DEFAULT 'IYZICO',       -- IYZICO, STRIPE
    provider_payment_id VARCHAR(255),
    provider_subscription_id VARCHAR(255),
    failure_reason TEXT,
    paid_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    INDEX idx_pay_tenant (tenant_id),
    INDEX idx_pay_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE invoices (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    payment_id VARCHAR(36),
    invoice_number VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    pdf_url VARCHAR(500),
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    UNIQUE INDEX idx_inv_number (invoice_number),
    INDEX idx_inv_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- V13__create_notification_tables.sql
CREATE TABLE notification_templates (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,                            -- APPOINTMENT_CONFIRMATION, REMINDER_24H vb.
    email_subject VARCHAR(255),
    email_body TEXT,                                       -- HTML template (Mustache syntax)
    sms_body VARCHAR(320),                                -- Multi-part SMS (2×160)
    is_email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_nt_tenant_type (tenant_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE notification_logs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    appointment_id VARCHAR(36),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    channel VARCHAR(10) NOT NULL DEFAULT 'EMAIL',         -- EMAIL, SMS
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',        -- PENDING, SENT, FAILED
    error_message TEXT,
    sent_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_nl_tenant (tenant_id),
    INDEX idx_nl_appointment (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- V14__create_client_notes_table.sql
CREATE TABLE client_notes (                      -- DÜZELTME: Eksik tablo eklendi
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    client_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_client_notes (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- V15__create_audit_log_table.sql
-- Not: AuditLog TenantAwareEntity'den extend ETMEZ (platform admin tüm tenant loglarını görebilir)
CREATE TABLE audit_logs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,                         -- CREATE_APPOINTMENT, UPDATE_SERVICE vb.
    entity_type VARCHAR(50) NOT NULL,                     -- Appointment, Service vb.
    entity_id VARCHAR(36) NOT NULL,
    details JSON,                                         -- Değişen alanlar (JSON)
    ip_address VARCHAR(45),                               -- IPv4 + IPv6
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_audit_tenant (tenant_id, created_at),
    INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- V16__create_consent_records_table.sql
CREATE TABLE consent_records (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    consent_type VARCHAR(30) NOT NULL,                    -- TERMS_OF_SERVICE, PRIVACY_POLICY, MARKETING_EMAIL vb.
    is_granted BOOLEAN NOT NULL DEFAULT FALSE,
    granted_at TIMESTAMP(6) NULL,
    revoked_at TIMESTAMP(6) NULL,
    ip_address VARCHAR(45),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_consent_tenant_user (tenant_id, user_id),
    INDEX idx_consent_type (tenant_id, consent_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
```

---

## 9. Konfigürasyon

### 9.1 application.yml

```yaml
spring:
  application:
    name: aesthetic-saas-backend

  datasource:
    # DB sütunları UTC saklar — tenant timezone dönüşümü uygulama katmanında yapılır
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:aesthetic_saas}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 30               # Geliştirme. Prod: application-prod.yml'de 50
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 20000
      leak-detection-threshold: 60000     # 60s — connection leak tespiti

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

  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
      timeout: 2000               # Connection timeout (ms)

  cache:
    type: caffeine                # Local cache (tenant resolution, entity cache)
    caffeine:
      spec: maximumSize=1000,expireAfterWrite=300s
    cache-names: services,products,blog,gallery,tenants

  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB

  jackson:
    serialization:
      write-dates-as-timestamps: false
    time-zone: UTC              # API yanıtları UTC — tenant timezone uygulama katmanında yönetilir

# JWT
jwt:
  secret: ${JWT_SECRET}                   # Zorunlu! Min 256-bit key. Güvenlik için default yok.
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
    # Hibernate SQL logları — sadece application-dev.yml'de aktif edin:
    # org.hibernate.SQL: DEBUG
    # org.hibernate.orm.jdbc.bind: TRACE     # Hibernate 6'da BasicBinder yerine orm.jdbc.bind

server:
  port: ${SERVER_PORT:8080}
```

### 9.1.1 application-dev.yml

Geliştirme ortamında SQL logları ve detaylı hata ayıklama aktif edilir. `application.yml`'deki default değerleri override eder:

```yaml
# application-dev.yml — Geliştirme ortamı overrides
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true

logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE       # Hibernate 6 — bind parameter logları
    com.aesthetic.backend: TRACE
```

### 9.2 build.gradle.kts

```kotlin
plugins {
    kotlin("jvm") version "2.0.21"
    kotlin("plugin.spring") version "2.0.21"
    kotlin("plugin.jpa") version "2.0.21"
    id("org.springframework.boot") version "3.4.1"
    id("io.spring.dependency-management") version "1.1.7"
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

    // Password Hashing — spring-boot-starter-security içinde BCryptPasswordEncoder zaten mevcut

    // OpenAPI / Swagger
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

    // File Upload (MIME type detection — Bölüm 7.5'te Tika().detect() kullanılıyor)
    implementation("org.apache.tika:tika-core:3.0.0")

    // Redis (rate limiting + distributed cache)
    implementation("org.springframework.boot:spring-boot-starter-data-redis")

    // Cache (Caffeine local cache — tenant resolution, entity cache)
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("com.github.ben-manes.caffeine:caffeine:3.1.8")

    // Rate Limiting
    implementation("com.bucket4j:bucket4j-core:8.10.1")

    // Retry (@EnableRetry — AOP starter gerekli)
    implementation("org.springframework.retry:spring-retry")
    implementation("org.springframework.boot:spring-boot-starter-aop")

    // iyzico (Türkiye ödeme)
    implementation("com.iyzipay:iyzipay-java:2.0.131")

    // SendGrid (e-posta bildirimleri — Bölüm 18)
    implementation("com.sendgrid:sendgrid-java:4.10.1")

    // Micrometer Prometheus (Actuator metrics export — Bölüm 14)
    implementation("io.micrometer:micrometer-registry-prometheus")

    // Sentry (error tracking)
    implementation("io.sentry:sentry-spring-boot-starter-jakarta:7.14.0")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("io.mockk:mockk:1.13.12")
    testImplementation("org.testcontainers:testcontainers:1.20.3")
    testImplementation("org.testcontainers:mysql:1.20.3")
    testImplementation("org.testcontainers:junit-jupiter:1.20.3")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")    // Spring null-safety desteği
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21)
    }
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
# Docker Compose V2 — 'version' alanı artık gerekli değil (deprecated)
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
      - DB_PASSWORD=${DB_PASSWORD:-secret}       # .env dosyasından al
      - JWT_SECRET=${JWT_SECRET}                 # Zorunlu! .env dosyasında tanımla
      - FILE_PROVIDER=local
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
      - JAVA_OPTS=-Xmx512m -Xms256m             # JVM memory ayarları
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s                          # Spring Boot başlayana kadar bekle

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD:-secret}
      - MYSQL_DATABASE=aesthetic_saas
    command:                                     # utf8mb4_turkish_ci (Bölüm 8 ile tutarlı)
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_turkish_ci
    volumes:
      - mysql-data:/var/lib/mysql
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    volumes:
      - redis-data:/data

volumes:
  mysql-data:
  uploads:
  redis-data:
```

### 10.2 Dockerfile

```dockerfile
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY build/libs/*.jar app.jar
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 8080

# JAVA_OPTS env ile JVM parametreleri dışarıdan ayarlanabilir
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### 10.3 Multi-Stage Build (Prodüksiyon)

> **Not:** Aşağıdaki `.dockerignore` dosyasını proje kök dizinine ekleyin:

```text
# .dockerignore
.git/
.gitignore
.idea/
.vscode/
*.md
build/
out/
node_modules/
docker-compose*.yml
.env*
src/test/
```

```dockerfile
# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build
# Önce dependency'leri cache'le (layer optimization)
COPY build.gradle.kts settings.gradle.kts ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon || true
# Sonra kodu kopyala ve build et
COPY src ./src
RUN ./gradlew bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=builder /build/build/libs/*.jar app.jar
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 8080

# JAVA_OPTS env ile JVM parametreleri dışarıdan ayarlanabilir (docker-compose'da tanımlı)
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
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
// HTTPS zorunlu — prod'da http:// kullanmayın
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Tenant çözünürlüğü: Subdomain otomatik olarak TenantFilter tarafından
// çözülür (Bölüm 2.2). API'ye ayrıca X-Tenant-ID header'ı gerekmez.
// Sadece cross-origin (farklı domain) isteklerinde X-Tenant-Slug gerekebilir.

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Bir hata oluştu' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchServices() {
  const res = await fetch(`${API_BASE}/api/public/services`);
  return handleResponse(res);
}

export async function createAppointment(data: AppointmentFormData) {
  const res = await fetch(`${API_BASE}/api/public/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
```

### 11.2 Admin Panel Entegrasyonu

```typescript
// lib/admin-api-client.ts
const MAX_RETRY = 1; // Sonsuz döngüyü önle

export async function adminFetch(
  endpoint: string,
  options?: RequestInit,
  retryCount = 0
) {
  // JWT: httpOnly cookie (SSR güvenli) veya Authorization header
  // localStorage XSS'e açık — httpOnly cookie önerilir
  const token = getAccessToken(); // Cookie'den veya memory'den oku

  const res = await fetch(`${API_BASE}/api/admin${endpoint}`, {
    ...options,
    credentials: 'include',         // httpOnly cookie için gerekli
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // 401 → Token expired, max 1 retry ile refresh dene
  if (res.status === 401 && retryCount < MAX_RETRY) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return adminFetch(endpoint, options, retryCount + 1);
    }
    // Refresh de başarısız → login sayfasına yönlendir
    window.location.href = '/giris';
    throw new Error('Oturum süresi doldu');
  }

  return handleResponse(res);       // Aynı error handling (11.1'deki)
}
```

---

## 12. Tenant Onboarding Akışı

```
Yeni işletme kaydı (tümü @Transactional içinde):

  ① İşletme sahibi kayıt formu doldurur
     → POST /api/platform/tenants
     │
     ▼
  ② Tenant oluşturulur (slug: "guzellik-merkezi-ayse")
     → tenants tablosuna kayıt
     → trial_end_date = now + 14 gün (Bölüm 4 Tenant entity)
     │
     ▼
  ③ Varsayılan admin kullanıcı oluşturulur
     → users tablosuna TENANT_ADMIN rolünde
     → Geçici şifre oluşturulur ve e-posta ile gönderilir
     → İlk girişte şifre değişikliği zorunlu (forcePasswordChange = true)
     │
     ▼
  ④ Varsayılan site ayarları oluşturulur
     → site_settings tablosuna (timezone: Europe/Istanbul default)
     │
     ▼
  ⑤ Varsayılan hizmet kategorileri oluşturulur
     → service_categories tablosuna (işletme tipine göre şablon)
     │
     ▼
  ⑥ Varsayılan çalışma saatleri oluşturulur
     → working_hours tablosuna (Pzt-Cmt 09:00-18:00)
     │
     ▼
  ⑦ Subscription kaydı oluşturulur
     → subscriptions tablosuna (plan = TRIAL, endDate = now + 14 gün)
     │
     ▼
  ⑧ Hoş geldiniz e-postası gönderilir
     → Admin URL + geçici şifre + başlangıç kılavuzu
     │
     ▼
  ⑨ Subdomain aktif: guzellik-merkezi-ayse.app.com
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

### 13.3 Cache Stratejisi (Caffeine local cache)
- `tenants`: Tenant slug çözünürlüğü — 5 dk TTL (Bölüm 2.2)
- `services`: Hizmet listesi — 5 dk TTL
- `products`: Ürün listesi — 5 dk TTL
- `blog`: Blog listesi — 5 dk TTL
- `gallery`: Galeri listesi — 5 dk TTL
- Site ayarları: 15 dk TTL
- Müsaitlik: Cache'lenmez (her sorguda güncel veri gerekli)
- Cache invalidation: Entity değiştiğinde `@CacheEvict` (tenant-scoped key ile)
- Redis: Rate limiting ve distributed session için kullanılır, entity cache için değil

### 13.4 Connection Pool
- HikariCP (Spring Boot default)
- `maximum-pool-size: 30` (geliştirme, Bölüm 9.1'de tanımlı)
- Prod: `application-prod.yml`'de tenant sayısına göre 50+ ayarlanır

---

## 14. Monitoring & Logging

### 14.1 Spring Actuator Endpoint'leri
```
/actuator/health         # Sağlık durumu (DB, Redis)
/actuator/metrics        # JVM, HTTP, DB metrikleri
/actuator/prometheus     # Prometheus formatında metrikler
                         # → Gerekli: implementation("io.micrometer:micrometer-registry-prometheus")
                         #   (build.gradle.kts'e eklenecek)
```

### 14.2 Structured Logging (MDC ile)
```kotlin
// TenantFilter'da MDC set edilir — tüm loglara otomatik tenant bilgisi eklenir
import org.slf4j.MDC

// TenantFilter.doFilterInternal() içinde:
MDC.put("tenantId", tenant.id)
MDC.put("tenantSlug", tenant.slug)
try {
    filterChain.doFilter(request, response)
} finally {
    MDC.clear()
}

// application.yml'de log pattern:
// logging.pattern.console: "%d{HH:mm:ss.SSS} [%thread] [tenant=%X{tenantSlug}] %-5level %logger{36} - %msg%n"

// Kullanım — MDC otomatik olarak log satırlarına eklenir:
logger.info("Randevu oluşturuldu: {}", appointmentId)
// Çıktı: 14:30:15.123 [http-1] [tenant=guzellik-merkezi] INFO  AppointmentService - Randevu oluşturuldu: abc-123
```

### 14.3 Audit Log
```kotlin
// Not: AuditLog manuel tenantId kullanır (TenantAwareEntity'den extends etmez),
// çünkü platform admin tüm tenant'ların loglarını görebilmelidir.
// Okuma sorgularında tenant filtresi use-case bazlı uygulanır.
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
    val createdAt: Instant = Instant.now()    // UTC timestamp
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

    companion object {
        @Container
        @JvmStatic
        val mysql = MySQLContainer("mysql:8.0")
            .withDatabaseName("aesthetic_saas_test")
            .withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_turkish_ci")

        @DynamicPropertySource
        @JvmStatic
        fun properties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url") { mysql.jdbcUrl }
            registry.add("spring.datasource.username") { mysql.username }
            registry.add("spring.datasource.password") { mysql.password }
        }
    }

    @Autowired
    private lateinit var appointmentService: AppointmentService

    @Autowired
    private lateinit var appointmentRepository: AppointmentRepository

    private val testTenantId = "test-tenant-001"

    @BeforeEach
    fun setup() {
        // Multi-tenant test: TenantContext ayarla
        TenantContext.setCurrentTenant(testTenantId)
        // Test verisi oluştur (staff, service, working_hours vb.)
    }

    @AfterEach
    fun cleanup() {
        TenantContext.clear()
        appointmentRepository.deleteAll()
    }

    @Test
    fun `aynı slota eşzamanlı iki randevu isteği geldiğinde sadece biri başarılı olmalı`() {
        val request1 = CreateAppointmentRequest(/* aynı tarih, saat, staff */)
        val request2 = CreateAppointmentRequest(/* aynı tarih, saat, staff */)

        val latch = CountDownLatch(1)
        val results = ConcurrentHashMap<String, Boolean>()

        // Not: Her thread kendi TenantContext'ini set etmeli
        val thread1 = Thread {
            TenantContext.setCurrentTenant(testTenantId)
            latch.await()
            try {
                appointmentService.createAppointment(request1)
                results["thread1"] = true
            } catch (e: AppointmentConflictException) {
                results["thread1"] = false
            } finally {
                TenantContext.clear()
            }
        }

        val thread2 = Thread {
            TenantContext.setCurrentTenant(testTenantId)
            latch.await()
            try {
                appointmentService.createAppointment(request2) // aynı slot
                results["thread2"] = true
            } catch (e: AppointmentConflictException) {
                results["thread2"] = false
            } finally {
                TenantContext.clear()
            }
        }

        thread1.start()
        thread2.start()
        latch.countDown() // İkisini aynı anda başlat

        thread1.join(5000) // 5s timeout
        thread2.join(5000)

        // Sadece biri başarılı olmalı
        val successCount = results.values.count { it }
        assertEquals(1, successCount,
            "Aynı slota iki randevu oluşturulmamalı!")
    }
}
```

---

---

## 17. Ödeme & Abonelik Altyapısı

Tenant'ların plan bazlı ödeme yapabilmesi için. Türkiye pazarı için **iyzico** (PayTR alternatif), uluslararası için **Stripe**.

### 17.1 Entity'ler

```kotlin
@Entity
@Table(name = "subscriptions")
class Subscription : TenantAwareEntity() {             // DÜZELTME: TenantAwareEntity extend
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null
    // tenantId → TenantAwareEntity'den miras alınır

    @Enumerated(EnumType.STRING)
    var plan: SubscriptionPlan = SubscriptionPlan.TRIAL

    // Not: startDate/endDate service katmanında set edilmeli,
    // entity default'ları sadece constructor zamanı çalışır.
    var startDate: LocalDate = LocalDate.now()
    var endDate: LocalDate = LocalDate.now().plusDays(14)
    var autoRenew: Boolean = true

    // Plan limitleri (plan seçimi sırasında service tarafından set edilir)
    var maxStaff: Int = 1                 // TRIAL: 1, BASIC: 3, PRO: 10, ENT: sınırsız
    var maxAppointmentsPerMonth: Int = 50 // TRIAL: 50, BASIC: 200, PRO: 1000, ENT: sınırsız
    var maxStorageMb: Int = 100           // Dosya yükleme limiti

    @Enumerated(EnumType.STRING)
    var status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    // DÜZELTME: isActive kaldırıldı — status == ACTIVE ile kontrol edilir

    @CreationTimestamp val createdAt: Instant? = null   // DÜZELTME: LocalDateTime → Instant (UTC)
    @UpdateTimestamp var updatedAt: Instant? = null
}

@Entity
@Table(name = "payments")
class Payment : TenantAwareEntity() {                   // DÜZELTME: TenantAwareEntity extend
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    @ManyToOne(fetch = FetchType.LAZY)                  // DÜZELTME: String → JPA ilişki
    @JoinColumn(name = "subscription_id")
    var subscription: Subscription? = null

    @Column(precision = 10, scale = 2)
    var amount: BigDecimal = BigDecimal.ZERO
    var currency: String = "TRY"

    @Enumerated(EnumType.STRING)
    var status: PaymentStatus = PaymentStatus.PENDING

    @Enumerated(EnumType.STRING)                        // DÜZELTME: String → enum
    var provider: PaymentProvider = PaymentProvider.IYZICO
    var providerPaymentId: String? = null                // iyzico/stripe payment ID
    var providerSubscriptionId: String? = null           // Tekrarlayan ödeme ID

    var failureReason: String? = null
    var paidAt: Instant? = null                          // DÜZELTME: LocalDateTime → Instant

    @CreationTimestamp val createdAt: Instant? = null    // DÜZELTME: LocalDateTime → Instant
}

@Entity
@Table(name = "invoices")
class Invoice : TenantAwareEntity() {                   // DÜZELTME: TenantAwareEntity extend
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    var payment: Payment? = null

    var invoiceNumber: String = ""            // "INV-2026-0001"
    @Column(precision = 10, scale = 2)
    var amount: BigDecimal = BigDecimal.ZERO
    var currency: String = "TRY"
    @Column(precision = 10, scale = 2)
    var taxAmount: BigDecimal = BigDecimal.ZERO
    var taxRate: Int = 20                     // %20 KDV

    var billingName: String = ""
    var billingAddress: String = ""
    var taxId: String? = null                 // Vergi numarası

    @CreationTimestamp val createdAt: Instant? = null    // DÜZELTME: LocalDateTime → Instant
}

enum class SubscriptionStatus { ACTIVE, PAST_DUE, CANCELLED, EXPIRED }
enum class PaymentStatus { PENDING, COMPLETED, FAILED, REFUNDED }
enum class PaymentProvider { IYZICO, STRIPE }            // DÜZELTME: String yerine enum
```

### 17.2 Plan Limitleri Kontrolü

```kotlin
@Service
class PlanLimitService(
    private val subscriptionRepository: SubscriptionRepository,
    private val userRepository: UserRepository,
    private val appointmentRepository: AppointmentRepository,
    private val siteSettingsRepository: SiteSettingsRepository   // DÜZELTME: Tenant timezone için
) {
    fun checkCanAddStaff(tenantId: String) {
        val subscription = getActiveSubscription(tenantId)
        val currentStaffCount = userRepository.countByTenantIdAndRole(tenantId, Role.STAFF)
        if (currentStaffCount >= subscription.maxStaff) {
            throw PlanLimitExceededException(
                "Mevcut planınız (${subscription.plan}) en fazla ${subscription.maxStaff} personele izin veriyor. " +
                "Planınızı yükseltin."
            )
        }
    }

    fun checkCanCreateAppointment(tenantId: String) {
        val subscription = getActiveSubscription(tenantId)

        // DÜZELTME: Tenant timezone ile ayın başını hesapla
        val settings = siteSettingsRepository.findByTenantId(tenantId)
        val tenantZone = ZoneId.of(settings?.timezone ?: "Europe/Istanbul")
        val monthStart = ZonedDateTime.now(tenantZone)
            .withDayOfMonth(1)
            .toLocalDate()
            .atStartOfDay()                                      // 00:00:00 (saat sıfırla)

        val monthlyCount = appointmentRepository.countByTenantIdAndCreatedAtAfter(
            tenantId, monthStart
        )
        if (monthlyCount >= subscription.maxAppointmentsPerMonth) {
            throw PlanLimitExceededException(
                "Bu ay ${subscription.maxAppointmentsPerMonth} randevu limitine ulaştınız. " +
                "Planınızı yükseltin."
            )
        }
    }

    private fun getActiveSubscription(tenantId: String): Subscription {
        return subscriptionRepository.findByTenantIdAndStatus(tenantId, SubscriptionStatus.ACTIVE)
            ?: throw PlanLimitExceededException("Aktif abonelik bulunamadı. Lütfen bir plan satın alın.")
    }
}
```

### 17.3 iyzico Entegrasyonu (Türkiye)

```kotlin
// API Endpoint'leri:
// POST /api/admin/billing/subscribe         → Plan seçimi + ödeme başlatma
// POST /api/webhooks/iyzico                 → iyzico callback (auth YOK — dış servis erişir)
//                                              DÜZELTME: /api/admin/ altından çıkarıldı
// GET  /api/admin/billing/invoices          → Fatura listesi
// GET  /api/admin/billing/current-plan      → Mevcut plan + kullanım istatistikleri
// POST /api/admin/billing/cancel            → Abonelik iptali
// POST /api/admin/billing/upgrade           → Plan yükseltme

// Not: iyzico dependency zaten build.gradle.kts'te mevcut (Bölüm 9.2)
// implementation("com.iyzipay:iyzipay-java:2.0.131")
```

---

## 18. Bildirim Altyapısı

### 18.1 Bildirim Servisi Mimarisi

```
                         ┌─────────────────┐
                         │ NotificationSvc  │
                         │  (async)         │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌────────────┐
              │  E-posta  │ │   SMS    │ │   Push     │
              │ SendGrid  │ │ Netgsm   │ │ (gelecek)  │
              └──────────┘ └──────────┘ └────────────┘
```

### 18.2 Bildirim Entity + Template

```kotlin
@Entity
@Table(
    name = "notification_templates",
    uniqueConstraints = [                                // DÜZELTME: Tenant+type unique
        UniqueConstraint(columnNames = ["tenant_id", "type"])
    ]
)
class NotificationTemplate : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    @Enumerated(EnumType.STRING)
    var type: NotificationType = NotificationType.APPOINTMENT_CONFIRMATION

    var emailSubject: String? = null          // "Randevunuz onaylandı — {{serviceName}}"
    @Column(columnDefinition = "TEXT")
    var emailBody: String? = null             // HTML template (Mustache syntax)
    @Column(length = 320)                     // DÜZELTME: SMS uzunluk sınırı (multi-part: 2×160)
    var smsBody: String? = null

    var isEmailEnabled: Boolean = true
    var isSmsEnabled: Boolean = false          // SMS ek maliyet, opsiyonel
}

@Entity
@Table(name = "notification_logs")
class NotificationLog : TenantAwareEntity() {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null

    var appointmentId: String? = null          // DÜZELTME: Hangi randevuya ait olduğu
    var recipientEmail: String? = null
    var recipientPhone: String? = null

    @Enumerated(EnumType.STRING)
    var channel: NotificationChannel = NotificationChannel.EMAIL

    @Enumerated(EnumType.STRING)
    var type: NotificationType = NotificationType.APPOINTMENT_CONFIRMATION

    @Enumerated(EnumType.STRING)
    var status: DeliveryStatus = DeliveryStatus.PENDING

    var errorMessage: String? = null
    var retryCount: Int = 0
    var sentAt: Instant? = null                // DÜZELTME: LocalDateTime → Instant (UTC)
    @CreationTimestamp val createdAt: Instant? = null   // DÜZELTME: LocalDateTime → Instant
}

enum class NotificationType {
    APPOINTMENT_CONFIRMATION,         // Randevu onaylandı
    APPOINTMENT_REMINDER_24H,         // 24 saat kala hatırlatma
    APPOINTMENT_REMINDER_1H,          // 1 saat kala hatırlatma
    APPOINTMENT_CANCELLED,            // Randevu iptal edildi
    APPOINTMENT_RESCHEDULED,          // Randevu zamanı değişti
    WELCOME,                          // Yeni kayıt hoşgeldin
    PASSWORD_RESET,                   // Şifre sıfırlama
    REVIEW_REQUEST                    // Randevu sonrası değerlendirme isteği
}
enum class NotificationChannel { EMAIL, SMS }
enum class DeliveryStatus { PENDING, SENT, FAILED, BOUNCED }
```

### 18.3 Randevu Hatırlatıcı Job

```kotlin
@Component
class AppointmentReminderJob(
    private val tenantAwareScheduler: TenantAwareScheduler,
    private val appointmentRepository: AppointmentRepository,
    private val notificationService: NotificationService,
    private val siteSettingsRepository: SiteSettingsRepository    // DÜZELTME: Tenant timezone
) {
    companion object {
        private val logger = LoggerFactory.getLogger(AppointmentReminderJob::class.java)
    }

    // Her 5 dakikada çalışır
    @Scheduled(fixedRate = 300_000)
    fun send24HourReminders() {
        tenantAwareScheduler.executeForAllTenants { tenant ->
            // DÜZELTME: Tenant timezone ile "24 saat sonra" hesapla
            val settings = siteSettingsRepository.findByTenantId(tenant.id!!)
            val tenantZone = ZoneId.of(settings?.timezone ?: "Europe/Istanbul")
            val tomorrow = ZonedDateTime.now(tenantZone).plusHours(24)

            // DÜZELTME: Repository'de reminder24hSent=false filtresi
            val appointments = appointmentRepository
                .findUpcomingNotReminded(tomorrow.toLocalDate(), tomorrow.toLocalTime(), reminder24hSent = false)

            val updated = mutableListOf<Appointment>()
            appointments.forEach { appointment ->
                try {                                            // DÜZELTME: Per-appointment error handling
                    notificationService.sendReminder(appointment, NotificationType.APPOINTMENT_REMINDER_24H)
                    appointment.reminder24hSent = true
                    updated.add(appointment)
                } catch (e: Exception) {
                    logger.error("24h hatırlatma gönderilemedi — appointment={}", appointment.id, e)
                }
            }
            if (updated.isNotEmpty()) {
                appointmentRepository.saveAll(updated)           // DÜZELTME: Batch save
            }
        }
    }

    @Scheduled(fixedRate = 300_000)
    fun send1HourReminders() {
        tenantAwareScheduler.executeForAllTenants { tenant ->
            val settings = siteSettingsRepository.findByTenantId(tenant.id!!)
            val tenantZone = ZoneId.of(settings?.timezone ?: "Europe/Istanbul")
            val oneHourLater = ZonedDateTime.now(tenantZone).plusHours(1)

            // DÜZELTME: Repository'de iki flag birden filtrele (24h gönderilmiş, 1h gönderilmemiş)
            val appointments = appointmentRepository
                .findUpcomingNotReminded(oneHourLater.toLocalDate(), oneHourLater.toLocalTime(),
                    reminder24hSent = true, reminder1hSent = false)

            val updated = mutableListOf<Appointment>()
            appointments.forEach { appointment ->
                try {
                    notificationService.sendReminder(appointment, NotificationType.APPOINTMENT_REMINDER_1H)
                    appointment.reminder1hSent = true
                    updated.add(appointment)
                } catch (e: Exception) {
                    logger.error("1h hatırlatma gönderilemedi — appointment={}", appointment.id, e)
                }
            }
            if (updated.isNotEmpty()) {
                appointmentRepository.saveAll(updated)
            }
        }
    }
}
```

### 18.4 Bildirim Provider Konfigürasyonu

> **build.gradle.kts dependency'leri:**
> - E-posta: `implementation("com.sendgrid:sendgrid-java:4.10.2")`
> - SMS (Netgsm): REST API kullanır, ek dependency gerekmez (`RestTemplate`/`WebClient` ile)

```yaml
# application.yml
notification:
  email:
    provider: sendgrid
    api-key: ${SENDGRID_API_KEY:}
    from-email: ${NOTIFICATION_FROM_EMAIL:no-reply@app.com}
  sms:
    provider: netgsm
    usercode: ${NETGSM_USERCODE:}
    password: ${NETGSM_PASSWORD:}
    msgheader: ${NETGSM_HEADER:APPMESAJ}
```

---

## 19. Background Job Framework

### 19.1 Job Altyapısı

```kotlin
// AsyncConfig.kt (Bölüm 2.4'te tanımlandı) + @Scheduled kullanımı

// Zamanlanmış görevler:
@Component
class ScheduledJobs(
    private val tenantAwareScheduler: TenantAwareScheduler,
    private val subscriptionService: SubscriptionService,
    private val appointmentRepository: AppointmentRepository,
    private val contactMessageRepository: ContactMessageRepository,  // DÜZELTME: Eksik dependency
    private val notificationService: NotificationService,
    private val siteSettingsRepository: SiteSettingsRepository       // DÜZELTME: Tenant timezone
) {
    companion object {
        private val logger = LoggerFactory.getLogger(ScheduledJobs::class.java)
    }

    // Trial süresi dolan tenant'ları pasifleştir
    @Scheduled(cron = "0 0 2 * * ?")  // Her gece 02:00
    fun checkExpiredTrials() {
        tenantAwareScheduler.executeForAllTenants { tenant ->
            subscriptionService.checkAndExpireTrial(tenant.id!!)
        }
    }

    // 30 günden eski okunmuş mesajları temizle
    @Scheduled(cron = "0 0 3 * * ?")  // Her gece 03:00
    fun cleanupOldMessages() {
        tenantAwareScheduler.executeForAllTenants { tenant ->
            // DÜZELTME: Tenant timezone ile 30 gün öncesini hesapla
            val settings = siteSettingsRepository.findByTenantId(tenant.id!!)
            val tenantZone = ZoneId.of(settings?.timezone ?: "Europe/Istanbul")
            val cutoff = ZonedDateTime.now(tenantZone).minusDays(30).toLocalDateTime()
            // Sadece okunmuş mesajları sil
            contactMessageRepository.deleteByIsReadTrueAndCreatedAtBefore(cutoff)
        }
    }

    // Randevu sonrası değerlendirme isteği gönder (24 saat sonra)
    @Scheduled(fixedRate = 3_600_000)  // Her saat
    fun sendReviewRequests() {
        tenantAwareScheduler.executeForAllTenants { tenant ->
            // DÜZELTME: Tenant timezone ile "24 saat önce" hesapla
            val settings = siteSettingsRepository.findByTenantId(tenant.id!!)
            val tenantZone = ZoneId.of(settings?.timezone ?: "Europe/Istanbul")
            val yesterday = ZonedDateTime.now(tenantZone).minusHours(24).toLocalDateTime()

            val completedAppointments = appointmentRepository
                .findCompletedWithoutReview(yesterday)

            completedAppointments.forEach { appointment ->
                try {                                              // DÜZELTME: Per-appointment error handling
                    notificationService.sendReviewRequest(appointment)
                } catch (e: Exception) {
                    logger.error("Değerlendirme isteği gönderilemedi — appointment={}", appointment.id, e)
                }
            }
        }
    }
}
```

### 19.2 Retry Mekanizması

```kotlin
// Bildirim gönderimi başarısız olursa 3 kez dene
@Async("taskExecutor")
@Retryable(
    value = [NotificationDeliveryException::class],
    maxAttempts = 3,
    backoff = Backoff(delay = 5000, multiplier = 2.0)  // 5s, 10s, 20s
)
fun sendEmail(to: String, subject: String, body: String) {
    // SendGrid API çağrısı
}

@Recover
fun recoverSendEmail(e: NotificationDeliveryException, to: String, subject: String, body: String) {
    logger.error("E-posta gönderilemedi (3 deneme sonrası): {} — {}", to, e.message)
    // NotificationLog'a FAILED olarak kaydet
}

// Not: spring-retry + spring-boot-starter-aop zaten build.gradle.kts'te mevcut (Bölüm 9.2)
// @EnableRetry annotation'ı bir @Configuration sınıfında aktifleştirilmeli
```

---

## 20. KVKK / GDPR Uyumluluk

Türkiye'de KVKK (Kişisel Verilerin Korunması Kanunu), AB'de GDPR kapsamında:

### 20.1 Veri Dışa Aktarma (Hakkı: Taşınabilirlik)

```kotlin
// API: GET /api/auth/my-data → Kullanıcının tüm verisini JSON olarak indir
@GetMapping("/my-data")
@PreAuthorize("isAuthenticated()")
fun exportMyData(): ResponseEntity<ByteArray> {
    val userId = SecurityContextHolder.getContext().authentication.name
    val data = gdprService.exportUserData(userId)
    return ResponseEntity.ok()
        .header("Content-Disposition", "attachment; filename=my-data.json")
        .contentType(MediaType.APPLICATION_JSON)
        .body(data)
}
```

### 20.2 Veri Silme (Hakkı: Unutulma)

```kotlin
// API: DELETE /api/auth/my-account → Hesap ve ilişkili verileri sil
@DeleteMapping("/my-account")
@PreAuthorize("isAuthenticated()")
fun deleteMyAccount(): ApiResponse<Nothing> {
    val userId = SecurityContextHolder.getContext().authentication.name
    gdprService.deleteUserAndRelatedData(userId)
    return ApiResponse(message = "Hesabınız ve ilişkili verileriniz silindi")
}

// Silme işlemi:
// 1. Kişisel bilgileri anonimleştir (appointments, reviews'daki isim/email → "Anonim")
// 2. ContactMessage'ları sil
// 3. RefreshToken'ları sil
// 4. User kaydını sil (veya anonimleştir)
// NOT: Fatura bilgileri yasal zorunluluk nedeniyle 10 yıl saklanır
```

### 20.3 Rıza Yönetimi

```kotlin
@Entity
@Table(name = "consent_records")
class ConsentRecord : TenantAwareEntity() {             // DÜZELTME: TenantAwareEntity extend
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    val id: String? = null
    val userId: String = ""
    // tenantId → TenantAwareEntity'den miras alınır

    @Enumerated(EnumType.STRING)
    var consentType: ConsentType = ConsentType.TERMS_OF_SERVICE

    var isGranted: Boolean = false
    var grantedAt: Instant? = null                       // DÜZELTME: LocalDateTime → Instant (UTC)
    var revokedAt: Instant? = null                       // DÜZELTME: LocalDateTime → Instant
    var ipAddress: String? = null
}

enum class ConsentType {
    TERMS_OF_SERVICE,          // Kullanım koşulları
    PRIVACY_POLICY,            // Gizlilik politikası
    MARKETING_EMAIL,           // Pazarlama e-postaları
    MARKETING_SMS,             // Pazarlama SMS'leri
    DATA_PROCESSING            // Veri işleme onayı
}
```

---

## 21. API Versiyonlama

```
/api/v1/public/services          ← Mevcut versiyon
/api/v2/public/services          ← Gelecek breaking change

// Controller'da:
@RestController
@RequestMapping("/api/v1/public/services")
class ServiceControllerV1 { ... }

@RestController
@RequestMapping("/api/v2/public/services")
class ServiceControllerV2 { ... }

// Deprecation header:
// HTTP Response → Sunset: Sat, 01 Jan 2027 00:00:00 GMT
// HTTP Response → Deprecation: true
// HTTP Response → Link: </api/v2/public/services>; rel="successor-version"
```

---

## 22. Reporting & Analytics

### 22.1 Dashboard İstatistik Endpoint'leri

```
GET /api/admin/dashboard/stats
Response:
{
  "today": {
    "appointments": 12,
    "completedAppointments": 8,
    "revenue": 4500.00,
    "newClients": 3
  },
  "thisWeek": {
    "appointments": 68,
    "revenue": 24000.00,
    "cancellationRate": 0.08,
    "noShowRate": 0.03
  },
  "thisMonth": {
    "appointments": 240,
    "revenue": 86000.00,
    "topServices": [
      {"name": "Botoks", "count": 45, "revenue": 22500.00},
      {"name": "Dolgu", "count": 32, "revenue": 19200.00}
    ],
    "staffPerformance": [
      {"name": "Dr. Ayşe", "appointments": 80, "revenue": 32000.00, "avgRating": 4.8},
      {"name": "Dr. Mehmet", "appointments": 65, "revenue": 26000.00, "avgRating": 4.6}
    ]
  }
}

GET /api/admin/reports/revenue?from=2026-01-01&to=2026-02-01&groupBy=daily
GET /api/admin/reports/appointments?from=2026-01-01&to=2026-02-01&staffId=xxx
GET /api/admin/reports/clients?from=2026-01-01&to=2026-02-01
GET /api/admin/reports/export?format=xlsx&type=revenue&from=2026-01-01&to=2026-02-01
```

---

## 23. CI/CD Pipeline

### 23.1 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: aesthetic_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
          --character-set-server=utf8mb4
          --collation-server=utf8mb4_turkish_ci

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Cache Gradle packages                    # DÜZELTME: Gradle cache
        uses: actions/cache@v4
        with:
          path: ~/.gradle/caches
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle.kts') }}
          restore-keys: ${{ runner.os }}-gradle-

      - name: Build & Test
        run: ./gradlew build                           # Flyway otomatik çalışır (spring.flyway.enabled=true)
        env:
          DB_HOST: localhost
          DB_PORT: 3306
          DB_NAME: aesthetic_test
          DB_USERNAME: root
          DB_PASSWORD: test
          JWT_SECRET: test-secret-key-for-ci-pipeline-min-256-bits-long-enough

  docker:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker Image
        run: docker build -t aesthetic-backend:${{ github.sha }} .
      - name: Push to Registry
        run: |
          docker tag aesthetic-backend:${{ github.sha }} registry.app.com/aesthetic-backend:latest
          docker push registry.app.com/aesthetic-backend:latest
```

---

## 24. Deployment & Altyapı

### 24.1 Prodüksiyon Docker Compose

```yaml
# Docker Compose V2 — 'version' alanı deprecated (Bölüm 10 ile tutarlı)
services:
  app:
    image: registry.app.com/aesthetic-backend:latest
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=aesthetic_saas
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - FILE_PROVIDER=s3
      - S3_BUCKET=${S3_BUCKET}
      - S3_REGION=${S3_REGION}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - NETGSM_USERCODE=${NETGSM_USERCODE}
      - NETGSM_PASSWORD=${NETGSM_PASSWORD}
      - IYZICO_API_KEY=${IYZICO_API_KEY}
      - IYZICO_SECRET_KEY=${IYZICO_SECRET_KEY}
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - app
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=aesthetic_saas
    volumes:
      - mysql-data:/var/lib/mysql
      - ./mysql/my.cnf:/etc/mysql/conf.d/custom.cnf
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]  # DÜZELTME: Şifreli Redis
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  mysql-data:
  redis-data:
```

### 24.2 Nginx Konfigürasyonu (Wildcard Subdomain + TLS)

```nginx
# Tüm *.app.com subdomain'lerini Spring Boot'a yönlendir
server {
    listen 443 ssl;
    server_name *.app.com;

    ssl_certificate /etc/letsencrypt/live/app.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.com/privkey.pem;

    # HSTS (güvenlik)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://app:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 24.3 MySQL Prodüksiyon Ayarları

```ini
# mysql/my.cnf
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 1
innodb_lock_wait_timeout = 10          # Pessimistic lock timeout (saniye)
max_connections = 200
character-set-server = utf8mb4
collation-server = utf8mb4_turkish_ci   # DÜZELTME: Bölüm 8 ile tutarlı (Türkçe İ/ı/Ş/ş sıralaması)
```

### 24.4 Veritabanı Yedekleme

```bash
# Otomatik günlük yedekleme (cron: her gece 04:00)
# 0 4 * * * /opt/scripts/backup.sh

#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/backups/mysql

mysqldump -h localhost -u root -p${DB_PASSWORD} \
    --single-transaction \
    --routines \
    --triggers \
    aesthetic_saas | gzip > ${BACKUP_DIR}/aesthetic_saas_${TIMESTAMP}.sql.gz

# 30 günden eski yedekleri sil
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete

# S3'e yükle (off-site backup)
aws s3 cp ${BACKUP_DIR}/aesthetic_saas_${TIMESTAMP}.sql.gz \
    s3://${S3_BUCKET}/backups/mysql/

echo "Backup completed: aesthetic_saas_${TIMESTAMP}.sql.gz"
```

### 24.5 Application Prodüksiyon Konfigürasyonu

```yaml
# application-prod.yml
spring:
  datasource:
    hikari:
      maximum-pool-size: 50          # Prodüksiyon: daha büyük pool
      minimum-idle: 10
      idle-timeout: 600000
      max-lifetime: 1800000
      connection-timeout: 30000

  jpa:
    properties:
      hibernate:
        format_sql: false            # Prodüksiyonda log azalt
        generate_statistics: false

server:
  port: 8080
  shutdown: graceful                 # Graceful shutdown — in-flight request'ler tamamlanır
  tomcat:
    connection-timeout: 5000
    max-connections: 8192
    threads:
      max: 200
      min-spare: 20

  # DÜZELTME: Ayrı spring: bloğu kaldırıldı — yukarıdaki spring: altına taşındı
  lifecycle:
    timeout-per-shutdown-phase: 30s  # Shutdown'da max 30s bekle

logging:
  level:
    root: WARN
    com.aesthetic.backend: INFO
    org.hibernate.SQL: WARN
```

---

## 25. Monitoring & Observability (Genişletilmiş)

### 25.1 Custom Health Indicators

```kotlin
@Component
class TenantResolutionHealthIndicator(
    private val tenantRepository: TenantRepository
) : HealthIndicator {
    override fun health(): Health {
        return try {
            val count = tenantRepository.countByIsActiveTrue()
            Health.up()
                .withDetail("activeTenants", count)
                .build()
        } catch (e: Exception) {
            Health.down(e).build()
        }
    }
}

@Component
class NotificationServiceHealthIndicator(
    private val sendGridClient: SendGridClient
) : HealthIndicator {
    override fun health(): Health {
        return try {
            sendGridClient.ping()
            Health.up().build()
        } catch (e: Exception) {
            Health.down()
                .withDetail("error", "E-posta servisi erişilemez: ${e.message}")
                .build()
        }
    }
}
```

### 25.2 Request Correlation ID

```kotlin
// CorrelationIdFilter.kt — Her isteğe benzersiz ID ata (distributed tracing)
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
class CorrelationIdFilter : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val correlationId = request.getHeader("X-Correlation-ID")
            ?: UUID.randomUUID().toString()

        MDC.put("correlationId", correlationId)
        MDC.put("tenantId", TenantContext.getTenantIdOrNull() ?: "system")
        response.setHeader("X-Correlation-ID", correlationId)

        try {
            filterChain.doFilter(request, response)
        } finally {
            // DÜZELTME: MDC.clear() tüm key'leri siler (TenantFilter'ınkileri de!)
            // Sadece bu filter'ın eklediği key'leri temizle
            MDC.remove("correlationId")
            // tenantId → TenantFilter tarafından yönetilir, burada silme
        }
    }
}

// Logback pattern'ında correlationId + tenantId otomatik görünür:
// %d{ISO8601} [%X{correlationId}] [tenant=%X{tenantId}] %-5level %logger - %msg%n
```

### 25.3 Error Tracking (Sentry)

```kotlin
// Not: Sentry dependency zaten build.gradle.kts'te mevcut (Bölüm 9.2)
// implementation("io.sentry:sentry-spring-boot-starter-jakarta:7.14.0")

// application.yml:
// sentry:
//   dsn: ${SENTRY_DSN:}
//   traces-sample-rate: 0.1
//   environment: ${SPRING_PROFILES_ACTIVE:dev}
```

---

## 26. Ortam Değişkenleri (Güncellenmiş)

```env
# ─── Veritabanı ───
DB_HOST=localhost
DB_PORT=3306
DB_NAME=aesthetic_saas
DB_USERNAME=root
DB_PASSWORD=secret

# ─── JWT ───
JWT_SECRET=min-256-bit-secret-key-for-production-use

# ─── Server ───
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=dev           # dev | staging | prod
JAVA_OPTS=-Xmx512m -Xms256m         # JVM memory (Bölüm 10 docker-compose'da kullanılır)

# ─── Redis ───
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis-secret

# ─── Dosya Yükleme ───
FILE_PROVIDER=local                  # local | s3 | minio
S3_BUCKET=aesthetic-saas
S3_REGION=eu-central-1
S3_ACCESS_KEY=
S3_SECRET_KEY=

# ─── E-posta (SendGrid) ───
SENDGRID_API_KEY=
NOTIFICATION_FROM_EMAIL=no-reply@app.com

# ─── SMS (Netgsm — Türkiye) ───
NETGSM_USERCODE=
NETGSM_PASSWORD=
NETGSM_HEADER=APPMESAJ

# ─── Ödeme (iyzico — Türkiye) ───
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com    # Prod: https://api.iyzipay.com

# ─── Error Tracking ───
SENTRY_DSN=

# ─── Frontend URL (CORS) ───
FRONTEND_URL=http://localhost:3000
```

---

## 27. Güncellenmiş Uygulama Yol Haritası

```
Faz B1: Proje İskeleti (1 hafta)
├── Spring Boot + Kotlin projesi oluştur
├── Gradle + tüm bağımlılıklar
├── application.yml (dev/staging/prod)
├── Docker Compose (MySQL + Redis)
├── Flyway migration'lar (tüm tablolar)
├── Temel entity'ler (TenantAwareEntity base class)
└── Repository katmanı

Faz B2: Multi-Tenant Altyapı (1 hafta)
├── TenantContext + TenantFilter (subdomain çözümleme)
├── TenantEntityListener (INSERT/UPDATE/DELETE koruması)  # Bölüm 2.3'te yeniden adlandırıldı
├── TenantAspect (SELECT koruması — Hibernate Filter)
├── TenantAwareTaskDecorator (async propagation)
├── TenantAwareScheduler (scheduled task'lar)
├── TenantAwareCacheKeyGenerator (Caffeine local cache)  # Bölüm 9/13'te düzeltildi
├── Tenant CRUD + Onboarding akışı
└── Tenant izolasyon testleri (cross-tenant saldırı testleri)

Faz B3: Auth & Güvenlik (1-2 hafta)
├── JWT token provider + refresh token rotation
├── Server-side token revocation (RefreshToken entity)
├── Spring Security konfigürasyonu
├── Cross-tenant JWT doğrulama
├── Brute force koruması (hesap kilitleme)
├── Rate limiting (Bucket4j)
├── Güvenli dosya yükleme (tip/boyut doğrulama)
├── CORS wildcard subdomain ayarı
├── Role-based access control (@PreAuthorize)
└── Auth testleri (brute force, cross-tenant, token expiry)

Faz B4: CRUD API'ler (2 hafta)
├── Service CRUD + ServiceCategory
├── Product CRUD (stok takibi dahil)
├── Blog CRUD (yayınla/taslak, yazar ilişkisi)
├── Gallery CRUD (Service ilişkisi düzeltilmiş)
├── Contact mesajları (okundu/yanıtlandı)
├── Site ayarları (timezone, iptal politikası dahil)
├── Review/değerlendirme sistemi
├── Client notes (müşteri notları)
├── Swagger UI dokümantasyonu (tenant-aware)
├── API versiyonlama (/api/v1/)
└── DTO'lar + mapper'lar + validation

Faz B5: Randevu Sistemi (2 hafta)
├── Appointment entity (çoklu hizmet desteği)
├── AppointmentService join entity (fiyat snapshot)
├── WorkingHours + BlockedTimeSlot
├── AvailabilityService (buffer time dahil slot hesaplama)
├── AppointmentService (READ_COMMITTED + PESSIMISTIC_WRITE)
├── Geçmiş tarih/saat validasyonu
├── İptal politikası (configurable saat)
├── Tekrarlayan randevu desteği (recurring)
├── Durum yönetimi (state machine + geçiş kuralları)
├── Dashboard istatistikleri
├── Çift randevu engelleme testleri (concurrency)
└── Waitlist (opsiyonel, v2)

Faz B6: Bildirimler & Background Jobs (1 hafta)
├── NotificationService (async + TenantAwareTaskDecorator)
├── E-posta entegrasyonu (SendGrid)
├── SMS entegrasyonu (Netgsm)
├── Bildirim template'leri (Mustache)
├── Randevu hatırlatıcıları (24h + 1h)
├── Değerlendirme isteği job'ı
├── Trial süre kontrolü job'ı
├── Retry mekanizması (spring-retry)
└── NotificationLog (gönderim takibi)

Faz B7: Ödeme & Abonelik (2 hafta)
├── Subscription entity + plan limitleri
├── Payment + Invoice entity'leri
├── iyzico entegrasyonu (Türkiye)
├── Webhook handler (ödeme sonucu)
├── Plan limit kontrolü (staff, randevu, depolama)
├── Fatura oluşturma (PDF)
├── Plan yükseltme/düşürme
└── Abonelik iptali

Faz B8: Reporting & Analytics (1 hafta)
├── Dashboard stats endpoint'i
├── Gelir raporları (günlük/haftalık/aylık)
├── Randevu istatistikleri
├── Personel performans metrikleri
├── Müşteri retention metrikleri
└── Excel/PDF dışa aktarma

Faz B9: Compliance & DevOps (1 hafta)
├── KVKK/GDPR: veri dışa aktarma + silme
├── Rıza yönetimi (ConsentRecord)
├── Audit log genişletme
├── CI/CD pipeline (GitHub Actions)
├── Nginx + TLS (Let's Encrypt)
├── MySQL prodüksiyon ayarları
├── Veritabanı yedekleme stratejisi
├── Sentry error tracking
├── Correlation ID + structured logging
├── Custom health indicators
├── Graceful shutdown
└── Monitoring (Prometheus + Grafana — opsiyonel)

Faz B10: Frontend Entegrasyonu (1 hafta)
├── Next.js API client güncelleme
├── Subdomain bazlı tenant çözümleme (frontend)
├── JWT auth flow (login/refresh/logout)
├── Admin panel → Spring Boot API geçişi
├── Public sayfa → Spring Boot API geçişi
└── E2E testler
```

**Toplam tahmin: ~13-14 hafta (3.5 ay)**
