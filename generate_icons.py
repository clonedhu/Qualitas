from PIL import Image, ImageDraw
import os

ASSETS_DIR = "assets"
if not os.path.exists(ASSETS_DIR):
    os.makedirs(ASSETS_DIR)

def create_gemini_icon():
    size = (64, 64)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Blue Star (4-pointed)
    center = (32, 32)
    radius = 28
    inner_radius = 10
    
    # Points for a 4-pointed star
    points = [
        (32, 4),  # Top
        (42, 32), # Right Inner
        (60, 32), # Right
        (42, 42), # Bottom Inner
        (32, 60), # Bottom
        (22, 42), # Left Inner
        (4, 32),  # Left
        (22, 22)  # Top Inner
    ]
    
    # Draw star
    draw.polygon(points, fill="#4285F4") # Google Blue
    
    img.save(os.path.join(ASSETS_DIR, "gemini_icon.png"), "PNG")
    print(f"Generated {ASSETS_DIR}/gemini_icon.png")

def create_gpt_icon():
    size = (64, 64)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Green Hexagon
    # Hexagon points
    # Center 32, 32. Radius 28.
    import math
    points = []
    for i in range(6):
        angle_deg = 60 * i - 30 
        angle_rad = math.radians(angle_deg)
        x = 32 + 28 * math.cos(angle_rad)
        y = 32 + 28 * math.sin(angle_rad)
        points.append((x, y))
        
    draw.polygon(points, fill="#10a37f") # OpenAI Green
    
    # White Lightning Bolt (Simplified)
    bolt_points = [
        (36, 12),
        (20, 32),
        (30, 32),
        (26, 52),
        (44, 32),
        (34, 32),
    ]
    # Draw bolt
    draw.polygon(bolt_points, fill="white")
    
    img.save(os.path.join(ASSETS_DIR, "gpt_icon.png"), "PNG")
    print(f"Generated {ASSETS_DIR}/gpt_icon.png")

if __name__ == "__main__":
    create_gemini_icon()
    create_gpt_icon()
