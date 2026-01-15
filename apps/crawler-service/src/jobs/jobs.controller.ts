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
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto, TriggerJobDto } from './dto/jobs.dto';
import { ApiResponse } from '@protecliter/shared-types';

@Controller('monitoring-jobs')
export class JobsController {
    constructor(private jobsService: JobsService) { }

    @Post()
    async create(
        @Headers('x-tenant-id') tenantId: string,
        @Body() dto: CreateJobDto,
    ): Promise<ApiResponse> {
        const job = await this.jobsService.create(tenantId, dto);
        return { success: true, data: job };
    }

    @Get()
    async findAll(
        @Headers('x-tenant-id') tenantId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('workId') workId?: string,
    ): Promise<ApiResponse> {
        const result = await this.jobsService.findAll(tenantId, { page, limit, workId });
        return { success: true, data: result.data, meta: result.meta };
    }

    @Get('stats')
    async getStats(@Headers('x-tenant-id') tenantId: string): Promise<ApiResponse> {
        const stats = await this.jobsService.getStats(tenantId);
        return { success: true, data: stats };
    }

    @Get(':id')
    async findById(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
    ): Promise<ApiResponse> {
        const job = await this.jobsService.findById(id, tenantId);
        return { success: true, data: job };
    }

    @Patch(':id')
    async update(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
        @Body() dto: UpdateJobDto,
    ): Promise<ApiResponse> {
        const job = await this.jobsService.update(id, tenantId, dto);
        return { success: true, data: job };
    }

    @Delete(':id')
    async delete(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
    ): Promise<ApiResponse> {
        const result = await this.jobsService.delete(id, tenantId);
        return { success: true, data: result };
    }

    @Post(':id/trigger')
    async trigger(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
        @Body() dto: TriggerJobDto,
    ): Promise<ApiResponse> {
        const result = await this.jobsService.triggerJob(id, tenantId, dto.specificQueries);
        return { success: true, data: result };
    }
}
