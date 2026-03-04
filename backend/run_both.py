import subprocess
import sys
import time
import os

def run():
    print("🚀 Starting dual-port backend...")
    
    # HTTP process
    p1 = subprocess.Popen([
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0", "--port", "8000"
    ])
    
    # HTTPS process
    p2 = subprocess.Popen([
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0", "--port", "8444",
        "--ssl-keyfile", "key.pem",
        "--ssl-certfile", "cert.pem"
    ])
    
    try:
        # Wait for either to exit
        while True:
            if p1.poll() is not None:
                print("HTTP process exited")
                break
            if p2.poll() is not None:
                print("HTTPS process exited")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        p1.terminate()
        p2.terminate()

if __name__ == "__main__":
    run()
