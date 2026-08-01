#!/usr/bin/env python3
"""Generate icon-180.png (the Add-to-Home-Screen icon) with no dependencies.

Four colour quadrants in a rounded square, with the classic slanted white
oval on top. Rendered at 3x and box-filtered down for smooth edges.
"""

import math
import struct
import zlib

SIZE = 180
SS = 3                      # supersample factor
N = SIZE * SS

RED    = (232, 72, 63)
YELLOW = (245, 182, 22)
GREEN  = (53, 180, 92)
BLUE   = (47, 125, 225)
INK    = (18, 19, 27)
WHITE  = (255, 255, 255)

RADIUS = 40 * SS            # corner radius
ANGLE = math.radians(-24)   # oval tilt
OVAL_A = 44 * SS            # oval half-width
OVAL_B = 66 * SS            # oval half-height
GAP = 5 * SS                # dark seam between quadrants


def in_rounded_square(x, y):
    """Is (x, y) inside the rounded square covering the whole canvas?"""
    cx = min(max(x, RADIUS), N - RADIUS)
    cy = min(max(y, RADIUS), N - RADIUS)
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= RADIUS * RADIUS


def quadrant_color(x, y):
    half = N / 2
    if abs(x - half) < GAP or abs(y - half) < GAP:
        return INK
    if y < half:
        return RED if x < half else YELLOW
    return BLUE if x < half else GREEN


def in_oval(x, y):
    half = N / 2
    dx, dy = x - half, y - half
    u = dx * math.cos(ANGLE) - dy * math.sin(ANGLE)
    v = dx * math.sin(ANGLE) + dy * math.cos(ANGLE)
    return (u / OVAL_A) ** 2 + (v / OVAL_B) ** 2 <= 1.0


def render_hi_res():
    rows = []
    for y in range(N):
        row = []
        for x in range(N):
            if not in_rounded_square(x, y):
                row.append((0, 0, 0, 0))
            elif in_oval(x, y):
                row.append(WHITE + (255,))
            else:
                row.append(quadrant_color(x, y) + (255,))
        rows.append(row)
    return rows


def downsample(hi):
    out = []
    for y in range(SIZE):
        row = bytearray()
        for x in range(SIZE):
            r = g = b = a = 0
            for j in range(SS):
                for i in range(SS):
                    pr, pg, pb, pa = hi[y * SS + j][x * SS + i]
                    r += pr * pa; g += pg * pa; b += pb * pa; a += pa
            if a:
                row += bytes((round(r / a), round(g / a), round(b / a), round(a / (SS * SS))))
            else:
                row += b"\x00\x00\x00\x00"
        out.append(bytes(row))
    return out


def write_png(path, rows):
    raw = b"".join(b"\x00" + r for r in rows)          # filter byte 0 per scanline

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)


if __name__ == "__main__":
    write_png("icon-180.png", downsample(render_hi_res()))
    print("wrote icon-180.png")
