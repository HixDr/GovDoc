import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
dotenv.config({ path: path.resolve("../.env") });

// Get API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Define the CompanyEssentialMetadata schema
const CompanyEssentialMetadata = {
  title: "Company Essential Metadata",
  description: "Extract essential company metadata from PDF documents",
  type: "object",
  properties: {
    legal_representatives: {
      type: "array",
      items: { type: "string" },
      description: "List of legal representatives of the company",
      nullable: true,
    },
    board_members: {
      type: "array",
      items: { type: "string" },
      description: "List of board members of the company",
      nullable: true,
    },
    incorporation_date_iso: {
      type: "string",
      description: "Date of incorporation in ISO format",
      nullable: true,
    },
    company_name: {
      type: "string",
      description: "Official registered name of the company",
      nullable: true,
    },
    gemi_number: {
      type: "string",
      description: "General Commercial Registry (GEMI) number",
      nullable: true,
    },
    registered_address: {
      type: "string",
      description: "Official registered address of the company",
      nullable: true,
    },
    company_type: {
      type: "string",
      description: "Legal type of the company",
      nullable: true,
    },
  },
  additionalProperties: false,
};

// Create readline interface for user input
const readline = await import("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  try {
    const pdfName = await new Promise((resolve) => {
      rl.question("Enter the PDF file name (with extension): ", resolve);
    });

    // Construct the filepath
    const filePath = path.resolve("../data", pdfName);

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(filePath);

    // Convert Buffer to base64
    const pdfBase64 = pdfBuffer.toString("base64");

    // Set up the model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { response_mime_type: "application/json" },
    });

    // Create a file part from the PDF
    const filePart = {
      inlineData: {
        data: pdfBase64,
        mimeType: "application/pdf",
      },
    };

    // Create the prompt with JSON schema
    const prompt = `Analyze the attached PDF document and provide me with the essential company metadata information, such as legal representatives, board members, and incorporation history only where you are 100% certain that the metadata are correctly classified in each category. Do not provide any info that you are not certain it is correct. Keep the results in Greek. Follow JSON schema.<JSONSchema>${JSON.stringify(
      CompanyEssentialMetadata
    )}</JSONSchema>`;

    // Generate content with the file included
    const result = await model.generateContent([prompt, filePart]);

    const text = await result.response.text();
    console.log(text);

    try {
      const jsonContent = JSON.parse(text);

      // Write to file
      const writePath = path.resolve(
        "data",
        pdfName.replace(/\.pdf$/, ".json")
      );
      fs.writeFileSync(
        writePath,
        JSON.stringify(jsonContent, null, 4),
        "utf-8"
      );

      console.log(`Response written to ${writePath}`);
    } catch (jsonError) {
      console.error("Error parsing JSON response:", jsonError);
      console.log("Raw response:", text);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    rl.close();
  }
}

main();
