#!/usr/bin/env python
"""
VeraProof AI - AWS CDK Infrastructure
Low-cost deployment focused on Lightsail + S3/CloudFront.
"""
import aws_cdk as cdk
from stacks.storage_stack import VeraproofStorageStack
from stacks.frontend_stack import VeraproofFrontendStack
from stacks.lightsail_stack import VeraproofLightsailStack


app = cdk.App()

stage = app.node.try_get_context('stage') or 'prod'
region = 'ap-south-1'

env = cdk.Environment(
    account=app.node.try_get_context('account'),
    region=region,
)

tags = {
    'Project': 'VeraProof-AI',
    'ManagedBy': 'AWS-CDK',
    'Stage': stage,
    'CostCenter': 'Engineering',
}

print(f'>> Deploying VeraProof AI - Stage: {stage}')
print(f'   Region: {region}')
print('   Deployment Strategy: Storage -> Frontend -> Lightsail')
print('   Auth Model: Google OIDC handled at the application layer')

storage_stack = VeraproofStorageStack(
    app,
    f'Veraproof-Storage-Stack-{stage}',
    stage=stage,
    env=env,
    description=f'VeraProof AI Storage Infrastructure - {stage.upper()}',
)

frontend_stack = VeraproofFrontendStack(
    app,
    f'Veraproof-Frontend-Stack-{stage}',
    stage=stage,
    user_pool=None,
    user_pool_client=None,
    env=env,
    description=f'VeraProof AI Frontend Infrastructure - {stage.upper()}',
)

lightsail_stack = VeraproofLightsailStack(
    app,
    f'Veraproof-Lightsail-Stack-{stage}',
    stage=stage,
    artifacts_bucket=storage_stack.artifacts_bucket,
    branding_bucket=storage_stack.branding_bucket,
    dashboard_url=frontend_stack.dashboard_url,
    verification_url=frontend_stack.verification_url,
    env=env,
    description=f'VeraProof AI Lightsail Infrastructure - {stage.upper()}',
)

frontend_stack.add_dependency(storage_stack)
lightsail_stack.add_dependency(frontend_stack)
lightsail_stack.add_dependency(storage_stack)

for stack in [storage_stack, frontend_stack, lightsail_stack]:
    for key, value in tags.items():
        cdk.Tags.of(stack).add(key, value)

print('\n>> CDK Stacks Ready:')
print('   1. Storage (S3)')
print('   2. Frontend (CloudFront + S3)')
print('   3. Lightsail (Container + Database)')

app.synth()
