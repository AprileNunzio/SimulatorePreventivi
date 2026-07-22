/**
 * Micro-Servizio SMTP — Invio email per recupero PIN e notifiche
 * Richiede: npm install nodemailer
 */

let nodemailer;
try { nodemailer = require('nodemailer'); } catch (e) { nodemailer = null; }

const core = require('../../db/core');
const { get } = core;
const crypto = require('crypto');

// Store in-memory dei codici di recupero temporanei (PIN reset tokens)
const resetTokens = new Map(); // email → { code, expires, username }

function getSmtpConfig() {
  const host     = get("SELECT valore FROM impostazioni WHERE chiave = 'smtp_host' LIMIT 1")?.valore;
  const port     = get("SELECT valore FROM impostazioni WHERE chiave = 'smtp_port' LIMIT 1")?.valore || '587';
  const user     = get("SELECT valore FROM impostazioni WHERE chiave = 'smtp_user' LIMIT 1")?.valore;
  const pass     = get("SELECT valore FROM impostazioni WHERE chiave = 'smtp_pass' LIMIT 1")?.valore;
  const from     = get("SELECT valore FROM impostazioni WHERE chiave = 'smtp_from' LIMIT 1")?.valore;
  const secure   = get("SELECT valore FROM impostazioni WHERE chiave = 'smtp_secure' LIMIT 1")?.valore === '1';

  return { host, port: parseInt(port), user, pass, from, secure };
}

function isSmtpConfigured() {
  const cfg = getSmtpConfig();
  return !!(cfg.host && cfg.user && cfg.pass);
}

async function testSmtpConnection() {
  if (!nodemailer) return { success: false, error: 'nodemailer non installato. Esegui: npm install nodemailer' };
  
  const cfg = getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { success: false, error: 'Configurazione SMTP incompleta. Imposta host, utente e password.' };
  }

  try {
    const transporter = nodemailer.createTransporter({
      host: cfg.host, port: cfg.port, secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: 8000, greetingTimeout: 5000
    });
    await transporter.verify();
    return { success: true, message: 'Connessione SMTP verificata con successo!' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function sendPinResetEmail(email) {
  if (!nodemailer) return { success: false, error: 'nodemailer non installato' };
  if (!isSmtpConfigured()) return { success: false, error: 'SMTP non configurato nelle Impostazioni' };

  // Cerca l'utente per email (campo email nella tabella impostazioni o utenti)
  const user = get("SELECT * FROM utenti WHERE email = ? AND attivo = 1 LIMIT 1", [email]);
  if (!user) return { success: false, error: 'Nessun operatore attivo trovato con questa email' };

  // Genera codice 6 cifre
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + 15 * 60 * 1000; // 15 minuti

  resetTokens.set(email.toLowerCase(), { code, expires, username: user.username });

  const cfg = getSmtpConfig();
  const companyName = get("SELECT valore FROM impostazioni WHERE chiave = 'ragione_sociale' LIMIT 1")?.valore || 'NunzioTech';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:'Inter',Arial,sans-serif; background:#f1f5f9; margin:0; padding:32px;">
      <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed); padding:28px 32px;">
          <h1 style="color:white; font-size:20px; margin:0;">🔐 Recupero PIN di Accesso</h1>
          <p style="color:rgba(255,255,255,0.8); font-size:13px; margin:6px 0 0;">Gestionale ${companyName}</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#334155; font-size:15px;">Ciao <strong>${user.nome}</strong>,</p>
          <p style="color:#334155; font-size:14px;">Hai richiesto il reset del tuo PIN di accesso al gestionale. Usa il seguente codice di verifica:</p>
          <div style="background:#f8fafc; border:2px solid #3b82f6; border-radius:12px; padding:20px; text-align:center; margin:20px 0;">
            <div style="font-size:40px; font-weight:900; letter-spacing:12px; color:#1d4ed8; font-family:monospace;">${code}</div>
            <p style="color:#64748b; font-size:12px; margin:8px 0 0;">Valido per 15 minuti</p>
          </div>
          <p style="color:#64748b; font-size:12px;">Se non hai richiesto questo codice, ignora questa email. Il tuo PIN attuale rimane invariato.</p>
        </div>
        <div style="background:#f8fafc; padding:16px 32px; border-top:1px solid #e2e8f0; text-align:center;">
          <p style="color:#94a3b8; font-size:11px; margin:0;">Gestionale ${companyName} · NunzioTech</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = nodemailer.createTransporter({
      host: cfg.host, port: cfg.port, secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass }
    });
    await transporter.sendMail({
      from: `"${companyName}" <${cfg.from || cfg.user}>`,
      to: email,
      subject: `🔐 Codice di Recupero PIN — ${companyName}`,
      html
    });
    return { success: true, message: 'Email inviata. Controlla la casella di posta.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function verifyPinResetCode(email, code, newPin) {
  const token = resetTokens.get(email.toLowerCase());
  if (!token) return { success: false, error: 'Nessuna richiesta di recupero attiva per questa email' };
  if (Date.now() > token.expires) {
    resetTokens.delete(email.toLowerCase());
    return { success: false, error: 'Codice scaduto. Richiedine uno nuovo.' };
  }
  if (token.code !== code) return { success: false, error: 'Codice non corretto. Riprova.' };
  if (!newPin || newPin.length < 4) return { success: false, error: 'Il nuovo PIN deve avere almeno 4 cifre' };

  const { run: dbRun, persistDb } = core;
  dbRun("UPDATE utenti SET pin = ? WHERE LOWER(username) = LOWER(?)", [newPin, token.username]);
  persistDb();
  resetTokens.delete(email.toLowerCase());
  return { success: true, message: 'PIN aggiornato con successo. Accedi con il nuovo PIN.' };
}

module.exports = {
  isSmtpConfigured,
  testSmtpConnection,
  sendPinResetEmail,
  verifyPinResetCode,
  getSmtpConfig
};
