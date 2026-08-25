"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export interface Deck {
  id: string;
  nome: string;
  descricao?: string;
  workspaceId: string;
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
}

interface FlashcardsViewProps {
  workspace: any;
  notas: any[];
  onOpenNota: (nota: any) => void;
  onClose: () => void;
}

export default function FlashcardsView({
  workspace,
  notas,
  onOpenNota,
  onClose,
}: FlashcardsViewProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Mode States
  const [isReviewing, setIsReviewing] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Note preview modal inside review
  const [viewingNote, setViewingNote] = useState<any | null>(null);

  // Creation / Editing Modals
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");

  const [isCreateCardOpen, setIsCreateCardOpen] = useState(false);
  const [cardFrente, setCardFrente] = useState("");
  const [cardVerso, setCardVerso] = useState("");
  const [selectedNotaId, setSelectedNotaId] = useState("");

  // Load Decks
  const loadDecks = useCallback(async () => {
    if (!workspace?.id) return;
    try {
      setLoading(true);
      const data = await api("/flashcards/decks?workspaceId=" + workspace.id);
      setDecks(data);
      if (data.length > 0 && !activeDeck) {
        loadDeckDetails(data[0]);
      }
    } catch (err) {
      console.error("Erro ao carregar decks", err);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  // Load Cards of Selected Deck
  const loadDeckDetails = async (deck: Deck) => {
    setActiveDeck(deck);
    try {
      const [allCards, due] = await Promise.all([
        api("/flashcards/decks/" + deck.id + "/cards"),
        api("/flashcards/decks/" + deck.id + "/due"),
      ]);
      setCards(allCards);
      setDueCards(due);
    } catch (err) {
      console.error("Erro ao carregar cards do deck", err);
    }
  };

  // Start Review Session
  const startReview = () => {
    if (dueCards.length === 0) return;
    setIsReviewing(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setViewingNote(null);
  };

  // Submit SM-2 Review (1: Errei, 2: Dificil, 3: Bom, 4: Facil)
  const handleReviewGrade = async (grade: 1 | 2 | 3 | 4) => {
    const currentCard = dueCards[currentCardIndex];
    if (!currentCard) return;

    try {
      await api("/flashcards/cards/" + currentCard.id + "/review", {
        method: "POST",
        body: JSON.stringify({ grade }),
      });

      // Next card or finish
      if (currentCardIndex + 1 < dueCards.length) {
        setCurrentCardIndex((prev) => prev + 1);
        setIsFlipped(false);
        setViewingNote(null);
      } else {
        // Finished review
        setIsReviewing(false);
        setViewingNote(null);
        if (activeDeck) {
          loadDeckDetails(activeDeck);
          loadDecks();
        }
      }
    } catch (err) {
      console.error("Erro ao registrar revisao", err);
    }
  };

  // Keyboard Shortcuts for Review
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isReviewing || isCreateCardOpen || isCreateDeckOpen || viewingNote) return;

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
  }, [isReviewing, isFlipped, isCreateCardOpen, isCreateDeckOpen, viewingNote, currentCardIndex, dueCards]);

  // Create Deck
  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim() || !workspace?.id) return;
    try {
      const created = await api("/flashcards/decks", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: workspace.id,
          nome: newDeckName.trim(),
          descricao: newDeckDesc.trim() || undefined,
        }),
      });
      setDecks((prev) => [created, ...prev]);
      setNewDeckName("");
      setNewDeckDesc("");
      setIsCreateDeckOpen(false);
      loadDeckDetails(created);
    } catch (err) {
      console.error("Erro ao criar deck", err);
    }
  };

  // Delete Deck
  const handleDeleteDeck = async (deckId: string) => {
    try {
      await api("/flashcards/decks/" + deckId, { method: "DELETE" });
      const filtered = decks.filter((d) => d.id !== deckId);
      setDecks(filtered);
      if (activeDeck?.id === deckId) {
        if (filtered.length > 0) loadDeckDetails(filtered[0]);
        else {
          setActiveDeck(null);
          setCards([]);
          setDueCards([]);
        }
      }
    } catch (err) {
      console.error("Erro ao deletar deck", err);
    }
  };

  // Create Card or Connect Note
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck) return;

    try {
      if (selectedNotaId) {
        // Link Note
        await api("/flashcards/cards/from-nota", {
          method: "POST",
          body: JSON.stringify({
            deckId: activeDeck.id,
            notaId: selectedNotaId,
          }),
        });
      } else {
        // Custom Card
        if (!cardFrente.trim() || !cardVerso.trim()) return;
        await api("/flashcards/cards", {
          method: "POST",
          body: JSON.stringify({
            deckId: activeDeck.id,
            frente: cardFrente.trim(),
            verso: cardVerso.trim(),
            tipo: "card",
          }),
        });
      }

      setCardFrente("");
      setCardVerso("");
      setSelectedNotaId("");
      setIsCreateCardOpen(false);
      loadDeckDetails(activeDeck);
      loadDecks();
    } catch (err) {
      console.error("Erro ao criar card", err);
    }
  };

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
        overflow: "hidden"
      }}
    >
      {/* Top Header Bar */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: "48px",
          borderBottom: "1px solid var(--accents-2)",
          background: "var(--background)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          <span style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>
            Flashcards
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {activeDeck && !isReviewing && (
            <button
              type="button"
              onClick={() => setIsCreateCardOpen(true)}
              className="geist-button-secondary"
              style={{
                height: "28px",
                padding: "0 10px",
                fontSize: "12px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer"
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Novo Card</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateDeckOpen(true)}
            className="geist-button"
            style={{
              height: "28px",
              padding: "0 10px",
              fontSize: "12px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer"
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Novo Caderno</span>
          </button>

          <div style={{ width: "1px", height: "16px", background: "var(--accents-2)", margin: "0 4px" }} />

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
              cursor: "pointer"
            }}
            title="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {isReviewing ? (
        /* --- ACTIVE REVIEW SESSION --- */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative" }}>
          {/* Top Progress bar */}
          <div style={{ position: "absolute", top: "16px", width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", gap: "6px", padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "var(--accents-5)" }}>
              <span>Caderno: <strong style={{ color: "var(--foreground)" }}>{activeDeck?.nome}</strong></span>
              <span>{currentCardIndex + 1} de {dueCards.length}</span>
            </div>
            <div style={{ width: "100%", height: "4px", background: "var(--accents-2)", borderRadius: "999px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  background: "var(--foreground)",
                  transition: "width 0.3s ease",
                  width: ((currentCardIndex + 1) / dueCards.length) * 100 + "%"
                }}
              />
            </div>
          </div>

          {/* Card Container */}
          <div style={{ width: "100%", maxWidth: "560px", minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginTop: "24px" }}>
            <div
              onClick={() => setIsFlipped((prev) => !prev)}
              style={{
                width: "100%",
                minHeight: "260px",
                background: "var(--accents-1)",
                border: "1px solid var(--accents-2)",
                borderRadius: "8px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "border-color 0.15s ease",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)"
              }}
            >
              {/* Card Tag */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "var(--accents-4)" }}>
                <span>
                  {currentReviewCard?.tipo === "nota" ? "Nota Vinculada" : "Flashcard"}
                </span>
                <span>
                  {isFlipped ? "Verso" : "Frente"}
                </span>
              </div>

              {/* Card Question / Front */}
              <div style={{ margin: "24px 0", textAlign: "center" }}>
                <p style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", lineHeight: "1.6", margin: 0 }}>
                  {currentReviewCard?.frente}
                </p>

                {/* Back / Answer (Clean rendered content) */}
                {isFlipped && (
                  <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--accents-2)", textAlign: "center" }}>
                    {currentReviewCard?.tipo === "nota" ? (
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
                            cursor: "pointer"
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                          </svg>
                          <span>Ver Conteúdo da Nota</span>
                        </button>
                      </div>
                    ) : (
                      <p style={{ fontSize: "15px", color: "var(--foreground)", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" }}>
                        {currentReviewCard?.verso}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Hint */}
              <div style={{ textAlign: "center", fontSize: "11px", color: "var(--accents-4)" }}>
                {!isFlipped ? "Clique no card ou pressione [Espaço] para virar" : "Como foi sua recordação?"}
              </div>
            </div>
          </div>

          {/* Rating Buttons */}
          <div style={{ marginTop: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
            {!isFlipped ? (
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                className="geist-button"
                style={{
                  padding: "0 20px",
                  height: "36px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer"
                }}
              >
                <span>Mostrar Resposta</span>
                <kbd style={{ fontSize: "11px", padding: "2px 6px", background: "var(--accents-2)", borderRadius: "4px", color: "var(--foreground)" }}>Espaço</kbd>
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
                    padding: "6px 14px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    minWidth: "76px"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--error)" }}>Errei</span>
                  <span style={{ fontSize: "10px", color: "var(--accents-4)", marginTop: "2px" }}>&lt; 1d (1)</span>
                </button>

                {/* 2 - Dificil */}
                <button
                  type="button"
                  onClick={() => handleReviewGrade(2)}
                  className="geist-button-secondary"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    minWidth: "76px"
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
                    padding: "6px 14px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    minWidth: "76px"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>Bom</span>
                  <span style={{ fontSize: "10px", color: "var(--accents-4)", marginTop: "2px" }}>6d (3)</span>
                </button>

                {/* 4 - Facil */}
                <button
                  type="button"
                  onClick={() => handleReviewGrade(4)}
                  className="geist-button-secondary"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    minWidth: "76px"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--success)" }}>Fácil</span>
                  <span style={{ fontSize: "10px", color: "var(--accents-4)", marginTop: "2px" }}>10d+ (4)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* --- DECKS OVERVIEW & STUDY ENTRY --- */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: List of Decks */}
          <div 
            className="w-full md:w-[260px] h-[45%] md:h-full border-b md:border-b-0 md:border-r border-[var(--accents-2)] bg-[var(--accents-1)] flex flex-col shrink-0"
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--accents-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accents-5)" }}>Cadernos</span>
              <span style={{ fontSize: "11px", color: "var(--accents-4)", fontFamily: "var(--font-mono)" }}>{decks.length}</span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }} className="no-scrollbar">
              {loading ? (
                <div style={{ textAlign: "center", padding: "24px 0", fontSize: "12px", color: "var(--accents-4)" }}>Carregando...</div>
              ) : decks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 12px", fontSize: "12px", color: "var(--accents-4)" }}>
                  Nenhum caderno criado. Crie seu primeiro caderno para começar.
                </div>
              ) : (
                decks.map((deck) => {
                  const isSelected = activeDeck?.id === deck.id;
                  return (
                    <div
                      key={deck.id}
                      onClick={() => loadDeckDetails(deck)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: isSelected ? "1px solid var(--foreground)" : "1px solid transparent",
                        background: isSelected ? "var(--background)" : "transparent",
                        cursor: "pointer",
                        marginBottom: "4px",
                        transition: "all 0.15s ease"
                      }}
                      className="hover:bg-[var(--accents-2)]"
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "13px", fontWeight: isSelected ? 600 : 500, color: "var(--foreground)" }}>{deck.nome}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDeck(deck.id);
                          }}
                          style={{ background: "none", border: "none", color: "var(--accents-4)", cursor: "pointer", padding: "2px" }}
                          className="hover:text-[var(--error)]"
                          title="Excluir Caderno"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          </svg>
                        </button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--accents-5)" }}>
                        <span>{deck.stats ? deck.stats.novos : 0} novos</span>
                        <span>{deck.stats ? deck.stats.aRevisar : 0} a revisar</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Deck Study Hub */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", background: "var(--background)" }}>
            {activeDeck ? (
              <div 
                style={{
                  width: "100%",
                  maxWidth: "460px",
                  background: "var(--accents-1)",
                  border: "1px solid var(--accents-2)",
                  borderRadius: "8px",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center"
                }}
              >
                <div 
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    border: "1px solid var(--accents-2)",
                    background: "var(--background)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px"
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </div>

                <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                  {activeDeck.nome}
                </h2>
                {activeDeck.descricao && (
                  <p style={{ fontSize: "13px", color: "var(--accents-5)", margin: "0 0 16px 0", lineHeight: "1.4" }}>
                    {activeDeck.descricao}
                  </p>
                )}

                {/* Clean Study Stats Row */}
                <div 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "24px",
                    margin: "16px 0 24px 0",
                    padding: "12px 24px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>{dueCards.length}</span>
                    <span style={{ fontSize: "11px", color: "var(--accents-5)" }}>A Revisar Hoje</span>
                  </div>
                  <div style={{ width: "1px", height: "24px", background: "var(--accents-2)" }} />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>{cards.length}</span>
                    <span style={{ fontSize: "11px", color: "var(--accents-5)" }}>Total de Cards</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                  <button
                    type="button"
                    onClick={startReview}
                    disabled={dueCards.length === 0}
                    className="geist-button"
                    style={{
                      flex: 1,
                      height: "36px",
                      fontSize: "13px",
                      fontWeight: 500,
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: dueCards.length === 0 ? "not-allowed" : "pointer",
                      opacity: dueCards.length === 0 ? 0.5 : 1
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    <span>{dueCards.length === 0 ? "Tudo Revisado por Hoje" : "Iniciar Revisão"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreateCardOpen(true)}
                    className="geist-button-secondary"
                    style={{
                      height: "36px",
                      padding: "0 14px",
                      fontSize: "13px",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    + Card
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "var(--accents-4)", fontSize: "13px" }}>
                Selecione um caderno à esquerda para estudar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Visualizar Conteúdo Limpo da Nota Durante a Revisão */}
      {viewingNote && (
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
            padding: "16px"
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
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--accents-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
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

            {/* Clean HTML renderer container */}
            <div 
              style={{
                padding: "24px",
                overflowY: "auto",
                fontSize: "14px",
                lineHeight: "1.6",
                color: "var(--foreground)"
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

      {/* MODAL: Criar Novo Deck */}
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
            padding: "16px"
          }}
          onClick={() => setIsCreateDeckOpen(false)}
        >
          <div 
            style={{
              background: "var(--background)",
              border: "1px solid var(--accents-2)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>
              Novo Caderno
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--accents-5)" }}>
              Crie um novo caderno para organizar seus flashcards.
            </p>

            <form onSubmit={handleCreateDeck} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Ex: Biologia, Algoritmos, Vocabulário..."
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
                    outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Descrição (opcional)
                </label>
                <textarea
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  placeholder="Finalidade deste caderno..."
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
                    resize: "none"
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
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Criar Card / Vincular Nota */}
      {isCreateCardOpen && (
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
            padding: "16px"
          }}
          onClick={() => setIsCreateCardOpen(false)}
        >
          <div 
            style={{
              background: "var(--background)",
              border: "1px solid var(--accents-2)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>
              Adicionar Card ao Caderno
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--accents-5)" }}>
              Crie uma pergunta/resposta avulsa ou conecte uma nota inteira para revisão.
            </p>

            <form onSubmit={handleCreateCard} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                  Conectar Nota Existente
                </label>
                <select
                  value={selectedNotaId}
                  onChange={(e) => setSelectedNotaId(e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    background: "var(--background)",
                    border: "1px solid var(--accents-2)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    outline: "none"
                  }}
                >
                  <option value="">-- Ou preencha pergunta e resposta abaixo --</option>
                  {notas.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.titulo} ({n.tipo})
                    </option>
                  ))}
                </select>
              </div>

              {!selectedNotaId && (
                <>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                      Frente (Pergunta / Conceito)
                    </label>
                    <input
                      type="text"
                      value={cardFrente}
                      onChange={(e) => setCardFrente(e.target.value)}
                      placeholder="Ex: O que é complexidade assintótica?"
                      required={!selectedNotaId}
                      style={{
                        width: "100%",
                        height: "36px",
                        padding: "0 10px",
                        background: "var(--background)",
                        border: "1px solid var(--accents-2)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "var(--foreground)",
                        outline: "none"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--accents-5)", display: "block", marginBottom: "4px" }}>
                      Verso (Resposta)
                    </label>
                    <textarea
                      value={cardVerso}
                      onChange={(e) => setCardVerso(e.target.value)}
                      placeholder="Ex: Estudo do comportamento de algoritmos com o aumento da entrada..."
                      rows={3}
                      required={!selectedNotaId}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: "var(--background)",
                        border: "1px solid var(--accents-2)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "var(--foreground)",
                        outline: "none",
                        resize: "none"
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateCardOpen(false)}
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
    </div>
  );
}
