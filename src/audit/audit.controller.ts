import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiQuery,
} from "@nestjs/swagger";
import { AuditService, AuditStatistics } from "./audit.service";
import { AuditLogQueryDto } from "../dto/auditLogQuery.dto";
import { AuditLogResponseDto } from "../dto/auditLogResponse.dto";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";
import { IPaginatedResponse, IResponse } from "../interfaces/general";
import { AuditLog } from "../entities/AuditLog.entity";

/**
 * Controller for managing audit logs
 * All endpoints are restricted to Super Admin only
 */
@ApiTags("audit")
@Controller("audits")
@UseGuards(CookieAuthGuard)
@Roles([Role.SuperAdmin])
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Fetch audit logs with filtering, pagination, and sorting
   * @param queryDto - Query parameters for filtering and pagination
   * @returns Paginated list of audit logs
   */
  @ApiOperation({
    summary: "Fetch audit logs (Super Admin Only)",
    description:
      "Retrieve audit logs with support for filtering by date range, action type, entity type, user ID, and role. Supports pagination and sorting.",
  })
  @ApiQuery({ type: AuditLogQueryDto })
  @ApiOkResponse({
    description: "Audit logs retrieved successfully",
    type: AuditLogResponseDto,
    isArray: true,
  })
  @Get()
  public async findAll(
    @Query() queryDto: AuditLogQueryDto,
  ): Promise<IPaginatedResponse<AuditLog>> {
    return this.auditService.findAuditLogs(queryDto);
  }

  /**
   * Fetch a single audit log by ID
   * @param id - The ID of the audit log to retrieve
   * @returns Detailed audit log information
   */
  @ApiOperation({
    summary: "Fetch audit log details (Super Admin Only)",
    description:
      "Retrieve full details of a specific audit log including metadata with before/after values where available.",
  })
  @ApiParam({
    name: "id",
    description: "Audit Log ID",
    type: "string",
  })
  @ApiOkResponse({
    description: "Audit log retrieved successfully",
    type: AuditLogResponseDto,
  })
  @Get(":id")
  public async findOne(@Param("id") id: string): Promise<IResponse<AuditLog>> {
    const auditLog = await this.auditService.findAuditLogById(id);

    if (!auditLog) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return {
      message: "Audit log retrieved successfully",
      data: auditLog,
    };
  }

  /**
   * Get audit statistics
   * @param from - Start date for statistics
   * @param to - End date for statistics
   * @returns Statistics about audit logs
   */
  @ApiOperation({
    summary: "Get audit statistics (Super Admin Only)",
    description:
      "Retrieve statistics about audit logs including action type distribution, entity type distribution, and top users.",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "Start date (ISO 8601 format)",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "End date (ISO 8601 format)",
  })
  @ApiOkResponse({
    description: "Audit statistics retrieved successfully",
  })
  @Get("stats/overview")
  public async getStatistics(
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<IResponse<AuditStatistics>> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const stats = await this.auditService.getAuditStatistics(fromDate, toDate);

    return {
      message: "Audit statistics retrieved successfully",
      data: stats,
    };
  }
}
