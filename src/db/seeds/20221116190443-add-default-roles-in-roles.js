'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('roles', prepare())
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('roles')
  }
}

function prepare () {
  const roles = [{
    name: 'Super Admin',
    code: 'SUPER_ADMIN',
    type: 'NATIVE',
    inactive: false,
    level: 999
  }, {
    name: 'Client Admin',
    code: 'CLIENT_ADMIN',
    type: 'NATIVE',
    inactive: false,
    level: 777
  }, {
    name: 'Client Staff',
    code: 'CLIENT_STAFF',
    type: 'NATIVE',
    inactive: false,
    level: 333
  },
  {
    name: 'Pouchfi Admin',
    code: 'POUCHFI_ADMIN',
    type: 'NATIVE',
    inactive: false,
    level: 777
  },
  {
    name: 'Pouchfi CS',
    code: 'POUCHFI_CS',
    type: 'NATIVE',
    inactive: false,
    level: 555
  },
  {
    name: 'Pouchfi Accounting',
    code: 'POUCHFI_ACCOUNTING',
    type: 'NATIVE',
    inactive: false,
    level: 444
  },
  {
    name: 'Pouchfi Staff',
    code: 'POUCHFI_STAFF',
    type: 'NATIVE',
    inactive: false,
    level: 333
  }]

  for (const role of roles) {
    role.createdAt = new Date()
    role.updatedAt = new Date()
  }

  return roles
}
