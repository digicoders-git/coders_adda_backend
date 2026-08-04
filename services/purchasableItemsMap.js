import Course from "../models/course.model.js";
import Ebook from "../models/ebook.model.js";
import Subscription from "../models/subscription.model.js";
import Job from "../models/job.model.js";
import EbookEnrollment from "../models/ebookEnrollment.model.js";
import JobEnrollment from "../models/jobEnrollment.model.js";

export const purchasableItemsMap = {
  course: {
    model: Course,
    priceField: "price",
    priceTypeField: "priceType",
    unlock: async (user, itemId) => {
      if (!user.purchaseCourses.includes(itemId)) {
        user.purchaseCourses.push(itemId);
      }
    }
  },

  ebook: {
    model: Ebook,
    priceField: "price",
    priceTypeField: "priceType",
    unlock: async (user, itemId) => {
      if (!user.purchaseEbooks.includes(itemId)) {
        user.purchaseEbooks.push(itemId);

        const ebook = await Ebook.findById(itemId);
        await EbookEnrollment.findOneAndUpdate(
          { user: user._id, ebook: itemId },
          {
            user: user._id,
            ebook: itemId,
            pricePaid: ebook?.priceType === "free" ? 0 : (ebook?.price || 0),
            enrolledAt: new Date()
          },
          { upsert: true, new: true }
        );
      }
    }
  },

  subscription: {
    model: Subscription,
    priceField: "price",
    priceTypeField: "planPricingType",
    unlock: async (user, itemId) => {
      const subscription = await Subscription.findById(itemId);
      if (!subscription) return;

      const durationInMonths = parseInt(subscription.duration) || 1;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + durationInMonths);

      // 🔥 One Plan Per User: Replace existing subscription instead of blocking
      const existingIndex = user.purchaseSubscriptions.findIndex(
        (sub) => sub.subscription && sub.subscription.toString() === itemId.toString()
      );

      if (existingIndex !== -1) {
        // Same plan exists — just update dates (renew)
        user.purchaseSubscriptions[existingIndex].startDate = startDate;
        user.purchaseSubscriptions[existingIndex].endDate = endDate;
      } else {
        // Different plan or no plan — replace all with new one (1 plan per user)
        user.purchaseSubscriptions = [{
          subscription: itemId,
          startDate,
          endDate
        }];
      }

      // Reset free job unlocks when a new plan is activated
      user.freeJobUnlocksUsed = 0;
    }
  },

  job: {
    model: Job,
    priceField: "price",
    priceTypeField: "priceType",
    unlock: async (user, itemId) => {
      if (!user.purchaseJobs.includes(itemId)) {
        user.purchaseJobs.push(itemId);

        const job = await Job.findById(itemId);
        await JobEnrollment.findOneAndUpdate(
          { user: user._id, job: itemId },
          {
            user: user._id,
            job: itemId,
            pricePaid: job?.priceType === "free" ? 0 : (job?.price || 0),
            enrolledAt: new Date()
          },
          { upsert: true, new: true }
        );
      }
    }
  },

  jobV2: {
    model: Job,
    priceField: "price",
    priceTypeField: "priceType",
    unlock: async (user, itemId) => {
      // 🔥 Count FREE unlocks for this user in JobEnrollment
      const freeUnlockCount = await JobEnrollment.countDocuments({
        user: user._id,
        pricePaid: 0
      });

      const job = await Job.findById(itemId);

      // 🔥 If already 3 free unlocks and trying to unlock another free job → Error
      if (job.priceType === "free" && freeUnlockCount >= 3) {
        throw new Error("Free job unlock limit reached. Please purchase.");
      }

      if (!user.purchaseJobs.includes(itemId)) {
        user.purchaseJobs.push(itemId);

        await JobEnrollment.findOneAndUpdate(
          { user: user._id, job: itemId },
          {
            user: user._id,
            job: itemId,
            pricePaid: job.priceType === "free" ? 0 : job.price,
            enrolledAt: new Date()
          },
          { upsert: true, new: true }
        );
      }
    }
  },

  jobV3: {
    model: Job,
    priceField: "price",
    priceTypeField: "priceType",
    unlock: async (user, itemId) => {
      const job = await Job.findById(itemId);
      if (!job) throw new Error("Job not found");

      if (user.purchaseJobs.includes(itemId)) {
        return; // Already unlocked
      }

      let pricePaid = job.price;

      // If it's a paid job and user has free unlocks left, make it free
      if (job.priceType === "paid" && user.freeJobUnlocksUsed < 3) {
        pricePaid = 0;
        user.freeJobUnlocksUsed += 1;
      } else if (job.priceType === "free") {
        pricePaid = 0;
      }

      user.purchaseJobs.push(itemId);

      await JobEnrollment.findOneAndUpdate(
        { user: user._id, job: itemId },
        {
          user: user._id,
          job: itemId,
          pricePaid: pricePaid,
          enrolledAt: new Date()
        },
        { upsert: true, new: true }
      );
    }
  }
};
