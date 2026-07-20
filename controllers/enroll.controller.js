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

    const user = await User.findById(userId);

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
    if (itemType === "subscription" && user.purchaseSubscriptions.some(sub => sub.subscription.toString() === itemId.toString())) {
      return res.status(400).json({ message: "You already have this subscription active." });
    }

    // V3 Logic: Allow paid jobs to be enrolled for free if user has unlocks left
    if (itemType === "jobV3" && item.priceType === "paid") {
      if (user.freeJobUnlocksUsed >= 3) {
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
