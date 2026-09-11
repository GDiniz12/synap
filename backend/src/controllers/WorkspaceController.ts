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
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const workspace = await workspaceService.getWorkspaceById(req.params.id as string, req.userId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      if (!workspace.isOwner && !workspace.currentUserRole) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar este workspace.' });
      }
      res.status(200).json(workspace);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateWorkspace(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const workspace = await workspaceService.updateWorkspace(req.params.id as string, req.body, req.userId);
      res.status(200).json(workspace);
    } catch (error: any) {
      res.status(403).json({ error: error.message });
    }
  }

  async deleteWorkspace(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      await workspaceService.deleteWorkspace(req.params.id as string, req.userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(403).json({ error: error.message });
    }
  }

  async inviteCollaborator(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { email, userId, role } = req.body;
      if (!email && !userId) return res.status(400).json({ error: 'Email ou ID do usuário é obrigatório' });
      
      const collaborator = await workspaceService.inviteCollaborator(
        req.params.id as string,
        { email, userId },
        req.userId,
        role
      );
      res.status(200).json(collaborator);
    } catch (error: any) {
      res.status(403).json({ error: error.message });
    }
  }

  async leaveWorkspace(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      await workspaceService.leaveWorkspace(req.params.id as string, req.userId);
      res.status(200).json({ message: 'Você saiu do workspace com sucesso.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateCollaboratorRole(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { role } = req.body;
      if (!role) return res.status(400).json({ error: 'Role é obrigatória' });
      const updated = await workspaceService.updateCollaboratorRole(
        req.params.id as string,
        req.params.userId as string,
        role,
        req.userId
      );
      res.status(200).json(updated);
    } catch (error: any) {
      res.status(403).json({ error: error.message });
    }
  }

  async getCollaborators(req: AuthRequest, res: Response) {
    try {
      const collaborators = await workspaceService.getCollaborators(req.params.id as string);
      res.status(200).json(collaborators);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeCollaborator(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { id, userId } = req.params;
      await workspaceService.removeCollaborator(id as string, userId as string, req.userId);
      res.status(200).json({ message: 'Colaborador removido com sucesso.' });
    } catch (error: any) {
      res.status(error.message?.includes('permissão') ? 403 : 400).json({ error: error.message });
    }
  }

  async getOrCreateInviteLink(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await workspaceService.getOrCreateInviteLink(req.params.id as string, req.userId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async resetInviteLink(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await workspaceService.resetInviteLink(req.params.id as string, req.userId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getJoinPreview(req: AuthRequest, res: Response) {
    try {
      const code = req.params.code as string;
      const preview = await workspaceService.getJoinPreview(code, req.userId);
      res.status(200).json(preview);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async joinByInviteCode(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
      const code = req.params.code as string;
      const result = await workspaceService.joinByInviteCode(code, req.userId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const workspaceController = new WorkspaceController();

