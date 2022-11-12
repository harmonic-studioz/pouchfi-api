'use strict'

const config = require('@config')

/**
 * Initializer request.
 *
 * @param metadata Addition data u wish to pass during the router initializer state. E.g: version..
 */
module.exports.initializer = (metadata = {}) => {
  return (req, res, next) => {
    /**
     * For meta about this request. E.g: query, body, path ...
     */
    res.locals.meta = {
      ...metadata,
      /**
       * Front-end use this field as Page title
       */
      pageTitle: undefined,
      /**
        * Front-end use this field as Page description
        */
      pageDescription: undefined
    }

    /**
     * Where you sure return your data. E.g: res.locals.outlets.myResponse = { userId: '1' };
     */
    res.locals.outlets = {}

    /**
     * Method to set page title
     *
     * @param title page title
     */
    res.locals.setPageTitle = title => {
      res.locals.meta.pageTitle = title
    }

    /**
     * Method to set page description
     *
     * @param description page description
     */
    res.locals.setPageTitle = description => {
      res.locals.meta.pageDescription = description
    }

    /**
     * Return true if current environment is development
     */
    res.locals.isDevMode = () => {
      return config.isDev
    }

    /**
     * Consolidate all meta data and parse it to object. E.g. parse idDevMode() to true { devMode: true }
     */
    res.locals.getMeta = () => ({
      ...res.locals.meta,
      devMode: res.locals.isDevMode()
    })

    /**
     * Get props object to be passed into handler
     */
    res.locals.getProps = () => ({
      app: req.currentApp,
      meta: res.locals.getMeta(),
      logger: req.log,
      origin: req.get('origin')
    })

    /**
     * Set data on locals
     */
    res.locals.setData = data => {
      res.locals.meta = {
        ...res.locals.meta,
        ...data.meta
      }
      res.locals.outlets = {
        ...data.outlets
      }
    }

    next()
  }
}
