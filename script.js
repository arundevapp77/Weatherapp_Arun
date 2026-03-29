const OPENWEATHER_API_KEY = '6fd81aa4610b3d15d65c91fbd35e8805';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rhjtbcqwukwblqwhrffq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoanRiY3F3dWt3Ymxxd2hyZmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDY0NzIsImV4cCI6MjA5MDI4MjQ3Mn0.IZw_BEgLzp8bgUgr4IFOB2J-Pto8KgVepTLKFqDe6AE';

const elements = {
    searchForm: document.getElementById('searchForm'),
    cityInput: document.getElementById('cityInput'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText'),
    resultsContainer: document.getElementById('resultsContainer'),
    cityName: document.getElementById('cityName'),
    currentDate: document.getElementById('currentDate'),
    weatherIcon: document.getElementById('weatherIcon'),
    temperature: document.getElementById('temperature'),
    conditions: document.getElementById('conditions'),
    humidity: document.getElementById('humidity'),
    forecastToggle: document.getElementById('forecastToggle'),
    forecastContainer: document.getElementById('forecastContainer'),
    forecastContent: document.getElementById('forecastContent'),
    forecastChevron: document.getElementById('forecastChevron'),
    newsContainer: document.getElementById('newsContainer'),
    body: document.getElementById('body'),
    hourlyModal: document.getElementById('hourlyModal'),
    modalDate: document.getElementById('modalDate'),
    modalCity: document.getElementById('modalCity'),
    hourlyContent: document.getElementById('hourlyContent'),
    closeModal: document.getElementById('closeModal')
};

let currentForecastData = null;
let currentCityName = '';

const weatherIconMap = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Smoke': '🌫️',
    'Haze': '🌫️',
    'Dust': '🌫️',
    'Fog': '🌫️',
    'Sand': '🌫️',
    'Ash': '🌫️',
    'Squall': '💨',
    'Tornado': '🌪️'
};

const weatherBackgroundMap = {
    'Clear': 'bg-clear',
    'Clouds': 'bg-cloudy',
    'Rain': 'bg-rainy',
    'Drizzle': 'bg-rainy',
    'Thunderstorm': 'bg-thunderstorm',
    'Snow': 'bg-snowy',
    'Mist': 'bg-cloudy',
    'Smoke': 'bg-cloudy',
    'Haze': 'bg-cloudy',
    'Dust': 'bg-cloudy',
    'Fog': 'bg-cloudy',
    'Sand': 'bg-cloudy',
    'Ash': 'bg-cloudy',
    'Squall': 'bg-thunderstorm',
    'Tornado': 'bg-thunderstorm'
};

function showLoading() {
    elements.loadingSpinner.classList.remove('hidden');
    elements.errorMessage.classList.add('hidden');
    elements.resultsContainer.classList.add('hidden');
}

function hideLoading() {
    elements.loadingSpinner.classList.add('hidden');
}

function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    elements.resultsContainer.classList.add('hidden');
    hideLoading();
}

function showResults() {
    elements.resultsContainer.classList.remove('hidden');
    elements.errorMessage.classList.add('hidden');
    hideLoading();
}

function updateBackground(weatherCondition) {
    const bgClass = weatherBackgroundMap[weatherCondition] || 'bg-default';

    Object.values(weatherBackgroundMap).forEach(cls => {
        elements.body.classList.remove(cls);
    });
    elements.body.classList.remove('bg-default');

    elements.body.classList.add(bgClass);
}

function formatDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
}

async function fetchWeather(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},US&appid=${OPENWEATHER_API_KEY}&units=imperial`;

    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('City not found. Please check the spelling and try again.');
        } else if (response.status === 401) {
            throw new Error('Weather API key is invalid. Please add your OpenWeatherMap API key.');
        } else {
            throw new Error('Failed to fetch weather data. Please try again later.');
        }
    }

    return response.json();
}

async function fetchForecast(city) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)},US&appid=${OPENWEATHER_API_KEY}&units=imperial`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Failed to fetch forecast data.');
    }

    return response.json();
}

async function fetchNews(city) {
    try {
        const url = `${SUPABASE_URL}/functions/v1/city-news?city=${encodeURIComponent(city)}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        const contentType = response.headers.get('content-type');

        if (!response.ok) {
            const errorText = await response.text();
            console.error('News fetch failed:', response.status, response.statusText);
            console.error('Error response:', errorText);
            return [];
        }

        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('Received non-JSON response from news API');
            console.error('Content-Type:', contentType);
            console.error('Response preview:', responseText.substring(0, 500));
            return [];
        }

        const data = await response.json();

        if (data.error) {
            console.error('API returned error:', data.error);
            return [];
        }

        return data.articles || [];
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

function displayWeather(data) {
    const weatherCondition = data.weather[0].main;

    currentCityName = `${data.name}, ${data.sys.country}`;
    elements.cityName.textContent = currentCityName;
    elements.currentDate.textContent = formatDate();
    elements.weatherIcon.textContent = weatherIconMap[weatherCondition] || '🌡️';
    elements.temperature.textContent = `${Math.round(data.main.temp)}°F`;
    elements.conditions.textContent = data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1);
    elements.humidity.textContent = `${data.main.humidity}%`;

    updateBackground(weatherCondition);
}

function displayNews(articles) {
    elements.newsContainer.innerHTML = '';

    if (articles.length === 0) {
        elements.newsContainer.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-inbox text-5xl text-white/50 mb-4"></i>
                <p class="text-white/80 text-lg">No recent news found for this city.</p>
            </div>
        `;
        return;
    }

    const duplicatedArticles = [...articles, ...articles];

    duplicatedArticles.forEach(article => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';

        const title = article.title || 'No title available';
        const description = article.description || 'No description available';
        const url = article.url || '#';
        const source = article.source?.name || 'Unknown source';
        const imageUrl = article.image || '';

        newsCard.innerHTML = `
            ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="news-image" onerror="this.style.display='none'">` : ''}
            <div class="news-content">
                <h3>${title}</h3>
                <p>${description}</p>
                <div class="flex items-center justify-between">
                    <span class="text-white/70 text-xs">${source}</span>
                    <a href="${url}" target="_blank" rel="noopener noreferrer">
                        Read more <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        `;

        elements.newsContainer.appendChild(newsCard);
    });
}

function displayForecast(forecastData) {
    elements.forecastContent.innerHTML = '';
    currentForecastData = forecastData;

    const dailyForecasts = {};

    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        if (!dailyForecasts[dateKey]) {
            dailyForecasts[dateKey] = {
                temps: [],
                conditions: item.weather[0].main,
                descriptions: item.weather[0].description,
                humidity: item.main.humidity,
                hourlyData: []
            };
        }

        dailyForecasts[dateKey].temps.push(item.main.temp);
        dailyForecasts[dateKey].hourlyData.push(item);
    });

    const days = Object.keys(dailyForecasts).slice(0, 10);

    days.forEach(day => {
        const forecast = dailyForecasts[day];
        const avgTemp = Math.round(forecast.temps.reduce((a, b) => a + b, 0) / forecast.temps.length);
        const maxTemp = Math.round(Math.max(...forecast.temps));
        const minTemp = Math.round(Math.min(...forecast.temps));
        const icon = weatherIconMap[forecast.conditions] || '🌡️';

        const forecastCard = document.createElement('div');
        forecastCard.className = 'bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/15 transition-all duration-300 flex-shrink-0 cursor-pointer';
        forecastCard.style.minWidth = '160px';

        forecastCard.innerHTML = `
            <p class="text-white/80 font-semibold mb-3">${day}</p>
            <div class="text-4xl mb-3">${icon}</div>
            <p class="text-2xl font-bold text-white mb-1">${avgTemp}°F</p>
            <p class="text-sm text-white/70 mb-2">${maxTemp}° / ${minTemp}°</p>
            <p class="text-xs text-white/60 capitalize">${forecast.descriptions}</p>
        `;

        forecastCard.addEventListener('click', () => showHourlyForecast(day, forecast.hourlyData));

        elements.forecastContent.appendChild(forecastCard);
    });
}

function showHourlyForecast(date, hourlyData) {
    elements.modalDate.textContent = date;
    elements.modalCity.textContent = currentCityName;
    elements.hourlyContent.innerHTML = '';

    hourlyData.forEach(hour => {
        const time = new Date(hour.dt * 1000);
        const timeString = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const temp = Math.round(hour.main.temp);
        const icon = weatherIconMap[hour.weather[0].main] || '🌡️';
        const description = hour.weather[0].description;
        const humidity = hour.main.humidity;
        const windSpeed = Math.round(hour.wind.speed);
        const feelsLike = Math.round(hour.main.feels_like);

        const hourCard = document.createElement('div');
        hourCard.className = 'bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/15 transition-all duration-300';

        hourCard.innerHTML = `
            <div class="text-center mb-3">
                <p class="text-white font-semibold text-lg mb-2">${timeString}</p>
                <div class="text-5xl mb-2">${icon}</div>
                <p class="text-3xl font-bold text-white mb-1">${temp}°F</p>
                <p class="text-sm text-white/70 capitalize mb-3">${description}</p>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between text-white/80">
                    <span><i class="fas fa-temperature-low mr-2"></i>Feels Like</span>
                    <span class="font-semibold">${feelsLike}°F</span>
                </div>
                <div class="flex justify-between text-white/80">
                    <span><i class="fas fa-tint mr-2"></i>Humidity</span>
                    <span class="font-semibold">${humidity}%</span>
                </div>
                <div class="flex justify-between text-white/80">
                    <span><i class="fas fa-wind mr-2"></i>Wind</span>
                    <span class="font-semibold">${windSpeed} mph</span>
                </div>
            </div>
        `;

        elements.hourlyContent.appendChild(hourCard);
    });

    elements.hourlyModal.classList.remove('hidden');
    elements.hourlyModal.classList.add('flex');
}

function closeHourlyModal() {
    elements.hourlyModal.classList.add('hidden');
    elements.hourlyModal.classList.remove('flex');
}

async function handleSearch(event) {
    event.preventDefault();

    const city = elements.cityInput.value.trim();

    if (!city) {
        showError('Please enter a city name.');
        return;
    }

    showLoading();

    try {
        const weatherData = await fetchWeather(city);
        const forecastData = await fetchForecast(city);
        const newsArticles = await fetchNews(city);

        displayWeather(weatherData);
        displayForecast(forecastData);
        displayNews(newsArticles);
        showResults();

    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
}

function toggleForecast() {
    const isCollapsed = elements.forecastContainer.style.maxHeight === '0px' || elements.forecastContainer.style.maxHeight === '';

    if (isCollapsed) {
        elements.forecastContainer.style.maxHeight = elements.forecastContainer.scrollHeight + 'px';
        elements.forecastChevron.style.transform = 'rotate(180deg)';
    } else {
        elements.forecastContainer.style.maxHeight = '0px';
        elements.forecastChevron.style.transform = 'rotate(0deg)';
    }
}

elements.searchForm.addEventListener('submit', handleSearch);
elements.forecastToggle.addEventListener('click', toggleForecast);
elements.closeModal.addEventListener('click', closeHourlyModal);

elements.hourlyModal.addEventListener('click', (e) => {
    if (e.target === elements.hourlyModal) {
        closeHourlyModal();
    }
});

updateBackground('Clear');
