const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || (() => {
  // tenta buscar da config do Firebase
  try {
    const functionsConfig = require('firebase-functions').config();
    return functionsConfig.sendgrid.key;
  } catch {
    return null;
  }
})();

sgMail.setApiKey(SENDGRID_API_KEY);

exports.enviarEmailBoasVindas = onCall(async (request) => {
  // Adicione nome_personal_trainer aqui
  const { email, nome_cliente, username, password, link_plataforma, nome_personal_trainer } = request.data;

  // Atualize a verificação para incluir nome_personal_trainer
  if (!email || !nome_cliente || !username || !password || !link_plataforma || !nome_personal_trainer) {
    throw new Error("Todos os campos obrigatórios (email, nome_cliente, username, password, link_plataforma, nome_personal_trainer) devem ser fornecidos.");
  }

  const msg = {
    to: email,
    from: {
      email: "suporte.risifit@gmail.com",
      name: "RisiFit",
    },
    templateId: "d-f03a04bc6d7943299130fcb0d300d930",
    dynamic_template_data: {
      nome_cliente,
      username,
      password,
      link_plataforma,
      nome_personal_trainer, // <<< Adicione esta linha
    },
  };

  try {
    await sgMail.send(msg);
    return { success: true, message: "Email enviado com sucesso!" };
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    // Para depuração, você pode querer logar mais detalhes do erro do SendGrid:
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error("Erro ao enviar o e-mail. Por favor, tente novamente.");
  }
});