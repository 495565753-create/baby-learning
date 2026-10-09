# Story illustrations and pet activity scenes — 2026-10-09

The 128 previously illustrated books were checked for missing local cover/page files. The 49 recent additions receive 155 page illustrations: 41 three-page stories and eight four-page fairytales. Text and recorded narration remain paired with the same page; playback automatically advances at the end of each recording. The next page's picture is requested at low priority while the current page is being narrated.

Images use the built-in image_gen tool, with original gentle storybook scenes corresponding to each page. Final runtime images are in `art/story-expansion-v1/`; page images are 720 × 720 WebP at quality 86 and cover thumbnails are 320 × 320 WebP at quality 80. Generated originals, complete prompts, initial generation results and review contact sheets are preserved outside the deployment at `/Users/guoju/edu-app-backups/20261009-story-pictures/`. The runtime art manifest records file hashes, dimensions and page text. No large generation originals are shipped.

Pet feeding now opens a restaurant with a chair, table, food and animated spoon. Bathing opens a tiled bathroom with a tub, shower stream and floating bubbles. Playing rotates through basketball, football and tennis courts; the ball bounces and the pet runs to retrieve it. Activity animations last nine seconds, after which the room stays open. A house button returns to the pet's home. Full care meters do not prevent repeating an interaction. Companion care remains separate and saved.

Mobile pet layouts were inspected at 320 × 568, 375 × 667 and 667 × 375: page height equals the viewport and controls remain visible. Reduced-motion settings receive static scene representations. Existing recorded female narration remains in use.
