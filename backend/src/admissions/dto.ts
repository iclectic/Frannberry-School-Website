import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateApplicationDto {
  @IsIn(['NURSERY', 'PRIMARY', 'SECONDARY'])
  phase!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  childFirstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  childLastName!: string;

  @IsString()
  dateOfBirth!: string;

  @IsIn(['EYFS', 'KS1', 'KS2', 'KS3', 'KS4', 'KS5'])
  keyStage!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  parentFirstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  parentLastName!: string;

  @IsEmail()
  parentEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  parentPhone?: string;
}

export class EnrolApplicationDto {
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsBoolean()
  createLogin?: boolean;

  @IsOptional()
  @IsEmail()
  loginEmail?: string;
}
