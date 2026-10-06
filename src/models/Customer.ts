import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * SOURCE data model — represents legacy customer records.
 *
 * This schema intentionally mirrors the source system's structure.
 * Fields use snake_case and the identifier is a deterministic string (e.g. CUST-001).
 *
 * Validation is intentionally minimal at the schema level so that
 * invalid seed records (bad emails, null fields, bad dates) can be
 * persisted for later migration-validation testing.
 */

export interface ICustomer extends Document {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    date_of_birth: {
      type: String,
      default: null,
    },
  },
  {
    collection: "source_customers",
    timestamps: false,
    // Prevent Mongoose from adding __v version key
    versionKey: false,
  }
);

/**
 * Guard against model recompilation during HMR.
 */
export const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
