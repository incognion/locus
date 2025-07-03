import express from 'express';
import {
  createEvent,
  listEvents,
  getEvent,
  registerEvent,
  unregisterEvent,
  updateEvent,
  deleteEvent,
  getMyEvents
} from '../controllers/event.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', listEvents);
router.get('/:id', getEvent);

// Protected routes
router.post('/', protect, authorize('organizer'), createEvent);
router.put('/:id', protect, authorize('organizer'), updateEvent);
router.delete('/:id', protect, authorize('organizer'), deleteEvent);

// Registration routes
router.post('/:id/register', protect, authorize('user', 'organizer'), registerEvent);
router.delete('/:id/unregister', protect, authorize('user', 'organizer'), unregisterEvent);

// Organizer routes
router.get('/my/events', protect, authorize('organizer'), getMyEvents);

export default router;
