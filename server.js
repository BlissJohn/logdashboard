const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect("mongodb+srv://admin:admin123@cluster0.rywaqeh.mongodb.net/logsDB?retryWrites=true&w=majority")
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

// Schema
const logSchema = new mongoose.Schema({
    level: { type: String, required: true },
    message: { type: String, required: true },
    resourceId: String,
    timestamp: { type: Date, default: Date.now },
    traceId: String,
    spanId: String,
    commit: String,
    metadata: {
        parentResourceId: String
    }
});

// Indexes
logSchema.index({ message: "text" });
logSchema.index({ level: 1 });
logSchema.index({ resourceId: 1 });
logSchema.index({ timestamp: -1 });

const Log = mongoose.model("Log", logSchema);

// HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

io.on("connection", (socket) => {
    console.log("Client connected");
});

// 📥 POST logs
app.post("/logs", async (req, res) => {
    try {
        const { level, message } = req.body;

        // ✅ Validation
        if (!level || !message) {
            return res.status(400).json({ error: "level and message are required" });
        }

        const log = new Log(req.body);
        await log.save();

        // 🔥 Real-time event
        io.emit("newLog", log);

        res.status(201).json({ message: "Log saved" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔍 GET logs (with filters + pagination + sorting)
app.get("/logs", async (req, res) => {
    try {
        const {
            level,
            message,
            resourceId,
            traceId,
            spanId,
            commit,
            parentResourceId,
            start,
            end,
            page = 1,
            limit = 10
        } = req.query;

        let query = {};

        if (level) query.level = level;
        if (resourceId) query.resourceId = resourceId;
        if (traceId) query.traceId = traceId;
        if (spanId) query.spanId = spanId;
        if (commit) query.commit = commit;
        if (parentResourceId)
            query["metadata.parentResourceId"] = parentResourceId;

        if (start && end) {
            query.timestamp = {
                $gte: new Date(start),
                $lte: new Date(end)
            };
        }

        let logsQuery;

        if (message) {
            logsQuery = Log.find({
                ...query,
                $text: { $search: message }
            });
        } else {
            logsQuery = Log.find(query);
        }

        // ✅ Sort newest first + pagination
        const logs = await logsQuery
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
server.listen(3000, () => {
    console.log("Server running on port 3000");
});