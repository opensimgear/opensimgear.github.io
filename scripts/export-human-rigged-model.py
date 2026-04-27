"""Disabled legacy exporter.

The rigged GLB is now edited directly and loaded as the runtime source of truth.
Do not regenerate it from this script; planner joints and posture metrics are
derived from bones in the loaded model instead.
"""

raise SystemExit(
    "scripts/export-human-rigged-model.py is disabled. Edit public/models/aluminum-rig-planner/human-male-realistic.glb directly."
)
