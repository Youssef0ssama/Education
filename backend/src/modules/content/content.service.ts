import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from './entities/content.entity';
import { Response } from 'express';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) {}

  async findAll(): Promise<Content[]> {
    return this.contentRepository.find({
      relations: ['course'],
      order: { orderIndex: 'ASC' },
    });
  }

  async findByCourse(courseId: number): Promise<Content[]> {
    return this.contentRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' },
    });
  }

  async getCourseMaterials(courseId: number, filters: any = {}) {
    const { type, search } = filters;
    
    let queryBuilder = this.contentRepository
      .createQueryBuilder('content')
      .where('content.courseId = :courseId', { courseId });

    if (type) {
      queryBuilder.andWhere('content.contentType = :type', { type });
    }

    if (search) {
      queryBuilder.andWhere(
        '(content.title ILIKE :search OR content.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const materials = await queryBuilder
      .orderBy('content.orderIndex', 'ASC')
      .getMany();

    return { materials };
  }

  async getCourseFolders(courseId: number) {
    // For now, return a simple folder structure
    // In a real implementation, you might have a separate folders table
    const materials = await this.contentRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' },
    });

    // Group materials by a hypothetical folder field or create default folders
    const folders = [
      {
        id: 1,
        name: 'Lectures',
        materials: materials.filter(m => m.contentType === 'video' || m.contentType === 'text'),
      },
      {
        id: 2,
        name: 'Resources',
        materials: materials.filter(m => m.contentType === 'document'),
      },
      {
        id: 3,
        name: 'Assignments',
        materials: materials.filter(m => m.contentType === 'assignment'),
      },
    ];

    return { folders };
  }

  async getCourseModules(courseId: number) {
    // Group content by modules (using orderIndex to create modules)
    const materials = await this.contentRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' },
    });

    // Create modules based on content grouping
    const modules = [];
    let currentModule = null;
    let moduleId = 1;

    materials.forEach((material, index) => {
      // Create a new module every 5 items or at the start
      if (index % 5 === 0) {
        if (currentModule) {
          modules.push(currentModule);
        }
        currentModule = {
          id: moduleId++,
          title: `Module ${moduleId - 1}`,
          description: `Course module ${moduleId - 1}`,
          materials: [],
        };
      }
      currentModule.materials.push(material);
    });

    if (currentModule) {
      modules.push(currentModule);
    }

    return { modules };
  }

  async getModuleContent(courseId: number, moduleId: number) {
    // Get content for a specific module
    const allMaterials = await this.contentRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' },
    });

    // Calculate which materials belong to this module (5 per module)
    const startIndex = (moduleId - 1) * 5;
    const endIndex = startIndex + 5;
    const moduleMaterials = allMaterials.slice(startIndex, endIndex);

    return {
      module: {
        id: moduleId,
        title: `Module ${moduleId}`,
        description: `Course module ${moduleId}`,
        materials: moduleMaterials,
      },
    };
  }

  async downloadMaterial(courseId: number, materialId: number, userId: number, res: Response) {
    const material = await this.contentRepository.findOne({
      where: { id: materialId, courseId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // In a real implementation, you would:
    // 1. Check if user has access to this course
    // 2. Stream the actual file from storage (S3, local filesystem, etc.)
    // 3. Log the download event

    // For now, return a simple response
    res.json({
      message: 'Download initiated',
      material: {
        id: material.id,
        title: material.title,
        fileUrl: material.fileUrl,
      },
    });
  }

  async previewMaterial(courseId: number, materialId: number, userId: number, res: Response) {
    const material = await this.contentRepository.findOne({
      where: { id: materialId, courseId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // In a real implementation, you would serve the file for preview
    res.json({
      message: 'Preview available',
      material: {
        id: material.id,
        title: material.title,
        contentType: material.contentType,
        fileUrl: material.fileUrl,
      },
    });
  }

  async logMaterialView(courseId: number, materialId: number, userId: number) {
    const material = await this.contentRepository.findOne({
      where: { id: materialId, courseId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // In a real implementation, you would log this view to an analytics table
    return {
      message: 'View logged successfully',
      material: {
        id: material.id,
        title: material.title,
      },
      userId,
      viewedAt: new Date(),
    };
  }

  async completeMaterial(courseId: number, materialId: number, userId: number) {
    const material = await this.contentRepository.findOne({
      where: { id: materialId, courseId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // In a real implementation, you would:
    // 1. Create a completion record in a user_material_progress table
    // 2. Update course progress percentage
    // 3. Check if this completes any requirements

    return {
      message: 'Material marked as completed',
      material: {
        id: material.id,
        title: material.title,
      },
      userId,
      completedAt: new Date(),
    };
  }
}