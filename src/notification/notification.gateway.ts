import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { NotificationPayload } from "./types/notification-payload.types";
import { ORIGINS } from "../constants/origin.constants";

interface AuthenticatedSocket extends Socket {
  userId: string;
  userType: string;
}

/**
 * WebSocket Gateway for real-time notifications
 * Ensures user isolation and secure room management
 */
@WebSocketGateway({
  cors: {
    origin: ORIGINS,
    credentials: true,
  },
  namespace: "/notifications",
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly connectedClients = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public afterInit(_server: Server): void {
    this.logger.log(
      `Notification WebSocket Gateway initialized, ${_server.sockets.name}`,
    );
  }

  /**
   * Handle client connection with authentication
   */
  public async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.validateToken(token);

      if (!payload?.sub) {
        this.logger.warn(`Connection rejected: Invalid token`);
        client.disconnect();
        return;
      }

      const authenticatedClient = client as AuthenticatedSocket;
      authenticatedClient.userId = payload.sub;
      authenticatedClient.userType = payload.userType || "user";

      // Join user-specific room (server-controlled, not client-controlled)
      const userRoom = this.getUserRoom(authenticatedClient.userId);
      await client.join(userRoom);

      // Track connected clients
      this.trackConnection(authenticatedClient.userId, client.id);

      this.logger.log(
        `Client connected: ${client.id} | User: ${authenticatedClient.userId} | Room: ${userRoom}`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  public handleDisconnect(client: Socket): void {
    const authenticatedClient = client as AuthenticatedSocket;

    if (authenticatedClient.userId) {
      this.untrackConnection(authenticatedClient.userId, client.id);
      this.logger.log(
        `Client disconnected: ${client.id} | User: ${authenticatedClient.userId}`,
      );
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  /**
   * Emit notification to a specific user
   * Ensures user isolation
   */
  public emitToUser(userId: string, payload: NotificationPayload): void {
    const userRoom = this.getUserRoom(userId);
    this.server.to(userRoom).emit("notification", payload);

    this.logger.debug(
      `Emitted notification to user ${userId}: ${payload.topic}`,
    );
  }

  /**
   * Emit notification to multiple users
   */
  public emitToUsers(userIds: string[], payload: NotificationPayload): void {
    userIds.forEach(userId => this.emitToUser(userId, payload));
  }

  /**
   * Broadcast to all connected users
   */
  public broadcastToAll(payload: NotificationPayload): void {
    this.server.emit("notification", payload);
    this.logger.debug(
      `Broadcasted notification to all users: ${payload.topic}`,
    );
  }

  /**
   * Get count of connected clients for a user
   */
  public getUserConnectionCount(userId: string): number {
    return this.connectedClients.get(userId)?.size || 0;
  }

  /**
   * Check if user is currently connected
   */
  public isUserConnected(userId: string): boolean {
    return this.getUserConnectionCount(userId) > 0;
  }

  /**
   * Extract JWT token from handshake
   */
  private extractTokenFromHandshake(client: Socket): string | null {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(" ")[1];

    return token || null;
  }

  /**
   * Validate JWT token
   */
  private async validateToken(
    token: string,
  ): Promise<{ sub: string; userType?: string } | null> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_SECRET") || "secret",
      });
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      throw new UnauthorizedException("Invalid token");
    }
  }

  /**
   * Get user-specific room name (server-controlled)
   */
  private getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  /**
   * Track client connection
   */
  private trackConnection(userId: string, clientId: string): void {
    if (!this.connectedClients.has(userId)) {
      this.connectedClients.set(userId, new Set());
    }
    this.connectedClients.get(userId).add(clientId);
  }

  /**
   * Untrack client connection
   */
  private untrackConnection(userId: string, clientId: string): void {
    const userClients = this.connectedClients.get(userId);
    if (userClients) {
      userClients.delete(clientId);
      if (userClients.size === 0) {
        this.connectedClients.delete(userId);
      }
    }
  }
}
