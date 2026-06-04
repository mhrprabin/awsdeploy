#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# EC2 Bootstrap Script — run once on a fresh Ubuntu 22.04 t2.micro (free tier)
# Usage: bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo ">>> Updating system..."
sudo apt-get update -y && sudo apt-get upgrade -y

# ── Docker ────────────────────────────────────────────────────────────────────
echo ">>> Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$USER"

# ── Docker Compose (standalone) ───────────────────────────────────────────────
echo ">>> Installing Docker Compose..."
COMPOSE_VERSION="v2.24.0"
sudo curl -SL \
  "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# ── AWS CLI ───────────────────────────────────────────────────────────────────
echo ">>> Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt-get install -y unzip git
unzip -q awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip

# ── git config (needed for git pull in deploy) ────────────────────────────────
git config --global pull.rebase false

echo ""
echo ">>> Docker:         $(docker --version)"
echo ">>> Docker Compose: $(docker-compose --version)"
echo ">>> AWS CLI:        $(aws --version)"
echo ""
echo "✅ Setup complete!"
echo "   IMPORTANT: log out and back in so the docker group takes effect."
echo ""
echo "   Next steps:"
echo "   1. git clone <your-repo> ~/microservice"
echo "   2. cp ~/microservice/.env.ec2.example ~/microservice/.env.ec2"
echo "   3. nano ~/microservice/.env.ec2   # fill in your values"
echo "   4. Push to main — GitHub Actions will deploy automatically"
