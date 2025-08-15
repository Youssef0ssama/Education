import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async getUserNotifications(userId: number, filters: any = {}) {
    const { isRead, limit = 20 } = filters;

    let queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
    }

    return queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async markAsRead(userId: number, notificationId: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    await this.notificationRepository.save(notification);

    return { message: 'Notification marked as read' };
  }

  async createNotification(notificationData: Partial<Notification>) {
    const notification = this.notificationRepository.create(notificationData);
    return this.notificationRepository.save(notification);
  }
}