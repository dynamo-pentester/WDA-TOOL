// Utility functions
const sel = id => document.getElementById(id);
const api = async (url, params = {}) => {
  const qs = new URLSearchParams(params);
  const r = await fetch(url + '?' + qs);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

// Global state
let isAnalyzing = false;
let chartsVisible = false;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    // Show loading for 2 seconds
    setTimeout(() => {
        hideLoadingScreen();
        startRealTimeClock();
        setupEventListeners();
        loadEmployees();
        animateElementsIn();
    }, 2000);
}

function hideLoadingScreen() {
    const loadingOverlay = sel('loadingOverlay');
    const dashboardContainer = sel('dashboardContainer');
    
    loadingOverlay.style.opacity = '0';
    loadingOverlay.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        dashboardContainer.classList.add('visible');
    }, 500);
}

function startRealTimeClock() {
    const clockElement = sel('realTimeClock');
    
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        clockElement.textContent = timeString;
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

function animateElementsIn() {
    // Animate metrics section when it becomes visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    
    const metricsSection = sel('metricsSection');
    if (metricsSection) {
        observer.observe(metricsSection);
    }
}

function setupEventListeners() {
    // Employee dropdown
    sel('emp').addEventListener('change', async e => {
        const value = e.target.value;
        animateSelectChange(e.target);
        
        if (!value) {
            resetDropdown('case');
            return;
        }
        
        try {
            showSelectLoading('case');
            const data = await api('/api/cases', { employee: value });
            fillDropdown('case', data.cases);
            updateControlStatus(`Loaded ${data.cases.length} cases for ${value}`);
        } catch (error) {
            console.log('API call failed, using demo data for cases');
            // Use demo data when API fails
            const demoCases = ['CASE001', 'CASE002', 'CASE003', 'CASE004'];
            fillDropdown('case', demoCases);
            updateControlStatus(`Loaded ${demoCases.length} cases for ${value} (Demo Mode)`);
        }
    });

    // Case dropdown
    sel('case').addEventListener('change', async e => {
        const emp = sel('emp').value;
        const caseValue = e.target.value;
        animateSelectChange(e.target);
        
        if (!caseValue) {
            resetDropdown('date');
            return;
        }
        
        try {
            showSelectLoading('date');
            const data = await api('/api/dates', { employee: emp, case: caseValue });
            fillDropdown('date', data.dates);
            updateControlStatus(`Loaded ${data.dates.length} dates for case ${caseValue}`);
        } catch (error) {
            console.log('API call failed, using demo data for dates');
            // Use demo data when API fails
            const demoDates = ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18'];
            fillDropdown('date', demoDates);
            updateControlStatus(`Loaded ${demoDates.length} dates for case ${caseValue} (Demo Mode)`);
        }
    });

    // Date dropdown
    sel('date').addEventListener('change', async e => {
        const emp = sel('emp').value;
        const caseValue = sel('case').value;
        const dateValue = e.target.value;
        animateSelectChange(e.target);
        
        if (!dateValue) {
            resetDropdown('folder');
            return;
        }
        
        try {
            showSelectLoading('folder');
            const data = await api('/api/folders', { employee: emp, case: caseValue, date: dateValue });
            const mapped = data.folders.map((f, i) => ({ val: f, label: `tech_support_${i}` }));
            fillMappedDropdown('folder', mapped);
            updateControlStatus(`Loaded ${data.folders.length} folders for ${dateValue}`);
        } catch (error) {
            console.log('API call failed, using demo data for folders');
            // Use demo data when API fails
            const demoFolders = [
                { val: 'folder_001', label: 'tech_support_0' },
                { val: 'folder_002', label: 'tech_support_1' },
                { val: 'folder_003', label: 'tech_support_2' }
            ];
            fillMappedDropdown('folder', demoFolders);
            updateControlStatus(`Loaded ${demoFolders.length} folders for ${dateValue} (Demo Mode)`);
        }
    });

    // Folder dropdown
    sel('folder').addEventListener('change', async e => {
        const emp = sel('emp').value;
        const caseValue = sel('case').value;
        const dateValue = sel('date').value;
        const folderValue = e.target.value;
        animateSelectChange(e.target);
        
        if (!folderValue) {
            resetDropdown('csv');
            return;
        }
        
        try {
            showSelectLoading('csv');
            const data = await api('/api/csv', {
                employee: emp,
                case: caseValue,
                date: dateValue,
                folder: folderValue
            });
            const sortedCsv = data.csv_files.map(o => o.file).sort();
            fillDropdown('csv', sortedCsv);
            updateControlStatus(`Loaded ${sortedCsv.length} CSV files`);
        } catch (error) {
            console.log('API call failed, using demo data for CSV files');
            // Use demo data when API fails
            const demoCsvFiles = ['system_metrics.csv', 'performance_data.csv', 'hardware_stats.csv'];
            fillDropdown('csv', demoCsvFiles);
            updateControlStatus(`Loaded ${demoCsvFiles.length} CSV files (Demo Mode)`);
        }
    });

    // CSV dropdown
    sel('csv').addEventListener('change', e => {
        const analyzeBtn = sel('analyseBtn');
        const hasValue = !!e.target.value;
        
        analyzeBtn.disabled = !hasValue;
        animateSelectChange(e.target);
        
        if (hasValue) {
            analyzeBtn.style.transform = 'scale(1.05)';
            setTimeout(() => {
                analyzeBtn.style.transform = '';
            }, 200);
            updateControlStatus('Ready to analyze - click the Analyze button');
        } else {
            updateControlStatus('Select all parameters to enable analysis');
        }
    });

    // Analyze button
    sel('analyseBtn').addEventListener('click', handleAnalyze);
    
    // Refresh button
    sel('refreshCharts').addEventListener('click', refreshCharts);
}

function animateSelectChange(selectElement) {
    selectElement.style.transform = 'scale(0.98)';
    selectElement.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
    
    setTimeout(() => {
        selectElement.style.transform = '';
        selectElement.style.boxShadow = '';
    }, 200);
}

function showSelectLoading(selectId) {
    const selectElement = sel(selectId);
    const wrapper = selectElement.parentElement;
    
    selectElement.disabled = true;
    selectElement.style.opacity = '0.6';
    wrapper.classList.add('loading');
    
    // Add loading animation to select wrapper
    wrapper.style.position = 'relative';
    if (!wrapper.querySelector('.select-spinner')) {
        const spinner = document.createElement('div');
        spinner.className = 'select-spinner';
        spinner.style.cssText = `
            position: absolute;
            right: 30px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top: 2px solid var(--hmon-neon-cyan);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            z-index: 10;
        `;
        wrapper.appendChild(spinner);
    }
}

function hideSelectLoading(selectId) {
    const selectElement = sel(selectId);
    const wrapper = selectElement.parentElement;
    const spinner = wrapper.querySelector('.select-spinner');
    
    selectElement.disabled = false;
    selectElement.style.opacity = '';
    wrapper.classList.remove('loading');
    
    if (spinner) {
        spinner.remove();
    }
}

function fillDropdown(selectId, items) {
    const selectElement = sel(selectId);
    const defaultOption = selectElement.querySelector('option');
    const defaultText = defaultOption ? defaultOption.textContent : `Select ${selectId}...`;
    
    selectElement.innerHTML = `<option value="">${defaultText}</option>` +
        items.sort().map(item => `<option value="${item}">${item}</option>`).join('');
    
    hideSelectLoading(selectId);
    triggerChange(selectElement);
    
    // Animate dropdown update
    selectElement.style.borderColor = 'var(--hmon-neon-green)';
    setTimeout(() => {
        selectElement.style.borderColor = '';
    }, 1000);
}

function fillMappedDropdown(selectId, mappedItems) {
    const selectElement = sel(selectId);
    const defaultOption = selectElement.querySelector('option');
    const defaultText = defaultOption ? defaultOption.textContent : `Select ${selectId}...`;
    
    selectElement.innerHTML = `<option value="">${defaultText}</option>` +
        mappedItems.map(item => `<option value="${item.val}">${item.label}</option>`).join('');
    
    hideSelectLoading(selectId);
    triggerChange(selectElement);
    
    // Animate dropdown update
    selectElement.style.borderColor = 'var(--hmon-neon-green)';
    setTimeout(() => {
        selectElement.style.borderColor = '';
    }, 1000);
}

function resetDropdown(selectId) {
    const selectElement = sel(selectId);
    const defaultOption = selectElement.querySelector('option');
    const defaultText = defaultOption ? defaultOption.textContent : `Select ${selectId}...`;
    
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    selectElement.disabled = true;
    hideSelectLoading(selectId);
    triggerChange(selectElement);
}

function triggerChange(element) {
    element.dispatchEvent(new Event('change'));
}

function updateControlStatus(message) {
    const statusElement = sel('controlStatus');
    statusElement.textContent = message;
    statusElement.style.color = 'var(--hmon-neon-cyan)';
    statusElement.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
        statusElement.style.color = '';
        statusElement.style.transform = '';
    }, 2000);
}

function showError(message) {
    const statusElement = sel('controlStatus');
    statusElement.textContent = message;
    statusElement.style.color = 'var(--hmon-neon-red)';
    statusElement.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
        statusElement.style.color = '';
        statusElement.style.transform = '';
        statusElement.textContent = 'Select parameters to analyze';
    }, 3000);
}

async function loadEmployees() {
    try {
        showSelectLoading('emp');
        const data = await api('/api/employees');
        fillDropdown('emp', data.employees);
        updateControlStatus(`Loaded ${data.employees.length} employees`);
    } catch (error) {
        console.log('API call failed, using demo data for employees');
        hideSelectLoading('emp');
        // Use demo data when API fails
        const demoEmployees = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Chen', 'David Wilson'];
        fillDropdown('emp', demoEmployees);
        updateControlStatus(`Loaded ${demoEmployees.length} employees (Demo Mode)`);
    }
}

async function handleAnalyze() {
    if (isAnalyzing) return;
    
    const analyzeBtn = sel('analyseBtn');
    const params = {
        employee: sel('emp').value,
        case: sel('case').value,
        date: sel('date').value,
        folder: sel('folder').value,
        csv_file: sel('csv').value
    };
    
    // Start loading state
    isAnalyzing = true;
    analyzeBtn.classList.add('loading');
    analyzeBtn.disabled = true;
    updateControlStatus('Analyzing data...');
    
    // Hide chart placeholders and prepare for new data
    hideChartPlaceholders();
    
    try {
        const response = await fetch('/api/analyse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params)
        });
        
        if (!response.ok) {
            throw new Error(await response.text());
        }
        
        const data = await response.json();
        
        // Update charts with animation
        await updateChartsWithAnimation(data);
        
        // Update metrics with animation
        updateMetricsWithAnimation(data.metrics);
        
        updateControlStatus('Analysis completed successfully!');
        
    } catch (error) {
        console.log('API call failed, using demo data for analysis');
        // Show demo charts and metrics when API fails
        showDemoAnalysisResults();
        updateControlStatus('Analysis completed (Demo Mode)!');
    } finally {
        // End loading state
        isAnalyzing = false;
        analyzeBtn.classList.remove('loading');
        analyzeBtn.disabled = false;
    }
}

function showDemoAnalysisResults() {
    // Create demo metrics HTML
    const demoMetrics = `
        <div class="metric-card cpu-metric">
            <div class="metric-icon">🖥️</div>
            <div class="metric-content">
                <div class="metric-label">CPU Usage</div>
                <div class="metric-value">72%</div>
                <div class="status-indicator status-warning"></div>
            </div>
        </div>
        <div class="metric-card memory-metric">
            <div class="metric-icon">💾</div>
            <div class="metric-content">
                <div class="metric-label">Memory Usage</div>
                <div class="metric-value">68%</div>
                <div class="status-indicator status-normal"></div>
            </div>
        </div>
        <div class="metric-card temp-metric">
            <div class="metric-icon">🌡️</div>
            <div class="metric-content">
                <div class="metric-label">Temperature</div>
                <div class="metric-value">71°C</div>
                <div class="status-indicator status-warning"></div>
            </div>
        </div>
        <div class="metric-card fan-metric">
            <div class="metric-icon">🌀</div>
            <div class="metric-content">
                <div class="metric-label">Active Fans</div>
                <div class="metric-value">3</div>
                <div class="status-indicator status-normal"></div>
            </div>
        </div>
    `;
    
    // Update metrics
    updateMetricsWithAnimation(demoMetrics);
    
    // Show demo charts message
    setTimeout(() => {
        const chartElements = ['overview', 'fans', 'memory'];
        chartElements.forEach((chartId, index) => {
            const chartElement = sel(chartId);
            const statusElement = chartElement.closest('.chart-container').querySelector('.chart-status');
            
            setTimeout(() => {
                chartElement.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: rgba(255,255,255,0.7); text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 16px;">📊</div>
                        <div style="font-size: 18px; margin-bottom: 8px;">Demo Chart Data</div>
                        <div style="font-size: 14px;">Connect to real API for live charts</div>
                    </div>
                `;
                chartElement.classList.add('visible');
                statusElement.textContent = 'Demo Mode';
                statusElement.style.color = 'var(--hmon-neon-orange)';
            }, index * 500);
        });
    }, 1000);
}

function hideChartPlaceholders() {
    const placeholders = document.querySelectorAll('.chart-placeholder');
    placeholders.forEach(placeholder => {
        placeholder.style.opacity = '0';
        setTimeout(() => {
            placeholder.style.display = 'none';
        }, 300);
    });
}

function showChartPlaceholders() {
    const placeholders = document.querySelectorAll('.chart-placeholder');
    placeholders.forEach(placeholder => {
        placeholder.style.display = 'flex';
        setTimeout(() => {
            placeholder.style.opacity = '1';
        }, 50);
    });
    
    // Hide charts
    const charts = document.querySelectorAll('.plotly-chart');
    charts.forEach(chart => {
        chart.classList.remove('visible');
    });
}

async function updateChartsWithAnimation(data) {
    const chartIds = ['overview', 'fans', 'memory'];
    const chartNames = ['overview', 'fans', 'memory'];
    
    for (let i = 0; i < chartIds.length; i++) {
        const chartId = chartIds[i];
        const chartName = chartNames[i];
        const chartElement = sel(chartId);
        
        if (data.charts && data.charts[chartName]) {
            try {
                const chartData = JSON.parse(data.charts[chartName]);
                
                // Update chart status
                const statusElement = chartElement.closest('.chart-container').querySelector('.chart-status');
                statusElement.textContent = 'Loading...';
                statusElement.style.color = 'var(--hmon-neon-orange)';
                
                // Render chart
                await Plotly.react(chartId, chartData.data, chartData.layout);
                
                // Show chart with animation
                setTimeout(() => {
                    chartElement.classList.add('visible');
                    statusElement.textContent = 'Active';
                    statusElement.style.color = 'var(--hmon-neon-green)';
                }, i * 500);
                
            } catch (error) {
                console.error(`Failed to render ${chartName} chart:`, error);
                const statusElement = chartElement.closest('.chart-container').querySelector('.chart-status');
                statusElement.textContent = 'Error';
                statusElement.style.color = 'var(--hmon-neon-red)';
            }
        }
    }
    
    chartsVisible = true;
}

function updateMetricsWithAnimation(metricsHtml) {
    const metricsContainer = sel('metrics');
    const metricsSection = sel('metricsSection');
    const timestampElement = sel('metricsTimestamp');
    
    if (metricsHtml) {
        // Update timestamp
        const now = new Date();
        timestampElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        
        // Fade out current metrics
        metricsContainer.style.opacity = '0';
        metricsContainer.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            // Update content
            metricsContainer.innerHTML = metricsHtml;
            
            // Apply enhanced styling to metrics
            enhanceMetricsDisplay();
            
            // Show metrics section
            metricsSection.classList.add('visible');
            
            // Fade in new metrics
            metricsContainer.style.opacity = '1';
            metricsContainer.style.transform = 'translateY(0)';
            
            // Animate individual metric cards
            const metricCards = metricsContainer.querySelectorAll('.metric-card, [class*="metric"]');
            metricCards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px) scale(0.9)';
                
                setTimeout(() => {
                    card.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0) scale(1)';
                }, index * 100);
            });
            
        }, 300);
    }
}

function enhanceMetricsDisplay() {
    const metricsContainer = sel('metrics');
    
    // Add enhanced styling to metric cards
    const metricElements = metricsContainer.querySelectorAll('[class*="metric"], .card, div');
    metricElements.forEach(element => {
        // Add glassmorphism effect
        if (element.textContent.trim() && element.children.length > 0) {
            element.style.cssText += `
                background: rgba(255, 255, 255, 0.05) !important;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                margin: 8px;
                transition: all 0.3s ease;
                cursor: pointer;
            `;
            
            // Add hover effects
            element.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px) scale(1.02)';
                this.style.background = 'rgba(255, 255, 255, 0.08)';
                this.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
            });
            
            element.addEventListener('mouseleave', function() {
                this.style.transform = '';
                this.style.background = 'rgba(255, 255, 255, 0.05)';
                this.style.boxShadow = '';
            });
        }
    });
    
    // Style metric values with neon colors
    const values = metricsContainer.querySelectorAll('[class*="value"], [class*="metric-value"]');
    values.forEach(value => {
        const text = value.textContent.toLowerCase();
        if (text.includes('cpu') || text.includes('processor')) {
            value.style.color = 'var(--hmon-neon-red)';
            value.style.textShadow = '0 0 10px var(--hmon-neon-red)';
        } else if (text.includes('memory') || text.includes('ram')) {
            value.style.color = 'var(--hmon-neon-cyan)';
            value.style.textShadow = '0 0 10px var(--hmon-neon-cyan)';
        } else if (text.includes('temp') || text.includes('temperature')) {
            value.style.color = 'var(--hmon-neon-purple)';
            value.style.textShadow = '0 0 10px var(--hmon-neon-purple)';
        } else if (text.includes('fan') || text.includes('cooling')) {
            value.style.color = 'var(--hmon-neon-green)';
            value.style.textShadow = '0 0 10px var(--hmon-neon-green)';
        } else {
            value.style.color = 'var(--hmon-neon-blue)';
            value.style.textShadow = '0 0 10px var(--hmon-neon-blue)';
        }
    });
    
    // Style status indicators
    const statusElements = metricsContainer.querySelectorAll('[class*="status"], [class*="indicator"]');
    statusElements.forEach(status => {
        const classes = status.className.toLowerCase();
        if (classes.includes('normal') || classes.includes('good') || classes.includes('ok')) {
            status.style.background = 'var(--hmon-neon-green)';
            status.style.boxShadow = '0 0 10px var(--hmon-neon-green)';
        } else if (classes.includes('warning') || classes.includes('medium')) {
            status.style.background = 'var(--hmon-neon-orange)';
            status.style.boxShadow = '0 0 10px var(--hmon-neon-orange)';
        } else if (classes.includes('critical') || classes.includes('high') || classes.includes('danger')) {
            status.style.background = 'var(--hmon-neon-red)';
            status.style.boxShadow = '0 0 10px var(--hmon-neon-red)';
        }
        
        // Add pulsing animation
        if (status.style.background) {
            status.style.animation = 'pulse 2s ease-in-out infinite';
        }
    });
}

function refreshCharts() {
    const refreshBtn = sel('refreshCharts');
    const refreshIcon = refreshBtn.querySelector('.refresh-icon');
    
    // Animate refresh button
    refreshIcon.style.transform = 'rotate(360deg)';
    refreshBtn.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        refreshIcon.style.transform = '';
        refreshBtn.style.transform = '';
    }, 500);
    
    // If charts are visible, trigger a re-analysis
    if (chartsVisible && !isAnalyzing) {
        handleAnalyze();
    } else {
        updateControlStatus('No data to refresh - run analysis first');
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'enter':
                if (!sel('analyseBtn').disabled && !isAnalyzing) {
                    e.preventDefault();
                    handleAnalyze();
                }
                break;
            case 'r':
                e.preventDefault();
                refreshCharts();
                break;
        }
    }
    
    // Escape key to reset
    if (e.key === 'Escape') {
        if (isAnalyzing) {
            updateControlStatus('Analysis cannot be cancelled');
        }
    }
});

// Window focus/blur events for performance
let isPageVisible = true;
document.addEventListener('visibilitychange', function() {
    isPageVisible = !document.hidden;
    
    if (isPageVisible && chartsVisible) {
        // Refresh data when page becomes visible again
        setTimeout(() => {
            if (!isAnalyzing) {
                updateControlStatus('Page focused - data refreshed');
            }
        }, 1000);
    }
});

// Add smooth scrolling for better UX
document.addEventListener('click', function(e) {
    // Smooth scroll to charts when analyze button is clicked
    if (e.target.closest('#analyseBtn')) {
        setTimeout(() => {
            const chartsSection = sel('chartsSection');
            if (chartsSection) {
                chartsSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 1000);
    }
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(function() {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                const loadTime = Math.round(perfData.loadEventEnd - perfData.fetchStart);
                console.log('HMON Dashboard load time:', loadTime, 'ms');
                
                // Show performance info in control status after a delay
                setTimeout(() => {
                    if (sel('controlStatus').textContent.includes('Select parameters') || sel('controlStatus').textContent.includes('Demo Mode')) {
                        updateControlStatus(`Dashboard loaded in ${loadTime}ms - Ready for analysis`);
                    }
                }, 5000);
            }
        }, 0);
    });
}

// Add intersection observer for chart animations
const chartObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const chartContainer = entry.target;
            chartContainer.style.animationDelay = '0.2s';
            chartContainer.classList.add('animate-in');
        }
    });
}, { threshold: 0.1 });

// Observe chart containers when they're added
const observeCharts = () => {
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        chartObserver.observe(container);
    });
};

// Initialize chart observation
setTimeout(observeCharts, 100);

// Error handling for failed network requests
window.addEventListener('error', function(e) {
    console.error('HMON Dashboard Error:', e.error);
    showError('An unexpected error occurred');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('HMON Dashboard Promise Rejection:', e.reason);
    showError('Network request failed');
    e.preventDefault();
});

// Add CSS for dynamic animations
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        animation: slideInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    @keyframes slideInScale {
        from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    .loading-pulse {
        animation: loadingPulse 1.5s ease-in-out infinite;
    }
    
    @keyframes loadingPulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }
    
    .metric-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .metric-card:hover {
        transform: translateY(-5px) scale(1.02);
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .metric-icon {
        font-size: 2rem;
        opacity: 0.8;
    }
    
    .metric-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .metric-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 500;
    }
    
    .metric-value {
        font-size: 24px;
        font-weight: 600;
        color: white;
        font-family: var(--font-family-mono);
    }
    
    .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        animation: pulse 2s ease-in-out infinite;
    }
    
    .status-normal {
        background: var(--hmon-neon-green);
        box-shadow: 0 0 10px var(--hmon-neon-green);
    }
    
    .status-warning {
        background: var(--hmon-neon-orange);
        box-shadow: 0 0 10px var(--hmon-neon-orange);
    }
    
    .status-critical {
        background: var(--hmon-neon-red);
        box-shadow: 0 0 10px var(--hmon-neon-red);
    }
`;
document.head.appendChild(style);