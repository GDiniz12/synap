import { Request, Response } from 'express';
import { notaService } from '../services/NotaService';
import { AuthRequest } from '../middlewares/authMiddleware';

export class NotaController {
  async createNota(req: AuthRequest, res: Response) {
    try {
      const { titulo, conteudo, tipo, workspaceId, pastaId } = req.body;
      if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });
      
      const nota = await notaService.createNota({ titulo, conteudo, tipo: tipo || 'texto', workspaceId, pastaId });
      res.status(201).json(nota);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getNotas(req: AuthRequest, res: Response) {
    try {
      const workspaceId = req.query.workspaceId as string;
      const pastaId = req.query.pastaId as string | undefined;
      
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }

      const notas = await notaService.getNotas(workspaceId, pastaId);
      res.status(200).json(notas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getNotaById(req: Request, res: Response) {
    try {
      const nota = await notaService.getNotaById(req.params.id as string);
      if (nota) {
        res.status(200).json(nota);
      } else {
        res.status(404).json({ error: 'Nota not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateNota(req: Request, res: Response) {
    try {
      const nota = await notaService.updateNota(req.params.id as string, req.body);
      res.status(200).json(nota);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteNota(req: Request, res: Response) {
    try {
      await notaService.deleteNota(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const notaController = new NotaController();
