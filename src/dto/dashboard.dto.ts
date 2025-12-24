import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export enum TrendPeriod {
  LAST_7_DAYS = "7",
  LAST_30_DAYS = "30",
  LAST_90_DAYS = "90",
}

export class DashboardSummaryQueryDto {
  @ApiPropertyOptional({
    description: "Start date for period filtering (ISO format)",
  })
  @IsOptional()
  @IsDateString()
  public fromDate?: string;

  @ApiPropertyOptional({
    description: "End date for period filtering (ISO format)",
  })
  @IsOptional()
  @IsDateString()
  public toDate?: string;

  @ApiPropertyOptional({
    description: "Include comparison with previous period",
    default: false,
  })
  @IsOptional()
  public includeComparison?: boolean;
}

export class DashboardTrendsQueryDto {
  @ApiPropertyOptional({
    enum: TrendPeriod,
    default: TrendPeriod.LAST_30_DAYS,
    description: "Period for trend data",
  })
  @IsOptional()
  @IsEnum(TrendPeriod)
  public period?: TrendPeriod;
}

export class DashboardHighlightsQueryDto {
  @ApiPropertyOptional({
    description: "Number of top/bottom products to return",
    default: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  public limit?: number;
}

export class DashboardAlertsQueryDto {
  @ApiPropertyOptional({
    description: "Low stock threshold",
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public lowStockThreshold?: number;

  @ApiPropertyOptional({
    description: "Days until expiry for critical alert",
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public expiryWarningDays?: number;
}

export class DashboardActivityQueryDto {
  @ApiPropertyOptional({
    description: "Number of recent items to return",
    default: 10,
    minimum: 5,
    maximum: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(20)
  public limit?: number;
}
