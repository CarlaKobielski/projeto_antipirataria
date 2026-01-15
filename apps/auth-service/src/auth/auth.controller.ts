import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import {
    RegisterDto,
    LoginDto,
    RefreshTokenDto,
    ChangePasswordDto,
    VerifyMfaDto,
} from './dto/auth.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApiResponse } from '@protecliter/shared-types';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() dto: RegisterDto): Promise<ApiResponse> {
        const result = await this.authService.register(dto);
        return {
            success: true,
            data: result,
        };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto): Promise<ApiResponse> {
        const result = await this.authService.login(dto);
        return {
            success: true,
            data: result,
        };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshTokens(@Body() dto: RefreshTokenDto): Promise<ApiResponse> {
        const tokens = await this.authService.refreshTokens(dto);
        return {
            success: true,
            data: tokens,
        };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Body() dto: RefreshTokenDto): Promise<ApiResponse> {
        await this.authService.logout(dto.refreshToken);
        return {
            success: true,
            data: { message: 'Logged out successfully' },
        };
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    async getProfile(@CurrentUser() user: any): Promise<ApiResponse> {
        return {
            success: true,
            data: user,
        };
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @CurrentUser('userId') userId: string,
        @Body() dto: ChangePasswordDto,
    ): Promise<ApiResponse> {
        await this.authService.changePassword(userId, dto);
        return {
            success: true,
            data: { message: 'Password changed successfully' },
        };
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('mfa/setup')
    async setupMfa(@CurrentUser('userId') userId: string): Promise<ApiResponse> {
        const result = await this.authService.setupMfa(userId);
        return {
            success: true,
            data: result,
        };
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('mfa/enable')
    @HttpCode(HttpStatus.OK)
    async enableMfa(
        @CurrentUser('userId') userId: string,
        @Body() dto: VerifyMfaDto,
    ): Promise<ApiResponse> {
        await this.authService.enableMfa(userId, dto.code);
        return {
            success: true,
            data: { message: 'MFA enabled successfully' },
        };
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('mfa/disable')
    @HttpCode(HttpStatus.OK)
    async disableMfa(
        @CurrentUser('userId') userId: string,
        @Body() dto: VerifyMfaDto,
    ): Promise<ApiResponse> {
        await this.authService.disableMfa(userId, dto.code);
        return {
            success: true,
            data: { message: 'MFA disabled successfully' },
        };
    }
}
