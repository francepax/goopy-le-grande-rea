"""Minimal CIL disassembler: dumps methods of selected types (and their nested types).
Usage: ildump.py <assembly.dll> <TypeName> [<TypeName> ...]
A TypeName matches top-level types by exact name, plus every type nested inside them.
"""
import struct, sys
import dnfile

N, I1, I4, I8, R4, R8, TOK, BR4, BR1, SW, V1, V2 = range(12)
ONE = {}
def op(code, name, kind=N): ONE[code] = (name, kind)
for c, n in enumerate(["nop","break","ldarg.0","ldarg.1","ldarg.2","ldarg.3","ldloc.0","ldloc.1","ldloc.2","ldloc.3","stloc.0","stloc.1","stloc.2","stloc.3"]): op(c, n)
op(0x0e,"ldarg.s",V1); op(0x0f,"ldarga.s",V1); op(0x10,"starg.s",V1); op(0x11,"ldloc.s",V1); op(0x12,"ldloca.s",V1); op(0x13,"stloc.s",V1)
op(0x14,"ldnull")
for i in range(9): op(0x16+i, "ldc.i4.%d" % i)
op(0x15,"ldc.i4.m1"); op(0x1f,"ldc.i4.s",I1); op(0x20,"ldc.i4",I4); op(0x21,"ldc.i8",I8); op(0x22,"ldc.r4",R4); op(0x23,"ldc.r8",R8)
op(0x25,"dup"); op(0x26,"pop"); op(0x27,"jmp",TOK); op(0x28,"call",TOK); op(0x29,"calli",TOK); op(0x2a,"ret")
for i, n in enumerate(["br","brfalse","brtrue","beq","bge","bgt","ble","blt","bne.un","bge.un","bgt.un","ble.un","blt.un"]):
    op(0x2b+i, n+".s", BR1); op(0x38+i, n, BR4)
op(0x45,"switch",SW)
for i, n in enumerate(["ldind.i1","ldind.u1","ldind.i2","ldind.u2","ldind.i4","ldind.u4","ldind.i8","ldind.i","ldind.r4","ldind.r8","ldind.ref","stind.ref","stind.i1","stind.i2","stind.i4","stind.i8","stind.r4","stind.r8",
    "add","sub","mul","div","div.un","rem","rem.un","and","or","xor","shl","shr","shr.un","neg","not","conv.i1","conv.i2","conv.i4","conv.i8","conv.r4","conv.r8","conv.u4","conv.u8"]):
    op(0x46+i, n)
op(0x6f,"callvirt",TOK); op(0x70,"cpobj",TOK); op(0x71,"ldobj",TOK); op(0x72,"ldstr",TOK); op(0x73,"newobj",TOK); op(0x74,"castclass",TOK); op(0x75,"isinst",TOK); op(0x76,"conv.r.un")
op(0x79,"unbox",TOK); op(0x7a,"throw"); op(0x7b,"ldfld",TOK); op(0x7c,"ldflda",TOK); op(0x7d,"stfld",TOK); op(0x7e,"ldsfld",TOK); op(0x7f,"ldsflda",TOK); op(0x80,"stsfld",TOK); op(0x81,"stobj",TOK)
for i, n in enumerate(["conv.ovf.i1.un","conv.ovf.i2.un","conv.ovf.i4.un","conv.ovf.i8.un","conv.ovf.u1.un","conv.ovf.u2.un","conv.ovf.u4.un","conv.ovf.u8.un","conv.ovf.i.un","conv.ovf.u.un"]): op(0x82+i, n)
op(0x8c,"box",TOK); op(0x8d,"newarr",TOK); op(0x8e,"ldlen"); op(0x8f,"ldelema",TOK)
for i, n in enumerate(["ldelem.i1","ldelem.u1","ldelem.i2","ldelem.u2","ldelem.i4","ldelem.u4","ldelem.i8","ldelem.i","ldelem.r4","ldelem.r8","ldelem.ref","stelem.i","stelem.i1","stelem.i2","stelem.i4","stelem.i8","stelem.r4","stelem.r8","stelem.ref"]): op(0x90+i, n)
op(0xa3,"ldelem",TOK); op(0xa4,"stelem",TOK); op(0xa5,"unbox.any",TOK)
for i, n in enumerate(["conv.ovf.i1","conv.ovf.u1","conv.ovf.i2","conv.ovf.u2","conv.ovf.i4","conv.ovf.u4","conv.ovf.i8","conv.ovf.u8"]): op(0xb3+i, n)
op(0xc2,"refanyval",TOK); op(0xc3,"ckfinite"); op(0xc6,"mkrefany",TOK); op(0xd0,"ldtoken",TOK)
for i, n in enumerate(["conv.u2","conv.u1","conv.i","conv.ovf.i","conv.ovf.u","add.ovf","add.ovf.un","mul.ovf","mul.ovf.un","sub.ovf","sub.ovf.un","endfinally"]): op(0xd1+i, n)
op(0xdd,"leave",BR4); op(0xde,"leave.s",BR1); op(0xdf,"stind.i"); op(0xe0,"conv.u")
TWO = {0x00:("arglist",N),0x01:("ceq",N),0x02:("cgt",N),0x03:("cgt.un",N),0x04:("clt",N),0x05:("clt.un",N),0x06:("ldftn",TOK),0x07:("ldvirtftn",TOK),
       0x09:("ldarg",V2),0x0a:("ldarga",V2),0x0b:("starg",V2),0x0c:("ldloc",V2),0x0d:("ldloca",V2),0x0e:("stloc",V2),0x0f:("localloc",N),0x11:("endfilter",N),
       0x12:("unaligned.",I1),0x13:("volatile.",N),0x14:("tail.",N),0x15:("initobj",TOK),0x16:("constrained.",TOK),0x17:("cpblk",N),0x18:("initblk",N),
       0x1a:("rethrow",N),0x1c:("sizeof",TOK),0x1d:("refanytype",N),0x1e:("readonly.",N)}

pe = dnfile.dnPE(sys.argv[1])
md = pe.net.mdtables
data = pe.__data__
us = pe.net.user_strings

def s(x):
    return str(x) if x is not None else ""

typedefs = md.TypeDef.rows
def tname(i):  # 1-based typedef index
    r = typedefs[i-1]; ns = s(r.TypeNamespace)
    return (ns + "." if ns else "") + s(r.TypeName)
def typeref_name(row):
    ns = s(row.TypeNamespace); return (ns + "." if ns else "") + s(row.TypeName)

# method -> declaring type
meth_owner = {}
for ti, r in enumerate(typedefs, 1):
    start = r.MethodList[0].row_index if r.MethodList else None
    for m in r.MethodList or []:
        meth_owner[m.row_index] = ti
field_owner = {}
for ti, r in enumerate(typedefs, 1):
    for f in r.FieldList or []:
        field_owner[f.row_index] = ti
nested_parent = {}
if md.NestedClass:
    for r in md.NestedClass.rows:
        nested_parent[r.NestedClass.row_index] = r.EnclosingClass.row_index
def full_tname(i):
    n = tname(i)
    while i in nested_parent:
        i = nested_parent[i]; n = tname(i) + "/" + n
    return n

def parent_name(p):
    t = p.table.name if p and p.table else ""
    if t == "TypeRef": return typeref_name(p.row)
    if t == "TypeDef": return full_tname(p.row_index)
    if t == "TypeSpec": return "<spec>"
    if t == "MethodDef": return "<method>"
    return "?"

def tok(t):
    table, idx = t >> 24, t & 0xFFFFFF
    try:
        if table == 0x70:
            return '"' + us.get(idx).value + '"'
        if table == 0x06:
            r = md.MethodDef.rows[idx-1]; return full_tname(meth_owner.get(idx, 0)) + "::" + s(r.Name)
        if table == 0x04:
            r = md.Field.rows[idx-1]; return full_tname(field_owner.get(idx, 0)) + "::" + s(r.Name)
        if table == 0x0a:
            r = md.MemberRef.rows[idx-1]; return parent_name(r.Class) + "::" + s(r.Name)
        if table == 0x01:
            return typeref_name(md.TypeRef.rows[idx-1])
        if table == 0x02:
            return full_tname(idx)
        if table == 0x2b:
            r = md.MethodSpec.rows[idx-1]; m = r.Method
            if m.table.name == "MethodDef": return full_tname(meth_owner.get(m.row_index, 0)) + "::" + s(m.row.Name) + "<>"
            return parent_name(m.row.Class) + "::" + s(m.row.Name) + "<>"
        if table == 0x1b:
            return "<typespec %d>" % idx
    except Exception as e:
        return "<tok %08x %s>" % (t, e)
    return "<tok %08x>" % t

def disasm(rva):
    o = pe.get_offset_from_rva(rva)
    h = data[o]
    if h & 3 == 2:
        size = h >> 2; o += 1
    else:
        flags_size = struct.unpack_from("<H", data, o)[0]
        size = struct.unpack_from("<I", data, o + 4)[0]; o += (flags_size >> 12) * 4
    code = data[o:o+size]; p = 0; out = []
    while p < len(code):
        start = p; b = code[p]; p += 1
        if b == 0xFE:
            name, k = TWO.get(code[p], ("?fe%02x" % code[p], N)); p += 1
        else:
            name, k = ONE.get(b, ("?%02x" % b, N))
        arg = ""
        if k == I1: arg = str(struct.unpack_from("<b", code, p)[0]); p += 1
        elif k == V1: arg = str(code[p]); p += 1
        elif k == V2: arg = str(struct.unpack_from("<H", code, p)[0]); p += 2
        elif k == I4: arg = str(struct.unpack_from("<i", code, p)[0]); p += 4
        elif k == I8: arg = str(struct.unpack_from("<q", code, p)[0]); p += 8
        elif k == R4: arg = repr(round(struct.unpack_from("<f", code, p)[0], 6)); p += 4
        elif k == R8: arg = repr(struct.unpack_from("<d", code, p)[0]); p += 8
        elif k == TOK: arg = tok(struct.unpack_from("<I", code, p)[0]); p += 4
        elif k == BR1: arg = "IL_%04x" % (p + 1 + struct.unpack_from("<b", code, p)[0]); p += 1
        elif k == BR4: arg = "IL_%04x" % (p + 4 + struct.unpack_from("<i", code, p)[0]); p += 4
        elif k == SW:
            n = struct.unpack_from("<I", code, p)[0]; p += 4; base = p + 4 * n
            arg = ",".join("IL_%04x" % (base + struct.unpack_from("<i", code, p + 4*j)[0]) for j in range(n)); p += 4 * n
        out.append("  IL_%04x: %s %s" % (start, name, arg))
    return out

wanted = set(sys.argv[2:])
def selected(i):
    while True:
        if full_tname(i) in wanted: return True
        if i not in nested_parent: return False
        i = nested_parent[i]

for ti, r in enumerate(typedefs, 1):
    if not selected(ti): continue
    print("\n==== class %s : %s" % (full_tname(ti), parent_name(r.Extends) if r.Extends and r.Extends.row else ""))
    for f in r.FieldList or []:
        print("  field %s" % s(f.row.Name))
    for m in r.MethodList or []:
        mr = m.row
        print("\n-- %s::%s" % (full_tname(ti), s(mr.Name)))
        if mr.Rva:
            for line in disasm(mr.Rva): print(line)
