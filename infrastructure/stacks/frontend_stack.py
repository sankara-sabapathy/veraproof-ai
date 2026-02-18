"""
VeraProof AI - Frontend Stack
S3 + CloudFront for static website hosting
"""
from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_s3_deployment as s3_deployment,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_certificatemanager as acm,
    aws_route53 as route53,
    aws_route53_targets as targets,
    aws_cognito as cognito,
    CfnOutput,
    RemovalPolicy,
    Duration
)
from constructs import Construct


class VeraproofFrontendStack(Stack):
    """Frontend infrastructure stack"""
    
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        stage: str,
        api_url: str,
        user_pool: cognito.UserPool,
        user_pool_client: cognito.UserPoolClient,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Dashboard S3 Bucket
        self.dashboard_bucket = s3.Bucket(
            self,
            f"Veraproof-Dashboard-Bucket-{stage}",
            bucket_name=f"veraproof-dashboard-{stage}-{self.account}",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )
        
        # Verification Interface S3 Bucket
        self.verification_bucket = s3.Bucket(
            self,
            f"Veraproof-Verification-Bucket-{stage}",
            bucket_name=f"veraproof-verification-{stage}-{self.account}",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )
        
        # CloudFront Origin Access Identity
        dashboard_oai = cloudfront.OriginAccessIdentity(
            self,
            f"Veraproof-Dashboard-OAI-{stage}",
            comment=f"OAI for VeraProof Dashboard - {stage}"
        )
        
        verification_oai = cloudfront.OriginAccessIdentity(
            self,
            f"Veraproof-Verification-OAI-{stage}",
            comment=f"OAI for VeraProof Verification - {stage}"
        )
        
        # Grant CloudFront access to buckets
        self.dashboard_bucket.grant_read(dashboard_oai)
        self.verification_bucket.grant_read(verification_oai)
        
        # CloudFront Distribution for Dashboard
        self.dashboard_distribution = cloudfront.Distribution(
            self,
            f"Veraproof-Dashboard-Distribution-{stage}",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(
                    self.dashboard_bucket,
                    origin_access_identity=dashboard_oai
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                compress=True,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED
            ),
            default_root_object="index.html",
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.minutes(5)
                ),
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.minutes(5)
                )
            ],
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
            enabled=True,
            comment=f"VeraProof Dashboard Distribution - {stage}"
        )
        
        # CloudFront Distribution for Verification Interface
        self.verification_distribution = cloudfront.Distribution(
            self,
            f"Veraproof-Verification-Distribution-{stage}",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(
                    self.verification_bucket,
                    origin_access_identity=verification_oai
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                compress=True,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED
            ),
            default_root_object="index.html",
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
            enabled=True,
            comment=f"VeraProof Verification Interface Distribution - {stage}"
        )
        
        # Outputs
        CfnOutput(
            self,
            f"Dashboard-URL-{stage}",
            value=f"https://{self.dashboard_distribution.distribution_domain_name}",
            description=f"Dashboard URL for {stage}",
            export_name=f"Veraproof-Dashboard-URL-{stage}"
        )
        
        CfnOutput(
            self,
            f"Verification-URL-{stage}",
            value=f"https://{self.verification_distribution.distribution_domain_name}",
            description=f"Verification Interface URL for {stage}",
            export_name=f"Veraproof-Verification-URL-{stage}"
        )
        
        CfnOutput(
            self,
            f"Dashboard-Bucket-Name-{stage}",
            value=self.dashboard_bucket.bucket_name,
            description=f"Dashboard bucket name for {stage}",
            export_name=f"Veraproof-Dashboard-Bucket-{stage}"
        )
        
        CfnOutput(
            self,
            f"Verification-Bucket-Name-{stage}",
            value=self.verification_bucket.bucket_name,
            description=f"Verification bucket name for {stage}",
            export_name=f"Veraproof-Verification-Bucket-{stage}"
        )
        
        # CloudFront Distribution IDs (required for cache invalidation)
        CfnOutput(
            self,
            f"Dashboard-Distribution-ID-{stage}",
            value=self.dashboard_distribution.distribution_id,
            description=f"Dashboard CloudFront Distribution ID for {stage}",
            export_name=f"Veraproof-Dashboard-Distribution-ID-{stage}"
        )
        
        CfnOutput(
            self,
            f"Verification-Distribution-ID-{stage}",
            value=self.verification_distribution.distribution_id,
            description=f"Verification CloudFront Distribution ID for {stage}",
            export_name=f"Veraproof-Verification-Distribution-ID-{stage}"
        )
