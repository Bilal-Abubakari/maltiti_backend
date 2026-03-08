/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { AuditService } from "../audit/audit.service";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { User } from "../entities/User.entity";
import { Request } from "express";

export interface AuditMetadata {
  actionType: AuditActionType;
  entityType: AuditEntityType;
  description: string;
  getEntityId?: (result: any) => string;
  includeBeforeAfter?: boolean;
}

export const AUDIT_METADATA_KEY = "audit_metadata";

/**
 * Decorator to mark endpoints for automatic audit logging
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/explicit-function-return-type
export const AuditLog = (metadata: AuditMetadata) =>
  Reflect.metadata(AUDIT_METADATA_KEY, metadata);

/**
 * Interceptor that automatically logs auditable actions
 * Applied globally or per-controller
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const auditMetadata = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    // If no audit metadata, skip audit logging
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as User;

    // If no user (unauthenticated), skip audit logging
    if (!user) {
      return next.handle();
    }

    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers["user-agent"];

    return next.handle().pipe(
      tap({
        next: result => {
          // Extract entity ID from result if function provided
          const entityId = auditMetadata.getEntityId
            ? auditMetadata.getEntityId(result)
            : undefined;

          // Prepare metadata
          const metadata: Record<string, any> = {};

          if (auditMetadata.includeBeforeAfter && result) {
            metadata.result = result;
          }

          // Create audit log asynchronously (fire and forget)
          void this.auditService.createAuditLog({
            actionType: auditMetadata.actionType,
            entityType: auditMetadata.entityType,
            entityId,
            description: auditMetadata.description,
            performedByUserId: user.id,
            performedByUserName: user.name,
            performedByRole: user.userType,
            ipAddress,
            userAgent,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          });
        },
        error: () => {
          // Even on error, we might want to log the attempt
          // For failed login attempts, this is handled separately
        },
      }),
    );
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (request.headers["x-real-ip"] as string) ||
      request.ip ||
      request.connection?.remoteAddress ||
      "unknown"
    );
  }
}
