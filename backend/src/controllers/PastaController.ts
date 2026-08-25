import { Request, Response } from 'express';
import { pastaService } from '../services/PastaService';
import { AuthRequest } from '../middlewares/authMiddleware';

export class PastaController {
  async createPasta(req: AuthRequest, res: Response) {
    try {
      const { nome, workspaceId, parentId } = req.body;
      if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });
      
      const pasta = await pastaService.createPasta({ nome, workspaceId, parentId });
      res.status(201).json(pasta);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getPastas(req: AuthRequest, res: Response) {
    try {
      const workspaceId = req.query.workspaceId as string;
      if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });
      
      const pastas = await pastaService.getPastas(workspaceId);
      res.status(200).json(pastas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPastaById(req: Request, res: Response) {
    try {
      const pasta = await pastaService.getPastaById(req.params.id as string);
      if (pasta) {
        res.status(200).json(pasta);
      } else {
        res.status(404).json({ error: 'Pasta not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updatePasta(req: Request, res: Response) {
    try {
      const pasta = await pastaService.updatePasta(req.params.id as string, req.body);
      res.status(200).json(pasta);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deletePasta(req: Request, res: Response) {
    try {
      await pastaService.deletePasta(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const pastaController = new PastaController();
