import torch
import torch.nn as nn
import numpy as np
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset

class TrafficLSTM(nn.Module):
    def __init__(self, input_size=3, hidden_size=64, num_layers=2, output_size=1):
        super(TrafficLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        h0 = torch.zeros(2, x.size(0), 64).to(x.device)
        c0 = torch.zeros(2, x.size(0), 64).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])  # Only take the output from the last time step
        return out

class TrafficDataset(Dataset):
    def __init__(self, data, sequence_length=10):
        # data: Array of shape (N, 3) [Count, Queue, Density]
        self.data = torch.FloatTensor(data)
        self.sequence_length = sequence_length

    def __len__(self):
        return len(self.data) - self.sequence_length

    def __getitem__(self, idx):
        x = self.data[idx:idx+self.sequence_length] # Shape (10, 3)
        y = self.data[idx+self.sequence_length, 1]  # Predict next Queue Length (Index 1)
        return x, y

def load_data(filepath="ml_training/prediction/synthetic_traffic_data.csv"):
    try:
        import pandas as pd
        df = pd.read_csv(filepath)
        # Features: [vehicle_count, queue_length, density]
        data = df[['vehicle_count', 'queue_length', 'density']].values
        
        # Normalize Data (Min-Max Scaling)
        min_val = np.min(data, axis=0)
        max_val = np.max(data, axis=0)
        data = (data - min_val) / (max_val - min_val + 1e-5)
        
        return data
    except Exception as e:
        print(f"Error loading data: {e}")
        return None

def train_model(epochs=50):
    data = load_data()
    if data is None:
        return

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\n--- Initializing Training ---")
    print(f"Using compute device: {device}")
    
    model = TrafficLSTM().to(device)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    dataset = TrafficDataset(data)
    # Increased batch size from 16 to 256 to massively speed up GPU computation
    dataloader = DataLoader(dataset, batch_size=256, shuffle=True)
    
    print(f"Training on {len(data)} samples...")

    model.train()
    for epoch in range(epochs):
        epoch_loss = 0
        for inputs, targets in dataloader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs.squeeze(), targets)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        
        if epoch % 10 == 0:
            print(f"Epoch {epoch}/{epochs}, Loss: {epoch_loss/len(dataloader):.6f}")

    print("Training Complete.")
    torch.save(model.state_dict(), "ml_training/prediction/traffic_lstm.pth")
    return model

if __name__ == "__main__":
    train_model(epochs=50)
