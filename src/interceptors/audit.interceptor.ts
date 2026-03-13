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
  getEntityId?: (result: Record<string, unknown>) => string | undefined;
  includeResult?: boolean;
}

export const AUDIT_METADATA_KEY = "audit_metadata";

/**
 * Decorator to mark endpoints for automatic audit logging
 */
export const AuditLog = (metadata: AuditMetadata): MethodDecorator =>
  Reflect.metadata(AUDIT_METADATA_KEY, metadata);

/**
 * Interceptor that automatically logs auditable actions.
 * Applied globally — only fires when a handler is decorated with @AuditLog().
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
  ): Observable<unknown> {
    const auditMetadata = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    // If no audit metadata, skip audit logging
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: User }).user;

    // If no user (unauthenticated), skip audit logging
    if (!user) {
      return next.handle();
    }

    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers["user-agent"];

    return next.handle().pipe(
      tap({
        next: (result: unknown) => {
          const typedResult = result as Record<string, unknown>;

          // Extract entity ID from result if function provided
          const entityId = auditMetadata.getEntityId
            ? auditMetadata.getEntityId(typedResult)
            : undefined;

          // Optionally attach the result to metadata for richer audit trail
          const metadata: Record<string, unknown> =
            auditMetadata.includeResult && result
              ? { result: typedResult }
              : {};

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
          // Errors are not audited here — failed login attempts are logged separately
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
      (request as unknown as { connection?: { remoteAddress?: string } })
        .connection?.remoteAddress ||
      "unknown"
    );
  }
}
