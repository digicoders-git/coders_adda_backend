import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const syncCounts = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("Connected to DB");

    const Short = mongoose.model("Short", new mongoose.Schema({ totalComments: Number }, { strict: false }));
    const ShortComment = mongoose.model("ShortComment", new mongoose.Schema({ shortId: mongoose.Schema.Types.ObjectId }, { strict: false }));

    const shorts = await Short.find({});
    console.log(`Found ${shorts.length} shorts. Recalculating counts...`);

    for (const short of shorts) {
      const actualCount = await ShortComment.countDocuments({ shortId: short._id });
      await Short.updateOne({ _id: short._id }, { $set: { totalComments: actualCount } });
      console.log(`Short ${short._id}: Updated count to ${actualCount}`);
    }

    console.log("Sync completed!");
    process.exit(0);
  } catch (error) {
    console.error("Error syncing counts:", error);
    process.exit(1);
  }
};

syncCounts();
