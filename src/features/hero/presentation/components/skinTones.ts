/**
 * sRGB skin tones, light to deep, indexed by `Hero.skinTone` (length = `SKIN_TONE_COUNT`). Shared by the tone
 * pickers and the 3D skin material; kept apart from the 3D module so a picker never loads three.js or the models.
 */
export const SKIN_TONES: readonly string[] = [
  '#F5D7C3',
  '#E8BE9C',
  '#D29C74',
  '#B07850',
  '#8A5536',
  '#5A3422',
];
