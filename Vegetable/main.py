# Install first:
# pip install icrawler

from icrawler.builtin import BingImageCrawler

# List of common Indian vegetables
vegetables = [
    "tomato", "potato", "onion", "carrot", "cabbage", "cauliflower",
    "spinach", "fenugreek", "okra", "bitter gourd", "ridge gourd",
    "brinjal", "peas", "pumpkin", "bottle gourd", "radish", "beetroot",
    "chilli", "coriander", "green beans"
]

# Example URLs for each vegetable (can add more if needed)
vegetable_urls = {
    "tomato": [
        "https://upload.wikimedia.org/wikipedia/commons/8/89/Tomato_je.jpg",
        "https://cdn.britannica.com/16/187216-050-CB57A09B/tomatoes-tomato-plant-Fruit-vegetable.jpg"
    ],
    "potato": [
        "https://upload.wikimedia.org/wikipedia/commons/6/60/Patates.jpg",
        "https://cdn.britannica.com/58/188058-050-2E4A77D2/Potato.jpg"
    ],
    "onion": [
        "https://upload.wikimedia.org/wikipedia/commons/9/9e/Onions.jpg",
        "https://cdn.britannica.com/39/153839-050-07BC1D7A/Onion.jpg"
    ],
    # Add more URLs for other vegetables as needed




    "carrot": [
        "https://upload.wikimedia.org/wikipedia/commons/7/7e/Carrot.jpg",
        "https://cdn.britannica.com/45/153945-050-89B1067D/Carrot.jpg"
    ],
    "cabbage": [
        "https://upload.wikimedia.org/wikipedia/commons/0/05/Cabbage_on_white.jpg",
        "https://cdn.britannica.com/99/153999-050-94D33F2A/Cabbage.jpg"
    ],
    "cauliflower": [
        "https://upload.wikimedia.org/wikipedia/commons/1/1f/Cauliflower_and_cross_section_edit.jpg",
        "https://cdn.britannica.com/40/154040-050-0EE26FCB/Cauliflower.jpg"
    ],
    "spinach": [
        "https://upload.wikimedia.org/wikipedia/commons/0/01/Spinach_leaves.jpg",
        "https://cdn.britannica.com/99/154099-050-9AB7C7A1/Spinach.jpg"
    ],
    "fenugreek": [
        "https://upload.wikimedia.org/wikipedia/commons/c/cd/Methi_Leaves.jpg",
        "https://cdn.britannica.com/40/154140-050-A8C22D13/Fenugreek.jpg"
    ],
    "okra": [
        "https://upload.wikimedia.org/wikipedia/commons/5/5c/Okra.jpg",
        "https://cdn.britannica.com/85/154185-050-FC4E9A91/Okra.jpg"
    ],
    "bitter gourd": [
        "https://upload.wikimedia.org/wikipedia/commons/f/f2/Bitter_gourd.jpg",
        "https://cdn.britannica.com/63/154263-050-Bitter-melon.jpg"
    ],
    "ridge gourd": [
        "https://upload.wikimedia.org/wikipedia/commons/4/4f/Ridge_gourd.jpg",
        "https://cdn.britannica.com/49/154249-050-Ridge-gourd.jpg"
    ],
    "brinjal": [
        "https://upload.wikimedia.org/wikipedia/commons/1/16/Brinjal.jpg",
        "https://cdn.britannica.com/64/154264-050-Eggplant.jpg"
    ],
    "peas": [
        "https://upload.wikimedia.org/wikipedia/commons/0/0e/Green_peas.jpg",
        "https://cdn.britannica.com/13/154313-050-Pea.jpg"
    ],
    "pumpkin": [
        "https://upload.wikimedia.org/wikipedia/commons/5/5a/Pumpkin.jpg",
        "https://cdn.britannica.com/92/154292-050-Pumpkin.jpg"
    ],
    "bottle gourd": [
        "https://upload.wikimedia.org/wikipedia/commons/3/35/Bottle_gourd.jpg",
        "https://cdn.britannica.com/57/154357-050-Bottle-gourd.jpg"
    ],
    "radish": [
        "https://upload.wikimedia.org/wikipedia/commons/3/38/Radish.jpg",
        "https://cdn.britannica.com/80/154380-050-Radish.jpg"
    ],
    "beetroot": [
        "https://upload.wikimedia.org/wikipedia/commons/7/7e/Beetroot.jpg",
        "https://cdn.britannica.com/31/154331-050-Beetroot.jpg"
    ],
    "chilli": [
        "https://upload.wikimedia.org/wikipedia/commons/6/66/Chili_peppers.jpg",
        "https://cdn.britannica.com/53/154353-050-Chili-pepper.jpg"
    ],
    "coriander": [
        "https://upload.wikimedia.org/wikipedia/commons/6/60/Coriander_leaves.jpg",
        "https://cdn.britannica.com/59/154359-050-Coriander.jpg"
    ],
    "green beans": [
        "https://upload.wikimedia.org/wikipedia/commons/f/fd/Green_beans.jpg",
        "https://cdn.britannica.com/39/154339-050-Green-beans.jpg"
    ]
}

# Base folder to save images
# Base folder to save images
output_dir = "indian_vegetables_dataset"

for veg in vegetables:
    print(f"\nDownloading 1 image for {veg}...")
    crawler = BingImageCrawler(storage={'root_dir': f'{output_dir}/{veg}'})
    crawler.crawl(keyword=veg, max_num=1)

    print(f"Here are 2 example image URLs for {veg}:")
    urls = vegetable_urls.get(veg, ["URL1", "URL2"])
    for url in urls:
        print(url)

print("\nAll vegetable images downloaded and URLs displayed!")