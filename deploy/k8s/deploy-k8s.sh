#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Kubernetes Deploy Script — applies all manifests to EKS
# Usage: bash deploy-k8s.sh <aws-account-id> <aws-region>
# Example: bash deploy-k8s.sh 123456789012 us-east-1
# ─────────────────────────────────────────────────────────────────────────────
set -e

AWS_ACCOUNT=${1:? "Usage: $0 <aws-account-id> <aws-region>"}
AWS_REGION=${2:?  "Usage: $0 <aws-account-id> <aws-region>"}
ECR_BASE="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"

SERVICES=(user-service order-service product-service payment-service)

echo ">>> Updating kubeconfig for EKS..."
aws eks update-kubeconfig --name microservices-cluster --region "$AWS_REGION"

echo ">>> Building & pushing images to ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_BASE"

for svc in "${SERVICES[@]}"; do
  docker build -t "$svc" "../${svc}"
  docker tag  "$svc:latest" "${ECR_BASE}/${svc}:latest"
  docker push "${ECR_BASE}/${svc}:latest"
  echo "  ✓ Pushed $svc"
done

echo ">>> Replacing image placeholders in manifests..."
for svc in "${SERVICES[@]}"; do
  sed -i "s|YOUR_ECR_BASE|${ECR_BASE}|g" "${svc}/deployment.yaml"
done

echo ">>> Applying Kubernetes manifests..."
kubectl apply -f namespace.yaml
kubectl apply -f secrets/db-secret.yaml
kubectl apply -f user-service/
kubectl apply -f order-service/
kubectl apply -f product-service/
kubectl apply -f payment-service/
kubectl apply -f ingress/

echo ">>> Waiting for deployments to be ready..."
kubectl rollout status deployment/user-service  -n microservices
kubectl rollout status deployment/order-service -n microservices
kubectl rollout status deployment/product-service -n microservices
kubectl rollout status deployment/payment-service -n microservices

echo ""
echo ">>> Ingress address (may take 2-3 minutes to provision ALB):"
kubectl get ingress microservices-ingress -n microservices

echo ""
echo "✅ Kubernetes deployment complete!"
echo "   kubectl get pods -n microservices"
