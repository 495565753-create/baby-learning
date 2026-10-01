"""Create and verify 250 deterministic, solvable levels for the kids' games."""
from __future__ import annotations

from collections import deque
from pathlib import Path
import json
import random

ROOT = Path(__file__).resolve().parent
RNG = random.Random(20261001)


def neighbors(index: int, width: int):
    x, y = index % width, index // width
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        xx, yy = x + dx, y + dy
        if 0 <= xx < width and 0 <= yy < width:
            yield yy * width + xx


def traffic_depth(cars, limit=22000):
    start = tuple(car['p'] for car in cars)
    queue = deque([(start, 0)])
    seen = {start}
    while queue and len(seen) <= limit:
        state, depth = queue.popleft()
        if state[0] == 4:
            return depth
        occupied = {}
        for i, (car, pos) in enumerate(zip(cars, state)):
            for offset in range(car['l']):
                x = pos + offset if car['o'] == 'h' else car['lane']
                y = car['lane'] if car['o'] == 'h' else pos + offset
                occupied[y * 6 + x] = i
        for i, (car, pos) in enumerate(zip(cars, state)):
            for direction in (-1, 1):
                next_pos = pos + direction
                if next_pos < 0 or next_pos + car['l'] > 6:
                    continue
                edge = next_pos if direction < 0 else next_pos + car['l'] - 1
                x = edge if car['o'] == 'h' else car['lane']
                y = car['lane'] if car['o'] == 'h' else edge
                if y * 6 + x in occupied:
                    continue
                candidate = state[:i] + (next_pos,) + state[i + 1:]
                if candidate not in seen:
                    seen.add(candidate)
                    queue.append((candidate, depth + 1))
    return None


def make_traffic():
    levels, seen = [], set()
    for number in range(1, 51):
        tier = (number - 1) // 10
        min_depth = [5, 6, 7, 8, 9][tier]
        best = None
        for _ in range(2800):
            red = {'o': 'h', 'lane': 2, 'l': 2, 'p': RNG.randrange(0, 3)}
            cars = [red]
            occupied = {(red['p'] + d, 2) for d in range(2)}
            target_count = [5, 6, 7, 8, 9][tier] + RNG.randrange(0, 2)
            for __ in range(90):
                if len(cars) >= target_count:
                    break
                orientation = RNG.choice(('h', 'v'))
                length = 3 if RNG.random() < .19 else 2
                lane = RNG.randrange(6)
                pos = RNG.randrange(7 - length)
                cells = {(pos + d, lane) if orientation == 'h' else (lane, pos + d) for d in range(length)}
                if cells & occupied:
                    continue
                occupied |= cells
                cars.append({'o': orientation, 'lane': lane, 'l': length, 'p': pos})
            if len(cars) < target_count:
                continue
            if not any((x, 2) in occupied for x in range(red['p'] + 2, 6)):
                continue
            signature = tuple(sorted((c['o'], c['lane'], c['l'], c['p']) for c in cars))
            if signature in seen:
                continue
            depth = traffic_depth(cars)
            if depth is None:
                continue
            if best is None or depth > best[0]:
                best = (depth, cars, signature)
            if min_depth <= depth <= min_depth + 8:
                best = (depth, cars, signature)
                break
        if best is None:
            raise RuntimeError(f'Could not build traffic level {number}')
        depth, cars, signature = best
        seen.add(signature)
        levels.append({'cars': cars, 'depth': depth})
        print(f'traffic {number}: {depth}', flush=True)
    return levels


def boxes_depth(width, walls, goals, player, boxes, limit=35000):
    goal = tuple(sorted(goals))
    start = (player, tuple(sorted(boxes)))
    queue = deque([(start, 0)])
    seen = {start}
    directions = ((1, 0), (-1, 0), (0, 1), (0, -1))
    while queue and len(seen) <= limit:
        (p, current), depth = queue.popleft()
        if current == goal:
            return depth
        box_set = set(current)
        x, y = p % width, p // width
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if not (0 <= nx < width and 0 <= ny < width):
                continue
            dest = ny * width + nx
            if dest in walls:
                continue
            next_boxes = box_set
            if dest in box_set:
                bx, by = nx + dx, ny + dy
                if not (0 <= bx < width and 0 <= by < width):
                    continue
                beyond = by * width + bx
                if beyond in walls or beyond in box_set:
                    continue
                next_boxes = (box_set - {dest}) | {beyond}
            state = (dest, tuple(sorted(next_boxes)))
            if state not in seen:
                seen.add(state)
                queue.append((state, depth + 1))
    return None


def make_boxes():
    width = 7
    boundary = {y * width + x for y in range(width) for x in range(width) if x in (0, 6) or y in (0, 6)}
    interior = [y * width + x for y in range(1, 6) for x in range(1, 6)]
    directions = ((1, 0), (-1, 0), (0, 1), (0, -1))
    levels, seen = [], set()
    for number in range(1, 51):
        target_count = 1 if number <= 7 else 2 if number <= 34 else 3
        min_depth = 5 if number <= 7 else 8 if number <= 34 else 11
        best = None
        for _ in range(1600):
            walls = boundary | set(RNG.sample(interior, 1 + (number - 1) // 17))
            free = [n for n in interior if n not in walls]
            goals = set(RNG.sample(free, target_count))
            boxes = set(goals)
            p = RNG.choice([n for n in free if n not in boxes])
            pulls = 0
            for __ in range(28 + number // 2):
                x, y = p % width, p // width
                options = []
                for dx, dy in directions:
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < width and 0 <= ny < width):
                        continue
                    q = ny * width + nx
                    if q in walls or q in boxes:
                        continue
                    # A reverse pull: a box behind the player follows into p.
                    bx, by = x - dx, y - dy
                    behind = by * width + bx if 0 <= bx < width and 0 <= by < width else -1
                    options.append((q, behind, behind in boxes))
                if not options:
                    break
                pulling = [option for option in options if option[2]]
                q, behind, pull = RNG.choice(pulling if pulling and RNG.random() < .78 else options)
                if pull:
                    boxes.remove(behind)
                    boxes.add(p)
                    pulls += 1
                p = q
            if boxes == goals or pulls < target_count + 1:
                continue
            signature = (tuple(sorted(walls - boundary)), tuple(sorted(goals)), p, tuple(sorted(boxes)))
            if signature in seen:
                continue
            depth = boxes_depth(width, walls, goals, p, boxes)
            if depth is None:
                continue
            candidate = (depth, signature, {'walls': sorted(walls - boundary), 'goals': sorted(goals), 'boxes': sorted(boxes), 'player': p, 'depth': depth})
            if best is None or depth > best[0]:
                best = candidate
            if min_depth <= depth <= min_depth + 20:
                best = candidate
                break
        if best is None:
            raise RuntimeError(f'Could not build box level {number}')
        depth, signature, level = best
        seen.add(signature)
        levels.append(level)
        print(f'boxes {number}: {depth}', flush=True)
    return levels


def make_maze():
    levels = []
    for number in range(1, 51):
        width = 7 if number <= 10 else 9 if number <= 30 else 11
        tiles = [['#'] * width for _ in range(width)]
        stack = [(1, 1)]
        visited = {(1, 1)}
        tiles[1][1] = '.'
        while stack:
            x, y = stack[-1]
            options = []
            for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
                xx, yy = x + dx, y + dy
                if 1 <= xx < width - 1 and 1 <= yy < width - 1 and (xx, yy) not in visited:
                    options.append((xx, yy, dx, dy))
            if options:
                xx, yy, dx, dy = RNG.choice(options)
                tiles[y + dy // 2][x + dx // 2] = '.'
                tiles[yy][xx] = '.'
                visited.add((xx, yy))
                stack.append((xx, yy))
            else:
                stack.pop()
        start, exit_ = width + 1, width * (width - 2) + width - 2
        queue = deque([start])
        distance = {start: 0}
        while queue:
            cur = queue.popleft()
            for nxt in neighbors(cur, width):
                if tiles[nxt // width][nxt % width] == '.' and nxt not in distance:
                    distance[nxt] = distance[cur] + 1
                    queue.append(nxt)
        candidates = [n for n in distance if n not in (start, exit_)]
        dead_ends = [n for n in candidates if sum(tiles[m // width][m % width] == '.' for m in neighbors(n, width)) == 1]
        pool = sorted(dead_ends or candidates, key=lambda n: distance[n], reverse=True)
        star_count = 1 if number <= 10 else 2 if number <= 30 else 3
        stars = []
        for candidate in pool:
            if all(abs(candidate % width - n % width) + abs(candidate // width - n // width) >= 3 for n in stars):
                stars.append(candidate)
            if len(stars) == star_count:
                break
        if len(stars) < star_count:
            stars.extend(n for n in candidates if n not in stars and n not in (start, exit_))
            stars = stars[:star_count]
        assert exit_ in distance and len(stars) == star_count and all(n in distance for n in stars)
        levels.append({'size': width, 'rows': [''.join(row) for row in tiles], 'stars': stars})
    return levels


U, R, D, L = 1, 2, 4, 8
EDGE = {(0, -1): U, (1, 0): R, (0, 1): D, (-1, 0): L}
OPPOSITE = {U: D, R: L, D: U, L: R}


def rotate(mask):
    return ((mask << 1) & 15) | (mask >> 3)


def pipe_connected(masks, width):
    target = width * width - 1
    queue = deque([0])
    seen = {0}
    while queue:
        cur = queue.popleft()
        if cur == target:
            return True
        x, y = cur % width, cur // width
        for (dx, dy), bit in EDGE.items():
            nx, ny = x + dx, y + dy
            if not (0 <= nx < width and 0 <= ny < width) or not masks[cur] & bit:
                continue
            nxt = ny * width + nx
            if masks[nxt] & OPPOSITE[bit] and nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return False


def make_pipes():
    levels = []
    for number in range(1, 51):
        width = 3 if number <= 12 else 4 if number <= 34 else 5
        target = width * width - 1
        visited = {0}
        stack = [0]
        parent = {}
        while stack:
            cur = stack[-1]
            available = [n for n in neighbors(cur, width) if n not in visited]
            if available:
                nxt = RNG.choice(available)
                visited.add(nxt)
                parent[nxt] = cur
                stack.append(nxt)
            else:
                stack.pop()
        path = [target]
        while path[-1] != 0:
            path.append(parent[path[-1]])
        path.reverse()
        solved = [R | D if RNG.random() < .5 else U | L for _ in range(width * width)]
        for index, cur in enumerate(path):
            mask = 0
            for nxt in path[max(0, index - 1):index] + path[index + 1:index + 2]:
                dx, dy = nxt % width - cur % width, nxt // width - cur // width
                mask |= EDGE[(dx, dy)]
            solved[cur] = mask
        assert pipe_connected(solved, width)
        scrambled = solved[:]
        for _ in range(40):
            for i in range(1, target):
                turns = RNG.randrange(4)
                scrambled[i] = solved[i]
                for __ in range(turns):
                    scrambled[i] = rotate(scrambled[i])
            # Every tile on the intended route needs a turn. Otherwise some
            # early boards can be solved with a single tap.
            for i in path[1:-1]:
                if scrambled[i] == solved[i]:
                    options = []
                    turned = solved[i]
                    for __ in range(3):
                        turned = rotate(turned)
                        if turned != solved[i]:
                            options.append(turned)
                    scrambled[i] = RNG.choice(options)
            if not pipe_connected(scrambled, width):
                break
        assert not pipe_connected(scrambled, width)
        levels.append({'size': width, 'masks': scrambled, 'pathLength': len(path)})
    return levels


def make_slides():
    goal = tuple(range(9))
    queue = deque([goal])
    distance = {goal: 0}
    buckets = {0: [goal]}
    while queue:
        state = queue.popleft()
        depth = distance[state]
        blank = state.index(8)
        for nxt in neighbors(blank, 3):
            candidate = list(state)
            candidate[blank], candidate[nxt] = candidate[nxt], candidate[blank]
            candidate = tuple(candidate)
            if candidate not in distance:
                distance[candidate] = depth + 1
                buckets.setdefault(depth + 1, []).append(candidate)
                queue.append(candidate)
    assert len(distance) == 181440
    arts = ['dino', 'frog', 'snake', 'rocket', 'flappy', 'star', 'car', 'panda', 'home', 'match3']
    levels = []
    for number in range(1, 51):
        depth = 4 + (number - 1) // 4
        board = RNG.choice(buckets[depth])
        levels.append({'tiles': board, 'art': arts[(number - 1) % len(arts)], 'depth': depth})
    return levels


def main():
    data = {
        'traffic': make_traffic(),
        'boxes': make_boxes(),
        'maze': make_maze(),
        'pipes': make_pipes(),
        'slide': make_slides(),
    }
    assert all(len(levels) == 50 for levels in data.values())
    (ROOT / 'levels-data.js').write_text('window.LevelData=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('wrote', {name: len(levels) for name, levels in data.items()})


if __name__ == '__main__':
    main()
