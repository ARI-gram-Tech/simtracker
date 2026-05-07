# /apps/core/models.py
from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base model with created_at and updated_at fields.
    Inherit from this instead of models.Model for all future models."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
