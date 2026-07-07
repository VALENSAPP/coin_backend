import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            await super.canActivate(context);
        } catch {
            return true;
        }

        return true;
    }

    handleRequest<TUser = any>(
        _err: unknown,
        user: unknown,
        _info: unknown,
        _context: ExecutionContext,
    ): TUser {
        return (user || null) as TUser;
    }
}
