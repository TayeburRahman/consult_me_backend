import { Request, Response } from "express";
import { Legal } from "src/schema";

const get_legal_info = async (req: Request, res: Response) => {
  const { type } = req.query;

  if (!type) {
    res.status(400).json({
      message: "Legal type is required",
    });
    return;
  }

  const legal = await Legal.findOne({ type }, { __v: 0, _id: 0 });
  res.json({ data: legal, message: "Legal info fetched successfully" });
};

const update_legal_info = async (req: Request, res: Response) => {
  const { type, content } = req.body;

  try {
    const legal = await Legal.findOne({ type });
    if (legal) {
      await legal.updateOne({ content });
      res.status(200).json({ message: "Legal info updated successfully" });
      return;
    }
    await Legal.create({ type, content });
    res.status(200).json({ message: "Legal info created successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export { get_legal_info, update_legal_info };
