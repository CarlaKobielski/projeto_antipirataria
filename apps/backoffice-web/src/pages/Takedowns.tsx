import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import { takedownsApi } from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Takedowns() {
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['takedowns', page, statusFilter],
        queryFn: () =>
            takedownsApi.getAll({ page, status: statusFilter || undefined }).then((r) => r.data),
    });

    const retryMutation = useMutation({
        mutationFn: (id: string) => takedownsApi.retry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['takedowns'] });
        },
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'REMOVED':
                return <CheckCircle size={16} color="var(--color-success)" />;
            case 'REJECTED':
            case 'FAILED':
                return <XCircle size={16} color="var(--color-danger)" />;
            default:
                return <Clock size={16} color="var(--color-warning)" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            PENDING: 'badge-pending',
            SENT: 'badge-new',
            ACKNOWLEDGED: 'badge-new',
            REMOVED: 'badge-validated',
            REJECTED: 'badge-rejected',
            FAILED: 'badge-rejected',
        };
        return classes[status] || '';
    };

    const getPlatformLabel = (platform: string) => {
        const labels: Record<string, string> = {
            GOOGLE_SEARCH: 'Google Search',
            GOOGLE_DRIVE: 'Google Drive',
            SCRIBD: 'Scribd',
            TELEGRAM: 'Telegram',
            GENERIC_DMCA: 'DMCA Email',
            OTHER: 'Outro',
        };
        return labels[platform] || platform;
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Takedowns</h1>
                    <p className="page-subtitle">
                        Acompanhe as solicitações de remoção enviadas
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-group">
                    <label className="form-label" style={{ marginBottom: 0 }}>Status:</label>
                    <select
                        className="form-select"
                        style={{ width: 'auto' }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="PENDING">Pendente</option>
                        <option value="SENT">Enviado</option>
                        <option value="ACKNOWLEDGED">Confirmado</option>
                        <option value="REMOVED">Removido</option>
                        <option value="REJECTED">Rejeitado</option>
                        <option value="FAILED">Falhou</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card">
                {isLoading ? (
                    <div className="loading">
                        <div className="spinner" />
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Obra</th>
                                    <th>URL</th>
                                    <th>Plataforma</th>
                                    <th>Status</th>
                                    <th>Tentativas</th>
                                    <th>Enviado</th>
                                    <th>Resposta</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.data?.map((takedown: any) => (
                                    <tr key={takedown.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>
                                                {takedown.case?.detection?.work?.title}
                                            </div>
                                        </td>
                                        <td>
                                            <a
                                                href={takedown.case?.detection?.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-1)',
                                                    fontSize: 'var(--font-size-sm)',
                                                }}
                                            >
                                                {takedown.case?.detection?.domain}
                                                <ExternalLink size={12} />
                                            </a>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 'var(--font-size-sm)' }}>
                                                {getPlatformLabel(takedown.platform)}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                                {getStatusIcon(takedown.status)}
                                                <span className={`badge ${getStatusBadge(takedown.status)}`}>
                                                    {takedown.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {takedown.attempts}
                                        </td>
                                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                            {takedown.sentAt
                                                ? format(new Date(takedown.sentAt), "dd/MM/yy HH:mm", { locale: ptBR })
                                                : '-'}
                                        </td>
                                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                            {takedown.respondedAt
                                                ? format(new Date(takedown.respondedAt), "dd/MM/yy HH:mm", { locale: ptBR })
                                                : '-'}
                                        </td>
                                        <td>
                                            {['FAILED', 'REJECTED'].includes(takedown.status) && (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    title="Tentar novamente"
                                                    onClick={() => retryMutation.mutate(takedown.id)}
                                                    disabled={retryMutation.isPending}
                                                >
                                                    <RefreshCw size={14} />
                                                    Retry
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {data?.meta && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 'var(--spacing-4)',
                        borderTop: '1px solid var(--color-border)',
                    }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            Mostrando {data.data?.length} de {data.meta.total}
                        </span>
                        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                Anterior
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={page >= data.meta.totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Próximo
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
