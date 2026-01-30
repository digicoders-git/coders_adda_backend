import Course from "../models/course.model.js";
import Ebook from "../models/ebook.model.js";
import Subscription from "../models/subscription.model.js";
import Job from "../models/job.model.js";

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
      if (!user.purchaseEbooks.includes(itemId)) {   // ✅ FIXED NAME
        user.purchaseEbooks.push(itemId);
      }
    }
  },

  subscription: {
    model: Subscription,
    priceField: "price",
    priceTypeField: "priceType",
    unlock: async (user, itemId) => {
      if (!user.purchaseSubscriptions.includes(itemId)) {  // ✅ ARRAY BASED
        user.purchaseSubscriptions.push(itemId);
      }
    }
  },

  job: {
    model: Job,
    priceField: "price",
    priceTypeField: "priceType",
    unlock: async (user, itemId) => {
      if (!user.purchaseJobs.includes(itemId)) {  // ✅ FIXED
        user.purchaseJobs.push(itemId);
      }
    }
  }
};
