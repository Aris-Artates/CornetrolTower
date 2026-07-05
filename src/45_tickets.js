/* ════════════════════════════════════════════════════════════════
   STAGE 3 CONTENT — repair tickets. Python-flavoured pseudocode
   about airport systems; identifiers mix snake_case & camelCase;
   symbol-dense on purpose so SYM stays held.
   ════════════════════════════════════════════════════════════════ */
const TICKETS = {
  '3-1': {
    files: {
      'gates.py':
`# GATE ASSIGNMENT -- maintenance build
def assign_gate(flight):
    gate = free_gate
    flight.gate = gate
    return gate`,
      'deice.py':
`# DE-ICING SCHEDULER
def next_slot(truck):
    slot = deice_queue.next
    truck.assignSlot(slot)
    return slot`,
      'radar.py':
`# RADAR SWEEP
def updateRadarSweep(dt):
    sweep = sweep + rate
    return sweep`
    },
    tickets: [
      { file: 'gates.py', title: 'MB-4411 · gates.py',
        brief: 'assign_gate never actually calls free_gate. Rebuild the call with a zone and a wide-body flag.',
        after:
`# GATE ASSIGNMENT -- maintenance build
def assign_gate(flight):
    gate = free_gate(zone="A", wide_body=(flight.kind == "heavy"))
    flight.gate = gate
    return gate` },
      { file: 'deice.py', title: 'MB-4412 · deice.py',
        brief: 'The scheduler must pull a prioritised slot when it is freezing outside.',
        after:
`# DE-ICING SCHEDULER
def next_slot(truck):
    slot = deice_queue.nextSlot(priority=(outside_temp < freezing))
    truck.assignSlot(slot)
    return slot` },
      { file: 'radar.py', title: 'MB-4413 · radar.py',
        brief: 'The sweep ignores the timestep and never wraps. Fix the update line.',
        after:
`# RADAR SWEEP
def updateRadarSweep(dt):
    sweep = (sweep + rate * dt) % full_circle
    return sweep` }
    ]
  },

  '3-2': {
    files: {
      'belts.py':
`# CAROUSEL ROUTING TABLE
BELT_MAP = "todo"

def route_bag(bag):
    belt = BELT_MAP[bag.zone]
    conveyor.sendTo(bag, belt)`,
      'boarding.py':
`# BOARDING PASS VALIDATION
def validate_pass(bp):
    checks = None
    flags = None
    return all(checks) and not flags["standby"]`
    },
    tickets: [
      { file: 'belts.py', title: 'MB-4420 · belts.py',
        brief: 'Replace the "todo" placeholder with the real routing dict (zones map to belt lists).',
        after:
`# CAROUSEL ROUTING TABLE
BELT_MAP = {
    "intl": ["alpha", "bravo"],
    "domestic": ["charlie"],
    "oversize": ["delta", "echo"],
}

def route_bag(bag):
    belt = BELT_MAP[bag.zone]
    conveyor.sendTo(bag, belt)` },
      { file: 'boarding.py', title: 'MB-4421 · boarding.py',
        brief: 'Fill in the checks list and the flags dict.',
        after:
`# BOARDING PASS VALIDATION
def validate_pass(bp):
    checks = [bp.name != "", bp.gate in OPEN_GATES, (bp.seat != None)]
    flags = {"priority": bp.tier == "gold", "standby": False}
    return all(checks) and not flags["standby"]` }
    ]
  },

  '3-3': {
    files: {
      'speed.py':
`# CAROUSEL SPEED CONTROL
def set_speed(carousel, level):
    legacy_pwm.write(level)
    legacy_pwm.flush()
    legacy_pwm.close()
    carousel.driver.setSpeed(level)`,
      'handlers.py':
`# NEW DE-ICE HANDLER (disabled)
"""
def on_frost(sensor):
    dispatch(fuel_truck, deice_rig)
    log("frost event", sensor.zone)
"""`,
      'cleanup.py':
`# APRON LIGHTING
def lights_on(apron):
    apron.rows.powerUp(all=True)

def legacy_lights(apron):
    relay_bank.pulse()
    relay_bank.pulse()
    relay_bank.latch(hold=True)

def lights_off(apron):
    apron.rows.powerDown()`
    },
    tickets: [
      { file: 'speed.py', title: 'MB-4430 · speed.py',
        brief: 'Comment out the three legacy_pwm lines with # — the new driver call below stays live.',
        after:
`# CAROUSEL SPEED CONTROL
def set_speed(carousel, level):
    # legacy_pwm.write(level)
    # legacy_pwm.flush()
    # legacy_pwm.close()
    carousel.driver.setSpeed(level)` },
      { file: 'handlers.py', title: 'MB-4431 · handlers.py',
        brief: 'Uncomment the new handler: delete the two """ marker lines wrapping it.',
        after:
`# NEW DE-ICE HANDLER (disabled)
def on_frost(sensor):
    dispatch(fuel_truck, deice_rig)
    log("frost event", sensor.zone)` },
      { file: 'cleanup.py', title: 'MB-4432 · cleanup.py',
        brief: 'Delete the deprecated legacy_lights function — select it (Shift + NAV arrows / Home / End), then Backspace.',
        after:
`# APRON LIGHTING
def lights_on(apron):
    apron.rows.powerUp(all=True)

def lights_off(apron):
    apron.rows.powerDown()` }
    ]
  },

  '3-4': {
    files: {
      'validator.py':
`# BOARDING PASS CHECKS
# TODO: paste validateBoardingPass here (from util.py)

def gate_check(bp):
    return validateBoardingPass(bp) and bp.gate in OPEN_GATES`,
      'util.py':
`# SHARED UTILITIES (legacy module, read-only spirit)
def validateBoardingPass(bp):
    ok = (bp.name != "") and (bp.seat != None)
    return ok and not bp.flags.get("revoked", False)`
    },
    tickets: [
      { file: 'validator.py', title: 'MB-4440 · validator.py',
        brief: 'Carry validateBoardingPass across: open util.py in the split (PgDn to switch panes), select the function with Shift + NAV arrows, Copy, then paste it over the TODO line here.',
        split: 'util.py',
        after:
`# BOARDING PASS CHECKS
def validateBoardingPass(bp):
    ok = (bp.name != "") and (bp.seat != None)
    return ok and not bp.flags.get("revoked", False)

def gate_check(bp):
    return validateBoardingPass(bp) and bp.gate in OPEN_GATES` }
    ]
  },

  '3-5': {
    files: {
      'carousel.py':
`# CAROUSEL SUPERVISOR
def restart_belt(belt):
    belt.stop()
    belt.start()

def health(belt):
    return "ok"`,
      'dispatch.py':
`# TRUCK DISPATCH
def dispatchNow(truck, job):
    truck.queue = job`,
      'notes.txt':
`ops note: after patching, restart carousel three and
check the de-ice board from the terminal.`
    },
    tickets: [
      { file: 'carousel.py', title: 'MB-4450 · carousel.py',
        brief: 'Soft-reset the motor during restart, and make health() return a real status dict.',
        after:
`# CAROUSEL SUPERVISOR
def restart_belt(belt):
    belt.stop()
    belt.motor.reset(soft=True)
    belt.start()

def health(belt):
    status = {"rpm": belt.rpm, "jam": belt.isJammed()}
    return status` },
      { file: 'dispatch.py', title: 'MB-4451 · dispatch.py',
        brief: 'Queue the job properly (append a dict) and notify the fuel truck.',
        after:
`# TRUCK DISPATCH
def dispatchNow(truck, job):
    truck.queue.append({"job": job, "urgent": (job.kind == "deice")})
    fuel_truck.notify(truck.id, job.eta)` },
      { file: null, title: 'MB-4452 · terminal',
        brief: 'Close out the ticket from the terminal (PgDn until the terminal focuses): run the two commands, in order.',
        terminal: ['restart carousel_3', 'status deice'] }
    ]
  }
};
