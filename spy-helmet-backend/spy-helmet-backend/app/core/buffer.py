# app/core/buffer.py

import numpy as np

# Global buffer to store readings
BUFFER_SIZE = 100
buffer = []

def reset_buffer():
    """Resets the buffer at the start of a new session."""
    global buffer
    buffer = []

def add_reading(reading: list[float]) -> np.ndarray | None:
    """
    Adds a single reading to the buffer.
    Returns a full (100, 2
    ) numpy array when ready, else None.
    """
    global buffer

    if len(reading) != 2:
        raise ValueError("Each reading must have exactly 2 values.")

    buffer.append(reading)

    # Sliding Window: Maintain exactly 100 latest readings
    if len(buffer) > BUFFER_SIZE:
        buffer.pop(0)  # Remove oldest reading

    if len(buffer) == BUFFER_SIZE:
        return np.array(buffer).astype(np.float32)
    else:
        return None

def return_progress():
    global buffer
    return len(buffer)
