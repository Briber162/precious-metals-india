const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const path = require('path');
const MCXApi = require('./mcx-api');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development, enable with proper config in production
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Metro cities in India
const METRO_CITIES = [
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra' },
  { id: 'delhi', name: 'Delhi', state: 'Delhi' },
  { id: 'bangalore', name: 'Bangalore', state: 'Karnataka' },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal' },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu' },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana' },
  { id: 'pune', name: 'Pune', state: 'Maharashtra' },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat' },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan' },
  { id: 'surat', name: 'Surat', state: 'Gujarat' },
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh' },
  { id: 'kanpur', name: 'Kanpur', state: 'Uttar Pradesh' },
  { id: 'nagpur', name: 'Nagpur', state: 'Maharashtra' },
  { id: 'indore', name: 'Indore', state: 'Madhya Pradesh' },
  { id: 'thane', name: 'Thane', state: 'Maharashtra' },
  { id: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh' },
  { id: 'visakhapatnam', name: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { id: 'pimpri', name: 'Pimpri-Chinchwad', state: 'Maharashtra' },
  { id: 'patna', name: 'Patna', state: 'Bihar' },
  { id: 'vadodara', name: 'Vadodara', state: 'Gujarat' }
];

// Base prices (in INR per 10 grams for gold, per kg for silver)
const BASE_PRICES = {
  gold: {
    '24k': 105500,
    '22k': 96700,
    '18k': 79100
  },
  silver: {
    '999': 124000,
    '925': 114600
  }
};

// Store current prices for all cities
let currentPrices = {};

// Initialize MCX API
const mcxApi = new MCXApi();
let useMCXData = true; // Toggle between MCX and simulated data

// Initialize prices for all cities
function initializePrices() {
  METRO_CITIES.forEach(city => {
    currentPrices[city.id] = {
      cityInfo: city,
      gold: {
        '24k': generateCityPrice(BASE_PRICES.gold['24k'], city.id),
        '22k': generateCityPrice(BASE_PRICES.gold['22k'], city.id),
        '18k': generateCityPrice(BASE_PRICES.gold['18k'], city.id)
      },
      silver: {
        '999': generateCityPrice(BASE_PRICES.silver['999'], city.id),
        '925': generateCityPrice(BASE_PRICES.silver['925'], city.id)
      },
      lastUpdated: new Date().toISOString(),
      trend: {
        gold: getRandomTrend(),
        silver: getRandomTrend()
      }
    };
  });
}

// Generate city-specific price variations
function generateCityPrice(basePrice, cityId) {
  // Different cities have different price variations due to local taxes, transportation, etc.
  const cityVariations = {
    'mumbai': 1.02,
    'delhi': 1.01,
    'bangalore': 1.015,
    'kolkata': 1.025,
    'chennai': 1.01,
    'hyderabad': 1.005,
    'pune': 1.018,
    'ahmedabad': 0.995,
    'jaipur': 0.98,
    'surat': 0.99
  };
  
  const variation = cityVariations[cityId] || 1.0;
  const randomVariation = 0.995 + (Math.random() * 0.01); // ±0.5% random variation
  
  return Math.round(basePrice * variation * randomVariation);
}

// Generate random price movement
function getRandomTrend() {
  const trends = ['up', 'down', 'stable'];
  return trends[Math.floor(Math.random() * trends.length)];
}

// Update prices using MCX data or simulation
async function updatePrices() {
  try {
    if (useMCXData) {
      await updatePricesFromMCX();
    } else {
      updatePricesSimulated();
    }
  } catch (error) {
    console.error('Error updating prices:', error);
    // Fallback to simulated data
    updatePricesSimulated();
  }
}

// Update prices from MCX API
async function updatePricesFromMCX() {
  try {
    console.log('Fetching MCX data...');
    const mcxData = await mcxApi.fetchLiveData();
    
    if (mcxData && (mcxData.gold || mcxData.silver)) {
      console.log('MCX Data received:', {
        gold: mcxData.gold?.ltp,
        silver: mcxData.silver?.ltp
      });
      
      // Convert MCX data to city prices
      currentPrices = mcxApi.convertToLocationPrices(mcxData, METRO_CITIES);
      
      // Broadcast updates to all connected clients
      io.emit('priceUpdate', currentPrices);
      console.log('✅ MCX prices updated successfully');
      
    } else {
      throw new Error('No valid MCX data received');
    }
    
  } catch (error) {
    console.error('MCX API Error:', error.message);
    console.log('🔄 Falling back to simulated data...');
    useMCXData = false; // Temporarily disable MCX
    updatePricesSimulated();
    
    // Re-enable MCX after 5 minutes
    setTimeout(() => {
      useMCXData = true;
      console.log('🔄 Re-enabling MCX data...');
    }, 5 * 60 * 1000);
  }
}

// Update prices with realistic fluctuations (fallback)
function updatePricesSimulated() {
  METRO_CITIES.forEach(city => {
    const cityPrices = currentPrices[city.id];
    
    // Gold price updates
    Object.keys(cityPrices.gold).forEach(karat => {
      const currentPrice = cityPrices.gold[karat];
      const changePercent = (Math.random() - 0.5) * 0.004; // ±0.2% max change
      const newPrice = Math.round(currentPrice * (1 + changePercent));
      cityPrices.gold[karat] = newPrice;
    });
    
    // Silver price updates
    Object.keys(cityPrices.silver).forEach(purity => {
      const currentPrice = cityPrices.silver[purity];
      const changePercent = (Math.random() - 0.5) * 0.006; // ±0.3% max change
      const newPrice = Math.round(currentPrice * (1 + changePercent));
      cityPrices.silver[purity] = newPrice;
    });
    
    // Update trends
    cityPrices.trend.gold = getRandomTrend();
    cityPrices.trend.silver = getRandomTrend();
    cityPrices.lastUpdated = new Date().toISOString();
  });
  
  // Broadcast updates to all connected clients
  io.emit('priceUpdate', currentPrices);
}

// Initialize prices on server start
async function initializeApp() {
  try {
    console.log('🔄 Initializing with MCX data...');
    const mcxData = await mcxApi.fetchLiveData();
    
    if (mcxData && (mcxData.gold || mcxData.silver)) {
      currentPrices = mcxApi.convertToLocationPrices(mcxData, METRO_CITIES);
      console.log('✅ Initialized with MCX data');
      console.log('📊 Gold LTP:', mcxData.gold?.ltp, '| Silver LTP:', mcxData.silver?.ltp);
    } else {
      throw new Error('No MCX data available');
    }
  } catch (error) {
    console.log('⚠️ MCX initialization failed:', error.message);
    console.log('🔄 Falling back to simulated data...');
    useMCXData = false;
    initializePrices();
  }
}

initializeApp();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/cities', (req, res) => {
  res.json(METRO_CITIES);
});

app.get('/api/prices', (req, res) => {
  res.json(currentPrices);
});

app.get('/api/prices/:cityId', (req, res) => {
  const cityId = req.params.cityId;
  if (currentPrices[cityId]) {
    res.json(currentPrices[cityId]);
  } else {
    res.status(404).json({ error: 'City not found' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    dataSource: useMCXData ? 'MCX (Multi Commodity Exchange)' : 'Simulated Data',
    mcxEnabled: useMCXData,
    lastUpdate: new Date().toISOString(),
    citiesCount: METRO_CITIES.length,
    apiStatus: 'operational'
  });
});

app.get('/api/mcx-raw', async (req, res) => {
  try {
    const mcxData = await mcxApi.fetchLiveData();
    res.json({
      source: 'MCX India',
      timestamp: new Date().toISOString(),
      data: mcxData
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch MCX data',
      message: error.message
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial data to newly connected client
  socket.emit('initialData', {
    cities: METRO_CITIES,
    prices: currentPrices
  });
  
  // Handle city subscription
  socket.on('subscribe', (cityIds) => {
    console.log('Client subscribed to cities:', cityIds);
    socket.join(cityIds);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Schedule price updates every 10 seconds
cron.schedule('*/10 * * * * *', () => {
  updatePrices();
  console.log('Prices updated at:', new Date().toISOString());
});

// Schedule major price updates every 5 minutes (simulating market movements)
cron.schedule('*/5 * * * *', () => {
  // Simulate bigger market movements
  const marketChange = (Math.random() - 0.5) * 0.02; // ±1% market change
  
  Object.keys(BASE_PRICES.gold).forEach(karat => {
    BASE_PRICES.gold[karat] = Math.round(BASE_PRICES.gold[karat] * (1 + marketChange));
  });
  
  Object.keys(BASE_PRICES.silver).forEach(purity => {
    BASE_PRICES.silver[purity] = Math.round(BASE_PRICES.silver[purity] * (1 + marketChange));
  });
  
  // Reinitialize prices with new base prices
  initializePrices();
  console.log('Major market update at:', new Date().toISOString());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Precious Metals India server running on port ${PORT}`);
  console.log(`📊 Tracking prices for ${METRO_CITIES.length} metro cities`);
  console.log(`🔄 Real-time updates every 10 seconds`);
  console.log(`📈 Market updates every 5 minutes`);
});

module.exports = { app, server, io }; 