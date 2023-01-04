'use strict'

const pgtools = require('pgtools')
const Sequelize = require('sequelize')
const { exec } = require('child_process')

const models = require('@models')
const { postgres } = require('@config')

const dbName = postgres.database
const sequelize = new Sequelize(postgres.url, postgres.options)

init().then(() => process.exit(0))

async function init () {
  try {
    await createSchemas([
      'networks',
      'users',
      'blogs'
    ])
    await models.init()
    // can these guys run in just the master pod?
    /**
     * @todo update this to run on just master pod
     */
    await execute('npx sequelize db:migrate')
    await execute('npx sequelize db:seed:all')
    await execute('npm run seed:template')

    if (dbName.search('_test') > -1) {
      await execute(
        'npx sequelize db:seed --seed 20221116190443-add-default-roles-in-roles'
      )
    }
  } catch (err) {
    if (err.message.search(`database "${dbName}" does not exist`) > -1) {
      await createDB(dbName)

      return
    }

    throw err
  } finally {
    sequelize.close()
  }
}

async function checkIfSchemaExists (schema) {
  const row = await sequelize.query(`
    SELECT
      COUNT(*)::integer AS count
    FROM
      information_schema.schemata
    WHERE
      schema_name = :schema
  `, {
    plain: true,
    replacements: {
      schema
    }
  })

  return row.count !== 0
}

async function createSchema (schema) {
  await sequelize.query('CREATE SCHEMA ' + JSON.stringify(schema))
}

async function createSchemas (schemas) {
  for (const schema of schemas) {
    const exists = await checkIfSchemaExists(schema)

    if (exists) continue

    await createSchema(schema)
  }
}

async function createDB (database) {
  try {
    await pgtools.createdb(postgres.url, database)

    await init()
  } catch (error) {
    console.error(error)

    process.exit(1)
  }
}

function execute (command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, _stdout) => {
      if (error) {
        console.error(error)

        return reject(new Error(error.message))
      }

      console.log(_stdout)

      resolve()
    })
  })
}
