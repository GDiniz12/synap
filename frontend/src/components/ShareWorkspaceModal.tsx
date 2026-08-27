import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface ShareWorkspaceModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareWorkspaceModal({ workspaceId, isOpen, onClose }: ShareWorkspaceModalProps) {
  const [email, setEmail] = useState('');
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
    } else {
      setEmail('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, workspaceId]);

  const loadCollaborators = async () => {
    try {
      const data = await api(`/workspaces/${workspaceId}/collaborators`);
      setCollaborators(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api(`/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setSuccess('Convite enviado com sucesso!');
      setEmail('');
      loadCollaborators();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-smooth-pop">
        
        <div className="p-6 border-b border-[#2d2d2d] flex justify-between items-center bg-[#1e1e1e]">
          <h2 className="text-xl font-bold text-white tracking-tight">Compartilhar Workspace</h2>
          <button 
            onClick={onClose}
            className="text-[var(--accents-5)] hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <form onSubmit={handleInvite} className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[var(--accents-6)]">Convidar por Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@amigo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="geist-input flex-1 bg-[#121212] border-[#333]"
                disabled={loading}
              />
              <button 
                type="submit" 
                className="geist-button shrink-0 bg-white text-black hover:bg-gray-200 border-0 font-medium"
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Convidar'}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            {success && <p className="text-green-400 text-sm mt-1">{success}</p>}
          </form>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-[var(--accents-6)] border-b border-[#2d2d2d] pb-2">Colaboradores Atuais</h3>
            
            {collaborators.length === 0 ? (
              <p className="text-sm text-[var(--accents-5)] italic">Nenhum colaborador adicionado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
                {collaborators.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#121212] border border-[#2d2d2d]">
                    <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center text-xs font-bold text-white uppercase">
                      {c.user.name ? c.user.name[0] : c.user.email[0]}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium text-white truncate">{c.user.name || 'Sem Nome'}</span>
                      <span className="text-xs text-[var(--accents-5)] truncate">{c.user.email}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
