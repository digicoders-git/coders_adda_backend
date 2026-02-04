import cron from "node-cron";
import User from "../models/user.model.js";

cron.schedule("0 * * * *", async () => {
  try {
    const now = new Date();

    const users = await User.find({
      "purchaseSubscriptions.endDate": { $lte: now }
    });

    for (const user of users) {
      user.purchaseSubscriptions = user.purchaseSubscriptions.filter(
        (sub) => sub.endDate > now
      );
      await user.save();
    }

    console.log("Expired subscriptions removed");
  } catch (error) {
    console.error("Cron Error:", error.message);
  }
});
