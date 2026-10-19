import struct,sys
d=open(sys.argv[1],'rb').read()
pe=struct.unpack_from('<I',d,0x3c)[0]
nsec=struct.unpack_from('<H',d,pe+6)[0]; opt=struct.unpack_from('<H',d,pe+20)[0]
secs=[struct.unpack_from('<8sIIII',d,pe+24+opt+i*40) for i in range(nsec)]
def off(rva):
    for n,vs,va,rs,rp in secs:
        if va<=rva<va+max(vs,rs): return rva-va+rp
md=off(2773396)
vl=struct.unpack_from('<I',d,md+12)[0]; p=md+16+vl
ns=struct.unpack_from('<H',d,p+2)[0]; p+=4; streams={}
for _ in range(ns):
    o,s=struct.unpack_from('<II',d,p); p+=8; e=d.index(b'\0',p); name=d[p:e].decode(); p=(e+4)&~3; streams[name]=md+o
t=streams['#~']; hs=d[t+6]; valid=struct.unpack_from('<Q',d,t+8)[0]
q=t+24; rows={}
for i in range(64):
    if valid>>i&1: rows[i]=struct.unpack_from('<I',d,q)[0]; q+=4
S=4 if hs&1 else 2; G=4 if hs&2 else 2
def ci(tabs,bits): return 2 if max(rows.get(x,0) for x in tabs)<(1<<(16-bits)) else 4
def ri(x): return 2 if rows.get(x,0)<65536 else 4
rd=lambda o,n: struct.unpack_from('<H' if n==2 else '<I',d,o)[0]
def st(i): e=d.index(b'\0',streams['#Strings']+i); return d[streams['#Strings']+i:e].decode('utf8','replace')
modsz=2+S+3*G; trs=ci([0,0x1a,0x23,1],2)
trsz=trs+2*S; q+=rows[0]*modsz
trefs=[]
for i in range(rows[1]):
    trefs.append((st(rd(q+trs+S,S)) +'.'+st(rd(q+trs,S))).lstrip('.')); q+=trsz
tdr=ci([2,1,0x1b],2); tdsz=4+2*S+tdr+ri(4)+ri(6)
tdefs=[]
for i in range(rows[2]):
    o=q+i*tdsz; name=st(rd(o+4,S)); nsp=st(rd(o+4+S,S)); ex=rd(o+4+2*S,tdr)
    tdefs.append((nsp,name,ex))
for nsp,name,ex in tdefs:
    tag,idx=ex&3,ex>>2
    base='' if idx==0 else (tdefs[idx-1][1] if tag==0 else trefs[idx-1] if tag==1 else 'spec')
    print(f"{nsp}\t{name}\t{base}")
