import { Test, TestingModule } from "@nestjs/testing";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";
import { ContactUsDto } from "../dto/contactUs.dto";
import { Request } from "express";
import { ThrottlerGuard } from "@nestjs/throttler";

describe("ContactController", () => {
  let controller: ContactController;

  const mockContactService = {
    submitContactForm: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        {
          provide: ContactService,
          useValue: mockContactService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContactController>(ContactController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("submitContactForm", () => {
    const validContactDto: ContactUsDto = {
      fullName: "Jane Smith",
      email: "jane.smith@example.com",
      phoneNumber: "+1234567890",
      message: "I am interested in your shea butter products.",
    };

    it("should submit contact form successfully", async () => {
      const mockRequest = {
        headers: {},
        ip: "192.168.1.100",
        socket: { remoteAddress: "192.168.1.100" },
      } as unknown as Request;

      const expectedResponse = {
        success: true,
        message: "Your message has been sent successfully.",
      };

      mockContactService.submitContactForm.mockResolvedValue(expectedResponse);

      const result = await controller.submitContactForm(
        validContactDto,
        mockRequest,
      );

      expect(result).toEqual(expectedResponse);
      expect(mockContactService.submitContactForm).toHaveBeenCalledWith(
        validContactDto,
        "192.168.1.100",
      );
    });

    it("should extract IP from x-forwarded-for header", async () => {
      const mockRequest = {
        headers: {
          "x-forwarded-for": "203.0.113.45, 198.51.100.1",
        },
        ip: "192.168.1.100",
        socket: { remoteAddress: "192.168.1.100" },
      } as unknown as Request;

      const expectedResponse = {
        success: true,
        message: "Your message has been sent successfully.",
      };

      mockContactService.submitContactForm.mockResolvedValue(expectedResponse);

      await controller.submitContactForm(validContactDto, mockRequest);

      expect(mockContactService.submitContactForm).toHaveBeenCalledWith(
        validContactDto,
        "203.0.113.45",
      );
    });

    it("should extract IP from x-real-ip header", async () => {
      const mockRequest = {
        headers: {
          "x-real-ip": "198.51.100.25",
        },
        ip: "192.168.1.100",
        socket: { remoteAddress: "192.168.1.100" },
      } as unknown as Request;

      const expectedResponse = {
        success: true,
        message: "Your message has been sent successfully.",
      };

      mockContactService.submitContactForm.mockResolvedValue(expectedResponse);

      await controller.submitContactForm(validContactDto, mockRequest);

      expect(mockContactService.submitContactForm).toHaveBeenCalledWith(
        validContactDto,
        "198.51.100.25",
      );
    });

    it("should handle errors from service", async () => {
      const mockRequest = {
        headers: {},
        ip: "192.168.1.100",
        socket: { remoteAddress: "192.168.1.100" },
      } as unknown as Request;

      const errorResponse = {
        success: false,
        error: "Unable to process your request at the moment.",
      };

      mockContactService.submitContactForm.mockResolvedValue(errorResponse);

      const result = await controller.submitContactForm(
        validContactDto,
        mockRequest,
      );

      expect(result).toEqual(errorResponse);
    });

    it("should handle minimal contact form submission", async () => {
      const minimalDto: ContactUsDto = {
        message: "Just a simple message without other details.",
      };

      const mockRequest = {
        headers: {},
        ip: "192.168.1.100",
        socket: { remoteAddress: "192.168.1.100" },
      } as unknown as Request;

      const expectedResponse = {
        success: true,
        message: "Your message has been sent successfully.",
      };

      mockContactService.submitContactForm.mockResolvedValue(expectedResponse);

      const result = await controller.submitContactForm(
        minimalDto,
        mockRequest,
      );

      expect(result).toEqual(expectedResponse);
      expect(mockContactService.submitContactForm).toHaveBeenCalledWith(
        minimalDto,
        "192.168.1.100",
      );
    });
  });
});
