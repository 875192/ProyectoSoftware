const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail(email, resetUrl) {
  const transporter = createTransporter();

  if (!transporter) {
    // Modo desarrollo: imprime el enlace en consola
    console.log('\n========================================');
    console.log('[DEV] Enlace de recuperación de contraseña');
    console.log(`  Para: ${email}`);
    console.log(`  URL:  ${resetUrl}`);
    console.log('========================================\n');
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"UniGear" <no-reply@unigear.edu>',
    to: email,
    subject: 'Recuperación de contraseña - UniGear',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f766e;">Restablecer contraseña</h2>
        <p>Has solicitado restablecer tu contraseña en <strong>UniGear</strong>.</p>
        <p>Haz clic en el botón para continuar (el enlace es válido durante <strong>1 hora</strong>):</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:10px 20px;background:#0f766e;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:12px 0;">
          Restablecer contraseña
        </a>
        <p style="color:#64748b;font-size:0.85rem;">
          Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.
        </p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
