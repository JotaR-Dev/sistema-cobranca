import { Router } from 'express';
import { obterConfiguracoes, salvarConfiguracoes } from '../controllers/configuracaoController';

const router = Router();

router.get('/', obterConfiguracoes);
router.put('/', salvarConfiguracoes);

export default router;
