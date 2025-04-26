
Apr 23, 2025
Generate images with GPT Image

Katia Gil GuzmanVerified
Katia Gil Guzman(OpenAI)
Open in Github
In this cookbook, you'll learn how to use GPT Image, our new large language model with image generation capabilities.

This model has world knowledge and can generate images leveraging this broad understanding of the world. It is also much better at instruction following and producing photorealistic images compared to our previous-generation image models, DallE 2 and 3.

To learn more about image generation, refer to our guide.

Set up
%pip install pillow openai -U

import base64
import os
from openai import OpenAI
from PIL import Image
from io import BytesIO
from IPython.display import Image as IPImage, display

client = OpenAI()
# Set your API key if not set globally
#client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "<your OpenAI API key if not set as env var>"))

# Create imgs/ folder
folder_path = "imgs"
os.makedirs(folder_path, exist_ok=True)

Generate an image
GPT Image 1 is great at instruction-following, meaning you can prompt the model to generate images with very detailed instructions.

prompt1 = """
Render a realistic image of this character:
Blobby Alien Character Spec Name: Glorptak (or nickname: "Glorp")
Visual Appearance Body Shape: Amorphous and gelatinous. Overall silhouette resembles a teardrop or melting marshmallow, shifting slightly over time. Can squish and elongate when emotional or startled.
Material Texture: Semi-translucent, bio-luminescent goo with a jelly-like wobble. Surface occasionally ripples when communicating or moving quickly.
Color Palette:
- Base: Iridescent lavender or seafoam green
- Accents: Subsurface glowing veins of neon pink, electric blue, or golden yellow
- Mood-based color shifts (anger = dark red, joy = bright aqua, fear = pale gray)
Facial Features:
- Eyes: 3–5 asymmetrical floating orbs inside the blob that rotate or blink independently
- Mouth: Optional—appears as a rippling crescent on the surface when speaking or emoting
- No visible nose or ears; uses vibration-sensitive receptors embedded in goo
- Limbs: None by default, but can extrude pseudopods (tentacle-like limbs) when needed for interaction or locomotion. Can manifest temporary feet or hands.
Movement & Behavior Locomotion:
- Slides, bounces, and rolls.
- Can stick to walls and ceilings via suction. When scared, may flatten and ooze away quickly.
Mannerisms:
- Constant wiggling or wobbling even at rest
- Leaves harmless glowing slime trails
- Tends to absorb nearby small objects temporarily out of curiosity
"""

img_path1 = "imgs/glorptak.jpg"

# Generate the image
result1 = client.images.generate(
    model="gpt-image-1",
    prompt=prompt1,
    size="1024x1024"
)

# Save the image to a file and resize/compress for smaller files
image_base64 = result1.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

# Adjust this if you want a high-quality Glorptak
image = Image.open(BytesIO(image_bytes))
image = image.resize((300, 300), Image.LANCZOS)
image.save(img_path1, format="JPEG", quality=80, optimize=True)

# Show the result
display(IPImage(img_path1))


Image is here

Customize the output
You can customize the following output properties:

Quality can be low, medium, high or auto (default value)
Size can be 1024x1024 (square), 1536x1024 (portrait), 1024x1536 (landscape) or auto (default)
You can adjust the compression level (from 0-100%) for JPEG and WEBP formats
You can choose to generate an image with a transparent background (only available for PNG or WEBP)
prompt2 = "generate a portrait, pixel-art style, of a grey tabby cat dressed as a blond woman on a dark background."
img_path2 = "imgs/cat_portrait_pixel.jpg"

# Generate the image
result2 = client.images.generate(
    model="gpt-image-1",
    prompt=prompt2,
    quality="low",
    output_compression=50,
    output_format="jpeg",
    size="1024x1536"
)

# Save the image to a file and resize/compress for smaller files
image_base64 = result2.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

image = Image.open(BytesIO(image_bytes))
image = image.resize((250, 375), Image.LANCZOS)
image.save(img_path2, format="JPEG", quality=80, optimize=True)

# Show the result
display(IPImage(img_path2))

Image is here 


Transparent background
You can use the background property to request a transparent background, but if you include in your prompt that you want a transparent background, it will be set to transparent by default.

prompt3 = "generate a pixel-art style picture of a green bucket hat with a pink quill on a transparent background."
img_path3 = "imgs/hat.png"

result3 = client.images.generate(
    model="gpt-image-1",
    prompt=prompt3,
    quality="low",
    output_format="png",
    size="1024x1024"
)
image_base64 = result3.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

# Save the image to a file and resize/compress for smaller files
image_base64 = result3.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

image = Image.open(BytesIO(image_bytes))
image = image.resize((250, 250), Image.LANCZOS)
image.save(img_path3, format="PNG")

# Show the result
display(IPImage(img_path3))

Image is here 

Edit images
GPT Image can also accept image inputs, and use them to create new images. You can also provide a mask if you don't want the model to change a specific part of the input image.

You can use a maximum of 10 input images, and if you use a mask, it will be applied to the first image provided in the image array.

prompt_edit = """
Combine the images of the cat and the hat to show the cat wearing the hat while being perched in a tree, still in pixel-art style.
"""
img_path_edit = "imgs/cat_with_hat.jpg"

img1 = open(img_path2, "rb")
img2 = open(img_path3, "rb")

# Generate the new image
result_edit = client.images.edit(
    model="gpt-image-1",
    image=[img1,img2], 
    prompt=prompt_edit,
    size="1024x1536"
)

# Save the image to a file and resize/compress for smaller files
image_base64 = result_edit.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

image = Image.open(BytesIO(image_bytes))
image = image.resize((250, 375), Image.LANCZOS)
image.save(img_path_edit, format="JPEG", quality=80, optimize=True)    

# Show the result
display(IPImage(img_path_edit))

Image is here. 


Edit an image with a mask
You can also provide a mask along with your input images (if there are several, the mask will be applied on the first one) to edit only the part of the input image that is not covered by the mask. Please note that the model might still edit some parts of the image inside the mask, but it will avoid it.

Important note: the mask should contain an alpha channel. If you're generating it manually, for example using an image editing software, make sure you include this alpha channel.

Generating the mask
For this example, we'll use our model to generate the mask automatically for us. The mask might not be exact, but it will be enough for our purposes. If you need to have an exact mask, feel free to use an image segmentation model.

img_path_mask = "imgs/mask.png"
prompt_mask = "generate a mask delimiting the entire character in the picture, using white where the character is and black for the background. Return an image in the same size as the input image."

img_input = open(img_path1, "rb")

# Generate the mask
result_mask = client.images.edit(
    model="gpt-image-1",
    image=img_input, 
    prompt=prompt_mask
)

# Save the image to a file and resize/compress for smaller files
image_base64 = result_mask.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

image = Image.open(BytesIO(image_bytes))
image = image.resize((300, 300), Image.LANCZOS)
image.save(img_path_mask, format="PNG")

# Show the mask
display(IPImage(img_path_mask))

Image is here. 


Creating an alpha channel
This step is optional, if you want to turn a black & white image into a mask with an alpha channel that can be used in the Image Edit API.

# 1. Load your black & white mask as a grayscale image
mask = Image.open(img_path_mask).convert("L")

# 2. Convert it to RGBA so it has space for an alpha channel
mask_rgba = mask.convert("RGBA")

# 3. Then use the mask itself to fill that alpha channel
mask_rgba.putalpha(mask)

# 4. Convert the mask into bytes
buf = BytesIO()
mask_rgba.save(buf, format="PNG")
mask_bytes = buf.getvalue()

# Save the resulting file
img_path_mask_alpha = "imgs/mask_alpha.png"
with open(img_path_mask_alpha, "wb") as f:
    f.write(mask_bytes)

Editing with the mask
When using a mask, we still need the prompt the model describing the entiring resulting image, not just the area that is masked.

prompt_mask_edit = "A strange character on a colorful galaxy background, with lots of stars and planets."
mask = open(img_path_mask_alpha, "rb")

result_mask_edit = client.images.edit(
    model="gpt-image-1",         
    prompt=prompt_mask_edit,
    image=img_input,
    mask=mask,
    size="1024x1024"
)

# Display result

img_path_mask_edit = "imgs/mask_edit.png"

image_base64 = result_mask_edit.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

image = Image.open(BytesIO(image_bytes))
image = image.resize((300, 300), Image.LANCZOS)
image.save(img_path_mask_edit, format="JPEG", quality=80, optimize=True)
    
display(IPImage(img_path_mask_edit))

Image is here. 

Wrapping up
In this cookbook, we've seen how to use our new image generation model, GPT Image, to either generate new images from scratch, or use reference images. We've also covered how to create a mask with an alpha channel to apply it to an input image, to guide the image edition even further.

Feel free to use this as a starting point to explore other use cases, and if you're looking for some inspiration, check out the image gallery in our docs.

Happy building!



The OpenAI API lets you generate and edit images from text prompts, using the GPT Image
Currently, image generation is only available through the Image API. We’re actively working on expanding support to the Responses API.


Our latest and most advanced model for image generation is gpt-image-1, a natively multimodal language model.

We recommend this model for its high-quality image generation and ability to use world knowledge in image creation. 



Generate Images
You can use the image generation endpoint to create images based on text prompts. To learn more about customizing the output (size, quality, format, transparency), refer to the customize image output section below.

You can set the n parameter to generate multiple images at once in a single request (by default, the API returns a single image).

Generate an image
from openai import OpenAI
import base64
client = OpenAI()

prompt = """
A children's book drawing of a veterinarian using a stethoscope to 
listen to the heartbeat of a baby otter.
"""

result = client.images.generate(
    model="gpt-image-1",
    prompt=prompt
)

image_base64 = result.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

# Save the image to a file
with open("otter.png", "wb") as f:
    f.write(image_bytes)



    Edit Images
The image edits endpoint lets you:

Edit existing images
Generate new images using other images as a reference
Edit parts of an image by uploading an image and mask indicating which areas should be replaced (a process known as inpainting)
Create a new image using image references
You can use one or more images as a reference to generate a new image.

In this example, we'll use 4 input images to generate a new image of a gift basket containing the items in the reference images.



Edit an image
import base64
from openai import OpenAI
client = OpenAI()

prompt = """
Generate a photorealistic image of a gift basket on a white background 
labeled 'Relax & Unwind' with a ribbon and handwriting-like font, 
containing all the items in the reference pictures.
"""

result = client.images.edit(
    model="gpt-image-1",
    image=[
        open("body-lotion.png", "rb"),
        open("bath-bomb.png", "rb"),
        open("incense-kit.png", "rb"),
        open("soap.png", "rb"),
    ],
    prompt=prompt
)

image_base64 = result.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

# Save the image to a file
with open("gift-basket.png", "wb") as f:
    f.write(image_bytes)
Edit an image using a mask (inpainting)
You can provide a mask to indicate where the image should be edited. The transparent areas of the mask will be replaced, while the filled areas will be left unchanged.

You can use the prompt to describe what you want the final edited image to be or what you want to edit specifically. If you provide multiple input images, the mask will be applied to the first image.

Edit an image
from openai import OpenAI
client = OpenAI()

result = client.images.edit(
    model="gpt-image-1",
    image=open("sunlit_lounge.png", "rb"),
    mask=open("mask.png", "rb"),
    prompt="A sunlit indoor lounge area with a pool containing a flamingo"
)

image_base64 = result.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

# Save the image to a file
with open("composition.png", "wb") as f:
    f.write(image_bytes)



    Mask requirements
The image to edit and mask must be of the same format and size (less than 25MB in size).

The mask image must also contain an alpha channel. If you're using an image editing tool to create the mask, make sure to save the mask with an alpha channel.

Add an alpha channel to a black and white mask
Customize Image Output
You can configure the following output options:

Size: Image dimensions (e.g., 1024x1024, 1024x1536)
Quality: Rendering quality (e.g. low, medium, high)
Format: File output format
Compression: Compression level (0-100%) for JPEG and WebP formats
Background: Transparent or opaque
size, quality, and background support the auto option, where the model will automatically select the best option based on the prompt.

Size and quality options
Square images with standard quality are the fastest to generate. The default size is 1024x1024 pixels.

Available sizes	
1024x1024 (square)
1536x1024 (landscape)
1024x1536 (portrait)
auto (default)
Quality options	
low
medium
high
auto (default)
Output format
The Image API returns base64-encoded image data. The default format is png, but you can also request jpeg or webp.

If using jpeg or webp, you can also specify the output_compression parameter to control the compression level (0-100%). For example, output_compression=50 will compress the image by 50%.

Transparency
The gpt-image-1 model supports transparent backgrounds. To enable transparency, set the background parameter to transparent.

It is only supported with the png and webp output formats.

Transparency works best when setting the quality to medium or high.


enerate an image with a transparent background
from openai import OpenAI
import base64
client = OpenAI()

result = client.images.generate(
    model="gpt-image-1",
    prompt="Draw a 2D pixel art style sprite sheet of a tabby gray cat",
    size="1024x1024",
    background="transparent",
    quality="high",
)

image_base64 = result.json()["data"][0]["b64_json"]
image_bytes = base64.b64decode(image_base64)

# Save the image to a file
with open("sprite.png", "wb") as f:
    f.write(image_bytes)
Limitations
The GPT-4o Image model is a powerful and versatile image generation model, but it still has some limitations to be aware of:

Latency: Complex prompts may take up to 2 minutes to process.
Text Rendering: Although significantly improved over the DALL·E series, the model can still struggle with precise text placement and clarity.
Consistency: While capable of producing consistent imagery, the model may occasionally struggle to maintain visual consistency for recurring characters or brand elements across multiple generations.
Composition Control: Despite improved instruction following, the model may have difficulty placing elements precisely in structured or layout-sensitive compositions.
Content Moderation
All prompts and generated images are filtered in accordance with our content policy.

For image generation using gpt-image-1, you can control moderation strictness with the moderation parameter. This parameter supports two values:

auto (default): Standard filtering that seeks to limit creating certain categories of potentially age-inappropriate content.
low: Less restrictive filtering.
Cost and latency
This model generates images by first producing specialized image tokens. Both latency and eventual cost are proportional to the number of tokens required to render an image—larger image sizes and higher quality settings result in more tokens.

The number of tokens generated depends on image dimensions and quality:

Quality	Square (1024×1024)	Portrait (1024×1536)	Landscape (1536×1024)
Low	272 tokens	408 tokens	400 tokens
Medium	1056 tokens	1584 tokens	1568 tokens
High	4160 tokens	6240 tokens	6208 tokens
Note that you will also need to account for input tokens: text tokens for the prompt and image tokens for the input images if editing images.

So the final cost is the sum of:

input text tokens
input image tokens if using the edits endpoint
image output tokens