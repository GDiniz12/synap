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

  // Add Card Continuous Modal
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [addCardDeckId, setAddCardDeckId] = useState<string>("");
  const [addCardType, setAddCardType] = useState<"card" | "nota">("card");
  const [addCardFrente, setAddCardFrente] = useState("");
  const [addCardVerso, setAddCardVerso] = useState("");
  const [addCardNotaId, setAddCardNotaId] = useState("");
  const [addCardSuccessCount, setAddCardSuccessCount] = useState(0);

  // Active Action Dropdown menu
  const [openMenuDeckId, setOpenMenuDeckId] = useState<string | null>(null);

  const frenteInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Load Decks from API
  const loadDecks = useCallback(async () => {
    if (!workspace?.id) return;
    try {
      setLoading(true);
      const data: Deck[] = await api("/flashcards/decks?workspaceId=" + workspace.id);
      setDecks(data);

      // Auto expand all parent decks by default on first load
      setExpandedDeckIds((prev) => {
        if (prev.size === 0) {
          const parents = new Set<string>();
          data.forEach((d) => {
            if (d.parentId) parents.add(d.parentId);
          });
          return parents;
        }
        return prev;
      });

      // Update activeDeck reference if existing
      if (activeDeck) {
        const updated = data.find((d) => d.id === activeDeck.id);
        if (updated) setActiveDeck(updated);
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

  // Submit SM-2 Review
  const handleReviewGrade = async (grade: 1 | 2 | 3 | 4) => {
    const currentCard = dueCards[currentCardIndex];
    if (!currentCard) return;

    try {
      await api(`/flashcards/cards/${currentCard.id}/review`, {
        method: "POST",
        body: JSON.stringify({ grade }),
      });

      if (currentCardIndex + 1 < dueCards.length) {
        setCurrentCardIndex((prev) => prev + 1);
        setIsFlipped(false);
        setViewingNote(null);
      } else {
        // Finished review session
        setReviewSuccessFeedback("Parabéns! Você revisou todos os cards agendados para este caderno por hoje.");
        await loadDecks();
        if (activeDeck) {
          const [cards, due] = await Promise.all([
            api(`/flashcards/decks/${activeDeck.id}/cards?recursive=true`),
            api(`/flashcards/decks/${activeDeck.id}/due`),
          ]);
          setActiveDeckCards(cards);
          setDueCards(due);
        }
      }
    } catch (err) {
      console.error("Erro ao registrar revisão", err);
    }
  };

  // Keyboard shortcuts for review session
  useEffect(() => {
    if (viewMode !== "review" || isAddCardOpen || isCreateDeckOpen || isEditDeckOpen || viewingNote) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
      if (isFlipped) {
        if (e.key === "1") handleReviewGrade(1);
        if (e.key === "2") handleReviewGrade(2);
        if (e.key === "3") handleReviewGrade(3);
        if (e.key === "4") handleReviewGrade(4);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, isFlipped, isAddCardOpen, isCreateDeckOpen, isEditDeckOpen, viewingNote, currentCardIndex, dueCards]);

  // Open Browser Mode
  const openBrowser = async (prefilterDeckId?: string) => {
    setViewMode("browser");
    if (prefilterDeckId) setBrowserDeckFilter(prefilterDeckId);
    else setBrowserDeckFilter("all");

    if (!workspace?.id) return;
    setLoadingBrowser(true);
    try {
      const cards = await api(`/flashcards/cards/workspace?workspaceId=${workspace.id}`);
      setBrowserCards(cards);
    } catch (err) {
      console.error("Erro ao carregar cards no navegador", err);
    } finally {
      setLoadingBrowser(false);
    }
  };

  // Create Deck / Subdeck
  const handleCreateDeckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim() || !workspace?.id) return;

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
      setDeckParentIdForCreate(null);
      setIsCreateDeckOpen(false);
      await loadDecks();
      openDeckHub(created);
    } catch (err) {
      console.error("Erro ao criar caderno", err);
    }
  };

  // Edit Deck
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

  // Delete Deck (Cascade)
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
    // Only sum root decks to avoid double counting recursive aggregates
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
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--background)",
        color: "var(--foreground)",
        userSelect: "none",
        fontFamily: "var(--font-sans)",
        overflow: "hidden",
      }}
    >
      {/* ─────────────────────────────────────────────────────────
          TOP NAVIGATION & ACTION BAR
          ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: "48px",
          borderBottom: "1px solid var(--accents-2)",
          background: "var(--background)",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        {/* Left: Breadcrumbs / Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => {
              setViewMode("decks");
              setActiveDeck(null);
            }}
            className="hover:text-[var(--foreground)]"
            style={{
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: "4px",
              color: viewMode === "decks" ? "var(--foreground)" : "var(--accents-5)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "-0.01em",
            }}
            title="Ver todos os cadernos"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Cadernos</span>
          </button>

          {activeDeck && viewMode !== "decks" && (
            <>
              <span style={{ color: "var(--accents-4)", fontSize: "12px" }}>/</span>
              <button
                type="button"
                onClick={() => openDeckHub(activeDeck)}
                className="hover:text-[var(--foreground)] text-ellipsis overflow-hidden whitespace-nowrap"
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: viewMode === "deck-hub" ? "var(--foreground)" : "var(--accents-5)",
                  cursor: "pointer",
                  maxWidth: "200px",
                  padding: "4px 6px",
                  borderRadius: "4px",
                }}
              >
                {activeDeck.nome}
              </button>
            </>
          )}

          {viewMode === "review" && (
            <>
              <span style={{ color: "var(--accents-4)", fontSize: "12px" }}>/</span>
              <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>
                Estudo ({currentCardIndex + 1}/{dueCards.length})
              </span>
            </>
          )}

          {viewMode === "browser" && (
            <>
              <span style={{ color: "var(--accents-4)", fontSize: "12px" }}>/</span>
              <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>
                Navegador de Cards
              </span>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Add Card Button */}
          <button
            type="button"
            onClick={() => {
              setAddCardDeckId(activeDeck?.id || (decks.length > 0 ? decks[0].id : ""));
              setAddCardSuccessCount(0);
              setIsAddCardOpen(true);
            }}
            className="geist-button"
            style={{
              height: "28px",
              padding: "0 10px",
              fontSize: "12px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Adicionar</span>
          </button>

          {/* Browse Cards Manager Button */}
          <button
            type="button"
            onClick={() => openBrowser(activeDeck?.id)}
            className="geist-button-secondary"
            style={{
              height: "28px",
              padding: "0 10px",
              fontSize: "12px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              background: viewMode === "browser" ? "var(--accents-2)" : undefined,
            }}
            title="Navegar e gerenciar todos os flashcards"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Painel</span>
          </button>

          {/* New Deck Button */}
          <button
            type="button"
            onClick={() => {
              setDeckParentIdForCreate(null);
              setIsCreateDeckOpen(true);
            }}
            className="geist-button-secondary"
            style={{
              height: "28px",
              padding: "0 10px",
              fontSize: "12px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Novo Caderno</span>
          </button>

          <div style={{ width: "1px", height: "16px", background: "var(--accents-2)", margin: "0 4px" }} />

          {/* Close Flashcards Panel */}
          <button
            type="button"
            onClick={onClose}
            className="geist-button-secondary"
            style={{
              width: "28px",
              height: "28px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              cursor: "pointer",
            }}
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {/* MODE 1: DECKS TREE TABLE VIEW (ANKI DESKTOP STYLE) */}
        {viewMode === "decks" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }} className="flex justify-center">
            <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Header Summary */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--accents-2)" }}>
                <div>
                  <h1 style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 4px 0" }}>
                    Meus Cadernos
                  </h1>
                  <p style={{ fontSize: "12px", color: "var(--accents-5)", margin: 0 }}>
                    Selecione um caderno para iniciar o estudo ou expanda para gerenciar subcadernos.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0070f3" }} />
                    <span style={{ color: "var(--accents-5)" }}>Novos:</span>
                    <strong style={{ color: "#0070f3" }}>{overallTotals.novos}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                    <span style={{ color: "var(--accents-5)" }}>A Revisar:</span>
                    <strong style={{ color: "#10b981" }}>{overallTotals.aRevisar}</strong>
                  </div>
                </div>
              </div>

              {/* Anki Tree Table */}
              <div
                style={{
                  background: "var(--accents-1)",
                  border: "1px solid var(--accents-2)",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {/* Table Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 90px 90px 80px 48px",
                    padding: "10px 16px",
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--accents-5)",
                    borderBottom: "1px solid var(--accents-2)",
                    background: "var(--background)",
                  }}
                >
                  <div>Caderno</div>
                  <div style={{ textAlign: "right" }}>Novos</div>
                  <div style={{ textAlign: "right" }}>A Revisar</div>
                  <div style={{ textAlign: "right" }}>Total</div>
                  <div style={{ textAlign: "center" }}>Ações</div>
                </div>

                {/* Table Rows */}
                {loading ? (
                  <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "var(--accents-4)" }}>
                    Carregando cadernos...
                  </div>
                ) : flattenedDeckNodes.length === 0 ? (
                  <div style={{ padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "8px",
                        background: "var(--background)",
                        border: "1px solid var(--accents-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accents-4)",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    </div>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>
                      Nenhum caderno criado
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--accents-5)", maxWidth: "340px" }}>
                      Crie seu primeiro caderno para começar a adicionar flashcards com repetição espaçada.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreateDeckOpen(true)}
                      className="geist-button"
                      style={{ height: "32px", padding: "0 14px", fontSize: "12px", borderRadius: "6px", marginTop: "8px", cursor: "pointer" }}
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
                        className="hover:bg-[var(--accents-2)] transition-colors"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 90px 90px 80px 48px",
                          alignItems: "center",
                          padding: "10px 16px",
                          borderBottom: "1px solid var(--accents-2)",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        {/* Deck Name & Hierarchy Tree Chevron */}
                        <div style={{ display: "flex", alignItems: "center", paddingLeft: `${node.depth * 22}px`, overflow: "hidden" }}>
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => toggleExpand(deck.id, e)}
                              className="hover:bg-[var(--accents-3)]"
                              style={{
                                width: "20px",
                                height: "20px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "none",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                marginRight: "6px",
                                color: "var(--accents-5)",
                                padding: 0,
                              }}
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
                            <div style={{ width: "20px", marginRight: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--accents-3)" }} />
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: "var(--accents-5)", flexShrink: 0 }}>
                              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                              <path d="M6 6h10" />
                              <path d="M6 10h10" />
                            </svg>
                            <span style={{ fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {deck.nome}
                            </span>
                          </div>
                        </div>

                        {/* Novos */}
                        <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: deck.stats.novos > 0 ? "#0070f3" : "var(--accents-4)" }}>
                          {deck.stats.novos}
                        </div>

                        {/* A Revisar */}
                        <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: deck.stats.aRevisar > 0 ? "#10b981" : "var(--accents-4)" }}>
                          {deck.stats.aRevisar}
                        </div>

                        {/* Total */}
                        <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--accents-5)" }}>
                          {deck.stats.total}
                        </div>

                        {/* Actions Context Menu */}
                        <div style={{ textAlign: "center", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuDeckId(openMenuDeckId === deck.id ? null : deck.id);
                            }}
                            className="geist-button-secondary"
                            style={{
                              width: "24px",
                              height: "24px",
                              padding: 0,
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                            title="Opções do Caderno"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="19" cy="12" r="1" />
                              <circle cx="5" cy="12" r="1" />
                            </svg>
                          </button>

                          {/* Dropdown Menu */}
                          {openMenuDeckId === deck.id && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "28px",
                                zIndex: 100,
                                width: "170px",
                                background: "var(--background)",
                                border: "1px solid var(--accents-2)",
                                borderRadius: "6px",
                                padding: "4px",
                                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
                                textAlign: "left",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuDeckId(null);
                                  openDeckHub(deck);
                                }}
                                className="w-full hover:bg-[var(--accents-2)]"
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "6px 8px",
                                  fontSize: "12px",
                                  borderRadius: "4px",
                                  color: "var(--foreground)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                                className="w-full hover:bg-[var(--accents-2)]"
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "6px 8px",
                                  fontSize: "12px",
                                  borderRadius: "4px",
                                  color: "var(--foreground)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                                className="w-full hover:bg-[var(--accents-2)]"
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "6px 8px",
                                  fontSize: "12px",
                                  borderRadius: "4px",
                                  color: "var(--foreground)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                                <span>Renomear</span>
                              </button>

                              <div style={{ height: "1px", background: "var(--accents-2)", margin: "4px 0" }} />

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuDeckId(null);
                                  setDeletingDeck(deck);
                                }}
                                className="w-full hover:bg-[var(--accents-2)]"
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "6px 8px",
                                  fontSize: "12px",
                                  borderRadius: "4px",
                                  color: "var(--error)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
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
          <div style={{ flex: 1, overflowY: "auto", padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "100%", maxWidth: "540px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              {/* Back to all decks */}
              <button
                type="button"
                onClick={() => {
                  setViewMode("decks");
                  loadDecks();
                }}
                className="hover:text-[var(--foreground)]"
                style={{
                  alignSelf: "flex-start",
                  background: "none",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "var(--accents-5)",
                  cursor: "pointer",
                  marginBottom: "24px",
                  padding: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Voltar para Cadernos</span>
              </button>

              {/* Deck Icon Box */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "10px",
                  border: "1px solid var(--accents-2)",
                  background: "var(--accents-1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              </div>

              {/* Breadcrumb Hierarchy Path */}
              {deckPaths.get(activeDeck.id) && (
                <div style={{ fontSize: "11px", color: "var(--accents-5)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {deckPaths.get(activeDeck.id)}
                </div>
              )}

              <h2 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
                {activeDeck.nome}
              </h2>

              {activeDeck.descricao && (
                <p style={{ fontSize: "13px", color: "var(--accents-5)", margin: "0 0 24px 0", lineHeight: "1.5" }}>
                  {activeDeck.descricao}
                </p>
              )}

              {/* Study Metrics Card */}
              <div
                style={{
                  width: "100%",
                  background: "var(--accents-1)",
                  border: "1px solid var(--accents-2)",
                  borderRadius: "8px",
                  padding: "20px 24px",
                  margin: "16px 0 24px 0",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "16px",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#0070f3" }}>
                    {activeDeck.stats.novos}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--accents-5)", marginTop: "2px" }}>Novos</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", borderLeft: "1px solid var(--accents-2)", borderRight: "1px solid var(--accents-2)" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#10b981" }}>
                    {activeDeck.stats.aRevisar}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--accents-5)", marginTop: "2px" }}>A Revisar</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>
                    {activeDeck.stats.total}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--accents-5)", marginTop: "2px" }}>Total de Cards</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                <button
                  type="button"
                  onClick={() => startReview(activeDeck)}
                  disabled={dueCards.length === 0}
                  className="geist-button"
                  style={{
                    height: "42px",
                    fontSize: "14px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: dueCards.length === 0 ? "not-allowed" : "pointer",
                    opacity: dueCards.length === 0 ? 0.6 : 1,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>{dueCards.length === 0 ? "Tudo Revisado por Hoje" : `Estudar Agora (${dueCards.length} cards)`}</span>
                </button>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCardDeckId(activeDeck.id);
                      setIsAddCardOpen(true);
                    }}
                    className="geist-button-secondary"
                    style={{
                      flex: 1,
                      height: "36px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
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
                    className="geist-button-secondary"
                    style={{
                      flex: 1,
                      height: "36px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
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
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative" }}>
            {reviewSuccessFeedback ? (
              <div style={{ maxWidth: "440px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid #10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10b981",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>Sessão Finalizada!</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--accents-5)", lineHeight: "1.5" }}>
                  {reviewSuccessFeedback}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("decks");
                    setActiveDeck(null);
                  }}
                  className="geist-button"
                  style={{ height: "36px", padding: "0 20px", fontSize: "13px", borderRadius: "6px", cursor: "pointer", marginTop: "8px" }}
                >
                  Voltar aos Cadernos
                </button>
              </div>
            ) : currentReviewCard ? (
              <>
                {/* Top Progress bar */}
                <div style={{ position: "absolute", top: "16px", width: "100%", maxWidth: "560px", display: "flex", flexDirection: "column", gap: "6px", padding: "0 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "var(--accents-5)" }}>
                    <span>
                      Caderno: <strong style={{ color: "var(--foreground)" }}>{currentReviewCard.deck?.nome || activeDeck?.nome}</strong>
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {currentCardIndex + 1} de {dueCards.length}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "4px", background: "var(--accents-2)", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: "var(--foreground)",
                        transition: "width 0.3s ease",
                        width: `${((currentCardIndex + 1) / dueCards.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Main Review Card Box */}
                <div style={{ width: "100%", maxWidth: "580px", minHeight: "320px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginTop: "24px" }}>
                  <div
                    onClick={() => setIsFlipped((prev) => !prev)}
                    style={{
                      width: "100%",
                      minHeight: "280px",
                      background: "var(--accents-1)",
                      border: "1px solid var(--accents-2)",
                      borderRadius: "8px",
                      padding: "32px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    {/* Card Tag */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "var(--accents-4)" }}>
                      <span>{currentReviewCard.tipo === "nota" ? "Nota Vinculada" : "Flashcard"}</span>
                      <span>{isFlipped ? "Verso (Resposta)" : "Frente (Pergunta)"}</span>
                    </div>

                    {/* Card Front & Back Content */}
                    <div style={{ margin: "24px 0", textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", lineHeight: "1.6", margin: 0 }}>
                        {currentReviewCard.frente}
                      </p>

                      {isFlipped && (
                        <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--accents-2)", textAlign: "center" }}>
                          {currentReviewCard.tipo === "nota" ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingNote(currentReviewCard.nota);
                                }}
                                className="geist-button-secondary"
                                style={{
                                  padding: "6px 14px",
                                  fontSize: "12px",
                                  borderRadius: "6px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  cursor: "pointer",
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                </svg>
                                <span>Ver Conteúdo da Nota</span>
                              </button>
                            </div>
                          ) : (
                            <p style={{ fontSize: "15px", color: "var(--foreground)", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" }}>
                              {currentReviewCard.verso}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Hint */}
                    <div style={{ textAlign: "center", fontSize: "11px", color: "var(--accents-4)" }}>
                      {!isFlipped ? "Clique no card ou pressione [Espaço] para mostrar a resposta" : "Como foi sua recordação deste card?"}
                    </div>
                  </div>
                </div>

                {/* Rating Grade Buttons */}
                <div style={{ marginTop: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
                  {!isFlipped ? (
                    <button
                      type="button"
                      onClick={() => setIsFlipped(true)}
                      className="geist-button"
                      style={{
                        padding: "0 24px",
                        height: "38px",
                        fontSize: "13px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <span>Mostrar Resposta</span>
                      <kbd style={{ fontSize: "11px", padding: "2px 6px", background: "var(--accents-2)", borderRadius: "4px", color: "var(--foreground)" }}>
                        Espaço
                      </kbd>
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {/* 1 - Errei */}
                      <button
                        type="button"
                        onClick={() => handleReviewGrade(1)}
                        className="geist-button-secondary"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "6px 16px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          minWidth: "84px",
                        }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--error)" }}>Errei</span>
                        <span style={{ fontSize: "10px", color: "var(--accents-4)", marginTop: "2px" }}>&lt; 1d (1)</span>
                      </button>

                      {/* 2 - Difícil */}
                      <button
                        type="button"
                        onClick={() => handleReviewGrade(2)}
                        className="geist-button-secondary"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "6px 16px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          minWidth: "84px",
                        }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--warning)" }}>Difícil</span>
                        <span style={{ fontSize: "10px", color: "var(--accents-4)", marginTop: "2px" }}>3d (2)</span>
                      </button>

                      {/* 3 - Bom */}
                      <button
                        type="button"
                        onClick={() => handleReviewGrade(3)}
                        className="geist-button-secondary"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "6px 16px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          minWidth: "84px",
                        }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>Bom</span>
                        <span style={{ fontSize: "10px", color: "var(--accents-4)", marginTop: "2px" }}>6d (3)</span>
                      </button>

                      {/* 4 - Fácil */}
                      <button
                        type="button"
                        onClick={() => handleReviewGrade(4)}
                        className="geist-button-secondary"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "6px 16px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          minWidth: "84px",
                        }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--success)" }}>Fácil</span>
                        <span style={{ fontSize: "10px", color: "var(--accents-4)", marginTop: "2px" }}>10d+ (4)</span>
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
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Filter & Search Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 20px",
                borderBottom: "1px solid var(--accents-2)",
                background: "var(--accents-1)",
              }}
            >
              {/* Search input */}
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type="text"
                  value={browserSearch}
                  onChange={(e) => setBrowserSearch(e.target.value)}
                  placeholder="Pesquisar cards por pergunta, resposta ou nota..."
                  style={{
                    width: "100%",
                    height: "32px",
                    padding: "0 10px 0 30px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "var(--foreground)",
                    outline: "none",
                  }}
                />
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ position: "absolute", left: "10px", top: "9px", color: "var(--accents-4)" }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              {/* Deck Filter Dropdown */}
              <select
                value={browserDeckFilter}
                onChange={(e) => setBrowserDeckFilter(e.target.value)}
                style={{
                  height: "32px",
                  padding: "0 10px",
                  background: "var(--background)",
                  border: "1px solid var(--accents-2)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--foreground)",
                  outline: "none",
                }}
              >
                <option value="all">Todos os Cadernos ({browserCards.length})</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {deckPaths.get(d.id) || d.nome}
                  </option>
                ))}
              </select>

              <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--accents-5)" }}>
                {filteredBrowserCards.length} cards
              </div>
            </div>

            {/* Browser Table */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loadingBrowser ? (
                <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "var(--accents-4)" }}>
                  Carregando cards do workspace...
                </div>
              ) : filteredBrowserCards.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center", fontSize: "13px", color: "var(--accents-4)" }}>
                  Nenhum card encontrado com os filtros atuais.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--accents-2)",
                        background: "var(--background)",
                        fontSize: "11px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--accents-5)",
                      }}
                    >
                      <th style={{ padding: "10px 16px", width: "35%" }}>Frente (Pergunta)</th>
                      <th style={{ padding: "10px 16px", width: "35%" }}>Verso (Resposta)</th>
                      <th style={{ padding: "10px 16px", width: "15%" }}>Caderno</th>
                      <th style={{ padding: "10px 16px", width: "15%", textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrowserCards.map((c) => (
                      <tr key={c.id} className="hover:bg-[var(--accents-1)] transition-colors" style={{ borderBottom: "1px solid var(--accents-2)" }}>
                        <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                          <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{c.frente}</span>
                          {c.tipo === "nota" && (
                            <span style={{ display: "inline-block", marginLeft: "6px", fontSize: "10px", padding: "1px 5px", background: "var(--accents-2)", borderRadius: "4px", color: "var(--accents-5)" }}>
                              Nota
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "top", color: "var(--accents-5)", fontSize: "12px" }}>
                          <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {c.verso}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "top", fontSize: "12px", color: "var(--accents-5)" }}>
                          {c.deck?.nome || deckMap.get(c.deckId)?.nome || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "top", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            {/* Move Card */}
                            <button
                              type="button"
                              onClick={() => {
                                setMovingCard(c);
                                setTargetMoveDeckId(c.deckId);
                              }}
                              className="geist-button-secondary"
                              style={{ height: "24px", padding: "0 8px", fontSize: "11px", borderRadius: "4px", cursor: "pointer" }}
                              title="Mover para outro caderno"
                            >
                              Mover
                            </button>

                            {/* Edit Card */}
                            <button
                              type="button"
                              onClick={() => setEditingCard(c)}
                              className="geist-button-secondary"
                              style={{ height: "24px", padding: "0 8px", fontSize: "11px", borderRadius: "4px", cursor: "pointer" }}
                              title="Editar card"
                            >
                              Editar
                            </button>

                            {/* Delete Card */}
                            <button
                              type="button"
                              onClick={() => handleDeleteCard(c.id)}
                              className="geist-button-secondary"
                              style={{ height: "24px", width: "24px", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", cursor: "pointer", color: "var(--error)" }}
                              title="Excluir card"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
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
          MODAL: ADICIONAR CARD (CONTINUOUS ADD MODAL)
          ───────────────────────────────────────────────────────── */}
      {isAddCardOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setIsAddCardOpen(false)}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--accents-2)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>
                  Adicionar Flashcard
                </h3>
                {addCardSuccessCount > 0 && (
                  <span style={{ fontSize: "11px", padding: "2px 8px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderRadius: "999px", fontWeight: 600 }}>
                    {addCardSuccessCount} adicionado{addCardSuccessCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAddCardOpen(false)}
                className="geist-button-secondary"
                style={{ width: "24px", height: "24px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Target Deck Selection */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Caderno de Destino
                </label>
                <select
                  value={addCardDeckId}
                  onChange={(e) => setAddCardDeckId(e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    outline: "none",
                  }}
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {deckPaths.get(d.id) || d.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Switcher */}
              <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid var(--accents-2)", paddingBottom: "10px" }}>
                <button
                  type="button"
                  onClick={() => setAddCardType("card")}
                  style={{
                    background: addCardType === "card" ? "var(--foreground)" : "transparent",
                    color: addCardType === "card" ? "var(--background)" : "var(--accents-5)",
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Card Personalizado (Frente/Verso)
                </button>
                <button
                  type="button"
                  onClick={() => setAddCardType("nota")}
                  style={{
                    background: addCardType === "nota" ? "var(--foreground)" : "transparent",
                    color: addCardType === "nota" ? "var(--background)" : "var(--accents-5)",
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Vincular Nota do Workspace
                </button>
              </div>

              {addCardType === "card" ? (
                <>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                      Frente (Pergunta / Conceito)
                    </label>
                    <input
                      ref={frenteInputRef as any}
                      type="text"
                      value={addCardFrente}
                      onChange={(e) => setAddCardFrente(e.target.value)}
                      placeholder="Ex: Qual é a função da mitocôndria?"
                      required
                      autoFocus
                      style={{
                        width: "100%",
                        height: "36px",
                        padding: "0 10px",
                        background: "var(--background)",
                        border: "1px solid var(--accents-2)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "var(--foreground)",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                      Verso (Resposta)
                    </label>
                    <textarea
                      value={addCardVerso}
                      onChange={(e) => setAddCardVerso(e.target.value)}
                      placeholder="Ex: Produção de ATP através da respiração celular..."
                      rows={4}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: "var(--background)",
                        border: "1px solid var(--accents-2)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "var(--foreground)",
                        outline: "none",
                        resize: "vertical",
                      }}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          handleAddCardSubmit(e);
                        }
                      }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                    Selecionar Nota
                  </label>
                  <select
                    value={addCardNotaId}
                    onChange={(e) => setAddCardNotaId(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      height: "36px",
                      padding: "0 10px",
                      background: "var(--background)",
                      border: "1px solid var(--accents-2)",
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "var(--foreground)",
                      outline: "none",
                    }}
                  >
                    <option value="">-- Escolha uma nota --</option>
                    {notas.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.titulo} ({n.tipo})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--accents-4)" }}>
                  Dica: Pressione <kbd style={{ padding: "1px 4px", background: "var(--accents-2)", borderRadius: "3px" }}>Ctrl+Enter</kbd> para adicionar rápido
                </span>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setIsAddCardOpen(false)}
                    className="geist-button-secondary"
                    style={{ height: "32px", padding: "0 12px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="geist-button"
                    style={{ height: "32px", padding: "0 14px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
                  >
                    Adicionar Card
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: CRIAR NOVO CADERNO / SUBCADERNO
          ───────────────────────────────────────────────────────── */}
      {isCreateDeckOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setIsCreateDeckOpen(false)}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--accents-2)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>
              {deckParentIdForCreate ? "Novo Subcaderno" : "Novo Caderno"}
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--accents-5)" }}>
              {deckParentIdForCreate
                ? `Criando subcaderno dentro de "${deckMap.get(deckParentIdForCreate)?.nome || "Caderno Pai"}"`
                : "Crie um novo caderno para agrupar seus flashcards."}
            </p>

            <form onSubmit={handleCreateDeckSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Nome do Caderno
                </label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Ex: Anatomia, Fisiologia, Vocabulário..."
                  autoFocus
                  required
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Caderno Pai (Opcional)
                </label>
                <select
                  value={deckParentIdForCreate || ""}
                  onChange={(e) => setDeckParentIdForCreate(e.target.value || null)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    outline: "none",
                  }}
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
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Descrição (opcional)
                </label>
                <textarea
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  placeholder="Objetivo ou tópicos abordados..."
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateDeckOpen(false)}
                  className="geist-button-secondary"
                  style={{ height: "32px", padding: "0 12px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="geist-button"
                  style={{ height: "32px", padding: "0 14px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
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
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setIsEditDeckOpen(false)}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--accents-2)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>
              Editar Caderno
            </h3>

            <form onSubmit={handleEditDeckSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Nome do Caderno
                </label>
                <input
                  type="text"
                  value={editDeckName}
                  onChange={(e) => setEditDeckName(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Caderno Pai
                </label>
                <select
                  value={editDeckParentId || ""}
                  onChange={(e) => setEditDeckParentId(e.target.value || null)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    outline: "none",
                  }}
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
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Descrição (opcional)
                </label>
                <textarea
                  value={editDeckDesc}
                  onChange={(e) => setEditDeckDesc(e.target.value)}
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsEditDeckOpen(false)}
                  className="geist-button-secondary"
                  style={{ height: "32px", padding: "0 12px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="geist-button"
                  style={{ height: "32px", padding: "0 14px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
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
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setDeletingDeck(null)}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--accents-2)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 600, color: "var(--error)" }}>
              Excluir Caderno
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--accents-5)", lineHeight: "1.5" }}>
              Tem certeza que deseja excluir o caderno <strong>"{deletingDeck.nome}"</strong>? Esta ação excluirá todos os subcadernos e flashcards associados em cascata.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setDeletingDeck(null)}
                className="geist-button-secondary"
                style={{ height: "32px", padding: "0 12px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteDeck}
                style={{
                  height: "32px",
                  padding: "0 14px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: "var(--error)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 500,
                }}
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
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setEditingCard(null)}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--accents-2)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 600 }}>Editar Flashcard</h3>

            <form onSubmit={handleUpdateCard} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Frente (Pergunta)
                </label>
                <input
                  type="text"
                  value={editingCard.frente}
                  onChange={(e) => setEditingCard({ ...editingCard, frente: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Verso (Resposta)
                </label>
                <textarea
                  value={editingCard.verso}
                  onChange={(e) => setEditingCard({ ...editingCard, verso: e.target.value })}
                  rows={4}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="geist-button-secondary"
                  style={{ height: "32px", padding: "0 12px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="geist-button"
                  style={{ height: "32px", padding: "0 14px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
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
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setMovingCard(null)}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--accents-2)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 600 }}>Mover Flashcard</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--accents-5)" }}>
              Selecione o novo caderno para o card "<strong>{movingCard.frente}</strong>".
            </p>

            <form onSubmit={handleMoveCard} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <select
                value={targetMoveDeckId}
                onChange={(e) => setTargetMoveDeckId(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 10px",
                  background: "var(--background)",
                  border: "1px solid var(--accents-2)",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "var(--foreground)",
                  outline: "none",
                }}
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {deckPaths.get(d.id) || d.nome}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setMovingCard(null)}
                  className="geist-button-secondary"
                  style={{ height: "32px", padding: "0 12px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="geist-button"
                  style={{ height: "32px", padding: "0 14px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
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
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setViewingNote(null)}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--accents-2)",
              borderRadius: "8px",
              maxWidth: "640px",
              width: "100%",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--accents-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>
                  {viewingNote.titulo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="geist-button-secondary"
                style={{ width: "24px", height: "24px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: "24px",
                overflowY: "auto",
                fontSize: "14px",
                lineHeight: "1.6",
                color: "var(--foreground)",
              }}
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: viewingNote.conteudo || '<p style="color: var(--accents-4);">Esta nota está vazia.</p>' }}
            />

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--accents-2)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  onOpenNota(viewingNote);
                  setViewingNote(null);
                  onClose();
                }}
                className="geist-button-secondary"
                style={{ height: "32px", padding: "0 12px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
              >
                Abrir no Editor
              </button>
              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="geist-button"
                style={{ height: "32px", padding: "0 14px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
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
