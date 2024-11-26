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

describe("Book Routes", () => {
    let token;
    let adminToken;
    let userId;
    let adminId;
    let bookId;

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

        // Update database to approve user and set admin status
        await User.findByIdAndUpdate(adminId, { isApproved: true, isAdmin: true });

        // Login with admin
        const adminLoginResponse = await request(app).post("/api/auth/login").send({
            email: "admin@example.com",
            password: "password123",
        });

        adminToken = adminLoginResponse.body.token;

        // Approve the regular user using admin
        await request(app)
            .put(`/api/users/${userId}/approve`)
            .set("x-auth-token", adminToken);

        // Login with regular user
        const userLoginResponse = await request(app).post("/api/auth/login").send({
            email: "testuser@example.com",
            password: "password123",
        });
        
        token = userLoginResponse.body.token;

        // Create a test book
        const bookResponse = await request(app)
            .post("/api/books")
            .set("x-auth-token", adminToken)
            .send({
                title: "Test Book",
                author: "Test Author",
                publicationDate: "2023-01-01",
                description: "Test Description"
            });

        bookId = bookResponse.body._id;
    });

    it("should get all books", async () => {
        const response = await request(app)
            .get("/api/books")
            .set("x-auth-token", token);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
    });

    it("should get a specific book by ID", async () => {
        const response = await request(app)
            .get(`/api/books/${bookId}`)
            .set("x-auth-token", token);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("title", "Test Book");
        expect(response.body).toHaveProperty("author", "Test Author");
    });

    it("should allow admin to add a new book", async () => {
        const response = await request(app)
            .post("/api/books")
            .set("x-auth-token", adminToken)
            .send({
                title: "New Book",
                author: "New Author",
                publicationDate: "2024-01-01",
                description: "New Description"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("title", "New Book");
        expect(response.body).toHaveProperty("author", "New Author");
    });

    it("should not allow regular user to add a book", async () => {
        const response = await request(app)
            .post("/api/books")
            .set("x-auth-token", token)
            .send({
                title: "Unauthorized Book",
                author: "Unauthorized Author",
                publicationDate: "2024-01-01",
                description: "Unauthorized Description"
            });

        expect(response.statusCode).toBe(403);
    });

    it("should allow admin to update a book", async () => {
        const response = await request(app)
            .put(`/api/books/${bookId}`)
            .set("x-auth-token", adminToken)
            .send({
                title: "Updated Book",
                author: "Updated Author"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("title", "Updated Book");
        expect(response.body).toHaveProperty("author", "Updated Author");
    });

    it("should not allow regular user to update a book", async () => {
        const response = await request(app)
            .put(`/api/books/${bookId}`)
            .set("x-auth-token", token)
            .send({
                title: "Unauthorized Update"
            });

        expect(response.statusCode).toBe(403);
    });

    it("should return 404 for non-existent book", async () => {
        const fakeBookId = "507f1f77bcf86cd799439011"; // Random valid MongoDB ObjectId
        const response = await request(app)
            .get(`/api/books/${fakeBookId}`)
            .set("x-auth-token", token);

        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty("message", "Book not found");
    });
});

describe("Reservation Routes", () => {
    let token;
    let adminToken;
    let userId;
    let adminId;
    let bookId;
    let reservationId;

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

        // Update database to approve user and set admin status
        await User.findByIdAndUpdate(adminId, { isApproved: true, isAdmin: true });

        // Login with admin
        const adminLoginResponse = await request(app).post("/api/auth/login").send({
            email: "admin@example.com",
            password: "password123",
        });

        adminToken = adminLoginResponse.body.token;

        // Approve the regular user using admin
        await request(app)
            .put(`/api/users/${userId}/approve`)
            .set("x-auth-token", adminToken);

        // Login with regular user
        const userLoginResponse = await request(app).post("/api/auth/login").send({
            email: "testuser@example.com",
            password: "password123",
        });
        
        token = userLoginResponse.body.token;

        // Create a test book
        const bookResponse = await request(app)
            .post("/api/books")
            .set("x-auth-token", adminToken)
            .send({
                title: "Test Book",
                author: "Test Author",
                publicationDate: "2023-01-01",
                description: "Test Description"
            });

        bookId = bookResponse.body._id;

        // Create a test reservation
        const reservationResponse = await request(app)
            .post("/api/reservations")
            .set("x-auth-token", token)
            .send({
                bookId: bookId,
                startDate: "2024-03-01",
                endDate: "2024-03-15"
            });

        reservationId = reservationResponse.body._id;
    });

    it("should create a new reservation", async () => {
        const response = await request(app)
            .post("/api/reservations")
            .set("x-auth-token", token)
            .send({
                bookId: bookId,
                startDate: "2024-04-01",
                endDate: "2024-04-15"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("status", "pending");
        expect(response.body.book.toString()).toBe(bookId);
        expect(response.body.user.toString()).toBe(userId);
    });

    it("should not create reservation for non-existent book", async () => {
        const fakeBookId = "507f1f77bcf86cd799439011";
        const response = await request(app)
            .post("/api/reservations")
            .set("x-auth-token", token)
            .send({
                bookId: fakeBookId,
                startDate: "2024-04-01",
                endDate: "2024-04-15"
            });

        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty("message", "Book not found");
    });

    it("should allow admin to update reservation status", async () => {
        const response = await request(app)
            .put(`/api/reservations/${reservationId}`)
            .set("x-auth-token", adminToken)
            .send({
                status: "approved"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("status", "approved");
    });

    it("should not allow regular user to update reservation status", async () => {
        const response = await request(app)
            .put(`/api/reservations/${reservationId}`)
            .set("x-auth-token", token)
            .send({
                status: "approved"
            });

        expect(response.statusCode).toBe(403);
    });

    it("should allow admin to get all reservations", async () => {
        const response = await request(app)
            .get("/api/reservations")
            .set("x-auth-token", adminToken);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
    });

    it("should allow user to view their own reservation", async () => {
        const response = await request(app)
            .get(`/api/reservations/${reservationId}`)
            .set("x-auth-token", token);

        expect(response.statusCode).toBe(200);
        expect(response.body.user._id.toString()).toBe(userId);
    });

    it("should not allow user to view other user's reservation", async () => {
        // Create another user
        const otherUserResponse = await request(app).post("/api/auth/register").send({
            name: "Other User",
            email: "other@example.com",
            password: "password123",
            phoneNumber: "01010101012"
        });

        const otherToken = otherUserResponse.body.token;

        // Approve the other user
        await request(app)
            .put(`/api/users/${otherUserResponse.body.userId}/approve`)
            .set("x-auth-token", adminToken);

        const response = await request(app)
            .get(`/api/reservations/${reservationId}`)
            .set("x-auth-token", otherToken);

        expect(response.statusCode).toBe(403);
        expect(response.body).toHaveProperty("message", "Not authorized to view this reservation");
    });
});

// describe("Notification Routes", () => {
//     let token;
//     let adminToken;
//     let userId;
//     let adminId;
//     let bookId;
//     let reservationId;

//     beforeEach(async () => {
//         // Create and approve a regular user
//         const userResponse = await request(app).post("/api/auth/register").send({
//             name: "Test User",
//             email: "testuser@example.com",
//             password: "password123",
//             phoneNumber: "01010101010"
//         });

//         token = userResponse.body.token;
//         userId = userResponse.body.userId;

//         // Create and approve an admin user
//         const adminResponse = await request(app).post("/api/auth/register").send({
//             name: "Admin User",
//             email: "admin@example.com",
//             password: "password123",
//             phoneNumber: "01010101011",
//         });

//         adminToken = adminResponse.body.token;
//         adminId = adminResponse.body.userId;

//         // Update database to approve user and set admin status
//         await User.findByIdAndUpdate(adminId, { isApproved: true, isAdmin: true });

//         // Login with admin
//         const adminLoginResponse = await request(app).post("/api/auth/login").send({
//             email: "admin@example.com",
//             password: "password123",
//         });

//         adminToken = adminLoginResponse.body.token;

//         // Approve the regular user using admin
//         await request(app)
//             .put(`/api/users/${userId}/approve`)
//             .set("x-auth-token", adminToken);

//         // Login with regular user
//         const userLoginResponse = await request(app).post("/api/auth/login").send({
//             email: "testuser@example.com",
//             password: "password123",
//         });
        
//         token = userLoginResponse.body.token;

//         // Create a test book
//         const bookResponse = await request(app)
//             .post("/api/books")
//             .set("x-auth-token", adminToken)
//             .send({
//                 title: "Test Book",
//                 author: "Test Author",
//                 publicationDate: "2023-01-01",
//                 description: "Test Description"
//             });

//         bookId = bookResponse.body._id;

//         // Create a test reservation (this should generate notifications)
//         const reservationResponse = await request(app)
//             .post("/api/reservations")
//             .set("x-auth-token", token)
//             .send({
//                 bookId: bookId,
//                 startDate: "2024-03-01",
//                 endDate: "2024-03-15"
//             });

//         reservationId = reservationResponse.body._id;
//     });

//     it("should allow user to get their notifications", async () => {
//         const response = await request(app)
//             .get("/api/notifications")
//             .set("x-auth-token", token);

//         expect(response.statusCode).toBe(200);
//         expect(Array.isArray(response.body)).toBe(true);
//     });

//     // it("should create notification when reservation status is updated", async () => {
//     //     // First update the reservation status
//     //     const x = await request(app)
//     //         .put(`/api/reservations/${reservationId}`)
//     //         .set("x-auth-token", adminToken)
//     //         .send({
//     //             status: "approved"
//     //         });

            

//     //     // Then check for notifications
//     //     const response = await request(app)
//     //         .get("/api/notifications")
//     //         .set("x-auth-token", token);

//     //     console.log(response.data);

//     //     // expect(response.statusCode).toBe(200);
//     //     // expect(Array.isArray(response.body)).toBe(true);
//     //     // expect(response.body.some(notification => 
//     //     //     notification.type === "reservation_status" &&
//     //     //     notification.message.includes("approved")
//     //     // )).toBe(true);
//     // });

//     // it("should create notification for admin when new reservation is made", async () => {
//     //     // Create another reservation
//     //     await request(app)
//     //         .post("/api/reservations")
//     //         .set("x-auth-token", token)
//     //         .send({
//     //             bookId: bookId,
//     //             startDate: "2024-05-01",
//     //             endDate: "2024-05-15"
//     //         });

//     //     // Check admin notifications
//     //     const response = await request(app)
//     //         .get("/api/notifications")
//     //         .set("x-auth-token", adminToken);
        
//     //         console.log(response.data);
            

//     //     expect(response.statusCode).toBe(200);
//     //     expect(Array.isArray(response.body)).toBe(true);
//     //     expect(response.body.some(notification => 
//     //         notification.type === "new_reservation" &&
//     //         notification.message.includes("Test User") &&
//     //         notification.message.includes("Test Book")
//     //     )).toBe(true);
//     // });

//     // it("should not allow user to get other user's notifications", async () => {
//     //     // Create another user
//     //     const otherUserResponse = await request(app).post("/api/auth/register").send({
//     //         name: "Other User",
//     //         email: "other@example.com",
//     //         password: "password123",
//     //         phoneNumber: "01010101012"
//     //     });

//     //     const otherToken = otherUserResponse.body.token;

//     //     // Approve the other user
//     //     await request(app)
//     //         .put(`/api/users/${otherUserResponse.body.userId}/approve`)
//     //         .set("x-auth-token", adminToken);

//     //     // Create a notification for the first user
//     //     await request(app)
//     //         .put(`/api/reservations/${reservationId}`)
//     //         .set("x-auth-token", adminToken)
//     //         .send({
//     //             status: "approved"
//     //         });

//     //     // Try to get notifications with other user's token
//     //     const response = await request(app)
//     //         .get("/api/notifications")
//     //         .set("x-auth-token", otherToken);

//     //     expect(response.statusCode).toBe(200);
//     //     expect(Array.isArray(response.body)).toBe(true);
//     //     expect(response.body.length).toBe(0); // Should be empty as this user has no notifications
//     // });

//     // it("should return notifications in descending order by creation date", async () => {
//     //     // Create multiple notifications by updating reservation status multiple times
//     //     await request(app)
//     //         .put(`/api/reservations/${reservationId}`)
//     //         .set("x-auth-token", adminToken)
//     //         .send({ status: "approved" });

//     //     await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure different timestamps

//     //     await request(app)
//     //         .put(`/api/reservations/${reservationId}`)
//     //         .set("x-auth-token", adminToken)
//     //         .send({ status: "completed" });

//     //     const response = await request(app)
//     //         .get("/api/notifications")
//     //         .set("x-auth-token", token);

//     //     expect(response.statusCode).toBe(200);
//     //     expect(Array.isArray(response.body)).toBe(true);
        
//     //     // Verify notifications are in descending order
//     //     const dates = response.body.map(notification => new Date(notification.createdAt));
//     //     for (let i = 1; i < dates.length; i++) {
//     //         expect(dates[i - 1] >= dates[i]).toBe(true);
//     //     }
//     // });
// });

