import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { MessageService } from './message.service';

class StartConversationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;
}

class SendMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  content!: string;
}

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for the authenticated user' })
  getConversations(@AuthUser() user: { id: string }) {
    return this.messageService.getConversations(user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start or retrieve a conversation with another user' })
  startConversation(@Body() body: StartConversationDto, @AuthUser() user: { id: string }) {
    return this.messageService.getOrCreateConversation(user.id, body.recipientId, body.productId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  getMessages(
    @Param('id') id: string,
    @AuthUser() user: { id: string },
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.messageService.getMessages(id, user.id, {
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  sendMessage(
    @Param('id') id: string,
    @Body() body: SendMessageDto,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.sendMessage(id, user.id, body.content);
  }
}
