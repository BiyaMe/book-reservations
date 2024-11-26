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
	console.log(process.env.MONGO_URL);
	// jest.setTimeout(10000);
	await mongoose.connect(process.env.MONGO_URL, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});

	console.log("connected");
	// delete all users
	await User.deleteMany();
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

// ... existing code ...
describe("User Routes", () => {
	let token;
	let adminToken;
	let userId;
    let adminId;

	beforeEach(async () => {
		// Create and approve a regular user
		const userResponse = await request(app).post("/api/auth/register").send({
			name: "Test User",
			email: "testuser@example.com",
			password: "password123",
			phoneNumber: "01010101010"
		});

        token = userResponse.body.token;
		userId = userResponse.body.userId;

		// Create and approve an admin user
		const adminResponse = await request(app).post("/api/auth/register").send({
			name: "Admin User",
			email: "admin@example.com",
			password: "password123",
			phoneNumber: "01010101011",
		});

        
		adminToken = adminResponse.body.token;
		adminId = adminResponse.body.userId;

        // update database to approve user
        await User.findByIdAndUpdate(adminId, { isApproved: true, isAdmin: true });

        // login with admin
        const adminLoginResponse = await request(app).post("/api/auth/login").send({
            email: "admin@example.com",
            password: "password123",
        });

        adminToken = adminLoginResponse.body.token;
        
		// Approve the regular user using admin
		const response = await request(app)
			.put(`/api/users/${userId}/approve`)
			.set("x-auth-token", adminToken);

        // login with user
        const userLoginResponse = await request(app).post("/api/auth/login").send({
            email: "testuser@example.com",
            password: "password123",
        });
        
        token = userLoginResponse.body.token;

	});

	it("should get user by ID", async () => {
        
        // get user by id
        const response = await request(app)
            .get(`/api/users/${userId}`)
            .set("x-auth-token", adminToken);

        expect(response.body).toHaveProperty("name", "Test User");
	});

	it("should update user details", async () => {

		const response = await request(app)
			.put(`/api/users/${userId}`)
			.set("x-auth-token", token)
			.send({
				name: "Updated Name",
				phoneNumber: "02020202020"
			});

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty("name", "Updated Name");
		expect(response.body).toHaveProperty("phoneNumber", "02020202020");
	});

	it("should not allow unauthorized user update", async () => {
		// Create first user
		const userResponse = await request(app).post("/api/auth/register").send({
			name: "Test User 3",
			email: "testuser3@example.com", 
			password: "password123",
			phoneNumber: "01010101015"
		});
		const targetUserId = userResponse.body.userId;

		// Create second user (the unauthorized one)
		const otherUserResponse = await request(app).post("/api/auth/register").send({
			name: "Other User",
			email: "other@example.com",
			password: "password123",
			phoneNumber: "03030303030"
		});
		const otherToken = otherUserResponse.body.token;

		await request(app)
			.put(`/api/users/${targetUserId}/approve`)
			.set("x-auth-token", adminToken);
		await request(app)
			.put(`/api/users/${otherUserResponse.body.userId}/approve`)
			.set("x-auth-token", adminToken);

		const response = await request(app)
			.put(`/api/users/${targetUserId}`)
			.set("x-auth-token", otherToken)
			.send({
				name: "Unauthorized Update"
			});

		expect(response.statusCode).toBe(403);
		expect(response.body).toHaveProperty("message", "Not authorized to update this user");
	});

	it("should allow admin to get all users", async () => {

		const response = await request(app)
			.get("/api/users")
			.set("x-auth-token", adminToken);

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body.length).toBeGreaterThan(0);
	});

	it("should not allow regular user to get all users", async () => {
		const response = await request(app)
			.get("/api/users")
			.set("x-auth-token", token);

		expect(response.statusCode).toBe(403);
	});
});
