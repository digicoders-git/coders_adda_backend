import Subscription from "../models/subscription.model.js";

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


/* ================= DELETE PLAN ================= */
export const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Subscription.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    await plan.deleteOne();

    res.json({ message: "Subscription plan deleted successfully" });
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

    res.json({ data: plan });
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

    const total = await Subscription.countDocuments(filter);

    const plans = await Subscription.find(filter)
      .populate("includedCourses")
      .populate("includedEbooks")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: plans
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= TOGGLE PLAN STATUS ================= */
export const toggleSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Subscription.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    plan.planStatus = !plan.planStatus;
    await plan.save();

    res.json({
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
