#!/bin/bash
# Local Deployment Script for VeraProof AI
# Mirrors the CI/CD pipeline for local deployments

set -e

STAGE="${1:-prod}"
REGION="ap-south-1"

echo "========================================="
echo "VeraProof AI - Local Deployment"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "========================================="

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Error: AWS credentials not configured"
    echo "Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SESSION_TOKEN"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account: $AWS_ACCOUNT_ID"

# Step 1: Deploy Infrastructure
echo ""
echo "=== Step 1: Deploying Infrastructure ==="
cd infrastructure

# Install CDK if not already installed
if ! command -v cdk &> /dev/null; then
    echo "Installing AWS CDK..."
    npm install -g aws-cdk
fi

# Install Python dependencies
pip install -r requirements.txt

# Deploy all stacks
echo "Deploying CDK stacks..."
cdk deploy --all \
    --context stage=$STAGE \
    --context account=$AWS_ACCOUNT_ID \
    --require-approval never \
    --outputs-file cdk-outputs.json

# Extract outputs
LIGHTSAIL_SERVICE=$(jq -r ".\"Veraproof-Lightsail-Stack-$STAGE\".\"LightsailContainerService${STAGE}\"" cdk-outputs.json)
DASHBOARD_BUCKET=$(jq -r ".\"Veraproof-Frontend-Stack-$STAGE\".\"DashboardBucketName${STAGE}\"" cdk-outputs.json)
VERIFICATION_BUCKET=$(jq -r ".\"Veraproof-Frontend-Stack-$STAGE\".\"VerificationBucketName${STAGE}\"" cdk-outputs.json)
DASHBOARD_DIST=$(jq -r ".\"Veraproof-Frontend-Stack-$STAGE\".\"DashboardDistributionID${STAGE}\"" cdk-outputs.json)
VERIFICATION_DIST=$(jq -r ".\"Veraproof-Frontend-Stack-$STAGE\".\"VerificationDistributionID${STAGE}\"" cdk-outputs.json)

echo "Lightsail Service: $LIGHTSAIL_SERVICE"
echo "Dashboard Bucket: $DASHBOARD_BUCKET"
echo "Verification Bucket: $VERIFICATION_BUCKET"

cd ..

# Step 2: Get Database Credentials
echo ""
echo "=== Step 2: Retrieving Database Credentials ==="
DB_PASSWORD=$(aws lightsail get-relational-database-master-user-password \
    --relational-database-name veraproof-db-$STAGE \
    --region $REGION \
    --query 'masterUserPassword' \
    --output text)

DB_ENDPOINT=$(aws lightsail get-relational-database \
    --relational-database-name veraproof-db-$STAGE \
    --region $REGION \
    --query 'relationalDatabase.masterEndpoint.address' \
    --output text)

echo "Database Endpoint: $DB_ENDPOINT"
echo "Database Password: [MASKED]"

# Step 3: Build and Deploy Backend
echo ""
echo "=== Step 3: Building and Deploying Backend ==="
cd backend

echo "Building Docker image..."
docker build -t veraproof-api:latest .

echo "Pushing to Lightsail..."
aws lightsail push-container-image \
    --service-name $LIGHTSAIL_SERVICE \
    --label veraproof-api \
    --image veraproof-api:latest \
    --region $REGION \
    --output json > push-output.json

IMAGE_NAME=$(jq -r '.containerImage.image' push-output.json)
echo "Image pushed: $IMAGE_NAME"

# URL encode the database password
echo "Encoding database password..."
ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$DB_PASSWORD', safe=''))")

# Create deployment configuration
echo "Creating deployment configuration..."
cat > deployment.json <<EOF
{
  "containers": {
    "app": {
      "image": "$IMAGE_NAME",
      "ports": {
        "8000": "HTTP"
      },
      "environment": {
        "STAGE": "$STAGE",
        "AWS_REGION": "$REGION",
        "DATABASE_URL": "postgresql://veraproof_admin:$ENCODED_PASSWORD@$DB_ENDPOINT:5432/veraproof",
        "COGNITO_USER_POOL_ID": "ap-south-1_l4nlq0n8y",
        "COGNITO_CLIENT_ID": "2b7tq4gj7426iamis9snrrh2fo",
        "ARTIFACTS_BUCKET": "veraproof-artifacts-$STAGE-$AWS_ACCOUNT_ID",
        "BRANDING_BUCKET": "veraproof-branding-$STAGE-$AWS_ACCOUNT_ID"
      }
    }
  },
  "publicEndpoint": {
    "containerName": "app",
    "containerPort": 8000,
    "healthCheck": {
      "path": "/health",
      "intervalSeconds": 30,
      "timeoutSeconds": 5,
      "healthyThreshold": 2,
      "unhealthyThreshold": 2,
      "successCodes": "200"
    }
  }
}
EOF

echo "Deploying to Lightsail..."
aws lightsail create-container-service-deployment \
    --service-name $LIGHTSAIL_SERVICE \
    --cli-input-json file://deployment.json \
    --region $REGION

echo "Waiting for deployment to become active..."
for i in {1..30}; do
    STATE=$(aws lightsail get-container-services \
        --service-name $LIGHTSAIL_SERVICE \
        --region $REGION \
        --query 'containerServices[0].currentDeployment.state' \
        --output text)
    
    echo "Deployment state: $STATE (attempt $i/30)"
    
    if [ "$STATE" == "ACTIVE" ]; then
        echo "✓ Backend deployment successful!"
        break
    elif [ "$STATE" == "FAILED" ]; then
        echo "✗ Backend deployment failed!"
        exit 1
    fi
    
    sleep 20
done

cd ..

# Step 4: Build and Deploy Frontend
echo ""
echo "=== Step 4: Building and Deploying Frontend ==="
cd partner-dashboard

echo "Installing dependencies..."
npm ci

echo "Building dashboard..."
npm run build

echo "Deploying dashboard to S3..."
aws s3 sync dist/partner-dashboard/browser \
    s3://$DASHBOARD_BUCKET/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "*.json"

aws s3 sync dist/partner-dashboard/browser \
    s3://$DASHBOARD_BUCKET/ \
    --cache-control "no-cache, no-store, must-revalidate" \
    --include "index.html" \
    --include "*.json"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
    --distribution-id $DASHBOARD_DIST \
    --paths "/*"

cd ..

# Step 5: Deploy Verification Page
echo ""
echo "=== Step 5: Deploying Verification Page ==="
if [ -d "verification-interface" ]; then
    echo "Deploying verification page to S3..."
    aws s3 sync verification-interface \
        s3://$VERIFICATION_BUCKET/ \
        --delete \
        --cache-control "public, max-age=31536000, immutable" \
        --exclude "index.html" \
        --exclude "README.md"
    
    aws s3 sync verification-interface \
        s3://$VERIFICATION_BUCKET/ \
        --cache-control "no-cache, no-store, must-revalidate" \
        --include "index.html"
    
    echo "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id $VERIFICATION_DIST \
        --paths "/*"
else
    echo "Warning: verification-interface directory not found, skipping..."
fi

# Step 6: Get API URL and Test
echo ""
echo "=== Step 6: Testing Deployment ==="
API_URL=$(aws lightsail get-container-services \
    --service-name $LIGHTSAIL_SERVICE \
    --region $REGION \
    --query 'containerServices[0].url' \
    --output text)

DASHBOARD_URL=$(aws cloudformation describe-stacks \
    --stack-name Veraproof-Frontend-Stack-$STAGE \
    --region $REGION \
    --query "Stacks[0].Outputs[?OutputKey=='DashboardURLprod'].OutputValue" \
    --output text)

VERIFICATION_URL=$(aws cloudformation describe-stacks \
    --stack-name Veraproof-Frontend-Stack-$STAGE \
    --region $REGION \
    --query "Stacks[0].Outputs[?OutputKey=='VerificationURLprod'].OutputValue" \
    --output text)

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "API URL: https://$API_URL"
echo "Dashboard URL: $DASHBOARD_URL"
echo "Verification URL: $VERIFICATION_URL"
echo ""
echo "Testing API health endpoint..."
if curl -f -s "https://$API_URL/health" > /dev/null; then
    echo "✓ API health check passed"
else
    echo "✗ API health check failed (may still be starting up)"
fi

echo ""
echo "========================================="
echo "Next Steps:"
echo "1. Wait 2-3 minutes for CloudFront cache invalidation"
echo "2. Test dashboard: $DASHBOARD_URL"
echo "3. Test verification: $VERIFICATION_URL"
echo "4. Monitor logs in CloudWatch: /aws/lightsail/$LIGHTSAIL_SERVICE"
echo "========================================="
