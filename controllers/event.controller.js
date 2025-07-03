import Event from '../models/event.model.js';
import Registration from '../models/registration.model.js';
import { io } from '../server.js';

// Create a new event
export const createEvent = async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      organizer: req.user._id
    });
    
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get all events
export const listEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer', 'name email')
      .sort({ date: 1 });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get a single event by ID
export const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('registrants', 'name email');
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Get accurate registration count from Registration collection
    const registrationCount = await Registration.countDocuments({ event: event._id });
    
    res.json({
      ...event.toObject(),
      registrationCount,
      availableSeats: event.seats - registrationCount
    });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Register for an event (FIXED VERSION)
export const registerEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    const userId = req.user._id;
    
    // Check if user is already registered using Registration collection
    const existingRegistration = await Registration.findOne({
      event: event._id,
      user: userId
    });
    
    if (existingRegistration) {
      return res.status(400).json({ msg: 'Already registered for this event' });
    }
    
    // Check seat availability using Registration collection count (more accurate)
    const currentRegistrations = await Registration.countDocuments({ event: event._id });
    if (currentRegistrations >= event.seats) {
      return res.status(400).json({ msg: 'No seats available' });
    }
    
    // Create Registration document
    const registration = await Registration.create({
      event: event._id,
      user: userId
    });
    
    // Update event registrants array (for backward compatibility)
    if (!event.registrants.includes(userId)) {
      event.registrants.push(userId);
      await event.save();
    }

    // Emit real-time update
    io.emit('registrations:update', {
      eventId: event._id,
      count: currentRegistrations + 1,
      availableSeats: event.seats - (currentRegistrations + 1)
    });
    
    // Populate the registration for response
    const populatedRegistration = await Registration.findById(registration._id)
      .populate('user', 'name email')
      .populate('event', 'title date');
    
    res.json({ 
      msg: 'Registered successfully',
      registration: populatedRegistration
    });
    
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Unregister from an event
export const unregisterEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    const userId = req.user._id;
    
    // Find and remove registration from Registration collection
    const registration = await Registration.findOneAndDelete({
      event: event._id,
      user: userId
    });
    
    if (!registration) {
      return res.status(404).json({ msg: 'Registration not found' });
    }
    
    // Update event registrants array
    event.registrants = event.registrants.filter(id => !id.equals(userId));
    await event.save();
    
    // Get updated count
    const currentRegistrations = await Registration.countDocuments({ event: event._id });
    
    // Emit real-time update
    io.emit('registrations:update', {
      eventId: event._id,
      count: currentRegistrations,
      availableSeats: event.seats - currentRegistrations
    });
    
    res.json({ msg: 'Unregistered successfully' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Update an event (organizer only)
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: 'Not authorized to update this event' });
    }
    
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('organizer', 'name email');
    
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Delete an event (organizer only)
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: 'Not authorized to delete this event' });
    }
    
    // Delete all registrations for this event first
    await Registration.deleteMany({ event: req.params.id });
    
    // Delete the event
    await Event.findByIdAndDelete(req.params.id);
    
    res.json({ msg: 'Event and all registrations deleted successfully' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get events created by the current organizer
export const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .populate('organizer', 'name email')
      .sort({ date: 1 });
    
    // Add registration statistics for each event
    const eventsWithStats = await Promise.all(events.map(async (event) => {
      const registrationCount = await Registration.countDocuments({ event: event._id });
      return {
        ...event.toObject(),
        registrationCount,
        availableSeats: event.seats - registrationCount
      };
    }));
    
    res.json(eventsWithStats);
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};
