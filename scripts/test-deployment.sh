#!/bin/bash
# VeraProof AI - Deployment Validation Script
# Tests all production endpoints

set -e

echo ""
echo "========================================="
echo "VeraProof AI - Deployment Validation"
echo "========================================="
echo "Environment: Production"
echo "Region: ap-south-1 (Mumbai)"
echo "========================================="

API_URL="https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com"
DASHBOARD_URL="https://d3gc0en9my7apv.cloudfront.net"
VERIFICATION_URL="https://dmieqia655oqd.cloudfront.net"

PASS_COUNT=0
FAIL_COUNT=0

# Test API Health
echo ""
echo "=== Testing API Health ==="
echo "URL: $API_URL/health"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" --max-time 10)
if [ $response -eq 200 ]; then
    echo "✓ API Health Check: PASSED"
    echo "  Status: $response"
    content=$(curl -s "$API_URL/health")
    echo "  Response: $content"
    ((PASS_COUNT++))
else
    echo "✗ API Health Check: FAILED"
    echo "  Status: $response"
    ((FAIL_COUNT++))
fi

# Test API Root
echo ""
echo "=== Testing API Root ==="
echo "URL: $API_URL/"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/" --max-time 10)
if [ $response -eq 200 ]; then
    echo "✓ API Root: PASSED"
    echo "  Status: $response"
    ((PASS_COUNT++))
else
    echo "✗ API Root: FAILED"
    echo "  Status: $response"
    ((FAIL_COUNT++))
fi

# Test Dashboard
echo ""
echo "=== Testing Partner Dashboard ==="
echo "URL: $DASHBOARD_URL"
echo "Note: Waiting 2 seconds for CloudFront..."
sleep 2
response=$(curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL" --max-time 10)
if [ $response -eq 200 ]; then
    echo "✓ Dashboard: PASSED"
    echo "  Status: $response"
    content_type=$(curl -s -I "$DASHBOARD_URL" | grep -i "content-type" | cut -d' ' -f2-)
    echo "  Content-Type: $content_type"
    ((PASS_COUNT++))
else
    echo "✗ Dashboard: FAILED"
    echo "  Status: $response"
    ((FAIL_COUNT++))
fi

# Test Verification Interface
echo ""
echo "=== Testing Verification Interface ==="
echo "URL: $VERIFICATION_URL"
response=$(curl -s -o /dev/null -w "%{http_code}" "$VERIFICATION_URL" --max-time 10)
if [ $response -eq 200 ]; then
    echo "✓ Verification Interface: PASSED"
    echo "  Status: $response"
    content_type=$(curl -s -I "$VERIFICATION_URL" | grep -i "content-type" | cut -d' ' -f2-)
    echo "  Content-Type: $content_type"
    ((PASS_COUNT++))
else
    echo "✗ Verification Interface: FAILED"
    echo "  Status: $response"
    ((FAIL_COUNT++))
fi

# Test CloudFront Distributions
echo ""
echo "=== CloudFront Distributions ==="
echo "Dashboard Distribution: E22HOO32XSEYNN"
echo "Verification Distribution: E3A2H3IT5ET3I0"

# Summary
echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo "Tests Passed: $PASS_COUNT"
echo "Tests Failed: $FAIL_COUNT"
echo "========================================="

if [ $FAIL_COUNT -eq 0 ]; then
    echo ""
    echo "✓ All tests passed! Deployment is healthy."
else
    echo ""
    echo "✗ Some tests failed. Check the errors above."
fi

echo ""
echo "=== Production Endpoints ==="
echo "API: $API_URL"
echo "Dashboard: $DASHBOARD_URL"
echo "Verification: $VERIFICATION_URL"

echo ""
echo "=== Infrastructure IDs ==="
echo "Lightsail Container: veraproof-api-prod"
echo "Lightsail Database: veraproof-db-prod"
echo "Cognito User Pool: ap-south-1_l4nlq0n8y"
echo "Cognito Client: 2b7tq4gj7426iamis9snrrh2fo"

echo ""
echo "========================================="
echo "Validation Complete!"
echo "========================================="

# Exit with appropriate code
exit $FAIL_COUNT
