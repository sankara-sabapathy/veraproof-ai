import boto3
import logging

try:
    s3_client = boto3.client(
        's3',
        endpoint_url='http://localhost:4566',
        aws_access_key_id='test',
        aws_secret_access_key='test',
        region_name='us-east-1'
    )
    bucket_name = 'veraproof-artifacts'
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
