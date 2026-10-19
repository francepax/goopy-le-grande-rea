import UnityPy, sys
D = sys.argv[1]; f = sys.argv[2]
env = UnityPy.load(D + "/" + f)
for o in env.objects:
    if o.type.name == "AnimationClip":
        t = o.read_typetree()
        m = t["m_ClipBindingConstant"]["pptrCurveMapping"]
        stop = t["m_MuscleClip"]["m_StopTime"]
        names = []
        for p in m[:200]:
            try: names.append(o.assets_file.objects[p["m_PathID"]].read().m_Name if p["m_FileID"] == 0 else "ext%d" % p["m_FileID"])
            except Exception as e: names.append("?")
        first = names[0] if names else ""
        print("%-40s rate=%s stop=%.3f frames=%d loop=%s first=%s last=%s" % (t["m_Name"], t["m_SampleRate"], stop, len(m), t["m_MuscleClip"]["m_LoopTime"] if "m_LoopTime" in t["m_MuscleClip"] else "?", first, names[-1] if names else ""))
