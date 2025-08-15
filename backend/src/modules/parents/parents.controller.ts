import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ParentsService } from './parents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Parents')
@Controller('parent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARENT)
@ApiBearerAuth('JWT-auth')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) { }

  @Get('children')
  @ApiOperation({ summary: "Get parent's children" })
  @ApiResponse({
    status: 200,
    description: 'Children retrieved successfully',
  })
  async getChildren(@CurrentUser('id') parentId: number) {
    return this.parentsService.getChildren(parentId);
  }

  @Get('schedule')
  @ApiOperation({ summary: "Get children's schedule" })
  @ApiQuery({ name: 'childId', required: false, description: 'Filter by specific child' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiResponse({
    status: 200,
    description: 'Schedule retrieved successfully',
  })
  async getSchedule(
    @CurrentUser('id') parentId: number,
    @Query('childId') childId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.parentsService.getSchedule(parentId, { childId, startDate, endDate });
  }

  @Get('messages')
  @ApiOperation({ summary: "Get parent's messages" })
  @ApiQuery({ name: 'childId', required: false, description: 'Filter by specific child' })
  @ApiQuery({ name: 'unreadOnly', required: false, description: 'Show only unread messages' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
  })
  async getMessages(
    @CurrentUser('id') parentId: number,
    @Query('childId') childId?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.parentsService.getMessages(parentId, { childId, unreadOnly });
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
  })
  async sendMessage(
    @CurrentUser('id') parentId: number,
    @Body() messageData: any,
  ) {
    return this.parentsService.sendMessage(parentId, messageData);
  }

  @Get('teachers')
  @ApiOperation({ summary: "Get children's teachers" })
  @ApiQuery({ name: 'childId', required: false, description: 'Filter by specific child' })
  @ApiResponse({
    status: 200,
    description: 'Teachers retrieved successfully',
  })
  async getTeachers(
    @CurrentUser('id') parentId: number,
    @Query('childId') childId?: number,
  ) {
    return this.parentsService.getTeachers(parentId, { childId });
  }

  @Get('children/:childId/progress')
  @ApiOperation({ summary: "Get specific child's progress" })
  @ApiResponse({
    status: 200,
    description: 'Child progress retrieved successfully',
  })
  async getChildProgress(
    @CurrentUser('id') parentId: number,
    @Param('childId') childId: string,
  ) {
    return this.parentsService.getChildProgress(parentId, +childId);
  }
}