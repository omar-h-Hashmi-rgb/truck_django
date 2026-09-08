from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Trip
from .serializers import TripListSerializer, TripDetailSerializer, TripPlanSerializer
from .services.routing import get_coordinates, get_osrm_route
from .services.hos_engine import compute_hos, generate_daily_logs


class HealthCheckView(APIView):
    """GET /api/health/"""

    def get(self, request):
        return Response({"status": "healthy"})


class PlanTripView(APIView):
    """
    POST /api/trips/plan/

    Accepts route locations + cycle hours, runs geocoding -> routing -> HOS
    engine, saves to Supabase, and returns the full trip payload.
    """

    def post(self, request):
        input_serializer = TripPlanSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(
                input_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = input_serializer.validated_data
        current_location = data["current_location"].strip()
        pickup_location = data["pickup_location"].strip()
        dropoff_location = data["dropoff_location"].strip()
        current_cycle_hours = max(0.0, min(70.0, float(data["current_cycle_hours"])))

        # --- Step 1: Geocode all three locations ---
        try:
            start_coords = get_coordinates(current_location)
            pickup_coords = get_coordinates(pickup_location)
            dropoff_coords = get_coordinates(dropoff_location)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": "Geocoding service error. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # --- Step 2: Calculate OSRM route ---
        try:
            route = get_osrm_route(start_coords, pickup_coords, dropoff_coords)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": "Routing service error. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # --- Step 3: Run HOS engine ---
        hos_result = compute_hos(
            legs=route["legs"],
            cycle_hours_used=current_cycle_hours,
        )
        events = hos_result["events"]
        trip_summary = hos_result["trip_summary"]

        # --- Step 4: Partition into daily logs with rolling recap ---
        daily_logs = generate_daily_logs(events, current_cycle_hours)

        # --- Step 5: Persist to Supabase via Django ORM ---
        trip = Trip.objects.create(
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            current_cycle_hours=current_cycle_hours,
            route_geometry=route["geometry"],
            trip_summary={
                "total_miles": route["total_miles"],
                "total_driving_hours": route["total_driving_hours"],
                "legs": route["legs"],
                **trip_summary,
            },
            timeline_events=events,
            hos_daily_logs=daily_logs,
        )

        return Response(
            {
                "trip_id": trip.id,
                "trip_summary": trip.trip_summary,
                "route_geometry": trip.route_geometry,
                "timeline_events": trip.timeline_events,
                "hos_daily_logs": trip.hos_daily_logs,
                "osrm_steps": route.get("steps", []),
                "locations": {
                    "current": {
                        "name": current_location,
                        "coords": start_coords,
                    },
                    "pickup": {
                        "name": pickup_location,
                        "coords": pickup_coords,
                    },
                    "dropoff": {
                        "name": dropoff_location,
                        "coords": dropoff_coords,
                    },
                },
            },
            status=status.HTTP_201_CREATED,
        )


class TripListView(APIView):
    """GET /api/trips/ - lightweight list, excludes heavy JSON blobs."""

    def get(self, request):
        trips = Trip.objects.defer(
            'route_geometry', 'hos_daily_logs', 'timeline_events'
        ).order_by('-created_at')[:50]
        serializer = TripListSerializer(trips, many=True)
        return Response(serializer.data)


class TripDetailView(APIView):
    """GET /api/trips/<id>/ - full trip data including geometry and logs."""

    def get(self, request, pk):
        try:
            trip = Trip.objects.get(pk=pk)
        except Trip.DoesNotExist:
            return Response(
                {"error": "Trip not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TripDetailSerializer(trip)
        return Response(serializer.data)
