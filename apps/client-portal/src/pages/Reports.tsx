import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { reportsApi } from '../lib/api';

export function Reports() {
    const { data: dashboardData } = useQuery({ queryKey: ['dashboard'], queryFn: () => reportsApi.getDashboard().then(r => r.data.data) });

    const handleExport = async (type: 'detections' | 'takedowns') => {
        const response = await reportsApi.exportCSV(type);
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="page-header">
                <div><h1 className="page-title">Relatórios</h1><p className="page-subtitle">Visualize e exporte dados sobre a proteção do seu conteúdo</p></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                    <div className="card-header"><h2 className="card-title">Resumo do Mês</h2></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                        <div><div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent)' }}>{dashboardData?.detectionsThisMonth || 0}</div><div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Novas Detecções</div></div>
                        <div><div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{dashboardData?.takedownsThisMonth || 0}</div><div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Remoções</div></div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h2 className="card-title">Taxa de Sucesso</h2></div>
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-accent)' }}>{(dashboardData?.takedownRate || 0).toFixed(1)}%</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>das solicitações de remoção foram bem-sucedidas</div>
                    </div>
                </div>
            </div>
            <div className="card">
                <div className="card-header"><h2 className="card-title">Exportar Dados</h2></div>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Exporte seus dados em formato CSV para análise externa.</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={() => handleExport('detections')}><FileText size={18} />Exportar Detecções</button>
                    <button className="btn btn-secondary" onClick={() => handleExport('takedowns')}><Download size={18} />Exportar Takedowns</button>
                </div>
            </div>
        </div>
    );
}
