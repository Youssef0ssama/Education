import { Controller, Get, Post, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Response } from 'express';

@ApiTags('Content')
@Controller('content')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all content' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course ID' })
  @ApiResponse({ status: 200, description: 'Content retrieved successfully' })
  async findAll(@Query('courseId') courseId?: number) {
    const content = courseId 
      ? await this.contentService.findByCourse(courseId)
      : await this.contentService.findAll();
    return { content };
  }

  @Get('courses/:courseId/materials')
  @ApiOperation({ summary: 'Get course materials' })
  @ApiResponse({ status: 200, description: 'Materials retrieved successfully' })
  async getCourseMaterials(
    @Param('courseId') courseId: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.contentService.getCourseMaterials(+courseId, { type, search });
  }

  @Get('courses/:courseId/folders')
  @ApiOperation({ summary: 'Get course folders' })
  @ApiResponse({ status: 200, description: 'Folders retrieved successfully' })
  async getCourseFolders(@Param('courseId') courseId: string) {
    return this.contentService.getCourseFolders(+courseId);
  }

  @Get('courses/:courseId/modules')
  @ApiOperation({ summary: 'Get course modules' })
  @ApiResponse({ status: 200, description: 'Modules retrieved successfully' })
  async getCourseModules(@Param('courseId') courseId: string) {
    return this.contentService.getCourseModules(+courseId);
  }

  @Get('courses/:courseId/modules/:moduleId')
  @ApiOperation({ summary: 'Get specific module content' })
  @ApiResponse({ status: 200, description: 'Module content retrieved successfully' })
  async getModuleContent(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.contentService.getModuleContent(+courseId, +moduleId);
  }

  @Get('courses/:courseId/materials/:materialId/download')
  @ApiOperation({ summary: 'Download material file' })
  @ApiResponse({ status: 200, description: 'File download initiated' })
  async downloadMaterial(
    @Param('courseId') courseId: string,
    @Param('materialId') materialId: string,
    @CurrentUser('id') userId: number,
    @Res() res: Response,
  ) {
    return this.contentService.downloadMaterial(+courseId, +materialId, userId, res);
  }

  @Get('courses/:courseId/materials/:materialId/preview')
  @ApiOperation({ summary: 'Preview material file' })
  @ApiResponse({ status: 200, description: 'File preview' })
  async previewMaterial(
    @Param('courseId') courseId: string,
    @Param('materialId') materialId: string,
    @CurrentUser('id') userId: number,
    @Res() res: Response,
  ) {
    return this.contentService.previewMaterial(+courseId, +materialId, userId, res);
  }

  @Post('courses/:courseId/materials/:materialId/view')
  @ApiOperation({ summary: 'Log material view' })
  @ApiResponse({ status: 200, description: 'View logged successfully' })
  async logMaterialView(
    @Param('courseId') courseId: string,
    @Param('materialId') materialId: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.contentService.logMaterialView(+courseId, +materialId, userId);
  }

  @Post('courses/:courseId/materials/:materialId/complete')
  @ApiOperation({ summary: 'Mark material as completed' })
  @ApiResponse({ status: 200, description: 'Material marked as completed' })
  async completeMaterial(
    @Param('courseId') courseId: string,
    @Param('materialId') materialId: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.contentService.completeMaterial(+courseId, +materialId, userId);
  }
}