import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessagingService } from './messaging.service';

@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Get('contacts')
  @ApiOperation({ summary: 'People the signed-in user may start a conversation with' })
  getContacts(@CurrentUser('id') userId: string) {
    return this.messagingService.getContacts(userId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Open a conversation. The same pair returns the existing thread.' })
  createConversation(
    @CurrentUser('id') userId: string,
    @Body() body: { participantId: string; studentId?: string },
  ) {
    return this.messagingService.createConversation(userId, body.participantId, body.studentId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  getConversations(@CurrentUser('id') userId: string) {
    return this.messagingService.getConversations(userId);
  }

  @Get('conversations/:conversationId/allowance')
  @ApiOperation({ summary: 'Weekly send allowance for this conversation' })
  getAllowance(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.getAllowance(userId, conversationId);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  getMessages(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagingService.getMessages(userId, conversationId, page, limit);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message (REST fallback)' })
  sendMessage(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { content: string },
  ) {
    return this.messagingService.sendMessage(userId, conversationId, body.content);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete (soft) a message. This does not restore a weekly allowance.' })
  deleteMessage(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.deleteMessage(userId, messageId, role === 'ADMIN');
  }
}
