from rest_framework import serializers
from .models import Trip


class TripListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views - excludes heavy JSON blobs."""

    class Meta:
        model = Trip
        fields = [
            'id',
            'created_at',
            'current_location',
            'pickup_location',
            'dropoff_location',
            'trip_summary',
        ]


class TripDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail views - includes everything."""

    class Meta:
        model = Trip
        fields = '__all__'


class TripPlanSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=255)
    pickup_location = serializers.CharField(max_length=255)
    dropoff_location = serializers.CharField(max_length=255)
    current_cycle_hours = serializers.FloatField(default=0)
