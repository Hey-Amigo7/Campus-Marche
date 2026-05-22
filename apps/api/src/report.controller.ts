import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CreateReportDto } from './dto/report.dto';
import { ReportService } from './report.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a report against a user or product' })
  submit(@Body() dto: CreateReportDto, @AuthUser() user: { id: string }) {
    return this.reportService.submit(user.id, dto);
  }
}
