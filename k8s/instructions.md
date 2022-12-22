** If editing the docker-compose or deployment switch out the image name for testing with yours

<!-- run this once in base directory -->
kubectl create configmap pouchfi-env --from-env-file=./.env.staging
<!-- to edit it run -->
kubectl edit configmap pouchfi-env -o yaml

<!-- cd into k8s -->
cd k8s
<!-- create secret. Run this once-->
kubectl apply -f secret.yaml

<!-- create other pods and services -->
kubectl apply -f staging

<!-- forward server port -->
kubectl port-forward service/pouchfi-backend 3005:3005

<!-- get pods -->
kubectl get pods
<!-- check logs -->
kubectl logs <backend-replace-me>
