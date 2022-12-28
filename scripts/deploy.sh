#!/bin/bash
env="staging"
project="pouchfi"
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

echo "building docker image"
docker build -t $image_tag .

echo "Pushing image to docker hub"
docker push $image_tag

echo "Updating deployment file"
sed -i 's|thedumebi/pouchfi:latest|'$image_tag'|gi' ./k8s/staging/deployment.yaml

cat ./k8s/staging/deployment.yaml

# # run this once
# kubectl create configmap pouchfi-env --from-env-file=./.env.staging
# kubectl apply -f k8s/secret.yaml
# kubectl create -f k8s/staging/pv.yaml

# kubectl create -f k8s/staging/redis.yaml -f k8s/staging/postgres.yaml

# pod_name=$(kubectl get po -l app=pouchfi-redis | grep pouchfi-backend | awk '{print $1}')

# # check whether redis server is ready or not
# while true; do
#     pong=$(kubectl exec -it $pod_name redis -- redis-cli ping)
#     if [[ "$pong" == *"PONG"* ]]; then
#         echo ok;
#         break
#     fi
# done

# if [[ $env === 'production']]; then
#     kubectl create -f k8s/production/deployment.yaml
# else
#     kubectl create -f k8s/staging/deployment.yaml
# fi

# echo "done"
# echo "exit 0"
