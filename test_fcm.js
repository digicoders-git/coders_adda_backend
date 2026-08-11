import mongoose from "mongoose";
import { Notification } from "./models/notification.model.js";
import { processNotification } from "./controllers/notification.controller.js";

const testProcess = async () => {
    await mongoose.connect('mongodb+srv://digicodersdevelopment_db_user:AdhYWINPnWoEoeZn@coddersadda.mv9qows.mongodb.net/CodersAdda?appName=CoddersAdda');
    console.log("Connected to DB");

    const notif = await Notification.findById('6a799ebbb07dba87c9a2c822'); // E-book
    if(notif) {
        console.log("Processing notification:", notif.title);
        await processNotification(notif);
        console.log("Finished process");
    }
    
    mongoose.connection.close();
};

testProcess();
