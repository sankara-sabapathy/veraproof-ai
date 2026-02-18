"""
VeraProof AI - Storage Stack
S3 buckets for artifacts and branding with lifecycle policies
"""
from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_iam as iam,
    CfnOutput,
    RemovalPolicy,
    Duration
)
from constructs import Construct


class VeraproofStorageStack(Stack):
    """Storage infrastructure stack"""
    
    def __init__(self, scope: Construct, construct_id: str, stage: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Artifacts Bucket (videos, IMU data, optical flow)
        self.artifacts_bucket = s3.Bucket(
            self,
            f"Veraproof-Artifacts-Bucket-{stage}",
            bucket_name=f"veraproof-artifacts-{stage}-{self.account}",
            encryption=s3.BucketEncryption.S3_MANAGED,
            versioned=stage == "prod",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.RETAIN if stage == "prod" else RemovalPolicy.DESTROY,
            auto_delete_objects=stage != "prod",
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="Delete-After-90-Days",
                    enabled=True,
                    expiration=Duration.days(90),
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.GLACIER,
                            transition_after=Duration.days(30)
                        )
                    ]
                )
            ],
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowed_origins=["*"],  # Configure based on stage
                    allowed_headers=["*"],
                    max_age=3600
                )
            ]
        )
        
        # Branding Bucket (logos, custom assets)
        self.branding_bucket = s3.Bucket(
            self,
            f"Veraproof-Branding-Bucket-{stage}",
            bucket_name=f"veraproof-branding-{stage}-{self.account}",
            encryption=s3.BucketEncryption.S3_MANAGED,
            versioned=True,
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=True,
                block_public_policy=True,
                ignore_public_acls=True,
                restrict_public_buckets=False  # Allow CloudFront access
            ),
            removal_policy=RemovalPolicy.RETAIN if stage == "prod" else RemovalPolicy.DESTROY,
            auto_delete_objects=stage != "prod",
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET],
                    allowed_origins=["*"],
                    allowed_headers=["*"],
                    max_age=3600
                )
            ]
        )
        
        # Bucket policy for CloudFront OAI (will be added by frontend stack)
        
        # Outputs
        CfnOutput(
            self,
            f"Artifacts-Bucket-Name-{stage}",
            value=self.artifacts_bucket.bucket_name,
            description=f"Artifacts bucket name for {stage}",
            export_name=f"Veraproof-Artifacts-Bucket-{stage}"
        )
        
        CfnOutput(
            self,
            f"Artifacts-Bucket-ARN-{stage}",
            value=self.artifacts_bucket.bucket_arn,
            description=f"Artifacts bucket ARN for {stage}",
            export_name=f"Veraproof-Artifacts-Bucket-ARN-{stage}"
        )
        
        CfnOutput(
            self,
            f"Branding-Bucket-Name-{stage}",
            value=self.branding_bucket.bucket_name,
            description=f"Branding bucket name for {stage}",
            export_name=f"Veraproof-Branding-Bucket-{stage}"
        )
        
        CfnOutput(
            self,
            f"Branding-Bucket-ARN-{stage}",
            value=self.branding_bucket.bucket_arn,
            description=f"Branding bucket ARN for {stage}",
            export_name=f"Veraproof-Branding-Bucket-ARN-{stage}"
        )
