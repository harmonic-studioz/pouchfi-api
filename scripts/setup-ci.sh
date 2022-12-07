#!/bin/bash

# set default file input/output name
FILE_INPUT=scripts/env.list
FILE_OUTPUT=.env

# set file input/output name, when user add options
while getopts "i:o:" opt; do
    case $opt in
        i)
            FILE_INPUT=$OPTARG ;;
        o)
            FILE_OUTPUT=$OPTARG ;;
        *)  echo "usage: $0 [-i] [-o]" >&2
            exit 1 ;;
    esac
done

# read all environment variables that have to be copied from input file
declare env_array=()

while IFS= read -r line || [[ "$line" ]]; do
    env_array+=("$line")
done < "${FILE_INPUT}"

# print all environment variables to output file
if [ "${#env_array[@]}" -eq 0 ]; then
    echo "There is no environment variables";
else
    # generate fresh output file
    echo "#env variables" > ${FILE_OUTPUT}
    for i in "${env_array[@]}";
    do
        echo "${i}=${!i}" >> "${FILE_OUTPUT}";
    done
fi;

# create keys
base64 -d <<< $POUCHFI_PRIVATE_KEY > private.key
base64 -d <<< $POUCHFI_PUBLIC_KEY > public.key
