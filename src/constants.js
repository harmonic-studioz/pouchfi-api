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
    POUCHFI_ADMIN: 'POUCHFI_ADMIN',
    POUCHFI_CS: 'POUCHFI_CS',
    POUCHFI_ACCOUNTING: 'POUCHFI_ACCOUNTING',
    POUCHFI_STAFF: 'POUCHFI_STAFF',
    SUPPLIER: 'SUPPLIER'
  },

  EMAIL_TYPE: {
    USER_INVITATION: 'user_invitation',
    CRON_JOB_ERROR: 'cron_job_error'
  },

  REGISTERED_FROM: {
    pouchfi: 'pouchfi',
    GOOGLE: 'google',
    FACEBOOK: 'facebook'
  },

  SERVER_TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone,

  SLACK_NOTIFICATION: {
    INFO: 'info',
    ADMIN: 'admin'
  }
}
