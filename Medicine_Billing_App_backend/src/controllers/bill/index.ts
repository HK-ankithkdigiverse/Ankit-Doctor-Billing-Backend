import { Request, Response } from "express";
import mongoose from "mongoose";
import { BillModel } from "../../database/models/bill";
import { BillItemModel } from "../../database/models/billItem";
import { Product } from "../../database/models/product";
import { CompanyModel } from "../../database/models/company";
import User from "../../database/models/auth";
import { ApiResponse, StatusCode } from "../../common";
import {
  countData,
  createData,
  findOneAndPopulate,
  getFirstMatch,
  insertMany,
  responseMessage,
} from "../../helper";

interface AuthRequest extends Request {
  user?: any;
}

const BILL_USER_POPULATE_FIELDS = [
  "name",
  "medicalName",
  "email",
  "phone",
  "address",
  "state",
  "city",
  "pincode",
  "gstNumber",
  "panCardNumber",
  "role",
].join(" ");

export const createBill = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res
        .status(StatusCode.UNAUTHORIZED)
        .json(ApiResponse.error(responseMessage.accessDenied, null, StatusCode.UNAUTHORIZED));
    }

    const { companyId, items, discount = 0, userId: payloadUserId } = req.body;
    const isAdmin = req.user?.role === "ADMIN";

    if (isAdmin && !payloadUserId) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(
          ApiResponse.error(
            responseMessage.validationError("user"),
            null,
            StatusCode.BAD_REQUEST
          )
        );
    }

    const targetUserId = isAdmin ? payloadUserId : req.user?._id;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(String(targetUserId))) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.validationError("user"), null, StatusCode.BAD_REQUEST));
    }

    const targetUser = await User.findById(targetUserId).select("_id");
    if (!targetUser) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.getDataNotFound("User"), null, StatusCode.BAD_REQUEST));
    }

    if (!companyId) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.validationError("company"), null, StatusCode.BAD_REQUEST));
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.validationError("items"), null, StatusCode.BAD_REQUEST));
    }

    const companyFilter: any = { _id: companyId, isDeleted: false };
    if (!isAdmin) {
      companyFilter.userId = req.user?._id;
    } else {
      companyFilter.userId = targetUserId;
    }
    const company = await getFirstMatch(CompanyModel, companyFilter, "_id userId");
    if (!company) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(
          ApiResponse.error(
            responseMessage.validationError("company for selected user"),
            null,
            StatusCode.BAD_REQUEST
          )
        );
    }

    let subTotal = 0;
    let totalTax = 0;

    const billItems: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];

      if (!it.productId || !it.qty || !it.rate) {
        return res
          .status(StatusCode.BAD_REQUEST)
          .json(ApiResponse.error(responseMessage.validationError("item data"), null, StatusCode.BAD_REQUEST));
      }

      const product = await Product.findById(it.productId);
      if (!product) {
        return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.productNotFound, null, StatusCode.BAD_REQUEST));
      }

      const qty = Number(it.qty);
      const freeQty = Number(it.freeQty || 0);
      const rate = Number(it.rate);
      const taxPercent = Number(it.taxPercent || 0);
      const discountPercent = Number(it.discount || 0);

      const totalQty = qty + freeQty;

      if (product.stock < totalQty) {
        return res.status(400).json({
          ...ApiResponse.error(
            responseMessage.insufficientStock,
            null,
            StatusCode.BAD_REQUEST
          ),
        });
      }

      const amount = rate * qty;
      const discountAmt = (amount * discountPercent) / 100;
      const taxable = amount - discountAmt;

      const cgst = (taxable * taxPercent) / 200;
      const sgst = (taxable * taxPercent) / 200;
      const total = taxable + cgst + sgst;

      subTotal += taxable;
      totalTax += cgst + sgst;

      billItems.push({
        srNo: i + 1,
        productId: product._id,
        productName: product.name,
        category: product.category || "",

        qty,
        freeQty,
        mrp: product.mrp,
        rate,

        taxPercent,
        cgst,
        sgst,

        discount: discountPercent,
        total,
      });

      product.stock -= totalQty;
      await product.save();
    }

    const discountAmount = Number(discount || 0);
    const totalBeforeDiscount = subTotal + totalTax;

    if (discountAmount < 0) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.validationError("discount"), null, StatusCode.BAD_REQUEST));
    }

    if (discountAmount > totalBeforeDiscount) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.validationError("discount"), null, StatusCode.BAD_REQUEST));
    }

    const grandTotal = totalBeforeDiscount - discountAmount;

    const bill: any = await createData(BillModel, {
      billNo: `BILL-${Date.now()}`,
      companyId,
      userId: targetUserId,
      subTotal,
      totalTax,
      discount: discountAmount,
      grandTotal,
    });

    billItems.forEach(b => (b.billId = bill._id));
    await insertMany(BillItemModel, billItems);

    return res
        .status(StatusCode.CREATED)
      .json(ApiResponse.created(responseMessage.invoiceCreated, { billId: bill._id }));
  } catch (err: any) {
    console.error("CREATE BILL ERROR", { message: err?.message, err });

    return res
      .status(StatusCode.INTERNAL_ERROR)
      .json(ApiResponse.error(err.message || responseMessage.internalServerError, err, StatusCode.INTERNAL_ERROR));
  }
};


export const getAllBills = async (req: AuthRequest, res: Response) => {
  try {
    const { role, _id: userId } = req.user!;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search as string) || "";

    const skip = (page - 1) * limit;


    const filter: any = {
      isDeleted: false,
    };

    // USER → only own bills
    if (role !== "ADMIN") {
      filter.userId = userId;
    }

    // SEARCH
    if (search) {
      filter.$or = [
        { billNo: { $regex: search, $options: "i" } },
      ];
    }



    const bills = await BillModel.find(filter)
      .populate("companyId", "name companyName gstNumber logo address phone email state")
      .populate("userId", BILL_USER_POPULATE_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await countData(BillModel, filter);

    res.json({
      data: bills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    res.status(500).json({ message: responseMessage.internalServerError });
  }
};



export const getBillById = async (req: AuthRequest, res: Response) => {
  try {
    const bill: any = await findOneAndPopulate(
      BillModel,
      {
        _id: req.params.id,
        isDeleted: false,
      },
      undefined,
      undefined,
      [
        { path: "companyId", select: "name companyName gstNumber logo address phone email state" },
        { path: "userId", select: BILL_USER_POPULATE_FIELDS },
      ]
    );

    if (!bill)
      return res.status(404).json({ message: responseMessage.invoiceNotFound });

  
    if (
      req.user?.role !== "ADMIN" &&
      bill.userId._id.toString() !== req.user?._id.toString()
    ) {
      return res.status(403).json({ message: responseMessage.accessDenied });
    }

    const items = await BillItemModel.find({ billId: bill._id });

    res.json({ bill, items });
  } catch {
    res.status(500).json({ message: responseMessage.internalServerError });
  }
};



export const deleteBill = async (req: AuthRequest, res: Response) => {
  try {
    const bill = await BillModel.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: responseMessage.invoiceNotFound });

    const isAdmin = req.user?.role === "ADMIN";
    const isOwner = bill.userId.toString() === req.user?._id?.toString();
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: responseMessage.accessDenied });
    }

    bill.isDeleted = true;
    await bill.save();

    res.json({ message: responseMessage.deleteDataSuccess("Bill") });
  } catch (err) {
    res.status(500).json({ message: responseMessage.internalServerError });
  }
};

export const updateBill = async (req: AuthRequest, res: Response) => {
  try {
    const bill = await BillModel.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!bill)
      return res.status(404).json({ message: responseMessage.invoiceNotFound });

    // 🔐 AUTH
    const isAdmin = req.user?.role === "ADMIN";
    const isOwner = bill.userId.toString() === req.user?._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: responseMessage.accessDenied });
    }

    const { companyId, items, discount, userId: payloadUserId } = req.body;

    if (payloadUserId !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({ message: responseMessage.accessDenied });
      }
      if (!mongoose.Types.ObjectId.isValid(String(payloadUserId))) {
        return res.status(400).json({ message: "Invalid userId" });
      }
      const targetUser = await User.findById(payloadUserId).select("_id");
      if (!targetUser) {
        return res.status(400).json({ message: responseMessage.getDataNotFound("User") });
      }
      bill.userId = payloadUserId;
    }

    if (companyId) {
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ message: "Invalid companyId" });
      }
      const companyFilter: any = { _id: companyId, isDeleted: false };
      if (!isAdmin) {
        companyFilter.userId = req.user?._id;
      } else {
        companyFilter.userId = bill.userId;
      }
      const company = await getFirstMatch(CompanyModel, companyFilter, "_id");
      if (!company) {
        return res
          .status(400)
          .json({ message: responseMessage.validationError("company for selected user") });
      }
      bill.companyId = companyId;
    }

    if (Array.isArray(items) && items.length > 0) {
      const previousItems = await BillItemModel.find({ billId: bill._id });

      // Restore previous stock before applying new items.
      for (const oldItem of previousItems) {
        const product = await Product.findById(oldItem.productId);
        if (product) {
          product.stock += Number(oldItem.qty || 0) + Number(oldItem.freeQty || 0);
          await product.save();
        }
      }

      let subTotal = 0;
      let totalTax = 0;
      const nextItems: any[] = [];

      for (let i = 0; i < items.length; i++) {
        const it = items[i];

        if (!it.productId || !it.qty || !it.rate) {
          return res.status(400).json({ message: "Invalid item data" });
        }

        if (!mongoose.Types.ObjectId.isValid(it.productId)) {
          return res.status(400).json({ message: "Invalid productId in items" });
        }

        const product = await Product.findById(it.productId);
        if (!product) {
          return res.status(400).json({ message: responseMessage.productNotFound });
        }

        const qty = Number(it.qty);
        const freeQty = Number(it.freeQty || 0);
        const rate = Number(it.rate);
        const taxPercent = Number(it.taxPercent || 0);
        const discountPercent = Number(it.discount || 0);
        const totalQty = qty + freeQty;

        if (qty <= 0 || rate <= 0) {
          return res.status(400).json({ message: "Invalid qty/rate in items" });
        }

        if (product.stock < totalQty) {
          return res.status(400).json({
            message: responseMessage.insufficientStock,
          });
        }

        const amount = rate * qty;
        const discountAmt = (amount * discountPercent) / 100;
        const taxable = amount - discountAmt;
        const cgst = (taxable * taxPercent) / 200;
        const sgst = (taxable * taxPercent) / 200;
        const total = taxable + cgst + sgst;

        subTotal += taxable;
        totalTax += cgst + sgst;

        nextItems.push({
          billId: bill._id,
          srNo: i + 1,
          productId: product._id,
          productName: product.name,
          category: product.category || "",
          qty,
          freeQty,
          mrp: product.mrp,
          rate,
          taxPercent,
          cgst,
          sgst,
          discount: discountPercent,
          total,
        });

        product.stock -= totalQty;
        await product.save();
      }

      await BillItemModel.deleteMany({ billId: bill._id });
      await insertMany(BillItemModel, nextItems);

      bill.subTotal = subTotal;
      bill.totalTax = totalTax;
    }

    const discountAmount = Number(discount ?? bill.discount ?? 0);
    const totalBeforeDiscount = Number(bill.subTotal || 0) + Number(bill.totalTax || 0);

    if (discountAmount < 0) {
      return res.status(400).json({ message: "Discount cannot be negative" });
    }

    if (discountAmount > totalBeforeDiscount) {
      return res.status(400).json({ message: "Discount cannot exceed bill amount" });
    }

    bill.discount = discountAmount;
    bill.grandTotal = totalBeforeDiscount - discountAmount;

    await bill.save();

    res.json({
      message: responseMessage.updateDataSuccess("Bill"),
      bill,
    });
  } catch {
    res.status(500).json({ message: responseMessage.internalServerError });
  }
};


