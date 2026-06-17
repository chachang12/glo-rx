import { randomBytes } from 'node:crypto'
import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth.js'
import type { AuthEnv } from '../../../types.js'
import { UserModel } from '../../shared/user/user.model.js'
import { TelegramLinkCodeModel } from './telegram.model.js'
import { sendMessage } from './telegram.client.js'

const LINK_CODE_TTL_MS = 10 * 60 * 1000

function botUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME ?? null
}

function buildBotStartUrl(code: string): string | null {
  const username = botUsername()
  if (!username) return null
  return `https://t.me/${username}?start=${code}`
}

const telegramRoutes = new Hono<AuthEnv>()

// ── POST /link ── start a link session
telegramRoutes.post('/link', requireAuth, async (c) => {
  const authUser = c.get('user')
  if (!botUsername()) {
    return c.json({ error: 'Telegram bot is not configured' }, 503)
  }

  // Invalidate any outstanding codes for this user to keep the table tidy.
  await TelegramLinkCodeModel.deleteMany({ authId: authUser.id })

  const code = randomBytes(8).toString('hex') // 16 chars
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS)

  await TelegramLinkCodeModel.create({
    code,
    authId: authUser.id,
    expiresAt,
  })

  return c.json({
    code,
    expiresAt: expiresAt.toISOString(),
    botStartUrl: buildBotStartUrl(code),
  })
})

// ── POST /unlink ── sever the connection
telegramRoutes.post('/unlink', requireAuth, async (c) => {
  const authUser = c.get('user')
  const user = await UserModel.findOne({ authId: authUser.id })
  if (!user) return c.json({ error: 'User not found' }, 404)

  const chatId = user.telegramChatId
  user.telegramChatId = null
  user.telegramUsername = null
  user.telegramLinkedAt = null
  await user.save()

  // Best-effort goodbye message; don't block on failure.
  if (chatId) {
    sendMessage(chatId, 'Disconnected from Axeous Collect. Visit the profile page to reconnect.')
      .catch((err) => console.warn('[telegram/unlink] sendMessage failed', err))
  }

  return c.json({ unlinked: true })
})

// ── POST /webhook ── Telegram → us
telegramRoutes.post('/webhook', async (c) => {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  const received = c.req.header('x-telegram-bot-api-secret-token')
  if (!expected || received !== expected) {
    return c.json({ error: 'invalid secret' }, 401)
  }

  const update = await c.req.json().catch(() => null)
  const message = (update as { message?: { text?: string; chat?: { id?: number | string }; from?: { username?: string } } } | null)?.message
  if (!message?.text || message.chat?.id === undefined) {
    return c.body(null, 200)
  }

  const text = message.text.trim()
  const chatId = String(message.chat.id)
  const username = message.from?.username ?? null

  try {
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/)
      const code = parts[1]
      await handleStart(code, chatId, username)
    } else if (text === '/stop') {
      await handleStop(chatId)
    } else if (text === '/help') {
      await sendMessage(
        chatId,
        '<b>Axeous Collect</b>\nYou\'ll get a message here when a saved watch finds a new listing.\n\n/stop — disconnect\n/help — this message',
        { parseMode: 'HTML' }
      )
    } else {
      await sendMessage(
        chatId,
        'Open the Axeous Collect profile and tap "Connect Telegram" to link this chat. Type /help for commands.'
      )
    }
  } catch (err) {
    console.error('[telegram/webhook] handler error', err)
  }

  return c.body(null, 200)
})

async function handleStart(code: string | undefined, chatId: string, username: string | null) {
  if (!code) {
    await sendMessage(
      chatId,
      'To connect this chat, open the Axeous Collect profile and tap "Connect Telegram".'
    )
    return
  }

  const link = await TelegramLinkCodeModel.findOneAndDelete({ code })
  if (!link) {
    await sendMessage(
      chatId,
      'That link is invalid or expired. Open the Axeous Collect profile and tap "Connect Telegram" to get a fresh one.'
    )
    return
  }
  if (link.expiresAt.getTime() < Date.now()) {
    await sendMessage(
      chatId,
      'That link has expired. Open the Axeous Collect profile and tap "Connect Telegram" to get a fresh one.'
    )
    return
  }

  // Ensure this chatId isn't already linked to a *different* account; if so,
  // detach the previous owner so the new link wins.
  await UserModel.updateMany(
    { telegramChatId: chatId, authId: { $ne: link.authId } },
    { $set: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null } }
  )

  const user = await UserModel.findOneAndUpdate(
    { authId: link.authId },
    {
      $set: {
        telegramChatId: chatId,
        telegramUsername: username,
        telegramLinkedAt: new Date(),
      },
    },
    { new: true }
  )

  if (!user) {
    await sendMessage(chatId, 'Couldn\'t find your Axeous account. Reach out to support.')
    return
  }

  await sendMessage(
    chatId,
    `✅ Connected to Axeous Collect${username ? ` as @${username}` : ''}.\nYou'll get a message here when a saved watch finds a new listing.`,
    { parseMode: 'HTML' }
  )
}

async function handleStop(chatId: string) {
  const user = await UserModel.findOne({ telegramChatId: chatId })
  if (!user) {
    await sendMessage(chatId, 'This chat is not linked to an Axeous account.')
    return
  }

  user.telegramChatId = null
  user.telegramUsername = null
  user.telegramLinkedAt = null
  await user.save()

  await sendMessage(
    chatId,
    'Disconnected from Axeous Collect. Open the profile and tap "Connect Telegram" to reconnect anytime.'
  )
}

export default telegramRoutes
