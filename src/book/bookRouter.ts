import express from "express";
import {
  createBook,
  deleteBook,
  getSingleBook,
  listBooks,
  updateBook,
} from "./bookController";
import multer from "multer";
import path from "node:path";
import authenticate from "../middlewares/authenticate";
const bookRouter = express.Router();
const upload = multer({
  dest: path.resolve(__dirname, "../../public/data/uploads"),
  limits: { fileSize: 1e7 },
});
//routes
/**
 * Create Book
 */
bookRouter.post(
  "/",
  authenticate,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  createBook
);
/**
 * Update Book
 */
bookRouter.put(
  "/:bookId",
  authenticate,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  updateBook
);
/**
 * List Books
 */
bookRouter.get("/", listBooks);
/**
 * Get Book
 */
bookRouter.get("/:bookId", getSingleBook);
/**
 * Delete Book
 */
bookRouter.delete("/:bookId", authenticate, deleteBook);

export default bookRouter;
