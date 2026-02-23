import { Request, Response, NextFunction } from "express";
import { ApiResponse, StatusCode } from "../common";
import { responseMessage } from "../helper";

export const validate =
  (schema: any, property: "body" | "params" | "query" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
    });

    if (error) {
      const errors = error.details.map((d) => d.message);
      return res
        .status(StatusCode.BAD_REQUEST)
        .json(ApiResponse.error(responseMessage.validationError("request"), errors, StatusCode.BAD_REQUEST));
    }

    next();
  };
  
