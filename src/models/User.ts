import mongoose, { Schema, Document, Model } from "mongoose";


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

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
