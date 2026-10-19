"""Extract the Cuphead Vogue font used for the READY/KNOCKOUT text.
Usage: export_fonts.py <Cuphead Data dir> <output assets dir>
"""
import UnityPy, sys, os, re

D, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT + "/fonts", exist_ok=True)
env = UnityPy.load(D + "/StreamingAssets/AssetBundles/font_cupheadvogue_extrabold_merged")
for o in env.objects:
    if o.type.name == "Font":
        f = o.read()
        data = bytes(f.m_FontData)
        if data:
            ext = ".otf" if data[:4] == b"OTTO" else ".ttf"
            fn = re.sub(r"\W", "_", f.m_Name) + ext
            open(OUT + "/fonts/" + fn, "wb").write(data)
            print(fn, len(data))
