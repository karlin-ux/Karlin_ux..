from rest_framework import permissions

from accounts.models import Workspace, WorkspaceMembership


def get_user_workspace(user, workspace_id=None):
    """Return a workspace owned by or accessible to user, or None."""
    if not user or not user.is_authenticated:
        return None
    if user.is_superadmin:
        # superadmin does not use demo workspaces for data isolation checks;
        # but for platform they don't access demo endpoints typically.
        return None
    qs = Workspace.objects.filter(owner=user)
    if workspace_id:
        qs = qs.filter(id=workspace_id)
    return qs.first()


def user_owns_workspace(user, workspace):
    if not user or not user.is_authenticated:
        return False
    if user.is_superadmin:
        return False  # superadmin uses platform endpoints, not demo workspace endpoints
    return workspace is not None and workspace.owner_id == user.id


class IsWorkspaceOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        ws = getattr(obj, "workspace", None)
        if ws is None:
            return False
        return ws.owner_id == request.user.id

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and not request.user.is_superadmin