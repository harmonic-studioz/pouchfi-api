'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  /**
   * @typedef {import ("sequelize").Sequelize} Sequelize
   * @typedef {import ("sequelize").QueryInterface} QueryInterface
   */

  /**
   * @param {QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'homepageContent',
      [
        {
          id: 1,
          content: `
        {
          "desktop": {
            "main": [
              {
                "url": "https://via.placeholder.com/1190x1080.png",
                "width": 1920,
                "height": 1080,
                "size": 488700,
                "altText": "slider 1"
              },
              {
                "url": "https://via.placeholder.com/1190x1080.png",
                "width": 1920,
                "height": 1080,
                "size": 488700,
                "altText": "slider 2"
              },
              {
                "url": "https://via.placeholder.com/1190x1080.png",
                "width": 1920,
                "height": 1080,
                "size": 488700,
                "altText": "slider 3"
              },
            ],
            "marketing": {
              "imageUrl": "https://via.placeholder.com/1190x125.png",
              "width": 1190,
              "height": 125,
              "size": 1140,
              "url": "https://via.placeholder.com/1190x125.png"
            }
          },
          "tablet": {
            "main": [
              {
                "url": "https://via.placeholder.com/1190x1080.png",
                "width": 1920,
                "height": 1080,
                "size": 488700,
                "altText": "slider 1"
              },
              {
                "url": "https://via.placeholder.com/1190x1080.png",
                "width": 1920,
                "height": 1080,
                "size": 488700,
                "altText": "slider 2"
              },
              {
                "url": "https://via.placeholder.com/1190x1080.png",
                "width": 1920,
                "height": 1080,
                "size": 488700,
                "altText": "slider 3"
              },
            ],
            "marketing": {
              "imageUrl": "https://via.placeholder.com/1190x125.png",
              "width": 1190,
              "height": 125,
              "size": 1140,
              "url": "https://via.placeholder.com/1190x125.png"
            }
          }
          "mobile": {
            "main": [
              {
                "url": "https://via.placeholder.com/1190x1080.png",
                "width": 1920,
                "height": 1080,
                "size": 488700,
                "altText": "slider 1"
              },
              {
                "url": "https://via.placeholder.com/1190x1080.png",
                "width": 1920,
                "height": 1080,
                "size": 488700,
                "altText": "slider 2"
              },
              {
                "url": "https://via.placeholder.com/1190x1080.png",
                "width": 1920,
                "height": 1080,
                "size": 488700,
                "altText": "slider 3"
              },
            ],
            "marketing": {
              "imageUrl": "https://via.placeholder.com/1190x125.png",
              "width": 1190,
              "height": 125,
              "size": 1140,
              "url": "https://via.placeholder.com/1190x125.png"
            }
          }
        }
        `,
          createdAt: Sequelize.fn('NOW'),
          updatedAt: Sequelize.fn('NOW')
        }
      ]
    )
  },

  /**
   * @typedef {import ("sequelize").Sequelize} Sequelize
   * @typedef {import ("sequelize").QueryInterface} QueryInterface
   */

  /**
   * @param {QueryInterface} queryInterface
   */
  async down (queryInterface) {
    await queryInterface.bulkDelete('homepageContents')
  }
}
