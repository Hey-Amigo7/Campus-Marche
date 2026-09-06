import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional,
  IsString, Length, Max, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { MessageService } from './message.service';

enum MessageTypeEnum {
  TEXT           = 'TEXT',
  IMAGE          = 'IMAGE',
  FILE           = 'FILE',
  AUDIO          = 'AUDIO',
  LOCATION       = 'LOCATION',
  LIVE_LOCATION  = 'LIVE_LOCATION',
  VIDEO_CALL     = 'VIDEO_CALL',
}

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyToId?: string;
}

class SendRichMessageDto {
  @ApiProperty({ enum: MessageTypeEnum })
  @IsEnum(MessageTypeEnum)
  type!: MessageTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90) @Max(90)
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180) @Max(180)
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  liveUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  viewOnce?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyToId?: string;
}

class UpdateLiveLocationDto {
  @ApiProperty()
  @IsNumber()
  @Min(-90) @Max(90)
  @Type(() => Number)
  latitude!: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180) @Max(180)
  @Type(() => Number)
  longitude!: number;
}

class EditMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  content!: string;
}

class ReactDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  emoji!: string;
}

class ForwardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetConversationId!: string;
}

class ConvPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

class DeleteMessageDto {
  @ApiProperty()
  @IsIn(['me', 'everyone'])
  mode!: 'me' | 'everyone';
}

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MessageController {
  constructor(private messageService: MessageService) {}

  // ── Conversations ──────────────────────────────────────────────────────────

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

  @Patch('conversations/:id/preferences')
  @ApiOperation({ summary: 'Set mute/pin/archive for a conversation' })
  setConvPreference(
    @Param('id') id: string,
    @Body() body: ConvPreferenceDto,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.setConvPreference(user.id, id, body);
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation (cursor-based or skip)' })
  @ApiQuery({ name: 'before', required: false, description: 'ISO datetime cursor — load messages older than this' })
  @ApiQuery({ name: 'take',   required: false })
  @ApiQuery({ name: 'skip',   required: false })
  getMessages(
    @Param('id') id: string,
    @AuthUser() user: { id: string },
    @Query('before') before?: string,
    @Query('skip')   skip?:   string,
    @Query('take')   take?:   string,
  ) {
    return this.messageService.getMessages(id, user.id, {
      before,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('conversations/:id/messages/search')
  @ApiOperation({ summary: 'Full-text search messages in a conversation' })
  @ApiQuery({ name: 'q', required: true })
  searchMessages(
    @Param('id') id: string,
    @AuthUser() user: { id: string },
    @Query('q') q: string,
  ) {
    return this.messageService.searchMessages(id, user.id, q ?? '');
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a text message in a conversation' })
  sendMessage(
    @Param('id') id: string,
    @Body() body: SendMessageDto,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.sendMessage(id, user.id, body.content, body.replyToId);
  }

  @Post('conversations/:id/messages/rich')
  @ApiOperation({ summary: 'Send a rich message (image, file, audio, location, video call)' })
  sendRichMessage(
    @Param('id') id: string,
    @Body() body: SendRichMessageDto,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.sendRichMessage(id, user.id, {
      ...body,
      liveUntil: body.liveUntil ? new Date(body.liveUntil) : undefined,
    });
  }

  @Patch('conversations/:id/messages/:msgId')
  @ApiOperation({ summary: 'Edit own text message' })
  editMessage(
    @Param('msgId') msgId: string,
    @Body() body: EditMessageDto,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.editMessage(msgId, user.id, body.content);
  }

  @Delete('conversations/:id/messages/:msgId')
  @ApiOperation({ summary: 'Delete a message (for me or for everyone)' })
  deleteMessage(
    @Param('msgId') msgId: string,
    @Body() body: DeleteMessageDto,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.deleteMessage(msgId, user.id, body.mode);
  }

  @Post('conversations/:id/messages/:msgId/react')
  @ApiOperation({ summary: 'Add or change emoji reaction on a message' })
  reactToMessage(
    @Param('msgId') msgId: string,
    @Body() body: ReactDto,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.reactToMessage(msgId, user.id, body.emoji);
  }

  @Delete('conversations/:id/messages/:msgId/react')
  @ApiOperation({ summary: 'Remove your reaction from a message' })
  removeReaction(
    @Param('msgId') msgId: string,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.removeReaction(msgId, user.id);
  }

  @Post('conversations/:id/messages/:msgId/forward')
  @ApiOperation({ summary: 'Forward a message to another conversation' })
  forwardMessage(
    @Param('msgId') msgId: string,
    @Body() body: ForwardDto,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.forwardMessage(msgId, user.id, body.targetConversationId);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark all unread messages in a conversation as read' })
  markConversationRead(@Param('id') id: string, @AuthUser() user: { id: string }) {
    return this.messageService.markConversationRead(id, user.id);
  }

  @Patch('conversations/:id/messages/:msgId/viewed')
  @ApiOperation({ summary: 'Mark a view-once message as viewed' })
  markViewed(
    @Param('msgId') msgId: string,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.markMessageViewed(msgId, user.id);
  }

  @Post('conversations/:id/live-location')
  @ApiOperation({ summary: 'Update live location coordinates' })
  updateLiveLocation(
    @Param('id') id: string,
    @Body() body: UpdateLiveLocationDto,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.updateLiveLocation(id, user.id, body.latitude, body.longitude);
  }
}
