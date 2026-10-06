import mongoose, { Schema, Document, Model } from "mongoose";


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

    versionKey: false,
  }
);

export const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
