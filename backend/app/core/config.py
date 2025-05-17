import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

def get_openai_client():
    return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# config file
