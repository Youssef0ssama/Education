import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
@ApiBearerAuth('JWT-auth')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get('courses')
  @ApiOperation({ summary: "Get teacher's courses" })
  @ApiResponse({
    status: 200,
    description: 'Teacher courses retrieved successfully',
  })
  async getCourses(@CurrentUser('id') teacherId: number) {
    const courses = await this.teachersService.getTeacherCourses(teacherId);
    return { courses };
  }

  @Get('courses/:courseId/students')
  @ApiOperation({ summary: 'Get students enrolled in course' })
  @ApiResponse({
    status: 200,
    description: 'Course students retrieved successfully',
  })
  async getCourseStudents(
    @CurrentUser('id') teacherId: number,
    @Param('courseId') courseId: string,
  ) {
    const students = await this.teachersService.getCourseStudents(teacherId, +courseId);
    return { students };
  }

  @Post('assignments')
  @ApiOperation({ summary: 'Create a new assignment' })
  @ApiResponse({
    status: 201,
    description: 'Assignment created successfully',
  })
  async createAssignment(
    @CurrentUser('id') teacherId: number,
    @Body() assignmentData: any,
  ) {
    const assignment = await this.teachersService.createAssignment(teacherId, assignmentData);
    return {
      message: 'Assignment created successfully',
      assignment,
    };
  }
}