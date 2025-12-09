import { Controller, Get, Put, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Request() req: any) {
    const userId = req.user.userId;
    return this.notificationService.getNotifications(userId);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') notificationId: string) {
    await this.notificationService.markNotificationAsRead(notificationId);
    return { message: 'Notification marked as read' };
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.userId;
    const count = await this.notificationService.getUnreadNotificationCount(userId);
    return { unreadCount: count };
  }
}