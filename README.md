
# FloodGuard Connect

Real-time emergency coordination for flood disasters.

## Google Maps Integration Setup

To enable the interactive maps and automatic pincode detection:

1. **Get an API Key**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project.
   - Search for and **Enable** the following APIs:
     - `Maps JavaScript API`
     - `Geocoding API`
   - Go to **APIs & Services > Credentials**.
   - Click **Create Credentials > API key**.
   - **Important**: Link a billing account to your project (Google provides $200 free credit monthly).

2. **Configure Environment**:
   - Open the `.env` file in this project.
   - Replace `YOUR_ACTUAL_API_KEY_HERE` with your new key.
   - Restart the development server.

## Features
- **Citizen Portal**: Send SOS signals with automatic GPS and Pincode detection.
- **Rescue Dashboard**: View and navigate to distress signals sorted by proximity.
- **Admin Command**: Monitor city-wide status via heatmaps and broadcast alerts.
