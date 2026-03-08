import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsPhoneNumber } from "class-validator";

/**
 * DTO for updating user profile
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "Full name",
    example: "John Doe",
  })
  @IsOptional()
  @IsString()
  public name?: string;

  @ApiPropertyOptional({
    description: "Phone number",
    example: "+1234567890",
  })
  @IsOptional()
  @IsPhoneNumber()
  public phone?: string;
}
