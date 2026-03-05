import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessagingService } from './messaging.service';

@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() body: { participantIds: string[]; title?: string },
  ) {
    return this.messagingService.createConversation(userId, body.participantIds, body.title);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  async getConversations(@CurrentUser('id') userId: string) {
    return this.messagingService.getConversations(userId);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagingService.getMessages(userId, conversationId, page, limit);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message (REST fallback)' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { content: string },
  ) {
    return this.messagingService.sendMessage(userId, conversationId, body.content);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete (soft) a message' })
  async deleteMessage(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.deleteMessage(userId, messageId, role === 'ADMIN');
  }
}
