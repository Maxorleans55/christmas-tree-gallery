export interface DefaultMedia {
  src: string;
  type: 'image' | 'video';
  caption?: string;
}

export const DEFAULT_MEDIA: DefaultMedia[] = [
  { src: '/media/her-beauty.mp4', type: 'video', caption: 'Her beauty' },
  { src: '/media/her-lovely-smile.mp4', type: 'video', caption: 'Her lovely smile' },
  { src: '/media/her-glowing-skin.mp4', type: 'video', caption: 'Sparkling skin' },
  { src: '/media/happiness.mp4', type: 'video', caption: 'The joy of life' },
  { src: '/media/love-at-first-sight.mp4', type: 'video', caption: 'Love at first sight' },
  { src: '/media/church-queen.jpg', type: 'image', caption: 'Beautiful girl' },
  { src: '/media/photogenic.jpg', type: 'image', caption: 'Gorgeous' },
];