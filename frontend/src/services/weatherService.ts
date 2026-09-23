import axios from 'axios';

export interface NortheastState {
  id: string;
  name: string;
  capital: string;
  latitude: number;
  longitude: number;
}

export const NORTHEAST_STATES: NortheastState[] = [
  {
    id: 'arunachal_pradesh',
    name: 'Arunachal Pradesh',
    capital: 'Itanagar',
    latitude: 27.0844,
    longitude: 93.6053,
  },
  {
    id: 'assam',
    name: 'Assam',
    capital: 'Guwahati / Dispur',
    latitude: 26.1445,
    longitude: 91.7362,
  },
  {
    id: 'manipur',
    name: 'Manipur',
    capital: 'Imphal',
    latitude: 24.8170,
    longitude: 93.9368,
  },
  {
    id: 'meghalaya',
    name: 'Meghalaya',
    capital: 'Shillong',
    latitude: 25.5788,
    longitude: 91.8933,
  },
  {
    id: 'mizoram',
    name: 'Mizoram',
    capital: 'Aizawl',
    latitude: 23.7271,
    longitude: 92.7176,
  },
  {
    id: 'nagaland',
    name: 'Nagaland',
    capital: 'Kohima',
    latitude: 25.6751,
    longitude: 94.1086,
  },
  {
    id: 'sikkim',
    name: 'Sikkim',
    capital: 'Gangtok',
    latitude: 27.3389,
    longitude: 88.6065,
  },
  {
    id: 'tripura',
    name: 'Tripura',
    capital: 'Agartala',
    latitude: 23.8315,
    longitude: 91.2868,
  },
];

export interface RealWeatherData {
  state: NortheastState;
  temperature: number;
  humidity: number;
  precipitation: number;
  rain: number;
  weatherCode: number;
  weatherLabel: string;
  windSpeed: number;
  visibility: number;
  precipitationProbability: number;
  lastUpdated: string;
  source: string;
}

export function mapWeatherCode(code: number): { label: string; icon: string; severity: 'normal' | 'advisory' | 'warning' } {
  if (code === 0) return { label: 'Clear Sky', icon: 'Sun', severity: 'normal' };
  if (code === 1) return { label: 'Mainly Clear', icon: 'Sun', severity: 'normal' };
  if (code === 2) return { label: 'Partly Cloudy', icon: 'CloudSun', severity: 'normal' };
  if (code === 3) return { label: 'Overcast', icon: 'Cloud', severity: 'normal' };
  if (code >= 45 && code <= 48) return { label: 'Foggy / Low Visibility', icon: 'CloudFog', severity: 'advisory' };
  if (code >= 51 && code <= 55) return { label: 'Drizzle', icon: 'CloudDrizzle', severity: 'advisory' };
  if (code >= 56 && code <= 57) return { label: 'Freezing Drizzle', icon: 'CloudSnow', severity: 'warning' };
  if (code >= 61 && code <= 65) return { label: 'Rain', icon: 'CloudRain', severity: code === 65 ? 'warning' : 'advisory' };
  if (code >= 71 && code <= 77) return { label: 'Snow Fall', icon: 'CloudSnow', severity: 'warning' };
  if (code >= 80 && code <= 82) return { label: 'Rain Showers', icon: 'CloudRain', severity: code === 82 ? 'warning' : 'advisory' };
  if (code >= 95 && code <= 99) return { label: 'Thunderstorm', icon: 'CloudLightning', severity: 'warning' };
  return { label: 'Precipitation', icon: 'Cloud', severity: 'normal' };
}

export async function fetchStateWeather(stateId: string): Promise<RealWeatherData> {
  const targetState = NORTHEAST_STATES.find((s) => s.id === stateId) || NORTHEAST_STATES[0];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetState.latitude}&longitude=${targetState.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,visibility&hourly=precipitation_probability,rain&forecast_days=1&timezone=Asia%2FKolkata`;

  const res = await axios.get(url, { timeout: 10000 });
  const current = res.data.current;
  const hourly = res.data.hourly;

  const weatherCode = current.weather_code ?? 0;
  const weatherInfo = mapWeatherCode(weatherCode);

  let precipProb = 0;
  if (hourly?.precipitation_probability && Array.isArray(hourly.precipitation_probability)) {
    const currentHourIndex = new Date().getHours();
    precipProb = hourly.precipitation_probability[currentHourIndex] ?? hourly.precipitation_probability[0] ?? 0;
  }

  return {
    state: targetState,
    temperature: Math.round((current.temperature_2m ?? 0) * 10) / 10,
    humidity: Math.round(current.relative_humidity_2m ?? 0),
    precipitation: Math.round((current.precipitation ?? 0) * 10) / 10,
    rain: Math.round((current.rain ?? 0) * 10) / 10,
    weatherCode,
    weatherLabel: weatherInfo.label,
    windSpeed: Math.round((current.wind_speed_10m ?? 0) * 10) / 10,
    visibility: Math.round(((current.visibility ?? 10000) / 1000) * 10) / 10,
    precipitationProbability: precipProb,
    lastUpdated: current.time || new Date().toISOString(),
    source: 'Open-Meteo',
  };
}
