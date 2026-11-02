import os

from django.conf import settings
from django.core.exceptions import ValidationError

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".pdf", ".txt", ".csv", ".md",
    ".mp4", ".webm", ".mov",
    ".glb", ".gltf",
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

DANGEROUS_EXTENSIONS = {
    ".exe", ".sh", ".bat", ".cmd", ".com", ".scr", ".js", ".html", ".htm",
    ".php", ".py", ".rb", ".pl", ".svg",  # svg can contain scripts
}

MAX_UPLOAD_SIZE = getattr(settings, "MEDIA_MAX_UPLOAD_SIZE", 10 * 1024 * 1024)
MAX_IMAGE_PIXELS = 50_000_000
MAX_IMAGE_DIMENSION = 8000


def validate_extension(filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    if ext in DANGEROUS_EXTENSIONS:
        raise ValidationError("File type not allowed.")
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError("Unsupported file extension.")
    return ext


def validate_file_size(size: int) -> None:
    if size <= 0:
        raise ValidationError("Empty file.")
    if size > MAX_UPLOAD_SIZE:
        raise ValidationError(f"File exceeds maximum size of {MAX_UPLOAD_SIZE} bytes.")


def sanitize_filename(filename: str) -> str:
    name = os.path.basename(filename or "")
    # remove path separators and control chars
    name = name.replace("/", "").replace("\\", "")
    name = "".join(c for c in name if c.isprintable() and c not in "<>:\"|?*")
    if not name or name in {".", ".."}:
        name = "upload"
    if len(name) > 200:
        name = name[:200]
    return name


def category_for_extension(ext: str) -> str:
    ext = ext.lower()
    if ext in IMAGE_EXTENSIONS:
        return "image"
    if ext in {".mp4", ".webm", ".mov"}:
        return "video"
    if ext in {".pdf", ".txt", ".csv", ".md"}:
        return "document"
    if ext in {".glb", ".gltf"}:
        return "model"
    return "other"