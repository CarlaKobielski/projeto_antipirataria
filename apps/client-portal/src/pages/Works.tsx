import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { worksApi } from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Works() {
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', author: '', isbn: '', excerpt: '', keywords: '' });
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({ queryKey: ['works', page], queryFn: () => worksApi.getAll({ page }).then((r) => r.data) });

    const createMutation = useMutation({
        mutationFn: () => worksApi.create({ ...formData, keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean) }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['works'] }); setShowModal(false); setFormData({ title: '', author: '', isbn: '', excerpt: '', keywords: '' }); },
    });

    return (
        <div>
            <div className="page-header">
                <div><h1 className="page-title">Minhas Obras</h1><p className="page-subtitle">Gerencie as obras que você deseja proteger</p></div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} />Nova Obra</button>
            </div>
            <div className="card">
                {isLoading ? (
                    <div className="loading"><div className="spinner" /></div>
                ) : (
                    <table>
                        <thead><tr><th>Título</th><th>Autor</th><th>ISBN</th><th>Detecções</th><th>Jobs Ativos</th><th>Data Cadastro</th><th>Ações</th></tr></thead>
                        <tbody>
                            {data?.data?.map((work: any) => (
                                <tr key={work.id}>
                                    <td style={{ fontWeight: 500 }}>{work.title}</td>
                                    <td>{work.author || '-'}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{work.isbn || '-'}</td>
                                    <td><span className="badge badge-new">{work._count?.detections || 0}</span></td>
                                    <td>{work._count?.monitoringJobs || 0}</td>
                                    <td style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{format(new Date(work.createdAt), "dd/MM/yyyy", { locale: ptBR })}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn btn-secondary btn-sm"><Edit size={14} /></button>
                                            <button className="btn btn-secondary btn-sm"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
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
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
                        <h2 className="card-title">Nova Obra</h2>
                        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} style={{ marginTop: '1rem' }}>
                            <div className="form-group"><label className="form-label">Título *</label><input className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required /></div>
                            <div className="form-group"><label className="form-label">Autor</label><input className="form-input" value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">ISBN</label><input className="form-input" value={formData.isbn} onChange={e => setFormData({ ...formData, isbn: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Trecho</label><textarea className="form-input" style={{ minHeight: '100px', resize: 'vertical' }} value={formData.excerpt} onChange={e => setFormData({ ...formData, excerpt: e.target.value })} placeholder="Cole aqui um trecho significativo da obra..." /></div>
                            <div className="form-group"><label className="form-label">Palavras-chave (separadas por vírgula)</label><input className="form-input" value={formData.keywords} onChange={e => setFormData({ ...formData, keywords: e.target.value })} /></div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
