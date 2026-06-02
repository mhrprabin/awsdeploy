# Microservices Deploy Guide

## Architecture

```
Internet
    │
    ▼
NGINX Gateway (:80)
    ├── /api/users    → node-user-service    (:3001) ─┐
    ├── /api/orders   → node-order-service   (:3002) ─┤
    ├── /api/products → php-product-service  (:80)  ─┤ → RDS MySQL
    └── /api/payments → php-payment-service  (:80)  ─┘
```

## Services & Endpoints

| Service | Port | Endpoints |
|---------|------|-----------|
| User Service (Node.js) | 3001 | POST /api/users/register, POST /api/users/login, GET /api/users/profile |
| Order Service (Node.js) | 3002 | POST /api/orders, GET /api/orders/my, PATCH /api/orders/:id/status |
| Product Service (PHP) | 8001 | GET /api/products, POST /api/products, GET /api/products/:id |
| Payment Service (PHP) | 8002 | POST /api/payments, PATCH /api/payments/:id/status, POST /api/payments/:id/refund |

---

## Step 1: Local Development

```bash
# Copy env files
cp node-user-service/.env.example node-user-service/.env
cp node-order-service/.env.example node-order-service/.env
cp php-product-service/.env.example php-product-service/.env
cp php-payment-service/.env.example php-payment-service/.env

# Start everything
docker-compose up --build

# Test
curl http://localhost/health
curl -X POST http://localhost/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com","password":"secret123"}'
```

---

## Step 2: EC2 Deployment

### 2a. Launch EC2
- AMI: Ubuntu 22.04 LTS
- Instance type: t2.micro (free tier) or t3.small
- Security Group: allow inbound 22 (SSH), 80 (HTTP)

### 2b. Launch RDS
- Engine: MySQL 8.0
- Instance: db.t3.micro (free tier)
- Place in **private subnet** (same VPC as EC2)
- Security Group: allow port 3306 from EC2's security group only
- Create databases: users_db, orders_db, products_db, payments_db

### 2c. Setup EC2
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@<ec2-public-ip>

# Upload and run setup script
scp -i your-key.pem ec2-deploy/setup.sh ubuntu@<ec2-public-ip>:~/
bash setup.sh
# Log out and back in
```

### 2d. Deploy
```bash
# On EC2 — clone your repo or scp the project
git clone <your-repo> /home/ubuntu/microservice
cd /home/ubuntu/microservice

# Set RDS env vars and deploy via ECR
bash ec2-deploy/deploy.sh <aws-account-id> us-east-1

# OR for quick test without ECR (build on EC2 directly):
RDS_HOST=your-rds-endpoint \
RDS_USER=admin \
RDS_PASSWORD=yourpassword \
JWT_SECRET=changeme \
ECR_BASE=local \
docker-compose -f ec2-deploy/docker-compose.ec2.yml up --build -d
```

---

## Step 3: Kubernetes (EKS) Deployment

### 3a. Create EKS Cluster
```bash
eksctl create cluster \
  --name microservices-cluster \
  --region us-east-1 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 4

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts && helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=microservices-cluster \
  --set serviceAccount.create=true
```

### 3b. Edit Secrets
```bash
# Edit k8s/secrets/db-secret.yaml with your RDS endpoint and credentials
vi k8s/secrets/db-secret.yaml
```

### 3c. Deploy to EKS
```bash
cd k8s
bash deploy-k8s.sh <aws-account-id> us-east-1

# Watch pods
kubectl get pods -n microservices -w

# Get the ALB URL (takes 2-3 min)
kubectl get ingress -n microservices
```

### 3d. Test Kubernetes
```bash
ALB_URL=$(kubectl get ingress microservices-ingress -n microservices -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

curl http://$ALB_URL/api/users/health
curl http://$ALB_URL/api/products/health
```

### 3e. Cleanup (avoid charges!)
```bash
eksctl delete cluster --name microservices-cluster --region us-east-1
```

---

## Quick API Test Flow

```bash
# 1. Register user
curl -X POST http://localhost/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com","password":"secret123"}'

# 2. Login → get token
TOKEN=$(curl -s -X POST http://localhost/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"secret123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 3. Add a product
curl -X POST http://localhost/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":999.99,"stock":50,"category":"Electronics"}'

# 4. Create an order
curl -X POST http://localhost/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"product_id":1,"quantity":1,"total_price":999.99}'

# 5. Pay for the order
curl -X POST http://localhost/api/payments \
  -H "Content-Type: application/json" \
  -d '{"order_id":1,"user_id":1,"amount":999.99,"method":"card"}'
```
