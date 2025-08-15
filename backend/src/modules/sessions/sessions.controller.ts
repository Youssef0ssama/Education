import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all class sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async findAll(
    @Query('courseId') courseId?: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const sessions = await this.sessionsService.findAll({ courseId, status, startDate, endDate });
    return { sessions };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  async findOne(@Param('id') id: string) {
    const session = await this.sessionsService.findOne(+id);
    return { session };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async create(
    @Body() createSessionDto: any,
    @CurrentUser('id') userId: number,
  ) {
    return this.sessionsService.create(createSessionDto, userId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update a session' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateSessionDto: any,
    @CurrentUser('id') userId: number,
  ) {
    return this.sessionsService.update(+id, updateSessionDto, userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete a session' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.sessionsService.remove(+id, userId);
  }

  @Post(':id/attendance/bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update attendance for multiple students' })
  @ApiResponse({ status: 200, description: 'Attendance updated successfully' })
  async updateBulkAttendance(
    @Param('id') sessionId: string,
    @Body() attendanceData: any,
  ) {
    return this.sessionsService.updateBulkAttendance(+sessionId, attendanceData);
  }
}