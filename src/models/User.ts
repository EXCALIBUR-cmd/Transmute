import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * TARGET data model — represents the migrated user records.
 *
 * This schema is intentionally different from the source Customer schema:
 * - Uses camelCase field names (user_id, full_name, etc.)
 * - Combines first_name + last_name into full_name
 * - Renames email → email_address, phone → phone_number
 * - Converts date_of_birth (full date string) → birth_year (number)
 * - Has its own independent identity field (user_id)
 *
 * NOTE: The actual transformation logic is NOT implemented in this loop.
 * This model only defines the target structure.
 */

export interface IUser extends Document {
  user_id: string;
  full_name: string;
  email_address: string | null;
  phone_number: string | null;
  birth_year: number | null;
}

const UserSchema = new Schema<IUser>(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    full_name: {
      type: String,
      required: true,
    },
    email_address: {
      type: String,
      default: null,
    },
    phone_number: {
      type: String,
      default: null,
    },
    birth_year: {
      type: Number,
      default: null,
    },
  },
  {
    collection: "target_users",
    timestamps: false,
    versionKey: false,
  }
);

/**
 * Guard against model recompilation during HMR.
 */
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
