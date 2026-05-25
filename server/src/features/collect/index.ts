import { Hono } from 'hono'
import type { AuthEnv } from '../../types.js'
import { ebayRoutes } from './ebay/index.js'

export const collectRoutes = new Hono<AuthEnv>()

collectRoutes.get('/health', (c) => c.json({ status: 'ok', product: 'collect' }))

collectRoutes.route('/ebay', ebayRoutes)
