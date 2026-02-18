#!/bin/bash
# VeraProof AI - AWS CDK Deployment Script (Lightsail Only)
# Usage: ./deploy.sh <account_id> [stage]
# Example: ./deploy.sh 123456789012 prod
# Example: ./deploy.sh 123456789012 dev

set -e

ACCOUNT_ID=$1
STAGE=${2:-prod}  # Default to prod
REGION="ap-south-1"

if [ -z "$ACCOUNT_ID" ]; then
    echo "Usage: ./deploy.sh <account_id> [stage]"
    echo "Stages: dev, staging, prod (default: prod)"
    exit 1
fi

echo "========================================="
echo "VeraProof AI - Lightsail Deployment"
echo "Stage: $STAGE"
echo "Account: $ACCOUNT_ID"
echo "Region: $REGION"
echo "========================================="

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Bootstrap CDK (if not already done)
echo "🔧 Bootstrapping CDK..."
cdk bootstrap aws://$ACCOUNT_ID/$REGION --context stage=$STAGE

# Synthesize CloudFormation templates
echo "🔨 Synthesizing CloudFormation templates..."
cdk synth --context stage=$STAGE --context account=$ACCOUNT_ID

# Deploy all stacks
echo "☁️  Deploying infrastructure..."
cdk deploy --all \
    --context stage=$STAGE \
    --context account=$ACCOUNT_ID \
    --require-approval never \
    --progress events \
    --outputs-file cdk-outputs.json

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""

# Display important outputs
echo "🔗 Fetching deployment outputs..."
echo ""
chmod +x show-outputs.sh
./show-outputs.sh $STAGE

echo ""
echo "Next steps:"
echo "1. Get database password from Lightsail console"
echo "2. Build and push Docker image to Lightsail"
echo "   cd backend && docker build -t veraproof-backend:latest ."
echo "   aws lightsail push-container-image --service-name veraproof-api-$STAGE --label veraproof-backend --image veraproof-backend:latest --region $REGION"
echo "3. Deploy frontend assets to S3"
echo "4. Initialize database schema"
echo ""
