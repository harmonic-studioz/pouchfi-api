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

  LANG: {
    EN: 'en',
    JA: 'ja',
    ZH: 'zh',
    ZT: 'zt'
  },
  LANG_FE: {
    EN: 'en',
    JA: 'ja',
    ZH: 'zh_hans',
    ZT: 'zh_hant'
  },

  ROLE: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    APP_ADMIN: 'APP_ADMIN',
    WEBSITE_ADMIN: 'WEBSITE_ADMIN',
    POUCHFI_ADMIN: 'POUCHFI_ADMIN',
    POUCHFI_CS: 'POUCHFI_CS',
    POUCHFI_ACCOUNTING: 'POUCHFI_ACCOUNTING'
  },

  EMAIL_TYPE: {
    USER_INVITATION: 'user_invitation',
    CRON_JOB_ERROR: 'cron_job_error',
    PARTNER_WITH_US: 'partner_with_us',
    WAITLIST_NOTIFICATION: 'waitlist_notification',
    ADMIN_CUSTOM_EMAIL: 'admin_custom_email',
    TEMPLATE: 'template',
    UNSUBSCRIBE: 'unsubscribe',
    CONTACT_US: 'contact_us',
    FORGOT_PASSWORD: 'forgot_password',
    RESET_PASSWORD: 'reset_password',
    EMAIL_ERROR_TO_ADMIN: 'email_error_to_admin',
    PUBLISHED_BLOG_TO_STAFF: 'published_blog_to_staff',
    AVAILABLE_BLOG_TO_STAFF_FIRST: 'available_blog_to_staff_first',
    COMPLETED_BLOG_TO_STAFF: 'completed_blog_to_staff',
    UNAVAILABLE_BLOG_TO_STAFF: 'unavailable_blog_to_staff'
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
  },

  USER_HISTORY: {
    EMAIL: 'email',
    PASSWORD: 'password',
    PASSWORD_RESET: 'passwordReset',
    UPDATED: 'updated'
  },

  FOREX: {
    RATES: 'forex.rates',
    RATES_BACKUP: 'forex.rates.backup',
    TOKEN_LIST: 'forex.tokenList',
    TOKEN_LIST_BACKUP: 'forex.tokenList.backup'
  },

  TOKEN_TYPE: {
    NETWORK: 'network',
    NORMAL: 'normal'
  },

  ACCOUNT_TYPES: {
    FIAT_NORMAL: 'FIAT_NORMAL',
    FIAT_KYC: 'FIAT_KYC',
    CRYPTO_CUSTODIAL: 'CRYPTO_CUSTODIAL',
    CRYPTO_IMPORTED: 'CRYPTO_IMPORTED'
  },

  IMAGE_TYPE: {
    HERO: 'hero',
    THUMBNAIL: 'thumbnail',
    GALLERY: 'gallery'
  }
}
