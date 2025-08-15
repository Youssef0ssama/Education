import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  @ApiQuery({ name: 'search', required: false, description: 'Search courses by title or description' })
  @ApiQuery({ name: 'instructorId', required: false, description: 'Filter by instructor ID' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved successfully',
  })
  async findAll(
    @Query('search') search?: string,
    @Query('instructorId') instructorId?: number,
    @Query('isActive') isActive?: boolean,
    @Query('limit') limit?: number,
  ) {
    const courses = await this.coursesService.findAll({ search, instructorId, isActive, limit });
    return { courses };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({
    status: 200,
    description: 'Course retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async findOne(@Param('id') id: string) {
    const course = await this.coursesService.findOne(+id);
    return { course };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({
    status: 201,
    description: 'Course created successfully',
  })
  async create(@Body() createCourseDto: any) {
    const course = await this.coursesService.create(createCourseDto);
    return {
      message: 'Course created successfully',
      course,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a course' })
  @ApiResponse({
    status: 200,
    description: 'Course updated successfully',
  })
  async update(@Param('id') id: string, @Body() updateCourseDto: any) {
    const course = await this.coursesService.update(+id, updateCourseDto);
    return {
      message: 'Course updated successfully',
      course,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a course' })
  @ApiResponse({
    status: 200,
    description: 'Course deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.coursesService.remove(+id);
    return {
      message: 'Course deleted successfully',
    };
  }

  @Post(':courseId/enroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({
    status: 201,
    description: 'Successfully enrolled in course',
  })
  async enrollInCourse(
    @Param('courseId') courseId: string,
    @CurrentUser('id') studentId: number,
  ) {
    return this.coursesService.enrollStudent(+courseId, studentId);
  }
}