import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search, CheckCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsApi, worksApi } from '../lib/api';

export function Dashboard() {
    const { data: dashboardData } = useQuery({ queryKey: ['dashboard'], queryFn: () => reportsApi.getDashboard().then((r) => r.data.data) });
    const { data: trendData } = useQuery({ queryKey: ['trend'], queryFn: () => reportsApi.getTrend(30).then((r) => r.data.data) });
    const { data: worksStats } = useQuery({ queryKey: ['works-stats'], queryFn: () => worksApi.getStats().then((r) => r.data.data) });

    const stats = [
        { label: 'Obras Protegidas', value: worksStats?.totalWorks || 0, icon: BookOpen, color: '#6366f1' },
        { label: 'Detecções', value: dashboardData?.totalDetections || 0, icon: Search, color: '#3b82f6' },
        { label: 'Remoções', value: dashboardData?.successfulTakedowns || 0, icon: CheckCircle, color: '#22c55e' },
        { label: 'Taxa Sucesso', value: `${(dashboardData?.takedownRate || 0).toFixed(0)}%`, icon: TrendingUp, color: '#f59e0b' },
    ];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Bem-vindo ao ProtecLiter. Acompanhe a proteção do seu conteúdo.</p>
                </div>
            </div>
            <div className="stats-grid">
                {stats.map((stat) => (
                    <div key={stat.label} className="stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-label">{stat.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="card">
                <div className="card-header"><h2 className="card-title">Detecções nos Últimos 30 Dias</h2></div>
                <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={12} tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} />
                            <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                            <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }} />
                            <Line type="monotone" dataKey="count" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
