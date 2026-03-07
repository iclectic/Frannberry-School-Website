import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: string, role: string) {
    if (!query || query.trim().length < 2) return { announcements: [], blogPosts: [], users: [], conversations: [] };

    const q = query.trim();
    const contains = q;

    const [announcements, blogPosts, users, conversations] = await Promise.all([
      this.prisma.announcement.findMany({
        where: {
          OR: [
            { title: { contains, mode: 'insensitive' } },
            { content: { contains, mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true, scope: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      this.prisma.blogPost.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains, mode: 'insensitive' } },
            { content: { contains, mode: 'insensitive' } },
            { excerpt: { contains, mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true, slug: true, excerpt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Only admins and staff can search users
      ['ADMIN', 'STAFF'].includes(role)
        ? this.prisma.user.findMany({
            where: {
              OR: [
                { firstName: { contains, mode: 'insensitive' } },
                { lastName: { contains, mode: 'insensitive' } },
                { email: { contains, mode: 'insensitive' } },
              ],
            },
            select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true },
            take: 10,
          })
        : [],

      this.prisma.conversation.findMany({
        where: {
          OR: [
            { title: { contains, mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    return { announcements, blogPosts, users, conversations };
  }
}
