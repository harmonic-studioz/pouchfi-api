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

kubectl create -f k8s/redis.yaml

pod_name=$(kubectl get po -l app=redis | grep pouchfi-backend | awk '{print $1}')

# check whether redis server is ready or not
while true; do
    pong=$(kubectl exec -it $pod_name redis -- redis-cli ping)
    if [[ "$pong" == *"PONG"* ]]; then
        echo ok;
        break
    fi
done

if [[ $env === 'staging']]; then
    kubectl create -f k8s/staging/deployment.yaml
elif [[ $env == "production" ]]; then
    kubectl create -f k8s/staging/deployment.yaml
else
    kubectl create -f k8s/staging/deployment.yaml
fi

echo "done"
echo "exit 0"
