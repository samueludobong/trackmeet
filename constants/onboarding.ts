// Onboarding slide + decorative-blob data.

export const BLOB_SHAPES = [
  {
    borderTopLeftRadius: 130,
    borderTopRightRadius: 70,
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 160,
  },
  {
    borderTopLeftRadius: 80,
    borderTopRightRadius: 150,
    borderBottomLeftRadius: 160,
    borderBottomRightRadius: 55,
  },
  {
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
];

export const SLIDES = [
  {
    title: 'Share Your Taste',
    script: 'With The World',
    scriptColor: '#CAFF00',
    subtitle: 'Post what you\'re playing and let the world hear your vibe.',
    blobs: [
      { color: '#AB00FF', w: 280, h: 260, top: 125, left: 15, shape: 0 },
      { color: '#6B00AA', w: 220, h: 240, top: 85, left: 140, shape: 1 },
      { color: '#CAFF00', w: 88, h: 88, top: 280, left: 260, shape: 2 },
    ],
  },
  {
    title: 'Listen Together',
    script: 'In Real Time',
    scriptColor: '#FF6B35',
    subtitle: 'Join a Meet and vibe to the same songs simultaneously.',
    blobs: [
      { color: '#FF6B35', w: 260, h: 275, top: 120, left: 95, shape: 1 },
      { color: '#AB00FF', w: 205, h: 200, top: 125, left: -25, shape: 0 },
      { color: '#fff', w: 95, h: 95, top: 265, left: 255, shape: 2 },
    ],
  },
  {
    title: 'Discover Music',
    script: 'Through People',
    scriptColor: '#AB00FF',
    subtitle: 'Find new songs through people whose taste you actually trust.',
    blobs: [
      { color: '#CAFF00', w: 250, h: 260, top: 130, left: 60, shape: 2 },
      { color: '#6B00AA', w: 210, h: 220, top: 100, left: -20, shape: 0 },
      { color: '#FF6B35', w: 90, h: 90, top: 270, left: 250, shape: 1 },
    ],
  },
];

export type Slide = typeof SLIDES[0];
