import Faq from "../models/faq.model.js";

// Add a new FAQ
export const addFaq = async (req, res) => {
  try {
    const { question, answer, showOnWebsite, showOnApp, isActive } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and Answer are required",
      });
    }

    const newFaq = new Faq({
      question,
      answer,
      showOnWebsite: showOnWebsite !== undefined ? showOnWebsite : true,
      showOnApp: showOnApp !== undefined ? showOnApp : true,
      isActive: isActive !== undefined ? isActive : true,
    });

    await newFaq.save();

    res.status(201).json({
      success: true,
      message: "FAQ added successfully",
      faq: newFaq,
    });
  } catch (error) {
    console.error("Add FAQ Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get all FAQs (with optional filtering)
export const getFaqs = async (req, res) => {
  try {
    const { platform, activeOnly } = req.query;
    
    let query = {};
    
    if (activeOnly === "true") {
      query.isActive = true;
    }

    if (platform === "website") {
      query.showOnWebsite = true;
    } else if (platform === "app") {
      query.showOnApp = true;
    }

    const faqs = await Faq.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      faqs,
    });
  } catch (error) {
    console.error("Get FAQs Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update an FAQ
export const updateFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, showOnWebsite, showOnApp, isActive } = req.body;

    const faq = await Faq.findById(id);
    if (!faq) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }

    if (question) faq.question = question;
    if (answer) faq.answer = answer;
    if (showOnWebsite !== undefined) faq.showOnWebsite = showOnWebsite;
    if (showOnApp !== undefined) faq.showOnApp = showOnApp;
    if (isActive !== undefined) faq.isActive = isActive;

    await faq.save();

    res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      faq,
    });
  } catch (error) {
    console.error("Update FAQ Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete an FAQ
export const deleteFaq = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await Faq.findByIdAndDelete(id);
    if (!faq) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("Delete FAQ Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
