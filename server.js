import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import eventRoutes from './routes/event.routes.js';
import registrationRoutes from './routes/registration.routes.js';

// Import models for cron job
import Event from './models/event.model.js';
import User from './models/user.model.js';
import { sendMail } from './utils/mailer.js';

dotenv.config();
await connectDB();

const app = express();

// Enhanced CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000',  // Development
    'http://localhost:3001',  // Alternative development port
    'http://localhost:5173',  // Vite development server
    'https://idyllic-frangipane-be5388.netlify.app',  // Your production frontend
    'https://idyllic-frangipane-be5388.netlify.app/', // With trailing slash
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (optional for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Create HTTP server and Socket.IO
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://idyllic-frangipane-be5388.netlify.app',
      'https://idyllic-frangipane-be5388.netlify.app/'
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  
  // Join event-specific rooms for targeted updates
  socket.on('join-event', (eventId) => {
    socket.join(`event-${eventId}`);
    console.log(`Socket ${socket.id} joined event-${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Email notification cron job (runs every 6 hours)
setInterval(async () => {
  try {
    const soon = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h window
    const now = new Date();
    
    const events = await Event.find({
      date: { $lt: soon, $gt: now }
    }).populate('registrants', 'name email');
    
    for (const event of events) {
      // Send reminders to all registrants
      event.registrants.forEach(user => {
        sendMail({
          to: user.email,
          subject: `Reminder: ${event.title} is tomorrow`,
          text: `Hi ${user.name},\n\nThis is a reminder that you're registered for "${event.title}" happening on ${event.date.toLocaleString()}.\n\nSee you there!\n\nBest regards,\nEvent Management Team`
        }).catch(err => console.error('Email send error:', err));
      });
    }
    
    console.log(`Email reminders sent for ${events.length} upcoming events`);
  } catch (error) {
    console.error('Cron job error:', error);
  }
}, 1000 * 60 * 60 * 6); // Run every 6 hours

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    msg: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler - FIXED: Changed from '*path' to '/*path'
app.use('/*path', (req, res) => {
  res.status(404).json({ msg: 'Route not found' });
});

// Add this route before your error handlers in server.js
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Event Management Dashboard API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; color: #333; margin-bottom: 30px; }
            .status { background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; }
            .endpoint { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 5px; }
            .method { background: #007bff; color: white; padding: 2px 8px; border-radius: 3px; margin-right: 10px; }
            .code { background: #f1f1f1; padding: 15px; border-radius: 5px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎉 Event Management Dashboard API</h1>
            <span class="status">🟢 API Online</span>
            <p>Backend API for managing events and registrations</p>
        </div>
        
        <h2>📋 API Endpoints</h2>
        
        <h3>🔐 Authentication</h3>
        <div class="endpoint">
            <span class="method">POST</span> /api/auth/register - Register new user
        </div>
        <div class="endpoint">
            <span class="method">POST</span> /api/auth/login - Login user
        </div>
        
        <h3>🎪 Events</h3>
        <div class="endpoint">
            <span class="method">GET</span> /api/events - Get all events
        </div>
        <div class="endpoint">
            <span class="method">GET</span> /api/events/:id - Get specific event
        </div>
        <div class="endpoint">
            <span class="method">POST</span> /api/events - Create event (organizer only)
        </div>
        <div class="endpoint">
            <span class="method">POST</span> /api/events/:id/register - Register for event
        </div>
        <div class="endpoint">
            <span class="method">DELETE</span> /api/events/:id/unregister - Unregister for event
        </div>
        
        <h3>📊 Registrations</h3>
        <div class="endpoint">
            <span class="method">GET</span> /api/registrations/my-registrations - Get user's registrations
        </div>
        <div class="endpoint">
            <span class="method">GET</span> /api/registrations/event/:eventId/stats - Get registration statistics (organizer only)
        </div>
        
        <h3>Health Check</h3>
        <div class="endpoint">
            <span class="method">GET</span> /api/health - Check API status
        </div>
        
        <h3>🔐 Authentication</h3>
        <p></p>Use Bearer token in Authorization header for protected routes:</p>
        <div class="code">
Authorization: Bearer YOUR_JWT_TOKEN
        </div>
        
        <h2>🧪 Quick Test</h2>
        <div class="code">
# Check API health<br>
curl https://locus-8zft.onrender.com/api/health<br><br>

# Register a user<br>
curl -X POST https://locus-8zft.onrender.com/api/auth/register \\<br>
&nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
&nbsp;&nbsp;-d '{"name":"Test User","email":"test@example.com","password":"password123","role":"user"}'<br><br>

# Get all events<br>
curl https://locus-8zft.onrender.com/api/events
        </div>
        
        <h2>🌐 Frontend Integration</h2>
        <p><strong>API Base URL:</strong> https://locus-8zft.onrender.com/api</p>
        <p><strong>Socket.IO URL:</strong> https://locus-8zft.onrender.com</p>
        <p><strong>Authentication:</strong> Include Bearer token in Authorization header</p>
        
        <h2>✨ Features</h2>
        <ul>
            <li>✅ User Authentication (JWT-based)</li>
            <li>✅ Role-based Access Control (User/Organizer)</li>
            <li>✅ Event Management (CRUD operations)</li>
            <li>✅ Real-time Updates (Socket.IO)</li>
            <li>✅ Email Notifications</li>
        </ul>
        
        <div style="text-align: center; margin-top: 40px; color: #666;">
            <p>Built for Event Management Dashboard | Ready for Frontend Integration</p>
        </div>
    </body>
    </html>
  `);
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO enabled`);
  console.log(`📅 Email notifications scheduled every 6 hours`);
  console.log(`🌐 CORS configured for: https://idyllic-frangipane-be5388.netlify.app`);
});
