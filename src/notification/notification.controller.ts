import { Controller, Get, Put, UseGuards, Req, BadRequestException, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiBody } from '@nestjs/swagger';

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
    const notifications = await this.notificationService.getNotifications(userId);
    const likePostNotifications = await this.notificationService.getLikePostNotifications(userId);
    const missionDonationNotifications = await this.notificationService.getMissionDonationNotifications(userId);
    const payFollowingNotifications = await this.notificationService.getPayFollowingNotifications(userId);
    const combined = [...notifications, ...likePostNotifications, ...missionDonationNotifications, ...payFollowingNotifications].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return { notifications: combined };
  }

  @Put('mark-as-read')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        notificationIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of notification IDs to mark as read',
        },
      },
      required: ['notificationIds'],
    },
  })
  async markAsRead(@Body() body: { notificationIds: string[] }, @Req() req: any) {
    const userId = (req.user as any)?.userId || (req.user as any)?.sub;
    if (!userId) throw new BadRequestException('User not authenticated');

    if (!body.notificationIds || !Array.isArray(body.notificationIds) || body.notificationIds.length === 0) {
      throw new BadRequestException('notificationIds array is required and must not be empty');
    }

    const result = await this.notificationService.markNotificationAsRead(userId, body.notificationIds);
    return { message: 'Notifications marked as read', count: result.total };
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
