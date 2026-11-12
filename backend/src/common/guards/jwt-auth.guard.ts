import { Injectable, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_DURING_MFA_SETUP_KEY } from '../decorators/allow-during-mfa-setup.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const activated = await Promise.resolve(super.canActivate(context) as boolean | Promise<boolean>);
    if (!activated) return false;

    const request = context.switchToHttp().getRequest();
    if (request.user?.mfaSetupOnly) {
      const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_DURING_MFA_SETUP_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!allowed) {
        throw new ForbiddenException(
          'Complete authenticator setup before using the rest of the portal. You can sign out from this session.',
        );
      }
    }
    return true;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
