# Enhanced Dashboard Integration for FastAPI HMON System
# File: hmon_dashboard.py

import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json
from pathlib import Path
from datetime import datetime
import numpy as np

class HMONDashboard:
    """Enhanced dashboard class for HMON system monitoring data visualization"""

    def __init__(self):
        self.colors = {
            'primary': '#2E86AB',
            'secondary': '#A23B72', 
            'success': '#F18F01',
            'warning': '#C73E1D',
            'info': '#3F6C51',
            'cpu': '#FF6B6B',
            'memory': '#4ECDC4',
            'temperature': '#45B7D1',
            'fan': '#96CEB4'
        }

    def load_and_process_data(self, csv_path):
        """Load and preprocess HMON CSV data"""
        df = pd.read_csv(csv_path)

        # Parse timestamp properly
        if 'time_stamp' in df.columns:
            df['time_stamp'] = pd.to_datetime(df['time_stamp'], format='%d %b %Y %H:%M:%S')

        # Calculate total memory for percentage calculations
        if 'used' in df.columns and 'free' in df.columns:
            df['total_memory'] = df['used'] + df['free']
            df['memory_usage_pct'] = (df['used'] / df['total_memory']) * 100

        # Clean up column names (remove trailing spaces)
        df.columns = df.columns.str.strip()

        return df

    def create_system_overview_chart(self, df):
        """Create main system performance overview chart"""
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('CPU & Memory Usage', 'Temperature', 'CPU Breakdown', 'Memory Distribution'),
            specs=[[{"secondary_y": True}, {"type": "indicator"}],
                   [{"type": "bar"}, {"type": "pie"}]]
        )

        # Main performance metrics
        fig.add_trace(
            go.Scatter(x=df['time_stamp'], y=df['cpu_usage'], 
                      name='CPU %', line=dict(color=self.colors['cpu'], width=2)),
            row=1, col=1
        )
        
        fig.add_trace(
            go.Scatter(x=df['time_stamp'], y=df['memory_usage_pct'], 
                      name='Memory %', line=dict(color=self.colors['memory'], width=2)),
            row=1, col=1
        )

        # Temperature gauge
        latest_temp = df['temperature'].iloc[-1] if len(df) > 0 else 0
        fig.add_trace(
            go.Indicator(
                mode="gauge+number+delta",
                value=latest_temp,
                gauge={'axis': {'range': [None, 100]},
                       'bar': {'color': self.colors['temperature']},
                       'steps': [
                           {'range': [0, 50], 'color': "lightgray"},
                           {'range': [50, 70], 'color': "yellow"},
                           {'range': [70, 100], 'color': "red"}],
                       'threshold': {'line': {'color': "red", 'width': 4},
                                   'thickness': 0.75, 'value': 80}}
            ),
            row=1, col=2
        )

        # CPU breakdown
        if all(col in df.columns for col in ['usr', 'sys', 'idle']):
            cpu_categories = ['User', 'System', 'Idle']
            cpu_values = [df['usr'].mean(), df['sys'].mean(), df['idle'].mean()]
            
            fig.add_trace(
                go.Bar(x=cpu_categories, y=cpu_values,
                      marker_color=[self.colors['cpu'], self.colors['secondary'], self.colors['info']]),
                row=2, col=1
            )

        # Memory distribution
        if 'used' in df.columns and 'free' in df.columns:
            memory_labels = ['Used', 'Free', 'Cached', 'Buffer']
            memory_values = [
                df['used'].iloc[-1],
                df['free'].iloc[-1],
                df['cached'].iloc[-1] if 'cached' in df.columns else 0,
                df['buffer'].iloc[-1] if 'buffer' in df.columns else 0
            ]
            
            fig.add_trace(
                go.Pie(labels=memory_labels, values=memory_values,
                      marker_colors=[self.colors['memory'], self.colors['success'], 
                                   self.colors['info'], self.colors['warning']]),
                row=2, col=2
            )

        fig.update_layout(height=800, showlegend=True, title_text="HMON System Overview Dashboard")
        return fig

    def create_detailed_fan_chart(self, df):
        """Create detailed fan monitoring chart"""
        fig = go.Figure()

        fan_cols = [col for col in df.columns if col.startswith('fan') and col[-1].isdigit()]
        
        for i, fan_col in enumerate(fan_cols):
            if df[fan_col].notna().any() and (df[fan_col] != 0).any():
                fig.add_trace(
                    go.Scatter(
                        x=df['time_stamp'], 
                        y=df[fan_col],
                        mode='lines+markers',
                        name=f'Fan {fan_col[-1]}',
                        line=dict(width=2),
                        marker=dict(size=4)
                    )
                )

        fig.update_layout(
            title='Fan Speed Monitoring',
            xaxis_title='Time',
            yaxis_title='Fan Speed (RPM)',
            height=400,
            hovermode='x unified'
        )
        
        return fig

    def create_memory_trend_chart(self, df):
        """Create memory usage trend analysis"""
        fig = make_subplots(
            rows=2, cols=1,
            subplot_titles=('Memory Usage Over Time', 'Memory Components'),
            vertical_spacing=0.1
        )

        # Memory trend
        fig.add_trace(
            go.Scatter(x=df['time_stamp'], y=df['used'], 
                      name='Used Memory', fill='tonexty',
                      line=dict(color=self.colors['memory'])),
            row=1, col=1
        )

        if 'cached' in df.columns:
            fig.add_trace(
                go.Scatter(x=df['time_stamp'], y=df['cached'], 
                          name='Cached Memory', 
                          line=dict(color=self.colors['info'])),
                row=1, col=1
            )

        # Stacked area chart for memory components
        if all(col in df.columns for col in ['used', 'free', 'cached']):
            fig.add_trace(
                go.Scatter(x=df['time_stamp'], y=df['used'], 
                          stackgroup='one', name='Used',
                          fillcolor=self.colors['memory']),
                row=2, col=1
            )
            
            fig.add_trace(
                go.Scatter(x=df['time_stamp'], y=df['cached'], 
                          stackgroup='one', name='Cached',
                          fillcolor=self.colors['info']),
                row=2, col=1
            )

        fig.update_layout(height=600, title_text="Memory Analysis Dashboard")
        return fig

    def generate_dashboard_summary(self, df):
        """Generate summary statistics for dashboard"""
        summary = {}
        
        # CPU statistics
        if 'cpu_usage' in df.columns:
            summary['cpu'] = {
                'current': df['cpu_usage'].iloc[-1],
                'average': df['cpu_usage'].mean(),
                'max': df['cpu_usage'].max(),
                'status': 'normal' if df['cpu_usage'].iloc[-1] < 80 else 'warning'
            }

        # Memory statistics
        if 'memory_usage_pct' in df.columns:
            summary['memory'] = {
                'current': df['memory_usage_pct'].iloc[-1],
                'average': df['memory_usage_pct'].mean(),
                'max': df['memory_usage_pct'].max(),
                'status': 'normal' if df['memory_usage_pct'].iloc[-1] < 85 else 'warning'
            }

        # Temperature statistics
        if 'temperature' in df.columns:
            summary['temperature'] = {
                'current': df['temperature'].iloc[-1],
                'average': df['temperature'].mean(),
                'max': df['temperature'].max(),
                'status': 'normal' if df['temperature'].iloc[-1] < 70 else 'warning'
            }

        # Fan statistics
        fan_cols = [col for col in df.columns if col.startswith('fan') and col[-1].isdigit()]
        if fan_cols:
            active_fans = sum(1 for col in fan_cols if df[col].iloc[-1] > 0)
            summary['fans'] = {
                'active': active_fans,
                'total': len(fan_cols),
                'status': 'normal' if active_fans > 0 else 'critical'
            }

        return summary

    def create_real_time_metrics_html(self, summary):
        """Generate HTML for real-time metrics cards"""
        html_parts = []
        
        for metric, data in summary.items():
            status_class = f"status-{data.get('status', 'normal')}"
            
            if metric == 'fans':
                value = f"{data['active']}/{data['total']}"
                label = "Active Fans"
            else:
                value = f"{data['current']:.1f}"
                label = metric.title()
                if metric in ['cpu', 'memory']:
                    value += "%"
                elif metric == 'temperature':
                    value += "°C"
            
            html_part = f"""
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="metric-value text-{data.get('status', 'primary')}">{value}</div>
                            <div class="metric-label">{label}</div>
                        </div>
                        <div class="status-indicator {status_class}"></div>
                    </div>
                </div>
            </div>
            """
            html_parts.append(html_part)
        
        return ''.join(html_parts)


# Additional utility functions for FastAPI integration
def generate_all_plots(df, filename):
    """Generate all plots for existing FastAPI route compatibility"""
    dashboard = HMONDashboard()
    processed_df = dashboard.load_and_process_data(df) if isinstance(df, str) else df
    
    return {
        'overview': dashboard.create_system_overview_chart(processed_df).to_html(include_plotlyjs='cdn'),
        'fans': dashboard.create_detailed_fan_chart(processed_df).to_html(include_plotlyjs='cdn'),
        'memory': dashboard.create_memory_trend_chart(processed_df).to_html(include_plotlyjs='cdn')
    }