import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    Headers,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { CasesService } from './cases.service';
import { ApiResponse, CaseStatus } from '@protecliter/shared-types';

@Controller('cases')
export class CasesController {
    constructor(private casesService: CasesService) { }

    @Get()
    async findAll(
        @Headers('x-tenant-id') tenantId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('status') status?: CaseStatus,
        @Query('analystId') analystId?: string,
    ): Promise<ApiResponse> {
        const result = await this.casesService.findAll(tenantId, { page, limit, status, analystId });
        return { success: true, data: result.data, meta: result.meta };
    }

    @Get('stats')
    async getStats(@Headers('x-tenant-id') tenantId: string): Promise<ApiResponse> {
        const stats = await this.casesService.getStats(tenantId);
        return { success: true, data: stats };
    }

    @Get(':id')
    async findById(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
    ): Promise<ApiResponse> {
        const caseRecord = await this.casesService.findById(id, tenantId);
        return { success: true, data: caseRecord };
    }

    @Patch(':id/assign')
    async assignAnalyst(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
        @Body('analystId') analystId: string,
    ): Promise<ApiResponse> {
        const caseRecord = await this.casesService.assignAnalyst(id, tenantId, analystId);
        return { success: true, data: caseRecord };
    }

    @Patch(':id/status')
    async updateStatus(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
        @Body('status') status: CaseStatus,
        @Body('notes') notes?: string,
    ): Promise<ApiResponse> {
        const caseRecord = await this.casesService.updateStatus(id, tenantId, status, notes);
        return { success: true, data: caseRecord };
    }

    @Post(':id/comments')
    async addComment(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Param('id') id: string,
        @Body('comment') comment: string,
    ): Promise<ApiResponse> {
        const caseRecord = await this.casesService.addComment(id, tenantId, userId, comment);
        return { success: true, data: caseRecord };
    }
}
