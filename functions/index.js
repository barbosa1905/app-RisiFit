// Importa as bibliotecas necessárias do Firebase Functions e Admin SDK
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Mensagem de log atualizada para indicar a versão final e a abordagem de secrets.
console.log('Firebase Functions index.js loaded for HTTP test. (Especificando Conta de Serviço)');

admin.initializeApp(); // Inicializa o Admin SDK

// Importa Nodemailer para enviar e-mails
const nodemailer = require('nodemailer');

/**
 * Cloud Function HTTP para testar o envio de e-mails.
 * Especifica a conta de serviço para garantir acesso aos secrets.
 *
 * Nota: Para funções de 2ª Geração, os secrets definidos via `firebase functions:secrets:set`
 * são automaticamente injetados como parâmetros e podem ser acedidos via `functions.params.<SECRET_NAME>.value()`.
 */
exports.sendTestEmail = functions.https.onRequest(
  {
    // Usa o ID numérico do seu projeto para a conta de serviço.
    // Formato: `PROJECT_NUMBER@appspot.gserviceaccount.com`
    serviceAccount: '485424698583@appspot.gserviceaccount.com'
  },
  async (req, res) => {
    console.log('Função sendTestEmail acionada via HTTP.');

    const targetEmail = req.query.email || 'hugodiasbarbosa19052001@gmail.com'; // E-mail de destino padrão
    const testName = req.query.name || 'Cliente de Teste';

    if (!targetEmail) {
      return res.status(400).send('Por favor, forneça um endereço de e-mail para teste.');
    }

    try {
      // Logs de diagnóstico para verificar o estado dos secrets.
      console.log('Tentando aceder a functions.params.SENDGRID_USER:', functions.params.SENDGRID_USER);
      console.log('Tentando aceder a functions.params.SENDGRID_PASS:', functions.params.SENDGRID_PASS);

      // Acessa os valores dos secrets diretamente via functions.params.<SECRET_NAME>.value()
      const mailUser = functions.params.SENDGRID_USER ? functions.params.SENDGRID_USER.value() : undefined;
      const mailPass = functions.params.SENDGRID_PASS ? functions.params.SENDGRID_PASS.value() : undefined;

      console.log('Valor de mailUser (SENDGRID_USER):', mailUser ? 'Definido' : 'Indefinido/Vazio');
      console.log('Valor de mailPass (SENDGRID_PASS):', mailPass ? 'Definido' : 'Indefinido/Vazio');

      if (!mailUser || !mailPass) {
        console.error('DIAGNÓSTICO: Variáveis de ambiente SENDGRID_USER ou SENDGRID_PASS não configuradas ou acessíveis no runtime.');
        return res.status(500).send('Erro de configuração do servidor: credenciais de e-mail ausentes.');
      }

      const transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net', // Host do serviço de e-mail (SendGrid)
        port: 587, // Porta do serviço de e-mail
        secure: false, // `false` para porta 587 (TLS), `true` para porta 465 (SSL)
        auth: {
          user: mailUser,
          pass: mailPass,
        },
      });

      const mailOptions = {
        from: 'APP RISIFIT <hugodiasbarbosa19052001@gmail.com>', // E-mail remetente verificado no SendGrid
        to: targetEmail, // E-mail de destino
        subject: 'Teste de E-mail da Cloud Function RISIFIT', // Assunto do e-mail
        html: `
          <p>Olá ${testName},</p>
          <p>Este é um e-mail de teste enviado da sua Firebase Cloud Function.</p>
          <p>Se você recebeu este e-mail, significa que a configuração do SendGrid e da função está a funcionar corretamente.</p>
          <p>Atenciosamente,</p>
          <p>Sua Equipe de Teste RISIFIT</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`E-mail de teste enviado para: ${targetEmail}`);
      return res.status(200).send(`E-mail de teste enviado com sucesso para ${targetEmail}.`);

    } catch (error) {
      console.error(`Erro ao enviar e-mail de teste para ${targetEmail}:`, error);
      return res.status(500).send(`Erro ao enviar e-mail de teste: ${error.message}`);
    }
  }
);
