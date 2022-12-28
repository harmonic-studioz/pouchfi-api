#!/bin/bash
env="staging"
project="pouchfi"
cluster_name="k8s-pouchfi"
package_version=$(node -p "require('./package.json').version")

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
# docker build -t $image_tag .

# echo "Pushing image to docker hub"
# docker push $image_tag

echo "Updating deployment file"
sed -i 's|thedumebi/pouchfi:latest|'$image_tag'|gi' ./k8s/$env/deployment.yaml

echo "Save DigitalOcean kubeconfig with short-lived credentials"
doctl kubernetes cluster kubeconfig save --expiry-seconds 600 $cluster_name

pod_name=$(kubectl get pods -l app=pouchfi-redis -o jsonpath="{.items[0].metadata.name}")
echo "redis_pod_name: $pod_name"


# check whether redis server is ready or not
# while true; do
#     pong=$(kubectl exec -it $pod_name redis -- redis-cli ping)
#     if [[ "$pong" == *"PONG"* ]]; then
#         echo ok;
#         break
#     fi
# done

if [[ "$env" == "staging"]]; then
    pong=$(kubectl exec -it $pod_name redis -- redis-cli ping)
    if [[ "$pong" == *"PONG"* ]]; then
        echo "Redis is running"
    else
        echo "Redis isn't runnning"
        exit 1
    fi
fi

echo "Apply backend yaml"
# kubectl apply -f ./k8s/$ev/deployment.yaml

echo "done"
echo "exit 0"
