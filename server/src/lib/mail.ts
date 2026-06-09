/**
 * Minimal mail transport. The only production-bound consumer right now is the
 * contributor invite flow. Better Auth has no mail transport wired today, so
 * this acts as the single seam: if RESEND_API_KEY is set we POST to Resend's
 * REST endpoint; otherwise we log the rendered email to stdout (still useful
 * in local dev — the invite token is in the link).
 *
 * Picking Resend over nodemailer/SES to keep the dependency footprint at zero;
 * the call is a single fetch to a documented JSON endpoint.
 */

export type MailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendMail(input: MailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM ?? 'Axeous <notifications@axeous.com>'

  if (!apiKey) {
    console.log(
      `[mail] (no RESEND_API_KEY — would send) to=${input.to} subject="${input.subject}"\n${input.text ?? input.html}`
    )
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend send failed (${res.status}): ${body}`)
  }
}
