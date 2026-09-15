// Vercel serverless entrypoint. Vercel's Node runtime calls the default
// export as a plain (req, res) handler — an Express app already satisfies
// that signature, so no adapter is needed, and every route defined in
// server/index.js (and its route modules) works unchanged.
import app from '../server/index.js'

export default app
