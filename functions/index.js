    // Importa as bibliotecas necessárias do Firebase Functions e Admin SDK
    // Importa 'defineSecret' para declarar secrets
    const functions = require('firebase-functions');
    const { defineSecret } = require('firebase-functions/v2/secrets');
    const admin = require('firebase-admin');

    console.log('Firebase Functions index.js loaded for HTTP test. (Versão 2)'); // Adicionei "(Versão 2)" para forçar a mudança

    admin.initializeApp();

    // Importa Nodemailer para enviar e-mails
    const nodemailer = require('nodemailer');

    // Declara os secrets que esta função usará.
    const sendgridUser = defineSecret('SENDGRID_USER');
    const sendgridPass = defineSecret('SENDGRID_PASS');

    /**
     * Cloud Function HTTP para testar o envio de e-mails.
     * Você pode chamá-la diretamente via URL para testar.
     */
    exports.sendTestEmail = functions.https.onRequest(
      { secrets: [sendgridUser, sendgridPass] }, // Vincula os secrets à função
      async (req, res) => {
        console.log('Função sendTestEmail acionada via HTTP.');

        const targetEmail = req.query.email || 'seu_email_para_teste@example.com';
        const testName = req.query.name || 'Cliente de Teste';

        if (!targetEmail) {
          return res.status(400).send('Por favor, forneça um endereço de e-mail para teste.');
        }

        try {
          // Acessa os valores dos secrets via process.env
          const mailUser = process.env.SENDGRID_USER;
          const mailPass = process.env.SENDGRID_PASS;

          if (!mailUser || !mailPass) {
            console.error('Variáveis de ambiente SENDGRID_USER ou SENDGRID_PASS não configuradas.');
            return res.status(500).send('Erro de configuração do servidor: credenciais de e-mail ausentes.');
          }

          const transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
              user: mailUser,
              pass: mailPass,
            },
          });

          const mailOptions = {
            from: 'APP RISIFIT <seu_email_verificado@dominio.com>',
            to: targetEmail,
            subject: 'Teste de E-mail da Cloud Function RISIFIT',
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
    