import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Companies",
      required: true,
    },
    rawDescription: { type: String, required: true },
    extractedData: {
      jobTitle: { type: String, default: null },
      experience: { type: String, default: null },
      position: { type: String, default: null },
      skills: { type: [String], default: null },
      location: { type: String, default: null },
      jobType: { type: String, default: null },
    },
    status: {
      type: String,
      enum: ["Live", "Pending", "Draft"],
      default: "Live",
    },
    metadata: { type: Object, default: {} },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Job", jobSchema);
