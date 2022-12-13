FROM node:18-alpine

# set the work directory
RUN mkdir -p /app
WORKDIR /app

# add our package.json and install *before* adding our application files
COPY package.json .

COPY .env .env

RUN npm i

# add application files
COPY . .

EXPOSE 3005

ENTRYPOINT npm run start
