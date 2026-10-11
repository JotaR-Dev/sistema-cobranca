import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
    console.log('Base de Dados conectada com sucesso!');
});

export const initializeDatabase = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS configuracoes_sistema (
            id smallint PRIMARY KEY CHECK (id = 1),
            chave_pix varchar(255),
            mensagem_padrao text,
            atualizado_em timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`
        INSERT INTO configuracoes_sistema (id)
        VALUES (1)
        ON CONFLICT (id) DO NOTHING
    `);
};

export default pool;
