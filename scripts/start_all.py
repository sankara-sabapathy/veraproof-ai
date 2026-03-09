#!/usr/bin/env python3
import datetime as dt
import functools
import http.server
import ipaddress
import os
import shutil
import socket
import ssl
import subprocess
import sys
import time
from multiprocessing import Process
from pathlib import Path

# ----------------- CONFIGURATION -----------------
PORTS = {
    "BACKEND": 8100,
    "BACKEND_HTTPS": 8444,
    "DASHBOARD": 8200,
    "VERIFICATION": 8300,
}

processes = []


def _normalize_windows_path(path: Path) -> Path:
    """Return a cmd-compatible path on Windows (strip long-path prefixes)."""
    normalized = str(path)
    if os.name == "nt":
        if normalized.startswith("\\\\?\\UNC\\"):
            normalized = "\\\\" + normalized[8:]
        elif normalized.startswith("\\\\?\\"):
            normalized = normalized[4:]
    return Path(normalized)


project_root = _normalize_windows_path(Path(__file__).resolve().parent.parent)


def _run_compose(compose_args, *, check=True):
    """Run docker compose with compatibility fallback."""
    commands = [
        ["docker", "compose", *compose_args],
        ["docker-compose", *compose_args],
    ]

    errors = []
    for command in commands:
        try:
            return subprocess.run(command, cwd=str(project_root), check=check)
        except FileNotFoundError as exc:
            errors.append(f"{' '.join(command)}: {exc}")
            continue
        except subprocess.CalledProcessError as exc:
            # Fall back to docker-compose if docker compose plugin is unavailable.
            if command[:2] == ["docker", "compose"]:
                errors.append(f"{' '.join(command)}: {exc}")
                continue
            raise

    if errors:
        raise RuntimeError("; ".join(errors))
    raise RuntimeError("Unable to execute docker compose command")


def _resolve_command(command_name: str) -> str:
    """Resolve executable paths consistently on Windows and Unix."""
    candidates = [command_name]
    if os.name == "nt" and not command_name.lower().endswith(".cmd"):
        candidates.insert(0, f"{command_name}.cmd")

    for candidate in candidates:
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    raise FileNotFoundError(f"Unable to find required command: {command_name}")


def get_local_ip():
    """Get the active local IP address of the machine on the network."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not have to be reachable; forces the OS to choose default interface.
        s.connect(("8.8.8.8", 1))
        local_ip = s.getsockname()[0]
    except Exception:
        local_ip = "127.0.0.1"
    finally:
        s.close()
    return local_ip


def update_env_files(local_ip):
    """Dynamically overwrite config files with current IP and ports."""
    print(f"Configuring environment files for IP: {local_ip}...")

    backend_env_path = project_root / "backend" / ".env"
    if backend_env_path.exists():
        env_content = backend_env_path.read_text(encoding="utf-8")
        new_env = []
        for line in env_content.splitlines():
            if line.startswith("BACKEND_URL="):
                new_env.append(f"BACKEND_URL=https://{local_ip}:{PORTS['BACKEND']}")
            elif line.startswith("FRONTEND_VERIFICATION_URL="):
                new_env.append(f"FRONTEND_VERIFICATION_URL=https://{local_ip}:{PORTS['VERIFICATION']}")
            elif line.startswith("FRONTEND_DASHBOARD_URL="):
                new_env.append(f"FRONTEND_DASHBOARD_URL=http://{local_ip}:{PORTS['DASHBOARD']}")
            elif line.startswith("CORS_ORIGINS="):
                origins = [
                    "http://localhost:3000",
                    "http://localhost:4200",
                    f"http://localhost:{PORTS['BACKEND']}",
                    f"http://localhost:{PORTS['DASHBOARD']}",
                    f"http://127.0.0.1:{PORTS['BACKEND']}",
                    f"http://127.0.0.1:{PORTS['DASHBOARD']}",
                    f"https://localhost:{PORTS['VERIFICATION']}",
                    f"https://localhost:{PORTS['BACKEND_HTTPS']}",
                    f"https://127.0.0.1:{PORTS['VERIFICATION']}",
                    f"https://127.0.0.1:{PORTS['BACKEND_HTTPS']}",
                    f"http://{local_ip}:{PORTS['BACKEND']}",
                    f"https://{local_ip}:{PORTS['BACKEND_HTTPS']}",
                    f"https://{local_ip}:{PORTS['VERIFICATION']}",
                    f"http://{local_ip}:{PORTS['DASHBOARD']}",
                ]
                new_env.append(f"CORS_ORIGINS={','.join(origins)}")
            else:
                new_env.append(line)
        backend_env_path.write_text("\n".join(new_env), encoding="utf-8")

    cors_origins = ",".join(
        [
            "http://localhost:3000",
            "http://localhost:4200",
            f"http://localhost:{PORTS['BACKEND']}",
            f"http://localhost:{PORTS['DASHBOARD']}",
            f"http://127.0.0.1:{PORTS['BACKEND']}",
            f"http://127.0.0.1:{PORTS['DASHBOARD']}",
            f"https://localhost:{PORTS['VERIFICATION']}",
            f"https://localhost:{PORTS['BACKEND_HTTPS']}",
            f"https://127.0.0.1:{PORTS['VERIFICATION']}",
            f"https://127.0.0.1:{PORTS['BACKEND_HTTPS']}",
            f"http://{local_ip}:{PORTS['BACKEND']}",
            f"https://{local_ip}:{PORTS['BACKEND_HTTPS']}",
            f"https://{local_ip}:{PORTS['VERIFICATION']}",
            f"http://{local_ip}:{PORTS['DASHBOARD']}",
        ]
    )
    root_env_path = project_root / ".env"
    root_env_lines = []
    if root_env_path.exists():
        for line in root_env_path.read_text(encoding="utf-8").splitlines():
            if not line.startswith("CORS_ORIGINS="):
                root_env_lines.append(line)
    root_env_lines.append(f"CORS_ORIGINS={cors_origins}")
    root_env_path.write_text("\n".join(root_env_lines) + "\n", encoding="utf-8")

    vi_config_path = project_root / "verification-interface" / "config.js"
    if vi_config_path.exists():
        content = (
            "window.VERAPROOF_CONFIG = {\n"
            f"  apiUrl: 'https://{local_ip}:{PORTS['BACKEND_HTTPS']}',\n"
            "  environment: 'development',\n"
            "  version: 'local-dev'\n"
            "};\n"
            "window.VERAPROOF_API_URL = window.VERAPROOF_CONFIG.apiUrl;\n"
        )
        vi_config_path.write_text(content, encoding="utf-8")


def generate_ssl_certs(local_ip):
    """Generate self-signed certs for backend and verification interface."""
    backend_cert = project_root / "backend" / "cert.pem"
    backend_key = project_root / "backend" / "key.pem"
    vi_cert = project_root / "verification-interface" / "cert.pem"
    vi_key = project_root / "verification-interface" / "key.pem"

    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.x509.oid import NameOID
    except ImportError:
        print("cryptography package missing. Installing...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "cryptography"], check=True)
            from cryptography import x509
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.x509.oid import NameOID
        except Exception:
            if backend_cert.exists() and backend_key.exists():
                print("Using existing SSL certificates because cryptography install failed.")
                shutil.copy2(backend_cert, vi_cert)
                shutil.copy2(backend_key, vi_key)
                return
            raise RuntimeError(
                "cryptography is not installed and certificate generation failed. "
                "Install cryptography or provide backend/cert.pem and backend/key.pem."
            )

    print(f"Generating self-signed SSL certificate for {local_ip}...")

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([x509.NameAttribute(NameOID.ORGANIZATION_NAME, "VeraProof AI Development")])
    now_utc = dt.datetime.now(dt.UTC)

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now_utc)
        .not_valid_after(now_utc + dt.timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName(
                [
                    x509.DNSName("localhost"),
                    x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                    x509.IPAddress(ipaddress.IPv4Address(local_ip)),
                ]
            ),
            critical=False,
        )
        .sign(private_key, hashes.SHA256())
    )

    backend_cert.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    backend_key.write_bytes(
        private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

    shutil.copy2(backend_cert, vi_cert)
    shutil.copy2(backend_key, vi_key)


def start_docker():
    """Start docker services (postgres, localstack, backend)."""
    print("Starting Docker containers (postgres, localstack, backend)...")
    try:
        _run_compose(["up", "-d", "--build"], check=True)
    except Exception as exc:
        print(f"Failed to start docker: {exc}")
        sys.exit(1)


def start_partner_dashboard(local_ip):
    """Start Angular dashboard on port 8200."""
    print(f"Starting Partner Dashboard on http://{local_ip}:{PORTS['DASHBOARD']}")
    cwd = project_root / "partner-dashboard"
    npm_executable = _resolve_command("npm")
    node_executable = _resolve_command("node")
    ng_cli = cwd / "node_modules" / "@angular" / "cli" / "bin" / "ng.js"

    if not (cwd / "node_modules").exists():
        print("Installing frontend dependencies...")
        subprocess.run([npm_executable, "install"], cwd=str(cwd), check=True)

    if not ng_cli.exists():
        raise FileNotFoundError(f"Angular CLI entrypoint not found: {ng_cli}")

    cmd = [node_executable, str(ng_cli), "serve", "--host", "0.0.0.0", "--port", str(PORTS["DASHBOARD"])]
    process = subprocess.Popen(cmd, cwd=str(cwd), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    processes.append(process)


def serve_verification_interface_https_server(port):
    interface_dir = project_root / "verification-interface"
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(interface_dir))
    httpd = http.server.ThreadingHTTPServer(("0.0.0.0", port), handler)
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(certfile=str(interface_dir / "cert.pem"), keyfile=str(interface_dir / "key.pem"))
    httpd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()


def start_verification_interface(local_ip):
    """Start verification interface on HTTPS port 8300."""
    print(f"Starting Verification Interface on https://{local_ip}:{PORTS['VERIFICATION']}")
    process = Process(target=serve_verification_interface_https_server, args=(PORTS["VERIFICATION"],))
    process.start()
    return process


def run():
    print("=" * 60)
    print("VeraProof AI - Starting Unified Test Environment")
    print("=" * 60)

    local_ip = get_local_ip()
    update_env_files(local_ip)
    generate_ssl_certs(local_ip)
    start_docker()

    start_partner_dashboard(local_ip)
    vi_process = start_verification_interface(local_ip)
    processes.append(vi_process)

    print("\n" + "=" * 60)
    print("All systems go. Access your interfaces at:")
    print(f"  [Backend API (HTTP)]     http://{local_ip}:{PORTS['BACKEND']}/docs")
    print(f"  [Backend API (HTTPS)]    https://{local_ip}:{PORTS['BACKEND_HTTPS']}/docs")
    print(f"  [Partner Dashboard]      http://{local_ip}:{PORTS['DASHBOARD']}")
    print(f"  [Verification Interface] https://{local_ip}:{PORTS['VERIFICATION']}")
    print("=" * 60)
    print("\nPress Ctrl+C once to stop all services.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nTerminating services...")
        for process in processes:
            process.terminate()

        print("Stopping Docker containers...")
        try:
            _run_compose(["stop"], check=False)
        except Exception as exc:
            print(f"Failed to stop docker containers cleanly: {exc}")

        print("Environment stopped.")
        sys.exit(0)


if __name__ == "__main__":
    run()
