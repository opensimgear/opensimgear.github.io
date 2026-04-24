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
JOINT_BAND_SHARE = 0.12
SLICE_BAND_HEIGHT_RATIO = 0.015
SLICE_WIDTH_MARGIN = 0.82
SLICE_DEPTH_MARGIN = 0.7
EXACT_FIT_LANDMARKS = {"shoulderLeft", "elbowLeft", "wristLeft", "handTipLeft", "kneeLeft", "ankleLeft"}
SECTION_CENTER_LANDMARKS = {"elbowLeft", "wristLeft", "handTipLeft", "kneeLeft", "ankleLeft"}
SECTION_EPSILON = 0.00001


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


def combine_points(*point_groups):
    points = []
    for point_group in point_groups:
        points.extend(point_group)
    return points


def points_near_y(points, target_y, share):
    minimum, maximum = bounds(points)
    band_height = (maximum.y - minimum.y) * share
    band = [point for point in points if abs(point.y - target_y) <= band_height]
    return band if band else points


def centered_xz_in_bounds(point, points):
    minimum, maximum = bounds(points_near_y(points, point.y, JOINT_BAND_SHARE))
    return Vector(
        (
            (minimum.x + maximum.x) * 0.5,
            point.y,
            (minimum.z + maximum.z) * 0.5,
        )
    )


def dedupe_points(points):
    deduped = []
    keys = set()
    for point in points:
        key = (round(point.x / SECTION_EPSILON), round(point.z / SECTION_EPSILON))
        if key in keys:
            continue
        keys.add(key)
        deduped.append(point)
    return deduped


def section_segments_at_y(vertices, faces, target_y):
    segments = []

    for face in faces:
        intersections = []

        for index, vertex_index in enumerate(face):
            start = vertices[vertex_index]
            end = vertices[face[(index + 1) % len(face)]]

            if abs(start.y - end.y) <= SECTION_EPSILON:
                continue

            lower_y = min(start.y, end.y)
            upper_y = max(start.y, end.y)
            if target_y < lower_y - SECTION_EPSILON or target_y > upper_y + SECTION_EPSILON:
                continue

            factor = (target_y - start.y) / (end.y - start.y)
            if factor < -SECTION_EPSILON or factor > 1 + SECTION_EPSILON:
                continue

            point = start.lerp(end, clamp(factor, 0.0, 1.0))
            intersections.append(Vector((point.x, target_y, point.z)))

        intersections = dedupe_points(intersections)
        if len(intersections) == 2:
            segments.append((intersections[0], intersections[1]))
        elif len(intersections) > 2:
            center = average_point(intersections)
            intersections.sort(key=lambda point: (point.x - center.x, point.z - center.z))
            for index in range(0, len(intersections) - 1, 2):
                segments.append((intersections[index], intersections[index + 1]))

    return segments


def section_components(segments):
    points_by_key = {}
    edges_by_key = {}

    for start, end in segments:
        start_key = (round(start.x / SECTION_EPSILON), round(start.z / SECTION_EPSILON))
        end_key = (round(end.x / SECTION_EPSILON), round(end.z / SECTION_EPSILON))
        if start_key == end_key:
            continue

        points_by_key[start_key] = start
        points_by_key[end_key] = end
        edges_by_key.setdefault(start_key, set()).add(end_key)
        edges_by_key.setdefault(end_key, set()).add(start_key)

    components = []
    seen = set()

    for start_key in points_by_key:
        if start_key in seen:
            continue

        stack = [start_key]
        component_keys = []
        seen.add(start_key)

        while stack:
            key = stack.pop()
            component_keys.append(key)

            for next_key in edges_by_key.get(key, ()):
                if next_key in seen:
                    continue
                seen.add(next_key)
                stack.append(next_key)

        components.append([points_by_key[key] for key in component_keys])

    return components


def section_component_from_body(seed_point, body_vertices, body_faces):
    segments = section_segments_at_y(body_vertices, body_faces, seed_point.y)
    components = [component for component in section_components(segments) if len(component) >= 6]

    if not components:
        return None

    return min(
        components,
        key=lambda points: (average_point(points).x - seed_point.x) ** 2 + (average_point(points).z - seed_point.z) ** 2,
    )


def section_center_from_body(seed_point, body_vertices, body_faces):
    component = section_component_from_body(seed_point, body_vertices, body_faces)
    if component is None:
        return seed_point

    minimum, maximum = bounds(component)

    return Vector(
        (
            (minimum.x + maximum.x) * 0.5,
            seed_point.y,
            (minimum.z + maximum.z) * 0.5,
        )
    )


def section_external_equal_distance_point(seed_point, body_vertices, body_faces):
    component = section_component_from_body(seed_point, body_vertices, body_faces)
    if component is None:
        return seed_point

    minimum, maximum = bounds(component)
    depth_distance = (maximum.x - minimum.x) * 0.5
    is_right_side = seed_point.z >= 0
    external_z = maximum.z if is_right_side else minimum.z
    z = external_z - depth_distance * 0.7 if is_right_side else external_z + depth_distance * 0.7

    return Vector(
        (
            (minimum.x + maximum.x) * 0.5,
            seed_point.y,
            clamp(z, minimum.z, maximum.z),
        )
    )


def shoulder_point_from_bounds(points):
    minimum, maximum = bounds(points)
    distance = (maximum.x - minimum.x) * 0.5
    return Vector(
        (
            minimum.x + distance,
            maximum.y - distance,
            (minimum.z + maximum.z) * 0.5,
        )
    )


def ankle_point_from_bounds(points):
    minimum, maximum = bounds(points)
    distance = (maximum.y - minimum.y) * 0.5
    return Vector(
        (
            minimum.x + distance,
            minimum.y + distance,
            (minimum.z + maximum.z) * 0.5,
        )
    )


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


def fit_point_to_body(point, body_vertices, height, *, use_margin=True):
    slice_points = get_slice_points(body_vertices, point.y, height * SLICE_BAND_HEIGHT_RATIO)
    slice_center = average_point(slice_points)
    minimum, maximum = bounds(slice_points)
    depth_margin = SLICE_DEPTH_MARGIN if use_margin else 1.0
    width_margin = SLICE_WIDTH_MARGIN if use_margin else 1.0
    half_depth = (maximum.x - minimum.x) * 0.5 * depth_margin
    half_width = (maximum.z - minimum.z) * 0.5 * width_margin

    return Vector(
        (
            clamp(point.x, slice_center.x - half_depth, slice_center.x + half_depth),
            point.y,
            clamp(point.z, slice_center.z - half_width, slice_center.z + half_width),
        )
    )


def build_reference_bones(reference_vertices, reference_origin, reference_min_y, scale, body_vertices, body_faces, height):
    pelvis_center = average_point(reference_vertices["pelvis"])
    chest_top = band_center(reference_vertices["chest"], upper=True, share=TOP_BAND_SHARE)
    neck_head_joint = closest_midpoint(reference_vertices["neck"], reference_vertices["head"])
    head_top = extreme_point(reference_vertices["head"], "y", use_max=True)

    shoulder_left = shoulder_point_from_bounds(
        combine_points(reference_vertices["leftShoulder"], reference_vertices["leftUpperArm"])
    )
    elbow_left = centered_xz_in_bounds(
        closest_midpoint(reference_vertices["leftUpperArm"], reference_vertices["leftLowerArm"]),
        combine_points(reference_vertices["leftUpperArm"], reference_vertices["leftLowerArm"]),
    )
    wrist_left = centered_xz_in_bounds(
        closest_midpoint(reference_vertices["leftLowerArm"], reference_vertices["leftHand"]),
        combine_points(reference_vertices["leftLowerArm"], reference_vertices["leftHand"]),
    )
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
    knee_left = centered_xz_in_bounds(
        closest_midpoint(reference_vertices["leftUpperLeg"], reference_vertices["leftLowerLeg"]),
        combine_points(reference_vertices["leftUpperLeg"], reference_vertices["leftLowerLeg"]),
    )
    ankle_left = centered_xz_in_bounds(
        closest_midpoint(reference_vertices["leftLowerLeg"], reference_vertices["leftFoot"]),
        combine_points(reference_vertices["leftLowerLeg"], reference_vertices["leftFoot"]),
    )
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
        if name == "shoulderLeft":
            remapped_point = section_external_equal_distance_point(remapped_point, body_vertices, body_faces)
        if name in SECTION_CENTER_LANDMARKS:
            remapped_point = section_center_from_body(remapped_point, body_vertices, body_faces)

        fitted_landmarks[name] = fit_point_to_body(
            remapped_point,
            body_vertices,
            height,
            use_margin=name not in EXACT_FIT_LANDMARKS,
        )

    right_shoulder = section_external_equal_distance_point(
        mirror_point(fitted_landmarks["shoulderLeft"]),
        body_vertices,
        body_faces,
    )
    right_elbow = section_center_from_body(mirror_point(fitted_landmarks["elbowLeft"]), body_vertices, body_faces)
    right_wrist = section_center_from_body(mirror_point(fitted_landmarks["wristLeft"]), body_vertices, body_faces)
    right_hand_tip = section_center_from_body(mirror_point(fitted_landmarks["handTipLeft"]), body_vertices, body_faces)
    right_knee = section_center_from_body(mirror_point(fitted_landmarks["kneeLeft"]), body_vertices, body_faces)
    right_ankle = section_center_from_body(mirror_point(fitted_landmarks["ankleLeft"]), body_vertices, body_faces)

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

    remapped_bones["rightUpperArm"] = (right_shoulder, right_elbow, "torso")
    remapped_bones["rightForearm"] = (right_elbow, right_wrist, "rightUpperArm")
    remapped_bones["rightHand"] = (right_wrist, right_hand_tip, "rightForearm")
    remapped_bones["rightThigh"] = (mirror_point(left_thigh[0]), right_knee, "torso")
    remapped_bones["rightShin"] = (right_knee, right_ankle, "rightThigh")
    remapped_bones["rightFoot"] = (right_ankle, mirror_point(left_foot[1]), "rightShin")

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
    bones = build_reference_bones(reference_vertices, reference_origin, reference_min.y, scale, vertices, faces, height)

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
