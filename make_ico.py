from PIL import Image

# Apriamo il file originale
img = Image.open("assets/icon.png")

# Ridimensioniamolo a 256x256
img_resized = img.resize((256, 256), Image.Resampling.LANCZOS)

# Salviamo l'icona con le dimensioni corrette necessarie a Electron Builder
img_resized.save("assets/icon.ico", format="ICO", sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])

print("Icon resized and saved successfully.")
