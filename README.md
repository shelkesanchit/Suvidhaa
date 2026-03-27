# SUVIDHA - Smart Urban Virtual Interactive Digital Helpdesk Assistant

## Multi-Service Kiosk System

A complete, production-ready self-service kiosk application for Public Utility Services.

> **⭐ NEW: Unified kiosk system supporting Electricity, Gas, and Municipal services!**

---

## 🎯 Three-Application Architecture

This system consists of **three separate, independently deployable applications**:

```
Suvidha/
├── 🔧 backend/     → API Server (Port 5000)
├── 🌐 frontend/    → Multi-Service Kiosk Portal (Port 3000)
└── 👨‍💼 admin/       → Admin Panel (Port 5174) ⭐ NEW
```

## 🏪 Kiosk Landing Page

The system now features a unified landing page with three service options:

1. **⚡ Electricity Utility Offices** - Fully functional electricity services
2. **🔥 Gas Distribution Offices** - Gas connection and cylinder services
3. **💧 Municipal Corporations** - Water supply and waste management services

## Features

### Electricity Services (Fully Functional)
- **Connection & Account Management**
  - New Connection Applications
  - Change of Load
  - Change of Name
  - Address Correction
  - Reconnection Requests
  - Category/Tariff Change

- **Billing & Payment Services**
  - View & Pay Bills
  - Prepaid Meter Recharge
  - Self-Reading Submission
  - Energy Bill Calculator
  - Bill History

- **Complaint & Maintenance**
  - Fault Reporting
  - Grievance Redressal
  - Real-time Tracking

- **Renewable Energy Services**
  - Solar Rooftop Applications
  - Go Green Registration
  - EV Charging Services
  - Agricultural Schemes

### Gas Distribution Services (Coming Soon)
- New Gas Connections (PNG/LPG)
- Cylinder Booking
- Gas Bill Payment
- Service Requests
- Leak Complaints

### Municipal Corporation Services (Coming Soon)
- Water Connection Applications
- Water Bill Payment
- Waste Collection Scheduling
- Recycling Services
- Civic Complaints

### Admin Panel (Separate Application) ⭐ NEW
- Real-time Dashboard with Statistics
- Application Management (Approve/Reject)
- Complaint Handling and Assignment
- User and Staff Management
- Consumer Account Overview
- Payment Reports and Analytics
- System Settings and Configuration
- Tariff Rate Management
- **Runs independently on Port 5174**
- **Separate deployment and authentication**

## Technology Stack

### Backend (Port 5000)
- **Framework**: Node.js + Express.js
- **Database**: MySQL
- **Authentication**: JWT
- **Security**: bcrypt, helmet, CORS

### Frontend - Customer Portal (Port 3000)
- **Framework**: React.js with Material-UI
- **Build Tool**: Vite
- **Routing**: React Router
- **Forms**: react-hook-form

### Admin Panel - Separate App (Port 5174) ⭐ NEW
- **Framework**: React.js with Material-UI
- **Build Tool**: Vite
- **Authentication**: Separate JWT token storage
- **Charts**: recharts
- **Independent Deployment**: Can run on different server

## 🚀 Quick Start

### Option 1: Automated Installation (Recommended)

```powershell
# Install all dependencies at once
.\install.ps1

# Start all three applications
.\start-all.ps1
```

### Option 2: Manual Setup

**Terminal 1 - Backend**
```bash
cd backend
npm install
# Configure .env file
npm run dev
```

**Terminal 2 - Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 - Admin Panel** ⭐ NEW
```bash
cd admin
npm install
copy .env.example .env
npm run dev
```

---

## 🌐 Access URLs

| Application | URL | Description |
|------------|-----|-------------|
| 🔧 **Backend API** | http://localhost:5000 | REST API server |
| 🏪 **Kiosk Landing** | http://localhost:3000 | Main service selection page |
| ⚡ **Electricity Services** | http://localhost:3000/electricity | Full electricity functionality |
| 🔥 **Gas Services** | http://localhost:3000/gas | Gas distribution services |
| 💧 **Municipal Services** | http://localhost:3000/municipal | Water & waste management |
| ⚡ **Electricity Admin** | http://localhost:5175 | Electricity management dashboard |
| 💧 **Water Admin** | http://localhost:5176 | Water management dashboard |

---

## 🔐 Login Credentials

### Electricity Admin Panel (http://localhost:5175)
```
👨‍💼 Admin Account
Email: admin@electricity.gov.in
Password: Admin@123

👤 Staff Account
Email: staff@electricity.gov.in
Password: Staff@123
```

### Water Admin Panel (http://localhost:5176) ⭐ NEW
```
👨‍💼 Water Admin Account
Username: water_admin
Password: admin123

👤 Water Staff Account
Username: water_staff
Password: staff123
```

### Customer Portal (http://localhost:3000)
```
🧑 Customer Account
Email: demo@customer.com
Password: Customer@123
Consumer Number: EC2026001234
```

---

## Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_USER=suvidha_user
DB_PASSWORD=your_password
DB_NAME=suvidha_electricity
JWT_SECRET=your_jwt_secret
PORT=5000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

### Admin (.env) ⭐ NEW
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Quick start guide for all three apps
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Comprehensive setup instructions
- **[admin/README.md](admin/README.md)** - Admin panel specific documentation

---

## API Documentation

API documentation is available at `/api-docs` when the backend server is running.

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Data encryption

## Multilingual Support

Currently supports:
- English
- Hindi
- More languages can be added

## License

© 2026 C-DAC. All rights reserved.
