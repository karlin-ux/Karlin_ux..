from rest_framework import serializers
from .models import ShowcaseCategory, ShowcaseFeature, Technology, ProjectCaseStudy


class ShowcaseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ShowcaseCategory
        fields = "__all__"


class ShowcaseFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShowcaseFeature
        fields = "__all__"


class TechnologySerializer(serializers.ModelSerializer):
    class Meta:
        model = Technology
        fields = "__all__"


class ProjectCaseStudySerializer(serializers.ModelSerializer):
    technologies = serializers.StringRelatedField(many=True)

    class Meta:
        model = ProjectCaseStudy
        fields = "__all__"