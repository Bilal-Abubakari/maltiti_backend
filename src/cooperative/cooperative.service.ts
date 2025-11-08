import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cooperative } from "../entities/Cooperative.entity";
import { DeleteResult, Repository } from "typeorm";
import { CooperativeMember } from "../entities/CooperativeMember.entity";
import { AddCooperativeDto } from "../dto/addCooperative.dto";
import { EditCooperativeDto } from "../dto/editCooperative.dto";
import { AddCooperativeMemberDto } from "../dto/addCooperativeMember.dto";
import { UploadService } from "../upload/upload.service";
import { EditCooperativeMemberDto } from "../dto/editCooperativeMember.dto";
import {
  cooperativeMembersPagination,
  cooperativesPagination,
} from "../interfaces/general";

@Injectable()
export class CooperativeService {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    @InjectRepository(CooperativeMember)
    private readonly cooperativeMemberRepository: Repository<CooperativeMember>,
    private uploadService: UploadService,
  ) {}

  public async createCooperative(
    cooperativeInfo: AddCooperativeDto,
  ): Promise<Cooperative> {
    const cooperative = new Cooperative();

    if (await this.findCooperativeByName(cooperativeInfo.name))
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: "Cooperative with name already exists",
        },
        HttpStatus.CONFLICT,
      );

    this.setCooperative(cooperative, cooperativeInfo);

    return this.cooperativeRepository.save(cooperative);
  }

  private setCooperative(
    cooperative: Cooperative,
    cooperativeInfo: AddCooperativeDto,
  ): void {
    cooperative.name = cooperativeInfo.name;
    cooperative.community = cooperativeInfo.community;
    cooperative.minimalShare = cooperativeInfo.minimalShare;
    cooperative.registrationFee = cooperativeInfo.registrationFee;
    cooperative.monthlyFee = cooperativeInfo.monthlyFee;
  }

  public async editCooperative(
    cooperativeInfo: EditCooperativeDto,
  ): Promise<Cooperative> {
    const cooperative = await this.findOneCooperative(cooperativeInfo.id);
    this.setCooperative(cooperative, cooperativeInfo);
    return this.cooperativeRepository.save(cooperative);
  }

  public async deleteCooperative(id: string): Promise<DeleteResult> {
    return this.cooperativeRepository.delete({ id: id });
  }

  public async getAllCooperatives(
    page: number = 1,
    limit: number = 10,
    searchTerm: string = "",
  ): Promise<cooperativesPagination> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.cooperativeRepository
      .createQueryBuilder("cooperative")
      .skip(skip)
      .take(limit);

    if (searchTerm) {
      queryBuilder.where("cooperative.name LIKE :searchTerm", {
        searchTerm: `%${searchTerm}%`,
      });
    }

    const [cooperatives, totalItems] = await queryBuilder.getManyAndCount();

    return {
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      cooperatives,
    };
  }

  public async findOneCooperative(id: string): Promise<Cooperative> {
    return this.cooperativeRepository.findOneBy({ id: id });
  }

  public async createCooperativeMember(
    memberInfo: AddCooperativeMemberDto,
    image: Express.Multer.File,
  ): Promise<CooperativeMember> {
    const member = new CooperativeMember();
    await this.setMember(member, memberInfo, image);
    return this.cooperativeMemberRepository.save(member);
  }

  public async setMember(
    member: CooperativeMember,
    memberInfo: AddCooperativeMemberDto,
    image: Express.Multer.File,
  ): Promise<void> {
    member.name = memberInfo.name;
    member.community = memberInfo.community;
    member.cooperative = memberInfo.cooperative;
    member.dob = memberInfo.dob;
    member.crops = memberInfo.crops;
    member.district = memberInfo.district;
    member.education = memberInfo.education;
    member.farmSize = memberInfo.farmSize;
    member.gpsAddress = memberInfo.gpsAddress;
    member.houseNumber = memberInfo.houseNumber;
    member.idNumber = memberInfo.idNumber;
    member.idType = memberInfo.idType;
    member.occupation = memberInfo.occupation;
    member.phoneNumber = memberInfo.phoneNumber;
    member.region = memberInfo.region;
    member.secondaryOccupation = memberInfo.secondaryOccupation;
    if (this.isURL(memberInfo.image)) {
      member.image = memberInfo.image;
    } else {
      await this.uploadService.uploadImage(image).then(url => {
        member.image = url;
      });
    }
  }

  private isURL(data: string): boolean {
    // Regular expression for a simple URL pattern
    const urlPattern =
      /^(https?:\/\/)?([\w-]+(\.[\w-]+)+\/?|localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/\S*)?$/;

    // Test the provided string against the pattern
    return urlPattern.test(data);
  }

  public async deleteMember(id: string): Promise<DeleteResult> {
    return this.cooperativeMemberRepository.delete({ id: id });
  }

  public async getAllMembers(
    page: number = 1,
    limit: number = 10,
    searchTerm: string = "",
  ): Promise<cooperativeMembersPagination> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.cooperativeMemberRepository
      .createQueryBuilder("cooperativeMember")
      .leftJoinAndSelect("cooperativeMember.cooperative", "cooperative") // Perform a left join with Cooperative entity
      .skip(skip)
      .take(limit);

    if (searchTerm) {
      queryBuilder.where("cooperativeMember.name LIKE :searchTerm", {
        searchTerm: `%${searchTerm}%`,
      });
    }

    const [members, totalItems] = await queryBuilder.getManyAndCount();

    return {
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      members: members,
    };
  }

  public async findOneMember(id: string): Promise<CooperativeMember> {
    return await this.cooperativeMemberRepository
      .createQueryBuilder("cooperativeMember")
      .where("cooperativeMember.id = :id", { id })
      .leftJoinAndSelect("cooperativeMember.cooperative", "cooperative") // Load the cooperative relation
      .getOne();
  }

  public async findCooperativeByName(name: string): Promise<Cooperative> {
    return this.cooperativeRepository.findOneBy({ name });
  }

  public async findAllMembersByCooperativeId(
    cooperativeId: string,
  ): Promise<CooperativeMember[]> {
    return await this.cooperativeMemberRepository
      .createQueryBuilder("cooperativeMember")
      .leftJoinAndSelect("cooperativeMember.cooperative", "cooperative")
      .where("cooperative.id = :cooperativeId", { cooperativeId })
      .getMany();
  }

  public async editMember(
    memberInfo: EditCooperativeMemberDto,
    image: Express.Multer.File,
  ): Promise<CooperativeMember> {
    const member = await this.findOneMember(memberInfo.id);
    await this.setMember(member, memberInfo, image);

    return this.cooperativeMemberRepository.save(member);
  }
}
