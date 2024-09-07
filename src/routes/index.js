const express = require('express');
const router = express.Router();

const songsRoutesRouter = require('./SongsRoutes');
const isVerifiedRouter = require('./IsVerified')
const whitepayInvoiceRouter = require('./WhitepayInvoiceRoutes')
const usersRouter = require('./users/index')
const blogRoutes = require('./BlogRoutes')

router.use('/songs', songsRoutesRouter);
router.use('/is-verified', isVerifiedRouter)
router.use('/whitepay-invoice', whitepayInvoiceRouter)
router.use('/users', usersRouter)
router.use('/blog', blogRoutes)

module.exports = router;