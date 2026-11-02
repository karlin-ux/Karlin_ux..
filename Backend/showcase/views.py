from rest_framework import generics, permissions
from .models import ShowcaseCategory, ShowcaseFeature, Technology, ProjectCaseStudy
from .serializers import (
    ShowcaseCategorySerializer, ShowcaseFeatureSerializer, TechnologySerializer,
    ProjectCaseStudySerializer,
)


class ShowcaseCategoryListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = ShowcaseCategory.objects.all()
    serializer_class = ShowcaseCategorySerializer


class ShowcaseFeatureListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = ShowcaseFeature.objects.filter(is_available=True)
    serializer_class = ShowcaseFeatureSerializer


class TechnologyListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Technology.objects.all()
    serializer_class = TechnologySerializer


class ProjectListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = ProjectCaseStudy.objects.all()
    serializer_class = ProjectCaseStudySerializer