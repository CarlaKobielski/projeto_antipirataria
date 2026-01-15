import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from '../auth/dto/auth.dto';
import { UserRole } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('auth-service');

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll(options: {
        page?: number;
        limit?: number;
        tenantId?: string;
        role?: UserRole;
    }) {
        const { page = 1, limit = 20, tenantId, role } = options;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (tenantId) where.tenantId = tenantId;
        if (role) where.role = role;

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    role: true,
                    status: true,
                    tenantId: true,
                    mfaEnabled: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: users,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                status: true,
                tenantId: true,
                mfaEnabled: true,
                emailVerified: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        plan: true,
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async create(dto: CreateUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await argon2.hash(dto.password);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                name: dto.name,
                phone: dto.phone,
                role: dto.role,
                tenantId: dto.tenantId,
                status: 'ACTIVE',
                emailVerified: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                tenantId: true,
                createdAt: true,
            },
        });

        logger.info(`User created by admin: ${user.email}`);

        return user;
    }

    async update(id: string, dto: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const updated = await this.prisma.user.update({
            where: { id },
            data: dto,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                status: true,
                tenantId: true,
                mfaEnabled: true,
                updatedAt: true,
            },
        });

        logger.info(`User updated: ${updated.email}`);

        return updated;
    }

    async delete(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.prisma.user.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });

        logger.info(`User deactivated: ${user.email}`);

        return { message: 'User deactivated successfully' };
    }
}
