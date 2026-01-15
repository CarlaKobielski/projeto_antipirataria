import { Controller, Post, Req, Res, Headers, RawBodyRequest, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { StripeService } from '../billing/stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { createLogger } from '@protecliter/logger';
import Stripe from 'stripe';

const logger = createLogger('webhooks');

@Controller('webhooks')
export class WebhooksController {
    constructor(
        private stripeService: StripeService,
        private prisma: PrismaService,
        private configService: ConfigService
    ) { }

    @Post('stripe')
    async handleStripeWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Res() res: Response,
        @Headers('stripe-signature') signature: string
    ) {
        const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

        if (!webhookSecret) {
            logger.error('STRIPE_WEBHOOK_SECRET not configured');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Webhook secret not configured');
        }

        let event: Stripe.Event;

        try {
            event = this.stripeService.constructEvent(req.rawBody!, signature, webhookSecret);
        } catch (err: any) {
            logger.error(`Webhook signature verification failed: ${err.message}`);
            return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
        }

        logger.info(`Received Stripe webhook: ${event.type}`);

        try {
            switch (event.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
                    break;

                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
                    break;

                case 'customer.subscription.trial_will_end':
                    await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
                    break;

                default:
                    logger.info(`Unhandled event type: ${event.type}`);
            }

            return res.status(HttpStatus.OK).json({ received: true });
        } catch (error: any) {
            logger.error(`Error processing webhook: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
        const stripeSubscriptionId = subscription.id;

        const existingSubscription = await this.prisma.subscription.findFirst({
            where: { stripeSubscriptionId },
        });

        if (!existingSubscription) {
            logger.warn(`Subscription ${stripeSubscriptionId} not found in database`);
            return;
        }

        const status = this.mapStripeStatus(subscription.status);

        await this.prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: {
                status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            },
        });

        logger.info(`Updated subscription ${stripeSubscriptionId} to status ${status}`);
    }

    private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
        const stripeSubscriptionId = subscription.id;

        await this.prisma.subscription.updateMany({
            where: { stripeSubscriptionId },
            data: { status: 'CANCELED' },
        });

        logger.info(`Marked subscription ${stripeSubscriptionId} as canceled`);
    }

    private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
        if (!invoice.subscription) return;

        const stripeSubscriptionId = invoice.subscription as string;

        await this.prisma.subscription.updateMany({
            where: { stripeSubscriptionId },
            data: { status: 'ACTIVE' },
        });

        // Log payment for audit
        logger.info(`Payment succeeded for subscription ${stripeSubscriptionId}, amount: ${invoice.amount_paid / 100} ${invoice.currency}`);
    }

    private async handlePaymentFailed(invoice: Stripe.Invoice) {
        if (!invoice.subscription) return;

        const stripeSubscriptionId = invoice.subscription as string;

        const subscription = await this.prisma.subscription.findFirst({
            where: { stripeSubscriptionId },
            include: { tenant: true },
        });

        if (subscription) {
            await this.prisma.subscription.update({
                where: { id: subscription.id },
                data: { status: 'PAST_DUE' },
            });

            // TODO: Send notification email to tenant about failed payment
            logger.warn(`Payment failed for subscription ${stripeSubscriptionId}, tenant: ${subscription.tenant?.name}`);
        }
    }

    private async handleTrialWillEnd(subscription: Stripe.Subscription) {
        const stripeSubscriptionId = subscription.id;

        const dbSubscription = await this.prisma.subscription.findFirst({
            where: { stripeSubscriptionId },
            include: { tenant: true },
        });

        if (dbSubscription) {
            // TODO: Send trial ending notification email
            logger.info(`Trial will end soon for subscription ${stripeSubscriptionId}, tenant: ${dbSubscription.tenant?.name}`);
        }
    }

    private mapStripeStatus(stripeStatus: string): string {
        const statusMap: Record<string, string> = {
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
