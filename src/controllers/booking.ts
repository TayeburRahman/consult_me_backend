import { AuthenticatedRequest } from "@middleware/auth";
import { Request, Response } from "express";
import { Booking, User } from "../schema";
import { createCheckoutSession } from "@services/stripeService";

const get_available_slots = async (req: Request, res: any) => {
  const { consultant_id, date } = req.query;

  if (!consultant_id) return res.status(400).json({ message: "Consultant ID is required" });
  if (!date) return res.status(400).json({ message: "Date is required" });

  const consultant = await User.findById(consultant_id);
  if (!consultant) return res.status(404).json({ message: "Consultant not found" });

  const dateObj = new Date(date as string);

  const startOfDay = new Date(dateObj);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(dateObj);
  endOfDay.setUTCHours(23, 59, 59, 999);

  console.log({ startOfDay, endOfDay });

  const bookings = await Booking.find({
    consultant: consultant_id,
    status: "upcoming",
    stripe_status: "succeeded",
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  console.log({ bookings });
  const normalizeTime = (t: string) => t.trim().toUpperCase();
  const bookedTimes = bookings.map((b) => normalizeTime(b.time));

  console.log(bookings);

  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dayOfWeek = days[new Date(date as string).getDay()];

  const dayAvailabilityObj = consultant.available_times.find((d: any) => d[dayOfWeek]);
  if (!dayAvailabilityObj) {
    return res.status(400).json({ message: `This consultant hasn't set availability for ${dayOfWeek}` });
  }

  const availableTimes = dayAvailabilityObj[dayOfWeek];
  const availableSlots = availableTimes.filter((time: string) => !bookedTimes.includes(normalizeTime(time)));

  return res.json({
    message: "Available slots fetched successfully",
    data: availableSlots,
  });
};

const book_an_appointment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { consultant_id, date, time, remind_before } = req.body;
  const user_id = req.user?.id;

  if (!consultant_id || !date || !time || !remind_before || !user_id) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const consultant = await User.findById(consultant_id);

  if (!consultant) {
    res.status(404).json({ message: "Consultant not found" });
    return;
  }

  const dateObj = new Date(date as string);

  const startOfDay = new Date(dateObj);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(dateObj);
  endOfDay.setUTCHours(23, 59, 59, 999);

  console.log({ startOfDay, endOfDay });

  const existingBooking = await Booking.findOne({
    consultant: consultant_id,
    date: { $gte: startOfDay, $lte: endOfDay },
    time,
    status: "upcoming",
  });

  if (existingBooking) {
    res.status(400).json({ message: "Slot already booked" });
    return;
  }

  const booking = await Booking.create({
    user: user_id,
    consultant: consultant_id,
    date,
    time,
    remind_before: remind_before || 10,
    status: "upcoming",
    stripe_status: "pending",
  });

  if (!consultant.price) {
    res.status(400).json({ message: "Consultant price not found" });
    return;
  }

  const stripe = await createCheckoutSession({
    userId: user_id.toString(),
    booking_id: booking._id.toString(),
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Consult Me Payment" },
          unit_amount: consultant.price * 100,
        },
        quantity: 1,
      },
    ],
  });

  if (stripe instanceof Error) {
    res.status(500).json({ message: "Failed to create Stripe session" });
    return;
  }

  res.json({
    message: "Booking created successfully",
    // @ts-ignore
    data: stripe.url,
  });
}

const create_booking_consultant = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const consultant_id = req.user?.id;
  const { day, time } = req.body;

  if (!day || !time) {
    res.status(400).json({ message: "Day and time are required" });
    return;
  }
  console.log({
    consultant_id,
    day,
    time,
  });

  // Check if this consultant already has that day & time
  const existing = await User.findOne({
    _id: consultant_id,
    "available_times.day": day,
    "available_times.time": time,
  });

  if (existing) {
    res.status(400).json({
      message: "This time slot already exists for the selected day",
    });
    return;
  }

  // // Otherwise, push new availability
  const updatedUser = await User.findByIdAndUpdate(
    consultant_id,
    { $push: { available_times: { day, time } } },
    { new: true }
  );

  if (!updatedUser) {
    res.status(404).json({ message: "Consultant not found" });
    return;
  }

  res.status(200).json({
    message: "Available time recorded",
    data: {
      consultant_id,
      available_time: { day, time },
    },
  });
};

const get_user_bookings = async (req: AuthenticatedRequest, res: Response) => {
  const user_id = req.user?.id;
  const { type } = req.query;

  if (type != "upcoming" && type != "completed") {
    res.status(400).json({ message: "Invalid type provided" });
    return;
  }

  if (!user_id) {
    res.status(400).json({ message: "User ID is required" });
    return;
  }

  const user = await User.findById(user_id);

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  let bookings;

  if (user.role === "user") {
    bookings = await Booking.find(
      { user: user_id, status: type },
      { __v: 0, stripe_status: 0, user: 0 }
    )
      .populate({
        path: "consultant",
        select: "name photo_url",
        populate: {
          path: "service",
          select: "name -_id",
        },
      })
      .sort({ date: -1 });
  }

  if (user.role === "consultant") {
    bookings = await Booking.find(
      { consultant: user_id, status: type },
      { __v: 0, stripe_status: 0, consultant: 0 }
    )
      .populate({
        path: "user",
        select: "name photo_url",
      })
      .sort({ date: -1 });
  }

  if (!bookings) {
    res.status(404).json({ message: "No bookings found" });
    return;
  }

  res.json({
    message: "Bookings fetched successfully",
    data: bookings,
  });
};

const reschedule_booking = async (req: AuthenticatedRequest, res: Response) => {
  const { booking_id, date, time, remind_before } = req.body;
  const user_id = req.user?.id;

  if (!booking_id || !date || !time || !user_id) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const booking = await Booking.findById(booking_id, { __v: 0 });

  if (!booking) {
    res.status(404).json({ message: "Booking not found" });
    return;
  }

  if (booking.user.toString() !== user_id) {
    res
      .status(403)
      .json({ message: "You are not authorized to reschedule this booking" });
    return;
  }

  booking.date = date;
  booking.time = time;
  booking.remind_before = remind_before;

  await booking.save();

  res.json({
    message: "Booking rescheduled successfully",
    data: booking,
  });
};

export {
  get_available_slots,
  book_an_appointment,
  get_user_bookings,
  reschedule_booking,
  create_booking_consultant,
};
