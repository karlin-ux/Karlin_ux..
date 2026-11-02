import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.test.client import Client

from PIL import Image


def make_image_bytes(fmt="PNG", size=(10, 10)):
    img = Image.new("RGB", size, color="red")
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf.getvalue()


class MediaPermissionTests(TestCase):
    def setUp(self):
        self.c1 = Client(enforce_csrf_checks=False)
        self.c2 = Client(enforce_csrf_checks=False)
        self.c1.post("/api/auth/register/", {"email": "m1@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.c2.post("/api/auth/register/", {"email": "m2@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        # anonymous client
        self.anon = Client(enforce_csrf_checks=False)

    def test_anonymous_cannot_upload(self):
        img = make_image_bytes()
        f = SimpleUploadedFile("t.png", img, content_type="image/png")
        r = self.anon.post("/api/media/upload/", {"file": f})
        self.assertIn(r.status_code, (401, 403))

    def test_valid_image_upload(self):
        img = make_image_bytes()
        f = SimpleUploadedFile("t.png", img, content_type="image/png")
        r = self.c1.post("/api/media/upload/", {"file": f})
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertEqual(data["category"], "image")
        self.assertTrue(any(v["variant_type"] == "thumbnail" for v in data["variants"]))
        # original preserved variant exists
        self.assertTrue(any(v["variant_type"] == "original" for v in data["variants"]))

    def test_cross_workspace_isolation(self):
        img = make_image_bytes()
        f = SimpleUploadedFile("t.png", img, content_type="image/png")
        r = self.c1.post("/api/media/upload/", {"file": f})
        asset_id = r.json()["id"]
        # user2 cannot retrieve
        r2 = self.c2.get(f"/api/media/{asset_id}/")
        self.assertEqual(r2.status_code, 404)
        r3 = self.c2.get(f"/api/media/{asset_id}/file/")
        self.assertIn(r3.status_code, (404, 403))

    def test_model_file_accepted(self):
        f = SimpleUploadedFile("model.glb", b"glTF binary data", content_type="model/gltf-binary")
        r = self.c1.post("/api/media/upload/", {"file": f})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["category"], "model")

    def test_invalid_model_rejected(self):
        f = SimpleUploadedFile("model.glb", b"not a gltf", content_type="model/gltf-binary")
        r = self.c1.post("/api/media/upload/", {"file": f})
        self.assertEqual(r.status_code, 400)

    def test_unsupported_extension_rejected(self):
        f = SimpleUploadedFile("evil.exe", b"MZ...", content_type="application/octet-stream")
        r = self.c1.post("/api/media/upload/", {"file": f})
        self.assertEqual(r.status_code, 400)

    def test_mime_spoofing_rejected(self):
        # png bytes but .jpg extension? extension allowed, but content is png; should still succeed as image? 
        # Test dangerous: html content with image extension
        f = SimpleUploadedFile("x.png", b"<script>alert(1)</script>", content_type="image/png")
        r = self.c1.post("/api/media/upload/", {"file": f})
        self.assertEqual(r.status_code, 400)

    def test_oversized_rejected(self):
        big = b"x" * (11 * 1024 * 1024)
        f = SimpleUploadedFile("big.txt", big, content_type="text/plain")
        r = self.c1.post("/api/media/upload/", {"file": f})
        self.assertEqual(r.status_code, 400)

    def test_corrupted_image_rejected(self):
        f = SimpleUploadedFile("bad.png", b"not an image", content_type="image/png")
        r = self.c1.post("/api/media/upload/", {"file": f})
        self.assertEqual(r.status_code, 400)

    def test_path_traversal_filename_safe(self):
        img = make_image_bytes()
        f = SimpleUploadedFile("../../etc/passwd.png", img, content_type="image/png")
        r = self.c1.post("/api/media/upload/", {"file": f})
        self.assertEqual(r.status_code, 201)
        self.assertNotIn("..", r.json()["original_filename"])

    def test_storage_usage_scoped(self):
        img = make_image_bytes()
        f = SimpleUploadedFile("t.png", img, content_type="image/png")
        self.c1.post("/api/media/upload/", {"file": f})
        r = self.c1.get("/api/media/storage/")
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.json()["asset_count"], 1)
        # user2 storage empty
        r2 = self.c2.get("/api/media/storage/")
        self.assertEqual(r2.json()["asset_count"], 0)

    def test_original_preserved_after_edit(self):
        img = make_image_bytes()
        f = SimpleUploadedFile("t.png", img, content_type="image/png")
        r = self.c1.post("/api/media/upload/", {"file": f})
        aid = r.json()["id"]
        orig_variants = [v for v in r.json()["variants"] if v["variant_type"] == "original"]
        self.assertEqual(len(orig_variants), 1)
        img2 = make_image_bytes(size=(5, 5))
        f2 = SimpleUploadedFile("edited.jpg", img2, content_type="image/jpeg")
        self.c1.post(f"/api/media/{aid}/edit/", {"file": f2})
        r2 = self.c1.get(f"/api/media/{aid}/")
        orig_after = [v for v in r2.json()["variants"] if v["variant_type"] == "original"]
        self.assertEqual(len(orig_after), 1)

    def test_edit_creates_variant(self):
        img = make_image_bytes()
        f = SimpleUploadedFile("t.png", img, content_type="image/png")
        r = self.c1.post("/api/media/upload/", {"file": f})
        aid = r.json()["id"]
        # edited image
        img2 = make_image_bytes(size=(5, 5))
        f2 = SimpleUploadedFile("edited.jpg", img2, content_type="image/jpeg")
        r2 = self.c1.post(f"/api/media/{aid}/edit/", {"file": f2})
        self.assertEqual(r2.status_code, 201)
        self.assertEqual(r2.json()["variant_type"], "edited")

    def test_delete_removes_asset(self):
        img = make_image_bytes()
        f = SimpleUploadedFile("t.png", img, content_type="image/png")
        r = self.c1.post("/api/media/upload/", {"file": f})
        aid = r.json()["id"]
        d = self.c1.delete(f"/api/media/{aid}/")
        self.assertIn(d.status_code, (204, 200))
        r2 = self.c1.get(f"/api/media/{aid}/")
        self.assertEqual(r2.status_code, 404)