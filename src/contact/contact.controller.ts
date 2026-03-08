import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from "@nestjs/swagger";
import { Request } from "express";
import { ContactService } from "./contact.service";
import { ContactUsDto } from "../dto/contactUs.dto";
import {
  ContactUsSuccessResponseDto,
  ContactUsErrorResponseDto,
} from "../dto/contactUsResponse.dto";
import { Throttle } from "@nestjs/throttler";

@ApiTags("Contact")
@Controller("/contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 1, ttl: 1000 }, long: { limit: 5, ttl: 60000 } }) // 1 request per second, 5 per minute
  @ApiOperation({
    summary: "Submit contact us form",
    description:
      "Allows users to contact Maltiti A. Enterprise Ltd. On successful submission, an email is sent to the administrator.",
  })
  @ApiResponse({
    status: 200,
    description: "Message sent successfully",
    type: ContactUsSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Validation error - Invalid input",
    type: ContactUsErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: "Server error - Unable to process request",
    type: ContactUsErrorResponseDto,
  })
  public async submitContactForm(
    @Body() contactUsDto: ContactUsDto,
    @Req() request: Request,
  ): Promise<ContactUsSuccessResponseDto | ContactUsErrorResponseDto> {
    // Extract sender IP address
    const senderIp =
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (request.headers["x-real-ip"] as string) ||
      request.ip ||
      request.socket.remoteAddress;

    return await this.contactService.submitContactForm(contactUsDto, senderIp);
  }
}
