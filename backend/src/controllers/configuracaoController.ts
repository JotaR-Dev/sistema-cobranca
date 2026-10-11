import type { Request, Response } from 'express';
import pool from '../config/db';

export const obterConfiguracoes = async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT COALESCE(chave_pix, '') AS chave_pix,
                    COALESCE(mensagem_padrao, '') AS mensagem_padrao
             FROM configuracoes_sistema
             WHERE id = 1`,
        );
        res.json(result.rows[0] ?? { chave_pix: '', mensagem_padrao: '' });
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        res.status(500).json({ erro: 'Não foi possível carregar as configurações' });
    }
};

export const salvarConfiguracoes = async (req: Request, res: Response) => {
    const chavePix = req.body?.chave_pix;
    const mensagemPadrao = req.body?.mensagem_padrao;

    if (typeof chavePix !== 'string' || typeof mensagemPadrao !== 'string') {
        res.status(400).json({ erro: 'Chave PIX e mensagem padrão devem ser textos' });
        return;
    }

    try {
        const result = await pool.query(
            `INSERT INTO configuracoes_sistema (id, chave_pix, mensagem_padrao, atualizado_em)
             VALUES (1, $1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (id) DO UPDATE
             SET chave_pix = EXCLUDED.chave_pix,
                 mensagem_padrao = EXCLUDED.mensagem_padrao,
                 atualizado_em = CURRENT_TIMESTAMP
             RETURNING chave_pix, mensagem_padrao`,
            [chavePix.trim(), mensagemPadrao.trim()],
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ erro: 'Não foi possível salvar as configurações' });
    }
};
