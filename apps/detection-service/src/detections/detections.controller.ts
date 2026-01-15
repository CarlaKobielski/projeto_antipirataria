import {
    Controller,
    Get,
    Patch,
    Post,
    Param,
    Query,
    Body,
    Headers,
    ParseIntPipe,
    ParseFloatPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { DetectionsService } from './detections.service';
import { ApiResponse, DetectionStatus } from '@protecliter/shared-types';

@Controller('detections')
export class DetectionsController {
    constructor(private detectionsService: DetectionsService) { }

    @Get()
    async findAll(
        @Headers('x-tenant-id') tenantId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('status') status?: DetectionStatus,
        @Query('workId') workId?: string,
        @Query('minScore', new DefaultValuePipe(0), ParseFloatPipe) minScore?: number,
    ): Promise<ApiResponse> {
        const result = await this.detectionsService.findAll(tenantId, {
            page,
            limit,
            status,
            workId,
            minScore,
        });
        return { success: true, data: result.data, meta: result.meta };
    }

    @Get('stats')
    async getStats(@Headers('x-tenant-id') tenantId: string): Promise<ApiResponse> {
        const stats = await this.detectionsService.getStats(tenantId);
        return { success: true, data: stats };
    }

    @Get(':id')
    async findById(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
    ): Promise<ApiResponse> {
        const detection = await this.detectionsService.findById(id, tenantId);
        return { success: true, data: detection };
    }

    @Patch(':id/status')
    async updateStatus(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
        @Body('status') status: DetectionStatus,
    ): Promise<ApiResponse> {
        const detection = await this.detectionsService.updateStatus(id, tenantId, status);
        return { success: true, data: detection };
    }

    @Post(':id/feedback')
    async addFeedback(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Param('id') id: string,
        @Body('label') label: string,
        @Body('comment') comment?: string,
    ): Promise<ApiResponse> {
        const feedback = await this.detectionsService.addFeedback(id, tenantId, userId, label, comment);
        return { success: true, data: feedback };
    }
}
