import { purchasableItemsMap } from "../services/purchasableItemsMap.js";
import User from "../models/user.model.js";

export const freeEnroll = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, itemId } = req.body;
    // console.log(itemType, itemId)

    const config = purchasableItemsMap[itemType];
    if (!config) return res.status(400).json({ message: "Invalid item type" });

    const item = await config.model.findById(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const user = await User.findById(userId).populate('purchaseSubscriptions.subscription');

    // Already purchased/unlocked check
    if (itemType === "course" && user.purchaseCourses.includes(itemId)) {
      return res.status(400).json({ message: "You are already enrolled in this course." });
    }
    if (itemType === "ebook" && user.purchaseEbooks.includes(itemId)) {
      return res.status(400).json({ message: "You already own this E-Book." });
    }
    if ((itemType === "job" || itemType === "jobV2" || itemType === "jobV3") && user.purchaseJobs.includes(itemId)) {
      return res.status(400).json({ message: "You have already unlocked this job." });
    }
    
    // Note: Subscription allows re-purchase/upgrade — handled in unlock logic

    // Calculate total free jobs allowed from active subscriptions
    let totalAllowedFreeJobs = 0;
    const now = new Date();
    if (user.purchaseSubscriptions && user.purchaseSubscriptions.length > 0) {
      for (const subRecord of user.purchaseSubscriptions) {
        if (subRecord.endDate > now && subRecord.startDate <= now) {
          if (subRecord.subscription && subRecord.subscription.freeJobs) {
            totalAllowedFreeJobs += subRecord.subscription.freeJobs;
          }
        }
      }
    }

    // V3 Logic: Allow paid jobs to be enrolled for free if user has unlocks left
    if (itemType === "jobV3" && item.priceType === "paid") {
      if (user.freeJobUnlocksUsed >= totalAllowedFreeJobs) {
        return res.status(400).json({ message: "Free job unlock limit reached. Please purchase." });
      }
    } else if (item[config.priceTypeField] !== "free") {
      return res.status(400).json({ message: "This item is paid. Please purchase." });
    }

    await config.unlock(user, itemId);
    await user.save();

    return res.json({ success: true, message: "Enrolled successfully" });
  } catch (err) {
    console.error("Free enroll error:", err);
    res.status(500).json({ message: err.message || "Enroll failed" });
  }
};
