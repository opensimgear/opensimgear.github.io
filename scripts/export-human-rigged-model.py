from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE_BLEND = ROOT / "docs" / "human_base_meshes_bundle.blend"
TARGET_GLB = ROOT / "public" / "models" / "aluminum-rig-planner" / "human-male-realistic.glb"
SOURCE_MESH_NAME = "GEO-body_male_realistic"
REFERENCE_PARTS = {
    "pelvis": "GEO-pelvis_male_primitive_realistic",
    "chest": "GEO-chest_male_primitive_realistic",
    "neck": "GEO-neck_male_primitive_realistic",
    "head": "GEO-head_male_primitive_realistic",
    "leftShoulder": "GEO-shoulder_male_primitive_realistic.L",
    "leftUpperArm": "GEO-arm_upper_male_primitive_realistic.L",
    "leftLowerArm": "GEO-arm_lower_male_primitive_realistic.L",
    "leftHand": "GEO-hand_male_primitive_realistic.L",
    "leftUpperLeg": "GEO-leg_upper_male_primitive_realistic.L",
    "leftLowerLeg": "GEO-leg_lower_male_primitive_realistic.L",
    "leftFoot": "GEO-foot.005_male_primitive_realistic.L",
}
REFERENCE_CENTERLINE_PARTS = ("pelvis", "chest", "neck", "head")
TOP_BAND_SHARE = 0.18
SLICE_BAND_HEIGHT_RATIO = 0.015
SLICE_WIDTH_MARGIN = 0.82
SLICE_DEPTH_MARGIN = 0.7


def planner_point(world_point, center_x, center_y, min_z):
    return Vector((-(world_point.y - center_y), world_point.z - min_z, -(world_point.x - center_x)))


def average_point(points):
    return sum(points, Vector()) / len(points)


def bounds(points):
    minimum = Vector(
        (
            min(point.x for point in points),
            min(point.y for point in points),
            min(point.z for point in points),
        )
    )
    maximum = Vector(
        (
            max(point.x for point in points),
            max(point.y for point in points),
            max(point.z for point in points),
        )
    )
    return minimum, maximum


def band_center(points, *, upper, share):
    minimum, maximum = bounds(points)
    if upper:
        threshold = maximum.y - (maximum.y - minimum.y) * share
        band = [point for point in points if point.y >= threshold]
    else:
        threshold = minimum.y + (maximum.y - minimum.y) * share
        band = [point for point in points if point.y <= threshold]
    return average_point(band)


def extreme_point(points, axis, *, use_max):
    getter = {"x": lambda point: point.x, "y": lambda point: point.y, "z": lambda point: point.z}[axis]
    return max(points, key=getter) if use_max else min(points, key=getter)


def closest_midpoint(points_a, points_b):
    best_a = points_a[0]
    best_b = points_b[0]
    best_distance = (best_a - best_b).length_squared

    for point_a in points_a:
        for point_b in points_b:
            distance = (point_a - point_b).length_squared
            if distance < best_distance:
                best_a = point_a
                best_b = point_b
                best_distance = distance

    return (best_a + best_b) * 0.5


def remap_reference_point(point, reference_origin, reference_min_y, scale):
    return Vector(
        (
            (point.x - reference_origin.x) * scale,
            (point.y - reference_min_y) * scale,
            (point.z - reference_origin.z) * scale,
        )
    )


def mirror_point(point):
    return Vector((point.x, point.y, -point.z))


def clamp(value, minimum, maximum):
    return max(minimum, min(value, maximum))


def get_slice_points(body_vertices, target_y, band_height):
    slice_points = [point for point in body_vertices if abs(point.y - target_y) <= band_height]
    current_band_height = band_height

    while len(slice_points) < 24 and current_band_height < band_height * 4:
        current_band_height *= 1.5
        slice_points = [point for point in body_vertices if abs(point.y - target_y) <= current_band_height]

    return slice_points if slice_points else body_vertices


def fit_point_to_body(point, body_vertices, height):
    slice_points = get_slice_points(body_vertices, point.y, height * SLICE_BAND_HEIGHT_RATIO)
    slice_center = average_point(slice_points)
    minimum, maximum = bounds(slice_points)
    half_depth = (maximum.x - minimum.x) * 0.5 * SLICE_DEPTH_MARGIN
    half_width = (maximum.z - minimum.z) * 0.5 * SLICE_WIDTH_MARGIN

    return Vector(
        (
            clamp(point.x, slice_center.x - half_depth, slice_center.x + half_depth),
            point.y,
            clamp(point.z, slice_center.z - half_width, slice_center.z + half_width),
        )
    )


def build_reference_bones(reference_vertices, reference_origin, reference_min_y, scale, body_vertices, height):
    pelvis_center = average_point(reference_vertices["pelvis"])
    chest_top = band_center(reference_vertices["chest"], upper=True, share=TOP_BAND_SHARE)
    neck_head_joint = closest_midpoint(reference_vertices["neck"], reference_vertices["head"])
    head_top = extreme_point(reference_vertices["head"], "y", use_max=True)

    shoulder_chest_joint = closest_midpoint(reference_vertices["chest"], reference_vertices["leftShoulder"])
    shoulder_arm_joint = closest_midpoint(reference_vertices["leftShoulder"], reference_vertices["leftUpperArm"])
    shoulder_left = average_point((shoulder_chest_joint, shoulder_arm_joint))
    elbow_left = closest_midpoint(reference_vertices["leftUpperArm"], reference_vertices["leftLowerArm"])
    wrist_left = closest_midpoint(reference_vertices["leftLowerArm"], reference_vertices["leftHand"])
    hand_tip_left = extreme_point(reference_vertices["leftHand"], "x", use_max=True)

    left_upper_leg_center = average_point(reference_vertices["leftUpperLeg"])
    left_upper_leg_top = band_center(reference_vertices["leftUpperLeg"], upper=True, share=TOP_BAND_SHARE)
    hip_left = Vector(
        (
            (pelvis_center.x + left_upper_leg_top.x) * 0.5,
            pelvis_center.y,
            left_upper_leg_center.z,
        )
    )
    knee_left = closest_midpoint(reference_vertices["leftUpperLeg"], reference_vertices["leftLowerLeg"])
    ankle_left = closest_midpoint(reference_vertices["leftLowerLeg"], reference_vertices["leftFoot"])
    toe_left = extreme_point(reference_vertices["leftFoot"], "x", use_max=True)

    torso_tail = Vector(
        (
            (chest_top.x + shoulder_left.x) * 0.5,
            (chest_top.y + shoulder_left.y) * 0.5,
            reference_origin.z,
        )
    )

    landmarks = {
        "hipCenter": pelvis_center,
        "torsoTop": torso_tail,
        "neckBase": neck_head_joint,
        "headTop": head_top,
        "shoulderLeft": shoulder_left,
        "elbowLeft": elbow_left,
        "wristLeft": wrist_left,
        "handTipLeft": hand_tip_left,
        "hipLeft": hip_left,
        "kneeLeft": knee_left,
        "ankleLeft": ankle_left,
        "toeLeft": toe_left,
    }

    fitted_landmarks = {}
    for name, point in landmarks.items():
        remapped_point = remap_reference_point(point, reference_origin, reference_min_y, scale)
        fitted_landmarks[name] = fit_point_to_body(remapped_point, body_vertices, height)

    remapped_bones = {
        "torso": (fitted_landmarks["hipCenter"], fitted_landmarks["torsoTop"], None),
        "head": (fitted_landmarks["neckBase"], fitted_landmarks["headTop"], "torso"),
        "leftUpperArm": (fitted_landmarks["shoulderLeft"], fitted_landmarks["elbowLeft"], "torso"),
        "leftForearm": (fitted_landmarks["elbowLeft"], fitted_landmarks["wristLeft"], "leftUpperArm"),
        "leftHand": (fitted_landmarks["wristLeft"], fitted_landmarks["handTipLeft"], "leftForearm"),
        "leftThigh": (fitted_landmarks["hipLeft"], fitted_landmarks["kneeLeft"], "torso"),
        "leftShin": (fitted_landmarks["kneeLeft"], fitted_landmarks["ankleLeft"], "leftThigh"),
        "leftFoot": (fitted_landmarks["ankleLeft"], fitted_landmarks["toeLeft"], "leftShin"),
    }

    left_arm = remapped_bones["leftUpperArm"]
    left_forearm = remapped_bones["leftForearm"]
    left_hand = remapped_bones["leftHand"]
    left_thigh = remapped_bones["leftThigh"]
    left_shin = remapped_bones["leftShin"]
    left_foot = remapped_bones["leftFoot"]

    remapped_bones["rightUpperArm"] = (mirror_point(left_arm[0]), mirror_point(left_arm[1]), "torso")
    remapped_bones["rightForearm"] = (mirror_point(left_forearm[0]), mirror_point(left_forearm[1]), "rightUpperArm")
    remapped_bones["rightHand"] = (mirror_point(left_hand[0]), mirror_point(left_hand[1]), "rightForearm")
    remapped_bones["rightThigh"] = (mirror_point(left_thigh[0]), mirror_point(left_thigh[1]), "torso")
    remapped_bones["rightShin"] = (mirror_point(left_shin[0]), mirror_point(left_shin[1]), "rightThigh")
    remapped_bones["rightFoot"] = (mirror_point(left_foot[0]), mirror_point(left_foot[1]), "rightShin")

    return remapped_bones


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
    reference_vertices = {}
    reference_points = []

    for part_name, object_name in REFERENCE_PARTS.items():
        reference_object = bpy.data.objects[object_name]
        part_vertices = [planner_point(reference_object.matrix_world @ vertex.co, center_x, center_y, min_z) for vertex in reference_object.data.vertices]
        reference_vertices[part_name] = part_vertices
        reference_points.extend(part_vertices)

    reference_min, reference_max = bounds(reference_points)
    reference_height = reference_max.y - reference_min.y
    reference_centerline_points = [
        average_point(reference_vertices[part_name]) for part_name in REFERENCE_CENTERLINE_PARTS
    ]
    reference_origin = Vector(
        (
            sum(point.x for point in reference_centerline_points) / len(reference_centerline_points),
            0.0,
            sum(point.z for point in reference_centerline_points) / len(reference_centerline_points),
        )
    )
    scale = height / reference_height
    bones = build_reference_bones(reference_vertices, reference_origin, reference_min.y, scale, vertices, height)

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
