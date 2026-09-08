from django.db import models


class Trip(models.Model):
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_hours = models.FloatField(default=0)
    route_geometry = models.JSONField(default=dict, blank=True)
    trip_summary = models.JSONField(default=dict, blank=True)
    timeline_events = models.JSONField(default=list, blank=True)
    hos_daily_logs = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Trip #{self.pk}: {self.current_location} → "
            f"{self.dropoff_location} ({self.created_at:%Y-%m-%d})"
        )
