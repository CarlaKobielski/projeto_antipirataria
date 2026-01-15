import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    Headers,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { WorksService } from './works.service';
import { CreateWorkDto, ApiResponse } from '@protecliter/shared-types';

@Controller('works')
export class WorksController {
    constructor(private worksService: WorksService) { }

    @Post()
    async create(
        @Headers('x-tenant-id') tenantId: string,
        @Body() dto: CreateWorkDto,
    ): Promise<ApiResponse> {
        const work = await this.worksService.create(tenantId, dto);
        return { success: true, data: work };
    }

    @Get()
    async findAll(
        @Headers('x-tenant-id') tenantId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('search') search?: string,
    ): Promise<ApiResponse> {
        const result = await this.worksService.findAll(tenantId, { page, limit, search });
        return { success: true, data: result.data, meta: result.meta };
    }

    @Get('stats')
    async getStats(@Headers('x-tenant-id') tenantId: string): Promise<ApiResponse> {
        const stats = await this.worksService.getStats(tenantId);
        return { success: true, data: stats };
    }

    @Get(':id')
    async findById(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
    ): Promise<ApiResponse> {
        const work = await this.worksService.findById(id, tenantId);
        return { success: true, data: work };
    }

    @Patch(':id')
    async update(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
        @Body() dto: CreateWorkDto,
    ): Promise<ApiResponse> {
        const work = await this.worksService.update(id, tenantId, dto);
        return { success: true, data: work };
    }

    @Delete(':id')
    async delete(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
    ): Promise<ApiResponse> {
        const result = await this.worksService.delete(id, tenantId);
        return { success: true, data: result };
    }
}
