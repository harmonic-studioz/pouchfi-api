#!/bin/bash
env="staging"
project="pouchfi"
cluster_name="k8s-pouchfi"
# revert this to version number in package.json
# package_version=$(node -p "require('./package.json').version")
package_version="latest"
echo "github-version: $GITHUB_SHA"
echo $GITHUB_SHA | head -c7
echo "removing later"

if [ ! $@ ]
then
    echo "Need env staging or production"
    echo "exit 1"
    exit 1
fi
# override the env base on command
env="$@"
echo "deploying to $env..."

# set image name and tag
image_tag=$dh_username/pouchfi:$package_version

# echo "building docker image"
docker build -t $image_tag .

# echo "Pushing image to docker hub"
docker push $image_tag

echo "Updating deployment file"
sed -i 's|thedumebi/pouchfi:latest|'$image_tag'|gi' ./k8s/$env/deployment.yaml

echo "Save DigitalOcean kubeconfig with short-lived credentials"
doctl kubernetes cluster kubeconfig save --expiry-seconds 600 $cluster_name

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
kubectl apply -f ./k8s/$env/deployment.yaml

echo "done"
echo "exit 0"
