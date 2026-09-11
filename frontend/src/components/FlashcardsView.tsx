"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "@/lib/api";

export interface Deck {
  id: string;
  nome: string;
  descricao?: string;
  workspaceId: string;
  parentId?: string | null;
  createdAt: string;
  stats: {
    total: number;
    novos: number;
    aRevisar: number;
    aprendendo: number;
  };
}

export interface Flashcard {
  id: string;
  frente: string;
  verso: string;
  tipo: "card" | "nota";
  deckId: string;
  deck?: {
    id: string;
    nome: string;
    parentId?: string | null;
  };
  notaId?: string;
  nota?: {
    id: string;
    titulo: string;
    conteudo?: string;
  };
  reps: number;
  interval: number;
  easeFactor: number;
  proximaRevisao: string;
  createdAt?: string;
}

interface FlashcardsViewProps {
  workspace: any;
  notas: any[];
  onOpenNota: (nota: any) => void;
  onClose: () => void;
}

type ViewMode = "decks" | "deck-hub" | "review" | "browser";

interface DeckTreeNode {
  deck: Deck;
  children: DeckTreeNode[];
  depth: number;
  path: string;
}

export default function FlashcardsView({
  workspace,
  notas,
  onOpenNota,
  onClose,
}: FlashcardsViewProps) {
  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>("decks");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  // Expanded Decks in Tree View
  const [expandedDeckIds, setExpandedDeckIds] = useState<Set<string>>(new Set());

  // Active Deck Cards & Due Cards
  const [activeDeckCards, setActiveDeckCards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [loadingDeckDetails, setLoadingDeckDetails] = useState(false);

  // Review Mode States
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewingNote, setViewingNote] = useState<any | null>(null);
  const [reviewSuccessFeedback, setReviewSuccessFeedback] = useState<string | null>(null);

  // Browser (Navegador) Mode States
  const [browserCards, setBrowserCards] = useState<Flashcard[]>([]);
  const [browserSearch, setBrowserSearch] = useState("");
  const [browserDeckFilter, setBrowserDeckFilter] = useState<string>("all");
  const [loadingBrowser, setLoadingBrowser] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [movingCard, setMovingCard] = useState<Flashcard | null>(null);
  const [targetMoveDeckId, setTargetMoveDeckId] = useState("");

  // Modals
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [deckParentIdForCreate, setDeckParentIdForCreate] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");

  const [isEditDeckOpen, setIsEditDeckOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [editDeckName, setEditDeckName] = useState("");
  const [editDeckDesc, setEditDeckDesc] = useState("");
  const [editDeckParentId, setEditDeckParentId] = useState<string | null>(null);

  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);

  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [addCardDeckId, setAddCardDeckId] = useState<string>("");
  const [addCardType, setAddCardType] = useState<"card" | "nota">("card");
  const [addCardFrente, setAddCardFrente] = useState("");
  const [addCardVerso, setAddCardVerso] = useState("");
  const [addCardNotaId, setAddCardNotaId] = useState("");
  const [addCardSuccessCount, setAddCardSuccessCount] = useState(0);

  // Context Menu for deck row
  const [openMenuDeckId, setOpenMenuDeckId] = useState<string | null>(null);

  const frenteInputRef = useRef<HTMLInputElement>(null);

  // Fetch Decks
  const loadDecks = useCallback(async () => {
    try {
      setLoading(true);
      const data: Deck[] = await api("/flashcards/decks?workspaceId=" + workspace.id);
      setDecks(data);

      if (activeDeck) {
        const refreshedActive = data.find((d) => d.id === activeDeck.id);
        if (refreshedActive) setActiveDeck(refreshedActive);
      }
    } catch (err) {
      console.error("Erro ao carregar decks", err);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, activeDeck?.id]);

  useEffect(() => {
    loadDecks();
  }, [workspace?.id]);

  // Build Hierarchical Deck Tree & Ordered Flat List
  const { deckTree, flattenedDeckNodes, deckMap, deckPaths } = useMemo(() => {
    const map = new Map<string, Deck>();
    const childrenMap = new Map<string, Deck[]>();
    const paths = new Map<string, string>();

    decks.forEach((d) => {
      map.set(d.id, d);
      const pid = d.parentId || "root";
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(d);
    });

    const buildTree = (parentId: string | null, depth: number, parentPath: string): DeckTreeNode[] => {
      const key = parentId || "root";
      const children = childrenMap.get(key) || [];
      return children.map((deck) => {
        const currentPath = parentPath ? `${parentPath} / ${deck.nome}` : deck.nome;
        paths.set(deck.id, currentPath);
        return {
          deck,
          depth,
          path: currentPath,
          children: buildTree(deck.id, depth + 1, currentPath),
        };
      });
    };

    const tree = buildTree(null, 0, "");

    const flatten = (nodes: DeckTreeNode[]): DeckTreeNode[] => {
      let res: DeckTreeNode[] = [];
      for (const node of nodes) {
        res.push(node);
        if (expandedDeckIds.has(node.deck.id) && node.children.length > 0) {
          res = res.concat(flatten(node.children));
        }
      }
      return res;
    };

    const flat = flatten(tree);

    return {
      deckTree: tree,
      flattenedDeckNodes: flat,
      deckMap: map,
      deckPaths: paths,
    };
  }, [decks, expandedDeckIds]);

  // Toggle tree expansion
  const toggleExpand = (deckId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedDeckIds((prev) => {
      const next = new Set(prev);
      if (next.has(deckId)) next.delete(deckId);
      else next.add(deckId);
      return next;
    });
  };

  // Open Deck Hub
  const openDeckHub = async (deck: Deck) => {
    setActiveDeck(deck);
    setViewMode("deck-hub");
    setLoadingDeckDetails(true);
    try {
      const [cards, due] = await Promise.all([
        api(`/flashcards/decks/${deck.id}/cards?recursive=true`),
        api(`/flashcards/decks/${deck.id}/due`),
      ]);
      setActiveDeckCards(cards);
      setDueCards(due);
    } catch (err) {
      console.error("Erro ao carregar detalhes do deck", err);
    } finally {
      setLoadingDeckDetails(false);
    }
  };

  // Start Review Mode
  const startReview = (deckToReview?: Deck) => {
    const target = deckToReview || activeDeck;
    if (!target) return;
    if (dueCards.length === 0) return;
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setViewingNote(null);
    setReviewSuccessFeedback(null);
    setViewMode("review");
  };

  // Review Grade Submission (SM-2 Algorithm Handler)
  const handleReviewGrade = async (grade: number) => {
    if (!dueCards[currentCardIndex]) return;
    const currentCard = dueCards[currentCardIndex];

    try {
      await api(`/flashcards/cards/${currentCard.id}/review`, {
        method: "POST",
        body: JSON.stringify({ grade }),
      });

      const nextIndex = currentCardIndex + 1;
      if (nextIndex < dueCards.length) {
        setCurrentCardIndex(nextIndex);
        setIsFlipped(false);
        setViewingNote(null);
      } else {
        setReviewSuccessFeedback(`Você concluiu a revisão de todos os ${dueCards.length} cartões programados para hoje!`);
        loadDecks();
        if (activeDeck) {
          Promise.all([
            api(`/flashcards/decks/${activeDeck.id}/cards?recursive=true`),
            api(`/flashcards/decks/${activeDeck.id}/due`),
          ]).then(([cards, due]) => {
            setActiveDeckCards(cards);
            setDueCards(due);
          });
        }
      }
    } catch (err) {
      console.error("Erro ao registrar revisão de flashcard", err);
    }
  };

  // Keyboard Shortcuts for Review (Space to Flip, 1-4 to Grade)
  useEffect(() => {
    if (viewMode !== "review") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === "1") handleReviewGrade(1);
        else if (e.key === "2") handleReviewGrade(2);
        else if (e.key === "3") handleReviewGrade(3);
        else if (e.key === "4") handleReviewGrade(4);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, isFlipped, currentCardIndex, dueCards]);

  // Open Browser Mode
  const openBrowser = async (deckId?: string) => {
    setViewMode("browser");
    setLoadingBrowser(true);
    setBrowserDeckFilter(deckId || "all");
    try {
      const cards = await api(`/flashcards/cards/workspace?workspaceId=${workspace.id}`);
      setBrowserCards(cards);
    } catch (err) {
      console.error("Erro ao carregar cards no navegador", err);
    } finally {
      setLoadingBrowser(false);
    }
  };

  // Create Deck Submit
  const handleCreateDeckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;

    try {
      const created = await api("/flashcards/decks", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: workspace.id,
          nome: newDeckName.trim(),
          descricao: newDeckDesc.trim() || undefined,
          parentId: deckParentIdForCreate || undefined,
        }),
      });

      if (deckParentIdForCreate) {
        setExpandedDeckIds((prev) => new Set(prev).add(deckParentIdForCreate));
      }

      setNewDeckName("");
      setNewDeckDesc("");
      setIsCreateDeckOpen(false);
      await loadDecks();
    } catch (err) {
      console.error("Erro ao criar deck", err);
    }
  };

  // Edit Deck Submit
  const handleEditDeckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeck || !editDeckName.trim()) return;

    try {
      await api(`/flashcards/decks/${editingDeck.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: editDeckName.trim(),
          descricao: editDeckDesc.trim() || undefined,
          parentId: editDeckParentId || null,
        }),
      });

      setIsEditDeckOpen(false);
      setEditingDeck(null);
      await loadDecks();
    } catch (err) {
      console.error("Erro ao editar caderno", err);
    }
  };

  // Confirm Delete Deck
  const confirmDeleteDeck = async () => {
    if (!deletingDeck) return;
    try {
      await api(`/flashcards/decks/${deletingDeck.id}`, { method: "DELETE" });
      setDeletingDeck(null);
      if (activeDeck?.id === deletingDeck.id) {
        setActiveDeck(null);
        setViewMode("decks");
      }
      await loadDecks();
    } catch (err) {
      console.error("Erro ao excluir caderno", err);
    }
  };

  // Add Card Continuous Submission
  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDeckId = addCardDeckId || activeDeck?.id || (decks.length > 0 ? decks[0].id : null);
    if (!targetDeckId) return;

    try {
      if (addCardType === "nota") {
        if (!addCardNotaId) return;
        await api("/flashcards/cards/from-nota", {
          method: "POST",
          body: JSON.stringify({
            deckId: targetDeckId,
            notaId: addCardNotaId,
          }),
        });
      } else {
        if (!addCardFrente.trim() || !addCardVerso.trim()) return;
        await api("/flashcards/cards", {
          method: "POST",
          body: JSON.stringify({
            deckId: targetDeckId,
            frente: addCardFrente.trim(),
            verso: addCardVerso.trim(),
            tipo: "card",
          }),
        });
      }

      setAddCardFrente("");
      setAddCardVerso("");
      setAddCardNotaId("");
      setAddCardSuccessCount((prev) => prev + 1);

      // Re-focus on front input
      setTimeout(() => {
        if (frenteInputRef.current) frenteInputRef.current.focus();
      }, 50);

      // Refresh deck stats in background
      loadDecks();
      if (activeDeck && activeDeck.id === targetDeckId) {
        api(`/flashcards/decks/${activeDeck.id}/cards?recursive=true`).then(setActiveDeckCards);
        api(`/flashcards/decks/${activeDeck.id}/due`).then(setDueCards);
      }
    } catch (err) {
      console.error("Erro ao adicionar card", err);
    }
  };

  // Edit Card in Browser
  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    try {
      const updated = await api(`/flashcards/cards/${editingCard.id}`, {
        method: "PUT",
        body: JSON.stringify({
          frente: editingCard.frente,
          verso: editingCard.verso,
        }),
      });

      setBrowserCards((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      setEditingCard(null);
      loadDecks();
    } catch (err) {
      console.error("Erro ao atualizar card", err);
    }
  };

  // Move Card to another Deck
  const handleMoveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingCard || !targetMoveDeckId) return;

    try {
      const updated = await api(`/flashcards/cards/${movingCard.id}`, {
        method: "PUT",
        body: JSON.stringify({
          deckId: targetMoveDeckId,
        }),
      });

      setBrowserCards((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      setMovingCard(null);
      setTargetMoveDeckId("");
      loadDecks();
    } catch (err) {
      console.error("Erro ao mover card", err);
    }
  };

  // Delete Card
  const handleDeleteCard = async (cardId: string) => {
    try {
      await api(`/flashcards/cards/${cardId}`, { method: "DELETE" });
      setBrowserCards((prev) => prev.filter((c) => c.id !== cardId));
      setActiveDeckCards((prev) => prev.filter((c) => c.id !== cardId));
      setDueCards((prev) => prev.filter((c) => c.id !== cardId));
      loadDecks();
    } catch (err) {
      console.error("Erro ao deletar card", err);
    }
  };

  // Filtered browser cards
  const filteredBrowserCards = useMemo(() => {
    return browserCards.filter((c) => {
      const matchesSearch =
        !browserSearch.trim() ||
        c.frente.toLowerCase().includes(browserSearch.toLowerCase()) ||
        c.verso.toLowerCase().includes(browserSearch.toLowerCase()) ||
        (c.nota?.titulo && c.nota.titulo.toLowerCase().includes(browserSearch.toLowerCase()));

      let matchesDeck = true;
      if (browserDeckFilter !== "all") {
        matchesDeck = c.deckId === browserDeckFilter;
      }

      return matchesSearch && matchesDeck;
    });
  }, [browserCards, browserSearch, browserDeckFilter]);

  // Overall workspace totals
  const overallTotals = useMemo(() => {
    const rootNodes = deckTree;
    let total = 0;
    let novos = 0;
    let aRevisar = 0;

    rootNodes.forEach((node) => {
      total += node.deck.stats.total;
      novos += node.deck.stats.novos;
      aRevisar += node.deck.stats.aRevisar;
    });

    return { total, novos, aRevisar };
  }, [deckTree]);

  // Click outside to close context menu
  useEffect(() => {
    const handleWindowClick = () => {
      if (openMenuDeckId) setOpenMenuDeckId(null);
    };
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, [openMenuDeckId]);

  const currentReviewCard = dueCards[currentCardIndex];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#313338] text-[#dbdee1] select-none font-sans overflow-hidden">
      {/* ─────────────────────────────────────────────────────────
          TOP NAVIGATION & ACTION BAR (DISCORD AESTHETIC)
          ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 sm:px-5 h-12 border-b border-[#383a40] bg-[#2b2d31] shrink-0 z-10">
        {/* Left: Breadcrumbs / Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setViewMode("decks");
              setActiveDeck(null);
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-[4px] font-semibold text-xs transition-colors cursor-pointer shrink-0 ${
              viewMode === "decks" ? "text-white bg-[#35373c]" : "text-[#949ba4] hover:text-white hover:bg-[#35373c]"
            }`}
            title="Ver todos os cadernos"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#20b8cd] shrink-0">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Cadernos</span>
          </button>

          {activeDeck && viewMode !== "decks" && (
            <>
              <span className="text-[#4e5058] text-xs">/</span>
              <button
                type="button"
                onClick={() => openDeckHub(activeDeck)}
                className={`text-xs font-medium px-1.5 sm:px-2 py-1 rounded-[4px] truncate max-w-[100px] sm:max-w-[180px] transition-colors cursor-pointer ${
                  viewMode === "deck-hub" ? "text-white bg-[#35373c]" : "text-[#949ba4] hover:text-white hover:bg-[#35373c]"
                }`}
              >
                {activeDeck.nome}
              </button>
            </>
          )}

          {viewMode === "review" && (
            <>
              <span className="text-[#4e5058] text-xs">/</span>
              <span className="text-xs text-white font-medium bg-[#35373c] px-1.5 sm:px-2 py-1 rounded-[4px] shrink-0">
                <span className="hidden sm:inline">Estudo </span>({currentCardIndex + 1}/{dueCards.length})
              </span>
            </>
          )}

          {viewMode === "browser" && (
            <>
              <span className="text-[#4e5058] text-xs">/</span>
              <span className="text-xs text-white font-medium bg-[#35373c] px-1.5 sm:px-2 py-1 rounded-[4px] truncate max-w-[120px] sm:max-w-none">
                Painel
              </span>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Add Card Button */}
          <button
            type="button"
            onClick={() => {
              setAddCardDeckId(activeDeck?.id || (decks.length > 0 ? decks[0].id : ""));
              setAddCardSuccessCount(0);
              setIsAddCardOpen(true);
            }}
            className="h-7 px-2.5 sm:px-3 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white rounded-[4px] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Adicionar Flashcard"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Adicionar</span>
          </button>

          {/* Browse Cards Manager Button */}
          <button
            type="button"
            onClick={() => openBrowser(activeDeck?.id)}
            className={`h-7 px-2.5 sm:px-3 rounded-[4px] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
              viewMode === "browser"
                ? "bg-[#20b8cd] text-white border-[#20b8cd]"
                : "bg-[#35373c] hover:bg-[#3f4147] text-[#dbdee1] border-[#383a40]"
            }`}
            title="Navegar e gerenciar todos os flashcards"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="hidden sm:inline">Painel</span>
          </button>

          {/* New Deck Button */}
          <button
            type="button"
            onClick={() => {
              setDeckParentIdForCreate(null);
              setIsCreateDeckOpen(true);
            }}
            className="h-7 px-2.5 sm:px-3 bg-[#35373c] hover:bg-[#3f4147] border border-[#383a40] text-[#dbdee1] hover:text-white rounded-[4px] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Novo Caderno"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span className="hidden md:inline">Novo Caderno</span>
          </button>

          <div className="w-[1px] h-4 bg-[#383a40] mx-0.5 sm:mx-1" />

          {/* Close Flashcards Panel */}
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[4px] text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer"
            title="Fechar Flashcards"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          MAIN CONTENT AREA BASED ON VIEW MODE
          ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* MODE 1: DECKS TREE TABLE VIEW (ANKI DESKTOP STYLE) */}
        {viewMode === "decks" && (
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-7 flex justify-center">
            <div className="w-full max-w-[840px] flex flex-col gap-4">
              {/* Header Summary Cards */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#383a40]">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight m-0 mb-1">
                    Meus Cadernos
                  </h1>
                  <p className="text-xs text-[#949ba4] m-0">
                    Selecione um caderno para iniciar o estudo ou expanda para gerenciar subcadernos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono">
                  {/* Novos */}
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-[6px] bg-[#20b8cd]/10 border border-[#20b8cd]/20">
                    <span className="w-2 h-2 rounded-full bg-[#20b8cd]" />
                    <span className="text-[#949ba4]">Novos:</span>
                    <strong className="text-[#20b8cd] font-semibold">{overallTotals.novos}</strong>
                  </div>

                  {/* A Revisar */}
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-[6px] bg-[#23a55a]/10 border border-[#23a55a]/20">
                    <span className="w-2 h-2 rounded-full bg-[#23a55a]" />
                    <span className="text-[#949ba4]">A Revisar:</span>
                    <strong className="text-[#23a55a] font-semibold">{overallTotals.aRevisar}</strong>
                  </div>

                  {/* Total */}
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-[6px] bg-[#2b2d31] border border-[#383a40]">
                    <span className="text-[#949ba4]">Total:</span>
                    <strong className="text-white font-semibold">{overallTotals.total}</strong>
                  </div>
                </div>
              </div>

              {/* Anki Tree Table (Discord Dark Card) */}
              <div className="bg-[#2b2d31] border border-[#383a40] rounded-[8px] overflow-hidden shadow-lg">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_60px_60px_36px] sm:grid-cols-[1fr_80px_80px_70px_44px] px-3 sm:px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#949ba4] border-b border-[#383a40] bg-[#1e1f22]">
                  <div>Caderno</div>
                  <div className="text-right">Novos</div>
                  <div className="text-right">Revisar</div>
                  <div className="hidden sm:block text-right">Total</div>
                  <div className="text-center">Ações</div>
                </div>

                {/* Table Rows */}
                {loading ? (
                  <div className="p-10 text-center text-xs text-[#949ba4]">
                    Carregando cadernos...
                  </div>
                ) : flattenedDeckNodes.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-[10px] bg-[#1e1f22] border border-[#383a40] flex items-center justify-center text-[#949ba4]">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    </div>
                    <p className="m-0 text-sm font-semibold text-white">
                      Nenhum caderno criado
                    </p>
                    <p className="m-0 text-xs text-[#949ba4] max-w-[320px]">
                      Crie seu primeiro caderno para começar a adicionar flashcards com repetição espaçada.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreateDeckOpen(true)}
                      className="mt-2 h-8 px-4 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer"
                    >
                      + Criar Primeiro Caderno
                    </button>
                  </div>
                ) : (
                  flattenedDeckNodes.map((node) => {
                    const deck = node.deck;
                    const hasChildren = node.children && node.children.length > 0;
                    const isExpanded = expandedDeckIds.has(deck.id);

                    return (
                      <div
                        key={deck.id}
                        onClick={() => openDeckHub(deck)}
                        className="grid grid-cols-[1fr_60px_60px_36px] sm:grid-cols-[1fr_80px_80px_70px_44px] items-center px-3 sm:px-4 py-2.5 border-b border-[#383a40]/60 hover:bg-[#35373c] transition-colors cursor-pointer text-xs"
                      >
                        {/* Deck Name & Hierarchy Tree Chevron */}
                        <div className="flex items-center overflow-hidden" style={{ paddingLeft: `${Math.min(node.depth * 14, 28)}px` }}>
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => toggleExpand(deck.id, e)}
                              className="w-5 h-5 flex items-center justify-center rounded-[3px] hover:bg-[#3f4147] text-[#949ba4] hover:text-white mr-1.5 cursor-pointer shrink-0"
                              title={isExpanded ? "Recolher subcadernos" : "Expandir subcadernos"}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                style={{
                                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                  transition: "transform 0.15s ease",
                                }}
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>
                          ) : (
                            <div className="w-5 mr-1.5 flex items-center justify-center shrink-0">
                              <span className="w-1 h-1 rounded-full bg-[#4e5058]" />
                            </div>
                          )}

                          <div className="flex items-center gap-2 overflow-hidden min-w-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#20b8cd] shrink-0">
                              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                              <path d="M6 6h10" />
                              <path d="M6 10h10" />
                            </svg>
                            <span className="font-medium text-white truncate">
                              {deck.nome}
                            </span>
                          </div>
                        </div>

                        {/* Novos */}
                        <div className={`text-right font-mono font-semibold ${deck.stats.novos > 0 ? "text-[#20b8cd]" : "text-[#80848e]"}`}>
                          {deck.stats.novos}
                        </div>

                        {/* A Revisar */}
                        <div className={`text-right font-mono font-semibold ${deck.stats.aRevisar > 0 ? "text-[#23a55a]" : "text-[#80848e]"}`}>
                          {deck.stats.aRevisar}
                        </div>

                        {/* Total */}
                        <div className="hidden sm:block text-right font-mono text-[#949ba4]">
                          {deck.stats.total}
                        </div>

                        {/* Actions Context Menu */}
                        <div className="text-center relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuDeckId(openMenuDeckId === deck.id ? null : deck.id);
                            }}
                            className="w-6 h-6 inline-flex items-center justify-center rounded-[4px] text-[#949ba4] hover:text-white hover:bg-[#3f4147] transition-colors cursor-pointer"
                            title="Opções do Caderno"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="19" cy="12" r="1" />
                              <circle cx="5" cy="12" r="1" />
                            </svg>
                          </button>

                          {/* Dropdown Menu (Discord Dark) */}
                          {openMenuDeckId === deck.id && (
                            <div className="absolute right-0 top-7 z-50 w-44 bg-[#1e1f22] border border-[#383a40] rounded-[6px] p-1 shadow-2xl text-left text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuDeckId(null);
                                  openDeckHub(deck);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[#dbdee1] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#23a55a]">
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                <span>Estudar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuDeckId(null);
                                  setDeckParentIdForCreate(deck.id);
                                  setIsCreateDeckOpen(true);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[#dbdee1] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#20b8cd]">
                                  <line x1="12" y1="5" x2="12" y2="19" />
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                <span>Criar Subcaderno</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuDeckId(null);
                                  setEditingDeck(deck);
                                  setEditDeckName(deck.nome);
                                  setEditDeckDesc(deck.descricao || "");
                                  setEditDeckParentId(deck.parentId || null);
                                  setIsEditDeckOpen(true);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[#dbdee1] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#f0b232]">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                                <span>Renomear</span>
                              </button>

                              <div className="h-[1px] bg-[#383a40] my-1" />

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuDeckId(null);
                                  setDeletingDeck(deck);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[#f23f43] hover:bg-[#f23f43]/15 transition-colors cursor-pointer"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                </svg>
                                <span>Excluir</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: DECK HUB / OVERVIEW */}
        {viewMode === "deck-hub" && activeDeck && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-9 px-4 sm:px-6 flex flex-col items-center">
            <div className="w-full max-w-[560px] flex flex-col items-center text-center">
              {/* Back to all decks */}
              <button
                type="button"
                onClick={() => {
                  setViewMode("decks");
                  loadDecks();
                }}
                className="self-start flex items-center gap-1.5 text-xs text-[#949ba4] hover:text-white transition-colors cursor-pointer mb-6"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Voltar para Cadernos</span>
              </button>

              {/* Deck Icon Box */}
              <div className="w-14 h-14 rounded-[12px] border border-[#383a40] bg-[#1e1f22] flex items-center justify-center text-[#20b8cd] mb-4 shadow-md">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              </div>

              {/* Breadcrumb Hierarchy Path */}
              {deckPaths.get(activeDeck.id) && (
                <div className="text-[11px] text-[#949ba4] mb-1 uppercase tracking-wider font-semibold">
                  {deckPaths.get(activeDeck.id)}
                </div>
              )}

              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {activeDeck.nome}
              </h2>

              {activeDeck.descricao && (
                <p className="text-xs text-[#949ba4] mb-6 leading-relaxed max-w-[420px]">
                  {activeDeck.descricao}
                </p>
              )}

              {/* Study Metrics Card */}
              <div className="w-full bg-[#2b2d31] border border-[#383a40] rounded-[8px] p-4 sm:p-5 my-3 sm:my-4 mb-6 grid grid-cols-3 divide-x divide-[#383a40] text-center shadow-lg">
                <div className="flex flex-col items-center">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-[#20b8cd]">
                    {activeDeck.stats.novos}
                  </span>
                  <span className="text-[11px] text-[#949ba4] mt-1">Novos</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-[#23a55a]">
                    {activeDeck.stats.aRevisar}
                  </span>
                  <span className="text-[11px] text-[#949ba4] mt-1">A Revisar</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                    {activeDeck.stats.total}
                  </span>
                  <span className="text-[11px] text-[#949ba4] mt-1">Total Cards</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => startReview(activeDeck)}
                  disabled={dueCards.length === 0}
                  className={`h-11 text-sm font-semibold rounded-[6px] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md ${
                    dueCards.length === 0
                      ? "bg-[#35373c] text-[#80848e] cursor-not-allowed"
                      : "bg-[#20b8cd] hover:bg-[#1ba2b4] text-white"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>
                    {dueCards.length === 0 ? "Tudo Revisado por Hoje" : `Estudar Agora (${dueCards.length} cards)`}
                  </span>
                </button>

                <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setAddCardDeckId(activeDeck.id);
                      setIsAddCardOpen(true);
                    }}
                    className="flex-1 h-9 bg-[#2b2d31] hover:bg-[#35373c] border border-[#383a40] text-white rounded-[6px] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>+ Card neste Caderno</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openBrowser(activeDeck.id)}
                    className="flex-1 h-9 bg-[#2b2d31] hover:bg-[#35373c] border border-[#383a40] text-white rounded-[6px] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>Ver Cards ({activeDeckCards.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: ACTIVE REVIEW SESSION */}
        {viewMode === "review" && (
          <div className="flex-1 flex flex-col items-center justify-center p-3.5 sm:p-6 relative">
            {reviewSuccessFeedback ? (
              <div className="max-w-md text-center flex flex-col items-center gap-4 bg-[#2b2d31] border border-[#383a40] p-6 sm:p-8 rounded-[12px] shadow-2xl animate-in fade-in duration-200 mx-4">
                <div className="w-14 h-14 rounded-full bg-[#23a55a]/15 border border-[#23a55a]/30 flex items-center justify-center text-[#23a55a]">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="m-0 text-xl font-bold text-white tracking-tight">Sessão Finalizada!</h3>
                <p className="m-0 text-xs text-[#949ba4] leading-relaxed">
                  {reviewSuccessFeedback}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("decks");
                    setActiveDeck(null);
                  }}
                  className="mt-2 h-9 px-6 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white font-medium text-xs rounded-[6px] transition-colors cursor-pointer"
                >
                  Voltar aos Cadernos
                </button>
              </div>
            ) : currentReviewCard ? (
              <>
                {/* Top Progress bar */}
                <div className="absolute top-2.5 sm:top-4 w-full max-w-[580px] flex flex-col gap-1.5 px-3 sm:px-4">
                  <div className="flex items-center justify-between text-xs text-[#949ba4]">
                    <span className="truncate max-w-[200px] sm:max-w-none">
                      Caderno: <strong className="text-white font-medium">{currentReviewCard.deck?.nome || activeDeck?.nome}</strong>
                    </span>
                    <span className="font-mono text-white shrink-0 ml-2">
                      {currentCardIndex + 1} de {dueCards.length}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1e1f22] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#20b8cd] transition-all duration-300 rounded-full"
                      style={{
                        width: `${((currentCardIndex + 1) / dueCards.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Main Review Card Box */}
                <div className="w-full max-w-[600px] min-h-[240px] sm:min-h-[300px] flex flex-col items-center justify-center mt-7 sm:mt-8">
                  <div
                    onClick={() => setIsFlipped((prev) => !prev)}
                    className="w-full min-h-[230px] sm:min-h-[290px] bg-[#2b2d31] border border-[#383a40] hover:border-[#4e5058] rounded-[10px] sm:rounded-[12px] p-5 sm:p-8 flex flex-col justify-between cursor-pointer transition-all shadow-2xl"
                  >
                    {/* Card Header Tag */}
                    <div className="flex items-center justify-between text-[11px] text-[#949ba4] font-mono uppercase tracking-wider">
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#1e1f22] border border-[#383a40]">
                        {currentReviewCard.tipo === "nota" ? "Nota Vinculada" : "Flashcard"}
                      </span>
                      <span className={isFlipped ? "text-[#23a55a] font-semibold" : "text-[#20b8cd] font-semibold"}>
                        {isFlipped ? "Verso (Resposta)" : "Frente (Pergunta)"}
                      </span>
                    </div>

                    {/* Card Front & Back Content */}
                    <div className="my-4 sm:my-6 text-center">
                      <p className="text-lg sm:text-xl font-medium text-white leading-relaxed m-0">
                        {currentReviewCard.frente}
                      </p>

                      {isFlipped && (
                        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-[#383a40] text-center animate-in fade-in duration-150">
                          {currentReviewCard.tipo === "nota" ? (
                            <div className="flex flex-col items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingNote(currentReviewCard.nota);
                                }}
                                className="px-3.5 py-2 bg-[#1e1f22] hover:bg-[#35373c] border border-[#383a40] text-white rounded-[6px] text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#20b8cd]">
                                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                </svg>
                                <span>Ver Conteúdo Completo da Nota</span>
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm sm:text-base text-[#dbdee1] leading-relaxed m-0 whitespace-pre-wrap">
                              {currentReviewCard.verso}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Hint */}
                    <div className="text-center text-[11px] text-[#80848e]">
                      {!isFlipped ? "Toque no card ou pressione [Espaço] para mostrar a resposta" : "Como foi sua recordação deste card?"}
                    </div>
                  </div>
                </div>

                {/* Rating Grade Buttons */}
                <div className="mt-5 sm:mt-6 flex items-center justify-center w-full">
                  {!isFlipped ? (
                    <button
                      type="button"
                      onClick={() => setIsFlipped(true)}
                      className="px-7 h-10 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white font-semibold text-xs rounded-[6px] flex items-center gap-2 transition-colors cursor-pointer shadow-md"
                    >
                      <span>Mostrar Resposta</span>
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-black/25 rounded text-white/90 hidden sm:inline">
                        Espaço
                      </kbd>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full max-w-xs sm:max-w-none sm:w-auto">
                      {/* 1 - Errei */}
                      <button
                        type="button"
                        onClick={() => handleReviewGrade(1)}
                        className="flex flex-col items-center px-3 sm:px-4 py-2 sm:py-1.5 rounded-[6px] bg-[#f23f43]/15 hover:bg-[#f23f43]/25 border border-[#f23f43]/40 text-[#f23f43] transition-colors cursor-pointer w-full sm:min-w-[84px]"
                      >
                        <span className="text-xs font-semibold">Errei</span>
                        <span className="text-[10px] opacity-80 mt-0.5">&lt; 1d (1)</span>
                      </button>

                      {/* 2 - Difícil */}
                      <button
                        type="button"
                        onClick={() => handleReviewGrade(2)}
                        className="flex flex-col items-center px-3 sm:px-4 py-2 sm:py-1.5 rounded-[6px] bg-[#f0b232]/15 hover:bg-[#f0b232]/25 border border-[#f0b232]/40 text-[#f0b232] transition-colors cursor-pointer w-full sm:min-w-[84px]"
                      >
                        <span className="text-xs font-semibold">Difícil</span>
                        <span className="text-[10px] opacity-80 mt-0.5">3d (2)</span>
                      </button>

                      {/* 3 - Bom */}
                      <button
                        type="button"
                        onClick={() => handleReviewGrade(3)}
                        className="flex flex-col items-center px-3 sm:px-4 py-2 sm:py-1.5 rounded-[6px] bg-[#23a55a]/15 hover:bg-[#23a55a]/25 border border-[#23a55a]/40 text-[#23a55a] transition-colors cursor-pointer w-full sm:min-w-[84px]"
                      >
                        <span className="text-xs font-semibold">Bom</span>
                        <span className="text-[10px] opacity-80 mt-0.5">6d (3)</span>
                      </button>

                      {/* 4 - Fácil */}
                      <button
                        type="button"
                        onClick={() => handleReviewGrade(4)}
                        className="flex flex-col items-center px-3 sm:px-4 py-2 sm:py-1.5 rounded-[6px] bg-[#20b8cd]/15 hover:bg-[#20b8cd]/25 border border-[#20b8cd]/40 text-[#20b8cd] transition-colors cursor-pointer w-full sm:min-w-[84px]"
                      >
                        <span className="text-xs font-semibold">Fácil</span>
                        <span className="text-[10px] opacity-80 mt-0.5">10d+ (4)</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* MODE 4: BROWSER / NAVEGADOR DE CARDS (ANKI BROWSE) */}
        {viewMode === "browser" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 px-3 sm:px-5 border-b border-[#383a40] bg-[#2b2d31]">
              {/* Search input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={browserSearch}
                  onChange={(e) => setBrowserSearch(e.target.value)}
                  placeholder="Pesquisar cards por pergunta, resposta ou nota..."
                  className="w-full h-8 pl-8 pr-3 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[6px] text-xs text-[#dbdee1] placeholder-[#80848e] outline-none transition-colors"
                />
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-2.5 top-2.5 text-[#80848e]"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              {/* Deck Filter Dropdown & Count */}
              <div className="flex items-center gap-2 justify-between sm:justify-start">
                <select
                  value={browserDeckFilter}
                  onChange={(e) => setBrowserDeckFilter(e.target.value)}
                  className="h-8 px-2.5 bg-[#1e1f22] border border-[#383a40] rounded-[6px] text-xs text-[#dbdee1] outline-none cursor-pointer flex-1 sm:flex-none"
                >
                  <option value="all">Todos os Cadernos ({browserCards.length})</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {deckPaths.get(d.id) || d.nome}
                    </option>
                  ))}
                </select>

                <div className="text-xs font-mono text-[#949ba4] shrink-0">
                  {filteredBrowserCards.length} cards
                </div>
              </div>
            </div>

            {/* Browser Table */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              {loadingBrowser ? (
                <div className="p-10 text-center text-xs text-[#949ba4]">
                  Carregando cards do workspace...
                </div>
              ) : filteredBrowserCards.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#949ba4]">
                  Nenhum card encontrado com os filtros atuais.
                </div>
              ) : (
                <table className="w-full min-w-[560px] border-collapse text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#383a40] bg-[#1e1f22] text-[11px] font-semibold uppercase tracking-wider text-[#949ba4]">
                      <th className="py-2.5 px-4 w-[35%]">Frente (Pergunta)</th>
                      <th className="py-2.5 px-4 w-[35%]">Verso (Resposta)</th>
                      <th className="py-2.5 px-4 w-[15%]">Caderno</th>
                      <th className="py-2.5 px-4 w-[15%] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrowserCards.map((c) => (
                      <tr key={c.id} className="hover:bg-[#35373c] transition-colors border-b border-[#383a40]/60">
                        <td className="py-3 px-4 align-top">
                          <span className="font-medium text-white">{c.frente}</span>
                          {c.tipo === "nota" && (
                            <span className="inline-block ml-1.5 text-[10px] px-1.5 py-0.2 bg-[#1e1f22] border border-[#383a40] rounded text-[#949ba4]">
                              Nota
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top text-[#949ba4]">
                          <div className="line-clamp-2">
                            {c.verso}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top text-[#949ba4]">
                          {c.deck?.nome || deckMap.get(c.deckId)?.nome || "—"}
                        </td>
                        <td className="py-3 px-4 align-top text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Move Card */}
                            <button
                              type="button"
                              onClick={() => {
                                setMovingCard(c);
                                setTargetMoveDeckId(c.deckId);
                              }}
                              className="h-6 px-2 text-[11px] bg-[#1e1f22] hover:bg-[#35373c] border border-[#383a40] text-[#dbdee1] hover:text-white rounded-[4px] transition-colors cursor-pointer"
                              title="Mover card para outro caderno"
                            >
                              Mover
                            </button>

                            {/* Edit Card */}
                            <button
                              type="button"
                              onClick={() => setEditingCard(c)}
                              className="h-6 px-2 text-[11px] bg-[#1e1f22] hover:bg-[#35373c] border border-[#383a40] text-[#dbdee1] hover:text-white rounded-[4px] transition-colors cursor-pointer"
                              title="Editar conteúdo do card"
                            >
                              Editar
                            </button>

                            {/* Delete Card */}
                            <button
                              type="button"
                              onClick={() => handleDeleteCard(c.id)}
                              className="w-6 h-6 flex items-center justify-center text-[#949ba4] hover:text-[#f23f43] hover:bg-[#f23f43]/15 rounded-[4px] transition-colors cursor-pointer"
                              title="Excluir card"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────
          MODAL: ADICIONAR NOVO CARD (CONTÍNUO)
          ───────────────────────────────────────────────────────── */}
      {isAddCardOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setIsAddCardOpen(false)}
        >
          <div
            className="bg-[#313338] border border-[#383a40] rounded-[8px] max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#dbdee1]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 px-5 border-b border-[#383a40] bg-[#2b2d31] flex items-center justify-between shrink-0">
              <div>
                <h3 className="m-0 text-sm font-semibold text-white tracking-tight">
                  Adicionar Flashcard
                </h3>
                <p className="m-0 text-xs text-[#949ba4] mt-0.5">
                  Crie cards de memorização ativa com perguntas e respostas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCardOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer shrink-0"
                title="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} className="p-5 flex flex-col gap-3.5 overflow-y-auto">
              {/* Type Switcher */}
              <div className="flex items-center gap-2 p-1 bg-[#1e1f22] border border-[#383a40] rounded-[6px]">
                <button
                  type="button"
                  onClick={() => setAddCardType("card")}
                  className={`flex-1 py-1 text-xs font-medium rounded-[4px] transition-colors cursor-pointer ${
                    addCardType === "card" ? "bg-[#20b8cd] text-white" : "text-[#949ba4] hover:text-white"
                  }`}
                >
                  Card Personalizado
                </button>
                <button
                  type="button"
                  onClick={() => setAddCardType("nota")}
                  className={`flex-1 py-1 text-xs font-medium rounded-[4px] transition-colors cursor-pointer ${
                    addCardType === "nota" ? "bg-[#20b8cd] text-white" : "text-[#949ba4] hover:text-white"
                  }`}
                >
                  Vincular a uma Nota
                </button>
              </div>

              {/* Target Deck Selection */}
              <div>
                <label className="text-xs font-medium text-[#949ba4] block mb-1">
                  Caderno de Destino
                </label>
                <select
                  value={addCardDeckId}
                  onChange={(e) => setAddCardDeckId(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] outline-none cursor-pointer"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {deckPaths.get(d.id) || d.nome}
                    </option>
                  ))}
                </select>
              </div>

              {addCardType === "card" ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-[#949ba4] block mb-1">
                      Frente (Pergunta / Conceito)
                    </label>
                    <input
                      ref={frenteInputRef}
                      type="text"
                      value={addCardFrente}
                      onChange={(e) => setAddCardFrente(e.target.value)}
                      placeholder="Ex: Qual o princípio da conservação da energia?"
                      autoFocus
                      required
                      className="w-full h-8 px-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] placeholder-[#80848e] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#949ba4] block mb-1">
                      Verso (Resposta / Explicação)
                    </label>
                    <textarea
                      value={addCardVerso}
                      onChange={(e) => setAddCardVerso(e.target.value)}
                      placeholder="Ex: A energia não pode ser criada nem destruída, apenas transformada..."
                      rows={3}
                      required
                      className="w-full p-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] placeholder-[#80848e] outline-none resize-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-medium text-[#949ba4] block mb-1">
                    Selecione a Nota do Workspace
                  </label>
                  <select
                    value={addCardNotaId}
                    onChange={(e) => setAddCardNotaId(e.target.value)}
                    required
                    className="w-full h-8 px-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] outline-none cursor-pointer"
                  >
                    <option value="">-- Escolha uma nota existente --</option>
                    {notas.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Feedback footer and buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#383a40] mt-1">
                <span className="text-[11px] text-[#23a55a] font-medium">
                  {addCardSuccessCount > 0 ? `✓ ${addCardSuccessCount} card(s) adicionados nesta sessão` : ""}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCardOpen(false)}
                    className="h-8 px-3 text-xs text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded-[4px] transition-colors cursor-pointer"
                  >
                    Concluir
                  </button>
                  <button
                    type="submit"
                    className="h-8 px-4 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer shadow-sm"
                  >
                    Salvar e Adicionar Outro
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: CRIAR NOVO CADERNO
          ───────────────────────────────────────────────────────── */}
      {isCreateDeckOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setIsCreateDeckOpen(false)}
        >
          <div
            className="bg-[#313338] border border-[#383a40] rounded-[8px] max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#dbdee1]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 px-5 border-b border-[#383a40] bg-[#2b2d31] flex items-center justify-between shrink-0">
              <div>
                <h3 className="m-0 text-sm font-semibold text-white tracking-tight">
                  {deckParentIdForCreate ? "Novo Subcaderno" : "Novo Caderno"}
                </h3>
                <p className="m-0 text-xs text-[#949ba4] mt-0.5">
                  {deckParentIdForCreate
                    ? `Criando subcaderno dentro de "${deckMap.get(deckParentIdForCreate)?.nome || "Caderno Pai"}"`
                    : "Crie um novo caderno para agrupar seus flashcards."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateDeckOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer shrink-0"
                title="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateDeckSubmit} className="p-5 flex flex-col gap-3.5 overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-[#949ba4] block mb-1">
                  Nome do Caderno
                </label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Ex: Anatomia, Fisiologia, Vocabulário..."
                  autoFocus
                  required
                  className="w-full h-8 px-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] placeholder-[#80848e] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#949ba4] block mb-1">
                  Caderno Pai (Opcional)
                </label>
                <select
                  value={deckParentIdForCreate || ""}
                  onChange={(e) => setDeckParentIdForCreate(e.target.value || null)}
                  className="w-full h-8 px-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] outline-none cursor-pointer"
                >
                  <option value="">-- Raiz (Nenhum / Nível Principal) --</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {deckPaths.get(d.id) || d.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#949ba4] block mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  placeholder="Objetivo ou tópicos abordados..."
                  rows={2}
                  className="w-full p-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] placeholder-[#80848e] outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#383a40] mt-1">
                <button
                  type="button"
                  onClick={() => setIsCreateDeckOpen(false)}
                  className="h-8 px-3 text-xs text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded-[4px] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer shadow-sm"
                >
                  Criar Caderno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: EDITAR / RENOMEAR CADERNO
          ───────────────────────────────────────────────────────── */}
      {isEditDeckOpen && editingDeck && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setIsEditDeckOpen(false)}
        >
          <div
            className="bg-[#313338] border border-[#383a40] rounded-[8px] max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#dbdee1]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 px-5 border-b border-[#383a40] bg-[#2b2d31] flex items-center justify-between shrink-0">
              <div>
                <h3 className="m-0 text-sm font-semibold text-white tracking-tight">
                  Editar Caderno
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditDeckOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer shrink-0"
                title="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditDeckSubmit} className="p-5 flex flex-col gap-3.5 overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-[#949ba4] block mb-1">
                  Nome do Caderno
                </label>
                <input
                  type="text"
                  value={editDeckName}
                  onChange={(e) => setEditDeckName(e.target.value)}
                  autoFocus
                  required
                  className="w-full h-8 px-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#949ba4] block mb-1">
                  Caderno Pai
                </label>
                <select
                  value={editDeckParentId || ""}
                  onChange={(e) => setEditDeckParentId(e.target.value || null)}
                  className="w-full h-8 px-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] outline-none cursor-pointer"
                >
                  <option value="">-- Raiz (Nenhum) --</option>
                  {decks
                    .filter((d) => d.id !== editingDeck.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {deckPaths.get(d.id) || d.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#949ba4] block mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={editDeckDesc}
                  onChange={(e) => setEditDeckDesc(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#383a40] mt-1">
                <button
                  type="button"
                  onClick={() => setIsEditDeckOpen(false)}
                  className="h-8 px-3 text-xs text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded-[4px] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: CONFIRMAR EXCLUSÃO DE CADERNO (CASCADE)
          ───────────────────────────────────────────────────────── */}
      {deletingDeck && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setDeletingDeck(null)}
        >
          <div
            className="bg-[#313338] border border-[#383a40] rounded-[8px] max-w-sm w-full shadow-2xl p-5 text-[#dbdee1]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 mb-2 text-base font-semibold text-[#f23f43]">
              Excluir Caderno
            </h3>
            <p className="m-0 mb-4 text-xs text-[#949ba4] leading-relaxed">
              Tem certeza que deseja excluir o caderno <strong className="text-white">"{deletingDeck.nome}"</strong>? Esta ação excluirá todos os subcadernos e flashcards associados em cascata.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingDeck(null)}
                className="h-8 px-3 text-xs text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded-[4px] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteDeck}
                className="h-8 px-4 bg-[#f23f43] hover:bg-[#da373c] text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: EDITAR CARD INDIVIDUAL (DO BROWSER)
          ───────────────────────────────────────────────────────── */}
      {editingCard && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setEditingCard(null)}
        >
          <div
            className="bg-[#313338] border border-[#383a40] rounded-[8px] max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#dbdee1]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 px-5 border-b border-[#383a40] bg-[#2b2d31] flex items-center justify-between shrink-0">
              <h3 className="m-0 text-sm font-semibold text-white tracking-tight">Editar Flashcard</h3>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer shrink-0"
                title="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateCard} className="p-5 flex flex-col gap-3.5 overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-[#949ba4] block mb-1">
                  Frente (Pergunta)
                </label>
                <input
                  type="text"
                  value={editingCard.frente}
                  onChange={(e) => setEditingCard({ ...editingCard, frente: e.target.value })}
                  required
                  className="w-full h-8 px-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#949ba4] block mb-1">
                  Verso (Resposta)
                </label>
                <textarea
                  value={editingCard.verso}
                  onChange={(e) => setEditingCard({ ...editingCard, verso: e.target.value })}
                  rows={3}
                  required
                  className="w-full p-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#383a40] mt-1">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="h-8 px-3 text-xs text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded-[4px] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: MOVER CARD PARA OUTRO CADERNO
          ───────────────────────────────────────────────────────── */}
      {movingCard && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setMovingCard(null)}
        >
          <div
            className="bg-[#313338] border border-[#383a40] rounded-[8px] max-w-sm w-full shadow-2xl p-5 text-[#dbdee1]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 mb-1.5 text-base font-semibold text-white">Mover Flashcard</h3>
            <p className="m-0 mb-4 text-xs text-[#949ba4] leading-relaxed">
              Selecione o novo caderno para o card "<strong className="text-white">{movingCard.frente}</strong>".
            </p>

            <form onSubmit={handleMoveCard} className="flex flex-col gap-3.5">
              <select
                value={targetMoveDeckId}
                onChange={(e) => setTargetMoveDeckId(e.target.value)}
                required
                className="w-full h-8 px-2.5 bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] text-xs text-[#dbdee1] outline-none cursor-pointer"
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {deckPaths.get(d.id) || d.nome}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#383a40]">
                <button
                  type="button"
                  onClick={() => setMovingCard(null)}
                  className="h-8 px-3 text-xs text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded-[4px] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer shadow-sm"
                >
                  Mover Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: VISUALIZAR CONTEÚDO LIMPO DA NOTA DURANTE REVISÃO
          ───────────────────────────────────────────────────────── */}
      {viewingNote && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setViewingNote(null)}
        >
          <div
            className="bg-[#313338] border border-[#383a40] rounded-[8px] max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden text-[#dbdee1]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 px-5 border-b border-[#383a40] bg-[#2b2d31] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#20b8cd]">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <h3 className="m-0 text-sm font-semibold text-white truncate max-w-sm">
                  {viewingNote.titulo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer shrink-0"
                title="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div
              className="p-5 overflow-y-auto text-xs leading-relaxed text-[#dbdee1] prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: viewingNote.conteudo || '<p class="text-[#80848e]">Esta nota está vazia.</p>' }}
            />

            <div className="p-3.5 px-5 border-t border-[#383a40] bg-[#2b2d31] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenNota(viewingNote);
                  setViewingNote(null);
                  onClose();
                }}
                className="h-8 px-3 text-xs bg-[#35373c] hover:bg-[#3f4147] border border-[#383a40] text-white rounded-[4px] transition-colors cursor-pointer"
              >
                Abrir no Editor
              </button>
              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="h-8 px-4 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
