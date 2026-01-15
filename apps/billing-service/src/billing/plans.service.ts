import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Plan {
    id: string;
    name: string;
    description: string;
    priceId: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    limits: {
        works: number;
        monitoringJobsPerWork: number;
        detectionsPerMonth: number;
        takedownsPerMonth: number;
        usersIncluded: number;
    };
    popular?: boolean;
}

@Injectable()
export class PlansService {
    private plans: Plan[];

    constructor(private configService: ConfigService) {
        // Plans are configured via environment or hardcoded for MVP
        this.plans = [
            {
                id: 'starter',
                name: 'Starter',
                description: 'Para autores independentes e pequenas editoras',
                priceId: this.configService.get('STRIPE_PRICE_STARTER') || 'price_starter',
                price: 99,
                currency: 'BRL',
                interval: 'month',
                features: [
                    'Até 10 obras protegidas',
                    '50 detecções/mês',
                    '10 takedowns/mês',
                    'Dashboard básico',
                    'Suporte por email',
                ],
                limits: {
                    works: 10,
                    monitoringJobsPerWork: 2,
                    detectionsPerMonth: 50,
                    takedownsPerMonth: 10,
                    usersIncluded: 1,
                },
            },
            {
                id: 'professional',
                name: 'Professional',
                description: 'Para editoras médias e autores prolíficos',
                priceId: this.configService.get('STRIPE_PRICE_PROFESSIONAL') || 'price_professional',
                price: 299,
                currency: 'BRL',
                interval: 'month',
                features: [
                    'Até 50 obras protegidas',
                    '500 detecções/mês',
                    '100 takedowns/mês',
                    'Dashboard avançado',
                    'Relatórios PDF/CSV',
                    'API access',
                    'Suporte prioritário',
                ],
                limits: {
                    works: 50,
                    monitoringJobsPerWork: 5,
                    detectionsPerMonth: 500,
                    takedownsPerMonth: 100,
                    usersIncluded: 3,
                },
                popular: true,
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                description: 'Para grandes editoras e distribuidores',
                priceId: this.configService.get('STRIPE_PRICE_ENTERPRISE') || 'price_enterprise',
                price: 999,
                currency: 'BRL',
                interval: 'month',
                features: [
                    'Obras ilimitadas',
                    'Detecções ilimitadas',
                    'Takedowns ilimitados',
                    'Dashboard white-label',
                    'Integração personalizada',
                    'SLA 99.9%',
                    'Gerente de conta dedicado',
                    'SSO/SAML',
                ],
                limits: {
                    works: -1, // unlimited
                    monitoringJobsPerWork: -1,
                    detectionsPerMonth: -1,
                    takedownsPerMonth: -1,
                    usersIncluded: -1,
                },
            },
        ];
    }

    getAllPlans(): Plan[] {
        return this.plans;
    }

    getPlanById(planId: string): Plan | undefined {
        return this.plans.find((p) => p.id === planId);
    }

    getPlanByPriceId(priceId: string): Plan | undefined {
        return this.plans.find((p) => p.priceId === priceId);
    }

    getDefaultPlan(): Plan {
        return this.plans[0]; // Starter
    }

    checkLimit(plan: Plan, limitType: keyof Plan['limits'], currentUsage: number): boolean {
        const limit = plan.limits[limitType];
        if (limit === -1) return true; // unlimited
        return currentUsage < limit;
    }
}
