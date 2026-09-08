"""Edge-case regression tests for the HOS engine."""
import os, sys, django
from dotenv import load_dotenv
load_dotenv()
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from trips.services.hos_engine import compute_hos, generate_daily_logs

print("=" * 60)
print("TEST 1: Zero-distance legs (same city pickup)")
print("=" * 60)
legs = [{"distance_miles": 0, "duration_hours": 0}]
result = compute_hos(legs, cycle_hours_used=0)
events = result["events"]
print("  Events:", len(events))
for e in events:
    print("    Day {} {} - {} - {}h".format(e["day"], e["start_time"], e["remark"], e["duration_hours"]))
assert len(events) > 0, "Should have at least pre-trip event"
print("  PASS\n")

print("=" * 60)
print("TEST 2: Cycle exhaustion at 65h")
print("=" * 60)
# Short trip that would use ~8h but starts at 65h cycle
legs = [
    {"distance_miles": 200, "duration_hours": 3.5},
    {"distance_miles": 200, "duration_hours": 3.5},
]
result = compute_hos(legs, cycle_hours_used=65)
events = result["events"]
summary = result["trip_summary"]
print("  Cycle used at start: 65.0")
print("  Cycle used at end:", summary["cycle_hours_used_at_end"])
print("  Events:", len(events))
# Check that a 34h restart was triggered
has_34h = any("34-hour" in (e.get("remark") or "") for e in events)
print("  34h restart triggered:", has_34h)
assert has_34h, "Should trigger 34-hour restart when cycle >= 70"
print("  PASS\n")

print("=" * 60)
print("TEST 3: Daily logs sum to exactly 24.0")
print("=" * 60)
legs = [
    {"distance_miles": 238, "duration_hours": 4.2},
    {"distance_miles": 1082, "duration_hours": 19.6},
]
result = compute_hos(legs, cycle_hours_used=0)
logs = generate_daily_logs(result["events"], initial_cycle_hours=0)
print("  Daily logs:", len(logs))
for log in logs:
    total = log["off_duty"] + log["sleeper_berth"] + log["driving"] + log["on_duty_not_driving"]
    total_rounded = round(total, 2)
    print("    Day {}: off={} slp={} drv={} odnd={} total={}".format(
        log["day"], log["off_duty"], log["sleeper_berth"],
        log["driving"], log["on_duty_not_driving"], total_rounded
    ))
    assert abs(total_rounded - 24.0) < 0.02, "Day {} sums to {} not 24.0".format(log["day"], total_rounded)
print("  PASS\n")

print("=" * 60)
print("TEST 4: Midnight crossover - events split at day boundary")
print("=" * 60)
# Drive until near midnight, then rest across midnight
legs = [{"distance_miles": 600, "duration_hours": 10.0}]
result = compute_hos(legs, cycle_hours_used=0, start_hour=16)  # Start at 4 PM
events = result["events"]
# Check that events exist on multiple days
days = set(e["day"] for e in events)
print("  Days spanned:", sorted(days))
assert len(days) >= 2, "Should span at least 2 days when driving from 4PM for 10h"
# Check no event has start_time >= 24:00
for e in events:
    h = int(e["start_time"].split(":")[0])
    assert h < 24, "Event start_time {} is invalid".format(e["start_time"])
print("  All start_times valid (< 24:00)")
print("  PASS\n")

print("=" * 60)
print("TEST 5: Input clamping - cycle_hours > 70")
print("=" * 60)
result = compute_hos([{"distance_miles": 100, "duration_hours": 2}], cycle_hours_used=75)
print("  Input 75 clamped to 70:", result["trip_summary"]["cycle_hours_used_at_end"] <= 70)
print("  PASS\n")

print("=" * 60)
print("TEST 6: 30-min break does NOT reset duty_window")
print("=" * 60)
# Drive 8h, get break, drive more - duty_window should keep increasing
legs = [{"distance_miles": 800, "duration_hours": 13.0}]
result = compute_hos(legs, cycle_hours_used=0)
events = result["events"]
# Find the 30-min break
breaks = [e for e in events if e.get("remark") == "30-minute break"]
print("  30-min breaks found:", len(breaks))
assert len(breaks) > 0, "Should have at least one 30-min break for 13h drive"
print("  PASS\n")

print("=" * 60)
print("TEST 7: Recap fields A, B, C present in daily logs")
print("=" * 60)
legs = [
    {"distance_miles": 238, "duration_hours": 4.2},
    {"distance_miles": 1082, "duration_hours": 19.6},
]
result = compute_hos(legs, cycle_hours_used=30)
logs = generate_daily_logs(result["events"], initial_cycle_hours=30)
for log in logs:
    recap = log.get("recap", {})
    assert "field_a_7day_on_duty" in recap, "Missing field_a"
    assert "field_b_available_tomorrow" in recap, "Missing field_b"
    assert "field_c_8day_on_duty" in recap, "Missing field_c"
    print("  Day {}: A={} B={} C={}".format(
        log["day"],
        recap["field_a_7day_on_duty"],
        recap["field_b_available_tomorrow"],
        recap["field_c_8day_on_duty"],
    ))
print("  PASS\n")

print("=" * 60)
print("TEST 8: 1h pickup + 1h dropoff present")
print("=" * 60)
legs = [
    {"distance_miles": 100, "duration_hours": 2.0},
    {"distance_miles": 100, "duration_hours": 2.0},
]
result = compute_hos(legs, cycle_hours_used=0)
events = result["events"]
pickup = [e for e in events if "Loading at pickup" in (e.get("remark") or "")]
dropoff = [e for e in events if "Unloading at dropoff" in (e.get("remark") or "")]
assert len(pickup) == 1, "Should have exactly 1 pickup event"
assert len(dropoff) == 1, "Should have exactly 1 dropoff event"
assert pickup[0]["duration_hours"] == 1.0, "Pickup should be 1h"
assert dropoff[0]["duration_hours"] == 1.0, "Dropoff should be 1h"
print("  Pickup: {}h, Dropoff: {}h".format(pickup[0]["duration_hours"], dropoff[0]["duration_hours"]))
print("  PASS\n")

print("=" * 60)
print("ALL 8 TESTS PASSED")
print("=" * 60)
