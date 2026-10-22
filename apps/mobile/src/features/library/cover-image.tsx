import { Image, type ImageProps } from 'expo-image';
import { imageSource } from '@/src/lib/image-source';

type CoverImageProps = Omit<ImageProps, 'source' | 'placeholder'> & { uri?: string; thumbhash?: string };

/**
 * Every Lantern cover renders through here, so cache and placeholder changes land in one place.
 * A `thumbhash` (#507) shows as a blurred preview until the cover loads; `transition` fades between them.
 */
export function CoverImage({ uri, thumbhash, contentFit = 'cover', ...props }: CoverImageProps) {
  return uri ? (
    <Image
      source={imageSource(uri)}
      placeholder={thumbhash ? { thumbhash } : undefined}
      contentFit={contentFit}
      placeholderContentFit={contentFit}
      {...props}
    />
  ) : null;
}
