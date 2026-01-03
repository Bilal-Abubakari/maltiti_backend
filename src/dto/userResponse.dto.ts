import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "../enum/role.enum";
import { Status } from "../enum/status.enum";

/**
 * DTO for User responses in API documentation
 */
export class UserResponseDto {
  @ApiProperty({
    description: "Unique identifier for the user",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  public id: string;

  @ApiProperty({
    description: "Email address of the user",
    example: "user@example.com",
  })
  public email: string;

  @ApiProperty({
    description: "Full name of the user",
    example: "John Doe",
  })
  public name: string;

  @ApiProperty({
    description: "User role/type",
    enum: Role,
    example: Role.SuperAdmin,
    enumName: "Role",
  })
  public userType: Role;

  @ApiPropertyOptional({
    description: "Phone number of the user",
    example: "+233123456789",
  })
  public phoneNumber?: string;

  @ApiPropertyOptional({
    description: "User permissions",
    example: "read,write,delete",
  })
  public permissions?: string;

  @ApiProperty({
    description: "Whether the user must change their password on next login",
    example: false,
  })
  public mustChangePassword: boolean;

  @ApiPropertyOptional({
    description: "Remember token for authentication",
  })
  public rememberToken?: string;

  @ApiProperty({
    description: "User account status",
    enum: Status,
    example: Status.Active,
  })
  public status: Status;

  @ApiPropertyOptional({
    description: "Date of birth",
    example: "1990-01-01",
  })
  public dob?: Date;

  @ApiProperty({
    description: "Account creation date",
    example: "2024-12-09T00:00:00.000Z",
  })
  public createdAt: Date;

  @ApiPropertyOptional({
    description: "Email verification date",
    example: "2024-12-09T00:00:00.000Z",
  })
  public emailVerifiedAt?: Date;

  @ApiProperty({
    description: "Last update date",
    example: "2024-12-09T00:00:00.000Z",
  })
  public updatedAt: Date;
}
