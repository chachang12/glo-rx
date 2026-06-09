export class TelegramApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'TelegramApiError'
    this.status = status
    this.body = body
  }
}

const TELEGRAM_BASE = 'https://api.telegram.org'

type ParseMode = 'HTML' | 'MarkdownV2'

interface SendMessageOptions {
  parseMode?: ParseMode
  disableWebPagePreview?: boolean
  disableNotification?: boolean
}

function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null
}

export function isTelegramConfigured(): boolean {
  return !!botToken()
}

/**
 * Sends a Telegram message to a chat. Returns true on success.
 *
 * Special handling:
 *  - 403 (user blocked the bot, chat deactivated, etc.) → returns false, caller
 *    should treat the chat as invalid and clear the link.
 *  - 429 (rate limited) → throws so caller can decide whether to retry.
 *  - Anything else 4xx/5xx → throws TelegramApiError.
 */
export async function sendMessage(
  chatId: string,
  text: string,
  opts: SendMessageOptions = {}
): Promise<boolean> {
  const token = botToken()
  if (!token) {
    throw new TelegramApiError('TELEGRAM_BOT_TOKEN not configured', 500, null)
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
  }
  if (opts.parseMode) body.parse_mode = opts.parseMode
  if (opts.disableWebPagePreview) body.disable_web_page_preview = true
  if (opts.disableNotification) body.disable_notification = true

  const res = await fetch(`${TELEGRAM_BASE}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = (await res.json().catch(() => null)) as
    | { ok: boolean; description?: string; result?: unknown }
    | null

  if (res.ok && json?.ok) return true

  if (res.status === 403) {
    // Bot blocked or chat invalid — caller's job to clear the link.
    console.warn(`[telegram] 403 sending to chat ${chatId}: ${json?.description ?? ''}`)
    return false
  }

  throw new TelegramApiError(
    json?.description ?? `Telegram sendMessage failed (${res.status})`,
    res.status,
    json
  )
}

interface SendPhotoOptions extends SendMessageOptions {
  /** HTML/MarkdownV2 caption shown under the photo (Telegram caps at 1024 chars). */
  caption?: string
}

/**
 * Sends a photo by URL. Telegram fetches the image server-side, so `photoUrl`
 * just needs to be a publicly reachable URL (eBay's i.ebayimg.com CDN works) —
 * we never download or store the bytes ourselves.
 *
 * Same success/error contract as sendMessage: true on success, false on 403
 * (caller clears the link), throws TelegramApiError otherwise. Callers should
 * fall back to a plain text message if this throws, since a bad/oversized image
 * shouldn't swallow the notification.
 */
export async function sendPhoto(
  chatId: string,
  photoUrl: string,
  opts: SendPhotoOptions = {}
): Promise<boolean> {
  const token = botToken()
  if (!token) {
    throw new TelegramApiError('TELEGRAM_BOT_TOKEN not configured', 500, null)
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    photo: photoUrl,
  }
  if (opts.caption) body.caption = opts.caption
  if (opts.parseMode) body.parse_mode = opts.parseMode
  if (opts.disableNotification) body.disable_notification = true

  const res = await fetch(`${TELEGRAM_BASE}/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = (await res.json().catch(() => null)) as
    | { ok: boolean; description?: string; result?: unknown }
    | null

  if (res.ok && json?.ok) return true

  if (res.status === 403) {
    console.warn(`[telegram] 403 sending photo to chat ${chatId}: ${json?.description ?? ''}`)
    return false
  }

  throw new TelegramApiError(
    json?.description ?? `Telegram sendPhoto failed (${res.status})`,
    res.status,
    json
  )
}

/**
 * Telegram API helpers for the webhook lifecycle. Not called at runtime —
 * useful when setting up a new bot or rotating the secret.
 */
export async function setWebhook(url: string, secret: string): Promise<boolean> {
  const token = botToken()
  if (!token) return false
  const res = await fetch(`${TELEGRAM_BASE}/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, secret_token: secret }),
  })
  const json = (await res.json().catch(() => null)) as { ok?: boolean } | null
  return res.ok && !!json?.ok
}
