from typing import Dict, Optional
import re
import logging
from app.database import db_manager
from app.storage import storage_manager

logger = logging.getLogger(__name__)


class BrandingManager:
    """Manages partner branding configuration"""
    
    MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2MB
    ALLOWED_FORMATS = ['image/png', 'image/jpeg', 'image/svg+xml']
    
    def validate_hex_color(self, color: str) -> bool:
        """Validate hex color code"""
        pattern = r'^#[0-9A-Fa-f]{6}$'
        return bool(re.match(pattern, color))
    
    async def upload_logo(
        self,
        tenant_id: str,
        file_data: bytes,
        content_type: str,
        filename: str
    ) -> str:
        """Upload logo to S3, return URL"""
        # Validate file size
        if len(file_data) > self.MAX_LOGO_SIZE:
            raise ValueError(f"Logo file size exceeds {self.MAX_LOGO_SIZE} bytes")
        
        # Validate format
        if content_type not in self.ALLOWED_FORMATS:
            raise ValueError(f"Invalid file format. Allowed: {self.ALLOWED_FORMATS}")
        
        # Store in S3
        s3_key = f"{tenant_id}/branding/{filename}"
        
        try:
            storage_manager.s3_client.put_object(
                Bucket=storage_manager.bucket_name,
                Key=s3_key,
                Body=file_data,
                ContentType=content_type
            )
            
            # Generate URL (in production, this would be CloudFront URL)
            logo_url = f"{storage_manager.s3_client._endpoint.host}/{storage_manager.bucket_name}/{s3_key}"
            
            # Update database
            await self.update_logo_url(tenant_id, logo_url)
            
            logger.info(f"Logo uploaded for tenant {tenant_id}: {logo_url}")
            return logo_url
            
        except Exception as e:
            logger.error(f"Failed to upload logo: {e}")
            raise
    
    async def update_logo_url(self, tenant_id: str, logo_url: str):
        """Update logo URL in database"""
        query = """
            INSERT INTO branding_configs (tenant_id, logo_url)
            VALUES ($1, $2)
            ON CONFLICT (tenant_id)
            DO UPDATE SET logo_url = $2, updated_at = NOW()
        """
        
        await db_manager.execute_query(query, tenant_id, logo_url)
    
    async def update_colors(
        self,
        tenant_id: str,
        primary_color: str,
        secondary_color: str,
        button_color: str
    ):
        """Update branding colors"""
        # Validate hex codes
        if not all([
            self.validate_hex_color(primary_color),
            self.validate_hex_color(secondary_color),
            self.validate_hex_color(button_color)
        ]):
            raise ValueError("Invalid hex color code")
        
        query = """
            INSERT INTO branding_configs (
                tenant_id, primary_color, secondary_color, button_color
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tenant_id)
            DO UPDATE SET
                primary_color = $2,
                secondary_color = $3,
                button_color = $4,
                updated_at = NOW()
        """
        
        await db_manager.execute_query(
            query,
            tenant_id,
            primary_color,
            secondary_color,
            button_color
        )
        
        logger.info(f"Branding colors updated for tenant {tenant_id}")
    
    async def get_branding(self, tenant_id: str) -> Dict:
        """Retrieve branding configuration"""
        query = """
            SELECT logo_url, primary_color, secondary_color, button_color
            FROM branding_configs
            WHERE tenant_id = $1
        """
        
        result = await db_manager.fetch_one(query, tenant_id)
        
        if result:
            return {
                "logo_url": result['logo_url'],
                "primary_color": result['primary_color'],
                "secondary_color": result['secondary_color'],
                "button_color": result['button_color']
            }
        else:
            # Return default branding
            return {
                "logo_url": None,
                "primary_color": "#1E40AF",
                "secondary_color": "#3B82F6",
                "button_color": "#10B981"
            }

    async def reset_branding(self, tenant_id: str):
        """Reset branding to defaults"""
        query = """
            DELETE FROM branding_configs
            WHERE tenant_id = $1
        """
        await db_manager.execute_query(query, tenant_id)
        logger.info(f"Branding reset to defaults for tenant {tenant_id}")


# Global branding manager instance
branding_manager = BrandingManager()
