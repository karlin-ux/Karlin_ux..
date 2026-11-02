import io

from PIL import Image, ImageOps

from django.conf import settings

from .validators import MAX_IMAGE_DIMENSION, MAX_IMAGE_PIXELS

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


def validate_image_bytes(data: bytes) -> None:
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
    except Exception as e:
        raise ValueError(f"Invalid or corrupted image: {e}")
    # reopen to check dimensions
    img = Image.open(io.BytesIO(data))
    if img.width > MAX_IMAGE_DIMENSION or img.height > MAX_IMAGE_DIMENSION:
        raise ValueError("Image dimensions exceed allowed maximum.")
    if img.width * img.height > MAX_IMAGE_PIXELS:
        raise ValueError("Image too large (decompression bomb protection).")


def process_image(data: bytes) -> dict:
    """Return dict with original/variants as bytes and dimensions."""
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    # convert to RGB for JPEG optimization; keep mode
    original_format = img.format or "PNG"
    # strip exif by not carrying info
    width, height = img.size

    # optimized: resize if > 2000
    optimized = img.copy()
    if optimized.width > 2000 or optimized.height > 2000:
        optimized.thumbnail((2000, 2000))

    # preview 800
    preview = img.copy()
    preview.thumbnail((800, 800))

    # thumbnail 200
    thumb = img.copy()
    thumb.thumbnail((200, 200))

    def to_bytes(image, fmt="JPEG", quality=85):
        buf = io.BytesIO()
        # ensure RGB for jpeg
        if fmt == "JPEG" and image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        image.save(buf, format=fmt, quality=quality, optimize=True)
        buf.seek(0)
        return buf.getvalue()

    # choose format
    fmt = "JPEG" if original_format.upper() in {"JPEG", "JPG"} else "PNG"
    if fmt == "PNG":
        def to_bytes_png(image):
            buf = io.BytesIO()
            image.save(buf, format="PNG", optimize=True)
            buf.seek(0)
            return buf.getvalue()
        to_bytes = to_bytes_png
        mime = "image/png"
    else:
        mime = "image/jpeg"

    original_bytes = to_bytes(img) if False else data  # keep original bytes as uploaded? We'll store original separately
    # We don't re-encode original; keep original data
    return {
        "width": width,
        "height": height,
        "mime_type": _mime_for_ext(fmt),
        "variants": {
            "thumbnail": (to_bytes(thumb), thumb.size, mime),
            "preview": (to_bytes(preview), preview.size, mime),
            "optimized": (to_bytes(optimized), optimized.size, mime),
        },
    }


def _mime_for_ext(fmt):
    return "image/jpeg" if fmt == "JPEG" else "image/png"


def edit_image(data: bytes, operations: dict) -> bytes:
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    # rotate
    angle = operations.get("rotate", 0)
    if angle:
        img = img.rotate(-angle, expand=True)
    # flip
    if operations.get("flip_h"):
        img = ImageOps.mirror(img)
    if operations.get("flip_v"):
        img = ImageOps.flip(img)
    # crop: x,y,w,h
    crop = operations.get("crop")
    if crop:
        x, y, w, h = crop
        img = img.crop((x, y, x + w, y + h))
    # resize
    resize = operations.get("resize")
    if resize:
        rw, rh = resize
        img = img.resize((rw, rh))
    # brightness/contrast/saturation
    from PIL import ImageEnhance
    b = operations.get("brightness", 1.0)
    c = operations.get("contrast", 1.0)
    s = operations.get("saturation", 1.0)
    if b != 1.0:
        img = ImageEnhance.Brightness(img).enhance(b)
    if c != 1.0:
        img = ImageEnhance.Contrast(img).enhance(c)
    if s != 1.0:
        img = ImageEnhance.Color(img).enhance(s)

    buf = io.BytesIO()
    fmt = "JPEG" if img.mode in ("RGB", "L") else "PNG"
    if fmt == "JPEG":
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        img.save(buf, format="JPEG", quality=90, optimize=True)
        mime = "image/jpeg"
    else:
        img.save(buf, format="PNG", optimize=True)
        mime = "image/png"
    buf.seek(0)
    return buf.getvalue(), mime, img.size