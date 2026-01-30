import ShortComment from "../models/shortComment.model.js";
import Short from "../models/short.model.js";

/* ================= ADD COMMENT (USER) ================= */
export const addComment = async (req, res) => {
  try {
    const { shortId } = req.params;
    const { commentText } = req.body;
    const userId = req.userId;

    if (!commentText) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    // check short exists
    const short = await Short.findById(shortId);
    if (!short) {
      return res.status(404).json({ message: "Short not found" });
    }

    const comment = await ShortComment.create({
      shortId,
      userId,
      commentText,
      parentComment: null,
      isAdminReply: false
    });

    // increment totalComments
    await Short.updateOne(
      { _id: shortId },
      { $inc: { totalComments: 1 } }
    );

    res.status(201).json({
      message: "Comment added successfully",
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= REPLY TO COMMENT (ADMIN) ================= */
export const replyToComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { commentText } = req.body;

    // For now, we assume admin id also comes in req.userId
    const adminId = req.userId;

    if (!commentText) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const parent = await ShortComment.findById(commentId);
    if (!parent) {
      return res.status(404).json({ message: "Parent comment not found" });
    }

    const reply = await ShortComment.create({
      shortId: parent.shortId,
      userId: adminId,
      commentText,
      parentComment: parent._id,
      isAdminReply: true
    });

    // increment totalComments
    await Short.updateOne(
      { _id: parent.shortId },
      { $inc: { totalComments: 1 } }
    );

    res.status(201).json({
      message: "Reply added successfully",
      data: reply
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/* ================= GET COMMENTS OF A SHORT (NESTED) ================= */
/* ================= GET COMMENTS OF A SHORT (NESTED) ================= */
export const getCommentsByShort = async (req, res) => {
  try {
    const { shortId } = req.params;

    const comments = await ShortComment.find({ shortId })
      .populate("parentComment")  // ✅ parent comment ka data
      .populate("shortId")        // ✅ short ka data
      // ❌ .populate("userId")  // ABHI NAHI, kyunki User model nahi bana
      .sort({ createdAt: 1 })
      .lean();

    // build nested structure
    const map = {};
    comments.forEach((c) => {
      map[c._id] = { ...c, replies: [] };
    });

    const result = [];

    comments.forEach((c) => {
      if (c.parentComment && c.parentComment._id) {
        if (map[c.parentComment._id]) {
          map[c.parentComment._id].replies.push(map[c._id]);
        }
      } else {
        result.push(map[c._id]);
      }
    });

    res.json({
      total: comments.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};



/* ================= DELETE COMMENT (USER OWN OR ADMIN) ================= */
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    const comment = await ShortComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Here you can add rule:
    // if (comment.userId.toString() !== userId && !isAdmin) { ... }

    const shortId = comment.shortId;

    // Also delete all replies of this comment
    const replies = await ShortComment.find({ parentComment: comment._id });

    const totalToDelete = 1 + replies.length;

    await ShortComment.deleteMany({
      $or: [{ _id: comment._id }, { parentComment: comment._id }]
    });

    // decrement totalComments
    await Short.updateOne(
      { _id: shortId },
      { $inc: { totalComments: -totalToDelete } }
    );

    res.json({
      message: "Comment deleted successfully",
      deletedCount: totalToDelete
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
