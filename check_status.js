import mongoose from "mongoose";
import { Notification } from "./models/notification.model.js";

const checkNotifs = async () => {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    console.log("Connected to DB");

    const recentNotifs = await Notification.find().sort({createdAt: -1}).limit(5);
    console.log("Recent notifications:");
    for (const n of recentNotifs) {
      console.log(`- ID: ${n._id} | Title: "${n.title}" | Status: ${n.status} | Time: ${n.createdAt}`);
    }
    
    mongoose.connection.close();
};

checkNotifs();
