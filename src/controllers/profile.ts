import { AuthenticatedRequest } from "@middleware/auth";
import uploadService from "@services/uploadService";
import { comparePassword, plainPasswordToHash } from "@utils/password";
import { Response } from "express";
import { User } from "src/schema";

const get_profile = async (req: AuthenticatedRequest, res: Response) => {
  const { profile_id } = req.query;

  const profile = await User.findById(profile_id || req.user?.id, {
    __v: 0,
    password_hash: 0,
  });

  if (!profile) {
    res.status(400).json({
      message: "Profile not found",
    });
    return;
  }

  res
    .status(200)
    .json({ message: "Profile fetched successfully", data: profile });
};
const update_profile = async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    email,
    phone,
    date_of_birth,
    years_of_experience,
    service,
    address,
  } = req.body;

  try {
    await User.findByIdAndUpdate(req.user?.id, {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(date_of_birth && { date_of_birth }),
      ...(years_of_experience && { years_of_experience }),
      ...(service && { service }),
      ...(address && { address }),
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
const update_profile_photo = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const photo = req.file;

  if (!photo) {
    res.status(400).json({ message: "Photo is required" });
    return;
  }

  let photo_url;
  try {
    photo_url = await uploadService(photo, "image");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }

  try {
    if (!photo_url) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }
    await User.findByIdAndUpdate(req.user?.id, { photo_url });
    res.status(200).json({ message: "Profile photo updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
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

export { get_profile, update_profile, update_profile_photo, change_password };
