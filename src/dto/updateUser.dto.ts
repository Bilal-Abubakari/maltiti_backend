import {
  IsEmail,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from "class-validator";
import { Role } from "../enum/role.enum";
import { Status } from "../enum/status.enum";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  public name?: string;

  @IsOptional()
  @IsEmail()
  public email?: string;

  @IsOptional()
  @IsString()
  public phoneNumber?: string;

  @IsOptional()
  @IsEnum(Role)
  public userType?: Role;

  @IsOptional()
  @IsEnum(Status)
  public status?: Status;

  @IsOptional()
  @IsDateString()
  public dob?: string;
}
