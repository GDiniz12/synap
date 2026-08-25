import { Router } from 'express';
import { notaController } from '../controllers/NotaController';

const router = Router();

router.post('/', notaController.createNota);
router.get('/', notaController.getNotas);
router.get('/:id', notaController.getNotaById);
router.put('/:id', notaController.updateNota);
router.delete('/:id', notaController.deleteNota);

export default router;
