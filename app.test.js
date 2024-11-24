const request = require("supertest");
const express = require("express");
require("dotenv").config();

const mongoose = require("mongoose");
const authRouter = require("./routes/auth"); // Adjust the path as necessary
const userRouter = require("./routes/users"); // Adjust the path as necessary
const reservationRouter = require("./routes/reservations"); // Adjust the path as necessary
const notificationRouter = require("./routes/notifications"); // Adjust the path as necessary
const bookRouter = require("./routes/books"); // Adjust the path as necessary
const User = require("./models/User"); // Adjust the path as necessary
const Reservation = require("./models/Reservation"); // Adjust the path as necessary
const Notification = require("./models/Notification"); // Adjust the path as necessary
const Book = require("./models/Book"); // Adjust the path as necessary

// Create an Express app for testing
const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/reservations", reservationRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/books", bookRouter);

// Connect to the database before all tests
beforeAll(async () => {
	await mongoose.connect(process.env.MONGO_URL, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});
	console.log("connected");
});

// Clean up the database after each test
afterEach(async () => {
	await User.deleteMany({});
	await Reservation.deleteMany({});
	await Notification.deleteMany({});
	await Book.deleteMany({});
});

// Close the database connection after all tests
afterAll(async () => {
	await mongoose.connection.close();
});

describe("Auth Routes", () => {
	it("should register a new user", async () => {
		jest.setTimeout(10000);
		const response = await request(app).post("/api/auth/register").send({
			name: "Test User",
			email: "test@example.com",
			password: "password123",
			phoneNumber: "01010101010",
		});

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty("token");
	});

	it("should not log in unapproved user", async () => {
		// First, register the user
		await request(app).post("/api/auth/register").send({
			name: "Test User",
			email: "test@example.com",
			password: "password123",
			phoneNumber: "01010101010",
		});

		// Now, attempt to log in
		const response = await request(app).post("/api/auth/login").send({
			email: "test@example.com",
			password: "password123",
		});

		expect(response.statusCode).toBe(403);
		expect(response.body).toHaveProperty(
			"message",
			"Your account is pending approval"
		); // Assuming your login returns a token
	});

	it("should return an error for incorrect login", async () => {
		const response = await request(app).post("/api/auth/login").send({
			email: "nonexistent@example.com",
			password: "wrongpassword",
		});

		expect(response.statusCode).toBe(400);
		expect(response.body).toHaveProperty("message", "Invalid credentials");
	});
});

// describe('User Routes', () => {
//     let token;

//     beforeAll(async () => {
//         // Register a user and get a token for authentication (assuming a register route exists)
//         const response = await request(app)
//             .post('/api/auth/register')
//             .send({
//                 name: 'Admin User',
//                 email: 'admin@example.com',
//                 password: 'password123',
//             });

//         // Simulate login to get a token
//         const loginResponse = await request(app)
//             .post('/api/auth/login')
//             .send({
//                 email: 'admin@example.com',
//                 password: 'password123',
//             });

//         token = loginResponse.body.token; // Assuming your login returns a token
//     });

//     it('should get all users (admin only)', async () => {
//         // Create some users
//         await User.create([
//             { name: 'User One', email: 'user1@example.com', phoneNumber: '1234567890', password: 'password123' },
//             { name: 'User Two', email: 'user2@example.com', phoneNumber: '0987654321', password: 'password123' },
//         ]);

//         const response = await request(app)
//             .get('/api/users')
//             .set('Authorization', `Bearer ${token}`); // Use the admin token

//         expect(response.statusCode).toBe(200);
//         expect(Array.isArray(response.body)).toBe(true);
//         expect(response.body.length).toBe(2); // Expecting two users created
//     });

//     it('should get a user by ID', async () => {
//         const user = await User.create({
//             name: 'User Three',
//             email: 'user3@example.com',
//             phoneNumber: '1234567890',
//             password: 'password123',
//         });

//         const response = await request(app)
//             .get(`/api/users/${user._id}`)
//             .set('Authorization', `Bearer ${token}`);

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toHaveProperty('email', 'user3@example.com');
//     });

//     it('should update a user', async () => {
//         const user = await User.create({
//             name: 'User Four',
//             email: 'user4@example.com',
//             phoneNumber: '1234567890',
//             password: 'password123',
//         });

//         const response = await request(app)
//             .put(`/api/users/${user._id}`)
//             .set('Authorization', `Bearer ${token}`)
//             .send({ name: 'Updated User Four' });

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toHaveProperty('name', 'Updated User Four');
//     });

//     it('should approve a user (admin only)', async () => {
//         const user = await User.create({
//             name: 'User Five',
//             email: 'user5@example.com',
//             phoneNumber: '1234567890',
//             password: 'password123',
//             isApproved: false,
//         });

//         const response = await request(app)
//             .put(`/api/users/${user._id}/approve`)
//             .set('Authorization', `Bearer ${token}`);

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toHaveProperty('isApproved', true);
//     });
// });

// describe('Reservation Routes', () => {
//     let token;

//     beforeAll(async () => {
//         // Register and log in a user to get a token for authentication
//         const userResponse = await request(app)
//             .post('/api/auth/register')
//             .send({
//                 name: 'Test User',
//                 email: 'test@example.com',
//                 password: 'password123',
//             });

//         const loginResponse = await request(app)
//             .post('/api/auth/login')
//             .send({
//                 email: 'test@example.com',
//                 password: 'password123',
//             });

//         token = loginResponse.body.token; // Assuming your login returns a token
//     });

//     it('should create a new reservation', async () => {
//         const response = await request(app)
//             .post('/api/reservations')
//             .set('Authorization', `Bearer ${token}`) // Use the user token
//             .send({
//                 user: 'someUserId', // Replace with a valid user ID
//                 book: 'someBookId', // Replace with a valid book ID
//                 startDate: new Date(),
//                 endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week later
//             });

//         expect(response.statusCode).toBe(201);
//         expect(response.body).toHaveProperty('message', 'Reservation created successfully');
//     });

//     it('should get all reservations (admin only)', async () => {
//         // Create a reservation
//         await request(app)
//             .post('/api/reservations')
//             .set('Authorization', `Bearer ${token}`)
//             .send({
//                 user: 'someUserId', // Replace with a valid user ID
//                 book: 'someBookId', // Replace with a valid book ID
//                 startDate: new Date(),
//                 endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//             });

//         // Admin login (you may need to create an admin user)
//         const adminResponse = await request(app)
//             .post('/api/auth/register')
//             .send({
//                 name: 'Admin User',
//                 email: 'admin@example.com',
//                 password: 'password123',
//             });

//         const adminLoginResponse = await request(app)
//             .post('/api/auth/login')
//             .send({
//                 email: 'admin@example.com',
//                 password: 'password123',
//             });

//         const adminToken = adminLoginResponse.body.token;

//         const response = await request(app)
//             .get('/api/reservations')
//             .set('Authorization', `Bearer ${adminToken}`);

//         expect(response.statusCode).toBe(200);
//         expect(Array.isArray(response.body)).toBe(true);
//     });

//     it('should get a reservation by ID', async () => {
//         const reservation = await request(app)
//             .post('/api/reservations')
//             .set('Authorization', `Bearer ${token}`)
//             .send({
//                 user: 'someUserId', // Replace with a valid user ID
//                 book: 'someBookId', // Replace with a valid book ID
//                 startDate: new Date(),
//                 endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//             });

//         const response = await request(app)
//             .get(`/api/reservations/${reservation.body._id}`)
//             .set('Authorization', `Bearer ${token}`);

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toHaveProperty('_id', reservation.body._id);
//     });

//     it('should update a reservation status (admin only)', async () => {
//         const reservation = await request(app)
//             .post('/api/reservations')
//             .set('Authorization', `Bearer ${token}`)
//             .send({
//                 user: 'someUserId', // Replace with a valid user ID
//                 book: 'someBookId', // Replace with a valid book ID
//                 startDate: new Date(),
//                 endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//             });

//         const adminResponse = await request(app)
//             .post('/api/auth/register')
//             .send({
//                 name: 'Admin User',
//                 email: 'admin@example.com',
//                 password: 'password123',
//             });

//         const adminLoginResponse = await request(app)
//             .post('/api/auth/login')
//             .send({
//                 email: 'admin@example.com',
//                 password: 'password123',
//             });

//         const adminToken = adminLoginResponse.body.token;

//         const response = await request(app)
//             .put(`/api/reservations/${reservation.body._id}`)
//             .set('Authorization', `Bearer ${adminToken}`)
//             .send({ status: 'approved' });

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toHaveProperty('status', 'approved');
//     });
// });

// describe('Notification Routes', () => {
//     let token;

//     beforeAll(async () => {
//         // Register and log in a user to get a token for authentication
//         const userResponse = await request(app)
//             .post('/api/auth/register')
//             .send({
//                 name: 'Test User',
//                 email: 'test@example.com',
//                 password: 'password123',
//             });

//         const loginResponse = await request(app)
//             .post('/api/auth/login')
//             .send({
//                 email: 'test@example.com',
//                 password: 'password123',
//             });

//         token = loginResponse.body.token; // Assuming your login returns a token
//     });

//     it('should get notifications for the user', async () => {
//         // Create a notification
//         await Notification.create({
//             user: 'someUserId', // Replace with a valid user ID
//             message: 'Your reservation has been approved.',
//             type: 'reservation_status',
//             isRead: false,
//         });

//         const response = await request(app)
//             .get('/api/notifications')
//             .set('Authorization', `Bearer ${token}`); // Use the user token

//         expect(response.statusCode).toBe(200);
//         expect(Array.isArray(response.body)).toBe(true);
//         expect(response.body.length).toBeGreaterThan(0); // Expecting at least one notification
//     });
// });

// describe('Book Routes', () => {
//     let token;

//     beforeAll(async () => {
//         // Register and log in an admin user to get a token for authentication
//         const adminResponse = await request(app)
//             .post('/api/auth/register')
//             .send({
//                 name: 'Admin User',
//                 email: 'admin@example.com',
//                 password: 'password123',
//             });

//         const loginResponse = await request(app)
//             .post('/api/auth/login')
//             .send({
//                 email: 'admin@example.com',
//                 password: 'password123',
//             });

//         token = loginResponse.body.token; // Assuming your login returns a token
//     });

//     it('should get all books', async () => {
//         // Create sample books
//         await Book.create([
//             { title: 'Book One', author: 'Author One', publicationDate: new Date(), description: 'Description One' },
//             { title: 'Book Two', author: 'Author Two', publicationDate: new Date(), description: 'Description Two' },
//         ]);

//         const response = await request(app)
//             .get('/api/books');

//         expect(response.statusCode).toBe(200);
//         expect(Array.isArray(response.body)).toBe(true);
//         expect(response.body.length).toBe(2); // Expecting two books created
//     });

//     it('should get a book by ID', async () => {
//         const book = await Book.create({
//             title: 'Book Three',
//             author: 'Author Three',
//             publicationDate: new Date(),
//             description: 'Description Three',
//         });

//         const response = await request(app)
//             .get(`/api/books/${book._id}`);

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toHaveProperty('title', 'Book Three');
//     });

//     it('should add a new book (admin only)', async () => {
//         const response = await request(app)
//             .post('/api/books')
//             .set('Authorization', `Bearer ${token}`) // Use the admin token
//             .send({
//                 title: 'Book Four',
//                 author: 'Author Four',
//                 publicationDate: new Date(),
//                 description: 'Description Four',
//             });

//         expect(response.statusCode).toBe(201);
//         expect(response.body).toHaveProperty('message', 'Book added successfully');
//     });

//     it('should update a book (admin only)', async () => {
//         const book = await Book.create({
//             title: 'Book Five',
//             author: 'Author Five',
//             publicationDate: new Date(),
//             description: 'Description Five',
//         });

//         const response = await request(app)
//             .put(`/api/books/${book._id}`)
//             .set('Authorization', `Bearer ${token}`) // Use the admin token
//             .send({
//                 title: 'Updated Book Five',
//                 author: 'Updated Author Five',
//             });

//         expect(response.statusCode).toBe(200);
//         expect(response.body).toHaveProperty('title', 'Updated Book Five');
//     });
// });
