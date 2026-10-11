#!/usr/bin/env python3
"""
에셋 빌드: ansimuz(Luis Zuno) 'Legacy Collection'(퍼블릭 도메인)에서 필요한 프레임만 골라
가로 스트립 PNG로 묶고, 발 위치 기준점(anchor)을 계산해 js/data/assets.js 매니페스트를 만든다.

사용법:
  python3 -I tools/build_assets.py <원본 assets 폴더> [출력 저장소 루트]
원본: https://github.com/utopiafemale-dev/reserka-gothic-game 의 assets/ 폴더
      (원작자 배포처: https://ansimuz.itch.io/gothicvania-patreon-collection)
"""
import json
import os
import re
import shutil
import sys

from PIL import Image

SRC = sys.argv[1]
ROOT = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets')
L = 'characters_legacy/Characters/'
PK = 'characters_legacy/Packs/'
EN = 'characters_legacy/Environments/'


def D(path, fps=10):
    return ('dir', path, fps)


def SH(path, fw, fps=10):
    return ('sheet', path, fw, fps)


SPRITES = {
    'hero': {
        'idle': SH('Gothic-hero-Files/PNG/gothic-hero-idle.png', 38, 6),
        'run': SH('Gothic-hero-Files/PNG/gothic-hero-run.png', 66, 16),
        'jump': SH('Gothic-hero-Files/PNG/gothic-hero-jump.png', 61, 10),
        'attack': SH('Gothic-hero-Files/PNG/gothic-hero-attack.png', 96, 14),
        'hurt': D('Gothic-hero-p2-Files/PNG/sprites/hurt', 10),
        'climb': D('Gothic-hero-p2-Files/PNG/sprites/climb', 10),
        'jumpAttack': D('Gothic-hero-p2-Files/PNG/sprites/jump-attack', 14),
        'crouch': D('Gothic-hero-p2-Files/PNG/sprites/crouch', 8),
    },
    'skeleton': {'walk': D(PK + 'Gothicvania Cemetery/Characters/Enemies/skeleton/Sprites/Walk', 9), 'rise': D(PK + 'Gothicvania Cemetery/Characters/Enemies/skeleton/skeleton-rise', 10)},
    'skeletonC': {'walk': D(PK + 'Gothicvania Cemetery/Characters/Enemies/skeleton/Sprites/walk-clothed', 9), 'rise': D(PK + 'Gothicvania Cemetery/Characters/Enemies/skeleton/skeleton-rise-clothed', 10)},
    'hound': {'idle': D(L + 'Hell-Hound-Files/Sprites/Idle', 8), 'walk': D(L + 'Hell-Hound-Files/Sprites/Walk', 12), 'run': D(L + 'Hell-Hound-Files/Sprites/Run', 12), 'jump': D(L + 'Hell-Hound-Files/Sprites/Jump', 10)},
    'lizard': {'idle': D(L + 'Grotto-escape-2-lizzard/sprites/idle', 6), 'walk': D(L + 'Grotto-escape-2-lizzard/sprites/walk', 10), 'run': D(L + 'Grotto-escape-2-lizzard/sprites/run', 12), 'jump': D(L + 'Grotto-escape-2-lizzard/sprites/jump', 8), 'attack': D(L + 'Grotto-escape-2-lizzard/sprites/tongue', 14), 'hurt': D(L + 'Grotto-escape-2-lizzard/sprites/hurt', 10)},
    'thing': {'walk': D(PK + 'Gothicvania Swamp files/Sprites/Thing/walk thing', 6)},
    'ogre': {'idle': D(L + 'Ogre/Sprites/Idle', 6), 'walk': D(L + 'Ogre/Sprites/walk', 8), 'attack': D(L + 'Ogre/Sprites/Attack', 12)},
    'wolf': {'run': D(L + 'wolf-runing-cycle/Sprites', 12)},
    'toad': {'idle': D(L + 'mutant-toad/Sprites/idle', 6), 'jump': D(L + 'mutant-toad/Sprites/jump', 8), 'attack': D(L + 'mutant-toad/Sprites/attack', 10)},
    'demon': {'idle': D(L + 'demon-Files/Sprites/Idle', 8), 'attack': D(L + 'demon-Files/Sprites/DemonAttack', 16), 'breath': D(L + 'demon-Files/Sprites/DemonAttackBreath', 16)},
    'dragon': {'idle': D(L + 'Grotto-escape-2-boss-dragon/sprites/idle', 8), 'breath': D(L + 'Grotto-escape-2-boss-dragon/sprites/breath', 10), 'tail': D(L + 'Grotto-escape-2-boss-dragon/sprites/tail', 12)},
    'vampire': {'idle': D(L + 'Battle Sprites/Monster Pack Files/Sprites/Vampire', 6)},
    'raider': {'walk': D(PK + 'Magic Cliffs/Enemies Files/sprites/no-shuriken-dude', 12)},
    'ninja': {'walk': D(PK + 'Magic Cliffs/Enemies Files/sprites/shuriken-dude', 12)},
    'spider': {'walk': D(PK + 'Gothicvania Swamp files/Sprites/Spider/walk', 10)},
    'sghost': {'fly': D(PK + 'Gothicvania Swamp files/Sprites/Ghost/Flying', 8)},
    'burnghoul': {'walk': D(PK + 'Gothicvania Church/SPRITES/burning-ghoul/sprites/v1', 12)},
    'fireskull': {'fly': D(L + 'Fire-Skull-Files/Sprites/Fire', 12)},
    'hellbeast': {'idle': D(L + 'Hell-Beast-Files/Idle/Sprites', 8), 'breath': D(L + 'Hell-Beast-Files/Breath/Sprites', 10), 'burn': D(L + 'Hell-Beast-Files/Burn/Sprites', 10)},
    'knight': {'idle': D(L + 'Terrible Knight/Sprites/Idle', 6), 'run': D(L + 'Terrible Knight/Sprites/Run', 14), 'attack': D(L + 'Terrible Knight/Sprites/SwordSlash', 14), 'hurt': D(L + 'Terrible Knight/Sprites/Hurt', 10), 'jump': D(L + 'Terrible Knight/Sprites/Jump', 8)},
    'nightmare': {'idle': D(L + 'Nightmare-Files/Sprites/Idle', 6), 'run': D(L + 'Nightmare-Files/Sprites/Run', 10)},
    'cghost': {'fly': D(PK + 'Gothicvania Cemetery/Characters/Enemies/ghost/Sprites', 6)},
    'cghostH': {'fly': D(PK + 'Gothicvania Cemetery/Characters/Enemies/ghost/SpritesHalo', 6)},
    'wizard': {'idle': D(PK + 'Gothicvania Church/SPRITES/wizard/idle-sprites', 6), 'attack': D(PK + 'Gothicvania Church/SPRITES/wizard/fire-sprites', 12)},
    'crow': {'fly': D(L + 'crow/Sprites/fly', 8), 'idle': D(L + 'crow/Sprites/idle', 4)},
    'eye': {'fly': D(L + 'flying-eye-demon/Sprites', 12)},
    'treant': {'idle': D(L + 'Battle Sprites/Monster Pack Files/Sprites/Treant', 5)},
    'witch': {'idle': D(L + 'Battle Sprites/Monster Pack Files/Sprites/Witch', 6)},
    'centaur': {'idle': D(L + 'Battle Sprites/Monster Pack Files/Sprites/Centaur', 6)},
    'angel': {'idle': D(PK + 'Gothicvania Church/SPRITES/angel/sprites/idle', 8), 'attack': D(PK + 'Gothicvania Church/SPRITES/angel/sprites/angel-attack', 8)},
    'gato': {'run': D(PK + 'Gothicvania Cemetery/Characters/Enemies/hell-gato/Sprites', 10)},
    'reaper': {'walk': D(L + 'death/Sprites/walk', 8), 'rise': D(L + 'death/Sprites/rise', 12)},
    'werewolf': {'idle': D(L + 'WereWolf/Sprites/Idle', 7), 'run': D(L + 'WereWolf/Sprites/run', 12), 'jump': D(L + 'WereWolf/Sprites/jump', 6)},
    # 마을 사람들
    'oldman': {'idle': D(PK + 'GothicVania-town-files/PNG/sprites/oldman-idle', 6), 'walk': D(PK + 'GothicVania-town-files/PNG/sprites/oldman-walk', 10)},
    'woman': {'idle': D(PK + 'GothicVania-town-files/PNG/sprites/woman-idle', 6), 'walk': D(PK + 'GothicVania-town-files/PNG/sprites/woman-walk', 9)},
    'bearded': {'idle': D(PK + 'GothicVania-town-files/PNG/sprites/bearded-idle', 6), 'walk': D(PK + 'GothicVania-town-files/PNG/sprites/bearded-walk', 9)},
    'hatman': {'idle': D(PK + 'GothicVania-town-files/PNG/sprites/hat-man-idle', 6), 'walk': D(PK + 'GothicVania-town-files/PNG/sprites/hat-man-walk', 9)},
    # 효과
    'fxDeath': {'play': D(PK + 'Gothicvania Church/SPRITES/fx/enemy-death/enemy-death-sprites', 18)},
    'fxDeathS': {'play': D(L.replace('Characters/', '') + 'Misc/EnemyDeath/Sprites', 18)},
    'fxHit': {'play': D(L.replace('Characters/', '') + 'Misc/Hit/Sprites', 20)},
    'fxBoom': {'play': D(L.replace('Characters/', '') + 'Misc/Explosion/sprites', 18)},
    'fxFireball': {'play': D(PK + 'Gothicvania Church/SPRITES/fx/fireball/fireball-sprites', 12)},
    'fxBeastBall': {'play': D(L + 'Hell-Beast-Files/Fireball/Sprites', 12)},
    'fxShuriken': {'play': D(PK + 'Magic Cliffs/Enemies Files/sprites/shuriken', 16)},
    'fxSplash': {'play': D(PK + 'Gothicvania Swamp files/Sprites/Enemy-Death/Explosion', 14)},
    'fxFire': {'play': D(PK + 'Gothicvania Cemetery/Characters/Enemies/EnemyDeath/Sprites', 12)},
}

# 그대로 복사할 이미지 (타일셋·배경·소품)
COPY = {
    'tiles/cave.png': EN + 'caverns-files-web/layers/tiles.png',
    'tiles/waste.png': EN + 'Rocky Pass Files/PNG/tileset.png',
    'tiles/forest.png': EN + 'mist-forest-background/layers/mist-forest-background-tiles.png',
    'tiles/spire.png': EN + 'Gothic-Castle-Files/PNG/layers/gothic-castle-tileset.png',
    'tiles/abyss.png': EN + 'Living-Tissue-Platform-Files/PNG/layers/tileset.png',
    'tiles/blood.png': PK + 'Gothicvania Cemetery/Environment/tileset.png',
    'tiles/city.png': PK + 'GothicVania-town-files/PNG/environment/layers/tileset.png',
    'bg/cave_far.png': EN + 'caverns-files-web/layers/background.png',
    'bg/cave_mid.png': EN + 'caverns-files-web/layers/back-walls.png',
    'bg/waste_far.png': EN + 'Rocky Pass Files/PNG/back.png',
    'bg/waste_mid.png': EN + 'Rocky Pass Files/PNG/middle.png',
    'bg/waste_near.png': EN + 'Rocky Pass Files/PNG/near.png',
    'bg/forest_far.png': EN + 'mist-forest-background/layers/mist-forest-background-back.png',
    'bg/forest_trees.png': EN + 'mist-forest-background/layers/mist-forest-background-back-trees.png',
    'bg/forest_tree.png': EN + 'mist-forest-background/layers/mist-forest-background-tree.png',
    'bg/forest_rocks.png': EN + 'mist-forest-background/layers/mist-forest-background-rocks.png',
    'bg/spire_hall.png': EN + 'Old-dark-Castle-tileset-Files/PNG/old-dark-castle-interior-background.png',
    'bg/abyss_far.png': EN + 'Living-Tissue-Platform-Files/PNG/layers/bakground.png',
    'bg/blood_far.png': PK + 'Gothicvania Cemetery/Environment/background.png',
    'bg/blood_mtn.png': PK + 'Gothicvania Cemetery/Environment/mountains.png',
    'bg/blood_grave.png': PK + 'Gothicvania Cemetery/Environment/graveyard.png',
    'bg/city_sky.png': EN + 'night-town-background-files/layers/night-town-background-sky.png',
    'bg/city_clouds.png': EN + 'night-town-background-files/layers/night-town-background-clouds.png',
    'bg/city_mtn.png': EN + 'night-town-background-files/layers/night-town-background-mountains.png',
    'bg/city_far.png': EN + 'night-town-background-files/layers/night-town-background-far-buildings.png',
    'bg/city_town.png': PK + 'GothicVania-town-files/PNG/environment/layers/middleground.png',
    'props/houses.png': PK + 'GothicVania-town-files/PNG/environment/props/houses.png',
    'props/town.png': PK + 'GothicVania-town-files/PNG/environment/props/props.png',
    'props/cemetery.png': PK + 'Gothicvania Cemetery/Environment/objects.png',
    'props/rocky_crystal1.png': EN + 'Rocky Pass Files/PNG/Props/crystal-1.png',
    'props/rocky_crystal2.png': EN + 'Rocky Pass Files/PNG/Props/crystal-2.png',
    'props/cave_stalactite.png': PK + 'warped-Caves/PNG/environment/props/stalactite.png',
    'props/forest_tree.png': EN + 'HauntedForest/Layers/Props/tree.png',
}

LICENSES = {
    'LICENSE-ansimuz.txt': 'public-license.txt',
}


def natkey(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]


def load_frames(spec):
    kind = spec[0]
    if kind == 'dir':
        p = os.path.join(SRC, spec[1])
        files = sorted([f for f in os.listdir(p) if f.lower().endswith('.png')], key=natkey)
        return [Image.open(os.path.join(p, f)).convert('RGBA') for f in files], spec[2]
    im = Image.open(os.path.join(SRC, spec[1])).convert('RGBA')
    fw = spec[2]
    n = im.width // fw
    return [im.crop((i * fw, 0, (i + 1) * fw, im.height)) for i in range(n)], spec[3]


def opaque_bbox(im):
    return im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()


def build_anim(frames):
    boxes = [opaque_bbox(f) for f in frames]
    boxes = [b for b in boxes if b]
    if not boxes:
        return None
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    fw, fh = x1 - x0, y1 - y0
    strip = Image.new('RGBA', (fw * len(frames), fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f.crop((x0, y0, x1, y1)), (i * fw, 0))
    # 기준점: 아랫부분 20% 행에서 불투명 열들의 중심 = 발 위치
    cols = []
    band0 = int(fh * 0.8)
    for i, f in enumerate(frames):
        c = f.crop((x0, y0, x1, y1))
        a = c.getchannel('A').load()
        for y in range(band0, fh):
            for x in range(fw):
                if a[x, y] > 8:
                    cols.append(x)
    ax = (sum(cols) / len(cols)) if cols else fw / 2
    # 몸통 크기: 첫 프레임 불투명 영역
    b0 = opaque_bbox(frames[0])
    bw = (b0[2] - b0[0]) if b0 else fw
    bh = (b0[3] - b0[1]) if b0 else fh
    return strip, {'fw': fw, 'fh': fh, 'n': len(frames), 'ax': round(ax, 1), 'ay': fh, 'bw': bw, 'bh': bh}


def main():
    os.makedirs(os.path.join(OUT, 'sprites'), exist_ok=True)
    manifest = {}
    total = 0
    for key, anims in SPRITES.items():
        manifest[key] = {}
        for an, spec in anims.items():
            frames, fps = load_frames(spec)
            r = build_anim(frames)
            if not r:
                print('EMPTY', key, an)
                continue
            strip, meta = r
            rel = 'sprites/%s_%s.png' % (key, an)
            strip.save(os.path.join(OUT, rel), optimize=True)
            total += os.path.getsize(os.path.join(OUT, rel))
            meta['src'] = 'assets/' + rel
            meta['fps'] = fps
            manifest[key][an] = meta
    for dst, src in COPY.items():
        d = os.path.join(OUT, dst)
        os.makedirs(os.path.dirname(d), exist_ok=True)
        Image.open(os.path.join(SRC, src)).save(d, optimize=True)
        total += os.path.getsize(d)
    for dst, src in LICENSES.items():
        shutil.copyfile(os.path.join(SRC, src), os.path.join(OUT, dst))
    js = "'use strict';\n// 자동 생성: tools/build_assets.py — 직접 고치지 말 것\nHC.SPRITE_META = " + json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ";\nHC.ASSET_FILES = " + json.dumps(['assets/' + k for k in COPY.keys()]) + ";\n"
    with open(os.path.join(ROOT, 'js/data/assets.js'), 'w') as f:
        f.write(js)
    print('sprites:', sum(len(v) for v in manifest.values()), 'anims; total bytes', total)


if __name__ == '__main__':
    main()
