#!/bin/zsh
# cut-badge.sh <in.png> <out.webp>: crop tight to the round badge and cut it out on a
# transparent background. Finds the rim by saturation (the grey backdrop and its soft
# shadow have none), masks a circle a hair inside the rim's outer edge with a 1px
# feather, keeps native resolution, near-lossless WebP. PROTOTYPE.
in=$1; out=$2
read w h x y <<< $(magick "$in" -colorspace HSL -channel G -separate +channel -threshold 30% \
  -morphology Open Disk:4 -trim -format '%w %h %X %Y' info: | tr -d '+')
d=$(( w < h ? w : h )); cx=$(( x + w / 2 )); cy=$(( y + w / 2 ))
inset=$(( d / 150 + 1 ))   # ~0.7%: drops the anti-aliased fringe blended with grey
r=$(( d / 2 - inset ))
s=$(( 2 * r ))
magick "$in" -crop ${s}x${s}+$((cx - r))+$((cy - r)) +repage \
  \( -size ${s}x${s} xc:black -fill white -draw "circle $r,$r $r,1" -blur 0x0.7 \) \
  -alpha off -compose CopyOpacity -composite \
  -define webp:lossless=false -define webp:alpha-quality=100 -define webp:method=6 -quality 95 "$out"
echo "$in -> $out (${s}px, rim box ${w}x${h} at ${x},${y})"
