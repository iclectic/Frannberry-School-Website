import { IsString, IsOptional, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssessmentType } from '@prisma/client';

export class CreateResultDto {
  @ApiProperty()
  @IsUUID()
  studentId: string;

  @ApiProperty()
  @IsUUID()
  subjectId: string;

  @ApiProperty()
  @IsUUID()
  termId: string;

  @ApiProperty({ enum: AssessmentType })
  @IsEnum(AssessmentType)
  assessmentType: AssessmentType;

  @ApiProperty({ example: 78 })
  @IsNumber()
  score: number;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @ApiProperty({ required: false, example: 'Good effort. Needs improvement in algebra.' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateResultDto {
  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
