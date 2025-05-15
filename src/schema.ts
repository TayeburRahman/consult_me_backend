import { model, Schema, Types } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    photo_url: { type: String },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      default: "user",
      enum: ["user", "consultant", "admin"],
    },
    account_status: {
      type: String,
      required: true,
      default: "Active",
      enum: ["Active", "Banned"],
    },
    date_of_birth: {
      type: Date,
    },
    // consultant fields
    years_of_experience: {
      type: Number,
    },
    about: {
      type: String,
    },
    available_times: [
      {
        day: {
          type: String,
        },
        time: {
          type: String,
          default: null,
        },
      },
    ],
    service: {
      type: Types.ObjectId,
      ref: "Category",
    },
    price: {
      type: Number,
    },
    city: {
      type: String,
    },
    country: {
      type: String,
    },
    // consultant fields
  },
  { timestamps: true }
);

const OTPSchema = new Schema({
  otp: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["signup", "login", "forgot_password"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 5, // 5 minutes
  },
});

const NotificationSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true }
);

const CategorySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  icon_url: {
    type: String,
    required: true,
  },
});

const LegalSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const RatingSchema = new Schema({
  rate: {
    type: Number,
    required: true,
  },
  rated_by: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  rated: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const BookingSchema = new Schema({
  user: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  consultant: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  remind_before: {
    type: String,
    enum: [5, 10, 15, 30],
    default: 5,
  },
  status: {
    type: String,
    enum: ["upcoming", "completed", "cancelled"],
    default: "upcoming",
  },
  transaction_id: {
    type: String,
  },
  stripe_status: {
    type: String,
    enum: ["pending", "succeeded", "failed"],
    default: "pending",
  },
});

const MessageSchema = new Schema(
  {
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ["text", "image", "video"],
      default: "text",
    },
    attachments: {
      type: [String],
    },
  },
  { timestamps: true }
);

const User = model("User", UserSchema);
const OTP = model("OTP", OTPSchema);
const Notification = model("Notification", NotificationSchema);
const Category = model("Category", CategorySchema);
const Legal = model("Legal", LegalSchema);
const Rating = model("Rating", RatingSchema);
const Booking = model("Booking", BookingSchema);
const Message = model("Message", MessageSchema);

export { User, OTP, Notification, Category, Legal, Rating, Booking, Message };
