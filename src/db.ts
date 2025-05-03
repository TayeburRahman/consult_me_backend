import mongoose from "mongoose";

const startDB = async () => {
  await mongoose.connect(process.env.MONGO_URI || "");
  console.log("MongoDB Connected");
};

export default startDB;
