import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SignInDto {
  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsNotEmpty()
  @IsEmail()
  public email: string;

  @ApiProperty({
    description: "User password",
    example: "Password123!",
  })
  @IsNotEmpty()
  public password: string;

  @ApiPropertyOptional({
    description:
      "Guest session ID to sync cart items (optional, for guest users logging in)",
    example: "guest-1234567890",
  })
  @IsOptional()
  @IsString()
  public sessionId?: string;
}
