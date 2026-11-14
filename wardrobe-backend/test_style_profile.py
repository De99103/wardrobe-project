import json
import os
import unittest
from unittest.mock import Mock, patch

from pydantic import ValidationError

from outfit_recommendation import FavoriteOutfit, OutfitRequest, recommend_outfit
from style_profile import build_style_profile, taste_score
from test_outfit_recommendation import ITEMS, completion, ranked, weather_response


def piece(category, colors, formality=2, tags=(), pattern=None):
    return {'category': category, 'colors': list(colors), 'formality': formality,
            'styleTags': list(tags), 'pattern': pattern}


def look(source, occasion, *pieces):
    return {'source': source, 'occasion': occasion, 'pieces': list(pieces)}


NAVY_WHITE = [piece('tops', ['white'], 2, ['minimal']), piece('bottoms', ['navy'], 2, ['minimal'])]
RED = [piece('tops', ['red'], 1, ['sporty']), piece('bottoms', ['red'], 1, ['sporty'])]


class ProfileTests(unittest.TestCase):
    def test_needs_at_least_one_look_with_two_pieces(self):
        self.assertIsNone(build_style_profile([]))
        self.assertIsNone(build_style_profile([look('user', 'Work', piece('tops', ['white']))]))

    def test_summarizes_colors_pairs_and_formality(self):
        profile = build_style_profile([look('user', 'Work', *NAVY_WHITE)], 'Work')
        self.assertEqual(profile['basedOnLooks'], 1)
        self.assertEqual(profile['userCreatedLooks'], 1)
        self.assertCountEqual(profile['favoriteColors'], ['white', 'navy'])
        self.assertEqual(profile['colorPairs'], ['navy + white'])
        self.assertEqual(profile['commonStyleTags'], ['minimal'])
        self.assertEqual(profile['typicalFormality'], {'overall': 2.0, 'forThisOccasion': 2.0})
        self.assertEqual(profile['typicalPieceCount'], 2.0)
        self.assertFalse(profile['usuallyAddsAccessories'])

    def test_user_looks_outweigh_saved_ai_looks(self):
        looks = [look('ai', 'Everyday', *RED), look('ai', 'Everyday', *RED),
                 look('user', 'Everyday', *NAVY_WHITE)]
        profile = build_style_profile(looks)
        self.assertEqual(profile['userCreatedLooks'], 1)
        # One deliberate look (weight 2.0) edges out two saved AI looks (1.0 + 0.9).
        self.assertIn(profile['favoriteColors'][0], ('white', 'navy'))

    def test_newer_looks_matter_more(self):
        newest_first = [look('user', 'x', *RED), look('user', 'x', *NAVY_WHITE)]
        self.assertEqual(build_style_profile(newest_first)['favoriteColors'][0], 'red')
        self.assertIn(build_style_profile(newest_first[::-1])['favoriteColors'][0], ('white', 'navy'))

    def test_occasion_formality_uses_only_matching_looks(self):
        dressy = [piece('dresses', ['black'], 4), piece('accessories', ['gold'], 4)]
        profile = build_style_profile([look('user', 'Dinner', *dressy), look('user', 'Everyday', *RED)], 'dinner')
        self.assertEqual(profile['typicalFormality']['forThisOccasion'], 4.0)
        self.assertLess(profile['typicalFormality']['overall'], 4.0)
        self.assertIsNone(build_style_profile([look('user', 'Everyday', *RED)], 'Dinner')['typicalFormality']['forThisOccasion'])
        self.assertTrue(profile['usuallyAddsAccessories'] or profile['typicalPieceCount'] == 2.0)

    def test_one_off_pattern_is_not_a_style(self):
        striped = [piece('tops', ['navy'], 2, pattern='striped'), piece('bottoms', ['white'])]
        self.assertEqual(build_style_profile([look('ai', 'x', *striped)])['recurringPatterns'], [])

    def test_taste_score_prefers_liked_colors_and_is_zero_without_profile(self):
        profile = build_style_profile([look('user', 'Work', *NAVY_WHITE)], 'Work')
        liked = taste_score(NAVY_WHITE, profile, 'Work')
        disliked = taste_score(RED, profile, 'Work')
        self.assertGreater(liked, disliked)
        self.assertEqual(taste_score(NAVY_WHITE, None), 0.0)
        self.assertEqual(taste_score([], profile), 0.0)


def fallback_items():
    return [
        {'sourceUrl': 'manual:top-red', 'category': 'tops', 'color': 'red'},
        {'sourceUrl': 'manual:top-white', 'category': 'tops', 'color': 'white'},
        {'sourceUrl': 'manual:bottom-blue', 'category': 'bottoms', 'color': 'blue'},
        {'sourceUrl': 'manual:bottom-black', 'category': 'bottoms', 'color': 'black'},
    ]


def run(request, client):
    with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
         patch('outfit_recommendation.requests.get', return_value=weather_response()):
        return recommend_outfit(request, client, 'test-model')


class RecommendationTests(unittest.TestCase):
    def failing_client(self):
        client = Mock()
        client.chat.completions.create.side_effect = RuntimeError('temporary quota')
        return client

    def test_favorite_source_defaults_to_ai_and_rejects_unknown_values(self):
        self.assertEqual(FavoriteOutfit(sourceUrls=['a'], occasion='Work').source, 'ai')
        with self.assertRaises(ValidationError):
            FavoriteOutfit(sourceUrls=['a'], occasion='Work', source='robot')

    def test_fallback_without_favorites_is_unchanged(self):
        result = run(OutfitRequest(location='Stockholm', items=fallback_items()), self.failing_client())
        self.assertEqual(result.outfits[0].sourceUrls[:2], ['manual:top-red', 'manual:bottom-blue'])
        self.assertEqual([o.rank for o in result.outfits], [1, 2, 3])

    def test_fallback_prefers_combinations_close_to_user_created_looks(self):
        favorites = [{'sourceUrls': ['manual:top-white', 'manual:bottom-black'], 'occasion': 'Everyday', 'source': 'user'}]
        request = OutfitRequest(location='Stockholm', items=fallback_items(), favoriteOutfits=favorites)
        result = run(request, self.failing_client())
        offered = [set(outfit.sourceUrls) for outfit in result.outfits]
        # The saved look itself is not offered again while other options exist...
        self.assertNotIn({'manual:top-white', 'manual:bottom-black'}, offered)
        self.assertEqual([outfit.rank for outfit in result.outfits], [1, 2, 3])
        self.assertEqual([outfit.title[-1] for outfit in result.outfits], ['1', '2', '3'])
        # ...and white (a liked color) beats red when nothing else separates them.
        self.assertEqual(offered[0], {'manual:top-white', 'manual:bottom-blue'})

    def test_prompt_carries_profile_and_marks_user_made_looks(self):
        client = Mock()
        client.chat.completions.create.return_value = completion([ranked(['manual:dress'], 1, 'Best match')])
        favorites = [{'sourceUrls': ['manual:top-black', 'manual:bottom'], 'occasion': 'Work', 'source': 'user'}]
        run(OutfitRequest(location='Stockholm', occasion='Work', items=ITEMS, favoriteOutfits=favorites), client)
        messages = client.chat.completions.create.call_args.kwargs['messages']
        sent = json.loads(messages[1]['content'])
        self.assertEqual(sent['styleProfile']['userCreatedLooks'], 1)
        self.assertTrue(sent['savedStyleExamples'][0]['madeByUser'])
        self.assertIn('styleProfile', messages[0]['content'])

    def test_no_favorites_means_no_profile(self):
        client = Mock()
        client.chat.completions.create.return_value = completion([ranked(['manual:dress'], 1, 'Best match')])
        run(OutfitRequest(location='Stockholm', items=ITEMS), client)
        sent = json.loads(client.chat.completions.create.call_args.kwargs['messages'][1]['content'])
        self.assertIsNone(sent['styleProfile'])

    def test_looks_with_deleted_pieces_still_count_when_two_remain(self):
        favorites = [{'sourceUrls': ['manual:top-black', 'manual:bottom', 'manual:gone'], 'occasion': 'Work', 'source': 'user'},
                     {'sourceUrls': ['manual:top-black', 'manual:gone'], 'occasion': 'Work', 'source': 'user'}]
        client = Mock()
        client.chat.completions.create.return_value = completion([ranked(['manual:dress'], 1, 'Best match')])
        run(OutfitRequest(location='Stockholm', items=ITEMS, favoriteOutfits=favorites), client)
        sent = json.loads(client.chat.completions.create.call_args.kwargs['messages'][1]['content'])
        self.assertEqual(sent['styleProfile']['basedOnLooks'], 1)

    def test_exact_copies_of_saved_looks_are_dropped_when_alternatives_exist(self):
        saved = {'sourceUrls': ['manual:top-black', 'manual:bottom'], 'occasion': 'Work', 'source': 'user'}
        client = Mock()
        client.chat.completions.create.return_value = completion([
            ranked(['manual:bottom', 'manual:top-black'], 1, 'Same as saved'),
            ranked(['manual:dress'], 2, 'Fresh'),
        ])
        result = run(OutfitRequest(location='Stockholm', items=ITEMS, favoriteOutfits=[saved]), client)
        self.assertEqual([o.sourceUrls for o in result.outfits], [['manual:dress']])
        self.assertEqual(result.outfits[0].rank, 1)

    def test_a_saved_look_is_kept_if_it_is_the_only_suitable_option(self):
        saved = {'sourceUrls': ['manual:top-black', 'manual:bottom'], 'occasion': 'Work', 'source': 'user'}
        client = Mock()
        client.chat.completions.create.return_value = completion([
            ranked(['manual:top-black', 'manual:bottom'], 1, 'Same as saved')])
        result = run(OutfitRequest(location='Stockholm', items=ITEMS, favoriteOutfits=[saved]), client)
        self.assertEqual(set(result.outfit.sourceUrls), {'manual:top-black', 'manual:bottom'})


if __name__ == '__main__':
    unittest.main()
