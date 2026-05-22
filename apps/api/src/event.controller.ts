import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventService } from './event.service';

@ApiTags('events')
@Controller('events')
export class EventController {
  constructor(private eventService: EventService) {}

  @Get()
  @ApiOperation({ summary: 'Get campus events and business opportunity updates' })
  getUpcoming() {
    return this.eventService.getUpcoming();
  }
}
