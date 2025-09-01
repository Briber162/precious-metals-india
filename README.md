# Precious Metals India 🏆

A real-time precious metals price tracking website for Indian metro cities using WebSocket technology. Track gold and silver prices across all major Indian cities with live updates every 10 seconds.

## 🌟 Features

### Real-time Data
- **Live Price Updates**: Real-time gold and silver prices updated every 10 seconds
- **WebSocket Technology**: Efficient real-time communication for instant updates
- **20 Metro Cities**: Comprehensive coverage of all major Indian cities
- **Multiple Purities**: Track different gold karats (24K, 22K, 18K) and silver purities (999, 925)

### Advanced Filtering
- **City Filter**: Filter prices by specific cities
- **Metal Filter**: View only gold or silver prices
- **Search Functionality**: Quick search through cities and states
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

### User Experience
- **Beautiful UI**: Modern, glass-morphism design with smooth animations
- **Market Overview**: Average prices and trends at a glance
- **Price Change Indicators**: Visual indicators for price movements
- **Toast Notifications**: Real-time alerts for significant price changes
- **Keyboard Shortcuts**: Power user features for quick navigation

### Technical Features
- **Progressive Web App Ready**: Can be installed as a mobile app
- **Offline Capability**: Graceful handling of connection issues
- **Auto Reconnection**: Automatic reconnection with exponential backoff
- **Data Export**: Export price data for analysis
- **SEO Optimized**: Proper meta tags and semantic HTML

## 🏗️ Technology Stack

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **Socket.IO**: Real-time WebSocket communication
- **node-cron**: Scheduled price updates
- **Security**: Helmet.js for security headers, CORS enabled

### Frontend
- **Vanilla JavaScript**: Modern ES6+ features
- **Socket.IO Client**: Real-time communication
- **CSS3**: Advanced styling with animations and glassmorphism
- **Responsive Design**: Mobile-first approach

### Deployment Ready
- **Docker Support**: Containerized deployment
- **Environment Variables**: Configurable settings
- **PM2 Ready**: Production process management
- **CDN Ready**: Static assets optimized for CDN delivery

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Installation

1. **Clone or download the project**
```bash
cd precious-metals-india
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to `http://localhost:3000`

### Production Deployment

1. **Install dependencies**
```bash
npm install --production
```

2. **Start the production server**
```bash
npm start
```

## 🌐 Deployment Options

### 1. Heroku Deployment

1. **Create a Heroku app**
```bash
heroku create your-app-name
```

2. **Deploy**
```bash
git push heroku main
```

3. **Set environment variables**
```bash
heroku config:set NODE_ENV=production
```

### 2. Railway Deployment

1. **Connect your GitHub repository to Railway**
2. **Railway will automatically detect the Node.js app**
3. **Deploy with one click**

### 3. Vercel Deployment

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel
```

### 4. DigitalOcean App Platform

1. **Create new app from GitHub**
2. **Select Node.js environment**
3. **Set build and run commands**

### 5. Docker Deployment

1. **Build the image**
```bash
docker build -t precious-metals-india .
```

2. **Run the container**
```bash
docker run -p 3000:3000 precious-metals-india
```

### 6. VPS/Cloud Server

1. **Clone the repository**
```bash
git clone <your-repo>
cd precious-metals-india
```

2. **Install dependencies**
```bash
npm install --production
```

3. **Install PM2**
```bash
npm install -g pm2
```

4. **Start with PM2**
```bash
pm2 start server.js --name "precious-metals"
pm2 startup
pm2 save
```

5. **Setup Nginx (optional)**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Data Source Configuration (for future enhancements)
MCX_API_KEY=your_mcx_api_key
GOLD_API_KEY=your_gold_api_key

# Update Intervals (in seconds)
PRICE_UPDATE_INTERVAL=10
MARKET_UPDATE_INTERVAL=300

# Features
ENABLE_EXPORT=true
ENABLE_NOTIFICATIONS=true
```

### Customization

#### Adding New Cities
Edit the `METRO_CITIES` array in `server.js`:

```javascript
const METRO_CITIES = [
    { id: 'yourcity', name: 'Your City', state: 'Your State' },
    // ... existing cities
];
```

#### Changing Update Intervals
Modify the cron schedules in `server.js`:

```javascript
// For 5-second updates instead of 10
cron.schedule('*/5 * * * * *', () => {
    updatePrices();
});
```

#### Custom Styling
Modify `public/css/styles.css` to customize colors, fonts, and layout.

## 📊 API Endpoints

### REST API

- `GET /` - Main application page
- `GET /api/cities` - List of all supported cities
- `GET /api/prices` - Current prices for all cities
- `GET /api/prices/:cityId` - Prices for a specific city

### WebSocket Events

#### Client → Server
- `subscribe` - Subscribe to specific city updates
- `requestUpdate` - Request immediate data refresh

#### Server → Client
- `initialData` - Initial data when client connects
- `priceUpdate` - Real-time price updates
- `connect` - Connection established
- `disconnect` - Connection lost

## 🔮 Future Enhancements

### Planned Features
- **Historical Data**: Price charts and trends
- **Price Alerts**: Email/SMS notifications for price targets
- **API Integration**: Real MCX and bullion association data
- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Technical indicators and predictions
- **User Accounts**: Personalized watchlists and alerts

### Integration Options
- **MCX API**: Connect to Multi Commodity Exchange real-time data
- **Bullion Association APIs**: Local market data integration
- **Payment Gateway**: For premium features
- **Push Notifications**: Browser and mobile notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**Important**: The prices displayed on this website are simulated for demonstration purposes. For actual trading or investment decisions, please verify prices with authorized dealers and official sources.

This application is designed to showcase real-time data visualization and WebSocket technology. In a production environment, you should integrate with official precious metals APIs and data sources.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) section
2. Create a new issue with detailed information
3. Contact the development team

## 🎯 Keywords

precious metals, gold price, silver price, India, real-time, WebSocket, MCX, commodity prices, bullion, metro cities, live updates, responsive design, Node.js, Express.js, Socket.IO

---

**Made with ❤️ for the Indian precious metals community** 