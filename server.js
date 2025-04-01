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

const MONGO_URI = "mongodb+srv://owenndoc15:owenndoc15@cluster0.ao9mfe3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

const fileSchema = new mongoose.Schema({
    filename: String,         
    originalname: String,     
    path: String,             
    fileType: String,         
    uploadedAt: { type: Date, default: Date.now }
});
const File = mongoose.model("File", fileSchema);

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, "_");
        cb(null, `${Date.now()}-${safeName}`);
    }
});
const upload = multer({ storage });

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

        res.send(`✅ CSV file (${safeName}.csv) saved successfully`);
    } catch (error) {
        console.error(error);
        res.status(500).send("❌ Error processing file");
    }
});

// ✅ New Route: Fetch Latest CSV File
app.get("/latest-csv", async (req, res) => {
    try {
        const latestFile = await File.findOne().sort({ uploadedAt: -1 });
        if (!latestFile) return res.status(404).send("❌ No CSV file found");

        console.log(`📡 Serving latest CSV file: ${latestFile.filename}`);
        res.download(latestFile.path, latestFile.filename);
    } catch (error) {
        console.error("❌ Failed to retrieve latest CSV:", error.message);
        res.status(500).send("❌ Error retrieving latest CSV file");
    }
});

app.listen(3000, "0.0.0.0", () => console.log("🚀 Server running at http://localhost:3000"));
