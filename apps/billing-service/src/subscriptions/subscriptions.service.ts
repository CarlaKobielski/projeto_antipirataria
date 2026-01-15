import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../billing/stripe.service';
import { PlansService } from '../billing/plans.service';
import { SubscriptionStatus } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('subscriptions-service');

export interface CreateSubscriptionDto {
    tenantId: string;
    planId: string;
    paymentMethodId?: string;
}

export interface SubscriptionResponse {
    id: string;
    tenantId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    planId: string;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    trialEnd?: Date;
    clientSecret?: string;
}

@Injectable()
export class SubscriptionsService {
    constructor(
        private prisma: PrismaService,
        private stripeService: StripeService,
        private plansService: PlansService
    ) { }

    async createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionResponse> {
        const plan = this.plansService.getPlanById(dto.planId);
        if (!plan) {
            throw new BadRequestException(`Plan ${dto.planId} not found`);
        }

        // Get tenant and check if they already have an active subscription
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: dto.tenantId },
            include: { subscription: true },
        });

        if (!tenant) {
            throw new NotFoundException(`Tenant ${dto.tenantId} not found`);
        }

        if (tenant.subscription?.status === 'ACTIVE') {
            throw new BadRequestException('Tenant already has an active subscription');
        }

        // Get or create Stripe customer
        let stripeCustomerId = tenant.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await this.stripeService.createCustomer(
                tenant.billingEmail || `${tenant.slug}@protecliter.com`,
                tenant.name,
                { tenantId: tenant.id }
            );
            stripeCustomerId = customer.id;

            await this.prisma.tenant.update({
                where: { id: tenant.id },
                data: { stripeCustomerId },
            });
        }

        // Create Stripe subscription
        const stripeSubscription = await this.stripeService.createSubscription(
            stripeCustomerId,
            plan.priceId,
            14 // 14-day trial
        );

        // Save subscription in database
        const subscription = await this.prisma.subscription.upsert({
            where: { tenantId: tenant.id },
            create: {
                tenantId: tenant.id,
                stripeSubscriptionId: stripeSubscription.id,
                stripeCustomerId,
                planId: plan.id,
                status: this.mapStripeStatus(stripeSubscription.status),
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                trialEnd: stripeSubscription.trial_end
                    ? new Date(stripeSubscription.trial_end * 1000)
                    : null,
            },
            update: {
                stripeSubscriptionId: stripeSubscription.id,
                planId: plan.id,
                status: this.mapStripeStatus(stripeSubscription.status),
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                trialEnd: stripeSubscription.trial_end
                    ? new Date(stripeSubscription.trial_end * 1000)
                    : null,
            },
        });

        logger.info(`Created subscription ${subscription.id} for tenant ${tenant.id}`);

        // Get client secret for payment if needed
        let clientSecret: string | undefined;
        const invoice = stripeSubscription.latest_invoice as any;
        if (invoice?.payment_intent?.client_secret) {
            clientSecret = invoice.payment_intent.client_secret;
        }

        return {
            id: subscription.id,
            tenantId: subscription.tenantId,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripeCustomerId: subscription.stripeCustomerId,
            planId: subscription.planId,
            status: subscription.status as SubscriptionStatus,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            trialEnd: subscription.trialEnd || undefined,
            clientSecret,
        };
    }

    async getSubscription(tenantId: string): Promise<SubscriptionResponse | null> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription) return null;

        return {
            id: subscription.id,
            tenantId: subscription.tenantId,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripeCustomerId: subscription.stripeCustomerId,
            planId: subscription.planId,
            status: subscription.status as SubscriptionStatus,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            trialEnd: subscription.trialEnd || undefined,
        };
    }

    async changePlan(tenantId: string, newPlanId: string): Promise<SubscriptionResponse> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        const plan = this.plansService.getPlanById(newPlanId);
        if (!plan) {
            throw new BadRequestException(`Plan ${newPlanId} not found`);
        }

        // Update in Stripe
        await this.stripeService.updateSubscription(subscription.stripeSubscriptionId, plan.priceId);

        // Update in database
        const updated = await this.prisma.subscription.update({
            where: { tenantId },
            data: { planId: newPlanId },
        });

        logger.info(`Changed plan for tenant ${tenantId} to ${newPlanId}`);

        return {
            id: updated.id,
            tenantId: updated.tenantId,
            stripeSubscriptionId: updated.stripeSubscriptionId,
            stripeCustomerId: updated.stripeCustomerId,
            planId: updated.planId,
            status: updated.status as SubscriptionStatus,
            currentPeriodStart: updated.currentPeriodStart,
            currentPeriodEnd: updated.currentPeriodEnd,
            cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
            trialEnd: updated.trialEnd || undefined,
        };
    }

    async cancelSubscription(tenantId: string, immediately = false): Promise<SubscriptionResponse> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        // Cancel in Stripe
        const stripeSubscription = await this.stripeService.cancelSubscription(
            subscription.stripeSubscriptionId,
            immediately
        );

        // Update in database
        const updated = await this.prisma.subscription.update({
            where: { tenantId },
            data: {
                status: immediately ? 'CANCELED' : subscription.status,
                cancelAtPeriodEnd: !immediately,
            },
        });

        logger.info(`Canceled subscription for tenant ${tenantId}, immediately: ${immediately}`);

        return {
            id: updated.id,
            tenantId: updated.tenantId,
            stripeSubscriptionId: updated.stripeSubscriptionId,
            stripeCustomerId: updated.stripeCustomerId,
            planId: updated.planId,
            status: updated.status as SubscriptionStatus,
            currentPeriodStart: updated.currentPeriodStart,
            currentPeriodEnd: updated.currentPeriodEnd,
            cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
            trialEnd: updated.trialEnd || undefined,
        };
    }

    async reactivateSubscription(tenantId: string): Promise<SubscriptionResponse> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        if (!subscription.cancelAtPeriodEnd) {
            throw new BadRequestException('Subscription is not pending cancellation');
        }

        // Reactivate in Stripe
        await this.stripeService.reactivateSubscription(subscription.stripeSubscriptionId);

        // Update in database
        const updated = await this.prisma.subscription.update({
            where: { tenantId },
            data: { cancelAtPeriodEnd: false },
        });

        logger.info(`Reactivated subscription for tenant ${tenantId}`);

        return {
            id: updated.id,
            tenantId: updated.tenantId,
            stripeSubscriptionId: updated.stripeSubscriptionId,
            stripeCustomerId: updated.stripeCustomerId,
            planId: updated.planId,
            status: updated.status as SubscriptionStatus,
            currentPeriodStart: updated.currentPeriodStart,
            currentPeriodEnd: updated.currentPeriodEnd,
            cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
            trialEnd: updated.trialEnd || undefined,
        };
    }

    async createBillingPortalSession(tenantId: string, returnUrl: string): Promise<string> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        const session = await this.stripeService.createBillingPortalSession(
            subscription.stripeCustomerId,
            returnUrl
        );

        return session.url;
    }

    async getInvoices(tenantId: string): Promise<any[]> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription) {
            return [];
        }

        const invoices = await this.stripeService.listInvoices(subscription.stripeCustomerId);

        return invoices.map((inv) => ({
            id: inv.id,
            number: inv.number,
            status: inv.status,
            amount: inv.amount_due / 100,
            currency: inv.currency.toUpperCase(),
            created: new Date(inv.created * 1000),
            dueDate: inv.due_date ? new Date(inv.due_date * 1000) : null,
            pdfUrl: inv.invoice_pdf,
            hostedUrl: inv.hosted_invoice_url,
        }));
    }

    private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
        const statusMap: Record<string, SubscriptionStatus> = {
            active: 'ACTIVE',
            past_due: 'PAST_DUE',
            canceled: 'CANCELED',
            unpaid: 'PAST_DUE',
            trialing: 'TRIALING',
            incomplete: 'INCOMPLETE',
            incomplete_expired: 'EXPIRED',
            paused: 'PAUSED',
        };
        return statusMap[stripeStatus] || 'INCOMPLETE';
    }
}
