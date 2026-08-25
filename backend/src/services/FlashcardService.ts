import { prisma } from '../config/prisma';

export interface SM2Result {
  reps: number;
  interval: number;
  easeFactor: number;
  proximaRevisao: Date;
}

/**
 * SuperMemo 2 (SM-2) Spaced Repetition Algorithm
 * @param grade Score from 1 (Again / Errei) to 4 (Easy / Fácil)
 */
export function calculateSM2(
  grade: 1 | 2 | 3 | 4,
  currentReps: number,
  currentInterval: number,
  currentEase: number
): SM2Result {
  let reps = currentReps;
  let interval = currentInterval;
  let easeFactor = currentEase;

  const sm2Score = grade === 1 ? 0 : grade === 2 ? 3 : grade === 3 ? 4 : 5;

  if (grade === 1) {
    reps = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    if (reps === 0) {
      interval = grade === 2 ? 1 : grade === 4 ? 3 : 1;
    } else if (reps === 1) {
      interval = grade === 2 ? 3 : grade === 4 ? 8 : 6;
    } else {
      const modifier = grade === 2 ? 1.2 : grade === 4 ? 1.3 : 1.0;
      interval = Math.round(interval * easeFactor * modifier);
    }
    reps += 1;

    easeFactor = easeFactor + (0.1 - (5 - sm2Score) * (0.08 + (5 - sm2Score) * 0.02));
    easeFactor = Math.max(1.3, easeFactor);
  }

  const proximaRevisao = new Date();
  proximaRevisao.setDate(proximaRevisao.getDate() + interval);

  return {
    reps,
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    proximaRevisao,
  };
}

export class FlashcardService {
  // --- DECKS ---
  async getDecks(workspaceId: string) {
    const decks = await prisma.deck.findMany({
      where: { workspaceId },
      include: {
        flashcards: {
          select: {
            id: true,
            reps: true,
            proximaRevisao: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return decks.map((deck) => {
      const total = deck.flashcards.length;
      const novos = deck.flashcards.filter((c) => c.reps === 0).length;
      const aRevisar = deck.flashcards.filter(
        (c) => c.reps > 0 && new Date(c.proximaRevisao) <= now
      ).length;

      return {
        id: deck.id,
        nome: deck.nome,
        descricao: deck.descricao,
        workspaceId: deck.workspaceId,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
        stats: {
          total,
          novos,
          aRevisar,
          aprendendo: total - novos - aRevisar,
        },
      };
    });
  }

  async createDeck(workspaceId: string, nome: string, descricao?: string) {
    return prisma.deck.create({
      data: {
        workspaceId,
        nome,
        descricao,
      },
    });
  }

  async updateDeck(id: string, nome?: string, descricao?: string) {
    return prisma.deck.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(descricao !== undefined && { descricao }),
      },
    });
  }

  async deleteDeck(id: string) {
    return prisma.deck.delete({
      where: { id },
    });
  }

  // --- FLASHCARDS ---
  async getAllWorkspaceCards(workspaceId: string) {
    return prisma.flashcard.findMany({
      where: {
        deck: {
          workspaceId,
        },
      },
      include: {
        deck: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFlashcards(deckId: string) {
    return prisma.flashcard.findMany({
      where: { deckId },
      include: {
        nota: {
          select: {
            id: true,
            titulo: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDueCards(deckId: string) {
    const now = new Date();
    return prisma.flashcard.findMany({
      where: {
        deckId,
        OR: [
          { reps: 0 },
          { proximaRevisao: { lte: now } },
        ],
      },
      include: {
        nota: {
          select: {
            id: true,
            titulo: true,
            conteudo: true,
          },
        },
      },
      orderBy: [
        { proximaRevisao: 'asc' },
        { reps: 'asc' },
      ],
    });
  }

  async createFlashcard(data: {
    deckId: string;
    frente: string;
    verso: string;
    tipo?: string;
    notaId?: string;
  }) {
    return prisma.flashcard.create({
      data: {
        deckId: data.deckId,
        frente: data.frente,
        verso: data.verso,
        tipo: data.tipo || 'card',
        notaId: data.notaId || null,
        reps: 0,
        interval: 0,
        easeFactor: 2.5,
        proximaRevisao: new Date(),
      },
    });
  }

  async createCardFromNota(deckId: string, notaId: string) {
    const nota = await prisma.nota.findUnique({
      where: { id: notaId },
    });
    if (!nota) throw new Error('Nota não encontrada');

    return prisma.flashcard.create({
      data: {
        deckId,
        frente: nota.titulo,
        verso: nota.conteudo || 'Sem conteúdo',
        tipo: 'nota',
        notaId: nota.id,
        reps: 0,
        interval: 0,
        easeFactor: 2.5,
        proximaRevisao: new Date(),
      },
    });
  }

  async reviewCard(id: string, grade: 1 | 2 | 3 | 4) {
    const card = await prisma.flashcard.findUnique({
      where: { id },
    });
    if (!card) throw new Error('Card não encontrado');

    const sm2 = calculateSM2(grade, card.reps, card.interval, card.easeFactor);

    return prisma.flashcard.update({
      where: { id },
      data: {
        reps: sm2.reps,
        interval: sm2.interval,
        easeFactor: sm2.easeFactor,
        proximaRevisao: sm2.proximaRevisao,
        ultimaRevisao: new Date(),
      },
    });
  }

  async updateFlashcard(id: string, data: { frente?: string; verso?: string }) {
    return prisma.flashcard.update({
      where: { id },
      data,
    });
  }

  async deleteFlashcard(id: string) {
    return prisma.flashcard.delete({
      where: { id },
    });
  }
}
