import cron from 'node-cron';
import pool from '../config/db'; // Conexão pg
import { enviarEmailCobranca } from './emailService';

let verificacaoNotificacoesEmExecucao = false;

export const processarCobrancasVencidas = async () => {
    if (verificacaoNotificacoesEmExecucao) return;
    verificacaoNotificacoesEmExecucao = true;

    try {
        const configRes = await pool.query(
            'SELECT chave_pix, mensagem_padrao FROM configuracoes_sistema WHERE id = 1',
        );
        const config = configRes.rows[0] ?? { chave_pix: '', mensagem_padrao: '' };
        const result = await pool.query(`
            SELECT * FROM cobrancas
            WHERE proxima_notificacao <= CURRENT_TIMESTAMP
            AND status IS DISTINCT FROM 'Em atraso'
            ORDER BY proxima_notificacao ASC
        `);

        for (const cobranca of result.rows) {
            try {
                await enviarEmailCobranca(cobranca, config);

                const diasParaAdicionar = cobranca.recorrencia === 'semanal' ? 7
                    : cobranca.recorrencia === 'quinzenal' ? 15
                        : 30;

                await pool.query(`
                    UPDATE cobrancas
                    SET status = 'Notificado',
                        ultima_notificacao = NOW(),
                        proxima_notificacao = proxima_notificacao + ($2 * interval '1 day')
                    WHERE id = $1
                `, [cobranca.id, diasParaAdicionar]);

                await pool.query(
                    'INSERT INTO historico_envios (cobranca_id, sucesso) VALUES ($1, true)',
                    [cobranca.id],
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`Falha no envio da cobrança ${cobranca.id}:`, error);
                await pool.query(
                    'INSERT INTO historico_envios (cobranca_id, sucesso, erro) VALUES ($1, false, $2)',
                    [cobranca.id, message],
                );
            }
        }
    } catch (error) {
        console.error('Erro ao processar notificações vencidas:', error);
    } finally {
        verificacaoNotificacoesEmExecucao = false;
    }
};

export const iniciarCronJobs = () => {
    console.log('Jobs de notificações e cobranças agendados.');

    // Recupera cobranças elegíveis após reinícios e inicia o processamento.
    void processarCobrancasVencidas();

    // Reconfere durante o dia para não perder cobranças cadastradas após uma execução.
    cron.schedule('*/5 * * * *', processarCobrancasVencidas);

    // Roda de hora em hora - Checagem de 48h (Atraso)
    cron.schedule('0 * * * *', async () => {
        console.log('Checando cobranças notificadas há mais de 48h...');
        try {
            await pool.query(`
                UPDATE cobrancas 
                SET status = 'Em atraso', atualizado_em = NOW()
                WHERE status = 'Notificado' 
                AND ultima_notificacao <= NOW() - interval '48 hours'
            `);
        } catch (error) {
            console.error('Erro no Cron horário:', error);
        }
    });
};
