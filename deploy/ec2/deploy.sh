#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# EC2 Deploy Script — build images locally, push to ECR, deploy on EC2
# Run this from the PROJECT ROOT directory.
# Usage: bash deploy/ec2/deploy.sh <aws-account-id> <aws-region>
# Example: bash deploy/ec2/deploy.sh 123456789012 us-east-1
# ─────────────────────────────────────────────────────────────────────────────
set -e

AWS_ACCOUNT=${1:?"Usage: $0 <aws-account-id> <aws-region>"}
AWS_REGION=${2:?"Usage: $0 <aws-account-id> <aws-region>"}
ECR_BASE="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# service-name → build context path (relative to project root)
declare -A BUILD_PATHS=(
  [user-service]="services/user-service"
  [order-service]="services/order-service"
  [product-service]="services/product-service"
  [payment-service]="services/payment-service"
  [notification-service]="services/notification-service"
  [gateway]="gateway"
  [frontend]="frontend"
)

SERVICES=(user-service order-service product-service payment-service notification-service gateway frontend)

# ── 1. Authenticate with ECR ──────────────────────────────────────────────────
echo ">>> Authenticating with ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_BASE"

# ── 2. Create ECR repositories (no-op if they already exist) ─────────────────
echo ">>> Ensuring ECR repositories exist..."
for svc in "${SERVICES[@]}"; do
  aws ecr describe-repositories --repository-names "$svc" --region "$AWS_REGION" \
    > /dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$svc" --region "$AWS_REGION" \
    > /dev/null
  echo "  ✓ $svc"
done

# ── 3. Build & push each image ────────────────────────────────────────────────
echo ">>> Building and pushing images..."
for svc in "${SERVICES[@]}"; do
  BUILD_CTX="${BUILD_PATHS[$svc]}"
  echo "  Building $svc from ./$BUILD_CTX ..."
  docker build -t "${ECR_BASE}/${svc}:latest" "./$BUILD_CTX"
  docker push "${ECR_BASE}/${svc}:latest"
  echo "  ✓ Pushed ${ECR_BASE}/${svc}:latest"
done

# ── 4. Deploy on EC2 ──────────────────────────────────────────────────────────
# This block runs when the script is executed ON the EC2 instance.
# If running locally (to just build/push), set SKIP_COMPOSE=1.
if [ "${SKIP_COMPOSE:-0}" = "1" ]; then
  echo ""
  echo "✅ Images pushed. Skipping compose (SKIP_COMPOSE=1)."
  echo "   SSH into EC2 and run:"
  echo "     export ECR_BASE=$ECR_BASE"
  echo "     source .env.ec2 && docker compose -f deploy/ec2/docker-compose.ec2.yml up -d --pull always"
  exit 0
fi

echo ">>> Deploying via docker compose..."
export ECR_BASE="$ECR_BASE"

# Load .env.ec2 if it exists (contains RDS_HOST, RDS_USER, etc.)
if [ -f ".env.ec2" ]; then
  set -o allexport
  source .env.ec2
  set +o allexport
fi

docker compose -f deploy/ec2/docker-compose.ec2.yml up -d --pull always

# ── 5. Print URLs ─────────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -sf http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "<EC2-PUBLIC-IP>")

echo ""
echo "✅ Deployment complete!"
echo ""
echo "  Frontend:            http://${PUBLIC_IP}:8080"
echo "  API Gateway:         http://${PUBLIC_IP}"
echo "  → User Service:      http://${PUBLIC_IP}/api/users"
echo "  → Order Service:     http://${PUBLIC_IP}/api/orders"
echo "  → Product Service:   http://${PUBLIC_IP}/api/products"
echo "  → Payment Service:   http://${PUBLIC_IP}/api/payments"
echo "  → Notification Svc:  http://${PUBLIC_IP}/api/notifications"
echo ""
echo "  View running containers: docker compose -f deploy/ec2/docker-compose.ec2.yml ps"
echo "  Tail logs:               docker compose -f deploy/ec2/docker-compose.ec2.yml logs -f"
