import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const parentCanActivate = await super.canActivate(context);
    if (!parentCanActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.profile || user.profile.trim().toLowerCase() !== 'admin') {
      throw new ForbiddenException('Access denied. Administrator privileges required.');
    }

    return true;
  }
}
