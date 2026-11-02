import hashlib
import os
import uuid
from pathlib import Path

from django.conf import settings


MEDIA_ROOT = Path(settings.MEDIA_ROOT)
PRIVATE_ROOT = MEDIA_ROOT / "private"


def _safe_relative(path: str) -> str:
    # normalize and reject traversal
    p = path.replace("\\", "/")
    if ".." in p.split("/"):
        raise ValueError("Invalid storage path")
    if p.startswith("/") or p.startswith("\\"):
        raise ValueError("Invalid storage path")
    # resolve within PRIVATE_ROOT
    full = (PRIVATE_ROOT / p).resolve()
    if PRIVATE_ROOT.resolve() not in full.parents and full != PRIVATE_ROOT.resolve():
        raise ValueError("Path traversal detected")
    return p


def workspace_dir(workspace_id) -> str:
    return f"workspaces/{workspace_id}"


def generate_storage_path(workspace_id, original_filename: str) -> str:
    ext = _safe_extension(original_filename)
    name = f"{uuid.uuid4().hex}{ext}"
    return f"workspaces/{workspace_id}/{name}"


def _safe_extension(filename: str) -> str:
    name = os.path.basename(filename or "")
    _, ext = os.path.splitext(name)
    ext = ext.lower()
    # allow only known extensions
    allowed = {
        ".jpg", ".jpeg", ".png", ".gif", ".webp",
        ".pdf", ".txt", ".csv", ".md",
        ".mp4", ".webm", ".mov",
    }
    if ext not in allowed:
        ext = ""
    return ext


def absolute_path(relative_path: str) -> Path:
    rel = _safe_relative(relative_path)
    return PRIVATE_ROOT / rel


def save_bytes(relative_path: str, data: bytes) -> int:
    full = absolute_path(relative_path)
    full.parent.mkdir(parents=True, exist_ok=True)
    with open(full, "wb") as f:
        f.write(data)
    return len(data)


def save_fileobj(relative_path: str, fileobj, chunk_size: int = 65536) -> int:
    full = absolute_path(relative_path)
    full.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    with open(full, "wb") as f:
        for chunk in iter(lambda: fileobj.read(chunk_size), b""):
            f.write(chunk)
            size += len(chunk)
    return size


def delete_file(relative_path: str) -> None:
    try:
        full = absolute_path(relative_path)
        if full.exists():
            full.unlink()
    except ValueError:
        pass


def file_exists(relative_path: str) -> bool:
    try:
        return absolute_path(relative_path).exists()
    except ValueError:
        return False


def compute_checksum(fileobj) -> str:
    h = hashlib.sha256()
    for chunk in iter(lambda: fileobj.read(65536), b""):
        h.update(chunk)
    fileobj.seek(0)
    return h.hexdigest()