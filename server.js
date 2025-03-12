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
app.use(express.static("public"));

// ✅ Connect to MongoDB Atlas
const MONGO_URI = "mongodb+srv://doctorowenn24:g3hQYdzz2vwzyl69@cluster0.64dxe.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));


// ✅ Define File Schema
const fileSchema = new mongoose.Schema({
    filename: String,         // Saved file name
    originalname: String,     // Original file name
    path: String,             // File storage path
    fileType: String,         // File type (CSV, PDF, etc.)
    uploadedAt: { type: Date, default: Date.now } // Timestamp
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

// ✅ ESP32 IP Address
const ESP32_IP = "192.168.254.123";

/*  
=========================================
  ✅ STEP 7: Upload, Convert & Save to DB
=========================================
*/
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");

    const originalFilePath = req.file.path;
    const safeName = req.file.originalname.replace(/\s+/g, "_");
    const csvFilePath = `uploads/${safeName}.csv`;

    try {
        let textData = "";

        // ✅ Extract text from PDF or TXT
        if (req.file.mimetype === "application/pdf") {
            const dataBuffer = fs.readFileSync(originalFilePath);
            const pdfData = await pdfParse(dataBuffer);
            textData = pdfData.text;
        } else {
            textData = fs.readFileSync(originalFilePath, "utf8");
        }

        // ✅ Convert text to CSV format
        const csvData = textData.split("\n").map(line => line.trim()).join("\n");
        fs.writeFileSync(csvFilePath, csvData);

        // ✅ Save file metadata in MongoDB Atlas
        const newFile = new File({
            filename: `${safeName}.csv`,
            originalname: safeName,
            path: csvFilePath,
            fileType: "text/csv"
        });
        await newFile.save();

        // ✅ Send CSV to ESP32
        await sendFileToESP32(csvData);

        res.send(`✅ CSV file (${safeName}.csv) saved and sent to ESP32`);
    } catch (error) {
        console.error(error);
        res.status(500).send("❌ Error processing file");
    }
});

// ✅ Function to Send CSV Data to ESP32
async function sendFileToESP32(csvData) {
    console.log("📡 Sending CSV to ESP32...");
    
    try {
        const response = await axios.post(`http://${ESP32_IP}/upload`, csvData, {
            headers: { "Content-Type": "text/csv" }
        });
        console.log("✅ File sent to ESP32 successfully:", response.data);
    } catch (error) {
        console.error("❌ Failed to send file to ESP32:", error.message);
    }
}

/*  
======================================
  ✅ STEP 8: Download CSV from MongoDB
======================================
*/
app.get("/download/:filename", async (req, res) => {
    const filename = req.params.filename;
    const localFilePath = path.join(__dirname, "uploads", filename);

    // ✅ Check if the file exists locally
    if (fs.existsSync(localFilePath)) {
        console.log(`✅ Downloading local CSV file: ${filename}`);
        return res.download(localFilePath, filename);
    }

    try {
        // ✅ If not found locally, check in MongoDB
        const fileRecord = await File.findOne({ filename });

        if (fileRecord) {
            console.log(`📡 Fetching CSV from MongoDB for: ${filename}`);
            res.download(fileRecord.path, filename);
        } else {
            // ✅ If not found in MongoDB, fetch from ESP32
            console.log(`📡 Fetching CSV from ESP32 for: ${filename}`);
            const response = await axios.get(`http://${ESP32_IP}/download`, { responseType: "stream" });
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

// ✅ Start Server
app.listen(3000, () => console.log("🚀 Server running at http://localhost:3000"));
