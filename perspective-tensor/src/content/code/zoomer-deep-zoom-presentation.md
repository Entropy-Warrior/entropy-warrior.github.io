---
title: "Zoomer's Sliders: When PowerPoint Just Won't Zoom It"
description: "Building a presentation tool that treats your entire slide deck as one zoomable image - because why not?"
pubDate: 2024-12-14
draft: false
tags: ["javascript", "visualization", "interfaces"]
section: "code"
author: "Lin Wang"
---

You know that feeling when you're giving a presentation and you think, "If only I could zoom into this image like they do in CSI"? No? Just me? Well, I built it anyway.

I was tired of the click-next-slide paradigm. What if your entire presentation lived in one massive image? Start from 30,000 feet, zoom down to the molecular level, all in one smooth journey. Enter **Zoomer's Sliders** (yes, the name is a dad joke, and no, I'm not sorry).

## The Technical Bits

I found [OpenSeadragon](https://openseadragon.github.io/) while looking for "that Google Maps zoomy thing but for images." It handles all the heavy lifting - smooth zooming, panning, even gigapixel images if you're into that sort of thing.

The fun part was making rectangles respect your monitor's aspect ratio. When you drag a selection, it stubbornly maintains your screen's proportions. Like autocorrect, but for rectangles:

```javascript
const screenRatio = window.screen.width / window.screen.height;
const width = Math.abs(endPoint.x - startPoint.x);
const height = width / screenRatio;
```

OpenSeadragon also has this quirk where everything is normalized to 1.0. Your image width? That's 1.0. Doesn't matter if it's 100 pixels or 10,000. You're constantly translating between what the user sees, where they clicked, and what OpenSeadragon thinks happened.

Hit "Enter Presentation" and everything goes fullscreen. Space bar, arrow keys, click anywhere - they all advance slides. I kept clicking the wrong key during my own presentations, so I made them all work.

You can save your slide regions as JSON, reorder them, name them something better than "Slide 1". The UI starts simple - just "Load Image" - then reveals features as you need them. Progressive disclosure, they call it. I call it not overwhelming people with buttons.

## What I Learned

Coordinate systems will hurt you. I spent an embarrassing amount of time figuring out why my rectangles were in the wrong place. Mixing coordinate systems is like mixing metric and imperial - someone's going to crash a Mars rover.

Without OpenSeadragon, I'd still be trying to figure out smooth zooming. With it? 500 lines of code and done.

The whole thing is on [GitHub](https://github.com/entropy-warrior/zoomer). One HTML file, some JavaScript. No build process, no npm install. Just open it in a browser and go.

Is it perfect? No. Does it work? Yes. Will it revolutionize presentations? Probably not. But it's mine, and I had fun building it.

---

*Built with: JavaScript, OpenSeadragon, and an unreasonable amount of coffee*