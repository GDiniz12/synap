import { Router } from 'express';
import { pastaController } from '../controllers/PastaController';

const router = Router();

router.post('/', pastaController.createPasta);
router.get('/', pastaController.getPastas);
router.get('/:id', pastaController.getPastaById);
router.put('/:id', pastaController.updatePasta);
router.delete('/:id', pastaController.deletePasta);

export default router;
