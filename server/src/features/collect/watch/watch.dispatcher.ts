import type { CompactItem } from '../ebay/ebay.types.js'
import { UserModel } from '../../shared/user/user.model.js'
import { sendMessage, TelegramApiError } from '../telegram/telegram.client.js'
import { formatBatchMessage } from '../telegram/telegram.formatter.js'
import { WatchMatchModel, type Watch } from './watch.model.js'
import { emit, hasSubscribers } from './watch.sse-registry.js'

/**
 * Routes new matches from the scheduler.
 *
 * Notify-mode semantics (see design doc §5.4):
 *  - sse_only       — only fires when there's a live subscriber. Telegram never.
 *  - telegram_only  — always fires to Telegram (if linked). SSE never.
 *  - both           — SSE iff live; Telegram iff NOT live. Never both — avoids
 *                     double-notify when the user has the page open.
 *
 * Matches are always persisted regardless of dispatch outcome so the watch
 * detail page can replay history.
 */
export async function dispatchMatches(
  watch: Watch & { _id: unknown },
  items: CompactItem[]
): Promise<void> {
  if (items.length === 0) return

  const watchIdStr = String(watch._id)
  const live = hasSubscribers(watchIdStr)

  const wantsSse = watch.notifyMode !== 'telegram_only' && live
  const wantsTg =
    watch.notifyMode !== 'sse_only' &&
    (!live || watch.notifyMode === 'telegram_only')

  if (wantsSse) {
    for (const item of items) {
      await emit(watchIdStr, 'item', item)
    }
  }

  let tgSent = false
  if (wantsTg) {
    tgSent = await sendTelegramBatch(watch, items)
  }

  await WatchMatchModel.insertMany(
    items.map((item) => ({
      watchId: watch._id,
      authId: watch.authId,
      item,
      matchedAt: new Date(),
      notified: { sse: wantsSse, telegram: tgSent },
    }))
  )
}

async function sendTelegramBatch(
  watch: Watch,
  items: CompactItem[]
): Promise<boolean> {
  const user = await UserModel.findOne({ authId: watch.authId })
    .select('telegramChatId')
    .lean()
  if (!user?.telegramChatId) return false

  const text = formatBatchMessage(watch.name, items)
  try {
    const ok = await sendMessage(user.telegramChatId, text, {
      parseMode: 'HTML',
      disableWebPagePreview: true,
    })
    if (!ok) {
      // 403 — user blocked the bot, chat deactivated, etc. Detach so we
      // stop trying on subsequent polls. The user can re-link from profile.
      console.warn(
        `[dispatcher] Telegram chat ${user.telegramChatId} unreachable — detaching link for ${watch.authId}`
      )
      await UserModel.updateOne(
        { authId: watch.authId },
        {
          $set: {
            telegramChatId: null,
            telegramUsername: null,
            telegramLinkedAt: null,
          },
        }
      )
    }
    return ok
  } catch (err) {
    if (err instanceof TelegramApiError && err.status === 429) {
      // Rate limited — skip this batch; next poll will try again.
      console.warn('[dispatcher] Telegram 429, skipping batch', err.body)
    } else {
      console.error('[dispatcher] Telegram send failed', err)
    }
    return false
  }
}
