import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FileStorageService } from './file-storage.service';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FileStorageController {
  constructor(private fileStorageService: FileStorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
    @Body('resultId') resultId?: string,
    @Body('assignmentId') assignmentId?: string,
    @Body('submissionId') submissionId?: string,
    @Body('messageId') messageId?: string,
  ) {
    const uploadResult = await this.fileStorageService.upload(file, folder || 'general');
    const attachment = await this.fileStorageService.createAttachment(uploadResult, {
      resultId,
      assignmentId,
      submissionId,
      messageId,
    });
    return attachment;
  }
}
