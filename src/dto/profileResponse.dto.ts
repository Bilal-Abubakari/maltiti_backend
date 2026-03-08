import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "../enum/role.enum";

/**
 * DTO for profile response
 */
export class ProfileResponseDto {
  @ApiProperty({
    description: "User ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  public id: string;

  @ApiProperty({
    description: "Full name",
    example: "John Doe",
  })
  public name: string;

  @ApiProperty({
    description: "Email address",
    example: "john.doe@maltitiaenterprise.com",
  })
  public email: string;

  @ApiPropertyOptional({
    description: "Phone number",
    example: "+1234567890",
  })
  public phone?: string;

  @ApiPropertyOptional({
    description: "Profile avatar URL",
    example: "https://example.com/avatars/user.jpg",
  })
  public avatarUrl?: string;

  @ApiProperty({
    description: "User role (read-only)",
    enum: Role,
    example: Role.Admin,
  })
  public userType: Role;

  @ApiProperty({
    description: "Email verification status (read-only)",
    example: true,
  })
  public emailVerifiedAt: string;

  @ApiProperty({
    description: "Phone verification status (read-only)",
    example: true,
  })
  public phoneVerifiedAt: string;

  @ApiProperty({
    description: "Account creation date (read-only)",
    example: "2023-12-24T10:00:00Z",
  })
  public createdAt: Date;

  @ApiProperty({
    description: "Last update date (read-only)",
    example: "2023-12-24T12:00:00Z",
  })
  public updatedAt: Date;
}

/**
 * Wrapper DTO for profile API responses
 */
export class ProfileResponseWrapperDto {
  @ApiProperty({
    description: "Response message",
    example: "Profile retrieved successfully",
  })
  public message: string;

  @ApiProperty({
    description: "Profile data",
    type: ProfileResponseDto,
  })
  public data: ProfileResponseDto;
}

/**
 * Wrapper DTO for avatar upload response
 */
export class AvatarUploadResponseDto {
  @ApiProperty({
    description: "Response message",
    example: "Profile picture uploaded successfully",
  })
  public message: string;

  @ApiProperty({
    description: "Avatar URL",
    example: "https://example.com/avatars/user.jpg",
  })
  public data: string;
}
