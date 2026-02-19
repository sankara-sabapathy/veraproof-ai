#!/usr/bin/env python
"""
VeraProof AI - AWS CDK Infrastructure
Lightsail-only deployment for cost-effective, simple infrastructure
"""
import aws_cdk as cdk
from stacks.storage_stack import VeraproofStorageStack
from stacks.auth_stack import VeraproofAuthStack
from stacks.frontend_stack import VeraproofFrontendStack
from stacks.lightsail_stack import VeraproofLightsailStack


app = cdk.App()

# Get stage from context (dev, staging, prod)
stage = app.node.try_get_context("stage") or "prod"

region = "ap-south-1"  # Mumbai region

# Environment configuration
env = cdk.Environment(
    account=app.node.try_get_context("account"),
    region=region
)

# Tags for all resources
tags = {
    "Project": "VeraProof-AI",
    "ManagedBy": "AWS-CDK",
    "Stage": stage,
    "CostCenter": "Engineering"
}

print(f">> Deploying VeraProof AI - Stage: {stage}")
print(f"   Region: {region}")
print(f"   Deployment Strategy: Two-Phase with SSM Parameter Store")
print(f"   Phase 1: Storage -> Frontend -> Lightsail")
print(f"   Phase 2: Auth (with Frontend URLs from SSM)")

# Storage Stack (S3 buckets)
storage_stack = VeraproofStorageStack(
    app,
    f"Veraproof-Storage-Stack-{stage}",
    stage=stage,
    env=env,
    description=f"VeraProof AI Storage Infrastructure - {stage.upper()}"
)

# Frontend Stack (S3 + CloudFront) - Deploy FIRST to get URLs
frontend_stack = VeraproofFrontendStack(
    app,
    f"Veraproof-Frontend-Stack-{stage}",
    stage=stage,
    user_pool=None,  # Will be updated in Phase 2
    user_pool_client=None,  # Will be updated in Phase 2
    env=env,
    description=f"VeraProof AI Frontend Infrastructure - {stage.upper()}"
)

# Lightsail Stack (Container + Database) - Deploy AFTER Frontend to use CORS URLs
lightsail_stack = VeraproofLightsailStack(
    app,
    f"Veraproof-Lightsail-Stack-{stage}",
    stage=stage,
    artifacts_bucket=storage_stack.artifacts_bucket,
    branding_bucket=storage_stack.branding_bucket,
    user_pool=None,  # Will be updated in Phase 2
    dashboard_url=frontend_stack.dashboard_url,
    verification_url=frontend_stack.verification_url,
    env=env,
    description=f"VeraProof AI Lightsail Infrastructure - {stage.upper()}"
)

# Auth Stack (Cognito) - Deploy LAST with Frontend URLs for callbacks
auth_stack = VeraproofAuthStack(
    app,
    f"Veraproof-Auth-Stack-{stage}",
    stage=stage,
    dashboard_url=frontend_stack.dashboard_url,
    verification_url=frontend_stack.verification_url,
    env=env,
    description=f"VeraProof AI Authentication Infrastructure - {stage.upper()}"
)

# Add dependencies to ensure correct deployment order
frontend_stack.add_dependency(storage_stack)
lightsail_stack.add_dependency(frontend_stack)
lightsail_stack.add_dependency(storage_stack)
auth_stack.add_dependency(frontend_stack)

# Apply tags to all stacks
for stack in [storage_stack, auth_stack, lightsail_stack, frontend_stack]:
    for key, value in tags.items():
        cdk.Tags.of(stack).add(key, value)

# Output summary
print(f"\n>> CDK Stacks Ready:")
print(f"   1. Storage (S3)")
print(f"   2. Auth (Cognito)")
print(f"   3. Lightsail (Container + Database)")
print(f"   4. Frontend (CloudFront + S3)")

app.synth()
