import { Schema, model, models, Document, Types } from 'mongoose';

// TypeScript interface for Booking document
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
  }
);

// Pre-save hook to validate that the referenced event exists
BookingSchema.pre('save', async function (next) {
  // Only validate eventId if it's new or modified
  if (this.isModified('eventId')) {
    try {
      // Dynamically import Event model to avoid circular dependency issues
      const Event = models.Event || (await import('./event.model')).default;
      
      const eventExists = await Event.findById(this.eventId);
      
      if (!eventExists) {
        return next(new Error('Event not found. Cannot create booking for non-existent event.'));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Event not found')) {
        return next(error);
      }
      return next(new Error('Failed to validate event reference'));
    }
  }
  
  next();
});

// Create index on eventId for faster lookup of bookings by event
BookingSchema.index({ eventId: 1 });

// Compound index for checking duplicate bookings (same event + email)
BookingSchema.index({ eventId: 1, email: 1 });

// Export model, reusing existing model in development to prevent recompilation errors
const Booking = models.Booking || model<IBooking>('Booking', BookingSchema);

export default Booking;
