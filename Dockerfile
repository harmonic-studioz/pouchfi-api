FROM node:18-alpine

# set the work directory
WORKDIR /app

# add our package.json and install *before* adding our application files
COPY package.json .

RUN npm install --ignore-scripts

# add application files
COPY . .

EXPOSE 3005

ENTRYPOINT npm run start
