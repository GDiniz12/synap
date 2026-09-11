import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import workspaceRoutes from './workspaceRoutes';
import pastaRoutes from './pastaRoutes';
import notaRoutes from './notaRoutes';
import uploadRoutes from './uploadRoutes';
import flashcardRoutes from './flashcardRoutes';
import aiRoutes from './aiRoutes';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/authMiddleware';
import { workspaceController } from '../controllers/WorkspaceController';

const router = Router();

router.use('/auth', authRoutes);

// Public / Semi-public join preview
router.get('/workspaces/join-preview/:code', optionalAuthMiddleware, workspaceController.getJoinPreview);

// Protected routes
router.use('/users', authMiddleware, userRoutes);
router.use('/workspaces', authMiddleware, workspaceRoutes);
router.use('/pastas', authMiddleware, pastaRoutes);
router.use('/notas', authMiddleware, notaRoutes);
router.use('/upload', authMiddleware, uploadRoutes);
router.use('/flashcards', authMiddleware, flashcardRoutes);
router.use('/ai', authMiddleware, aiRoutes);

export default router;

