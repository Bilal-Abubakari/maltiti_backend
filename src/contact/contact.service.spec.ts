import { Test, TestingModule } from "@nestjs/testing";
import { ContactService } from "./contact.service";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { ContactUsDto } from "../dto/contactUs.dto";
import { HttpException, HttpStatus } from "@nestjs/common";

describe("ContactService", () => {
  let service: ContactService;

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "ADMIN_EMAIL") {
        return "bilal.abubakari@maltitiaenterprise.com";
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("submitContactForm", () => {
    const validContactDto: ContactUsDto = {
      fullName: "John Doe",
      email: "john.doe@example.com",
      phoneNumber: "+233244123456",
      message: "I would like to inquire about your products.",
    };

    it("should successfully process contact form submission", async () => {
      mockMailerService.sendMail.mockResolvedValue(true);

      const result = await service.submitContactForm(
        validContactDto,
        "192.168.1.1",
      );

      expect(result).toEqual({
        success: true,
        message: "Your message has been sent successfully.",
      });
      expect(mockMailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "bilal.abubakari@maltitiaenterprise.com",
          subject: "New Contact Us Submission – Maltiti A. Enterprise Ltd",
          template: "./contact-us",
        }),
      );
    });

    it("should handle optional fields correctly", async () => {
      const minimalDto: ContactUsDto = {
        message: "This is a minimal message with only required field.",
      };

      mockMailerService.sendMail.mockResolvedValue(true);

      const result = await service.submitContactForm(minimalDto, "192.168.1.1");

      expect(result.success).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            fullName: "Not provided",
            email: "Not provided",
            phoneNumber: "Not provided",
            message: minimalDto.message,
          }),
        }),
      );
    });

    it("should reject spam submissions with honeypot", async () => {
      const spamDto: ContactUsDto = {
        message: "This is a spam message",
        website: "http://spam.com", // Honeypot field
      };

      const result = await service.submitContactForm(spamDto, "192.168.1.1");

      expect(result.success).toBe(true); // Returns success to not reveal honeypot
      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });

    it("should throw HttpException when email sending fails", async () => {
      mockMailerService.sendMail.mockRejectedValue(
        new Error("Email service unavailable"),
      );

      await expect(
        service.submitContactForm(validContactDto, "192.168.1.1"),
      ).rejects.toThrow(HttpException);

      await expect(
        service.submitContactForm(validContactDto, "192.168.1.1"),
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        }),
      );
    });

    it("should include sender IP in email context", async () => {
      const testIp = "203.0.113.45";
      mockMailerService.sendMail.mockResolvedValue(true);

      await service.submitContactForm(validContactDto, testIp);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            senderIp: testIp,
          }),
        }),
      );
    });

    it("should handle missing IP address gracefully", async () => {
      mockMailerService.sendMail.mockResolvedValue(true);

      await service.submitContactForm(validContactDto, undefined);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            senderIp: "Not available",
          }),
        }),
      );
    });
  });
});
