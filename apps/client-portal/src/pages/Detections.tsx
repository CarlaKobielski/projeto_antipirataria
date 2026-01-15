import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { detectionsApi } from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Detections() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['detections', page, statusFilter],
        queryFn: () => detectionsApi.getAll({ page, status: statusFilter || undefined }).then(r => r.data),
    });

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = { NEW: 'badge-new', REVIEWING: 'badge-pending', VALIDATED: 'badge-validated', REJECTED: 'badge-rejected' };
        return classes[status] || '';
    };

    return (
        <div>
            <div className="page-header">
                <div><h1 className="page-title">Detecções</h1><p className="page-subtitle">Acompanhe as detecções de violação encontradas pelo sistema</p></div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">Todos os status</option>
                    <option value="NEW">Novo</option>
                    <option value="VALIDATED">Validado</option>
                    <option value="REJECTED">Rejeitado</option>
                </select>
            </div>
            <div className="card">
                {isLoading ? (
                    <div className="loading"><div className="spinner" /></div>
                ) : (
                    <table>
                        <thead><tr><th>Obra</th><th>URL</th><th>Score</th><th>Status</th><th>Data</th></tr></thead>
                        <tbody>
                            {data?.data?.map((detection: any) => (
                                <tr key={detection.id}>
                                    <td style={{ fontWeight: 500 }}>{detection.work?.title}</td>
                                    <td>
                                        <a href={detection.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                                            {detection.domain}<ExternalLink size={12} />
                                        </a>
                                    </td>
                                    <td><span style={{ fontWeight: 600 }}>{(detection.score * 100).toFixed(0)}%</span></td>
                                    <td><span className={`badge ${getStatusBadge(detection.status)}`}>{detection.status}</span></td>
                                    <td style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{format(new Date(detection.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {data?.meta && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Mostrando {data.data?.length} de {data.meta.total}</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                            <button className="btn btn-secondary btn-sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(p => p + 1)}>Próximo</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
