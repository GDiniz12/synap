import { Request, Response } from 'express';
import { FlashcardService } from '../services/FlashcardService';

const flashcardService = new FlashcardService();

export class FlashcardController {
  // --- DECKS ---
  async getDecks(req: Request, res: Response): Promise<any> {
    try {
      const { workspaceId } = req.query;
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId é obrigatório' });
      }
      const decks = await flashcardService.getDecks(workspaceId as string);
      return res.json(decks);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async createDeck(req: Request, res: Response): Promise<any> {
    try {
      const { workspaceId, nome, descricao } = req.body;
      if (!workspaceId || !nome) {
        return res.status(400).json({ error: 'workspaceId e nome são obrigatórios' });
      }
      const deck = await flashcardService.createDeck(workspaceId, nome, descricao);
      return res.status(201).json(deck);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async updateDeck(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const { nome, descricao } = req.body;
      const deck = await flashcardService.updateDeck(id, nome, descricao);
      return res.json(deck);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async deleteDeck(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      await flashcardService.deleteDeck(id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // --- FLASHCARDS ---
  async getAllWorkspaceCards(req: Request, res: Response): Promise<any> {
    try {
      const { workspaceId } = req.query;
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId é obrigatório' });
      }
      const cards = await flashcardService.getAllWorkspaceCards(workspaceId as string);
      return res.json(cards);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getFlashcards(req: Request, res: Response): Promise<any> {
    try {
      const deckId = req.params.deckId as string;
      const cards = await flashcardService.getFlashcards(deckId);
      return res.json(cards);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getDueCards(req: Request, res: Response): Promise<any> {
    try {
      const deckId = req.params.deckId as string;
      const cards = await flashcardService.getDueCards(deckId);
      return res.json(cards);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async createFlashcard(req: Request, res: Response): Promise<any> {
    try {
      const { deckId, frente, verso, tipo, notaId } = req.body;
      if (!deckId || !frente || !verso) {
        return res.status(400).json({ error: 'deckId, frente e verso são obrigatórios' });
      }
      const card = await flashcardService.createFlashcard({
        deckId,
        frente,
        verso,
        tipo,
        notaId,
      });
      return res.status(201).json(card);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async createCardFromNota(req: Request, res: Response): Promise<any> {
    try {
      const { deckId, notaId } = req.body;
      if (!deckId || !notaId) {
        return res.status(400).json({ error: 'deckId e notaId são obrigatórios' });
      }
      const card = await flashcardService.createCardFromNota(deckId, notaId);
      return res.status(201).json(card);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async reviewCard(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const { grade } = req.body;
      if (![1, 2, 3, 4].includes(grade)) {
        return res.status(400).json({ error: 'grade deve ser 1 (Errei), 2 (Difícil), 3 (Bom) ou 4 (Fácil)' });
      }
      const card = await flashcardService.reviewCard(id, grade as 1 | 2 | 3 | 4);
      return res.json(card);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async updateFlashcard(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const { frente, verso } = req.body;
      const card = await flashcardService.updateFlashcard(id, { frente, verso });
      return res.json(card);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async deleteFlashcard(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      await flashcardService.deleteFlashcard(id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
