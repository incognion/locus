# Event Management Dashboard - Backend API

## Overview
Backend API for an Event Management Dashboard where organizers can create and manage events, and users can browse and register for events.

## 🚀 Live API
**Production URL:** https://locus-8zft.onrender.com  
**API Base:** https://locus-8zft.onrender.com/api

## ✨ Features
- User Authentication (JWT-based)
- Role-based Access Control (User/Organizer)
- Event Management (CRUD operations)
- Event Registration System
- Real-time Updates (Socket.IO)
- Email Notifications
- Registration Analytics

## 🛠️ Tech Stack
- Node.js + Express.js
- MongoDB (with Mongoose)
- Socket.IO for real-time updates
- JWT for authentication
- Nodemailer for email notifications

## 📋 Quick API Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get specific event
- `POST /api/events` - Create new event (organizer only)
- `POST /api/events/:id/register` - Register for event
- `DELETE /api/events/:id/unregister` - Unregister from event

### Registrations
- `GET /api/registrations/my-registrations` - Get user's registrations
- `GET /api/registrations/event/:eventId/stats` - Get registration statistics (organizer only)

### Health Check
- `GET /api/health` - Check API status

## 🔐 Authentication
Protected endpoints require Bearer token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 👥 User Roles
- **User**: Can view events and register/unregister
- **Organizer**: Can create, update, delete events + view registration stats

## ⚡ Real-time Features
- **Socket.IO URL**: https://locus-8zft.onrender.com
- **Event**: `registrations:update` - Broadcasts registration updates
- **Room Management**: Join event-specific rooms

## 🧪 Quick Test
```bash
# Check API health
curl https://locus-8zft.onrender.com/api/health

# Register a user
curl -X POST https://locus-8zft.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","role":"user"}'

# Get all events
curl https://locus-8zft.onrender.com/api/events
```

## 🌐 Frontend Integration
- Configure `REACT_APP_API_URL=https://locus-8zft.onrender.com/api`
- Configure `REACT_APP_SOCKET_URL=https://locus-8zft.onrender.com`
- CORS already configured for frontend domains

## 📖 Full Documentation
Visit https://locus-8zft.onrender.com for complete API documentation and examples.