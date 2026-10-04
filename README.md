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
helm repo add openobserve https://charts.openobserve.ai
helm repo update
kubectl create namespace openobserve

helm install openobserve openobserve/openobserve-standalone \
  --namespace openobserve \
  -f values.yaml

kubectl port-forward svc/openobserve-openobserve-standalone 5080:5080 -n openobserve
#Prerequist
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.1/cert-manager.yaml
kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml
#Collector Installation
helm install o2c openobserve/openobserve-collector \
  --namespace openobserve-collector \
  --set k8sCluster=minikube-3-node \
  --set "exporters.otlphttp/openobserve.endpoint=http://openobserve-openobserve-standalone.openobserve.svc.cluster.local:5080/api/default" \
  --set "exporters.otlphttp/openobserve.headers.Authorization=Basic cm9vdEBleGFtcGxlLmNvbTpDb21wbGV4cGFzcyMxMjM=" \
  --set "exporters.otlphttp/openobserve_k8s_events.endpoint=http://openobserve-openobserve-standalone.openobserve.svc.cluster.local:5080/api/default" \
  --set "exporters.otlphttp/openobserve_k8s_events.headers.Authorization=Basic cm9vdEBleGFtcGxlLmNvbTpDb21wbGV4cGFzcyMxMjM="

# Now add additional path to parse traceid and spanid if structured json logging is present
#take backup
kubectl get opentelemetrycollector o2c-openobserve-collector-agent -n openobserve-collector -o yaml > o2c-agent-backup.yaml
kubectl get opentelemetrycollector o2c-openobserve-collector-gateway -n openobserve-collector -o yaml > o2c-gateway-backup.yaml

kubectl patch opentelemetrycollector o2c-openobserve-collector-agent -n openobserve-collector --type=json -p='[
  {
    "op": "add",
    "path": "/spec/config/receivers/filelog~1std/operators/6",
    "value": {
      "id": "parse-app-json",
      "type": "json_parser",
      "parse_from": "body",
      "parse_to": "attributes",
      "if": "body matches \"^\\\\s*\\\\{\""
    }
  }
]'

kubectl patch opentelemetrycollector o2c-openobserve-collector-agent -n openobserve-collector --type=json -p='[
  {
    "op": "add",
    "path": "/spec/config/receivers/filelog~1std/operators/-",
    "value": {
      "id": "parse-trace-context",
      "type": "trace_parser",
      "trace_id": {
        "parse_from": "attributes.trace_id"
      },
      "span_id": {
        "parse_from": "attributes.span_id"
      },
      "if": "attributes.trace_id != nil and attributes.span_id != nil"
    }
  }
]'

#In case something wrong you can reapply - 
kubectl apply -f o2c-agent-backup.yaml
kubectl apply -f o2c-gateway-backup.yaml


#Uninstall -
helm uninstall o2c --namespace openobserve-collector

# Example - Custom Log stream example

for i in {1..5}; do
  CURRENT_TIME=$(date +%s%N)
  curl -s -X POST http://localhost:5080/api/default/v1/logs \
    -H "Content-Type: application/json" \
    -H "Authorization: Basic cm9vdEBleGFtcGxlLmNvbTpDb21wbGV4cGFzcyMxMjM=" \
    -H "stream-name: direct-test-app" \
    -d "{
      \"resourceLogs\": [
        {
          \"resource\": {
            \"attributes\": [
              {
                \"key\": \"service.name\",
                \"value\": { \"stringValue\": \"direct-test-app\" }
              }
            ]
          },
          \"scopeLogs\": [
            {
              \"logRecords\": [
                {
                  \"timeUnixNano\": \"$CURRENT_TIME\",
                  \"severityText\": \"INFO\",
                  \"body\": { \"stringValue\": \"Batch log test entry $i\" }
                }
              ]
            }
          ]
        }
      ]
    }"
  echo -e "\nSent entry $i"
  sleep 1
done
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
```

```Shell
Application Instrumentation ....
kubectl apply -f application-services/spring-boot-crud-deployment.yaml
kubectl port-forward -n spring-app svc/spring-boot-crud 8081:8081
kubectl apply -f application-services/golang-crud-deployment.yaml
kubectl -n go-app port-forward svc/go-rest-api 8084:8084
kubectl apply -f application-services/nodejs-crud-deployment.yaml
kubectl -n node-app port-forward svc/node-express-api 9090:9090
```
