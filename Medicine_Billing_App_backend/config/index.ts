import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
};

export default config;
