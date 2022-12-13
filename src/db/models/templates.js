'use strict'

/**
 * @typedef {import ("sequelize").Sequelize} Sequelize
 * @typedef {import ("sequelize").DataTypes} DataTypes
 *
 */

/**
 *
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns
 */
module.exports = (sequelize, DataTypes) => {
  const Templates = sequelize.define('templates', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    // template name
    name: DataTypes.STRING,
    // the template value
    fileTemplate: {
      type: DataTypes.BLOB,
      get () {
        return this.getDataValue('fileTemplate').toString('utf8')
      }
    },
    // language of the template
    language: DataTypes.STRING,
    // type of template
    type: {
      type: DataTypes.STRING,
      defaultValue: 'email'
    }
  }, {
    tableName: 'templates',
    paranoid: true
  })

  Templates.prototype.addHistory = async function (eventType, eventName, payload, transaction = null) {
    const history = this.getDataValue('history') || []
    const eventLog = createEventLog(eventType, eventName, payload, this.getDataValue('value'))
    history.push(eventLog)

    this.changed('history', true)
    await this.save({ hooks: false, transaction })
  }

  return Templates
}

/**
 * Create an event log
 * @param {'event'|'updated'|'deleted'} type - Event type
 * @param {string} eventName - Event name
 * @param {Object} data - Payload of the event
 * @param {string} configValue config value
 */
function createEventLog (type, eventName, data, configValue) {
  return {
    eventName,
    data,
    type,
    configValue,
    timestamp: new Date()
  }
}
