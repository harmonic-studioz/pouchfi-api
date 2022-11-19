'use strict'

module.exports = {
  PAGINATE_MODES: {
    LIST: 0b01,
    COUNT: 0b10
  },

  LOCALE: {
    EN: 'en-us',
    JA: 'ja-jp'
  },

  ROLE: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    CLIENT_ADMIN: 'CLIENT_ADMIN',
    CLIENT_STAFF: 'CLIENT_STAFF',
    BREAV_ADMIN: 'BREAV_ADMIN',
    BREAV_CS: 'BREAV_CS',
    BREAV_ACCOUNTING: 'BREAV_ACCOUNTING',
    BREAV_STAFF: 'BREAV_STAFF',
    SUPPLIER: 'SUPPLIER'
  },

  EMAIL_TYPE: {
    USER_INVITATION: 'user_invitation',
    CRON_JOB_ERROR: 'cron_job_error'
  },

  REGISTERED_FROM: {
    BREAV: 'breav',
    GOOGLE: 'google',
    FACEBOOK: 'facebook'
  },

  SERVER_TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone,

  SLACK_NOTIFICATION: {
    INFO: 'info',
    ADMIN: 'admin'
  }
}
