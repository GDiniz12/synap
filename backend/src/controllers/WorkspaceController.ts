import { Request, Response } from 'express';
import { workspaceService } from '../services/WorkspaceService';
import { AuthRequest } from '../middlewares/authMiddleware';

export class WorkspaceController {
  async createWorkspace(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      
      const workspaceData = { ...req.body, userId: req.userId };
      const workspace = await workspaceService.createWorkspace(workspaceData);
      res.status(201).json(workspace);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getWorkspaces(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      
      const workspaces = await workspaceService.getWorkspaces(req.userId);
      res.status(200).json(workspaces);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getWorkspaceById(req: AuthRequest, res: Response) {
    try {
      const workspace = await workspaceService.getWorkspaceById(req.params.id as string);
      if (workspace) {
        res.status(200).json(workspace);
      } else {
        res.status(404).json({ error: 'Workspace not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateWorkspace(req: AuthRequest, res: Response) {
    try {
      const workspace = await workspaceService.updateWorkspace(req.params.id as string, req.body);
      res.status(200).json(workspace);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteWorkspace(req: AuthRequest, res: Response) {
    try {
      await workspaceService.deleteWorkspace(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const workspaceController = new WorkspaceController();
