from django.db import models


class ShowcaseCategory(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class ShowcaseFeature(models.Model):
    category = models.ForeignKey(ShowcaseCategory, on_delete=models.CASCADE, related_name="features")
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    summary = models.TextField(blank=True)
    description = models.TextField(blank=True)
    is_available = models.BooleanField(default=True)
    is_simulated = models.BooleanField(default=True)
    icon = models.CharField(max_length=60, blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self):
        return self.title


class Technology(models.Model):
    name = models.CharField(max_length=120, unique=True)
    category = models.CharField(max_length=80, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return self.name


class ProjectCaseStudy(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    summary = models.TextField(blank=True)
    description = models.TextField(blank=True)
    technologies = models.ManyToManyField(Technology, blank=True)
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ArchitectureComponent(models.Model):
    name = models.CharField(max_length=120)
    layer = models.CharField(max_length=80, blank=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name