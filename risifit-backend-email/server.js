// Importa as bibliotecas necessárias
const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
require('dotenv').config(); // Carrega variáveis de ambiente do ficheiro .env

const app = express();
const port = process.env.PORT || 3000; // Define a porta do servidor, usando a variável de ambiente PORT ou 3000 por padrão

// Configuração do SendGrid
// A chave da API do SendGrid será lida da variável de ambiente SENDGRID_API_KEY
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// --- ADICIONE ESTAS LINHAS PARA DEPURAR ---
if (process.env.SENDGRID_API_KEY) {
    console.log('SENDGRID_API_KEY carregada. Comprimento:', process.env.SENDGRID_API_KEY.length);
} else {
    console.error('ERRO: SENDGRID_API_KEY não está definida!');
}
// Middleware para permitir que o Express analise corpos de requisição JSON
app.use(express.json());

// Middleware CORS para permitir requisições do seu frontend
// ATENÇÃO: Em produção, substitua '*' pelo domínio específico do seu frontend (ex: 'https://seusite.com')
app.use(cors({
    origin: '*' // Permite todas as origens para teste. MUDE ISTO EM PRODUÇÃO PARA MAIOR SEGURANÇA!
}));

// Rota de teste simples para verificar se o servidor está a funcionar
app.get('/', (req, res) => {
    res.status(200).send('Servidor de registo e email RisiFit está a funcionar!');
});

/**
 * Rota POST para registar um novo cliente e enviar um email de boas-vindas com credenciais.
 *
 * O corpo da requisição deve conter:
 * {
 * "email": "email_do_cliente@exemplo.com",
 * "password": "senha_gerada_ou_definida",
 * "clientName": "Nome do Cliente"
 * }
 *
 * ATENÇÃO: Enviar senhas por email não é a prática mais segura.
 * Considere enviar uma senha temporária com um link para redefinição,
 * ou apenas um link de ativação após o registo.
 */
app.post('/register-and-send-email', async (req, res) => {
    const { email, password, clientName } = req.body;

    // 1. Validação básica dos dados recebidos
    if (!email || !password || !clientName) {
        console.error('Dados de registo incompletos recebidos.');
        return res.status(400).json({ success: false, message: 'Faltam parâmetros obrigatórios: email, password, clientName.' });
    }

    // 2. Lógica de Registo do Cliente (Exemplo - ADICIONE A SUA LÓGICA REAL AQUI)
    //    Isto é onde você interagiria com a sua base de dados (Firestore, PostgreSQL, etc.)
    //    para criar o novo utilizador, hash da password, etc.
    console.log(`A tentar registar novo cliente: ${clientName} (${email})`);
    let userCreatedSuccessfully = false;
    try {
        // Exemplo: Salvar no banco de dados
        // const newUser = await db.collection('users').add({ email, passwordHash, name: clientName });
        // userCreatedSuccessfully = true;
        console.log('Lógica de criação de utilizador simulada executada.');
        userCreatedSuccessfully = true; // Simula sucesso na criação do utilizador
    } catch (dbError) {
        console.error('Erro ao criar utilizador na base de dados:', dbError);
        return res.status(500).json({ success: false, message: 'Erro ao registar o cliente na base de dados.' });
    }

    if (!userCreatedSuccessfully) {
        return res.status(500).json({ success: false, message: 'Falha na criação do utilizador.' });
    }

    // 3. Envio do E-mail de Boas-Vindas com Credenciais usando o Template do SendGrid
    //    Certifique-se de que 'suporte.risifit@gmail.com' é um remetente verificado no SendGrid!
    const msg = {
        to: email, // Email do destinatário (o novo cliente)
        from: 'suporte.risifit@gmail.com', // SEU email verificado no SendGrid
        // Remover 'subject' e 'html' pois o template do SendGrid já os define
        templateId: 'd-f03a04bc6d7943299130fcb0d300d930', // <--- IMPORTANTE: SUBSTITUA PELO ID REAL DO SEU TEMPLATE NO SENDGRID
        dynamicTemplateData: {
            nome_cliente: clientName, // Corresponde a {{{nome_cliente}}} no template
            username: email,         // Corresponde a {{{username}}} no template
            password: password,      // Corresponde a {{{password}}} no template
            link_plataforma: 'https://sua_plataforma_risifit.com/login', // Link para a sua plataforma/app
            // Se tiver outras variáveis no template (ex: URLs de ícones dinâmicos), adicione-as aqui:
            // url_banner: 'URL_DO_SEU_BANNER_AQUI',
            // icon_plano: 'URL_DO_SEU_ICONE_PLANO_AQUI',
            // icon_acompanhamento: 'URL_DO_SEU_ICONE_ACOMPANHAMENTO_AQUI',
            // icon_progresso: 'URL_DO_SEU_ICONE_PROGRESSO_AQUI',
            // url_avatar_pt: 'URL_DO_SEU_AVATAR_PT_AQUI'
        },
    };

    try {
        // Verifica se a chave da API do SendGrid está configurada
        if (!process.env.SENDGRID_API_KEY) {
            console.error('Erro: SENDGRID_API_KEY não está configurada nas variáveis de ambiente.');
            return res.status(500).json({ success: false, message: 'Erro de configuração do servidor: Chave da API SendGrid ausente.' });
        }

        await sgMail.send(msg);
        console.log(`Email de boas-vindas enviado com sucesso para: ${email}`);
        res.status(200).json({ success: true, message: 'Cliente registado e email de boas-vindas enviado com sucesso!' });
    } catch (error) {
        console.error(`Erro ao enviar email para ${email}:`, error.response ? error.response.body : error);
        res.status(500).json({ success: false, message: 'Cliente registado, mas falha ao enviar email de boas-vindas.', error: error.message });
    }
});

// Inicia o servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor proxy de email a correr em http://0.0.0.0:${port}`);
});
