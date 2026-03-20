from fastapi import FastAPI # type: ignore
from pydantic import BaseModel # type: ignore
import torch # type: ignore
import os

from mini_gpt import model, device, encode, decode, stoi # type: ignore

from fastapi.middleware.cors import CORSMiddleware # type: ignore

app = FastAPI()

# Add CORS Middleware to allow React Frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins (e.g. localhost:3000)
    allow_credentials=False, # Must be False when allow_origins is ["*"]
    allow_methods=["*"], # Allows all methods (POST, GET, OPTIONS, etc.)
    allow_headers=["*"], # Allows all headers
)

# Load weights when the server starts
model_path = "mini_gpt_transformer.pth"
if os.path.exists(model_path):
    print(f"Loading weights from {model_path} into API...")
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    print("Model loaded and ready for inference.")
else:
    print(f"WARNING: Model weights '{model_path}' not found. Please run mini_gpt.py first.")

class ChatRequest(BaseModel):
    prompt: str

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    # Format the prompt automatically
    formatted_prompt = f"User: {request.prompt}\nAI: "
    
    # Safely convert characters based on vocabulary
    safe_input = ''.join([c if c in stoi else ' ' for c in formatted_prompt])
    encoded_input = encode(safe_input)
    context = torch.tensor(encoded_input, dtype=torch.long, device=device).unsqueeze(0)
    
    # Generate the response
    with torch.no_grad():
        generated_tokens = model.generate(context, max_new_tokens=150, temperature=0.7, top_k=40)
        
    generated_text = str(decode(generated_tokens[0].tolist()))
    
    # Extract only the AI's generated response
    prompt_length = int(len(safe_input))
    ai_raw_response = generated_text[prompt_length:] # type: ignore
    
    # Clean up the output by splitting off any hallucinated turns
    clean_response = ai_raw_response.split("User:")[0].strip()
    
    # Return JSON response
    return {"response": clean_response}
