import json
import os
import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException

from outfit_recommendation import OutfitRequest, fetch_current_weather, recommend_outfit


ITEMS = [
    {'sourceUrl': 'manual:top', 'name': 'Black sweater', 'category': 'tops', 'color': 'black'},
    {'sourceUrl': 'manual:bottom', 'name': 'Blue jeans', 'category': 'bottoms', 'color': 'blue'},
]


def weather_response(status=200):
    response = Mock(status_code=status)
    response.json.return_value = {
        'location': {'name': 'Stockholm', 'country': 'Sweden', 'localtime': '2026-11-01 12:00'},
        'current': {'condition': {'text': 'Light rain'}, 'temp_c': 7, 'feelslike_c': 4,
                    'precip_mm': 0.4, 'wind_kph': 20, 'humidity': 85, 'is_day': 1},
        'forecast': {'forecastday': [{'day': {'daily_chance_of_rain': 80}}]},
    }
    return response


class OutfitRecommendationTests(unittest.TestCase):
    def test_weather_key_and_response_are_normalized(self):
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()) as get:
            weather = fetch_current_weather('Stockholm')
        self.assertEqual(weather.feelsLikeC, 4)
        self.assertEqual(weather.chanceOfRain, 80)
        self.assertEqual(get.call_args.kwargs['params']['q'], 'Stockholm')
        self.assertFalse(get.call_args.kwargs['allow_redirects'])

    def test_unknown_location_is_clear_and_does_not_leak_key(self):
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response(400)), \
             self.assertRaises(HTTPException) as error:
            fetch_current_weather('nowhere')
        self.assertEqual(error.exception.status_code, 422)
        self.assertNotIn('secret', str(error.exception.detail))

    def test_recommendation_only_returns_owned_items(self):
        completion = Mock()
        completion.choices = [Mock(message=Mock(content=json.dumps({
            'sourceUrls': ['manual:top', 'manual:bottom'], 'title': 'Warm casual layers',
            'explanation': 'The sweater and jeans work together for a cool day.',
            'weatherTip': 'Add an umbrella for the rain.',
        })))]
        client = Mock()
        client.chat.completions.create.return_value = completion
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()):
            result = recommend_outfit(OutfitRequest(location='Stockholm', items=ITEMS), client, 'test-model')
        self.assertEqual(result.outfit.sourceUrls, ['manual:top', 'manual:bottom'])
        sent = json.loads(client.chat.completions.create.call_args.kwargs['messages'][1]['content'])
        self.assertEqual(len(sent['ownedWardrobe']), 2)

    def test_invented_item_is_replaced_with_owned_item_fallback(self):
        completion = Mock()
        completion.choices = [Mock(message=Mock(content=json.dumps({
            'sourceUrls': ['manual:not-owned'], 'title': 'Invalid',
            'explanation': 'Invalid item.', 'weatherTip': 'None.',
        })))]
        client = Mock()
        client.chat.completions.create.return_value = completion
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()):
            result = recommend_outfit(OutfitRequest(location='Stockholm', items=ITEMS), client, 'test-model')
        self.assertEqual(result.outfit.sourceUrls, ['manual:top', 'manual:bottom'])

    def test_provider_failure_uses_owned_item_fallback(self):
        client = Mock()
        client.chat.completions.create.side_effect = RuntimeError('temporary quota')
        with patch.dict(os.environ, {'weather_api_key': 'secret'}, clear=True), \
             patch('outfit_recommendation.requests.get', return_value=weather_response()):
            result = recommend_outfit(OutfitRequest(location='Stockholm', items=ITEMS), client, 'test-model')
        self.assertEqual(result.outfit.sourceUrls, ['manual:top', 'manual:bottom'])
        self.assertIn('Stockholm', result.outfit.weatherTip)


if __name__ == '__main__':
    unittest.main()
