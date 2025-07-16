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

  // 3. Envio do E-mail de Boas-Vindas com Credenciais
  //    Certifique-se de que 'hugodiasbarbosa19052001@gmail.com' é um remetente verificado no SendGrid!
  
    const msg = {
      to: email, // Email do destinatário (o novo cliente)
      from: 'suporte.risifit@gmail.com', // <<<< MUDE AQUI PARA O EMAIL VERIFICADO NO SENDGRID
      subject: 'Bem-vindo(a) ao RisiFit! As suas credenciais de acesso.',
      html: `
        <p>Olá ${clientName},</p>
        <p>Bem-vindo(a) ao RisiFit! Estamos muito felizes por tê-lo(a) a bordo.</p>
        <p>Aqui estão as suas credenciais de acesso:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p>Recomendamos que altere a sua password após o primeiro login.</p>
        <p>Pode aceder à sua conta aqui: <a href="https://o-seu-site-risifit.com/login">Login no RisiFit</a></p>
        <p>Se tiver alguma dúvida, não hesite em contactar-nos.</p>
        <p>Atenciosamente,</p>
        <p>A Equipa RisiFit</p>
      `,
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
app.listen(port, () => {
  console.log(`Servidor proxy de email a correr em http://localhost:${port}`);
});
