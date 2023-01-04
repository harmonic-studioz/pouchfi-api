'use strict'
const { ROLE } = require('../../constants')

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('roles', prepare())
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('roles')
  }
}

function prepare () {
  const roles = [
    {
      name: 'Super Admin',
      code: ROLE.SUPER_ADMIN,
      type: 'NATIVE',
      inactive: false,
      level: 999
    },
    {
      name: 'App Admin',
      code: ROLE.APP_ADMIN,
      type: 'NATIVE',
      inactive: false,
      level: 777
    },
    {
      name: 'Website Admin',
      code: ROLE.WEBSITE_ADMIN,
      type: 'NATIVE',
      inactive: false,
      level: 333
    },
    {
      name: 'Pouchfi Admin',
      code: ROLE.POUCHFI_ADMIN,
      type: 'NATIVE',
      inactive: false,
      level: 888
    },
    {
      name: 'Pouchfi CS',
      code: ROLE.POUCHFI_CS,
      type: 'NATIVE',
      inactive: false,
      level: 555
    },
    {
      name: 'Pouchfi Accounting',
      code: ROLE.POUCHFI_ACCOUNTING,
      type: 'NATIVE',
      inactive: false,
      level: 444
    }]

  for (const role of roles) {
    role.createdAt = new Date()
    role.updatedAt = new Date()
  }

  return roles
}
