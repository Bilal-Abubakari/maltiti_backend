import { Injectable } from "@nestjs/common";
import { In, Repository } from "typeorm";
import { Ingredient } from "../../entities/Ingredient.entity";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class IngredientsService {
  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientsRepository: Repository<Ingredient>,
  ) {}

  public findByIds(ids: string[]): Promise<Ingredient[]> {
    return this.ingredientsRepository.findBy({ id: In(ids) });
  }
}
