"""Moisture sensor simulator.

Generates realistic soil-moisture readings and POSTs them to the backend API.

Usage:
    python -m scripts.moisture_simulator --sensor SM-001 --mode rising
    python -m scripts.moisture_simulator --sensor SM-001,SM-002 --mode oscillating
"""
import argparse
import random
import time
import httpx
from datetime import datetime, timezone


API_URL = "http://localhost:8000/api/v1/sensors/readings"

MODES = {
    "normal":    {"base": 45, "variance": 5, "trend": 0},
    "rising":    {"base": 40, "variance": 3, "trend": 2.5},
    "high":      {"base": 72, "variance": 4, "trend": 0.5},
    "oscillating": {"base": 55, "variance": 8, "trend": 0},
}


def generate_reading(sensor_code: str, mode: str, state: dict) -> dict:
    """Generate a realistic moisture reading."""
    config = MODES.get(mode, MODES["normal"])

    # Maintain per-sensor state for continuity
    if sensor_code not in state:
        state[sensor_code] = config["base"]

    prev = state[sensor_code]
    trend = config["trend"]
    variance = config["variance"]

    # Add trend + random walk
    noise = random.gauss(0, variance * 0.3)
    if mode == "oscillating":
        # Sine wave oscillation
        t = state.get("_tick", 0)
        trend_value = 15 * (0.5 + 0.5 * __import__("math").sin(t * 0.3))
        new_val = config["base"] + trend_value + noise
    else:
        new_val = prev + trend + noise

    # Clamp to 0-100
    new_val = max(0, min(100, new_val))
    state[sensor_code] = round(new_val, 1)

    return {
        "sensor_code": sensor_code,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "moisture_percent": round(new_val, 1),
        "battery_level": max(10, 95 - random.randint(0, 5)),
        "quality": "GOOD",
    }


def run(sensors: list[str], mode: str, interval: float):
    """Run the simulator."""
    print(f"Starting moisture simulator: sensors={sensors}, mode={mode}, interval={interval}s")
    print(f"POSTing to {API_URL}")
    print("-" * 60)

    state = {"_tick": 0}
    client = httpx.Client(timeout=10)

    try:
        while True:
            for sensor_code in sensors:
                reading = generate_reading(sensor_code, mode, state)
                try:
                    resp = client.post(API_URL, json=reading)
                    if resp.status_code < 300:
                        print(f"  {sensor_code} -> {reading['moisture_percent']}%  "
                              f"[battery: {reading['battery_level']}%]  "
                              f"201 Created")
                    else:
                        print(f"  {sensor_code} -> ERROR {resp.status_code}: {resp.text}")
                except httpx.ConnectError:
                    print(f"  {sensor_code} -> CONNECTION FAILED (is the backend running?)")
                except Exception as e:
                    print(f"  {sensor_code} -> ERROR: {e}")

            state["_tick"] = state.get("_tick", 0) + 1
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\nSimulator stopped.")
    finally:
        client.close()


def main():
    parser = argparse.ArgumentParser(description="Soil moisture sensor simulator")
    parser.add_argument(
        "--sensor", "-s",
        default="SM-001",
        help="Comma-separated sensor codes (default: SM-001)",
    )
    parser.add_argument(
        "--mode", "-m",
        choices=["normal", "rising", "high", "oscillating"],
        default="rising",
        help="Simulation mode (default: rising)",
    )
    parser.add_argument(
        "--interval", "-i",
        type=float,
        default=3.0,
        help="Seconds between readings (default: 3)",
    )
    args = parser.parse_args()

    sensors = [s.strip() for s in args.sensor.split(",")]
    run(sensors, args.mode, args.interval)


if __name__ == "__main__":
    main()
