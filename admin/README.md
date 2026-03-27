# 🎯 SUVIDHA Admin Panel (Standalone)

This is a **separate, independent** admin application for the SUVIDHA Electricity Department system. It runs on its own port and can be deployed separately from the customer-facing frontend.

## 📁 Project Structure

```
Suvidha/
├── backend/          # API Server (Port 5000)
├── frontend/         # Customer Portal (Port 3000)
└── admin/           # Admin Panel (Port 5174) ← THIS APPLICATION
    ├── src/
    │   ├── pages/          # Admin pages
    │   │   ├── AdminDashboard.jsx
    │   │   ├── AdminOverview.jsx
    │   │   ├── ManageApplications.jsx
    │   │   ├── ManageComplaints.jsx
    │   │   ├── ManageUsers.jsx
    │   │   ├── Reports.jsx
    │   │   ├── SystemSettings.jsx
    │   │   ├── TariffManagement.jsx
    │   │   └── LoginPage.jsx
    │   ├── contexts/       # React contexts
    │   │   └── AuthContext.jsx
    │   ├── utils/          # Utilities
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── public/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── .env.example
```

## 🚀 Setup & Installation

### 1. Install Dependencies

```bash
cd admin
npm install
```

### 2. Configure Environment

```bash
# Create .env file
copy .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Admin Panel

```bash
# Development mode
npm run dev

# Production build
npm run build
npm run preview
```

## 🌐 Access Points

- **Admin Panel**: http://localhost:5174
- **Backend API**: http://localhost:5000
- **Customer Portal**: http://localhost:3000 (separate app)

## 🔐 Login Credentials

### Admin Account
- **Email**: admin@electricity.gov.in
- **Password**: Admin@123
- **Role**: Full admin access

### Staff Account
- **Email**: staff@electricity.gov.in
- **Password**: Staff@123
- **Role**: Limited staff access

## ✨ Features

### Admin Capabilities
✅ Dashboard with real-time statistics
✅ Manage all applications (approve/reject)
✅ Handle customer complaints
✅ User management (create staff, manage accounts)
✅ Consumer account overview
✅ Generate reports
✅ Configure system settings
✅ Manage tariff rates

### Security Features
✅ Separate authentication (admin_token in localStorage)
✅ Role-based access control (Admin/Staff only)
✅ Protected routes
✅ JWT token validation
✅ Automatic logout on unauthorized access

## 🔧 Technology Stack

- **Framework**: React 18.2.0
- **Build Tool**: Vite 7.3.1
- **UI Library**: Material-UI 5.15.0
- **Routing**: React Router 6.21.0
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Forms**: react-hook-form
- **Notifications**: react-hot-toast
- **Charts**: recharts

## 📦 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Start production server
npm start
```

## 🔌 API Integration

The admin panel connects to the backend API at `/api/admin/*` endpoints:

- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/applications` - List applications
- `PUT /api/admin/applications/:id` - Update application
- `GET /api/admin/complaints` - List complaints
- `PUT /api/admin/complaints/:id` - Update complaint
- `GET /api/admin/users` - List users
- `POST /api/admin/users/staff` - Create staff
- `PATCH /api/admin/users/:id/toggle-status` - Toggle user status
- `GET /api/admin/consumers` - List consumers
- `GET /api/admin/reports/payments` - Payment reports

## 🚢 Deployment

### Development
```bash
npm run dev
```
Runs on http://localhost:5174

### Production Build
```bash
npm run build
```
Creates optimized build in `dist/` folder

### Deploy Options
1. **Static Hosting**: Deploy `dist/` folder to Netlify, Vercel, or AWS S3
2. **Docker**: Containerize with Nginx
3. **Server**: Serve with Node.js static server
4. **CDN**: Deploy to CloudFlare Pages

### Environment Variables for Production
```env
VITE_API_URL=https://api.yourdomain.com/api
```

## 🔄 Differences from Customer Frontend

| Feature | Customer Frontend | Admin Panel |
|---------|------------------|-------------|
| **Port** | 3000 | 5174 |
| **Access** | Public | Admin/Staff only |
| **Token Storage** | `token` | `admin_token` |
| **Routes** | Customer pages | Admin management |
| **Theme** | Customer-focused | Professional admin |

## 🛡️ Security Notes

1. ✅ Separate token storage (`admin_token` vs `token`)
2. ✅ Role validation on login (admin/staff only)
3. ✅ Protected routes with authentication
4. ✅ Automatic session management
5. ✅ CORS configured for backend
6. ✅ No customer data exposed

## 📞 Maintenance

### Adding New Admin Features
1. Create new page in `src/pages/`
2. Add route in `App.jsx`
3. Update navigation in `AdminDashboard.jsx`
4. Create backend endpoint if needed

### Updating Dependencies
```bash
npm update
npm audit fix
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in vite.config.js
server: {
  port: 5175, // Use different port
}
```

### Cannot Connect to Backend
- Verify backend is running on port 5000
- Check `VITE_API_URL` in `.env`
- Ensure CORS is configured in backend

### Authentication Issues
- Clear browser localStorage
- Check token validity
- Verify user role is admin/staff

## 📄 License

Part of SUVIDHA C-DAC Hackathon 2026 Project

---

**🎉 Your standalone Admin Panel is ready to run!**

For customer portal, see: `../frontend/`
For backend API, see: `../backend/`
