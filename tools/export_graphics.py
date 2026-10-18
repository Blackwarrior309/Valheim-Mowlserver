"""Export static Valheim prefab geometry and diffuse textures for the web viewer.

Requires UnityPy==1.25.4, numpy and Pillow. Reads the game installation only.
Usage: python tools/export_graphics.py --game F:/SteamLibrary/steamapps/common/Valheim
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

import numpy as np
import UnityPy
from UnityPy.helpers.MeshHelper import MeshHandler


def matrix(t):
    q = t.m_LocalRotation
    x, y, z, w = q.x, q.y, q.z, q.w
    r = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                  [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                  [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    m = np.eye(4)
    s, p = t.m_LocalScale, t.m_LocalPosition
    m[:3, :3] = r @ np.diag([s.x, s.y, s.z])
    m[:3, 3] = [p.x, p.y, p.z]
    return m


def props(items):
    return {k if isinstance(k, str) else k.name: v for k, v in items}


def rounded(a):
    a = np.asarray(a)
    if not np.isfinite(a).all():
        raise ValueError('Non-finite mesh data')
    return np.round(a, 5).reshape(-1).tolist()


class Exporter:
    def __init__(self, output):
        self.output = output
        self.textures = {}
        self.materials = {}
        self.meshes = {}

    def texture(self, ptr):
        key = (ptr.assetsfile.name, ptr.path_id)
        if key not in self.textures:
            tex = ptr.read()
            image = tex.image.convert('RGBA')
            image.thumbnail((1024, 1024))
            # UnityPy returns top-left images; Three.js TextureLoader flips to UV origin.
            digest = hashlib.sha256(image.tobytes() + str(image.size).encode()).hexdigest()[:20]
            name = 'textures/' + digest + '.webp'
            image.save(self.output / name, 'WEBP', quality=88, method=6)
            self.textures[key] = name
        return self.textures[key]

    def material(self, ptr):
        if not ptr:
            return {'color': [1, 1, 1], 'opacity': 1}
        key = (ptr.assetsfile.name, ptr.path_id)
        if key in self.materials:
            return self.materials[key]
        mat = ptr.read()
        colors = props(mat.m_SavedProperties.m_Colors)
        floats = props(mat.m_SavedProperties.m_Floats)
        texs = props(mat.m_SavedProperties.m_TexEnvs)
        color = colors.get('_Color')
        try:
            shader = mat.m_Shader.read().m_ParsedForm.m_Name if mat.m_Shader else ''
        except FileNotFoundError:
            # Some effect shaders live in a separate bundle; only their mode is needed here.
            shader = ''
        keywords = getattr(mat, 'm_ValidKeywords', []) or []
        cutout = floats.get('_Mode') == 1 or '_ALPHATEST_ON' in keywords or 'Vegetation' in shader
        d = {'name': mat.m_Name, 'color': [color.r, color.g, color.b] if color else [1, 1, 1],
             'opacity': max(0, min(1, color.a if color else 1)),
             'cutoff': floats.get('_Cutoff', 0.5) if cutout else 0}
        main = texs.get('_MainTex') or texs.get('_BaseMap')
        if main and main.m_Texture:
            d['map'] = self.texture(main.m_Texture)
            d['repeat'] = [main.m_Scale.x, main.m_Scale.y]
            d['offset'] = [main.m_Offset.x, main.m_Offset.y]
        self.materials[key] = d
        return d

    def components(self, go):
        return {p.component.type.name: p.component.read() for p in go.m_Component
                if p.component and p.component.type.name in ('Transform', 'MeshFilter', 'MeshRenderer', 'SkinnedMeshRenderer', 'LODGroup')}

    def prefab(self, ptr):
        root = ptr.read()
        nodes = []
        excluded = set()

        def walk(go, parent, is_root=False):
            if not is_root and not go.m_IsActive:
                return
            c = self.components(go)
            t = c.get('Transform')
            if t is None:
                return
            # Preserve authored scale and orientation; world position comes from the snapshot.
            local = matrix(t)
            if is_root:
                local[:3, 3] = 0
            world = parent @ local
            lod = c.get('LODGroup')
            if lod:
                first = {p.renderer.path_id for p in lod.m_LODs[0].renderers if p.renderer} if lod.m_LODs else set()
                for level in lod.m_LODs[1:]:
                    excluded.update(p.renderer.path_id for p in level.renderers if p.renderer and p.renderer.path_id not in first)
            renderer, mf = c.get('SkinnedMeshRenderer') or c.get('MeshRenderer'), c.get('MeshFilter')
            mesh_ptr = getattr(renderer, 'm_Mesh', None) or (mf.m_Mesh if mf else None)
            if renderer and mesh_ptr and renderer.m_Enabled:
                # Worn/destroyed variants are usually inactive; exclude snap points regardless.
                nodes.append((renderer, mesh_ptr, world))
            for child in t.m_Children:
                ct = child.read()
                walk(ct.m_GameObject.read(), world)

        walk(root, np.eye(4), True)
        positions, normals, uvs, indices, groups, materials = [], [], [], [], [], []
        for renderer, mesh_ptr, world in nodes:
            if renderer.object_reader.path_id in excluded:
                continue
            key = (mesh_ptr.assetsfile.name, mesh_ptr.path_id)
            if key not in self.meshes:
                h = MeshHandler(mesh_ptr.read())
                h.process()
                self.meshes[key] = h
            h = self.meshes[key]
            if not h.m_Vertices:
                continue
            p = np.asarray(h.m_Vertices)[:, :3]
            p = p @ world[:3, :3].T + world[:3, 3]
            p[:, 2] *= -1  # Unity left-handed -> viewer right-handed.
            if h.m_Normals:
                n = np.asarray(h.m_Normals)[:, :3] @ np.linalg.inv(world[:3, :3])
                n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
                n[:, 2] *= -1
            else:
                n = np.zeros_like(p)
            base = len(positions) // 3
            positions.extend(rounded(p))
            normals.extend(rounded(n))
            uvs.extend(rounded(np.asarray(h.m_UV0)[:, :2]) if h.m_UV0 else [0, 0] * len(p))
            for i, triangles in enumerate(h.get_triangles()):
                if not triangles:
                    continue
                mat_ptr = renderer.m_Materials[min(i, len(renderer.m_Materials)-1)] if renderer.m_Materials else None
                mat = self.material(mat_ptr)
                if mat not in materials:
                    materials.append(mat)
                start = len(indices)
                for tri in triangles:
                    # Mirror flips winding; a negative node scale flips it again.
                    order = tri if np.linalg.det(world[:3, :3]) < 0 else tri[::-1]
                    indices.extend(base + int(v) for v in order)
                groups.append([start, len(indices)-start, materials.index(mat)])
        if not indices:
            raise ValueError('No active static meshes')
        return {'version': 1, 'positions': positions, 'normals': normals, 'uvs': uvs,
                'indices': indices, 'groups': groups, 'materials': materials}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game', type=Path, required=True)
    parser.add_argument('--out', type=Path, default=Path('assets/valheim'))
    parser.add_argument('--only', nargs='*', help='Update selected prefabs, retaining other entries in an existing pack')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    data = json.loads((root / 'js/data.js').read_text(encoding='utf-8').split('g.VW_DATA=', 1)[1].split(';}', 1)[0])
    wanted = set(data['pieces'])
    wanted.update(data['prefabs'].get(h) for h in data['nature'])
    wanted.discard(None)
    all_wanted = set(wanted)
    if args.only:
        wanted = set(args.only)
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / 'textures').mkdir(exist_ok=True)
    (args.out / 'models').mkdir(exist_ok=True)
    soft = args.game / 'valheim_Data/StreamingAssets/SoftRef'
    manifest = (soft / 'manifest_extended').read_text(encoding='utf-8')
    paths = re.findall(r'  bundle: ([^\r\n]+)\r?\n  path in bundle: ([^\r\n]+)', manifest)
    bundles = sorted({b for b, p in paths if p.lower().endswith('.prefab') and Path(p).stem in wanted})
    if not bundles:
        raise SystemExit('No matching prefab bundles found')
    # One environment keeps cross-bundle PPtrs resolvable without loading the installation wholesale.
    env = UnityPy.Environment(path=str(args.game / 'valheim_Data/Resources'))
    for builtin in ('unity default resources', 'unity_builtin_extra'):
        resource = args.game / 'valheim_Data/Resources' / builtin
        if resource.exists():
            env.load_file(str(resource))
    for bundle in bundles:
        print('Loading bundle', bundle, flush=True)
        env.load_file(str(soft / 'Bundles' / bundle))
    exporter = Exporter(args.out)
    models, errors = {}, {}
    if args.only and (args.out / 'index.json').exists():
        models = json.loads((args.out / 'index.json').read_text(encoding='utf-8'))['models']
        report_file = args.out / 'export-report.json'
        if report_file.exists():
            errors = json.loads(report_file.read_text(encoding='utf-8')).get('errors', {})
        for name in wanted:
            models.pop(name, None)
            errors.pop(name, None)
    for path, ptr in env.container.items():
        if not path.lower().endswith('.prefab'):
            continue
        if args.only and Path(path).stem not in wanted:
            continue
        name = ptr.read().m_Name
        if name not in wanted or name in models:
            continue
        try:
            model = exporter.prefab(ptr)
            safe = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
            file = 'models/' + safe + '.json'
            payload = json.dumps(model, separators=(',', ':'), allow_nan=False).encode()
            (args.out / file).write_bytes(payload)
            models[name] = {'file': file, 'version': hashlib.sha256(payload).hexdigest()[:12]}
            print('Exported', name, len(model['indices'])//3, 'triangles', flush=True)
        except Exception as exc:
            errors[name] = str(exc)
            print('Skipped', name, str(exc), flush=True)
    index = {'version': 1, 'source': 'Valheim local installation', 'models': models}
    (args.out / 'index.json').write_text(json.dumps(index, indent=2), encoding='utf-8')
    report = {'exported': len(models), 'missing': sorted(all_wanted-set(models)), 'errors': errors,
              'limitations': ['Static meshes only; no Unity shaders, animation, particles or dynamic object states.']}
    (args.out / 'export-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('Export complete:', len(models), 'models;', len(errors), 'errors', flush=True)
    if not models:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
