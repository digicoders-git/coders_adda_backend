import ShortLike from "../models/shortLike.model.js";
import Short from "../models/short.model.js";

/* ================= LIKE / UNLIKE TOGGLE ================= */
export const toggleLike = async (req, res) => {
  try {
    const { shortId } = req.params;

    // 🔐 logged in user id (adjust if your auth uses different key)
    const userId = req.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // check short exists
    const short = await Short.findById(shortId);
    if (!short) {
      return res.status(404).json({ message: "Short not found" });
    }

    // check already liked?
    const alreadyLiked = await ShortLike.findOne({ shortId, userId });

    // ================= UNLIKE =================
    if (alreadyLiked) {
      await ShortLike.deleteOne({ shortId, userId });

      await Short.updateOne(
        { _id: shortId },
        { $inc: { totalLikes: -1 } }
      );

      const updatedShort = await Short.findById(shortId).select("totalLikes");

      return res.json({
        liked: false,
        totalLikes: updatedShort.totalLikes,
        message: "Like removed"
      });
    }

    // ================= LIKE =================
    await ShortLike.create({ shortId, userId });

    await Short.updateOne(
      { _id: shortId },
      { $inc: { totalLikes: 1 } }
    );

    const updatedShort = await Short.findById(shortId).select("totalLikes");

    return res.json({
      liked: true,
      totalLikes: updatedShort.totalLikes,
      message: "Liked successfully"
    });
  } catch (error) {
    // duplicate key safety (in case of race condition)
    if (error.code === 11000) {
      return res.status(400).json({ message: "Already liked" });
    }

    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= CHECK USER LIKED OR NOT ================= */
export const checkUserLiked = async (req, res) => {
  try {
    const { shortId } = req.params;
    const userId = req.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const liked = await ShortLike.findOne({ shortId, userId });

    res.json({
      liked: !!liked
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
