import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommandInput } from "@aws-sdk/client-s3/dist-types/commands";
import { ConfigService } from "@nestjs/config";
import {
  CloudinaryUploadResponse,
  UploadPresets,
} from "../interfaces/upload.interface";
import { firstValueFrom } from "rxjs";
import { HttpService } from "@nestjs/axios";

@Injectable()
export class UploadService {
  private readonly logger = new Logger();
  private s3: S3Client;

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.s3 = new S3Client({
      region: this.configService.get<string>("MALTITI_AWS_REGION"),
      credentials: {
        accessKeyId: this.configService.get<string>(
          "MALTITI_AWS_ACCESS_KEY_ID",
        ),
        secretAccessKey: this.configService.get<string>(
          "MALTITI_AWS_SECRET_ACCESS_KEY",
        ),
      },
    });
  }

  public async uploadImage(image: Express.Multer.File): Promise<string> {
    const file = image; // Assuming you've set up the appropriate multer middleware

    if (!file) {
      throw new Error("No file uploaded");
    }

    const key = `${new Date().getTime()}-${file.originalname}`;
    const params: PutObjectCommandInput = {
      Bucket: this.configService.get<string>("AWS_BUCKET_NAME"),
      Key: key,
      Body: file.buffer,
    };
    const putCommand = new PutObjectCommand(params);

    await this.s3.send(putCommand);

    return `https://${this.configService.get<string>("AWS_BUCKET_NAME")}.s3.amazonaws.com/${key}`;
  }

  public async upload(
    { buffer, originalname }: Express.Multer.File,
    preset: UploadPresets,
  ): Promise<string> {
    const timestamp = Date.now();
    const publicId = `${originalname}-${timestamp}`;
    const formData = new FormData();

    // Convert Buffer to Uint8Array for proper Blob creation
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array], { type: "application/octet-stream" });
    formData.append("file", blob, originalname);
    formData.append("public_id", publicId);
    formData.append("api_key", this.configService.get("CLOUDINARY_API_KEY"));
    formData.append("timestamp", timestamp.toString());
    formData.append(
      "upload_preset",
      this.configService.get(`CLOUDINARY_${preset}`),
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post<CloudinaryUploadResponse>(
          this.configService.get("CLOUDINARY_BASE_URL"),
          formData,
          {
            headers: {
              "content-type": "multipart/form-data",
            },
          },
        ),
      );

      return response.data.url;
    } catch (error) {
      console.log("Error here:", error);
      this.logger.error(`Error: ${error.message}`);
      throw new InternalServerErrorException("Failed to upload file");
    }
  }
}
