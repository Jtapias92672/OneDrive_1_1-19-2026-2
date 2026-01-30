#!/bin/bash
# ==============================================================================
# FORGE EC2 Instance User Data
# Epic 15: EC2 Infrastructure
# ==============================================================================

set -e

# ==============================================================================
# Configuration
# ==============================================================================
ENVIRONMENT="${environment}"
APP_NAME="${app_name}"
APP_PORT="${app_port}"
DB_SECRET_ARN="${db_secret_arn}"
AWS_REGION="${aws_region}"
BEDROCK_ENABLED="${bedrock_enabled}"

# ==============================================================================
# Logging
# ==============================================================================
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting FORGE instance initialization..."

# ==============================================================================
# System Updates
# ==============================================================================
echo "Updating system packages..."
dnf update -y

# ==============================================================================
# Install Dependencies
# ==============================================================================
echo "Installing dependencies..."
dnf install -y \
  amazon-cloudwatch-agent \
  nodejs20 \
  git \
  jq

# Install npm globally
npm install -g npm@latest
npm install -g pm2

# ==============================================================================
# Create Application User
# ==============================================================================
echo "Creating application user..."
useradd -m -s /bin/bash forge || true
mkdir -p /opt/forge
chown forge:forge /opt/forge

# ==============================================================================
# Configure CloudWatch Agent
# ==============================================================================
echo "Configuring CloudWatch agent..."
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/forge/app.log",
            "log_group_name": "/aws/ec2/forge-${environment}",
            "log_stream_name": "{instance_id}/app",
            "retention_in_days": 30
          },
          {
            "file_path": "/var/log/forge/error.log",
            "log_group_name": "/aws/ec2/forge-${environment}",
            "log_stream_name": "{instance_id}/error",
            "retention_in_days": 30
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "FORGE/$ENVIRONMENT",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"],
        "totalcpu": true
      },
      "disk": {
        "measurement": ["used_percent"],
        "resources": ["/"]
      },
      "mem": {
        "measurement": ["mem_used_percent"]
      }
    }
  }
}
EOF

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# ==============================================================================
# Create Application Directories
# ==============================================================================
echo "Creating application directories..."
mkdir -p /var/log/forge
chown forge:forge /var/log/forge

mkdir -p /opt/forge/app
chown forge:forge /opt/forge/app

# ==============================================================================
# Fetch Database Credentials
# ==============================================================================
echo "Fetching database credentials..."
DB_CREDENTIALS=$(aws secretsmanager get-secret-value \
  --secret-id "$DB_SECRET_ARN" \
  --region "$AWS_REGION" \
  --query 'SecretString' \
  --output text)

DB_HOST=$(echo "$DB_CREDENTIALS" | jq -r '.host')
DB_PORT=$(echo "$DB_CREDENTIALS" | jq -r '.port')
DB_NAME=$(echo "$DB_CREDENTIALS" | jq -r '.dbname')
DB_USER=$(echo "$DB_CREDENTIALS" | jq -r '.username')
DB_PASS=$(echo "$DB_CREDENTIALS" | jq -r '.password')

# ==============================================================================
# Create Environment File
# ==============================================================================
echo "Creating environment file..."
cat > /opt/forge/.env << EOF
NODE_ENV=$ENVIRONMENT
PORT=$APP_PORT
APP_NAME=$APP_NAME

# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME

# AWS
AWS_REGION=$AWS_REGION
BEDROCK_ENABLED=$BEDROCK_ENABLED

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
EOF

chown forge:forge /opt/forge/.env
chmod 600 /opt/forge/.env

# ==============================================================================
# Create PM2 Ecosystem File
# ==============================================================================
echo "Creating PM2 ecosystem file..."
cat > /opt/forge/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: '${app_name}',
    script: '/opt/forge/app/dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_file: '/opt/forge/.env',
    error_file: '/var/log/forge/error.log',
    out_file: '/var/log/forge/app.log',
    merge_logs: true,
    time: true
  }]
};
EOF

chown forge:forge /opt/forge/ecosystem.config.js

# ==============================================================================
# Create Systemd Service
# ==============================================================================
echo "Creating systemd service..."
cat > /etc/systemd/system/forge.service << EOF
[Unit]
Description=FORGE API Server
After=network.target

[Service]
Type=forking
User=forge
WorkingDirectory=/opt/forge
ExecStart=/usr/bin/pm2 start /opt/forge/ecosystem.config.js
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 stop all
Restart=always
RestartSec=10
Environment=PM2_HOME=/home/forge/.pm2

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable forge

# ==============================================================================
# Health Check Endpoint
# ==============================================================================
echo "Setting up health check..."
cat > /opt/forge/health.js << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(${app_port}, '0.0.0.0', () => {
  console.log('Health check server running on port ${app_port}');
});
EOF

chown forge:forge /opt/forge/health.js

# Start health check temporarily until app is deployed
su - forge -c "node /opt/forge/health.js &"

# ==============================================================================
# Complete
# ==============================================================================
echo "FORGE instance initialization complete"
echo "Instance is ready for application deployment"
