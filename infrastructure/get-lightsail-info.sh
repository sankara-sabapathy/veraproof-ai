#!/bin/bash
# Get Lightsail Database Information

STAGE="${1:-prod}"
REGION="ap-south-1"
DB_NAME="veraproof-db-$STAGE"
CONTAINER_NAME="veraproof-api-$STAGE"

echo ""
echo "=== Lightsail Database Information ==="
echo ""

# Get database details
echo "Retrieving database details..."
DB_INFO=$(aws lightsail get-relational-database \
    --relational-database-name "$DB_NAME" \
    --region "$REGION" \
    --output json)

if [ $? -eq 0 ]; then
    echo ""
    echo "Database Name: $(echo $DB_INFO | jq -r '.relationalDatabase.name')"
    echo "Database State: $(echo $DB_INFO | jq -r '.relationalDatabase.state')"
    echo "Database Engine: $(echo $DB_INFO | jq -r '.relationalDatabase.engine') $(echo $DB_INFO | jq -r '.relationalDatabase.engineVersion')"
    echo "Master Username: $(echo $DB_INFO | jq -r '.relationalDatabase.masterUsername')"
    echo "Master Database: $(echo $DB_INFO | jq -r '.relationalDatabase.masterDatabaseName')"
    echo "Endpoint: $(echo $DB_INFO | jq -r '.relationalDatabase.masterEndpoint.address'):$(echo $DB_INFO | jq -r '.relationalDatabase.masterEndpoint.port')"
    
    DB_ENDPOINT=$(echo $DB_INFO | jq -r '.relationalDatabase.masterEndpoint.address')
    DB_PORT=$(echo $DB_INFO | jq -r '.relationalDatabase.masterEndpoint.port')
    DB_USER=$(echo $DB_INFO | jq -r '.relationalDatabase.masterUsername')
    DB_DATABASE=$(echo $DB_INFO | jq -r '.relationalDatabase.masterDatabaseName')
fi

# Get database password
echo ""
echo "Retrieving database password..."
PASSWORD_INFO=$(aws lightsail get-relational-database-master-user-password \
    --relational-database-name "$DB_NAME" \
    --region "$REGION" \
    --output json)

if [ $? -eq 0 ]; then
    DB_PASSWORD=$(echo $PASSWORD_INFO | jq -r '.masterUserPassword')
    echo ""
    echo "Master Password: $DB_PASSWORD"
    echo ""
    echo "IMPORTANT: Store this password securely!"
    
    # Offer to store in SSM
    read -p "Do you want to store this password in SSM Parameter Store? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        aws ssm put-parameter \
            --name "/veraproof/$STAGE/database/password" \
            --value "$DB_PASSWORD" \
            --type "SecureString" \
            --overwrite \
            --region "$REGION"
        echo "Password stored in SSM: /veraproof/$STAGE/database/password"
    fi
fi

echo ""
echo "=== Lightsail Container Service Information ==="
echo ""

# Get container service details
echo "Retrieving container service details..."
CONTAINER_INFO=$(aws lightsail get-container-services \
    --service-name "$CONTAINER_NAME" \
    --region "$REGION" \
    --output json)

if [ $? -eq 0 ]; then
    echo ""
    echo "Service Name: $(echo $CONTAINER_INFO | jq -r '.containerServices[0].containerServiceName')"
    echo "Service State: $(echo $CONTAINER_INFO | jq -r '.containerServices[0].state')"
    echo "Power: $(echo $CONTAINER_INFO | jq -r '.containerServices[0].power')"
    echo "Scale: $(echo $CONTAINER_INFO | jq -r '.containerServices[0].scale')"
    echo "API URL: $(echo $CONTAINER_INFO | jq -r '.containerServices[0].url')"
    
    DEPLOYMENT_STATE=$(echo $CONTAINER_INFO | jq -r '.containerServices[0].currentDeployment.state')
    if [ "$DEPLOYMENT_STATE" != "null" ]; then
        echo ""
        echo "Current Deployment:"
        echo "  State: $DEPLOYMENT_STATE"
        echo "  Version: $(echo $CONTAINER_INFO | jq -r '.containerServices[0].currentDeployment.version')"
    else
        echo ""
        echo "No deployment yet. You need to deploy a container."
    fi
fi

echo ""
echo "=== Connection String ==="
if [ -n "$DB_ENDPOINT" ] && [ -n "$DB_PASSWORD" ]; then
    echo ""
    echo "postgresql://$DB_USER:$DB_PASSWORD@$DB_ENDPOINT:$DB_PORT/$DB_DATABASE"
    echo ""
    echo "You can use this connection string in your backend configuration."
fi

echo ""
echo "=== Next Steps ==="
echo "1. Deploy your backend container to Lightsail"
echo "2. Update frontend configuration with API URL"
echo "3. Deploy frontend to S3/CloudFront"
echo "4. Test the complete flow"
echo ""
