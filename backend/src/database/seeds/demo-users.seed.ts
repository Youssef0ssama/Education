import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

export async function seedDemoUsers(dataSource: DataSource) {
    const userRepository = dataSource.getRepository(User);

    // Check if users already exist
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
        console.log('Demo users already exist, skipping seed...');
        return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password123', saltRounds);

    const demoUsers = [
        {
            name: 'Admin User',
            email: 'admin@education.com',
            passwordHash: hashedPassword,
            role: UserRole.ADMIN,
            phone: '+1-555-0001',
            isActive: true,
        },
        {
            name: 'Jane Teacher',
            email: 'jane.teacher@education.com',
            passwordHash: hashedPassword,
            role: UserRole.TEACHER,
            phone: '+1-555-0002',
            isActive: true,
        },
        {
            name: 'John Student',
            email: 'john.student@education.com',
            passwordHash: hashedPassword,
            role: UserRole.STUDENT,
            phone: '+1-555-0003',
            dateOfBirth: new Date('2000-05-15'),
            isActive: true,
        },
        {
            name: 'Mary Parent',
            email: 'mary.parent@education.com',
            passwordHash: hashedPassword,
            role: UserRole.PARENT,
            phone: '+1-555-0004',
            isActive: true,
        },
    ];

    try {
        const users = userRepository.create(demoUsers);
        await userRepository.save(users);

        console.log('✅ Demo users created successfully:');
        demoUsers.forEach(user => {
            console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
        });
        console.log('   - Password for all users: password123');
    } catch (error) {
        console.error('❌ Error creating demo users:', error);
        throw error;
    }
}