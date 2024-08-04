# elibraryee

elibraryee is a REST API backend built with Node.js, Express, and MongoDB using Mongoose ODM. This project provides functionality for managing eBooks, including authentication, ebook creation, updating, deletion, and retrieving book details.

## Features

- Password hashing using bcrypt
- JWT token generation
- eBook Management

- Create an eBook by uploading the eBook file, cover image, genre, title, and description
- Update the eBook file, cover image, title, description, or genre
- Delete an eBook

- List all books
- Get a single book by book ID

## Tech Stack

- Node.js
- Express
- MongoDB
- Mongoose ODM
- bcrypt
- JWT

## Installation

**Clone the repository:**

   ```bash
    git clone https://github.com/subx6789/ebook-rest-api.git
    cd elibraryee
   ``` 

**Install dependencies:**

   ```bash
    npm install
   ``` 

**Create a .env file in the root directory and add the .env.example environment variables:**

**Start the server:**

   ```bash
    npm run dev
   ``` 

## API Endpoints

**Authentication**

- Register a new user

POST `/api/users/register`

- Login a user

POST `/api/users/login`

- **eBook Management (Authorized Routes)**

- Create a new eBook

POST `/api/books`

Headers: { Authorization: 'Bearer <token>' }

- Update an eBook

PUT `/api/books/:bookId`

Headers: { Authorization: 'Bearer <token>' }

- Delete an eBook

DELETE `/api/books/:bookId`

Headers: { Authorization: 'Bearer <token>' }

- **Public Routes**

- List all books

GET `/api/books`

- Get a single book by ID

GET `/api/books/:bookId`

## Contributing

Feel free to fork this project and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.