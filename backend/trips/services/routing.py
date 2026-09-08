import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_BASE_URL = "http://router.project-osrm.org"
USER_AGENT = "FMCSA-ELD-TripPlanner/1.0 (contact: admin@tripplanner.dev)"


def get_coordinates(location_string):
    """Geocode a location string to (lat, lon) using Nominatim."""
    if not location_string or not location_string.strip():
        raise ValueError("Location cannot be empty")
    resp = requests.get(
        NOMINATIM_URL,
        params={"q": location_string.strip(), "format": "json", "limit": 1},
        headers={"User-Agent": USER_AGENT},
        timeout=10,
    )
    resp.raise_for_status()
    results = resp.json()
    if not results:
        raise ValueError(
            "Location '{}' not found. Please enter a valid city and state.".format(
                location_string
            )
        )
    return {
        "lat": float(results[0]["lat"]),
        "lon": float(results[0]["lon"]),
        "display_name": results[0].get("display_name", location_string),
    }


def get_osrm_route(start_coords, pickup_coords, dropoff_coords):
    """
    Calculate a driving route through three waypoints using OSRM.
    Strips all non-essential OSRM metadata to minimize payload.
    Reduces geometry precision to 5 decimal places (~1m accuracy).
    """
    coords = [start_coords, pickup_coords, dropoff_coords]
    coord_string = ";".join(
        ["{:.6f},{:.6f}".format(c["lon"], c["lat"]) for c in coords]
    )

    url = "{}/route/v1/driving/{}".format(OSRM_BASE_URL, coord_string)
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "true",
    }

    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if data.get("code") != "Ok":
        raise ValueError(
            "No valid driving route found between these locations."
        )

    route = data["routes"][0]
    total_meters = route.get("distance", 0)
    total_seconds = route.get("duration", 0)
    total_miles = round(total_meters / 1609.344, 1)
    total_driving_hours = round(total_seconds / 3600, 2)

    if total_miles == 0 and total_driving_hours == 0:
        raise ValueError(
            "No valid driving route found between these locations."
        )

    legs = []
    all_steps = []
    step_index = 0

    for i, leg in enumerate(route.get("legs", [])):
        label = "current_to_pickup" if i == 0 else "pickup_to_dropoff"
        leg_steps = []

        for step in leg.get("steps", []):
            maneuver = step.get("maneuver", {})
            instruction = _build_instruction(step)
            leg_steps.append({
                "index": step_index,
                "instruction": instruction,
                "distance_miles": round(step.get("distance", 0) / 1609.344, 1),
                "duration_hours": round(step.get("duration", 0) / 3600, 2),
                "street_name": step.get("name", "") or "",
                "maneuver_type": maneuver.get("type", ""),
                "maneuver_modifier": maneuver.get("modifier", ""),
            })
            all_steps.append(leg_steps[-1])
            step_index += 1

        legs.append({
            "label": label,
            "distance_miles": round(leg.get("distance", 0) / 1609.344, 1),
            "duration_hours": round(leg.get("duration", 0) / 3600, 2),
            "steps": leg_steps,
        })

    # Strip geometry to 5 decimal places (~1 meter precision)
    raw_geometry = route.get("geometry", {})
    stripped_geometry = _strip_geometry(raw_geometry)

    return {
        "total_miles": total_miles,
        "total_driving_hours": total_driving_hours,
        "legs": legs,
        "steps": all_steps,
        "geometry": stripped_geometry,
    }


def _strip_geometry(geometry):
    """Reduce GeoJSON coordinate precision to 5 decimal places."""
    if not geometry or geometry.get("type") != "LineString":
        return geometry
    coords = geometry.get("coordinates", [])
    stripped = [[round(c[0], 5), round(c[1], 5)] for c in coords]
    return {"type": "LineString", "coordinates": stripped}


def _build_instruction(step):
    """Build a human-readable turn instruction from an OSRM step."""
    maneuver = step.get("maneuver", {})
    m_type = maneuver.get("type", "")
    modifier = maneuver.get("modifier", "")
    name = step.get("name", "") or ""

    verb_map = {
        "depart": "Depart",
        "arrive": "Arrive at destination",
        "turn": "Turn",
        "new name": "Continue onto",
        "merge": "Merge onto",
        "on ramp": "Take ramp onto",
        "off ramp": "Exit onto",
        "fork": "Take the fork",
        "end of road": "At end of road, turn",
        "continue": "Continue",
        "roundabout": "Enter roundabout",
        "rotary": "Enter rotary",
        "roundabout turn": "Exit roundabout",
    }

    modifier_map = {
        "uturn": "U-turn",
        "sharp right": "sharp right",
        "right": "right",
        "slight right": "slight right",
        "straight": "straight",
        "slight left": "slight left",
        "left": "left",
        "sharp left": "sharp left",
    }

    verb = verb_map.get(m_type, "Continue")
    mod = modifier_map.get(modifier, modifier or "")

    if m_type == "arrive":
        return "Arrive at destination"
    if m_type == "depart":
        return "Head {} on {}".format(mod, name) if name else "Head {}".format(mod)
    if m_type in ("roundabout", "rotary"):
        exit_num = maneuver.get("exit", "")
        if name:
            return "Enter roundabout, take exit {} onto {}".format(exit_num, name)
        return "Enter roundabout, take exit {}".format(exit_num)

    if mod and name:
        return "{} {} onto {}".format(verb, mod, name)
    elif mod:
        return "{} {}".format(verb, mod)
    elif name:
        return "{} onto {}".format(verb, name)
    return verb
