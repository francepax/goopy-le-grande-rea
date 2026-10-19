import UnityPy, sys, json, os
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
D = sys.argv[1]; fname = sys.argv[2]; root_name = sys.argv[3]; maxlen = int(sys.argv[4]) if len(sys.argv) > 4 else 1500
env = UnityPy.load(D + "/" + fname, D + "/globalgamemanagers.assets")
objs = {o.path_id: o for o in env.objects if o.assets_file.name.endswith(fname)}
scripts = {}
for pid, o in objs.items():
    if o.type.name == "MonoBehaviour":
        try:
            sc = o.read(check_read=False).m_Script.read(); scripts[pid] = (sc.m_ClassName, sc.m_Namespace, sc.m_AssemblyName)
        except Exception: pass
gen = TypeTreeGenerator("2017.4.9f1")
for fn in sorted(os.listdir(D + "/Managed")):
    if fn.endswith(".dll") and not fn.startswith("._"):
        try: gen.load_dll(open(D + "/Managed/" + fn, "rb").read())
        except Exception: pass
def simp(v):
    if isinstance(v, dict):
        if set(v) == {"m_FileID", "m_PathID"}: return "ptr"
        return {k: simp(x) for k, x in v.items()}
    if isinstance(v, list): return [simp(x) for x in v][:12]
    if isinstance(v, float): return round(v, 3)
    return v
tr = {pid: o.read_typetree() for pid, o in objs.items() if o.type.name == "Transform"}
def walk(pid, d):
    t = tr[pid]; p = t["m_LocalPosition"]; s = t["m_LocalScale"]
    go = objs[t["m_GameObject"]["m_PathID"]].read_typetree()
    print("  " * d + "## %s pos=(%.1f,%.1f) sc=(%.2f,%.2f)" % (go["m_Name"], p["x"], p["y"], s["x"], s["y"]))
    for c in go["m_Component"]:
        cp = c["component"]["m_PathID"]; co = objs.get(cp)
        if co is None or co.type.name == "Transform": continue
        if co.type.name == "MonoBehaviour" and cp in scripts:
            cls, ns, asm = scripts[cp]
            try:
                node = gen.get_nodes_up(asm.replace(".dll", ""), (ns + "." if ns else "") + cls)
                tt = co.read_typetree(node)
                print("  " * d + "   MB " + cls + " " + json.dumps({k: simp(v) for k, v in tt.items() if not k.startswith("m_")})[:maxlen])
            except Exception as e:
                print("  " * d + "   MB " + cls + " ERR")
        elif co.type.name in ("BoxCollider2D", "CircleCollider2D"):
            tt = co.read_typetree()
            print("  " * d + "   " + co.type.name + " " + json.dumps({k: simp(tt[k]) for k in ("m_Offset", "m_Size", "m_Radius") if k in tt}))
        else:
            print("  " * d + "   " + co.type.name)
    for ch in t["m_Children"]: walk(ch["m_PathID"], d + 1)
for pid, t in tr.items():
    if t["m_Father"]["m_PathID"] == 0 and objs[t["m_GameObject"]["m_PathID"]].read_typetree()["m_Name"] == root_name:
        walk(pid, 0); break
