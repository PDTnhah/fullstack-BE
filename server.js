const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB Error:", err));

// create schema
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên không được để trống'],
        minlength: [2, 'Tên phải có ít nhất 2 ký tự']
    },
    age: {
        type: Number,
        required: [true, 'Tuổi không được để trống'],
        min: [0, 'Tuổi phải >= 0']
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'Email không được để trống'],
        match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
    },
    address: {
        type: String
    }
});
const User = mongoose.model("User", UserSchema);

// implement API endpoints

app.get("/api/users", async (req, res) => {
    try {
        // Lấy query params
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || "";
        page = Math.max(page, 1);
        limit = Math.min(Math.max(limit, 1), 50);

        // Tính skip
        const skip = (page - 1) * limit;

        // Tạo query filter cho search
        const filter = search
            ? {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { address: { $regex: search, $options: "i" } }
                ]
            }
            : {};

        // Query database
        // const users = await User.find(filter)
        //     .skip(skip)
        //     .limit(limit);
        // // Đếm tổng số documents
        // const total = await User.countDocuments(filter);

        const [users, total] = await Promise.all([
            User.find(filter).skip(skip).limit(limit),
            User.countDocuments(filter)
        ]);
        const totalPages = Math.ceil(total / limit);
        // Trả về response
        res.json({
            page,
            limit,
            total,
            totalPages,
            data: users
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/users", async (req, res) => {
    try {
        const { name, age, email, address } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res
                .status(400)
                .json({ message: "Đã tồn tại email này trong hệ thống." });
        }

        // Tạo user mới
        const newUser = await User.create({
            name: name.trim(),
            age: parseInt(age),
            email: email?.trim(),
            address: address?.trim()
        });

        res.status(201).json({
            message: "Tạo người dùng thành công",
            data: newUser
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, email, address } = req.body;
        const updateData = {};

        if (name) updateData.name = name.trim();
        if (age) updateData.age = parseInt(age);
        if (address) updateData.address = address.trim();
        if (email) {
            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return res
                    .status(400)
                    .json({ message: "Đã tồn tại email này trong hệ thống." });
            }
            updateData.email = email.trim();
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true } // Quan trọng
        );
        if (!updatedUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }
        res.json({
            message: "Cập nhật người dùng thành công",
            data: updatedUser
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        res.json({ message: "Xóa người dùng thành công" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});