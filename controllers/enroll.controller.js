import { purchasableItemsMap } from "../services/purchasableItemsMap.js";
import User from "../models/user.model.js";

export const freeEnroll = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, itemId } = req.body;

    const config = purchasableItemsMap[itemType];
    if (!config) return res.status(400).json({ message: "Invalid item type" });

    const item = await config.model.findById(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item[config.priceTypeField] !== "free") {
      return res.status(400).json({ message: "This item is paid. Please purchase." });
    }

    const user = await User.findById(userId);

    await config.unlock(user, itemId);
    await user.save();

    return res.json({ success: true, message: "Enrolled successfully" });
  } catch (err) {
    console.error("Free enroll error:", err);
    res.status(500).json({ message: "Enroll failed" });
  }
};
