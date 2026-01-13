import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
  ApiConsumes,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { CookieAuthGuard } from "../authentication/guards/cookie-auth.guard";
import { UsersService } from "../users/users.service";
import { UpdateProfileDto } from "../dto/updateProfile.dto";
import {
  ProfileResponseWrapperDto,
  AvatarUploadResponseDto,
} from "../dto/profileResponse.dto";
import { IResponse } from "../interfaces/general";
import { User } from "../entities/User.entity";
import { AuditLog } from "../interceptors/audit.interceptor";
import { AuditActionType } from "../enum/audit-action-type.enum";
import { AuditEntityType } from "../enum/audit-entity-type.enum";
import { RequestWithUser } from "../interfaces/jwt.interface";
import { Roles } from "../authentication/guards/roles/roles.decorator";
import { Role } from "../enum/role.enum";

/**
 * Controller for authenticated user's profile management
 * All endpoints are self-service (user manages their own profile)
 */
@ApiTags("Profile & Settings")
@Controller("me")
@UseGuards(CookieAuthGuard)
@ApiCookieAuth()
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user's profile
   */
  @ApiOperation({
    summary: "Get my profile",
    description:
      "Returns the authenticated user's profile information. Read-only fields like role and verification status are included.",
  })
  @ApiResponse({
    status: 200,
    description: "Profile retrieved successfully",
    type: ProfileResponseWrapperDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - not logged in",
  })
  @Get("profile")
  @Roles([Role.Admin, Role.SuperAdmin, Role.User])
  public async getProfile(
    @Req() request: Request,
  ): Promise<IResponse<Partial<User>>> {
    const user = (request as unknown as { user: User }).user as User;

    // Fetch fresh user data from database
    const profile = await this.usersService.findUserById(user.id);

    // Remove sensitive fields
    delete profile.password;

    return {
      message: "Profile retrieved successfully",
      data: profile,
    };
  }

  /**
   * Update current user's profile
   */
  @ApiOperation({
    summary: "Update my profile",
    description:
      "Updates the authenticated user's profile information. Email changes require re-verification. Role and permissions cannot be modified through this endpoint.",
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 201,
    description: "Profile updated successfully",
    type: ProfileResponseWrapperDto,
  })
  @ApiResponse({
    status: 200,
    description: "Profile updated successfully",
    type: ProfileResponseWrapperDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - not logged in",
  })
  @ApiResponse({
    status: 409,
    description: "Email already in use by another account",
  })
  @AuditLog({
    actionType: AuditActionType.UPDATE,
    entityType: AuditEntityType.USER,
    description: "Updated own profile",
    getEntityId: result => result?.data?.id,
  })
  @Put("profile")
  @Roles([Role.Admin, Role.SuperAdmin, Role.User])
  public async updateProfile(
    @Req() request: RequestWithUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<IResponse<Partial<User>>> {
    const user = request.user;

    const updatedUser = await this.usersService.update(
      user.id,
      updateProfileDto,
    );
    delete updatedUser.password;

    return {
      message: "Profile updated successfully",
      data: updatedUser,
    };
  }

  /**
   * Upload or update profile avatar
   */
  @ApiOperation({
    summary: "Upload profile avatar",
    description:
      "Uploads or updates the authenticated user's profile avatar image. Accepts image files (jpg, png, gif) up to 5MB.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Avatar image file",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Avatar uploaded successfully",
    type: AvatarUploadResponseDto,
  })
  @ApiResponse({
    status: 201,
    description: "Avatar uploaded successfully",
    type: AvatarUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid file type or size",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - not logged in",
  })
  @AuditLog({
    actionType: AuditActionType.UPDATE,
    entityType: AuditEntityType.USER,
    description: "Updated profile avatar",
    getEntityId: result => result?.data?.id,
  })
  @Post("profile/avatar")
  @Roles([Role.Admin, Role.SuperAdmin, Role.User])
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        // Allow only image files
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException("Only image files are allowed"),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  public async uploadAvatar(
    @Req() request: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<IResponse<string>> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const avatarUrl = await this.usersService.uploadAvatar(
      request.user.id,
      file,
    );

    return {
      message: "Profile picture uploaded successfully",
      data: avatarUrl,
    };
  }
}
