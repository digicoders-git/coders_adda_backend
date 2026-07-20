import axios from "axios";

export const sendOtpSms = async (dsMobile, otp) => {
  try {
    // const message = `Your OTP Code is ${otp}. Do not share it with anyone. From DigiCoders. #TeamDigi`;

    // const url = "http://sms.digicoders.in/api/sendhttp.php";
    // console.log(phone,otp)

    // const params = {
    //   authkey: "370038A9phBOW9czQ68e3ee20P1",
    //   mobiles: phone,
    //   message: message,
    //   sender: "DIGICO",
    //   route: "4",
    //   country: "91",
    //   DLT_TE_ID: "1307164706435757762"
    // };

    // const response = await axios.get(url, { params });
    const response = await axios.get(`http://sms.digicoders.in/api/sendhttp.php?authkey=${process.env.AUTHKEY}&mobiles=${dsMobile}&message=Your OTP Code is ${otp}. Do not share it with anyone. From VizStik . Developed by %23TeamDigiCoders&sender=DIGICO&route=4&country=91&DLT_TE_ID=${process.env.DLT_TE_ID}`);

    console.log("SMS API Response:", response.data);
    return true;

  } catch (error) {
    console.error("SMS Send Error:", error.message);
    return false;
  }
};
