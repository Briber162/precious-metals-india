class PreciousMetalsApp {
    constructor() {
        this.socket = null;
        this.allPrices = {};
        this.cities = [];
        this.filteredData = {};
        this.previousPrices = {};
        this.retryCount = 0;
        this.maxRetries = 5;
        
        // Chart data storage
        this.chartData = {
            gold: {
                timestamps: [],
                prices: [],
                maxPoints: 60 // Store last 60 data points
            },
            silver: {
                timestamps: [],
                prices: [],
                maxPoints: 60
            }
        };
        
        // Chart instances
        this.charts = {
            gold: null,
            silver: null
        };
        
        this.init();
    }

    init() {
        this.initializeSocket();
        this.setupEventListeners();
        this.initializeCharts();
        this.showLoading();
    }

    initializeSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.retryCount = 0;
                this.showToast('Connected to live data feed', 'success');
                this.updateConnectionStatus(true);
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                this.showToast('Disconnected from server', 'error');
                this.updateConnectionStatus(false);
                this.handleReconnection();
            });

            this.socket.on('initialData', (data) => {
                console.log('Received initial data:', data);
                this.cities = data.cities;
                this.allPrices = data.prices;
                this.previousPrices = JSON.parse(JSON.stringify(data.prices));
                this.populateCityFilter();
                this.renderPriceGrid();
                this.updateMarketOverview();
                this.hideLoading();
            });

            this.socket.on('priceUpdate', (prices) => {
                console.log('Price update received');
                this.handlePriceUpdate(prices);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.showToast('Connection error. Retrying...', 'error');
                this.updateConnectionStatus(false);
            });

        } catch (error) {
            console.error('Socket initialization error:', error);
            this.showToast('Failed to initialize connection', 'error');
        }
    }

    handleReconnection() {
        if (this.retryCount < this.maxRetries) {
            setTimeout(() => {
                console.log(`Reconnection attempt ${this.retryCount + 1}`);
                this.retryCount++;
                this.initializeSocket();
            }, Math.pow(2, this.retryCount) * 1000); // Exponential backoff
        } else {
            this.showToast('Unable to reconnect. Please refresh the page.', 'error');
        }
    }

    handlePriceUpdate(newPrices) {
        // Store previous prices for comparison
        this.previousPrices = JSON.parse(JSON.stringify(this.allPrices));
        this.allPrices = newPrices;
        
        // Update charts with new data
        this.updateChartData();
        
        // Update UI
        this.renderPriceGrid();
        this.updateMarketOverview();
        this.updateLastUpdateTime();
        
        // Show notification for significant changes
        this.checkSignificantChanges();
    }

    checkSignificantChanges() {
        const significantChangeThreshold = 0.005; // 0.5%
        
        Object.keys(this.allPrices).forEach(cityId => {
            const current = this.allPrices[cityId];
            const previous = this.previousPrices[cityId];
            
            if (!previous) return;
            
            // Check gold 24k price change
            const goldChange = Math.abs(current.gold['24k'] - previous.gold['24k']) / previous.gold['24k'];
            if (goldChange > significantChangeThreshold) {
                const direction = current.gold['24k'] > previous.gold['24k'] ? 'increased' : 'decreased';
                this.showToast(`Gold price ${direction} significantly in ${current.cityInfo.name}`, 'info');
            }
            
            // Check silver 999 price change
            const silverChange = Math.abs(current.silver['999'] - previous.silver['999']) / previous.silver['999'];
            if (silverChange > significantChangeThreshold) {
                const direction = current.silver['999'] > previous.silver['999'] ? 'increased' : 'decreased';
                this.showToast(`Silver price ${direction} significantly in ${current.cityInfo.name}`, 'info');
            }
        });
    }

    setupEventListeners() {
        // Filter event listeners
        const cityFilter = document.getElementById('cityFilter');
        const metalFilter = document.getElementById('metalFilter');
        const searchInput = document.getElementById('searchInput');

        if (cityFilter) {
            cityFilter.addEventListener('change', () => this.applyFilters());
        }

        if (metalFilter) {
            metalFilter.addEventListener('change', () => this.applyFilters());
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        searchInput?.focus();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshData();
                        break;
                }
            }
        });
    }

    populateCityFilter() {
        const cityFilter = document.getElementById('cityFilter');
        if (!cityFilter) return;

        // Clear existing options (except "All Cities")
        const defaultOption = cityFilter.querySelector('option[value=""]');
        cityFilter.innerHTML = '';
        cityFilter.appendChild(defaultOption);

        // Add city options
        this.cities
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(city => {
                const option = document.createElement('option');
                option.value = city.id;
                option.textContent = `${city.name}, ${city.state}`;
                cityFilter.appendChild(option);
            });
    }

    applyFilters() {
        const cityFilter = document.getElementById('cityFilter')?.value || '';
        const metalFilter = document.getElementById('metalFilter')?.value || '';
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

        this.filteredData = {};

        Object.keys(this.allPrices).forEach(cityId => {
            const cityData = this.allPrices[cityId];
            
            // City filter
            if (cityFilter && cityId !== cityFilter) {
                return;
            }

            // Search filter
            if (searchTerm) {
                const cityName = cityData.cityInfo.name.toLowerCase();
                const stateName = cityData.cityInfo.state.toLowerCase();
                if (!cityName.includes(searchTerm) && !stateName.includes(searchTerm)) {
                    return;
                }
            }

            this.filteredData[cityId] = cityData;
        });

        this.renderPriceGrid(metalFilter);
    }

    renderPriceGrid(metalFilter = '') {
        const priceGrid = document.getElementById('priceGrid');
        if (!priceGrid) return;

        const dataToRender = Object.keys(this.filteredData).length > 0 ? this.filteredData : this.allPrices;

        priceGrid.innerHTML = '';

        if (Object.keys(dataToRender).length === 0) {
            priceGrid.innerHTML = '<p class="text-center" style="color: white; grid-column: 1 / -1;">No cities found matching your criteria.</p>';
            return;
        }

        Object.values(dataToRender)
            .sort((a, b) => a.cityInfo.name.localeCompare(b.cityInfo.name))
            .forEach(cityData => {
                const cityCard = this.createCityCard(cityData, metalFilter);
                priceGrid.appendChild(cityCard);
            });
    }

    createCityCard(cityData, metalFilter = '') {
        const card = document.createElement('div');
        card.className = 'city-card';
        card.dataset.cityId = cityData.cityInfo.id;

        const previousCityData = this.previousPrices[cityData.cityInfo.id];

        card.innerHTML = `
            <div class="city-header">
                <div class="city-info">
                    <h3>${cityData.cityInfo.name}</h3>
                    <p>${cityData.cityInfo.state}</p>
                </div>
                <div class="update-time">
                    ${this.formatTime(cityData.lastUpdated)}
                </div>
            </div>
            <div class="prices">
                ${this.renderMetalSection('gold', cityData.gold, previousCityData?.gold, metalFilter)}
                ${this.renderMetalSection('silver', cityData.silver, previousCityData?.silver, metalFilter)}
            </div>
        `;

        return card;
    }

    renderMetalSection(metalType, currentPrices, previousPrices = {}, metalFilter = '') {
        if (metalFilter && metalFilter !== metalType) {
            return '';
        }

        const metalName = metalType.charAt(0).toUpperCase() + metalType.slice(1);
        const icon = metalType === 'gold' ? '🥇' : '🥈';

        const pricesHtml = Object.entries(currentPrices).map(([purity, price]) => {
            const previousPrice = previousPrices[purity] || price;
            const change = price - previousPrice;
            const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
            const changeIcon = change > 0 ? '↑' : change < 0 ? '↓' : '→';
            const changeText = change !== 0 ? `${changeIcon} ₹${Math.abs(change)}` : '→ --';

            const unit = metalType === 'gold' ? '/10g' : '/kg';

            return `
                <div class="price-row">
                    <span class="purity">${purity}</span>
                    <span class="price-value">₹${price.toLocaleString('en-IN')}${unit}</span>
                    <span class="price-change ${changeClass}">${changeText}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="metal-section">
                <div class="metal-header ${metalType}">
                    <span>${icon}</span>
                    <span>${metalName}</span>
                </div>
                ${pricesHtml}
            </div>
        `;
    }

    updateMarketOverview() {
        // Calculate average prices
        const allCityData = Object.values(this.allPrices);
        if (allCityData.length === 0) return;

        const avgGoldPrice = Math.round(
            allCityData.reduce((sum, city) => sum + city.gold['24k'], 0) / allCityData.length
        );

        const avgSilverPrice = Math.round(
            allCityData.reduce((sum, city) => sum + city.silver['999'], 0) / allCityData.length
        );

        // Update display
        const avgGoldElement = document.getElementById('avgGoldPrice');
        const avgSilverElement = document.getElementById('avgSilverPrice');
        const goldTrendElement = document.getElementById('goldTrend');
        const silverTrendElement = document.getElementById('silverTrend');

        if (avgGoldElement) {
            avgGoldElement.textContent = `₹${avgGoldPrice.toLocaleString('en-IN')}`;
        }

        if (avgSilverElement) {
            avgSilverElement.textContent = `₹${avgSilverPrice.toLocaleString('en-IN')}`;
        }

        // Calculate overall trends
        const goldTrend = this.calculateOverallTrend('gold');
        const silverTrend = this.calculateOverallTrend('silver');

        this.updateTrendDisplay(goldTrendElement, goldTrend);
        this.updateTrendDisplay(silverTrendElement, silverTrend);
    }

    calculateOverallTrend(metalType) {
        const allCityData = Object.values(this.allPrices);
        let upCount = 0;
        let downCount = 0;

        allCityData.forEach(city => {
            if (city.trend && city.trend[metalType]) {
                if (city.trend[metalType] === 'up') upCount++;
                else if (city.trend[metalType] === 'down') downCount++;
            }
        });

        if (upCount > downCount) return 'up';
        if (downCount > upCount) return 'down';
        return 'stable';
    }

    updateTrendDisplay(element, trend) {
        if (!element) return;

        element.className = `trend ${trend}`;
        
        const icon = element.querySelector('i');
        const span = element.querySelector('span');

        if (icon && span) {
            switch (trend) {
                case 'up':
                    icon.className = 'fas fa-arrow-up';
                    span.textContent = 'Rising';
                    break;
                case 'down':
                    icon.className = 'fas fa-arrow-down';
                    span.textContent = 'Falling';
                    break;
                default:
                    icon.className = 'fas fa-minus';
                    span.textContent = 'Stable';
            }
        }
    }

    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = this.formatTime(new Date().toISOString());
        }
    }

    updateConnectionStatus(isConnected) {
        const statusDot = document.querySelector('.status-dot');
        const liveText = document.querySelector('.live-indicator span:last-child');
        
        if (statusDot) {
            statusDot.style.background = isConnected ? '#27ae60' : '#e74c3c';
        }
        
        if (liveText) {
            liveText.textContent = isConnected ? 'Live Updates' : 'Disconnected';
        }
    }

    formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);

        // Manual close on click
        toast.addEventListener('click', () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        });
    }

    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'info': return 'info-circle';
            default: return 'bell';
        }
    }

    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    refreshData() {
        this.showToast('Refreshing data...', 'info');
        if (this.socket && this.socket.connected) {
            this.socket.emit('requestUpdate');
        } else {
            this.initializeSocket();
        }
    }

    // Public method to get current data for external use
    getCurrentData() {
        return {
            prices: this.allPrices,
            cities: this.cities,
            filteredData: this.filteredData
        };
    }

    // Method to export data (for future enhancements)
    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            prices: this.allPrices,
            cities: this.cities
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `precious-metals-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showToast('Data exported successfully', 'success');
    }

    // Chart Methods
    initializeCharts() {
        this.initializeGoldChart();
        this.initializeSilverChart();
        this.setupChartEventListeners();
    }

    initializeGoldChart() {
        const ctx = document.getElementById('goldChart');
        if (!ctx) return;

        this.charts.gold = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Gold Price (₹/10g)',
                    data: [],
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#FFD700',
                    pointBorderColor: '#FFA500',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#FFD700',
                        bodyColor: '#fff',
                        borderColor: '#FFD700',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `₹${context.parsed.y.toLocaleString('en-IN')}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#666',
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#666',
                            callback: function(value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    initializeSilverChart() {
        const ctx = document.getElementById('silverChart');
        if (!ctx) return;

        this.charts.silver = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Silver Price (₹/kg)',
                    data: [],
                    borderColor: '#C0C0C0',
                    backgroundColor: 'rgba(192, 192, 192, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#C0C0C0',
                    pointBorderColor: '#A9A9A9',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#C0C0C0',
                        bodyColor: '#fff',
                        borderColor: '#C0C0C0',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `₹${context.parsed.y.toLocaleString('en-IN')}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#666',
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#666',
                            callback: function(value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    updateChartData() {
        if (!this.allPrices || Object.keys(this.allPrices).length === 0) return;

        const now = new Date();
        const timeLabel = now.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });

        // Calculate average prices
        const allCityData = Object.values(this.allPrices);
        const avgGoldPrice = Math.round(
            allCityData.reduce((sum, city) => sum + city.gold['24k'], 0) / allCityData.length
        );
        const avgSilverPrice = Math.round(
            allCityData.reduce((sum, city) => sum + city.silver['999'], 0) / allCityData.length
        );

        // Update gold chart data
        this.chartData.gold.timestamps.push(timeLabel);
        this.chartData.gold.prices.push(avgGoldPrice);

        // Update silver chart data
        this.chartData.silver.timestamps.push(timeLabel);
        this.chartData.silver.prices.push(avgSilverPrice);

        // Limit data points to prevent memory issues
        if (this.chartData.gold.timestamps.length > this.chartData.gold.maxPoints) {
            this.chartData.gold.timestamps.shift();
            this.chartData.gold.prices.shift();
        }
        if (this.chartData.silver.timestamps.length > this.chartData.silver.maxPoints) {
            this.chartData.silver.timestamps.shift();
            this.chartData.silver.prices.shift();
        }

        // Update charts
        this.updateChart('gold');
        this.updateChart('silver');
    }

    updateChart(metalType) {
        const chart = this.charts[metalType];
        const data = this.chartData[metalType];
        
        if (!chart || !data) return;

        chart.data.labels = [...data.timestamps];
        chart.data.datasets[0].data = [...data.prices];
        chart.update('none'); // Use 'none' animation for real-time updates
    }

    setupChartEventListeners() {
        // Time frame button event listeners
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timeframe = e.target.dataset.timeframe;
                const chartCard = e.target.closest('.chart-card');
                
                // Update active button
                chartCard.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update chart based on timeframe
                this.updateChartTimeframe(chartCard, timeframe);
            });
        });
    }

    updateChartTimeframe(chartCard, timeframe) {
        const chartCanvas = chartCard.querySelector('canvas');
        const metalType = chartCanvas.id.includes('gold') ? 'gold' : 'silver';
        const chart = this.charts[metalType];
        
        if (!chart) return;

        // Calculate how many data points to show based on timeframe
        let maxPoints;
        switch (timeframe) {
            case '1h':
                maxPoints = 60; // 1 hour of 1-minute intervals
                break;
            case '6h':
                maxPoints = 36; // 6 hours of 10-minute intervals
                break;
            case '24h':
                maxPoints = 24; // 24 hours of 1-hour intervals
                break;
            default:
                maxPoints = 60;
        }

        // Update chart data based on timeframe
        const data = this.chartData[metalType];
        const startIndex = Math.max(0, data.timestamps.length - maxPoints);
        
        chart.data.labels = data.timestamps.slice(startIndex);
        chart.data.datasets[0].data = data.prices.slice(startIndex);
        chart.update();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.preciousMetalsApp = new PreciousMetalsApp();
    
    // Add global keyboard shortcuts info
    console.log('Keyboard shortcuts:');
    console.log('Ctrl/Cmd + F: Focus search');
    console.log('Ctrl/Cmd + R: Refresh data');
    
    // Make some methods globally available for debugging
    window.refreshData = () => window.preciousMetalsApp.refreshData();
    window.exportData = () => window.preciousMetalsApp.exportData();
    window.getCurrentData = () => window.preciousMetalsApp.getCurrentData();
}); 