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
    'https://magical-gingersnap-0402a3.netlify.app',  // Your production frontend
    'https://magical-gingersnap-0402a3.netlify.app/', // With trailing slash
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
      'https://magical-gingersnap-0402a3.netlify.app',
      'https://magical-gingersnap-0402a3.netlify.app/'
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO enabled`);
  console.log(`📅 Email notifications scheduled every 6 hours`);
  console.log(`🌐 CORS configured for: https://magical-gingersnap-0402a3.netlify.app`);
});
