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
  const Config = sequelize.define('configs', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    // config name
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    // config value
    value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // config history
    history: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    }
  }, {
    tableName: 'configs',
    paranoid: true
  })

  Config.prototype.addHistory = async function (eventType, eventName, payload, transaction = null) {
    const history = this.getDataValue('history') || []
    const eventLog = createEventLog(eventType, eventName, payload, this.getDataValue('value'))
    history.push(eventLog)

    this.changed('history', true)
    await this.save({ hooks: false, transaction })
  }

  return Config
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
