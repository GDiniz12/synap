import { Router } from 'express';
import { userController } from '../controllers/UserController';

const router = Router();

router.post('/', userController.createUser);
router.get('/', userController.getUsers);
router.get('/search', userController.searchUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
