import { IsEnum } from "class-validator";
import { Role } from "../enum/role.enum";

export class ChangeRoleDto {
  @IsEnum(Role)
  public userType: Role;
}
