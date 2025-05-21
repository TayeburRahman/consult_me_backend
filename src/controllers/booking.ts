import { AuthenticatedRequest } from "@middleware/auth";
import { createCheckoutSession } from "@services/stripeService";
import { Request, Response } from "express";
import { Booking, User } from "src/schema";

const get_available_slots = async (req: Request, res: Response) => {
  const { consultant_id, date } = req.query;

  if (!consultant_id) {
    res.status(400).json({ message: "Consultant ID is required" });
    return;
  }

  if (!date) {
    res.status(400).json({ message: "Date is required" });
    return;
  }

  const consultant = await User.findById(consultant_id);

  if (!consultant) {
    res.status(404).json({ message: "Consultant not found" });
    return;
  }

  const bookings = await Booking.find(
    {
      consultant: consultant_id,
      status: "upcoming",
      stripe_status: "succeeded",
      date: {
        $gte: new Date(date as string),
      },
    },
    {
      time: 1,
      _id: 0,
    }
  );

  if (!bookings) {
    res.status(404).json({ message: "No bookings found" });
    return;
  }

  const dayOfWeek = new Date(date as string).getDay();
  const availableTimes = consultant.available_times[dayOfWeek].time;

  if (!availableTimes) {
    res
      .status(400)
      .json({ message: "This consultant hasn't set their availability" });
    return;
  }

  const [startTime, endTime] = availableTimes?.split("-");

  const availableSlots = []; // [09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00]

  for (
    let i = parseInt(startTime?.split(":")[0]);
    i <= parseInt(endTime?.split(":")[0]);
    i++
  ) {
    for (let j = 0; j < 60; j += 60) {
      const time = `${i.toString().padStart(2, "0")}:${j
        .toString()
        .padStart(2, "0")}`;
      const isBooked = bookings.some((booking) => booking.time === time);
      if (!isBooked) {
        availableSlots.push(time);
      }
    }
  }
  const bookedSlots = bookings.map((booking) => booking.time);
  const availableSlotsFiltered = availableSlots.filter(
    (slot) => !bookedSlots.includes(slot)
  );

  res.json({
    message: "Available slots fetched successfully",
    data: availableSlotsFiltered,
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

  const existingBooking = await Booking.findOne({
    consultant: consultant_id,
    date,
    time,
    status: "upcoming",
  });

  if (existingBooking) {
    res.status(400).json({ message: "Slot already booked" });
    return;
  }

  const dayOfWeek = new Date(date).getDay();
  const availableTimes = consultant.available_times[dayOfWeek].time;
  const [startTime, endTime] = availableTimes?.split("-");

  // Check if the selected time (22:00) is within the range (startTime: 20:00, endTime: 23:00)

  const selectedTime = new Date(date);
  const start = new Date(date);
  const end = new Date(date);
  start.setHours(
    parseInt(startTime?.split(":")[0]),
    parseInt(startTime?.split(":")[1])
  );
  end.setHours(
    parseInt(endTime?.split(":")[0]),
    parseInt(endTime?.split(":")[1])
  );
  selectedTime.setHours(
    parseInt(time?.split(":")[0]),
    parseInt(time?.split(":")[1])
  );

  if (selectedTime < start || selectedTime > end) {
    res.status(400).json({
      message: `Selected time is not available. Available times are: ${availableTimes}`,
    });
    return;
  }

  const booking = await Booking.create({
    consultant: consultant_id,
    date,
    time,
    remind_before,
    user: user_id,
  });

  if (!booking) {
    res.status(500).json({ message: "Failed to create booking" });
    return;
  }

  if (!consultant.price) {
    res.status(400).json({ message: "Consultant price not found" });
    return;
  }

  const stripe: any = await createCheckoutSession({
    userId: user_id,
    booking_id: booking._id.toString(),
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Consult Me Payment",
          },
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

  res.json({ message: "Booking created successfully", data: stripe.url });
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
};
