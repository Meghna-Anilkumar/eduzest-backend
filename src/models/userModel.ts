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
    },

    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },

    profilePic: {
      type: String
    },

    address:{
      type:String
    }
  },
  updatedAt: {
    type: Date,
  },
  role: {
    type: String,
    enum: ['Student', 'Instructor', 'Admin'],
    default: 'Student'
  },
  createdAt: {
    type: Date,
  },
  isBlocked: {
    type: Boolean,
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: Number
  },

  qualification: {
    type: String
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

  aboutMe: {
    type: String
  },

  cv: {
    type: String,
  },

  socialMedia: {
    linkedin: { type: String },
    github: { type: String }
  },

  isRequested: {
    type: Boolean,
    default: false,
  },

  isRejected: {
    type: Boolean,
    default: false
  },

  experience:{
    type:String
  },

  refreshToken:{
    type:String
  },

  refreshTokenExpires:{
     type:String
  }

});

export const Users = model<UserDoc>('Users', userSchema);
