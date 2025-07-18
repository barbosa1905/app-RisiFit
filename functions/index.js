// Importações principais
const { onUserCreated, defineSecret } = require('firebase-functions/v2/auth');
const logger = require('firebase-functions/logger');
const nodemailer = require('nodemailer');

// Define os secrets da SendGrid
const SENDGRID_USER = defineSecret('SENDGRID_USER');
const SENDGRID_PASS = defineSecret('SENDGRID_PASS');

// Função da 2ª geração acionada quando um novo utilizador se regista
exports.sendWelcomeEmailOnSignUp = onUserCreated(
  {
    secrets: [SENDGRID_USER, SENDGRID_PASS], // Passa os secrets para serem usados
    region: 'europe-west1', // Escolhe a tua região (opcional, mas recomendado)
  },
  async (event) => {
    const user = event.data;

    const targetEmail = user.email;
    const displayName = user.displayName || 'Cliente RISIFIT';

    if (!targetEmail) {
      logger.error('Novo utilizador não tem e-mail. Cancelando envio.');
      return;
    }

    logger.info(`Novo utilizador criado: ${targetEmail}`);

    const mailUser = SENDGRID_USER.value();
    const mailPass = SENDGRID_PASS.value();

    if (!mailUser || !mailPass) {
      logger.error('Secrets SENDGRID_USER ou SENDGRID_PASS não disponíveis no runtime.');
      return;
    }

    // Configura o transporte do Nodemailer com SendGrid
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
      from: 'APP RISIFIT <suporte.risifit@gmail.com>',
      to: targetEmail,
      subject: 'Bem-vindo(a) à APP RISIFIT!',
      html: `
        <p>Olá ${displayName},</p>
        <p>Bem-vindo(a) à APP RISIFIT! Estamos muito felizes por tê-lo(a) a bordo.</p>
        <p>Este e-mail confirma o seu registo.</p>
        <p>Atenciosamente,<br>A Equipe RISIFIT</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info(`E-mail de boas-vindas enviado para: ${targetEmail}`);
    } catch (error) {
      logger.error(`Erro ao enviar e-mail para ${targetEmail}:`, error);
    }
  }
);
