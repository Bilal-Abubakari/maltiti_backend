import { Test, TestingModule } from "@nestjs/testing";
import { CooperativeService } from "./cooperative.service";

describe("CooperativeService", () => {
  let service: CooperativeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CooperativeService],
    }).compile();

    service = module.get<CooperativeService>(CooperativeService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
