# **App Name**: FloodGuard Connect

## Core Features:

- Citizen Distress Reporting: Allows registered citizens to log in and raise emergency tickets, including auto-fetched GPS location (with manual override), number of people, emergency type (e.g., trapped, injured, food shortage), additional notes, and image/video uploads.
- Real-time Tracking & Notifications: Citizens can view the real-time status of their submitted tickets (Pending, Accepted, In Progress, Rescued, Closed) and track the assigned rescue team's location on an integrated map. Also sends push notifications for status updates and safety alerts.
- Rescue Team Dashboard & Response: Authenticated rescue teams can log in to a dedicated dashboard, view nearby emergency tickets (with filtering by distance, severity, priority), accept or reject requests, and update the status of assigned tickets.
- Integrated Navigation for Teams: Provides Google Maps API integration to offer shortest and safest route suggestions to distress locations, aiding rescue teams in efficient navigation.
- Admin Command Center: A centralized administration panel where authenticated administrators can manage user accounts, verify rescue teams, monitor all active tickets on a map (with response time tracking), and manage team assignments.
- AI-Powered Priority Assessment Tool: Utilizes AI to analyze details from incoming distress tickets (emergency type, number of people, notes, uploaded media) to automatically assign a priority level, helping administrators and teams quickly identify and address the most critical cases.
- Database Management: Persistent storage for user accounts, emergency tickets, rescue team data, and system logs, utilizing MySQL or MongoDB as specified.

## Style Guidelines:

- Primary color: A strong and reassuring blue (#2245D2), symbolizing trust, reliability, and the water element without being literal, ensuring good contrast on light backgrounds.
- Background color: A very light, subtle blue-gray (#F4F6FA), providing a clean, uncluttered canvas that complements the primary blue.
- Accent color: A vibrant, clear sky blue (#1FBBF5), chosen to draw attention to interactive elements, important actions, and to visually signal success or urgent updates, while maintaining an analogous relationship with the primary color.
- Main font: 'Inter' (sans-serif) for all text elements. Its clean, objective, and highly readable design ensures clarity across different information types and under various viewing conditions, which is crucial for an emergency response system.
- Use clear, intuitive, vector-based icons that are easily understandable at a glance for emergency types, status indicators, navigation controls, and general UI actions. Icons should scale well and maintain legibility.
- Prioritize critical information display with clean, scannable dashboards for both citizens and rescue teams. Emphasize map-centric interfaces for location and navigation. Ensure responsive design for optimal usability on mobile devices for field teams and citizens, and larger screens for administrators.
- Incorporate subtle and functional animations for status updates, notification pop-ups, and map interactions. These should be smooth and non-distracting, aimed at conveying real-time information effectively without causing delays or confusion.