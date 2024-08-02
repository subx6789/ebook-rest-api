import express from "express";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import createHttpError from "http-errors";

const app = express();

//Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to elibraryee apis" });
});
//Global error handler
app.use(globalErrorHandler);
export default app;
