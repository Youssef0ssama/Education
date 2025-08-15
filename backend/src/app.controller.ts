import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get API information' })
  @ApiResponse({
    status: 200,
    description: 'API information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        version: { type: 'string' },
        documentation: { type: 'string' },
        health: { type: 'string' },
        endpoints: {
          type: 'object',
          properties: {
            auth: { type: 'string' },
            users: { type: 'string' },
            courses: { type: 'string' },
            students: { type: 'string' },
            teachers: { type: 'string' },
            admin: { type: 'string' },
            assignments: { type: 'string' },
            sessions: { type: 'string' },
            content: { type: 'string' },
            analytics: { type: 'string' },
            notifications: { type: 'string' },
          },
        },
      },
    },
  })
  getApiInfo() {
    return this.appService.getApiInfo();
  }
}