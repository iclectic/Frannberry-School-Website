import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  // ── Permissions ───────────────────────────────────────────────────────────

  async getAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }

  async createPermission(data: { name: string; description?: string; category?: string }) {
    const existing = await this.prisma.permission.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictException('Permission already exists');
    return this.prisma.permission.create({ data });
  }

  async deletePermission(id: string) {
    const perm = await this.prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new NotFoundException('Permission not found');
    await this.prisma.permission.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Custom Roles ──────────────────────────────────────────────────────────

  async getAllCustomRoles() {
    return this.prisma.customRole.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userCustomRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCustomRole(data: { name: string; description?: string; baseRole: Role; permissionIds?: string[] }) {
    const existing = await this.prisma.customRole.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictException('Custom role already exists');

    const role = await this.prisma.customRole.create({
      data: {
        name: data.name,
        description: data.description,
        baseRole: data.baseRole,
        rolePermissions: data.permissionIds?.length
          ? { create: data.permissionIds.map((pid) => ({ permissionId: pid })) }
          : undefined,
      },
      include: { rolePermissions: { include: { permission: true } } },
    });

    return role;
  }

  async updateRolePermissions(customRoleId: string, permissionIds: string[]) {
    const role = await this.prisma.customRole.findUnique({ where: { id: customRoleId } });
    if (!role) throw new NotFoundException('Custom role not found');

    // Remove all existing, then add new
    await this.prisma.rolePermission.deleteMany({ where: { customRoleId } });
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((pid) => ({ customRoleId, permissionId: pid })),
      });
    }

    return this.prisma.customRole.findUnique({
      where: { id: customRoleId },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async deleteCustomRole(id: string) {
    const role = await this.prisma.customRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Custom role not found');
    await this.prisma.customRole.delete({ where: { id } });
    return { deleted: true };
  }

  // ── User-Role assignments ─────────────────────────────────────────────────

  async assignRoleToUser(userId: string, customRoleId: string) {
    return this.prisma.userCustomRole.upsert({
      where: { userId_customRoleId: { userId, customRoleId } },
      create: { userId, customRoleId },
      update: {},
    });
  }

  async removeRoleFromUser(userId: string, customRoleId: string) {
    await this.prisma.userCustomRole.deleteMany({ where: { userId, customRoleId } });
    return { removed: true };
  }

  async getUserPermissions(userId: string) {
    const assignments = await this.prisma.userCustomRole.findMany({
      where: { userId },
      include: {
        customRole: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    const permissions = new Set<string>();
    for (const a of assignments) {
      for (const rp of a.customRole.rolePermissions) {
        permissions.add(rp.permission.name);
      }
    }

    return Array.from(permissions);
  }
}
