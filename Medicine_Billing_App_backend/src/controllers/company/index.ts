import { Request, Response } from "express";
import { CompanyModel } from "../../database/models/company";
import { responseMessage } from "../../helper";
import { ApiResponse, ROLE, StatusCode } from "../../common";
import { AuthRequest } from "../../middleware/auth";
import mongoose from "mongoose";

const getSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

// ================= CREATE =================
export const createCompany = async (
  req:AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res
        .status(StatusCode.UNAUTHORIZED)
        .json(ApiResponse.error(responseMessage.accessDenied, null, StatusCode.UNAUTHORIZED));
    }

    const { name: rawName, companyName, gstNumber, address, phone, email, state } = req.body;
    const name = rawName || companyName;


    const newCompany = await CompanyModel.create({
      userId: req.user._id,
      name,
      gstNumber,
      address,
      phone,
      email,
      state,
      logo: req.file?.filename,
      isDeleted: false,
    });

    return res.status(StatusCode.CREATED).json(ApiResponse.created("Company created successfully", { company: newCompany }));
  } catch (error: any) {
    console.log("CREATE ERROR:", error);
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(error.message, error, StatusCode.INTERNAL_ERROR));
  }
};


export const getAllCompanies = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { isDeleted: false };

    // 🔐 Role based access
    if (req.user?.role !== ROLE.ADMIN) {
      filter.userId = req.user?._id;
    }

    // 🔍 Search
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { gstNumber: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
      ];
    }

    const [companies, total] = await Promise.all([
      CompanyModel.find(filter)
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      CompanyModel.countDocuments(filter),
    ]);

    return res
      .status(StatusCode.OK)
      .json(
        ApiResponse.success("Companies fetched successfully", {
          companies,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
          },
        })
      );
  } catch (error) {
    console.error("GET COMPANIES ERROR:", error);
    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(responseMessage.internalServerError, error, StatusCode.INTERNAL_ERROR));
  }
};


// ================= GET SINGLE =================
export const getSingleCompany = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(StatusCode.UNAUTHORIZED).json({
        message: responseMessage.accessDenied,
      });
    }

    const id = getSingleParam(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCode.BAD_REQUEST).json({
        message: "Invalid company id",
      });
    }
    const isAdmin = req.user.role === ROLE.ADMIN;

    const filter: any = { _id: id, isDeleted: false };

    if (!isAdmin) {
      filter.userId = req.user._id;
    }

    const company = await CompanyModel.findOne(filter);

    if (!company) {
      return res.status(StatusCode.NOT_FOUND).json({
        message: responseMessage.getDataNotFound("Company"),
      });
    }

    return res.status(StatusCode.OK).json({ company });

  } catch (error) {
    console.error("GET SINGLE COMPANY ERROR:", error);
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};


// ================= UPDATE =================
export const updateCompany = async (req: AuthRequest, res: Response) => {
  try {
    const id = getSingleParam(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCode.BAD_REQUEST).json({
        message: "Invalid company id",
      });
    }

    if (!req.user) {
      return res.status(StatusCode.UNAUTHORIZED).json({
        message: responseMessage.accessDenied,
      });
    }

    const company = await CompanyModel.findById(id);

    if (!company) {
      return res.status(404).json({ message: responseMessage.getDataNotFound("Company") });
    }

    if (
      req.user?.role !== ROLE.ADMIN &&
      company.userId.toString() !== req.user._id
    ) {
      return res.status(403).json({ message: responseMessage.accessDenied });
    }

    // ❌ prevent logo update
    delete req.body.logo;

    const allowedFields = [
      "companyName",
      "name",
      "gstNumber",
      "email",
      "phone",
      "state",
      "address",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "companyName") {
          (company as any).name = req.body[field];
        } else {
          (company as any)[field] = req.body[field];
        }
      }
    });

    await company.save();
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: responseMessage.internalServerError });
  }
};




// ================= DELETE (SOFT DELETE) =================
export const deleteCompany = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(StatusCode.UNAUTHORIZED).json({
        message: responseMessage.accessDenied,
      });
    }

    const id = getSingleParam(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCode.BAD_REQUEST).json({
        message: "Invalid company id",
      });
    }
    const isAdmin = req.user.role === ROLE.ADMIN;

    const filter: any = { _id: id, isDeleted: false };

    if (!isAdmin) {
      filter.userId = req.user._id;
    }

    const company = await CompanyModel.findOneAndUpdate(
      filter,
      { isDeleted: true },
      { new: true }
    );

    if (!company) {
      return res.status(StatusCode.NOT_FOUND).json({
        message: responseMessage.getDataNotFound("Company"),
      });
    }

    return res.status(StatusCode.OK).json({
      message: responseMessage.deleteDataSuccess("Company"),
    });

  } catch (error) {
    console.error("DELETE COMPANY ERROR:", error);
    return res.status(StatusCode.INTERNAL_ERROR).json({
      message: responseMessage.internalServerError,
    });
  }
};
