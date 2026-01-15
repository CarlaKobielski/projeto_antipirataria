import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { StripeService } from './billing/stripe.service';
import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { WebhooksController } from './webhooks/webhooks.controller';
import { PlansService } from './billing/plans.service';
import { PlansController } from './billing/plans.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
    ],
    controllers: [SubscriptionsController, WebhooksController, PlansController],
    providers: [PrismaService, StripeService, SubscriptionsService, PlansService],
})
export class AppModule { }
