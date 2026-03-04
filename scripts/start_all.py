#!/usr/bin/env python3
import os
import sys
import socket
import subprocess
import time
from pathlib import Path

# ----------------- CONFIGURATION -----------------
PORTS = {
    'BACKEND': 8100,      # Docker-managed, HTTP
    'BACKEND_HTTPS': 8444,# Docker-managed, HTTPS
    'DASHBOARD': 8200,    # Angular, HTTP
    'VERIFICATION': 8300  # VanillaJS, HTTPS
}

processes = []
project_root = Path(__file__).parent.parent

def get_local_ip():
    """Get the active local IP address of the machine on the network."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't have to be reachable, just forces the OS to use the default outgoing interface
        s.connect(('8.8.8.8', 1))
        local_ip = s.getsockname()[0]
    except Exception:
        local_ip = '127.0.0.1'
    finally:
        s.close()
    return local_ip

def update_env_files(local_ip):
    """Dynamically overwrite the configuration files with the local IP and ports."""
    print(f"🔄 Configuring environment files for IP: {local_ip}...")
    
    # 1. Update Backend .env
    backend_env_path = project_root / "backend" / ".env"
    if backend_env_path.exists():
        env_content = backend_env_path.read_text()
        new_env = []
        for line in env_content.splitlines():
            if line.startswith("BACKEND_URL="):
                new_env.append(f"BACKEND_URL=https://{local_ip}:{PORTS['BACKEND']}")
            elif line.startswith("FRONTEND_VERIFICATION_URL="):
                new_env.append(f"FRONTEND_VERIFICATION_URL=https://{local_ip}:{PORTS['VERIFICATION']}")
            elif line.startswith("FRONTEND_DASHBOARD_URL="):
                new_env.append(f"FRONTEND_DASHBOARD_URL=http://{local_ip}:{PORTS['DASHBOARD']}")
            else:
                new_env.append(line)
        backend_env_path.write_text("\n".join(new_env))

    # 2. Update Partner Dashboard environment.ts
    dash_env_path = project_root / "partner-dashboard" / "src" / "environments" / "environment.ts"
    if dash_env_path.exists():
        dash_env_content = dash_env_path.read_text()
        import re
        dash_env_content = re.sub(
            r"apiUrl:\s*'.*'", 
            f"apiUrl: 'http://{local_ip}:{PORTS['BACKEND']}'", 
            dash_env_content
        )
        dash_env_path.write_text(dash_env_content)
        
    # 3. Update Verification Interface config.js
    vi_config_path = project_root / "verification-interface" / "config.js"
    if vi_config_path.exists():
        # Cleanly override the apiUrl
        content = f"""window.VERAPROOF_CONFIG = {{
  apiUrl: 'https://{local_ip}:{PORTS['BACKEND_HTTPS']}',
  environment: 'development',
  version: 'local-dev'
}};
window.VERAPROOF_API_URL = window.VERAPROOF_CONFIG.apiUrl;
"""
        vi_config_path.write_text(content)

def generate_ssl_certs(local_ip):
    """Generate self-signed SSL certs for the backend and verification interface if they don't exist"""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        import datetime
        import ipaddress
        
        # We will share the same cert between backend and verification-interface
        backend_cert = project_root / "backend" / "cert.pem"
        backend_key = project_root / "backend" / "key.pem"
        
        # If it already exists and has the right IP, we could skip it, but let's just create it to be safe
        print(f"🔒 Generating self-signed SSL certificate for {local_ip}...")
        
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "VeraProof AI Development")
        ])
        
        cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(
            private_key.public_key()
        ).serial_number(x509.random_serial_number()).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                x509.IPAddress(ipaddress.IPv4Address(local_ip)),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Save to Backend
        with open(backend_cert, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        with open(backend_key, "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            ))
            
        # Copy to Verification Interface
        import shutil
        vi_cert = project_root / "verification-interface" / "cert.pem"
        vi_key = project_root / "verification-interface" / "key.pem"
        shutil.copy2(backend_cert, vi_cert)
        shutil.copy2(backend_key, vi_key)
        
    except ImportError:
        print("❌ cryptography package missing! Trying to run pip install cryptography...")
        subprocess.run([sys.executable, "-m", "pip", "install", "cryptography"], check=True)
        generate_ssl_certs(local_ip) # Retry

def start_docker():
    """Start all 3 Docker containers (postgres, localstack, backend)"""
    print("🐳 Starting Docker containers (postgres, localstack, backend)...")
    try:
        # Re-build ensuring the backend picks up certs/env
        subprocess.run(
            'docker-compose up -d --build',
            cwd=project_root,
            shell=True,
            check=True
        )
    except Exception as e:
        print(f"❌ Failed to start docker: {e}")
        sys.exit(1)

def start_partner_dashboard(local_ip):
    """Start the Angular dashboard on port 8200 HTTP"""
    print(f"🎨 Starting Partner Dashboard on http://{local_ip}:{PORTS['DASHBOARD']}")
    cwd = project_root / "partner-dashboard"
    
    # Check if node_modules exists
    if not (cwd / 'node_modules').exists():
        print("   📦 Installing frontend dependencies...")
        subprocess.run('npm install', cwd=cwd, shell=True, check=True)

    cmd = f'npx ng serve --host 0.0.0.0 --port {PORTS["DASHBOARD"]}'
    p = subprocess.Popen(cmd, cwd=cwd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    processes.append(p)

def serve_verification_interface_https_server(port):
    import http.server
    import ssl
    
    interface_dir = project_root / "verification-interface"
    os.chdir(interface_dir)
    
    httpd = http.server.HTTPServer(('0.0.0.0', port), http.server.SimpleHTTPRequestHandler)
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
    httpd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()

def start_verification_interface(local_ip):
    """Start Verification Interface on HTTPS port 8300 using local python process"""
    print(f"📱 Starting Verification Interface on https://{local_ip}:{PORTS['VERIFICATION']}")
    
    from multiprocessing import Process
    p = Process(target=serve_verification_interface_https_server, args=(PORTS['VERIFICATION'],))
    p.start()
    return p

def run():
    print("="*60)
    print("🚀 VeraProof AI - Starting Unified Test Environment")
    print("="*60)
    
    # 1. IP and Env
    local_ip = get_local_ip()
    update_env_files(local_ip)
    
    # 2. SSL
    generate_ssl_certs(local_ip)
    
    # 3. Core Docker Services (DB, S3, Backend)
    start_docker()
    
    # 4. Frontends
    start_partner_dashboard(local_ip)
    vi_process = start_verification_interface(local_ip)
    processes.append(vi_process)
    
    # 5. Summary
    print("\n" + "="*60)
    print("✅ All systems go! Access your interfaces at:")
    print(f"   [Backend API (HTTP)]     http://{local_ip}:{PORTS['BACKEND']}/docs")
    print(f"   [Backend API (HTTPS)]    https://{local_ip}:{PORTS['BACKEND_HTTPS']}/docs")
    print(f"   [Partner Dashboard]      http://{local_ip}:{PORTS['DASHBOARD']}")
    print(f"   [Verification Interface] https://{local_ip}:{PORTS['VERIFICATION']}  👈 (Open on mobile)")
    print("="*60)
    print("\nPress Ctrl+C exactly once to cleanly stop all services.")
    
    try:
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Terminating services...")
        # Kill the child processes (npm and python http)
        for p in processes:
            p.terminate()
            
        print("🐳 Stopping Docker containers...")
        subprocess.run('docker-compose stop', cwd=project_root, shell=True)
        print("✅ Environment stopped nicely.")
        sys.exit(0)

if __name__ == "__main__":
    run()
