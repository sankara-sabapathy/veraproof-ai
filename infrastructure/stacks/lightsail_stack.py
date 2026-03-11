"""
VeraProof AI - Lightsail Stack
AWS Lightsail Container Service + Lightsail Database.
"""
from aws_cdk import (
    Stack,
    aws_lightsail as lightsail,
    aws_s3 as s3,
    aws_iam as iam,
    aws_ssm as ssm,
    CfnOutput,
)
from constructs import Construct


class VeraproofLightsailStack(Stack):
    """Lightsail Container + Database stack"""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        stage: str,
        artifacts_bucket: s3.Bucket,
        branding_bucket: s3.Bucket,
        dashboard_url: str = None,
        verification_url: str = None,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.dashboard_url = dashboard_url
        self.verification_url = verification_url

        power_map = {
            'dev': 'nano',
            'staging': 'micro',
            'prod': 'micro',
        }
        scale_map = {
            'dev': 1,
            'staging': 1,
            'prod': 1,
        }
        db_bundle_map = {
            'dev': 'micro_2_0',
            'staging': 'micro_2_0',
            'prod': 'micro_2_0',
        }

        self.database = lightsail.CfnDatabase(
            self,
            f'Veraproof-Lightsail-Database-{stage}',
            relational_database_name=f'veraproof-db-{stage}',
            relational_database_bundle_id=db_bundle_map.get(stage, 'micro_2_0'),
            relational_database_blueprint_id='postgres_16',
            master_database_name='veraproof',
            master_username='veraproof_admin',
            rotate_master_user_password=True,
            publicly_accessible=False,
            backup_retention=True,
            preferred_backup_window='03:00-04:00',
            preferred_maintenance_window='mon:04:00-mon:05:00',
            tags=[
                {'key': 'Project', 'value': 'VeraProof-AI'},
                {'key': 'Stage', 'value': stage},
            ],
        )

        self.container_service = lightsail.CfnContainer(
            self,
            f'Veraproof-Lightsail-Container-{stage}',
            service_name=f'veraproof-api-{stage}',
            power=power_map.get(stage, 'micro'),
            scale=scale_map.get(stage, 1),
            is_disabled=False,
            tags=[
                {'key': 'Project', 'value': 'VeraProof-AI'},
                {'key': 'Stage', 'value': stage},
            ],
        )

        backend_user = iam.User(
            self,
            f'Veraproof-Backend-User-{stage}',
            user_name=f'veraproof-backend-user-{stage}',
        )
        artifacts_bucket.grant_read_write(backend_user)
        branding_bucket.grant_read_write(backend_user)
        backend_user.add_to_policy(
            iam.PolicyStatement(
                actions=['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
                resources=[f'arn:aws:ssm:{self.region}:{self.account}:parameter/veraproof/{stage}/*'],
            )
        )
        backend_user.add_to_policy(
            iam.PolicyStatement(
                actions=['rekognition:DetectLabels', 'rekognition:DetectFaces'],
                resources=['*'],
            )
        )

        ssm.StringParameter(
            self,
            f'Veraproof-DB-Endpoint-{stage}',
            parameter_name=f'/veraproof/{stage}/database/endpoint',
            string_value=self.database.attr_database_arn.split(':')[-1],
            description=f'Lightsail database endpoint for {stage}',
            tier=ssm.ParameterTier.STANDARD,
        )
        ssm.StringParameter(
            self,
            f'Veraproof-DB-Port-{stage}',
            parameter_name=f'/veraproof/{stage}/database/port',
            string_value='5432',
            description=f'Lightsail database port for {stage}',
            tier=ssm.ParameterTier.STANDARD,
        )

        self.api_url = self.container_service.attr_url
        ssm.StringParameter(
            self,
            f'Veraproof-API-URL-Param-{stage}',
            parameter_name=f'/veraproof/{stage}/api/url',
            string_value=f'https://{self.api_url}',
            description=f'Lightsail API URL for {stage}',
            tier=ssm.ParameterTier.STANDARD,
        )

        CfnOutput(
            self,
            f'Lightsail-Container-Service-{stage}',
            value=self.container_service.service_name,
            description=f'Lightsail container service name for {stage}',
            export_name=f'Veraproof-Lightsail-Container-{stage}',
        )
        CfnOutput(
            self,
            f'Lightsail-Database-Name-{stage}',
            value=self.database.relational_database_name,
            description=f'Lightsail database name for {stage}',
            export_name=f'Veraproof-Lightsail-Database-{stage}',
        )
        CfnOutput(
            self,
            f'Lightsail-API-URL-{stage}',
            value=self.api_url,
            description=f'Lightsail API URL for {stage}',
            export_name=f'Veraproof-Lightsail-API-URL-{stage}',
        )
        CfnOutput(
            self,
            f'Lightsail-Database-Endpoint-{stage}',
            value=self.database.attr_database_arn,
            description=f'Lightsail database ARN for {stage}',
            export_name=f'Veraproof-Lightsail-DB-ARN-{stage}',
        )
        CfnOutput(
            self,
            f'Lightsail-Database-Port-{stage}',
            value='5432',
            description=f'Lightsail database port for {stage}',
            export_name=f'Veraproof-Lightsail-DB-Port-{stage}',
        )

        if self.dashboard_url:
            CfnOutput(
                self,
                f'CORS-Dashboard-URL-{stage}',
                value=self.dashboard_url,
                description=f'Dashboard URL for CORS configuration - {stage}',
                export_name=f'Veraproof-CORS-Dashboard-{stage}',
            )
        if self.verification_url:
            CfnOutput(
                self,
                f'CORS-Verification-URL-{stage}',
                value=self.verification_url,
                description=f'Verification URL for CORS configuration - {stage}',
                export_name=f'Veraproof-CORS-Verification-{stage}',
            )
