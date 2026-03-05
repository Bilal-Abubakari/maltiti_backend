import { IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class MarkAsReadDto {
  @ApiProperty({ description: "Notification ID to mark as read" })
  @IsUUID()
  public notificationId: string;
}
