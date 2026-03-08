import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
} from "class-validator";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { Role } from "../enum/role.enum";

/**
 * DTO for querying audit logs with filters
 */
export class AuditLogQueryDto {
  @ApiPropertyOptional({
    description: "Start date for filtering (ISO 8601 format)",
    example: "2023-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  public from?: string;

  @ApiPropertyOptional({
    description: "End date for filtering (ISO 8601 format)",
    example: "2023-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  public to?: string;

  @ApiPropertyOptional({
    description: "Filter by action type",
    enum: AuditActionType,
  })
  @IsOptional()
  @IsEnum(AuditActionType)
  public actionType?: AuditActionType;

  @ApiPropertyOptional({
    description: "Filter by entity type",
    enum: AuditEntityType,
  })
  @IsOptional()
  @IsEnum(AuditEntityType)
  public entityType?: AuditEntityType;

  @ApiPropertyOptional({
    description: "Filter by user ID who performed the action",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsUUID()
  public userId?: string;

  @ApiPropertyOptional({
    description: "Filter by user role",
    enum: Role,
  })
  @IsOptional()
  @IsEnum(Role)
  public role?: Role;

  @ApiPropertyOptional({
    description: "Page number (starts from 1)",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of items per page",
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public limit?: number = 20;

  @ApiPropertyOptional({
    description: "Sort order (ASC or DESC)",
    example: "DESC",
    default: "DESC",
  })
  @IsOptional()
  public sortOrder?: "ASC" | "DESC" = "DESC";
}
