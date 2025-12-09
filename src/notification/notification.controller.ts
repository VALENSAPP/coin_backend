import { Controller, Get, Put, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // protect route with JWT like your post APIs
  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getNotifications(@Req() req: any) {
    const userId = (req.user as any)?.userId || (req.user as any)?.sub;
    if (!userId) throw new BadRequestException('User not authenticated');
    return this.notificationService.getNotifications(userId);
  }

  @Put(':id/read')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async markAsRead(@Param('id') notificationId: string, @Req() req: any) {
    const userId = (req.user as any)?.userId || (req.user as any)?.sub;
    if (!userId) throw new BadRequestException('User not authenticated');

    // optional: verify notification belongs to user before marking read
    const notif = await this.notificationService.getNotificationById(notificationId);
    if (!notif || notif.userId !== userId) {
      throw new BadRequestException('Notification not found or access denied');
    }

    await this.notificationService.markNotificationAsRead(notificationId);
    return { message: 'Notification marked as read' };
  }

  @Get('unread-count')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getUnreadCount(@Req() req: any) {
    const userId = (req.user as any)?.userId || (req.user as any)?.sub;
    if (!userId) throw new BadRequestException('User not authenticated');
    const count = await this.notificationService.getUnreadNotificationCount(userId);
    return { unreadCount: count };
  }
}