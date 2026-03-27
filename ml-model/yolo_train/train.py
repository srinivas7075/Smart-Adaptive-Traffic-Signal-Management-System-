from ultralytics import YOLO
import torch
import os

# Check for GPU
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Using device: {device}")

def train_yolo():
    # Load a model
    model = YOLO("yolov8n.pt")  # load a pretrained model (recommended for training)

    # Train the model
    # We assume data.yaml is correctly pointing to the dataset
    results = model.train(
        data="data.yaml",  # path to dataset YAML
        epochs=50,         # number of epochs to train for
        imgsz=640,         # size of input images as integer
        batch=16,          # number of images per batch
        device=device,     # device to run on, i.e. device=0 or device=0,1,2,3 or device='cpu'
        project="ua_detrac_yolo", # project name
        name="exp",        # experiment name
        exist_ok=True,     # overwrite existing experiment
        
        # Augmentation (Mosaic/Mixup handled by YOLOv8 defaults, usually enabled)
        mosaic=1.0,        # mosaic augmentation (probability)
        mixup=0.1,         # mixup augmentation (probability)
    )

    # Validate the model
    metrics = model.val()
    print(f"mAP@0.5: {metrics.box.map50}")
    print(f"mAP@0.5:0.95: {metrics.box.map}")
    
    # Export the model
    success = model.export(format="onnx")
    print(f"Model exported to ONNX: {success}")

if __name__ == "__main__":
    train_yolo()
