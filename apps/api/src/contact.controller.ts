import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { Post } from '@nestjs/common';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { ContactService } from './contact.service';

class ContactDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 200)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 5000)
  message!: string;
}

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit a contact message' })
  async submit(@Body() body: ContactDto) {
    return this.contactService.submit(body);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'List all contact messages (admin)' })
  async listAll() {
    return this.contactService.listAll();
  }

  @Patch('admin/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Mark contact message resolved (admin)' })
  async resolve(@Param('id') id: string, @AuthUser() admin: { id: string }) {
    return this.contactService.resolve(id, admin.id);
  }
}
