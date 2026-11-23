import ShortShare from "../models/shortShare.model.js";
import Short from "../models/short.model.js";

/* ================= ADD SHARE ================= */
export const addShare = async (req, res) => {
  try {
    const { shortId } = req.params;
    const userId = req.userId; // temp auth middleware se

    // check short exists
    const short = await Short.findById(shortId);
    if (!short) {
      return res.status(404).json({ message: "Short not found" });
    }

    // create share record
    await ShortShare.create({
      shortId,
      userId
    });

    // increment totalShares
    await Short.updateOne(
      { _id: shortId },
      { $inc: { totalShares: 1 } }
    );

    const updated = await Short.findById(shortId).select("totalShares");

    res.json({
      message: "Shared successfully",
      totalShares: updated.totalShares
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= GET SHARES OF A SHORT (ADMIN) ================= */
export const getSharesByShort = async (req, res) => {
  try {
    const { shortId } = req.params;

    const shares = await ShortShare.find({ shortId })
      .sort({ createdAt: -1 })
      .populate("shortId"); // ✅ short ka data dikh jayega

    res.json({
      total: shares.length,
      data: shares
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
