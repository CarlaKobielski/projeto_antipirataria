import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    Headers,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { TakedownsService } from './takedowns.service';
import { ApiResponse, TakedownPlatform } from '@protecliter/shared-types';

@Controller('takedowns')
export class TakedownsController {
    constructor(private takedownsService: TakedownsService) { }

    @Get('templates')
    async getTemplates(@Query('platform') platform?: TakedownPlatform): Promise<ApiResponse> {
        const templates = this.takedownsService.getAvailableTemplates(platform);
        return { success: true, data: templates };
    }

    @Post()
    async create(
        @Headers('x-tenant-id') tenantId: string,
        @Body('caseId') caseId: string,
        @Body('platform') platform: TakedownPlatform,
        @Body('templateId') templateId: string,
        @Body('additionalData') additionalData?: Record<string, string>,
    ): Promise<ApiResponse> {
        const takedown = await this.takedownsService.create(
            caseId,
            tenantId,
            platform,
            templateId,
            additionalData,
        );
        return { success: true, data: takedown };
    }

    @Get()
    async findAll(
        @Headers('x-tenant-id') tenantId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('status') status?: string,
    ): Promise<ApiResponse> {
        const result = await this.takedownsService.findAll(tenantId, { page, limit, status });
        return { success: true, data: result.data, meta: result.meta };
    }

    @Get(':id')
    async findById(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
    ): Promise<ApiResponse> {
        const takedown = await this.takedownsService.findById(id, tenantId);
        return { success: true, data: takedown };
    }

    @Post(':id/retry')
    async retry(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
    ): Promise<ApiResponse> {
        const result = await this.takedownsService.retry(id, tenantId);
        return { success: true, data: result };
    }
}
