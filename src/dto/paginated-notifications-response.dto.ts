import { Notification } from "../entities/Notification.entity";

export class PaginatedNotificationsResponseDto {
  public notifications: Notification[];
  public total: number;
  public page: number;
  public limit: number;
  public totalPages: number;
  public hasMore: boolean;
  public unreadCount: number;
}
