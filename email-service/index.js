module.exports = function createEmailService({ nodemailer, env = process.env }) {
  let transporter;

  function getTransporter() {
    const host = env.SMTP_HOST?.trim();
    const port = Number(env.SMTP_PORT || 587);
    const from = env.SMTP_FROM?.trim() || env.SMTP_USER?.trim();
    const username = env.SMTP_USER?.trim();
    const password = env.SMTP_PASS;
    const tlsCa = env.SMTP_TLS_CA?.trim();

    if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('SMTP_HOST, SMTP_FROM (or SMTP_USER), and a valid SMTP_PORT are required');
    }
    if (Boolean(username) !== Boolean(password)) {
      throw new Error('SMTP_USER and SMTP_PASS must either both be set or both be empty');
    }

    if (!transporter) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: env.SMTP_SECURE === 'true' || (env.SMTP_SECURE !== 'false' && port === 465),
        ...(username ? { auth: { user: username, pass: password } } : {}),
        ...(tlsCa ? { tls: { ca: tlsCa.replace(/\\n/g, '\n') } } : {}),
      });
    }

    return { transporter, from };
  }

  return {
    async send({ recipients, subject, text }) {
      const uniqueRecipients = [...new Set(recipients.map((address) => address.trim().toLowerCase()))];
      if (!uniqueRecipients.length) throw new Error('Email notification has no recipients');

      const { transporter: mailTransporter, from } = getTransporter();
      const result = await mailTransporter.sendMail({
        from,
        bcc: uniqueRecipients,
        subject,
        text,
      });
      if (!result.accepted?.length || result.rejected?.length) {
        throw new Error('SMTP did not accept every email recipient');
      }
      return result.accepted.length;
    },
  };
};
