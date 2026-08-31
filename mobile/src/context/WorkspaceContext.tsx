import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Workspace, Pasta, Nota, Deck, Flashcard, ReviewGrade } from '../types';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { useAuth } from './AuthContext';

interface WorkspaceContextData {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  pastas: Pasta[];
  notas: Nota[];
  decks: Deck[];
  allCards: Flashcard[];
  isLoading: boolean;
  isSyncing: boolean;
  setActiveWorkspace: (ws: Workspace) => Promise<void>;
  loadWorkspaces: () => Promise<void>;
  loadWorkspaceData: (workspaceId: string) => Promise<void>;
  createWorkspace: (nome: string) => Promise<Workspace>;
  createNota: (titulo: string, conteudo?: string, pastaId?: string | null) => Promise<Nota>;
  updateNota: (id: string, data: { titulo?: string; conteudo?: string; pastaId?: string | null }) => Promise<Nota>;
  deleteNota: (id: string) => Promise<void>;
  createDeck: (nome: string, descricao?: string) => Promise<Deck>;
  deleteDeck: (id: string) => Promise<void>;
  createFlashcard: (deckId: string, frente: string, verso: string, notaId?: string | null) => Promise<Flashcard>;
  reviewFlashcard: (cardId: string, grade: ReviewGrade) => Promise<Flashcard>;
  deleteFlashcard: (cardId: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextData>({} as WorkspaceContextData);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load cached workspace data for instant UI
  const loadCache = async (workspaceId: string) => {
    const cachedNotas = await storage.getCache<Nota[]>(`notas_${workspaceId}`);
    const cachedPastas = await storage.getCache<Pasta[]>(`pastas_${workspaceId}`);
    const cachedDecks = await storage.getCache<Deck[]>(`decks_${workspaceId}`);
    const cachedCards = await storage.getCache<Flashcard[]>(`cards_${workspaceId}`);

    if (cachedNotas) setNotas(cachedNotas);
    if (cachedPastas) setPastas(cachedPastas);
    if (cachedDecks) setDecks(cachedDecks);
    if (cachedCards) setAllCards(cachedCards);
  };

  const loadWorkspaceData = useCallback(async (workspaceId: string) => {
    setIsSyncing(true);
    try {
      // First load from local cache
      await loadCache(workspaceId);

      // Fetch fresh data in parallel
      const [pastasData, notasData, decksData, cardsData] = await Promise.all([
        api<Pasta[]>(`/pastas/workspace/${workspaceId}`).catch(() => []),
        api<Nota[]>(`/notas/workspace/${workspaceId}`).catch(() => []),
        api<Deck[]>(`/flashcards/decks?workspaceId=${workspaceId}`).catch(() => []),
        api<Flashcard[]>(`/flashcards/cards/workspace?workspaceId=${workspaceId}`).catch(() => []),
      ]);

      setPastas(pastasData || []);
      setNotas(notasData || []);
      setDecks(decksData || []);
      setAllCards(cardsData || []);

      // Persist to local cache for offline/instant launch
      await Promise.all([
        storage.setCache(`notas_${workspaceId}`, notasData || []),
        storage.setCache(`pastas_${workspaceId}`, pastasData || []),
        storage.setCache(`decks_${workspaceId}`, decksData || []),
        storage.setCache(`cards_${workspaceId}`, cardsData || []),
      ]);
    } catch (err) {
      console.warn('Error loading workspace data:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const setActiveWorkspace = async (ws: Workspace) => {
    setActiveWorkspaceState(ws);
    await storage.setActiveWorkspaceId(ws.id);
    await loadWorkspaceData(ws.id);
  };

  const loadWorkspaces = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Check cached workspaces
      const cachedWs = await storage.getCache<Workspace[]>('workspaces');
      if (cachedWs && cachedWs.length > 0) {
        setWorkspaces(cachedWs);
      }

      const wsList = await api<Workspace[]>('/workspaces');
      setWorkspaces(wsList || []);
      await storage.setCache('workspaces', wsList || []);

      if (wsList && wsList.length > 0) {
        const savedId = await storage.getActiveWorkspaceId();
        const found = wsList.find((w) => w.id === savedId) || wsList[0];
        setActiveWorkspaceState(found);
        await loadWorkspaceData(found.id);
      } else {
        setActiveWorkspaceState(null);
        setNotas([]);
        setPastas([]);
        setDecks([]);
        setAllCards([]);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadWorkspaceData]);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    } else {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setNotas([]);
      setPastas([]);
      setDecks([]);
      setAllCards([]);
    }
  }, [user, loadWorkspaces]);

  const createWorkspace = async (nome: string): Promise<Workspace> => {
    const created = await api<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ nome: nome.trim() }),
    });

    const updated = [...workspaces, created];
    setWorkspaces(updated);
    await storage.setCache('workspaces', updated);
    await setActiveWorkspace(created);
    return created;
  };

  const createNota = async (titulo: string, conteudo: string = '', pastaId: string | null = null): Promise<Nota> => {
    if (!activeWorkspace) throw new Error('Nenhum workspace selecionado');

    const created = await api<Nota>('/notas', {
      method: 'POST',
      body: JSON.stringify({
        titulo: titulo.trim() || 'Sem título',
        conteudo,
        workspaceId: activeWorkspace.id,
        pastaId: pastaId || undefined,
      }),
    });

    const updated = [created, ...notas];
    setNotas(updated);
    if (activeWorkspace) {
      storage.setCache(`notas_${activeWorkspace.id}`, updated);
    }
    return created;
  };

  const updateNota = async (
    id: string,
    data: { titulo?: string; conteudo?: string; pastaId?: string | null }
  ): Promise<Nota> => {
    // Optimistic UI update
    setNotas((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n))
    );

    const updated = await api<Nota>(`/notas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    setNotas((prev) => {
      const newList = prev.map((n) => (n.id === id ? updated : n));
      if (activeWorkspace) {
        storage.setCache(`notas_${activeWorkspace.id}`, newList);
      }
      return newList;
    });

    return updated;
  };

  const deleteNota = async (id: string): Promise<void> => {
    setNotas((prev) => prev.filter((n) => n.id !== id));
    await api(`/notas/${id}`, { method: 'DELETE' });
    if (activeWorkspace) {
      const remaining = notas.filter((n) => n.id !== id);
      storage.setCache(`notas_${activeWorkspace.id}`, remaining);
    }
  };

  const createDeck = async (nome: string, descricao?: string): Promise<Deck> => {
    if (!activeWorkspace) throw new Error('Nenhum workspace selecionado');

    const created = await api<Deck>('/flashcards/decks', {
      method: 'POST',
      body: JSON.stringify({
        nome: nome.trim(),
        descricao: descricao?.trim() || undefined,
        workspaceId: activeWorkspace.id,
      }),
    });

    const updated = [...decks, created];
    setDecks(updated);
    if (activeWorkspace) {
      storage.setCache(`decks_${activeWorkspace.id}`, updated);
    }
    return created;
  };

  const deleteDeck = async (id: string): Promise<void> => {
    setDecks((prev) => prev.filter((d) => d.id !== id));
    setAllCards((prev) => prev.filter((c) => c.deckId !== id));
    await api(`/flashcards/decks/${id}`, { method: 'DELETE' });
    if (activeWorkspace) {
      const remainingDecks = decks.filter((d) => d.id !== id);
      const remainingCards = allCards.filter((c) => c.deckId !== id);
      storage.setCache(`decks_${activeWorkspace.id}`, remainingDecks);
      storage.setCache(`cards_${activeWorkspace.id}`, remainingCards);
    }
  };

  const createFlashcard = async (
    deckId: string,
    frente: string,
    verso: string,
    notaId?: string | null
  ): Promise<Flashcard> => {
    const created = await api<Flashcard>('/flashcards/cards', {
      method: 'POST',
      body: JSON.stringify({
        deckId,
        frente: frente.trim(),
        verso: verso.trim(),
        notaId: notaId || undefined,
      }),
    });

    const updatedCards = [...allCards, created];
    setAllCards(updatedCards);
    if (activeWorkspace) {
      storage.setCache(`cards_${activeWorkspace.id}`, updatedCards);
    }
    return created;
  };

  const reviewFlashcard = async (cardId: string, grade: ReviewGrade): Promise<Flashcard> => {
    const updated = await api<Flashcard>(`/flashcards/cards/${cardId}/review`, {
      method: 'POST',
      body: JSON.stringify({ grade }),
    });

    const updatedCards = allCards.map((c) => (c.id === cardId ? updated : c));
    setAllCards(updatedCards);
    if (activeWorkspace) {
      storage.setCache(`cards_${activeWorkspace.id}`, updatedCards);
    }
    return updated;
  };

  const deleteFlashcard = async (cardId: string): Promise<void> => {
    setAllCards((prev) => prev.filter((c) => c.id !== cardId));
    await api(`/flashcards/cards/${cardId}`, { method: 'DELETE' });
    if (activeWorkspace) {
      const remaining = allCards.filter((c) => c.id !== cardId);
      storage.setCache(`cards_${activeWorkspace.id}`, remaining);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        pastas,
        notas,
        decks,
        allCards,
        isLoading,
        isSyncing,
        setActiveWorkspace,
        loadWorkspaces,
        loadWorkspaceData,
        createWorkspace,
        createNota,
        updateNota,
        deleteNota,
        createDeck,
        deleteDeck,
        createFlashcard,
        reviewFlashcard,
        deleteFlashcard,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
