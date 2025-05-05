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
    ratings: {
      rating: {
        type: Number,
      },
      rated_by: {
        type: Types.ObjectId,
        ref: "User",
      },
    },
    years_of_expirence: {
      type: Number,
    },
    clients: {
      type: Types.ObjectId,
      ref: "User",
    },
    about: {
      type: String,
    },
    available_time: {
      type: String,
    },
    service: {
      type: Types.ObjectId,
      ref: "Category",
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

const User = model("User", UserSchema);
const OTP = model("OTP", OTPSchema);
const Notification = model("Notification", NotificationSchema);
const Category = model("Category", CategorySchema);
const Legal = model("Legal", LegalSchema);

export { User, OTP, Notification, Category, Legal };
