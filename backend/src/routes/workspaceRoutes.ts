import { Router } from 'express';
import { workspaceController } from '../controllers/WorkspaceController';

const router = Router();

router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);
router.get('/join-preview/:code', workspaceController.getJoinPreview);
router.post('/join/:code', workspaceController.joinByInviteCode);
router.get('/:id', workspaceController.getWorkspaceById);
router.put('/:id', workspaceController.updateWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);
router.post('/:id/invite', workspaceController.inviteCollaborator);
router.get('/:id/collaborators', workspaceController.getCollaborators);
router.delete('/:id/collaborators/:userId', workspaceController.removeCollaborator);
router.patch('/:id/collaborators/:userId/role', workspaceController.updateCollaboratorRole);
router.post('/:id/leave', workspaceController.leaveWorkspace);
router.post('/:id/invite-link', workspaceController.getOrCreateInviteLink);
router.post('/:id/invite-link/reset', workspaceController.resetInviteLink);

export default router;
