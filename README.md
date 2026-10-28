# Kubernetes Native Observability

A workspace for exploring observability in Kubernetes using tools and patterns that integrate with the Kubernetes ecosystem.

## Project status

This repository is at an early stage. More details about its setup, components, and examples will be added as they are introduced.

## Getting started

There are no installation or deployment instructions yet. Check back as the project takes shape.

## Topics

This project is intended to cover observability practices for Kubernetes, such as collecting and exploring telemetry and operating the supporting components in a cluster.

```Shell
minikube start \
  --driver=docker \
  --nodes=3 \
  --cpus=6 \
  --memory=12g \
  --kubernetes-version=v1.35.1
```

```Shell
helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/
helm repo update
kubectl create namespace headlamp
helm install headlamp headlamp/headlamp \
  --namespace headlamp

kubectl port-forward -n headlamp svc/headlamp 8080:80
#For login token -
kubectl create token headlamp --namespace headlamp
http://localhost:8080
```

```Shell
# Application backing service - Redis , Opensearch , Postgres

kubectl create namespace app-data
kubectl apply -f backing-services/redis.yaml
kubectl apply -f backing-services/postgresql.yaml
kubectl apply -f backing-services/opensearch.yaml

docker pull apache/kafka:4.0.0
minikube image load apache/kafka:4.0.0
kubectl apply -f backing-services/kafka.yaml

# Application config
Redis       redis:6379
PostgreSQL  postgres:5432
OpenSearch  opensearch:9200
Kafka       kafka:9092

# topic verification
kubectl get job kafka-create-topics -n app-data
kubectl exec -n app-data deploy/kafka -- /opt/kafka/bin/kafka-topics.sh \
  --list \
  --bootstrap-server kafka:9092

# In windows git bash
MSYS_NO_PATHCONV=1 kubectl exec -n app-data deploy/kafka -- /opt/kafka/bin/kafka-topics.sh \
  --list \
  --bootstrap-server kafka:9092


```

```Shell
Application Instrumentation ....
kubectl apply -f application-services/spring-boot-crud-deployment.yaml
kubectl port-forward -n spring-app svc/spring-boot-crud 8081:8081
kubectl apply -f application-services/golang-crud-deployment.yaml
kubectl -n go-app port-forward svc/go-rest-api 8084:8084
kubectl apply -f application-services/nodejs-crud-deployment.yaml
kubectl -n node-app port-forward svc/node-express-api 9090:9090

npm install k6
k6 run spring-load-test.js

#Local commands
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-javaagent:./opentelemetry-javaagent.jar"
mvn clean package -DskipTests
docker build -t aniket1992/spring-boot-crud:1.9 .
docker push aniket1992/spring-boot-crud:1.9

docker build -t aniket1992/node-express-api:1.2 .
docker push aniket1992/node-express-api:1.2

```

```
Reference Repos 
https://github.com/codesForCoder/spring-boot-crud-operations-k8s-observe 
https://github.com/codesForCoder/go-rest-api-with-postgresql-k8s-openobserve
https://github.com/codesForCoder/node-express-sequelize-postgresql-k8s-openobserve
https://github.com/codesForCoder/react-api-integration-k8s-openobserve
```
## Gateway aoi setup WIP 
```
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.4.0/standard-install.yaml
kubectl get gatewayclass

```
### Otel Installation 
```
kubectl create namespace observability
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update
helm search repo open-telemetry/opentelemetry-collector
helm install otel-gateway open-telemetry/opentelemetry-collector -n observability -f otel-config/gateway-values.yaml --wait --timeout 5m
helm install otel-agent open-telemetry/opentelemetry-collector -n observability -f otel-config/agent-values.yaml --wait --timeout 5m
```
### Loki installation 
```
helm repo add grafana-community https://grafana-community.github.io/helm-charts
helm repo update
helm install loki grafana-community/loki -f observe-backend/loki-values.yaml -n observability

```
### Tempo Installation
```
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install tempo grafana/tempo -f observe-backend/tempo-values.yaml -n observability
```
### Prometheus Installation 
```
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/prometheus -f observe-backend/prometheus-values.yaml -n observability
kubectl port-forward --namespace observability svc/prometheus-server 9090:80

```
### Grafana Installation 
```
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install grafana grafana/grafana -n observability
user - admin 
pass - run below 
kubectl get secret --namespace observability grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
access portal 
kubectl port-forward --namespace observability svc/grafana 3000:80
http://localhost:3000
```
### extra commands 
```
helm upgrade otel-gateway open-telemetry/opentelemetry-collector   -n observability   -f otel-config/gateway-values.yaml   --wait --timeout 5m
helm upgrade otel-agent open-telemetry/opentelemetry-collector -n observability -f otel-config/agent-values.yaml --wait --timeout 5m

curl -s "http://127.0.0.1:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={service_name="node-express-api"}' \
  --data-urlencode 'limit=5'

curl -s "http://127.0.0.1:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={service_name="go-rest-api"}' \
  --data-urlencode 'limit=5'

curl -s "http://127.0.0.1:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={service_name="spring-boot-crud"}' \
  --data-urlencode 'limit=5'

-- when debug 
kubectl logs deployment/otel-gateway-opentelemetry-collector -n observability -f | grep 'Trace ID'
kubectl logs -n observability -l app.kubernetes.io/name=opentelemetry-collector --tail=100 -f | grep "Body"



```