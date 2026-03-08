import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";

export class InvalidatedRefreshTokenError extends Error {}

@Injectable()
export class RefreshTokenIdsStorage
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private redisClient: Redis;
  constructor(private configService: ConfigService) {}
  public onApplicationBootstrap(): void {
    const redisTls = this.configService.get<string>("REDIS_TLS");

    this.redisClient = new Redis({
      password: this.configService.get<string>("REDIS_PASSWORD"),
      host: this.configService.get<string>("REDIS_HOST"),
      port: this.configService.get<number>("REDIS_PORT"),
      username: this.configService.get<string>("REDIS_USERNAME"),
      tls:
        redisTls === "false"
          ? undefined
          : {
              rejectUnauthorized: false,
            },
    });
    this.redisClient.on("error", err => {
      console.error("Redis error:", err);
    });
  }

  public onApplicationShutdown(): Promise<"OK"> {
    return this.redisClient.quit();
  }

  public async insert(userId: string, tokenId: string): Promise<void> {
    await this.redisClient.set(this.getKey(userId), tokenId);
  }

  public async validate(userId: string, tokenId: string): Promise<boolean> {
    const storedId = await this.redisClient.get(this.getKey(userId));
    if (storedId !== tokenId) {
      throw new InvalidatedRefreshTokenError();
    }
    return storedId === tokenId;
  }

  public async invalidate(userId: string): Promise<void> {
    await this.redisClient.del(this.getKey(userId));
  }

  private getKey(userId: string): string {
    return `user-${userId}`;
  }
}
