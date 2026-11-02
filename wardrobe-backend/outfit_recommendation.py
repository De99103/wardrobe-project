"""Weather-aware outfit recommendations grounded in owned wardrobe items."""
import json
import os
from typing import List, Literal, Optional

import requests
from fastapi import HTTPException
from pydantic import BaseModel, Field


class WardrobeItem(BaseModel):
    sourceUrl: str = Field(min_length=1, max_length=2048)
    name: Optional[str] = Field(default=None, max_length=1000)
    brand: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None, max_length=100)
    subcategory: Optional[str] = Field(default=None, max_length=500)
    color: Optional[str] = Field(default=None, max_length=500)
    material: Optional[str] = Field(default=None, max_length=2000)


class OutfitRequest(BaseModel):
    location: str = Field(min_length=2, max_length=200)
    occasion: str = Field(default='everyday', min_length=2, max_length=200)
    items: List[WardrobeItem] = Field(min_length=1, max_length=100)


class WeatherSummary(BaseModel):
    location: str
    localTime: str
    condition: str
    temperatureC: float
    feelsLikeC: float
    precipitationMm: float
    chanceOfRain: Optional[int] = None
    windKph: float
    humidity: int
    isDay: bool


class OutfitChoice(BaseModel):
    sourceUrls: List[str] = Field(min_length=1, max_length=8)
    title: str = Field(min_length=1, max_length=120)
    explanation: str = Field(min_length=1, max_length=800)
    weatherTip: str = Field(min_length=1, max_length=500)


class OutfitResult(BaseModel):
    weather: WeatherSummary
    outfit: OutfitChoice


def _fallback_choice(items, weather, occasion):
    """Return a safe local look when the AI provider is temporarily unavailable."""
    grouped = {}
    for item in items:
        grouped.setdefault(item.category or 'other', []).append(item)
    selected = []
    if grouped.get('dresses'):
        selected.append(grouped['dresses'][0])
    else:
        for category in ('tops', 'bottoms'):
            if grouped.get(category):
                selected.append(grouped[category][0])
    for category in ('outerwear', 'shoes', 'accessories'):
        if grouped.get(category):
            selected.append(grouped[category][0])
    if not selected:
        selected = items[:1]
    rain_note = ' Consider waterproof footwear or an umbrella.' if (weather.chanceOfRain or 0) >= 40 else ''
    return OutfitChoice(
        sourceUrls=[item.sourceUrl for item in selected],
        title=f'{occasion.title()} wardrobe look',
        explanation='A simple outfit assembled from the pieces you already own, balanced for the current temperature and plan.',
        weatherTip=f'It is {round(weather.temperatureC)}°C in {weather.location}; dress for the feels-like temperature.{rain_note}',
    )


def _weather_key():
    return (os.getenv('WEATHER_API_KEY') or os.getenv('weather_api_key') or '').strip()


def fetch_current_weather(location):
    key = _weather_key()
    if not key:
        raise HTTPException(503, 'Weather service is not configured.')
    try:
        response = requests.get(
            'https://api.weatherapi.com/v1/forecast.json',
            params={'key': key, 'q': location, 'days': 1, 'aqi': 'no', 'alerts': 'no'},
            timeout=(5, 15), allow_redirects=False)
        if response.status_code != 200:
            if response.status_code in (400, 404):
                raise HTTPException(422, 'Location was not found. Try a city name such as Stockholm.')
            raise HTTPException(502, 'Weather is temporarily unavailable.')
        payload = response.json()
        place = payload['location']
        current = payload['current']
        day = payload.get('forecast', {}).get('forecastday', [{}])[0].get('day', {})
        return WeatherSummary(
            location=', '.join(value for value in (place.get('name'), place.get('country')) if value),
            localTime=str(place.get('localtime') or ''),
            condition=str(current['condition']['text']),
            temperatureC=float(current['temp_c']),
            feelsLikeC=float(current['feelslike_c']),
            precipitationMm=float(current.get('precip_mm') or 0),
            chanceOfRain=int(day['daily_chance_of_rain']) if day.get('daily_chance_of_rain') is not None else None,
            windKph=float(current.get('wind_kph') or 0),
            humidity=int(current.get('humidity') or 0),
            isDay=bool(current.get('is_day')),
        )
    except HTTPException:
        raise
    except (requests.RequestException, ValueError, TypeError, KeyError, IndexError):
        raise HTTPException(502, 'Weather is temporarily unavailable.') from None


def recommend_outfit(request, groq_client, model):
    weather = fetch_current_weather(request.location)
    wardrobe = [item.model_dump() for item in request.items]
    schema = OutfitChoice.model_json_schema()
    schema['additionalProperties'] = False
    prompt = json.dumps({
        'weather': weather.model_dump(),
        'occasion': request.occasion,
        'ownedWardrobe': wardrobe,
    }, ensure_ascii=False)
    try:
        response = groq_client.chat.completions.create(
            model=model, temperature=0.2,
            messages=[{
                'role': 'system',
                'content': (
                    'You are a practical personal stylist. Choose one coherent outfit for the stated occasion and current weather. '
                    'Use only sourceUrl values from ownedWardrobe; never invent, alter, or recommend an unlisted item. '
                    'Prefer a top and bottom or a dress, then add owned outerwear, shoes, and accessories only when useful. '
                    'Account for feels-like temperature, rain, wind, and daylight. Do not claim facts missing from item data. '
                    'If the wardrobe is incomplete, choose the best usable subset and explain the limitation briefly. '
                    'Keep the explanation friendly, specific, and concise.'
                )},
                {'role': 'user', 'content': prompt}],
            response_format={'type': 'json_schema', 'json_schema': {
                'name': 'weather_outfit', 'strict': True, 'schema': schema}})
        raw_choice = response.choices[0].message.content
    except Exception:
        # Keep recommendations useful during a transient Groq timeout, quota
        # error, or model rollout. The fallback is still grounded entirely in
        # the user's owned items and current weather.
        choice = _fallback_choice(request.items, weather, request.occasion)
    else:
        try:
            choice = OutfitChoice.model_validate_json(raw_choice)
        except Exception:
            raise HTTPException(502, 'The stylist returned an invalid outfit. Please try again.') from None
    allowed = {item.sourceUrl for item in request.items}
    selected = list(dict.fromkeys(choice.sourceUrls))
    if not selected or any(url not in allowed for url in selected):
        # A model can occasionally return a stale or altered URL for one
        # location/occasion. Never expose that item, but keep the request
        # useful by rebuilding the look from the validated wardrobe payload.
        choice = _fallback_choice(request.items, weather, request.occasion)
        selected = choice.sourceUrls
    choice.sourceUrls = selected
    return OutfitResult(weather=weather, outfit=choice)
