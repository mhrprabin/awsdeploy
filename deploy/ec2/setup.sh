#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# EC2 Bootstrap Script — run once after launching Ubuntu 22.04 instance
# Usage: bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo ">>> Updating system..."
sudo apt-get update -y && sudo apt-get upgrade -y

echo ">>> Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

echo ">>> Installing Docker Compose..."
COMPOSE_VERSION="v2.24.0"
sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo ">>> Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt-get install -y unzip
unzip -q awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip

echo ">>> Docker version: $(docker --version)"
echo ">>> Docker Compose version: $(docker-compose --version)"
echo ">>> AWS CLI version: $(aws --version)"
echo ""
echo "✅ Setup complete! Log out and back in for docker group to take effect."
echo "   Then run: cd /home/ubuntu/microservice && docker-compose up -d"
