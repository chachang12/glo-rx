import { Hono } from 'hono'
import type { AuthEnv } from '../../types.js'
import { ebayRoutes } from './ebay/index.js'
import { watchRoutes } from './watch/index.js'
import { telegramRoutes } from './telegram/index.js'
import { purchaseRoutes } from './purchase/index.js'
import { advancedRoutes } from './advanced/index.js'

export const collectRoutes = new Hono<AuthEnv>()

collectRoutes.get('/health', (c) => c.json({ status: 'ok', product: 'collect' }))

collectRoutes.route('/ebay', ebayRoutes)
collectRoutes.route('/watches', watchRoutes)
collectRoutes.route('/telegram', telegramRoutes)
collectRoutes.route('/purchases', purchaseRoutes)
collectRoutes.route('/advanced', advancedRoutes)
