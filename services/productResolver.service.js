import Course from "../models/course.model.js";
// later:
// import Ebook from ...
// import Subscription from ...

export const resolveProduct = async (itemType, itemId) => {
  switch (itemType) {
    case "course":
      return await Course.findById(itemId);
    default:
      return null;
  }
};
