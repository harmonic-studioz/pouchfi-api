#!/bin/sh

case "$NODE_ENV" in
  production|staging)
    exit 0
    ;;
  *)
    npx husky install
esac
