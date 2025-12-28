// Professional Log Management System - JavaScript
class LogManagementSystem {
    constructor() {
        this.currentLogs = [];
        this.filteredLogs = [];
        this.currentPage = 1;
        this.itemsPerPage = 25;
        this.totalPages = 0;
        this.comparisonMode = false;
        this.currentTheme = 'dark';
        this.sidebarOpen = false;
        
        // Sample data from the provided JSON
        this.sampleLogs = [
            {
                file: "swlog_chassis1.log",
                timestamp: "2024-01-15 10:30:45",
                switch: "SW-001",
                module: "BGP",
                message: "BGP neighbor 192.168.1.1 established",
                _page: 1,
                _line: 1
            },
            {
                file: "swlog_chassis1.log", 
                timestamp: "2024-01-15 10:31:02",
                switch: "SW-001",
                module: "OSPF",
                message: "OSPF area 0 network convergence completed",
                _page: 1,
                _line: 2
            },
            {
                file: "swlog_chassis2.log",
                timestamp: "2024-01-15 10:31:15",
                switch: "SW-002", 
                module: "LACP",
                message: "LACP port-channel 1 bundle active",
                _page: 1,
                _line: 3
            },
            {
                file: "swlog_chassis1.log",
                timestamp: "2024-01-15 10:32:10",
                switch: "SW-001",
                module: "ISIS",
                message: "ISIS level-2 adjacency formed with SW-003",
                _page: 1,
                _line: 4
            },
            {
                file: "swlog_chassis3.log",
                timestamp: "2024-01-15 10:32:25",
                switch: "SW-003",
                module: "VRRP",
                message: "VRRP group 1 transitioned to MASTER state",
                _page: 1,
                _line: 5
            },
            {
                file: "swlog_chassis2.log",
                timestamp: "2024-01-15 10:33:00",
                switch: "SW-002",
                module: "STP",
                message: "STP topology change detected on port 1/1/1",
                _page: 1,
                _line: 6
            },
            {
                file: "swlog_chassis1.log",
                timestamp: "2024-01-15 10:33:15",
                switch: "SW-001",
                module: "BGP",
                message: "BGP route update received from peer 192.168.1.2",
                _page: 1,
                _line: 7
            },
            {
                file: "swlog_chassis3.log",
                timestamp: "2024-01-15 10:33:30",
                switch: "SW-003",
                module: "OSPF",
                message: "OSPF LSA update processed for area 0",
                _page: 1,
                _line: 8
            }
        ];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeTheme();
        this.loadSampleData();
    }
    
    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Cleanup button
        document.getElementById('cleanupBtn').addEventListener('click', () => {
            this.handleCleanup();
        });
        
        // Switch user button
        document.getElementById('switchUserBtn').addEventListener('click', () => {
            this.handleSwitchUser();
        });
        
        // Upload button
        document.getElementById('uploadBtn').addEventListener('click', () => {
            this.handleUpload();
        });
        
        // Load log button
        document.getElementById('loadLogBtn').addEventListener('click', () => {
            this.loadPrimaryLog();
        });
        
        // Comparison toggle
        document.getElementById('toggleComparisonBtn').addEventListener('click', () => {
            this.toggleComparisonMode();
        });
        
        // Filter controls
        document.getElementById('moduleSelect').addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('keywordInput').addEventListener('input', () => {
            this.applyFilters();
        });
        
        document.getElementById('addFilterBtn').addEventListener('click', () => {
            this.addFilter();
        });
        
        document.getElementById('resetFiltersBtn').addEventListener('click', () => {
            this.resetFilters();
        });
        
        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportLogs();
        });
        
        // Chassis selection
        document.getElementById('chassisSelect').addEventListener('change', () => {
            this.handleChassisChange();
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                const sidebarToggle = document.getElementById('sidebarToggle');
                
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target) && this.sidebarOpen) {
                    this.toggleSidebar();
                }
            }
        });
        
        // Handle responsive sidebar
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.sidebarOpen) {
                // Keep sidebar open on desktop
            } else if (window.innerWidth <= 768) {
                // Auto-close sidebar on mobile
                document.getElementById('sidebar').classList.remove('open');
                this.sidebarOpen = false;
            }
        });
    }
    
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon();
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeIcon();
    }
    
    updateThemeIcon() {
        const themeBtn = document.getElementById('themeToggle');
        const icon = themeBtn.querySelector('svg');
        
        if (this.currentTheme === 'dark') {
            icon.innerHTML = `
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            `;
        } else {
            icon.innerHTML = `
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            `;
        }
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        this.sidebarOpen = !this.sidebarOpen;
        
        if (this.sidebarOpen) {
            sidebar.classList.add('open');
        } else {
            sidebar.classList.remove('open');
        }
    }
    
    loadSampleData() {
        this.currentLogs = [...this.sampleLogs];
        this.filteredLogs = [...this.sampleLogs];
        this.updateTable();
        this.updateStats();
        this.updatePagination();
    }
    
    updateTable() {
        const tbody = document.getElementById('logTableBody');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredLogs.slice(startIndex, endIndex);
        
        tbody.innerHTML = '';
        
        pageData.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.timestamp}</td>
                <td>${log.switch}</td>
                <td><span class="module-tag">${log.module}</span></td>
                <td class="message-cell">${this.highlightKeywords(log.message)}</td>
                <td>Page ${log._page}, Line ${log._line}</td>
            `;
            tbody.appendChild(row);
        });
        
        if (pageData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-text-secondary);">
                    No logs found matching your criteria
                </td>
            `;
            tbody.appendChild(row);
        }
    }
    
    highlightKeywords(message) {
        const keyword = document.getElementById('keywordInput').value.trim();
        if (!keyword) return message;
        
        const regex = new RegExp(`(${keyword})`, 'gi');
        return message.replace(regex, '<mark>$1</mark>');
    }
    
    updateStats() {
        document.getElementById('totalLogs').textContent = this.currentLogs.length;
        document.getElementById('filteredLogs').textContent = this.filteredLogs.length;
        document.getElementById('currentPageStat').textContent = `${this.currentPage} of ${this.totalPages}`;
    }
    
    updatePagination() {
        this.totalPages = Math.ceil(this.filteredLogs.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '‹';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateTable();
                this.updateStats();
                this.updatePagination();
            }
        });
        pagination.appendChild(prevBtn);
        
        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.toggle('active', i === this.currentPage);
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.updateTable();
                this.updateStats();
                this.updatePagination();
            });
            pagination.appendChild(pageBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '›';
        nextBtn.disabled = this.currentPage === this.totalPages;
        nextBtn.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.updateTable();
                this.updateStats();
                this.updatePagination();
            }
        });
        pagination.appendChild(nextBtn);
    }
    
    applyFilters() {
        const moduleFilter = document.getElementById('moduleSelect').value;
        const keywordFilter = document.getElementById('keywordInput').value.toLowerCase();
        
        this.filteredLogs = this.currentLogs.filter(log => {
            const moduleMatch = !moduleFilter || log.module === moduleFilter;
            const keywordMatch = !keywordFilter || log.message.toLowerCase().includes(keywordFilter);
            return moduleMatch && keywordMatch;
        });
        
        this.currentPage = 1;
        this.updateTable();
        this.updateStats();
        this.updatePagination();
    }
    
    resetFilters() {
        document.getElementById('moduleSelect').value = '';
        document.getElementById('keywordInput').value = '';
        this.filteredLogs = [...this.currentLogs];
        this.currentPage = 1;
        this.updateTable();
        this.updateStats();
        this.updatePagination();
    }
    
    addFilter() {
        // Implementation for adding additional filters
        console.log('Add filter functionality');
    }
    
    handleCleanup() {
        if (confirm('Are you sure you want to cleanup all logs? This action cannot be undone.')) {
            this.showLoading();
            setTimeout(() => {
                this.currentLogs = [];
                this.filteredLogs = [];
                this.updateTable();
                this.updateStats();
                this.updatePagination();
                this.hideLoading();
                this.showNotification('Logs cleaned up successfully', 'success');
            }, 1000);
        }
    }
    
    handleSwitchUser() {
        if (confirm('Are you sure you want to switch user? Any unsaved changes will be lost.')) {
            // Redirect to login page
            window.location.href = 'login.html';
        }
    }
    
    handleUpload() {
        const fileInput = document.getElementById('fileUpload');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Please select a file to upload', 'error');
            return;
        }
        
        if (!file.name.endsWith('.tar')) {
            this.showNotification('Only .tar files are allowed', 'error');
            return;
        }
        
        this.showLoading();
        
        // Simulate upload process
        setTimeout(() => {
            this.hideLoading();
            this.showNotification('File uploaded successfully', 'success');
            fileInput.value = '';
        }, 2000);
    }
    
    loadPrimaryLog() {
        const chassis = document.getElementById('chassisSelect').value;
        const logFile = document.getElementById('logFileSelect').value;
        
        if (!chassis || !logFile) {
            this.showNotification('Please select both chassis and log file', 'error');
            return;
        }
        
        this.showLoading();
        
        // Simulate loading process
        setTimeout(() => {
            this.hideLoading();
            this.showNotification('Log loaded successfully', 'success');
            this.loadSampleData();
        }, 1500);
    }
    
    handleChassisChange() {
        const chassisSelect = document.getElementById('chassisSelect');
        const logFileSelect = document.getElementById('logFileSelect');
        
        // Clear previous log file options
        logFileSelect.innerHTML = '<option value="">Select Log File</option>';
        
        if (chassisSelect.value) {
            // Add sample log files for the selected chassis
            const sampleFiles = [
                'swlog_chassis.log',
                'tech_support_layer2.log',
                'tech_support_layer3.log',
                'swlog_failure_reboot_log'
            ];
            
            sampleFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                logFileSelect.appendChild(option);
            });
        }
    }
    
    toggleComparisonMode() {
        this.comparisonMode = !this.comparisonMode;
        const btn = document.getElementById('toggleComparisonBtn');
        
        if (this.comparisonMode) {
            btn.textContent = 'Exit Comparison';
            btn.classList.add('btn--secondary');
            btn.classList.remove('btn--primary');
            this.showNotification('Comparison mode enabled', 'info');
        } else {
            btn.textContent = 'Start Comparison';
            btn.classList.add('btn--primary');
            btn.classList.remove('btn--secondary');
            this.showNotification('Comparison mode disabled', 'info');
        }
    }
    
    exportLogs() {
        const data = this.filteredLogs.map(log => ({
            timestamp: log.timestamp,
            switch: log.switch,
            module: log.module,
            message: log.message,
            location: `Page ${log._page}, Line ${log._line}`
        }));
        
        const csv = this.convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showNotification('Logs exported successfully', 'success');
    }
    
    convertToCSV(data) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(','));
        return [headers, ...rows].join('\n');
    }
    
    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            max-width: 300px;
        `;
        
        // Set background color based on type
        const colors = {
            success: 'rgba(34, 197, 94, 0.9)',
            error: 'rgba(239, 68, 68, 0.9)',
            warning: 'rgba(245, 158, 11, 0.9)',
            info: 'rgba(59, 130, 246, 0.9)'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LogManagementSystem();
});
