import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import {
  cooperativeMembersPagination,
  cooperativesPagination,
  IResponse,
} from '../interfaces/general';
import { AddCooperativeDto } from '../dto/addCooperative.dto';
import { EditCooperativeDto } from '../dto/editCooperative.dto';
import { AddCooperativeMemberDto } from '../dto/addCooperativeMember.dto';
import { EditCooperativeMemberDto } from '../dto/editCooperativeMember.dto';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Cooperative } from '../entities/Cooperative.entity';
import { DeleteResult } from 'typeorm';
import { CooperativeMember } from '../entities/CooperativeMember.entity';

@UseGuards(JwtAuthGuard)
@Controller('cooperative')
export class CooperativeController {
  constructor(private cooperativeService: CooperativeService) {}

  @Get('cooperatives')
  async getAllCooperatives(): Promise<IResponse<cooperativesPagination>> {
    const cooperatives = await this.cooperativeService.getAllCooperatives();

    return {
      message: 'Cooperatives loaded successfully',
      data: cooperatives,
    };
  }

  @Get('cooperative/:id')
  async getCooperative(
    @Param('id') id: string,
  ): Promise<IResponse<Cooperative>> {
    const cooperative = await this.cooperativeService.findOneCooperative(id);

    return {
      message: 'Cooperative loaded successfully',
      data: cooperative,
    };
  }

  @Post('add-cooperative')
  async addCooperative(
    @Body() cooperativeInfo: AddCooperativeDto,
  ): Promise<IResponse<Cooperative>> {
    const cooperative =
      await this.cooperativeService.createCooperative(cooperativeInfo);

    return {
      message: 'Cooperative created successfully',
      data: cooperative,
    };
  }

  @Patch('edit-cooperative')
  async editCooperative(
    @Body() cooperativeInfo: EditCooperativeDto,
  ): Promise<IResponse<Cooperative>> {
    const cooperative =
      await this.cooperativeService.editCooperative(cooperativeInfo);

    return {
      message: 'Cooperatives edit successfully',
      data: cooperative,
    };
  }

  @Delete('delete-cooperative/:id')
  async deleteCooperative(
    @Param('id') id: string,
  ): Promise<IResponse<DeleteResult>> {
    const deleteResult = await this.cooperativeService.deleteCooperative(id);

    return {
      message: 'Cooperatives deleted successfully',
      data: deleteResult,
    };
  }

  @Get('members')
  async getAllCooperativeMembers(): Promise<
    IResponse<cooperativeMembersPagination>
  > {
    const cooperativeMembers = await this.cooperativeService.getAllMembers();

    return {
      message: 'Cooperative Members loaded successfully',
      data: cooperativeMembers,
    };
  }

  @Get('member/:id')
  async getCooperativeMember(
    @Param('id') id: string,
  ): Promise<IResponse<CooperativeMember>> {
    const cooperativeMember = await this.cooperativeService.findOneMember(id);

    return {
      message: 'Cooperative Member loaded successfully',
      data: cooperativeMember,
    };
  }

  @Get('cooperative-members/:id')
  async getMembersByCooperative(
    @Param('id') id: string,
  ): Promise<IResponse<CooperativeMember[]>> {
    const cooperativeMembers =
      await this.cooperativeService.findAllMembersByCooperativeId(id);

    return {
      message: 'Cooperative Members loaded successfully',
      data: cooperativeMembers,
    };
  }

  @Post('add-member')
  @UseInterceptors(FileInterceptor('image'))
  async addMember(
    @Body() memberInfo: AddCooperativeMemberDto,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<IResponse<CooperativeMember>> {
    const cooperativeMember =
      await this.cooperativeService.createCooperativeMember(memberInfo, image);

    return {
      message: 'Cooperative member created successfully',
      data: cooperativeMember,
    };
  }

  @Patch('edit-member')
  @UseInterceptors(AnyFilesInterceptor())
  async editMember(
    @Body() memberInfo: EditCooperativeMemberDto,
    @UploadedFile(
      new ParseFilePipeBuilder().addMaxSizeValidator({ maxSize: 2048 }).build({
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ): Promise<IResponse<CooperativeMember>> {
    const cooperativeMember = await this.cooperativeService.editMember(
      memberInfo,
      image,
    );

    return {
      message: 'Member edit successfully',
      data: cooperativeMember,
    };
  }

  @Delete('delete-member/:id')
  async deleteMember(
    @Param('id') id: string,
  ): Promise<IResponse<DeleteResult>> {
    const deleteResult = await this.cooperativeService.deleteMember(id);

    return {
      message: 'Member deleted successfully',
      data: deleteResult,
    };
  }
}
