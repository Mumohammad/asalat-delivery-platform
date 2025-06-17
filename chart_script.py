import plotly.graph_objects as go
import pandas as pd

# Create the data
data = [
  {"year": 2020, "market_value": 6.2, "type": "actual"},
  {"year": 2021, "market_value": 7.1, "type": "actual"},
  {"year": 2022, "market_value": 8.3, "type": "actual"},
  {"year": 2023, "market_value": 10.0, "type": "actual"},
  {"year": 2024, "market_value": 10.8, "type": "projected"},
  {"year": 2025, "market_value": 11.8, "type": "projected"},
  {"year": 2026, "market_value": 12.9, "type": "projected"},
  {"year": 2027, "market_value": 13.9, "type": "projected"},
  {"year": 2028, "market_value": 14.9, "type": "projected"}
]

df = pd.DataFrame(data)

# Split data into actual and projected
actual_data = df[df['type'] == 'actual']
projected_data = df[df['type'] == 'projected']

# Create the figure
fig = go.Figure()

# Add actual data trace
fig.add_trace(go.Scatter(
    x=actual_data['year'],
    y=actual_data['market_value'],
    mode='lines+markers',
    name='Actual',
    line=dict(color='#1FB8CD', width=3),
    marker=dict(color='#1FB8CD', size=8),
    fill='tonexty',
    fillcolor='rgba(31, 184, 205, 0.3)',
    hovertemplate='%{x}<br>$%{y}b<extra></extra>',
    cliponaxis=False
))

# Add projected data trace (connecting to the last actual point)
projected_years = [2023] + projected_data['year'].tolist()
projected_values = [10.0] + projected_data['market_value'].tolist()

fig.add_trace(go.Scatter(
    x=projected_years,
    y=projected_values,
    mode='lines+markers',
    name='Projected',
    line=dict(color='#FFC185', width=3, dash='dash'),
    marker=dict(color='#FFC185', size=8),
    fill='tonexty',
    fillcolor='rgba(255, 193, 133, 0.3)',
    hovertemplate='%{x}<br>$%{y}b<extra></extra>',
    cliponaxis=False
))

# Update layout
fig.update_layout(
    title='Saudi Arabia Food Delivery Market Growth (2020-2028)',
    xaxis_title='Year',
    yaxis_title='Market Value ($b)',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    showlegend=True
)

# Update axes
fig.update_xaxes(
    tickmode='linear',
    tick0=2020,
    dtick=1
)

fig.update_yaxes(
    tickformat='$,.1f',
    ticksuffix='b'
)

# Save the chart
fig.write_image('saudi_food_delivery_market.png')