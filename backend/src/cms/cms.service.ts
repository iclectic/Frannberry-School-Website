import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CmsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Blog Posts ──────────────────────────────────────────────────────────────

  async createBlogPost(userId: string, data: { title: string; slug: string; excerpt?: string; content: string; coverImage?: string }) {
    const post = await this.prisma.blogPost.create({
      data: { ...data, authorId: userId },
    });

    await this.audit.log({ userId, action: 'CREATE', entity: 'BlogPost', entityId: post.id });
    return post;
  }

  async updateBlogPost(userId: string, id: string, data: { title?: string; slug?: string; excerpt?: string; content?: string; coverImage?: string; isPublished?: boolean }) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Blog post not found');

    const publishedAt = data.isPublished && !existing.isPublished ? new Date() : undefined;

    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: { ...data, ...(publishedAt && { publishedAt }) },
    });

    await this.audit.log({ userId, action: 'UPDATE', entity: 'BlogPost', entityId: id });
    return updated;
  }

  async getPublishedPosts(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where: { isPublished: true },
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({ where: { isPublished: true } }),
    ]);
    return { posts, total, page, limit };
  }

  async getPostBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async getAllPosts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count(),
    ]);
    return { posts, total, page, limit };
  }

  async deleteBlogPost(userId: string, id: string) {
    await this.prisma.blogPost.delete({ where: { id } });
    await this.audit.log({ userId, action: 'DELETE', entity: 'BlogPost', entityId: id });
    return { message: 'Blog post deleted' };
  }

  // ── Gallery ─────────────────────────────────────────────────────────────────

  async createGalleryImage(userId: string, data: { title: string; description?: string; imageUrl: string; category?: string; sortOrder?: number }) {
    const image = await this.prisma.galleryImage.create({ data });
    await this.audit.log({ userId, action: 'CREATE', entity: 'GalleryImage', entityId: image.id });
    return image;
  }

  async getPublishedGalleryImages(category?: string) {
    const where: any = { isPublished: true };
    if (category) where.category = category;

    return this.prisma.galleryImage.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getAllGalleryImages() {
    return this.prisma.galleryImage.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async updateGalleryImage(userId: string, id: string, data: { title?: string; description?: string; category?: string; sortOrder?: number; isPublished?: boolean }) {
    const updated = await this.prisma.galleryImage.update({ where: { id }, data });
    await this.audit.log({ userId, action: 'UPDATE', entity: 'GalleryImage', entityId: id });
    return updated;
  }

  async deleteGalleryImage(userId: string, id: string) {
    await this.prisma.galleryImage.delete({ where: { id } });
    await this.audit.log({ userId, action: 'DELETE', entity: 'GalleryImage', entityId: id });
    return { message: 'Gallery image deleted' };
  }
}
