import { Controller, Get, Put, UseGuards, Req, BadRequestException, Body, Query, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  // protect route with JWT like your post APIs
  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'isRead', required: false, type: 'string', enum: ['true', 'false'] })
  async getNotifications(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('isRead') isRead?: string,
  ) {
    const userId = (req.user as any)?.userId || (req.user as any)?.sub;
    if (!userId) throw new BadRequestException('User not authenticated');

    const parsedLimit = limit ? Number(limit) : undefined;
    const parsedPage = page ? Number(page) : undefined;
    const parsedIsRead =
      isRead === undefined
        ? undefined
        : isRead === 'true'
          ? true
          : isRead === 'false'
            ? false
            : undefined;

    if (isRead !== undefined && parsedIsRead === undefined) {
      throw new BadRequestException('isRead must be either true or false');
    }

    const notifications = await this.notificationService.getNotifications(userId, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      page: Number.isFinite(parsedPage) ? parsedPage : undefined,
      isRead: parsedIsRead,
    });
    const likePostNotifications = await this.notificationService.getLikePostNotifications(userId);
    const missionDonationNotifications = await this.notificationService.getMissionDonationNotifications(userId);
    const payFollowingNotifications = await this.notificationService.getPayFollowingNotifications(userId);

    // Prefer computed like notifications and remove duplicate like rows by actor+post.
    const filteredStoredNotifications = notifications.filter(
      (n: any) => (n?.data as any)?.type !== 'like',
    );

    const dedupedLikes = likePostNotifications.filter((n: any, index: number, arr: any[]) => {
      const postId = (n?.data as any)?.postId || n?.post?.id || '';
      const likerId = (n?.data as any)?.likerId || n?.liker?.id || '';
      const key = `${postId}:${likerId}`;
      return index === arr.findIndex((x: any) => {
        const xPostId = (x?.data as any)?.postId || x?.post?.id || '';
        const xLikerId = (x?.data as any)?.likerId || x?.liker?.id || '';
        return `${xPostId}:${xLikerId}` === key;
      });
    });

    const combined = [...filteredStoredNotifications, ...dedupedLikes, ...missionDonationNotifications, ...payFollowingNotifications].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return { notifications: combined };
  }

  @Get('battle')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  async getBattleNotifications(@Req() req: any, @Query('limit') limit?: string) {
    const userId = (req.user as any)?.userId || (req.user as any)?.sub;
    if (!userId) throw new BadRequestException('User not authenticated');
    const parsedLimit = limit ? Number(limit) : undefined;
    const notifications = await this.notificationService.getBattleNotifications(
      userId,
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    );
    return { notifications };
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

  @Put('read/:notificationId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async markSingleAsRead(@Req() req: any, @Param('notificationId') notificationId: string) {
    const userId = (req.user as any)?.userId || (req.user as any)?.sub;

    if (!userId) throw new BadRequestException('User not authenticated');
    if (!notificationId) throw new BadRequestException('notificationId is required');

    const result = await this.notificationService.markSingleNotificationAsRead(userId, notificationId);
    if (!result.updated) {
      return { message: 'Notification already read or not found', updated: false };
    }
    return { message: 'Notification marked as read', updated: true };
  }

  @Put('read-all')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async markAllAsRead(@Req() req: any) {
    const userId = (req.user as any)?.userId || (req.user as any)?.sub;
    if (!userId) throw new BadRequestException('User not authenticated');

    const result = await this.notificationService.markAllNotificationsAsRead(userId);
    return { message: 'All notifications marked as read', count: result.total };
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
