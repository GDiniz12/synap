import { Request, Response } from 'express';
import { aiService } from '../services/AiService';

export class AiController {
  async getThreads(req: Request, res: Response): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId as string;
      const threads = await aiService.getThreads(workspaceId);
      res.status(200).json(threads);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao buscar threads de IA.' });
    }
  }

  async createThread(req: Request, res: Response): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId as string;
      const { titulo } = req.body;
      const thread = await aiService.createThread(workspaceId, titulo);
      res.status(201).json(thread);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao criar thread de IA.' });
    }
  }

  async getThreadById(req: Request, res: Response): Promise<void> {
    try {
      const threadId = req.params.threadId as string;
      const thread = await aiService.getThreadById(threadId);
      if (!thread) {
        res.status(404).json({ error: 'Thread não encontrada.' });
        return;
      }
      res.status(200).json(thread);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao obter thread.' });
    }
  }

  async updateThreadTitle(req: Request, res: Response): Promise<void> {
    try {
      const threadId = req.params.threadId as string;
      const { titulo } = req.body;
      if (!titulo) {
        res.status(400).json({ error: 'O título é obrigatório.' });
        return;
      }
      const updated = await aiService.updateThreadTitle(threadId, titulo);
      res.status(200).json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao atualizar título da thread.' });
    }
  }

  async deleteThread(req: Request, res: Response): Promise<void> {
    try {
      const threadId = req.params.threadId as string;
      await aiService.deleteThread(threadId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao excluir thread.' });
    }
  }

  async chatStream(req: Request, res: Response): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId as string;
      const { threadId, message, activeNote } = req.body;

      if (!message || !message.trim()) {
        res.status(400).json({ error: 'A mensagem do usuário é obrigatória.' });
        return;
      }

      let targetThreadId = threadId;
      if (!targetThreadId) {
        const newThread = await aiService.createThread(workspaceId);
        targetThreadId = newThread.id;
      }

      // Configure SSE Headers
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      // Send initial threadId event so client knows the conversation ID
      res.write(`event: init\ndata: ${JSON.stringify({ threadId: targetThreadId })}\n\n`);

      await aiService.streamChat({
        workspaceId,
        threadId: targetThreadId,
        userMessage: message,
        activeNote,
        res,
      });
    } catch (error: any) {
      console.error('Erro no controller do chat IA:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Erro interno no servidor de IA.' });
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    }
  }
}

export const aiController = new AiController();
