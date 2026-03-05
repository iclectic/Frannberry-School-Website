import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssignmentStatus } from '@prisma/client';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'Year 7 Maths Homework – Fractions' })
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsUUID()
  classId: string;

  @ApiProperty()
  @IsUUID()
  subjectId: string;

  @ApiProperty()
  @IsUUID()
  termId: string;

  @ApiProperty({ example: '2026-04-15T23:59:00.000Z' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @ApiProperty({ enum: AssignmentStatus, required: false })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}

export class SubmitAssignmentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;
}

export class GradeSubmissionDto {
  @ApiProperty({ example: 85 })
  @IsNumber()
  score: number;

  @ApiProperty({ required: false, example: 'Well done – excellent working shown.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
