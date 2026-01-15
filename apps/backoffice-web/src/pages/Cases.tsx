import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Send, User } from 'lucide-react';
import { casesApi } from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Cases() {
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['cases', page, statusFilter],
        queryFn: () =>
            casesApi.getAll({ page, status: statusFilter || undefined }).then((r) => r.data),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            casesApi.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cases'] });
        },
    });

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            NEW: 'badge-new',
            VALIDATED: 'badge-validated',
            REMOVAL_REQUESTED: 'badge-pending',
            REMOVED: 'badge-validated',
            REJECTED: 'badge-rejected',
            CLOSED: 'badge-low',
        };
        return classes[status] || '';
    };

    const getPriorityBadge = (priority: number) => {
        if (priority >= 7) return 'badge-high';
        if (priority >= 4) return 'badge-medium';
        return 'badge-low';
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Cases</h1>
                    <p className="page-subtitle">
                        Gerencie casos de violação para remoção
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
                        <option value="VALIDATED">Validado</option>
                        <option value="REMOVAL_REQUESTED">Remoção Solicitada</option>
                        <option value="REMOVED">Removido</option>
                        <option value="REJECTED">Rejeitado</option>
                        <option value="CLOSED">Fechado</option>
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
                                    <th>URL Violadora</th>
                                    <th>Prioridade</th>
                                    <th>Status</th>
                                    <th>Analista</th>
                                    <th>Takedowns</th>
                                    <th>Data</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.data?.map((caseItem: any) => (
                                    <tr key={caseItem.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{caseItem.detection?.work?.title}</div>
                                        </td>
                                        <td>
                                            <a
                                                href={caseItem.detection?.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-1)',
                                                    fontSize: 'var(--font-size-sm)',
                                                }}
                                            >
                                                {caseItem.detection?.domain}
                                                <ExternalLink size={12} />
                                            </a>
                                        </td>
                                        <td>
                                            <span className={`badge ${getPriorityBadge(caseItem.priority)}`}>
                                                P{caseItem.priority}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(caseItem.status)}`}>
                                                {caseItem.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            {caseItem.analyst ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                                    <User size={14} />
                                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>{caseItem.analyst.name}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                                    Não atribuído
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 'var(--font-size-sm)' }}>
                                                {caseItem.takedownRequests?.length || 0}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                            {format(new Date(caseItem.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                                {caseItem.status === 'VALIDATED' && (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        title="Iniciar Takedown"
                                                        onClick={() =>
                                                            updateStatusMutation.mutate({ id: caseItem.id, status: 'REMOVAL_REQUESTED' })
                                                        }
                                                    >
                                                        <Send size={14} />
                                                        Takedown
                                                    </button>
                                                )}
                                                {caseItem.status === 'REMOVAL_REQUESTED' && (
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        title="Marcar como Removido"
                                                        onClick={() =>
                                                            updateStatusMutation.mutate({ id: caseItem.id, status: 'REMOVED' })
                                                        }
                                                    >
                                                        Confirmar Remoção
                                                    </button>
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
