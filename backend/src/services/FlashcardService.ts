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
  // Helper to get all descendant deck IDs including the root deck ID
  private async getAllDescendantDeckIds(rootDeckId: string): Promise<string[]> {
    const allDecks = await prisma.deck.findMany({
      select: { id: true, parentId: true },
    });

    const deckIds = new Set<string>([rootDeckId]);
    let added = true;

    while (added) {
      added = false;
      for (const deck of allDecks) {
        if (deck.parentId && deckIds.has(deck.parentId) && !deckIds.has(deck.id)) {
          deckIds.add(deck.id);
          added = true;
        }
      }
    }

    return Array.from(deckIds);
  }

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
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();

    // Map direct deck stats
    const deckMap = new Map<string, {
      deck: typeof decks[0];
      directTotal: number;
      directNovos: number;
      directARevisar: number;
      childIds: string[];
    }>();

    for (const d of decks) {
      const directTotal = d.flashcards.length;
      const directNovos = d.flashcards.filter((c) => c.reps === 0).length;
      const directARevisar = d.flashcards.filter(
        (c) => c.reps > 0 && new Date(c.proximaRevisao) <= now
      ).length;

      deckMap.set(d.id, {
        deck: d,
        directTotal,
        directNovos,
        directARevisar,
        childIds: [],
      });
    }

    // Connect children to parents
    for (const d of decks) {
      if (d.parentId && deckMap.has(d.parentId)) {
        deckMap.get(d.parentId)!.childIds.push(d.id);
      }
    }

    // Helper to compute recursive stats
    const computeRecursiveStats = (deckId: string): { total: number; novos: number; aRevisar: number } => {
      const entry = deckMap.get(deckId);
      if (!entry) return { total: 0, novos: 0, aRevisar: 0 };

      let total = entry.directTotal;
      let novos = entry.directNovos;
      let aRevisar = entry.directARevisar;

      for (const childId of entry.childIds) {
        const childStats = computeRecursiveStats(childId);
        total += childStats.total;
        novos += childStats.novos;
        aRevisar += childStats.aRevisar;
      }

      return { total, novos, aRevisar };
    };

    return decks.map((deck) => {
      const stats = computeRecursiveStats(deck.id);
      return {
        id: deck.id,
        nome: deck.nome,
        descricao: deck.descricao,
        workspaceId: deck.workspaceId,
        parentId: deck.parentId,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
        stats: {
          total: stats.total,
          novos: stats.novos,
          aRevisar: stats.aRevisar,
          aprendendo: stats.total - stats.novos - stats.aRevisar,
        },
      };
    });
  }

  async createDeck(workspaceId: string, nome: string, descricao?: string, parentId?: string) {
    return prisma.deck.create({
      data: {
        workspaceId,
        nome,
        descricao,
        parentId: parentId || null,
      },
    });
  }

  async updateDeck(id: string, nome?: string, descricao?: string, parentId?: string | null) {
    return prisma.deck.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(descricao !== undefined && { descricao }),
        ...(parentId !== undefined && { parentId }),
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
            parentId: true,
          },
        },
        nota: {
          select: {
            id: true,
            titulo: true,
            conteudo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFlashcards(deckId: string, recursive: boolean = false) {
    let deckIds = [deckId];
    if (recursive) {
      deckIds = await this.getAllDescendantDeckIds(deckId);
    }

    return prisma.flashcard.findMany({
      where: { deckId: { in: deckIds } },
      include: {
        deck: {
          select: {
            id: true,
            nome: true,
          },
        },
        nota: {
          select: {
            id: true,
            titulo: true,
            conteudo: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDueCards(deckId: string) {
    const deckIds = await this.getAllDescendantDeckIds(deckId);
    const now = new Date();

    return prisma.flashcard.findMany({
      where: {
        deckId: { in: deckIds },
        OR: [
          { reps: 0 },
          { proximaRevisao: { lte: now } },
        ],
      },
      include: {
        deck: {
          select: {
            id: true,
            nome: true,
          },
        },
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
        tipo: data.tipo || (data.notaId ? 'nota' : 'card'),
        notaId: data.notaId || null,
        reps: 0,
        interval: 0,
        easeFactor: 2.5,
        proximaRevisao: new Date(),
      },
      include: {
        deck: {
          select: {
            id: true,
            nome: true,
          },
        },
        nota: {
          select: {
            id: true,
            titulo: true,
            conteudo: true,
          },
        },
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
      include: {
        deck: {
          select: {
            id: true,
            nome: true,
          },
        },
        nota: {
          select: {
            id: true,
            titulo: true,
            conteudo: true,
          },
        },
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

  async updateFlashcard(id: string, data: { frente?: string; verso?: string; deckId?: string; tipo?: string; notaId?: string | null }) {
    return prisma.flashcard.update({
      where: { id },
      data: {
        ...(data.frente !== undefined && { frente: data.frente }),
        ...(data.verso !== undefined && { verso: data.verso }),
        ...(data.deckId !== undefined && { deckId: data.deckId }),
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.notaId !== undefined && { notaId: data.notaId }),
      },
      include: {
        deck: {
          select: {
            id: true,
            nome: true,
          },
        },
        nota: {
          select: {
            id: true,
            titulo: true,
            conteudo: true,
          },
        },
      },
    });
  }

  async deleteFlashcard(id: string) {
    return prisma.flashcard.delete({
      where: { id },
    });
  }
}
