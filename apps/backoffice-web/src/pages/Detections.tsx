import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Check, X, Eye } from 'lucide-react';
import { detectionsApi } from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Detections() {
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['detections', page, statusFilter],
        queryFn: () =>
            detectionsApi.getAll({ page, status: statusFilter || undefined }).then((r) => r.data),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            detectionsApi.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['detections'] });
        },
    });

    const getScoreColor = (score: number) => {
        if (score >= 0.7) return 'high';
        if (score >= 0.4) return 'medium';
        return 'low';
    };

    const getConfidenceBadge = (confidence: string) => {
        const classes: Record<string, string> = {
            HIGH: 'badge-high',
            MEDIUM: 'badge-medium',
            LOW: 'badge-low',
        };
        return classes[confidence] || '';
    };

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            NEW: 'badge-new',
            REVIEWING: 'badge-pending',
            VALIDATED: 'badge-validated',
            REJECTED: 'badge-rejected',
        };
        return classes[status] || '';
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Detecções</h1>
                    <p className="page-subtitle">
                        Gerencie detecções de possíveis violações de copyright
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
                        <option value="NEW">Novo</option>
                        <option value="REVIEWING">Em Análise</option>
                        <option value="VALIDATED">Validado</option>
                        <option value="REJECTED">Rejeitado</option>
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
                                    <th>Score</th>
                                    <th>Confiança</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.data?.map((detection: any) => (
                                    <tr key={detection.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{detection.work?.title}</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                {detection.work?.author}
                                            </div>
                                        </td>
                                        <td>
                                            <a
                                                href={detection.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-1)',
                                                    fontSize: 'var(--font-size-sm)',
                                                }}
                                            >
                                                {detection.domain}
                                                <ExternalLink size={12} />
                                            </a>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                                <span style={{ fontWeight: 600 }}>{(detection.score * 100).toFixed(0)}%</span>
                                                <div className="score-bar">
                                                    <div
                                                        className={`score-bar-fill ${getScoreColor(detection.score)}`}
                                                        style={{ width: `${detection.score * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getConfidenceBadge(detection.confidence)}`}>
                                                {detection.confidence}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(detection.status)}`}>
                                                {detection.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                            {format(new Date(detection.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                                <button className="btn btn-secondary btn-sm" title="Ver detalhes">
                                                    <Eye size={14} />
                                                </button>
                                                {detection.status === 'NEW' && (
                                                    <>
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            title="Validar"
                                                            onClick={() =>
                                                                updateStatusMutation.mutate({ id: detection.id, status: 'VALIDATED' })
                                                            }
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            title="Rejeitar"
                                                            onClick={() =>
                                                                updateStatusMutation.mutate({ id: detection.id, status: 'REJECTED' })
                                                            }
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
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
