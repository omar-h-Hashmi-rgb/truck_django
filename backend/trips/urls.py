from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.HealthCheckView.as_view(), name="health-check"),
    path("trips/plan/", views.PlanTripView.as_view(), name="plan-trip"),
    path("trips/", views.TripListView.as_view(), name="trip-list"),
    path("trips/<int:pk>/", views.TripDetailView.as_view(), name="trip-detail"),
]
