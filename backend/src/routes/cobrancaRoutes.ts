import { Router } from 'express';
import { listarCobrancas, criarCobranca } from '../controllers/cobrancaController';

const router = Router();

router.get('/', listarCobrancas);
router.post('/', criarCobranca);

export default router;
