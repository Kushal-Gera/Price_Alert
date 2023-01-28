import requests
from bs4 import BeautifulSoup
from urllib.request import urlopen
import boto3
import json
import os
from email.message import EmailMessage
import ssl
import smtplib



AMAZON = "amazon"
FLIPKART = "flipkart"
MYNTRA = "myntra"
NYKAA = "nykaa"
PLATFORMS = [AMAZON, FLIPKART, MYNTRA, NYKAA]

USER_AGENTS = [
        ('Mozilla/5.0 (X11; Linux x86_64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/57.0.2987.110 '
            'Safari/537.36'),  # chrome
        ('Mozilla/5.0 (X11; Linux x86_64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/61.0.3163.79 '
            'Safari/537.36'),  # chrome
        ('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:55.0) '
            'Gecko/20100101 '
            'Firefox/55.0'),  # firefox
        ('Mozilla/5.0 (X11; Linux x86_64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/61.0.3163.91 '
            'Safari/537.36'),  # chrome
        ('Mozilla/5.0 (X11; Linux x86_64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/62.0.3202.89 '
            'Safari/537.36'),  # chrome
        ('Mozilla/5.0 (X11; Linux x86_64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/63.0.3239.108 '
            'Safari/537.36'),
        ('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), 
    ]


# AWS_ACCESS_KEY_ID=os.environ.get("AWS_ACCESS_KEY_ID")
# AWS_SECRET_ACCESS_KEY=os.environ.get("AWS_SECRET_ACCESS_KEY")
# GOOGLE_ACC_KEY=os.environ.get("GOOGLE_ACC_KEY")

AWS_ACCESS_KEY_ID="AKIASKNBV4DMGVMSCPW2"
AWS_SECRET_ACCESS_KEY="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"
GOOGLE_ACC_KEY="hgmiqwkxpeugtslj"

MY_WEBSITE_URL="https://price-alert-od1v.onrender.com/"
SENDER_EMAIL="kushalgera1999@gmail.com"
AWS_BUCKET_NAME="my-products-for-alert"
REGION = 'ap-south-1'
INSTANCE_ID = "i-04308491c8b2a4dd9"



def stop_ec2():
    print("Stopping resources")

    cnt = 1
    while cnt <= 3:
        try:
            ec2 = boto3.client('ec2', region_name=REGION)
            ec2.stop_instances(InstanceIds = [INSTANCE_ID])
            cnt = 100
        except:
            print(f"EC2 instance cannot be stopped, retry count: {cnt}")
            cnt += 1

def get_platform_name(url):
    url = url.lower()
    for site in PLATFORMS:
        if url.find(site.lower()) != -1 : return site
    return PLATFORMS[0] 

def get_main_url(original_url):
    final_url = original_url
    try:
        response = urlopen(original_url)
        final_url = response.geturl()
    except:
        final_url = original_url
    finally:
        return final_url

def get_current_price(data):
    url = data.get("product_url", "")
    platform_name = get_platform_name(get_main_url(url))
    data['platform_name'] = platform_name

    for u in USER_AGENTS:
        HEADERS = {"User-Agent" : u}
        data = requests.get(url, headers=HEADERS).text
        soup = BeautifulSoup(data, "html.parser")
        price = -1

        if platform_name == AMAZON:
            price_item = soup.find(class_="a-price-whole")
        elif platform_name == FLIPKART:
            price_item = soup.find(class_="_30jeq3")
        elif platform_name == NYKAA:
            price_item = soup.find(class_="css-1jczs19")
        else:
            price_item = soup.find(class_="pdp-price")
        
        if price_item:
            price = int(''.join(filter(str.isdigit, price_item.get_text() )))
        return price
    return -1

def send_alert(data, cur_price):
    try:
        email = data.get("email", "")
        product_name = data.get("product_name", "").upper()
        product_url = data.get("product_url", "")
        platform_name = data.get("platform_name", "").upper()

        subject = f"Hurrayy... {product_name} is at a discount!!"
        body = f'''
Hello dear user,
This is an automated alert from Price-Alert for {product_name}.

Your listed product '{product_name}' is currently on discount at just ₹{cur_price}.


Buy directly from {platform_name} -> {product_url}.


List more products with us, visit us back at {MY_WEBSITE_URL}.
    '''


        em = EmailMessage()
        em['From'] = SENDER_EMAIL
        em["To"] = email
        em["Subject"] = subject
        em.set_content(body)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as smtp:
            smtp.login(SENDER_EMAIL, GOOGLE_ACC_KEY)
            smtp.sendmail(SENDER_EMAIL, email, em.as_string())
            print("Alert sent.")
            return True
    except:
        return False
    return False



if __name__ == "__main__":
        
    s3 = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )

    for key in s3.list_objects(Bucket=AWS_BUCKET_NAME)['Contents']:
        key = key.get('Key')
        data = s3.get_object(Bucket=AWS_BUCKET_NAME, Key=key)
        contents = data['Body'].read()
        
        json_data = contents.decode("utf-8")
        data_obj = json.loads(json_data)
        # [product_name, email, trigger_price, product_url, platform_name]

        target_price = int(data_obj.get("trigger_price", 100))
        cur_price = int(get_current_price(data_obj))

        if cur_price == -1:
            print("Error occured in fetching")
        elif cur_price <= target_price:
            if send_alert(data_obj, cur_price):
                s3.delete_object(Bucket=AWS_BUCKET_NAME, Key=key)
                print("Removed 1 product")
            else:
                print("Error occured while alerting")

    stop_ec2()