"""
FMCSA Hours of Service (HOS) Engine

Implements a chronological state machine per 49 CFR Part 395.
All times are anchored to a single fixed timezone (UTC) to avoid
cross-timezone distortion. The FMCSA requires using the "time standard
of home terminal."

Key invariants enforced:
  - 11h driving / 14h duty window: only a 10h consecutive rest resets both.
  - 30-min break after 8h driving: duty_window DOES continue during break.
  - 34h restart resets the 70h cycle.
  - Events spanning midnight are split into two distinct objects.
  - Daily log partitions always sum to exactly 24.0 hours.
  - 70h rolling recap tracks 8-day window per field A/B/C.
"""

# FMCSA Regulatory Limits
MAX_DRIVING_11H = 11.0
MAX_DUTY_14H = 14.0
MAX_DRIVING_BEFORE_30M_BREAK = 8.0
MAX_MILES_BEFORE_FUEL = 1000.0
MAX_CYCLE_70H = 70.0
REQUIRED_10H_REST = 10.0
REQUIRED_34H_RESTART = 34.0
REQUIRED_30M_BREAK = 0.5
REQUIRED_FUEL_STOP = 0.5
STEP_SIZE = 0.25  # 15-minute increments

MAX_ITERATIONS = 50000  # Safety: prevent infinite loops


def compute_hos(legs, cycle_hours_used, start_hour=6, start_day=1):
    """
    Run the HOS state machine over a multi-leg route.

    Args:
        legs: list of dicts with 'distance_miles' and 'duration_hours'
        cycle_hours_used: float (clamped to 0-70), hours used in current cycle
        start_hour: fixed to 6 (06:00 UTC, "time standard of home terminal")
        start_day: trip day number to start on

    Returns:
        dict with events list and trip_summary dict.
    """
    # Clamp cycle hours to valid range
    cycle_hours_used = max(0.0, min(70.0, float(cycle_hours_used)))

    ctx = _HOSContext(start_hour, start_day, cycle_hours_used)
    events = ctx.events
    iterations = 0

    # --- PRE-TRIP: 1 hour on-duty at current location ---
    ctx.add_event("on_duty_not_driving", 1.0, "Pre-trip inspection")
    ctx.duty_window += 1.0
    ctx.cycle_used += 1.0

    # --- PROCESS EACH LEG ---
    for leg_index, leg in enumerate(legs):
        leg_label = "Current to Pickup" if leg_index == 0 else "Pickup to Dropoff"
        leg_miles = leg.get("distance_miles", 0)
        leg_hours = leg.get("duration_hours", 0)

        # Zero-distance leg: skip driving, just do on-duty stops
        if leg_hours <= 0 or leg_miles <= 0:
            if leg_index == 0:
                ctx.add_event("on_duty_not_driving", 1.0, "Loading at pickup")
                ctx.duty_window += 1.0
                ctx.cycle_used += 1.0
            continue

        if leg_index == 0:
            # At pickup: 1 hour on-duty for loading
            ctx.add_event("on_duty_not_driving", 1.0, "Loading at pickup")
            ctx.duty_window += 1.0
            ctx.cycle_used += 1.0

        # Drive this leg in 15-min increments
        remaining = leg_hours
        mph = leg_miles / leg_hours

        while remaining > 0:
            iterations += 1
            if iterations > MAX_ITERATIONS:
                break

            step = min(STEP_SIZE, remaining)
            step_miles = mph * step

            # --- 70-HOUR CYCLE CHECK ---
            if ctx.cycle_used >= MAX_CYCLE_70H:
                ctx.advance_time(REQUIRED_34H_RESTART, "sleeper_berth",
                                "34-hour restart (cycle reset)")
                ctx.cycle_used = 0.0
                ctx.driving_since_rest = 0.0
                ctx.duty_window = 0.0
                ctx.driving_since_break = 0.0
                continue

            # --- 11H/14H CHECK: need 10h rest ---
            if ctx.driving_since_rest >= MAX_DRIVING_11H or ctx.duty_window >= MAX_DUTY_14H:
                ctx.advance_time(REQUIRED_10H_REST, "sleeper_berth",
                                "10-hour rest period (daily reset)")
                ctx.driving_since_rest = 0.0
                ctx.duty_window = 0.0
                ctx.driving_since_break = 0.0
                continue

            # --- 30-MIN BREAK CHECK ---
            if ctx.driving_since_break >= MAX_DRIVING_BEFORE_30M_BREAK:
                ctx.add_event("off_duty", REQUIRED_30M_BREAK, "30-minute break")
                ctx.driving_since_break = 0.0
                # CRITICAL: duty_window does NOT reset — only 10h rest resets it
                continue

            # --- FUEL STOP CHECK ---
            if ctx.miles_since_fuel + step_miles >= MAX_MILES_BEFORE_FUEL:
                ctx.add_event("on_duty_not_driving", REQUIRED_FUEL_STOP, "Fuel stop")
                ctx.duty_window += REQUIRED_FUEL_STOP
                ctx.cycle_used += REQUIRED_FUEL_STOP
                ctx.miles_since_fuel = 0.0
                # CRITICAL: duty_window continues (fuel stop is on-duty)
                continue

            # --- DRIVE ---
            ctx.add_event("driving", step, "Driving ({})".format(leg_label))
            ctx.driving_since_rest += step
            ctx.duty_window += step
            ctx.driving_since_break += step
            ctx.cycle_used += step
            ctx.miles_since_fuel += step_miles
            ctx.total_miles += step_miles
            remaining -= step

    # --- DROPOFF: 1 hour on-duty ---
    ctx.add_event("on_duty_not_driving", 1.0, "Unloading at dropoff")
    ctx.cycle_used += 1.0

    trip_summary = {
        "total_miles": round(ctx.total_miles, 1),
        "total_driving_hours": round(ctx.total_driving, 2),
        "total_on_duty_hours": round(ctx.total_on_duty, 2),
        "total_off_duty_hours": round(ctx.total_off_duty, 2),
        "total_sleeper_hours": round(ctx.total_sleeper, 2),
        "total_trip_hours": round(ctx.total_elapsed, 2),
        "estimated_days": ctx.current_day - start_day + 1,
        "cycle_hours_used_at_end": round(min(ctx.cycle_used, 70.0), 2),
    }

    return {
        "events": events,
        "trip_summary": trip_summary,
    }


def generate_daily_logs(events, initial_cycle_hours=0.0):
    """
    Partition the flat event list into 24-hour daily log sheets.
    Computes rolling 70-hour / 8-day recap per FMCSA rules.

    Each day spans 00:00-23:59. Hours per duty status must sum to 24.0.
    """
    if not events:
        return []

    # Group events by trip day
    day_buckets = {}
    for event in events:
        day = event["day"]
        if day not in day_buckets:
            day_buckets[day] = []
        day_buckets[day].append(event)

    sorted_days = sorted(day_buckets.keys())

    # Build daily on-duty totals for the 8-day rolling window
    daily_on_duty = {}
    for day_num in sorted_days:
        day_events = day_buckets[day_num]
        on_duty = sum(
            e["duration_hours"]
            for e in day_events
            if e["status"] in ("driving", "on_duty_not_driving")
        )
        daily_on_duty[day_num] = round(on_duty, 2)

    # Estimate the preceding days' on-duty from initial_cycle_hours
    # Distribute across the 8-day window prior to trip start
    if sorted_days:
        first_day = sorted_days[0]
        for offset in range(1, 8):
            prior_day = first_day - offset
            if prior_day not in daily_on_duty:
                daily_on_duty[prior_day] = round(initial_cycle_hours / 7.0, 2)

    daily_logs = []
    cumulative_hours = 0.0

    for day_idx, day_num in enumerate(sorted_days):
        day_events = day_buckets[day_num]
        off_duty = 0.0
        sleeper_berth = 0.0
        driving = 0.0
        on_duty_not_driving = 0.0
        remarks = []

        for event in day_events:
            dur = event["duration_hours"]
            status = event["status"]
            if status == "off_duty":
                off_duty += dur
            elif status == "sleeper_berth":
                sleeper_berth += dur
            elif status == "driving":
                driving += dur
            elif status == "on_duty_not_driving":
                on_duty_not_driving += dur

            if event.get("remark"):
                remarks.append(event["remark"])

        total_duty = driving + on_duty_not_driving + sleeper_berth
        remainder = 24.0 - total_duty - off_duty

        # Float correction to ensure sum == 24.0
        if abs(remainder) > 0.001:
            off_duty += remainder

        off_duty = max(0, round(off_duty, 2))
        sleeper_berth = max(0, round(sleeper_berth, 2))
        driving = max(0, round(driving, 2))
        on_duty_not_driving = max(0, round(on_duty_not_driving, 2))

        on_duty_today = driving + on_duty_not_driving
        hours_today = on_duty_today + sleeper_berth
        cumulative_hours += hours_today

        # --- Rolling Recap (70-hour / 8-day) ---
        # Field A: hours on duty last 7 days INCLUDING today
        # = sum of on-duty from day(N-6) to day(N)
        window_7 = sum(
            daily_on_duty.get(day_num - j, 0.0) for j in range(7)
        )
        field_a = round(min(window_7, 70.0), 2)

        # Field B: hours available tomorrow
        # = 70 - sum of on-duty from day(N-5) to day(N)  (i.e., next 7-day window)
        window_b = sum(
            daily_on_duty.get(day_num - j, 0.0) for j in range(6)
        )
        field_b = round(max(0, 70.0 - window_b), 2)

        # Field C: total hours on duty last 8 days INCLUDING today
        window_8 = sum(
            daily_on_duty.get(day_num - j, 0.0) for j in range(8)
        )
        field_c = round(min(window_8, 70.0), 2)

        daily_logs.append({
            "day": day_num,
            "date_label": "Day {}".format(day_num),
            "off_duty": off_duty,
            "sleeper_berth": sleeper_berth,
            "driving": driving,
            "on_duty_not_driving": on_duty_not_driving,
            "total_duty_hours": round(hours_today, 2),
            "remarks": "; ".join(remarks[:5]),
            "recap": {
                "hours_worked_today": round(on_duty_today, 2),
                "field_a_7day_on_duty": field_a,
                "field_b_available_tomorrow": field_b,
                "field_c_8day_on_duty": field_c,
                "cumulative_hours": round(cumulative_hours, 2),
                "hours_available_next_day": field_b,
            },
        })

    return daily_logs


# ---------------------------------------------------------------------------
# Internal context object
# ---------------------------------------------------------------------------

class _HOSContext:
    """Mutable state bag passed through the HOS computation loop."""

    def __init__(self, start_hour, start_day, cycle_hours_used):
        self.events = []
        self.start_hour = float(start_hour)
        self.start_day = start_day
        self.elapsed = 0.0

        self.driving_since_rest = 0.0
        self.duty_window = 0.0
        self.driving_since_break = 0.0
        self.miles_since_fuel = 0.0
        self.cycle_used = float(cycle_hours_used)

        self.total_driving = 0.0
        self.total_on_duty = 0.0
        self.total_off_duty = 0.0
        self.total_sleeper = 0.0
        self.total_miles = 0.0
        self.total_elapsed = 0.0

    @property
    def current_day(self):
        return self.start_day + int((self.start_hour + self.elapsed) // 24)

    @property
    def time_of_day(self):
        return (self.start_hour + self.elapsed) % 24.0

    def add_event(self, status, duration, remark):
        """Record one event and advance the clock."""
        if duration <= 0:
            return

        tod = self.time_of_day
        hours = int(tod) % 24
        minutes = int((tod % 1) * 60)

        self.events.append({
            "status": status,
            "duration_hours": round(duration, 2),
            "day": self.current_day,
            "start_time": "{:02d}:{:02d}".format(hours, minutes),
            "remark": remark,
        })

        if status == "driving":
            self.total_driving += duration
            self.total_on_duty += duration
        elif status == "on_duty_not_driving":
            self.total_on_duty += duration
        elif status == "off_duty":
            self.total_off_duty += duration
        elif status == "sleeper_berth":
            self.total_sleeper += duration

        self.elapsed += duration
        self.total_elapsed += duration

    def advance_time(self, duration, status, remark):
        """
        Inject a rest/delay period that may span midnight(s).
        Splits events at midnight boundaries into separate day entries.
        """
        remaining = duration
        safety = 0
        while remaining > 0.001:
            safety += 1
            if safety > 100:
                break

            # If at or past midnight boundary, snap to next day start
            if self.time_of_day < 0.001:
                # Advance elapsed to the exact start of the current day
                days_elapsed = (self.start_hour + self.elapsed) // 24
                target_elapsed = (days_elapsed * 24.0) - self.start_hour
                if target_elapsed > self.elapsed:
                    self.elapsed = target_elapsed

            end_of_day = 24.0 - self.time_of_day
            chunk = min(remaining, end_of_day)
            chunk = round(chunk, 4)

            if chunk <= 0:
                self.elapsed += 0.001
                continue

            self.add_event(status, chunk, remark)
            remaining -= chunk
