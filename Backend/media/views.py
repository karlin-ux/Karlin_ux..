import os

from django.conf import settings
from django.http import FileResponse, Http404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from accounts.models import Workspace
from .models import MediaAsset, MediaProcessingJob, MediaVariant, WorkspaceStorageUsage
from .processing import process_image, validate_image_bytes
from .serializers import MediaAssetSerializer, MediaAssetUpdateSerializer, MediaVariantSerializer
from .storage import (
    absolute_path, compute_checksum, delete_file, file_exists, generate_storage_path,
    save_bytes, save_fileobj,
)
from .validators import (
    category_for_extension, sanitize_filename, validate_extension, validate_file_size,
)


def _user_workspace(user):
    if user.is_superadmin:
        return None
    return Workspace.objects.filter(owner=user).first()


class MediaAssetViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MediaAssetSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        ws = _user_workspace(self.request.user)
        if ws is None:
            return MediaAsset.objects.none()
        return MediaAsset.objects.filter(workspace=ws)

    def get_serializer_class(self):
        if self.action in {"partial_update", "update"}:
            return MediaAssetUpdateSerializer
        return MediaAssetSerializer

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        return Response(MediaAssetSerializer(obj).data)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = MediaAssetUpdateSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(MediaAssetSerializer(obj).data)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        # delete files
        delete_file(obj.storage_path)
        for v in obj.variants.all():
            delete_file(v.storage_path)
        obj.delete()
        _recalc_storage(obj.workspace)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="upload")
    def upload(self, request):
        ws = _user_workspace(request.user)
        if ws is None:
            return Response({"detail": "No workspace."}, status=403)
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "No file provided."}, status=400)

        original_name = sanitize_filename(upload.name)
        try:
            ext = validate_extension(original_name)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)
        try:
            validate_file_size(upload.size)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        category = category_for_extension(ext)

        # checksum
        checksum = compute_checksum(upload)
        upload.seek(0)

        storage_path = generate_storage_path(ws.id, original_name)

        # For images, validate and process
        width = height = None
        processing_job = None
        asset = MediaAsset.objects.create(
            workspace=ws,
            owner=request.user,
            original_filename=original_name,
            storage_path=storage_path,
            mime_type=getattr(upload, "content_type", "") or "",
            file_size=upload.size,
            category=category,
            checksum=checksum,
        )
        processing_job = MediaProcessingJob.objects.create(asset=asset, job_type="upload", status="processing")

        try:
            if category == "image":
                # read bytes for validation/processing
                data = upload.read()
                validate_image_bytes(data)
                upload.seek(0)
                info = process_image(data)
                width, height = info["width"], info["height"]
                asset.file_size = len(data)
                asset.width = width
                asset.height = height
                asset.mime_type = info["mime_type"]
                # original variant
                orig_path = generate_storage_path(ws.id, original_name)
                save_bytes(orig_path, data)
                asset.storage_path = orig_path
                # variants
                for vtype, (vbytes, vsize_dim, vmime) in info["variants"].items():
                    vpath = generate_storage_path(ws.id, original_name)
                    save_bytes(vpath, vbytes)
                    MediaVariant.objects.create(
                        asset=asset,
                        variant_type=vtype,
                        storage_path=vpath,
                        mime_type=vmime,
                        file_size=len(vbytes),
                        width=vsize_dim[0],
                        height=vsize_dim[1],
                    )
                MediaVariant.objects.create(
                    asset=asset,
                    variant_type="original",
                    storage_path=asset.storage_path,
                    mime_type=info["mime_type"],
                    file_size=len(data),
                    width=width,
                    height=height,
                )
            else:
                # save file stream
                size = save_fileobj(storage_path, upload)
                asset.file_size = size
                # mime from extension not browser
                asset.mime_type = _mime_for_category(category, ext)
            asset.save()
            processing_job.status = "completed"
            processing_job.save()
        except Exception as e:
            processing_job.status = "failed"
            processing_job.error_message = str(e)[:500]
            processing_job.save()
            # cleanup
            delete_file(storage_path)
            asset.delete()
            return Response({"detail": f"Upload failed: {str(e)[:200]}"}, status=400)

        _recalc_storage(ws)
        return Response(MediaAssetSerializer(asset).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="file")
    def file(self, request, pk=None):
        asset = self.get_object()
        variant = request.query_params.get("variant", "original")
        # find variant
        if variant == "original":
            # use original storage path? We stored original variant separately; fallback to asset.storage_path
            v = asset.variants.filter(variant_type="original").first()
            path = v.storage_path if v else asset.storage_path
            mime = v.mime_type if v else asset.mime_type
        else:
            v = asset.variants.filter(variant_type=variant).first()
            if not v:
                # fallback to original
                v = asset.variants.filter(variant_type="original").first()
            if not v:
                raise Http404
            path = v.storage_path
            mime = v.mime_type
        if not file_exists(path):
            raise Http404
        full = absolute_path(path)
        return FileResponse(open(full, "rb"), content_type=mime)

    @action(detail=True, methods=["get"], url_path="variants")
    def variants(self, request, pk=None):
        asset = self.get_object()
        return Response(MediaVariantSerializer(asset.variants.all(), many=True).data)

    @action(detail=True, methods=["post"], url_path="edit")
    def edit(self, request, pk=None):
        asset = self.get_object()
        if asset.category != "image":
            return Response({"detail": "Only images can be edited."}, status=400)
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "No edited image provided."}, status=400)
        try:
            validate_file_size(upload.size)
            data = upload.read()
            validate_image_bytes(data)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)
        # operations metadata optional
        operations = {}
        if request.data.get("operations"):
            import json
            try:
                operations = json.loads(request.data.get("operations"))
            except Exception:
                operations = {}
        # generate edited variant
        ws = asset.workspace
        vpath = generate_storage_path(ws.id, asset.original_filename)
        from .processing import edit_image
        try:
            edited_bytes, mime, dims = edit_image(data, operations)
        except Exception as e:
            return Response({"detail": f"Edit failed: {e}"}, status=400)
        save_bytes(vpath, edited_bytes)
        variant = MediaVariant.objects.create(
            asset=asset,
            variant_type="edited",
            storage_path=vpath,
            mime_type=mime,
            file_size=len(edited_bytes),
            width=dims[0],
            height=dims[1],
            metadata={"operations": operations},
        )
        _recalc_storage(ws)
        return Response(MediaVariantSerializer(variant).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def storage_usage(request):
    ws = _user_workspace(request.user)
    if ws is None:
        return Response({"detail": "No workspace."}, status=403)
    usage, _ = WorkspaceStorageUsage.objects.get_or_create(workspace=ws)
    _recalc_storage(ws)
    usage.refresh_from_db()
    assets = MediaAsset.objects.filter(workspace=ws)
    return Response({
        "total_bytes": usage.total_bytes,
        "asset_count": usage.asset_count,
        "image_count": usage.image_count,
        "document_count": usage.document_count,
        "video_count": usage.video_count,
        "recent": MediaAssetSerializer(assets[:5], many=True).data,
        "largest": MediaAssetSerializer(assets.order_by("-file_size")[:5], many=True).data,
    })


def _recalc_storage(workspace):
    from django.db.models import Sum, Count
    assets = MediaAsset.objects.filter(workspace=workspace)
    total = assets.aggregate(s=Sum("file_size"))["s"] or 0
    # include variants sizes
    variant_total = 0
    for a in assets:
        variant_total += a.variants.aggregate(s=Sum("file_size"))["s"] or 0
    total = total + variant_total
    usage, _ = WorkspaceStorageUsage.objects.get_or_create(workspace=workspace)
    usage.total_bytes = total
    usage.asset_count = assets.count()
    usage.image_count = assets.filter(category="image").count()
    usage.document_count = assets.filter(category="document").count()
    usage.video_count = assets.filter(category="video").count()
    usage.save()


def _mime_for_category(category, ext):
    import mimetypes
    m = mimetypes.types_map.get(ext.lower())
    if m:
        return m
    if category == "image":
        return "image/jpeg"
    if category == "document":
        return "application/pdf" if ext == ".pdf" else "text/plain"
    if category == "video":
        return "video/mp4"
    return "application/octet-stream"