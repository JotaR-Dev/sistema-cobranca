import type { Request, Response } from 'express';
import pool from '../config/db';

export const listarCobrancas = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM cobrancas ORDER BY proxima_notificacao ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar cobranças:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
};

export const criarCobranca = async (req: Request, res: Response) => {
    const {
        nome,
        telefone,
        email,
        valor_divida: valorDividaInput,
        tipo_cobranca: tipoCobranca,
        valor_cobranca: valorCobrancaInput,
        percentual: percentualInput,
        recorrencia,
        dataInicio,
    } = req.body ?? {};

    const valorDivida = Number(valorDividaInput);
    const percentual = tipoCobranca === 'percentual' ? Number(percentualInput) : null;
    const valorCobranca = tipoCobranca === 'percentual'
        ? valorDivida * ((percentual ?? 0) / 100)
        : Number(valorCobrancaInput);
    const dataValida = typeof dataInicio === 'string'
        && /^\d{4}-\d{2}-\d{2}$/.test(dataInicio)
        && !Number.isNaN(Date.parse(`${dataInicio}T00:00:00Z`))
        && new Date(`${dataInicio}T00:00:00Z`).toISOString().slice(0, 10) === dataInicio;

    if (typeof nome !== 'string' || !nome.trim()
        || typeof telefone !== 'string' || !telefone.trim()
        || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        || !Number.isFinite(valorDivida) || valorDivida <= 0
        || !['fixo', 'percentual'].includes(tipoCobranca)
        || !Number.isFinite(valorCobranca) || valorCobranca <= 0
        || (tipoCobranca === 'percentual'
            && (!Number.isFinite(percentual) || percentual === null || percentual <= 0 || percentual > 100))
        || !['semanal', 'quinzenal', 'mensal'].includes(recorrencia)
        || !dataValida) {
        res.status(400).json({ erro: 'Confira os dados da cobrança e tente novamente' });
        return;
    }

    try {
        const result = await pool.query(
            `INSERT INTO cobrancas 
            (nome, telefone, email, valor_divida, tipo_cobranca, valor_cobranca, percentual, recorrencia, proxima_notificacao) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *`,
            [
                nome.trim(),
                telefone.trim(),
                email.trim(),
                valorDivida,
                tipoCobranca,
                valorCobranca,
                percentual,
                recorrencia,
                dataInicio,
            ],
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar cobrança:', error);
        res.status(500).json({ erro: 'Erro ao cadastrar cobrança' });
    }
};
