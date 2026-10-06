
import "dotenv/config";
import mongoose from "mongoose";
import { Customer } from "../models/Customer";

async function verify(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("ERROR: MONGODB_URI not set.");
    process.exit(1);
  }

  await mongoose.connect(uri, { bufferCommands: false });
  console.log("Connected to MongoDB for verification.\n");

  let allPassed = true;

  function check(label: string, passed: boolean, detail: string): void {
    const status = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status}  ${label}`);
    if (detail) console.log(`         ${detail}`);
    if (!passed) allPassed = false;
  }

  const sourceCount = await Customer.countDocuments();
  check(
    "Source customer count ≈ 50",
    sourceCount === 50,
    `Count: ${sourceCount}`
  );

  const allIds = await Customer.find({}, { id: 1, _id: 0 }).lean();
  const idSet = new Set(allIds.map((r) => r.id));
  check(
    "No duplicate source IDs",
    idSet.size === allIds.length,
    `Unique: ${idSet.size}, Total: ${allIds.length}`
  );

  const db = mongoose.connection.db;
  let targetCount = 0;
  if (db) {
    const cols = await db.listCollections({ name: "target_users" }).toArray();
    if (cols.length > 0) {
      targetCount = await db.collection("target_users").countDocuments();
    }
  }
  check("Target users count = 0", targetCount === 0, `Count: ${targetCount}`);

  const normalRecord = await Customer.findOne({ id: "CUST-001" }).lean();
  check(
    "Normal record retrievable (CUST-001)",
    normalRecord !== null &&
    normalRecord.first_name === "Aarav" &&
    normalRecord.last_name === "Sharma",
    normalRecord
      ? `${normalRecord.first_name} ${normalRecord.last_name}`
      : "NOT FOUND"
  );

  const badEmail = await Customer.findOne({ id: "CUST-041" }).lean();
  check(
    "Invalid email fixture exists (CUST-041)",
    badEmail !== null && badEmail.email === "not-an-email",
    badEmail ? `email: "${badEmail.email}"` : "NOT FOUND"
  );

  const nullEmail = await Customer.findOne({ id: "CUST-045" }).lean();
  check(
    "Null email fixture exists (CUST-045)",
    nullEmail !== null && nullEmail.email === null,
    nullEmail ? `email: ${nullEmail.email}` : "NOT FOUND"
  );

  const nullPhone = await Customer.findOne({ id: "CUST-046" }).lean();
  check(
    "Null phone fixture exists (CUST-046)",
    nullPhone !== null && nullPhone.phone === null,
    nullPhone ? `phone: ${nullPhone.phone}` : "NOT FOUND"
  );

  const nullDob = await Customer.findOne({ id: "CUST-047" }).lean();
  check(
    "Null date_of_birth fixture exists (CUST-047)",
    nullDob !== null && nullDob.date_of_birth === null,
    nullDob ? `date_of_birth: ${nullDob.date_of_birth}` : "NOT FOUND"
  );

  const badDate = await Customer.findOne({ id: "CUST-048" }).lean();
  check(
    "Invalid date_of_birth fixture exists (CUST-048)",
    badDate !== null && badDate.date_of_birth === "not-a-date",
    badDate ? `date_of_birth: "${badDate.date_of_birth}"` : "NOT FOUND"
  );

  const badPhone = await Customer.findOne({ id: "CUST-049" }).lean();
  check(
    "Invalid phone fixture exists (CUST-049)",
    badPhone !== null && badPhone.phone === "PHONE-INVALID",
    badPhone ? `phone: "${badPhone.phone}"` : "NOT FOUND"
  );

  const multiIssue = await Customer.findOne({ id: "CUST-050" }).lean();
  check(
    "Multi-issue fixture exists (CUST-050)",
    multiIssue !== null &&
    multiIssue.email === null &&
    multiIssue.phone === "???" &&
    multiIssue.date_of_birth === "1985-13-45",
    multiIssue
      ? `email: ${multiIssue.email}, phone: "${multiIssue.phone}", dob: "${multiIssue.date_of_birth}"`
      : "NOT FOUND"
  );

  console.log("\n" + "=".repeat(50));
  console.log(allPassed ? "ALL CHECKS PASSED ✅" : "SOME CHECKS FAILED ❌");
  console.log("=".repeat(50));

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
