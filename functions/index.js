// functions/index.js (Node 20 – Firebase Functions v2)

const { onCall } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// Secret do SendGrid (definido via CLI)
const SENDGRID_SECRET = defineSecret("SENDGRID_API_KEY_SECRET");

// Utils
const normalizeEmail = (e) => (e || "").toLowerCase().trim();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));
const hashCode = (code, salt) =>
  crypto.createHash("sha256").update(`${code}${salt}`).digest("hex");

// =================== Email de boas-vindas ===================
exports.enviarEmailBoasVindas = onCall(
  { region: "us-central1", secrets: [SENDGRID_SECRET] },
  async (request) => {
    const {
      email,
      nome_cliente,
      username,
      password,
      link_plataforma,
      nome_personal_trainer,
    } = request.data || {};

    if (
      !email ||
      !nome_cliente ||
      !username ||
      !password ||
      !link_plataforma ||
      !nome_personal_trainer
    ) {
      throw new Error(
        "Campos obrigatórios em falta (email, nome_cliente, username, password, link_plataforma, nome_personal_trainer)."
      );
    }

    // Carrega a API key do Secret
    const key = process.env.SENDGRID_API_KEY_SECRET;
    if (!key) throw new Error("SENDGRID_API_KEY_SECRET em falta.");
    sgMail.setApiKey(key);

    const msg = {
      to: normalizeEmail(email),
      from: { email: "suporte.risifit@gmail.com", name: "RisiFit" }, // tem de estar verificado no SendGrid
      templateId: "d-f03a04bc6d7943299130fcb0d300d930",
      dynamic_template_data: {
        nome_cliente,
        username,
        password,
        link_plataforma,
        nome_personal_trainer,
      },
    };

    try {
      await sgMail.send(msg);
      return { success: true };
    } catch (err) {
      logger.error("Erro ao enviar boas-vindas:", err?.response?.body || err);
      throw new Error("Não foi possível enviar o e-mail agora. Tenta novamente.");
    }
  }
);

// =================== Reset por código – pedir código ===================
exports.solicitarCodigoReset = onCall(
  { region: "us-central1", secrets: [SENDGRID_SECRET] },
  async (request) => {
    const { email } = request.data || {};
    if (!isEmail(email)) throw new Error("Email inválido.");
    const emailNorm = normalizeEmail(email);

    // Confirma que existe utilizador no Auth (ou devolve msg clara)
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(emailNorm);
    } catch {
      const qs = await db.collection("users").where("email", "==", emailNorm).limit(1).get();
      if (!qs.empty) {
        throw new Error("Conta ainda não está ativa. Fala com o teu Personal Trainer.");
      }
      throw new Error("Não existe conta com este email.");
    }

    // Gerar e guardar código (10 min)
    const code = genCode();
    const salt = crypto.randomBytes(16).toString("hex");
    const codeHash = hashCode(code, salt);
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));

    await db.collection("passwordResets").doc(emailNorm).set(
      {
        email: emailNorm,
        codeHash,
        salt,
        expiresAt,
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Envio de email
    const key = process.env.SENDGRID_API_KEY_SECRET;
    if (!key) throw new Error("SENDGRID_API_KEY_SECRET em falta.");
    sgMail.setApiKey(key);

    const msg = {
      to: emailNorm,
      from: { email: "suporte.risifit@gmail.com", name: "RisiFit" }, // verificado
      subject: "RisiFit • Código de recuperação",
      html: `
        <div style="font-family:Arial,sans-serif;font-size:16px;color:#222">
          <p>Olá!</p>
          <p>O teu código de recuperação é:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:3px;margin:16px 0 8px">${code}</p>
          <p>Este código é válido por 10 minutos.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p>Se não foste tu a pedir a recuperação, ignora este email.</p>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      return { ok: true };
    } catch (err) {
      logger.error("Erro ao enviar email de reset:", err?.response?.body || err);
      throw new Error("Não foi possível enviar o email neste momento. Tenta novamente.");
    }
  }
);

// =================== Reset por código – verificar ===================
exports.verificarCodigoReset = onCall(
  { region: "us-central1" },
  async (request) => {
    const { email, code } = request.data || {};
    if (!isEmail(email)) throw new Error("Email inválido.");
    if (!code || String(code).length !== 6) throw new Error("Código inválido.");

    const emailNorm = normalizeEmail(email);
    const ref = db.collection("passwordResets").doc(emailNorm);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("Código inválido ou expirado.");

    const data = snap.data();
    if (!data || !data.codeHash || !data.salt || !data.expiresAt) {
      throw new Error("Código inválido ou expirado.");
    }
    if (data.expiresAt.toDate() < new Date()) {
      await ref.delete().catch(() => {});
      throw new Error("Código expirado. Pede um novo.");
    }

    const calcHash = hashCode(String(code), data.salt);
    if (calcHash !== data.codeHash) {
      await ref.set(
        { attempts: (data.attempts || 0) + 1, lastAttempt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
      throw new Error("Código incorreto.");
    }

    return { ok: true };
  }
);

// =================== Reset por código – confirmar nova password ===================
exports.confirmarResetSenha = onCall(
  { region: "us-central1" },
  async (request) => {
    const { email, code, newPassword } = request.data || {};
    if (!isEmail(email)) throw new Error("Email inválido.");
    if (!code || String(code).length !== 6) throw new Error("Código inválido.");
    if (!newPassword || String(newPassword).length < 6) {
      throw new Error("A palavra-passe deve ter pelo menos 6 caracteres.");
    }

    const emailNorm = normalizeEmail(email);
    const ref = db.collection("passwordResets").doc(emailNorm);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("Código inválido ou expirado.");

    const data = snap.data();
    const calcHash = hashCode(String(code), data.salt);
    if (!data || calcHash !== data.codeHash || data.expiresAt.toDate() < new Date()) {
      throw new Error("Código inválido ou expirado.");
    }

    const user = await admin.auth().getUserByEmail(emailNorm);
    await admin.auth().updateUser(user.uid, { password: String(newPassword) });
    await admin.auth().revokeRefreshTokens(user.uid).catch(() => {});
    await ref.delete().catch(() => {});
    return { ok: true };
  }
);
