import nodemailer from 'nodemailer';

const smtpPort = Number(process.env.SMTP_PORT);
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

type CobrancaEmail = {
    nome: string;
    email: string;
    valor_divida: number | string;
    valor_cobranca: number | string;
    proxima_notificacao: string | Date;
};

type ConfiguracaoEmail = {
    mensagem_padrao: string | null;
    chave_pix: string | null;
};

const escaparHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const verificarConexaoEmail = async () => {
    const missing = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_REMETENTE']
        .filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Configuração SMTP ausente: ${missing.join(', ')}`);
    }

    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
        throw new Error('SMTP_PORT inválida');
    }

    await transporter.verify();
};

export const enviarEmailCobranca = async (
    cobranca: CobrancaEmail,
    config: ConfiguracaoEmail,
) => {
    const assunto = 'Lembrete de Pagamento';
    const mensagem = config.mensagem_padrao ?? '';
    const chavePix = config.chave_pix ?? '';
    const nome = escaparHtml(cobranca.nome);
    const mensagemHtml = escaparHtml(mensagem).replace(/\r?\n/g, '<br>');
    const chavePixHtml = escaparHtml(chavePix);
    const dataVencimento = new Date(cobranca.proxima_notificacao).toLocaleDateString('pt-BR');
    const texto = `Olá ${cobranca.nome},\n\nEste é um lembrete para o pagamento no valor de R$ ${cobranca.valor_cobranca}.\n${mensagem}\nPix: ${chavePix}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #333;">Lembrete de Pagamento</h2>
            <p>Olá <strong>${nome}</strong>,</p>
            <p>Este é um aviso amigável sobre o vencimento da sua parcela.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Valor da Dívida Total:</strong> R$ ${cobranca.valor_divida}</p>
                <p><strong>Valor desta Parcela:</strong> R$ ${cobranca.valor_cobranca}</p>
                <p><strong>Vencimento:</strong> ${dataVencimento}</p>
            </div>
            <p>${mensagemHtml}</p>
            <p><strong>Chave PIX:</strong> ${chavePixHtml}</p>
        </div>
    `;

    return transporter.sendMail({
        from: process.env.EMAIL_REMETENTE,
        to: cobranca.email,
        subject: assunto,
        text: texto,
        html,
    });
};
