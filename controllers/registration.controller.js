import Event from '../models/event.model.js';
import Registration from '../models/registration.model.js';
import User from '../models/user.model.js';
import { io } from '../server.js';

// Get all registrations for a specific event
export const getEventRegistrations = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const registrations = await Registration.find({ event: eventId })
      .populate('user', 'name email')
      .populate('event', 'title date');
    
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get all registrations for a specific user
export const getUserRegistrations = async (req, res) => {
  try {
    const userId = req.user._id;
    const registrations = await Registration.find({ user: userId })
      .populate('event', 'title description date seats organizer')
      .populate('event.organizer', 'name');
    
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Register for an event (alternative to the one in event controller)
export const registerForEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user._id;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    // Check if user is already registered
    const existingRegistration = await Registration.findOne({
      event: eventId,
      user: userId
    });

    if (existingRegistration) {
      return res.status(400).json({ msg: 'Already registered for this event' });
    }

    // Check if seats are available
    const currentRegistrations = await Registration.countDocuments({ event: eventId });
    if (currentRegistrations >= event.seats) {
      return res.status(400).json({ msg: 'No seats available' });
    }

    // Create registration
    const registration = await Registration.create({
      event: eventId,
      user: userId
    });

    // Update event registrants array (for backward compatibility)
    if (!event.registrants.includes(userId)) {
      event.registrants.push(userId);
      await event.save();
    }

    // Emit real-time update
    io.emit('registrations:update', {
      eventId: eventId,
      count: currentRegistrations + 1
    });

    const populatedRegistration = await Registration.findById(registration._id)
      .populate('user', 'name email')
      .populate('event', 'title date');

    res.status(201).json({
      msg: 'Successfully registered for event',
      registration: populatedRegistration
    });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Cancel registration for an event
export const cancelRegistration = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user._id;

    // Find and remove registration
    const registration = await Registration.findOneAndDelete({
      event: eventId,
      user: userId
    });

    if (!registration) {
      return res.status(404).json({ msg: 'Registration not found' });
    }

    // Update event registrants array
    const event = await Event.findById(eventId);
    if (event) {
      event.registrants = event.registrants.filter(id => !id.equals(userId));
      await event.save();

      // Emit real-time update
      io.emit('registrations:update', {
        eventId: eventId,
        count: event.registrants.length
      });
    }

    res.json({ msg: 'Registration cancelled successfully' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get registration statistics (for organizers)
export const getRegistrationStats = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    // Check if user is the organizer of this event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: 'Not authorized to view these stats' });
    }

    const totalRegistrations = await Registration.countDocuments({ event: eventId });
    const registrations = await Registration.find({ event: eventId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      totalRegistrations,
      availableSeats: event.seats - totalRegistrations,
      registrations
    });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};
