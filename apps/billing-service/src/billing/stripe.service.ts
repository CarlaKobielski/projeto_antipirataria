import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('stripe-service');

@Injectable()
export class StripeService implements OnModuleInit {
    private stripe: Stripe;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!apiKey) {
            logger.warn('STRIPE_SECRET_KEY not configured, billing service will not work');
            return;
        }

        this.stripe = new Stripe(apiKey, {
            apiVersion: '2023-10-16',
            typescript: true,
        });
        logger.info('Stripe client initialized');
    }

    getClient(): Stripe {
        return this.stripe;
    }

    // Customer Management
    async createCustomer(email: string, name: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
        const customer = await this.stripe.customers.create({
            email,
            name,
            metadata: {
                ...metadata,
                source: 'protecliter',
            },
        });
        logger.info(`Created Stripe customer: ${customer.id}`);
        return customer;
    }

    async getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
        return this.stripe.customers.retrieve(customerId);
    }

    async updateCustomer(customerId: string, data: Stripe.CustomerUpdateParams): Promise<Stripe.Customer> {
        return this.stripe.customers.update(customerId, data);
    }

    // Subscription Management
    async createSubscription(
        customerId: string,
        priceId: string,
        trialDays?: number
    ): Promise<Stripe.Subscription> {
        const subscriptionParams: Stripe.SubscriptionCreateParams = {
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        };

        if (trialDays && trialDays > 0) {
            subscriptionParams.trial_period_days = trialDays;
        }

        const subscription = await this.stripe.subscriptions.create(subscriptionParams);
        logger.info(`Created subscription: ${subscription.id} for customer: ${customerId}`);
        return subscription;
    }

    async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        return this.stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['latest_invoice', 'default_payment_method'],
        });
    }

    async updateSubscription(
        subscriptionId: string,
        priceId: string
    ): Promise<Stripe.Subscription> {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

        return this.stripe.subscriptions.update(subscriptionId, {
            items: [
                {
                    id: subscription.items.data[0].id,
                    price: priceId,
                },
            ],
            proration_behavior: 'create_prorations',
        });
    }

    async cancelSubscription(subscriptionId: string, immediately = false): Promise<Stripe.Subscription> {
        if (immediately) {
            return this.stripe.subscriptions.cancel(subscriptionId);
        }
        return this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
    }

    async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        return this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });
    }

    // Payment Methods
    async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
        return this.stripe.setupIntents.create({
            customer: customerId,
            payment_method_types: ['card'],
        });
    }

    async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
        const paymentMethods = await this.stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
        return paymentMethods.data;
    }

    async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.Customer> {
        return this.stripe.customers.update(customerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
    }

    async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
        return this.stripe.paymentMethods.detach(paymentMethodId);
    }

    // Invoices
    async listInvoices(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
        const invoices = await this.stripe.invoices.list({
            customer: customerId,
            limit,
        });
        return invoices.data;
    }

    async getUpcomingInvoice(customerId: string): Promise<Stripe.UpcomingInvoice | null> {
        try {
            return await this.stripe.invoices.retrieveUpcoming({
                customer: customerId,
            });
        } catch (error) {
            // No upcoming invoice (no active subscription)
            return null;
        }
    }

    // Webhook signature verification
    constructEvent(payload: Buffer, signature: string, webhookSecret: string): Stripe.Event {
        return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }

    // Billing Portal
    async createBillingPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
        return this.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });
    }

    // Checkout Session
    async createCheckoutSession(
        customerId: string,
        priceId: string,
        successUrl: string,
        cancelUrl: string
    ): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            subscription_data: {
                trial_period_days: 14,
            },
        });
    }

    // Usage-based billing
    async createUsageRecord(
        subscriptionItemId: string,
        quantity: number,
        action: 'increment' | 'set' = 'increment'
    ): Promise<Stripe.UsageRecord> {
        return this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
            quantity,
            action,
            timestamp: Math.floor(Date.now() / 1000),
        });
    }
}
