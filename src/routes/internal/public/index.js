'use strict'

const path = require('path')
const { Router } = require('express')

/**
 * Mount endpoints for external public scripts
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const publicRouter = Router({
    strict: true,
    caseSensitive: true
  })

  publicRouter.get('/:uid/*', (req, res) => {
    const uid = req.params.uid
    const filePath = req.params[0]
    res.sendFile(filePath, { root: path.join(__dirname, `/${uid}/`) })
  })

  router.use('/public', publicRouter)
}
