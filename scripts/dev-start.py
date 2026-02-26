#!/usr/bin/env python3
"""
VeraProof AI - Unified Development Environment Startup Script
Starts all services required for local development with HTTPS support
"""

import os
import sys
import subprocess
import time
import signal
from pathlib import Path
from typing import List, Dict

# Load port configuration
PORTS = {
    'BACKEND_HTTP_PORT': '8100',
    'BACKEND_HTTPS_PORT': '8443',
    'PARTNER_DASHBOARD_PORT': '8200',
    'VERIFICATION_INTERFACE_PORT': '8300',
    'POSTGRES_PORT': '5432',
    'LOCALSTACK_PORT': '4566'
}

class ServiceManager:
    def __init__(self):
        self.processes: List[subprocess.Popen] = []
        self.project_root = Path(__file__).parent.parent
        
    def load_env_ports(self):
        """Load port configuration from .env.ports"""
        env_ports_file = self.project_root / '.env.ports'
        if env_ports_file.exists():
            with open(env_ports_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        PORTS[key.strip()] = value.strip()
        
        # Set environment variables
        for key, value in PORTS.items():
            os.environ[key] = value
    
    def check_prerequisites(self):
        """Check if required tools are installed"""
        print("🔍 Checking prerequisites...")
        
        required_tools = {
            'docker': 'Docker',
            'docker-compose': 'Docker Compose',
            'node': 'Node.js',
            'python': 'Python'
        }
        
        missing = []
        for cmd, name in required_tools.items():
            try:
                subprocess.run([cmd, '--version'], 
                             capture_output=True, 
                             check=True)
                print(f"  ✅ {name} found")
            except (subprocess.CalledProcessError, FileNotFoundError):
                print(f"  ❌ {name} not found")
                missing.append(name)
        
        if missing:
            print(f"\n❌ Missing required tools: {', '.join(missing)}")
            print("Please install them before continuing.")
            return False
        
        print("✅ All prerequisites met\n")
        return True
    
    def start_docker_services(self):
        """Start PostgreSQL and LocalStack via Docker Compose"""
        print("🐳 Starting Docker services (PostgreSQL, LocalStack)...")
        
        try:
            # Start only infrastructure services - use shell=True for Windows
            subprocess.run(
                'docker-compose up -d postgres localstack',
                cwd=self.project_root,
                check=True,
                shell=True
            )
            print("✅ Docker services started")
            print(f"   - PostgreSQL: localhost:{PORTS['POSTGRES_PORT']}")
            print(f"   - LocalStack: localhost:{PORTS['LOCALSTACK_PORT']}\n")
            
            # Wait for services to be healthy
            print("⏳ Waiting for services to be ready...")
            time.sleep(5)
            
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to start Docker services: {e}")
            return False
    
    def start_backend_http(self):
        """Start FastAPI backend with HTTP"""
        print(f"🚀 Starting Backend API (HTTP on port {PORTS['BACKEND_HTTP_PORT']})...")
        
        backend_dir = self.project_root / 'backend'
        
        # Start uvicorn with HTTP
        cmd = f'{sys.executable} -m uvicorn app.main:app --host 0.0.0.0 --port {PORTS["BACKEND_HTTP_PORT"]} --reload'
        
        try:
            process = subprocess.Popen(
                cmd,
                cwd=backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                shell=True
            )
            self.processes.append(process)
            print(f"✅ Backend API started")
            print(f"   - HTTP: http://localhost:{PORTS['BACKEND_HTTP_PORT']}")
            print(f"   - Docs: http://localhost:{PORTS['BACKEND_HTTP_PORT']}/docs\n")
            
            # Give it a moment to start
            time.sleep(2)
            return True
        except Exception as e:
            print(f"❌ Failed to start backend: {e}")
            return False
    
    def start_partner_dashboard(self):
        """Start Angular Partner Dashboard"""
        print(f"🎨 Starting Partner Dashboard (port {PORTS['PARTNER_DASHBOARD_PORT']})...")
        
        dashboard_dir = self.project_root / 'partner-dashboard'
        
        # Check if node_modules exists
        if not (dashboard_dir / 'node_modules').exists():
            print("   📦 Installing dependencies...")
            try:
                # Use shell=True on Windows to find npm in PATH
                subprocess.run(
                    'npm install', 
                    cwd=dashboard_dir, 
                    check=True,
                    shell=True
                )
            except subprocess.CalledProcessError:
                print("   ❌ Failed to install dependencies")
                return False
        
        # Use shell=True on Windows to find npm in PATH
        cmd = 'npm start'
        
        try:
            process = subprocess.Popen(
                cmd,
                cwd=dashboard_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                shell=True
            )
            self.processes.append(process)
            print(f"✅ Partner Dashboard started")
            print(f"   - URL: http://localhost:{PORTS['PARTNER_DASHBOARD_PORT']}\n")
            
            time.sleep(2)
            return True
        except Exception as e:
            print(f"❌ Failed to start Partner Dashboard: {e}")
            return False
    
    def start_verification_interface(self):
        """Start Verification Interface (Vanilla JS with HTTP server)"""
        print(f"📱 Starting Verification Interface (port {PORTS['VERIFICATION_INTERFACE_PORT']})...")
        
        interface_dir = self.project_root / 'verification-interface'
        
        # Use Python's built-in HTTP server with shell=True for Windows compatibility
        cmd = f'{sys.executable} -m http.server {PORTS["VERIFICATION_INTERFACE_PORT"]} --directory {interface_dir}'
        
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                shell=True
            )
            self.processes.append(process)
            print(f"✅ Verification Interface started")
            print(f"   - URL: http://localhost:{PORTS['VERIFICATION_INTERFACE_PORT']}\n")
            
            time.sleep(1)
            return True
        except Exception as e:
            print(f"❌ Failed to start Verification Interface: {e}")
            return False
    
    def print_summary(self):
        """Print summary of all running services"""
        print("\n" + "="*60)
        print("🎉 VeraProof AI Development Environment Ready!")
        print("="*60)
        print("\n📋 Service URLs:")
        print(f"   Backend API (HTTP):       http://localhost:{PORTS['BACKEND_HTTP_PORT']}")
        print(f"   Backend API Docs:         http://localhost:{PORTS['BACKEND_HTTP_PORT']}/docs")
        print(f"   Partner Dashboard:        http://localhost:{PORTS['PARTNER_DASHBOARD_PORT']}")
        print(f"   Verification Interface:   http://localhost:{PORTS['VERIFICATION_INTERFACE_PORT']}")
        print(f"   PostgreSQL:               localhost:{PORTS['POSTGRES_PORT']}")
        print(f"   LocalStack (S3):          http://localhost:{PORTS['LOCALSTACK_PORT']}")
        
        print("\n⚠️  Notes:")
        print("   - Press Ctrl+C to stop all services")
        print("   - Logs are displayed in real-time below")
        print("\n" + "="*60 + "\n")
    
    def cleanup(self):
        """Stop all running processes"""
        print("\n\n🛑 Shutting down services...")
        
        # Terminate all processes
        for process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
            except Exception:
                pass
        
        # Stop Docker services
        try:
            subprocess.run(
                'docker-compose down',
                cwd=self.project_root,
                check=True,
                capture_output=True,
                shell=True
            )
            print("✅ Docker services stopped")
        except subprocess.CalledProcessError:
            pass
        except Exception:
            pass
        
        print("✅ All services stopped")
    
    def run(self):
        """Main execution flow"""
        try:
            # Load port configuration
            self.load_env_ports()
            
            # Check prerequisites
            if not self.check_prerequisites():
                return 1
            
            # Start services in order
            if not self.start_docker_services():
                return 1
            
            if not self.start_backend_http():
                self.cleanup()
                return 1
            
            if not self.start_partner_dashboard():
                self.cleanup()
                return 1
            
            if not self.start_verification_interface():
                self.cleanup()
                return 1
            
            # Print summary
            self.print_summary()
            
            # Keep running and show logs
            print("📝 Service Logs:\n")
            while True:
                for process in self.processes:
                    if process.poll() is not None:
                        print(f"\n⚠️  A service has stopped unexpectedly")
                        self.cleanup()
                        return 1
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n\n⏸️  Received shutdown signal...")
            self.cleanup()
            return 0
        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")
            self.cleanup()
            return 1

if __name__ == '__main__':
    manager = ServiceManager()
    sys.exit(manager.run())
