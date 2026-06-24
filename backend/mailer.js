const nodemailer = require('nodemailer');
const fs = require('fs');
const db = require('./db/index');
const logger = require('./logger');

async function sendEmail({ to, subject, text, html, attachments }) {
  try {
    const impostazioni = await db.getAllImpostazioni();
    
    const host = impostazioni.smtp_host || '';
    const port = parseInt(impostazioni.smtp_port) || 465;
    const secure = (impostazioni.smtp_secure !== 'false' && impostazioni.smtp_secure !== '0');
    const user = impostazioni.smtp_user || '';
    let pass = impostazioni.smtp_pass || '';

    // Decrypt the password
    if (pass && pass.includes(':')) {
      try {
        pass = db.decryptText(pass);
      } catch (e) {
        logger.error('Error decrypting SMTP password', e.stack);
      }
    }

    if (!host || !user || !pass) {
      throw new Error('Configurazione SMTP incompleta. Verifica le impostazioni.');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure,
      auth: {
        user: user,
        pass: pass
      }
    });

    const mailOptions = {
      from: impostazioni.smtp_from || user,
      to,
      subject,
      text,
      html,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Error sending email', error.stack);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail
};
