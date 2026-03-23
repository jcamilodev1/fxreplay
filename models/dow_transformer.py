import torch
import torch.nn as nn
import math

class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super(PositionalEncoding, self).__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)
        self.register_buffer('pe', pe)

    def forward(self, x):
        return x + self.pe[:x.size(0), :]

class DowTransformer(nn.Module):
    def __init__(self, input_dim, d_model=128, nhead=8, num_layers=4, dim_feedforward=512, dropout=0.1):
        """
        Robust Transformer for Dow Theory Trading.
        
        input_dim: Number of features per candle (Price, Volume, Dow Features, etc.)
        d_model: Internal dimension of the transformer (size of embeddings)
        nhead: Number of attention heads
        num_layers: Number of encoder layers (the depth of the "brain")
        dim_feedforward: Hidden layer size in the feedforward network
        """
        super(DowTransformer, self).__init__()
        
        # 1. Input Embedding: Project raw features into a higher-dimensional space
        self.input_projection = nn.Linear(input_dim, d_model)
        
        # 2. Positional Encoding: Give the model a sense of time order
        self.pos_encoder = PositionalEncoding(d_model)
        
        # 3. Transformer Encoder: The core processing engine
        encoder_layers = nn.TransformerEncoderLayer(
            d_model=d_model, 
            nhead=nhead, 
            dim_feedforward=dim_feedforward, 
            dropout=dropout,
            batch_first=True,
            norm_first=True # This makes training MUCH more stable
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layers, num_layers=num_layers)
        
        # 4. Output Head: Predict the next move
        # We'll use a classification head: 0 (Sell), 1 (Hold/Neutral), 2 (Buy)
        self.out = nn.Sequential(
            nn.Linear(d_model, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 3) 
        )
        
    def forward(self, src):
        """
        src shape: [batch_size, sequence_length, input_dim]
        """
        # Project features to d_model
        x = self.input_projection(src) # [batch, seq, d_model]
        
        # Apply positional encoding
        x = x.transpose(0, 1) # [seq, batch, d_model] for PE
        x = self.pos_encoder(x)
        x = x.transpose(0, 1) # [batch, seq, d_model] back
        
        # Pass through Transformer
        output = self.transformer_encoder(x) # [batch, seq, d_model]
        
        # Use the LAST candle's output to make the prediction
        # (The context of the whole sequence is already encoded in it by attention)
        last_step_output = output[:, -1, :] 
        
        return self.out(last_step_output)
