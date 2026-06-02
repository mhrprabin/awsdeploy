.PHONY: help dev build stop clean logs push helm-install helm-upgrade helm-diff helm-uninstall helm-dry-run deploy-ec2

AWS_ACCOUNT ?= $(shell aws sts get-caller-identity --query Account --output text 2>/dev/null)
AWS_REGION  ?= us-east-1
ECR_BASE    ?= $(AWS_ACCOUNT).dkr.ecr.$(AWS_REGION).amazonaws.com
TAG         ?= latest
NAMESPACE   ?= microservices
RELEASE     ?= microservices

help:
	@echo ""
	@echo "  ── Local ──────────────────────────────────────────────────"
	@echo "  make dev              start all services (docker-compose)"
	@echo "  make build            rebuild docker images"
	@echo "  make stop             stop containers"
	@echo "  make clean            stop + remove volumes"
	@echo "  make logs             tail all container logs"
	@echo ""
	@echo "  ── ECR ────────────────────────────────────────────────────"
	@echo "  make push             build + push all images to ECR"
	@echo ""
	@echo "  ── Helm (EKS) ─────────────────────────────────────────────"
	@echo "  make helm-dry-run     preview what helm would deploy"
	@echo "  make helm-install     fresh install to EKS"
	@echo "  make helm-upgrade     upgrade existing release"
	@echo "  make helm-diff        show diff vs live cluster (needs helm-diff plugin)"
	@echo "  make helm-uninstall   remove all resources from cluster"
	@echo ""
	@echo "  ── EC2 ────────────────────────────────────────────────────"
	@echo "  make deploy-ec2       build, push to ECR, deploy on EC2"
	@echo ""

# ── Local ──────────────────────────────────────────────────────────────────────
dev:
	@cp -n .env.example .env 2>/dev/null || true
	docker compose up --build

build:
	docker compose build

stop:
	docker compose down

clean:
	docker compose down -v --remove-orphans

logs:
	docker compose logs -f

# ── ECR ────────────────────────────────────────────────────────────────────────
push:
	@test -n "$(AWS_ACCOUNT)" || (echo "ERROR: configure aws cli first" && exit 1)
	aws ecr get-login-password --region $(AWS_REGION) | \
	  docker login --username AWS --password-stdin $(ECR_BASE)
	@for svc in user-service order-service product-service payment-service gateway frontend; do \
	  echo "→ Building and pushing $$svc..."; \
	  docker build -t $(ECR_BASE)/$$svc:$(TAG) ./services/$$svc 2>/dev/null || \
	  docker build -t $(ECR_BASE)/$$svc:$(TAG) ./$$svc; \
	  docker push $(ECR_BASE)/$$svc:$(TAG); \
	done

# ── Helm ───────────────────────────────────────────────────────────────────────
HELM_SET = \
	--set global.registry=$(ECR_BASE) \
	--set global.imageTag=$(TAG) \
	--set global.db.host=$(DB_HOST) \
	--set global.db.user=$(DB_USER) \
	--set global.db.password=$(DB_PASSWORD) \
	--set global.jwtSecret=$(JWT_SECRET)

helm-dry-run:
	helm install $(RELEASE) ./deploy/helm \
	  --namespace $(NAMESPACE) --create-namespace \
	  --dry-run --debug \
	  $(HELM_SET)

helm-install:
	helm install $(RELEASE) ./deploy/helm \
	  --namespace $(NAMESPACE) --create-namespace \
	  $(HELM_SET)

helm-upgrade:
	helm upgrade $(RELEASE) ./deploy/helm \
	  --namespace $(NAMESPACE) --create-namespace \
	  --atomic --timeout 5m \
	  $(HELM_SET)

helm-upgrade-prod:
	helm upgrade $(RELEASE) ./deploy/helm \
	  --namespace $(NAMESPACE) --create-namespace \
	  -f ./deploy/helm/values.prod.yaml \
	  --atomic --timeout 10m \
	  $(HELM_SET)

helm-diff:
	helm diff upgrade $(RELEASE) ./deploy/helm \
	  --namespace $(NAMESPACE) \
	  $(HELM_SET)

helm-uninstall:
	helm uninstall $(RELEASE) --namespace $(NAMESPACE)

helm-status:
	helm status $(RELEASE) --namespace $(NAMESPACE)

helm-history:
	helm history $(RELEASE) --namespace $(NAMESPACE)

helm-rollback:
	helm rollback $(RELEASE) --namespace $(NAMESPACE)

# ── EC2 ────────────────────────────────────────────────────────────────────────
deploy-ec2:
	@test -n "$(AWS_ACCOUNT)" || (echo "ERROR: configure aws cli first" && exit 1)
	bash deploy/ec2/deploy.sh $(AWS_ACCOUNT) $(AWS_REGION)
