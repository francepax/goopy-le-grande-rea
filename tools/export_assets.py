"""Export Goopy Le Grande level assets (sprites, animations, background layout) for the web remake.

Usage: export_assets.py <Cuphead Data dir> <output dir>
"""
import UnityPy, sys, os, re, json, struct, math
from PIL import Image

D, OUT = sys.argv[1], sys.argv[2]
B = D + "/StreamingAssets/AssetBundles/"
os.makedirs(OUT, exist_ok=True)

# ---------- which clips we want ----------
CLIP_RULES = [
    ("sharedassets20.assets", r"^anim_level_slime_(small|big)_slime_|^anim_level_slime_tombstone_|^anim_level_slime_question_mark_|^slime_bg_stream$"),
    ("sharedassets8.assets", r"^anim_player_(idle|run|jump|duck|dash|hit|intro|aim|shoot|death_level|parry|land|ground|fall)"
                             r"|^anim_peashot_basic_(a|b|c|loop|die)$|^anim_weapon_peashot_basic_flash_a$"
                             r"|^anim_effect_player_(hit_a|grounded_a|dash_a|parry_a)$|^anim_effect_parry_spark_a$|^anim_effect_dust_run_a$"
                             r"|^anim_hud_health_|^anim_hud_card_cuphead_idle_a$"),
]
CLIP_EXCLUDE = re.compile(r"chalice|plane|mugman|_tutorial", re.I)
BUNDLES = ["atlas_slimelevel", "atlas_player", "atlas_playerfx", "atlas_forest_common", "atlas_world_1_common"]


def f32(u):
    return struct.unpack("<f", struct.pack("<I", u))[0]


def decode_streamed(data):
    """Return list of (time, curveIndex, value) from a Unity StreamedClip uint32 array."""
    out, i = [], 0
    while i < len(data):
        t = f32(data[i]); n = data[i + 1]; i += 2
        for _ in range(n):
            idx = data[i]; val = f32(data[i + 4]); i += 5
            out.append((t, idx, val))
    return out


# ---------- load bundles: name -> sprite object ----------
bundle_sprites = {}
for b in BUNDLES:
    if not os.path.exists(B + b):
        print("missing bundle", b); continue
    benv = UnityPy.load(B + b)
    for o in benv.objects:
        if o.type.name == "Sprite":
            nm = o.peek_name()
            bundle_sprites.setdefault(nm, o)
print("bundle sprites:", len(bundle_sprites))

needed = {}  # sprite name -> bundle obj


def want_sprite(name):
    if name in needed: return True
    o = bundle_sprites.get(name)
    if o is None: return False
    needed[name] = o
    return True


# ---------- clips ----------
anims = {}
for fname, rule in CLIP_RULES:
    env = UnityPy.load(D + "/" + fname)
    af = None
    for o in env.objects:
        if o.type.name != "AnimationClip": continue
        nm = o.peek_name()
        if not re.search(rule, nm) or CLIP_EXCLUDE.search(nm): continue
        t = o.read_typetree()
        mapping = t["m_ClipBindingConstant"]["pptrCurveMapping"]
        names = []
        for p in mapping:
            if p["m_FileID"] != 0 or p["m_PathID"] not in o.assets_file.objects:
                names.append(None); continue
            names.append(o.assets_file.objects[p["m_PathID"]].peek_name())
        clip = t["m_MuscleClip"]["m_Clip"]
        clip = clip.get("data", clip)
        keys = decode_streamed(clip["m_StreamedClip"]["data"])
        # pptr curves: which curve indices are sprite curves? keep keys whose value indexes mapping
        stop = t["m_MuscleClip"]["m_StopTime"]
        rate = t["m_SampleRate"]
        seq = []
        for (tm, idx, val) in keys:
            if math.isinf(tm) and tm > 0: continue
            if idx != 0: continue  # first sprite curve = Cuphead / the boss renderer
            k = int(round(val))
            if 0 <= k < len(names) and abs(val - k) < 1e-3:
                seq.append((max(0.0, tm) if not math.isinf(tm) else 0.0, k))
        if not seq:
            seq = [(i / rate, i) for i in range(len(names))]
        # collapse consecutive identical-time keys, keep last
        frames = []
        for j, (tm, k) in enumerate(seq):
            nxt = seq[j + 1][0] if j + 1 < len(seq) else max(stop, tm + 1.0 / rate)
            dur = nxt - tm
            if dur <= 1e-6: continue
            sn = names[k]
            if sn is None or not want_sprite(sn):
                sn = None
            frames.append([sn, round(dur, 4)])
        frames = [f for f in frames if f[0]]
        if not frames: continue
        loop = bool(t["m_MuscleClip"].get("m_LoopTime", False))
        events = [[round(e["time"], 4), e["functionName"], e.get("data", ""), round(e.get("floatParameter", 0), 3),
                   e.get("intParameter", 0)] for e in t.get("m_Events", [])]
        anims[nm] = {"frames": frames, "loop": loop, "events": events}
print("clips exported:", len(anims))

# ---------- level background layout from the scene ----------
scene_env = UnityPy.load(D + "/level20", D + "/sharedassets20.assets")
sobjs = {o.path_id: o for o in scene_env.objects if o.assets_file.name.endswith("level20")}
trs = {pid: o.read_typetree() for pid, o in sobjs.items() if o.type.name == "Transform"}
layers = []


def walk(pid, wx, wy, sx, sy, path):
    t = trs[pid]; p = t["m_LocalPosition"]; s = t["m_LocalScale"]
    x, y = wx + p["x"] * sx, wy + p["y"] * sy
    nsx, nsy = sx * s["x"], sy * s["y"]
    go = sobjs[t["m_GameObject"]["m_PathID"]].read_typetree()
    name = go["m_Name"]; npath = path + "/" + name
    if npath.startswith("/LevelArt"):
        for c in go["m_Component"]:
            co = sobjs.get(c["component"]["m_PathID"])
            if co is not None and co.type.name == "SpriteRenderer":
                r = co.read_typetree()
                sp = r["m_Sprite"]
                spname = None
                if sp["m_PathID"]:
                    try:
                        spname = co.assets_file.externals[sp["m_FileID"] - 1].name if False else None
                        so = co.read().m_Sprite.read(); spname = so.m_Name
                    except Exception:
                        pass
                if spname and want_sprite(spname):
                    col = r.get("m_Color", {"a": 1})
                    layers.append({"name": name, "path": npath, "sprite": spname, "x": round(x, 2), "y": round(y, 2),
                                   "sx": round(nsx, 3), "sy": round(nsy, 3), "order": r["m_SortingOrder"],
                                   "layer": r["m_SortingLayerID"], "alpha": round(col.get("a", 1), 3),
                                   "enabled": bool(r.get("m_Enabled", 1)) and bool(go.get("m_IsActive", 1))})
    for ch in t["m_Children"]:
        walk(ch["m_PathID"], x, y, nsx, nsy, npath)


for pid, t in trs.items():
    if t["m_Father"]["m_PathID"] == 0:
        walk(pid, 0, 0, 1, 1, "")
print("background layers:", len(layers))

# ---------- extra single sprites (portraits, ui) ----------
for extra in ["hud_hp_1_flash_0001", "hud_hp_2", "hud_hp_3", "hud_hp_dead", "hud_ch_card_flip_0001"]:
    want_sprite(extra)

# ---------- extract images and pack ----------
items = []
for name, o in needed.items():
    s = o.read()
    t = o.read_typetree()
    try:
        img = s.image.convert("RGBA")
    except Exception as e:
        print("image fail", name, e); continue
    rect = t["m_Rect"]; piv = t.get("m_Pivot", {"x": 0.5, "y": 0.5})
    off = t["m_RD"]["textureRectOffset"]
    px, py = rect["width"] * piv["x"], rect["height"] * piv["y"]
    w, h = img.size
    ax = px - off["x"]
    ay = (off["y"] + h) - py
    items.append((name, img, round(ax, 2), round(ay, 2)))
print("images:", len(items))

PAGE = 4096
items.sort(key=lambda it: -it[1].size[1])
pages, frames_out = [], {}
cur = None; cx = cy = rowh = 0
for name, img, ax, ay in items:
    w, h = img.size
    if cur is None or cx + w + 2 > PAGE:
        cx = 0; cy += rowh + 2; rowh = 0
    if cur is None or cy + h + 2 > PAGE:
        cur = Image.new("RGBA", (PAGE, PAGE), (0, 0, 0, 0)); pages.append(cur); cx = cy = rowh = 0
    cur.paste(img, (cx, cy))
    frames_out[name] = [len(pages) - 1, cx, cy, w, h, ax, ay]
    cx += w + 2; rowh = max(rowh, h)

os.makedirs(OUT + "/atlas", exist_ok=True)
page_files = []
for i, pg in enumerate(pages):
    bbox = pg.getbbox() or (0, 0, 1, 1)
    pg = pg.crop((0, 0, PAGE, bbox[3]))
    fn = "atlas/page%d.png" % i
    pg.save(OUT + "/" + fn, optimize=True)
    page_files.append(fn)
print("pages:", len(pages))

json.dump({"pages": page_files, "sprites": frames_out, "anims": anims, "background": layers},
          open(OUT + "/assets.json", "w"), separators=(",", ":"))
print("done")
