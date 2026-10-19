import UnityPy, sys, os, re, json
D, OUT = sys.argv[1], sys.argv[2]
B = D + "/StreamingAssets/AssetBundles/"
os.makedirs(OUT + "/audio", exist_ok=True)
rules = [
    (D + "/sharedassets20.assets", re.compile(r"^sfx_slime_")),
    (D + "/sharedassets8.assets", re.compile(r"^sfx_level_announcer_000[12]_|^sfx_level_announcer_knockout|^sfx_level_knockout_(bell|boom)|^sfx_player_(dash|death|hit|jump|land_ground|shoot_hit|parry_slap)_0|^sfx_player_weapon_peashot|^sfx_player_default_fire_(loop|start)_01", re.I)),
    (B + "music_mus_slime", re.compile(r".")),
]
index = {}
for path, pat in rules:
    env = UnityPy.load(path)
    for o in env.objects:
        if o.type.name != "AudioClip": continue
        nm = o.peek_name()
        if not nm or not pat.search(nm): continue
        try:
            for fn, data in o.read().samples.items():
                fn = re.sub(r"[^A-Za-z0-9_.-]", "_", fn)
                open(OUT + "/audio/" + fn, "wb").write(data)
                index[nm] = "audio/" + fn
        except Exception as e:
            print("fail", nm, e)
json.dump(index, open(OUT + "/audio.json", "w"), indent=0)
print(len(index), "clips")
