#!/usr/bin/env python3
"""
Start FastAPI backend with HTTPS support
Required for mobile browser WebSocket connections
"""

import os
import sys
import subprocess
from pathlib import Path

def generate_self_signed_cert():
    """Generate self-signed SSL certificate for backend"""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        import datetime
        import ipaddress
        
        print("Generating self-signed SSL certificate for backend...")
        
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # Generate certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "California"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "VeraProof AI"),
            x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.DNSName("*.local"),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                x509.IPAddress(ipaddress.IPv4Address("192.168.20.5")),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Write certificate
        cert_path = Path("backend/cert.pem")
        with open(cert_path, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        # Write private key
        key_path = Path("backend/key.pem")
        with open(key_path, "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            ))
        
        print(f"✅ Certificate generated: {cert_path}")
        print(f"✅ Private key generated: {key_path}")
        return True
        
    except ImportError:
        print("❌ cryptography package not installed")
        print("Install with: pip install cryptography")
        return False
    except Exception as e:
        print(f"❌ Error generating certificate: {e}")
        return False

def start_backend_https(port=8443):
    """Start FastAPI backend with HTTPS"""
    cert_path = Path("backend/cert.pem")
    key_path = Path("backend/key.pem")
    
    # Generate certificate if it doesn't exist
    if not cert_path.exists() or not key_path.exists():
        if not generate_self_signed_cert():
            sys.exit(1)
    
    print(f"\n✅ Starting backend with HTTPS on port {port}...")
    print(f"   Access from mobile: https://192.168.20.5:{port}")
    print("\n⚠️  You'll need to accept the self-signed certificate warning")
    print("   Press Ctrl+C to stop\n")
    
    # Start uvicorn with SSL
    cmd = [
        "python", "-m", "uvicorn",
        "app.main:app",
        "--host", "0.0.0.0",
        "--port", str(port),
        "--ssl-keyfile", "key.pem",
        "--ssl-certfile", "cert.pem",
        "--reload"
    ]
    
    try:
        subprocess.run(cmd, cwd="backend")
    except KeyboardInterrupt:
        print("\n\nShutting down backend...")

if __name__ == "__main__":
    start_backend_https()
