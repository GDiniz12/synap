import { Router } from 'express';
import { workspaceController } from '../controllers/WorkspaceController';

const router = Router();

router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);
router.get('/:id', workspaceController.getWorkspaceById);
router.put('/:id', workspaceController.updateWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);
router.post('/:id/invite', workspaceController.inviteCollaborator);
router.get('/:id/collaborators', workspaceController.getCollaborators);

export default router;
