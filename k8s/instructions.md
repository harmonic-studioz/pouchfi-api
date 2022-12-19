** If editing the docker-compose or deployment switch out the image name for testing with yours

<!-- run this in base directory -->
kubectl create configmap pouchfi-env --from-env-file=./.env.staging
<!-- cd into k8s -->
cd k8s

<!-- create pv and secret -->
kubectl apply -f local/secret.yaml
kubectl apply -f local/pv.yaml


<!-- create postgres service and pod -->
kubectl apply -f postgres/pods.yaml
<!-- postgres service is currently LoadBalancer so you can actually conect to it from table plus or something for testing. -->
kubectl port-forward service/postgres 5432:5432
<!-- or you can execute the postgres (password is ABcd12..) -->
kubectl exec -it postgres -- psql -U postgres
enter "\l" (without quotes) in the psql shell to see all databases. You should see "pouchfi"


<!-- create redis service and pod -->
kubectl apply -f redis/configmap.yaml
kubectl apply -f redis/pods.yaml
<!-- execute redis to test -->
kubectl exec -it redis -- redis-cli
(set a key e.g. (set foo bar), exit, enter back you should still see the key or kill pod and come back)


<!-- finally create the backend -->
kubectl apply -f local/deployment.yaml
<!-- get pods -->
kubectl get pods
<!-- check logs -->
kubectl logs <backend-replace-me>
(/app/package.json not found)
