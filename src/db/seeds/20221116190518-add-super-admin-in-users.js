'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('users', [{
      uid: 'url5Xy8pPbKj4VQDW',
      displayName: 'Super Admin',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'chiwuzohdumebi@gmail.com', // change this later
      inactive: false,
      registeredFrom: 'email',
      passwordHash: '$2b$13$QbURZ79D8fkEaThR1H8rcue6kEoyLHiXbdihO4v8o5vcT2ndUQSIK', // breavSuperPassword123
      roleCode: 'SUPER_ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    }])
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users')
  }
}
