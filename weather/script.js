/* ---------- 1. SETTINGS & HELPERS ---------- */
let useCelsius = true;     // current unit
let lastData = null;       // last forecast received
let lastPlace = '';        // last city name

const $ = id => document.getElementById(id);

// Weather code -> [emoji, text, background class]
const CODES = {
  0: ['☀️', 'Clear sky', 'sunny'],
  1: ['🌤️', 'Mostly clear', 'sunny'],
  2: ['⛅', 'Partly cloudy', 'cloudy'],
  3: ['☁️', 'Overcast', 'cloudy'],
  45: ['🌫️', 'Fog', 'cloudy'], 48: ['🌫️', 'Freezing fog', 'cloudy'],
  51: ['🌦️', 'Light drizzle', 'rainy'], 53: ['🌦️', 'Drizzle', 'rainy'], 55: ['🌧️', 'Heavy drizzle', 'rainy'],
  61: ['🌧️', 'Light rain', 'rainy'], 63: ['🌧️', 'Rain', 'rainy'], 65: ['🌧️', 'Heavy rain', 'rainy'],
  71: ['🌨️', 'Light snow', 'snowy'], 73: ['🌨️', 'Snow', 'snowy'], 75: ['❄️', 'Heavy snow', 'snowy'],
  77: ['❄️', 'Snow grains', 'snowy'],
  80: ['🌦️', 'Rain showers', 'rainy'], 81: ['🌧️', 'Heavy showers', 'rainy'], 82: ['⛈️', 'Violent showers', 'rainy'],
  85: ['🌨️', 'Snow showers', 'snowy'], 86: ['❄️', 'Heavy snow showers', 'snowy'],
  95: ['⛈️', 'Thunderstorm', 'rainy'], 96: ['⛈️', 'Thunderstorm with hail', 'rainy'], 99: ['⛈️', 'Severe thunderstorm', 'rainy']
};
const info = code => CODES[code] || ['🌡️', 'Unknown', 'cloudy'];

// Convert temperature to the chosen unit
const t = c => useCelsius ? Math.round(c) + '°C' : Math.round(c * 9 / 5 + 32) + '°F';

function show(msg) {
  $('message').hidden = !msg;
  $('message').textContent = msg || '';
}

/* ---------- 2. GET DATA FROM API ---------- */
async function searchCity(name) {
  if (!name.trim()) return show('Please type a city name.');
  show('Searching…');
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`);
    const data = await res.json();
    if (!data.results) return show('City not found. Check the spelling and try again.');
    const p = data.results[0];
    getWeather(p.latitude, p.longitude, `${p.name}, ${p.country || ''}`);
  } catch (e) {
    show('Could not connect. Check your internet and try again.');
  }
}

async function getWeather(lat, lon, place) {
  show('Loading forecast…');
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m'
    + '&hourly=temperature_2m,weather_code'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max'
    + '&timezone=auto';
  try {
    const res = await fetch(url);
    lastData = await res.json();
    lastPlace = place;
    show('');
    render();
  } catch (e) {
    show('Could not load the forecast. Please try again.');
  }
}

/* ---------- 3. SHOW DATA ON PAGE ---------- */
function render() {
  const d = lastData, c = d.current;
  const [icon, text, bg] = info(c.weather_code);

  // Background: night overrides everything
  document.body.className = c.is_day ? bg : 'night';

  $('weather').hidden = false;
  $('city').textContent = lastPlace;
  $('date').textContent = new Date(c.time).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  $('icon').textContent = icon;
  $('temp').textContent = t(c.temperature_2m);
  $('desc').textContent = text;

  // Detail boxes
  const timeOnly = s => s.slice(11, 16);
  const boxes = [
    ['Feels like', t(c.apparent_temperature)],
    ['Humidity', c.relative_humidity_2m + '%'],
    ['Wind', Math.round(c.wind_speed_10m) + ' km/h'],
    ['Pressure', Math.round(c.surface_pressure) + ' hPa'],
    ['UV index', Math.round(d.daily.uv_index_max[0])],
    ['Rain chance', (d.daily.precipitation_probability_max[0] ?? 0) + '%'],
    ['Sunrise', timeOnly(d.daily.sunrise[0])],
    ['Sunset', timeOnly(d.daily.sunset[0])]
  ];
  $('details').innerHTML = boxes.map(b => `<div class="box"><span>${b[0]}</span><b>${b[1]}</b></div>`).join('');

  // Hourly: start from the current hour, show 24 hours
  const start = d.hourly.time.indexOf(c.time.slice(0, 13) + ':00');
  let html = '';
  for (let i = start; i < start + 24 && i < d.hourly.time.length; i++) {
    html += `<div class="hour">
      <div>${i === start ? 'Now' : timeOnly(d.hourly.time[i])}</div>
      <div>${info(d.hourly.weather_code[i])[0]}</div>
      <div>${t(d.hourly.temperature_2m[i])}</div></div>`;
  }
  $('hourly').innerHTML = html;

  // 7 day list
  $('daily').innerHTML = d.daily.time.map((day, i) => {
    const name = i === 0 ? 'Today' : new Date(day).toLocaleDateString('en-US', { weekday: 'long' });
    return `<div class="day">
      <span class="name">${name}</span>
      <span class="ic">${info(d.daily.weather_code[i])[0]}</span>
      <span class="rain">💧 ${d.daily.precipitation_probability_max[i] ?? 0}%</span>
      <span class="range">${t(d.daily.temperature_2m_min[i])} / ${t(d.daily.temperature_2m_max[i])}</span>
    </div>`;
  }).join('');
}

/* ---------- 4. BUTTONS ---------- */
$('searchBtn').onclick = () => searchCity($('cityInput').value);
$('cityInput').addEventListener('keydown', e => { if (e.key === 'Enter') searchCity(e.target.value); });

$('unitBtn').onclick = () => { useCelsius = !useCelsius; if (lastData) render(); };

$('locBtn').onclick = () => {
  if (!navigator.geolocation) return show('Location is not supported in this browser.');
  show('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    pos => getWeather(pos.coords.latitude, pos.coords.longitude, 'Your location'),
    () => show('Location blocked. Search for a city instead.')
  );
};

// Load a default city when the page opens
searchCity('Delhi');