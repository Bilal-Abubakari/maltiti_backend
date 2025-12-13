import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiOkResponse,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "../dto/updateUser.dto";
import { ChangeStatusDto } from "../dto/changeStatus.dto";
import { ChangeRoleDto } from "../dto/changeRole.dto";
import { UserResponseDto } from "../dto/userResponse.dto";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";
import { IResponse } from "../interfaces/general";
import { User } from "../entities/User.entity";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";

/**
 * Controller for managing user-related operations, accessible only to SuperAdmin users.
 * Provides endpoints for CRUD operations and status/role changes on users.
 */
@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Retrieves all users.
   * @returns A response containing an array of users.
   */
  @ApiOperation({ summary: "Get all users" })
  @ApiOkResponse({
    description: "Users retrieved successfully",
    type: UserResponseDto,
    isArray: true,
  })
  @UseGuards(CookieAuthGuard)
  @Roles([Role.SuperAdmin])
  @Get()
  public async findAll(): Promise<IResponse<User[]>> {
    const users = await this.usersService.findAll();
    return {
      message: "Users retrieved successfully",
      data: users,
    };
  }

  /**
   * Retrieves a single user by ID.
   * @param id - The ID of the user to retrieve.
   * @returns A response containing the user data.
   */
  @ApiOperation({ summary: "Get a user by ID" })
  @ApiParam({ name: "id", description: "User ID", type: "string" })
  @ApiOkResponse({
    description: "User retrieved successfully",
    type: UserResponseDto,
  })
  @Get(":id")
  @Roles([Role.SuperAdmin])
  public async findOne(@Param("id") id: string): Promise<IResponse<User>> {
    const user = await this.usersService.findOne(id);
    return {
      message: "User retrieved successfully",
      data: user,
    };
  }

  /**
   * Updates a user's information.
   * @param id - The ID of the user to update.
   * @param updateUserDto - The DTO containing update data.
   * @returns A response containing the updated user.
   */
  @ApiOperation({ summary: "Update a user" })
  @ApiParam({ name: "id", description: "User ID", type: "string" })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({
    description: "User updated successfully",
    type: UserResponseDto,
  })
  @Patch(":id")
  @Roles([Role.SuperAdmin])
  public async update(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.update(id, updateUserDto);
    return {
      message: "User updated successfully",
      data: user,
    };
  }

  /**
   * Deletes a user by ID.
   * @param id - The ID of the user to delete.
   * @returns A response confirming the deletion.
   */
  @ApiOperation({ summary: "Delete a user" })
  @ApiParam({ name: "id", description: "User ID", type: "string" })
  @ApiOkResponse({
    description: "User deleted successfully",
  })
  @Delete(":id")
  @Roles([Role.SuperAdmin])
  public async remove(
    @Param("id") id: string,
  ): Promise<IResponse<{ message: string }>> {
    await this.usersService.remove(id);
    return {
      message: "User deleted successfully",
      data: { message: "User has been deleted" },
    };
  }

  /**
   * Changes the status of a user.
   * @param id - The ID of the user whose status to change.
   * @param changeStatusDto - The DTO containing the new status.
   * @returns A response containing the updated user.
   */
  @ApiOperation({ summary: "Change user status" })
  @ApiParam({ name: "id", description: "User ID", type: "string" })
  @ApiBody({ type: ChangeStatusDto })
  @ApiOkResponse({
    description: "User status changed successfully",
    type: UserResponseDto,
  })
  @Patch(":id/status")
  @Roles([Role.SuperAdmin])
  public async changeStatus(
    @Param("id") id: string,
    @Body() changeStatusDto: ChangeStatusDto,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.changeStatus(
      id,
      changeStatusDto.status,
    );
    return {
      message: "User status changed successfully",
      data: user,
    };
  }

  /**
   * Changes the role of a user.
   * @param id - The ID of the user whose role to change.
   * @param changeRoleDto - The DTO containing the new role.
   * @returns A response containing the updated user.
   */
  @ApiOperation({ summary: "Change user role" })
  @ApiParam({ name: "id", description: "User ID", type: "string" })
  @ApiBody({ type: ChangeRoleDto })
  @ApiOkResponse({
    description: "User role changed successfully",
    type: UserResponseDto,
  })
  @Patch(":id/role")
  @Roles([Role.SuperAdmin])
  public async changeRole(
    @Param("id") id: string,
    @Body() changeRoleDto: ChangeRoleDto,
  ): Promise<IResponse<User>> {
    const user = await this.usersService.changeRole(id, changeRoleDto.userType);
    return {
      message: "User role changed successfully",
      data: user,
    };
  }
}
