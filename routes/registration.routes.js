import express from 'express';
import {
  getEventRegistrations,
  getUserRegistrations,
  registerForEvent,
  cancelRegistration,
  getRegistrationStats
} from '../controllers/registration.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all registrations for a specific event (organizers only)
router.get('/event/:eventId', protect, authorize('organizer'), getEventRegistrations);

// Get all registrations for the current user
router.get('/my-registrations', protect, getUserRegistrations);

// Register for an event
router.post('/event/:eventId', protect, authorize('user', 'organizer'), registerForEvent);

// Cancel registration for an event
router.delete('/event/:eventId', protect, authorize('user', 'organizer'), cancelRegistration);

// Get registration statistics for an event (organizers only)
router.get('/event/:eventId/stats', protect, authorize('organizer'), getRegistrationStats);

export default router;
