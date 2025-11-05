import { Reflector } from "@nestjs/core";
import { Role } from "../../../enum/role.enum";

export const Roles = Reflector.createDecorator<Role[]>();
