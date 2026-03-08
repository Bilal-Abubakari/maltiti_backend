import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsStrongPassword,
  IsString,
} from "class-validator";
import { Role } from "../enum/role.enum";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterUserDto {
  @ApiProperty({
    description: "User full name",
    example: "John Doe",
  })
  @IsNotEmpty()
  public name: string;

  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail()
  public email: string;

  @ApiProperty({
    description:
      "User password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol)",
    example: "Password123!",
  })
  @IsNotEmpty()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minNumbers: 1,
      minSymbols: 1,
      minUppercase: 1,
    },
    { always: true },
  )
  public password: string;

  @ApiProperty({
    description: "Password confirmation",
    example: "Password123!",
  })
  @IsNotEmpty()
  public confirmPassword: string;

  @ApiProperty({
    description: "User role type",
    enum: Role,
    example: Role.User,
  })
  @IsNotEmpty()
  @IsEnum(Role)
  public userType: Role;

  @ApiPropertyOptional({
    description: "User phone number",
    example: "+233244123456",
  })
  @IsOptional()
  @IsPhoneNumber()
  public phoneNumber?: string;

  @ApiPropertyOptional({
    description:
      "Guest session ID to sync cart items (optional, for guest users signing up)",
    example: "guest-1234567890",
  })
  @IsOptional()
  @IsString()
  public sessionId?: string;
}
