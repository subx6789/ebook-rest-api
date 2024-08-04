import { NextFunction, Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import path from "node:path";
import createHttpError from "http-errors";
import bookModel from "./bookModel";
import fs from "node:fs";
import { AuthRequest } from "../middlewares/authenticate";

/**
 * Create a new book
 */
const createBook = async (req: Request, res: Response, next: NextFunction) => {
  const { title, description, genre } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!files.coverImage || !files.file) {
    return next(createHttpError(400, "Cover image and book file are required"));
  }

  const coverImageMimeType = files.coverImage[0].mimetype.split("/").at(-1);
  const fileName = files.coverImage[0].filename;
  const filePath = path.resolve(
    __dirname,
    "../../public/data/uploads",
    fileName
  );

  const bookMimeType = files.file[0].mimetype.split("/").at(-1);
  const bookFileName = files.file[0].filename;
  const bookFilePath = path.resolve(
    __dirname,
    "../../public/data/uploads",
    bookFileName
  );

  try {
    // Upload cover image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      filename_override: fileName,
      folder: "book-covers",
      format: coverImageMimeType,
    });

    // Upload book file to Cloudinary
    const bookFileUploadResult = await cloudinary.uploader.upload(
      bookFilePath,
      {
        resource_type: "raw",
        filename_override: bookFileName,
        folder: "book-pdfs",
        format: bookMimeType,
      }
    );

    const _req = req as AuthRequest;

    // Create new book in database
    const newBook = await bookModel.create({
      title,
      description,
      genre,
      author: _req.userId,
      coverImage: uploadResult.secure_url,
      file: bookFileUploadResult.secure_url,
    });

    // Delete temporary files
    await Promise.all([
      fs.promises.unlink(filePath),
      fs.promises.unlink(bookFilePath),
    ]);

    res.status(201).json({ id: newBook._id });
  } catch (err) {
    // Clean up temporary files in case of error
    try {
      await Promise.all([
        fs.promises.unlink(filePath),
        fs.promises.unlink(bookFilePath),
      ]);
    } catch (unlinkErr) {
      console.error("Error deleting temporary files:", unlinkErr);
    }
    return next(createHttpError(500, "Error while uploading the files"));
  }
};

/**
 * Update an existing book
 */
const updateBook = async (req: Request, res: Response, next: NextFunction) => {
  const { title, description, genre } = req.body;
  const bookId = req.params.bookId;

  try {
    const book = await bookModel.findOne({ _id: bookId });
    if (!book) {
      return next(createHttpError(404, "Book not found"));
    }

    const _req = req as AuthRequest;
    if (book.author.toString() !== _req.userId) {
      return next(createHttpError(403, "Unauthorized"));
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    let completeCoverImage = book.coverImage;
    let completeFileName = book.file;

    // Handle cover image update
    if (files.coverImage) {
      const oldCoverFileSplits = book.coverImage.split("/");
      const oldCoverImagePublicId = `${oldCoverFileSplits.at(
        -2
      )}/${oldCoverFileSplits.at(-1)?.split(".").at(-2)}`;

      try {
        await cloudinary.uploader.destroy(oldCoverImagePublicId);
      } catch (destroyErr) {
        console.error("Error deleting old cover image:", destroyErr);
      }

      const filename = files.coverImage[0].filename;
      const coverMimeType = files.coverImage[0].mimetype.split("/").at(-1);
      const filePath = path.resolve(
        __dirname,
        "../../public/data/uploads",
        filename
      );

      try {
        const uploadResult = await cloudinary.uploader.upload(filePath, {
          filename_override: filename,
          folder: "book-covers",
          format: coverMimeType,
        });
        completeCoverImage = uploadResult.secure_url;
      } catch (uploadErr) {
        console.error("Error uploading new cover image:", uploadErr);
        return next(createHttpError(500, "Error uploading new cover image"));
      } finally {
        await fs.promises.unlink(filePath);
      }
    }

    // Handle book file update
    if (files.file) {
      const oldBookFileSplits = book.file.split("/");
      const oldBookFilePublicId = `${oldBookFileSplits.at(
        -2
      )}/${oldBookFileSplits.at(-1)}`;

      try {
        await cloudinary.uploader.destroy(oldBookFilePublicId, {
          resource_type: "raw",
        });
      } catch (destroyErr) {
        console.error("Error deleting old book file:", destroyErr);
      }

      const bookMimeType = files.file[0].mimetype.split("/").at(-1);
      const bookFilePath = path.resolve(
        __dirname,
        "../../public/data/uploads",
        files.file[0].filename
      );
      const bookFileName = files.file[0].filename;

      try {
        const uploadResultPdf = await cloudinary.uploader.upload(bookFilePath, {
          resource_type: "raw",
          filename_override: bookFileName,
          folder: "book-pdfs",
          format: bookMimeType,
        });
        completeFileName = uploadResultPdf.secure_url;
      } catch (uploadErr) {
        console.error("Error uploading new book file:", uploadErr);
        return next(createHttpError(500, "Error uploading new book file"));
      } finally {
        await fs.promises.unlink(bookFilePath);
      }
    }

    // Update the book in the database
    const updatedBook = await bookModel.findOneAndUpdate(
      { _id: bookId },
      {
        title: title,
        description: description,
        genre: genre,
        coverImage: completeCoverImage,
        file: completeFileName,
      },
      { new: true }
    );

    res.json(updatedBook);
  } catch (err) {
    return next(createHttpError(500, "Error while updating the book"));
  }
};

/**
 * List all books
 */
const listBooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const books = await bookModel.find().populate("author", "name");
    res.json(books);
  } catch (err) {
    return next(createHttpError(500, "Error while getting all books"));
  }
};

/**
 * Get a single book by ID
 */
const getSingleBook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bookId = req.params.bookId;
  if (!bookId) {
    return next(createHttpError(400, "Book ID is required"));
  }

  try {
    const book = await bookModel.findById(bookId).populate("author", "name");
    if (!book) {
      return next(createHttpError(404, "Book not found"));
    }
    res.json(book);
  } catch (err) {
    next(createHttpError(500, "Error while getting the book"));
  }
};

/**
 * Delete a book
 */
const deleteBook = async (req: Request, res: Response, next: NextFunction) => {
  const bookId = req.params.bookId;
  if (!bookId) {
    return next(createHttpError(400, "Book ID is required"));
  }

  try {
    const book = await bookModel.findById(bookId);
    if (!book) {
      return next(createHttpError(404, "Book not found"));
    }

    const _req = req as AuthRequest;
    if (book.author.toString() !== _req.userId) {
      return next(createHttpError(403, "Unauthorized"));
    }

    const coverFileSplits = book.coverImage.split("/");
    const coverImagePublicId = `${coverFileSplits.at(-2)}/${coverFileSplits
      .at(-1)
      ?.split(".")
      .at(-2)}`;

    const bookFileSplits = book.file.split("/");
    const bookFilePublicId = `${bookFileSplits.at(-2)}/${bookFileSplits.at(
      -1
    )}`;

    // Delete files from Cloudinary
    await Promise.all([
      cloudinary.uploader.destroy(coverImagePublicId),
      cloudinary.uploader.destroy(bookFilePublicId, { resource_type: "raw" }),
    ]);

    // Delete book from database
    await bookModel.findByIdAndDelete(bookId);

    res.sendStatus(204);
  } catch (err) {
    next(createHttpError(500, "Error while deleting the book"));
  }
};

export { createBook, updateBook, listBooks, getSingleBook, deleteBook };
