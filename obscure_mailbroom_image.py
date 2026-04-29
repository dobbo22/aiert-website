from PIL import Image, ImageDraw, ImageFont
import os

def obscure_and_label_image(input_path, output_path, boxes_labels):
    # Open the image
    img = Image.open(input_path).convert("RGBA")
    draw = ImageDraw.Draw(img)

    # Try to use a system font, fallback to default
    try:
        font = ImageFont.truetype("Arial.ttf", 28)
    except:
        font = ImageFont.load_default()

    for box, label in boxes_labels:
        # Draw a white rectangle over the sensitive area
        draw.rectangle(box, fill=(255,255,255,220))
        # Center the label in the box
        # Use getbbox for PIL >=10
        bbox = font.getbbox(label)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x = box[0] + (box[2]-box[0]-w)//2
        y = box[1] + (box[3]-box[1]-h)//2
        draw.text((x, y), label, fill=(60,60,60,255), font=font)

    img.save(output_path)

# Define the regions to obscure (left, top, right, bottom) and replacement text
# You may need to adjust these coordinates for your screenshot
boxes_labels = [
    ((60, 120, 320, 170), "Sender Name"),      # O'Reilly
    ((60, 180, 320, 230), "Example Corp"),    # Dobson
    # Add more boxes as needed for other blurred areas
]

input_img = "public/mailbroom/smart-organise.png"
output_img = "public/mailbroom/smart-organise.png"

if os.path.exists(input_img):
    obscure_and_label_image(input_img, output_img, boxes_labels)
    print("Image updated: private details obscured.")
else:
    print("Input image not found.")
