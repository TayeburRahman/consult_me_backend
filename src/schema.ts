import { model, Schema, Types } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    photo_url: { type: String },
    password_hash: { type: String },
    role: {
      type: String,
      required: true,
      default: "user",
      enum: ["user", "consultant", "admin"],
    },
    auth_provider: {
      type: String
    },
    provider_id: {
      type: String
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
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
    years_of_experience: {
      type: Number,
    },
    about: {
      type: String,
    },
    available_times: [
      {
        type: Schema.Types.Mixed,
        required: false,
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
    balance: {
      type: Number,
      default: 0,
    },
    stripeAccountId: {
      type: String,
    },
    stripeOnboardingDone: {
      type: Boolean,
      default: false,
    },
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
    description: {
      type: String,
    },
    type: { type: String },
    isRead: {
      type: Boolean,
      default: false,
    },
    recipientId: { type: Types.ObjectId, ref: "User" },
    recipientRole: { type: String },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 7, // 7 days
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
    type: Number,
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
    enum: ["pending", "paid", "failed"],
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

const PaymentSchema = new Schema({
  amount: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  paymentId: {
    type: String,
    required: true,
  },
  paymentStatus: {
    type: String,
  },
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  bookingId: {
    type: Types.ObjectId,
    ref: "Booking",
  },
});

const WithdrawSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    transaction_id: {
      type: String,
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
const Payment = model("Payment", PaymentSchema);
const Withdraw = model("Withdraw", WithdrawSchema);

export {
  User,
  OTP,
  Notification,
  Category,
  Legal,
  Rating,
  Booking,
  Message,
  Payment,
  Withdraw,
};
