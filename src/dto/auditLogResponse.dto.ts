import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { Role } from "../enum/role.enum";

/**
 * DTO for Audit Log responses in API documentation
 */
export class AuditLogResponseDto {
  @ApiProperty({
    description: "Unique identifier for the audit log",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  public id: string;

  @ApiProperty({
    description: "Type of action performed",
    enum: AuditActionType,
    example: AuditActionType.CREATE,
  })
  public actionType: AuditActionType;

  @ApiProperty({
    description: "Type of entity affected",
    enum: AuditEntityType,
    example: AuditEntityType.PRODUCT,
  })
  public entityType: AuditEntityType;

  @ApiPropertyOptional({
    description: "ID of the entity affected",
    example: "456e7890-e89b-12d3-a456-426614174111",
  })
  public entityId?: string;

  @ApiProperty({
    description: "Human-readable description of the action",
    example: "Created product 'Organic Shea Butter 500g'",
  })
  public description: string;

  @ApiProperty({
    description: "ID of user who performed the action",
    example: "789e1234-e89b-12d3-a456-426614174222",
  })
  public performedByUserId: string;

  @ApiPropertyOptional({
    description: "Name of user who performed the action",
    example: "John Doe",
  })
  public performedByUserName?: string;

  @ApiProperty({
    description: "Role of user who performed the action",
    enum: Role,
    example: Role.Admin,
  })
  public performedByRole: Role;

  @ApiPropertyOptional({
    description: "IP address from which action was performed",
    example: "192.168.1.1",
  })
  public ipAddress?: string;

  @ApiPropertyOptional({
    description: "User agent string of the client",
    example: "Mozilla/5.0...",
  })
  public userAgent?: string;

  @ApiProperty({
    description: "Timestamp when action was performed",
    example: "2023-12-24T10:30:00Z",
  })
  public timestamp: Date;

  @ApiPropertyOptional({
    description: "Additional metadata (before/after values, etc.)",
    example: { before: { price: 100 }, after: { price: 120 } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public metadata?: Record<string, any>;
}
