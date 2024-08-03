import { NextFunction, Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import path from "node:path";
import createHttpError from "http-errors";
import bookModel from "./bookModel";
import fs from "node:fs";
import { AuthRequest } from "../middlewares/authenticate";
const createBook = async (req: Request, res: Response, next: NextFunction) => {
  const { title, genre } = req.body;

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

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
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      filename_override: fileName,
      folder: "book-covers",
      format: coverImageMimeType,
    });

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
    const newBook = await bookModel.create({
      title,
      genre,
      author: _req.userId,
      coverImage: uploadResult.secure_url,
      file: bookFileUploadResult.secure_url,
    });

    //Delete temp files
    await fs.promises.unlink(filePath);
    await fs.promises.unlink(bookFilePath);

    res.status(201).json({ id: newBook._id });
  } catch (err) {
    return next(createHttpError(500, "Error while uploading the files"));
  }
};

const updateBook = async (req: Request, res: Response, next: NextFunction) => {
  const { title, genre } = req.body;
  const bookId = req.params.bookId;
  const book = await bookModel.findOne({ _id: bookId });
  if (!book) {
    return next(createHttpError(404, "Book not found"));
  }
  const _req = req as AuthRequest;
  if (book.author.toString() !== _req.userId) {
    return next(createHttpError(403, "Unauthorized"));
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  let completeCoverImage = "";

  if (files.coverImage) {
    const filename = files.coverImage[0].filename;

    const coverMimeType = files.coverImage[0].mimetype.split("/").at(-1);

    const filePath = path.resolve(
      __dirname,
      "../../public/data/uploads/" + filename
    );

    completeCoverImage = filename;

    const uploadResult = await cloudinary.uploader.upload(filePath, {
      filename_override: completeCoverImage,
      folder: "book-covers",
      format: coverMimeType,
    });

    completeCoverImage = uploadResult.secure_url;

    await fs.promises.unlink(filePath);
  }
  let completeFileName = "";
  const bookMimeType = files.file[0].mimetype.split("/").at(-1);
  if (files.file) {
    const bookFilePath = path.resolve(
      __dirname,
      "../../public/data/uploads/" + files.file[0].filename
    );
    const bookFileName = files.file[0].filename;
    completeFileName = bookFileName;
    const uploadResultPdf = await cloudinary.uploader.upload(bookFilePath, {
      resource_type: "raw",
      filename_override: completeFileName,
      folder: "book-pdfs",
      format: bookMimeType,
    });
    completeFileName = uploadResultPdf.secure_url;
    await fs.promises.unlink(bookFilePath);
  }
  const updatedBook = await bookModel.findOneAndUpdate(
    {
      _id: bookId,
    },
    {
      title: title,
      genre: genre,
      coverImage: completeCoverImage ? completeCoverImage : book.coverImage,
      file: completeFileName ? completeFileName : book.file,
    },
    {
      new: true,
    }
  );
  res.json(updatedBook);
};

const listBooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await bookModel.find();
    res.json(book);
  } catch (err) {
    return next(createHttpError(500, "Error while getting all books"));
  }
};

const getSingleBook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bookId = req.params.bookId;
  if (!bookId) {
    next(createHttpError(404, "Book not found"));
  }
  try {
    const book = await bookModel.findById({ _id: bookId });
    if (!book) {
      next(createHttpError(404, "Book not found"));
    }
    res.json(book);
  } catch (err) {
    next(createHttpError(500, "Error while getting the book"));
  }
};

const deleteBook = async (req: Request, res: Response, next: NextFunction) => {
  const bookId = req.params.bookId;
  if (!bookId) {
    return next(createHttpError(404, "Book not found"));
  }
  const book = await bookModel.findById({ _id: bookId });
  if (!book) {
    return next(createHttpError(404, "Book not found"));
  }
  const _req = req as AuthRequest;
  if (book.author.toString() !== _req.userId) {
    return next(createHttpError(403, "Unauthorized"));
  }
  try {
    const coverFileSplits = book.coverImage.split("/");
    const coverImagePublicId =
      coverFileSplits.at(-2) + "/" + coverFileSplits.at(-1)?.split(".").at(-2);

    const bookFileSplits = book.file.split("/");
    const bookFilePublicId =
      bookFileSplits.at(-2) + "/" + bookFileSplits.at(-1);

    await cloudinary.uploader.destroy(coverImagePublicId);
    await cloudinary.uploader.destroy(bookFilePublicId, {
      resource_type: "raw",
    });
    await bookModel.findByIdAndDelete({ _id: bookId });
    res.sendStatus(204);
  } catch (err) {
    next(createHttpError(500, "Error while deleting the book"));
  }
};

export { createBook, updateBook, listBooks, getSingleBook, deleteBook };
