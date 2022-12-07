#!/bin/bash
env="staging"
project="pouchfi"
if [ ! $@ ]
then
    echo "Need env staging or production"
    echo "exit 1"
    return 1
fi
# override the env base on command
env="$@"
echo "deploying to $env..."
echo "set project to $project"
echo "done"
echo "exit 0"
