const express = require("express");
const multer = require("multer");
const cors = require("cors");
const pdfParse = require("pdf-parse");
const { NlpManager } = require("node-nlp");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Initialize NLP.js manager
const manager = new NlpManager({ languages: ["en"] });

// Train NLP model with sample job-related entities
manager.addDocument("en", "I am a software engineer", "role.software_engineer");
manager.addDocument("en", "I have experience in Python and JavaScript", "skills.python_javascript");
manager.addDocument("en", "I worked at Google for 5 years", "experience.google");

manager.addAnswer("en", "role.software_engineer", "Identified role: Software Engineer.");
manager.addAnswer("en", "skills.python_javascript", "Skills: Python, JavaScript.");
manager.addAnswer("en", "experience.google", "Experience: Worked at Google for 5 years.");

// Train the NLP model
(async () => {
    await manager.train();
    manager.save();
})();

// Resume Upload and Processing
app.post("/upload", upload.single("resume"), async (req, res) => {
    try {
        const file = req.file;

        // Check if file is uploaded
        if (!file || file.size === 0) {
            return res.status(400).json({ error: "Uploaded file is empty or missing" });
        }

        const dataBuffer = fs.readFileSync(file.path);

        // Parse the PDF file
        let extractedText = "";
        try {
            const parsedData = await pdfParse(dataBuffer);
            extractedText = parsedData.text;
        } catch (pdfError) {
            console.error("Error parsing PDF:", pdfError);
            return res.status(400).json({ error: "Unable to parse the uploaded PDF file. Please try another file." });
        }

        // Use NLP.js to analyze text
        const response = await manager.process("en", extractedText);
        res.json({ extractedText, analysis: response });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Error processing resume" });
    }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log('Server running on port ${PORT}'));