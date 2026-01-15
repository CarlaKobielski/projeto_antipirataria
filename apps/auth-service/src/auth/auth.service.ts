import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { MfaService } from './mfa.service';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';
import { AuthTokens, JwtPayload, UserRole } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('auth-service');

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private mfaService: MfaService,
    ) { }

    async register(dto: RegisterDto): Promise<{ user: any; tokens: AuthTokens }> {
        // Check if email already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        // Hash password
        const passwordHash = await argon2.hash(dto.password);

        // Create tenant if tenantName provided (for new clients)
        let tenantId: string | undefined;
        if (dto.tenantName) {
            const tenant = await this.prisma.tenant.create({
                data: {
                    name: dto.tenantName,
                    cnpj: dto.cnpj,
                    email: dto.email,
                },
            });
            tenantId = tenant.id;
        }

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                name: dto.name,
                phone: dto.phone,
                role: tenantId ? 'CLIENT' : 'CLIENT',
                tenantId,
                status: 'ACTIVE', // For MVP, skip email verification
                emailVerified: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                tenantId: true,
                mfaEnabled: true,
                createdAt: true,
            },
        });

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole, user.tenantId ?? undefined);

        logger.info(`User registered: ${user.email}`);

        return { user, tokens };
    }

    async login(dto: LoginDto): Promise<{ user: any; tokens: AuthTokens; requiresMfa?: boolean }> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException('Account is not active');
        }

        // Verify password
        const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check MFA
        if (user.mfaEnabled) {
            if (!dto.mfaCode) {
                return {
                    user: { id: user.id, email: user.email },
                    tokens: { accessToken: '', refreshToken: '', expiresIn: 0 },
                    requiresMfa: true,
                };
            }

            const isValidMfa = this.mfaService.verifyToken(user.mfaSecret!, dto.mfaCode);
            if (!isValidMfa) {
                throw new UnauthorizedException('Invalid MFA code');
            }
        }

        // Update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole, user.tenantId ?? undefined);

        logger.info(`User logged in: ${user.email}`);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                mfaEnabled: user.mfaEnabled,
            },
            tokens,
        };
    }

    async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokens> {
        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { token: dto.refreshToken },
        });

        if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: storedToken.userId },
        });

        if (!user || user.status !== 'ACTIVE') {
            throw new UnauthorizedException('User not found or inactive');
        }

        // Revoke old refresh token
        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
        });

        // Generate new tokens
        return this.generateTokens(user.id, user.email, user.role as UserRole, user.tenantId ?? undefined);
    }

    async logout(refreshToken: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { token: refreshToken },
            data: { revokedAt: new Date() },
        });
    }

    async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const isPasswordValid = await argon2.verify(user.passwordHash, dto.currentPassword);
        if (!isPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        const newPasswordHash = await argon2.hash(dto.newPassword);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });

        // Revoke all refresh tokens
        await this.prisma.refreshToken.updateMany({
            where: { userId },
            data: { revokedAt: new Date() },
        });

        logger.info(`Password changed for user: ${user.email}`);
    }

    async setupMfa(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const { secret, otpauthUrl } = this.mfaService.generateSecret(user.email);
        const qrCodeUrl = await this.mfaService.generateQrCode(otpauthUrl);

        // Store secret temporarily (not enabled yet)
        await this.prisma.user.update({
            where: { id: userId },
            data: { mfaSecret: secret },
        });

        return { secret, qrCodeUrl };
    }

    async enableMfa(userId: string, code: string): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.mfaSecret) {
            throw new BadRequestException('MFA setup not initiated');
        }

        const isValid = this.mfaService.verifyToken(user.mfaSecret, code);
        if (!isValid) {
            throw new BadRequestException('Invalid MFA code');
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { mfaEnabled: true },
        });

        logger.info(`MFA enabled for user: ${user.email}`);
    }

    async disableMfa(userId: string, code: string): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.mfaEnabled) {
            throw new BadRequestException('MFA not enabled');
        }

        const isValid = this.mfaService.verifyToken(user.mfaSecret!, code);
        if (!isValid) {
            throw new BadRequestException('Invalid MFA code');
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { mfaEnabled: false, mfaSecret: null },
        });

        logger.info(`MFA disabled for user: ${user.email}`);
    }

    private async generateTokens(
        userId: string,
        email: string,
        role: UserRole,
        tenantId?: string,
    ): Promise<AuthTokens> {
        const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
            sub: userId,
            email,
            role,
            tenantId,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = uuidv4();

        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await this.prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId,
                expiresAt,
            },
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: 900, // 15 minutes in seconds
        };
    }
}
