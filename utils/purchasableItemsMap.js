import Course from "../models/course.model.js";
import Ebook from "../models/ebook.model.js";
import Subscription from "../models/subscription.model.js";
import Job from "../models/job.model.js";

export const purchasableItemsMap = {
  course: {
    model: Course,
    priceField: "price",
    priceTypeField: "priceType", // free/paid
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
      if (!user.purchasedEbooks.includes(itemId)) {
        user.purchasedEbooks.push(itemId);
      }
    }
  },

  subscription: {
    model: Subscription,
    priceField: "price",
    unlock: async (user, itemId) => {
      user.activeSubscription = itemId;
      user.subscriptionValidTill = new Date(Date.now() + 30*24*60*60*1000); // example
    }
  },

  job: {
    model: Job,
    priceField: "price",
    unlock: async (user, itemId) => {
      if (!user.premiumJobsUnlocked.includes(itemId)) {
        user.premiumJobsUnlocked.push(itemId);
      }
    }
  }
};

