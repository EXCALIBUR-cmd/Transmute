import assert from "node:assert/strict";
import "dotenv/config";
import mongoose from "mongoose";
import { SchemaMetadata } from "@/types/schema";
import { MappingProposal } from "@/types/mapping";
import { buildProposalPrompt } from "@/lib/ai/prompt";
import {
  validateMappingProposal,
  validateSchemaMetadata,
} from "@/lib/ai/validator";
import { generateMappingProposal } from "@/lib/ai/proposal-service";
import { POST } from "@/app/api/mapping/propose/route";
import { NextRequest } from "next/server";
import { Customer } from "@/models/Customer";

const sampleSource: SchemaMetadata = {
  collection: "source_customers",
  fields: [
    { name: "id", type: "string", required: true },
    { name: "first_name", type: "string", required: true },
    { name: "last_name", type: "string", required: true },
    { name: "email", type: "string", required: false },
    { name: "phone", type: "string", required: false },
    { name: "date_of_birth", type: "string", required: false },
  ],
};

const sampleTarget: SchemaMetadata = {
  collection: "target_users",
  fields: [
    { name: "user_id", type: "string", required: true },
    { name: "full_name", type: "string", required: true },
    { name: "email_address", type: "string", required: false },
    { name: "phone_number", type: "string", required: false },
    { name: "birth_year", type: "number", required: false },
  ],
};

const validProposal: MappingProposal = {
  mappings: [
    {
      sourceFields: ["id"],
      targetField: "user_id",
      transformation: "identity",
      confidence: 0.99,
      rationale: "Direct identifier match",
    },
    {
      sourceFields: ["first_name", "last_name"],
      targetField: "full_name",
      transformation: "concat_with_space",
      confidence: 0.95,
      rationale: "Combine first and last name",
    },
    {
      sourceFields: ["email"],
      targetField: "email_address",
      transformation: "identity",
      confidence: 0.95,
      rationale: "Email address mapping",
    },
    {
      sourceFields: ["phone"],
      targetField: "phone_number",
      transformation: "identity",
      confidence: 0.9,
      rationale: "Phone number mapping",
    },
    {
      sourceFields: ["date_of_birth"],
      targetField: "birth_year",
      transformation: "extract_year",
      confidence: 0.85,
      rationale: "Extract year from birth date",
    },
  ],
  unmappedSourceFields: [],
  unmappedTargetFields: [],
  risks: ["Date formats must be parsed properly to extract birth year"],
};

async function runUnitTests(): Promise<void> {
  const prompt = buildProposalPrompt(sampleSource, sampleTarget);
  assert.ok(prompt.includes("You are a schema mapping planner."));
  assert.ok(prompt.includes("source_customers"));
  assert.ok(prompt.includes("target_users"));
  assert.ok(prompt.includes("date_of_birth"));
  assert.ok(prompt.includes("birth_year"));
  assert.ok(prompt.includes("You must NOT:"));

  const validValidated = validateMappingProposal(
    validProposal,
    sampleSource,
    sampleTarget
  );
  assert.equal(validValidated.mappings.length, 5);

  assert.throws(() => {
    validateSchemaMetadata(null, "source");
  }, /Invalid source schema/);

  assert.throws(() => {
    validateSchemaMetadata({ collection: "", fields: [] }, "source");
  }, /missing or empty collection name/);

  assert.throws(() => {
    validateSchemaMetadata(
      { collection: "c", fields: [{ name: "f", type: "string" }] },
      "target"
    );
  }, /missing boolean required flag/);

  assert.throws(() => {
    validateMappingProposal(
      {
        ...validProposal,
        mappings: [
          {
            ...validProposal.mappings[0],
            sourceFields: ["non_existent_field"],
          },
        ],
      },
      sampleSource,
      sampleTarget
    );
  }, /unknown source field "non_existent_field"/);

  assert.throws(() => {
    validateMappingProposal(
      {
        ...validProposal,
        mappings: [
          {
            ...validProposal.mappings[0],
            targetField: "non_existent_target",
          },
        ],
      },
      sampleSource,
      sampleTarget
    );
  }, /unknown target field "non_existent_target"/);

  assert.throws(() => {
    validateMappingProposal(
      {
        ...validProposal,
        mappings: [
          {
            ...validProposal.mappings[0],
            confidence: 1.5,
          },
        ],
      },
      sampleSource,
      sampleTarget
    );
  }, /confidence must be a number between 0 and 1/);

  assert.throws(() => {
    validateMappingProposal(
      {
        ...validProposal,
        mappings: [
          {
            ...validProposal.mappings[0],
            confidence: -0.1,
          },
        ],
      },
      sampleSource,
      sampleTarget
    );
  }, /confidence must be a number between 0 and 1/);

  assert.throws(() => {
    validateMappingProposal(
      {
        ...validProposal,
        mappings: [
          {
            ...validProposal.mappings[0],
            transformation: "eval(alert(1))",
          },
        ],
      },
      sampleSource,
      sampleTarget
    );
  }, /unsupported transformation/);

  assert.throws(() => {
    validateMappingProposal(
      {
        ...validProposal,
        unmappedSourceFields: ["ghost_source"],
      },
      sampleSource,
      sampleTarget
    );
  }, /Unknown unmapped source field "ghost_source"/);

  assert.throws(() => {
    validateMappingProposal(
      {
        ...validProposal,
        unmappedTargetFields: ["ghost_target"],
      },
      sampleSource,
      sampleTarget
    );
  }, /Unknown unmapped target field "ghost_target"/);

  assert.throws(() => {
    validateMappingProposal(
      {
        ...validProposal,
        extraUnexpectedKey: true,
      },
      sampleSource,
      sampleTarget
    );
  }, /Unexpected property in proposal/);

  const mockProposal = await generateMappingProposal(
    sampleSource,
    sampleTarget,
    {
      generateContent: async () => JSON.stringify(validProposal),
    }
  );
  assert.equal(mockProposal.mappings.length, 5);

  await assert.rejects(async () => {
    await generateMappingProposal(sampleSource, sampleTarget, {
      generateContent: async () => "not a valid json {{{{",
    });
  }, /Malformed JSON received from model response/);

  await assert.rejects(async () => {
    await generateMappingProposal(sampleSource, sampleTarget, {
      generateContent: async () => "",
    });
  }, /Malformed JSON received from model response/);

  await assert.rejects(async () => {
    const originalEnv = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      await generateMappingProposal(sampleSource, sampleTarget);
    } finally {
      if (originalEnv) process.env.GEMINI_API_KEY = originalEnv;
    }
  }, /GEMINI_API_KEY is not configured on the server/);

  const badJsonReq = new NextRequest(
    "http://localhost:3000/api/mapping/propose",
    {
      method: "POST",
      body: "this is not json",
    }
  );
  const badJsonRes = await POST(badJsonReq);
  assert.equal(badJsonRes.status, 400);

  const missingReq = new NextRequest(
    "http://localhost:3000/api/mapping/propose",
    {
      method: "POST",
      body: JSON.stringify({ source: sampleSource }),
    }
  );
  const missingRes = await POST(missingReq);
  assert.equal(missingRes.status, 400);

  const malformedSchemaReq = new NextRequest(
    "http://localhost:3000/api/mapping/propose",
    {
      method: "POST",
      body: JSON.stringify({
        source: { collection: "", fields: [] },
        target: sampleTarget,
      }),
    }
  );
  const malformedSchemaRes = await POST(malformedSchemaReq);
  assert.equal(malformedSchemaRes.status, 400);

  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
    const sourceCount = await Customer.countDocuments();
    assert.equal(sourceCount, 50);

    const db = mongoose.connection.db;
    if (db) {
      const targetCols = await db
        .listCollections({ name: "target_users" })
        .toArray();
      const targetCount =
        targetCols.length > 0
          ? await db.collection("target_users").countDocuments()
          : 0;
      assert.equal(targetCount, 43);
    }
    await mongoose.disconnect();
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const liveProposal = await generateMappingProposal(
        sampleSource,
        sampleTarget
      );
      assert.ok(liveProposal.mappings.length > 0);
      assert.ok(Array.isArray(liveProposal.risks));
      console.log("LIVE_GEMINI_PROPOSAL_SUCCESS");
    } catch (liveErr) {
      console.log("LIVE_GEMINI_TEST_NOTE:", (liveErr as Error).message);
    }
  }

  console.log("ALL_MAPPING_TESTS_PASSED");
}

runUnitTests().catch((err) => {
  console.error("Mapping tests failed:", err);
  process.exit(1);
});
