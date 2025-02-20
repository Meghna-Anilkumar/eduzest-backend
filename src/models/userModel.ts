import { model, Schema, Types } from 'mongoose';
import { UserDoc } from '../interfaces/IUser';

const userSchema = new Schema<UserDoc>({
  email: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profile: {
    dob: {
      type: String,
      // required: true 
    },

    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      // required: true 
    },

    profilePic: {
      type: String
    }
  },
  updatedAt: {
    type: Date,
    // required: true 
  },
  role: {
    type: String,
    enum: ['Student', 'Instructor', 'Admin'],
    default: 'Student'
  },
  createdAt: {
    type: Date,
    // required: true 
  },
  isBlocked: {
    type: Boolean,
    // required: true 
  },
  password: {
    type: String,
    required: true
  },
  studentDetails: {
    additionalEmail: {
      type: String
    },
    enrolledCourses: [{
      courseId: {
        type: Types.ObjectId,
        ref: 'Course'
      },
      progress: {
        type: Number
      },
      rating: {
        type: String
      }
    }],
    phone: {
      type: Number
    },
    socialMedia: {
      linkedin: { type: String },
      github: { type: String }
    }
  },
  instructorDetails: {
    createdCourses: [{
      type: Types.ObjectId,
      ref: 'Course'
    }],
    profit: {
      type: Schema.Types.Decimal128
    },
    rating: {
      type: Schema.Types.Decimal128
    }
  },
  isGoogleAuth: {
    type: Boolean,
    default: false
  },

});

export const Users = model<UserDoc>('Users', userSchema);
