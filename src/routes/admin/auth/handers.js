'use strict'

/**
 * @todo handle this
 * const data = await handler.confirmRegistration(req.body, res.locals.getProps())
 */
exports.confirmRegistration = async function (body, props) {}
/**
 * @todo handle this
 * const data = await handler.forgotPassword(req.body, res.locals.getProps())
 */
exports.forgotPassword = async function (body, props) {}
/**
 * @todo fill this
 * await handler.resetpassword(req.body.password, req.claims)
 */
/**
 * Set new password.
 *
 * @param {string} newPassword - New password
 * @param {Object} claims - Claims
 * @param {string} claims.uid - User ID
 * @param {string} claims.sub - Subject from claims
 * @returns {Promise<void>} Password has been changed
 */
exports.resetpassword = async function (newPassword, claims) {}
