import nodemailer from 'nodemailer';

interface AnketaInviteEmailOptions {
  to: string;
  anketaName: string;
  companyName: string;
  url: string;
  comment?: string;
}

function buildText({ anketaName, companyName, url, comment }: AnketaInviteEmailOptions) {
  const lines = [
    'Здравствуйте!',
    '',
    `Вам направлена ссылка для заполнения анкеты «${anketaName}» (${companyName}).`,
    '',
    'Для заполнения перейдите по ссылке:',
    url,
    '',
    'Вход в систему не требуется.',
  ];
  if (comment) {
    lines.push('', 'Комментарий от DPO:', comment);
  }
  lines.push('', '—', 'Реестр ПДн — ГК «Самолёт»');
  return lines.join('\n');
}

function buildHtml({ anketaName, companyName, url, comment }: AnketaInviteEmailOptions) {
  const commentBlock = comment
    ? `<p style="margin:16px 0;padding:12px;background:#f5f6fa;border-radius:8px;"><strong>Комментарий от DPO:</strong><br/>${escapeHtml(comment)}</p>`
    : '';
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;color:#1a1a1a;">
      <p>Здравствуйте!</p>
      <p>Вам направлена ссылка для заполнения анкеты <strong>«${escapeHtml(anketaName)}»</strong> (${escapeHtml(companyName)}).</p>
      <p>Для заполнения нажмите кнопку ниже. Вход в систему не требуется.</p>
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#0055FF;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Заполнить анкету
        </a>
      </p>
      <p style="font-size:13px;color:#666;">Или скопируйте ссылку: <a href="${url}">${url}</a></p>
      ${commentBlock}
      <p style="margin-top:32px;font-size:12px;color:#999;">Реестр ПДн — ГК «Самолёт»</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface AnketaBulkInviteItem {
  anketaName: string;
  url: string;
}

interface AnketaBulkInviteEmailOptions {
  to: string;
  companyName: string;
  invites: AnketaBulkInviteItem[];
  comment?: string;
}

function buildBulkText({ companyName, invites, comment }: AnketaBulkInviteEmailOptions) {
  const lines = [
    'Здравствуйте!',
    '',
    `Вам направлены ссылки для заполнения анкет (${companyName}):`,
    '',
    ...invites.flatMap(inv => [`• ${inv.anketaName}`, inv.url, '']),
    'Вход в систему не требуется.',
  ];
  if (comment) {
    lines.push('', 'Комментарий от DPO:', comment);
  }
  lines.push('', '—', 'Реестр ПДн — ГК «Самолёт»');
  return lines.join('\n');
}

function buildBulkHtml({ companyName, invites, comment }: AnketaBulkInviteEmailOptions) {
  const list = invites
    .map(
      inv => `
      <li style="margin-bottom:16px;">
        <strong>${escapeHtml(inv.anketaName)}</strong><br/>
        <a href="${inv.url}" style="color:#0055FF;">${inv.url}</a>
      </li>`,
    )
    .join('');
  const commentBlock = comment
    ? `<p style="margin:16px 0;padding:12px;background:#f5f6fa;border-radius:8px;"><strong>Комментарий от DPO:</strong><br/>${escapeHtml(comment)}</p>`
    : '';
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;color:#1a1a1a;">
      <p>Здравствуйте!</p>
      <p>Вам направлены ссылки для заполнения анкет <strong>${escapeHtml(companyName)}</strong>:</p>
      <ul style="padding-left:20px;">${list}</ul>
      <p>Вход в систему не требуется.</p>
      ${commentBlock}
      <p style="margin-top:32px;font-size:12px;color:#999;">Реестр ПДн — ГК «Самолёт»</p>
    </div>
  `;
}

export async function sendAnketaBulkInviteEmail(options: AnketaBulkInviteEmailOptions) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.warn(`[mail] SMTP не настроен — письмо для ${options.to} не отправлено`);
    options.invites.forEach(inv => console.warn(`[mail] ${inv.anketaName}: ${inv.url}`));
    return { sent: false, reason: 'smtp_not_configured' as const };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@samolet.ru',
    to: options.to,
    subject: `Заполните анкеты: ${options.companyName}`,
    text: buildBulkText(options),
    html: buildBulkHtml(options),
  });

  return { sent: true as const };
}

export async function sendAnketaInviteEmail(options: AnketaInviteEmailOptions) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.warn(`[mail] SMTP не настроен — письмо для ${options.to} не отправлено`);
    console.warn(`[mail] Ссылка: ${options.url}`);
    return { sent: false, reason: 'smtp_not_configured' as const };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@samolet.ru',
    to: options.to,
    subject: `Заполните анкету: ${options.anketaName}`,
    text: buildText(options),
    html: buildHtml(options),
  });

  return { sent: true as const };
}
