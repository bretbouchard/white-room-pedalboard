#!/bin/bash

# Dashboard Creation Script for Schillinger SDK Monitoring
# Creates monitoring dashboards for SDK metrics and analytics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DASHBOARD_DIR="dashboards"
DRY_RUN=false
DASHBOARD_TYPE="all"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --type)
            DASHBOARD_TYPE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --dry-run     Show what would be created without making changes"
            echo "  --type TYPE   Dashboard type (all|grafana|custom|html)"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}📊 Creating SDK Monitoring Dashboards${NC}"
echo -e "${BLUE}Dashboard Type: $DASHBOARD_TYPE${NC}"
echo -e "${BLUE}Dry Run: $DRY_RUN${NC}"

# Create dashboard directory
if [[ "$DRY_RUN" == false ]]; then
    mkdir -p "$DASHBOARD_DIR"/{grafana,custom,html}
    echo -e "${GREEN}✅ Dashboard directories created${NC}"
fi

# Create Grafana dashboard
create_grafana_dashboard() {
    echo -e "${YELLOW}📈 Creating Grafana dashboard...${NC}"
    
    if [[ "$DRY_RUN" == false ]]; then
        cat > "$DASHBOARD_DIR/grafana/schillinger-sdk-dashboard.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Schillinger SDK Monitoring",
    "tags": ["schillinger", "sdk", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "API Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(sdk_api_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(sdk_api_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Response Time (seconds)",
            "min": 0
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "API Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(sdk_api_requests_total{status=~\"2..\"}[5m]) / rate(sdk_api_requests_total[5m]) * 100",
            "legendFormat": "Success Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 95},
                {"color": "green", "value": 99}
              ]
            }
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 0
        }
      },
      {
        "id": 3,
        "title": "SDK Usage by Language",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (language) (rate(sdk_events_total{event=\"sdk_initialized\"}[1h]))",
            "legendFormat": "{{language}}"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 8
        }
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(sdk_errors_total[5m])",
            "legendFormat": "Errors per second"
          }
        ],
        "yAxes": [
          {
            "label": "Errors/sec",
            "min": 0
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 8
        }
      },
      {
        "id": 5,
        "title": "Most Used Features",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, sum by (method) (rate(sdk_method_calls_total[1h])))",
            "format": "table"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 24,
          "x": 0,
          "y": 16
        }
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF
        echo -e "${GREEN}✅ Grafana dashboard created${NC}"
    else
        echo -e "${YELLOW}🔍 DRY RUN: Would create Grafana dashboard${NC}"
    fi
}

# Create custom HTML dashboard
create_html_dashboard() {
    echo -e "${YELLOW}🌐 Creating HTML dashboard...${NC}"
    
    if [[ "$DRY_RUN" == false ]]; then
        cat > "$DASHBOARD_DIR/html/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schillinger SDK Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        .metric-label {
            color: #666;
            margin-top: 5px;
        }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-healthy { background-color: #4CAF50; }
        .status-warning { background-color: #FF9800; }
        .status-error { background-color: #F44336; }
        .refresh-button {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 20px;
        }
        .refresh-button:hover {
            background: #5a6fd8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎵 Schillinger SDK Dashboard</h1>
        <p>Real-time monitoring and analytics for the Schillinger System SDK</p>
    </div>

    <button class="refresh-button" onclick="refreshData()">🔄 Refresh Data</button>

    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value" id="api-response-time">--</div>
            <div class="metric-label">Average Response Time (ms)</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="success-rate">--</div>
            <div class="metric-label">Success Rate (%)</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="active-users">--</div>
            <div class="metric-label">Active Users (24h)</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="error-count">--</div>
            <div class="metric-label">Errors (1h)</div>
        </div>
    </div>

    <div class="chart-container">
        <h3>API Response Times</h3>
        <canvas id="responseTimeChart" width="400" height="200"></canvas>
    </div>

    <div class="chart-container">
        <h3>SDK Usage by Language</h3>
        <canvas id="languageChart" width="400" height="200"></canvas>
    </div>

    <div class="chart-container">
        <h3>Service Health Status</h3>
        <div id="health-status">
            <p><span class="status-indicator status-healthy"></span>Core API: Healthy</p>
            <p><span class="status-indicator status-healthy"></span>Analytics: Healthy</p>
            <p><span class="status-indicator status-warning"></span>Error Reporting: Degraded</p>
            <p><span class="status-indicator status-healthy"></span>Documentation: Healthy</p>
        </div>
    </div>

    <script>
        // Configuration
        const API_BASE_URL = window.location.origin + '/api/metrics';
        
        // Initialize charts
        let responseTimeChart, languageChart;
        
        function initCharts() {
            // Response Time Chart
            const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
            responseTimeChart = new Chart(responseTimeCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: [],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            // Language Usage Chart
            const languageCtx = document.getElementById('languageChart').getContext('2d');
            languageChart = new Chart(languageCtx, {
                type: 'doughnut',
                data: {
                    labels: ['TypeScript', 'Python', 'Swift', 'C++'],
                    datasets: [{
                        data: [45, 30, 15, 10],
                        backgroundColor: [
                            '#667eea',
                            '#764ba2',
                            '#f093fb',
                            '#f5576c'
                        ]
                    }]
                },
                options: {
                    responsive: true
                }
            });
        }
        
        // Fetch metrics data
        async function fetchMetrics() {
            try {
                // Simulate API call - replace with actual endpoint
                const mockData = {
                    responseTime: Math.floor(Math.random() * 200) + 100,
                    successRate: (Math.random() * 5 + 95).toFixed(1),
                    activeUsers: Math.floor(Math.random() * 1000) + 500,
                    errorCount: Math.floor(Math.random() * 10),
                    responseTimeHistory: Array.from({length: 10}, () => Math.floor(Math.random() * 200) + 100),
                    languageUsage: {
                        typescript: Math.floor(Math.random() * 50) + 30,
                        python: Math.floor(Math.random() * 40) + 20,
                        swift: Math.floor(Math.random() * 20) + 10,
                        cpp: Math.floor(Math.random() * 15) + 5
                    }
                };
                
                return mockData;
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
                return null;
            }
        }
        
        // Update dashboard with new data
        async function updateDashboard() {
            const data = await fetchMetrics();
            if (!data) return;
            
            // Update metric cards
            document.getElementById('api-response-time').textContent = data.responseTime;
            document.getElementById('success-rate').textContent = data.successRate;
            document.getElementById('active-users').textContent = data.activeUsers.toLocaleString();
            document.getElementById('error-count').textContent = data.errorCount;
            
            // Update response time chart
            const now = new Date();
            responseTimeChart.data.labels.push(now.toLocaleTimeString());
            responseTimeChart.data.datasets[0].data.push(data.responseTime);
            
            // Keep only last 10 data points
            if (responseTimeChart.data.labels.length > 10) {
                responseTimeChart.data.labels.shift();
                responseTimeChart.data.datasets[0].data.shift();
            }
            
            responseTimeChart.update();
            
            // Update language chart
            languageChart.data.datasets[0].data = [
                data.languageUsage.typescript,
                data.languageUsage.python,
                data.languageUsage.swift,
                data.languageUsage.cpp
            ];
            languageChart.update();
        }
        
        // Refresh data manually
        function refreshData() {
            updateDashboard();
        }
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            initCharts();
            updateDashboard();
            
            // Auto-refresh every 30 seconds
            setInterval(updateDashboard, 30000);
        });
    </script>
</body>
</html>
EOF
        echo -e "${GREEN}✅ HTML dashboard created${NC}"
    else
        echo -e "${YELLOW}🔍 DRY RUN: Would create HTML dashboard${NC}"
    fi
}

# Create custom dashboard configuration
create_custom_dashboard() {
    echo -e "${YELLOW}⚙️  Creating custom dashboard configuration...${NC}"
    
    if [[ "$DRY_RUN" == false ]]; then
        cat > "$DASHBOARD_DIR/custom/dashboard-config.json" << 'EOF'
{
  "dashboard": {
    "name": "Schillinger SDK Monitoring",
    "version": "1.0.0",
    "refresh_interval": 30,
    "metrics": {
      "api_response_time": {
        "query": "avg(sdk_api_request_duration_seconds)",
        "unit": "seconds",
        "threshold": {
          "warning": 2,
          "critical": 5
        }
      },
      "success_rate": {
        "query": "rate(sdk_api_requests_total{status=~\"2..\"}[5m]) / rate(sdk_api_requests_total[5m]) * 100",
        "unit": "percent",
        "threshold": {
          "warning": 95,
          "critical": 90
        }
      },
      "error_rate": {
        "query": "rate(sdk_errors_total[5m])",
        "unit": "per_second",
        "threshold": {
          "warning": 0.1,
          "critical": 1
        }
      },
      "active_users": {
        "query": "count(count by (session_id) (sdk_events_total{event=\"sdk_initialized\"}[24h]))",
        "unit": "count"
      }
    },
    "charts": [
      {
        "id": "response_time_trend",
        "type": "line",
        "title": "API Response Time Trend",
        "metric": "api_response_time",
        "time_range": "1h"
      },
      {
        "id": "language_distribution",
        "type": "pie",
        "title": "SDK Usage by Language",
        "query": "sum by (language) (rate(sdk_events_total{event=\"method_called\"}[1h]))"
      },
      {
        "id": "method_popularity",
        "type": "bar",
        "title": "Most Popular Methods",
        "query": "topk(10, sum by (method) (rate(sdk_method_calls_total[1h])))"
      },
      {
        "id": "error_breakdown",
        "type": "table",
        "title": "Error Breakdown",
        "query": "sum by (error_type) (rate(sdk_errors_total[1h]))"
      }
    ],
    "alerts": [
      {
        "name": "High Response Time",
        "condition": "api_response_time > 5",
        "severity": "critical",
        "notification": {
          "email": ["admin@schillinger.ai"],
          "slack": "#alerts"
        }
      },
      {
        "name": "Low Success Rate",
        "condition": "success_rate < 95",
        "severity": "warning",
        "notification": {
          "email": ["admin@schillinger.ai"]
        }
      },
      {
        "name": "High Error Rate",
        "condition": "error_rate > 1",
        "severity": "critical",
        "notification": {
          "email": ["admin@schillinger.ai"],
          "slack": "#alerts",
          "pagerduty": true
        }
      }
    ]
  }
}
EOF
        
        # Create dashboard server script
        cat > "$DASHBOARD_DIR/custom/server.js" << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;

// Serve static files
app.use(express.static(path.join(__dirname, '../html')));

// API endpoint for metrics
app.get('/api/metrics', (req, res) => {
    // Mock data - replace with actual metrics collection
    const metrics = {
        timestamp: Date.now(),
        api_response_time: Math.random() * 200 + 100,
        success_rate: Math.random() * 5 + 95,
        error_rate: Math.random() * 0.1,
        active_users: Math.floor(Math.random() * 1000) + 500,
        language_distribution: {
            typescript: Math.floor(Math.random() * 50) + 30,
            python: Math.floor(Math.random() * 40) + 20,
            swift: Math.floor(Math.random() * 20) + 10,
            cpp: Math.floor(Math.random() * 15) + 5
        },
        popular_methods: [
            { method: 'rhythm.generateResultant', calls: Math.floor(Math.random() * 1000) },
            { method: 'harmony.generateProgression', calls: Math.floor(Math.random() * 800) },
            { method: 'composition.create', calls: Math.floor(Math.random() * 600) },
            { method: 'analysis.analyzeRhythm', calls: Math.floor(Math.random() * 400) }
        ]
    };
    
    res.json(metrics);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: Date.now() });
});

app.listen(PORT, () => {
    console.log(`📊 Dashboard server running on http://localhost:${PORT}`);
});
EOF
        
        echo -e "${GREEN}✅ Custom dashboard configuration created${NC}"
    else
        echo -e "${YELLOW}🔍 DRY RUN: Would create custom dashboard configuration${NC}"
    fi
}

# Main execution
case "$DASHBOARD_TYPE" in
    all)
        create_grafana_dashboard
        create_html_dashboard
        create_custom_dashboard
        ;;
    grafana)
        create_grafana_dashboard
        ;;
    html)
        create_html_dashboard
        ;;
    custom)
        create_custom_dashboard
        ;;
    *)
        echo -e "${RED}❌ Unknown dashboard type: $DASHBOARD_TYPE${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Dashboard creation completed!${NC}"

if [[ "$DRY_RUN" == false ]]; then
    echo -e "${BLUE}📋 Available Dashboards:${NC}"
    echo -e "${YELLOW}  • Grafana: $DASHBOARD_DIR/grafana/schillinger-sdk-dashboard.json${NC}"
    echo -e "${YELLOW}  • HTML: $DASHBOARD_DIR/html/index.html${NC}"
    echo -e "${YELLOW}  • Custom: $DASHBOARD_DIR/custom/dashboard-config.json${NC}"
    echo ""
    echo -e "${BLUE}🚀 To start the HTML dashboard:${NC}"
    echo -e "${YELLOW}  cd $DASHBOARD_DIR/custom && node server.js${NC}"
fi