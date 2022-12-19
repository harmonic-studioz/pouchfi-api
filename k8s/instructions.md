** If editing the docker-compose or deployment switch out the image name for testing with yours

<!-- run this once in base directory -->
cd
<!-- to edit it run -->
kubectl edit configmap pouchfi-env -o yaml

<!-- cd into k8s -->
cd k8s
<!-- create secret. Run this once-->
kubectl apply -f secret.yaml

<!-- create other pods and services -->
kubectl apply -f staging

<!-- get pods -->
kubectl get pods
<!-- check logs -->
kubectl logs <backend-replace-me>
(/app/package.json not found)
