import torch # type: ignore
import torch.nn as nn # type: ignore
from torch.nn import functional as F # type: ignore
import urllib.request
import os
import time

# 1. Dataset Generation (Fetching Real Conversational Data)
dataset_path = "chat_dataset.txt"

def download_and_parse_dataset(filepath):
    urls = [
        "https://raw.githubusercontent.com/chatterbot/chatterbot-corpus/master/chatterbot_corpus/data/english/conversations.yml",
        "https://raw.githubusercontent.com/chatterbot/chatterbot-corpus/master/chatterbot_corpus/data/english/ai.yml"
    ]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        for url in urls:
            try:
                response = urllib.request.urlopen(url)
                content = response.read().decode('utf-8')
                lines = content.split('\n')
                
                user_msg = ""
                for line in lines:
                    line = line.strip()
                    if line.startswith("- - "):
                        user_msg = line.replace("- - ", "").strip().strip("'").strip('"')
                    elif line.startswith("- ") and user_msg:
                        ai_msg = line.replace("- ", "").strip().strip("'").strip('"')
                        f.write(f"User: {user_msg}\nAI: {ai_msg}\n\n")
                        user_msg = ai_msg # cascade the conversation
                        
            except Exception as e:
                print(f"Failed to process {url}: {e}")

if not os.path.exists(dataset_path):
    print(f"Downloading real conversational dataset ({dataset_path})... please wait.")
    download_and_parse_dataset(dataset_path)
    print("Dataset generation complete.")

# 2. Read Data
print("Reading dataset...")
with open(dataset_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fallback if download failed or file is empty
if len(text) < 100:
    print("Dataset empty. Generating synthetic fallback.")
    text = "User: Hello\nAI: Hi there!\n\nUser: What are you?\nAI: I am a Transformer AI.\n\n" * 500
    with open(dataset_path, "w", encoding='utf-8') as f: f.write(text)

print(f"Length of dataset in characters: {len(text)}")

chars = sorted(list(set(text)))
vocab_size = len(chars)
print(f"Vocabulary size: {vocab_size}")

stoi = {ch: i for i, ch in enumerate(chars)}
itos = {i: ch for i, ch in enumerate(chars)}
encode = lambda s: [stoi[c] for c in s]
decode = lambda l: ''.join([itos[i] for i in l])

print("Encoding text data into tensors... please wait.")
data = torch.tensor(encode(text), dtype=torch.long)

# 3. Hyperparameters
block_size = 128
batch_size = 64
max_iters = 3000
learning_rate = 3e-4
eval_interval = 500
n_embd = 128
n_head = 4
n_layer = 4
dropout = 0.1
device = 'cuda' if torch.cuda.is_available() else 'cpu'

data = data.to(device)

def get_batch():
    ix = torch.randint(len(data) - block_size, (batch_size,))
    x = torch.stack([data[i:i+block_size] for i in ix])
    y = torch.stack([data[i+1:i+block_size+1] for i in ix])
    x, y = x.to(device), y.to(device)
    return x, y

# 4. GPT-Style Transformer Architecture
class Head(nn.Module):
    """ One head of self-attention """
    def __init__(self, head_size):
        super().__init__()
        self.key = nn.Linear(n_embd, head_size, bias=False)
        self.query = nn.Linear(n_embd, head_size, bias=False)
        self.value = nn.Linear(n_embd, head_size, bias=False)
        self.register_buffer('tril', torch.tril(torch.ones(block_size, block_size)))
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        B, T, C = x.shape
        k = self.key(x)   # (B, T, head_size)
        q = self.query(x) # (B, T, head_size)
        
        # Compute attention scores
        wei = q @ k.transpose(-2, -1) * (C ** -0.5) # (B, T, T)
        wei = wei.masked_fill(self.tril[:T, :T] == 0, float('-inf'))
        wei = F.softmax(wei, dim=-1)
        wei = self.dropout(wei)
        
        # Perform weighted aggregation of values
        v = self.value(x) # (B, T, head_size)
        out = wei @ v # (B, T, T) @ (B, T, head_size) => (B, T, head_size)
        return out

class MultiHeadAttention(nn.Module):
    """ Multiple heads of self-attention in parallel """
    def __init__(self, num_heads, head_size):
        super().__init__()
        self.heads = nn.ModuleList([Head(head_size) for _ in range(num_heads)])
        self.proj = nn.Linear(n_embd, n_embd)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        out = torch.cat([h(x) for h in self.heads], dim=-1)
        out = self.dropout(self.proj(out))
        return out

class FeedForward(nn.Module):
    """ A simple linear layer followed by a non-linearity """
    def __init__(self, n_embd):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_embd, 4 * n_embd),
            nn.ReLU(),
            nn.Linear(4 * n_embd, n_embd),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        return self.net(x)

class Block(nn.Module):
    """ Transformer block: communication followed by computation """
    def __init__(self, n_embd, n_head):
        super().__init__()
        head_size = n_embd // n_head
        self.sa = MultiHeadAttention(n_head, head_size)
        self.ffwd = FeedForward(n_embd)
        self.ln1 = nn.LayerNorm(n_embd)
        self.ln2 = nn.LayerNorm(n_embd)

    def forward(self, x):
        x = x + self.sa(self.ln1(x))
        x = x + self.ffwd(self.ln2(x))
        return x

class MiniGPT_Transformer(nn.Module):
    def __init__(self):
        super().__init__()
        self.token_embedding_table = nn.Embedding(vocab_size, n_embd)
        self.position_embedding_table = nn.Embedding(block_size, n_embd)
        self.blocks = nn.Sequential(*[Block(n_embd, n_head) for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(n_embd)
        self.lm_head = nn.Linear(n_embd, vocab_size)

    def forward(self, idx, targets=None):
        B, T = idx.shape
        
        tok_emb = self.token_embedding_table(idx) # (B, T, C)
        pos_emb = self.position_embedding_table(torch.arange(T, device=device)) # (T, C)
        x = tok_emb + pos_emb # (B, T, C)
        
        x = self.blocks(x) # (B, T, C)
        x = self.ln_f(x) # (B, T, C)
        logits = self.lm_head(x) # (B, T, vocab_size)

        if targets is None:
            loss = None
        else:
            B, T, C = logits.shape
            logits = logits.view(B*T, C)
            targets = targets.view(B*T)
            loss = F.cross_entropy(logits, targets)

        return logits, loss

    def generate(self, idx, max_new_tokens, temperature=0.7, top_k=40):
        for _ in range(max_new_tokens):
            idx_cond = idx[:, -block_size:]
            logits, _ = self(idx_cond)
            
            # Use temperature sampling
            logits = logits[:, -1, :] / temperature # (B, C)
            
            # Optionally crop the logits to only the top k options
            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = -float('Inf')
                
            probs = F.softmax(logits, dim=-1) # (B, C)
            idx_next = torch.multinomial(probs, num_samples=1) # (B, 1)
            idx = torch.cat((idx, idx_next), dim=1) # (B, T+1)
        return idx

model = MiniGPT_Transformer().to(device)

if __name__ == '__main__':
    # 5. Training loop & Model Loading
    model_path = "mini_gpt_transformer.pth"

    if os.path.exists(model_path):
        print(f"Loading saved model weights from {model_path}...")
        model.load_state_dict(torch.load(model_path, map_location=device))
        print("Model loaded successfully. Skipping training.")
    else:
        optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
        
        print(f"Starting training on {device} for {max_iters} iterations...")
        start_time = time.time()
        for iter in range(max_iters):
            xb, yb = get_batch()
        
            logits, loss = model(xb, yb)
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            optimizer.step()
        
            if iter % eval_interval == 0 or iter == max_iters - 1:
                elapsed = time.time() - start_time
                print(f"Iteration {iter}: Loss = {loss.item():.4f} | Time: {elapsed:.2f}s")
                
        # Save the model after training
        print(f"Training complete! Saving model to {model_path}...")
        torch.save(model.state_dict(), model_path)

    # 6. Interactive Chat Loop
    print("\n" + "="*40)
    print("Mini GPT Interactive Chat")
    print("Type 'exit' or 'quit' to end the session.")
    print("="*40 + "\n")

    print("\n--- AI is Ready! ---")
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ['exit', 'quit']:
                print("Ending session. Goodbye!")
                break
                
            if not user_input.strip():
                continue
                
            # Format the input exactly as the dataset matches
            formatted_prompt = f"User: {user_input}\nAI: "
                
            # Encode user input to feed into the model as context
            safe_input = ''.join([c if c in stoi else ' ' for c in formatted_prompt])
            encoded_input = encode(safe_input)
            context = torch.tensor(encoded_input, dtype=torch.long, device=device).unsqueeze(0) # (1, T)
            
            # Generate response
            generated_tokens = model.generate(context, max_new_tokens=150, temperature=0.7, top_k=40)
            
            # The generated tokens include the prompt, so we decode the whole thing
            generated_text = str(decode(generated_tokens[0].tolist()))
            
            # Extract only the AI's generated response (remove the user prompt portion)
            prompt_length = int(len(safe_input))
            ai_raw_response = generated_text[prompt_length:] # type: ignore
            
            # We clean it up by splitting at the first occurrence of "User:" since the model might hallucinate the next chat
            clean_response = ai_raw_response.split("User:")[0].strip()
            
            print(f"AI: {clean_response}\n")
        except EOFError:
            break
