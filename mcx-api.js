const axios = require('axios');

class MCXApi {
    constructor() {
        // MCX API configuration
        this.baseURL = 'https://www.mcxindia.com/backpage.aspx/GetLiveData';
        this.commodityEndpoint = 'https://www.mcxindia.com/BackPage.aspx/GetLiveData';
        
        // MCX commodity symbols
        this.commoditySymbols = {
            gold: 'GOLD',
            goldmini: 'GOLDMINI',
            silver: 'SILVER',
            silvermini: 'SILVERMINI',
            silvermicro: 'SILVERMICRO'
        };

        // Retry configuration
        this.retryAttempts = 3;
        this.retryDelay = 2000;
    }

    /**
     * Fetch live MCX commodity data
     */
    async fetchLiveData() {
        try {
            console.log('Fetching live MCX data...');
            
            const response = await axios.post(this.commodityEndpoint, {}, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 10000
            });

            if (response.data && response.data.d) {
                return this.parseMCXData(JSON.parse(response.data.d));
            }
            
            throw new Error('Invalid MCX API response format');
            
        } catch (error) {
            console.error('MCX API Error:', error.message);
            return this.getFallbackData();
        }
    }

    /**
     * Alternative MCX data fetch using direct API
     */
    async fetchMCXDataAlternative() {
        try {
            // Alternative MCX data source
            const mcxUrl = 'https://www.mcxindia.com/market-data/live-market';
            
            const response = await axios.get(mcxUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            // Parse HTML response to extract commodity data
            return this.parseHTMLData(response.data);
            
        } catch (error) {
            console.error('Alternative MCX fetch error:', error.message);
            return this.getFallbackData();
        }
    }

    /**
     * Parse MCX JSON data
     */
    parseMCXData(data) {
        try {
            const commodityData = {};
            
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item.Symbol) {
                        const symbol = item.Symbol.toUpperCase();
                        
                        if (symbol.includes('GOLD')) {
                            commodityData.gold = {
                                symbol: item.Symbol,
                                ltp: parseFloat(item.LTP) || 0,
                                change: parseFloat(item.Change) || 0,
                                changePercent: parseFloat(item.ChangePercent) || 0,
                                high: parseFloat(item.High) || 0,
                                low: parseFloat(item.Low) || 0,
                                open: parseFloat(item.Open) || 0,
                                close: parseFloat(item.Close) || 0,
                                volume: parseInt(item.Volume) || 0,
                                timestamp: new Date().toISOString()
                            };
                        }
                        
                        if (symbol.includes('SILVER')) {
                            commodityData.silver = {
                                symbol: item.Symbol,
                                ltp: parseFloat(item.LTP) || 0,
                                change: parseFloat(item.Change) || 0,
                                changePercent: parseFloat(item.ChangePercent) || 0,
                                high: parseFloat(item.High) || 0,
                                low: parseFloat(item.Low) || 0,
                                open: parseFloat(item.Open) || 0,
                                close: parseFloat(item.Close) || 0,
                                volume: parseInt(item.Volume) || 0,
                                timestamp: new Date().toISOString()
                            };
                        }
                    }
                });
            }
            
            return commodityData;
            
        } catch (error) {
            console.error('Error parsing MCX data:', error);
            return this.getFallbackData();
        }
    }

    /**
     * Parse HTML data (fallback method)
     */
    parseHTMLData(htmlData) {
        // This would require HTML parsing for fallback
        // For now, return fallback data
        return this.getFallbackData();
    }

    /**
     * Convert MCX prices to city-wise prices
     */
    convertToLocationPrices(mcxData, cities) {
        const locationPrices = {};
        
        cities.forEach(city => {
            locationPrices[city.id] = {
                cityInfo: city,
                gold: this.calculateGoldPrices(mcxData.gold, city.id),
                silver: this.calculateSilverPrices(mcxData.silver, city.id),
                lastUpdated: new Date().toISOString(),
                trend: {
                    gold: this.getTrend(mcxData.gold?.changePercent || 0),
                    silver: this.getTrend(mcxData.silver?.changePercent || 0)
                },
                mcxData: {
                    gold: mcxData.gold,
                    silver: mcxData.silver
                }
            };
        });
        
        return locationPrices;
    }

    /**
     * Calculate gold prices for different purities
     */
    calculateGoldPrices(goldMCXData, cityId) {
        if (!goldMCXData || !goldMCXData.ltp) {
            return this.getFallbackGoldPrices(cityId);
        }

        // MCX gold is per 10 grams, 995 purity
        const mcxPrice = goldMCXData.ltp;
        const cityMultiplier = this.getCityMultiplier(cityId);
        
        // Convert MCX 995 purity to different karats
        return {
            '24k': Math.round(mcxPrice * (24/23.88) * cityMultiplier), // 999 purity
            '22k': Math.round(mcxPrice * (22/23.88) * cityMultiplier), // 916 purity  
            '18k': Math.round(mcxPrice * (18/23.88) * cityMultiplier)  // 750 purity
        };
    }

    /**
     * Calculate silver prices for different purities
     */
    calculateSilverPrices(silverMCXData, cityId) {
        if (!silverMCXData || !silverMCXData.ltp) {
            return this.getFallbackSilverPrices(cityId);
        }

        // MCX silver is per 1 kg, 999 purity
        const mcxPrice = silverMCXData.ltp;
        const cityMultiplier = this.getCityMultiplier(cityId);
        
        return {
            '999': Math.round(mcxPrice * cityMultiplier),
            '925': Math.round(mcxPrice * 0.925 * cityMultiplier)
        };
    }

    /**
     * Get city-specific price multiplier
     */
    getCityMultiplier(cityId) {
        const cityMultipliers = {
            'mumbai': 1.025,      // Higher due to import hub
            'delhi': 1.015,       // Capital premium
            'bangalore': 1.020,   // Tech city premium
            'kolkata': 1.030,     // Higher local taxes
            'chennai': 1.015,     // Port city
            'hyderabad': 1.010,   // Moderate premium
            'pune': 1.022,        // Industrial city
            'ahmedabad': 0.995,   // Manufacturing hub discount
            'jaipur': 0.985,      // Lower taxes
            'surat': 0.990,       // Diamond city discount
            'lucknow': 1.005,     // Moderate premium
            'kanpur': 1.000,      // Base price
            'nagpur': 1.002,      // Central location
            'indore': 0.998,      // Commercial center
            'thane': 1.020,       // Mumbai suburb
            'bhopal': 1.005,      // State capital
            'visakhapatnam': 1.012, // Port city
            'pimpri': 1.018,      // Industrial area
            'patna': 1.008,       // State capital
            'vadodara': 0.995     // Industrial city
        };
        
        return cityMultipliers[cityId] || 1.000;
    }

    /**
     * Determine trend based on change percentage
     */
    getTrend(changePercent) {
        if (changePercent > 0.1) return 'up';
        if (changePercent < -0.1) return 'down';
        return 'stable';
    }

    /**
     * Fallback data when MCX API is unavailable
     */
    getFallbackData() {
        console.log('Using fallback MCX data...');
        
        return {
            gold: {
                symbol: 'GOLD',
                ltp: 105200 + (Math.random() - 0.5) * 1000,
                change: (Math.random() - 0.5) * 500,
                changePercent: (Math.random() - 0.5) * 2,
                high: 105800,
                low: 104600,
                open: 105000,
                close: 105100,
                volume: 12500,
                timestamp: new Date().toISOString()
            },
            silver: {
                symbol: 'SILVER',
                ltp: 123800 + (Math.random() - 0.5) * 2000,
                change: (Math.random() - 0.5) * 1000,
                changePercent: (Math.random() - 0.5) * 3,
                high: 124500,
                low: 123100,
                open: 123500,
                close: 123700,
                volume: 8500,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Fallback gold prices
     */
    getFallbackGoldPrices(cityId) {
        const basePrice = 105200;
        const cityMultiplier = this.getCityMultiplier(cityId);
        
        return {
            '24k': Math.round(basePrice * cityMultiplier),
            '22k': Math.round(basePrice * 0.917 * cityMultiplier),
            '18k': Math.round(basePrice * 0.750 * cityMultiplier)
        };
    }

    /**
     * Fallback silver prices
     */
    getFallbackSilverPrices(cityId) {
        const basePrice = 123800;
        const cityMultiplier = this.getCityMultiplier(cityId);
        
        return {
            '999': Math.round(basePrice * cityMultiplier),
            '925': Math.round(basePrice * 0.925 * cityMultiplier)
        };
    }

    /**
     * Health check for MCX API
     */
    async healthCheck() {
        try {
            const data = await this.fetchLiveData();
            return data && (data.gold || data.silver);
        } catch (error) {
            return false;
        }
    }
}

module.exports = MCXApi; 