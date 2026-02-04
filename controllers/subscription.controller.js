import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";
import SubscriptionPurchase from "../models/subscriptionPurchase.model.js";

/* ================= CREATE PLAN ================= */
export const createSubscription = async (req, res) => {
  try {
    const {
      planType,
      duration,
      planPricingType, // "free" or "paid"
      price,
      freeJobs,
      planStatus,
      planBenefits,
      includedCourses,
      includedEbooks
    } = req.body;

    // Basic validation
    if (!planType || !duration || !planPricingType) {
      return res.status(400).json({
        message: "Plan type, duration and pricing type are required"
      });
    }

    // If paid, price must be > 0
    if (planPricingType === "paid" && (!price || price <= 0)) {
      return res.status(400).json({
        message: "Price is required for paid plan"
      });
    }

    // If free, force price = 0
    const finalPrice = planPricingType === "free" ? 0 : price;

    const plan = await Subscription.create({
      planType,
      duration,
      planPricingType,
      price: finalPrice,
      freeJobs,
      planStatus,
      planBenefits: Array.isArray(planBenefits)
        ? planBenefits
        : planBenefits
          ? planBenefits.split(",").map((b) => b.trim())
          : [],
      includedCourses: includedCourses || [],
      includedEbooks: includedEbooks || []
    });

    res.status(201).json({
      success: true,
      message: "Subscription plan created successfully",
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


/* ================= UPDATE PLAN ================= */
export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Subscription.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    const {
      planType,
      duration,
      planPricingType, // "free" or "paid"
      price,
      freeJobs,
      planStatus,
      planBenefits,
      includedCourses,
      includedEbooks
    } = req.body;

    // Basic fields
    if (planType !== undefined) plan.planType = planType;
    if (duration !== undefined) plan.duration = duration;
    if (freeJobs !== undefined) plan.freeJobs = freeJobs;
    if (planStatus !== undefined) plan.planStatus = planStatus;

    // Pricing logic
    if (planPricingType !== undefined) {
      plan.planPricingType = planPricingType;

      if (planPricingType === "free") {
        plan.price = 0; // force free
      }

      if (planPricingType === "paid") {
        if (!price || price <= 0) {
          return res.status(400).json({
            message: "Price is required for paid plan"
          });
        }
        plan.price = price;
      }
    } else {
      // If pricing type not changed, but price is coming
      if (price !== undefined) {
        if (plan.planPricingType === "free") {
          plan.price = 0; // ignore sent price
        } else {
          if (price <= 0) {
            return res.status(400).json({
              message: "Price must be greater than 0"
            });
          }
          plan.price = price;
        }
      }
    }

    // Benefits
    if (planBenefits !== undefined) {
      if (Array.isArray(planBenefits)) {
        plan.planBenefits = planBenefits;
      } else {
        plan.planBenefits = planBenefits.split(",").map((b) => b.trim());
      }
    }

    // Relations
    if (includedCourses !== undefined) plan.includedCourses = includedCourses;
    if (includedEbooks !== undefined) plan.includedEbooks = includedEbooks;

    await plan.save();

    res.json({
      success: true,
      message: "Subscription plan updated successfully",
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


/* ================= DELETE PLAN (PROTECTED + SOFT DELETE) ================= */
export const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Subscription.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    // 1. Check for active enrollments
    const activeUsage = await SubscriptionPurchase.countDocuments({
      subscription: id,
      status: "active"
    });

    if (activeUsage > 0) {
      return res.status(400).json({
        success: false,
        message: "This plan cannot be deleted because it is currently used by students."
      });
    }

    // 2. Soft delete
    plan.isDeleted = true;
    plan.planStatus = false;
    await plan.save();

    res.json({ success: true, message: "Subscription plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET SINGLE PLAN (POPULATE) ================= */
export const getSingleSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Subscription.findById(id)
      .populate("includedCourses")
      .populate("includedEbooks");

    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET ALL PLANS (SEARCH + FILTER + PAGINATION + POPULATE) ================= */
export const getAllSubscriptions = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, status } = req.query;

    let filter = {};

    if (search) {
      filter.planType = { $regex: search, $options: "i" };
    }

    if (status !== undefined) {
      filter.planStatus = status === "true";
    }

    const total = await Subscription.countDocuments({ ...filter, isDeleted: { $ne: true } });

    // 🚀 SYNC MIGRATION logic (Ensuring Source of Truth)
    // This runs to ensure all existing User.purchaseSubscriptions are mirrored in SubscriptionPurchase
    const usersWithSubs = await User.find({ "purchaseSubscriptions.0": { $exists: true } });
    for (const user of usersWithSubs) {
      for (const subItem of user.purchaseSubscriptions) {
        // Check if this specific enrollment already exists in SubscriptionPurchase
        const exists = await SubscriptionPurchase.findOne({
          user: user._id,
          subscription: subItem.subscription,
          startDate: subItem.startDate,
          endDate: subItem.endDate
        });

        if (!exists) {
          const plan = await Subscription.findById(subItem.subscription);
          if (plan) {
            await SubscriptionPurchase.create({
              user: user._id,
              subscription: plan._id,
              planType: plan.planType,
              duration: plan.duration,
              pricePaid: plan.price,
              pricingType: plan.planPricingType,
              startDate: subItem.startDate || user.createdAt,
              endDate: subItem.endDate,
              status: new Date(subItem.endDate) > new Date() ? "active" : "expired"
            });
          }
        }
      }
    }

    const plans = await Subscription.find({ ...filter, isDeleted: { $ne: true } })
      .populate("includedCourses")
      .populate("includedEbooks")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate isInUse and totalStudents for each plan
    const plansWithUsage = await Promise.all(plans.map(async (plan) => {
      const usageCount = await SubscriptionPurchase.countDocuments({
        subscription: plan._id,
        status: "active"
      });
      const planObj = plan.toObject();
      planObj.totalStudents = usageCount;
      planObj.isInUse = usageCount > 0;
      return planObj;
    }));

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: plansWithUsage
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= TOGGLE PLAN STATUS (PROTECTED) ================= */
export const toggleSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Subscription.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    // If attempting to deactivate, check for active usage
    if (plan.planStatus === true) {
      const activeUsage = await SubscriptionPurchase.countDocuments({
        subscription: id,
        status: "active"
      });

      if (activeUsage > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot deactivate plan. Students are currently using it."
        });
      }
    }

    plan.planStatus = !plan.planStatus;
    await plan.save();

    res.json({
      success: true,
      message: "Plan status updated",
      data: {
        _id: plan._id,
        planStatus: plan.planStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
