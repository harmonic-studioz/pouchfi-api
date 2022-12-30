#!/bin/bash
env="staging"
project="pouchfi"
cluster_name="k8s-pouchfi"
if [[ $env == "production" ]]; then
    cluster_name="k8s-pouchfi-production"
fi

if [ ! $@ ]
then
    echo "Need env staging or production"
    echo "exit 1"
    exit 1
fi
# override the env base on command
env="$@"
echo "deploying to $env..."

# if productin then tag should be version number
if [[ $env == "production" ]]; then
    package_version=$(node -p "require('./package.json').version")
else
    package_version=$(echo $GITHUB_SHA | head -c7)
fi

# set image name and tag
image_tag=$dh_username/pouchfi:$package_version

echo "building docker image"
docker build -t $image_tag .

echo "Pushing image to docker hub"
docker push $image_tag

echo "Updating deployment file"
sed -i 's|thedumebi/pouchfi:latest|'$image_tag'|gi' ./k8s/deployment.yaml
sed -i 's|namespace: staging|namespace: '$env'|gi' ./k8s/deployment.yaml

echo "Save DigitalOcean kubeconfig with short-lived credentials"
doctl kubernetes cluster kubeconfig save --expiry-seconds 600 $cluster_name

echo "Switch to $env namespace"
kubectl config set-context --current --namespace=$env

# check whether redis server is ready or not in staging
if [[ $env == "staging" ]]; then
    pod_name=$(kubectl get pods -l app=pouchfi-redis -o jsonpath="{.items[0].metadata.name}")
    pong=$(kubectl exec -it $pod_name redis -- redis-cli ping)
    if [[ $pong == *"PONG"* ]]; then
        echo "Redis is running"
    else
        echo "Redis isn't runnning"
        exit 1
    fi
fi

echo "Apply backend yaml"
kubectl apply -f ./k8s/deployment.yaml

echo "done"
echo "exit 0"
