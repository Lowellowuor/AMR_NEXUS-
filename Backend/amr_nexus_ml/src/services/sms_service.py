import africastalking
import os

AFRICASTALKING_USERNAME = os.getenv("AFRICASTALKING_USERNAME", "sandbox")
AFRICASTALKING_API_KEY = os.getenv("AFRICASTALKING_API_KEY")

africastalking.initialize(AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY)
sms = africastalking.SMS

def send_sms(phone, message):
    try:
        response = sms.send(message, [phone])
        return {"status": "success", "response": response}
    except Exception as e:
        return {"status": "error", "detail": str(e)}