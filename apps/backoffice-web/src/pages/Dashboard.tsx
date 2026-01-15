import { useQuery } from '@tanstack/react-query';
import {
    Search,
    FileCheck,
    Send,
    TrendingUp,
    AlertTriangle,
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { reportsApi, detectionsApi, casesApi } from '../lib/api';

export function Dashboard() {
    const { data: dashboardData } = useQuery({
        queryKey: ['dashboard'],
        queryFn: () => reportsApi.getDashboard().then((r) => r.data.data),
    });

    const { data: trendData } = useQuery({
        queryKey: ['trend'],
        queryFn: () => reportsApi.getTrend(30).then((r) => r.data.data),
    });

    const { data: detectionsStats } = useQuery({
        queryKey: ['detections-stats'],
        queryFn: () => detectionsApi.getStats().then((r) => r.data.data),
    });

    const { data: casesStats } = useQuery({
        queryKey: ['cases-stats'],
        queryFn: () => casesApi.getStats().then((r) => r.data.data),
    });

    const stats = [
        {
            label: 'Total Detecções',
            value: dashboardData?.totalDetections || 0,
            icon: Search,
            color: 'accent',
        },
        {
            label: 'Pendentes Análise',
            value: dashboardData?.pendingDetections || 0,
            icon: AlertTriangle,
            color: 'warning',
        },
        {
            label: 'Takedowns Sucesso',
            value: dashboardData?.successfulTakedowns || 0,
            icon: FileCheck,
            color: 'success',
        },
        {
            label: 'Taxa de Sucesso',
            value: `${(dashboardData?.takedownRate || 0).toFixed(1)}%`,
            icon: TrendingUp,
            color: 'info',
        },
    ];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        Visão geral do sistema de proteção de conteúdo
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((stat) => (
                    <div key={stat.label} className="stat-card">
                        <div className={`stat-icon ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-6)' }}>
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Tendência de Detecções (30 dias)</h2>
                    </div>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--color-text-muted)"
                                    fontSize={12}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                />
                                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-secondary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="var(--color-accent)"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Status dos Cases</h2>
                    </div>
                    <div style={{ padding: 'var(--spacing-4)' }}>
                        {casesStats?.byStatus && Object.entries(casesStats.byStatus).map(([status, count]) => (
                            <div
                                key={status}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 'var(--spacing-3) 0',
                                    borderBottom: '1px solid var(--color-border)',
                                }}
                            >
                                <span className={`badge badge-${status.toLowerCase()}`}>
                                    {status}
                                </span>
                                <span style={{ fontWeight: 600 }}>{count as number}</span>
                            </div>
                        ))}
                        {casesStats?.pendingHighPriority && casesStats.pendingHighPriority > 0 && (
                            <div
                                style={{
                                    marginTop: 'var(--spacing-4)',
                                    padding: 'var(--spacing-3)',
                                    background: 'var(--color-danger-light)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2)',
                                }}
                            >
                                <AlertTriangle size={16} color="var(--color-danger)" />
                                <span style={{ fontSize: 'var(--font-size-sm)' }}>
                                    {casesStats.pendingHighPriority} casos de alta prioridade
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Monthly summary */}
            <div className="card" style={{ marginTop: 'var(--spacing-6)' }}>
                <div className="card-header">
                    <h2 className="card-title">Resumo do Mês</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-6)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-accent)' }}>
                            {dashboardData?.detectionsThisMonth || 0}
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Novas Detecções
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                            {dashboardData?.takedownsThisMonth || 0}
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Takedowns Concluídos
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-info)' }}>
                            {dashboardData?.totalWorks || 0}
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Obras Protegidas
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
