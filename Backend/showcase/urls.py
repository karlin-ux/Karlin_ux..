from django.urls import path
from . import views

urlpatterns = [
    path("categories/", views.ShowcaseCategoryListView.as_view()),
    path("features/", views.ShowcaseFeatureListView.as_view()),
    path("technologies/", views.TechnologyListView.as_view()),
    path("projects/", views.ProjectListView.as_view()),
]