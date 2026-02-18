#!/bin/bash
# VeraProof AI - SSM Parameter Store Setup
# Creates all required SSM parameters for deployment

set -e

STAGE=${1:-prod}
REGION=${2:-ap-south-1}

echo "╔════════════════════════════════════════════════════════╗"
echo "║     VeraProof AI - SSM Parameters Setup               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Stage: $STAGE"
echo "Region: $REGION"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS CLI not configured"
    echo "Run: aws configure"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# 1. Database Password
echo "📝 Creating database password..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
aws ssm put-parameter \
  --name "/veraproof/$STAGE/database/password" \
  --value "$DB_PASSWORD" \
  --type "SecureString" \
  --description "Database password for $STAGE" \
  --region $REGION \
  --overwrite 2>/dev/null || \
aws ssm put-parameter \
  --name "/veraproof/$STAGE/database/password" \
  --value "$DB_PASSWORD" \
  --type "SecureString" \
  --description "Database password for $STAGE" \
  --region $REGION

echo "   ✓ /veraproof/$STAGE/database/password"

# 2. JWT Secret Key
echo "📝 Creating JWT secret key..."
JWT_SECRET=$(openssl rand -hex 64)
aws ssm put-parameter \
  --name "/veraproof/$STAGE/jwt/secret-key" \
  --value "$JWT_SECRET" \
  --type "SecureString" \
  --description "JWT secret key for $STAGE" \
  --region $REGION \
  --overwrite 2>/dev/null || \
aws ssm put-parameter \
  --name "/veraproof/$STAGE/jwt/secret-key" \
  --value "$JWT_SECRET" \
  --type "SecureString" \
  --description "JWT secret key for $STAGE" \
  --region $REGION

echo "   ✓ /veraproof/$STAGE/jwt/secret-key"

# 3. API Keys Salt
echo "📝 Creating API keys salt..."
API_SALT=$(openssl rand -hex 32)
aws ssm put-parameter \
  --name "/veraproof/$STAGE/api-keys/salt" \
  --value "$API_SALT" \
  --type "SecureString" \
  --description "API keys salt for $STAGE" \
  --region $REGION \
  --overwrite 2>/dev/null || \
aws ssm put-parameter \
  --name "/veraproof/$STAGE/api-keys/salt" \
  --value "$API_SALT" \
  --type "SecureString" \
  --description "API keys salt for $STAGE" \
  --region $REGION

echo "   ✓ /veraproof/$STAGE/api-keys/salt"

# 4. Webhook Secret
echo "📝 Creating webhook secret..."
WEBHOOK_SECRET=$(openssl rand -hex 32)
aws ssm put-parameter \
  --name "/veraproof/$STAGE/webhook/secret" \
  --value "$WEBHOOK_SECRET" \
  --type "SecureString" \
  --description "Webhook HMAC secret for $STAGE" \
  --region $REGION \
  --overwrite 2>/dev/null || \
aws ssm put-parameter \
  --name "/veraproof/$STAGE/webhook/secret" \
  --value "$WEBHOOK_SECRET" \
  --type "SecureString" \
  --description "Webhook HMAC secret for $STAGE" \
  --region $REGION

echo "   ✓ /veraproof/$STAGE/webhook/secret"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║              ✅ Setup Complete!                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Parameters created:"
echo "  1. /veraproof/$STAGE/database/password"
echo "  2. /veraproof/$STAGE/jwt/secret-key"
echo "  3. /veraproof/$STAGE/api-keys/salt"
echo "  4. /veraproof/$STAGE/webhook/secret"
echo ""
echo "💰 Cost: \$0.00 (SSM Parameter Store Standard tier is FREE)"
echo ""
echo "📝 Next steps:"
echo "  1. Deploy infrastructure: cd infrastructure && ./deploy.sh $STAGE <account-id> lightsail"
echo "  2. Update backend to read from SSM"
echo "  3. Test deployment"
echo ""
echo "🔍 To view parameters:"
echo "  aws ssm get-parameter --name /veraproof/$STAGE/database/password --with-decryption --region $REGION"
