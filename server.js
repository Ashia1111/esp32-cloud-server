const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const pdfParse = require("pdf-parse");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ✅ Connect to MongoDB Atlas
const MONGO_URI = "mongodb+srv://doctorowenn24:g3hQYdzz2vwzyl69@cluster0.64dxe.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define Schema for ESP32 IP
const esp32Schema = new mongoose.Schema({
    ip: String,
    updatedAt: { type: Date, default: Date.now }
});
const ESP32 = mongoose.model("ESP32", esp32Schema);

// ✅ Define File Schema
const fileSchema = new mongoose.Schema({
    filename: String,         
    originalname: String,     
    path: String,             
    fileType: String,         
    uploadedAt: { type: Date, default: Date.now }
});
const File = mongoose.model("File", fileSchema);

// ✅ Multer Storage (Save with Timestamp)
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, "_");
        cb(null, `${Date.now()}-${safeName}`);
    }
});
const upload = multer({ storage });

/*
======================================
  ✅ STEP 1: Register ESP32 IP Address
======================================
*/
app.post("/register", async (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).send("❌ No IP provided");

    try {
        let esp32 = await ESP32.findOne();
        if (esp32) {
            esp32.ip = ip;
            esp32.updatedAt = Date.now();
            await esp32.save();
        } else {
            esp32 = new ESP32({ ip });
            await esp32.save();
        }
        console.log(`✅ ESP32 registered with IP: ${ip}`);
        res.send("ESP32 IP Registered");
    } catch (error) {
        console.error("❌ Error registering ESP32:", error);
        res.status(500).send("Error registering ESP32");
    }
});

/*
==========================================
  ✅ STEP 2: Upload, Convert & Save to DB
==========================================
*/
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");

    const originalFilePath = req.file.path;
    const safeName = req.file.originalname.replace(/\s+/g, "_");
    const csvFilePath = `uploads/${safeName}.csv`;

    try {
        let textData = "";

        if (req.file.mimetype === "application/pdf") {
            const dataBuffer = fs.readFileSync(originalFilePath);
            const pdfData = await pdfParse(dataBuffer);
            textData = pdfData.text;
        } else {
            textData = fs.readFileSync(originalFilePath, "utf8");
        }

        const csvData = textData.split("\n").map(line => line.trim()).join("\n");
        fs.writeFileSync(csvFilePath, csvData);

        const newFile = new File({
            filename: `${safeName}.csv`,
            originalname: safeName,
            path: csvFilePath,
            fileType: "text/csv"
        });
        await newFile.save();

        // ✅ Send CSV to the latest ESP32 IP
        await sendFileToESP32(csvData);

        res.send(`✅ CSV file (${safeName}.csv) saved and sent to ESP32`);
    } catch (error) {
        console.error(error);
        res.status(500).send("❌ Error processing file");
    }
});

// ✅ Get Latest ESP32 IP
async function getESP32IP() {
    const esp32 = await ESP32.findOne().sort({ updatedAt: -1 });
    return esp32 ? esp32.ip : null;
}

// ✅ Send CSV Data to the Latest ESP32 IP
async function sendFileToESP32(csvData) {
    console.log("📡 Sending CSV to ESP32...");
    const esp32IP = await getESP32IP();

    if (!esp32IP) {
        console.error("❌ No ESP32 IP registered!");
        return;
    }

    try {
        const response = await axios.post(`http://${esp32IP}/upload`, csvData, {
            headers: { "Content-Type": "text/csv" }
        });
        console.log("✅ File sent to ESP32 successfully:", response.data);
    } catch (error) {
        console.error("❌ Failed to send file to ESP32:", error.message);
    }
}

/*
======================================
  ✅ STEP 3: Download CSV from MongoDB
======================================
*/
app.get("/download/:filename", async (req, res) => {
    const filename = req.params.filename;
    const localFilePath = path.join(__dirname, "uploads", filename);

    if (fs.existsSync(localFilePath)) {
        console.log(`✅ Downloading local CSV file: ${filename}`);
        return res.download(localFilePath, filename);
    }

    try {
        const fileRecord = await File.findOne({ filename });

        if (fileRecord) {
            console.log(`📡 Fetching CSV from MongoDB for: ${filename}`);
            res.download(fileRecord.path, filename);
        } else {
            console.log(`📡 Fetching CSV from ESP32 for: ${filename}`);
            const esp32IP = await getESP32IP();
            if (!esp32IP) return res.status(500).send("❌ No ESP32 IP registered!");

            const response = await axios.get(`http://${esp32IP}/download`, { responseType: "stream" });
            res.setHeader("Content-Type", "text/csv");
            response.data.pipe(res);
        }
    } catch (error) {
        console.error("❌ Failed to retrieve CSV file:", error.message);
        res.status(500).send("CSV file not found on server, MongoDB, or ESP32");
    }
});

// ✅ Get All Uploaded Files
app.get("/files", async (req, res) => {
    try {
        const files = await File.find().sort({ uploadedAt: -1 });
        res.json(files);
    } catch (error) {
        res.status(500).send("Error retrieving files");
    }
});

// ✅ Debugging: Log all registered routes before starting the server
console.log("Registered Routes:");
app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
        console.log(`➡ ${r.route.path}`);
    }
});

// ✅ Start Server
app.listen(3000, "0.0.0.0", () => console.log("🚀 Server running at http://localhost:3000"));
