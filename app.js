// Paste Log Lab - Client-side log analyzer
// Author: Evan Parrott

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const WARN_FILE_SIZE = 5 * 1024 * 1024; // 5MB

class LogAnalyzer {
    constructor() {
        this.logLines = [];
        this.parsedLines = [];
        this.filteredLines = [];
        this.activeLevelFilters = new Set();
        this.activeLoggerFilters = new Set();
        this.searchText = '';
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const loadSampleBtn = document.getElementById('load-sample-btn');
        const pasteBtn = document.getElementById('paste-btn');
        const analyzePasteBtn = document.getElementById('analyze-paste-btn');
        const searchInput = document.getElementById('search-input');
        const copyFilteredBtn = document.getElementById('copy-filtered-btn');
        const copySummaryBtn = document.getElementById('copy-summary-btn');
        const clearBtn = document.getElementById('clear-btn');

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // File input
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Load sample log
        loadSampleBtn.addEventListener('click', () => {
            this.loadSampleLog();
        });

        // Paste functionality
        pasteBtn.addEventListener('click', () => {
            const pasteContainer = document.getElementById('paste-area-container');
            pasteContainer.style.display = pasteContainer.style.display === 'none' ? 'block' : 'none';
        });

        analyzePasteBtn.addEventListener('click', () => {
            const textarea = document.getElementById('paste-textarea');
            const content = textarea.value;
            if (content.trim()) {
                this.analyzeLog(content, 'Pasted content');
            } else {
                this.showStatus('Please paste some log content first', 'error');
            }
        });

        // Search filter
        searchInput.addEventListener('input', (e) => {
            this.searchText = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Copy buttons
        copyFilteredBtn.addEventListener('click', () => {
            this.copyFilteredLines();
        });

        copySummaryBtn.addEventListener('click', () => {
            this.copySummaryAsMarkdown();
        });

        // Clear button
        clearBtn.addEventListener('click', () => {
            this.clearResults();
        });
    }

    handleFile(file) {
        // Check file type
        const validTypes = ['text/plain', 'application/x-log'];
        const isValidExtension = file.name.endsWith('.log') || file.name.endsWith('.txt');
        
        if (!validTypes.includes(file.type) && !isValidExtension) {
            this.showStatus('Please select a .log or .txt file', 'error');
            return;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            this.showStatus(`File is too large (${this.formatBytes(file.size)}). Maximum size is ${this.formatBytes(MAX_FILE_SIZE)}`, 'error');
            return;
        }

        if (file.size > WARN_FILE_SIZE) {
            this.showStatus(`Large file detected (${this.formatBytes(file.size)}). Processing may take a moment...`, 'warning');
        }

        // Read file
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            
            // Check if content appears to be binary
            if (this.isBinaryContent(content)) {
                this.showStatus('File appears to be binary. Please select a text log file.', 'error');
                return;
            }

            this.analyzeLog(content, file.name);
        };
        
        reader.onerror = () => {
            this.showStatus('Error reading file', 'error');
        };

        reader.readAsText(file);
    }

    isBinaryContent(content) {
        // Check for null bytes or excessive non-printable characters
        const sample = content.substring(0, 1000);
        const nullBytes = (sample.match(/\0/g) || []).length;
        const nonPrintable = (sample.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g) || []).length;
        
        return nullBytes > 0 || nonPrintable > sample.length * 0.3;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    async loadSampleLog() {
        try {
            const response = await fetch('sample.log');
            if (!response.ok) {
                throw new Error('Failed to load sample log');
            }
            const content = await response.text();
            this.analyzeLog(content, 'sample.log');
        } catch (error) {
            this.showStatus('Error loading sample log: ' + error.message, 'error');
        }
    }

    analyzeLog(content, filename) {
        if (!content || content.trim().length === 0) {
            this.showStatus('File is empty', 'error');
            return;
        }

        this.logLines = content.split('\n').filter(line => line.trim().length > 0);
        this.parsedLines = this.logLines.map((line, index) => this.parseLine(line, index));
        
        this.activeLevelFilters.clear();
        this.activeLoggerFilters.clear();
        this.searchText = '';
        document.getElementById('search-input').value = '';
        
        this.showStatus(`Successfully loaded ${filename} (${this.logLines.length} lines)`, 'success');
        this.renderResults();
    }

    parseLine(line, index) {
        const parsed = {
            index,
            original: line,
            timestamp: null,
            level: null,
            logger: null,
            message: line,
            errorCode: null
        };

        // Parse timestamp (ISO-like format: YYYY-MM-DD HH:MM:SS.mmm)
        const timestampRegex = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)/;
        const timestampMatch = line.match(timestampRegex);
        if (timestampMatch) {
            parsed.timestamp = timestampMatch[1];
        }

        // Parse log level (DEBUG, INFO, WARN, ERROR, FATAL, etc.)
        const levelRegex = /\b(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)\b/i;
        const levelMatch = line.match(levelRegex);
        if (levelMatch) {
            parsed.level = levelMatch[1].toUpperCase();
            // Normalize WARNING to WARN, CRITICAL to FATAL
            if (parsed.level === 'WARNING') parsed.level = 'WARN';
            if (parsed.level === 'CRITICAL') parsed.level = 'FATAL';
            if (parsed.level === 'TRACE') parsed.level = 'DEBUG';
        }

        // Parse logger/class name (in square brackets)
        const loggerRegex = /\[([^\]]+)\]/;
        const loggerMatch = line.match(loggerRegex);
        if (loggerMatch) {
            parsed.logger = loggerMatch[1];
        }

        // Parse error codes (ERR-XXXX or ERROR-XXXX patterns)
        const errorCodeRegex = /\b(ERR-\d+|ERROR-\d+|E\d{4})\b/;
        const errorCodeMatch = line.match(errorCodeRegex);
        if (errorCodeMatch) {
            parsed.errorCode = errorCodeMatch[1];
        }

        return parsed;
    }

    renderResults() {
        // Show results section
        document.getElementById('results-section').style.display = 'block';
        
        // Render summary
        this.renderSummary();
        
        // Render filters
        this.renderFilters();
        
        // Apply initial filters (show all)
        this.applyFilters();
    }

    renderSummary() {
        const totalLines = this.parsedLines.length;
        const levelCounts = {};
        const loggerCounts = {};
        const errorCodes = {};
        const timestamps = [];

        this.parsedLines.forEach(line => {
            if (line.level) {
                levelCounts[line.level] = (levelCounts[line.level] || 0) + 1;
            }
            if (line.logger) {
                loggerCounts[line.logger] = (loggerCounts[line.logger] || 0) + 1;
            }
            if (line.errorCode) {
                errorCodes[line.errorCode] = (errorCodes[line.errorCode] || 0) + 1;
            }
            if (line.timestamp) {
                timestamps.push(line.timestamp);
            }
        });

        // Stats cards
        const statsHtml = `
            <div class="stat-card">
                <div class="stat-label">Total Lines</div>
                <div class="stat-value">${totalLines}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Unique Loggers</div>
                <div class="stat-value">${Object.keys(loggerCounts).length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Error Codes</div>
                <div class="stat-value">${Object.keys(errorCodes).length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Time Span</div>
                <div class="stat-value">${timestamps.length > 0 ? this.getTimeSpan(timestamps) : 'N/A'}</div>
            </div>
        `;
        document.getElementById('summary-stats').innerHTML = statsHtml;

        // Level histogram
        this.renderLevelHistogram(levelCounts, totalLines);

        // Error codes
        if (Object.keys(errorCodes).length > 0) {
            this.renderErrorCodes(errorCodes);
        }

        // Time histogram
        if (timestamps.length > 1) {
            this.renderTimeHistogram(timestamps);
        }
    }

    renderLevelHistogram(levelCounts, total) {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
        const histogram = document.getElementById('level-histogram');
        
        let html = '';
        levels.forEach(level => {
            const count = levelCounts[level] || 0;
            const percentage = total > 0 ? (count / total * 100) : 0;
            
            if (count > 0) {
                html += `
                    <div class="histogram-item">
                        <div class="histogram-label">${level}</div>
                        <div class="histogram-bar-container">
                            <div class="histogram-bar level-${level}" style="width: ${percentage}%">
                                ${count}
                            </div>
                        </div>
                        <div class="histogram-count">${count}</div>
                    </div>
                `;
            }
        });

        histogram.innerHTML = html || '<p>No log levels detected</p>';
    }

    renderErrorCodes(errorCodes) {
        const container = document.getElementById('error-codes-container');
        const list = document.getElementById('error-codes-list');
        
        const sorted = Object.entries(errorCodes).sort((a, b) => b[1] - a[1]);
        
        let html = '';
        sorted.forEach(([code, count]) => {
            html += `
                <div class="error-code-item">
                    <div class="error-code-name">${code}</div>
                    <div class="error-code-count">${count} occurrence${count > 1 ? 's' : ''}</div>
                </div>
            `;
        });

        list.innerHTML = html;
        container.style.display = 'block';
    }

    renderTimeHistogram(timestamps) {
        const container = document.getElementById('time-histogram-container');
        const histogram = document.getElementById('time-histogram');
        
        // Group timestamps into buckets
        const buckets = this.groupTimestamps(timestamps);
        
        if (buckets.length < 2) {
            container.style.display = 'none';
            return;
        }

        const maxCount = Math.max(...buckets.map(b => b.count));
        
        let html = '';
        buckets.forEach(bucket => {
            const height = (bucket.count / maxCount * 100);
            html += `
                <div class="time-bar" style="height: ${height}%">
                    <div class="time-bar-tooltip">${bucket.label}<br>${bucket.count} lines</div>
                </div>
            `;
        });

        histogram.innerHTML = html;
        container.style.display = 'block';
    }

    groupTimestamps(timestamps) {
        if (timestamps.length === 0) return [];
        
        // Parse timestamps and sort
        const parsed = timestamps.map(t => new Date(t)).filter(d => !isNaN(d)).sort((a, b) => a - b);
        
        if (parsed.length === 0) return [];
        
        const first = parsed[0];
        const last = parsed[parsed.length - 1];
        const spanMs = last - first;
        
        // Decide bucket size based on span
        let bucketCount = 10;
        let bucketMs = spanMs / bucketCount;
        
        const buckets = [];
        for (let i = 0; i < bucketCount; i++) {
            const bucketStart = new Date(first.getTime() + i * bucketMs);
            const bucketEnd = new Date(first.getTime() + (i + 1) * bucketMs);
            
            const count = parsed.filter(d => d >= bucketStart && d < bucketEnd).length;
            
            buckets.push({
                label: this.formatTime(bucketStart),
                count: count
            });
        }
        
        return buckets;
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    getTimeSpan(timestamps) {
        if (timestamps.length < 2) return 'N/A';
        
        const parsed = timestamps.map(t => new Date(t)).filter(d => !isNaN(d));
        if (parsed.length < 2) return 'N/A';
        
        const sorted = parsed.sort((a, b) => a - b);
        const spanMs = sorted[sorted.length - 1] - sorted[0];
        
        const seconds = Math.floor(spanMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    renderFilters() {
        // Level filters
        const levels = [...new Set(this.parsedLines.map(l => l.level).filter(Boolean))];
        const levelFiltersContainer = document.getElementById('level-filters');
        
        let levelHtml = '';
        ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].forEach(level => {
            if (levels.includes(level)) {
                levelHtml += `<div class="chip chip-${level} active" data-level="${level}">${level}</div>`;
                this.activeLevelFilters.add(level);
            }
        });
        
        levelFiltersContainer.innerHTML = levelHtml || '<span>No log levels detected</span>';
        
        // Add click handlers
        levelFiltersContainer.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const level = chip.dataset.level;
                chip.classList.toggle('active');
                
                if (chip.classList.contains('active')) {
                    this.activeLevelFilters.add(level);
                } else {
                    this.activeLevelFilters.delete(level);
                }
                
                this.applyFilters();
            });
        });

        // Logger filters (optional, only if many loggers)
        const loggers = [...new Set(this.parsedLines.map(l => l.logger).filter(Boolean))];
        if (loggers.length > 1 && loggers.length <= 10) {
            this.renderLoggerFilters(loggers);
        }
    }

    renderLoggerFilters(loggers) {
        const row = document.getElementById('logger-filter-row');
        const container = document.getElementById('logger-filters');
        
        let html = '';
        loggers.forEach(logger => {
            html += `<div class="chip chip-logger active" data-logger="${logger}">${logger}</div>`;
            this.activeLoggerFilters.add(logger);
        });
        
        container.innerHTML = html;
        row.style.display = 'block';
        
        container.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const logger = chip.dataset.logger;
                chip.classList.toggle('active');
                
                if (chip.classList.contains('active')) {
                    this.activeLoggerFilters.add(logger);
                } else {
                    this.activeLoggerFilters.delete(logger);
                }
                
                this.applyFilters();
            });
        });
    }

    applyFilters() {
        this.filteredLines = this.parsedLines.filter(line => {
            // Level filter
            if (line.level && this.activeLevelFilters.size > 0 && !this.activeLevelFilters.has(line.level)) {
                return false;
            }

            // Logger filter
            if (line.logger && this.activeLoggerFilters.size > 0 && !this.activeLoggerFilters.has(line.logger)) {
                return false;
            }

            // Search filter
            if (this.searchText && !line.original.toLowerCase().includes(this.searchText)) {
                return false;
            }

            return true;
        });

        this.renderLogLines();
    }

    renderLogLines() {
        const container = document.getElementById('log-lines');
        const countSpan = document.getElementById('line-count');
        
        countSpan.textContent = `(${this.filteredLines.length} of ${this.parsedLines.length})`;
        
        if (this.filteredLines.length === 0) {
            container.innerHTML = '<div class="log-line">No lines match the current filters</div>';
            return;
        }

        let html = '';
        this.filteredLines.forEach(line => {
            let formattedLine = this.escapeHtml(line.original);
            
            // Highlight timestamp
            if (line.timestamp) {
                formattedLine = formattedLine.replace(
                    line.timestamp,
                    `<span class="timestamp">${line.timestamp}</span>`
                );
            }
            
            // Highlight level
            if (line.level) {
                const levelRegex = new RegExp(`\\b${line.level}\\b`, 'g');
                formattedLine = formattedLine.replace(
                    levelRegex,
                    `<span class="level level-${line.level}">${line.level}</span>`
                );
            }
            
            // Highlight logger
            if (line.logger) {
                formattedLine = formattedLine.replace(
                    `[${line.logger}]`,
                    `<span class="logger">[${line.logger}]</span>`
                );
            }
            
            // Highlight error code
            if (line.errorCode) {
                formattedLine = formattedLine.replace(
                    line.errorCode,
                    `<span class="error-code">${line.errorCode}</span>`
                );
            }
            
            html += `<div class="log-line">${formattedLine}</div>`;
        });

        container.innerHTML = html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async copyFilteredLines() {
        const text = this.filteredLines.map(line => line.original).join('\n');
        
        try {
            await navigator.clipboard.writeText(text);
            this.showStatus(`Copied ${this.filteredLines.length} lines to clipboard`, 'success');
        } catch (error) {
            this.showStatus('Failed to copy to clipboard', 'error');
        }
    }

    async copySummaryAsMarkdown() {
        const levelCounts = {};
        const errorCodes = {};
        
        this.parsedLines.forEach(line => {
            if (line.level) {
                levelCounts[line.level] = (levelCounts[line.level] || 0) + 1;
            }
            if (line.errorCode) {
                errorCodes[line.errorCode] = (errorCodes[line.errorCode] || 0) + 1;
            }
        });

        let markdown = '# Log Analysis Summary\n\n';
        markdown += `**Total Lines:** ${this.parsedLines.length}\n\n`;
        
        markdown += '## Log Levels\n\n';
        Object.entries(levelCounts).sort((a, b) => b[1] - a[1]).forEach(([level, count]) => {
            markdown += `- **${level}:** ${count}\n`;
        });
        
        if (Object.keys(errorCodes).length > 0) {
            markdown += '\n## Error Codes\n\n';
            Object.entries(errorCodes).sort((a, b) => b[1] - a[1]).forEach(([code, count]) => {
                markdown += `- **${code}:** ${count} occurrence${count > 1 ? 's' : ''}\n`;
            });
        }

        markdown += `\n## Filtered Results\n\n`;
        markdown += `Showing ${this.filteredLines.length} of ${this.parsedLines.length} lines\n`;

        try {
            await navigator.clipboard.writeText(markdown);
            this.showStatus('Summary copied as Markdown', 'success');
        } catch (error) {
            this.showStatus('Failed to copy to clipboard', 'error');
        }
    }

    clearResults() {
        this.logLines = [];
        this.parsedLines = [];
        this.filteredLines = [];
        this.activeLevelFilters.clear();
        this.activeLoggerFilters.clear();
        this.searchText = '';
        
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('status-section').style.display = 'none';
        document.getElementById('paste-textarea').value = '';
        document.getElementById('file-input').value = '';
        
        this.showStatus('Results cleared', 'success');
        setTimeout(() => {
            document.getElementById('status-section').style.display = 'none';
        }, 2000);
    }

    showStatus(message, type) {
        const statusSection = document.getElementById('status-section');
        const statusMessage = document.getElementById('status-message');
        
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusSection.style.display = 'block';
        
        // Auto-hide success and warning messages
        if (type === 'success' || type === 'warning') {
            setTimeout(() => {
                statusSection.style.display = 'none';
            }, 4000);
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new LogAnalyzer();
});
