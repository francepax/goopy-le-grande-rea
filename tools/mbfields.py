import UnityPy, sys, json, os
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
D = sys.argv[1]; scene = sys.argv[2]; want = set(sys.argv[3:])
env = UnityPy.load(D + "/" + scene, D + "/globalgamemanagers.assets")
targets = []
for o in env.objects:
    if o.type.name != "MonoBehaviour" or not o.assets_file.name.endswith(scene): continue
    mb = o.read(check_read=False)
    try:
        cls = mb.m_Script.read().m_ClassName
    except Exception: continue
    if cls in want or not want:
        go = mb.m_GameObject.read().m_Name
        sc = mb.m_Script.read()
        targets.append((o, cls, sc.m_Namespace, sc.m_AssemblyName, go))
gen = TypeTreeGenerator("2017.4.9f1")
for fn in sorted(os.listdir(D + "/Managed")):
    if fn.endswith(".dll") and not fn.startswith("._"):
        try: gen.load_dll(open(D + "/Managed/" + fn, "rb").read())
        except Exception: pass
def simp(v):
    if isinstance(v, dict):
        if set(v) == {"m_FileID", "m_PathID"}: return "ptr:%d/%d" % (v["m_FileID"], v["m_PathID"])
        return {k: simp(x) for k, x in v.items()}
    if isinstance(v, list): return [simp(x) for x in v][:30]
    return v
for o, cls, ns, asm, go in targets:
    try:
        node = gen.get_nodes_up(asm.replace(".dll", ""), (ns + "." if ns else "") + cls)
        t = o.read_typetree(node)
        print("=====", cls, "on", go)
        print(json.dumps({k: simp(v) for k, v in t.items() if k not in ("m_GameObject", "m_Script", "m_Enabled", "m_Name")})[:2500])
    except Exception as e:
        print("=====", cls, "on", go, "ERR", repr(e)[:200])
