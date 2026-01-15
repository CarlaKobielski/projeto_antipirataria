import { Controller, Get, Query, Headers, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ApiResponse } from '@protecliter/shared-types';

@Controller('reports')
export class ReportsController {
    constructor(private reportsService: ReportsService) { }

    @Get('dashboard')
    async getDashboard(@Headers('x-tenant-id') tenantId: string): Promise<ApiResponse> {
        const stats = await this.reportsService.getDashboardStats(tenantId);
        return { success: true, data: stats };
    }

    @Get('trend')
    async getTrend(
        @Headers('x-tenant-id') tenantId: string,
        @Query('days') days?: string,
    ): Promise<ApiResponse> {
        const trend = await this.reportsService.getDetectionTrend(
            tenantId,
            days ? parseInt(days) : 30,
        );
        return { success: true, data: trend };
    }

    @Get('export')
    async exportCSV(
        @Headers('x-tenant-id') tenantId: string,
        @Query('type') type: 'detections' | 'takedowns' = 'detections',
        @Res() res: Response,
    ): Promise<void> {
        const csv = await this.reportsService.exportCSV(tenantId, type);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
        res.send(csv);
    }
}
