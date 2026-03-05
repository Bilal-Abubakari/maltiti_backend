import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { NotificationService } from "./notification.service";
import { GetNotificationsDto } from "../dto/get-notifications.dto";
import { MarkAsReadDto } from "../dto/mark-as-read.dto";
import { PaginatedNotificationsResponseDto } from "../dto/paginated-notifications-response.dto";
import { CurrentUser } from "../authentication/decorators/current-user.decorator";
import { User } from "../entities/User.entity";
import { TokenAuthGuard } from "../authentication/guards/token-auth.guard";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(TokenAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: "Get paginated notifications (for infinite scroll)",
  })
  public async getNotifications(
    @CurrentUser() user: User,
    @Query() query: GetNotificationsDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    console.log("user here", user);
    return this.notificationService.getUserNotifications(
      user.id,
      query.page,
      query.limit,
    );
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get unread notification count" })
  public async getUnreadCount(
    @CurrentUser() user: User,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { count };
  }

  @Post("mark-as-read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a specific notification as read" })
  public async markAsRead(
    @CurrentUser() user: User,
    @Body() markAsReadDto: MarkAsReadDto,
  ): Promise<{ success: boolean; message: string }> {
    const userId = user.id;
    await this.notificationService.markAsRead(
      markAsReadDto.notificationId,
      userId,
    );
    return {
      success: true,
      message: "Notification marked as read",
    };
  }

  @Post("mark-all-as-read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark all notifications as read" })
  public async markAllAsRead(
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    await this.notificationService.markAllAsRead(user.id);
    return {
      success: true,
      message: "All notifications marked as read",
    };
  }
}
