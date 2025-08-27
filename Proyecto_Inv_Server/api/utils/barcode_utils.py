import cv2
import numpy as np
from PIL import Image
from pyzbar.pyzbar import decode

def preprocess_with_opencv(image_bytes):
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # Escala de grises
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Aumentar contraste
    gray = cv2.equalizeHist(gray)

    # Reducción de ruido
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    # Binarización adaptativa
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )

    return thresh


def decode_barcodes(image_bytes):
    """Devuelve lista de códigos de barra detectados (ignora QR)"""
    processed_img = preprocess_with_opencv(image_bytes)
    pil_image = Image.fromarray(processed_img)

    decoded_objects = decode(pil_image)
    return [obj for obj in decoded_objects if obj.type != "QRCODE"]
