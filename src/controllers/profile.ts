import { AuthenticatedRequest } from "@middleware/auth";
import uploadService from "@services/uploadService";
import { comparePassword, plainPasswordToHash } from "@utils/password";
import { Response } from "express";
import { Booking, Rating, User } from "../schema";

const get_profile = async (req: AuthenticatedRequest, res: Response) => {
  const { profile_id } = req.query;

  const profile = await User.findById(profile_id || req.user?.id, {
    __v: 0,
    password_hash: 0,
  }).populate({
    path: "service",
    select: "name",
  });

  if (!profile) {
    res.status(400).json({
      message: "Profile not found",
    });
    return;
  }

  const ratings_from_db = await Rating.aggregate([
    { $match: { rated: req.user?.id } },
    {
      $group: {
        _id: null,
        averageScore: { $avg: "$rate" },
        count: { $sum: 1 },
      },
    },
  ]);

  const ratings = {
    score: ratings_from_db.length > 0 ? ratings_from_db[0].averageScore : 0,
    count: ratings_from_db.length > 0 ? ratings_from_db[0].count : 0,
  };

  const client_count_result = await Booking.aggregate([
    { $match: { consultant: profile._id } },
    { $group: { _id: "$user" } },
    { $count: "uniqueUsers" },
  ]);
  const client_count =
    client_count_result.length > 0 ? client_count_result[0].uniqueUsers : 0;

  const profileData = {
    _id: profile._id || null,
    name: profile.name || null,
    email: profile.email || null,
    phone: profile.phone || null,
    role: profile.role || null,
    account_status: profile.account_status || null,
    createdAt: profile.createdAt || null,
    updatedAt: profile.updatedAt || null,
    date_of_birth: profile.date_of_birth || null,
    photo_url: profile.photo_url || null,
    price: profile.price || null,
    service: profile.service || null,
    about: profile.about || null,
    available_times: profile.available_times || null,
    years_of_experience: profile.years_of_experience || null,
    city: profile.city || null,
    country: profile.country || null,
    ratings: {
      score: ratings.score || null,
      count: ratings.count || null,
    },
    client_count: client_count || null,
  };

  res.status(200).json({
    message: "Profile fetched successfully",
    data: profileData,
  });
};
const update_profile = async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user?.role;
  const {
    name,
    email,
    phone,
    date_of_birth,
    years_of_experience,
    service,
    city,
    country,
    price,
    about,
    available_times,
    lat,
    lng,
  } = req.body;
  const isConsultant = role === "consultant";
  const photo = req.file;

  let photo_url;
  try {
    if (photo) {
      photo_url = await uploadService(photo, "image");
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }

  try {
    await User.findByIdAndUpdate(req.user?.id, {
      ...(name && { name }),
      ...(photo_url && { photo_url }),
      ...(phone && { phone }),
      ...(date_of_birth && { date_of_birth }),
      ...(city && { city }),
      ...(country && { country }),
      ...(lat && { lat }),
      ...(lng && { lng }),
      ...(isConsultant && years_of_experience && { years_of_experience }),
      ...(isConsultant && service && { service }),
      ...(isConsultant && price && { price }),
      ...(isConsultant && about && { about }),
      ...(isConsultant &&
        available_times && { available_times: JSON.parse(available_times) }),
    });

    res.status(200).json({
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
const change_password = async (req: AuthenticatedRequest, res: Response) => {
  const { old_password, new_password } = req.body;

  const user = await User.findById(req.user?.id);

  if (!user) {
    res.status(400).json({ message: "User not found" });
    return;
  }

  const isPasswordCorrect = await comparePassword(
    old_password,
    user.password_hash
  );

  if (!isPasswordCorrect) {
    res.status(400).json({ message: "Invalid password" });
    return;
  }

  try {
    const password_hash = await plainPasswordToHash(new_password);
    await user.updateOne({ password_hash });
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export { get_profile, update_profile, change_password };
