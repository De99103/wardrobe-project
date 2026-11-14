"""Summarize the looks a user likes into a small, explainable taste profile.

Looks the user built themselves are stronger evidence than looks they merely
saved from an AI suggestion, and newer looks matter more than older ones. The
profile is computed in code (not by the model) so it is cheap to send, easy to
test, and can also be used to rank local fallback outfits.

A "look" is a dict:
    {'source': 'user' | 'ai', 'occasion': str,
     'pieces': [{'category', 'colors', 'pattern', 'formality', 'styleTags'}]}
Looks must be ordered newest first.
"""
from collections import Counter
from itertools import combinations
from typing import Dict, Iterable, List, Optional

USER_WEIGHT = 2.0
AI_WEIGHT = 1.0
RECENCY_DECAY = 0.9
MIN_PIECES = 2
NEUTRALS = {'black', 'white', 'grey', 'gray', 'beige', 'cream', 'ivory', 'navy', 'brown', 'tan', 'camel'}


def _norm(value) -> str:
    return ' '.join(str(value or '').casefold().split())


def _same_occasion(a: str, b: str) -> bool:
    a, b = _norm(a), _norm(b)
    return bool(a and b and (a == b or a in b or b in a))


def _top(counter: Counter, limit: int, minimum: float = 0.0) -> List[str]:
    return [key for key, score in counter.most_common(limit) if key and score > minimum]


def _weighted_mean(values: Iterable[tuple]) -> Optional[float]:
    pairs = [(value, weight) for value, weight in values if value is not None]
    total = sum(weight for _, weight in pairs)
    if not total:
        return None
    return round(sum(value * weight for value, weight in pairs) / total, 1)


def build_style_profile(looks: List[Dict], occasion: Optional[str] = None) -> Optional[Dict]:
    """Return a compact profile, or None when there are not enough usable looks."""
    seen = {'user': 0, 'ai': 0}
    weighted = []
    for look in looks:
        pieces = look.get('pieces') or []
        if len(pieces) < MIN_PIECES:
            continue
        source = 'user' if look.get('source') == 'user' else 'ai'
        # Decay within each source so a handful of new AI looks cannot bury
        # the looks the user deliberately created.
        weight = (USER_WEIGHT if source == 'user' else AI_WEIGHT) * RECENCY_DECAY ** seen[source]
        seen[source] += 1
        weighted.append((weight, look, pieces))
    if not weighted:
        return None

    colors, pairs, tags, patterns = Counter(), Counter(), Counter(), Counter()
    formality_all, formality_occasion = [], []
    piece_counts, accessory_votes = [], []
    for weight, look, pieces in weighted:
        # A look votes once per color, so a monochrome look does not count double.
        look_colors = list(dict.fromkeys(
            _norm(c) for piece in pieces for c in piece.get('colors') or [] if _norm(c)))
        for color in look_colors:
            colors[color] += weight
        for piece in pieces:
            for tag in piece.get('styleTags') or []:
                tags[_norm(tag)] += weight
            if piece.get('pattern'):
                patterns[_norm(piece['pattern'])] += weight
            formality = piece.get('formality')
            if isinstance(formality, int):
                formality_all.append((formality, weight))
                if occasion and _same_occasion(look.get('occasion', ''), occasion):
                    formality_occasion.append((formality, weight))
        for pair in combinations(sorted(set(look_colors)), 2):
            pairs[' + '.join(pair)] += weight
        piece_counts.append((len(pieces), weight))
        accessory_votes.append((1 if any(p.get('category') == 'accessories' for p in pieces) else 0, weight))

    # Patterns only matter when they recur; one striped top is not a style.
    recurring_patterns = [name for name in _top(patterns, 3) if patterns[name] >= 2 * AI_WEIGHT]
    accessory_rate = _weighted_mean(accessory_votes) or 0
    return {
        'basedOnLooks': len(weighted),
        'userCreatedLooks': seen['user'],
        'favoriteColors': _top(colors, 5),
        'colorPairs': _top(pairs, 3),
        'prefersNeutrals': sum(s for c, s in colors.items() if c in NEUTRALS) > sum(colors.values()) / 2 if colors else None,
        'typicalFormality': {
            'overall': _weighted_mean(formality_all),
            'forThisOccasion': _weighted_mean(formality_occasion),
        },
        'commonStyleTags': _top(tags, 5),
        'recurringPatterns': recurring_patterns,
        'typicalPieceCount': _weighted_mean(piece_counts),
        'usuallyAddsAccessories': accessory_rate >= 0.5,
    }


def taste_score(pieces: List[Dict], profile: Optional[Dict], occasion: Optional[str] = None) -> float:
    """Higher means closer to the user's taste. 0 when there is no profile.

    This is only a ranking tiebreaker for local fallback outfits. It never
    decides whether an outfit is allowed: weather and composition rules do.
    """
    if not profile or not pieces:
        return 0.0
    liked_colors = profile.get('favoriteColors') or []
    liked_pairs = set(profile.get('colorPairs') or [])
    liked_tags = set(profile.get('commonStyleTags') or [])
    outfit_colors = list(dict.fromkeys(_norm(c) for p in pieces for c in (p.get('colors') or []) if c))
    score = 0.0
    for color in outfit_colors:
        if color in liked_colors:
            # Earlier in the list means a stronger preference.
            score += 1.0 - 0.1 * liked_colors.index(color)
    for pair in combinations(sorted(outfit_colors), 2):
        if ' + '.join(pair) in liked_pairs:
            score += 1.5
    score += 0.5 * len({_norm(t) for p in pieces for t in (p.get('styleTags') or [])} & liked_tags)
    formalities = [p['formality'] for p in pieces if isinstance(p.get('formality'), int)]
    typical = (profile.get('typicalFormality') or {})
    target = typical.get('forThisOccasion') if typical.get('forThisOccasion') is not None else typical.get('overall')
    if formalities and target is not None:
        score -= abs(sum(formalities) / len(formalities) - target) * 0.5
    has_accessory = any(p.get('category') == 'accessories' for p in pieces)
    if has_accessory == bool(profile.get('usuallyAddsAccessories')):
        score += 0.25
    return round(score, 3)
