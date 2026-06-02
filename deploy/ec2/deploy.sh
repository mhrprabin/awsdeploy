#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# EC2 Deploy Script — push images to ECR and start services
# Prerequisites: AWS CLI configured, ECR repos created, .env files filled in
# Usage: bash deploy.sh <aws-account-id> <aws-region>
# Example: bash deploy.sh 123456789012 us-east-1
# ─────────────────────────────────────────────────────────────────────────────
set -e

AWS_ACCOUNT=${1:?  "Usage: $0 <aws-account-id> <aws-region>"}
AWS_REGION=${2:?   "Usage: $0 <aws-account-id> <aws-region>"}
ECR_BASE="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"

SERVICES=(user-service order-service product-service payment-service gateway)

echo ">>> Authenticating with ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_BASE"

echo ">>> Creating ECR repositories (skips if already exists)..."
for svc in "${SERVICES[@]}"; do
  aws ecr describe-repositories --repository-names "$svc" --region "$AWS_REGION" > /dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$svc" --region "$AWS_REGION" > /dev/null
  echo "  ✓ $svc"
done

echo ">>> Building and pushing images..."
for svc in "${SERVICES[@]}"; do
  echo "  Building $svc..."
  docker build -t "$svc" "./${svc}"
  docker tag  "$svc:latest" "${ECR_BASE}/${svc}:latest"
  docker push "${ECR_BASE}/${svc}:latest"
  echo "  ✓ Pushed ${ECR_BASE}/${svc}:latest"
done

echo ">>> Deploying on EC2 via docker-compose..."
# Replace image references in compose with ECR images
export ECR_BASE="$ECR_BASE"
docker-compose -f ec2-deploy/docker-compose.ec2.yml up -d --pull always

echo ""
echo "✅ Deployment complete!"
echo "   Gateway:         http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "   User Service:    http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/api/users"
echo "   Order Service:   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/api/orders"
echo "   Product Service: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/api/products"
echo "   Payment Service: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/api/payments"
