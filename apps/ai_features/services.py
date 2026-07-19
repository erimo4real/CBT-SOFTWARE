import os
from openai import OpenAI


def get_client():
    return OpenAI(api_key=os.environ.get('OPENAI_API_KEY', ''))


def chat_completion(messages, model='gpt-4o-mini', temperature=0.7, max_tokens=2000):
    client = get_client()
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


def generate_with_context(system_prompt, user_prompt, model='gpt-4o-mini'):
    return chat_completion(
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
        model=model,
        temperature=0.5,
        max_tokens=3000,
    )
