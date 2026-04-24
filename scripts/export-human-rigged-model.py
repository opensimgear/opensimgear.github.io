from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE_BLEND = ROOT / "docs" / "human_base_meshes_bundle.blend"
TARGET_GLB = ROOT / "public" / "models" / "aluminum-rig-planner" / "human-male-realistic.glb"
SOURCE_MESH_NAME = "GEO-body_male_realistic"


def planner_point(world_point, center_x, center_y, min_z):
    return Vector((-(world_point.y - center_y), world_point.z - min_z, -(world_point.x - center_x)))


def main():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))
    source = bpy.data.objects[SOURCE_MESH_NAME]
    source_mesh = source.data

    world_vertices = [source.matrix_world @ vertex.co for vertex in source_mesh.vertices]
    min_x = min(vertex.x for vertex in world_vertices)
    max_x = max(vertex.x for vertex in world_vertices)
    min_y = min(vertex.y for vertex in world_vertices)
    max_y = max(vertex.y for vertex in world_vertices)
    min_z = min(vertex.z for vertex in world_vertices)
    max_z = max(vertex.z for vertex in world_vertices)
    center_x = (min_x + max_x) * 0.5
    center_y = (min_y + max_y) * 0.5

    vertices = [planner_point(vertex, center_x, center_y, min_z) for vertex in world_vertices]
    faces = [[vertex for vertex in polygon.vertices] for polygon in source_mesh.polygons]

    mesh = bpy.data.meshes.new("human_male_realistic_mesh")
    mesh.from_pydata([tuple(vertex) for vertex in vertices], [], faces)
    mesh.update()

    body = bpy.data.objects.new("human_male_realistic", mesh)
    bpy.context.collection.objects.link(body)
    bpy.context.view_layer.objects.active = body
    body.select_set(True)

    skin_material = bpy.data.materials.new("human_skin")
    skin_material.diffuse_color = (0.79, 0.64, 0.54, 1.0)
    body.data.materials.append(skin_material)

    min_planner = Vector(
        (
            min(vertex.x for vertex in vertices),
            min(vertex.y for vertex in vertices),
            min(vertex.z for vertex in vertices),
        )
    )
    max_planner = Vector(
        (
            max(vertex.x for vertex in vertices),
            max(vertex.y for vertex in vertices),
            max(vertex.z for vertex in vertices),
        )
    )
    size = max_planner - min_planner
    height = size.y
    width = size.z
    shoulder_half_width = min(width * 0.26, height * 0.13)
    hip_half_width = min(width * 0.12, height * 0.065)
    arm_outer_z = min(width * 0.39, height * 0.21)
    hip_y = height * 0.535
    knee_y = height * 0.29
    ankle_y = height * 0.055
    shoulder_y = height * 0.82
    elbow_y = height * 0.615
    wrist_y = height * 0.45
    neck_y = height * 0.89
    head_top_y = height * 0.985
    foot_x = height * 0.1

    bones = {
        "torso": (Vector((0, hip_y, 0)), Vector((0, shoulder_y, 0)), None),
        "head": (Vector((0, neck_y, 0)), Vector((0, head_top_y, 0)), "torso"),
        "leftUpperArm": (Vector((0, shoulder_y, -shoulder_half_width)), Vector((0, elbow_y, -arm_outer_z)), "torso"),
        "leftForearm": (Vector((0, elbow_y, -arm_outer_z)), Vector((0, wrist_y, -arm_outer_z * 0.96)), "leftUpperArm"),
        "leftHand": (
            Vector((0, wrist_y, -arm_outer_z * 0.96)),
            Vector((0.02, wrist_y - height * 0.075, -arm_outer_z * 0.96)),
            "leftForearm",
        ),
        "rightUpperArm": (Vector((0, shoulder_y, shoulder_half_width)), Vector((0, elbow_y, arm_outer_z)), "torso"),
        "rightForearm": (Vector((0, elbow_y, arm_outer_z)), Vector((0, wrist_y, arm_outer_z * 0.96)), "rightUpperArm"),
        "rightHand": (
            Vector((0, wrist_y, arm_outer_z * 0.96)),
            Vector((0.02, wrist_y - height * 0.075, arm_outer_z * 0.96)),
            "rightForearm",
        ),
        "leftThigh": (Vector((0, hip_y, -hip_half_width)), Vector((0, knee_y, -hip_half_width * 0.78)), "torso"),
        "leftShin": (Vector((0, knee_y, -hip_half_width * 0.78)), Vector((0, ankle_y, -hip_half_width * 0.7)), "leftThigh"),
        "leftFoot": (
            Vector((0, ankle_y, -hip_half_width * 0.7)),
            Vector((foot_x, height * 0.015, -hip_half_width * 0.7)),
            "leftShin",
        ),
        "rightThigh": (Vector((0, hip_y, hip_half_width)), Vector((0, knee_y, hip_half_width * 0.78)), "torso"),
        "rightShin": (Vector((0, knee_y, hip_half_width * 0.78)), Vector((0, ankle_y, hip_half_width * 0.7)), "rightThigh"),
        "rightFoot": (
            Vector((0, ankle_y, hip_half_width * 0.7)),
            Vector((foot_x, height * 0.015, hip_half_width * 0.7)),
            "rightShin",
        ),
    }

    armature_data = bpy.data.armatures.new("human_male_realistic_armature")
    armature = bpy.data.objects.new("human_male_realistic_armature", armature_data)
    bpy.context.collection.objects.link(armature)
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    edit_bones = {}
    for name, (head, tail, parent_name) in bones.items():
        edit_bone = armature_data.edit_bones.new(name)
        edit_bone.head = head
        edit_bone.tail = tail
        edit_bone.roll = 0.0
        edit_bone.use_connect = False
        edit_bones[name] = edit_bone

    for name, (_, _, parent_name) in bones.items():
        if parent_name:
            edit_bones[name].parent = edit_bones[parent_name]

    bpy.ops.object.mode_set(mode="OBJECT")

    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")

    TARGET_GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(TARGET_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=False,
        export_skins=True,
        export_animations=False,
        export_materials="EXPORT",
    )


if __name__ == "__main__":
    main()
