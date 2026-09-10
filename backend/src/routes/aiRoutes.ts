import { Router } from 'express';
import { aiController } from '../controllers/AiController';

const router = Router();

router.get('/workspace/:workspaceId/threads', (req, res) => aiController.getThreads(req, res));
router.post('/workspace/:workspaceId/threads', (req, res) => aiController.createThread(req, res));
router.get('/threads/:threadId', (req, res) => aiController.getThreadById(req, res));
router.patch('/threads/:threadId', (req, res) => aiController.updateThreadTitle(req, res));
router.delete('/threads/:threadId', (req, res) => aiController.deleteThread(req, res));
router.post('/workspace/:workspaceId/chat', (req, res) => aiController.chatStream(req, res));

export default router;
