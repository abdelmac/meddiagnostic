"""Own offline exporter for the pinned, original Z-Anatomy Blender data.

Run only with official Blender, --background --factory-startup --disable-autoexec.
The upstream add-on and embedded source scripts are never executed.
Inventory omits custom-property values (which may contain imported article text).
Exports remain private and require a reviewed explicit allowlist. Source zero
normals are recorded, never silently replaced or used to invent geometry.
"""
import argparse
from array import array
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys
import time

import bpy
from mathutils import Matrix, Vector

SOURCE_SHA256 = "9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd"
SOURCE_PIN = "caf0f6078f2a0ac9e65e81dce042d5a30b65d0f0"


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mode", choices=["inventory", "export"], default="inventory")
    parser.add_argument("--allowlist", type=Path)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:])


def property_names(item):
    return sorted(str(key) for key in item.keys()) if item else []


def serial_matrix(matrix):
    return [float(matrix[row][column]) for row in range(4) for column in range(4)]


def world_box(obj):
    coords = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return {"min": [min(p[i] for p in coords) for i in range(3)], "max": [max(p[i] for p in coords) for i in range(3)]}


def collection_paths():
    paths = {}

    def visit(collection, parents, seen):
        if collection.as_pointer() in seen:
            return
        current = parents + [collection.name]
        paths.setdefault(collection.as_pointer(), []).append(current)
        for child in collection.children:
            visit(child, current, seen | {collection.as_pointer()})

    for scene in bpy.data.scenes:
        visit(scene.collection, ["scene:" + scene.name], set())
    for collection in bpy.data.collections:
        if collection.as_pointer() not in paths:
            visit(collection, ["unlinked"], set())
    return paths


def ancestors(obj):
    result = []
    seen = set()
    current = obj.parent
    while current and current.as_pointer() not in seen:
        seen.add(current.as_pointer())
        result.append(current.name)
        current = current.parent
    return result


def inventory(source):
    collection_lookup = collection_paths()
    objects = []
    for obj in sorted(bpy.data.objects, key=lambda item: item.name):
        if obj.type not in {"MESH", "CURVE"}:
            continue
        data = obj.data
        record = {"name": obj.name, "sourceType": obj.type, "dataName": data.name,
                  "parent": obj.parent.name if obj.parent else None,
                  "ancestors": ancestors(obj),
                  "collections": sorted(collection.name for collection in obj.users_collection),
                  "collectionPaths": [path for collection in obj.users_collection for path in collection_lookup.get(collection.as_pointer(), [])],
                  "materialSlots": [slot.material.name if slot.material else None for slot in obj.material_slots],
                  "propertyNames": property_names(obj), "dataPropertyNames": property_names(data),
                  "worldMatrixRowMajor": serial_matrix(obj.matrix_world),
                  "worldDeterminant": obj.matrix_world.to_3x3().determinant(),
                  "boundsBlenderWorld": world_box(obj),
                  "modifiers": [{"name": mod.name, "type": mod.type, "showViewport": mod.show_viewport, "showRender": mod.show_render} for mod in obj.modifiers],
                  "hideViewport": obj.hide_viewport, "hideRender": obj.hide_render,
                  "library": obj.library.filepath if obj.library else None}
        if obj.type == "MESH":
            record.update(vertices=len(data.vertices), polygons=len(data.polygons), loops=len(data.loops), hasCustomNormals=data.has_custom_normals)
        else:
            record.update(splines=len(data.splines), bevelDepth=data.bevel_depth, bevelResolution=data.bevel_resolution,
                          resolutionU=data.resolution_u, renderResolutionU=data.render_resolution_u,
                          bevelMode=data.bevel_mode, bevelObject=data.bevel_object.name if data.bevel_object else None,
                          taperObject=data.taper_object.name if data.taper_object else None,
                          useFillCaps=data.use_fill_caps,
                          splinePointCounts=[{"type": spline.type, "points": len(spline.points), "bezierPoints": len(spline.bezier_points),
                                              "resolutionU": spline.resolution_u, "cyclic": spline.use_cyclic_u} for spline in data.splines])
        objects.append(record)
    return {"schema": "ippomed-z-anatomy-inventory-v1", "source": str(source), "sourceSha256": SOURCE_SHA256, "sourcePin": SOURCE_PIN, "blenderVersion": bpy.app.version_string,
            "autoexecDisabled": not bpy.context.preferences.filepaths.use_scripts_auto_execute,
            "sourceCodeExecuted": False, "frame": bpy.context.scene.frame_current,
            "sceneUnits": {"system": bpy.context.scene.unit_settings.system, "scaleLength": bpy.context.scene.unit_settings.scale_length},
            "matrixConvention": "row-major; Blender Z-up source world", "counts": dict(Counter(obj.type for obj in bpy.data.objects)),
            "geometryCandidates": sum(item["sourceType"] == "CURVE" or item.get("polygons", 0) > 1 for item in objects),
            "materials": [{"name": material.name, "diffuseColor": list(material.diffuse_color), "useNodes": material.use_nodes,
                           "nodeTypes": sorted(set(node.type for node in material.node_tree.nodes)) if material.node_tree else [],
                           "imageNames": sorted(set(node.image.name for node in material.node_tree.nodes if node.type == "TEX_IMAGE" and node.image)) if material.node_tree else [],
                           "propertyNames": property_names(material)} for material in bpy.data.materials],
            "textBlocks": [{"name": block.name, "lines": len(block.lines), "characters": sum(len(line.body) for line in block.lines)} for block in bpy.data.texts],
            "labels": [{"objectName": obj.name, "dataName": obj.data.name, "formattedCharacters": len(obj.data.body_format)} for obj in bpy.data.objects if obj.type == "FONT"],
            "objects": objects}


def show_for_evaluation():
    # Visibility changes exist only in this process. Never save the source blend.
    for collection in bpy.data.collections:
        collection.hide_viewport = False
    for obj in bpy.data.objects:
        obj.hide_viewport = False
        try:
            obj.hide_set(False)
        except RuntimeError:
            pass

    def visit(layer):
        layer.exclude = False
        layer.hide_viewport = False
        for child in layer.children:
            visit(child)

    for scene in bpy.data.scenes:
        for view_layer in scene.view_layers:
            visit(view_layer.layer_collection)
    bpy.context.view_layer.update()


def write_array(handle, values, component_type, components):
    while handle.tell() % 4:
        handle.write(b"\0")
    offset = handle.tell()
    if sys.byteorder != "little":
        values.byteswap()
    raw = values.tobytes()
    handle.write(raw)
    return {"byteOffset": offset, "byteLength": len(raw), "componentType": component_type,
            "components": components, "count": len(values) // components}


def export_geometry(args, source_inventory):
    if args.allowlist is None:
        raise ValueError("Export requires a reviewed, explicit object-name allowlist")
    decision = json.loads(args.allowlist.read_text(encoding="utf-8"))
    allowed = set(decision["allowedObjectNames"])
    by_name = {obj.name: obj for obj in bpy.data.objects}
    missing = sorted(allowed - by_name.keys())
    if missing:
        raise ValueError(f"Missing source objects: {missing}")
    inventory_by_name = {obj["name"]: obj for obj in source_inventory["objects"]}
    invalid_types = sorted(name for name in allowed if name not in inventory_by_name)
    if invalid_types:
        raise ValueError(f"Allowlist includes non-geometric objects: {invalid_types}")
    show_for_evaluation()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    # One common proper rotation, determinant +1, no scaling or per-system centering.
    rotation = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
    records = []
    rejected = []
    binary_path = args.output / "geometry.bin"
    with binary_path.open("wb") as handle:
        for ordinal, name in enumerate(sorted(allowed)):
            obj = by_name[name]
            metadata = inventory_by_name[name]
            evaluated = obj.evaluated_get(depsgraph)
            mesh = None
            try:
                mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
                if mesh is None:
                    raise ValueError("No evaluated mesh")
                mesh.calc_loop_triangles()
                if not mesh.loop_triangles:
                    raise ValueError("No evaluated triangles")
                world = rotation @ evaluated.matrix_world
                normal_transform = world.to_3x3().inverted().transposed()
                determinant = world.to_3x3().determinant()
                # One vertex for each corner preserves all source split normals.
                # Triangle indices address these corners; Node may losslessly weld.
                positions = array("f")
                normals = array("f")
                indices = array("I")
                materials = array("H")
                minimum = [float("inf")] * 3
                maximum = [float("-inf")] * 3
                source_normals = mesh.corner_normals
                undefined_normal_count = 0
                if len(source_normals) != len(mesh.loops):
                    raise ValueError("Evaluated corner-normal count does not match loops")
                for loop in mesh.loops:
                    position = world @ mesh.vertices[loop.vertex_index].co
                    normal = normal_transform @ source_normals[loop.index].vector
                    if normal.length_squared == 0:
                        undefined_normal_count += 1
                    normal.normalize()
                    positions.extend(position)
                    normals.extend(normal)
                    for axis in range(3):
                        minimum[axis] = min(minimum[axis], position[axis])
                        maximum[axis] = max(maximum[axis], position[axis])
                for triangle in mesh.loop_triangles:
                    a, b, c = triangle.loops
                    indices.extend((a, c, b) if determinant < 0 else (a, b, c))
                    materials.append(triangle.material_index)
                record = {
                    "geometryKey": f"z-source-{ordinal:05d}", "sourceObjectName": name,
                    "sourceDataName": obj.data.name, "sourceType": obj.type,
                    "ancestorNames": metadata["ancestors"], "collectionPaths": metadata["collectionPaths"],
                    "materialNames": metadata["materialSlots"],
                    "worldMatrixRowMajor": serial_matrix(world),
                    "negativeDeterminant": determinant < 0, "reflectionCorrected": determinant < 0,
                    "bounds": {"min": minimum, "max": maximum},
                    "triangles": len(mesh.loop_triangles), "vertexCount": len(mesh.loops),
                    "evaluatedVertexCount": len(mesh.vertices),
                    "sourceHasCustomNormals": mesh.has_custom_normals,
                    "undefinedSourceNormalCount": undefined_normal_count,
                    "normalMethod": "evaluated corner normals transformed by inverse transpose",
                    "positions": write_array(handle, positions, "Float32", 3),
                    "normals": write_array(handle, normals, "Float32", 3),
                    "indices": write_array(handle, indices, "Uint32", 1),
                    "materialIndices": write_array(handle, materials, "Uint16", 1),
                }
                records.append(record)
            except Exception as error:
                rejected.append({"sourceObjectName": name, "error": str(error)})
                print(json.dumps({"error": name, "reason": str(error)}), flush=True)
            finally:
                if mesh is not None:
                    evaluated.to_mesh_clear()
            if ordinal % 100 == 0:
                print(json.dumps({"processed": ordinal + 1, "allowed": len(allowed), "bytes": handle.tell()}), flush=True)
    result = {"schema": "ippomed-z-anatomy-mesh-v1", "binary": binary_path.name,
              "byteOrder": "little-endian", "coordinateSystem": "Y-up metres: Blender (x,y,z) -> (x,z,-y)",
              "matrixConvention": "row-major source object to common Y-up world; positions already transformed",
              "source": source_inventory["source"], "blenderVersion": bpy.app.version_string,
              "sourceSha256": SOURCE_SHA256, "sourcePin": SOURCE_PIN,
              "sourceCodeExecuted": False, "allowlist": str(args.allowlist),
              "evaluationMode": "VIEWPORT; authored modifier flags and curve resolutions preserved",
              "privateOnly": bool(decision.get("privateOnly", True)), "productionRedistributionReviewed": False,
              "publicationStatus": decision.get("publicationStatus", "UNREVIEWED"),
              "objects": records, "rejected": rejected,
              "undefinedSourceNormals": {"count": sum(record["undefinedSourceNormalCount"] for record in records),
                                          "rawValuesPreserved": True, "repairDeferredToImporter": True},
              "counts": {"objects": len(records), "triangles": sum(record["triangles"] for record in records),
                         "vertices": sum(record["vertexCount"] for record in records), "binaryBytes": binary_path.stat().st_size}}
    (args.output / "index.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"stageIndex": str(args.output / "index.json"), "counts": result["counts"], "rejected": len(rejected)}), flush=True)
    if rejected:
        raise RuntimeError("Some allowlisted geometry failed evaluation; see index.rejected")


def main():
    args = arguments()
    assert bpy.app.version == (4, 5, 15), "Reproducible conversion requires official Blender 4.5.15"
    args.output.mkdir(parents=True, exist_ok=True)
    assert not bpy.context.preferences.filepaths.use_scripts_auto_execute, "Use --disable-autoexec"
    with args.source.open("rb") as source_handle:
        assert hashlib.file_digest(source_handle, "sha256").hexdigest() == SOURCE_SHA256, "Unexpected source SHA256"
    started = time.time()
    bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()), load_ui=False, use_scripts=False)
    result = inventory(args.source)
    destination = args.output / "inventory.json"
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"inventory": str(destination), "counts": result["counts"], "geometryCandidates": result["geometryCandidates"], "elapsedSeconds": round(time.time() - started, 2)}), flush=True)
    if args.mode == "export":
        export_geometry(args, result)


if __name__ == "__main__":
    main()
