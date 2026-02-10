import { PrismaClient } from '@prisma/client';
import { services } from '../lib/data/services';
import { products } from '../lib/data/products';
import { blogPosts } from '../lib/data/blog';
import { galleryItems } from '../lib/data/gallery';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Services
  console.log('Seeding services...');
  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: {
        slug: service.slug,
        title: service.title,
        category: service.category,
        shortDescription: service.shortDescription,
        description: service.description,
        price: service.price,
        duration: service.duration,
        image: service.image,
        benefits: service.benefits,
        process: service.process,
        recovery: service.recovery,
        isActive: true,
        order: parseInt(service.id),
      },
    });
  }
  console.log(`  ${services.length} services seeded`);

  // Seed Products
  console.log('Seeding products...');
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
        price: product.price,
        image: product.image,
        features: product.features,
        isActive: true,
        order: parseInt(product.id),
      },
    });
  }
  console.log(`  ${products.length} products seeded`);

  // Seed Blog Posts
  console.log('Seeding blog posts...');
  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        author: post.author,
        category: post.category,
        image: post.image,
        tags: post.tags,
        readTime: post.readTime,
        isPublished: true,
        publishedAt: new Date(post.date),
      },
    });
  }
  console.log(`  ${blogPosts.length} blog posts seeded`);

  // Seed Gallery Items
  console.log('Seeding gallery items...');
  for (const item of galleryItems) {
    await prisma.galleryItem.create({
      data: {
        category: item.category,
        service: item.service,
        beforeImage: item.beforeImage,
        afterImage: item.afterImage,
        description: item.description,
        isActive: true,
      },
    });
  }
  console.log(`  ${galleryItems.length} gallery items seeded`);

  // Seed Default Site Settings
  console.log('Seeding site settings...');
  await prisma.siteSettings.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      siteName: 'Aesthetic Clinic',
      phone: '+905551234567',
      email: 'info@aestheticclinic.com',
      address: 'Bağdat Caddesi No: 123, Kadıköy, İstanbul',
      whatsapp: '+905551234567',
      workingHours: {
        'Pazartesi - Cuma': '09:00 - 19:00',
        'Cumartesi': '10:00 - 17:00',
        'Pazar': 'Kapalı',
      },
    },
  });
  console.log('  Site settings seeded');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
