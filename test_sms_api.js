import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const runTest = async () => {
  try {
    const dsMobile = '7549910025'; // Test number
    const message = `Your test "Auto Notification Test" has started now. Best of luck!`;
    const encodedMessage = encodeURIComponent(message);
    const dlt = process.env.DLT_TE_ID;
    
    console.log("URL:", `http://sms.digicoders.in/api/sendhttp.php?authkey=${process.env.AUTHKEY}&mobiles=${dsMobile}&message=${encodedMessage}&sender=DIGICO&route=4&country=91&DLT_TE_ID=${dlt}`);
    
    const response = await axios.get(`http://sms.digicoders.in/api/sendhttp.php?authkey=${process.env.AUTHKEY}&mobiles=${dsMobile}&message=${encodedMessage}&sender=DIGICO&route=4&country=91&DLT_TE_ID=${dlt}`);
    
    console.log("Custom SMS API Response:", response.data);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    if(error.response) console.error(error.response.data);
    process.exit(1);
  }
};
runTest();
