import boto3

from app.config import settings

try:
    s3_client = boto3.client(
        's3',
        endpoint_url=settings.aws_endpoint_url or 'http://localhost:4566',
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )
    bucket_name = settings.s3_bucket_name
    s3_client.put_bucket_cors(
        Bucket=bucket_name,
        CORSConfiguration={
            'CORSRules': [
                {
                    'AllowedHeaders': ['*'],
                    'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                    'AllowedOrigins': ['*'],
                    'ExposeHeaders': ['ETag']
                }
            ]
        }
    )
    print(f"Successfully applied CORS policy to bucket: {bucket_name}")
except Exception as e:
    print(f"Error applying CORS: {e}")

