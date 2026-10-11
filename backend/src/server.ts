import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cobrancaRoutes from './routes/cobrancaRoutes';
import configuracaoRoutes from './routes/configuracaoRoutes';
import pool, { initializeDatabase } from './config/db';
import { iniciarCronJobs } from './services/cronService';
import { verificarConexaoEmail } from './services/emailService';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Registrando as rotas de cobranças
app.use('/api/cobrancas', cobrancaRoutes);
app.use('/api/configuracoes', configuracaoRoutes);

app.get('/api/status', (req, res) => {
    res.json({ status: 'API rodando perfeitamente!' });
});

const iniciarServidor = async () => {
    try {
        await initializeDatabase();
        try {
            await verificarConexaoEmail();
            console.log('Conexão e autenticação SMTP verificadas com sucesso.');
        } catch (error) {
            const code = error && typeof error === 'object' && 'code' in error
                ? String(error.code)
                : 'configuração';
            console.error(`Verificação SMTP falhou (${code}); os envios poderão falhar até a configuração ser corrigida.`);
        }
        iniciarCronJobs();
        app.listen(port, () => {
            console.log(`Servidor do back-end rodando na porta ${port}`);
        });
    } catch (error) {
        console.error('Falha ao inicializar o banco de dados:', error);
        await pool.end();
        process.exitCode = 1;
    }
};

void iniciarServidor();
