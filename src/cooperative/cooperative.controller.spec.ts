import { Test, TestingModule } from "@nestjs/testing";
import { CooperativeController } from "./cooperative.controller";

describe("CooperativeController", () => {
  let controller: CooperativeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CooperativeController],
    }).compile();

    controller = module.get<CooperativeController>(CooperativeController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
