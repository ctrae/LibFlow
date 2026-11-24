import os
import sys
from pathlib import Path

# Dummy values so the app can be imported without a real Supabase project.
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
