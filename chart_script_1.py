import plotly.graph_objects as go

# Adjusted data for better visualization - making values more comparable
data = [
  {"category": "Age Range", "value": 42, "display": "42", "description": "18-60 years eligible"},
  {"category": "Req Documents", "value": 5, "display": "5", "description": "5 mandatory documents"},
  {"category": "Hungerstation", "value": 55, "display": "55k", "description": "55,000+ restaurants"},
  {"category": "Jahez Cities", "value": 54, "display": "54", "description": "54+ cities covered"},
  {"category": "Min Veh Age", "value": 15, "display": "15", "description": "2009 or newer (15+ yrs old)"},
  {"category": "Process Days", "value": 4, "display": "4", "description": "3-5 business days"}
]

# Brand colors in order
colors = ['#1FB8CD', '#FFC185', '#ECEBD5', '#5D878F', '#D2BA4C', '#B4413C']

# Prepare data for chart
categories = [item['category'] for item in data]
values = [item['value'] for item in data]
displays = [item['display'] for item in data]
hover_texts = [f"{item['description']}<br>Value: {item['display']}" for item in data]

# Create bar chart
fig = go.Figure(data=[
    go.Bar(
        x=values,
        y=categories,
        orientation='h',
        marker_color=colors[:len(categories)],
        text=displays,
        textposition='inside',
        hovertext=hover_texts,
        hoverinfo='text'
    )
])

# Update layout
fig.update_layout(
    title="Saudi Arabia Delivery Driver Requirements",
    xaxis_title="Value",
    yaxis_title="Category",
    showlegend=False,
    bargap=0.3  # Add space between bars
)

# Save the chart
fig.write_image("saudi_delivery_requirements.png")