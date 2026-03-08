import { User } from "../entities/User.entity";
import { Request } from "express";

export interface IJwtPayload {
  sub: string;
  email: string;
}

export interface RequestWithUser extends Request {
  user: User;
}
