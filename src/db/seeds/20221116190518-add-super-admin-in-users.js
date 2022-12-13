'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('staffs', [{
      id: 1,
      uid: 'url5Xy8pPbKj4VQDW',
      username: 'Super Admin',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'chiwuzohdumebi@gmail.com', // change this later
      inactive: false,
      registeredFrom: 'email',
      passwordHash: '$2b$13$WxWRgKyUCHSfxxLEjPe7uOaqylUyUYaoRZHjRuTk.YXmGUVSCgPJS', // PouchfiSuperPassword123
      roleCode: 'SUPER_ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    }])
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('staffs')
  }
}
