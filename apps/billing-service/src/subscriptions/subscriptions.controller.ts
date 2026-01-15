import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, Req } from '@nestjs/common';
import { SubscriptionsService, CreateSubscriptionDto } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
    constructor(private subscriptionsService: SubscriptionsService) { }

    @Post()
    async createSubscription(@Body() dto: CreateSubscriptionDto) {
        return this.subscriptionsService.createSubscription(dto);
    }

    @Get(':tenantId')
    async getSubscription(@Param('tenantId') tenantId: string) {
        return this.subscriptionsService.getSubscription(tenantId);
    }

    @Put(':tenantId/plan')
    async changePlan(
        @Param('tenantId') tenantId: string,
        @Body('planId') planId: string
    ) {
        return this.subscriptionsService.changePlan(tenantId, planId);
    }

    @Delete(':tenantId')
    async cancelSubscription(
        @Param('tenantId') tenantId: string,
        @Query('immediately') immediately?: string
    ) {
        return this.subscriptionsService.cancelSubscription(tenantId, immediately === 'true');
    }

    @Post(':tenantId/reactivate')
    async reactivateSubscription(@Param('tenantId') tenantId: string) {
        return this.subscriptionsService.reactivateSubscription(tenantId);
    }

    @Post(':tenantId/billing-portal')
    async createBillingPortalSession(
        @Param('tenantId') tenantId: string,
        @Body('returnUrl') returnUrl: string
    ) {
        const url = await this.subscriptionsService.createBillingPortalSession(tenantId, returnUrl);
        return { url };
    }

    @Get(':tenantId/invoices')
    async getInvoices(@Param('tenantId') tenantId: string) {
        return this.subscriptionsService.getInvoices(tenantId);
    }
}
