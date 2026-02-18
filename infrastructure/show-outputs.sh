#!/bin/bash
# VeraProof AI - Display Deployment Outputs
# Usage: ./show-outputs.sh [stage]
# Example: ./show-outputs.sh prod

STAGE=${1:-prod}
REGION="ap-south-1"

echo "========================================="
echo "VeraProof AI - Deployment Outputs"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "========================================="
echo ""

# Function to get CloudFormation output
get_output() {
    local stack_name=$1
    local output_key=$2
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text \
        --region $REGION 2>/dev/null
}

# Lightsail Stack Outputs
echo "🚀 LIGHTSAIL INFRASTRUCTURE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
API_URL=$(get_output "Veraproof-Lightsail-Stack-$STAGE" "Lightsail-API-URL-$STAGE")
CONTAINER_SERVICE=$(get_output "Veraproof-Lightsail-Stack-$STAGE" "Lightsail-Container-Service-$STAGE")
DB_NAME=$(get_output "Veraproof-Lightsail-Stack-$STAGE" "Lightsail-Database-Name-$STAGE")
DB_ENDPOINT=$(get_output "Veraproof-Lightsail-Stack-$STAGE" "Lightsail-Database-Endpoint-$STAGE")
DB_PORT=$(get_output "Veraproof-Lightsail-Stack-$STAGE" "Lightsail-Database-Port-$STAGE")

echo "API URL:              $API_URL"
echo "Container Service:    $CONTAINER_SERVICE"
echo "Database Name:        $DB_NAME"
echo "Database Endpoint:    $DB_ENDPOINT"
echo "Database Port:        $DB_PORT"
echo ""

# Frontend Stack Outputs
echo "🌐 FRONTEND (CloudFront + S3)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DASHBOARD_URL=$(get_output "Veraproof-Frontend-Stack-$STAGE" "Dashboard-URL-$STAGE")
VERIFICATION_URL=$(get_output "Veraproof-Frontend-Stack-$STAGE" "Verification-URL-$STAGE")
DASHBOARD_BUCKET=$(get_output "Veraproof-Frontend-Stack-$STAGE" "Dashboard-Bucket-Name-$STAGE")
VERIFICATION_BUCKET=$(get_output "Veraproof-Frontend-Stack-$STAGE" "Verification-Bucket-Name-$STAGE")
DASHBOARD_DIST_ID=$(get_output "Veraproof-Frontend-Stack-$STAGE" "Dashboard-Distribution-ID-$STAGE")
VERIFICATION_DIST_ID=$(get_output "Veraproof-Frontend-Stack-$STAGE" "Verification-Distribution-ID-$STAGE")

echo "Dashboard URL:        $DASHBOARD_URL"
echo "Verification URL:     $VERIFICATION_URL"
echo "Dashboard Bucket:     $DASHBOARD_BUCKET"
echo "Verification Bucket:  $VERIFICATION_BUCKET"
echo "Dashboard Dist ID:    $DASHBOARD_DIST_ID"
echo "Verification Dist ID: $VERIFICATION_DIST_ID"
echo ""

# Storage Stack Outputs
echo "📦 STORAGE (S3 Buckets)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ARTIFACTS_BUCKET=$(get_output "Veraproof-Storage-Stack-$STAGE" "Artifacts-Bucket-Name-$STAGE")
BRANDING_BUCKET=$(get_output "Veraproof-Storage-Stack-$STAGE" "Branding-Bucket-Name-$STAGE")

echo "Artifacts Bucket:     $ARTIFACTS_BUCKET"
echo "Branding Bucket:      $BRANDING_BUCKET"
echo ""

# Auth Stack Outputs
echo "🔐 AUTHENTICATION (Cognito)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
USER_POOL_ID=$(get_output "Veraproof-Auth-Stack-$STAGE" "User-Pool-ID-$STAGE")
USER_POOL_CLIENT_ID=$(get_output "Veraproof-Auth-Stack-$STAGE" "User-Pool-Client-ID-$STAGE")
USER_POOL_DOMAIN=$(get_output "Veraproof-Auth-Stack-$STAGE" "User-Pool-Domain-$STAGE")

echo "User Pool ID:         $USER_POOL_ID"
echo "User Pool Client ID:  $USER_POOL_CLIENT_ID"
echo "User Pool Domain:     $USER_POOL_DOMAIN"
echo ""

# Quick Test Commands
echo "🧪 QUICK TEST COMMANDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test API Health:"
echo "  curl $API_URL/health"
echo ""
echo "Open Dashboard:"
echo "  open $DASHBOARD_URL  # macOS"
echo "  start $DASHBOARD_URL  # Windows"
echo ""
echo "Deploy Frontend:"
echo "  # Dashboard"
echo "  cd partner-dashboard && npm run build"
echo "  aws s3 sync dist/partner-dashboard s3://$DASHBOARD_BUCKET/ --delete"
echo "  aws cloudfront create-invalidation --distribution-id $DASHBOARD_DIST_ID --paths '/*'"
echo ""
echo "  # Verification Interface"
echo "  cd verification-interface"
echo "  aws s3 sync . s3://$VERIFICATION_BUCKET/ --delete"
echo "  aws cloudfront create-invalidation --distribution-id $VERIFICATION_DIST_ID --paths '/*'"
echo ""

# Save to file
OUTPUT_FILE="deployment-outputs-$STAGE.txt"
{
    echo "VeraProof AI - Deployment Outputs ($STAGE)"
    echo "Generated: $(date)"
    echo ""
    echo "API_URL=$API_URL"
    echo "DASHBOARD_URL=$DASHBOARD_URL"
    echo "VERIFICATION_URL=$VERIFICATION_URL"
    echo "DATABASE_ENDPOINT=$DB_ENDPOINT"
    echo "DATABASE_PORT=$DB_PORT"
    echo "DASHBOARD_BUCKET=$DASHBOARD_BUCKET"
    echo "VERIFICATION_BUCKET=$VERIFICATION_BUCKET"
    echo "DASHBOARD_DIST_ID=$DASHBOARD_DIST_ID"
    echo "VERIFICATION_DIST_ID=$VERIFICATION_DIST_ID"
    echo "ARTIFACTS_BUCKET=$ARTIFACTS_BUCKET"
    echo "BRANDING_BUCKET=$BRANDING_BUCKET"
    echo "USER_POOL_ID=$USER_POOL_ID"
    echo "USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID"
} > "$OUTPUT_FILE"

echo "📄 Outputs saved to: $OUTPUT_FILE"
echo ""
echo "========================================="
