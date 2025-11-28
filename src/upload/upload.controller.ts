import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadService } from "./upload.service";
import { IResponse } from "../interfaces/general";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from "@nestjs/swagger";
import { UploadResponseDto } from "../dto/uploadResponse.dto";

@ApiTags("Upload")
@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("image")
  @ApiOperation({ summary: "Upload an image" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: {
          type: "string",
          format: "binary",
          description: "Image file to upload",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Image uploaded successfully",
    type: UploadResponseDto,
  })
  @UseInterceptors(FileInterceptor("image"))
  public async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<IResponse<string>> {
    const url = await this.uploadService.uploadImage(file);
    return { data: url, message: "Image uploaded successfully" };
  }
}
