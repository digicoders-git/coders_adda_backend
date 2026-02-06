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
    priceTypeField: "priceType",
    unlock: async (user, itemId) => {
      // Check for existing subscription (handling object structure)
      const alreadySubscribed = user.purchaseSubscriptions.some(
        (sub) => sub.subscription.toString() === itemId.toString()
      );

      if (!alreadySubscribed) {
        const subscription = await Subscription.findById(itemId);
        if (subscription) {
          // Parse duration (ensure it handles strings like "3 Months")
          const durationInMonths = parseInt(subscription.duration) || 1;

          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + durationInMonths);

          user.purchaseSubscriptions.push({
            subscription: itemId,
            startDate,
            endDate
          });
        }
      }
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
  }
};
