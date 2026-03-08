SignalForge
A Real-Time Market Intelligence Engine

SignalForge is a lightweight market analytics platform that aggregates financial data, processes it through a backend API layer, and visualizes insights through an interactive frontend dashboard.

The goal of the project is to simulate how modern trading dashboards collect, cache, and present market data efficiently. SignalForge focuses on performance, clean architecture, and real-time data visualization.
SignalForge is designed as a full-stack system where:

• A Node.js backend aggregates market data from external APIs
• A caching layer minimizes redundant API calls and improves performance
• A React frontend visualizes price trends, indices, and signals
• A modular architecture allows easy extension into algorithmic strategies or AI-driven insights

Instead of being just a UI dashboard, SignalForge behaves like a data processing engine that transforms raw market feeds into structured information.
⚙️ Tech Stack

Frontend
React
Vite
Recharts
Lucide Icons

Backend
Node.js
Express.js

Other Components
REST API architecture
In-memory caching system
Financial data aggregation
JSON-based API communication

Key Features
Real-Time Market Dashboard
Displays market indices and trends through responsive charts.

API Aggregation Layer
Backend collects and structures data from multiple sources.

Caching System
Reduces repeated API requests and improves response speed.

Interactive Chart Visualization
Built using Recharts to display market movement clearly.

Search & Ticker Autocomplete
Quickly locate instruments through dynamic suggestions.

Modular Backend Design
Endpoints are separated logically, making the system easy to scale.

System Architecture

Client (React + Vite)

↓ REST API

Server (Node.js + Express)

↓ External APIs

Market Data Sources

SignalForge acts as the processing layer between raw financial APIs and the visual analytics interface.

Demo Capabilities
Current dashboard capabilities include:
• Viewing market indices
• Visualizing historical trends
• Searching tickers
• Monitoring data through API endpoints
• Interactive chart panels

🛠 Installation
Clone the repository
git clone https://github.com/yourusername/signalforge.git
Move into the project folder
cd signalforge
Install backend dependencies
npm install

Start the backend server
node server.js

Start the frontend
cd client
npm install
npm run dev

Open in browser
http://localhost:5173

Future Roadmap
Planned upgrades for SignalForge:
• Algorithmic trading signal generation
• Machine learning based market pattern detection
• Portfolio tracking system
• Historical data storage
• Advanced technical indicators
• AI-assisted trading insights

 Project Motivation
SignalForge was built as an exploration of how data pipelines, caching systems, and interactive dashboards combine to create modern financial intelligence tools.
The project demonstrates practical experience in:
• backend API design
• data aggregation
• performance optimization
• full-stack system integration

👨‍💻 Author
Developed by Diptangkush
MCA student passionate about building intelligent systems, data pipelines, and experimental tech projects.
