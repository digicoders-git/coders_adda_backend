import ShortComment from "../models/shortComment.model.js";
import Short from "../models/short.model.js";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";

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
      userModel: "User",
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
      success: true,
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

    // Check if it's admin or user replying
    const adminId = req.admin ? req.admin.id : req.userId;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!commentText) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const parent = await ShortComment.findById(commentId);
    if (!parent) {
      return res.status(404).json({ message: "Parent comment not found" });
    }

    const isAmin = !!req.admin;

    const reply = await ShortComment.create({
      shortId: parent.shortId,
      userId: adminId,
      userModel: isAmin ? "Admin" : "User",
      commentText,
      parentComment: parent._id,
      isAdminReply: isAmin
    });

    // increment totalComments
    await Short.updateOne(
      { _id: parent.shortId },
      { $inc: { totalComments: 1 } }
    );

    res.status(201).json({
      success: true,
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
export const getCommentsByShort = async (req, res) => {
  try {
    const { shortId } = req.params;

    const comments = await ShortComment.find({ shortId })
      .populate("userId", "name email profilePicture profilePhoto")
      .sort({ createdAt: 1 })
      .lean();

    // build nested structure
    const map = {};
    comments.forEach((c) => {
      map[c._id.toString()] = { ...c, replies: [] };
    });

    const result = [];

    comments.forEach((c) => {
      if (c.parentComment) {
        const parentId = c.parentComment.toString();
        if (map[parentId]) {
          map[parentId].replies.push(map[c._id.toString()]);
        }
      } else {
        result.push(map[c._id.toString()]);
      }
    });

    res.json({
      success: true,
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

/* ================= GET LATEST COMMENTS (FOR DASHBOARD) ================= */
export const getLatestComments = async (req, res) => {
  try {
    const comments = await ShortComment.find({ parentComment: null })
      .populate("userId", "name email profilePicture profilePhoto")
      .populate("shortId", "caption video")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: comments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



/* ================= DELETE COMMENT (USER OWN OR ADMIN) ================= */
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const adminIdentity = req.admin;
    const userIdentity = req.userId;

    const comment = await ShortComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    // Permission Check
    // 1. If Admin -> Allowed
    // 2. If User -> Only if comment belongs to them
    const isOwner = userIdentity && comment.userId.toString() === userIdentity.toString();
    const isAdmin = !!adminIdentity;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only delete your own comments"
      });
    }

    const shortId = comment.shortId;

    // Find all nested replies recursively
    const getAllReplies = async (id) => {
      let ids = [id];
      const directReplies = await ShortComment.find({ parentComment: id });
      for (const reply of directReplies) {
        const nestedIds = await getAllReplies(reply._id);
        ids = [...ids, ...nestedIds];
      }
      return ids;
    };

    const allIdsToDelete = await getAllReplies(comment._id);
    const totalToDelete = allIdsToDelete.length;

    await ShortComment.deleteMany({ _id: { $in: allIdsToDelete } });

    // Decrement totalComments in Short model
    await Short.updateOne(
      { _id: shortId },
      { $inc: { totalComments: -totalToDelete } }
    );

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      deletedCount: totalToDelete
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
