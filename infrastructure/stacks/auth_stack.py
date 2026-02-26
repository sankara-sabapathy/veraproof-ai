"""
VeraProof AI - Authentication Stack
Cognito User Pool for partner authentication
"""
from aws_cdk import (
    Stack,
    aws_cognito as cognito,
    aws_ssm as ssm,
    CfnOutput,
    RemovalPolicy,
    Duration,
    Fn
)
from constructs import Construct


class VeraproofAuthStack(Stack):
    """Authentication infrastructure stack"""
    
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        stage: str,
        dashboard_url: str = None,
        verification_url: str = None,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Build callback URLs based on provided frontend URLs or defaults
        callback_urls = ["http://localhost:4200/callback"]
        logout_urls = ["http://localhost:4200/logout"]
        
        if dashboard_url:
            callback_urls.insert(0, f"{dashboard_url}/callback")
            logout_urls.insert(0, f"{dashboard_url}/logout")
        
        # Cognito User Pool
        self.user_pool = cognito.UserPool(
            self,
            f"Veraproof-User-Pool-{stage}",
            user_pool_name=f"veraproof-partners-{stage}",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(
                email=True,
                username=False
            ),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(
                    required=True,
                    mutable=True
                ),
                given_name=cognito.StandardAttribute(
                    required=False,
                    mutable=True
                ),
                family_name=cognito.StandardAttribute(
                    required=False,
                    mutable=True
                )
            ),
            custom_attributes={
                "tenant_id": cognito.StringAttribute(mutable=False),
                "subscription_tier": cognito.StringAttribute(mutable=True)
            },
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True,
                temp_password_validity=Duration.days(3)
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            removal_policy=RemovalPolicy.RETAIN if stage == "prod" else RemovalPolicy.DESTROY,
            mfa=cognito.Mfa.OPTIONAL if stage == "prod" else cognito.Mfa.OFF,
            mfa_second_factor=cognito.MfaSecondFactor(
                sms=True,
                otp=True
            ) if stage == "prod" else None,
            advanced_security_mode=cognito.AdvancedSecurityMode.ENFORCED if stage == "prod" else cognito.AdvancedSecurityMode.OFF
        )
        
        # User Pool Client for Dashboard
        self.user_pool_client = self.user_pool.add_client(
            f"Veraproof-Dashboard-Client-{stage}",
            user_pool_client_name=f"veraproof-dashboard-{stage}",
            generate_secret=False,
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
                custom=False,
                admin_user_password=False
            ),
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(
                    authorization_code_grant=True,
                    implicit_code_grant=False
                ),
                scopes=[
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE
                ],
                callback_urls=callback_urls,
                logout_urls=logout_urls
            ),
            prevent_user_existence_errors=True,
            access_token_validity=Duration.hours(1),
            id_token_validity=Duration.hours(1),
            refresh_token_validity=Duration.days(30)
        )
        
        # User Pool Domain
        self.user_pool_domain = self.user_pool.add_domain(
            f"Veraproof-Auth-Domain-{stage}",
            cognito_domain=cognito.CognitoDomainOptions(
                domain_prefix=f"veraproof-{stage}"
            )
        )
        
        # Store Cognito configuration in SSM for easy access
        ssm.StringParameter(
            self,
            f"Cognito-UserPool-ID-Param-{stage}",
            parameter_name=f"/veraproof/{stage}/cognito/user_pool_id",
            string_value=self.user_pool.user_pool_id,
            description=f"Cognito User Pool ID for {stage}",
            tier=ssm.ParameterTier.STANDARD
        )
        
        ssm.StringParameter(
            self,
            f"Cognito-Client-ID-Param-{stage}",
            parameter_name=f"/veraproof/{stage}/cognito/client_id",
            string_value=self.user_pool_client.user_pool_client_id,
            description=f"Cognito Client ID for {stage}",
            tier=ssm.ParameterTier.STANDARD
        )
        
        # Outputs
        CfnOutput(
            self,
            f"User-Pool-ID-{stage}",
            value=self.user_pool.user_pool_id,
            description=f"Cognito User Pool ID for {stage}",
            export_name=f"Veraproof-User-Pool-ID-{stage}"
        )
        
        CfnOutput(
            self,
            f"User-Pool-ARN-{stage}",
            value=self.user_pool.user_pool_arn,
            description=f"Cognito User Pool ARN for {stage}",
            export_name=f"Veraproof-User-Pool-ARN-{stage}"
        )
        
        CfnOutput(
            self,
            f"User-Pool-Client-ID-{stage}",
            value=self.user_pool_client.user_pool_client_id,
            description=f"Cognito User Pool Client ID for {stage}",
            export_name=f"Veraproof-User-Pool-Client-ID-{stage}"
        )
        
        CfnOutput(
            self,
            f"Auth-Domain-{stage}",
            value=self.user_pool_domain.domain_name,
            description=f"Cognito Auth Domain for {stage}",
            export_name=f"Veraproof-Auth-Domain-{stage}"
        )
        
        CfnOutput(
            self,
            f"Callback-URLs-{stage}",
            value=",".join(callback_urls),
            description=f"Configured callback URLs for {stage}"
        )
