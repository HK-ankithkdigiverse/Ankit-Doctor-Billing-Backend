export const responseMessage = {
  // 🔐 AUTH
loginSuccess: "Login successful!",
signupSuccess: "Account created successfully!",
invalidUserPasswordEmail: "You have entered an invalid email or password!",
invalidToken: "Invalid token!",
tokenExpired: "Token has expired!",
  accountBlock: "Your account has been blocked!",
  accountInactive: "Your account is inactive. Please contact admin.",
  logout: "Logout successful!",


  // 🏢 ACCESS
  accessDenied: "Access denied!",

  // 🏢 COMPANY
  companyInactive: "This company is inactive!",

  // 🗂 CATEGORY / TYPE
  categoryNotFound: "Category not found!",
  typeNotFound: "Type not found!",

  // 💊 PRODUCT
  productNotFound: "Product not found!",
  insufficientStock: "Insufficient stock available!",
  productExpired: "This product has expired!",

  // 📦 INVOICE
  invoiceNotFound: "Invoice not found!",
  invoiceCreated: "Invoice created successfully!",

  // 🌍 COMMON
  internalServerError:
    "Something went wrong. Please try again later!",

  validationError: (field: string): string =>
    `${field.charAt(0).toUpperCase()}${field.slice(1)} is required!`,

  dataAlreadyExist: (name: string): string =>
    `${name} already exists!`,

  addDataSuccess: (name: string): string =>
    `${name} successfully added!`,

  updateDataSuccess: (name: string): string =>
    `${name} successfully updated!`,

  deleteDataSuccess: (name: string): string =>
    `${name} successfully deleted!`,

  getDataNotFound: (name: string): string =>
    `${name} not found!`,
};
