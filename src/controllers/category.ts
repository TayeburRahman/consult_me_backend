import uploadService from "@services/uploadService";
import { Request, Response } from "express";
import { Category, User } from "src/schema";

const add_category = async (req: Request, res: Response) => {
  const { name } = req.body;
  const icon = req.file;

  if (!name) {
    res.status(400).json({
      message: "Name is required",
    });
    return;
  }

  if (!icon) {
    res.status(400).json({
      message: "Icon is required",
    });
    return;
  }

  const existingCategory = await Category.findOne({ name });

  if (existingCategory) {
    res.status(400).json({
      message: "Category already exists",
    });
    return;
  }

  const icon_url = await uploadService(icon, "image");

  const category = await Category.create({
    name,
    icon_url,
  });

  res.status(200).json({
    message: "Category added successfully",
    data: category,
  });
};

const get_categories = async (req: Request, res: Response) => {
  const categories = await Category.find({}, { __v: 0 });

  if (!categories) {
    res.status(400).json({
      message: "No categories found",
    });
    return;
  }

  res.status(200).json({
    message: "Categories fetched successfully",
    data: categories,
  });
};

const update_category = async (req: Request, res: Response) => {
  const { id, name } = req.body;
  const icon = req.file;

  if (!id) {
    res.status(400).json({
      message: "Category ID is required",
    });
    return;
  }

  if (!name) {
    res.status(400).json({
      message: "Name is required",
    });
    return;
  }

  const category = await Category.findById(id);

  if (!category) {
    res.status(400).json({
      message: "Category not found",
    });
    return;
  }

  if (icon) {
    const icon_url = await uploadService(icon, "image");
    if (!icon_url) {
      res.status(400).json({
        message: "Icon upload failed",
      });
      return;
    }
    category.icon_url = icon_url;
  }

  category.name = name;

  await category.save();

  res.status(200).json({
    message: "Category updated successfully",
    data: category,
  });
};

const delete_category = async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id) {
    res.status(400).json({
      message: "Category ID is required",
    });
    return;
  }

  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    res.status(400).json({
      message: "Category not found",
    });
    return;
  }

  res.status(200).json({
    message: "Category deleted successfully",
  });
};

const get_consultant_by_category = async (req: Request, res: Response) => {
  const { category_id, page, limit } = req.query;

  const pageNumber = parseInt(page as string) || 1;
  const pageSize = parseInt(limit as string) || 10;
  const skip = (pageNumber - 1) * pageSize;

  try {
    const consultants = await User.find(
      { service: category_id },
      { __v: 0, password_hash: 0 }
    )
      .skip(skip)
      .limit(pageSize);

    const totalConsultants = await User.countDocuments({
      service: category_id,
    });

    res.json({
      message: "Consultants fetched successfully",
      data: consultants,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total: totalConsultants,
        totalPages: Math.ceil(totalConsultants / pageSize),
        hasNextPage: skip + pageSize < totalConsultants,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export {
  add_category,
  get_categories,
  update_category,
  delete_category,
  get_consultant_by_category,
};
