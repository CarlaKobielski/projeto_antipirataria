import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, AlertTriangle, Loader2 } from 'lucide-react';
import { billingApi } from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    interval: string;
    features: string[];
    limits: any;
    popular?: boolean;
}

interface Subscription {
    id: string;
    status: string;
    planId: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
}

export function Subscription() {
    const queryClient = useQueryClient();
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

    const { data: plansData, isLoading: isLoadingPlans } = useQuery({
        queryKey: ['plans'],
        queryFn: () => billingApi.getPlans().then(r => r.data)
    });

    const { data: subData, isLoading: isLoadingSub } = useQuery({
        queryKey: ['subscription'],
        queryFn: () => billingApi.getSubscription().then(r => r.data).catch(() => null)
    });

    const createSessionMutation = useMutation({
        mutationFn: (planId: string) => billingApi.createSubscription(planId),
        onSuccess: (data) => {
            if (data.data?.clientSecret) {
                // In a real app with Stripe.js, we would confirm payment here
                alert('Redirecionando para pagamento...');
            } else {
                queryClient.invalidateQueries({ queryKey: ['subscription'] });
            }
            setLoadingPlanId(null);
        },
        onError: () => setLoadingPlanId(null)
    });

    const portalMutation = useMutation({
        mutationFn: () => billingApi.getPortalSession(window.location.href).then(r => r.data),
        onSuccess: (url) => { window.location.href = url; }
    });

    const plans = (plansData || []) as Plan[];
    const subscription = subData as Subscription | null;

    const handleSubscribe = (plan: Plan) => {
        setLoadingPlanId(plan.id);
        // If user already has a sub, we might want to change plan instead, but for MVP we assume upgrade flow
        createSessionMutation.mutate(plan.id);
    };

    if (isLoadingPlans || isLoadingSub) {
        return <div className="loading"><div className="spinner" /></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Assinatura e Planos</h1>
                    <p className="page-subtitle">Gerencie seu plano e cobranças</p>
                </div>
                {subscription && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                    >
                        <CreditCard size={18} />
                        Gerenciar Cobrança
                    </button>
                )}
            </div>

            {subscription && (
                <div className="card mb-8" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
                    <h3 className="card-title">Seu Plano Atual</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                {plans.find(p => p.id === subscription.planId)?.name || subscription.planId}
                                <span className={`badge ${subscription.status === 'ACTIVE' ? 'badge-validated' : 'badge-rejected'}`} style={{ marginLeft: '1rem' }}>
                                    {subscription.status}
                                </span>
                            </div>
                            <div style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                                {subscription.cancelAtPeriodEnd ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#eab308' }}>
                                        <AlertTriangle size={16} /> Cancelamento agendado para {format(new Date(subscription.currentPeriodEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </span>
                                ) : (
                                    <span>Renova em {format(new Date(subscription.currentPeriodEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {plans.map(plan => {
                    const isCurrent = subscription?.planId === plan.id;
                    return (
                        <div key={plan.id} className="card" style={{
                            position: 'relative',
                            border: isCurrent ? '2px solid var(--color-primary)' : undefined,
                            opacity: (subscription && !isCurrent) ? 0.8 : 1
                        }}>
                            {plan.popular && <div style={{
                                position: 'absolute', top: '-10px', right: '20px',
                                background: 'var(--color-primary)', color: 'white',
                                padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
                            }}>POPULAR</div>}

                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{plan.name}</h3>
                            <p style={{ color: 'var(--color-text-secondary)', minHeight: '3rem' }}>{plan.description}</p>

                            <div style={{ margin: '1.5rem 0' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>R$ {plan.price}</span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>/{plan.interval === 'month' ? 'mês' : 'ano'}</span>
                            </div>

                            <button
                                className={`btn ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                                style={{ width: '100%', marginBottom: '1.5rem' }}
                                disabled={isCurrent || loadingPlanId === plan.id}
                                onClick={() => handleSubscribe(plan)}
                            >
                                {loadingPlanId === plan.id ? <Loader2 className="animate-spin" /> :
                                    (isCurrent ? 'Plano Atual' : 'Assinar Agora')
                                }
                            </button>

                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {plan.features.map((feature, i) => (
                                    <li key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                        <Check size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
