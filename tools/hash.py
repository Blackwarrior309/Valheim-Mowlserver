import struct
def stable(s):
    h1=5381; h2=h1
    for i in range(0,len(s),2):
        h1=(((h1<<5)+h1) ^ ord(s[i])) & 0xffffffff
        if i==len(s)-1: break
        h2=(((h2<<5)+h2) ^ ord(s[i+1])) & 0xffffffff
    r=(h1 + (h2*1566083941)) & 0xffffffff
    return struct.unpack('<i',struct.pack('<I',r))[0]
