import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CmsService } from './cms.service';
import { Role } from '@prisma/client';

@ApiTags('CMS')
@Controller('cms')
export class CmsController {
  constructor(private cmsService: CmsService) {}

  // ── Public Blog Endpoints ───────────────────────────────────────────────────

  @Public()
  @Get('blog')
  @ApiOperation({ summary: 'Get published blog posts (public)' })
  async getPublishedPosts(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.cmsService.getPublishedPosts(page, limit);
  }

  @Public()
  @Get('blog/:slug')
  @ApiOperation({ summary: 'Get a blog post by slug (public)' })
  async getPostBySlug(@Param('slug') slug: string) {
    return this.cmsService.getPostBySlug(slug);
  }

  // ── Admin Blog Endpoints ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('blog/admin/all')
  @ApiOperation({ summary: 'Get all blog posts (admin)' })
  async getAllPosts(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.cmsService.getAllPosts(page, limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Post('blog')
  @ApiOperation({ summary: 'Create a blog post (admin)' })
  async createPost(
    @CurrentUser('id') userId: string,
    @Body() body: { title: string; slug: string; excerpt?: string; content: string; coverImage?: string },
  ) {
    return this.cmsService.createBlogPost(userId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Patch('blog/:id')
  @ApiOperation({ summary: 'Update a blog post (admin)' })
  async updatePost(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; slug?: string; excerpt?: string; content?: string; coverImage?: string; isPublished?: boolean },
  ) {
    return this.cmsService.updateBlogPost(userId, id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Delete('blog/:id')
  @ApiOperation({ summary: 'Delete a blog post (admin)' })
  async deletePost(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.cmsService.deleteBlogPost(userId, id);
  }

  // ── Public Gallery Endpoints ────────────────────────────────────────────────

  @Public()
  @Get('gallery')
  @ApiOperation({ summary: 'Get published gallery images (public)' })
  async getPublishedGallery(@Query('category') category?: string) {
    return this.cmsService.getPublishedGalleryImages(category);
  }

  // ── Admin Gallery Endpoints ─────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('gallery/admin/all')
  @ApiOperation({ summary: 'Get all gallery images (admin)' })
  async getAllGallery() {
    return this.cmsService.getAllGalleryImages();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Post('gallery')
  @ApiOperation({ summary: 'Create a gallery image (admin)' })
  async createGalleryImage(
    @CurrentUser('id') userId: string,
    @Body() body: { title: string; description?: string; imageUrl: string; category?: string; sortOrder?: number },
  ) {
    return this.cmsService.createGalleryImage(userId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Patch('gallery/:id')
  @ApiOperation({ summary: 'Update a gallery image (admin)' })
  async updateGalleryImage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; category?: string; sortOrder?: number; isPublished?: boolean },
  ) {
    return this.cmsService.updateGalleryImage(userId, id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Delete('gallery/:id')
  @ApiOperation({ summary: 'Delete a gallery image (admin)' })
  async deleteGalleryImage(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.cmsService.deleteGalleryImage(userId, id);
  }
}
