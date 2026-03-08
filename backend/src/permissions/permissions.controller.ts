import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsService } from './permissions.service';
import { Role } from '@prisma/client';

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('permissions')
export class PermissionsController {
  constructor(private service: PermissionsService) {}

  // ── Permissions CRUD ──────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all permissions' })
  async listPermissions() {
    return this.service.getAllPermissions();
  }

  @Post()
  @ApiOperation({ summary: 'Create a permission' })
  async createPermission(@Body() body: { name: string; description?: string; category?: string }) {
    return this.service.createPermission(body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a permission' })
  async deletePermission(@Param('id') id: string) {
    return this.service.deletePermission(id);
  }

  // ── Custom Roles CRUD ─────────────────────────────────────────────────────

  @Get('roles')
  @ApiOperation({ summary: 'List all custom roles with permissions' })
  async listRoles() {
    return this.service.getAllCustomRoles();
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a custom role' })
  async createRole(@Body() body: { name: string; description?: string; baseRole: Role; permissionIds?: string[] }) {
    return this.service.createCustomRole(body);
  }

  @Patch('roles/:id/permissions')
  @ApiOperation({ summary: 'Update permissions for a custom role' })
  async updateRolePermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    return this.service.updateRolePermissions(id, body.permissionIds);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete a custom role' })
  async deleteRole(@Param('id') id: string) {
    return this.service.deleteCustomRole(id);
  }

  // ── User-Role assignments ─────────────────────────────────────────────────

  @Post('roles/:roleId/assign/:userId')
  @ApiOperation({ summary: 'Assign a custom role to a user' })
  async assignRole(@Param('roleId') roleId: string, @Param('userId') userId: string) {
    return this.service.assignRoleToUser(userId, roleId);
  }

  @Delete('roles/:roleId/assign/:userId')
  @ApiOperation({ summary: 'Remove a custom role from a user' })
  async removeRole(@Param('roleId') roleId: string, @Param('userId') userId: string) {
    return this.service.removeRoleFromUser(userId, roleId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all permissions for a user' })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.service.getUserPermissions(userId);
  }
}
