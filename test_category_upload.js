import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const testUpload = async () => {
    const data = new FormData();
    data.append("name", "Test Category " + Date.now());
    data.append("description", "Test description");

    // Use an existing image file from the system for testing if possible, 
    // or just check if it reaches the controller if I can't find one.
    // I'll try to find any image in the project.

    try {
        const response = await axios.post("https://coders-adda-backend.onrender.com/CourseCategory/create", data, {
            headers: data.getHeaders()
        });
        console.log("Response:", response.data);
    } catch (err) {
        console.error("Error:", err.response?.data || err.message);
    }
};

testUpload();
