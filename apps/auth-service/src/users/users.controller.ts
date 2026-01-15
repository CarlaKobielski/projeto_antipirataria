import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from '../auth/dto/auth.dto';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiResponse, UserRole } from '@protecliter/shared-types';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('tenantId') tenantId?: string,
        @Query('role') role?: UserRole,
    ): Promise<ApiResponse> {
        const result = await this.usersService.findAll({ page, limit, tenantId, role });
        return {
            success: true,
            data: result.data,
            meta: result.meta,
        };
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    async findById(@Param('id') id: string): Promise<ApiResponse> {
        const user = await this.usersService.findById(id);
        return {
            success: true,
            data: user,
        };
    }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    async create(@Body() dto: CreateUserDto): Promise<ApiResponse> {
        const user = await this.usersService.create(dto);
        return {
            success: true,
            data: user,
        };
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
    ): Promise<ApiResponse> {
        const user = await this.usersService.update(id, dto);
        return {
            success: true,
            data: user,
        };
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN)
    async delete(@Param('id') id: string): Promise<ApiResponse> {
        const result = await this.usersService.delete(id);
        return {
            success: true,
            data: result,
        };
    }
}
