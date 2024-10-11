import express from "express";
import multer from "multer";
import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import cors from "cors";
import path from "path";

const app = express();

// Add this middleware before your routes
app.use(cors());

// Alternatively, if you want to restrict to certain origins:
app.use(cors({ origin: "http://localhost:3000" }));

const port = 5000;
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Uploads");
  },

  filename: (req, file, cb) => {
    console.log(file);
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Set up multer for file uploads
const upload = multer({ storage: storage });

// Initialize the WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// Function to format Lebanese phone numbers
function formatLebaneseNumber(number: string): string {
  const cleanNumber = number.replace(/\D/g, "");
  if (cleanNumber.startsWith("961")) {
    return `961${cleanNumber.slice(3)}@c.us`;
  }
  const numberWithoutLeadingZero = cleanNumber.startsWith("0")
    ? cleanNumber.slice(1)
    : cleanNumber;
  return `961${numberWithoutLeadingZero}@c.us`;
}

// Generate QR code for authentication
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Scan the QR code above to log in to WhatsApp Web");
});

client.on("ready", () => {
  console.log("Client is ready!");
});

// Initialize WhatsApp client
client.initialize();

// Endpoint for sending messages
app.post(
  "/send-messages",
  upload.fields([
    { name: "excel", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  async (req: any, res: any) => {
    try {
      const excelFile = req.files["excel"][0];
      const images = req.files["images"];
      const message = req.body.message;

      if (!excelFile || !message) {
        return res
          .status(400)
          .json({ error: "Excel file and message are required" });
      }

      //   const workbook = XLSX.readFile(excelFile.path);
      //   const sheetName = workbook.SheetNames[0];
      //   const worksheet = workbook.Sheets[sheetName];
      //   const phoneNumbers = XLSX.utils
      //     .sheet_to_json(worksheet, { header: 1 })
      //     .flat()
      //     .filter(Boolean)
      //     .map(String);

      //   const formattedNumbers = phoneNumbers.map(formatLebaneseNumber);

      const formattedNumbers = ["70616764", "70308205"].map(
        formatLebaneseNumber
      );

      for (const number of formattedNumbers) {
        try {
          await client.sendMessage(number, message);

          if (images && images.length > 0) {
            for (const image of images) {
              const media = MessageMedia.fromFilePath(image.path);
              await client.sendMessage(number, media);
            }
          }

          console.log(`Message sent to ${number}`);
        } catch (error) {
          console.error(`Failed to send message to ${number}:`, error);
        }
      }

      res.status(200).json({ message: "Messages sent successfully" });
    } catch (error) {
      console.error("Error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while sending messages" });
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
