FROM node:18-alpine

# set the work directory
RUN mkdir -p /var/www/app/current
WORKDIR /var/www/app/current

# add our package.json and install *before* adding our application files
ADD package.json ./

COPY .env .env

RUN npm i

# add application files
ADD . /var/www/app/current/

EXPOSE 3004

ENTRYPOINT npm run start
