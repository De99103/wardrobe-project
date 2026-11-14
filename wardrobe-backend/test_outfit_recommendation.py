import json
import os
import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException

from outfit_recommendation import OutfitRequest, fetch_current_weather, recommend_outfit


ITEMS = [
    {
        'sourceUrl': 'manual:top-black', 'name': 'Black sweater', 'category': 'tops', 'color': 'black',
        'styling': {'colors': ['black'], 'pattern': 'solid', 'warmth': 4, 'formality': 2,
                    'layerRole': 'mid', 'styleTags': ['minimal']},
    },
    {'sourceUrl': 'manual:top-white', 'name': 'White shirt', 'category': 'tops', 'color': 'white'},
    {'sourceUrl': 'manual:bottom', 'name': 'Blue jeans', 'category': 'bottoms', 'color': 'blue'},
    {'sourceUrl': 'manual:dress', 'name': 'Navy dress', 'category': 'dresses', 'color': 'navy'},
]


def weather_response(status=200):
    response = Mock(status_code=status)
    response.json.return_value = {
        'location': {'name': 'Stockholm', 'country': 'Sweden', 'localtime': '2026-11-01 12:00'},
        'current': {'condition': {'text': 'Light rain'}, 'temp_c': 7, 'feelslike_c': 4,
                    'precip_mm': 0.4, 'wind_kph': 20, 'humidity': 85, 'is_day': 1},
        'forecast': {'forecastday': [{
            'day': {'daily_chance_of_rain': 80},
            'hour': [
                {'time': '2026-11-01 13:00', 'condition': {'text': 'Cloudy'}, 'temp_c': 7,
                 'feelslike_c': 4, 'precip_mm': 0, 'chance_of_rain': 20, 'wind_kph': 18,
                 'humidity': 80, 'is_day': 1},
                {'time': '2026-11-01 18:00', 'condition': {'text': 'Rain'}, 'temp_c': 5,
                 'feelslike_c': 2, 'precip_mm': 1.2, 'chance_of_rain': 90, 'wind_kph': 24,
                 'humidity': 88, 'is_day': 0},
            ],
        }]},
    }
    return response


def completion(outfits):
    value = Mock()
    value.choices = [Mock(message=Mock(content=json.dumps({'outfits': outfits})))]
    return value


KNOWN_URLS = [item['sourceUrl'] for item in ITEMS] + ['manual:bottom-2']


def item_id(url):
    # The model sees 1-based integer ids; unknown urls map to an id that does not exist.
    return KNOWN_URLS.index(url) + 1 if url in KNOWN_URLS else 99


def ranked(source_urls, rank, label):
    return {
        'itemIds': [item_id(url) for url in source_urls],
        'title': f'Look {rank}',
        'explanation': 'These pieces make a coherent outfit for the plan.',
        'weatherTip': 'Take an umbrella if the rain continues.',
        'rank': rank,
        'label': label,
    }


class OutfitRecommendationTests(unittest.TestCase):
    def test_weather_key_and_response_are_normalized(self):
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()) as get:
            weather = fetch_current_weather('Stockholm')
        self.assertEqual(weather.feelsLikeC, 4)
        self.assertEqual(weather.chanceOfRain, 80)
        self.assertEqual(get.call_args.kwargs['params']['q'], 'Stockholm')
        self.assertEqual(get.call_args.kwargs['params']['days'], 1)
        self.assertFalse(get.call_args.kwargs['allow_redirects'])

    def test_planned_time_uses_nearest_hourly_forecast(self):
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()) as get:
            weather = fetch_current_weather('Stockholm', '2026-11-01T18:15')
        self.assertEqual(weather.localTime, '2026-11-01 18:00')
        self.assertEqual(weather.feelsLikeC, 2)
        self.assertEqual(weather.chanceOfRain, 90)
        self.assertEqual(get.call_args.kwargs['params']['days'], 3)

    def test_past_or_unavailable_planned_time_is_rejected(self):
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()), \
             self.assertRaises(HTTPException) as past:
            fetch_current_weather('Stockholm', '2026-11-01T11:00')
        self.assertEqual(past.exception.status_code, 422)

        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()), \
             self.assertRaises(HTTPException) as unavailable:
            fetch_current_weather('Stockholm', '2026-11-02T18:00')
        self.assertEqual(unavailable.exception.status_code, 422)

    def test_unknown_location_is_clear_and_does_not_leak_key(self):
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response(400)), \
             self.assertRaises(HTTPException) as error:
            fetch_current_weather('nowhere')
        self.assertEqual(error.exception.status_code, 422)
        self.assertNotIn('secret', str(error.exception.detail))

    def test_three_ranked_outfits_are_grounded_and_legacy_best_is_preserved(self):
        choices = [
            ranked(['manual:top-black', 'manual:bottom'], 1, 'Best match'),
            ranked(['manual:dress'], 2, 'One-piece option'),
            ranked(['manual:top-white', 'manual:bottom'], 3, 'Lighter alternative'),
        ]
        client = Mock()
        client.chat.completions.create.return_value = completion(choices)
        request = OutfitRequest(
            location='Stockholm', occasion='Dinner', plannedTime='2026-11-01T18:15',
            environment='mixed', items=ITEMS)
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()):
            result = recommend_outfit(request, client, 'test-model')

        self.assertEqual(len(result.outfits), 3)
        self.assertEqual([choice.rank for choice in result.outfits], [1, 2, 3])
        self.assertEqual(result.outfit.sourceUrls, result.outfits[0].sourceUrls)
        self.assertEqual(result.context.environment, 'mixed')
        self.assertIsNone(result.notice)
        sent = json.loads(client.chat.completions.create.call_args.kwargs['messages'][1]['content'])
        self.assertEqual(sent['plannedTime'], '2026-11-01T18:15')
        self.assertEqual(sent['ownedWardrobe'][0]['styling']['warmth'], 4)
        self.assertEqual(sent['ownedWardrobe'][1]['styling']['layerRole'], 'base')

    def test_duplicate_outfits_are_removed_with_an_honest_notice(self):
        choices = [
            ranked(['manual:top-black', 'manual:bottom'], 1, 'Best match'),
            ranked(['manual:bottom', 'manual:top-black'], 2, 'Duplicate'),
        ]
        client = Mock()
        client.chat.completions.create.return_value = completion(choices)
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()):
            result = recommend_outfit(OutfitRequest(location='Stockholm', items=ITEMS), client, 'test-model')
        self.assertEqual(len(result.outfits), 1)
        self.assertIn('Found 1 distinct outfit option', result.notice)

    def test_invented_or_structurally_invalid_outfits_are_rejected(self):
        client = Mock()
        client.chat.completions.create.return_value = completion([
            ranked(['manual:not-owned'], 1, 'Invalid'),
        ])
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()):
            result = recommend_outfit(OutfitRequest(location='Stockholm', items=ITEMS), client, 'test-model')
        self.assertEqual(result.outfit.sourceUrls, ['manual:dress'])

        two_bottoms = ITEMS + [{'sourceUrl': 'manual:bottom-2', 'category': 'bottoms'}]
        client.chat.completions.create.return_value = completion([
            ranked(['manual:bottom', 'manual:bottom-2'], 1, 'Invalid structure'),
        ])
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()):
            result = recommend_outfit(OutfitRequest(location='Stockholm', items=two_bottoms), client, 'test-model')
        self.assertEqual(result.outfit.sourceUrls, ['manual:dress'])

    def test_provider_failure_uses_owned_item_fallback(self):
        client = Mock()
        client.chat.completions.create.side_effect = RuntimeError('temporary quota')
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()):
            result = recommend_outfit(OutfitRequest(location='Stockholm', items=ITEMS), client, 'test-model')
        self.assertEqual(result.outfit.sourceUrls, ['manual:dress'])



    def test_swap_keeps_other_pieces_and_uses_same_category(self):
        from outfit_recommendation import OutfitVariation, _fallback_variations, WeatherSummary
        weather = WeatherSummary(location='Stockholm', localTime='2026-11-01 12:00',
                                 condition='Cloudy', temperatureC=18, feelsLikeC=18,
                                 precipitationMm=0, chanceOfRain=0, windKph=4,
                                 humidity=40, isDay=True)
        request = OutfitRequest(location='Stockholm', items=ITEMS)
        variation = OutfitVariation(
            mode='swap',
            currentSourceUrls=['manual:top-black', 'manual:bottom'],
            replaceSourceUrl='manual:top-black',
            avoidOutfits=[['manual:top-black', 'manual:bottom']],
        )
        outfits = _fallback_variations(request.items, weather, 'everyday', variation=variation)
        self.assertTrue(outfits)
        self.assertEqual(outfits[0].sourceUrls, ['manual:top-white', 'manual:bottom'])

    def test_restyle_excludes_previous_look(self):
        from outfit_recommendation import OutfitVariation, _fallback_variations, WeatherSummary
        weather = WeatherSummary(location='Stockholm', localTime='2026-11-01 12:00',
                                 condition='Cloudy', temperatureC=18, feelsLikeC=18,
                                 precipitationMm=0, chanceOfRain=0, windKph=4,
                                 humidity=40, isDay=True)
        request = OutfitRequest(location='Stockholm', items=ITEMS)
        variation = OutfitVariation(
            mode='restyle',
            currentSourceUrls=['manual:dress'],
            avoidOutfits=[['manual:dress']],
        )
        outfits = _fallback_variations(request.items, weather, 'everyday', variation=variation)
        self.assertTrue(outfits)
        self.assertTrue(all(set(outfit.sourceUrls) != {'manual:dress'} for outfit in outfits))

    def test_strict_schema_has_required_fields(self):
        from outfit_recommendation import CandidateSet, _strict_schema
        schema = _strict_schema(CandidateSet.model_json_schema())
        self.assertEqual(schema['required'], list(schema['properties']))
        self.assertFalse(schema['additionalProperties'])
        for definition in schema['$defs'].values():
            self.assertEqual(definition['required'], list(definition['properties']))
            self.assertFalse(definition['additionalProperties'])

if __name__ == '__main__':
    unittest.main()
