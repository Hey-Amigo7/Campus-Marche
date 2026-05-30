import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { MessageService } from './message.service';

enum MessageTypeEnum {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  LOCATION = 'LOCATION',
  LIVE_LOCATION = 'LIVE_LOCATION',
  VIDEO_CALL = 'VIDEO_CALL',
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
  @ApiOperation({ summary: 'Send a text message in a conversation' })
  sendMessage(
    @Param('id') id: string,
    @Body() body: SendMessageDto,
    @AuthUser() user: { id: string },
  ) {
    return this.messageService.sendMessage(id, user.id, body.content);
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
