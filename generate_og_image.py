"""
Run from the project root:
  python generate_og_image.py
Outputs: frontend/public/og-image.png  (1200 x 630)
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1200, 630
BG       = (10, 10, 20)
PURPLE   = (124, 58, 237)
PURPLE_L = (139, 92, 246)
PURPLE_D = (76, 29, 149)
WHITE    = (255, 255, 255)
SLATE    = (148, 163, 184)
CHIP_BG  = (30, 27, 75)
CHIP_BD  = (76, 29, 149)

FONT_BOLD   = '/usr/share/fonts/truetype/noto/NotoSansDisplay-Bold.ttf'
FONT_REG    = '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf'

def load(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', size)

f_brand   = load(FONT_BOLD, 34)
f_hero1   = load(FONT_BOLD, 82)
f_hero2   = load(FONT_BOLD, 82)
f_sub     = load(FONT_REG,  28)
f_chip    = load(FONT_BOLD, 20)
f_badge   = load(FONT_BOLD, 18)

img  = Image.new('RGB', (W, H), BG)
draw = ImageDraw.Draw(img)

# ── Background glows ───────────────────────────────────────────────────────
def add_glow(cx, cy, r, color, alpha):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ld    = ImageDraw.Draw(layer)
    steps = 10
    for i in range(steps, 0, -1):
        ratio = i / steps
        a     = int(alpha * (1 - ratio) * 0.4)
        cr    = int(r * ratio)
        ld.ellipse([(cx - cr, cy - cr), (cx + cr, cy + cr)], fill=(*color, a))
    img.paste(Image.alpha_composite(Image.new('RGBA', (W, H), (0,0,0,0)), layer), mask=layer.split()[3])

add_glow(600, -80,  700, PURPLE,   180)
add_glow(200, 600,  400, PURPLE_D, 120)
add_glow(1050, 300, 350, PURPLE_D, 100)

# ── Logo row ───────────────────────────────────────────────────────────────
# Lightning bolt shape
lx, ly = 58, 55
pts = [(lx+14,ly), (lx+6,ly+18), (lx+14,ly+18), (lx+2,ly+38), (lx+22,ly+15), (lx+13,ly+15)]
draw.polygon(pts, fill=PURPLE_L)
draw.text((lx + 34, ly + 4), 'BounceTrap', font=f_brand, fill=WHITE)

# ── Hero text ─────────────────────────────────────────────────────────────
draw.text((58, 148), 'Stop sending to', font=f_hero1, fill=WHITE)
draw.text((58, 243), 'bad emails.', font=f_hero2, fill=PURPLE_L)

# ── Subline ───────────────────────────────────────────────────────────────
draw.text((58, 360), '10-step verification engine  ·  REST API  ·  Start free', font=f_sub, fill=SLATE)

# ── Feature chips ─────────────────────────────────────────────────────────
chips = ['MX Lookup', 'Disposable Detection', 'Deep Validation', 'Bulk CSV Upload']
x, y = 58, 430
for chip in chips:
    bb = draw.textbbox((0,0), chip, font=f_chip)
    tw = bb[2] - bb[0]
    pad = 14
    cw  = tw + pad * 2
    ch  = 38
    draw.rounded_rectangle([(x, y), (x+cw, y+ch)], radius=19, fill=CHIP_BG, outline=CHIP_BD, width=1)
    draw.text((x + pad, y + 9), chip, font=f_chip, fill=PURPLE_L)
    x += cw + 8

# ── Right-side stat card ──────────────────────────────────────────────────
card_x, card_y, card_w, card_h = 830, 140, 310, 370
draw.rounded_rectangle(
    [(card_x, card_y), (card_x + card_w, card_y + card_h)],
    radius=20,
    fill=(18, 16, 35),
    outline=(60, 40, 120),
    width=1,
)

stats = [
    ('97%+',  'Accuracy'),
    ('<5s',   'Per verification'),
    ('500K',  'Max bulk rows'),
    ('10',    'Pipeline steps'),
]
sy = card_y + 28
for val, label in stats:
    draw.text((card_x + 28, sy),      val,   font=load(FONT_BOLD, 38), fill=PURPLE_L)
    draw.text((card_x + 28, sy + 44), label, font=load(FONT_REG,  20), fill=SLATE)
    # divider
    if label != stats[-1][1]:
        draw.line([(card_x+20, sy+76), (card_x+card_w-20, sy+76)], fill=(40,35,65), width=1)
    sy += 86

# ── Bottom bar ────────────────────────────────────────────────────────────
draw.rectangle([(0, H-4), (W, H)], fill=PURPLE)

out = 'frontend/public/og-image.png'
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out, 'PNG', optimize=True)
print(f'✓ Saved {out}  ({W}×{H}px)')
