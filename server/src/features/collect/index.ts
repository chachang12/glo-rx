import { Hono } from 'hono'
import type { AuthEnv } from '../../types.js'
import { ebayRoutes } from './ebay/index.js'
import { watchRoutes } from './watch/index.js'
import { telegramRoutes } from './telegram/index.js'

export const collectRoutes = new Hono<AuthEnv>()

collectRoutes.get('/health', (c) => c.json({ status: 'ok', product: 'collect' }))

collectRoutes.route('/ebay', ebayRoutes)
collectRoutes.route('/watches', watchRoutes)
collectRoutes.route('/telegram', telegramRoutes)
