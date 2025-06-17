import plotly.express as px
import pandas as pd

# Create the data ordered by market share (descending)
data = [
    {"platform": "Hungerstation", "market_share": 45},
    {"platform": "Jahez", "market_share": 35}, 
    {"platform": "Other Platforms", "market_share": 20}
]

df = pd.DataFrame(data)
# Sort by market share descending
df = df.sort_values('market_share', ascending=False)

# Create pie chart using brand colors
colors = ["#1FB8CD", "#FFC185", "#ECEBD5"]

fig = px.pie(df, 
             values='market_share', 
             names='platform',
             title='Saudi Food Delivery Market Share 2024',
             color_discrete_sequence=colors)

# Update traces to show both platform names and percentages on slices
fig.update_traces(textposition='inside', 
                  textinfo='label+percent',
                  textfont_size=14)

# Update layout for pie chart with proper text settings
fig.update_layout(uniformtext_minsize=14, uniformtext_mode='hide')

# Position legend on the right side with better spacing
fig.update_layout(legend=dict(orientation='v', 
                             yanchor='middle', 
                             y=0.5, 
                             xanchor='left', 
                             x=1.02,
                             font=dict(size=12)))

# Save the chart
fig.write_image("saudi_food_delivery_market_share.png")