import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, FindOptionsWhere } from "typeorm";
import { AuditLog } from "../entities/AuditLog.entity";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { Role } from "../enum/role.enum";
import { AuditLogQueryDto } from "../dto/auditLogQuery.dto";
import { IPaginatedResponse } from "../interfaces/general";

export interface CreateAuditLogDto {
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId?: string;
  description: string;
  performedByUserId: string;
  performedByUserName?: string;
  performedByRole: Role;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface ActionTypeStats {
  actionType: string;
  count: string;
}

export interface EntityTypeStats {
  entityType: string;
  count: string;
}

export interface UserStats {
  userId: string;
  userName: string | null;
  count: string;
}

export interface AuditStatistics {
  totalCount: number;
  actionTypeStats: ActionTypeStats[];
  entityTypeStats: EntityTypeStats[];
  topUsers: UserStats[];
}

/**
 * Service for managing audit logs
 * Provides centralized audit logging functionality
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Create an audit log entry
   * This method should NEVER throw exceptions to avoid breaking business flows
   */
  public async createAuditLog(data: CreateAuditLogDto): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        actionType: data.actionType,
        entityType: data.entityType,
        entityId: data.entityId,
        description: data.description,
        performedByUserId: data.performedByUserId,
        performedByUserName: data.performedByUserName,
        performedByRole: data.performedByRole,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      // Log the error but don't throw - audit logging failures must not break business flows
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Find audit logs with filtering, pagination, and sorting
   */
  public async findAuditLogs(
    queryDto: AuditLogQueryDto,
  ): Promise<IPaginatedResponse<AuditLog>> {
    const {
      from,
      to,
      actionType,
      entityType,
      userId,
      role,
      page = 1,
      limit = 20,
      sortOrder = "DESC",
    } = queryDto;

    const where: FindOptionsWhere<AuditLog> = {};

    // Date range filter
    if (from || to) {
      where.timestamp = Between(
        from ? new Date(from) : new Date(0),
        to ? new Date(to) : new Date(),
      );
    }

    // Action type filter
    if (actionType) {
      where.actionType = actionType;
    }

    // Entity type filter
    if (entityType) {
      where.entityType = entityType;
    }

    // User ID filter
    if (userId) {
      where.performedByUserId = userId;
    }

    // Role filter
    if (role) {
      where.performedByRole = role;
    }

    const [items, totalItems] = await this.auditLogRepository.findAndCount({
      where,
      order: {
        timestamp: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: "Audit logs retrieved successfully",
      data: {
        items,
        totalItems,
        currentPage: page,
        totalPages,
      },
    };
  }

  /**
   * Find a single audit log by ID
   */
  public async findAuditLogById(id: string): Promise<AuditLog> {
    return this.auditLogRepository.findOne({ where: { id } });
  }

  /**
   * Get audit statistics
   */
  public async getAuditStatistics(
    from?: Date,
    to?: Date,
  ): Promise<AuditStatistics> {
    const query = this.auditLogRepository.createQueryBuilder("audit");

    if (from) {
      query.andWhere("audit.timestamp >= :from", { from });
    }

    if (to) {
      query.andWhere("audit.timestamp <= :to", { to });
    }

    const [totalCount, actionTypeStats, entityTypeStats, userStats] =
      await Promise.all([
        query.getCount(),

        this.auditLogRepository
          .createQueryBuilder("audit")
          .select("audit.actionType", "actionType")
          .addSelect("COUNT(*)", "count")
          .groupBy("audit.actionType")
          .getRawMany(),

        this.auditLogRepository
          .createQueryBuilder("audit")
          .select("audit.entityType", "entityType")
          .addSelect("COUNT(*)", "count")
          .groupBy("audit.entityType")
          .getRawMany(),

        this.auditLogRepository
          .createQueryBuilder("audit")
          .select("audit.performedByUserId", "userId")
          .addSelect("audit.performedByUserName", "userName")
          .addSelect("COUNT(*)", "count")
          .groupBy("audit.performedByUserId, audit.performedByUserName")
          .orderBy("count", "DESC")
          .limit(10)
          .getRawMany(),
      ]);

    return {
      totalCount,
      actionTypeStats,
      entityTypeStats,
      topUsers: userStats,
    };
  }
}
