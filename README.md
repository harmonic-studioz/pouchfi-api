# Pouchfi - Backend

## Stacks

- **Framework**: Express
- **Authentication**: JWT with public key file
- **Database**: PostgreSQL (Sequelize)
- **Code**: ESLint
- **Debuging**: Debug, VS Code configurations
- **Logging**: Winston
- **Testing**: Jest, SuperTest
- **Continuous Integration**: GitHub Actions + Docker Compose
- **Other**: PM2, DotEnv
- API versioning
- Request Validation

## Getting Started

```shell
git clone https://github.com/harmonic-studioz/pouchfi-api.git
cd pouchfi-api

# Create environment variables from example
mv .env.example .env.development.local

# Generate JWT keys
ssh-keygen -t rsa -b 2048 -q -N '' -m PEM -f private.key \
    && rm private.key.pub \
    && openssl rsa -in private.key -pubout -outform PEM -out public.key

# Install all dependencies
npm install

# Once dependencies has been installed
# Run Database creation and migrations
npm run predev

# Add some data
npm run seed

# Update email template
npm run seed:template

# Run on port 3004
npm run dev
```

## Development Setup

### Git commits

As this repo is using `husky` + `lint-staged`, on every commit the `pre-commit` hook will trigger and process all the staged files through ESLint. The purpose of this, is to maintain code consistency across developers that will be working with this repo. If you want bypass this, one can add the `--no-verify` flag to the `git commit` command, but **please** avoid doing this (unless necessary) as this will defeat the purpose on why we're using these tools.

### Tests
#### Run Unit Tests

```shell
npm run test:unit
```

#### Run Integration Tests
In order to run the integration tests, we need to setup the test database first. Suffix the database name with `_test` to make sure that we are using a test database.

```shell
PG_DATABASE=pouchfi_dev_test npm run db:init

npm run test:integration
```

#### Run All Tests
```shell
npm run test
```

#### Run All Tests with Coverage Report
```shell
npm run test:coverage
```
### VS Code

#### EditorConfig

Please install [edtiorconfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig), as this will automatically adjust the necessary formatting (such as spaces, number of spaces, etc...) for you. Please check the [`.editorconfig`](./.editorconfig) configuration within the root of the project

#### ESLint

For VS Code users the [eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension can be installed so that the text editor can have a visual aid if there are any linting errors within the code you're working with. If you want to fix linting error on save. This settings can be added:

```json
"editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
}
```

## Start with Docker

```shell
# Generate JWT keys
ssh-keygen -t rsa -b 2048 -q -N '' -m PEM -f private.key \
    && rm private.key.pub \
    && openssl rsa -in private.key -pubout -outform PEM -out public.key

# Build image
docker build -t app/pouchfi-backend:latest .

# Run on port 3004
docker run -p 3004:3004 -d --name pouchfi-backend app/pouchfi-backend:latest

# Run on host network
docker run -d --name pouchfi-backend --network=host app/pouchfi-backend:latest
```

## Structure

```
/
├─src
│ ├── classes                 # Classes
│ │   ├── cache.js            # cache class
│ │   └── ...                 # Other classes
│ ├── config                  # App configuration files
│ │   ├── sequelize.js        # sequelize config
│ │   └── ...                 # Other configurations
│ ├── db                      # Data access stuff
│ │   ├── migrations          # Migrations
│ │   ├── models              # Models
│ │   └── seeds               # Seeds
│ ├── helpers                 # Helpers (formats, validation, etc)
│ ├── middlewares             # Middlewares (authorization, errorHandler, notFound etc)
│ ├── routes
│ │   ├── admin               # Defines routes and handlers for admin
│ │   ├── client              # Defines routes and handlers for client
│ │   └── internal            # Defines routes and handlers for internal processes (e.g. webhooks, cron job, cache handling)
│ ├── services                # External services implementation
│ │   ├── serviceOne
│ │   └── serviceTwo
├── tests                     # Testing
├── .env                      # Environment variables
├── .sequelizerc              # Sequelize CLI config
├── Dockerfile                # Dockerfile
├── package.json
├── private.key               # Sign tokens
└── README.md
└── ...
```

## Creating Migrations

**Important!!** Due to the use of `sync` across models, it will automatically create the tables on initial
set-up. Thus, all columns defined within the model are also created automatically.<br>
Which deems the use of migrations for adding columns, creating types, and etc. unnecessary and would cause an error when running the migration right away.<br><br>
In order to avoid this issue, it is strongly recommended to write the migration scripts in raw SQL queries.<br>
The example snippet shown below will check if the column exists before trying to add it. This is not possible when using sequelize's query interface.

```js
// Instead of
await queryInterface.addColumn('orders', 'addOns', {
  type: DataTypes.JSONB,
  allowNull: true,
  defaultValue: {}
})

// write like this
await queryInterface.sequelize.query(`
  ALTER TABLE IF EXISTS "public"."orders"
    ADD COLUMN IF NOT EXISTS "addOns" JSONB
    DEFAULT '{}';
`)
```

## Environment Variables

| Name | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development ` | Current Node environment |
| `APP_HOST` | `http://localhost:3004` | The host of the **Backend Service** |
| `ADMIN_HOST` | `http://localhost:8080` | The host of the **Admin Frontend** |
| `ADMIN_INVITATION_TOKEN_EXPIRATION` | `7 days` | The expiration for the invitation token |
| `COOKIE_NAME` | `session` | The name for the session cookie |
| `COOKIE_SECRET` | - | A value that will be used for signing cookies |
| `COOKIE_MAX_AGE` | `15 minutes` | The `Max-Age` for the cookie |
| `PG_HOST` | `localhost` | Host for Postgres instance |
| `PG_PORT` | `5432` | Port of the Postgres instance |
| `PG_USERNAME` | - | Username for Postgres instance |
| `PG_PASSWORD` | - | Password for Postgres instance |
| `PG_DATABASE` | - | Database name for Postgres instance |
| `AUTHORIZATION_JWT_SECRET` | - | JWT secret used for verifying the token coming from the **Frontend** |


# Changelogs Templates:
## [`version_number`]
### Bug Fixing
Defined the list of bug fixes:
- [`ticket_number_if_exists`] - `title`
`description`
- etc...
### Major Updates
Defined the major updates:
- [`ticket_number_if_exists`] - `title`
`description`
- etc...
### Added dependencies
Put added dependencies here:
- `"express-rate-limit": "^3.3.2"`
- etc...
### Updated dependencies
Put updated dependencies here:
- `"express-rate-limit": "^3.3.2"` -> `"^3.5.0"`
- etc...
### Deleted dependencies
Put deleted dependencies here:
- `"express-rate-limit"`
- etc...
