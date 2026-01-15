import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { PrismaService } from './prisma/prisma.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { MfaService } from './auth/mfa.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
            signOptions: {
                expiresIn: process.env.JWT_EXPIRES_IN || '15m',
            },
        }),
    ],
    controllers: [AuthController, UsersController],
    providers: [AuthService, UsersService, MfaService, PrismaService, JwtStrategy],
})
export class AppModule { }
